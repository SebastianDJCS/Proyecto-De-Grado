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

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggleAcordeon}
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-orange-50/40 transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className="w-12 h-12 shrink-0 rounded-xl bg-orange-100 text-orange-700 font-extrabold text-lg flex items-center justify-center">
            {semestre === 'Otros' ? '·' : semestre}
          </span>
          <div>
            <h3 className="font-bold text-gray-900">
              {semestre === 'Otros' ? 'Otras materias' : `Semestre ${semestre}`}
            </h3>
            <p className="text-xs text-gray-500">
              {materias.length} materia(s)
              {seleccionadasSemestre.length > 0 && (
                <span className="text-orange-600 font-semibold">
                  {' '}· {seleccionadasSemestre.length} elegida(s) · {creditosSemestre} créditos
                </span>
              )}
            </p>
          </div>
        </div>

        <motion.span
          animate={{ rotate: abierto ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gray-400 shrink-0"
        >
          <ChevronDown className="w-5 h-5" />
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
            <div className="px-5 pb-5 pt-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {materias.length === 0 ? (
                <p className="col-span-full text-center py-6 text-sm text-gray-400">
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
                      className={`relative text-left p-4 rounded-xl border transition-colors flex flex-col gap-2 ${
                        bloqueada
                          ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                          : activa
                          ? 'border-orange-500 bg-orange-50 shadow-sm'
                          : 'border-gray-100 bg-gray-50/50 hover:border-orange-200 cursor-pointer'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="bg-orange-100 text-orange-700 text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">
                          {m.codigo_uccd}
                        </span>
                        <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1 shrink-0">
                          <Award className="w-3.5 h-3.5 text-orange-500" /> {m.creditos}
                        </span>
                      </div>

                      <h4 className="font-bold text-gray-900 text-sm leading-tight">{m.nombre}</h4>

                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Sem. {m.semestre}
                        </span>
                        <span className={sinHorario ? 'text-red-500 font-semibold' : ''}>
                          {sinHorario ? 'Sin horario' : `${m.grupos_programados} sección(es)`}
                        </span>
                      </div>

                      {esRepeticion && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full w-fit">
                          <Repeat className="w-3 h-3" /> Repetición
                        </span>
                      )}

                      <AnimatePresence>
                        {activa && (
                          <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center shadow"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </motion.span>
                        )}
                        {bloqueada && (
                          <span className="absolute top-3 right-3 text-gray-400">
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </AnimatePresence>
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
