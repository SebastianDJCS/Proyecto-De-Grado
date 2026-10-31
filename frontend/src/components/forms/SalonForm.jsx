import { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { createSalon, updateSalon } from '../../services/api';
import { Alert, fieldClass, labelClass } from '../ui';

export default function SalonForm({ salonToEdit, onSuccess }) {
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
        await updateSalon(salonToEdit.id, {
          sede: formData.sede,
          nomenclatura: formData.nomenclatura,
          capacidad: parseInt(formData.capacidad, 10),
          nombre: formData.nombre && formData.nombre.trim() === '' ? null : formData.nombre,
          tipo: formData.tipo,
        });
        setMensaje({ texto: '¡Salón actualizado con éxito!', tipo: 'success' });
      } else {
        await createSalon({
          sede: formData.sede,
          nomenclatura: formData.nomenclatura,
          capacidad: parseInt(formData.capacidad, 10),
          nombre: formData.nombre && formData.nombre.trim() === '' ? null : formData.nombre,
          tipo: formData.tipo,
        });
        setMensaje({ texto: '¡Salón creado y guardado con éxito!', tipo: 'success' });
      }

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
    <div className="p-6 sm:p-8">
      <div className="mb-6 border-b border-line pb-5 pr-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
          {salonToEdit ? 'Edición' : 'Registro'}
        </p>
        <h2 className="mt-1 font-serif text-2xl text-ink">
          {salonToEdit ? 'Editar salón' : 'Nuevo salón'}
        </h2>
        <p className="mt-1.5 text-sm text-muted">
          {salonToEdit
            ? `Modificando la información de ${salonToEdit.nomenclatura}.`
            : 'Añade espacios físicos según la sede y nomenclatura.'}
        </p>
      </div>

      {mensaje.texto && (
        <Alert tone={mensaje.tipo === 'success' ? 'success' : 'danger'} className="mb-5">
          {mensaje.texto}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="salon-sede" className={labelClass}>Sede</label>
            <input
              id="salon-sede"
              type="text"
              name="sede"
              value={formData.sede}
              onChange={handleChange}
              required
              placeholder="Ej. Rafael Núñez"
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="salon-nomenclatura" className={labelClass}>Nomenclatura</label>
            <input
              id="salon-nomenclatura"
              type="text"
              name="nomenclatura"
              value={formData.nomenclatura}
              onChange={handleChange}
              required
              placeholder="Ej. A-103 o LAB-01"
              className={fieldClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="salon-capacidad" className={labelClass}>Capacidad</label>
            <input
              id="salon-capacidad"
              type="number"
              name="capacidad"
              value={formData.capacidad}
              onChange={handleChange}
              required
              min="1"
              placeholder="Ej. 30"
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="salon-tipo" className={labelClass}>Tipo de espacio</label>
            <select
              id="salon-tipo"
              name="tipo"
              value={formData.tipo}
              onChange={handleChange}
              className={fieldClass}
            >
              <option value="AULA">AULA</option>
              <option value="LABORATORIO">LABORATORIO</option>
              <option value="AUDITORIO">AUDITORIO</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="salon-nombre" className={`${labelClass} flex items-center gap-1`}>
            Nombre descriptivo <span className="font-normal normal-case tracking-normal text-faint">(opcional)</span>
          </label>
          <input
            id="salon-nombre"
            type="text"
            name="nombre"
            value={formData.nombre || ''}
            onChange={handleChange}
            placeholder="Ej. Laboratorio de Cómputo"
            className={fieldClass}
          />
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
              <span>{salonToEdit ? 'Actualizar salón' : 'Guardar salón'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
