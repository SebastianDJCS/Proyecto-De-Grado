from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Asignatura
from app.schemas import AsignaturaCreate, AsignaturaResponse, AsignaturaUpdate

router = APIRouter(prefix="/asignaturas", tags=["Asignaturas"])


@router.get("/", response_model=List[AsignaturaResponse])
def obtener_asignaturas(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Obtener la lista de todas las asignaturas."""
    return db.query(Asignatura).offset(skip).limit(limit).all()


@router.post("/", response_model=AsignaturaResponse, status_code=status.HTTP_201_CREATED)
def crear_asignatura(asignatura: AsignaturaCreate, db: Session = Depends(get_db)):
    """Crear una nueva asignatura."""
    existente = db.query(Asignatura).filter(Asignatura.codigo_uccd == asignatura.codigo_uccd).first()
    if existente:
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe una asignatura con el código {asignatura.codigo_uccd}"
        )
    
    nueva_asignatura = Asignatura(**asignatura.model_dump())
    db.add(nueva_asignatura)
    db.commit()
    db.refresh(nueva_asignatura)
    return nueva_asignatura


@router.get("/{asignatura_id}", response_model=AsignaturaResponse)
def obtener_asignatura(asignatura_id: int, db: Session = Depends(get_db)):
    """Obtener una asignatura por su ID."""
    asignatura = db.query(Asignatura).filter(Asignatura.id == asignatura_id).first()
    if not asignatura:
        raise HTTPException(status_code=404, detail="Asignatura no encontrada")
    return asignatura


@router.put("/{asignatura_id}", response_model=AsignaturaResponse)
def actualizar_asignatura(
    asignatura_id: int, asignatura_update: AsignaturaUpdate, db: Session = Depends(get_db)
):
    """Actualizar datos de una asignatura existente."""
    db_asignatura = db.query(Asignatura).filter(Asignatura.id == asignatura_id).first()
    if not db_asignatura:
        raise HTTPException(status_code=404, detail="Asignatura no encontrada")

    datos = asignatura_update.model_dump(exclude_unset=True)
    for key, value in datos.items():
        setattr(db_asignatura, key, value)

    db.commit()
    db.refresh(db_asignatura)
    return db_asignatura


@router.delete("/{asignatura_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_asignatura(asignatura_id: int, db: Session = Depends(get_db)):
    """Eliminar una asignatura."""
    db_asignatura = db.query(Asignatura).filter(Asignatura.id == asignatura_id).first()
    if not db_asignatura:
        raise HTTPException(status_code=404, detail="Asignatura no encontrada")

    db.delete(db_asignatura)
    db.commit()
    return None