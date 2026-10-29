import { useState } from 'react';
import { MallaHoraria } from '../components/MallaHoraria';
import { resolverHorarios, getHorarioDocente } from '../services/api';
import { Play, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PageHeader, Button, Badge, Alert, fieldClass, labelClass } from '../components/ui';

export default function Dashboard() {
  // Estados para el Solver
  const [loadingSolver, setLoadingSolver] = useState(false);
  const [mensajeSolver, setMensajeSolver] = useState(null);

  // Estados para la Búsqueda de Horarios
  const [docenteId, setDocenteId] = useState('');
  const [horarios, setHorarios] = useState([]);
  const [loadingConsulta, setLoadingConsulta] = useState(false);
  const [errorConsulta, setErrorConsulta] = useState(null);

  // Handler para ejecutar el Solver Global
  const handleEjecutarSolver = async (e) => {
    e.preventDefault();
    setLoadingSolver(true);
    setMensajeSolver(null);

    try {
      const res = await resolverHorarios();
      setMensajeSolver({
        tipo: 'exito',
        texto: res.mensaje || '¡Horarios globales generados y guardados con éxito!',
      });
      if (docenteId) {
        handleBuscarDocente();
      }
    } catch (err) {
      setMensajeSolver({
        tipo: 'error',
        texto: err.response?.data?.detail || 'Ocurrió un error al ejecutar el solver.',
      });
    } finally {
      setLoadingSolver(false);
    }
  };

  // Handler para consultar el horario por cédula
  const handleBuscarDocente = async (e) => {
    if (e) e.preventDefault();
    if (!docenteId.trim()) return;

    setLoadingConsulta(true);
    setErrorConsulta(null);

    try {
      const data = await getHorarioDocente(docenteId);
      setHorarios(data);
      if (data.length === 0) {
        setErrorConsulta('No se encontraron horarios ni horas administrativas asignadas para este docente.');
      }
    } catch (err) {
      setHorarios([]);
      setErrorConsulta(
        err.response?.status === 404
          ? 'Docente no encontrado o sin horarios registrados.'
          : 'Error de conexión con la API backend.'
      );
    } finally {
      setLoadingConsulta(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        kicker="Panel general"
        title="Optimización de horarios académicos"
        description="Ejecuta el motor global y consulta las mallas horarias de docentes y horas administrativas."
        actions={<Badge tone="ink">CP-SAT · Global</Badge>}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="flex flex-col rounded-lg border border-line bg-surface">
          <div className="border-b border-line px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
              Motor de optimización
            </p>
            <h2 className="mt-1 font-serif text-xl text-ink">Generar horarios globales</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Procesa toda la base de datos para asegurar cero cruces entre docentes, salones y
              semestres.
            </p>
          </div>

          <div className="flex flex-1 flex-col justify-between gap-4 px-5 py-5">
            <form onSubmit={handleEjecutarSolver}>
              <Button type="submit" disabled={loadingSolver} className="w-full py-2.5">
                {loadingSolver ? (
                  'Optimizando recursos…'
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    Generar horarios globales
                  </>
                )}
              </Button>
            </form>

            {mensajeSolver && (
              <Alert tone={mensajeSolver.tipo === 'exito' ? 'success' : 'danger'}>
                <span className="flex items-start gap-2">
                  {mensajeSolver.tipo === 'exito' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{mensajeSolver.texto}</span>
                </span>
              </Alert>
            )}
          </div>
        </section>

        <section className="flex flex-col rounded-lg border border-line bg-surface">
          <div className="border-b border-line px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
              Consulta
            </p>
            <h2 className="mt-1 font-serif text-xl text-ink">Horario de un docente</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Ingresa la identificación para ver la malla asignada y sus horas administrativas.
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-4 px-5 py-5">
            <form onSubmit={handleBuscarDocente} className="space-y-3">
              <div>
                <label htmlFor="docente-id" className={labelClass}>
                  Identificación / cédula
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                  <input
                    id="docente-id"
                    type="text"
                    placeholder="Ej. 1098765432"
                    value={docenteId}
                    onChange={(e) => setDocenteId(e.target.value)}
                    className={`${fieldClass} pl-9`}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="secondary"
                disabled={loadingConsulta || !docenteId.trim()}
                className="w-full"
              >
                {loadingConsulta ? 'Buscando…' : 'Buscar malla horaria'}
              </Button>
            </form>

            {errorConsulta && <Alert tone="danger">{errorConsulta}</Alert>}
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-lg border border-line bg-surface">
        <div className="flex flex-col gap-4 border-b border-line px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-serif text-xl text-ink">Malla horaria semanal</h2>
            <p className="mt-1 text-sm text-muted">
              {horarios.length > 0 ? (
                <>
                  Mostrando horarios de{' '}
                  <span className="font-semibold text-ink">
                    {horarios[0]?.docente_nombre || 'Docente'}
                  </span>
                </>
              ) : (
                'Selecciona un docente para visualizar su programación.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm border border-brand-300 bg-brand-100" />
              Clase / asignatura
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm border border-[#d9c9a0] bg-[#fbf6e9]" />
              Labor administrativa
            </span>
          </div>
        </div>

        <div className="p-4">
          <MallaHoraria horarios={horarios} />
        </div>
      </section>
    </div>
  );
}
