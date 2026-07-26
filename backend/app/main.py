"""
Aplicación principal FastAPI para el Sistema de Optimización de Horarios.

Configura:
- Base de datos SQLAlchemy (vía Lifespan context manager)
- Routers/endpoints
- CORS y middleware
- Documentación OpenAPI
"""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoints import horarios, solver, upload, salones, docentes, asignaturas, grupos, disponibilidades
from app.database import Base, engine

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# Gestor de ciclo de vida de la aplicación
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Código ejecutado al iniciar la aplicación
    logger.info("Inicializando base de datos...")
    Base.metadata.create_all(bind=engine)
    yield
    # Código ejecutado al apagar la aplicación (si se requiere cleanup)
    logger.info("Cerrando aplicación...")


# Crear aplicación FastAPI
app = FastAPI(
    title="Sistema de Optimización de Horarios Universitarios",
    description="API para resolver el Problema de Horarios Universitarios (UCTP) usando OR-Tools CP-SAT",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Agrupación de Routers
app.include_router(solver.router, prefix="/api")
app.include_router(docentes.router, prefix="/api")
app.include_router(disponibilidades.router, prefix="/api")
app.include_router(asignaturas.router, prefix="/api")
app.include_router(salones.router, prefix="/api")
app.include_router(grupos.router, prefix="/api")
app.include_router(horarios.router, prefix="/api")

if getattr(upload, "router", None):
    app.include_router(upload.router, prefix="/api", tags=["Carga de Datos"])


# Endpoints de salud / raíz
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
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )