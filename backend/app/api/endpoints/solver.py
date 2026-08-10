"""
Endpoint para resolver el problema de horarios universitarios (UCTP).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
# Importamos directamente tu función del engine que actualizamos hace un momento
from app.solver.engine import resolver_horarios_uctp, ResultadoOptimizacion 

router = APIRouter(prefix="/solver", tags=["solver"])


@router.post("/resolver-horarios")
def resolver_horarios(
    db: Session = Depends(get_db),
) -> ResultadoOptimizacion:
    """
    Resuelve el problema de asignación de horarios universitarios.
    Ejecuta el motor de optimización de forma global para toda la institución.
    """
    try:
        # 🚀 Ejecutamos el motor globalmente (sin filtros)
        resultado = resolver_horarios_uctp(db=db)

        # Si el motor reporta error
        if resultado.status == "ERROR":
            raise HTTPException(status_code=500, detail=resultado.mensaje)

        return resultado

    except Exception as e:
        # Esto captura errores inesperados durante la llamada al motor
        raise HTTPException(status_code=500, detail=f"Error en optimización: {str(e)}")


__all__ = ["router"]