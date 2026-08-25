import React, { useState, useEffect } from 'react';
import { DoorOpen, Plus, Search, X, Building, Users, Edit2, Trash2 } from 'lucide-react';
import SalonForm from '../components/forms/SalonForm';
import { getSalones, deleteSalon } from '../services/api';

export default function Salones() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [salones, setSalones] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [salonAEditar, setSalonAEditar] = useState(null); // Estado para saber qué salón se va a editar

  // Función para obtener los salones del backend
  const fetchSalones = async () => {
    try {
      setLoadingList(true);
      const data = await getSalones();
      setSalones(data);
    } catch (error) {
      console.error('Error al obtener los salones:', error);
    } finally {
      setLoadingList(false);
    }
  };

  // Cargar salones al abrir la página
  useEffect(() => {
    fetchSalones();
  }, []);

  // Función que se ejecuta cuando se crea o edita un salón con éxito
  const handleFormSuccess = () => {
    setIsModalOpen(false); // Cierra el modal
    setSalonAEditar(null); // Limpia la selección de edición
    setSalones([]); // Limpia la lista de salones
    fetchSalones(); // Recarga la lista de abajo automáticamente
  };

  // Abrir modal para crear nuevo salón
  const handleOpenCreate = () => {
    setSalonAEditar(null);
    setIsModalOpen(true);
  };

  // Abrir modal para editar un salón existente
  const handleOpenEdit = (salon) => {
    setSalonAEditar(salon);
    setIsModalOpen(true);
  };

  // Función para eliminar un salón
  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este salón?')) {
      try {
        await deleteSalon(id);
        fetchSalones(); // Recarga la lista tras eliminar
      } catch (error) {
        console.error('Error al eliminar el salón:', error);
        alert('No se pudo eliminar el salón.');
      }
    }
  };

  // Filtrar salones según el buscador
  const salonesFiltrados = salones.filter(
    (salon) =>
      salon.sede.toLowerCase().includes(busqueda.toLowerCase()) ||
      salon.nomenclatura.toLowerCase().includes(busqueda.toLowerCase()) ||
      (salon.nombre && salon.nombre.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Cabecera de la sección */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <DoorOpen className="text-orange-600 w-7 h-7" />
            Salones y Espacios
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Administra la capacidad de los espacios físicos, laboratorios y aulas disponibles.
          </p>
        </div>

        <button 
          onClick={handleOpenCreate}
          className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm shadow transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nuevo Salón
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por sede, nomenclatura o nombre..."
            className="w-full p-2.5 pl-10 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
        </div>
      </div>

      {/* Lista / Tarjetas de Salones */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
        {loadingList ? (
          <div className="text-center py-12 text-gray-400 text-sm">Cargando salones desde la base de datos...</div>
        ) : salonesFiltrados.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            No hay salones registrados o no coinciden con la búsqueda.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {salonesFiltrados.map((salon) => (
              <div 
                key={salon.id} 
                className="p-5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-orange-50/30 transition-all shadow-xs flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wide">
                      {salon.tipo}
                    </span>
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {salon.capacidad} est.
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900">{salon.nomenclatura}</h3>
                  {salon.nombre && (
                    <p className="text-xs font-medium text-gray-600 mt-0.5">{salon.nombre}</p>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Building className="w-3.5 h-3.5 text-gray-400" />
                    <span>Sede: <strong className="text-gray-700">{salon.sede}</strong></span>
                  </div>

                  {/* Botones de Editar y Eliminar */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(salon)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                      title="Editar salón"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(salon.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="Eliminar salón"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VENTANA MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setSalonAEditar(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-all z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="max-h-[90vh] overflow-y-auto p-2">
              <SalonForm 
                salonToEdit={salonAEditar} 
                onSuccess={handleFormSuccess} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}