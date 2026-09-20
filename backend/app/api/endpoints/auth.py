from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Usuario
from app.schemas.auth import UsuarioCreate, UsuarioLogin, UsuarioResponse, TokenResponse
from app.security import hash_password, verify_password, create_access_token, get_current_user, require_role

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=TokenResponse)
def login(credentials: UsuarioLogin, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.documento == credentials.documento).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Documento o contraseña incorrectos",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Usuario inactivo")

    access_token = create_access_token(data={"sub": str(user.id), "rol": user.rol})
    return TokenResponse(
        access_token=access_token,
        user=UsuarioResponse.model_validate(user),
    )


@router.post("/register", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def register(usuario: UsuarioCreate, db: Session = Depends(get_db)):
    existing = db.query(Usuario).filter(Usuario.documento == usuario.documento).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un usuario con ese documento")

    if usuario.email:
        existing_email = db.query(Usuario).filter(Usuario.email == usuario.email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Ya existe un usuario con ese email")

    nuevo = Usuario(
        documento=usuario.documento,
        nombre=usuario.nombre,
        email=usuario.email,
        password_hash=hash_password(usuario.password),
        rol=usuario.rol,
        semestre_actual=usuario.semestre_actual,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.get("/me", response_model=UsuarioResponse)
def get_me(current_user: Usuario = Depends(get_current_user)):
    return current_user
