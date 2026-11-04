from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class RegistroRequest(BaseModel):
    """Autorregistro de un estudiante (el correo es el usuario)."""

    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6, max_length=128)
    semestre: int = Field(ge=1, le=10)

    @field_validator("email")
    @classmethod
    def normalizar_email(cls, valor: str) -> str:
        correo = valor.strip().lower()
        if "@" not in correo or "." not in correo.split("@")[-1]:
            raise ValueError("Correo electrónico inválido")
        return correo


class LoginResponse(BaseModel):
    id: int
    username: str
    rol: str
    nombre: Optional[str] = None
    semestre: Optional[int] = None
    materias_reprobadas: List[int] = []
    token: str
