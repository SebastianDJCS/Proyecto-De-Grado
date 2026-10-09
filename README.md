# Optimizador de Horarios Universitarios — UCTP (Uninúñez)

Sistema de optimización de horarios (problema UCTP) con **FastAPI + OR-Tools CP-SAT** en el backend y **React + Vite** en el frontend. Asigna docentes, grupos, salones y bloques horarios cumpliendo restricciones de disponibilidad, capacidad, horas docentes y conflictos.

## Qué incluye

- **Solver global (CP-SAT)**: asigna cada grupo su docente, salón y sus sesiones semanales.
- **Sesiones de duración variable (1–3 h por sesión)**: cada grupo tiene `horas_por_seccion` (1–3) y varias sesiones por semana. El modelo usa ranuras de 1 hora con intervalos de longitud variable.
- **Garantía para el estudiante**: a lo sumo **una clase por (semestre, ranura)**, de modo que cualquier combinación de grupos de un semestre es siempre sin cruces.
- **Reglas de conflicto**: choque estudiante = descartar la *electiva* antes que la *fundamental*; horas administrativas obligatorias (exactas); 1 docente por grupo; docente sin materias asignadas no dicta nada.
- **Flujo del estudiante**: eligen materias y el sistema arma su mejor horario **a partir de la generación global** (sin cruces por solape de intervalos).
- **Login / roles**: administrador autenticado contra la base de datos (hash PBKDF2); el estudiante entra con un botón. Credenciales por defecto: `admin` / `admin123` (seed idempotente al arrancar).

## Estructura

```
backend/    FastAPI + SQLAlchemy + OR-Tools (solver)
frontend/   React + Vite + Tailwind
```

## Ejecutar en local

**Backend** (Python 3.12):
```bash
cd backend
python -m venv venv && venv\Scripts\activate   # o source venv/bin/activate
pip install -r requirements.txt
# Configura backend/.env con DATABASE_URL (Neon/Postgres)
uvicorn app.main:app --reload
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

## Deploy en Render

El backend está listo para Render (blueprint en `backend/render.yaml`, versión de Python en `backend/runtime.txt`, y normalización de la URL de BD en `app/database.py`). Ver pasos en la sección de despliegue o en el resumen del proyecto.

- Endpoint de salud: `GET /health` → `{"status": "healthy"}` (útil para un cron externo que mantenga despierta la instancia gratis).
- La BD (Neon) se conecta por la variable de entorno `DATABASE_URL` (con `?sslmode=require`).
- El frontend apunta al backend mediante `VITE_API_URL`.
