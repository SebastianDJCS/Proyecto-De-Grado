import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Check, Lock, Clock, Award, Repeat } from 'lucide-react';

export default function SemestreAcordeon({
  semestre,
  materias,
  seleccionadas,
  onToggle,
  abierto,
  onToggleAcordeon,
  semestreActual,
  creditosRestantes,
}) {
  const seleccionadasSet = new Set(seleccionadas);
  const seleccionadasSemestre = materias.filter((m) => seleccionadasSet.has(m.id));
  const creditosSemestre = seleccionadasSemestre.reduce((acc, m) => acc + m.creditos, 0);
  const tieneSeleccion = seleccionadasSemestre.length > 0;

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <button
        type="button"
        onClick={onToggleAcordeon}
        className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-canvas/60 sm:p-5"
      >
        <div className="flex items-center gap-3.5">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border font-serif text-lg ${
              tieneSeleccion
                ? 'border-brand-200 bg-brand-50 text-brand-800'
                : 'border-line bg-canvas text-ink'
            }`}
          >
            {semestre === 'Otros' ? '·' : semestre}
          </span>
          <div>
            <h3 className="font-semibold text-ink">
              {semestre === 'Otros' ? 'Otras materias' : `Semestre ${semestre}`}
            </h3>
            <p className="text-xs text-muted">
              {materias.length} materia(s)
              {tieneSeleccion && (
                <span className="ml-1 text-brand-700">
                  · {seleccionadasSemestre.length} elegida(s) · {creditosSemestre} créditos
                </span>
              )}
            </p>
          </div>
        </div>

        <motion.span
          animate={{ rotate: abierto ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-faint"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div
            key="contenido"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-2.5 border-t border-line px-4 py-4 md:grid-cols-2 lg:grid-cols-3 sm:px-5">
              {materias.length === 0 ? (
                <p className="col-span-full py-6 text-center text-sm text-faint">
                  No hay materias en este semestre.
                </p>
              ) : (
                materias.map((m) => {
                  const activa = seleccionadasSet.has(m.id);
                  const sinHorario = m.grupos_programados === 0;
                  const excedeCreditos = !activa && m.creditos > creditosRestantes;
                  const bloqueada = sinHorario || excedeCreditos;
                  const esRepeticion =
                    semestreActual != null && m.semestre !== semestreActual;

                  return (
                    <motion.button
                      type="button"
                      key={m.id}
                      onClick={() => !bloqueada && onToggle(m.id)}
                      disabled={bloqueada}
                      whileHover={!bloqueada ? { y: -2 } : undefined}
                      whileTap={!bloqueada ? { scale: 0.98 } : undefined}
                      className={`relative flex flex-col gap-2 rounded-md border p-3.5 text-left transition-colors ${
                        bloqueada
                          ? 'cursor-not-allowed border-line bg-canvas/60 opacity-60'
                          : activa
                          ? 'border-brand-600 bg-brand-50/70'
                          : 'cursor-pointer border-line bg-surface hover:border-line-strong'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em] ${
                            activa
                              ? 'border-brand-200 bg-surface text-brand-800'
                              : 'border-line bg-canvas text-muted'
                          }`}
                        >
                          {m.codigo_uccd}
                        </span>
                        <AnimatePresence mode="wait" initial={false}>
                          {bloqueada && !activa ? (
                            <motion.span
                              key="bloqueada"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-faint"
                            >
                              <Lock className="h-3 w-3" /> Bloqueada
                            </motion.span>
                          ) : activa ? (
                            <motion.span
                              key="elegida"
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.8, opacity: 0 }}
                              className="flex shrink-0 items-center gap-1 rounded-sm bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-white"
                            >
                              <Check className="h-3 w-3" /> Elegida
                            </motion.span>
                          ) : (
                            <motion.span
                              key="creditos"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="tabular flex shrink-0 items-center gap-1 text-[11px] font-semibold text-muted"
                            >
                              <Award className="h-3.5 w-3.5 text-faint" /> {m.creditos}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>

                      <h4 className="text-sm font-semibold leading-tight text-ink">{m.nombre}</h4>

                      <div className="flex items-center justify-between text-[11px] text-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-faint" /> Sem. {m.semestre}
                        </span>
                        <span className={sinHorario ? 'font-semibold text-red-700' : ''}>
                          {sinHorario ? 'Sin horario' : `${m.grupos_programados} sección(es)`}
                        </span>
                      </div>

                      {esRepeticion && (
                        <span className="inline-flex w-fit items-center gap-1 rounded-sm border border-[#e2d3a7] bg-[#fbf6e9] px-1.5 py-0.5 text-[10px] font-semibold text-[#6b5518]">
                          <Repeat className="h-2.5 w-2.5" /> Repetición
                        </span>
                      )}

                    </motion.button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
