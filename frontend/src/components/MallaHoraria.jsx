import { MapPin, User } from 'lucide-react';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Horas base de referencia para las líneas de la tabla (cada hora = una franja de altura fija)
const HORAS_BASE = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00'
];

const HORA_INICIO_BASE_MINUTOS = 6 * 60; // 06:00 am en minutos
const ALTURA_PIXELES_POR_HORA = 64; // Altura en px de cada bloque de 1 hora en la tabla
const PIXELES_POR_MINUTO = ALTURA_PIXELES_POR_HORA / 60;

// Función para transformar "HH:MM" a minutos totales desde las 00:00
const horaAMinutos = (horaStr) => {
  if (!horaStr || !horaStr.includes(':')) return 0;
  const [h, m] = horaStr.split(':').map(Number);
  return h * 60 + (m || 0);
};

// Función para calcular la posición top y el height exacto en píxeles de cualquier rango horario
const calcularEstilosTarjeta = (bloqueHorarioStr) => {
  if (!bloqueHorarioStr || !bloqueHorarioStr.includes('-')) {
    return { top: '0px', height: '60px' };
  }

  const [inicioStr, finStr] = bloqueHorarioStr.split('-');
  const minInicio = horaAMinutos(inicioStr.trim());
  const minFin = horaAMinutos(finStr.trim());

  const minutosDesdeInicioJornada = minInicio - HORA_INICIO_BASE_MINUTOS;
  const duracionMinutos = minFin - minInicio;

  const top = minutosDesdeInicioJornada * PIXELES_POR_MINUTO;
  const height = duracionMinutos * PIXELES_POR_MINUTO;

  return {
    top: `${Math.max(0, top)}px`,
    height: `${Math.max(30, height)}px`, // Altura mínima de seguridad de 30px
  };
};

const esAdminItem = (item) =>
  item.tipo_actividad?.toUpperCase().includes('ADMIN') ||
  item.tipo?.toUpperCase().includes('ADMIN') ||
  item.es_administrativa === true ||
  item.es_administrativa === 1;

// Etiqueta de sesión por grupo: "1/2", "2/2"... para que se vea que varias
// tarjetas de la misma materia+grupo son UN solo grupo con varias sesiones.
const calcularEtiquetasSesion = (horarios = []) => {
  const agrupado = {};
  horarios.forEach((h) => {
    if (!h || esAdminItem(h)) return;
    const key = `${h.asignatura || h.materia || ''}|${h.grupo_codigo || h.grupo || ''}`;
    if (!agrupado[key]) agrupado[key] = [];
    agrupado[key].push(h);
  });

  const etiquetas = new Map();
  Object.values(agrupado).forEach((lista) => {
    lista.forEach((h, i) => etiquetas.set(h, `${i + 1}/${lista.length}`));
  });
  return etiquetas;
};

export const MallaHoraria = ({ horarios = [] }) => {
  const etiquetasSesion = calcularEtiquetasSesion(horarios);

  return (
    <div className="overflow-x-auto rounded-md border border-line bg-surface">
      <table className="w-full border-collapse text-center text-sm text-ink">
        <thead className="sticky top-0 z-20 bg-ink text-white">
          <tr>
            <th className="w-20 border-r border-white/10 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
              Hora
            </th>
            {DIAS.map((dia) => (
              <th
                key={dia}
                className="w-1/6 border-r border-white/10 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] last:border-r-0"
              >
                {dia}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          <tr>
            {/* Columna fija con las horas base de referencia */}
            <td className="border-r border-line bg-canvas/60 p-0 align-top">
              {HORAS_BASE.map((hora) => (
                <div
                  key={hora}
                  style={{ height: `${ALTURA_PIXELES_POR_HORA}px` }}
                  className="tabular border-b border-line pr-2 pt-1 text-right font-mono text-[10px] text-faint"
                >
                  {hora}
                </div>
              ))}
            </td>

            {/* Columnas de los Días (Contenedores con posicionamiento absoluto para precisión de minutos) */}
            {DIAS.map((dia) => {
              // Filtrar todas las clases/asignaciones que correspondan a este día
              const clasesDelDia = horarios.filter((h) => {
                if (!h || !h.dia) return false;
                return h.dia.trim().toLowerCase() === dia.trim().toLowerCase();
              });

              return (
                <td key={dia} className="relative border-r border-line p-0 align-top last:border-r-0">
                  {/* Fondo con líneas punteadas guía por cada hora */}
                  <div className="pointer-events-none absolute inset-0">
                    {HORAS_BASE.map((hora) => (
                      <div
                        key={hora}
                        style={{ height: `${ALTURA_PIXELES_POR_HORA}px` }}
                        className="border-b border-dashed border-line/70"
                      ></div>
                    ))}
                  </div>

                  {/* Lienzo relativo para posicionar las tarjetas de las clases exactamente donde van */}
                  <div className="relative w-full" style={{ height: `${HORAS_BASE.length * ALTURA_PIXELES_POR_HORA}px` }}>
                    {clasesDelDia.map((item, index) => {
                      const bloqueHorario = (item.bloque_horario || item.bloque || item.hora || item.horario || '').toString().trim();
                      const estilosPosicion = calcularEstilosTarjeta(bloqueHorario);

                      // Detectar si la asignación es una Labor Administrativa
                      const esAdmin = esAdminItem(item);
                      const sesion = etiquetasSesion.get(item);
                      const secundario = esAdmin ? 'text-[#7a6535]' : 'text-muted';

                      return (
                        <div
                          key={index}
                          style={{
                            top: estilosPosicion.top,
                            height: estilosPosicion.height,
                            left: '2px',
                            right: '2px',
                            position: 'absolute'
                          }}
                          className={`flex flex-col justify-between overflow-hidden rounded-sm border border-l-2 p-1.5 text-left text-[11px] shadow-sm transition-shadow hover:z-30 hover:shadow-md ${
                            esAdmin
                              ? 'border-[#e0d3ae] border-l-[#b58a2c] bg-[#fbf6e9] text-[#5f4b1a]'
                              : 'border-brand-200 border-l-brand-600 bg-brand-50 text-ink'
                          }`}
                        >
                          <div className="overflow-hidden">
                            {/* Badge de Categoría y Horario exacto */}
                            <div className="mb-0.5 flex items-center justify-between gap-1">
                              <span
                                className={`inline-block rounded-sm px-1 py-px text-[9px] font-semibold uppercase tracking-[0.06em] ${
                                  esAdmin
                                    ? 'bg-[#e0d3ae] text-[#5f4b1a]'
                                    : 'bg-brand-200 text-brand-900'
                                }`}
                              >
                                {esAdmin
                                  ? 'Admin'
                                  : `G: ${item.grupo_codigo || item.grupo || 'N/A'}${sesion ? ` · ${sesion}` : ''}`}
                              </span>
                              <span className={`tabular shrink-0 font-mono text-[9px] ${secundario}`}>
                                {bloqueHorario}
                              </span>
                            </div>

                            <p className="truncate font-semibold leading-tight">
                              {esAdmin
                                ? item.actividad || item.asignatura || 'Labor administrativa'
                                : item.asignatura || item.materia}
                            </p>
                          </div>

                          <div className={`border-t pt-0.5 text-[10px] ${esAdmin ? 'border-[#e0d3ae]' : 'border-brand-200'} ${secundario}`}>
                            <p className="flex items-center gap-1 truncate">
                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{item.salon_nombre || item.salon || 'Sin salón'}</span>
                            </p>
                            <p className="flex items-center gap-1 truncate">
                              <User className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{item.docente_nombre || item.docente || 'N/A'}</span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
};
