from typing import Optional
from pydantic import BaseModel


class GrupoBase(BaseModel):
    asignatura_id: int
    numero_grupo: int
    total_inscritos: int
    total_repitentes: int
    total_estudiantes: int


class GrupoCreate(GrupoBase):
    pass


class GrupoUpdate(BaseModel):
    asignatura_id: Optional[int] = None
    numero_grupo: Optional[int] = None
    total_inscritos: Optional[int] = None
    total_repitentes: Optional[int] = None
    total_estudiantes: Optional[int] = None


class GrupoResponse(GrupoBase):
    id: int

    class Config:
        from_attributes = True