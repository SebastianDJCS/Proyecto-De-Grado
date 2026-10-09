from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.models import Base

# Configuración desde variables de entorno (.env)
settings = get_settings()

DATABASE_URL = settings.DATABASE_URL

# Render/Neon pueden entregar la URL con el esquema antiguo "postgres://".
# SQLAlchemy 2.x solo acepta "postgresql://", así que lo normalizamos aquí.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Se agregan pool_pre_ping y pool_recycle para evitar "SSL connection has been closed unexpectedly"
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verifica la conexión antes de usarla
    pool_recycle=300     # Recicla conexiones cada 5 minutos
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
