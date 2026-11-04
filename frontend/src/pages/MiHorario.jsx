import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
  GraduationCap,
  Wallet,
  RefreshCw,
  Repeat,
} from 'lucide-react';
import SemestreAcordeon from '../components/SemestreAcordeon';
import { MallaHoraria } from '../components/MallaHoraria';
import {
  getAsignaturasSeleccionables,
  getCatalogoAnterior,
  getConfigEstudiante,
  getPerfilEstudiante,
  updatePerfilEstudiante,
  generarHorarioEstudiante,
} from '../services/api';
import {
  PageHeader,
  Button,
  Badge,
  Alert,
  Modal,
  fieldClass,
  labelClass,
} from '../components/ui';

const SEMESTRES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const manejarSesion = (err, navigate) => {
  if (err?.response?.status === 401) {
    navigate('/login');
    return true;
  }
  return false;
};

export default function MiHorario() {
  const navigate = useNavigate();
  const rol = localStorage.getItem('rol') || 'invitado';
  const esAdmin = rol === 'admin';

  const [perfil, setPerfil] = useState(null);
  const [materias, setMaterias] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [maxCreditos, setMaxCreditos] = useState(20);
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [acordeonAbierto, setAcordeonAbierto] = useState('actual');
  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);

  // Modal "Nuevo horario"
  const [modalAbierto, setModalAbierto] = useState(false);
  const [paso, setPaso] = useState(1);
  const [semestre, setSemestre] = useState('');
  const [repitio, setRepitio] = useState(false);
  const [catalogo, setCatalogo] = useState([]);
  const [reprobadas, setReprobadas] = useState([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState(null);

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      try {
        const [perfilData, config] = await Promise.all([
          getPerfilEstudiante(),
          getConfigEstudiante(),
        ]);
        if (!activo) return;

        setPerfil(perfilData);
        if (config?.max_creditos) setMaxCreditos(config.max_creditos);

        if (esAdmin) {
          const lista = await getAsignaturasSeleccionables();
          if (activo) {
            setMaterias(lista);
            setLoadingList(false);
          }
          return;
        }

        const sem = perfilData.semestre;
        setSemestre(sem ? String(sem) : '');
        const ids = (perfilData.materias_reprobadas || []).map((m) => m.id);
        setReprobadas(ids);
        setRepitio(ids.length > 0);
        setPaso(1);
        setModalAbierto(true);
      } catch (err) {
        if (manejarSesion(err, navigate)) return;
        console.error('Error al cargar el perfil:', err);
        if (activo) setLoadingList(false);
      }
    };

    cargar();
    return () => {
      activo = false;
    };
  }, [esAdmin, navigate]);

  const semestreActual = semestre ? parseInt(semestre, 10) : null;
  const creditosTotales = materias
    .filter((m) => seleccionadas.includes(m.id))
    .reduce((acc, m) => acc + m.creditos, 0);
  const creditosRestantes = maxCreditos - creditosTotales;
  const porcentaje = Math.min(100, Math.round((creditosTotales / maxCreditos) * 100));

  const toggleMateria = (id) => {
    setSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAcordeon = (clave) => {
    setAcordeonAbierto((prev) => (prev === clave ? null : clave));
  };

  const abrirModal = () => {
    setPaso(1);
    setErrorModal(null);
    if (perfil?.semestre) setSemestre(String(perfil.semestre));
    const ids = (perfil?.materias_reprobadas || []).map((m) => m.id);
    setReprobadas(ids);
    setRepitio(ids.length > 0);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setPaso(1);
    setErrorModal(null);
    if (materias.length === 0) setLoadingList(false);
  };

  const irAPaso2 = async () => {
    const numero = parseInt(semestre, 10);
    if (!numero) {
      setErrorModal('Selecciona tu semestre actual para continuar.');
      return;
    }

    setErrorModal(null);
    setCargandoCatalogo(true);
    try {
      const lista = await getCatalogoAnterior(numero);
      setCatalogo(lista);
      const idsValidos = new Set(lista.map((m) => m.id));
      setReprobadas((prev) => prev.filter((id) => idsValidos.has(id)));
      setPaso(2);
    } catch (err) {
      if (manejarSesion(err, navigate)) return;
      setErrorModal(
        err.response?.data?.detail || 'No se pudo cargar el catálogo de materias.'
      );
    } finally {
      setCargandoCatalogo(false);
    }
  };

  const toggleReprobada = (id) => {
    setReprobadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const confirmarNuevoHorario = async () => {
    const numero = parseInt(semestre, 10);
    if (!numero) {
      setErrorModal('Selecciona tu semestre actual para continuar.');
      return;
    }

    setGuardando(true);
    setErrorModal(null);
    try {
      const actualizado = await updatePerfilEstudiante({
        semestre: numero,
        materias_reprobadas: repitio ? reprobadas : [],
      });
      setPerfil(actualizado);
      localStorage.setItem('semestre', String(numero));

      const lista = await getAsignaturasSeleccionables(numero);
      setMaterias(lista);
      setSeleccionadas([]);
      setResultado(null);
      setError(null);
      setAcordeonAbierto('actual');
      setLoadingList(false);
      setModalAbierto(false);
      setPaso(1);
    } catch (err) {
      if (manejarSesion(err, navigate)) return;
      setErrorModal(
        err.response?.data?.detail || 'No se pudo guardar tu semestre y materias.'
      );
    } finally {
      setGuardando(false);
    }
  };

  const handleGenerar = async (e) => {
    e.preventDefault();
    if (seleccionadas.length === 0 || generando) return;

    setGenerando(true);
    setError(null);
    setResultado(null);

    try {
      const data = await generarHorarioEstudiante(seleccionadas);
      setResultado(data);
    } catch (err) {
      if (manejarSesion(err, navigate)) return;
      setError(err.response?.data?.detail || 'Ocurrió un error al generar tu horario.');
    } finally {
      setGenerando(false);
    }
  };

  // Dos fundamentales en cruce: el estudiante elige cuál conservar.
  const handleConservar = async (conservarId, descartarId) => {
    if (generando) return;
    if (!seleccionadas.includes(conservarId)) return;
    const nuevas = seleccionadas.filter((id) => id !== descartarId);
    if (nuevas.length === 0) return;

    setSeleccionadas(nuevas);
    setGenerando(true);
    setError(null);
    setResultado(null);

    try {
      const data = await generarHorarioEstudiante(nuevas);
      setResultado(data);
    } catch (err) {
      if (manejarSesion(err, navigate)) return;
      setError(err.response?.data?.detail || 'Ocurrió un error al generar tu horario.');
    } finally {
      setGenerando(false);
    }
  };

  const materiasActuales = materias.filter((m) => !m.es_reprobada);
  const materiasReprobadas = materias.filter((m) => m.es_reprobada);

  const catalogosPorSemestre = catalogo.reduce((acc, materia) => {
    if (!acc[materia.semestre]) acc[materia.semestre] = [];
    acc[materia.semestre].push(materia);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        kicker="Estudiante"
        title="Mi horario"
        description={
          perfil
            ? esAdmin
              ? 'Vista de administrador: selecciona materias para probar el generador.'
              : `${perfil.email} · Semestre ${perfil.semestre ?? 'sin definir'}`
            : 'Elige tus materias y te propondremos el mejor horario sin cruces.'
        }
        actions={
          !esAdmin && (
            <Button variant="secondary" onClick={abrirModal}>
              <RefreshCw className="h-4 w-4" />
              Nuevo horario
            </Button>
          )
        }
      />

      {!esAdmin && semestreActual && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-xs text-muted">
          <Badge tone="brand">
            <GraduationCap className="h-3 w-3" /> Semestre {semestreActual}
          </Badge>
          {materiasReprobadas.length > 0 ? (
            <Badge tone="warning">
              <Repeat className="h-3 w-3" /> {materiasReprobadas.length} materia(s) que repites
            </Badge>
          ) : (
            <span>No marcaste materias reprobadas.</span>
          )}
        </div>
      )}

      {loadingList ? (
        <div className="rounded-lg border border-line bg-surface px-5 py-16 text-center text-sm text-muted">
          {modalAbierto ? 'Configura tu semestre para ver la oferta…' : 'Cargando materias…'}
        </div>
      ) : !esAdmin && materias.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface px-5 py-16 text-center">
          <p className="text-sm font-semibold text-ink">Aún no has configurado tu horario</p>
          <p className="mt-1 text-xs text-muted">
            Indica tu semestre actual y las materias que repites para ver la oferta.
          </p>
          <Button onClick={abrirModal} className="mt-4">
            <RefreshCw className="h-4 w-4" />
            Configurar nuevo horario
          </Button>
        </div>
      ) : (
        <form onSubmit={handleGenerar} className="space-y-5">
          <div className="sticky top-0 z-10 space-y-4 rounded-lg border border-line bg-surface/95 p-4 backdrop-blur-sm sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="flex-1 lg:px-4">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.12em] text-muted">
                    <Wallet className="h-3.5 w-3.5" /> Créditos
                  </span>
                  <span
                    className={`tabular font-semibold ${
                      creditosRestantes < 0 ? 'text-red-700' : 'text-ink'
                    }`}
                  >
                    {creditosTotales} / {maxCreditos}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      creditosRestantes < 0 ? 'bg-red-600' : 'bg-brand-600'
                    }`}
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-faint">
                  Te quedan {Math.max(0, creditosRestantes)} créditos disponibles
                </p>
              </div>

              <Button
                type="submit"
                disabled={seleccionadas.length === 0 || generando}
                className="w-full shrink-0 px-5 py-2.5 lg:w-auto"
              >
                {generando ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generando…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generar mi horario
                  </>
                )}
              </Button>
            </div>

            {error && <Alert tone="danger">{error}</Alert>}
          </div>

          <div className="space-y-3">
            {materiasActuales.length > 0 && (
              <SemestreAcordeon
                semestre={semestreActual ?? 'Todas'}
                materias={materiasActuales}
                seleccionadas={seleccionadas}
                onToggle={toggleMateria}
                abierto={acordeonAbierto === 'actual'}
                onToggleAcordeon={() => toggleAcordeon('actual')}
                creditosRestantes={creditosRestantes}
              />
            )}

            {materiasReprobadas.length > 0 && (
              <SemestreAcordeon
                semestre="Repites"
                materias={materiasReprobadas}
                seleccionadas={seleccionadas}
                onToggle={toggleMateria}
                abierto={acordeonAbierto === 'repites'}
                onToggleAcordeon={() => toggleAcordeon('repites')}
                creditosRestantes={creditosRestantes}
              />
            )}
          </div>
        </form>
      )}

      {resultado && resultado.status === 'REQUIERE_SELECCION' && (
        <section className="mt-5 space-y-4 rounded-lg border border-[#e2d3a7] bg-[#fbf6e9] p-5">
          <div className="flex items-start gap-2.5 text-[#6b5518]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{resultado.mensaje}</p>
              <p className="mt-1 text-xs">
                Elige cuál de las materias en conflicto conservar para continuar:
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {resultado.pares_conflicto?.map((par, i) => (
              <div
                key={`${par.a_id}-${par.b_id}-${i}`}
                className="flex flex-col justify-between gap-3 rounded-md border border-[#e2d3a7] bg-surface p-3.5 md:flex-row md:items-center"
              >
                <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-ink">
                  {par.a}
                  <Badge tone="neutral">{par.a_tipo === 'ELECTIVA' ? 'Electiva' : 'Fundamental'}</Badge>
                  <span className="mx-1 text-[11px] uppercase text-faint">vs</span>
                  {par.b}
                  <Badge tone="neutral">{par.b_tipo === 'ELECTIVA' ? 'Electiva' : 'Fundamental'}</Badge>
                </span>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => handleConservar(par.a_id, par.b_id)}
                    className="px-3 py-1.5 text-xs"
                  >
                    Conservar {par.a}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleConservar(par.b_id, par.a_id)}
                    className="px-3 py-1.5 text-xs"
                  >
                    Conservar {par.b}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {resultado.descartadas?.length > 0 && (
            <Alert tone="warning">
              Electivas descartadas por conflicto: {resultado.descartadas.join(', ')}
            </Alert>
          )}
        </section>
      )}

      {resultado && resultado.status !== 'REQUIERE_SELECCION' && (
        <section className="mt-5 space-y-4">
          <div
            className={`flex items-start gap-2.5 rounded-lg border p-4 text-sm ${
              resultado.status === 'OK'
                ? 'border-[#c8dcc3] bg-[#eff5ec] text-[#345c30]'
                : resultado.status === 'PARCIAL'
                ? 'border-[#e2d3a7] bg-[#fbf6e9] text-[#6b5518]'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {resultado.status === 'OK' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <div>
              <p className="font-semibold">{resultado.mensaje}</p>
              {resultado.descartadas?.length > 0 && (
                <p className="mt-1 text-xs">Electivas descartadas: {resultado.descartadas.join(', ')}</p>
              )}
              {resultado.no_disponibles?.length > 0 && (
                <p className="mt-1 text-xs">Sin horario: {resultado.no_disponibles.join(', ')}</p>
              )}
              {resultado.conflictos?.length > 0 && (
                <ul className="mt-1 list-inside list-disc text-xs">
                  {resultado.conflictos.map((c, i) => (
                    <li key={i}>
                      {c.dia} {c.bloque_horario}: {c.asignaturas.join(' / ')}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {resultado.seleccion?.length > 0 && (
            <div className="flex flex-wrap gap-2 rounded-lg border border-line bg-surface p-4">
              {resultado.seleccion.map((s) => (
                <span
                  key={s.grupo_id}
                  className="rounded-sm border border-line bg-canvas px-2 py-1 text-xs text-muted"
                >
                  {s.asignatura} · Grupo {s.grupo_codigo}
                  {s.total_sesiones > 0 && ` (${s.total_sesiones} sesiones)`}
                </span>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-line bg-surface">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-serif text-xl text-ink">Malla horaria sugerida</h2>
            </div>
            <div className="p-4">
              <MallaHoraria horarios={resultado.horario} />
            </div>
          </div>
        </section>
      )}

      <Modal open={modalAbierto} onClose={cerrarModal} maxWidth="max-w-xl">
        <div className="p-6 sm:p-8">
          <div className="mb-5 border-b border-line pb-4 pr-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
              Nuevo horario
            </p>
            <h2 className="mt-1 font-serif text-2xl text-ink">
              {paso === 1 ? '¿En qué semestre estás?' : 'Materias que repites'}
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              {paso === 1
                ? 'Usaremos este semestre para mostrarte la oferta correspondiente.'
                : 'Marca las materias que reprobaste. Solo bloquearemos las materias que dependan de ellas.'}
            </p>
          </div>

          {errorModal && <Alert tone="danger" className="mb-4">{errorModal}</Alert>}

          {paso === 1 ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="semestre-nuevo" className={labelClass}>
                  Semestre actual
                </label>
                <select
                  id="semestre-nuevo"
                  value={semestre}
                  onChange={(e) => setSemestre(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">-- Selecciona --</option>
                  {SEMESTRES.map((s) => (
                    <option key={s} value={s}>
                      Semestre {s}
                    </option>
                  ))}
                </select>
                {perfil?.semestre && semestre && parseInt(semestre, 10) !== perfil.semestre && (
                  <p className="mt-1.5 text-[11px] text-[#6b5518]">
                    Se actualizará tu semestre de {perfil.semestre} a {semestre} en el sistema.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={cerrarModal}>
                  Cancelar
                </Button>
                <Button onClick={irAPaso2} disabled={cargandoCatalogo}>
                  {cargandoCatalogo ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
                    </>
                  ) : (
                    'Continuar'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant={repitio ? 'primary' : 'secondary'}
                  onClick={() => setRepitio(true)}
                  className="flex-1"
                >
                  Sí, repetí materias
                </Button>
                <Button
                  variant={!repitio ? 'primary' : 'secondary'}
                  onClick={() => setRepitio(false)}
                  className="flex-1"
                >
                  No, ninguna
                </Button>
              </div>

              {repitio && (
                <div className="max-h-80 space-y-4 overflow-y-auto rounded-md border border-line bg-canvas/40 p-3">
                  {Object.keys(catalogosPorSemestre).length === 0 ? (
                    <p className="py-6 text-center text-sm text-faint">
                      No hay materias de semestres anteriores a {semestre}.
                    </p>
                  ) : (
                    Object.entries(catalogosPorSemestre)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([numero, lista]) => (
                        <div key={numero}>
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                            Semestre {numero}
                          </p>
                          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {lista.map((materia) => {
                              const activa = reprobadas.includes(materia.id);
                              return (
                                <label
                                  key={materia.id}
                                  className={`flex cursor-pointer items-start gap-2 rounded-md border p-2.5 text-xs transition-colors ${
                                    activa
                                      ? 'border-brand-600 bg-brand-50/70 text-ink'
                                      : 'border-line bg-surface text-muted hover:border-line-strong'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={activa}
                                    onChange={() => toggleReprobada(materia.id)}
                                    className="mt-0.5 h-3.5 w-3.5 rounded-sm border-line-strong accent-brand-600"
                                  />
                                  <span className="min-w-0">
                                    <span className="block font-mono text-[10px] uppercase text-faint">
                                      {materia.codigo_uccd}
                                    </span>
                                    <span className="block font-medium text-ink">
                                      {materia.nombre}
                                    </span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              )}

              <div className="flex justify-between gap-2 pt-2">
                <Button variant="secondary" onClick={() => setPaso(1)}>
                  Volver
                </Button>
                <Button onClick={confirmarNuevoHorario} disabled={guardando}>
                  {guardando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
                    </>
                  ) : (
                    'Guardar y ver oferta'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
