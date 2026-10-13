"""
Módulo orquestador del Solver de Horarios.
Expone las funciones principales para ejecutar la optimización desde la API.
"""

from sqlalchemy.orm import Session
from app.solver.engine import resolver_horarios_uctp, ResultadoOptimizacion


def ejecutar_solver(db: Session) -> ResultadoOptimizacion:
    """
    Punto de entrada principal para ejecutar la optimización global desde FastAPI.
    """
    return resolver_horarios_uctp(db)


__all__ = ["ejecutar_solver", "ResultadoOptimizacion"]