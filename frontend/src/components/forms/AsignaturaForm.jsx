import React, { useState } from 'react';
import { BookOpen, Save, Loader2 } from 'lucide-react';
import { createAsignatura, updateAsignatura } from '../../services/api';

export default function AsignaturaForm({ asignaturaToEdit, onSuccess }) {
  const [formData, setFormData] = useState(
    asignaturaToEdit || {
      codigo_uccd: '',
      nombre: '',
      semestre: '',
      creditos: '',
      horas_semanales: '',
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
      const payload = {
        ...formData,
        semestre: parseInt(formData.semestre, 10) || 1,
        creditos: parseInt(formData.creditos, 10) || 0,
        horas_semanales: parseInt(formData.horas_semanales, 10) || 0,
      };

      if (asignaturaToEdit) {
        await updateAsignatura(asignaturaToEdit.id, payload);
        setMensaje({ texto: '¡Asignatura actualizada con éxito!', tipo: 'success' });
      } else {
        await createAsignatura(payload);
        setMensaje({ texto: '¡Asignatura registrada con éxito!', tipo: 'success' });
      }

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 500);
      }
    } catch (error) {
      console.error(error);
      setMensaje({ texto: 'Hubo un error al procesar la asignatura en el backend.', tipo: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="bg-orange-100 p-3 rounded-xl text-orange-600">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {asignaturaToEdit ? 'Editar Asignatura' : 'Registrar Nueva Asignatura'}
          </h2>
          <p className="text-sm text-gray-500">
            {asignaturaToEdit ? `Modificando ${asignaturaToEdit.nombre}` : 'Añade materias correspondientes al plan de estudio.'}
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
          <label className="block text-sm font-semibold text-gray-700 mb-1">Código UCCD</label>
          <input
            type="text"
            name="codigo_uccd"
            value={formData.codigo_uccd}
            onChange={handleChange}
            required
            placeholder="Ej. MAT-101"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre de la Asignatura</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            placeholder="Ej. Cálculo I"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Semestre</label>
            <input
              type="number"
              name="semestre"
              value={formData.semestre}
              onChange={handleChange}
              required
              placeholder="Ej. 1"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Créditos</label>
            <input
              type="number"
              name="creditos"
              value={formData.creditos}
              onChange={handleChange}
              required
              placeholder="Ej. 4"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">H. Semanales</label>
            <input
              type="number"
              name="horas_semanales"
              value={formData.horas_semanales}
              onChange={handleChange}
              required
              placeholder="Ej. 4"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-orange-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>{asignaturaToEdit ? 'Actualizar Asignatura' : 'Guardar Asignatura'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}