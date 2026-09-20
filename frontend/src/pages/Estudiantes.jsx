import React, { useState, useEffect } from 'react';
import { GraduationCap, Plus, Search, X, Upload, Edit2, Trash2, BookOpen } from 'lucide-react';
import EstudianteForm from '../components/forms/EstudianteForm';
import BulkEstudiantesForm from '../components/forms/BulkEstudiantesForm';
import { getEstudiantes, deleteEstudiante, getEstudiante } from '../services/api';

export default function Estudiantes() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [estudiantes, setEstudiantes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [estudianteAEditar, setEstudianteAEditar] = useState(null);
  const [estudianteDetalle, setEstudianteDetalle] = useState(null);

  const fetchEstudiantes = async () => {
    try {
      setLoadingList(true);
      const data = await getEstudiantes();
      setEstudiantes(data);
    } catch (error) {
      console.error('Error al obtener estudiantes:', error);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { fetchEstudiantes(); }, []);

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    setEstudianteAEditar(null);
    fetchEstudiantes();
  };

  const handleBulkSuccess = () => {
    setIsBulkOpen(false);
    fetchEstudiantes();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este estudiante?')) {
      try {
        await deleteEstudiante(id);
        fetchEstudiantes();
      } catch (error) {
        console.error('Error al eliminar:', error);
        alert('No se pudo eliminar el estudiante.');
      }
    }
  };

  const handleVerDetalle = async (id) => {
    try {
      const data = await getEstudiante(id);
      setEstudianteDetalle(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const estudiantesFiltrados = estudiantes.filter(
    (est) =>
      est.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      est.documento.includes(busqueda)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <GraduationCap className="text-orange-600 w-7 h-7" />
            Gestión de Estudiantes
          </h1>
          <p className="text-sm text-gray-500 mt-1">Administra los estudiantes inscritos en la plataforma.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsBulkOpen(true)}
            className="bg-gray-800 hover:bg-gray-900 text-white font-medium px-4 py-2.5 rounded-lg text-sm shadow transition flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" /> Carga Masiva CSV
          </button>
          <button
            onClick={() => { setEstudianteAEditar(null); setIsModalOpen(true); }}
            className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm shadow transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nuevo Estudiante
          </button>
        </div>
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
          <div className="text-center py-12 text-gray-400 text-sm">Cargando estudiantes...</div>
        ) : estudiantesFiltrados.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No hay estudiantes registrados.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {estudiantesFiltrados.map((est) => (
              <div key={est.id} className="p-5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-orange-50/30 transition-all shadow-xs flex flex-col justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{est.nombre}</h3>
                  <p className="text-xs text-gray-500 mt-1">Doc: {est.documento}</p>
                  {est.email && <p className="text-xs text-gray-400">{est.email}</p>}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-medium">
                    Semestre {est.semestre_actual}
                  </span>
                  <span className={`px-2 py-1 rounded-lg font-medium ${est.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {est.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200/60 flex items-center justify-end gap-1">
                  <button onClick={() => { setEstudianteAEditar(est); setIsModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer" title="Editar">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(est.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer" title="Eliminar">
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
            <button onClick={() => { setIsModalOpen(false); setEstudianteAEditar(null); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-all z-10 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div className="max-h-[90vh] overflow-y-auto p-2">
              <EstudianteForm estudianteToEdit={estudianteAEditar} onSuccess={handleFormSuccess} />
            </div>
          </div>
        </div>
      )}

      {isBulkOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            <button onClick={() => setIsBulkOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-all z-10 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div className="max-h-[90vh] overflow-y-auto p-2">
              <BulkEstudiantesForm onSuccess={handleBulkSuccess} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
