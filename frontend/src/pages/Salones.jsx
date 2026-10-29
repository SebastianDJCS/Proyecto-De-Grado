import { useState, useEffect } from 'react';
import { DoorOpen, Plus, Search, Building, Users, Edit2, Trash2 } from 'lucide-react';
import SalonForm from '../components/forms/SalonForm';
import { getSalones, deleteSalon } from '../services/api';
import { PageHeader, Button, IconButton, Badge, EmptyState, Modal, fieldClass } from '../components/ui';

export default function Salones() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [salones, setSalones] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [salonAEditar, setSalonAEditar] = useState(null);

  const fetchSalones = async () => {
    try {
      setLoadingList(true);
      const data = await getSalones();
      setSalones(data);
    } catch (error) {
      console.error('Error al obtener los salones:', error);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    let activo = true;
    getSalones()
      .then((data) => {
        if (activo) {
          setSalones(data);
          setLoadingList(false);
        }
      })
      .catch((error) => {
        console.error('Error al obtener los salones:', error);
        if (activo) setLoadingList(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    setSalonAEditar(null);
    setSalones([]);
    fetchSalones();
  };

  const handleOpenCreate = () => {
    setSalonAEditar(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (salon) => {
    setSalonAEditar(salon);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este salón?')) {
      try {
        await deleteSalon(id);
        fetchSalones();
      } catch (error) {
        console.error('Error al eliminar el salón:', error);
        alert('No se pudo eliminar el salón.');
      }
    }
  };

  const salonesFiltrados = salones.filter(
    (salon) =>
      salon.sede.toLowerCase().includes(busqueda.toLowerCase()) ||
      salon.nomenclatura.toLowerCase().includes(busqueda.toLowerCase()) ||
      (salon.nombre && salon.nombre.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        kicker="Infraestructura"
        title="Salones y espacios"
        description="Administra las aulas, laboratorios y auditorios disponibles, su sede y capacidad."
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" />
            Nuevo salón
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
            placeholder="Buscar por sede, nomenclatura o nombre"
            className={`${fieldClass} pl-9`}
          />
        </div>
        <p className="text-xs text-muted">
          <span className="tabular font-semibold text-ink">{salonesFiltrados.length}</span> de{' '}
          <span className="tabular">{salones.length}</span> espacios
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {loadingList ? (
          <div className="px-5 py-12 text-center text-sm text-muted">Cargando salones…</div>
        ) : salonesFiltrados.length === 0 ? (
          <EmptyState
            icon={DoorOpen}
            title="No hay salones registrados"
            description="Registra el primer espacio para que el motor pueda asignar clases."
          />
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-canvas/70">
                  <tr className="text-[10px] uppercase tracking-[0.14em] text-muted">
                    <th className="px-4 py-3 font-semibold">Espacio</th>
                    <th className="px-4 py-3 font-semibold">Tipo</th>
                    <th className="px-4 py-3 font-semibold">Sede</th>
                    <th className="px-4 py-3 text-right font-semibold">Capacidad</th>
                    <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {salonesFiltrados.map((salon) => (
                    <tr key={salon.id} className="transition-colors hover:bg-canvas/60">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{salon.nomenclatura}</p>
                        {salon.nombre && <p className="text-xs text-muted">{salon.nombre}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={salon.tipo === 'LABORATORIO' ? 'brand' : 'neutral'}>
                          {salon.tipo}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-faint" />
                          {salon.sede}
                        </span>
                      </td>
                      <td className="tabular px-4 py-3 text-right text-ink">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-faint" />
                          {salon.capacidad}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <IconButton label="Editar salón" onClick={() => handleOpenEdit(salon)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </IconButton>
                          <IconButton label="Eliminar salón" tone="danger" onClick={() => handleDelete(salon.id)}>
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
              {salonesFiltrados.map((salon) => (
                <li key={salon.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-ink">{salon.nomenclatura}</p>
                        <Badge tone={salon.tipo === 'LABORATORIO' ? 'brand' : 'neutral'}>
                          {salon.tipo}
                        </Badge>
                      </div>
                      {salon.nombre && <p className="mt-0.5 truncate text-xs text-muted">{salon.nombre}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <IconButton label="Editar salón" onClick={() => handleOpenEdit(salon)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton label="Eliminar salón" tone="danger" onClick={() => handleDelete(salon.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-4 border-t border-line pt-2.5 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-faint" /> {salon.sede}
                    </span>
                    <span className="tabular inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-faint" /> {salon.capacidad} est.
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <Modal open={isModalOpen} onClose={() => { setIsModalOpen(false); setSalonAEditar(null); }}>
        <SalonForm salonToEdit={salonAEditar} onSuccess={handleFormSuccess} />
      </Modal>
    </div>
  );
}
