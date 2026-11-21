"""
Script de prueba para el motor de optimización de horarios.

Permite probar la funcionalidad del solver de manera independiente
sin necesidad de ejecutar la aplicación FastAPI completa.

Usa una base de datos SQLite EN MEMORIA: no toca los datos reales del
proyecto. Al terminar se muestra la malla resultante y se verifican las
reglas Horarias vigentes:

- Ninguna clase inicia antes de las 07:15.
- Los semestres 1 a 5 dictan en jornada diurna (inicio antes de las 18:00).
- Los semestres 6 en adelante dictan en jornada nocturna (18:00 - 21:45).

Uso:
    python -m app.solver.test
"""
from app.models import Base

import logging
from datetime import datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.models import (
    Asignatura,
    Docente,
    DisponibilidadDocente,
    GrupoProyectado,
    HorarioOptimizado,
    Salon,
)
from app.solver.engine import resolver_horarios_uctp

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

DIAS_ORDEN = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]


def _minutos(hora: str) -> int:
    """'HH:MM' -> minutos desde las 00:00."""
    h, m = hora.split(":")
    return int(h) * 60 + int(m)


def crear_datos_prueba(db: Session) -> None:
    """
    Crea datos de prueba en la BD en memoria para demostración.

    Crea:
    - 3 Docentes con disponibilidades (uno diurno, uno nocturno y uno mixto)
    - 4 Salones
    - 4 Asignaturas (2 de semestres 1-5, 1 de semestre 6 y 1 de semestre 7)
    - 5 Grupos Proyectados
    """
    logger.info("Creando datos de prueba...")

    # 1. Docentes
    docentes = [
        Docente(
            documento="1001",
            nombre="Dr. Juan García",
            horas_maximas=20,
            horas_administrativas=2,
        ),
        Docente(
            documento="1002",
            nombre="Dra. María López",
            horas_maximas=18,
            horas_administrativas=0,
        ),
        Docente(
            documento="1003",
            nombre="Ing. Carlos Rodríguez",
            horas_maximas=16,
            horas_administrativas=0,
        ),
    ]
    db.add_all(docentes)
    db.flush()
    logger.info(f"✓ Creados {len(docentes)} docentes")

    # 2. Disponibilidades
    disponibilidad_dia = [
        (docentes[0].id, "Lunes", "07:15-12:00"),
        (docentes[0].id, "Lunes", "14:00-18:00"),
        (docentes[0].id, "Martes", "07:15-12:00"),
        (docentes[0].id, "Martes", "14:00-18:00"),
        (docentes[0].id, "Miércoles", "07:15-12:00"),
        (docentes[0].id, "Miércoles", "14:00-18:00"),
        (docentes[0].id, "Jueves", "07:15-12:00"),
        (docentes[0].id, "Jueves", "14:00-18:00"),
        (docentes[0].id, "Viernes", "07:15-12:00"),
        (docentes[0].id, "Viernes", "14:00-18:00"),
        # Docente 2: jornada nocturna (6:00 pm - 9:45 pm)
        (docentes[1].id, "Lunes", "18:00-21:45"),
        (docentes[1].id, "Martes", "18:00-21:45"),
        (docentes[1].id, "Miércoles", "18:00-21:45"),
        (docentes[1].id, "Jueves", "18:00-21:45"),
        (docentes[1].id, "Viernes", "18:00-21:45"),
        # Docente 3: solo mañana (sin disponibilidad nocturna)
        (docentes[2].id, "Lunes", "07:15-12:00"),
        (docentes[2].id, "Martes", "07:15-12:00"),
        (docentes[2].id, "Jueves", "14:00-18:00"),
    ]
    db.add_all(
        [
            DisponibilidadDocente(docente_id=docente_id, dia=dia, bloque_horario=bloque)
            for docente_id, dia, bloque in disponibilidad_dia
        ]
    )
    db.flush()
    logger.info(f"✓ Creadas {len(disponibilidad_dia)} disponibilidades")

    # 3. Salones
    salones = [
        Salon(sede="A", nomenclatura="A-101", capacidad=30),
        Salon(sede="A", nomenclatura="A-102", capacidad=40),
        Salon(sede="B", nomenclatura="B-201", capacidad=25),
        Salon(sede="B", nomenclatura="B-202", capacidad=50),
    ]
    db.add_all(salones)
    db.flush()
    logger.info(f"✓ Creados {len(salones)} salones")

    # 4. Asignaturas
    asignaturas = [
        Asignatura(
            codigo_uccd="MAT-101",
            nombre="Cálculo I",
            semestre=1,
            creditos=4,
            horas_semanales=4,  # 2 bloques
            horas_por_seccion=2,
            secciones_por_grupo=2,
        ),
        Asignatura(
            codigo_uccd="FIS-102",
            nombre="Física I",
            semestre=1,
            creditos=3,
            horas_semanales=4,
            horas_por_seccion=2,
            secciones_por_grupo=2,
        ),
        Asignatura(
            codigo_uccd="MAT-206",
            nombre="Álgebra Lineal",
            semestre=6,  # Jornada nocturna (6:00 pm - 9:45 pm)
            creditos=4,
            horas_semanales=4,
            horas_por_seccion=2,
            secciones_por_grupo=2,
        ),
        Asignatura(
            codigo_uccd="MAT-207",
            nombre="Cálculo Vectorial",
            semestre=7,  # Sin disponibilidad nocturna: quedará sin horario
            creditos=4,
            horas_semanales=4,
            horas_por_seccion=2,
            secciones_por_grupo=2,
        ),
    ]
    db.add_all(asignaturas)
    db.flush()
    logger.info(f"✓ Creadas {len(asignaturas)} asignaturas")

    # 5. Grupos Proyectados
    grupos = [
        GrupoProyectado(
            asignatura_id=asignaturas[0].id,
            numero_grupo=1,
            total_inscritos=28,
            total_repitentes=2,
            total_estudiantes=30,
        ),
        GrupoProyectado(
            asignatura_id=asignaturas[0].id,
            numero_grupo=2,
            total_inscritos=35,
            total_repitentes=5,
            total_estudiantes=40,
        ),
        GrupoProyectado(
            asignatura_id=asignaturas[1].id,
            numero_grupo=1,
            total_inscritos=20,
            total_repitentes=3,
            total_estudiantes=23,
        ),
        GrupoProyectado(
            asignatura_id=asignaturas[2].id,
            numero_grupo=1,
            total_inscritos=25,
            total_repitentes=0,
            total_estudiantes=25,
        ),
        GrupoProyectado(
            asignatura_id=asignaturas[3].id,
            numero_grupo=1,
            total_inscritos=25,
            total_repitentes=0,
            total_estudiantes=25,
        ),
    ]
    db.add_all(grupos)
    db.flush()
    logger.info(f"✓ Creados {len(grupos)} grupos proyectados")

    # 6. Docentes autorizados por materia
    asignaturas[0].docentes.append(docentes[0])
    asignaturas[1].docentes.append(docentes[0])
    asignaturas[1].docentes.append(docentes[2])
    asignaturas[2].docentes.append(docentes[1])
    asignaturas[3].docentes.append(docentes[2])

    db.commit()


def mostrar_malla(db: Session) -> None:
    """Imprime la malla generada agrupada por día."""
    filas = db.query(HorarioOptimizado).all()
    print("\n" + "=" * 78)
    print("MALLA HORARIA GENERADA")
    print("=" * 78)
    for dia in DIAS_ORDEN:
        del_dia = sorted(
            (f for f in filas if f.dia == dia),
            key=lambda f: f.bloque_horario,
        )
        if not del_dia:
            continue
        print(f"\n{dia}")
        for f in del_dia:
            materia = (
                f.grupo_proyectado.asignatura.nombre
                if f.grupo_proyectado
                else "ADMINISTRATIVA"
            )
            docente = f.docente.nombre if f.docente else "N/A"
            salon = f.salon.nomenclatura if f.salon else "-"
            print(f"  {f.bloque_horario}  {materia:20s} {docente:22s} {salon}")


def verificar_reglas(db: Session) -> bool:
    """Verifica las reglas horarias vigentes sobre la malla generada."""
    filas = db.query(HorarioOptimizado).all()
    clases = [f for f in filas if f.tipo_actividad == "CLASE"]
    fallos = []

    for f in clases:
        inicio, _, fin = f.bloque_horario.partition("-")
        minuto_ini = _minutos(inicio)
        minuto_fin = _minutos(fin)
        semestre = f.grupo_proyectado.asignatura.semestre

        if minuto_ini < 7 * 60 + 15:
            fallos.append(
                f"{f.bloque_horario} inicia antes de las 07:15 "
                f"({f.grupo_proyectado.asignatura.nombre})"
            )
        if semestre >= 6:
            if minuto_ini < 18 * 60:
                fallos.append(
                    f"{f.bloque_horario} de {f.grupo_proyectado.asignatura.nombre} "
                    f"(semestre {semestre}) inicia antes de las 18:00"
                )
            if minuto_fin > 21 * 60 + 45:
                fallos.append(
                    f"{f.bloque_horario} de {f.grupo_proyectado.asignatura.nombre} "
                    f"(semestre {semestre}) termina después de las 21:45"
                )
        elif minuto_ini >= 18 * 60:
            fallos.append(
                f"{f.bloque_horario} de {f.grupo_proyectado.asignatura.nombre} "
                f"(semestre {semestre}) inicia en jornada nocturna"
            )

    print("\n" + "=" * 78)
    print("VERIFICACIÓN DE REGLAS HORARIAS")
    print("=" * 78)
    if fallos:
        for fallo in fallos:
            print(f"  [FALLA] {fallo}")
        return False
    print("  [OK] Ninguna clase inicia antes de las 07:15")
    print("  [OK] Semestres 1-5 en jornada diurna")
    print("  [OK] Semestres 6+ en jornada nocturna (18:00 - 21:45)")
    return True


def demostrar_optimizacion() -> None:
    """Ejecuta el optimizer con datos de prueba y muestra resultados."""

    # Base de datos aislada en memoria: no afecta los datos reales.
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Crear datos de prueba
        crear_datos_prueba(db)

        # Ejecutar optimización
        logger.info("\n" + "=" * 70)
        logger.info("INICIANDO OPTIMIZACIÓN DE HORARIOS")
        logger.info("=" * 70 + "\n")

        resultado = resolver_horarios_uctp(db)

        # Mostrar resultados
        logger.info("\n" + "=" * 70)
        logger.info("RESULTADOS")
        logger.info("=" * 70)
        logger.info(f"Status: {resultado.status}")
        logger.info(f"Tiempo de ejecución: {resultado.tiempo_ejecucion:.2f} segundos")
        logger.info(f"Total de asignaciones: {resultado.total_asignaciones}")
        logger.info(f"Grupos asignados: {resultado.grupos_asignados}/{resultado.total_grupos}")
        logger.info(f"Mensaje: {resultado.mensaje}")
        logger.info("=" * 70 + "\n")

        if resultado.status in ("OPTIMAL", "FEASIBLE"):
            logger.info("✓ ¡Optimización exitosa!")
            mostrar_malla(db)
            verificar_reglas(db)
        else:
            logger.warning("✗ No se encontró una solución válida")

    except Exception as e:
        logger.exception(f"Error durante la demostración: {e}")

    finally:
        db.close()


if __name__ == "__main__":
    demostrar_optimizacion()
