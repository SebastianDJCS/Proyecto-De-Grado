"""
Selector de horario óptimo para un estudiante.

A partir del horario global ya generado (tabla ``horarios_optimizados``), el
estudiante elige sus materias y este módulo selecciona una sección (grupo) por
materia minimizando choques de horario. Si no existe una combinación sin
choques, devuelve la mejor opción (best-effort) indicando los conflictos.
"""

import logging
from typing import Dict, List, Tuple

from ortools.sat.python import cp_model
from sqlalchemy.orm import Session

from app.models import Asignatura, GrupoProyectado, HorarioOptimizado, Salon

logger = logging.getLogger(__name__)

PESO_CONFLICTO = 1000
PESO_DIA = 1
TIEMPO_MAXIMO_SELECTOR = 30


def _nombre_salon(salon: Salon | None) -> str | None:
    if salon is None:
        return None
    return salon.nombre or salon.nomenclatura


def seleccionar_horario_estudiante(db: Session, asignatura_ids: List[int]) -> dict:
    """Selecciona una sección por materia minimizando choques de horario."""
    asignaturas = (
        db.query(Asignatura)
        .filter(Asignatura.id.in_(asignatura_ids))
        .all()
    )
    if not asignaturas:
        return _respuesta("ERROR", "No se encontraron asignaturas válidas.", [], [], [], [])

    # Candidatos: por materia, lista de grupos con clases ya programadas.
    candidatos: Dict[int, List[dict]] = {}
    no_disponibles: List[str] = []

    for asig in asignaturas:
        grupos = db.query(GrupoProyectado).filter(GrupoProyectado.asignatura_id == asig.id).all()
        opciones = []
        for grupo in grupos:
            filas = (
                db.query(HorarioOptimizado)
                .filter(
                    HorarioOptimizado.grupo_proyectado_id == grupo.id,
                    HorarioOptimizado.tipo_actividad == "CLASE",
                )
                .all()
            )
            if filas:
                opciones.append({"grupo": grupo, "filas": filas})
        if opciones:
            candidatos[asig.id] = opciones
        else:
            no_disponibles.append(asig.nombre)

    if not candidatos:
        return _respuesta(
            "PARCIAL" if no_disponibles else "ERROR",
            "Ninguna de las materias seleccionadas tiene horario generado.",
            [], [], no_disponibles, [],
        )

    model = cp_model.CpModel()
    x: Dict[Tuple[int, int], cp_model.IntVar] = {}
    for asig_id, opciones in candidatos.items():
        for op in opciones:
            x[(asig_id, op["grupo"].id)] = model.NewBoolVar(f"x[{asig_id}_{op['grupo'].id}]")

    # Exactamente una sección por materia.
    for asig_id, opciones in candidatos.items():
        model.Add(sum(x[(asig_id, op["grupo"].id)] for op in opciones) == 1)

    # Universo de bloques ocupados por los candidatos.
    bloques_universo = set()
    for opciones in candidatos.values():
        for op in opciones:
            for f in op["filas"]:
                bloques_universo.add((f.dia, f.bloque_horario))

    # Choques suaves: por cada bloque, penaliza si más de una materia cae ahí.
    choques = []
    for (dia, bloque) in sorted(bloques_universo):
        vars_bloque = []
        for asig_id, opciones in candidatos.items():
            for op in opciones:
                if any((f.dia, f.bloque_horario) == (dia, bloque) for f in op["filas"]):
                    vars_bloque.append(x[(asig_id, op["grupo"].id)])
        if len(vars_bloque) > 1:
            choque = model.NewIntVar(0, len(vars_bloque), f"choque[{dia}_{bloque}]")
            model.Add(choque >= sum(vars_bloque) - 1)
            choques.append(choque)

    # Secundario: compactar el horario minimizando los días usados.
    dias = sorted({dia for (dia, _) in bloques_universo})
    dias_activos = []
    for dia in dias:
        vars_dia = []
        for asig_id, opciones in candidatos.items():
            for op in opciones:
                if any(f.dia == dia for f in op["filas"]):
                    vars_dia.append(x[(asig_id, op["grupo"].id)])
        if vars_dia:
            activo = model.NewBoolVar(f"dia[{dia}]")
            model.Add(sum(vars_dia) >= 1).OnlyEnforceIf(activo)
            model.Add(sum(vars_dia) == 0).OnlyEnforceIf(activo.Not())
            dias_activos.append(activo)

    objetivo = []
    if choques:
        objetivo.append(PESO_CONFLICTO * sum(choques))
    if dias_activos:
        objetivo.append(PESO_DIA * sum(dias_activos))
    model.Minimize(sum(objetivo))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = TIEMPO_MAXIMO_SELECTOR
    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return _respuesta(
            "ERROR", "No se pudo resolver la selección de horario.",
            [], [], no_disponibles, [],
        )

    asignaturas_por_id = {a.id: a for a in asignaturas}
    seleccion = []
    horario = []
    ocupacion: Dict[Tuple[str, str], List[str]] = {}

    for asig_id, opciones in candidatos.items():
        elegido = next(
            (op for op in opciones if solver.Value(x[(asig_id, op["grupo"].id)]) == 1),
            None,
        )
        if elegido is None:
            continue

        asig = asignaturas_por_id[asig_id]
        docente_nombre = ""
        bloques = []
        for f in elegido["filas"]:
            salon_nombre = _nombre_salon(f.salon)
            if not docente_nombre and f.docente:
                docente_nombre = f.docente.nombre
            bloques.append({"dia": f.dia, "bloque_horario": f.bloque_horario, "salon_nombre": salon_nombre})
            ocupacion.setdefault((f.dia, f.bloque_horario), []).append(asig.nombre)
            horario.append({
                "asignatura": asig.nombre,
                "grupo_codigo": str(elegido["grupo"].numero_grupo),
                "docente_nombre": docente_nombre,
                "salon_nombre": salon_nombre,
                "dia": f.dia,
                "bloque_horario": f.bloque_horario,
                "tipo_actividad": "CLASE",
            })

        seleccion.append({
            "asignatura_id": asig.id,
            "asignatura": asig.nombre,
            "grupo_id": elegido["grupo"].id,
            "grupo_codigo": str(elegido["grupo"].numero_grupo),
            "docente_nombre": docente_nombre,
            "bloques": bloques,
        })

    conflictos = [
        {"dia": dia, "bloque_horario": bloque, "asignaturas": nombres}
        for (dia, bloque), nombres in sorted(ocupacion.items())
        if len(nombres) > 1
    ]

    if conflictos:
        status_str = "PARCIAL"
        mensaje = f"Se encontró un horario con {len(conflictos)} choque(s) de horario."
    elif no_disponibles:
        status_str = "PARCIAL"
        mensaje = "Horario generado, pero algunas materias no tienen horario disponible."
    else:
        status_str = "OK"
        mensaje = "¡Horario generado sin choques!"

    return _respuesta(status_str, mensaje, seleccion, conflictos, no_disponibles, horario)


def _respuesta(status, mensaje, seleccion, conflictos, no_disponibles, horario) -> dict:
    return {
        "status": status,
        "mensaje": mensaje,
        "seleccion": seleccion,
        "conflictos": conflictos,
        "no_disponibles": no_disponibles,
        "horario": horario,
    }
