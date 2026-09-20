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

from app.api.endpoints import horarios, solver, upload, salones, docentes, asignaturas, grupos, disponibilidades, auth, estudiantes
from app.database import Base, engine, SessionLocal
from app.models import Usuario
from app.security import hash_password

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# Gestor de ciclo de vida de la aplicación
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Inicializando base de datos...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        admin = db.query(Usuario).filter(Usuario.rol == "admin").first()
        if not admin:
            admin_user = Usuario(
                documento="admin",
                nombre="Administrador",
                email="admin@uctp.edu.co",
                password_hash=hash_password("admin123"),
                rol="admin",
                semestre_actual=1,
            )
            db.add(admin_user)
            db.commit()
            logger.info("Usuario administrador creado: admin / admin123")
    finally:
        db.close()

    yield
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
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Agrupación de Routers
app.include_router(auth.router, prefix="/api")
app.include_router(estudiantes.router, prefix="/api")
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