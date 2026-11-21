-- ===========================================================================
-- Migración del plan de estudios (semestres 1 a 9)
--
-- IMPORTANTE sobre 'horas_por_seccion':
--   La duración de una sesión está acotada a 1-3 horas académicas (45 min
--   cada una). Asignar 4 a una materia de 4 horas/semana rompe el schema de
--   la API (AsignaturaResponse: le=3) y hace que GET /api/asignaturas/ devuelva
--   500 Internal Server Error.
--
--   Por eso las materias de 4 horas/semana se reparten en DOS sesiones de
--   2 horas (secciones_por_grupo = 2, horas_por_seccion = 2), que es el mismo
--   criterio que se usa para las materias de laboratorio.
--
--   Excepción: 'S07-04' y 'S08-04' se dictan en 3 sesiones de 1 hora. Son
--   materias de 6° en adelante (jornada nocturna 18:00-21:45) y una sesión de
--   3 horas (135 min) no cabe dos veces en la misma franja: la noche solo
--   admite una sesión larga por día y por semestre.
--
--   Hay además un CHECK constraint en la BD (chk_horas_por_seccion) que
--   rechaza cualquier valor fuera del rango 1..3.
-- ===========================================================================

BEGIN;

DROP TABLE IF EXISTS plan_migracion_tmp;

CREATE TEMP TABLE plan_migracion_tmp (
    semestre integer NOT NULL,
    codigo_uccd varchar(50) PRIMARY KEY,
    nombre varchar(255) NOT NULL,
    creditos integer NOT NULL,
    horas_semanales integer NOT NULL
);

INSERT INTO plan_migracion_tmp
(semestre, codigo_uccd, nombre, creditos, horas_semanales)
VALUES
(1, 'S01-01', 'Matemáticas I', 3, 4),
(1, 'S01-02', 'Álgebra lineal computacional', 3, 4),
(1, 'S01-03', 'Vida universitaria I', 2, 2),
(1, 'S01-04', 'Epistemología de la investigación', 3, 3),
(1, 'S01-05', 'Programación I', 3, 4),
(1, 'S01-06', 'Lógica y teoría de conjuntos', 3, 3),
(1, 'S01-07', 'Soporte técnico', 3, 3),
(1, 'S01-08', 'Electiva tecnológica I', 2, 2),

(2, 'S02-01', 'Matemáticas II', 3, 4),
(2, 'S02-02', 'Física I y Laboratorio', 4, 4),
(2, 'S02-03', 'Vida universitaria II', 2, 2),
(2, 'S02-04', 'Competencias comunicativas I', 3, 3),
(2, 'S02-05', 'Metodología de investigación', 3, 3),
(2, 'S02-06', 'Inglés I', 2, 2),
(2, 'S02-07', 'Programación II', 3, 4),
(2, 'S02-08', 'Estructura de datos I', 3, 4),

(3, 'S03-01', 'Matemáticas III', 3, 4),
(3, 'S03-02', 'Física II y Laboratorio', 4, 4),
(3, 'S03-03', 'Comportamiento humano I', 3, 3),
(3, 'S03-04', 'Competencias comunicativas II', 3, 3),
(3, 'S03-05', 'Inglés II', 2, 2),
(3, 'S03-06', 'Programación III', 3, 4),
(3, 'S03-07', 'Estructura de datos II', 3, 4),
(3, 'S03-08', 'Diseño de base de datos', 3, 3),

(4, 'S04-01', 'Matemáticas IV', 3, 4),
(4, 'S04-02', 'Competencias comunicativas III', 3, 3),
(4, 'S04-03', 'Inglés III', 2, 2),
(4, 'S04-04', 'Programación de base de datos', 3, 4),
(4, 'S04-05', 'Aplicaciones web I', 3, 4),
(4, 'S04-06', 'Sistemas operativos I', 3, 3),
(4, 'S04-07', 'Comunicaciones y redes', 3, 3),
(4, 'S04-08', 'Electiva tecnológica II', 2, 2),

(5, 'S05-01', 'Comportamiento humano II', 3, 3),
(5, 'S05-02', 'Inglés IV', 2, 2),
(5, 'S05-03', 'Ingeniería del computador', 3, 3),
(5, 'S05-04', 'Probabilidad y estadística', 3, 3),
(5, 'S05-05', 'Diseño de software', 3, 4),
(5, 'S05-06', 'Aplicaciones web II', 3, 4),
(5, 'S05-07', 'Electiva tecnológica III', 2, 2),

(6, 'S06-01', 'Desarrollo de software', 3, 4),
(6, 'S06-02', 'Práctica profesional', 3, 3),
(6, 'S06-03', 'Sistemas operativos II', 3, 3),
(6, 'S06-04', 'Circuitos digitales', 3, 3),
(6, 'S06-05', 'Gestión de negocios', 3, 3),
(6, 'S06-06', 'Soporte TIC', 3, 3),

(7, 'S07-01', 'Inglés V', 2, 2),
(7, 'S07-02', 'Matemática computacional', 3, 3),
(7, 'S07-03', 'Gerencia de proyectos de software', 3, 3),
(7, 'S07-04', 'Administración de servidores', 3, 3),
(7, 'S07-05', 'Arquitectura de computadores', 3, 3),
(7, 'S07-06', 'Negocios en Internet', 3, 3),
(7, 'S07-07', 'Énfasis I', 3, 3),
(7, 'S07-08', 'Electiva de ingeniería I', 2, 2),

(8, 'S08-01', 'Legislación informática', 3, 3),
(8, 'S08-02', 'Inglés VI', 2, 2),
(8, 'S08-03', 'Teoría general de sistemas', 3, 3),
(8, 'S08-04', 'Algoritmia', 3, 3),
(8, 'S08-05', 'Compiladores', 3, 3),
(8, 'S08-06', 'Auditoría de sistemas', 3, 3),
(8, 'S08-07', 'Énfasis II', 3, 3),
(8, 'S08-08', 'Electiva de ingeniería II', 2, 2),

(9, 'S09-01', 'Ética profesional', 3, 3),
(9, 'S09-02', 'Desarrollo sostenible', 3, 3),
(9, 'S09-03', 'Inglés VII', 2, 2),
(9, 'S09-04', 'Investigación de operaciones', 3, 3),
(9, 'S09-05', 'Énfasis III', 3, 3),
(9, 'S09-06', 'Electiva de ingeniería III', 2, 2);


INSERT INTO asignaturas (
    codigo_uccd,
    nombre,
    semestre,
    creditos,
    horas_semanales,
    secciones_por_grupo,
    horas_por_seccion,
    seleccionable,
    tipo
)
SELECT
    p.codigo_uccd,
    p.nombre,
    p.semestre,
    p.creditos,
    p.horas_semanales,
    -- Las materias de 4 h/semana se dictan en 2 sesiones de 2 h; el resto en 1.
    -- Excepción: S07-04 y S08-04 van en 3 sesiones de 1 h (jornada nocturna).
    CASE
        WHEN p.codigo_uccd IN ('S07-04', 'S08-04') THEN 3
        WHEN p.horas_semanales > 3 THEN 2
        ELSE 1
    END,
    -- Duración de cada sesión, acotada al máximo de 3 horas académicas.
    CASE
        WHEN p.codigo_uccd IN ('S07-04', 'S08-04') THEN 1
        WHEN p.horas_semanales > 3 THEN 2
        ELSE p.horas_semanales
    END,
    TRUE,
    CASE
        WHEN p.nombre LIKE 'Electiva%' THEN 'ELECTIVA'
        ELSE 'FUNDAMENTAL'
    END
FROM plan_migracion_tmp AS p
ON CONFLICT (codigo_uccd)
DO UPDATE SET
    nombre = EXCLUDED.nombre,
    semestre = EXCLUDED.semestre,
    creditos = EXCLUDED.creditos,
    horas_semanales = EXCLUDED.horas_semanales,
    secciones_por_grupo = EXCLUDED.secciones_por_grupo,
    horas_por_seccion = EXCLUDED.horas_por_seccion,
    seleccionable = EXCLUDED.seleccionable,
    tipo = EXCLUDED.tipo;


-- Elimina las materias duplicadas con códigos antiguos.
DELETE FROM asignaturas
WHERE codigo_uccd IN ('S5-03', 'S7-04');


-- Elimina los prerrequisitos existentes de todas las materias del plan.
DELETE FROM asignatura_prerequisito
WHERE asignatura_id IN (
    SELECT id
    FROM asignaturas
    WHERE codigo_uccd IN (
        SELECT codigo_uccd
        FROM plan_migracion_tmp
    )
);


-- Agrega las cadenas de prerrequisitos.
INSERT INTO asignatura_prerequisito
(asignatura_id, prerequisito_id)
SELECT destino.id, origen.id
FROM (
    VALUES
        ('S01-01', 'S02-01'),
        ('S02-01', 'S03-01'),
        ('S03-01', 'S04-01'),

        ('S02-02', 'S03-02'),

        ('S01-03', 'S02-03'),

        ('S02-04', 'S03-04'),
        ('S03-04', 'S04-02'),

        ('S02-06', 'S03-05'),
        ('S03-05', 'S04-03'),
        ('S04-03', 'S05-02'),
        ('S05-02', 'S07-01'),
        ('S07-01', 'S08-02'),
        ('S08-02', 'S09-03'),

        ('S01-05', 'S02-07'),
        ('S02-07', 'S03-06'),

        ('S02-08', 'S03-07'),

        ('S03-03', 'S05-01'),

        ('S04-06', 'S06-03'),

        ('S01-08', 'S04-08'),
        ('S04-08', 'S05-07'),

        ('S04-05', 'S05-06'),

        ('S07-07', 'S08-07'),
        ('S08-07', 'S09-05'),

        ('S07-08', 'S08-08'),
        ('S08-08', 'S09-06')
) AS relaciones(origen_codigo, destino_codigo)
JOIN asignaturas AS origen
    ON origen.codigo_uccd = relaciones.origen_codigo
JOIN asignaturas AS destino
    ON destino.codigo_uccd = relaciones.destino_codigo
ON CONFLICT DO NOTHING;


-- Crea el grupo G1 si una materia aún no tiene grupos.
INSERT INTO grupos_proyectados (
    asignatura_id,
    numero_grupo,
    total_inscritos,
    total_repitentes,
    total_estudiantes
)
SELECT
    a.id,
    1,
    0,
    0,
    0
FROM asignaturas AS a
JOIN plan_migracion_tmp AS p
    ON p.codigo_uccd = a.codigo_uccd
WHERE NOT EXISTS (
    SELECT 1
    FROM grupos_proyectados AS g
    WHERE g.asignatura_id = a.id
);

COMMIT;

DROP TABLE IF EXISTS plan_migracion_tmp;

-- ===========================================================================
-- Nota: después de correr este script hay que volver a generar el horario
-- global (POST /api/solver/resolver-horarios) porque cambió la duración de
-- las sesiones de las materias de 4 horas.
-- ===========================================================================
