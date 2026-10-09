from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class SalonBase(BaseModel):
    sede: str = Field(min_length=1)
    nomenclatura: str = Field(min_length=1)
    nombre: Optional[str] = None
    tipo: str = "AULA"
    capacidad: int = Field(gt=0)


class SalonCreate(SalonBase):
    pass


class SalonUpdate(BaseModel):
    sede: Optional[str] = Field(default=None, min_length=1)
    nomenclatura: Optional[str] = Field(default=None, min_length=1)
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    capacidad: Optional[int] = Field(default=None, gt=0)


class SalonResponse(SalonBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
