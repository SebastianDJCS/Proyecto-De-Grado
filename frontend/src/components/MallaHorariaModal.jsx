import { useEffect, useMemo, useRef, useState } from 'react';
import { FileDown, FileJson, Loader2 } from 'lucide-react';
import { MallaHoraria } from './MallaHoraria';
import { esAdminItem } from './mallaUtils';
import { Alert, Button, Modal, fieldClass, labelClass } from './ui';
import { descargarMallaPdfArchivo, guardarArchivo } from '../services/api';

// Convierte un texto en un nombre de archivo seguro.
const nombreArchivo = (texto) =>
  (texto || 'malla-horaria')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'malla-horaria';

export default function MallaHorariaModal({
  open,
  onClose,
  horarios = [],
  titulo = 'Malla horaria semanal',
  subtitulo = '',
  etiquetaArchivo = 'malla-horaria',
  mostrarFiltroSemestre = false,
  permitirExportarJson = false,
}) {
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState(null);
  const [filtroSemestre, setFiltroSemestre] = useState(null);
  const estabaAbierto = useRef(false);

  const semestresDisponibles = useMemo(() => {
    if (!mostrarFiltroSemestre) return [];
    const valores = new Set();
    horarios.forEach((h) => {
      if (!h || esAdminItem(h) || h.semestre === null || h.semestre === undefined || h.semestre === '') {
        return;
      }
      const numero = Number(h.semestre);
      if (Number.isFinite(numero)) valores.add(numero);
    });
    return [...valores].sort((a, b) => a - b);
  }, [horarios, mostrarFiltroSemestre]);

  const hayAdministrativas = useMemo(
    () => mostrarFiltroSemestre && horarios.some((h) => h && esAdminItem(h)),
    [horarios, mostrarFiltroSemestre]
  );

  useEffect(() => {
    if (!open) {
      estabaAbierto.current = false;
      return;
    }
    if (!mostrarFiltroSemestre || estabaAbierto.current) return;
    estabaAbierto.current = true;
    setFiltroSemestre(semestresDisponibles[0] ?? (hayAdministrativas ? 'admin' : null));
  }, [open, mostrarFiltroSemestre, semestresDisponibles, hayAdministrativas]);

  const horariosVisibles = useMemo(() => {
    if (!mostrarFiltroSemestre) return horarios;
    if (filtroSemestre === 'admin') return horarios.filter((h) => h && esAdminItem(h));
    if (filtroSemestre === null || filtroSemestre === undefined) return horarios;
    return horarios.filter(
      (h) =>
        h &&
        !esAdminItem(h) &&
        h.semestre !== null &&
        h.semestre !== undefined &&
        Number(h.semestre) === Number(filtroSemestre)
    );
  }, [horarios, mostrarFiltroSemestre, filtroSemestre]);

  const etiquetaSemestre =
    filtroSemestre === 'admin' ? 'Horas administrativas' : `Semestre ${filtroSemestre}`;

  const subtituloVisible =
    mostrarFiltroSemestre && filtroSemestre !== null && filtroSemestre !== undefined
      ? subtitulo
        ? `${subtitulo} · ${etiquetaSemestre}`
        : etiquetaSemestre
      : subtitulo;

  const etiquetaArchivoVisible =
    mostrarFiltroSemestre && filtroSemestre !== null && filtroSemestre !== undefined
      ? `${etiquetaArchivo}-${
          filtroSemestre === 'admin' ? 'administrativas' : `semestre-${filtroSemestre}`
        }`
      : etiquetaArchivo;

  const handleExportar = async () => {
    setDescargando(true);
    setError(null);

    try {
      await descargarMallaPdfArchivo(
        {
          horarios: horariosVisibles,
          titulo,
          subtitulo: subtituloVisible || null,
          nombre_archivo: etiquetaArchivoVisible,
        },
        `${nombreArchivo(etiquetaArchivoVisible)}.pdf`
      );
    } catch (err) {
      setError(err.message || 'No se pudo generar el PDF.');
    } finally {
      setDescargando(false);
    }
  };

  const handleExportarJson = () => {
    setError(null);

    const semestres = [
      ...new Set(
        horarios
          .filter(
            (h) =>
              h &&
              !esAdminItem(h) &&
              h.semestre !== null &&
              h.semestre !== undefined &&
              h.semestre !== ''
          )
          .map((h) => Number(h.semestre))
          .filter((n) => Number.isFinite(n))
      ),
    ].sort((a, b) => a - b);

    const contenido = {
      titulo,
      subtitulo,
      generado_en: new Date().toISOString(),
      total_bloques: horarios.length,
      semestres,
      horarios,
    };

    guardarArchivo(
      new Blob([JSON.stringify(contenido, null, 2)], { type: 'application/json' }),
      `${nombreArchivo(etiquetaArchivo)}.json`
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="max-w-7xl"
      maxHeight="max-h-[calc(100vh_-_2rem)] sm:max-h-[calc(100vh_-_4rem)]"
    >
      <div className="flex h-[calc(100vh_-_2rem)] min-h-0 flex-col sm:h-[calc(100vh_-_4rem)]">
        <div className="border-b border-line px-6 py-4 pr-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-800">
            Malla horaria
          </p>
          <h2 className="mt-1 font-serif text-2xl text-ink">{titulo}</h2>
          {subtituloVisible && <p className="mt-1 text-sm text-muted">{subtituloVisible}</p>}

          {mostrarFiltroSemestre && (semestresDisponibles.length > 0 || hayAdministrativas) && (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="shrink-0">
                <label htmlFor="filtro-semestre" className={labelClass}>
                  Semestre
                </label>
                <select
                  id="filtro-semestre"
                  value={filtroSemestre ?? ''}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setFiltroSemestre(valor === 'admin' ? 'admin' : Number(valor));
                  }}
                  className={`${fieldClass} w-28`}
                >
                  {filtroSemestre === null && <option value="">Selecciona</option>}
                  {semestresDisponibles.map((s) => (
                    <option key={s} value={s}>
                      Semestre {s}
                    </option>
                  ))}
                  {hayAdministrativas && <option value="admin">Administrativas</option>}
                </select>
              </div>

              {permitirExportarJson && (
                <Alert tone="info" className="flex-1">
                   El formato JSON solamente es para la exportación del horario global hacia otra plataforma. El PDF respeta el filtro; el JSON incluye todo el horario global.
                </Alert>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm border border-brand-300 bg-brand-100" />
              Clase / asignatura
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm border border-info-border bg-info-bg" />
              Labor administrativa
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden px-6 py-4">
          {horariosVisibles.length === 0 ? (
            <p className="py-16 text-center text-sm text-faint">
              {mostrarFiltroSemestre
                ? 'No hay horarios para el filtro seleccionado.'
                : 'No hay horarios para mostrar.'}
            </p>
          ) : (
            <MallaHoraria horarios={horariosVisibles} className="h-full overflow-y-auto" />
          )}
        </div>

        <div className="relative z-30 flex shrink-0 flex-col gap-3 border-t border-line bg-surface px-6 py-4 shadow-[0_-6px_16px_-12px_rgba(0,0,0,0.25)] sm:flex-row sm:items-center sm:justify-between">
          {error ? (
            <Alert tone="danger" className="flex-1">
              {error}
            </Alert>
          ) : (
            <p className="flex-1 text-xs text-faint">
              El PDF se genera en el servidor con el mismo formato de la malla.
            </p>
          )}

          <div className="flex shrink-0 justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
            {permitirExportarJson && (
              <Button
                variant="secondary"
                onClick={handleExportarJson}
                disabled={horarios.length === 0}
              >
                <FileJson className="h-4 w-4" />
                Exportar JSON
              </Button>
            )}
            <Button
              onClick={handleExportar}
              disabled={descargando || horariosVisibles.length === 0}
            >
              {descargando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando…
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" />
                  Exportar PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
