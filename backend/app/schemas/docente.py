from typing import Optional
from pydantic import BaseModel, ConfigDict


class DocenteBase(BaseModel):
    documento: str
    nombre: str
    horas_maximas: int
    horas_administrativas: int


class DocenteCreate(DocenteBase):
    pass


class DocenteUpdate(BaseModel):
    documento: Optional[str] = None
    nombre: Optional[str] = None
    horas_maximas: Optional[int] = None
    horas_administrativas: Optional[int] = None


class DocenteResponse(DocenteBase):
    id: int
    model_config = ConfigDict(from_attributes=True)