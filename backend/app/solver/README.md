# Motor de Optimización de Horarios UCTP

## Descripción General

Este módulo implementa un solver basado en **Google OR-Tools CP-SAT** para resolver el **Problema de Horarios Universitarios (University Course Timetabling Problem - UCTP)**.

El objetivo es asignar de manera óptima:
- **Grupos Proyectados** a **Docentes**
- **Bloques Horarios** (día + bloque de tiempo)
- **Salones** (aulas)

Respetando todas las **restricciones duras** del problema académico.

---

## Restricciones Duras Implementadas

### 1. **Capacidad de Salones**
```
Restricción: total_estudiantes(grupo) ≤ capacidad(salon)
```
Un grupo NO se puede asignar a un salón si tiene más estudiantes que la capacidad del salón.

### 2. **Disponibilidad de Docentes**
```
Restricción: x[g,d,s,t] = 0 si (d no disponible en bloque t)
```
Un docente SOLO puede ser asignado en bloques horarios donde él/ella está disponible.

### 3. **Conflicto de Docentes**
```
Restricción: Para cada docente d y bloque t: ∑_g,s x[g,d,s,t] ≤ 1
```
Un docente NO puede dictar dos clases simultáneamente.

### 4. **Conflicto de Salones**
```
Restricción: Para cada salón s y bloque t: ∑_g,d x[g,d,s,t] ≤ 1
```
Un salón NO puede albergar dos clases al mismo tiempo.

### 5. **Horas Máximas de Docentes**
```
Restricción: Para cada docente d: ∑_g,s,t x[g,d,s,t] × 2 ≤ horas_maximas(d)
```
Cada docente tiene un límite máximo de horas por semana (asumiendo 1 bloque = 2 horas).

### 6. **Cobertura de Grupos**
```
Restricción: Para cada grupo g: ∑_d,s,t x[g,d,s,t] ≥ horas_semanales(g) / 2
```
Cada grupo debe tener suficientes bloques asignados para cubrir sus horas semanales.

---

## Modelo de Decisión

### Variables de Decisión Binarias
```
x[g, d, s, t] ∈ {0, 1}
```

Donde:
- **g**: índice del grupo proyectado
- **d**: índice del docente
- **s**: índice del salón
- **t**: índice del bloque horario (día, bloque_horario)

**Significado**:
- `x[g,d,s,t] = 1`: El grupo `g` es asignado al docente `d`, en el salón `s`, en el bloque `t`
- `x[g,d,s,t] = 0`: No hay asignación

---

## Arquitectura del Módulo

### Funciones Principales

#### 1. `resolver_horarios_uctp(db: Session) → ResultadoOptimizacion`
**Función principal (punto de entrada)**

Orquesta todo el proceso de optimización:
1. Extrae datos de la BD
2. Crea el modelo CP-SAT
3. Define variables de decisión
4. Agrega restricciones
5. Resuelve el modelo
6. Guarda resultados en BD

**Retorna**: `ResultadoOptimizacion` con status, tiempo, asignaciones y estadísticas

---

#### 2. `_extraer_datos_bd(db: Session) → DatosOptimizacion`
**Extrae datos de la base de datos**

Consulta:
- `GrupoProyectado` (grupos a asignar)
- `Docente` (con relaciones)
- `Salon` (disponibles)
- `DisponibilidadDocente` (bloques disponibles por docente)

Construye un mapa de disponibilidades para acceso rápido.

**Retorna**: `DatosOptimizacion` estructurado

---

#### 3. `_crear_variables_decision(...) → Dict`
**Crea variables binarias del modelo**

Genera `|grupos| × |docentes| × |salones| × |bloques|` variables binarias.

**Complejidad**: O(g × d × s × t)

---

#### 4. Funciones de Restricciones
Cada una agrega una categoría de restricciones al modelo:

```python
_agregar_restriccion_capacidad_salon()
_agregar_restriccion_disponibilidad_docente()
_agregar_restriccion_conflicto_docente()
_agregar_restriccion_conflicto_salon()
_agregar_restriccion_horas_docente()
_agregar_restriccion_cobertura_grupos()
```

---

#### 5. `_resolver_modelo(...) → (status_str, elapsed_time, asignaciones)`
**Invoca el solver CP-SAT**

Configuración:
- **Timeout**: 300 segundos (5 minutos)
- **Log**: Muestra progreso de búsqueda

**Retorna**: Status (`OPTIMAL`, `FEASIBLE`, `INFEASIBLE`), tiempo y diccionario de solución

---

#### 6. `_guardar_horarios_bd(...) → int`
**Persiste resultados en la BD**

1. Limpia registros antiguos en `HorarioOptimizado`
2. Inserta nuevas asignaciones
3. Realiza commit transaccional

**Retorna**: Cantidad de asignaciones guardadas

---

## Tipos de Datos

### `ResultadoOptimizacion` (NamedTuple)
```python
class ResultadoOptimizacion(NamedTuple):
    status: str                # "OPTIMAL", "FEASIBLE", "INFEASIBLE", "ERROR"
    tiempo_ejecucion: float    # segundos
    total_asignaciones: int    # número de clases asignadas
    grupos_asignados: int      # cantidad de grupos con ≥1 clase
    total_grupos: int          # total de grupos en BD
    mensaje: str               # descripción
```

### `DatosOptimizacion` (NamedTuple)
```python
class DatosOptimizacion(NamedTuple):
    grupos: List[GrupoProyectado]
    docentes: List[Docente]
    salones: List[Salon]
    disponibilidades: Dict[int, set]  # docente_id -> {(dia, bloque)}
    bloques_horarios: List[Tuple[str, str]]
```

---

## Uso

### Desde Python (integración)
```python
from sqlalchemy.orm import Session
from app.solver.engine import resolver_horarios_uctp

db: Session = get_db_session()
resultado = resolver_horarios_uctp(db)

print(f"Status: {resultado.status}")
print(f"Tiempo: {resultado.tiempo_ejecucion}s")
print(f"Asignaciones: {resultado.total_asignaciones}")
print(f"Grupos: {resultado.grupos_asignados}/{resultado.total_grupos}")
print(f"Mensaje: {resultado.mensaje}")
```

### Desde API REST
```bash
curl -X POST http://localhost:8000/api/solver/resolver-horarios
```

**Respuesta**:
```json
{
  "status": "FEASIBLE",
  "tiempo_ejecucion": 42.5,
  "total_asignaciones": 156,
  "grupos_asignados": 52,
  "total_grupos": 52,
  "mensaje": "Optimización FEASIBLE: 156 asignaciones, 52/52 grupos"
}
```

---

## Complejidad Computacional

### Tamaño del Problema
- **Variables**: O(g × d × s × t)
- **Restricciones**: O(d × t + s × t + d + g)

### Casos Típicos
| Grupos | Docentes | Salones | Bloques | Variables | Tiempo Esperado |
|--------|----------|---------|---------|-----------|-----------------|
| 10     | 5        | 8       | 24      | 9,600     | < 1s            |
| 50     | 20       | 15      | 40      | 600,000   | 5-15s           |
| 100    | 40       | 25      | 50      | 5,000,000 | 30-120s         |

*Nota: Los tiempos son aproximados y dependen del hardware y configuración de restricciones.*

---

## Configuración del Solver

### Parámetros Ajustables
Editar en `_resolver_modelo()`:

```python
solver = cp_model.CpSolver()
solver.parameters.max_time_in_seconds = 300  # Aumentar para problemas más grandes
solver.parameters.log_search_progress = True  # Mostrar progreso
solver.parameters.num_search_workers = 8     # Paralelismo (threads)
```

---

## Logging

El módulo usa `logging` para registrar:
- Datos extraídos
- Creación de variables
- Adición de restricciones
- Estado del resolver
- Asignaciones guardadas

**Acceder a logs**:
```python
import logging
logging.basicConfig(level=logging.INFO)
```

---

## Manejo de Errores

### Casos Tratados
1. **Datos insuficientes**: Sin grupos, docentes o salones
2. **Sin bloques horarios**: Disponibilidades vacías
3. **Problema infeasible**: No hay solución válida
4. **Excepciones de BD**: Capturadas y reportadas

### Retorno en Error
```python
ResultadoOptimizacion(
    status="ERROR",
    tiempo_ejecucion=0.0,
    total_asignaciones=0,
    grupos_asignados=0,
    total_grupos=0,
    mensaje="Descripción del error"
)
```

---

## Mejoras Futuras

### Restricciones Suaves (Soft Constraints)
- Preferencias de horario (docentes)
- Agrupar clases del mismo grupo
- Minimizar traslados entre salones

### Optimización
- Agregar objetivos (minimize breaks, maximize room utilization)
- Paralelismo mejorado
- Caching de disponibilidades

### Escalabilidad
- Usar pre-procesamiento para reducir variables
- Implementar branch-and-cut personalizado
- Descomposición del problema

---

## Referencias

- **Google OR-Tools**: https://developers.google.com/optimization
- **CP-SAT Solver**: https://github.com/google/or-tools
- **UCTP**: https://www.euro-online.org/web/ewg/

---

**Autor**: Sistema de Optimización de Horarios  
**Fecha**: 2024  
**Versión**: 1.0.0
