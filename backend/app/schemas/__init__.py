from .salon import SalonBase, SalonCreate, SalonResponse, SalonUpdate
from .docente import DocenteBase, DocenteCreate, DocenteResponse, DocenteUpdate
from .asignatura import (
    AsignaturaBase,
    AsignaturaCreate,
    AsignaturaResponse,
    AsignaturaUpdate,
)
from .grupo import (
    GrupoBase,
    GrupoCreate,
    GrupoResponse,
    GrupoUpdate,
    # Agregamos los nombres con 'Proyectado' para que no fallen tus endpoints:
    GrupoBase as GrupoProyectadoBase,
    GrupoCreate as GrupoProyectadoCreate,
    GrupoResponse as GrupoProyectadoResponse,
    GrupoUpdate as GrupoProyectadoUpdate,
)
from .disponibilidad import (
    DisponibilidadBase,
    DisponibilidadCreate,
    DisponibilidadResponse,
    DisponibilidadUpdate,
)
from .horario import (
    HorarioDetalleSchema,
    OptimizacionParametros,
    OptimizacionResponse,
)

__all__ = [
    # Salones
    "SalonBase",
    "SalonCreate",
    "SalonResponse",
    "SalonUpdate",
    # Docentes
    "DocenteBase",
    "DocenteCreate",
    "DocenteResponse",
    "DocenteUpdate",
    # Asignaturas
    "AsignaturaBase",
    "AsignaturaCreate",
    "AsignaturaResponse",
    "AsignaturaUpdate",
    # Grupos
    "GrupoBase",
    "GrupoCreate",
    "GrupoResponse",
    "GrupoUpdate",
    "GrupoProyectadoBase",
    "GrupoProyectadoCreate",
    "GrupoProyectadoResponse",
    "GrupoProyectadoUpdate",
    # Disponibilidades
    "DisponibilidadBase",
    "DisponibilidadCreate",
    "DisponibilidadResponse",
    "DisponibilidadUpdate",
    # Horarios / Solver
    "OptimizacionParametros",
    "OptimizacionResponse",
    "HorarioDetalleSchema",
]