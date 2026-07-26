from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import DisponibilidadDocente, Docente
from app.schemas.disponibilidad import (
    DisponibilidadCreate,
    DisponibilidadResponse,
    DisponibilidadUpdate,
)

router = APIRouter(prefix="/disponibilidades", tags=["Disponibilidades"])


# 1. CREATE - Asignar disponibilidad a un docente
@router.post("/", response_model=DisponibilidadResponse, status_code=status.HTTP_201_CREATED)
def crear_disponibilidad(item: DisponibilidadCreate, db: Session = Depends(get_db)):
    # Validar que el docente exista
    docente = db.query(Docente).filter(Docente.id == item.docente_id).first()
    if not docente:
        raise HTTPException(status_code=404, detail="El docente especificado no existe.")

    nueva_disp = DisponibilidadDocente(**item.model_dump())
    db.add(nueva_disp)
    db.commit()
    db.refresh(nueva_disp)
    return nueva_disp


# 2. READ ALL - Obtener todas las disponibilidades
@router.get("/", response_model=list[DisponibilidadResponse])
def listar_disponibilidades(db: Session = Depends(get_db)):
    return db.query(DisponibilidadDocente).all()


# 2b. READ BY DOCENTE - Obtener disponibilidades de un docente en particular
@router.get("/docente/{docente_id}", response_model=list[DisponibilidadResponse])
def listar_disponibilidades_por_docente(docente_id: int, db: Session = Depends(get_db)):
    docente = db.query(Docente).filter(Docente.id == docente_id).first()
    if not docente:
        raise HTTPException(status_code=404, detail="El docente especificado no existe.")
    
    return db.query(DisponibilidadDocente).filter(DisponibilidadDocente.docente_id == docente_id).all()


# 3. UPDATE - Actualizar un bloque de disponibilidad
@router.put("/{disponibilidad_id}", response_model=DisponibilidadResponse)
def actualizar_disponibilidad(
    disponibilidad_id: int,
    item: DisponibilidadUpdate,
    db: Session = Depends(get_db)
):
    disp_db = db.query(DisponibilidadDocente).filter(DisponibilidadDocente.id == disponibilidad_id).first()
    if not disp_db:
        raise HTTPException(status_code=404, detail="Registro de disponibilidad no encontrado.")

    # Actualizamos solo los campos que vengan en el body
    datos_actualizar = item.model_dump(exclude_unset=True)
    for clave, valor in datos_actualizar.items():
        setattr(disp_db, clave, valor)

    db.commit()
    db.refresh(disp_db)
    return disp_db


# 4. DELETE - Eliminar una franja de disponibilidad
@router.delete("/{disponibilidad_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_disponibilidad(disponibilidad_id: int, db: Session = Depends(get_db)):
    disp_db = db.query(DisponibilidadDocente).filter(DisponibilidadDocente.id == disponibilidad_id).first()
    if not disp_db:
        raise HTTPException(status_code=404, detail="Registro de disponibilidad no encontrado.")

    db.delete(disp_db)
    db.commit()
    return None