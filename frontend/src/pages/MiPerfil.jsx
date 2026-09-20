import React, { useState, useEffect } from 'react';
import { UserCircle, Loader2, BookOpen, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getEstudianteMaterias } from '../services/api';

export default function MiPerfil() {
  const { user } = useAuth();
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaterias = async () => {
      if (!user?.id) return;
      try {
        const data = await getEstudianteMaterias(user.id);
        setMaterias(data);
      } catch {
        setMaterias([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMaterias();
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
          <UserCircle className="text-orange-600 w-7 h-7" />
          Mi Perfil
        </h1>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <UserCircle className="w-8 h-8 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user?.nombre}</h2>
            <p className="text-sm text-gray-500">Documento: {user?.documento}</p>
            {user?.email && <p className="text-sm text-gray-400">{user.email}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-xs text-blue-600 font-medium">Semestre</p>
            <p className="text-2xl font-extrabold text-blue-800">{user?.semestre_actual}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-xs text-green-600 font-medium">Aprobadas</p>
            <p className="text-2xl font-extrabold text-green-800">{aprobadas.length}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 text-center">
            <p className="text-xs text-amber-600 font-medium">Faltantes</p>
            <p className="text-2xl font-extrabold text-amber-800">{faltantes.length}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 text-center">
            <p className="text-xs text-red-600 font-medium">Repitiendo</p>
            <p className="text-2xl font-extrabold text-red-800">{repitiendo.length}</p>
          </div>
        </div>
      </div>

      {materias.length > 0 ? (
        <div className="space-y-4">
          {aprobadas.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="flex items-center gap-2 font-bold text-green-700 mb-3">
                <CheckCircle2 className="w-5 h-5" /> Materias Aprobadas
              </h3>
              <div className="space-y-2">
                {aprobadas.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{m.asignatura_nombre}</p>
                      <p className="text-xs text-gray-500">{m.asignatura_codigo}</p>
                    </div>
                    {m.calificacion && (
                      <span className="bg-green-200 text-green-800 px-2 py-1 rounded-lg text-xs font-bold">
                        {m.calificacion}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {faltantes.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="flex items-center gap-2 font-bold text-amber-700 mb-3">
                <AlertCircle className="w-5 h-5" /> Materias Faltantes
              </h3>
              <div className="space-y-2">
                {faltantes.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{m.asignatura_nombre}</p>
                      <p className="text-xs text-gray-500">{m.asignatura_codigo}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {repitiendo.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="flex items-center gap-2 font-bold text-red-700 mb-3">
                <RefreshCw className="w-5 h-5" /> Materias Repitiendo
              </h3>
              <div className="space-y-2">
                {repitiendo.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{m.asignatura_nombre}</p>
                      <p className="text-xs text-gray-500">{m.asignatura_codigo}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No tienes materias asignadas aun.</p>
          <p className="text-xs text-gray-400 mt-1">El administrador debe asignar tus materias.</p>
        </div>
      )}
    </div>
  );
}
