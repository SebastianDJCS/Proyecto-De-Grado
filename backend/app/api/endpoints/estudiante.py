"""Endpoints para que un estudiante arme su horario a partir de la oferta."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.database import get_db
from app.deps import get_current_estudiante, get_current_usuario
from app.models import Asignatura, GrupoProyectado, HorarioOptimizado, Usuario
from app.schemas.estudiante import (
    AsignaturaSeleccionableItem,
    CatalogoMateriaItem,
    ConfigEstudiante,
    HorarioEstudianteResponse,
    MateriaReprobadaItem,
    PerfilEstudianteResponse,
    PerfilEstudianteUpdate,
    SeleccionHorarioRequest,
)
from app.solver.estudiante import seleccionar_horario_estudiante

router = APIRouter(prefix="/estudiante", tags=["Estudiante"])


def _perfil_response(usuario: Usuario) -> PerfilEstudianteResponse:
    return PerfilEstudianteResponse(
        id=usuario.id,
        email=usuario.username,
        semestre=usuario.semestre,
        materias_reprobadas=[
            MateriaReprobadaItem(
                id=asignatura.id,
                codigo_uccd=asignatura.codigo_uccd,
                nombre=asignatura.nombre,
                semestre=asignatura.semestre,
            )
            for asignatura in usuario.materias_reprobadas
        ],
    )


@router.get("/config", response_model=ConfigEstudiante)
def obtener_config_estudiante():
    """Reglas de selección para el estudiante (tope de créditos)."""
    return ConfigEstudiante(max_creditos=get_settings().MAX_CREDITOS)


@router.get("/perfil", response_model=PerfilEstudianteResponse)
def obtener_perfil(usuario: Usuario = Depends(get_current_usuario)):
    """Perfil del estudiante autenticado (correo, semestre y reprobadas)."""
    return _perfil_response(usuario)


@router.put("/perfil", response_model=PerfilEstudianteResponse)
def actualizar_perfil(
    datos: PerfilEstudianteUpdate,
    usuario: Usuario = Depends(get_current_estudiante),
    db: Session = Depends(get_db),
):
    """Actualiza el semestre y las materias reprobadas del estudiante."""
    ids = list(dict.fromkeys(datos.materias_reprobadas))
    asignaturas = (
        db.query(Asignatura).filter(Asignatura.id.in_(ids)).all() if ids else []
    )

    encontradas = {asignatura.id for asignatura in asignaturas}
    faltantes = [i for i in ids if i not in encontradas]
    if faltantes:
        raise HTTPException(
            status_code=400,
            detail=f"Asignaturas no encontradas: {faltantes}",
        )

    invalidas = [
        asignatura.nombre
        for asignatura in asignaturas
        if asignatura.semestre >= datos.semestre
    ]
    if invalidas:
        raise HTTPException(
            status_code=400,
            detail=(
                "Solo puedes marcar materias de semestres anteriores al tuyo: "
                + ", ".join(invalidas)
            ),
        )

    usuario.semestre = datos.semestre
    usuario.materias_reprobadas = asignaturas
    db.commit()
    db.refresh(usuario)
    return _perfil_response(usuario)


@router.get("/catalogo", response_model=List[CatalogoMateriaItem])
def listar_catalogo_anterior(
    antes_de: int = Query(..., ge=1, le=10),
    usuario: Usuario = Depends(get_current_usuario),
    db: Session = Depends(get_db),
):
    """Materias de semestres anteriores, para marcar las que se repiten."""
    asignaturas = (
        db.query(Asignatura)
        .filter(Asignatura.semestre < antes_de)
        .order_by(Asignatura.semestre, Asignatura.nombre)
        .all()
    )
    return [
        CatalogoMateriaItem(
            id=asignatura.id,
            codigo_uccd=asignatura.codigo_uccd,
            nombre=asignatura.nombre,
            semestre=asignatura.semestre,
        )
        for asignatura in asignaturas
    ]


@router.get("/asignaturas", response_model=List[AsignaturaSeleccionableItem])
def listar_asignaturas_seleccionables(
    semestre: Optional[int] = Query(default=None, ge=1, le=10),
    usuario: Usuario = Depends(get_current_usuario),
    db: Session = Depends(get_db),
):
    """Oferta del semestre actual más las materias que el estudiante repite."""
    reprobadas_ids = set(usuario.materia_reprobada_ids)

    query = db.query(Asignatura).options(joinedload(Asignatura.prerequisitos))
    if semestre is not None:
        query = query.filter(
            or_(
                and_(
                    Asignatura.seleccionable.is_(True),
                    Asignatura.semestre == semestre,
                ),
                Asignatura.id.in_(reprobadas_ids),
            )
        )
    else:
        query = query.filter(
            or_(
                Asignatura.seleccionable.is_(True),
                Asignatura.id.in_(reprobadas_ids),
            )
        )

    asignaturas = query.order_by(Asignatura.semestre, Asignatura.nombre).all()
    ids = [asignatura.id for asignatura in asignaturas]

    # 2 consultas agregadas en lugar de N+1 (evita ~134 queries a la BD remota).
    grupos_por_asig: dict[int, int] = {}
    programados_por_asig: dict[int, int] = {}
    if ids:
        grupos_por_asig = dict(
            db.query(GrupoProyectado.asignatura_id, func.count(GrupoProyectado.id))
            .filter(GrupoProyectado.asignatura_id.in_(ids))
            .group_by(GrupoProyectado.asignatura_id)
            .all()
        )
        programados_por_asig = dict(
            db.query(
                GrupoProyectado.asignatura_id,
                func.count(func.distinct(HorarioOptimizado.grupo_proyectado_id)),
            )
            .join(
                HorarioOptimizado,
                HorarioOptimizado.grupo_proyectado_id == GrupoProyectado.id,
            )
            .filter(
                GrupoProyectado.asignatura_id.in_(ids),
                HorarioOptimizado.tipo_actividad == "CLASE",
            )
            .group_by(GrupoProyectado.asignatura_id)
            .all()
        )

    resultado = []
    for asignatura in asignaturas:
        prerequisitos = list(asignatura.prerequisitos)
        prerequisitos_reprobados = [
            p for p in prerequisitos if p.id in reprobadas_ids
        ]
        es_reprobada = asignatura.id in reprobadas_ids
        bloqueada = bool(prerequisitos_reprobados) and not es_reprobada

        motivo = None
        if bloqueada:
            nombres = ", ".join(p.nombre for p in prerequisitos_reprobados)
            motivo = f"Requiere {nombres}, que reprobaste"

        resultado.append(
            AsignaturaSeleccionableItem(
                id=asignatura.id,
                codigo_uccd=asignatura.codigo_uccd,
                nombre=asignatura.nombre,
                semestre=asignatura.semestre,
                creditos=asignatura.creditos,
                grupos=grupos_por_asig.get(asignatura.id, 0),
                grupos_programados=programados_por_asig.get(asignatura.id, 0),
                tipo=getattr(asignatura, "tipo", None) or "FUNDAMENTAL",
                es_reprobada=es_reprobada,
                bloqueada=bloqueada,
                motivo_bloqueo=motivo,
                prerequisitos=[p.nombre for p in prerequisitos],
            )
        )
    return resultado


@router.post("/horario", response_model=HorarioEstudianteResponse)
def generar_horario_estudiante(
    request: SeleccionHorarioRequest,
    usuario: Usuario = Depends(get_current_usuario),
    db: Session = Depends(get_db),
):
    """Genera la mejor combinación de secciones para las materias elegidas."""
    settings = get_settings()
    ids = list(dict.fromkeys(request.asignatura_ids))
    reprobadas_ids = set(usuario.materia_reprobada_ids)

    asignaturas = db.query(Asignatura).filter(Asignatura.id.in_(ids)).all()
    encontradas = {a.id for a in asignaturas}

    faltantes = [i for i in ids if i not in encontradas]
    if faltantes:
        raise HTTPException(status_code=400, detail=f"Asignaturas no encontradas: {faltantes}")

    bloqueadas = []
    for asignatura in asignaturas:
        if asignatura.id in reprobadas_ids:
            continue
        prerequisitos_reprobados = [
            p.nombre for p in asignatura.prerequisitos if p.id in reprobadas_ids
        ]
        if prerequisitos_reprobados:
            bloqueadas.append(
                f"{asignatura.nombre} (requiere {', '.join(prerequisitos_reprobados)})"
            )
    if bloqueadas:
        raise HTTPException(
            status_code=400,
            detail=(
                "No puedes seleccionar materias cuyos prerrequisitos reprobaste: "
                + "; ".join(bloqueadas)
            ),
        )

    no_habilitadas = [
        asignatura.nombre
        for asignatura in asignaturas
        if not asignatura.seleccionable and asignatura.id not in reprobadas_ids
    ]
    if no_habilitadas:
        raise HTTPException(
            status_code=400,
            detail=(
                "Estas materias no están habilitadas para selección: "
                + ", ".join(no_habilitadas)
            ),
        )

    if usuario.rol == "estudiante" and usuario.semestre is not None:
        fuera_semestre = [
            asignatura.nombre
            for asignatura in asignaturas
            if asignatura.semestre != usuario.semestre
            and asignatura.id not in reprobadas_ids
        ]
        if fuera_semestre:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Solo puedes elegir materias de tu semestre "
                    f"({usuario.semestre}) o materias que repites: "
                    + ", ".join(fuera_semestre)
                ),
            )

    total_creditos = sum(a.creditos for a in asignaturas)
    if total_creditos > settings.MAX_CREDITOS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Excedes el límite de {settings.MAX_CREDITOS} créditos "
                f"(seleccionaste {total_creditos})."
            ),
        )

    try:
        data = seleccionar_horario_estudiante(db, ids)
    except Exception as e:  # pragma: no cover - error inesperado
        raise HTTPException(status_code=500, detail=f"Error al generar el horario: {str(e)}")

    data["creditos_totales"] = total_creditos
    data["max_creditos"] = settings.MAX_CREDITOS
    return data
