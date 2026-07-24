"""
Endpoint para la carga e ingesta de datos (ETL).
"""

from fastapi import APIRouter

router = APIRouter(prefix="/upload", tags=["Carga de Datos"])


@router.get("/")
def estado_carga():
    """Endpoint de prueba/verificación para el módulo de carga de datos."""
    return {"mensaje": "Módulo de carga de datos listo para ser implementado."}