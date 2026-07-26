import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import HorarioOptimizado, Docente

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/horarios", tags=["Horarios"])


# --- Esquemas de Respuesta (Pydantic) ---

class HorarioDetalleSchema(BaseModel):
    id: int
    tipo_actividad: str = "CLASE"
    grupo_id: Optional[int] = None
    asignatura: str
    grupo_codigo: str
    docente_id: int
    docente_nombre: str
    salon_id: Optional[int] = None
    salon_nombre: Optional[str] = None
    dia: str
    bloque_horario: str

    class Config:
        from_attributes = True


# --- Función Helper de Mapeo ---

def _mapear_horario(h: HorarioOptimizado) -> HorarioDetalleSchema:
    """Mapea una entidad HorarioOptimizado a su schema DTO de respuesta."""
    
    # 1. Determinar el nombre/etiqueta del salón
    nombre_salon = "N/A / Oficina"
    if h.salon:
        nombre_salon = h.salon.nombre or h.salon.nomenclatura

    # 2. Determinar el código del grupo y la asignatura
    codigo_grupo = "N/A"
    tipo_act = getattr(h, "tipo_actividad", "CLASE")
    nombre_asignatura = "Labor Administrativa" if tipo_act == "ADMINISTRATIVA" else "N/A"

    if h.grupo_proyectado:
        if h.grupo_proyectado.numero_grupo is not None:
            codigo_grupo = str(h.grupo_proyectado.numero_grupo)
        if h.grupo_proyectado.asignatura:
            nombre_asignatura = h.grupo_proyectado.asignatura.nombre

    return HorarioDetalleSchema(
        id=h.id,
        tipo_actividad=tipo_act,
        grupo_id=h.grupo_proyectado_id,
        asignatura=nombre_asignatura,
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
    docente_id: Optional[int] = None,
    grupo_id: Optional[int] = None,
    salon_id: Optional[int] = None,
    dia: Optional[str] = None,
):
    """Obtiene la lista completa de horarios optimizados con filtros opcionales."""
    query = db.query(HorarioOptimizado)

    if docente_id:
        query = query.filter(HorarioOptimizado.docente_id == docente_id)
    if grupo_id:
        query = query.filter(HorarioOptimizado.grupo_proyectado_id == grupo_id)
    if salon_id:
        query = query.filter(HorarioOptimizado.salon_id == salon_id)
    if dia:
        query = query.filter(HorarioOptimizado.dia.ilike(f"%{dia}%"))

    horarios = query.offset(skip).limit(limit).all()
    return [_mapear_horario(h) for h in horarios]


@router.get("/docente/{docente_id}", response_model=List[HorarioDetalleSchema])
def obtener_horario_por_docente(
    docente_id: int,
    db: Session = Depends(get_db),
):
    """Obtiene la malla horaria asignada a un docente por su ID interno."""
    horarios = (
        db.query(HorarioOptimizado)
        .filter(HorarioOptimizado.docente_id == docente_id)
        .all()
    )
    return [_mapear_horario(h) for h in horarios]


@router.get("/docente/identificacion/{documento}", response_model=List[HorarioDetalleSchema])
def obtener_horario_por_documento_docente(
    documento: str,
    db: Session = Depends(get_db),
):
    """Obtiene la malla horaria completa buscando por número de documento de identidad del docente."""
    docente = db.query(Docente).filter(Docente.documento == documento).first()
    if not docente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Docente no encontrado con ese número de documento"
        )

    horarios = (
        db.query(HorarioOptimizado)
        .filter(HorarioOptimizado.docente_id == docente.id)
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