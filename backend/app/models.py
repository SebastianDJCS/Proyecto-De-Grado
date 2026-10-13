from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Table, false, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
	pass


# Relación N:M entre docentes y materias (qué docente puede dictar qué materia).
# Un docente SIN materias asignadas NO puede dictar ninguna materia.
asignatura_docente = Table(
	"asignatura_docente",
	Base.metadata,
	Column(
		"asignatura_id",
		ForeignKey("asignaturas.id", ondelete="CASCADE"),
		primary_key=True,
	),
	Column(
		"docente_id",
		ForeignKey("docentes.id", ondelete="CASCADE"),
		primary_key=True,
	),
)


class Docente(Base):
    __tablename__ = "docentes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    documento: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    nombre: Mapped[str] = mapped_column(String(255), nullable=False)
    horas_maximas: Mapped[int] = mapped_column(Integer, nullable=False)
    # ➕ Agregamos horas administrativas con valor por defecto en 0
    horas_administrativas: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    disponibilidades: Mapped[list["DisponibilidadDocente"]] = relationship(
        back_populates="docente",
        cascade="all, delete-orphan",
    )
    horarios_optimizados: Mapped[list["HorarioOptimizado"]] = relationship(
        back_populates="docente",
        cascade="all, delete-orphan",
    )
    # Materias que puede dictar (vacío = no puede dictar ninguna)
    asignaturas: Mapped[list["Asignatura"]] = relationship(
        secondary="asignatura_docente",
        back_populates="docentes",
    )

    @property
    def asignatura_ids(self) -> list[int]:
        return [asignatura.id for asignatura in self.asignaturas]

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
        return f"Aula {self.nomenclatura} - Bloque {self.sede}"


class Asignatura(Base):
	__tablename__ = "asignaturas"

	id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
	codigo_uccd: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
	nombre: Mapped[str] = mapped_column(String(255), nullable=False)
	semestre: Mapped[int] = mapped_column(Integer, nullable=False)
	creditos: Mapped[int] = mapped_column(Integer, nullable=False)
	horas_semanales: Mapped[int] = mapped_column(Integer, nullable=False)
	# Marca si el estudiante puede seleccionarla en "Mi Horario"
	seleccionable: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=false(), default=False)
	# Fundamental o Electiva (regla de desempate en conflictos del estudiante)
	tipo: Mapped[str] = mapped_column(String(20), nullable=False, server_default="FUNDAMENTAL", default="FUNDAMENTAL")
	# Sesiones semanales que tiene cada grupo de esta materia
	secciones_por_grupo: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1", default=1)
	# Duración (en horas) de cada sección/sesión: 1, 2 o 3
	horas_por_seccion: Mapped[int] = mapped_column(Integer, nullable=False, server_default="2", default=2)

	grupos_proyectados: Mapped[list["GrupoProyectado"]] = relationship(
		back_populates="asignatura",
		cascade="all, delete-orphan",
	)
	# Docentes autorizados para dictar esta materia (vacío = ningún docente)
	docentes: Mapped[list["Docente"]] = relationship(
		secondary="asignatura_docente",
		back_populates="asignaturas",
	)

	@property
	def secciones(self) -> int:
		return len(self.grupos_proyectados)


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
	grupo_proyectado_id: Mapped[int | None] = mapped_column(
		ForeignKey("grupos_proyectados.id", ondelete="CASCADE"),
		nullable=True,
		index=True,
	)
	docente_id: Mapped[int] = mapped_column(ForeignKey("docentes.id", ondelete="CASCADE"), nullable=False, index=True)
	salon_id: Mapped[int | None] = mapped_column(ForeignKey("salones.id", ondelete="CASCADE"), nullable=True, index=True)
	dia: Mapped[str] = mapped_column(String(20), nullable=False)
	bloque_horario: Mapped[str] = mapped_column(String(20), nullable=False)
	tipo_actividad: Mapped[str] = mapped_column(String(20), nullable=False, default="CLASE")
	fecha_generacion: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

	grupo_proyectado: Mapped[GrupoProyectado | None] = relationship(back_populates="horarios_optimizados")
	docente: Mapped[Docente] = relationship(back_populates="horarios_optimizados")
	salon: Mapped[Salon | None] = relationship(back_populates="horarios_optimizados")


class Usuario(Base):
	__tablename__ = "usuarios"

	id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
	username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
	password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
	nombre: Mapped[str] = mapped_column(String(255), nullable=False, server_default="")
	rol: Mapped[str] = mapped_column(String(20), nullable=False, server_default="admin", default="admin")
	activo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true", default=True)


__all__ = [
	"Base",
	"Docente",
	"DisponibilidadDocente",
	"Salon",
	"Asignatura",
	"GrupoProyectado",
	"HorarioOptimizado",
	"Usuario",
	"asignatura_docente",
]
