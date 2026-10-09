import { useEffect, useState } from 'react';
import { BookOpen, Sparkles, AlertCircle, CheckCircle2, Loader2, Clock, Award } from 'lucide-react';
import { MallaHoraria } from '../components/MallaHoraria';
import { getAsignaturasSeleccionables, generarHorarioEstudiante } from '../services/api';

export default function MiHorario() {
  const [materias, setMaterias] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    getAsignaturasSeleccionables()
      .then((data) => {
        if (activo) {
          setMaterias(data);
          setLoadingList(false);
        }
      })
      .catch((err) => {
        console.error('Error al cargar las materias:', err);
        if (activo) setLoadingList(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const toggleMateria = (id) => {
    setSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <header className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <Sparkles className="text-orange-600 w-8 h-8" />
          Mi Horario
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Elige las materias que vas a cursar y te propondremos el mejor horario sin cruces.
        </p>
      </header>

      <form onSubmit={handleGenerar} className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen className="text-orange-600 w-5 h-5" />
            Materias disponibles
          </h2>

          {loadingList ? (
            <div className="text-center py-10 text-gray-400 text-sm">Cargando materias...</div>
          ) : materias.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              Aún no hay materias habilitadas para selección. Pídele al administrador que las marque.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {materias.map((m) => {
                const sinHorario = m.grupos_programados === 0;
                const activa = seleccionadas.includes(m.id);
                return (
                  <button
                    type="button"
                    key={m.id}
                    disabled={sinHorario}
                    onClick={() => toggleMateria(m.id)}
                    className={`text-left p-5 rounded-xl border transition-all flex flex-col gap-3 ${
                      sinHorario
                        ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                        : activa
                        ? 'border-orange-500 bg-orange-50 shadow-sm'
                        : 'border-gray-100 bg-gray-50/50 hover:bg-orange-50/30 cursor-pointer'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wide">
                        {m.codigo_uccd}
                      </span>
                      <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-orange-500" /> {m.creditos}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900">{m.nombre}</h3>
                    <div className="text-xs text-gray-500 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Semestre {m.semestre}
                      </span>
                      <span className={sinHorario ? 'text-red-500 font-semibold' : 'text-gray-500'}>
                        {sinHorario ? 'Sin horario generado' : `${m.grupos_programados} sección(es)`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-sm text-gray-500">
              {seleccionadas.length} materia(s) seleccionada(s)
            </p>
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
            <p className="mt-4 text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">
              {error}
            </p>
          )}
        </div>
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
