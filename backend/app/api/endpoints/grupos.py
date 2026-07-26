from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GrupoProyectado, Asignatura
from app.schemas import GrupoProyectadoCreate, GrupoProyectadoResponse, GrupoProyectadoUpdate

router = APIRouter(prefix="/grupos", tags=["Grupos Proyectados"])


@router.get("/", response_model=List[GrupoProyectadoResponse])
def obtener_grupos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Obtener todos los grupos proyectados."""
    return db.query(GrupoProyectado).offset(skip).limit(limit).all()


@router.post("/", response_model=GrupoProyectadoResponse, status_code=status.HTTP_201_CREATED)
def crear_grupo(grupo: GrupoProyectadoCreate, db: Session = Depends(get_db)):
    """Crear un nuevo grupo proyectado."""
    # Verificar que la asignatura exista
    asignatura = db.query(Asignatura).filter(Asignatura.id == grupo.asignatura_id).first()
    if not asignatura:
        raise HTTPException(status_code=404, detail="La asignatura especificada no existe")

    nuevo_grupo = GrupoProyectado(**grupo.model_dump())
    db.add(nuevo_grupo)
    db.commit()
    db.refresh(nuevo_grupo)
    return nuevo_grupo


@router.get("/{grupo_id}", response_model=GrupoProyectadoResponse)
def obtener_grupo(grupo_id: int, db: Session = Depends(get_db)):
    """Obtener un grupo por su ID."""
    grupo = db.query(GrupoProyectado).filter(GrupoProyectado.id == grupo_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    return grupo


@router.put("/{grupo_id}", response_model=GrupoProyectadoResponse)
def actualizar_grupo(
    grupo_id: int, grupo_update: GrupoProyectadoUpdate, db: Session = Depends(get_db)
):
    """Actualizar un grupo proyectado."""
    db_grupo = db.query(GrupoProyectado).filter(GrupoProyectado.id == grupo_id).first()
    if not db_grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")

    datos = grupo_update.model_dump(exclude_unset=True)
    for key, value in datos.items():
        setattr(db_grupo, key, value)

    db.commit()
    db.refresh(db_grupo)
    return db_grupo


@router.delete("/{grupo_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_grupo(grupo_id: int, db: Session = Depends(get_db)):
    """Eliminar un grupo proyectado."""
    db_grupo = db.query(GrupoProyectado).filter(GrupoProyectado.id == grupo_id).first()
    if not db_grupo:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")

    db.delete(db_grupo)
    db.commit()
    return None