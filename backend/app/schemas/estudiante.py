from typing import List, Optional

from pydantic import BaseModel, Field


class SeleccionHorarioRequest(BaseModel):
    """Materias que el estudiante desea cursar."""

    asignatura_ids: List[int] = Field(min_length=1)


class ConfigEstudiante(BaseModel):
    """Reglas para la selección de materias del estudiante."""

    max_creditos: int


class AsignaturaSeleccionableItem(BaseModel):
    """Materia ofertada para que el estudiante la pueda elegir."""

    id: int
    codigo_uccd: str
    nombre: str
    semestre: int
    creditos: int
    grupos: int
    grupos_programados: int
    tipo: str = "FUNDAMENTAL"


class BloqueHorarioItem(BaseModel):
    dia: str
    bloque_horario: str
    salon_nombre: Optional[str] = None


class GrupoSeleccionado(BaseModel):
    asignatura_id: int
    asignatura: str
    grupo_id: int
    grupo_codigo: str
    docente_nombre: str
    tipo: str = "FUNDAMENTAL"
    total_sesiones: int = 0
    bloques: List[BloqueHorarioItem]


class ConflictoHorario(BaseModel):
    dia: str
    bloque_horario: str
    asignaturas: List[str]


class ParConflictoMateria(BaseModel):
    """Par de materias imposibles de combinar sin cruces."""

    a_id: int
    a: str
    a_tipo: str
    b_id: int
    b: str
    b_tipo: str


class HorarioEstudianteItem(BaseModel):
    asignatura: str
    grupo_codigo: str
    docente_nombre: str
    salon_nombre: Optional[str] = None
    dia: str
    bloque_horario: str
    tipo_actividad: str = "CLASE"


class HorarioEstudianteResponse(BaseModel):
    status: str  # "OK" | "PARCIAL" | "REQUIERE_SELECCION" | "ERROR"
    mensaje: str
    creditos_totales: int = 0
    max_creditos: int = 0
    seleccion: List[GrupoSeleccionado]
    conflictos: List[ConflictoHorario]
    no_disponibles: List[str]
    horario: List[HorarioEstudianteItem]
    # Electivas descartadas automáticamente por chocar con fundamentales
    descartadas: List[str] = []
    # Pares que requieren que el estudiante elija cuál conservar
    pares_conflicto: List[ParConflictoMateria] = []
