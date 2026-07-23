"""
Aplicación principal FastAPI para el Sistema de Optimización de Horarios.

Configura:
- Base de datos SQLAlchemy
- Routers/endpoints
- CORS y middleware
- Documentación OpenAPI
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoints import solver, upload
from app.database import Base, engine

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Crear tablas
logger.info("Inicializando base de datos...")
Base.metadata.create_all(bind=engine)

# Crear aplicación FastAPI
app = FastAPI(
    title="Sistema de Optimización de Horarios Universitarios",
    description="API para resolver el Problema de Horarios Universitarios (UCTP) usando OR-Tools CP-SAT",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(solver.router, prefix="/api", tags=["Optimización"])
if upload.router:  # Si existe el router de upload
    app.include_router(upload.router, prefix="/api", tags=["Carga de Datos"])


@app.get("/", tags=["Health"])
def root():
    """Endpoint raíz de bienvenida."""
    return {
        "mensaje": "Sistema de Optimización de Horarios Universitarios",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health", tags=["Health"])
def health_check():
    """Verificar estado de la aplicación."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    logger.info("Iniciando servidor FastAPI...")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
