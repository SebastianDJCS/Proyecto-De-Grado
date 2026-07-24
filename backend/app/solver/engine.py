"""
Motor de optimización para el problema de horarios universitarios (UCTP).

Este módulo implementa un solver basado en Google OR-Tools CP-SAT para resolver
el problema de asignación de horarios, docentes y salones de forma óptima,
respetando todas las restricciones duras del problema.

Autor: Sistema de Optimización de Horarios
Fecha: 2024
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, NamedTuple, Tuple

from ortools.sat.python import cp_model
from sqlalchemy.orm import Session

from app.models import (
    DisponibilidadDocente,
    Docente,
    GrupoProyectado,
    HorarioOptimizado,
    Salon,
)

logger = logging.getLogger(__name__)

from pydantic import BaseModel

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
    """
    Extrae de la BD todos los datos necesarios para la optimización.

    Args:
        db: Sesión de SQLAlchemy

    Returns:
        DatosOptimizacion con grupos, docentes, salones, disponibilidades y bloques
    """
    logger.info("Extrayendo datos de la base de datos...")

    # Extraer grupos proyectados con relaciones
    grupos = db.query(GrupoProyectado).all()
    if not grupos:
        logger.warning("No hay grupos proyectados en la BD")
        return DatosOptimizacion([], [], [], {}, [])

    # Extraer docentes con disponibilidades
    docentes = db.query(Docente).all()

    # Extraer salones
    salones = db.query(Salon).all()

    # Construir mapa de disponibilidades por docente
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
) -> Dict[Tuple[int, int, int, int], Any]:
    """
    Crea las variables de decisión binarias x[g, d, s, t].

    Args:
        model: Modelo CP-SAT
        grupos: Lista de grupos proyectados
        docentes: Lista de docentes
        salones: Lista de salones
        bloques_horarios: Lista de bloques horarios (dia, bloque_horario)

    Returns:
        Diccionario de variables binarias indexadas por (grupo_idx, docente_idx, salon_idx, bloque_idx)
    """
    logger.info("Creando variables de decisión...")

    variables = {}
    for g_idx, grupo in enumerate(grupos):
        for d_idx, docente in enumerate(docentes):
            for s_idx, salon in enumerate(salones):
                for t_idx, _ in enumerate(bloques_horarios):
                    var_name = f"x[g{g_idx}_d{d_idx}_s{s_idx}_t{t_idx}]"
                    variables[(g_idx, d_idx, s_idx, t_idx)] = model.NewBoolVar(var_name)

    logger.info(f"Total de variables de decisión: {len(variables)}")
    return variables


def _agregar_restriccion_capacidad_salon(
    model: cp_model.CpModel,
    variables: Dict[Tuple[int, int, int, int], Any],
    grupos: List[GrupoProyectado],
    salones: List[Salon],
) -> None:
    """
    Restricción: La capacidad del salón >= total de estudiantes del grupo.

    Args:
        model: Modelo CP-SAT
        variables: Variables de decisión
        grupos: Lista de grupos
        salones: Lista de salones
    """
    logger.info("Agregando restricción de capacidad de salones...")

    for (g_idx, d_idx, s_idx, t_idx), var in variables.items():
        grupo = grupos[g_idx]
        salon = salones[s_idx]

        if grupo.total_estudiantes > salon.capacidad:
            # Si el grupo no cabe en el salón, prohibir esta asignación
            model.Add(var == 0)

    logger.info("Restricción de capacidad agregada")


def _agregar_restriccion_disponibilidad_docente(
    model: cp_model.CpModel,
    variables: Dict[Tuple[int, int, int, int], Any],
    docentes: List[Docente],
    bloques_horarios: List[Tuple[str, str]],
    disponibilidades: Dict[int, set],
) -> None:
    """
    Restricción: El docente solo se asigna si está disponible en ese bloque.

    Args:
        model: Modelo CP-SAT
        variables: Variables de decisión
        docentes: Lista de docentes
        bloques_horarios: Lista de bloques horarios
        disponibilidades: Mapa de disponibilidades por docente
    """
    logger.info("Agregando restricción de disponibilidad de docentes...")

    for (g_idx, d_idx, s_idx, t_idx), var in variables.items():
        docente = docentes[d_idx]
        bloque = bloques_horarios[t_idx]

        # Si el docente NO está disponible en este bloque, prohibir
        if docente.id not in disponibilidades or bloque not in disponibilidades[docente.id]:
            model.Add(var == 0)

    logger.info("Restricción de disponibilidad agregada")


def _agregar_restriccion_conflicto_docente(
    model: cp_model.CpModel,
    variables: Dict[Tuple[int, int, int, int], Any],
    docentes: List[Docente],
    bloques_horarios: List[Tuple[str, str]],
) -> None:
    """
    Restricción: Un docente no puede dictar dos clases al mismo tiempo.

    Args:
        model: Modelo CP-SAT
        variables: Variables de decisión
        docentes: Lista de docentes
        bloques_horarios: Lista de bloques horarios
    """
    logger.info("Agregando restricción de conflicto de docentes...")

    # Para cada docente y bloque horario
    for d_idx, docente in enumerate(docentes):
        for t_idx, bloque in enumerate(bloques_horarios):
            # Todas las variables donde este docente está en este bloque
            vars_docente_bloque = [
                var for (g, d, s, t), var in variables.items()
                if d == d_idx and t == t_idx
            ]

            if vars_docente_bloque:
                # Como máximo 1 clase para este docente en este bloque
                model.Add(sum(vars_docente_bloque) <= 1)

    logger.info("Restricción de conflicto de docentes agregada")


def _agregar_restriccion_conflicto_salon(
    model: cp_model.CpModel,
    variables: Dict[Tuple[int, int, int, int], Any],
    salones: List[Salon],
    bloques_horarios: List[Tuple[str, str]],
) -> None:
    """
    Restricción: Un salón no puede albergar dos clases al mismo tiempo.

    Args:
        model: Modelo CP-SAT
        variables: Variables de decisión
        salones: Lista de salones
        bloques_horarios: Lista de bloques horarios
    """
    logger.info("Agregando restricción de conflicto de salones...")

    # Para cada salón y bloque horario
    for s_idx, salon in enumerate(salones):
        for t_idx, bloque in enumerate(bloques_horarios):
            # Todas las variables donde este salón está en este bloque
            vars_salon_bloque = [
                var for (g, d, s, t), var in variables.items()
                if s == s_idx and t == t_idx
            ]

            if vars_salon_bloque:
                # Como máximo 1 clase en este salón en este bloque
                model.Add(sum(vars_salon_bloque) <= 1)

    logger.info("Restricción de conflicto de salones agregada")


def _agregar_restriccion_horas_docente(
    model: cp_model.CpModel,
    variables: Dict[Tuple[int, int, int, int], Any],
    docentes: List[Docente],
) -> None:
    """
    Restricción: Respetar las horas máximas permitidas para cada docente.

    Asume que cada bloque = 2 horas de clase.

    Args:
        model: Modelo CP-SAT
        variables: Variables de decisión
        docentes: Lista de docentes
    """
    logger.info("Agregando restricción de horas máximas de docentes...")

    HORAS_POR_BLOQUE = 2  # Asumiendo bloques de 2 horas

    for d_idx, docente in enumerate(docentes):
        # Todas las asignaciones para este docente
        vars_docente = [
            var for (g, d, s, t), var in variables.items()
            if d == d_idx
        ]

        if vars_docente:
            # Total de bloques * 2 horas <= horas_maximas
            max_bloques = docente.horas_maximas // HORAS_POR_BLOQUE
            model.Add(sum(vars_docente) <= max_bloques)

    logger.info("Restricción de horas máximas agregada")


def _agregar_restriccion_cobertura_grupos(
    model: cp_model.CpModel,
    variables: Dict[Tuple[int, int, int, int], Any],
    grupos: List[GrupoProyectado],
) -> None:
    """
    Restricción: Cada grupo debe tener asignado al menos los bloques requeridos.

    Basado en horas_semanales de la asignatura.
    Asume: 1 bloque = 2 horas, por lo que bloques_necesarios = horas_semanales / 2

    Args:
        model: Modelo CP-SAT
        variables: Variables de decisión
        grupos: Lista de grupos proyectados
    """
    logger.info("Agregando restricción de cobertura de grupos...")

    HORAS_POR_BLOQUE = 2

    for g_idx, grupo in enumerate(grupos):
        # Horas semanales de la asignatura
        horas_semanales = grupo.asignatura.horas_semanales
        bloques_necesarios = horas_semanales // HORAS_POR_BLOQUE

        # Todas las asignaciones para este grupo
        vars_grupo = [
            var for (g, d, s, t), var in variables.items()
            if g == g_idx
        ]

        if vars_grupo and bloques_necesarios > 0:
            # El grupo debe tener al menos bloques_necesarios asignaciones
            model.Add(sum(vars_grupo) >= bloques_necesarios)

    logger.info("Restricción de cobertura de grupos agregada")


def _resolver_modelo(
    model: cp_model.CpModel,
    variables: Dict[Tuple[int, int, int, int], Any],
) -> Tuple[str, float, Dict[Tuple[int, int, int, int], bool]]:
    """
    Resuelve el modelo CP-SAT y retorna el status y asignaciones.

    Args:
        model: Modelo CP-SAT configurado
        variables: Variables de decisión

    Returns:
        Tupla (status_str, tiempo_ejecucion, asignaciones_solucion)
    """
    logger.info("Iniciando resolución del modelo...")

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 300  # Timeout: 5 minutos
    solver.parameters.log_search_progress = True

    start_time = datetime.now()
    status = solver.Solve(model)
    elapsed_time = (datetime.now() - start_time).total_seconds()

    # Mapear status a string
    status_map = {
        cp_model.OPTIMAL: "OPTIMAL",
        cp_model.FEASIBLE: "FEASIBLE",
        cp_model.INFEASIBLE: "INFEASIBLE",
        cp_model.MODEL_INVALID: "MODEL_INVALID",
    }
    status_str = status_map.get(status, "UNKNOWN")

    logger.info(f"Resolución completada: {status_str} en {elapsed_time:.2f}s")

    # Extraer asignaciones de la solución
    asignaciones = {}
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for key, var in variables.items():
            asignaciones[key] = solver.Value(var) == 1

    return status_str, elapsed_time, asignaciones


def _guardar_horarios_bd(
    db: Session,
    asignaciones: Dict[Tuple[int, int, int, int], bool],
    grupos: List[GrupoProyectado],
    docentes: List[Docente],
    salones: List[Salon],
    bloques_horarios: List[Tuple[str, str]],
) -> int:
    """
    Guarda las asignaciones en la tabla HorarioOptimizado.

    Primero limpia los registros antiguos, luego inserta los nuevos.

    Args:
        db: Sesión de SQLAlchemy
        asignaciones: Diccionario de asignaciones {(g,d,s,t): bool}
        grupos: Lista de grupos
        docentes: Lista de docentes
        salones: Lista de salones
        bloques_horarios: Lista de bloques horarios

    Returns:
        Número total de asignaciones guardadas
    """
    logger.info("Guardando horarios optimizados en BD...")

    # Limpiar registros antiguos
    db.query(HorarioOptimizado).delete()
    logger.info("Registros antiguos eliminados")

    # Guardar nuevas asignaciones
    contador = 0
    for (g_idx, d_idx, s_idx, t_idx), asignado in asignaciones.items():
        if asignado:
            grupo = grupos[g_idx]
            docente = docentes[d_idx]
            salon = salones[s_idx]
            dia, bloque_horario = bloques_horarios[t_idx]

            horario = HorarioOptimizado(
                grupo_proyectado_id=grupo.id,
                docente_id=docente.id,
                salon_id=salon.id,
                dia=dia,
                bloque_horario=bloque_horario,
            )
            db.add(horario)
            contador += 1

    db.commit()
    logger.info(f"Total de asignaciones guardadas: {contador}")
    return contador


def resolver_horarios_uctp(db: Session) -> ResultadoOptimizacion:
    """
    Resuelve el problema de horarios universitarios (UCTP) usando CP-SAT.

    Este es el punto de entrada principal del motor de optimización. Orquesta:
    1. Extracción de datos de la BD
    2. Creación del modelo y variables
    3. Adición de todas las restricciones duras
    4. Resolución del modelo
    5. Almacenamiento de resultados

    Args:
        db: Sesión de SQLAlchemy con acceso a la BD

    Returns:
        ResultadoOptimizacion con status, tiempo, asignaciones y mensaje

    Raises:
        ValueError: Si no hay datos suficientes en la BD
    """
    try:
        # 1. Extraer datos de la BD
        datos = _extraer_datos_bd(db)

        if not datos.grupos or not datos.docentes or not datos.salones:
            msg = "Datos insuficientes: se requieren grupos, docentes y salones"
            logger.error(msg)
            return ResultadoOptimizacion(
                status="ERROR",
                tiempo_ejecucion=0.0,
                total_asignaciones=0,
                grupos_asignados=0,
                total_grupos=0,
                mensaje=msg,
            )

        if not datos.bloques_horarios:
            msg = "No hay bloques horarios disponibles"
            logger.error(msg)
            return ResultadoOptimizacion(
                status="ERROR",
                tiempo_ejecucion=0.0,
                total_asignaciones=0,
                grupos_asignados=0,
                total_grupos=0,
                mensaje=msg,
            )

        # 2. Crear modelo y variables
        model = cp_model.CpModel()
        variables = _crear_variables_decision(
            model,
            datos.grupos,
            datos.docentes,
            datos.salones,
            datos.bloques_horarios,
        )

        # 3. Agregar restricciones duras
        _agregar_restriccion_capacidad_salon(model, variables, datos.grupos, datos.salones)
        _agregar_restriccion_disponibilidad_docente(
            model, variables, datos.docentes, datos.bloques_horarios, datos.disponibilidades
        )
        _agregar_restriccion_conflicto_docente(model, variables, datos.docentes, datos.bloques_horarios)
        _agregar_restriccion_conflicto_salon(model, variables, datos.salones, datos.bloques_horarios)
        _agregar_restriccion_horas_docente(model, variables, datos.docentes)
        _agregar_restriccion_cobertura_grupos(model, variables, datos.grupos)

        # 4. Resolver
        status_str, elapsed_time, asignaciones = _resolver_modelo(model, variables)

        # 5. Si hay solución, guardar
        total_asignaciones = 0
        grupos_asignados = 0

        if status_str in ("OPTIMAL", "FEASIBLE"):
            total_asignaciones = _guardar_horarios_bd(
                db,
                asignaciones,
                datos.grupos,
                datos.docentes,
                datos.salones,
                datos.bloques_horarios,
            )

            # Contar grupos únicos asignados
            grupos_asignados_ids = set()
            for (g_idx, _, _, _), asignado in asignaciones.items():
                if asignado:
                    grupos_asignados_ids.add(g_idx)
            grupos_asignados = len(grupos_asignados_ids)

        mensaje = f"Optimización {status_str}: {total_asignaciones} asignaciones, {grupos_asignados}/{len(datos.grupos)} grupos"

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
        msg = f"Error: {str(e)}"
        return ResultadoOptimizacion(
            status="ERROR",
            tiempo_ejecucion=0.0,
            total_asignaciones=0,
            grupos_asignados=0,
            total_grupos=0,
            mensaje=msg,
        )


__all__ = [
    "resolver_horarios_uctp",
    "ResultadoOptimizacion",
    "DatosOptimizacion",
]
