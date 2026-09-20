import csv
import io
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Usuario, Asignatura, MateriaEstudiante
from app.schemas.auth import (
    UsuarioCreate, UsuarioResponse, MateriaEstudianteCreate,
    MateriaEstudianteResponse, EstudianteCompletoResponse,
)
from app.security import hash_password, require_role

router = APIRouter(prefix="/estudiantes", tags=["Estudiantes"])


@router.get("/", response_model=List[UsuarioResponse])
def obtener_estudiantes(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role("admin")),
):
    return (
        db.query(Usuario)
        .filter(Usuario.rol == "estudiante")
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def crear_estudiante(
    estudiante: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role("admin")),
):
    existing = db.query(Usuario).filter(Usuario.documento == estudiante.documento).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un usuario con ese documento")

    nuevo = Usuario(
        documento=estudiante.documento,
        nombre=estudiante.nombre,
        email=estudiante.email,
        password_hash=hash_password(estudiante.password),
        rol="estudiante",
        semestre_actual=estudiante.semestre_actual,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.post("/bulk", response_model=dict)
def crear_estudiantes_masivo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role("admin")),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV")

    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))

    required_fields = {"documento", "nombre", "password"}
    if not required_fields.issubset(set(reader.fieldnames or [])):
        raise HTTPException(
            status_code=400,
            detail=f"El CSV debe tener las columnas: {', '.join(required_fields)}. Columnas encontradas: {', '.join(reader.fieldnames or [])}"
        )

    creados = 0
    errores = []
    for i, row in enumerate(reader, start=2):
        try:
            doc = row["documento"].strip()
            if db.query(Usuario).filter(Usuario.documento == doc).first():
                errores.append(f"Fila {i}: Documento '{doc}' ya existe")
                continue

            nuevo = Usuario(
                documento=doc,
                nombre=row["nombre"].strip(),
                email=row.get("email", "").strip() or None,
                password_hash=hash_password(row["password"].strip()),
                rol="estudiante",
                semestre_actual=int(row.get("semestre_actual", 1)),
            )
            db.add(nuevo)
            creados += 1
        except Exception as e:
            errores.append(f"Fila {i}: {str(e)}")

    db.commit()
    return {"creados": creados, "errores": errores}


@router.get("/{estudiante_id}", response_model=EstudianteCompletoResponse)
def obtener_estudiante(
    estudiante_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role("admin")),
):
    estudiante = (
        db.query(Usuario)
        .filter(Usuario.id == estudiante_id, Usuario.rol == "estudiante")
        .first()
    )
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    materias_db = db.query(MateriaEstudiante).filter(
        MateriaEstudiante.estudiante_id == estudiante.id
    ).all()

    materias = []
    for m in materias_db:
        mat_resp = MateriaEstudianteResponse(
            id=m.id,
            estudiante_id=m.estudiante_id,
            asignatura_id=m.asignatura_id,
            estado=m.estado,
            calificacion=m.calificacion,
            asignatura_nombre=m.asignatura.nombre if m.asignatura else None,
            asignatura_codigo=m.asignatura.codigo_uccd if m.asignatura else None,
        )
        materias.append(mat_resp)

    return EstudianteCompletoResponse(
        id=estudiante.id,
        documento=estudiante.documento,
        nombre=estudiante.nombre,
        email=estudiante.email,
        semestre_actual=estudiante.semestre_actual,
        materias=materias,
    )


@router.put("/{estudiante_id}", response_model=UsuarioResponse)
def actualizar_estudiante(
    estudiante_id: int,
    estudiante_update: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role("admin")),
):
    db_est = (
        db.query(Usuario)
        .filter(Usuario.id == estudiante_id, Usuario.rol == "estudiante")
        .first()
    )
    if not db_est:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    db_est.documento = estudiante_update.documento
    db_est.nombre = estudiante_update.nombre
    db_est.email = estudiante_update.email
    db_est.semestre_actual = estudiante_update.semestre_actual
    if estudiante_update.password:
        db_est.password_hash = hash_password(estudiante_update.password)

    db.commit()
    db.refresh(db_est)
    return db_est


@router.delete("/{estudiante_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_estudiante(
    estudiante_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role("admin")),
):
    db_est = (
        db.query(Usuario)
        .filter(Usuario.id == estudiante_id, Usuario.rol == "estudiante")
        .first()
    )
    if not db_est:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    db.delete(db_est)
    db.commit()
    return None


@router.get("/{estudiante_id}/materias", response_model=List[MateriaEstudianteResponse])
def obtener_materias_estudiante(
    estudiante_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role("admin")),
):
    estudiante = db.query(Usuario).filter(Usuario.id == estudiante_id).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    materias_db = db.query(MateriaEstudiante).filter(
        MateriaEstudiante.estudiante_id == estudiante_id
    ).all()

    return [
        MateriaEstudianteResponse(
            id=m.id,
            estudiante_id=m.estudiante_id,
            asignatura_id=m.asignatura_id,
            estado=m.estado,
            calificacion=m.calificacion,
            asignatura_nombre=m.asignatura.nombre if m.asignatura else None,
            asignatura_codigo=m.asignatura.codigo_uccd if m.asignatura else None,
        )
        for m in materias_db
    ]


@router.post("/{estudiante_id}/materias", response_model=MateriaEstudianteResponse, status_code=status.HTTP_201_CREATED)
def asignar_materia_estudiante(
    estudiante_id: int,
    materia: MateriaEstudianteCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role("admin")),
):
    estudiante = db.query(Usuario).filter(Usuario.id == estudiante_id).first()
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    asignatura = db.query(Asignatura).filter(Asignatura.id == materia.asignatura_id).first()
    if not asignatura:
        raise HTTPException(status_code=404, detail="Asignatura no encontrada")

    existing = (
        db.query(MateriaEstudiante)
        .filter(
            MateriaEstudiante.estudiante_id == estudiante_id,
            MateriaEstudiante.asignatura_id == materia.asignatura_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="El estudiante ya tiene esta materia asignada")

    nueva = MateriaEstudiante(
        estudiante_id=estudiante_id,
        asignatura_id=materia.asignatura_id,
        estado=materia.estado,
        calificacion=materia.calificacion,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)

    return MateriaEstudianteResponse(
        id=nueva.id,
        estudiante_id=nueva.estudiante_id,
        asignatura_id=nueva.asignatura_id,
        estado=nueva.estado,
        calificacion=nueva.calificacion,
        asignatura_nombre=asignatura.nombre,
        asignatura_codigo=asignatura.codigo_uccd,
    )


@router.delete("/{estudiante_id}/materias/{materia_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_materia_estudiante(
    estudiante_id: int,
    materia_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_role("admin")),
):
    materia = (
        db.query(MateriaEstudiante)
        .filter(
            MateriaEstudiante.id == materia_id,
            MateriaEstudiante.estudiante_id == estudiante_id,
        )
        .first()
    )
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada para este estudiante")

    db.delete(materia)
    db.commit()
    return None
