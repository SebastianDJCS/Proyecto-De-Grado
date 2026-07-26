import React, { useState } from 'react';
import { MallaHoraria } from './components/MallaHoraria';
import { resolverHorarios, getHorarioDocente } from './services/api';
import { Play, Search, Calendar, User, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function App() {
  // Estados para el Solver
  const [semestreSolver, setSemestreSolver] = useState('');
  const [loadingSolver, setLoadingSolver] = useState(false);
  const [mensajeSolver, setMensajeSolver] = useState(null);

  // Estados para la Búsqueda de Horarios
  const [docenteId, setDocenteId] = useState('');
  const [horarios, setHorarios] = useState([]);
  const [loadingConsulta, setLoadingConsulta] = useState(false);
  const [errorConsulta, setErrorConsulta] = useState(null);

  // Handler para ejecutar el Solver
  const handleEjecutarSolver = async (e) => {
    e.preventDefault();
    setLoadingSolver(true);
    setMensajeSolver(null);

    try {
      const res = await resolverHorarios(semestreSolver || null);
      setMensajeSolver({
        tipo: 'exito',
        texto: res.mensaje || '¡Horarios generados y guardados con éxito!',
      });
      // Si tenemos un docente consultado previamente, recargamos su horario
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
    <div className="min-h-screen bg-gray-100 text-gray-800 p-4 md:p-8">
      {/* Encabezado Principal */}
      <header className="max-w-7xl mx-auto mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <Calendar className="text-blue-600 w-8 h-8" />
          Sistema de Optimización de Horarios Académicos
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Panel de Administración y Consulta de Mallas Horarias (Docentes & Horas Administrativas)
        </p>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        {/* Panel Superior: Acciones / Formularios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Control del Solver */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Play className="text-blue-600 w-5 h-5" />
              Ejecutar Motor CP-SAT
            </h2>
            <form onSubmit={handleEjecutarSolver} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                  Filtrar por Semestre (Opcional)
                </label>
                <select
                  value={semestreSolver}
                  onChange={(e) => setSemestreSolver(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Todos los semestres</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                    <option key={s} value={s}>
                      Semestre {s}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loadingSolver}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition duration-150 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingSolver ? (
                  <span>Resolviendo restricciones...</span>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Generar Horarios
                  </>
                )}
              </button>
            </form>

            {/* Mensaje de Estado del Solver */}
            {mensajeSolver && (
              <div
                className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
                  mensajeSolver.tipo === 'exito'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {mensajeSolver.tipo === 'exito' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{mensajeSolver.texto}</span>
              </div>
            )}
          </div>

          {/* Card 2: Consulta por Docente */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <User className="text-blue-600 w-5 h-5" />
              Consultar Horario de Docente
            </h2>
            <form onSubmit={handleBuscarDocente} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                  Identificación / Cédula del Docente
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ej. 1098765432"
                    value={docenteId}
                    onChange={(e) => setDocenteId(e.target.value)}
                    className="w-full p-2.5 pl-10 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingConsulta || !docenteId.trim()}
                className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg shadow transition duration-150 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingConsulta ? 'Buscando...' : 'Buscar Malla Horaria'}
              </button>
            </form>

            {errorConsulta && (
              <p className="mt-4 text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">
                {errorConsulta}
              </p>
            )}
          </div>

        </div>

        {/* Sección Inferior: Grilla Malla Horaria */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Malla Horaria Semanal</h2>
              {horarios.length > 0 && (
                <p className="text-sm text-gray-500">
                  Mostrando horarios asignados a:{' '}
                  <span className="font-semibold text-gray-800">
                    {horarios[0]?.docente_nombre || 'Docente'}
                  </span>
                </p>
              )}
            </div>

            {/* Leyenda de Colores */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 bg-blue-100 border border-blue-400 rounded"></span>
                <span className="text-gray-600">Clase / Asignatura</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 bg-amber-100 border border-amber-400 rounded"></span>
                <span className="text-gray-600">Labor Administrativa</span>
              </div>
            </div>
          </div>

          {/* Componente Grilla */}
          <MallaHoraria horarios={horarios} />
        </section>
      </main>
    </div>
  );
}