from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Usuario
from app.schemas.auth import LoginRequest, LoginResponse
from app.security import verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=LoginResponse)
def login(datos: LoginRequest, db: Session = Depends(get_db)):
    """Valida las credenciales de un usuario administrador contra la base de datos."""
    usuario = (
        db.query(Usuario)
        .filter(Usuario.username == datos.username, Usuario.activo == True)  # noqa: E712
        .first()
    )

    if not usuario or not verify_password(datos.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    return LoginResponse(
        username=usuario.username,
        rol=usuario.rol,
        nombre=usuario.nombre or None,
    )
