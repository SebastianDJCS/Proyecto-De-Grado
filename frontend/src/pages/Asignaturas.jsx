import { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, Edit2, Trash2 } from 'lucide-react';
import AsignaturaForm from '../components/forms/AsignaturaForm';
import { getAsignaturas, deleteAsignatura } from '../services/api';
import { PageHeader, Button, IconButton, Badge, EmptyState, Modal, fieldClass } from '../components/ui';

export default function Asignaturas() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [asignaturas, setAsignaturas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [asignaturaAEditar, setAsignaturaAEditar] = useState(null);

  const fetchAsignaturas = async () => {
    try {
      setLoadingList(true);
      const data = await getAsignaturas();
      setAsignaturas(data);
    } catch (error) {
      console.error('Error al obtener las asignaturas:', error);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    let activo = true;
    getAsignaturas()
      .then((data) => {
        if (activo) {
          setAsignaturas(data);
          setLoadingList(false);
        }
      })
      .catch((error) => {
        console.error('Error al obtener las asignaturas:', error);
        if (activo) setLoadingList(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    setAsignaturaAEditar(null);
    fetchAsignaturas();
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta asignatura?')) {
      try {
        await deleteAsignatura(id);
        fetchAsignaturas();
      } catch (error) {
        console.error('Error al eliminar:', error);
        alert('No se pudo eliminar la asignatura.');
      }
    }
  };

  const asignaturasFiltradas = asignaturas.filter(
    (asig) =>
      asig.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      asig.codigo_uccd.toLowerCase().includes(busqueda.toLowerCase())
  );

  const abrirCrear = () => {
    setAsignaturaAEditar(null);
    setIsModalOpen(true);
  };

  const abrirEditar = (asig) => {
    setAsignaturaAEditar(asig);
    setIsModalOpen(true);
  };

  const etiquetas = (asig) => (
    <div className="mt-1.5 flex flex-wrap gap-1">
      <Badge tone={asig.tipo === 'ELECTIVA' ? 'warning' : 'neutral'}>
        {asig.tipo === 'ELECTIVA' ? 'Electiva' : 'Fundamental'}
      </Badge>
      {asig.seleccionable && <Badge tone="success">Disponible para estudiantes</Badge>}
    </div>
  );

  const carga = (asig) => (
    <div className="text-xs text-muted">
      <p className="tabular">
        <strong className="font-semibold text-ink">{asig.secciones ?? 0}</strong> grupo(s)
      </p>
      <p className="tabular">
        {asig.secciones_por_grupo ?? 1}×{asig.horas_por_seccion ?? 2}h por grupo
      </p>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        kicker="Plan de estudios"
        title="Asignaturas"
        description="Administra el catálogo de materias, créditos, grupos y horas semanales."
        actions={
          <Button onClick={abrirCrear}>
            <Plus className="h-4 w-4" />
            Nueva asignatura
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
            placeholder="Buscar por nombre o código UCCD"
            className={`${fieldClass} pl-9`}
          />
        </div>
        <p className="text-xs text-muted">
          <span className="tabular font-semibold text-ink">{asignaturasFiltradas.length}</span> de{' '}
          <span className="tabular">{asignaturas.length}</span> asignaturas
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {loadingList ? (
          <div className="px-5 py-12 text-center text-sm text-muted">Cargando asignaturas…</div>
        ) : asignaturasFiltradas.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No hay asignaturas registradas"
            description="Agrega las materias del plan de estudios para poder programar sus grupos."
          />
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-canvas/70">
                  <tr className="text-[10px] uppercase tracking-[0.14em] text-muted">
                    <th className="px-4 py-3 font-semibold">Asignatura</th>
                    <th className="px-4 py-3 text-right font-semibold">Semestre</th>
                    <th className="px-4 py-3 text-right font-semibold">Créditos</th>
                    <th className="px-4 py-3 font-semibold">Carga</th>
                    <th className="px-4 py-3 text-right font-semibold">H. semanales</th>
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {asignaturasFiltradas.map((asig) => (
                    <tr key={asig.id} className="transition-colors hover:bg-canvas/60">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <Badge tone="brand" className="mt-0.5 shrink-0 font-mono normal-case tracking-normal">
                            {asig.codigo_uccd}
                          </Badge>
                          <div className="min-w-0">
                            <p className="font-semibold text-ink">{asig.nombre}</p>
                            {etiquetas(asig)}
                          </div>
                        </div>
                      </td>
                      <td className="tabular px-4 py-3 text-right text-muted">{asig.semestre}</td>
                      <td className="tabular px-4 py-3 text-right text-ink">{asig.creditos}</td>
                      <td className="px-4 py-3">{carga(asig)}</td>
                      <td className="tabular px-4 py-3 text-right text-ink">{asig.horas_semanales}h</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <IconButton label="Editar asignatura" onClick={() => abrirEditar(asig)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </IconButton>
                          <IconButton label="Eliminar asignatura" tone="danger" onClick={() => handleDelete(asig.id)}>
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
              {asignaturasFiltradas.map((asig) => (
                <li key={asig.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="brand" className="font-mono normal-case tracking-normal">
                          {asig.codigo_uccd}
                        </Badge>
                        <p className="font-semibold text-ink">{asig.nombre}</p>
                      </div>
                      {etiquetas(asig)}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <IconButton label="Editar asignatura" onClick={() => abrirEditar(asig)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton label="Eliminar asignatura" tone="danger" onClick={() => handleDelete(asig.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3 border-t border-line pt-2.5">
                    <div className="flex gap-4 text-xs text-muted">
                      <span className="tabular">Sem. <strong className="font-semibold text-ink">{asig.semestre}</strong></span>
                      <span className="tabular"><strong className="font-semibold text-ink">{asig.creditos}</strong> créd.</span>
                      <span className="tabular"><strong className="font-semibold text-ink">{asig.horas_semanales}h</strong> sem.</span>
                    </div>
                    {carga(asig)}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <Modal open={isModalOpen} onClose={() => { setIsModalOpen(false); setAsignaturaAEditar(null); }}>
        <AsignaturaForm asignaturaToEdit={asignaturaAEditar} onSuccess={handleFormSuccess} />
      </Modal>
    </div>
  );
}
