from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class DisponibilidadBase(BaseModel):
    dia: str = Field(min_length=1)
    bloque_horario: str = Field(min_length=1)


class DisponibilidadCreate(DisponibilidadBase):
    docente_id: int = Field(gt=0)


class DisponibilidadUpdate(BaseModel):
    docente_id: Optional[int] = Field(default=None, gt=0)
    dia: Optional[str] = Field(default=None, min_length=1)
    bloque_horario: Optional[str] = Field(default=None, min_length=1)


class DisponibilidadResponse(DisponibilidadBase):
    id: int
    docente_id: int

    model_config = ConfigDict(from_attributes=True)
