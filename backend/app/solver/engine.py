"""
Motor de optimización para el problema de horarios universitarios (UCTP).

Este módulo implementa un solver basado en Google OR-Tools CP-SAT. El modelo
decide, para cada grupo, un único docente y los bloques horarios de sus clases;
los salones se asignan después por bloque mediante un matching de capacidad
(evitando la explosión de simetría de la dimensión "salón").

Restricciones consideradas:
- Disponibilidad de docentes.
- Un docente, un grupo y un salón no se solapan por bloque.
- Capacidad de salones por bloque (condición tipo Hall sobre tamaños).
- Un único docente por grupo.
- Horas lectivas (cobertura) y horas administrativas por docente.

Las secciones paralelas de un mismo semestre sí pueden coincidir en el tiempo.
"""

import logging
import os
from datetime import datetime
from typing import Any, Dict, List, NamedTuple, Optional, Tuple

from ortools.sat.python import cp_model
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models import (
    DisponibilidadDocente,
    Docente,
    GrupoProyectado,
    HorarioOptimizado,
    Salon,
)

logger = logging.getLogger(__name__)

HORAS_POR_BLOQUE = 2  # Cada bloque horario dura 2 horas (ej. 08:00-10:00)

# Pesos del objetivo
PESO_CLASE_FALTANTE = 100
PESO_ADMIN_FALTANTE = 100
PESO_DIA_ADMIN = 1


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
    disponibilidades: Dict[int, set]  # docente_id -> set of (dia, bloque_horario)
    bloques_horarios: List[Tuple[str, str]]  # lista de (dia, bloque_horario)


def _bloques_necesarios(horas: Optional[int]) -> int:
    """Bloques de 2h necesarios para cubrir las horas semanales (redondeo hacia arriba)."""
    if not horas or horas <= 0:
        return 0
    return max(1, (horas + HORAS_POR_BLOQUE - 1) // HORAS_POR_BLOQUE)


def _extraer_datos_bd(db: Session) -> DatosOptimizacion:
    """Extrae de la BD todos los datos de forma global para la optimización."""
    logger.info("Extrayendo datos globales de la base de datos...")

    grupos = db.query(GrupoProyectado).all()
    docentes = db.query(Docente).all()
    salones = db.query(Salon).all()
    disponibilidades_raw = db.query(DisponibilidadDocente).all()

    disponibilidades_map = {}
    bloques_set = set()

    for disponibilidad in disponibilidades_raw:
        docente_id = disponibilidad.docente_id
        bloque_key = (disponibilidad.dia, disponibilidad.bloque_horario)

        if docente_id not in disponibilidades_map:
            disponibilidades_map[docente_id] = set()

        disponibilidades_map[docente_id].add(bloque_key)
        bloques_set.add(bloque_key)

    bloques_horarios = sorted(list(bloques_set))

    logger.info(
        f"Datos extraídos: {len(grupos)} grupos, {len(docentes)} docentes, "
        f"{len(salones)} salones, {len(bloques_horarios)} bloques horarios"
    )

    return DatosOptimizacion(
        grupos=grupos,
        docentes=docentes,
        salones=salones,
        disponibilidades=disponibilidades_map,
        bloques_horarios=bloques_horarios,
    )


def _crear_variables_decision(
    model: cp_model.CpModel,
    grupos: List[GrupoProyectado],
    docentes: List[Docente],
    salones: List[Salon],
    bloques_horarios: List[Tuple[str, str]],
    disponibilidades: Dict[int, set],
) -> Tuple[Dict[Tuple[int, int, int], Any], Dict[Tuple[int, int], Any]]:
    """Crea las variables binarias de clases x[g,d,t] y administrativas y[d,t].

    Solo se crean variables de clase para combinaciones factibles (docente
    disponible en el bloque y al menos un salón con capacidad suficiente).
    """
    logger.info("Creando variables de decisión (Clases y Horas Administrativas)...")

    capacidad_maxima = max((s.capacidad for s in salones), default=0)

    vars_clase = {}
    for g_idx, grupo in enumerate(grupos):
        # Si el grupo no cabe en ningún salón, no puede programarse.
        if grupo.total_estudiantes > capacidad_maxima:
            continue
        for d_idx, docente in enumerate(docentes):
            bloques_docente = disponibilidades.get(docente.id, set())
            for t_idx, bloque in enumerate(bloques_horarios):
                if bloque not in bloques_docente:
                    continue
                var_name = f"x[g{g_idx}_d{d_idx}_t{t_idx}]"
                vars_clase[(g_idx, d_idx, t_idx)] = model.NewBoolVar(var_name)

    vars_admin = {}
    for d_idx, _ in enumerate(docentes):
        for t_idx, _ in enumerate(bloques_horarios):
            var_name = f"y[d{d_idx}_t{t_idx}]"
            vars_admin[(d_idx, t_idx)] = model.NewBoolVar(var_name)

    logger.info(f"Variables creadas: {len(vars_clase)} de clases, {len(vars_admin)} administrativas.")
    return vars_clase, vars_admin


def _agregar_restriccion_disponibilidad_docente(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, int], Any],
    vars_admin: Dict[Tuple[int, int], Any],
    docentes: List[Docente],
    bloques_horarios: List[Tuple[str, str]],
    disponibilidades: Dict[int, set],
) -> None:
    """Garantiza que el docente solo actúe si está disponible (clases y admin)."""
    for (g_idx, d_idx, t_idx), var in vars_clase.items():
        docente = docentes[d_idx]
        bloque = bloques_horarios[t_idx]
        if docente.id not in disponibilidades or bloque not in disponibilidades[docente.id]:
            model.Add(var == 0)

    for (d_idx, t_idx), var in vars_admin.items():
        docente = docentes[d_idx]
        bloque = bloques_horarios[t_idx]
        if docente.id not in disponibilidades or bloque not in disponibilidades[docente.id]:
            model.Add(var == 0)


def _agregar_restriccion_conflicto_docente(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, int], Any],
    vars_admin: Dict[Tuple[int, int], Any],
    docentes: List[Docente],
    bloques_horarios: List[Tuple[str, str]],
) -> None:
    """Un docente solo puede hacer 1 actividad a la vez."""
    for d_idx, _ in enumerate(docentes):
        for t_idx, _ in enumerate(bloques_horarios):
            clases = [var for (g, d, t), var in vars_clase.items() if d == d_idx and t == t_idx]
            admin_var = vars_admin.get((d_idx, t_idx))

            if admin_var is not None:
                model.Add(sum(clases) + admin_var <= 1)
            else:
                model.Add(sum(clases) <= 1)


def _agregar_restriccion_conflicto_grupo(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, int], Any],
    grupos: List[GrupoProyectado],
    bloques_horarios: List[Tuple[str, str]],
) -> None:
    """Un grupo solo puede tener una clase por bloque horario."""
    for g_idx, _ in enumerate(grupos):
        for t_idx, _ in enumerate(bloques_horarios):
            clases_grupo = [
                var for (g, d, t), var in vars_clase.items()
                if g == g_idx and t == t_idx
            ]
            if clases_grupo:
                model.Add(sum(clases_grupo) <= 1)


def _agregar_restriccion_docente_unico_grupo(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, int], Any],
    grupos: List[GrupoProyectado],
) -> None:
    """Cada grupo es dictado por un único docente en todas sus clases."""
    for g_idx, _ in enumerate(grupos):
        docentes_candidatos = sorted({d for (g, d, t) in vars_clase if g == g_idx})
        if not docentes_candidatos:
            continue

        z = {d: model.NewBoolVar(f"z[g{g_idx}_d{d}]") for d in docentes_candidatos}
        model.Add(sum(z.values()) == 1)

        for (g, d, t), var in vars_clase.items():
            if g == g_idx:
                model.Add(var <= z[d])


def _agregar_restriccion_capacidad_salones_bloque(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, int], Any],
    grupos: List[GrupoProyectado],
    salones: List[Salon],
    bloques_horarios: List[Tuple[str, str]],
) -> None:
    """Capacidad de salones por bloque (condición tipo Hall).

    Para cada bloque y cada umbral de tamaño c, el número de grupos de tamaño >= c
    programados en ese bloque no puede superar el número de salones con capacidad >= c.
    Esto garantiza que exista un emparejamiento válido de salones en cada bloque.
    """
    tamanos = sorted({g.total_estudiantes for g in grupos})

    for t_idx in range(len(bloques_horarios)):
        for c in tamanos:
            grupos_c = {g_idx for g_idx, g in enumerate(grupos) if g.total_estudiantes >= c}
            salones_c = sum(1 for s in salones if s.capacidad >= c)
            vars_c = [
                var for (g, d, t), var in vars_clase.items()
                if t == t_idx and g in grupos_c
            ]
            if vars_c:
                model.Add(sum(vars_c) <= salones_c)


def _agregar_restriccion_horas_docente(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, int], Any],
    vars_admin: Dict[Tuple[int, int], Any],
    docentes: List[Docente],
) -> List[Any]:
    """Limita las horas totales y reporta el déficit de horas administrativas.

    Devuelve una variable de déficit por docente (horas admin requeridas no
    asignadas), que el objetivo penaliza en lugar de volver el modelo infeasible.
    """
    deficits_admin = []
    for d_idx, docente in enumerate(docentes):
        horas_admin_req = getattr(docente, "horas_administrativas", 0) or 0
        admin_vars_docente = [var for (d, t), var in vars_admin.items() if d == d_idx]
        bloques_admin_necesarios = _bloques_necesarios(horas_admin_req)

        if admin_vars_docente:
            deficit = model.NewIntVar(0, bloques_admin_necesarios, f"falta_admin_d{d_idx}")
            model.Add(sum(admin_vars_docente) + deficit == bloques_admin_necesarios)
            deficits_admin.append(deficit)

            clase_vars_docente = [var for (g, d, t), var in vars_clase.items() if d == d_idx]
            max_bloques_totales = docente.horas_maximas // HORAS_POR_BLOQUE
            model.Add(sum(clase_vars_docente) + sum(admin_vars_docente) <= max_bloques_totales)

    return deficits_admin


def _agregar_restriccion_cobertura_grupos(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, int], Any],
    grupos: List[GrupoProyectado],
) -> List[Any]:
    """Fija los bloques requeridos por grupo y reporta los bloques faltantes."""
    faltantes = []
    for g_idx, grupo in enumerate(grupos):
        bloques_necesarios = _bloques_necesarios(grupo.asignatura.horas_semanales)
        vars_grupo = [var for (g, d, t), var in vars_clase.items() if g == g_idx]

        falta = model.NewIntVar(0, bloques_necesarios, f"falta_g{g_idx}")
        if vars_grupo:
            model.Add(sum(vars_grupo) + falta == bloques_necesarios)
        else:
            model.Add(falta == bloques_necesarios)
        faltantes.append(falta)

    return faltantes


def _agregar_funcion_objetivo(
    model: cp_model.CpModel,
    vars_admin: Dict[Tuple[int, int], Any],
    docentes: List[Docente],
    bloques_horarios: List[Tuple[str, str]],
    faltantes: List[Any],
    deficits_admin: List[Any],
) -> None:
    """Objetivo: minimizar bloques sin cubrir, déficit admin y dispersión admin."""
    logger.info("Configurando función objetivo...")

    terminos = []

    if faltantes:
        terminos.append(PESO_CLASE_FALTANTE * sum(faltantes))
    if deficits_admin:
        terminos.append(PESO_ADMIN_FALTANTE * sum(deficits_admin))

    # Agrupar las horas administrativas por día (penaliza tener admin en varios días).
    dias_unicos = sorted(list({dia for dia, _ in bloques_horarios}))
    for d_idx, _ in enumerate(docentes):
        for dia in dias_unicos:
            bloques_dia = [
                vars_admin[(d_idx, t_idx)]
                for t_idx, (b_dia, _) in enumerate(bloques_horarios)
                if b_dia == dia and (d_idx, t_idx) in vars_admin
            ]
            if bloques_dia:
                is_dia_activo = model.NewBoolVar(f"admin_dia_d{d_idx}_{dia}")
                model.Add(sum(bloques_dia) >= 1).OnlyEnforceIf(is_dia_activo)
                model.Add(sum(bloques_dia) == 0).OnlyEnforceIf(is_dia_activo.Not())
                terminos.append(PESO_DIA_ADMIN * is_dia_activo)

    model.Minimize(sum(terminos))


def _resolver_modelo(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, int], Any],
    vars_admin: Dict[Tuple[int, int], Any],
) -> Tuple[str, float, Dict[Tuple[int, int, int], bool], Dict[Tuple[int, int], bool]]:
    """Resuelve el modelo CP-SAT."""
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

    asignaciones_clase = {}
    asignaciones_admin = {}

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for k, var in vars_clase.items():
            asignaciones_clase[k] = solver.Value(var) == 1
        for k, var in vars_admin.items():
            asignaciones_admin[k] = solver.Value(var) == 1

    return status_str, elapsed_time, asignaciones_clase, asignaciones_admin


def _asignar_salon_bloque(
    grupos_ordenados: List[int],
    grupos: List[GrupoProyectado],
    salones: List[Salon],
) -> List[Optional[int]]:
    """Asigna un salón distinto a cada grupo del bloque (matching glotón por capacidad).

    Ordena los grupos por tamaño descendente y a cada uno le da el salón libre más
    pequeño que lo soporte. La restricción de capacidad del modelo garantiza que
    este emparejamiento exista.
    """
    disponibles = sorted(range(len(salones)), key=lambda i: salones[i].capacidad)
    asignados: Dict[int, Optional[int]] = {}

    for g_idx in sorted(grupos_ordenados, key=lambda g: grupos[g].total_estudiantes, reverse=True):
        tam = grupos[g_idx].total_estudiantes
        elegido = None
        for s_idx in disponibles:
            if salones[s_idx].capacidad >= tam:
                elegido = s_idx
                break
        if elegido is None and disponibles:
            elegido = disponibles[0]  # fallback defensivo (no debería ocurrir)
        if elegido is not None:
            disponibles.remove(elegido)
        asignados[g_idx] = elegido

    return [asignados[g] for g in grupos_ordenados]


def _guardar_horarios_bd(
    db: Session,
    asignaciones_clase: Dict[Tuple[int, int, int], bool],
    asignaciones_admin: Dict[Tuple[int, int], bool],
    grupos: List[GrupoProyectado],
    docentes: List[Docente],
    salones: List[Salon],
    bloques_horarios: List[Tuple[str, str]],
) -> int:
    """Guarda clases y horas administrativas en la base de datos."""
    logger.info("Guardando horarios optimizados en BD...")
    db.query(HorarioOptimizado).delete()

    contador = 0

    # Agrupar las clases asignadas por bloque (dia, bloque) para asignar salones.
    clases_por_bloque: Dict[int, List[Tuple[int, int]]] = {}
    for (g_idx, d_idx, t_idx), asignado in asignaciones_clase.items():
        if asignado:
            clases_por_bloque.setdefault(t_idx, []).append((g_idx, d_idx))

    for t_idx, pares in clases_por_bloque.items():
        dia, bloque_horario = bloques_horarios[t_idx]
        indices_grupos = [g for g, _ in pares]
        salones_asignados = _asignar_salon_bloque(indices_grupos, grupos, salones)

        for (g_idx, d_idx), s_idx in zip(pares, salones_asignados):
            db.add(
                HorarioOptimizado(
                    grupo_proyectado_id=grupos[g_idx].id,
                    docente_id=docentes[d_idx].id,
                    salon_id=salones[s_idx].id if s_idx is not None else None,
                    dia=dia,
                    bloque_horario=bloque_horario,
                    tipo_actividad="CLASE",
                )
            )
            contador += 1

    for (d_idx, t_idx), asignado in asignaciones_admin.items():
        if asignado:
            dia, bloque_horario = bloques_horarios[t_idx]
            db.add(
                HorarioOptimizado(
                    grupo_proyectado_id=None,
                    docente_id=docentes[d_idx].id,
                    salon_id=None,
                    dia=dia,
                    bloque_horario=bloque_horario,
                    tipo_actividad="ADMINISTRATIVA",
                )
            )
            contador += 1

    db.commit()
    logger.info(f"Total de registros insertados (Clases + Admin): {contador}")
    return contador


def resolver_horarios_uctp(db: Session) -> ResultadoOptimizacion:
    """Punto de entrada principal orquestador del motor CP-SAT de forma global."""
    try:
        datos = _extraer_datos_bd(db)

        if not datos.grupos or not datos.docentes or not datos.salones or not datos.bloques_horarios:
            msg = "Datos insuficientes en la BD para ejecutar el motor"
            logger.error(msg)
            return ResultadoOptimizacion(
                status="ERROR", tiempo_ejecucion=0.0, total_asignaciones=0,
                grupos_asignados=0, total_grupos=len(datos.grupos), mensaje=msg,
            )

        model = cp_model.CpModel()

        vars_clase, vars_admin = _crear_variables_decision(
            model, datos.grupos, datos.docentes, datos.salones, datos.bloques_horarios, datos.disponibilidades
        )

        _agregar_restriccion_disponibilidad_docente(
            model, vars_clase, vars_admin, datos.docentes, datos.bloques_horarios, datos.disponibilidades
        )
        _agregar_restriccion_conflicto_docente(model, vars_clase, vars_admin, datos.docentes, datos.bloques_horarios)
        _agregar_restriccion_conflicto_grupo(model, vars_clase, datos.grupos, datos.bloques_horarios)
        _agregar_restriccion_capacidad_salones_bloque(
            model, vars_clase, datos.grupos, datos.salones, datos.bloques_horarios
        )
        deficits_admin = _agregar_restriccion_horas_docente(model, vars_clase, vars_admin, datos.docentes)
        faltantes = _agregar_restriccion_cobertura_grupos(model, vars_clase, datos.grupos)
        _agregar_restriccion_docente_unico_grupo(model, vars_clase, datos.grupos)

        _agregar_funcion_objetivo(
            model, vars_admin, datos.docentes, datos.bloques_horarios, faltantes, deficits_admin
        )

        status_str, elapsed_time, asig_clase, asig_admin = _resolver_modelo(model, vars_clase, vars_admin)

        total_asignaciones = 0
        grupos_asignados = 0

        if status_str in ("OPTIMAL", "FEASIBLE"):
            total_asignaciones = _guardar_horarios_bd(
                db, asig_clase, asig_admin, datos.grupos, datos.docentes, datos.salones, datos.bloques_horarios
            )
            grupos_asignados_ids = {g_idx for (g_idx, _, _), asignado in asig_clase.items() if asignado}
            grupos_asignados = len(grupos_asignados_ids)

        mensaje = f"Optimización {status_str}: {total_asignaciones} bloques guardados (Clases + Admin)"

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
