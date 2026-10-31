import { useEffect, useState } from 'react';
import { Save, Loader2, BookOpen } from 'lucide-react';
import { createDocente, updateDocente, getAsignaturas } from '../../services/api';
import { Alert, fieldClass, labelClass } from '../ui';

export default function DocenteForm({ docenteToEdit, onSuccess }) {
  const [formData, setFormData] = useState(() =>
    docenteToEdit
      ? { ...docenteToEdit, asignatura_ids: docenteToEdit.asignatura_ids || [] }
      : {
          documento: '',
          nombre: '',
          horas_maximas: '',
          horas_administrativas: '',
          asignatura_ids: [],
        }
  );

  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  useEffect(() => {
    getAsignaturas()
      .then((data) => setCatalogo(data))
      .catch((err) => console.error('Error al cargar asignaturas:', err));
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const toggleAsignatura = (id) => {
    setFormData((prev) => {
      const actual = prev.asignatura_ids || [];
      return {
        ...prev,
        asignatura_ids: actual.includes(id)
          ? actual.filter((x) => x !== id)
          : [...actual, id],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ texto: '', tipo: '' });

    try {
      const payload = {
        ...formData,
        horas_maximas: parseInt(formData.horas_maximas, 10) || 0,
        horas_administrativas: parseInt(formData.horas_administrativas, 10) || 0,
        asignatura_ids: formData.asignatura_ids || [],
      };

      if (docenteToEdit) {
        await updateDocente(docenteToEdit.id, payload);
        setMensaje({ texto: '¡Docente actualizado con éxito!', tipo: 'success' });
      } else {
        await createDocente(payload);
        setMensaje({ texto: '¡Docente registrado con éxito!', tipo: 'success' });
      }

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 500);
      }
    } catch (error) {
      console.error(error);
      setMensaje({ texto: 'Hubo un error al procesar el docente en el backend.', tipo: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6 border-b border-line pb-5 pr-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
          {docenteToEdit ? 'Edición' : 'Registro'}
        </p>
        <h2 className="mt-1 font-serif text-2xl text-ink">
          {docenteToEdit ? 'Editar docente' : 'Nuevo docente'}
        </h2>
        <p className="mt-1.5 text-sm text-muted">
          {docenteToEdit
            ? `Modificando a ${docenteToEdit.nombre}.`
            : 'Añade la información del personal docente.'}
        </p>
      </div>

      {mensaje.texto && (
        <Alert tone={mensaje.tipo === 'success' ? 'success' : 'danger'} className="mb-5">
          {mensaje.texto}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="docente-documento" className={labelClass}>Documento</label>
          <input
            id="docente-documento"
            type="text"
            name="documento"
            value={formData.documento}
            onChange={handleChange}
            required
            placeholder="Ej. 1001"
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="docente-nombre" className={labelClass}>Nombre completo</label>
          <input
            id="docente-nombre"
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            placeholder="Ej. Dr. Juan García"
            className={fieldClass}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="docente-horas-maximas" className={labelClass}>Horas máximas</label>
            <input
              id="docente-horas-maximas"
              type="number"
              name="horas_maximas"
              value={formData.horas_maximas}
              onChange={handleChange}
              required
              placeholder="Ej. 20"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="docente-horas-admin" className={labelClass}>Horas administrativas</label>
            <input
              id="docente-horas-admin"
              type="number"
              name="horas_administrativas"
              value={formData.horas_administrativas}
              onChange={handleChange}
              required
              placeholder="Ej. 4"
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <p className={`${labelClass} flex items-center gap-1.5`}>
            <BookOpen className="h-3.5 w-3.5" /> Materias que puede dictar
          </p>
          <div className="max-h-48 divide-y divide-line overflow-y-auto rounded-md border border-line-strong bg-canvas/60">
            {catalogo.length === 0 ? (
              <p className="p-3 text-xs text-faint">No hay materias registradas todavía.</p>
            ) : (
              catalogo.map((asig) => {
                const marcada = (formData.asignatura_ids || []).includes(asig.id);
                return (
                  <label
                    key={asig.id}
                    className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-ink transition-colors hover:bg-surface"
                  >
                    <input
                      type="checkbox"
                      checked={marcada}
                      onChange={() => toggleAsignatura(asig.id)}
                      className="h-3.5 w-3.5 rounded-sm border-line-strong accent-brand-600"
                    />
                    <span className="font-mono text-[10px] uppercase text-muted">{asig.codigo_uccd}</span>
                    <span className="min-w-0 truncate">{asig.nombre}</span>
                  </label>
                );
              })
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-faint">
            Si no marcas ninguna materia, el docente no podrá dictar hasta que se le asigne.
          </p>
        </div>

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
              <span>{docenteToEdit ? 'Actualizar docente' : 'Guardar docente'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
