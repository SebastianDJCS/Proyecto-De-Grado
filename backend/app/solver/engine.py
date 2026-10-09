"""
Motor de optimización para el problema de horarios universitarios (UCTP).

Este módulo implementa un solver basado en Google OR-Tools CP-SAT con
**intervalos de duración variable** (1, 2 o 3 horas por sesión).

Modelo de tiempo:
- La jornada se representa en ranuras de 1 hora (hora entera H = H:00-H:00+1).
- Cada sesión de clase de un grupo ocupa ``horas_por_seccion`` ranuras
  consecutivas dentro de un mismo día, comenzando en una hora de inicio válida.
- Un docente/ grupo/ salón no puede solapar dos actividades en el mismo instante.

Decisiones:
- Para cada grupo: UN docente (restricción dura) y sus inicios de sesión.
- Las horas administrativas son obligatorias (exactas) por docente.
- Los salones se asignan después por intervalo mediante un matching glotón
  por capacidad (evitando la explosión de simetría de la dimensión "salón").

Garantía para el estudiante: a lo sumo UNA clase por (semestre, ranura), de
modo que cualquier combinación de grupos de un semestre es siempre sin cruces.
"""

import logging
import math
import os
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

# Jornada de enseñanza en ranuras de 1 hora: [HORA_INICIO, HORA_FIN)
HORA_INICIO = 6   # 06:00
HORA_FIN = 20     # 20:00 (la última ranura es 19:00-20:00)
DIAS_ORDEN = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

# Pesos del objetivo
PESO_CLASE_FALTANTE = 100
PESO_ADMIN_FALTANTE = 100
PESO_DIA_ADMIN = 1

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
    # docente_id -> set de (dia, hora_entera) disponibles
    disp_slots: Dict[int, Set[Tuple[str, int]]]
    dias: List[str]
    # docente_id -> conjunto de asignatura_ids que puede dictar (vacío = ninguno)
    docente_asignaturas: Dict[int, set]


def _horas_enteras_de_bloque(bloque: str) -> List[int]:
    """Convierte un bloque "HH:MM-HH:MM" en las ranuras horarias ENTERAS que cubre.

    Solo incluye las horas completamente contenidas en el bloque. Ej.:
    "08:00-12:00" -> [8, 9, 10, 11]; "06:00-08:00" -> [6, 7].
    """
    try:
        inicio, fin = bloque.split("-")
        h_ini = int(inicio.split(":")[0])
        h_fin = int(fin.split(":")[0])
        return [h for h in range(h_ini, h_fin) if HORA_INICIO <= h < HORA_FIN]
    except (ValueError, AttributeError):
        return []


def _dur_grupo(grupo: GrupoProyectado) -> int:
    """Duración en ranuras (horas) de cada sesión del grupo (1, 2 o 3)."""
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


def _fmt_intervalo(inicio_h: int, dur: int) -> str:
    """Representa un intervalo como "HH:MM-HH:MM" (ej. 8, 3 -> 08:00-11:00)."""
    fin_h = inicio_h + dur
    return f"{inicio_h:02d}:00-{fin_h:02d}:00"


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
        for h in _horas_enteras_de_bloque(disp.bloque_horario):
            slot_set.add((disp.dia, h))
        dias_set.add(disp.dia)

    dias = [d for d in DIAS_ORDEN if d in dias_set] or sorted(dias_set)

    docente_asignaturas = {
        docente.id: {asignatura.id for asignatura in docente.asignaturas}
        for docente in docentes
    }

    total_slots = sum(len(s) for s in disp_slots.values())
    logger.info(
        f"Datos extraídos: {len(grupos)} grupos, {len(docentes)} docentes, "
        f"{len(salones)} salones, {len(dias)} días, {total_slots} ranuras disponibles"
    )

    return DatosOptimizacion(
        grupos=grupos,
        docentes=docentes,
        salones=salones,
        disp_slots=disp_slots,
        dias=dias,
        docente_asignaturas=docente_asignaturas,
    )


def _crear_variables_decision(
    model: cp_model.CpModel,
    datos: DatosOptimizacion,
) -> Tuple[Dict[Tuple[int, int, str, int], Any], Dict[Tuple[int, str, int], Any], List[int]]:
    """Crea variables de clase x[g,d,dia,inicio] e administrativas y[d,dia,h].

    Una variable de clase representa que el grupo ``g`` dictado por el docente
    ``d`` COMIENZA una sesión de ``dur[g]`` ranuras en (dia, inicio). Solo se
    crean combinaciones factibles (docente disponible en TODAS las ranuras que
    ocupa la sesión y autorizado para la materia; grupo cabe en algún salón).
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
        for d_idx, docente in enumerate(datos.docentes):
            if asignatura_id not in datos.docente_asignaturas.get(docente.id, set()):
                continue
            disp = datos.disp_slots.get(docente.id, set())
            if not disp:
                continue
            for dia in datos.dias:
                horas_dia = {h for (dd, h) in disp if dd == dia}
                if not horas_dia:
                    continue
                for inicio in range(HORA_INICIO, HORA_FIN - dur + 1):
                    if all((inicio + k) in horas_dia for k in range(dur)):
                        vars_clase[(g_idx, d_idx, dia, inicio)] = model.NewBoolVar(
                            f"x[g{g_idx}_d{d_idx}_{dia}_{inicio}]"
                        )

    vars_admin: Dict[Tuple[int, str, int], Any] = {}
    for d_idx, docente in enumerate(datos.docentes):
        disp = datos.disp_slots.get(docente.id, set())
        for (dia, h) in sorted(disp):
            vars_admin[(d_idx, dia, h)] = model.NewBoolVar(f"y[d{d_idx}_{dia}_{h}]")

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
    """Un docente solo puede hacer 1 actividad a la vez (por ranura instantánea)."""
    # Indexar variables de clase por (docente, dia) para eficiencia.
    por_docente_dia: Dict[Tuple[int, str], List[Tuple[int, int, Any]]] = {}
    for (g_idx, d_idx, dia, inicio), var in vars_clase.items():
        por_docente_dia.setdefault((d_idx, dia), []).append((g_idx, inicio, var))

    for d_idx, docente in enumerate(datos.docentes):
        for dia in datos.dias:
            entradas = por_docente_dia.get((d_idx, dia), [])
            for h in range(HORA_INICIO, HORA_FIN):
                activas = [
                    var for (g_idx, inicio, var) in entradas
                    if inicio <= h < inicio + dur_list[g_idx]
                ]
                admin_var = vars_admin.get((d_idx, dia, h))
                total = activas + ([admin_var] if admin_var is not None else [])
                if len(total) > 1:
                    model.Add(sum(total) <= 1)


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

    Para cada ranura (dia, h) y umbral de tamaño c, el número de grupos de
    tamaño >= c activos en ese instante no puede superar el número de salones
    con capacidad >= c. Garantiza que exista un emparejamiento de salones por
    intervalo (proceso izquierda-derecha).
    """
    tamanos = sorted({g.total_estudiantes for g in datos.grupos})
    salones_c_cache: Dict[int, int] = {}
    for c in tamanos:
        salones_c_cache[c] = sum(1 for s in datos.salones if s.capacidad >= c)

    # Indexar por ranura instantánea (dia, h) -> [(tamaño, var)]
    por_instante: Dict[Tuple[str, int], List[Tuple[int, Any]]] = {}
    for (g_idx, _d_idx, dia, inicio), var in vars_clase.items():
        tam = datos.grupos[g_idx].total_estudiantes
        for k in range(dur_list[g_idx]):
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
    """A lo sumo una clase por (semestre, ranura instantánea).

    Garantiza que el estudiante pueda elegir CUALQUIER combinación de grupos de
    su semestre sin cruces, sin importar la duración de las sesiones.
    """
    por_semestre: Dict[Tuple[int, str, int], List[Any]] = {}
    for (g_idx, _d_idx, dia, inicio), var in vars_clase.items():
        semestre = datos.grupos[g_idx].asignatura.semestre
        for k in range(dur_list[g_idx]):
            por_semestre.setdefault((semestre, dia, inicio + k), []).append(var)

    for (_sem, _dia, _h), vars_ in por_semestre.items():
        if len(vars_) > 1:
            model.Add(sum(vars_) <= 1)


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

        # Horas totales (clase en ranuras + admin) <= horas máximas.
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
    vars_admin: Dict[Tuple[int, str, int], Any],
    faltantes: List[Any],
    deficits_admin: List[Any],
) -> None:
    """Objetivo: minimizar sesiones sin cubrir, déficit admin y dispersión admin."""
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

    model.Minimize(sum(terminos))


def _resolver_modelo(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, str, int], Any],
    vars_admin: Dict[Tuple[int, str, int], Any],
) -> Tuple[str, float, List[Tuple[int, int, str, int]], List[Tuple[int, str, int]]]:
    """Resuelve el modelo CP-SAT y devuelve las variables activas."""
    logger.info("Iniciando resolución del modelo...")
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = int(os.getenv("SOLVER_MAX_TIME_SECONDS", "300"))

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

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for k, var in vars_clase.items():
            if solver.Value(var) == 1:
                clases_activas.append(k)
        for k, var in vars_admin.items():
            if solver.Value(var) == 1:
                admin_activas.append(k)

    return status_str, elapsed_time, clases_activas, admin_activas


def _asignar_salones_intervalos(
    clases: List[Tuple[int, int, str, int, int]],
    datos: DatosOptimizacion,
) -> Dict[Tuple[int, int, str, int], Optional[int]]:
    """Asigna un salón a cada sesión por intervalo (matching glotón por capacidad).

    Procesa las sesiones en orden de inicio; a cada una le entrega el salón de
    menor capacidad que la soporte y que NO esté ocupado durante su intervalo
    completo en ese día. La condición de Hall por instante garantiza existencia.
    """
    # Ocupación por salón: salon_id -> dia -> lista de (ini, fin)
    ocupacion: Dict[int, Dict[str, List[Tuple[int, int]]]] = {
        s.id: {} for s in datos.salones
    }
    orden = sorted(datos.salones, key=lambda s: s.capacidad)

    asignacion: Dict[Tuple[int, int, str, int], Optional[int]] = {}

    # Ordenar por día y hora de inicio.
    for (g_idx, d_idx, dia, inicio) in sorted(
        clases, key=lambda c: (c[2], c[3])
    ):
        dur = _dur_grupo(datos.grupos[g_idx])
        fin = inicio + dur
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
    for (d_idx, dia, h) in admin_activas:
        admin_por_docente_dia.setdefault((d_idx, dia), []).append(h)

    for (d_idx, dia), horas in admin_por_docente_dia.items():
        horas = sorted(horas)
        inicio_blk = horas[0]
        fin_blk = horas[0] + 1
        for h in horas[1:]:
            if h == fin_blk:
                fin_blk = h + 1
            else:
                db.add(
                    HorarioOptimizado(
                        grupo_proyectado_id=None,
                        docente_id=datos.docentes[d_idx].id,
                        salon_id=None,
                        dia=dia,
                        bloque_horario=_fmt_intervalo(inicio_blk, fin_blk - inicio_blk),
                        tipo_actividad="ADMINISTRATIVA",
                    )
                )
                contador += 1
                inicio_blk = h
                fin_blk = h + 1
        db.add(
            HorarioOptimizado(
                grupo_proyectado_id=None,
                docente_id=datos.docentes[d_idx].id,
                salon_id=None,
                dia=dia,
                bloque_horario=_fmt_intervalo(inicio_blk, fin_blk - inicio_blk),
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
) -> Tuple[cp_model.CpModel, Dict[Tuple[int, int, str, int], Any], Dict[Tuple[int, str, int], Any], List[int]]:
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

    _agregar_funcion_objetivo(model, datos, vars_admin, faltantes, deficits_admin)

    return model, vars_clase, vars_admin, dur_list


def _validar_horas_admin(datos: DatosOptimizacion) -> Optional[str]:
    """Pre-validación: detecta horas administrativas imposibles de cumplir."""
    problemas = []
    for docente in datos.docentes:
        requeridas = getattr(docente, "horas_administrativas", 0) or 0
        if requeridas == 0:
            continue
        disponibles = len(datos.disp_slots.get(docente.id, set()))
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

        model, vars_clase, vars_admin, _dur = _construir_modelo(datos, exigir_horas_admin=True)
        status_str, elapsed_time, clases_activas, admin_activas = _resolver_modelo(
            model, vars_clase, vars_admin
        )

        # Diagnóstico: si es INFEASIBLE, probar sin la exigencia de horas admin
        # para determinar si ellas son la causa.
        if status_str == "INFEASIBLE":
            logger.warning("Modelo INFEASIBLE. Reintentando sin horas admin obligatorias para diagnosticar...")
            modelo_diag, vars_diag, admin_diag, _ = _construir_modelo(datos, exigir_horas_admin=False)
            status_diag, _, _, _ = _resolver_modelo(modelo_diag, vars_diag, admin_diag)
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
            status="ERROR", tiempo_ejecucion=0.0, total_asignaciones=0,
            grupos_asignados=0, total_grupos=0, mensaje=f"Error: {str(e)}",
        )
