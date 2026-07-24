import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import HorarioOptimizado

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/horarios", tags=["Horarios"])


# --- Esquemas de Respuesta (Pydantic) ---

class HorarioDetalleSchema(BaseModel):
    id: int
    grupo_id: int
    asignatura: str
    grupo_codigo: str
    docente_id: int
    docente_nombre: str
    salon_id: int
    salon_nombre: Optional[str] = None
    dia: str
    bloque_horario: str

    class Config:
        from_attributes = True


# --- Función Helper de Mapeo ---

def _mapear_horario(h: HorarioOptimizado) -> HorarioDetalleSchema:
    """Mapea una entidad HorarioOptimizado a su schema DTO de respuesta."""
    
    # 1. Determinar el nombre/etiqueta del salón (fallback a nomenclatura si nombre es None)
    nombre_salon = "N/A"
    if h.salon:
        nombre_salon = h.salon.nombre or h.salon.nomenclatura

    # 2. Determinar el código del grupo
    codigo_grupo = "N/A"
    if h.grupo_proyectado and h.grupo_proyectado.numero_grupo is not None:
        codigo_grupo = str(h.grupo_proyectado.numero_grupo)

    return HorarioDetalleSchema(
        id=h.id,
        grupo_id=h.grupo_proyectado_id,
        asignatura=h.grupo_proyectado.asignatura.nombre if h.grupo_proyectado and h.grupo_proyectado.asignatura else "N/A",
        grupo_codigo=codigo_grupo,
        docente_id=h.docente_id,
        docente_nombre=h.docente.nombre if h.docente else "N/A",
        salon_id=h.salon_id,
        salon_nombre=nombre_salon,
        dia=h.dia,
        bloque_horario=h.bloque_horario,
    )


# --- Endpoints ---

@router.get("/", response_model=List[HorarioDetalleSchema])
def obtener_todos_los_horarios(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    """Obtiene la lista completa de horarios optimizados."""
    horarios = db.query(HorarioOptimizado).offset(skip).limit(limit).all()
    return [_mapear_horario(h) for h in horarios]


@router.get("/docente/{docente_id}", response_model=List[HorarioDetalleSchema])
def obtener_horario_por_docente(
    docente_id: int,
    db: Session = Depends(get_db),
):
    """Obtiene la malla horaria asignada a un docente específico."""
    horarios = (
        db.query(HorarioOptimizado)
        .filter(HorarioOptimizado.docente_id == docente_id)
        .all()
    )
    return [_mapear_horario(h) for h in horarios]


@router.get("/grupo/{grupo_id}", response_model=List[HorarioDetalleSchema])
def obtener_horario_por_grupo(
    grupo_id: int,
    db: Session = Depends(get_db),
):
    """Obtiene el horario asignado a un grupo/materia específica."""
    horarios = (
        db.query(HorarioOptimizado)
        .filter(HorarioOptimizado.grupo_proyectado_id == grupo_id)
        .all()
    )
    return [_mapear_horario(h) for h in horarios]


@router.get("/salon/{salon_id}", response_model=List[HorarioDetalleSchema])
def obtener_horario_por_salon(
    salon_id: int,
    db: Session = Depends(get_db),
):
    """Obtiene el reporte de ocupación de un salón específico."""
    horarios = (
        db.query(HorarioOptimizado)
        .filter(HorarioOptimizado.salon_id == salon_id)
        .all()
    )
    return [_mapear_horario(h) for h in horarios]