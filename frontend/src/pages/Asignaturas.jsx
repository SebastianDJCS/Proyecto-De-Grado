import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, X, Award, Layers, Clock, Edit2, Trash2 } from 'lucide-react';
import AsignaturaForm from '../components/forms/AsignaturaForm';
import { getAsignaturas, deleteAsignatura } from '../services/api';

export default function Asignaturas() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [asignaturas, setAsignaturas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [asignaturaAEditar, setAsignaturaAEditar] = useState(null);

  const fetchAsignaturas = async () => {
    try {
      setLoadingList(true);
      const data = await getAsignaturas();
      setAsignaturas(data);
    } catch (error) {
      console.error('Error al obtener las asignaturas:', error);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchAsignaturas();
  }, []);

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    setAsignaturaAEditar(null);
    fetchAsignaturas();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta asignatura?')) {
      try {
        await deleteAsignatura(id);
        fetchAsignaturas();
      } catch (error) {
        console.error('Error al eliminar:', error);
        alert('No se pudo eliminar la asignatura.');
      }
    }
  };

  const asignaturasFiltradas = asignaturas.filter(
    (asig) =>
      asig.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      asig.codigo_uccd.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <BookOpen className="text-orange-600 w-7 h-7" />
            Gestión de Asignaturas
          </h1>
          <p className="text-sm text-gray-500 mt-1">Administra el catálogo de materias, créditos y horas semanales.</p>
        </div>
        <button 
          onClick={() => { setAsignaturaAEditar(null); setIsModalOpen(true); }}
          className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm shadow transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nueva Asignatura
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o código UCCD..."
            className="w-full p-2.5 pl-10 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
        {loadingList ? (
          <div className="text-center py-12 text-gray-400 text-sm">Cargando asignaturas...</div>
        ) : asignaturasFiltradas.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No hay asignaturas registradas.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {asignaturasFiltradas.map((asig) => (
              <div key={asig.id} className="p-5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-orange-50/30 transition-all shadow-xs flex flex-col justify-between gap-4">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wide">
                      {asig.codigo_uccd}
                    </span>
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-orange-500" /> {asig.creditos} Créditos
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{asig.nombre}</h3>
                </div>

                <div className="pt-3 border-t border-gray-200/60 flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-gray-400" /> Sem: <strong className="text-gray-700">{asig.semestre}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-orange-500" /> H. Semanales: <strong className="text-gray-700">{asig.horas_semanales}h</strong>
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setAsignaturaAEditar(asig); setIsModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer" title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(asig.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <button onClick={() => { setIsModalOpen(false); setAsignaturaAEditar(null); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-all z-10 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div className="max-h-[90vh] overflow-y-auto p-2">
              <AsignaturaForm asignaturaToEdit={asignaturaAEditar} onSuccess={handleFormSuccess} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}