
# ==========================================
# ESQUEMAS PARA DISPONIBILIDAD DE DOCENTES
# ==========================================

from typing import Optional
from pydantic import BaseModel, ConfigDict


class DisponibilidadBase(BaseModel):
    dia: str
    bloque_horario: str


class DisponibilidadCreate(DisponibilidadBase):
    docente_id: int


class DisponibilidadUpdate(BaseModel):
    docente_id: Optional[int] = None
    dia: Optional[str] = None
    bloque_horario: Optional[str] = None


class DisponibilidadResponse(DisponibilidadBase):
    id: int
    docente_id: int

    model_config = ConfigDict(from_attributes=True)