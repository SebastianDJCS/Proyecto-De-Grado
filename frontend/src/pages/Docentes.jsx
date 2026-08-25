import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, X, Clock, CreditCard, Edit2, Trash2, Briefcase } from 'lucide-react';
import DocenteForm from '../components/forms/DocenteForm';
import { getDocentes, deleteDocente } from '../services/api';

export default function Docentes() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [docentes, setDocentes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [docenteAEditar, setDocenteAEditar] = useState(null);

  const fetchDocentes = async () => {
    try {
      setLoadingList(true);
      const data = await getDocentes();
      setDocentes(data);
    } catch (error) {
      console.error('Error al obtener los docentes:', error);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchDocentes();
  }, []);

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    setDocenteAEditar(null);
    fetchDocentes();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este docente?')) {
      try {
        await deleteDocente(id);
        fetchDocentes();
      } catch (error) {
        console.error('Error al eliminar:', error);
        alert('No se pudo eliminar el docente.');
      }
    }
  };

  const docentesFiltrados = docentes.filter(
    (doc) =>
      doc.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      doc.documento.includes(busqueda)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <Users className="text-orange-600 w-7 h-7" />
            Gestión de Docentes
          </h1>
          <p className="text-sm text-gray-500 mt-1">Administra el profesorado activo y su disponibilidad de horas.</p>
        </div>
        <button 
          onClick={() => { setDocenteAEditar(null); setIsModalOpen(true); }}
          className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm shadow transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nuevo Docente
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o documento..."
            className="w-full p-2.5 pl-10 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
        {loadingList ? (
          <div className="text-center py-12 text-gray-400 text-sm">Cargando docentes...</div>
        ) : docentesFiltrados.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No hay docentes registrados.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {docentesFiltrados.map((doc) => (
              <div key={doc.id} className="p-5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-orange-50/30 transition-all shadow-xs flex flex-col justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{doc.nombre}</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                    <CreditCard className="w-3.5 h-3.5 text-gray-400" /> Documento: {doc.documento}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-200/60 flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-orange-500" /> Máx: <strong className="text-gray-700">{doc.horas_maximas}h</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-gray-400" /> Admin: <strong className="text-gray-700">{doc.horas_administrativas}h</strong>
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setDocenteAEditar(doc); setIsModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer" title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(doc.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer" title="Eliminar">
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
            <button onClick={() => { setIsModalOpen(false); setDocenteAEditar(null); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-all z-10 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div className="max-h-[90vh] overflow-y-auto p-2">
              <DocenteForm docenteToEdit={docenteAEditar} onSuccess={handleFormSuccess} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}