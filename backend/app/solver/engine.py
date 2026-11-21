"""
Motor de optimización para el problema de horarios universitarios (UCTP).

Este módulo implementa un solver basado en Google OR-Tools CP-SAT con
**intervalos de duración variable** (1, 2 o 3 horas académicas por sesión).

Modelo de tiempo:
- El tiempo se discretiza en TICKS de 15 minutos (día + tick). Cada hora
  académica son 45 minutos, es decir ``TICKS_POR_BLOQUE = 3`` ticks.
- Cada sesión de clase de un grupo ocupa ``horas_por_seccion`` bloques
  consecutivos de 45 minutos dentro de un mismo día.
- Las clases SOLO pueden iniciar en la rejilla diurna (desde las 07:15) o en la
  rejilla nocturna (18:00 - 21:45), según el semestre de la asignatura:
    * Semestres 1 a 5: jornada diurna. El inicio nunca es anterior a las 07:15
      y siempre es anterior a las 18:00 (la sesión puede terminar después).
    * Semestres 6 en adelante: jornada nocturna (18:00 - 21:45).
- Un docente/ grupo/ salón no puede solapar dos actividades en el mismo instante.

Decisiones:
- Para cada grupo: UN docente (restricción dura) y sus inicios de sesión.
- Las horas administrativas son obligatorias (exactas) por docente y se
  programan según la disponibilidad del docente, sin ventana por semestre.
- Los salones se asignan después por intervalo mediante un matching glotón
  por capacidad (evitando la explosión de simetría de la dimensión "salón").

Garantía para el estudiante: a lo sumo UNA clase por (materia, instante), de
modo que cualquier combinación de grupos de un semestre es siempre sin cruces
(el estudiante elige un solo grupo por materia, y dos materias distintas de un
mismo semestre nunca se solapan).
"""

import logging
import math
import os
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, NamedTuple, Optional, Set, Tuple

from ortools.sat.python import cp_model
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.models import (
    DisponibilidadDocente,
    Docente,
    GrupoProyectado,
    HorarioOptimizado,
    Salon,
)

logger = logging.getLogger(__name__)

# --- Modelo de tiempo -------------------------------------------------------
# Duración de la hora académica (45 minutos).
MINUTOS_POR_BLOQUE = 45
# Resolución de la discretización temporal.
TICK_MINUTOS = 15
# Cuántos ticks ocupa una hora académica.
TICKS_POR_BLOQUE = MINUTOS_POR_BLOQUE // TICK_MINUTOS

# Ventanas de la jornada (minutos desde las 00:00).
APERTURA_MIN = 7 * 60 + 15           # 07:15 - primer inicio de la jornada diurna
INICIO_NOCTURNO_MIN = 18 * 60        # 18:00 - inicio de la jornada nocturna
CIERRE_NOCTURNO_MIN = 21 * 60 + 45   # 21:45 - fin de la jornada nocturna

# Rango global modelado (misma grilla que el frontend y el PDF: 06:00 - 23:00).
MIN_TICK = 6 * 60 // TICK_MINUTOS    # 24 -> 06:00
MAX_TICK = 23 * 60 // TICK_MINUTOS   # 92 -> 23:00

# A partir de este semestre las materias se dictan en la jornada nocturna.
SEMESTRE_INICIO_NOCTURNO = 6

DIAS_ORDEN = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

# Pesos del objetivo
PESO_CLASE_FALTANTE = 100
PESO_ADMIN_FALTANTE = 100
PESO_DIA_ADMIN = 1
# Penaliza concentrar las clases de un semestre en pocos días (reparte la malla).
PESO_EXCESO_DIA = 5

HORAS_POR_SECCION_MIN = 1
HORAS_POR_SECCION_MAX = 3


class ResultadoOptimizacion(BaseModel):
    """Resultado de la optimización de horarios."""

    status: str
    tiempo_ejecucion: float
    total_asignaciones: int
    grupos_asignados: int
    total_grupos: int
    mensaje: str


class DatosOptimizacion(NamedTuple):
    """Contenedor de datos para la optimización."""

    grupos: List[GrupoProyectado]
    docentes: List[Docente]
    salones: List[Salon]
    # docente_id -> set de (dia, tick) disponibles para clases
    disp_slots: Dict[int, Set[Tuple[str, int]]]
    # docente_id -> set de (dia, tick_inicio) donde cabe una hora administrativa
    disp_admin: Dict[int, Set[Tuple[str, int]]]
    dias: List[str]
    # docente_id -> conjunto de asignatura_ids que puede dictar (vacío = ninguno)
    docente_asignaturas: Dict[int, set]


def _hora_a_minutos(hora: str) -> Optional[int]:
    """Convierte "HH:MM" en minutos desde las 00:00 (None si no es válido)."""
    try:
        h, m = hora.strip().split(":")
        return int(h) * 60 + int((m or "0").strip() or 0)
    except (ValueError, AttributeError):
        return None


def _ticks_de_bloque(bloque: str) -> List[int]:
    """Convierte un bloque "HH:MM-HH:MM" en los ticks de 15 min que cubre.

    Los extremos se ajustan al múltiplo de 15 más cercano: el inicio se sube
    (ceil) y el fin se baja (floor), de modo que un bloque solo declara
    disponibilidad en los ticks que realmente cubre.
    """
    if not bloque or "-" not in bloque:
        return []
    inicio, _, fin = bloque.partition("-")
    minuto_ini = _hora_a_minutos(inicio)
    minuto_fin = _hora_a_minutos(fin)
    if minuto_ini is None or minuto_fin is None:
        return []
    if minuto_fin <= minuto_ini:
        minuto_fin = minuto_ini + MINUTOS_POR_BLOQUE
    tick_ini = -(-minuto_ini // TICK_MINUTOS)   # ceil
    tick_fin = minuto_fin // TICK_MINUTOS       # floor
    return [t for t in range(tick_ini, tick_fin) if MIN_TICK <= t < MAX_TICK]


def _es_semestre_nocturno(semestre: Optional[int]) -> bool:
    """True si el semestre se dicta en la jornada nocturna (6° en adelante)."""
    if semestre is None:
        return False
    try:
        return int(semestre) >= SEMESTRE_INICIO_NOCTURNO
    except (TypeError, ValueError):
        return False


def _inicios_diurnos(dur: int) -> List[int]:
    """Inicios (ticks) permitidos en la jornada diurna.

    Rejilla de 45 minutos desde las 07:15: 07:15, 08:00, 08:45 ... 17:45.
    Solo importa el INICIO (siempre anterior a las 18:00); la sesión puede
    terminar más tarde, incluso después de las 18:00.
    """
    return list(
        range(
            APERTURA_MIN // TICK_MINUTOS,
            INICIO_NOCTURNO_MIN // TICK_MINUTOS,
            TICKS_POR_BLOQUE,
        )
    )


def _inicios_nocturnos(dur: int) -> List[int]:
    """Inicios (ticks) permitidos en la jornada nocturna.

    Rejilla de 45 minutos desde las 18:00: 18:00, 18:45, 19:30, 20:15, 21:00.
    La sesión completa debe caber antes de las 21:45.
    """
    base = INICIO_NOCTURNO_MIN // TICK_MINUTOS
    limite = CIERRE_NOCTURNO_MIN // TICK_MINUTOS
    dur_ticks = dur * TICKS_POR_BLOQUE
    return [
        t
        for t in range(base, limite, TICKS_POR_BLOQUE)
        if t + dur_ticks <= limite
    ]


def _inicios_admin() -> List[int]:
    """Inicios (ticks) posibles de una hora administrativa (bloques de 45 min).

    Rejilla de 45 minutos desde las 06:00, sin ventana de jornada: las horas
    administrativas solo dependen de la disponibilidad del docente.
    """
    return list(range(MIN_TICK, MAX_TICK - TICKS_POR_BLOQUE + 1, TICKS_POR_BLOQUE))


def _dur_grupo(grupo: GrupoProyectado) -> int:
    """Duración en bloques de 45 minutos de cada sesión del grupo (1 a 3 horas académicas)."""
    asig = grupo.asignatura
    dur = getattr(asig, "horas_por_seccion", None) or 2
    return max(HORAS_POR_SECCION_MIN, min(HORAS_POR_SECCION_MAX, int(dur)))


def _secciones_grupo(grupo: GrupoProyectado) -> int:
    """Cantidad de sesiones semanales que necesita el grupo."""
    asig = grupo.asignatura
    secciones = getattr(asig, "secciones_por_grupo", None)
    if secciones and secciones > 0:
        return int(secciones)
    # Respaldo: derivar de las horas semanales y la duración por sección.
    horas = getattr(asig, "horas_semanales", 0) or 0
    if horas <= 0:
        return 1
    return max(1, math.ceil(horas / _dur_grupo(grupo)))


def _fmt_intervalo(inicio_tick: int, dur: int) -> str:
    """Representa una sesión como "HH:MM-HH:MM" a partir de su tick inicial."""
    inicio_minutos = inicio_tick * TICK_MINUTOS
    fin_minutos = inicio_minutos + dur * MINUTOS_POR_BLOQUE

    def formato(minutos: int) -> str:
        return f"{minutos // 60:02d}:{minutos % 60:02d}"

    return f"{formato(inicio_minutos)}-{formato(fin_minutos)}"


def _extraer_datos_bd(db: Session) -> DatosOptimizacion:
    """Extrae de la BD todos los datos de forma global para la optimización."""
    logger.info("Extrayendo datos globales de la base de datos...")

    grupos = (
        db.query(GrupoProyectado)
        .options(joinedload(GrupoProyectado.asignatura))
        .all()
    )
    docentes = (
        db.query(Docente)
        .options(joinedload(Docente.asignaturas))
        .all()
    )
    salones = db.query(Salon).all()
    disponibilidades_raw = db.query(DisponibilidadDocente).all()

    disp_slots: Dict[int, Set[Tuple[str, int]]] = {}
    dias_set: Set[str] = set()

    for disp in disponibilidades_raw:
        slot_set = disp_slots.setdefault(disp.docente_id, set())
        for t in _ticks_de_bloque(disp.bloque_horario):
            slot_set.add((disp.dia, t))
        dias_set.add(disp.dia)

    # Horas administrativas: bloques de 45 min totalmente cubiertos por la
    # disponibilidad del docente (sin restricción de jornada).
    disp_admin: Dict[int, Set[Tuple[str, int]]] = {}
    for docente_id, slots in disp_slots.items():
        ticks_por_dia: Dict[str, Set[int]] = {}
        for (dia, t) in slots:
            ticks_por_dia.setdefault(dia, set()).add(t)
        admin_slots = disp_admin.setdefault(docente_id, set())
        for dia, ticks in ticks_por_dia.items():
            for inicio in _inicios_admin():
                if all((inicio + k) in ticks for k in range(TICKS_POR_BLOQUE)):
                    admin_slots.add((dia, inicio))

    dias = [d for d in DIAS_ORDEN if d in dias_set] or sorted(dias_set)

    docente_asignaturas = {
        docente.id: {asignatura.id for asignatura in docente.asignaturas}
        for docente in docentes
    }

    total_slots = sum(len(s) for s in disp_slots.values())
    logger.info(
        f"Datos extraídos: {len(grupos)} grupos, {len(docentes)} docentes, "
        f"{len(salones)} salones, {len(dias)} días, {total_slots} ticks disponibles"
    )

    return DatosOptimizacion(
        grupos=grupos,
        docentes=docentes,
        salones=salones,
        disp_slots=disp_slots,
        disp_admin=disp_admin,
        dias=dias,
        docente_asignaturas=docente_asignaturas,
    )


def _crear_variables_decision(
    model: cp_model.CpModel,
    datos: DatosOptimizacion,
) -> Tuple[Dict[Tuple[int, int, str, int], Any], Dict[Tuple[int, str, int], Any], List[int]]:
    """Crea variables de clase x[g,d,dia,inicio] e administrativas y[d,dia,inicio].

    Una variable de clase representa que el grupo ``g`` dictado por el docente
    ``d`` COMIENZA una sesión de ``dur[g]`` bloques en (dia, inicio). Solo se
    crean combinaciones factibles: docente disponible en TODOS los ticks que
    ocupa la sesión, autorizado para la materia, inicio dentro de la ventana
    del semestre y grupo que cabe en algún salón.
    """
    logger.info("Creando variables de decisión (Clases y Horas Administrativas)...")

    capacidad_maxima = max((s.capacidad for s in datos.salones), default=0)
    dur_list = [_dur_grupo(g) for g in datos.grupos]

    vars_clase: Dict[Tuple[int, int, str, int], Any] = {}
    for g_idx, grupo in enumerate(datos.grupos):
        if grupo.total_estudiantes > capacidad_maxima:
            continue
        asignatura_id = grupo.asignatura.id
        dur = dur_list[g_idx]
        semestre = grupo.asignatura.semestre
        if _es_semestre_nocturno(semestre):
            inicios = _inicios_nocturnos(dur)
        else:
            inicios = _inicios_diurnos(dur)
        for d_idx, docente in enumerate(datos.docentes):
            if asignatura_id not in datos.docente_asignaturas.get(docente.id, set()):
                continue
            disp = datos.disp_slots.get(docente.id, set())
            if not disp:
                continue
            for dia in datos.dias:
                ticks_dia = {t for (dd, t) in disp if dd == dia}
                if not ticks_dia:
                    continue
                for inicio in inicios:
                    if all(
                        (inicio + k) in ticks_dia
                        for k in range(dur * TICKS_POR_BLOQUE)
                    ):
                        vars_clase[(g_idx, d_idx, dia, inicio)] = model.NewBoolVar(
                            f"x[g{g_idx}_d{d_idx}_{dia}_{inicio}]"
                        )

    vars_admin: Dict[Tuple[int, str, int], Any] = {}
    for d_idx, docente in enumerate(datos.docentes):
        for (dia, inicio) in sorted(datos.disp_admin.get(docente.id, set())):
            vars_admin[(d_idx, dia, inicio)] = model.NewBoolVar(
                f"y[d{d_idx}_{dia}_{inicio}]"
            )

    logger.info(
        f"Variables creadas: {len(vars_clase)} de clases, {len(vars_admin)} administrativas."
    )
    return vars_clase, vars_admin, dur_list


def _agregar_restriccion_conflicto_docente(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, str, int], Any],
    vars_admin: Dict[Tuple[int, str, int], Any],
    datos: DatosOptimizacion,
    dur_list: List[int],
) -> None:
    """Un docente solo puede hacer 1 actividad a la vez (por instante de 15 min)."""
    # Indexar variables por (docente, dia, tick) para eficiencia.
    por_docente_dia_tick: Dict[Tuple[int, str, int], List[Any]] = {}

    for (g_idx, d_idx, dia, inicio), var in vars_clase.items():
        for k in range(dur_list[g_idx] * TICKS_POR_BLOQUE):
            por_docente_dia_tick.setdefault((d_idx, dia, inicio + k), []).append(var)

    for (d_idx, dia, inicio), var in vars_admin.items():
        for k in range(TICKS_POR_BLOQUE):
            por_docente_dia_tick.setdefault((d_idx, dia, inicio + k), []).append(var)

    for (_d_idx, _dia, _tick), vars_ in por_docente_dia_tick.items():
        if len(vars_) > 1:
            model.Add(sum(vars_) <= 1)


def _agregar_restriccion_docente_unico_grupo(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, str, int], Any],
    datos: DatosOptimizacion,
) -> None:
    """Cada grupo es dictado por un único docente en todas sus sesiones."""
    docentes_por_grupo: Dict[int, set] = {}
    for (g_idx, d_idx, _dia, _inicio) in vars_clase:
        docentes_por_grupo.setdefault(g_idx, set()).add(d_idx)

    for g_idx, candidatos in docentes_por_grupo.items():
        candidatos = sorted(candidatos)
        if not candidatos:
            continue
        z = {d: model.NewBoolVar(f"z[g{g_idx}_d{d}]") for d in candidatos}
        model.Add(sum(z.values()) == 1)
        for (g, d, _dia, _inicio), var in vars_clase.items():
            if g == g_idx:
                model.Add(var <= z[d])


def _agregar_restriccion_capacidad_salones(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, str, int], Any],
    datos: DatosOptimizacion,
    dur_list: List[int],
) -> None:
    """Capacidad de salones por INSTANTE (condición tipo Hall).

    Para cada instante (dia, tick) y umbral de tamaño c, el número de grupos
    de tamaño >= c activos en ese instante no puede superar el número de
    salones con capacidad >= c. Garantiza que exista un emparejamiento de
    salones por intervalo (proceso izquierda-derecha).
    """
    tamanos = sorted({g.total_estudiantes for g in datos.grupos})
    salones_c_cache: Dict[int, int] = {}
    for c in tamanos:
        salones_c_cache[c] = sum(1 for s in datos.salones if s.capacidad >= c)

    # Indexar por instante (dia, tick) -> [(tamaño, var)]
    por_instante: Dict[Tuple[str, int], List[Tuple[int, Any]]] = {}
    for (g_idx, _d_idx, dia, inicio), var in vars_clase.items():
        tam = datos.grupos[g_idx].total_estudiantes
        for k in range(dur_list[g_idx] * TICKS_POR_BLOQUE):
            por_instante.setdefault((dia, inicio + k), []).append((tam, var))

    for (dia, h), entradas in por_instante.items():
        for c in tamanos:
            relevantes = [var for (tam, var) in entradas if tam >= c]
            if relevantes:
                model.Add(sum(relevantes) <= salones_c_cache[c])


def _agregar_restriccion_dispersion_cohorte(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, str, int], Any],
    datos: DatosOptimizacion,
    dur_list: List[int],
) -> None:
    """A lo sumo una MATERIA activa por (semestre, instante).

    Garantiza que el estudiante pueda elegir CUALQUIER combinación de grupos de
    su semestre sin cruces: dos materias distintas de un mismo semestre nunca
    se solapan.

    Los grupos G1 y G2 de la MISMA materia sí pueden dictarse en paralelo (el
    estudiante elige una sola sección por materia), lo que permite aprovechar
    mejor la franja nocturna de 18:00 a 21:45 sin romper la garantía.
    """
    # 1. Variables de clase agrupadas por (materia, dia, instante).
    vars_por_materia: Dict[Tuple[int, str, int], List[Any]] = defaultdict(list)
    semestre_de_materia: Dict[int, int] = {}
    for (g_idx, _d_idx, dia, inicio), var in vars_clase.items():
        asignatura = datos.grupos[g_idx].asignatura
        semestre_de_materia[asignatura.id] = asignatura.semestre
        for k in range(dur_list[g_idx] * TICKS_POR_BLOQUE):
            vars_por_materia[(asignatura.id, dia, inicio + k)].append(var)

    # 2. Indicador "la materia M está activa en (dia, instante)".
    materia_activa: Dict[Tuple[int, str, int], Any] = {}
    for (asignatura_id, dia, tick), vars_ in vars_por_materia.items():
        activo = model.NewBoolVar(f"m_act_{asignatura_id}_{dia}_{tick}")
        model.AddMaxEquality(activo, vars_)
        materia_activa[(asignatura_id, dia, tick)] = activo

    # 3. Por semestre e instante, como máximo una materia activa.
    por_semestre: Dict[Tuple[int, str, int], List[Any]] = defaultdict(list)
    for (asignatura_id, dia, tick), activo in materia_activa.items():
        por_semestre[(semestre_de_materia[asignatura_id], dia, tick)].append(activo)

    for (_sem, _dia, _tick), activos in por_semestre.items():
        if len(activos) > 1:
            model.Add(sum(activos) <= 1)


def _agregar_restriccion_horas_docente(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, str, int], Any],
    vars_admin: Dict[Tuple[int, str, int], Any],
    datos: DatosOptimizacion,
    dur_list: List[int],
    exigir_horas_admin: bool = True,
) -> List[Any]:
    """Cumple las horas administrativas (exactas) y limita las horas totales.

    Con ``exigir_horas_admin=True`` las horas administrativas son OBLIGATORIAS
    (restricción dura). Con ``False`` se usa una variable de déficit suave,
    únicamente para diagnosticar modelos infactibles.
    """
    deficits_admin = []
    for d_idx, docente in enumerate(datos.docentes):
        horas_admin_req = getattr(docente, "horas_administrativas", 0) or 0
        admin_vars_docente = [
            var for (d, _dia, _h), var in vars_admin.items() if d == d_idx
        ]

        if horas_admin_req > 0:
            if not admin_vars_docente:
                # Sin ranuras disponibles para la admin: déficit total.
                if not exigir_horas_admin:
                    deficits_admin.append(model.NewIntVar(
                        horas_admin_req, horas_admin_req, f"falta_admin_d{d_idx}"
                    ))
                continue
            if exigir_horas_admin:
                model.Add(sum(admin_vars_docente) == horas_admin_req)
            else:
                deficit = model.NewIntVar(
                    0, horas_admin_req, f"falta_admin_d{d_idx}"
                )
                model.Add(sum(admin_vars_docente) + deficit == horas_admin_req)
                deficits_admin.append(deficit)

        # Horas totales (clase en bloques + admin) <= horas máximas.
        horas_clase = []
        for (g_idx, d, _dia, _inicio), var in vars_clase.items():
            if d == d_idx:
                horas_clase.append(dur_list[g_idx] * var)
        total = horas_clase + admin_vars_docente
        if total:
            model.Add(sum(total) <= docente.horas_maximas)

    return deficits_admin


def _agregar_restriccion_cobertura_grupos(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, str, int], Any],
    datos: DatosOptimizacion,
) -> List[Any]:
    """Fija las sesiones requeridas por grupo y reporta las faltantes."""
    vars_por_grupo: Dict[int, List[Any]] = {}
    for (g_idx, _d, _dia, _ini), var in vars_clase.items():
        vars_por_grupo.setdefault(g_idx, []).append(var)

    faltantes = []
    for g_idx, grupo in enumerate(datos.grupos):
        requeridas = _secciones_grupo(grupo)
        vars_grupo = vars_por_grupo.get(g_idx, [])
        falta = model.NewIntVar(0, requeridas, f"falta_g{g_idx}")
        if vars_grupo:
            model.Add(sum(vars_grupo) + falta == requeridas)
        else:
            model.Add(falta == requeridas)
        faltantes.append(falta)

    return faltantes


def _agregar_funcion_objetivo(
    model: cp_model.CpModel,
    datos: DatosOptimizacion,
    vars_clase: Dict[Tuple[int, int, str, int], Any],
    vars_admin: Dict[Tuple[int, str, int], Any],
    faltantes: List[Any],
    deficits_admin: List[Any],
) -> None:
    """Objetivo: minimizar sesiones sin cubrir, déficit admin y dispersión admin.

    También reparte las clases de cada semestre entre los días disponibles
    (penalización suave por día activo), para que la malla no concentrates
    decenas de clases simultáneas en un solo día.
    """
    logger.info("Configurando función objetivo...")

    terminos = []

    if faltantes:
        terminos.append(PESO_CLASE_FALTANTE * sum(faltantes))
    if deficits_admin:
        terminos.append(PESO_ADMIN_FALTANTE * sum(deficits_admin))

    # Penaliza tener horas administrativas repartidas en varios días.
    for d_idx, _docente in enumerate(datos.docentes):
        for dia in datos.dias:
            bloques_dia = [
                var for (d, dd, _h), var in vars_admin.items()
                if d == d_idx and dd == dia
            ]
            if bloques_dia:
                is_dia_activo = model.NewBoolVar(f"admin_dia_d{d_idx}_{dia}")
                model.Add(sum(bloques_dia) >= 1).OnlyEnforceIf(is_dia_activo)
                model.Add(sum(bloques_dia) == 0).OnlyEnforceIf(is_dia_activo.Not())
                terminos.append(PESO_DIA_ADMIN * is_dia_activo)

    # Reparte las clases de cada semestre entre los días disponibles: se calcula
    # un tope diario (clases del semestre / días) y se penaliza superarlo.
    sesiones_por_semestre: Dict[int, int] = defaultdict(int)
    for grupo in datos.grupos:
        sesiones_por_semestre[grupo.asignatura.semestre] += _secciones_grupo(grupo)

    clases_por_semestre_dia: Dict[Tuple[int, str], List[Any]] = defaultdict(list)
    for (g_idx, _d_idx, dia, _inicio), var in vars_clase.items():
        semestre = datos.grupos[g_idx].asignatura.semestre
        clases_por_semestre_dia.setdefault((semestre, dia), []).append(var)

    num_dias = max(1, len(datos.dias))
    for semestre, sesiones in sesiones_por_semestre.items():
        tope_diario = max(1, math.ceil(sesiones / num_dias))
        for dia in datos.dias:
            vars_dia = clases_por_semestre_dia.get((semestre, dia))
            if not vars_dia:
                continue
            exceso = model.NewIntVar(0, len(vars_dia), f"exceso_s{semestre}_{dia}")
            model.Add(exceso >= sum(vars_dia) - tope_diario)
            terminos.append(PESO_EXCESO_DIA * exceso)

    model.Minimize(sum(terminos))


def _resolver_modelo(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, str, int], Any],
    vars_admin: Dict[Tuple[int, str, int], Any],
    faltantes: Optional[List[Any]] = None,
) -> Tuple[str, float, List[Tuple[int, int, str, int]], List[Tuple[int, str, int]], int]:
    """Resuelve el modelo CP-SAT y devuelve las variables activas."""
    logger.info("Iniciando resolución del modelo...")
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = int(os.getenv("SOLVER_MAX_TIME_SECONDS", "300"))

    # Tope de hilos de búsqueda: 0 = usar todos los disponibles (por defecto).
    num_workers = int(os.getenv("SOLVER_WORKERS", "0"))
    if num_workers >= 0:
        solver.parameters.num_search_workers = num_workers

    # Tope de memoria en MB: 0 = sin límite (por defecto).
    max_memory = int(os.getenv("SOLVER_MAX_MEMORY_MB", "0"))
    if max_memory > 0:
        solver.parameters.max_memory_in_mb = max_memory

    start_time = datetime.now()
    status = solver.Solve(model)
    elapsed_time = (datetime.now() - start_time).total_seconds()

    status_map = {
        cp_model.OPTIMAL: "OPTIMAL",
        cp_model.FEASIBLE: "FEASIBLE",
        cp_model.INFEASIBLE: "INFEASIBLE",
        cp_model.MODEL_INVALID: "MODEL_INVALID",
    }
    status_str = status_map.get(status, "UNKNOWN")

    clases_activas: List[Tuple[int, int, str, int]] = []
    admin_activas: List[Tuple[int, str, int]] = []
    sesiones_faltantes = 0

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for k, var in vars_clase.items():
            if solver.Value(var) == 1:
                clases_activas.append(k)
        for k, var in vars_admin.items():
            if solver.Value(var) == 1:
                admin_activas.append(k)
        for var in faltantes or []:
            sesiones_faltantes += solver.Value(var)

    return (
        status_str,
        elapsed_time,
        clases_activas,
        admin_activas,
        sesiones_faltantes,
    )


def _asignar_salones_intervalos(
    clases: List[Tuple[int, int, str, int]],
    datos: DatosOptimizacion,
) -> Dict[Tuple[int, int, str, int], Optional[int]]:
    """Asigna un salón a cada sesión por intervalo (matching glotón por capacidad).

    Procesa las sesiones en orden de inicio; a cada una le entrega el salón de
    menor capacidad que la soporte y que NO esté ocupado durante su intervalo
    completo en ese día. La condición de Hall por instante garantiza existencia.
    """
    # Ocupación por salón: salon_id -> dia -> lista de (ini, fin) en ticks
    ocupacion: Dict[int, Dict[str, List[Tuple[int, int]]]] = {
        s.id: {} for s in datos.salones
    }
    orden = sorted(datos.salones, key=lambda s: s.capacidad)

    asignacion: Dict[Tuple[int, int, str, int], Optional[int]] = {}

    # Ordenar por día y hora de inicio.
    for (g_idx, d_idx, dia, inicio) in sorted(
        clases, key=lambda c: (c[2], c[3])
    ):
        dur_ticks = _dur_grupo(datos.grupos[g_idx]) * TICKS_POR_BLOQUE
        fin = inicio + dur_ticks
        tam = datos.grupos[g_idx].total_estudiantes

        elegido: Optional[int] = None
        for salon in orden:
            if salon.capacidad < tam:
                continue
            dias_ocup = ocupacion[salon.id].get(dia, [])
            if all(fin <= i or inicio >= f for (i, f) in dias_ocup):
                elegido = salon.id
                ocupacion[salon.id].setdefault(dia, []).append((inicio, fin))
                break

        asignacion[(g_idx, d_idx, dia, inicio)] = elegido

    return asignacion


def _guardar_horarios_bd(
    db: Session,
    datos: DatosOptimizacion,
    clases_activas: List[Tuple[int, int, str, int]],
    admin_activas: List[Tuple[int, str, int]],
) -> int:
    """Guarda clases (por intervalo) y horas administrativas en la base de datos."""
    logger.info("Guardando horarios optimizados en BD...")
    db.query(HorarioOptimizado).delete()

    contador = 0

    clases_con_salon = [
        (g, d, dia, ini)
        for (g, d, dia, ini) in clases_activas
    ]
    asignacion_salon = _asignar_salones_intervalos(clases_con_salon, datos)

    for (g_idx, d_idx, dia, inicio) in clases_activas:
        dur = _dur_grupo(datos.grupos[g_idx])
        salon_id = asignacion_salon.get((g_idx, d_idx, dia, inicio))
        db.add(
            HorarioOptimizado(
                grupo_proyectado_id=datos.grupos[g_idx].id,
                docente_id=datos.docentes[d_idx].id,
                salon_id=salon_id,
                dia=dia,
                bloque_horario=_fmt_intervalo(inicio, dur),
                tipo_actividad="CLASE",
            )
        )
        contador += 1

    # Agrupar horas administrativas consecutivas del mismo docente/día en un
    # solo bloque para una representación más limpia en la malla.
    admin_por_docente_dia: Dict[Tuple[int, str], List[int]] = {}
    for (d_idx, dia, inicio) in admin_activas:
        admin_por_docente_dia.setdefault((d_idx, dia), []).append(inicio)

    for (d_idx, dia), inicios in admin_por_docente_dia.items():
        inicios = sorted(inicios)
        inicio_blk = inicios[0]
        fin_blk = inicio_blk + TICKS_POR_BLOQUE
        for inicio in inicios[1:]:
            if inicio == fin_blk:
                fin_blk = inicio + TICKS_POR_BLOQUE
            else:
                db.add(
                    HorarioOptimizado(
                        grupo_proyectado_id=None,
                        docente_id=datos.docentes[d_idx].id,
                        salon_id=None,
                        dia=dia,
                        bloque_horario=_fmt_intervalo(
                            inicio_blk, (fin_blk - inicio_blk) // TICKS_POR_BLOQUE
                        ),
                        tipo_actividad="ADMINISTRATIVA",
                    )
                )
                contador += 1
                inicio_blk = inicio
                fin_blk = inicio + TICKS_POR_BLOQUE
        db.add(
            HorarioOptimizado(
                grupo_proyectado_id=None,
                docente_id=datos.docentes[d_idx].id,
                salon_id=None,
                dia=dia,
                bloque_horario=_fmt_intervalo(
                    inicio_blk, (fin_blk - inicio_blk) // TICKS_POR_BLOQUE
                ),
                tipo_actividad="ADMINISTRATIVA",
            )
        )
        contador += 1

    db.commit()
    logger.info(f"Total de registros insertados (Clases + Admin): {contador}")
    return contador


def _construir_modelo(
    datos: DatosOptimizacion,
    exigir_horas_admin: bool = True,
) -> Tuple[
    cp_model.CpModel,
    Dict[Tuple[int, int, str, int], Any],
    Dict[Tuple[int, str, int], Any],
    List[int],
    List[Any],
]:
    """Construye el modelo CP-SAT completo con todas las restricciones."""
    model = cp_model.CpModel()

    vars_clase, vars_admin, dur_list = _crear_variables_decision(model, datos)

    _agregar_restriccion_conflicto_docente(model, vars_clase, vars_admin, datos, dur_list)
    _agregar_restriccion_docente_unico_grupo(model, vars_clase, datos)
    _agregar_restriccion_capacidad_salones(model, vars_clase, datos, dur_list)
    _agregar_restriccion_dispersion_cohorte(model, vars_clase, datos, dur_list)
    deficits_admin = _agregar_restriccion_horas_docente(
        model, vars_clase, vars_admin, datos, dur_list, exigir_horas_admin=exigir_horas_admin
    )
    faltantes = _agregar_restriccion_cobertura_grupos(model, vars_clase, datos)

    _agregar_funcion_objetivo(model, datos, vars_clase, vars_admin, faltantes, deficits_admin)

    return model, vars_clase, vars_admin, dur_list, faltantes


def _validar_horas_admin(datos: DatosOptimizacion) -> Optional[str]:
    """Pre-validación: detecta horas administrativas imposibles de cumplir."""
    problemas = []
    for docente in datos.docentes:
        requeridas = getattr(docente, "horas_administrativas", 0) or 0
        if requeridas == 0:
            continue
        disponibles = len(datos.disp_admin.get(docente.id, set()))
        if disponibles < requeridas:
            problemas.append(
                f"{docente.nombre} requiere {requeridas} hora(s) administrativas "
                f"pero solo tiene {disponibles} ranura(s) disponibles"
            )
        elif docente.horas_maximas < requeridas:
            problemas.append(
                f"{docente.nombre}: sus horas administrativas superan sus horas máximas"
            )
    return "; ".join(problemas) if problemas else None


def _grupos_sin_docente_elegible(datos: DatosOptimizacion) -> List[str]:
    """Materias cuyos grupos no tienen ningún docente autorizado para dictarlas."""
    capacidad_maxima = max((s.capacidad for s in datos.salones), default=0)
    nombres: List[str] = []
    for grupo in datos.grupos:
        if grupo.total_estudiantes > capacidad_maxima:
            continue
        asignatura_id = grupo.asignatura.id
        elegibles = [
            docente for docente in datos.docentes
            if asignatura_id in datos.docente_asignaturas.get(docente.id, set())
        ]
        if not elegibles:
            nombre = grupo.asignatura.nombre
            if nombre not in nombres:
                nombres.append(nombre)
    return nombres


def _grupos_sin_ventana_viable(datos: DatosOptimizacion) -> List[str]:
    """Materias cuyos grupos no tienen NINGÚN inicio posible.

    Ocurre cuando la disponibilidad de los docentes no cubre la ventana del
    semestre (por ejemplo, materia de 6° en adelante sin disponibilidad
    nocturna) o cuando el grupo excede la capacidad de los salones.
    """
    capacidad_maxima = max((s.capacidad for s in datos.salones), default=0)
    sin_posibilidad: Dict[str, int] = {}

    for grupo in datos.grupos:
        if grupo.total_estudiantes > capacidad_maxima:
            continue
        dur = _dur_grupo(grupo)
        semestre = grupo.asignatura.semestre
        inicios = (
            _inicios_nocturnos(dur)
            if _es_semestre_nocturno(semestre)
            else _inicios_diurnos(dur)
        )
        if not inicios:
            continue

        asignatura_id = grupo.asignatura.id
        docente_ids = {
            docente.id
            for docente in datos.docentes
            if asignatura_id in datos.docente_asignaturas.get(docente.id, set())
        }

        viable = False
        for docente_id in docente_ids:
            disp = datos.disp_slots.get(docente_id, set())
            for dia in datos.dias:
                ticks_dia = {t for (dd, t) in disp if dd == dia}
                if not ticks_dia:
                    continue
                for inicio in inicios:
                    if all(
                        (inicio + k) in ticks_dia
                        for k in range(dur * TICKS_POR_BLOQUE)
                    ):
                        viable = True
                        break
                if viable:
                    break
            if viable:
                break

        if not viable:
            nombre = grupo.asignatura.nombre
            sin_posibilidad[nombre] = sin_posibilidad.get(nombre, 0) + 1

    return [
        f"{nombre} ({cantidad} grupo(s))"
        for nombre, cantidad in sorted(sin_posibilidad.items())
    ]


def resolver_horarios_uctp(db: Session) -> ResultadoOptimizacion:
    """Punto de entrada principal orquestador del motor CP-SAT de forma global."""
    try:
        start_total = datetime.now()
        datos = _extraer_datos_bd(db)

        if not datos.grupos or not datos.docentes or not datos.salones or not datos.dias:
            msg = "Datos insuficientes en la BD para ejecutar el motor"
            logger.error(msg)
            return ResultadoOptimizacion(
                status="ERROR", tiempo_ejecucion=0.0, total_asignaciones=0,
                grupos_asignados=0, total_grupos=len(datos.grupos), mensaje=msg,
            )

        problemas_admin = _validar_horas_admin(datos)
        if problemas_admin:
            msg = f"Horas administrativas no cumplibles: {problemas_admin}"
            logger.error(msg)
            return ResultadoOptimizacion(
                status="INFEASIBLE", tiempo_ejecucion=0.0, total_asignaciones=0,
                grupos_asignados=0, total_grupos=len(datos.grupos), mensaje=msg,
            )

        advertencias: List[str] = []
        sin_docente = _grupos_sin_docente_elegible(datos)
        if sin_docente:
            advertencias.append(
                f"Grupos sin docente autorizado para la materia: {', '.join(sin_docente)}"
            )

        sin_ventana = _grupos_sin_ventana_viable(datos)
        if sin_ventana:
            advertencias.append(
                "Grupos sin horario posible (disponibilidad fuera de la ventana del "
                f"semestre o sin salón con capacidad suficiente): {', '.join(sin_ventana)}"
            )

        model, vars_clase, vars_admin, _dur, faltantes = _construir_modelo(
            datos, exigir_horas_admin=True
        )
        status_str, elapsed_time, clases_activas, admin_activas, sesiones_faltantes = (
            _resolver_modelo(model, vars_clase, vars_admin, faltantes)
        )

        # Diagnóstico: si es INFEASIBLE, probar sin la exigencia de horas admin
        # para determinar si ellas son la causa.
        if status_str == "INFEASIBLE":
            logger.warning("Modelo INFEASIBLE. Reintentando sin horas admin obligatorias para diagnosticar...")
            modelo_diag, vars_diag, admin_diag, _dur_diag, _falt_diag = _construir_modelo(
                datos, exigir_horas_admin=False
            )
            status_diag, _, _, _, _ = _resolver_modelo(modelo_diag, vars_diag, admin_diag)
            if status_diag in ("OPTIMAL", "FEASIBLE"):
                con_admin = [
                    d.nombre for d in datos.docentes
                    if (getattr(d, "horas_administrativas", 0) or 0) > 0
                ]
                msg = "INFEASIBLE causado por las horas administrativas obligatorias"
                if con_admin:
                    msg += f" de: {', '.join(con_admin)}"
                msg += ". Revise horas_administrativas y disponibilidades."
            else:
                msg = (
                    "INFEASIBLE: no existe solución (revise disponibilidades de docentes, "
                    "materias asignadas, capacidad de salones y bloques horarios)."
                )
            if advertencias:
                msg += " Advertencias: " + "; ".join(advertencias)
            return ResultadoOptimizacion(
                status="INFEASIBLE",
                tiempo_ejecucion=(datetime.now() - start_total).total_seconds(),
                total_asignaciones=0,
                grupos_asignados=0,
                total_grupos=len(datos.grupos),
                mensaje=msg,
            )

        total_asignaciones = 0
        grupos_asignados = 0

        if status_str in ("OPTIMAL", "FEASIBLE"):
            total_asignaciones = _guardar_horarios_bd(
                db, datos, clases_activas, admin_activas
            )
            grupos_asignados = len({g for (g, _d, _dia, _ini) in clases_activas})

        mensaje = f"Optimización {status_str}: {total_asignaciones} bloques guardados (Clases + Admin)"
        if sesiones_faltantes:
            mensaje += f" | Sesiones sin programar: {sesiones_faltantes}"
        if advertencias:
            mensaje += " | Advertencias: " + "; ".join(advertencias)

        return ResultadoOptimizacion(
            status=status_str,
            tiempo_ejecucion=elapsed_time,
            total_asignaciones=total_asignaciones,
            grupos_asignados=grupos_asignados,
            total_grupos=len(datos.grupos),
            mensaje=mensaje,
        )

    except Exception as e:
        logger.exception("Error durante la optimización")
        return ResultadoOptimizacion(
            status="ERROR",
            tiempo_ejecucion=0.0,
            total_asignaciones=0,
            grupos_asignados=0,
            total_grupos=0,
            mensaje=f"Error: {str(e)}",
        )
