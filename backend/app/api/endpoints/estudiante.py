"""Endpoints para que un estudiante arme su horario a partir de la oferta."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import Asignatura, GrupoProyectado, HorarioOptimizado
from app.schemas.estudiante import (
    AsignaturaSeleccionableItem,
    ConfigEstudiante,
    HorarioEstudianteResponse,
    SeleccionHorarioRequest,
)
from app.solver.estudiante import seleccionar_horario_estudiante

router = APIRouter(prefix="/estudiante", tags=["Estudiante"])


@router.get("/config", response_model=ConfigEstudiante)
def obtener_config_estudiante():
    """Reglas de selección para el estudiante (tope de créditos)."""
    return ConfigEstudiante(max_creditos=get_settings().MAX_CREDITOS)


@router.get("/asignaturas", response_model=List[AsignaturaSeleccionableItem])
def listar_asignaturas_seleccionables(db: Session = Depends(get_db)):
    """Lista las materias que el estudiante puede elegir, con su oferta de grupos."""
    asignaturas = (
        db.query(Asignatura)
        .filter(Asignatura.seleccionable.is_(True))
        .order_by(Asignatura.semestre, Asignatura.nombre)
        .all()
    )

    ids = [a.id for a in asignaturas]

    # 2 consultas agregadas en lugar de N+1 (evita ~134 queries a la BD remota).
    grupos_por_asig: dict[int, int] = {}
    programados_por_asig: dict[int, int] = {}
    if ids:
        grupos_por_asig = dict(
            db.query(GrupoProyectado.asignatura_id, func.count(GrupoProyectado.id))
            .filter(GrupoProyectado.asignatura_id.in_(ids))
            .group_by(GrupoProyectado.asignatura_id)
            .all()
        )
        programados_por_asig = dict(
            db.query(
                GrupoProyectado.asignatura_id,
                func.count(func.distinct(HorarioOptimizado.grupo_proyectado_id)),
            )
            .join(
                HorarioOptimizado,
                HorarioOptimizado.grupo_proyectado_id == GrupoProyectado.id,
            )
            .filter(
                GrupoProyectado.asignatura_id.in_(ids),
                HorarioOptimizado.tipo_actividad == "CLASE",
            )
            .group_by(GrupoProyectado.asignatura_id)
            .all()
        )

    resultado = []
    for asig in asignaturas:
        resultado.append(
            AsignaturaSeleccionableItem(
                id=asig.id,
                codigo_uccd=asig.codigo_uccd,
                nombre=asig.nombre,
                semestre=asig.semestre,
                creditos=asig.creditos,
                grupos=grupos_por_asig.get(asig.id, 0),
                grupos_programados=programados_por_asig.get(asig.id, 0),
                tipo=getattr(asig, "tipo", None) or "FUNDAMENTAL",
            )
        )
    return resultado


@router.post("/horario", response_model=HorarioEstudianteResponse)
def generar_horario_estudiante(
    request: SeleccionHorarioRequest,
    db: Session = Depends(get_db),
):
    """Genera la mejor combinación de secciones para las materias elegidas."""
    settings = get_settings()
    ids = list(dict.fromkeys(request.asignatura_ids))

    asignaturas = db.query(Asignatura).filter(Asignatura.id.in_(ids)).all()
    encontradas = {a.id for a in asignaturas}

    faltantes = [i for i in ids if i not in encontradas]
    if faltantes:
        raise HTTPException(status_code=400, detail=f"Asignaturas no encontradas: {faltantes}")

    no_habilitadas = [a.nombre for a in asignaturas if not a.seleccionable]
    if no_habilitadas:
        raise HTTPException(
            status_code=400,
            detail=f"Estas materias no están habilitadas para selección: {', '.join(no_habilitadas)}",
        )

    total_creditos = sum(a.creditos for a in asignaturas)
    if total_creditos > settings.MAX_CREDITOS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Excedes el límite de {settings.MAX_CREDITOS} créditos "
                f"(seleccionaste {total_creditos})."
            ),
        )

    try:
        data = seleccionar_horario_estudiante(db, ids)
    except Exception as e:  # pragma: no cover - error inesperado
        raise HTTPException(status_code=500, detail=f"Error al generar el horario: {str(e)}")

    data["creditos_totales"] = total_creditos
    data["max_creditos"] = settings.MAX_CREDITOS
    return data
