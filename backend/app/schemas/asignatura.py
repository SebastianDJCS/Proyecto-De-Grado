# ==========================================
# ESQUEMAS PARA ASIGNATURAS
# ==========================================
from typing import Optional
from pydantic import BaseModel, ConfigDict
class AsignaturaBase(BaseModel):
    codigo_uccd: str
    nombre: str
    semestre: int
    creditos: int
    horas_semanales: int

class AsignaturaCreate(AsignaturaBase):
    pass

class AsignaturaUpdate(BaseModel):
    codigo_uccd: Optional[str] = None
    nombre: Optional[str] = None
    semestre: Optional[int] = None
    creditos: Optional[int] = None
    horas_semanales: Optional[int] = None

class AsignaturaResponse(AsignaturaBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
