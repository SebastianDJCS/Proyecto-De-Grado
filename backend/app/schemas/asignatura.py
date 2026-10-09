from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class AsignaturaBase(BaseModel):
    codigo_uccd: str = Field(min_length=1)
    nombre: str = Field(min_length=1)
    creditos: int = Field(ge=0)
    semestre: int = Field(ge=1)
    horas_semanales: int = Field(ge=0)
    seleccionable: bool = False


class AsignaturaCreate(AsignaturaBase):
    pass


class AsignaturaUpdate(BaseModel):
    codigo_uccd: Optional[str] = Field(default=None, min_length=1)
    nombre: Optional[str] = Field(default=None, min_length=1)
    creditos: Optional[int] = Field(default=None, ge=0)
    semestre: Optional[int] = Field(default=None, ge=1)
    horas_semanales: Optional[int] = Field(default=None, ge=0)
    seleccionable: Optional[bool] = None


class AsignaturaResponse(AsignaturaBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
