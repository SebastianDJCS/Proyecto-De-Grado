import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { MallaHoraria } from './MallaHoraria';
import { Alert, Button, Modal } from './ui';
import { descargarMallaPdfArchivo } from '../services/api';

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
}) {
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState(null);

  const handleExportar = async () => {
    setDescargando(true);
    setError(null);

    try {
      await descargarMallaPdfArchivo(
        {
          horarios,
          titulo,
          subtitulo: subtitulo || null,
          nombre_archivo: etiquetaArchivo,
        },
        `${nombreArchivo(etiquetaArchivo)}.pdf`
      );
    } catch (err) {
      setError(err.message || 'No se pudo generar el PDF.');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-6xl">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-line px-6 py-4 pr-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-800">
            Malla horaria
          </p>
          <h2 className="mt-1 font-serif text-2xl text-ink">{titulo}</h2>
          {subtitulo && <p className="mt-1 text-sm text-muted">{subtitulo}</p>}

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

        <div className="min-h-0 flex-1 px-6 py-4">
          {horarios.length === 0 ? (
            <p className="py-16 text-center text-sm text-faint">
              No hay horarios para mostrar.
            </p>
          ) : (
            <MallaHoraria horarios={horarios} className="max-h-[62vh] overflow-y-auto" />
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-line px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
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
            <Button
              onClick={handleExportar}
              disabled={descargando || horarios.length === 0}
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
