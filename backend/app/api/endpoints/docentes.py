from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Asignatura, Docente
from app.schemas import DocenteCreate, DocenteResponse, DocenteUpdate

router = APIRouter(prefix="/docentes", tags=["Docentes"])


def _resolver_asignaturas(db: Session, asignatura_ids: List[int]) -> List[Asignatura]:
    """Valida que las asignaturas existan y devuelve sus objetos."""
    if not asignatura_ids:
        return []
    ids_unicos = list(dict.fromkeys(asignatura_ids))
    asignaturas = db.query(Asignatura).filter(Asignatura.id.in_(ids_unicos)).all()
    encontradas = {a.id for a in asignaturas}
    faltantes = [i for i in ids_unicos if i not in encontradas]
    if faltantes:
        raise HTTPException(
            status_code=400,
            detail=f"Asignaturas no encontradas: {faltantes}",
        )
    return asignaturas


@router.get("/", response_model=List[DocenteResponse])
def obtener_docentes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Obtener la lista de todos los docentes."""
    return (
        db.query(Docente)
        .options(joinedload(Docente.asignaturas))
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/", response_model=DocenteResponse, status_code=status.HTTP_201_CREATED)
def crear_docente(docente: DocenteCreate, db: Session = Depends(get_db)):
    """Crear un nuevo docente con sus materias asignadas."""
    docente_existente = db.query(Docente).filter(Docente.documento == docente.documento).first()
    if docente_existente:
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe un docente con el documento {docente.documento}"
        )

    datos = docente.model_dump()
    asignaturas = _resolver_asignaturas(db, datos.pop("asignatura_ids", []))

    nuevo_docente = Docente(**datos)
    nuevo_docente.asignaturas = asignaturas
    db.add(nuevo_docente)
    db.commit()
    db.refresh(nuevo_docente)
    return nuevo_docente


@router.get("/{docente_id}", response_model=DocenteResponse)
def obtener_docente(docente_id: int, db: Session = Depends(get_db)):
    """Obtener un docente por su ID."""
    docente = (
        db.query(Docente)
        .options(joinedload(Docente.asignaturas))
        .filter(Docente.id == docente_id)
        .first()
    )
    if not docente:
        raise HTTPException(status_code=404, detail="Docente no encontrado")
    return docente


@router.put("/{docente_id}", response_model=DocenteResponse)
def actualizar_docente(
    docente_id: int, docente_update: DocenteUpdate, db: Session = Depends(get_db)
):
    """Actualizar datos de un docente existente (incluidas sus materias)."""
    db_docente = db.query(Docente).filter(Docente.id == docente_id).first()
    if not db_docente:
        raise HTTPException(status_code=404, detail="Docente no encontrado")

    datos = docente_update.model_dump(exclude_unset=True)
    asignaturas = None
    if "asignatura_ids" in datos:
        asignaturas = _resolver_asignaturas(db, datos.pop("asignatura_ids") or [])

    for key, value in datos.items():
        setattr(db_docente, key, value)

    if asignaturas is not None:
        db_docente.asignaturas = asignaturas

    db.commit()
    db.refresh(db_docente)
    return db_docente


@router.delete("/{docente_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_docente(docente_id: int, db: Session = Depends(get_db)):
    """Eliminar un docente."""
    db_docente = db.query(Docente).filter(Docente.id == docente_id).first()
    if not db_docente:
        raise HTTPException(status_code=404, detail="Docente no encontrado")

    db.delete(db_docente)
    db.commit()
    return None
