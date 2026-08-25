import React, { useState } from 'react';
import { DoorOpen, Save, Loader2 } from 'lucide-react';
import { createSalon, updateSalon } from '../../services/api';

export default function SalonForm({ salonToEdit, onSuccess }) {
  // Si salonToEdit existe, carga sus datos de entrada. Si no, arranca vacío.
  const [formData, setFormData] = useState(
    salonToEdit || {
      sede: '',
      nomenclatura: '',
      capacidad: '',
      nombre: '',
      tipo: 'AULA',
    }
  );

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ texto: '', tipo: '' });

    try {
      if (salonToEdit) {
        // Si estamos editando, llamamos a PUT
        await updateSalon(salonToEdit.id, {
          sede: formData.sede,
          nomenclatura: formData.nomenclatura,
          capacidad: parseInt(formData.capacidad, 10),
          nombre: formData.nombre && formData.nombre.trim() === '' ? null : formData.nombre,
          tipo: formData.tipo,
        });
        setMensaje({ texto: '¡Salón actualizado con éxito!', tipo: 'success' });
      } else {
        // Si es nuevo, llamamos a POST
        await createSalon({
          sede: formData.sede,
          nomenclatura: formData.nomenclatura,
          capacidad: parseInt(formData.capacidad, 10),
          nombre: formData.nombre && formData.nombre.trim() === '' ? null : formData.nombre,
          tipo: formData.tipo,
        });
        setMensaje({ texto: '¡Salón creado y guardado en la base de datos con éxito!', tipo: 'success' });
      }

      // Espera un momento y avisa al componente padre para cerrar y recargar
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 500);
      }
    } catch (error) {
      console.error(error);
      setMensaje({ texto: 'Hubo un error al procesar el salón en el backend.', tipo: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
      {/* Cabecera del Formulario */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="bg-orange-100 p-3 rounded-xl text-orange-600">
          <DoorOpen className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {salonToEdit ? 'Editar Salón' : 'Registrar Nuevo Salón'}
          </h2>
          <p className="text-sm text-gray-500">
            {salonToEdit 
              ? `Modificando la información de ${salonToEdit.nomenclatura}` 
              : 'Añade espacios físicos según la sede y nomenclatura.'}
          </p>
        </div>
      </div>

      {/* Alertas */}
      {mensaje.texto && (
        <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${
          mensaje.tipo === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {mensaje.texto}
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sede */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Sede
          </label>
          <input
            type="text"
            name="sede"
            value={formData.sede}
            onChange={handleChange}
            required
            placeholder="Ej. Biblioteca o Rafael Núñez"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all"
          />
        </div>

        {/* Nomenclatura */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Nomenclatura (Código)
          </label>
          <input
            type="text"
            name="nomenclatura"
            value={formData.nomenclatura}
            onChange={handleChange}
            required
            placeholder="Ej. A-103 o LAB-01"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all"
          />
        </div>

        {/* Capacidad */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Capacidad
          </label>
          <input
            type="number"
            name="capacidad"
            value={formData.capacidad}
            onChange={handleChange}
            required
            min="1"
            placeholder="Ej. 30"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all"
          />
        </div>

        {/* Nombre (Opcional) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Nombre Descriptivo <span className="text-gray-400 font-normal">(Opcional)</span>
          </label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre || ''}
            onChange={handleChange}
            placeholder="Ej. Alfa o Laboratorio de Cómputo"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all"
          />
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Tipo de Espacio
          </label>
          <select
            name="tipo"
            value={formData.tipo}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all bg-white"
          >
            <option value="AULA">AULA</option>
            <option value="LABORATORIO">LABORATORIO</option>
            <option value="AUDITORIO">AUDITORIO</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-orange-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{salonToEdit ? 'Actualizando en Neon...' : 'Guardando en Neon...'}</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>{salonToEdit ? 'Actualizar Salón' : 'Guardar Salón'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}