import { useEffect, useState } from 'react';
import { UserCheck, Save, Loader2, BookOpen } from 'lucide-react';
import { createDocente, updateDocente, getAsignaturas } from '../../services/api';

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
    <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="bg-orange-100 p-3 rounded-xl text-orange-600">
          <UserCheck className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {docenteToEdit ? 'Editar Docente' : 'Registrar Nuevo Docente'}
          </h2>
          <p className="text-sm text-gray-500">
            {docenteToEdit ? `Modificando a ${docenteToEdit.nombre}` : 'Añade información del personal docente.'}
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
          <input
            type="text"
            name="documento"
            value={formData.documento}
            onChange={handleChange}
            required
            placeholder="Ej. 1001"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre Completo</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            placeholder="Ej. Dr. Juan García"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Horas Máximas</label>
          <input
            type="number"
            name="horas_maximas"
            value={formData.horas_maximas}
            onChange={handleChange}
            required
            placeholder="Ej. 20"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Horas Administrativas</label>
          <input
            type="number"
            name="horas_administrativas"
            value={formData.horas_administrativas}
            onChange={handleChange}
            required
            placeholder="Ej. 4"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 text-sm transition-all"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <BookOpen className="w-4 h-4 text-orange-600" /> Materias que puede dictar
          </label>
          <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 space-y-2 max-h-48 overflow-y-auto">
            {catalogo.length === 0 ? (
              <p className="text-xs text-gray-400">No hay materias registradas todavía.</p>
            ) : (
              catalogo.map((asig) => {
                const marcada = (formData.asignatura_ids || []).includes(asig.id);
                return (
                  <label
                    key={asig.id}
                    className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={marcada}
                      onChange={() => toggleAsignatura(asig.id)}
                      className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <span className="font-mono text-[11px] text-gray-500">{asig.codigo_uccd}</span>
                    <span>{asig.nombre}</span>
                  </label>
                );
              })
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Si no marca ninguna materia, el docente no podrá dictar ninguna hasta que se le asigne.
          </p>
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
              <span>{docenteToEdit ? 'Actualizar Docente' : 'Guardar Docente'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
