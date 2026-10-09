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

  const gruposSemestre = SEMESTRES.map((s) => ({
    semestre: s,
    materias: materias.filter((m) => m.semestre === s),
  }));
  const otras = materias.filter((m) => !SEMESTRES.includes(m.semestre));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <Sparkles className="text-orange-600 w-8 h-8" />
          Mi Horario
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Elige tus materias por semestre y te propondremos el mejor horario sin cruces.
        </p>
      </header>

      <form onSubmit={handleGenerar} className="space-y-6">
        <div className="sticky top-0 z-10 bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-5 h-5 text-orange-600" />
              <label className="text-sm font-semibold text-gray-700">¿En qué semestre estás?</label>
              <select
                value={semestreActual ?? ''}
                onChange={handleSemestreActual}
                className="p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <option value="">-- Selecciona --</option>
                {SEMESTRES.map((s) => (
                  <option key={s} value={s}>
                    Semestre {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 md:max-w-md md:ml-auto">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-1.5 text-gray-600 font-medium">
                  <Wallet className="w-4 h-4 text-orange-600" /> Créditos
                </span>
                <span className={creditosRestantes < 0 ? 'text-red-600 font-bold' : 'text-gray-700 font-bold'}>
                  {creditosTotales} / {maxCreditos}
                </span>
              </div>
              <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    creditosRestantes < 0 ? 'bg-red-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Te quedan {Math.max(0, creditosRestantes)} créditos disponibles
              </p>
            </div>

            <button
              type="submit"
              disabled={seleccionadas.length === 0 || generando}
              className="py-3 px-6 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {generando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generar mi horario
                </>
              )}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">{error}</p>
          )}
        </div>

        {loadingList ? (
          <div className="text-center py-16 text-gray-400 text-sm">Cargando materias...</div>
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

      {resultado && (
        <section className="space-y-4">
          <div
            className={`p-4 rounded-xl text-sm flex items-start gap-2 border ${
              resultado.status === 'OK'
                ? 'bg-green-50 text-green-800 border-green-200'
                : resultado.status === 'PARCIAL'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {resultado.status === 'OK' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <div>
              <p className="font-semibold">{resultado.mensaje}</p>
              {resultado.no_disponibles?.length > 0 && (
                <p className="mt-1">Sin horario: {resultado.no_disponibles.join(', ')}</p>
              )}
              {resultado.conflictos?.length > 0 && (
                <ul className="mt-1 list-disc list-inside">
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
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-2">
              {resultado.seleccion.map((s) => (
                <span
                  key={s.grupo_id}
                  className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full"
                >
                  {s.asignatura} · Grupo {s.grupo_codigo}
                </span>
              ))}
            </div>
          )}

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Malla Horaria Sugerida</h2>
            <MallaHoraria horarios={resultado.horario} />
          </div>
        </section>
      )}
    </div>
  );
}
