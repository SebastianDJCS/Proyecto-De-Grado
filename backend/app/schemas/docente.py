from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class DocenteBase(BaseModel):
    documento: str = Field(min_length=1)
    nombre: str = Field(min_length=1)
    horas_maximas: int = Field(ge=0)
    horas_administrativas: int = Field(ge=0)


class DocenteCreate(DocenteBase):
    pass


class DocenteUpdate(BaseModel):
    documento: Optional[str] = Field(default=None, min_length=1)
    nombre: Optional[str] = Field(default=None, min_length=1)
    horas_maximas: Optional[int] = Field(default=None, ge=0)
    horas_administrativas: Optional[int] = Field(default=None, ge=0)


class DocenteResponse(DocenteBase):
    id: int
    model_config = ConfigDict(from_attributes=True)