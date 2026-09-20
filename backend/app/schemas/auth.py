from typing import Optional, List
from pydantic import BaseModel, ConfigDict, EmailStr


class UsuarioCreate(BaseModel):
    documento: str
    nombre: str
    email: Optional[str] = None
    password: str
    rol: str = "estudiante"
    semestre_actual: int = 1


class UsuarioLogin(BaseModel):
    documento: str
    password: str


class UsuarioResponse(BaseModel):
    id: int
    documento: str
    nombre: str
    email: Optional[str] = None
    rol: str
    semestre_actual: int
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UsuarioResponse


class MateriaEstudianteCreate(BaseModel):
    asignatura_id: int
    estado: str = "faltante"
    calificacion: Optional[float] = None


class MateriaEstudianteResponse(BaseModel):
    id: int
    estudiante_id: int
    asignatura_id: int
    estado: str
    calificacion: Optional[float] = None
    asignatura_nombre: Optional[str] = None
    asignatura_codigo: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class EstudianteCompletoResponse(BaseModel):
    id: int
    documento: str
    nombre: str
    email: Optional[str] = None
    semestre_actual: int
    materias: List[MateriaEstudianteResponse] = []
    model_config = ConfigDict(from_attributes=True)
