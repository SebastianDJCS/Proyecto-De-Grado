"""Endpoints para que un estudiante arme su horario a partir de la oferta."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Asignatura, GrupoProyectado, HorarioOptimizado
from app.schemas.estudiante import (
    AsignaturaSeleccionableItem,
    HorarioEstudianteResponse,
    SeleccionHorarioRequest,
)
from app.solver.estudiante import seleccionar_horario_estudiante

router = APIRouter(prefix="/estudiante", tags=["Estudiante"])


@router.get("/asignaturas", response_model=List[AsignaturaSeleccionableItem])
def listar_asignaturas_seleccionables(db: Session = Depends(get_db)):
    """Lista las materias que el estudiante puede elegir, con su oferta de grupos."""
    asignaturas = (
        db.query(Asignatura)
        .filter(Asignatura.seleccionable.is_(True))
        .order_by(Asignatura.semestre, Asignatura.nombre)
        .all()
    )

    resultado = []
    for asig in asignaturas:
        grupos = db.query(GrupoProyectado).filter(GrupoProyectado.asignatura_id == asig.id).all()
        grupos_ids = [g.id for g in grupos]
        programados = 0
        if grupos_ids:
            programados = (
                db.query(HorarioOptimizado.grupo_proyectado_id)
                .filter(
                    HorarioOptimizado.grupo_proyectado_id.in_(grupos_ids),
                    HorarioOptimizado.tipo_actividad == "CLASE",
                )
                .distinct()
                .count()
            )
        resultado.append(
            AsignaturaSeleccionableItem(
                id=asig.id,
                codigo_uccd=asig.codigo_uccd,
                nombre=asig.nombre,
                semestre=asig.semestre,
                creditos=asig.creditos,
                grupos=len(grupos),
                grupos_programados=programados,
            )
        )
    return resultado


@router.post("/horario", response_model=HorarioEstudianteResponse)
def generar_horario_estudiante(
    request: SeleccionHorarioRequest,
    db: Session = Depends(get_db),
):
    """Genera la mejor combinación de secciones para las materias elegidas."""
    try:
        return seleccionar_horario_estudiante(db, request.asignatura_ids)
    except Exception as e:  # pragma: no cover - error inesperado
        raise HTTPException(status_code=500, detail=f"Error al generar el horario: {str(e)}")
