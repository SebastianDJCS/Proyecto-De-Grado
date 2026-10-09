"""
Selector de horario óptimo para un estudiante.

A partir del horario global ya generado (tabla ``horarios_optimizados``), el
estudiante elige sus materias y este módulo selecciona UNA sección (grupo) por
materia con **cero cruces de horario** (restricción dura).

Si no existe combinación sin cruces:
- electiva que choca con una fundamental → se descarta la electiva automáticamente;
- fundamental que choca con otra fundamental → se responde ``REQUIERE_SELECCION``
  con el par de materias para que el estudiante elija cuál conservar.
"""

import logging
from typing import Dict, List, Optional, Set, Tuple

from ortools.sat.python import cp_model
from sqlalchemy.orm import Session

from app.models import Asignatura, GrupoProyectado, HorarioOptimizado, Salon

logger = logging.getLogger(__name__)

PESO_DIA = 1
TIEMPO_MAXIMO_SELECTOR = 30

TIPO_ELECTIVA = "ELECTIVA"


def _nombre_salon(salon: Salon | None) -> str | None:
    if salon is None:
        return None
    return salon.nombre or salon.nomenclatura


def _tipo_asignatura(asig: Asignatura) -> str:
    return (getattr(asig, "tipo", None) or "FUNDAMENTAL").upper()


def _slots_de_bloque(bloque: str) -> List[int]:
    """Extrae las ranuras horarias ENTERAS cubiertas por un bloque "HH:MM-HH:MM".

    Permite detectar conflictos por SOLAPE de intervalos (sesiones de 1, 2 o 3
    horas) en lugar de por igualdad exacta del string del bloque.
    """
    try:
        inicio, fin = bloque.split("-")
        h_ini = int(inicio.split(":")[0])
        h_fin = int(fin.split(":")[0])
        return list(range(h_ini, h_fin))
    except (ValueError, AttributeError):
        return []


def _bloques_de(op: dict) -> Set[Tuple[str, int]]:
    """Ranuras (dia, hora) ocupadas por todas las sesiones de una opción."""
    slots: Set[Tuple[str, int]] = set()
    for f in op["filas"]:
        for h in _slots_de_bloque(f.bloque_horario):
            slots.add((f.dia, h))
    return slots


def _resolver_conjunto(candidatos: Dict[int, List[dict]]) -> Optional[Dict[int, dict]]:
    """Resuelve la selección con cero cruces.

    Devuelve ``{asignatura_id: opcion_elegida}`` o ``None`` si no hay
    combinación sin cruces (modelo infactible).
    """
    if not candidatos:
        return None

    model = cp_model.CpModel()
    x: Dict[Tuple[int, int], cp_model.IntVar] = {}
    for asig_id, opciones in candidatos.items():
        for op in opciones:
            x[(asig_id, op["grupo"].id)] = model.NewBoolVar(f"x[{asig_id}_{op['grupo'].id}]")

    # Exactamente una sección por materia.
    for asig_id, opciones in candidatos.items():
        model.Add(sum(x[(asig_id, op["grupo"].id)] for op in opciones) == 1)

    # Universo de bloques ocupados por los candidatos.
    bloques_universo: Set[Tuple[str, int]] = set()
    for opciones in candidatos.values():
        for op in opciones:
            bloques_universo |= _bloques_de(op)

    # RESTRICCIÓN DURA: ningún bloque puede tener más de una materia.
    for (dia, bloque) in sorted(bloques_universo):
        vars_bloque = [
            x[(asig_id, op["grupo"].id)]
            for asig_id, opciones in candidatos.items()
            for op in opciones
            if (dia, bloque) in _bloques_de(op)
        ]
        if len(vars_bloque) > 1:
            model.Add(sum(vars_bloque) <= 1)

    # Secundario: compactar el horario minimizando los días usados.
    dias = sorted({dia for (dia, _) in bloques_universo})
    dias_activos = []
    for dia in dias:
        vars_dia = [
            x[(asig_id, op["grupo"].id)]
            for asig_id, opciones in candidatos.items()
            for op in opciones
            if any(f.dia == dia for f in op["filas"])
        ]
        if vars_dia:
            activo = model.NewBoolVar(f"dia[{dia}]")
            model.Add(sum(vars_dia) >= 1).OnlyEnforceIf(activo)
            model.Add(sum(vars_dia) == 0).OnlyEnforceIf(activo.Not())
            dias_activos.append(activo)

    if dias_activos:
        model.Minimize(PESO_DIA * sum(dias_activos))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = TIEMPO_MAXIMO_SELECTOR
    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return None

    elegidos: Dict[int, dict] = {}
    for asig_id, opciones in candidatos.items():
        elegido = next(
            (op for op in opciones if solver.Value(x[(asig_id, op["grupo"].id)]) == 1),
            None,
        )
        if elegido is None:
            return None
        elegidos[asig_id] = elegido
    return elegidos


def _pares_incompatibles(candidatos: Dict[int, List[dict]]) -> List[Tuple[int, int]]:
    """Pares de materias donde NINGÚN par de grupos se puede combinar sin cruces."""
    ids = list(candidatos.keys())
    pares: List[Tuple[int, int]] = []
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            a_id, b_id = ids[i], ids[j]
            incompatible = all(
                bool(_bloques_de(op_a) & _bloques_de(op_b))
                for op_a in candidatos[a_id]
                for op_b in candidatos[b_id]
            )
            if incompatible:
                pares.append((a_id, b_id))
    return pares


def seleccionar_horario_estudiante(db: Session, asignatura_ids: List[int]) -> dict:
    """Selecciona exactamente una sección por materia con cero cruces."""
    asignaturas = (
        db.query(Asignatura)
        .filter(Asignatura.id.in_(asignatura_ids))
        .all()
    )
    if not asignaturas:
        return _respuesta("ERROR", "No se encontraron asignaturas válidas.", [], [], [], [])

    asignaturas_por_id = {a.id: a for a in asignaturas}

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

    descartadas: List[str] = []

    elegidos = _resolver_conjunto(candidatos)

    # Sin combinación sin cruces → descartar electivas que chocan con fundamentales.
    while elegidos is None:
        incompatibles = _pares_incompatibles(candidatos)
        electivas_a_descartar: Set[int] = set()
        for (a_id, b_id) in incompatibles:
            tipo_a = _tipo_asignatura(asignaturas_por_id[a_id])
            tipo_b = _tipo_asignatura(asignaturas_por_id[b_id])
            if tipo_a == TIPO_ELECTIVA and tipo_b != TIPO_ELECTIVA:
                electivas_a_descartar.add(a_id)
            elif tipo_b == TIPO_ELECTIVA and tipo_a != TIPO_ELECTIVA:
                electivas_a_descartar.add(b_id)

        if not electivas_a_descartar:
            break

        for asig_id in sorted(electivas_a_descartar):
            descartadas.append(asignaturas_por_id[asig_id].nombre)
            candidatos.pop(asig_id, None)

        if not candidatos:
            break

        elegidos = _resolver_conjunto(candidatos)

    if elegidos is None:
        if not candidatos:
            return _respuesta(
                "PARCIAL" if descartadas else "ERROR",
                "Todas las materias seleccionadas entraron en conflicto.",
                [], [], no_disponibles, [], descartadas=descartadas,
            )

        incompatibles = _pares_incompatibles(candidatos)
        if incompatibles:
            pares = []
            for (a_id, b_id) in incompatibles:
                a = asignaturas_por_id[a_id]
                b = asignaturas_por_id[b_id]
                pares.append({
                    "a_id": a.id,
                    "a": a.nombre,
                    "a_tipo": _tipo_asignatura(a),
                    "b_id": b.id,
                    "b": b.nombre,
                    "b_tipo": _tipo_asignatura(b),
                })
            nombres = ", ".join(
                f"{asignaturas_por_id[a].nombre} vs {asignaturas_por_id[b].nombre}"
                for (a, b) in incompatibles
            )
            return _respuesta(
                "REQUIERE_SELECCION",
                f"No se puede armar el horario sin cruces. Elige cuál de estas materias conservar: {nombres}.",
                [], [], no_disponibles, [], descartadas=descartadas, pares_conflicto=pares,
            )

        return _respuesta(
            "ERROR",
            "No existe combinación sin cruces para estas materias. Modifica la selección e inténtalo de nuevo.",
            [], [], no_disponibles, [], descartadas=descartadas,
        )

    # Construir la respuesta con las secciones elegidas.
    seleccion = []
    horario = []
    ocupacion: Dict[Tuple[str, str], List[str]] = {}

    for asig_id, elegido in elegidos.items():
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
            "tipo": _tipo_asignatura(asig),
            "total_sesiones": len(elegido["filas"]),
            "bloques": bloques,
        })

    # Con restricción dura de cruces no puede haber conflictos.
    conflictos = []

    mensajes = ["¡Horario generado sin choques!"]
    if descartadas:
        mensajes.append(
            "Se descartaron electivas por conflicto con materias fundamentales: "
            + ", ".join(descartadas) + "."
        )
    if no_disponibles:
        mensajes.append("Algunas materias no tienen horario disponible: " + ", ".join(no_disponibles) + ".")

    if no_disponibles or descartadas:
        status_str = "PARCIAL"
    else:
        status_str = "OK"

    return _respuesta(
        status_str, " ".join(mensajes), seleccion, conflictos,
        no_disponibles, horario, descartadas=descartadas,
    )


def _respuesta(
    status,
    mensaje,
    seleccion,
    conflictos,
    no_disponibles,
    horario,
    descartadas=None,
    pares_conflicto=None,
) -> dict:
    return {
        "status": status,
        "mensaje": mensaje,
        "seleccion": seleccion,
        "conflictos": conflictos,
        "no_disponibles": no_disponibles,
        "horario": horario,
        "descartadas": descartadas or [],
        "pares_conflicto": pares_conflicto or [],
    }
