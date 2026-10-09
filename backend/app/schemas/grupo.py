from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class GrupoBase(BaseModel):
    asignatura_id: int = Field(gt=0)
    numero_grupo: int = Field(ge=1)
    total_inscritos: int = Field(ge=0)
    total_repitentes: int = Field(ge=0)
    total_estudiantes: int = Field(ge=0)


class GrupoCreate(GrupoBase):
    pass


class GrupoUpdate(BaseModel):
    asignatura_id: Optional[int] = Field(default=None, gt=0)
    numero_grupo: Optional[int] = Field(default=None, ge=1)
    total_inscritos: Optional[int] = Field(default=None, ge=0)
    total_repitentes: Optional[int] = Field(default=None, ge=0)
    total_estudiantes: Optional[int] = Field(default=None, ge=0)


class GrupoResponse(GrupoBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
