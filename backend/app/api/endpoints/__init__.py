"""
Endpoints disponibles del API.

Contiene todos los routers de la aplicación:
- solver: Resolución de horarios
- upload: Carga de datos
"""

from app.api.endpoints import solver, upload

__all__ = ["solver", "upload"]
