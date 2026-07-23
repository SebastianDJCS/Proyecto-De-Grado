"""
Endpoint para resolver el problema de horarios universitarios (UCTP).

Proporciona un endpoint REST para invocar el motor de optimización
y obtener el estado del proceso de resolución.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.solver.engine import ResultadoOptimizacion, resolver_horarios_uctp

router = APIRouter(prefix="/solver", tags=["solver"])


@router.post("/resolver-horarios")
def resolver_horarios(db: Session = Depends(get_db)) -> ResultadoOptimizacion:
    """
    Resuelve el problema de asignación de horarios universitarios.

    Invoca el motor de optimización CP-SAT para encontrar una asignación
    óptima de horarios respetando todas las restricciones duras:
    - Capacidad de salones
    - Disponibilidad de docentes
    - Conflictos de docentes (no puede estar en dos lugares simultáneamente)
    - Conflictos de salones (no puede haber sobreocupación)
    - Horas máximas por docente
    - Cobertura de horas para cada grupo

    Returns:
        ResultadoOptimizacion:
            - status: "OPTIMAL", "FEASIBLE", "INFEASIBLE", "ERROR"
            - tiempo_ejecucion: Segundos que tardó la resolución
            - total_asignaciones: Cantidad de clases asignadas
            - grupos_asignados: Cantidad de grupos que tienen al menos una clase
            - total_grupos: Total de grupos en la BD
            - mensaje: Descripción del resultado

    Raises:
        HTTPException 500: Si ocurre un error durante la resolución

    Examples:
        >>> import requests
        >>> resp = requests.post("http://localhost:8000/api/solver/resolver-horarios")
        >>> print(resp.json())
        {
            "status": "FEASIBLE",
            "tiempo_ejecucion": 45.23,
            "total_asignaciones": 156,
            "grupos_asignados": 52,
            "total_grupos": 52,
            "mensaje": "Optimización FEASIBLE: 156 asignaciones, 52/52 grupos"
        }
    """
    try:
        resultado = resolver_horarios_uctp(db)

        # Si hay error, lanzar excepción HTTP
        if resultado.status == "ERROR":
            raise HTTPException(status_code=500, detail=resultado.mensaje)

        return resultado

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en optimización: {str(e)}")


__all__ = ["router"]
