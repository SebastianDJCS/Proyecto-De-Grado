import { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { createAsignatura, updateAsignatura } from '../../services/api';
import { Alert, fieldClass, labelClass } from '../ui';

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
    <div className="p-6 sm:p-8">
      <div className="mb-6 border-b border-line pb-5 pr-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
          {asignaturaToEdit ? 'Edición' : 'Registro'}
        </p>
        <h2 className="mt-1 font-serif text-2xl text-ink">
          {asignaturaToEdit ? 'Editar asignatura' : 'Nueva asignatura'}
        </h2>
        <p className="mt-1.5 text-sm text-muted">
          {asignaturaToEdit
            ? `Modificando ${asignaturaToEdit.nombre}.`
            : 'Añade materias correspondientes al plan de estudio.'}
        </p>
      </div>

      {mensaje.texto && (
        <Alert tone={mensaje.tipo === 'success' ? 'success' : 'danger'} className="mb-5">
          {mensaje.texto}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="asig-codigo" className={labelClass}>Código UCCD</label>
            <input
              id="asig-codigo"
              type="text"
              name="codigo_uccd"
              value={formData.codigo_uccd}
              onChange={handleChange}
              required
              placeholder="Ej. MAT-101"
              className={fieldClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="asig-nombre" className={labelClass}>Nombre</label>
            <input
              id="asig-nombre"
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              placeholder="Ej. Cálculo I"
              className={fieldClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label htmlFor="asig-semestre" className={labelClass}>Semestre</label>
            <input
              id="asig-semestre"
              type="number"
              name="semestre"
              value={formData.semestre}
              onChange={handleChange}
              required
              placeholder="1"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="asig-creditos" className={labelClass}>Créditos</label>
            <input
              id="asig-creditos"
              type="number"
              name="creditos"
              value={formData.creditos}
              onChange={handleChange}
              required
              placeholder="4"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="asig-secciones-grupo" className={labelClass}>Secciones/sem.</label>
            <input
              id="asig-secciones-grupo"
              type="number"
              name="secciones_por_grupo"
              min="1"
              max="10"
              value={formData.secciones_por_grupo ?? 1}
              onChange={handleChange}
              required
              placeholder="2"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="asig-horas-seccion" className={labelClass}>Horas/sección</label>
            <input
              id="asig-horas-seccion"
              type="number"
              name="horas_por_seccion"
              min="1"
              max="3"
              value={formData.horas_por_seccion ?? 2}
              onChange={handleChange}
              required
              placeholder="2"
              className={fieldClass}
            />
          </div>
        </div>
        <p className="-mt-1 text-[11px] text-faint">
          Sesiones semanales del grupo y duración de cada sesión (1 a 3 horas).
        </p>

        <div>
          <label htmlFor="asig-tipo" className={labelClass}>Tipo de materia</label>
          <select
            id="asig-tipo"
            name="tipo"
            value={formData.tipo || 'FUNDAMENTAL'}
            onChange={handleChange}
            className={fieldClass}
          >
            <option value="FUNDAMENTAL">Fundamental</option>
            <option value="ELECTIVA">Electiva</option>
          </select>
          <p className="mt-1.5 text-[11px] text-faint">
            En conflictos de horario del estudiante, se descarta la electiva antes que la fundamental.
          </p>
        </div>

        <div className={asignaturaToEdit ? '' : 'grid grid-cols-1 gap-4 sm:grid-cols-2'}>
          <div>
            <label htmlFor="asig-num-secciones" className={labelClass}>Número de grupos</label>
            <input
              id="asig-num-secciones"
              type="number"
              name="num_secciones"
              min={asignaturaToEdit ? 0 : 1}
              max="20"
              value={formData.num_secciones ?? 0}
              onChange={handleChange}
              required
              placeholder="2"
              className={fieldClass}
            />
            <p className="mt-1.5 text-[11px] text-faint">
              {asignaturaToEdit
                ? 'Al guardar, se agregan o eliminan grupos para igualar este número.'
                : 'Grupos de la materia (G1, G2, …).'}
            </p>
          </div>
          {!asignaturaToEdit && (
            <div>
              <label htmlFor="asig-estudiantes" className={labelClass}>Estudiantes por sección</label>
              <input
                id="asig-estudiantes"
                type="number"
                name="estudiantes_por_seccion"
                min="0"
                value={formData.estudiantes_por_seccion}
                onChange={handleChange}
                placeholder="Ej. 30"
                className={fieldClass}
              />
              <p className="mt-1.5 text-[11px] text-faint">Opcional; el Excel de UXXI lo actualiza.</p>
            </div>
          )}
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-canvas/60 p-3">
          <input
            type="checkbox"
            name="seleccionable"
            checked={!!formData.seleccionable}
            onChange={handleChange}
            className="mt-0.5 h-4 w-4 rounded-sm border-line-strong accent-brand-600"
          />
          <span className="text-sm text-ink">
            Disponible para que los estudiantes la elijan en <strong className="font-semibold">Mi horario</strong>
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-brand-700 bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-brand-800 hover:bg-brand-800 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Guardando…</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>{asignaturaToEdit ? 'Actualizar asignatura' : 'Guardar asignatura'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
