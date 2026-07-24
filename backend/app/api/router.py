from fastapi import APIRouter
from app.api.endpoints import solver, upload

api_router = APIRouter()

# Registra el endpoint del solver que ya tienes creado
api_router.include_router(solver.router)

# Si ya tienes el endpoint de carga de archivos (ETL/Excel):
api_router.include_router(upload.router)

