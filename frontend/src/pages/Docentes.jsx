import React from 'react';
import { Users, Plus, Search } from 'lucide-react';

export default function Docentes() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Cabecera de la sección */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <Users className="text-orange-600 w-7 h-7" />
            Gestión de Docentes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Administra la planta docente, contratos y disponibilidades horarias.
          </p>
        </div>

        <button className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm shadow transition flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Docente
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar por nombre o cédula..."
            className="w-full p-2.5 pl-10 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
        </div>
      </div>

      {/* Tabla de registros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-8 text-center">
        <p className="text-gray-500 text-sm">
          Vista de docentes cargada correctamente. Aquí mostraremos la tabla conectada al backend.
        </p>
      </div>
    </div>
  );
}