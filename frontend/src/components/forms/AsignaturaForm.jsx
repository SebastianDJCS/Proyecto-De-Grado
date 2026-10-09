import { useState } from 'react';
import { BookOpen, Save, Loader2 } from 'lucide-react';
import { createAsignatura, updateAsignatura } from '../../services/api';

export default function AsignaturaForm({ asignaturaToEdit, onSuccess }) {
  const [formData, setFormData] = useState(() =>
    asignaturaToEdit
      ? { ...asignaturaToEdit, num_secciones: asignaturaToEdit.secciones ?? 0 }
      : {
          codigo_uccd: '',
          nombre: '',
          semestre: '',
          creditos: '',
          horas_semanales: '',
          seleccionable: false,
          tipo: 'FUNDAMENTAL',
          num_secciones: 1,
          secciones_por_grupo: 1,
          horas_por_seccion: 2,
          estudiantes_por_seccion: '',
        }
  );

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ texto: '', tipo: '' });

    try {
      const seccionesGrupo = parseInt(formData.secciones_por_grupo, 10) || 1;
      const horasSeccion = Math.min(3, Math.max(1, parseInt(formData.horas_por_seccion, 10) || 2));
      const payload = {
        ...formData,
        semestre: parseInt(formData.semestre, 10) || 1,
        creditos: parseInt(formData.creditos, 10) || 0,
        horas_semanales: seccionesGrupo * horasSeccion,
        secciones_por_grupo: seccionesGrupo,
        horas_por_seccion: horasSeccion,
        seleccionable: !!formData.seleccionable,
        tipo: formData.tipo || 'FUNDAMENTAL',
        num_secciones: parseInt(formData.num_secciones, 10) || 0,
      };

      if (asignaturaToEdit) {
        delete payload.estudiantes_por_seccion;
        delete payload.secciones;
        delete payload.id;
        await updateAsignatura(asignaturaToEdit.id, payload);
        setMensaje({ texto: '¡Asignatura actualizada con éxito!', tipo: 'success' });
      } else {
        payload.estudiantes_por_seccion = parseInt(formData.estudiantes_por_seccion, 10) || 0;
        await createAsignatura(payload);
        setMensaje({ texto: '¡Asignatura registrada con sus grupos!', tipo: 'success' });
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

        <div className="grid grid-cols-2 gap-3">
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
            <label className="block text-sm font-semibold text-gray-700 mb-1">Secciones/semana</label>
            <input
              type="number"
              name="secciones_por_grupo"
              min="1"
              max="10"
              value={formData.secciones_por_grupo ?? 1}
              onChange={handleChange}
              required
              placeholder="Ej. 2"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all"
            />
            <p className="text-[11px] text-gray-400 mt-1">Sesiones semanales del grupo.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Horas por sección</label>
            <input
              type="number"
              name="horas_por_seccion"
              min="1"
              max="3"
              value={formData.horas_por_seccion ?? 2}
              onChange={handleChange}
              required
              placeholder="Ej. 2"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all"
            />
            <p className="text-[11px] text-gray-400 mt-1">Duración de cada sesión (1 a 3 horas).</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de Materia</label>
          <select
            name="tipo"
            value={formData.tipo || 'FUNDAMENTAL'}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all bg-white"
          >
            <option value="FUNDAMENTAL">Fundamental</option>
            <option value="ELECTIVA">Electiva</option>
          </select>
          <p className="text-[11px] text-gray-400 mt-1">
            En conflictos de horario del estudiante, se descarta la electiva antes que la fundamental.
          </p>
        </div>

        <div className={asignaturaToEdit ? '' : 'grid grid-cols-2 gap-3'}>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Número de grupos</label>
            <input
              type="number"
              name="num_secciones"
              min={asignaturaToEdit ? 0 : 1}
              max="20"
              value={formData.num_secciones ?? 0}
              onChange={handleChange}
              required
              placeholder="Ej. 2"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              {asignaturaToEdit
                ? 'Al guardar, se agregan o eliminan grupos para igualar este número.'
                : 'Grupos de la materia (G1, G2, ...).'}
            </p>
          </div>
          {!asignaturaToEdit && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Estudiantes por Sección</label>
              <input
                type="number"
                name="estudiantes_por_seccion"
                min="0"
                value={formData.estudiantes_por_seccion}
                onChange={handleChange}
                placeholder="Ej. 30"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all"
              />
              <p className="text-[11px] text-gray-400 mt-1">Opcional; el Excel de UXXI lo actualiza.</p>
            </div>
          )}
        </div>

        <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            name="seleccionable"
            checked={!!formData.seleccionable}
            onChange={handleChange}
            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
          />
          <span className="text-sm text-gray-700">
            Disponible para que los estudiantes la elijan en <strong>Mi Horario</strong>
          </span>
        </label>

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