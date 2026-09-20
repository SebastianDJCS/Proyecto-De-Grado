import React, { useState, useEffect } from 'react';
import { Layers, Plus, Search, X, Edit2, Trash2, Users, BookOpen } from 'lucide-react';
import GrupoForm from '../components/forms/GrupoForm';
import { getGrupos, deleteGrupo, getAsignaturas } from '../services/api';

export default function Grupos() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [grupos, setGrupos] = useState([]);
  const [asignaturas, setAsignaturas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [grupoAEditar, setGrupoAEditar] = useState(null);

  const fetchData = async () => {
    try {
      setLoadingList(true);
      const [g, a] = await Promise.all([getGrupos(), getAsignaturas()]);
      setGrupos(g);
      setAsignaturas(a);
    } catch (error) {
      console.error('Error al obtener datos:', error);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    setGrupoAEditar(null);
    fetchData();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este grupo?')) {
      try {
        await deleteGrupo(id);
        fetchData();
      } catch (error) {
        console.error('Error al eliminar:', error);
        alert('No se pudo eliminar el grupo.');
      }
    }
  };

  const getAsignaturaNombre = (asignaturaId) => {
    const asig = asignaturas.find((a) => a.id === asignaturaId);
    return asig ? asig.nombre : 'Desconocida';
  };

  const gruposFiltrados = grupos.filter((g) => {
    const nombreAsig = getAsignaturaNombre(g.asignatura_id).toLowerCase();
    return (
      nombreAsig.includes(busqueda.toLowerCase()) ||
      String(g.numero_grupo).includes(busqueda)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <Layers className="text-orange-600 w-7 h-7" />
            Grupos Proyectados
          </h1>
          <p className="text-sm text-gray-500 mt-1">Administra los grupos proyectados por asignatura.</p>
        </div>
        <button
          onClick={() => { setGrupoAEditar(null); setIsModalOpen(true); }}
          className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm shadow transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nuevo Grupo
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por asignatura o número de grupo..."
            className="w-full p-2.5 pl-10 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
        {loadingList ? (
          <div className="text-center py-12 text-gray-400 text-sm">Cargando grupos...</div>
        ) : gruposFiltrados.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No hay grupos registrados.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gruposFiltrados.map((grupo) => (
              <div key={grupo.id} className="p-5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-orange-50/30 transition-all shadow-xs flex flex-col justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Grupo {grupo.numero_grupo}</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                    <BookOpen className="w-3.5 h-3.5 text-gray-400" /> {getAsignaturaNombre(grupo.asignatura_id)}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-blue-50 rounded-lg p-2">
                    <p className="text-xs text-blue-600">Inscritos</p>
                    <p className="font-bold text-blue-800">{grupo.total_inscritos}</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-2">
                    <p className="text-xs text-amber-600">Repitentes</p>
                    <p className="font-bold text-amber-800">{grupo.total_repitentes}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <p className="text-xs text-green-600">Total</p>
                    <p className="font-bold text-green-800">{grupo.total_estudiantes}</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-200/60 flex items-center justify-end gap-1">
                  <button onClick={() => { setGrupoAEditar(grupo); setIsModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer" title="Editar">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(grupo.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            <button onClick={() => { setIsModalOpen(false); setGrupoAEditar(null); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-all z-10 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div className="max-h-[90vh] overflow-y-auto p-2">
              <GrupoForm grupoToEdit={grupoAEditar} asignaturas={asignaturas} onSuccess={handleFormSuccess} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
