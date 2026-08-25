# ==========================================
# ENDPOINTS Y ESQUEMAS PARA SALONES
# ==========================================
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

# Importamos la dependencia para obtener la sesión de base de datos 
# y el modelo de salón (ajusta la ruta relativa si tu database.py o models están en otra carpeta)
from app.database import get_db
from app.models import Salon as SalonModel  # Asegúrate de que tu modelo SQLAlchemy se importe desde aquí

router = APIRouter(prefix="/salones", tags=["Salones"])

# --- ESQUEMAS (PYDANTIC) ---
class SalonBase(BaseModel):
    sede: str
    nomenclatura: str
    nombre: Optional[str] = None
    tipo: str = "AULA"
    capacidad: int

class SalonCreate(SalonBase):
    pass

class SalonUpdate(BaseModel):
    sede: Optional[str] = None
    nomenclatura: Optional[str] = None
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    capacidad: Optional[int] = None

class SalonResponse(SalonBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# --- RUTAS / ENDPOINTS ---

@router.post("/", response_model=SalonResponse)
def crear_salon(salon: SalonCreate, db: Session = Depends(get_db)):
    """
    Registra un nuevo salón en la base de datos de Neon.
    """
    try:
        nuevo_salon = SalonModel(
            sede=salon.sede,
            nomenclatura=salon.nomenclatura,
            nombre=salon.nombre if salon.nombre and salon.nombre.strip() != "" else None,
            tipo=salon.tipo,
            capacidad=salon.capacidad
        )
        
        db.add(nuevo_salon)
        db.commit()
        db.refresh(nuevo_salon)
        
        return nuevo_salon
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al registrar el salón: {str(e)}")


@router.get("/", response_model=List[SalonResponse])
def obtener_salones(db: Session = Depends(get_db)):
    """
    Obtiene la lista de todos los salones registrados.
    """
    try:
        salones = db.query(SalonModel).all()
        return salones
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener los salones: {str(e)}")
@router.put("/{salon_id}", response_model=SalonResponse)
def actualizar_salon(salon_id: int, salon: SalonUpdate, db: Session = Depends(get_db)):
    db_salon = db.query(SalonModel).filter(SalonModel.id == salon_id).first()
    if not db_salon:
        raise HTTPException(status_code=404, detail="Salón no encontrado")
    
    # Actualizar solo los campos enviados
    for key, value in salon.model_dump(exclude_unset=True).items():
        setattr(db_salon, key, value)
    
    db.commit()
    db.refresh(db_salon)
    return db_salon

@router.delete("/{salon_id}")
def eliminar_salon(salon_id: int, db: Session = Depends(get_db)):
    db_salon = db.query(SalonModel).filter(SalonModel.id == salon_id).first()
    if not db_salon:
        raise HTTPException(status_code=404, detail="Salón no encontrado")
    
    db.delete(db_salon)
    db.commit()
    return {"message": "Salón eliminado exitosamente"}