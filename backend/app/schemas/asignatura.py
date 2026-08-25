from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Asignatura as AsignaturaModel  # Asegúrate de que tu modelo SQLAlchemy se llame Asignatura

router = APIRouter(prefix="/asignaturas", tags=["Asignaturas"])

class AsignaturaBase(BaseModel):
    codigo: str
    nombre: str
    creditos: int
    semestre: int

class AsignaturaCreate(AsignaturaBase):
    pass

class AsignaturaUpdate(BaseModel):
    codigo: Optional[str] = None
    nombre: Optional[str] = None
    creditos: Optional[int] = None
    semestre: Optional[int] = None

class AsignaturaResponse(AsignaturaBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

@router.post("/", response_model=AsignaturaResponse)
def crear_asignatura(asignatura: AsignaturaCreate, db: Session = Depends(get_db)):
    try:
        nuevo = AsignaturaModel(**asignatura.model_dump())
        db.add(nuevo)
        db.commit()
        db.refresh(nuevo)
        return nuevo
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al registrar asignatura: {str(e)}")

@router.get("/", response_model=List[AsignaturaResponse])
def obtener_asignaturas(db: Session = Depends(get_db)):
    return db.query(AsignaturaModel).all()

@router.put("/{asignatura_id}", response_model=AsignaturaResponse)
def actualizar_asignatura(asignatura_id: int, asignatura: AsignaturaUpdate, db: Session = Depends(get_db)):
    db_asig = db.query(AsignaturaModel).filter(AsignaturaModel.id == asignatura_id).first()
    if not db_asig:
        raise HTTPException(status_code=404, detail="Asignatura no encontrada")
    
    for key, value in asignatura.model_dump(exclude_unset=True).items():
        setattr(db_asig, key, value)
    
    db.commit()
    db.refresh(db_asig)
    return db_asig

@router.delete("/{asignatura_id}")
def eliminar_asignatura(asignatura_id: int, db: Session = Depends(get_db)):
    db_asig = db.query(AsignaturaModel).filter(AsignaturaModel.id == asignatura_id).first()
    if not db_asig:
        raise HTTPException(status_code=404, detail="Asignatura no encontrada")
    
    db.delete(db_asig)
    db.commit()
    return {"message": "Asignatura eliminada exitosamente"}