import pandas as pd
from typing import Dict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Docente, Salon, Asignatura, GrupoProyectado


def _clean_string(value):
	if pd.isna(value):
		return ""
	if isinstance(value, str):
		return value.strip()
	return str(value).strip()


def procesar_excel_uxxi(file_path: str, db: Session) -> Dict[str, object]:
	"""Procesa un Excel exportado de UXXI e inserta/actualiza registros en la BD.

	Se espera que las columnas del Excel contengan (nombres flexibles, mayúsc/minúsc):
	- docente_documento, docente_nombre, docente_horas_maximas
	- salon_bloque, salon_nomenclatura, salon_capacidad
	- codigo_asignatura, nombre_asignatura, semestre, creditos, horas_semanales
	- numero_grupo, total_inscritos, total_repitentes, total_estudiantes

	La función intenta normalizar nombres de columnas en minúsculas y con guiones bajos.
	"""

	resumen = {
		"status": "error",
		"docentes_creados": 0,
		"docentes_actualizados": 0,
		"salones_creados": 0,
		"salones_actualizados": 0,
		"asignaturas_creadas": 0,
		"asignaturas_actualizadas": 0,
		"grupos_creados": 0,
		"grupos_actualizados": 0,
	}

	try:
		sheets = pd.read_excel(file_path, sheet_name=None)
	except Exception as e:
		return {"status": "error", "detail": f"No se pudo leer Excel: {e}"}

	try:
		for sheet_name, df in sheets.items():
			if df.empty:
				continue

			# Normalizar columnas
			df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]

			# Rellenar nulos y limpiar strings
			df = df.fillna("")
			for col in df.columns:
				if df[col].dtype == object:
					df[col] = df[col].map(lambda v: _clean_string(v))

			# Coerce numeric columns if they exist
			num_cols = [
				"docente_horas_maximas",
				"salon_capacidad",
				"semestre",
				"creditos",
				"horas_semanales",
				"numero_grupo",
				"total_inscritos",
				"total_repitentes",
				"total_estudiantes",
			]
			for nc in num_cols:
				if nc in df.columns:
					df[nc] = pd.to_numeric(df[nc], errors="coerce").fillna(0).astype(int)

			# Procesar fila por fila
			for _, row in df.iterrows():
				# Docente
				documento = row.get("docente_documento", "")
				nombre_docente = row.get("docente_nombre", "")
				horas_max = int(row.get("docente_horas_maximas", 0) or 0)

				docente_obj = None
				if documento:
					stmt = select(Docente).filter_by(documento=documento)
					docente_obj = db.execute(stmt).scalars().first()
					if docente_obj:
						# actualizar campos básicos si es necesario
						updated = False
						if nombre_docente and docente_obj.nombre != nombre_docente:
							docente_obj.nombre = nombre_docente
							updated = True
						if horas_max and docente_obj.horas_maximas != horas_max:
							docente_obj.horas_maximas = horas_max
							updated = True
						if updated:
							resumen["docentes_actualizados"] += 1
					else:
						docente_obj = Docente(documento=documento, nombre=nombre_docente or "", horas_maximas=horas_max)
						db.add(docente_obj)
						db.flush()
						resumen["docentes_creados"] += 1

				# Salon
				bloque = row.get("salon_bloque", "")
				nomenclatura = row.get("salon_nomenclatura", "")
				capacidad = int(row.get("salon_capacidad", 0) or 0)

				salon_obj = None
				if nomenclatura:
					# intentar buscar por nomenclatura y bloque para evitar duplicados
					stmt = select(Salon).filter_by(nomenclatura=nomenclatura)
					if bloque:
						stmt = stmt.filter_by(bloque=bloque)
					salon_obj = db.execute(stmt).scalars().first()
					if salon_obj:
						updated = False
						if capacidad and salon_obj.capacidad != capacidad:
							salon_obj.capacidad = capacidad
							updated = True
						if bloque and salon_obj.bloque != bloque:
							salon_obj.bloque = bloque
							updated = True
						if updated:
							resumen["salones_actualizados"] += 1
					else:
						salon_obj = Salon(bloque=bloque or "", nomenclatura=nomenclatura, capacidad=capacidad)
						db.add(salon_obj)
						db.flush()
						resumen["salones_creados"] += 1

				# Asignatura
				codigo = row.get("codigo_asignatura", "") or row.get("codigo_uccd", "")
				nombre_asig = row.get("nombre_asignatura", "") or row.get("nombre", "")
				semestre = int(row.get("semestre", 0) or 0)
				creditos = int(row.get("creditos", 0) or 0)
				horas_semanales = int(row.get("horas_semanales", 0) or 0)

				asignatura_obj = None
				if codigo:
					stmt = select(Asignatura).filter_by(codigo_uccd=codigo)
					asignatura_obj = db.execute(stmt).scalars().first()
					if asignatura_obj:
						updated = False
						if nombre_asig and asignatura_obj.nombre != nombre_asig:
							asignatura_obj.nombre = nombre_asig
							updated = True
						if semestre and asignatura_obj.semestre != semestre:
							asignatura_obj.semestre = semestre
							updated = True
						if creditos and asignatura_obj.creditos != creditos:
							asignatura_obj.creditos = creditos
							updated = True
						if horas_semanales and asignatura_obj.horas_semanales != horas_semanales:
							asignatura_obj.horas_semanales = horas_semanales
							updated = True
						if updated:
							resumen["asignaturas_actualizadas"] += 1
					else:
						asignatura_obj = Asignatura(
							codigo_uccd=codigo,
							nombre=nombre_asig or "",
							semestre=semestre,
							creditos=creditos,
							horas_semanales=horas_semanales,
						)
						db.add(asignatura_obj)
						db.flush()
						resumen["asignaturas_creadas"] += 1

				# Grupo proyectado
				if asignatura_obj is not None:
					numero_grupo = int(row.get("numero_grupo", 0) or 0)
					total_inscritos = int(row.get("total_inscritos", 0) or 0)
					total_repitentes = int(row.get("total_repitentes", 0) or 0)
					total_estudiantes = int(row.get("total_estudiantes", 0) or 0)

					if numero_grupo:
						stmt = select(GrupoProyectado).filter_by(asignatura_id=asignatura_obj.id, numero_grupo=numero_grupo)
						grupo_obj = db.execute(stmt).scalars().first()
						if grupo_obj:
							updated = False
							if grupo_obj.total_inscritos != total_inscritos:
								grupo_obj.total_inscritos = total_inscritos
								updated = True
							if grupo_obj.total_repitentes != total_repitentes:
								grupo_obj.total_repitentes = total_repitentes
								updated = True
							if grupo_obj.total_estudiantes != total_estudiantes:
								grupo_obj.total_estudiantes = total_estudiantes
								updated = True
							if updated:
								resumen["grupos_actualizados"] += 1
						else:
							grupo_obj = GrupoProyectado(
								asignatura_id=asignatura_obj.id,
								numero_grupo=numero_grupo,
								total_inscritos=total_inscritos,
								total_repitentes=total_repitentes,
								total_estudiantes=total_estudiantes,
							)
							db.add(grupo_obj)
							db.flush()
							resumen["grupos_creados"] += 1

		db.commit()
		resumen["status"] = "ok"
		return resumen

	except Exception as exc:  # pragma: no cover - bubble up
		try:
			db.rollback()
		except Exception:
			pass
		return {"status": "error", "detail": str(exc)}

