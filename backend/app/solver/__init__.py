"""
Módulo orquestador del Solver de Horarios.
Expone las funciones principales para ejecutar la optimización desde la API.
"""

from sqlalchemy.orm import Session
from app.schemas.horario import OptimizacionParametros
from app.solver.engine import resolver_horarios_uctp, ResultadoOptimizacion


def ejecutar_solver(db: Session, parametros: OptimizacionParametros) -> ResultadoOptimizacion:
    """
    Punto de entrada principal para ejecutar la optimización desde FastAPI.
    """
    return resolver_horarios_uctp(db, semestre=parametros.semestre)


__all__ = ["ejecutar_solver", "ResultadoOptimizacion"]