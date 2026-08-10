import React from 'react';
import { BookOpen, Plus, Search } from 'lucide-react';

export default function Asignaturas() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Cabecera */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <BookOpen className="text-orange-600 w-7 h-7" />
            Asignaturas y Planes de Estudio
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona las materias, créditos académicos y las horas semanales requeridas.
          </p>
        </div>

        <button className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm shadow transition flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nueva Asignatura
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar por código o nombre de asignatura..."
            className="w-full p-2.5 pl-10 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
        </div>
      </div>

      {/* Tabla de registros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-8 text-center">
        <p className="text-gray-500 text-sm">
          Vista de asignaturas lista para conectar con el backend.
        </p>
      </div>
    </div>
  );
}