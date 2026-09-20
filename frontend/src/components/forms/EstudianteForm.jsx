import React, { useState } from 'react';
import { GraduationCap, Save, Loader2 } from 'lucide-react';
import { createEstudiante, updateEstudiante } from '../../services/api';

export default function EstudianteForm({ estudianteToEdit, onSuccess }) {
  const [formData, setFormData] = useState(
    estudianteToEdit || {
      documento: '',
      nombre: '',
      email: '',
      password: '',
      semestre_actual: 1,
    }
  );
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ texto: '', tipo: '' });

    try {
      const payload = {
        documento: formData.documento,
        nombre: formData.nombre,
        email: formData.email || null,
        password: formData.password || 'cambiar123',
        semestre_actual: parseInt(formData.semestre_actual, 10) || 1,
        rol: 'estudiante',
      };

      if (estudianteToEdit && !formData.password) {
        delete payload.password;
      }

      if (estudianteToEdit) {
        await updateEstudiante(estudianteToEdit.id, payload);
        setMensaje({ texto: 'Estudiante actualizado con exito!', tipo: 'success' });
      } else {
        await createEstudiante(payload);
        setMensaje({ texto: 'Estudiante registrado con exito!', tipo: 'success' });
      }

      if (onSuccess) setTimeout(() => onSuccess(), 500);
    } catch (error) {
      console.error(error);
      setMensaje({ texto: error.response?.data?.detail || 'Hubo un error al procesar el estudiante.', tipo: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="bg-orange-100 p-3 rounded-xl text-orange-600">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {estudianteToEdit ? 'Editar Estudiante' : 'Registrar Nuevo Estudiante'}
          </h2>
          <p className="text-sm text-gray-500">
            {estudianteToEdit ? `Modificando a ${estudianteToEdit.nombre}` : 'Anade un nuevo estudiante a la plataforma.'}
          </p>
        </div>
      </div>

      {mensaje.texto && (
        <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${
          mensaje.tipo === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Documento</label>
          <input type="text" name="documento" value={formData.documento} onChange={handleChange} required placeholder="Ej. 1098765432"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre Completo</label>
          <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required placeholder="Ej. Juan Perez"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Email (opcional)</label>
          <input type="email" name="email" value={formData.email || ''} onChange={handleChange} placeholder="Ej. juan@email.com"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {estudianteToEdit ? 'Nueva Contrasena (vacio = no cambiar)' : 'Contrasena'}
            </label>
            <input type="password" name="password" value={formData.password || ''} onChange={handleChange}
              required={!estudianteToEdit} placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Semestre Actual</label>
            <input type="number" name="semestre_actual" value={formData.semestre_actual} onChange={handleChange} required min="1" max="12"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all" />
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-orange-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>{estudianteToEdit ? 'Actualizar Estudiante' : 'Guardar Estudiante'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
