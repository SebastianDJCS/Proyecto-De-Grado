from pydantic import BaseModel
from typing import Optional

class OptimizacionResponse(BaseModel):
    status: str
    mensaje: str
    tiempo_ejecucion_seg: float
    total_asignaciones: int
    detalles: Optional[str] = None