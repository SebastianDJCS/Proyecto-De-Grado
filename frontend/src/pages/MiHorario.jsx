import { useEffect, useState } from 'react';
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
  GraduationCap,
  Wallet,
} from 'lucide-react';
import SemestreAcordeon from '../components/SemestreAcordeon';
import { MallaHoraria } from '../components/MallaHoraria';
import {
  getAsignaturasSeleccionables,
  getConfigEstudiante,
  generarHorarioEstudiante,
} from '../services/api';
import { PageHeader, Button, Badge, Alert, fieldClass, labelClass } from '../components/ui';

const SEMESTRES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function MiHorario() {
  const [materias, setMaterias] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [maxCreditos, setMaxCreditos] = useState(20);
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [semestreActual, setSemestreActual] = useState(null);
  const [acordeonAbierto, setAcordeonAbierto] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    Promise.all([getAsignaturasSeleccionables(), getConfigEstudiante()])
      .then(([lista, config]) => {
        if (!activo) return;
        setMaterias(lista);
        if (config?.max_creditos) setMaxCreditos(config.max_creditos);
        const primerSemestre = SEMESTRES.find((s) => lista.some((m) => m.semestre === s));
        setAcordeonAbierto(primerSemestre ?? null);
        setLoadingList(false);
      })
      .catch((err) => {
        console.error('Error al cargar la oferta:', err);
        if (activo) setLoadingList(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const creditosTotales = materias
    .filter((m) => seleccionadas.includes(m.id))
    .reduce((acc, m) => acc + m.creditos, 0);
  const creditosRestantes = maxCreditos - creditosTotales;
  const porcentaje = Math.min(100, Math.round((creditosTotales / maxCreditos) * 100));

  const toggleMateria = (id) => {
    setSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAcordeon = (semestre) => {
    setAcordeonAbierto((prev) => (prev === semestre ? null : semestre));
  };

  const handleSemestreActual = (e) => {
    const valor = e.target.value ? parseInt(e.target.value, 10) : null;
    setSemestreActual(valor);
    if (valor) setAcordeonAbierto(valor);
  };

  const handleGenerar = async (e) => {
    e.preventDefault();
    if (seleccionadas.length === 0 || generando) return;

    setGenerando(true);
    setError(null);
    setResultado(null);

    try {
      const data = await generarHorarioEstudiante(seleccionadas);
      setResultado(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Ocurrió un error al generar tu horario.');
    } finally {
      setGenerando(false);
    }
  };

  // Dos fundamentales en cruce: el estudiante elige cuál conservar.
  const handleConservar = async (conservarId, descartarId) => {
    if (generando) return;
    if (!seleccionadas.includes(conservarId)) return;
    const nuevas = seleccionadas.filter((id) => id !== descartarId);
    if (nuevas.length === 0) return;

    setSeleccionadas(nuevas);
    setGenerando(true);
    setError(null);
    setResultado(null);

    try {
      const data = await generarHorarioEstudiante(nuevas);
      setResultado(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Ocurrió un error al generar tu horario.');
    } finally {
      setGenerando(false);
    }
  };

  const gruposSemestre = SEMESTRES.map((s) => ({
    semestre: s,
    materias: materias.filter((m) => m.semestre === s),
  }));
  const otras = materias.filter((m) => !SEMESTRES.includes(m.semestre));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        kicker="Estudiante"
        title="Mi horario"
        description="Elige tus materias por semestre y te propondremos el mejor horario sin cruces."
      />

      <form onSubmit={handleGenerar} className="space-y-5">
        <div className="sticky top-0 z-10 space-y-4 rounded-lg border border-line bg-surface/95 p-4 backdrop-blur-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="w-full shrink-0 sm:w-48">
              <label htmlFor="semestre-actual" className={labelClass}>
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" /> Semestre actual
                </span>
              </label>
              <select
                id="semestre-actual"
                value={semestreActual ?? ''}
                onChange={handleSemestreActual}
                className={fieldClass}
              >
                <option value="">-- Selecciona --</option>
                {SEMESTRES.map((s) => (
                  <option key={s} value={s}>
                    Semestre {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 lg:px-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.12em] text-muted">
                  <Wallet className="h-3.5 w-3.5" /> Créditos
                </span>
                <span
                  className={`tabular font-semibold ${
                    creditosRestantes < 0 ? 'text-red-700' : 'text-ink'
                  }`}
                >
                  {creditosTotales} / {maxCreditos}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    creditosRestantes < 0 ? 'bg-red-600' : 'bg-brand-600'
                  }`}
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-faint">
                Te quedan {Math.max(0, creditosRestantes)} créditos disponibles
              </p>
            </div>

            <Button
              type="submit"
              disabled={seleccionadas.length === 0 || generando}
              className="w-full shrink-0 px-5 py-2.5 lg:w-auto"
            >
              {generando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generar mi horario
                </>
              )}
            </Button>
          </div>

          {error && <Alert tone="danger">{error}</Alert>}
        </div>

        {loadingList ? (
          <div className="rounded-lg border border-line bg-surface px-5 py-16 text-center text-sm text-muted">
            Cargando materias…
          </div>
        ) : (
          <div className="space-y-3">
            {gruposSemestre.map((g) => (
              <SemestreAcordeon
                key={g.semestre}
                semestre={g.semestre}
                materias={g.materias}
                seleccionadas={seleccionadas}
                onToggle={toggleMateria}
                abierto={acordeonAbierto === g.semestre}
                onToggleAcordeon={() => toggleAcordeon(g.semestre)}
                semestreActual={semestreActual}
                creditosRestantes={creditosRestantes}
              />
            ))}
            {otras.length > 0 && (
              <SemestreAcordeon
                semestre="Otros"
                materias={otras}
                seleccionadas={seleccionadas}
                onToggle={toggleMateria}
                abierto={acordeonAbierto === 'Otros'}
                onToggleAcordeon={() => toggleAcordeon('Otros')}
                semestreActual={semestreActual}
                creditosRestantes={creditosRestantes}
              />
            )}
          </div>
        )}
      </form>

      {resultado && resultado.status === 'REQUIERE_SELECCION' && (
        <section className="mt-5 space-y-4 rounded-lg border border-[#e2d3a7] bg-[#fbf6e9] p-5">
          <div className="flex items-start gap-2.5 text-[#6b5518]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{resultado.mensaje}</p>
              <p className="mt-1 text-xs">
                Elige cuál de las materias en conflicto conservar para continuar:
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {resultado.pares_conflicto?.map((par, i) => (
              <div
                key={`${par.a_id}-${par.b_id}-${i}`}
                className="flex flex-col justify-between gap-3 rounded-md border border-[#e2d3a7] bg-surface p-3.5 md:flex-row md:items-center"
              >
                <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-ink">
                  {par.a}
                  <Badge tone="neutral">{par.a_tipo === 'ELECTIVA' ? 'Electiva' : 'Fundamental'}</Badge>
                  <span className="mx-1 text-[11px] uppercase text-faint">vs</span>
                  {par.b}
                  <Badge tone="neutral">{par.b_tipo === 'ELECTIVA' ? 'Electiva' : 'Fundamental'}</Badge>
                </span>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => handleConservar(par.a_id, par.b_id)}
                    className="px-3 py-1.5 text-xs"
                  >
                    Conservar {par.a}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleConservar(par.b_id, par.a_id)}
                    className="px-3 py-1.5 text-xs"
                  >
                    Conservar {par.b}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {resultado.descartadas?.length > 0 && (
            <Alert tone="warning">
              Electivas descartadas por conflicto: {resultado.descartadas.join(', ')}
            </Alert>
          )}
        </section>
      )}

      {resultado && resultado.status !== 'REQUIERE_SELECCION' && (
        <section className="mt-5 space-y-4">
          <div
            className={`flex items-start gap-2.5 rounded-lg border p-4 text-sm ${
              resultado.status === 'OK'
                ? 'border-[#c8dcc3] bg-[#eff5ec] text-[#345c30]'
                : resultado.status === 'PARCIAL'
                ? 'border-[#e2d3a7] bg-[#fbf6e9] text-[#6b5518]'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {resultado.status === 'OK' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <div>
              <p className="font-semibold">{resultado.mensaje}</p>
              {resultado.descartadas?.length > 0 && (
                <p className="mt-1 text-xs">Electivas descartadas: {resultado.descartadas.join(', ')}</p>
              )}
              {resultado.no_disponibles?.length > 0 && (
                <p className="mt-1 text-xs">Sin horario: {resultado.no_disponibles.join(', ')}</p>
              )}
              {resultado.conflictos?.length > 0 && (
                <ul className="mt-1 list-inside list-disc text-xs">
                  {resultado.conflictos.map((c, i) => (
                    <li key={i}>
                      {c.dia} {c.bloque_horario}: {c.asignaturas.join(' / ')}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {resultado.seleccion?.length > 0 && (
            <div className="flex flex-wrap gap-2 rounded-lg border border-line bg-surface p-4">
              {resultado.seleccion.map((s) => (
                <span
                  key={s.grupo_id}
                  className="rounded-sm border border-line bg-canvas px-2 py-1 text-xs text-muted"
                >
                  {s.asignatura} · Grupo {s.grupo_codigo}
                  {s.total_sesiones > 0 && ` (${s.total_sesiones} sesiones)`}
                </span>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-line bg-surface">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-serif text-xl text-ink">Malla horaria sugerida</h2>
            </div>
            <div className="p-4">
              <MallaHoraria horarios={resultado.horario} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
