from typing import Optional, List
from pydantic import BaseModel, ConfigDict

# 1. Lo que envía el frontend al backend para iniciar el algoritmo
class OptimizacionParametros(BaseModel):
    sede: Optional[str] = None
    periodo_academico: str = "2026-2"
    sobrescribir_existentes: bool = True


# 2. La respuesta rápida del backend confirmando cómo le fue al algoritmo
class OptimizacionResponse(BaseModel):
    status: str
    mensaje: str
    tiempo_ejecucion_seg: float
    total_asignaciones: int
    detalles: Optional[str] = None


# 3. La estructura detallada de cada clase asignada
class HorarioDetalleSchema(BaseModel):
    id: int
    dia: str
    bloque_horario: str
    docente_nombre: str
    asignatura_nombre: str
    grupo_codigo: str | int
    salon_nombre: Optional[str] = None
    salon_sede: str
    salon_nomenclatura: str

    model_config = ConfigDict(from_attributes=True)