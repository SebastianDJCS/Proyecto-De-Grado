"""
Configuración de routers de la API.

Este módulo centraliza la importación y configuración de todos los routers
de la aplicación. Si en el futuro se agreguen más routers, se importan aquí.
"""

from app.api.endpoints import solver, upload

__all__ = ["solver", "upload"]
