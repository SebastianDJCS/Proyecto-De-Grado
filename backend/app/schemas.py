from typing import Optional
from pydantic import BaseModel

# ==========================================
# ESQUEMAS EXISTENTES
# ==========================================


class OptimizacionResponse(BaseModel):
    status: str
    mensaje: str
    tiempo_ejecucion_seg: float
    total_asignaciones: int
    detalles: Optional[str] = None


class HorarioDetalleSchema(BaseModel):
    id: int
    dia: str
    bloque_horario: str
    docente_nombre: str
    asignatura_nombre: str
    grupo_codigo: str | int  # Acepta tanto entero como texto
    salon_nombre: Optional[str] = None  # Permite None si el salón no tiene nombre
    salon_bloque: str
    salon_nomenclatura: str

    class Config:
        from_attributes = True


# ==========================================
# NUEVOS ESQUEMAS PARA DOCENTES
# ==========================================


class DocenteBase(BaseModel):
    documento: str
    nombre: str
    horas_maximas: int


class DocenteCreate(DocenteBase):
    pass


class DocenteUpdate(BaseModel):
    documento: Optional[str] = None
    nombre: Optional[str] = None
    horas_maximas: Optional[int] = None


class DocenteResponse(DocenteBase):
    id: int

    class Config:
        from_attributes = True


# ==========================================
# ESQUEMAS PARA ASIGNATURAS
# ==========================================

class AsignaturaBase(BaseModel):
    codigo_uccd: str
    nombre: str
    semestre: int
    creditos: int
    horas_semanales: int

class AsignaturaCreate(AsignaturaBase):
    pass

class AsignaturaUpdate(BaseModel):
    codigo_uccd: Optional[str] = None
    nombre: Optional[str] = None
    semestre: Optional[int] = None
    creditos: Optional[int] = None
    horas_semanales: Optional[int] = None

class AsignaturaResponse(AsignaturaBase):
    id: int

    class Config:
        from_attributes = True


# ==========================================
# ESQUEMAS PARA GRUPOS PROYECTADOS
# ==========================================

class GrupoProyectadoBase(BaseModel):
    asignatura_id: int
    numero_grupo: int
    total_inscritos: int
    total_repitentes: int
    total_estudiantes: int

class GrupoProyectadoCreate(GrupoProyectadoBase):
    pass

class GrupoProyectadoUpdate(BaseModel):
    asignatura_id: Optional[int] = None
    numero_grupo: Optional[int] = None
    total_inscritos: Optional[int] = None
    total_repitentes: Optional[int] = None
    total_estudiantes: Optional[int] = None

class GrupoProyectadoResponse(GrupoProyectadoBase):
    id: int

    class Config:
        from_attributes = True