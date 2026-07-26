import React from 'react';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const BLOQUES = [
  '06:00-08:00',
  '08:00-10:00',
  '10:00-12:00',
  '12:00-14:00',
  '14:00-16:00',
  '16:00-18:00',
  '18:00-20:00',
  '20:00-22:00'
];

export const MallaHoraria = ({ horarios = [] }) => {
  // Función flexible para ubicar asignaciones sin importar espacios o variaciones de nombre de campo
  const obtenerAsignacion = (dia, bloque) => {
    return horarios.find((h) => {
      if (!h || !h.dia) return false;

      // 1. Normalizar Día
      const mismoDia = h.dia.trim().toLowerCase() === dia.trim().toLowerCase();
      if (!mismoDia) return false;

      const bloqueDB = (h.bloque_horario || h.bloque || h.hora || h.horario || '').toString().trim();

      // 2. Coincidencia exacta o por solapamiento de rangos
      if (bloqueDB === bloque.replace(/\s+/g, '')) {
        return true;
      }

      // Soporte para bloques largos continuos (ej. "08:00-12:00" abarca las filas de 8-10 y 10-12)
      if (bloqueDB.includes('-')) {
        const [inicioDB, finDB] = bloqueDB.split('-');
        const [inicioTabla, finTabla] = bloque.split('-');
        if (inicioTabla >= inicioDB && finTabla <= finDB) {
          return true;
        }
      }

      return false;
    });
  };

  return (
    <div className="overflow-x-auto shadow-md rounded-lg border border-gray-200">
      <table className="w-full text-sm text-center text-gray-700 border-collapse">
        {/* Encabezados con los Días */}
        <thead className="bg-gray-800 text-white uppercase text-xs">
          <tr>
            <th className="py-3 px-4 border">Hora / Bloque</th>
            {DIAS.map((dia) => (
              <th key={dia} className="py-3 px-4 border w-1/6">
                {dia}
              </th>
            ))}
          </tr>
        </thead>

        {/* Filas con los Bloques Horarios */}
        <tbody>
          {BLOQUES.map((bloque) => (
            <tr key={bloque} className="border-b hover:bg-gray-50">
              {/* Celda de la Hora */}
              <td className="py-3 px-2 font-semibold bg-gray-100 border text-xs text-gray-600">
                {bloque}
              </td>

              {/* Celdas por Día */}
              {DIAS.map((dia) => {
                const item = obtenerAsignacion(dia, bloque);

                // Detectar si la asignación es una Labor Administrativa (Soporta múltiples estructuras)
                const esAdmin =
                  item &&
                  (item.tipo_actividad?.toUpperCase().includes('ADMIN') ||
                   item.tipo?.toUpperCase().includes('ADMIN') ||
                   item.es_administrativa === true ||
                   item.es_administrativa === 1);

                return (
                  <td key={`${dia}-${bloque}`} className="p-1 border h-20 align-top">
                    {item ? (
                      <div
                        className={`h-full w-full p-2 rounded-md text-left text-xs flex flex-col justify-between border ${
                          esAdmin
                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                            : 'bg-blue-50 border-blue-300 text-blue-900'
                        }`}
                      >
                        <div>
                          {/* Badge de Categoría */}
                          <span
                            className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded mb-1 ${
                              esAdmin
                                ? 'bg-amber-200 text-amber-800'
                                : 'bg-blue-200 text-blue-800'
                            }`}
                          >
                            {esAdmin
                              ? 'ADMINISTRATIVA'
                              : `Grupo: ${item.grupo_codigo || item.grupo || 'N/A'}`}
                          </span>

                          <p className="font-bold leading-tight line-clamp-2">
                            {esAdmin
                              ? item.actividad || item.asignatura || 'Labor Administrativa'
                              : item.asignatura || item.materia}
                          </p>
                        </div>

                        <div className="text-[11px] text-gray-600 mt-1 pt-1 border-t border-gray-200/60">
                          <p>📍 {item.salon_nombre || item.salon || 'Sin asignación'}</p>
                          <p>👨‍🏫 {item.docente_nombre || item.docente || 'N/A'}</p>
                        </div>
                      </div>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};