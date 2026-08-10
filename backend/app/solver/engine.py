"""
Motor de optimización para el problema de horarios universitarios (UCTP).

Este módulo implementa un solver basado en Google OR-Tools CP-SAT para resolver
el problema de asignación de horarios, docentes y salones de forma óptima,
respetando restricciones duras como horas lectivas, horas administrativas y
evitando cruces de materias del mismo semestre.

Autor: Sistema de Optimización de Horarios
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, NamedTuple, Tuple, Optional

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

HORAS_POR_BLOQUE = 2  # Estándar alineado a tus bloques de 2 horas en la BD (ej. 08:00-10:00)


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
) -> Tuple[Dict[Tuple[int, int, int, int], Any], Dict[Tuple[int, int], Any]]:
    """Crea las variables binarias para clases y horas administrativas."""
    logger.info("Creando variables de decisión (Clases y Horas Administrativas)...")

    vars_clase = {}
    for g_idx, _ in enumerate(grupos):
        for d_idx, _ in enumerate(docentes):
            for s_idx, _ in enumerate(salones):
                for t_idx, _ in enumerate(bloques_horarios):
                    var_name = f"x[g{g_idx}_d{d_idx}_s{s_idx}_t{t_idx}]"
                    vars_clase[(g_idx, d_idx, s_idx, t_idx)] = model.NewBoolVar(var_name)

    vars_admin = {}
    for d_idx, _ in enumerate(docentes):
        for t_idx, _ in enumerate(bloques_horarios):
            var_name = f"y[d{d_idx}_t{t_idx}]"
            vars_admin[(d_idx, t_idx)] = model.NewBoolVar(var_name)

    logger.info(f"Variables creadas: {len(vars_clase)} de clases, {len(vars_admin)} administrativas.")
    return vars_clase, vars_admin


def _agregar_restriccion_disponibilidad_docente(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, int, int], Any],
    vars_admin: Dict[Tuple[int, int], Any],
    docentes: List[Docente],
    bloques_horarios: List[Tuple[str, str]],
    disponibilidades: Dict[int, set],
) -> None:
    """Garantiza que el docente solo actúe si está disponible."""
    for (g_idx, d_idx, s_idx, t_idx), var in vars_clase.items():
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
    vars_clase: Dict[Tuple[int, int, int, int], Any],
    vars_admin: Dict[Tuple[int, int], Any],
    docentes: List[Docente],
    bloques_horarios: List[Tuple[str, str]],
) -> None:
    """Un docente solo puede hacer 1 actividad a la vez."""
    for d_idx, _ in enumerate(docentes):
        for t_idx, _ in enumerate(bloques_horarios):
            clases = [var for (g, d, s, t), var in vars_clase.items() if d == d_idx and t == t_idx]
            admin_var = vars_admin.get((d_idx, t_idx))

            if admin_var is not None:
                model.Add(sum(clases) + admin_var <= 1)
            else:
                model.Add(sum(clases) <= 1)


def _agregar_restriccion_horas_docente(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, int, int], Any],
    vars_admin: Dict[Tuple[int, int], Any],
    docentes: List[Docente],
) -> None:
    """Controla la asignación exacta de horas administrativas y el límite máximo."""
    for d_idx, docente in enumerate(docentes):
        horas_admin_req = getattr(docente, "horas_administrativas", 0)
        admin_vars_docente = [var for (d, t), var in vars_admin.items() if d == d_idx]

        # 1. Asignación exacta de bloques administrativos basados en la BD de 2 horas
        if admin_vars_docente and horas_admin_req > 0:
            bloques_admin_necesarios = max(1, horas_admin_req // HORAS_POR_BLOQUE)
            model.Add(sum(admin_vars_docente) == bloques_admin_necesarios)
        elif admin_vars_docente:
            model.Add(sum(admin_vars_docente) == 0)

        # 2. Control total de horas combinadas (Clases + Admin <= Horas Máximas)
        clase_vars_docente = [var for (g, d, s, t), var in vars_clase.items() if d == d_idx]
        max_bloques_totales = docente.horas_maximas // HORAS_POR_BLOQUE

        model.Add(sum(clase_vars_docente) + sum(admin_vars_docente) <= max_bloques_totales)


def _agregar_funcion_objetivo_penalizacion(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, int, int], Any],
    vars_admin: Dict[Tuple[int, int], Any],
    docentes: List[Docente],
    bloques_horarios: List[Tuple[str, str]],
) -> None:
    """Penaliza la dispersión de las horas administrativas para mantenerlas agrupadas."""
    logger.info("Configurando función objetivo y penalizaciones de horario...")
    
    penalizaciones = []
    dias_unicos = sorted(list(set(dia for dia, _ in bloques_horarios)))

    for d_idx, _ in enumerate(docentes):
        dias_con_admin = []
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
                dias_con_admin.append(is_dia_activo)

        if dias_con_admin:
            penalizaciones.append(sum(dias_con_admin) * 10)

    if penalizaciones:
        model.Minimize(sum(penalizaciones))


def _agregar_restriccion_no_cruce_semestres(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, int, int], Any],
    grupos: List[GrupoProyectado],
    bloques_horarios: List[Tuple[str, str]],
) -> None:
    """Evita cruces de materias del mismo semestre."""
    semestres = {}
    for g_idx, grupo in enumerate(grupos):
        semestre = getattr(grupo.asignatura, "semestre", None)
        if semestre is not None:
            semestres.setdefault(semestre, []).append(g_idx)

    for semestre, grupo_indices in semestres.items():
        if len(grupo_indices) > 1:
            for t_idx, _ in enumerate(bloques_horarios):
                clases_semestre = [
                    var for (g, d, s, t), var in vars_clase.items()
                    if g in grupo_indices and t == t_idx
                ]
                if clases_semestre:
                    model.Add(sum(clases_semestre) <= 1)


def _agregar_restriccion_capacidad_salon(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, int, int], Any],
    grupos: List[GrupoProyectado],
    salones: List[Salon],
) -> None:
    for (g_idx, d_idx, s_idx, t_idx), var in vars_clase.items():
        if grupos[g_idx].total_estudiantes > salones[s_idx].capacidad:
            model.Add(var == 0)


def _agregar_restriccion_conflicto_salon(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, int, int], Any],
    salones: List[Salon],
    bloques_horarios: List[Tuple[str, str]],
) -> None:
    for s_idx, _ in enumerate(salones):
        for t_idx, _ in enumerate(bloques_horarios):
            vars_salon = [var for (g, d, s, t), var in vars_clase.items() if s == s_idx and t == t_idx]
            if vars_salon:
                model.Add(sum(vars_salon) <= 1)


def _agregar_restriccion_cobertura_grupos(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, int, int], Any],
    grupos: List[GrupoProyectado],
) -> None:
    for g_idx, grupo in enumerate(grupos):
        bloques_necesarios = grupo.asignatura.horas_semanales // HORAS_POR_BLOQUE
        vars_grupo = [var for (g, d, s, t), var in vars_clase.items() if g == g_idx]
        if vars_grupo and bloques_necesarios > 0:
            model.Add(sum(vars_grupo) >= bloques_necesarios)


def _resolver_modelo(
    model: cp_model.CpModel,
    vars_clase: Dict[Tuple[int, int, int, int], Any],
    vars_admin: Dict[Tuple[int, int], Any],
) -> Tuple[str, float, Dict[Tuple[int, int, int, int], bool], Dict[Tuple[int, int], bool]]:
    """Resuelve el modelo CP-SAT."""
    logger.info("Iniciando resolución del modelo...")
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 300
    
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


def _guardar_horarios_bd(
    db: Session,
    asignaciones_clase: Dict[Tuple[int, int, int, int], bool],
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

    for (g_idx, d_idx, s_idx, t_idx), asignado in asignaciones_clase.items():
        if asignado:
            dia, bloque_horario = bloques_horarios[t_idx]
            horario = HorarioOptimizado(
                grupo_proyectado_id=grupos[g_idx].id,
                docente_id=docentes[d_idx].id,
                salon_id=salones[s_idx].id,
                dia=dia,
                bloque_horario=bloque_horario,
                tipo_actividad="CLASE",
            )
            db.add(horario)
            contador += 1

    for (d_idx, t_idx), asignado in asignaciones_admin.items():
        if asignado:
            dia, bloque_horario = bloques_horarios[t_idx]
            horario = HorarioOptimizado(
                grupo_proyectado_id=None,
                docente_id=docentes[d_idx].id,
                salon_id=None,
                dia=dia,
                bloque_horario=bloque_horario,
                tipo_actividad="ADMINISTRATIVA",
            )
            db.add(horario)
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
            model, datos.grupos, datos.docentes, datos.salones, datos.bloques_horarios
        )

        _agregar_restriccion_capacidad_salon(model, vars_clase, datos.grupos, datos.salones)
        _agregar_restriccion_disponibilidad_docente(
            model, vars_clase, vars_admin, datos.docentes, datos.bloques_horarios, datos.disponibilidades
        )
        _agregar_restriccion_conflicto_docente(model, vars_clase, vars_admin, datos.docentes, datos.bloques_horarios)
        _agregar_restriccion_conflicto_salon(model, vars_clase, datos.salones, datos.bloques_horarios)
        _agregar_restriccion_horas_docente(model, vars_clase, vars_admin, datos.docentes)
        _agregar_restriccion_cobertura_grupos(model, vars_clase, datos.grupos)
        _agregar_restriccion_no_cruce_semestres(model, vars_clase, datos.grupos, datos.bloques_horarios)

        _agregar_funcion_objetivo_penalizacion(model, vars_clase, vars_admin, datos.docentes, datos.bloques_horarios)

        status_str, elapsed_time, asig_clase, asig_admin = _resolver_modelo(model, vars_clase, vars_admin)

        total_asignaciones = 0
        grupos_asignados = 0

        if status_str in ("OPTIMAL", "FEASIBLE"):
            total_asignaciones = _guardar_horarios_bd(
                db, asig_clase, asig_admin, datos.grupos, datos.docentes, datos.salones, datos.bloques_horarios
            )
            grupos_asignados_ids = {g_idx for (g_idx, _, _, _), asignado in asig_clase.items() if asignado}
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