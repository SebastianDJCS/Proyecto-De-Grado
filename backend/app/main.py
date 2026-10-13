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
from sqlalchemy import inspect, text

from app.api.endpoints import horarios, solver, upload, salones, docentes, asignaturas, grupos, disponibilidades, estudiante, auth
from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.models import Usuario
from app.security import hash_password

settings = get_settings()

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def _migraciones_ligeras() -> None:
    """Agrega columnas nuevas a tablas existentes (create_all no las añade)."""
    inspector = inspect(engine)
    tablas = inspector.get_table_names()

    if "asignaturas" in tablas:
        columnas = {col["name"] for col in inspector.get_columns("asignaturas")}
        if "tipo" not in columnas:
            logger.info("Migración: agregando columna 'tipo' a la tabla asignaturas...")
            with engine.begin() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE asignaturas "
                        "ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'FUNDAMENTAL'"
                    )
                )
            logger.info("Migración: columna 'tipo' creada.")

        if "secciones_por_grupo" not in columnas:
            logger.info("Migración: agregando columna 'secciones_por_grupo' a la tabla asignaturas...")
            with engine.begin() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE asignaturas "
                        "ADD COLUMN secciones_por_grupo INTEGER NOT NULL DEFAULT 1"
                    )
                )
                conn.execute(
                    text(
                        "UPDATE asignaturas "
                        "SET secciones_por_grupo = GREATEST(1, CEIL(horas_semanales::numeric / 2)) "
                        "WHERE horas_semanales > 0"
                    )
                )
            logger.info("Migración: columna 'secciones_por_grupo' creada.")

        if "horas_por_seccion" not in columnas:
            logger.info("Migración: agregando columna 'horas_por_seccion' a la tabla asignaturas...")
            with engine.begin() as conn:
                conn.execute(
                    text(
                        "ALTER TABLE asignaturas "
                        "ADD COLUMN horas_por_seccion INTEGER NOT NULL DEFAULT 2"
                    )
                )
                # Inferir la duración real de cada sección a partir de las horas
                # semanales y las secciones existentes (limitado al rango 1-3).
                conn.execute(
                    text(
                        "UPDATE asignaturas "
                        "SET horas_por_seccion = LEAST(3, GREATEST(1, "
                        "  CASE WHEN secciones_por_grupo > 0 "
                        "       THEN ROUND(horas_semanales::numeric / secciones_por_grupo) "
                        "       ELSE 2 END)) "
                        "WHERE horas_semanales > 0"
                    )
                )
            logger.info("Migración: columna 'horas_por_seccion' creada.")


def _seed_admin() -> None:
    """Crea el usuario administrador por defecto si no existe (idempotente)."""
    db = SessionLocal()
    try:
        existe = db.query(Usuario).filter(Usuario.username == "admin").first()
        if existe:
            return
        db.add(
            Usuario(
                username="admin",
                password_hash=hash_password("admin123"),
                nombre="Administrador",
                rol="admin",
                activo=True,
            )
        )
        db.commit()
        logger.info("Usuario administrador por defecto creado (admin / admin123).")
    finally:
        db.close()


# Gestor de ciclo de vida de la aplicación
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Código ejecutado al iniciar la aplicación
    logger.info("Inicializando base de datos...")
    Base.metadata.create_all(bind=engine)
    _migraciones_ligeras()
    _seed_admin()
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
    allow_origins=settings.cors_origins_list,
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
app.include_router(estudiante.router, prefix="/api")
app.include_router(auth.router, prefix="/api")

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