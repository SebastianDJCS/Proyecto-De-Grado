from typing import Optional, List
from pydantic import BaseModel, ConfigDict

# 1. Parámetros que envía el frontend al backend para ejecutar el algoritmo
class OptimizacionParametros(BaseModel):
    sede: Optional[str] = None
    semestre: Optional[int] = None  # ➕ Filtro opcional por semestre
    periodo_academico: str = "2026-2"
    sobrescribir_existentes: bool = True


# 2. Confirmación/Resumen del proceso de optimización
class OptimizacionResponse(BaseModel):
    status: str
    mensaje: str
    tiempo_ejecucion_seg: float
    total_asignaciones: int
    detalles: Optional[str] = None


# 3. Estructura detallada de cada asignación (Clase o Hora Administrativa)
class HorarioDetalleSchema(BaseModel):
    id: int
    dia: str
    bloque_horario: str
    docente_nombre: str
    tipo_actividad: str = "CLASE"  # ➕ "CLASE" o "ADMINISTRATIVA"
    asignatura_nombre: Optional[str] = "N/A"  # Opcional por si es hora administrativa
    grupo_codigo: Optional[str | int] = "N/A"  # Opcional por si es hora administrativa
    salon_nombre: Optional[str] = None
    salon_sede: Optional[str] = "Principal"
    salon_nomenclatura: Optional[str] = "Oficina / N/A"

    model_config = ConfigDict(from_attributes=True)