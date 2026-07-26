from fastapi import APIRouter
from app.api.endpoints import solver, upload, salones, horarios

api_router = APIRouter()

api_router.include_router(solver.router)
api_router.include_router(upload.router)
api_router.include_router(salones.router)
api_router.include_router(horarios.router)