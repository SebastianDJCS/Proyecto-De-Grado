import React, { useState } from 'react';
import { Layers, Save, Loader2 } from 'lucide-react';
import { createGrupo, updateGrupo } from '../../services/api';

export default function GrupoForm({ grupoToEdit, asignaturas, onSuccess }) {
  const [formData, setFormData] = useState(
    grupoToEdit || {
      asignatura_id: '',
      numero_grupo: '',
      total_inscritos: '',
      total_repitentes: '',
      total_estudiantes: '',
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
        asignatura_id: parseInt(formData.asignatura_id, 10),
        numero_grupo: parseInt(formData.numero_grupo, 10) || 0,
        total_inscritos: parseInt(formData.total_inscritos, 10) || 0,
        total_repitentes: parseInt(formData.total_repitentes, 10) || 0,
        total_estudiantes: parseInt(formData.total_estudiantes, 10) || 0,
      };

      if (grupoToEdit) {
        await updateGrupo(grupoToEdit.id, payload);
        setMensaje({ texto: '¡Grupo actualizado con éxito!', tipo: 'success' });
      } else {
        await createGrupo(payload);
        setMensaje({ texto: '¡Grupo registrado con éxito!', tipo: 'success' });
      }

      if (onSuccess) setTimeout(() => onSuccess(), 500);
    } catch (error) {
      console.error(error);
      setMensaje({ texto: 'Hubo un error al procesar el grupo.', tipo: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="bg-orange-100 p-3 rounded-xl text-orange-600">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {grupoToEdit ? 'Editar Grupo' : 'Registrar Nuevo Grupo'}
          </h2>
          <p className="text-sm text-gray-500">
            {grupoToEdit ? 'Modificando grupo existente' : 'Añade un grupo proyectado.'}
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
          <label className="block text-sm font-semibold text-gray-700 mb-1">Asignatura</label>
          <select name="asignatura_id" value={formData.asignatura_id} onChange={handleChange} required
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all bg-white">
            <option value="">Seleccionar asignatura...</option>
            {asignaturas.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre} ({a.codigo_uccd})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Número de Grupo</label>
            <input type="number" name="numero_grupo" value={formData.numero_grupo} onChange={handleChange} required placeholder="Ej. 1"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Total Estudiantes</label>
            <input type="number" name="total_estudiantes" value={formData.total_estudiantes} onChange={handleChange} required placeholder="Ej. 30"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Total Inscritos</label>
            <input type="number" name="total_inscritos" value={formData.total_inscritos} onChange={handleChange} required placeholder="Ej. 28"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Total Repitentes</label>
            <input type="number" name="total_repitentes" value={formData.total_repitentes} onChange={handleChange} required placeholder="Ej. 2"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all" />
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-orange-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /><span>Guardando...</span></>
          ) : (
            <><Save className="w-5 h-5" /><span>{grupoToEdit ? 'Actualizar Grupo' : 'Guardar Grupo'}</span></>
          )}
        </button>
      </form>
    </div>
  );
}
