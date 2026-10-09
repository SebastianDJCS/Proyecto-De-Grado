from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

TIPOS_ASIGNATURA = ("FUNDAMENTAL", "ELECTIVA")


class AsignaturaBase(BaseModel):
    codigo_uccd: str = Field(min_length=1)
    nombre: str = Field(min_length=1)
    creditos: int = Field(ge=0)
    semestre: int = Field(ge=1)
    horas_semanales: int = Field(ge=0)
    # Sesiones semanales por grupo
    secciones_por_grupo: int = Field(default=1, ge=1, le=10)
    # Duración (horas) de cada sección: 1, 2 o 3
    horas_por_seccion: int = Field(default=2, ge=1, le=3)
    seleccionable: bool = False
    tipo: str = Field(default="FUNDAMENTAL", pattern="^(FUNDAMENTAL|ELECTIVA)$")


class AsignaturaCreate(AsignaturaBase):
    # Cuántos grupos (G1, G2, ...) se crean al crear la materia
    num_secciones: int = Field(default=1, ge=1, le=20)
    # Matrícula estimada por sección (opcional, el ETL puede actualizarla después)
    estudiantes_por_seccion: int = Field(default=0, ge=0)


class AsignaturaUpdate(BaseModel):
    codigo_uccd: Optional[str] = Field(default=None, min_length=1)
    nombre: Optional[str] = Field(default=None, min_length=1)
    creditos: Optional[int] = Field(default=None, ge=0)
    semestre: Optional[int] = Field(default=None, ge=1)
    horas_semanales: Optional[int] = Field(default=None, ge=0)
    # Sesiones semanales por grupo
    secciones_por_grupo: Optional[int] = Field(default=None, ge=1, le=10)
    # Duración (horas) de cada sección: 1, 2 o 3
    horas_por_seccion: Optional[int] = Field(default=None, ge=1, le=3)
    seleccionable: Optional[bool] = None
    tipo: Optional[str] = Field(default=None, pattern="^(FUNDAMENTAL|ELECTIVA)$")
    # Cantidad deseada de grupos (G1, G2, ...); ajusta las existentes al guardar
    num_secciones: Optional[int] = Field(default=None, ge=0, le=20)
    # Estudiantes por sección para los grupos nuevos que se creen al aumentar
    estudiantes_por_seccion: Optional[int] = Field(default=None, ge=0)


class AsignaturaResponse(AsignaturaBase):
    id: int
    secciones: int = 0
    model_config = ConfigDict(from_attributes=True)
