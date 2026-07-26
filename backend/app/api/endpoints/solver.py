"""
Endpoint para resolver el problema de horarios universitarios (UCTP).

Proporciona un endpoint REST para invocar el motor de optimización
y obtener el estado del proceso de resolución.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.horario import OptimizacionParametros  # ➕ Importamos el esquema de parámetros
from app.solver import ejecutar_solver, ResultadoOptimizacion  # ➕ Importamos la fachada del solver

router = APIRouter(prefix="/solver", tags=["solver"])


@router.post("/resolver-horarios")
def resolver_horarios(
    parametros: Optional[OptimizacionParametros] = Body(None),  # ➕ Ahora puede recibir filtros JSON opcionales
    db: Session = Depends(get_db),
) -> ResultadoOptimizacion:
    """
    Resuelve el problema de asignación de horarios universitarios.

    Invoca el motor de optimización CP-SAT para encontrar una asignación
    óptima de horarios respetando todas las restricciones duras y permitiendo
    filtrar opcionalmente por semestre.
    """
    try:
        # Si no se envió body en la petición, inicializamos parametros por defecto
        if parametros is None:
            parametros = OptimizacionParametros()

        # 🚀 Ejecutamos el orquestador del solver pasando los parámetros
        resultado = ejecutar_solver(db=db, parametros=parametros)

        # Si hay error, lanzar excepción HTTP
        if resultado.status == "ERROR":
            raise HTTPException(status_code=500, detail=resultado.mensaje)

        return resultado

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en optimización: {str(e)}")


__all__ = ["router"]