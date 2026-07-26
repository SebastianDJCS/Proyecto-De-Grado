
# ==========================================
# ESQUEMAS PARA SALONES
# ==========================================
from typing import Optional
from pydantic import BaseModel, ConfigDict
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
