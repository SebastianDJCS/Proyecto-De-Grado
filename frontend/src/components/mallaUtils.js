export const esAdminItem = (item) =>
  item.tipo_actividad?.toUpperCase().includes('ADMIN') ||
  item.tipo?.toUpperCase().includes('ADMIN') ||
  item.es_administrativa === true ||
  item.es_administrativa === 1;
