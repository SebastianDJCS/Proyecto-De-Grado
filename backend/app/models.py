from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
	pass


class Docente(Base):
	__tablename__ = "docentes"

	id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
	documento: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
	nombre: Mapped[str] = mapped_column(String(255), nullable=False)
	horas_maximas: Mapped[int] = mapped_column(Integer, nullable=False)

	disponibilidades: Mapped[list["DisponibilidadDocente"]] = relationship(
		back_populates="docente",
		cascade="all, delete-orphan",
	)
	horarios_optimizados: Mapped[list["HorarioOptimizado"]] = relationship(
		back_populates="docente",
		cascade="all, delete-orphan",
	)


class DisponibilidadDocente(Base):
	__tablename__ = "disponibilidades_docentes"

	id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
	docente_id: Mapped[int] = mapped_column(ForeignKey("docentes.id", ondelete="CASCADE"), nullable=False, index=True)
	dia: Mapped[str] = mapped_column(String(20), nullable=False)
	bloque_horario: Mapped[str] = mapped_column(String(20), nullable=False)

	docente: Mapped[Docente] = relationship(back_populates="disponibilidades")

class Salon(Base):
    __tablename__ = "salones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sede: Mapped[str] = mapped_column(String(50), nullable=False)
    nomenclatura: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    nombre: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tipo: Mapped[str] = mapped_column(String(30), nullable=False, server_default="AULA")
    capacidad: Mapped[int] = mapped_column(Integer, nullable=False)

    horarios_optimizados: Mapped[list["HorarioOptimizado"]] = relationship(
        back_populates="salon",
        cascade="all, delete-orphan",
    )

    @property
    def etiqueta_visual(self) -> str:
        if self.nombre:
            return f"{self.tipo.capitalize()} {self.nombre} ({self.nomenclatura})"
        return f"Aula {self.nomenclatura} - Bloque {self.bloque}"


class Asignatura(Base):
	__tablename__ = "asignaturas"

	id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
	codigo_uccd: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
	nombre: Mapped[str] = mapped_column(String(255), nullable=False)
	semestre: Mapped[int] = mapped_column(Integer, nullable=False)
	creditos: Mapped[int] = mapped_column(Integer, nullable=False)
	horas_semanales: Mapped[int] = mapped_column(Integer, nullable=False)

	grupos_proyectados: Mapped[list["GrupoProyectado"]] = relationship(
		back_populates="asignatura",
		cascade="all, delete-orphan",
	)


class GrupoProyectado(Base):
	__tablename__ = "grupos_proyectados"

	id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
	asignatura_id: Mapped[int] = mapped_column(ForeignKey("asignaturas.id", ondelete="CASCADE"), nullable=False, index=True)
	numero_grupo: Mapped[int] = mapped_column(Integer, nullable=False)
	total_inscritos: Mapped[int] = mapped_column(Integer, nullable=False)
	total_repitentes: Mapped[int] = mapped_column(Integer, nullable=False)
	total_estudiantes: Mapped[int] = mapped_column(Integer, nullable=False)

	asignatura: Mapped[Asignatura] = relationship(back_populates="grupos_proyectados")
	horarios_optimizados: Mapped[list["HorarioOptimizado"]] = relationship(
		back_populates="grupo_proyectado",
		cascade="all, delete-orphan",
	)


class HorarioOptimizado(Base):
	__tablename__ = "horarios_optimizados"

	id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
	grupo_proyectado_id: Mapped[int] = mapped_column(
		ForeignKey("grupos_proyectados.id", ondelete="CASCADE"),
		nullable=False,
		index=True,
	)
	docente_id: Mapped[int] = mapped_column(ForeignKey("docentes.id", ondelete="CASCADE"), nullable=False, index=True)
	salon_id: Mapped[int] = mapped_column(ForeignKey("salones.id", ondelete="CASCADE"), nullable=False, index=True)
	dia: Mapped[str] = mapped_column(String(20), nullable=False)
	bloque_horario: Mapped[str] = mapped_column(String(20), nullable=False)
	fecha_generacion: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

	grupo_proyectado: Mapped[GrupoProyectado] = relationship(back_populates="horarios_optimizados")
	docente: Mapped[Docente] = relationship(back_populates="horarios_optimizados")
	salon: Mapped[Salon] = relationship(back_populates="horarios_optimizados")


__all__ = [
	"Base",
	"Docente",
	"DisponibilidadDocente",
	"Salon",
	"Asignatura",
	"GrupoProyectado",
	"HorarioOptimizado",
]
