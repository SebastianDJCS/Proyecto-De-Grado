from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Usuario
from app.schemas.auth import LoginRequest, LoginResponse, RegistroRequest
from app.security import crear_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])


def _respuesta_login(usuario: Usuario) -> LoginResponse:
    return LoginResponse(
        id=usuario.id,
        username=usuario.username,
        rol=usuario.rol,
        nombre=usuario.nombre or None,
        semestre=usuario.semestre,
        materias_reprobadas=usuario.materia_reprobada_ids,
        token=crear_token(usuario.id, usuario.rol),
    )


@router.post("/login", response_model=LoginResponse)
def login(datos: LoginRequest, db: Session = Depends(get_db)):
    """Valida las credenciales y devuelve un token de sesión."""
    username = datos.username.strip()
    if "@" in username:
        username = username.lower()

    usuario = (
        db.query(Usuario)
        .filter(Usuario.username == username, Usuario.activo == True)  # noqa: E712
        .first()
    )

    if not usuario or not verify_password(datos.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    return _respuesta_login(usuario)


@router.post("/registro", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def registro_estudiante(datos: RegistroRequest, db: Session = Depends(get_db)):
    """Autorregistro público de un estudiante usando su correo electrónico."""
    existente = db.query(Usuario).filter(Usuario.username == datos.email).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una cuenta con este correo electrónico",
        )

    usuario = Usuario(
        username=datos.email,
        password_hash=hash_password(datos.password),
        nombre="",
        rol="estudiante",
        activo=True,
        semestre=datos.semestre,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return _respuesta_login(usuario)
