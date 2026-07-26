from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Salon
from app.schemas import SalonCreate, SalonResponse, SalonUpdate

router = APIRouter(prefix="/salones", tags=["Salones"])


@router.get("/", response_model=List[SalonResponse])
def obtener_salones(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Lista todos los salones registrados."""
    return db.query(Salon).offset(skip).limit(limit).all()


@router.get("/{salon_id}", response_model=SalonResponse)
def obtener_salon(salon_id: int, db: Session = Depends(get_db)):
    """Obtiene un salón por su ID."""
    salon = db.query(Salon).filter(Salon.id == salon_id).first()
    if not salon:
        raise HTTPException(status_code=404, detail="Salón no encontrado")
    return salon


@router.post("/", response_model=SalonResponse, status_code=status.HTTP_201_CREATED)
def crear_salon(salon_in: SalonCreate, db: Session = Depends(get_db)):
    """Crea un nuevo salón o laboratorio."""
    nuevo_salon = Salon(**salon_in.model_dump())
    db.add(nuevo_salon)
    db.commit()
    db.refresh(nuevo_salon)
    return nuevo_salon


@router.put("/{salon_id}", response_model=SalonResponse)
def actualizar_salon(
    salon_id: int,
    salon_in: SalonUpdate,
    db: Session = Depends(get_db)
):
    """Actualiza la información de un salón."""
    salon = db.query(Salon).filter(Salon.id == salon_id).first()
    if not salon:
        raise HTTPException(status_code=404, detail="Salón no encontrado")

    datos_actualizar = salon_in.model_dump(exclude_unset=True)
    for clave, valor in datos_actualizar.items():
        setattr(salon, clave, valor)

    db.commit()
    db.refresh(salon)
    return salon


@router.delete("/{salon_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_salon(salon_id: int, db: Session = Depends(get_db)):
    """Elimina un salón por su ID."""
    salon = db.query(Salon).filter(Salon.id == salon_id).first()
    if not salon:
        raise HTTPException(status_code=404, detail="Salón no encontrado")

    db.delete(salon)
    db.commit()
    return None