import React from 'react';

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

export const MallaHoraria = ({ horarios = [] }) => {
  return (
    <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm text-center text-gray-700 border-collapse">
        {/* Encabezados con los Días */}
        <thead className="bg-gray-800 text-white uppercase text-xs sticky top-0 z-20">
          <tr>
            <th className="py-3 px-4 border w-24">Hora</th>
            {DIAS.map((dia) => (
              <th key={dia} className="py-3 px-4 border w-1/6">
                {dia}
              </th>
            ))}
          </tr>
        </thead>

        {/* Cuerpo de la tabla */}
        <tbody>
          <tr>
            {/* Columna fija con las horas base de referencia */}
            <td className="p-0 border bg-gray-50 align-top">
              {HORAS_BASE.map((hora) => (
                <div 
                  key={hora} 
                  style={{ height: `${ALTURA_PIXELES_POR_HORA}px` }} 
                  className="border-b text-xs font-semibold text-gray-500 text-right pr-2 pt-1"
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
                <td key={dia} className="border p-0 relative align-top">
                  {/* Fondo con líneas punteadas guía por cada hora */}
                  <div className="absolute inset-0 pointer-events-none">
                    {HORAS_BASE.map((hora) => (
                      <div 
                        key={hora} 
                        style={{ height: `${ALTURA_PIXELES_POR_HORA}px` }} 
                        className="border-b border-dashed border-gray-100"
                      ></div>
                    ))}
                  </div>

                  {/* Lienzo relativo para posicionar las tarjetas de las clases exactamente donde van */}
                  <div className="relative w-full" style={{ height: `${HORAS_BASE.length * ALTURA_PIXELES_POR_HORA}px` }}>
                    {clasesDelDia.map((item, index) => {
                      const bloqueHorario = (item.bloque_horario || item.bloque || item.hora || item.horario || '').toString().trim();
                      const estilosPosicion = calcularEstilosTarjeta(bloqueHorario);

                      // Detectar si la asignación es una Labor Administrativa
                      const esAdmin =
                        item.tipo_actividad?.toUpperCase().includes('ADMIN') ||
                        item.tipo?.toUpperCase().includes('ADMIN') ||
                        item.es_administrativa === true ||
                        item.es_administrativa === 1;

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
                          className={`p-1.5 rounded-md text-left text-xs flex flex-col justify-between border shadow-sm overflow-hidden transition-all hover:z-30 hover:shadow-md ${
                            esAdmin
                              ? 'bg-amber-50 border-amber-300 text-amber-900'
                              : 'bg-blue-50 border-blue-300 text-blue-900'
                          }`}
                        >
                          <div className="overflow-hidden">
                            {/* Badge de Categoría y Horario exacto */}
                            <div className="flex justify-between items-center mb-0.5">
                              <span
                                className={`inline-block px-1.5 py-0.2 text-[9px] font-bold rounded ${
                                  esAdmin ? 'bg-amber-200 text-amber-800' : 'bg-blue-200 text-blue-800'
                                }`}
                              >
                                {esAdmin ? 'ADMIN' : `G: ${item.grupo_codigo || item.grupo || 'N/A'}`}
                              </span>
                              <span className="text-[9px] font-mono text-gray-500">{bloqueHorario}</span>
                            </div>

                            <p className="font-bold leading-tight truncate">
                              {esAdmin
                                ? item.actividad || item.asignatura || 'Labor Administrativa'
                                : item.asignatura || item.materia}
                            </p>
                          </div>

                          <div className="text-[10px] text-gray-600 pt-0.5 border-t border-gray-200/60 truncate">
                            <p className="truncate">📍 {item.salon_nombre || item.salon || 'Sin salón'}</p>
                            <p className="truncate">👨‍🏫 {item.docente_nombre || item.docente || 'N/A'}</p>
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