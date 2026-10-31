import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Users, BookOpen } from 'lucide-react';
import DocenteForm from '../components/forms/DocenteForm';
import { getDocentes, deleteDocente, getAsignaturas } from '../services/api';
import { PageHeader, Button, IconButton, Badge, EmptyState, Modal, fieldClass } from '../components/ui';

const iniciales = (nombre = '') =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();

export default function Docentes() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [docentes, setDocentes] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [docenteAEditar, setDocenteAEditar] = useState(null);

  useEffect(() => {
    getAsignaturas()
      .then((data) => setCatalogo(data))
      .catch((err) => console.error('Error al obtener asignaturas:', err));
  }, []);

  const fetchDocentes = async () => {
    try {
      setLoadingList(true);
      const data = await getDocentes();
      setDocentes(data);
    } catch (error) {
      console.error('Error al obtener los docentes:', error);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    let activo = true;
    getDocentes()
      .then((data) => {
        if (activo) {
          setDocentes(data);
          setLoadingList(false);
        }
      })
      .catch((error) => {
        console.error('Error al obtener los docentes:', error);
        if (activo) setLoadingList(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    setDocenteAEditar(null);
    fetchDocentes();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este docente?')) {
      try {
        await deleteDocente(id);
        fetchDocentes();
      } catch (error) {
        console.error('Error al eliminar:', error);
        alert('No se pudo eliminar el docente.');
      }
    }
  };

  const docentesFiltrados = docentes.filter(
    (doc) =>
      doc.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      doc.documento.includes(busqueda)
  );

  const abrirCrear = () => {
    setDocenteAEditar(null);
    setIsModalOpen(true);
  };

  const abrirEditar = (doc) => {
    setDocenteAEditar(doc);
    setIsModalOpen(true);
  };

  const materiasDe = (doc) => {
    if ((doc.asignatura_ids || []).length === 0) return null;
    return doc.asignatura_ids.map((asigId) => {
      const asig = catalogo.find((a) => a.id === asigId);
      return (
        <Badge key={asigId} tone="brand">
          <BookOpen className="h-2.5 w-2.5" />
          {asig ? asig.nombre : `Materia #${asigId}`}
        </Badge>
      );
    });
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        kicker="Administración académica"
        title="Docentes"
        description="Administra el profesorado activo, su carga máxima y las materias que puede dictar."
        actions={
          <Button onClick={abrirCrear}>
            <Plus className="h-4 w-4" />
            Nuevo docente
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o documento"
            className={`${fieldClass} pl-9`}
          />
        </div>
        <p className="text-xs text-muted">
          <span className="tabular font-semibold text-ink">{docentesFiltrados.length}</span> de{' '}
          <span className="tabular">{docentes.length}</span> registros
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {loadingList ? (
          <div className="px-5 py-12 text-center text-sm text-muted">Cargando docentes…</div>
        ) : docentesFiltrados.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No hay docentes registrados"
            description="Agrega un docente para empezar a asignar materias y disponibilidad."
          />
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-canvas/70">
                  <tr className="text-[10px] uppercase tracking-[0.14em] text-muted">
                    <th className="px-4 py-3 font-semibold">Docente</th>
                    <th className="px-4 py-3 font-semibold">Materias</th>
                    <th className="px-4 py-3 text-right font-semibold">Horas máx.</th>
                    <th className="px-4 py-3 text-right font-semibold">Admin.</th>
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {docentesFiltrados.map((doc) => (
                    <tr key={doc.id} className="transition-colors hover:bg-canvas/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-line bg-canvas text-xs font-semibold text-muted">
                            {iniciales(doc.nombre)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink">{doc.nombre}</p>
                            <p className="tabular text-xs text-muted">Doc. {doc.documento}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-md flex-wrap gap-1">
                          {materiasDe(doc) ?? (
                            <span className="text-xs italic text-faint">Sin materias asignadas</span>
                          )}
                        </div>
                      </td>
                      <td className="tabular px-4 py-3 text-right text-ink">{doc.horas_maximas}h</td>
                      <td className="tabular px-4 py-3 text-right text-muted">{doc.horas_administrativas}h</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <IconButton label="Editar docente" onClick={() => abrirEditar(doc)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </IconButton>
                          <IconButton label="Eliminar docente" tone="danger" onClick={() => handleDelete(doc.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-line md:hidden">
              {docentesFiltrados.map((doc) => (
                <li key={doc.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-line bg-canvas text-xs font-semibold text-muted">
                        {iniciales(doc.nombre)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{doc.nombre}</p>
                        <p className="tabular text-xs text-muted">Doc. {doc.documento}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <IconButton label="Editar docente" onClick={() => abrirEditar(doc)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton label="Eliminar docente" tone="danger" onClick={() => handleDelete(doc.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {materiasDe(doc) ?? (
                      <span className="text-xs italic text-faint">Sin materias asignadas</span>
                    )}
                  </div>
                  <div className="mt-3 flex gap-4 border-t border-line pt-2.5 text-xs text-muted">
                    <span className="tabular">Máx. <strong className="font-semibold text-ink">{doc.horas_maximas}h</strong></span>
                    <span className="tabular">Admin. <strong className="font-semibold text-ink">{doc.horas_administrativas}h</strong></span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <Modal open={isModalOpen} onClose={() => { setIsModalOpen(false); setDocenteAEditar(null); }}>
        <DocenteForm docenteToEdit={docenteAEditar} onSuccess={handleFormSuccess} />
      </Modal>
    </div>
  );
}
