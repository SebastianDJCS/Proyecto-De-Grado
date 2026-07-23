"""
Script de prueba para el motor de optimización de horarios.

Permite probar la funcionalidad del solver de manera independiente
sin necesidad de ejecutar la aplicación FastAPI completa.

Uso:
    python -m app.solver.test
"""

import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import (
    Asignatura,
    Docente,
    DisponibilidadDocente,
    GrupoProyectado,
    Salon,
)
from app.solver.engine import resolver_horarios_uctp

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def crear_datos_prueba(db: Session) -> None:
    """
    Crea datos de prueba en la BD para demostración.

    Crea:
    - 3 Docentes con disponibilidades
    - 4 Salones
    - 2 Asignaturas
    - 4 Grupos Proyectados

    Args:
        db: Sesión de SQLAlchemy
    """
    logger.info("Creando datos de prueba...")

    # Limpiar datos anteriores
    db.query(GrupoProyectado).delete()
    db.query(Asignatura).delete()
    db.query(DisponibilidadDocente).delete()
    db.query(Docente).delete()
    db.query(Salon).delete()

    # 1. Crear Docentes
    docentes = [
        Docente(
            documento="1001",
            nombre="Dr. Juan García",
            horas_maximas=20,
        ),
        Docente(
            documento="1002",
            nombre="Dra. María López",
            horas_maximas=18,
        ),
        Docente(
            documento="1003",
            nombre="Ing. Carlos Rodríguez",
            horas_maximas=16,
        ),
    ]
    db.add_all(docentes)
    db.flush()
    logger.info(f"✓ Creados {len(docentes)} docentes")

    # 2. Crear Disponibilidades para Docentes
    disponibilidades = [
        # Docente 1: Lunes-Miércoles-Viernes
        DisponibilidadDocente(docente_id=docentes[0].id, dia="Lunes", bloque_horario="08:00-10:00"),
        DisponibilidadDocente(docente_id=docentes[0].id, dia="Lunes", bloque_horario="10:00-12:00"),
        DisponibilidadDocente(docente_id=docentes[0].id, dia="Miércoles", bloque_horario="08:00-10:00"),
        DisponibilidadDocente(docente_id=docentes[0].id, dia="Miércoles", bloque_horario="10:00-12:00"),
        DisponibilidadDocente(docente_id=docentes[0].id, dia="Viernes", bloque_horario="14:00-16:00"),
        # Docente 2: Martes-Jueves
        DisponibilidadDocente(docente_id=docentes[1].id, dia="Martes", bloque_horario="08:00-10:00"),
        DisponibilidadDocente(docente_id=docentes[1].id, dia="Martes", bloque_horario="14:00-16:00"),
        DisponibilidadDocente(docente_id=docentes[1].id, dia="Jueves", bloque_horario="08:00-10:00"),
        DisponibilidadDocente(docente_id=docentes[1].id, dia="Jueves", bloque_horario="16:00-18:00"),
        # Docente 3: Lunes-Martes-Jueves
        DisponibilidadDocente(docente_id=docentes[2].id, dia="Lunes", bloque_horario="14:00-16:00"),
        DisponibilidadDocente(docente_id=docentes[2].id, dia="Martes", bloque_horario="10:00-12:00"),
        DisponibilidadDocente(docente_id=docentes[2].id, dia="Jueves", bloque_horario="14:00-16:00"),
    ]
    db.add_all(disponibilidades)
    db.flush()
    logger.info(f"✓ Creadas {len(disponibilidades)} disponibilidades")

    # 3. Crear Salones
    salones = [
        Salon(bloque="A", nomenclatura="A-101", capacidad=30),
        Salon(bloque="A", nomenclatura="A-102", capacidad=40),
        Salon(bloque="B", nomenclatura="B-201", capacidad=25),
        Salon(bloque="B", nomenclatura="B-202", capacidad=50),
    ]
    db.add_all(salones)
    db.flush()
    logger.info(f"✓ Creados {len(salones)} salones")

    # 4. Crear Asignaturas
    asignaturas = [
        Asignatura(
            codigo_uccd="MAT-101",
            nombre="Cálculo I",
            semestre=1,
            creditos=4,
            horas_semanales=4,  # 2 bloques
        ),
        Asignatura(
            codigo_uccd="FIS-102",
            nombre="Física I",
            semestre=1,
            creditos=3,
            horas_semanales=4,  # 2 bloques
        ),
    ]
    db.add_all(asignaturas)
    db.flush()
    logger.info(f"✓ Creadas {len(asignaturas)} asignaturas")

    # 5. Crear Grupos Proyectados
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
            asignatura_id=asignaturas[1].id,
            numero_grupo=2,
            total_inscritos=42,
            total_repitentes=8,
            total_estudiantes=50,
        ),
    ]
    db.add_all(grupos)
    db.commit()
    logger.info(f"✓ Creados {len(grupos)} grupos proyectados")


def demostrar_optimizacion() -> None:
    """Ejecuta el optimizer con datos de prueba y muestra resultados."""

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
            logger.info("  Los horarios han sido guardados en la tabla 'horarios_optimizados'")
        else:
            logger.warning("✗ No se encontró una solución válida")

    except Exception as e:
        logger.exception(f"Error durante la demostración: {e}")

    finally:
        db.close()


if __name__ == "__main__":
    demostrar_optimizacion()
