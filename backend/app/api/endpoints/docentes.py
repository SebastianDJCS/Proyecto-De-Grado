from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Docente
from app.schemas import DocenteCreate, DocenteResponse, DocenteUpdate

router = APIRouter(prefix="/docentes", tags=["Docentes"])


@router.get("/", response_model=List[DocenteResponse])
def obtener_docentes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Obtener la lista de todos los docentes."""
    return db.query(Docente).offset(skip).limit(limit).all()


@router.post("/", response_model=DocenteResponse, status_code=status.HTTP_201_CREATED)
def crear_docente(docente: DocenteCreate, db: Session = Depends(get_db)):
    """Crear un nuevo docente."""
    docente_existente = db.query(Docente).filter(Docente.documento == docente.documento).first()
    if docente_existente:
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe un docente con el documento {docente.documento}"
        )
    
    nuevo_docente = Docente(**docente.model_dump())
    db.add(nuevo_docente)
    db.commit()
    db.refresh(nuevo_docente)
    return nuevo_docente


@router.get("/{docente_id}", response_model=DocenteResponse)
def obtener_docente(docente_id: int, db: Session = Depends(get_db)):
    """Obtener un docente por su ID."""
    docente = db.query(Docente).filter(Docente.id == docente_id).first()
    if not docente:
        raise HTTPException(status_code=404, detail="Docente no encontrado")
    return docente


@router.put("/{docente_id}", response_model=DocenteResponse)
def actualizar_docente(
    docente_id: int, docente_update: DocenteUpdate, db: Session = Depends(get_db)
):
    """Actualizar datos de un docente existente."""
    db_docente = db.query(Docente).filter(Docente.id == docente_id).first()
    if not db_docente:
        raise HTTPException(status_code=404, detail="Docente no encontrado")

    datos = docente_update.model_dump(exclude_unset=True)
    for key, value in datos.items():
        setattr(db_docente, key, value)

    db.commit()
    db.refresh(db_docente)
    return db_docente


@router.delete("/{docente_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_docente(docente_id: int, db: Session = Depends(get_db)):
    """Eliminar un docente."""
    db_docente = db.query(Docente).filter(Docente.id == docente_id).first()
    if not db_docente:
        raise HTTPException(status_code=404, detail="Docente no encontrado")

    db.delete(db_docente)
    db.commit()
    return None