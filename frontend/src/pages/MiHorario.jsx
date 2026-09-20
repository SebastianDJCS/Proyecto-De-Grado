import React, { useState, useEffect } from 'react';
import { Calendar, Loader2, BookOpen, CheckCircle2, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getHorarioEstudiante, getEstudianteMaterias } from '../services/api';
import { MallaHoraria } from '../components/MallaHoraria';

export default function MiHorario() {
  const { user } = useAuth();
  const [horarios, setHorarios] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.documento) return;
      try {
        setLoading(true);
        const [horariosData, materiasData] = await Promise.all([
          getHorarioEstudiante(user.documento),
          getEstudianteMaterias(user.id).catch(() => []),
        ]);
        setHorarios(horariosData);
        setMaterias(materiasData);
      } catch (err) {
        setError(err.response?.data?.detail || 'Error al cargar tu horario.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const aprobadas = materias.filter((m) => m.estado === 'aprobada');
  const faltantes = materias.filter((m) => m.estado === 'faltante');
  const repitiendo = materias.filter((m) => m.estado === 'repitiendo');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <header className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <Calendar className="text-orange-600 w-8 h-8" />
          Mi Horario Optimizado
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Horario generado por el motor CP-SAT segun tus materias inscritas.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-green-50 p-5 rounded-xl border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h3 className="font-bold text-green-800">Aprobadas</h3>
          </div>
          <p className="text-3xl font-extrabold text-green-700">{aprobadas.length}</p>
          {aprobadas.length > 0 && (
            <ul className="mt-2 text-xs text-green-600 space-y-1 max-h-32 overflow-y-auto">
              {aprobadas.map((m) => (
                <li key={m.id}>{m.asignatura_nombre || m.asignatura_codigo}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-amber-50 p-5 rounded-xl border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-amber-800">Faltantes</h3>
          </div>
          <p className="text-3xl font-extrabold text-amber-700">{faltantes.length}</p>
          {faltantes.length > 0 && (
            <ul className="mt-2 text-xs text-amber-600 space-y-1 max-h-32 overflow-y-auto">
              {faltantes.map((m) => (
                <li key={m.id}>{m.asignatura_nombre || m.asignatura_codigo}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-red-50 p-5 rounded-xl border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-red-800">Repitiendo</h3>
          </div>
          <p className="text-3xl font-extrabold text-red-700">{repitiendo.length}</p>
          {repitiendo.length > 0 && (
            <ul className="mt-2 text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
              {repitiendo.map((m) => (
                <li key={m.id}>{m.asignatura_nombre || m.asignatura_codigo}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Malla Horaria Semanal</h2>
            {horarios.length > 0 && (
              <p className="text-sm text-gray-500">
                Mostrando horarios de: <span className="font-semibold text-gray-800">{user?.nombre}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 bg-orange-100 border border-orange-400 rounded"></span>
              <span className="text-gray-600">Clase / Asignatura</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 bg-amber-100 border border-amber-400 rounded"></span>
              <span className="text-gray-600">Labor Administrativa</span>
            </div>
          </div>
        </div>

        {horarios.length === 0 && !error ? (
          <div className="text-center py-12">
            <XCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay horarios asignados aun.</p>
            <p className="text-xs text-gray-400 mt-1">El administrador debe ejecutar el optimizador para generar tu horario.</p>
          </div>
        ) : (
          <MallaHoraria horarios={horarios} />
        )}
      </section>
    </div>
  );
}
