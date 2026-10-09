from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Asignatura, GrupoProyectado
from app.schemas import AsignaturaCreate, AsignaturaResponse, AsignaturaUpdate

router = APIRouter(prefix="/asignaturas", tags=["Asignaturas"])


def _crear_grupo(
    asignatura_id: int,
    numero: int,
    inscritos: int,
    repitentes: int = 0,
    totales: int | None = None,
) -> GrupoProyectado:
    return GrupoProyectado(
        asignatura_id=asignatura_id,
        numero_grupo=numero,
        total_inscritos=inscritos,
        total_repitentes=repitentes,
        total_estudiantes=totales if totales is not None else inscritos + repitentes,
    )


def _ajustar_secciones(
    db: Session,
    asignatura: Asignatura,
    num_secciones: int,
    estudiantes_por_seccion: int | None = None,
) -> None:
    """Agrega o elimina grupos para igualar la cantidad pedida.

    Al reducir, elimina primero los de mayor número (con sus horarios en
    cascada). Al aumentar, los nuevos grupos copian la matrícula del último
    grupo existente salvo que se indique `estudiantes_por_seccion`.
    """
    grupos = sorted(asignatura.grupos_proyectados, key=lambda g: g.numero_grupo)
    actual = len(grupos)

    if num_secciones < actual:
        for grupo in reversed(grupos[num_secciones:]):
            db.delete(grupo)
        return

    if num_secciones > actual:
        plantilla = grupos[-1] if grupos else None
        siguiente = (plantilla.numero_grupo if plantilla else 0) + 1
        for _ in range(num_secciones - actual):
            if estudiantes_por_seccion is not None:
                db.add(_crear_grupo(asignatura.id, siguiente, estudiantes_por_seccion))
            elif plantilla:
                db.add(
                    _crear_grupo(
                        asignatura.id,
                        siguiente,
                        plantilla.total_inscritos,
                        plantilla.total_repitentes,
                        plantilla.total_estudiantes,
                    )
                )
            else:
                db.add(_crear_grupo(asignatura.id, siguiente, 0))
            siguiente += 1


@router.get("/", response_model=List[AsignaturaResponse])
def obtener_asignaturas(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Obtener la lista de todas las asignaturas."""
    return (
        db.query(Asignatura)
        .options(joinedload(Asignatura.grupos_proyectados))
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/", response_model=AsignaturaResponse, status_code=status.HTTP_201_CREATED)
def crear_asignatura(asignatura: AsignaturaCreate, db: Session = Depends(get_db)):
    """Crear una nueva asignatura con sus secciones (grupos)."""
    existente = db.query(Asignatura).filter(Asignatura.codigo_uccd == asignatura.codigo_uccd).first()
    if existente:
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe una asignatura con el código {asignatura.codigo_uccd}"
        )

    datos = asignatura.model_dump()
    num_secciones = datos.pop("num_secciones", 1)
    estudiantes_por_seccion = datos.pop("estudiantes_por_seccion", 0)

    nueva_asignatura = Asignatura(**datos)
    db.add(nueva_asignatura)
    db.flush()

    for numero in range(1, num_secciones + 1):
        db.add(
            GrupoProyectado(
                asignatura_id=nueva_asignatura.id,
                numero_grupo=numero,
                total_inscritos=estudiantes_por_seccion,
                total_repitentes=0,
                total_estudiantes=estudiantes_por_seccion,
            )
        )

    db.commit()
    db.refresh(nueva_asignatura)
    return nueva_asignatura


@router.get("/{asignatura_id}", response_model=AsignaturaResponse)
def obtener_asignatura(asignatura_id: int, db: Session = Depends(get_db)):
    """Obtener una asignatura por su ID."""
    asignatura = db.query(Asignatura).filter(Asignatura.id == asignatura_id).first()
    if not asignatura:
        raise HTTPException(status_code=404, detail="Asignatura no encontrada")
    return asignatura


@router.put("/{asignatura_id}", response_model=AsignaturaResponse)
def actualizar_asignatura(
    asignatura_id: int, asignatura_update: AsignaturaUpdate, db: Session = Depends(get_db)
):
    """Actualizar datos de una asignatura existente (incluidas sus secciones)."""
    db_asignatura = db.query(Asignatura).filter(Asignatura.id == asignatura_id).first()
    if not db_asignatura:
        raise HTTPException(status_code=404, detail="Asignatura no encontrada")

    datos = asignatura_update.model_dump(exclude_unset=True)
    num_secciones = datos.pop("num_secciones", None)
    estudiantes_por_seccion = datos.pop("estudiantes_por_seccion", None)

    for key, value in datos.items():
        setattr(db_asignatura, key, value)

    if num_secciones is not None:
        _ajustar_secciones(db, db_asignatura, num_secciones, estudiantes_por_seccion)

    db.commit()
    db.refresh(db_asignatura)
    return db_asignatura


@router.delete("/{asignatura_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_asignatura(asignatura_id: int, db: Session = Depends(get_db)):
    """Eliminar una asignatura."""
    db_asignatura = db.query(Asignatura).filter(Asignatura.id == asignatura_id).first()
    if not db_asignatura:
        raise HTTPException(status_code=404, detail="Asignatura no encontrada")

    db.delete(db_asignatura)
    db.commit()
    return None