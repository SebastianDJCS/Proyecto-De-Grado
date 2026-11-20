import axios from 'axios';

// Instancia base de Axios
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 1. Ejecutar el Solver CP-SAT (acepta semestre opcional)
export const resolverHorarios = async (semestre = null) => {
  const payload = semestre ? { semestre: parseInt(semestre) } : {};
  const response = await API.post('/solver/resolver-horarios', payload);
  return response.data;
};

// 2. Obtener horarios asignados a un docente por su número de documento
export const getHorarioDocente = async (documento) => {
  const response = await API.get(`/horarios/docente/identificacion/${documento}`);
  return response.data;
};

// Obtener el horario completo generado, incluidas las labores administrativas
export const getHorarioGlobal = async () => {
  const response = await API.get('/horarios/', { params: { limit: 10000 } });
  return response.data;
};

// 3. Obtener horarios de un grupo por su ID
export const getHorarioGrupo = async (grupoId) => {
  const response = await API.get(`/horarios/grupo/${grupoId}`);
  return response.data;
};

// --- NUEVOS MÓDULOS DE CRUD ---

// 4. Crear un nuevo salón
export const createSalon = async (salonData) => {
  const response = await API.post('/salones/', salonData);
  return response.data;
};

// 5. Obtener todos los salones (para mostrarlos en tablas o listas)
export const getSalones = async () => {
  const response = await API.get('/salones/');
  return response.data;
};

// 6. Actualizar un salón existente
export const updateSalon = async (id, salonData) => {
  const response = await API.put(`/salones/${id}`, salonData);
  return response.data;
};

// 7. Eliminar un salón
export const deleteSalon = async (id) => {
  const response = await API.delete(`/salones/${id}`);
  return response.data;
};

// --- DOCENTES ---
export const getDocentes = async () => (await API.get('/docentes/')).data;
export const createDocente = async (data) => (await API.post('/docentes/', data)).data;
export const updateDocente = async (id, data) => (await API.put(`/docentes/${id}`, data)).data;
export const deleteDocente = async (id) => (await API.delete(`/docentes/${id}`)).data;

// --- ASIGNATURAS ---
export const getAsignaturas = async () => (await API.get('/asignaturas/')).data;
export const createAsignatura = async (data) => (await API.post('/asignaturas/', data)).data;
export const updateAsignatura = async (id, data) => (await API.put(`/asignaturas/${id}`, data)).data;
export const deleteAsignatura = async (id) => (await API.delete(`/asignaturas/${id}`)).data;

// --- ESTUDIANTE (Mi Horario) ---
export const getConfigEstudiante = async () => (await API.get('/estudiante/config')).data;
export const getPerfilEstudiante = async () => (await API.get('/estudiante/perfil')).data;
export const updatePerfilEstudiante = async (data) =>
  (await API.put('/estudiante/perfil', data)).data;
export const getCatalogoAnterior = async (antesDe) =>
  (await API.get('/estudiante/catalogo', { params: { antes_de: antesDe } })).data;
export const getAsignaturasSeleccionables = async (semestre = null) =>
  (
    await API.get('/estudiante/asignaturas', {
      params: semestre ? { semestre } : {},
    })
  ).data;
export const generarHorarioEstudiante = async (asignaturaIds) =>
  (await API.post('/estudiante/horario', { asignatura_ids: asignaturaIds })).data;

// --- MALLA HORARIA EN PDF ---
// El PDF se genera en el backend (reportlab) y se devuelve como archivo.
export const descargarMallaPdf = async (payload) => {
  const response = await API.post('/horarios/pdf', payload, { responseType: 'blob' });
  return response.data;
};

// Guarda un Blob como archivo en el equipo del usuario.
export const guardarArchivo = (blob, nombreArchivo) => {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

// Lee el detalle de error cuando la respuesta llega como Blob JSON.
const leerError = async (blob) => {
  try {
    const datos = JSON.parse(await blob.text());
    return datos?.detail || 'No se pudo generar el PDF.';
  } catch {
    return 'No se pudo generar el PDF.';
  }
};

// Pide la malla en PDF y la descarga. Lanza Error con el mensaje del backend.
export const descargarMallaPdfArchivo = async (payload, nombreArchivo) => {
  let blob;

  try {
    blob = await descargarMallaPdf(payload);
  } catch (err) {
    const errorBlob = err.response?.data;
    if (errorBlob?.type?.includes('application/json')) {
      throw new Error(await leerError(errorBlob));
    }
    if (err.response?.status === 401) {
      throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
    }
    throw new Error('No se pudo generar el PDF. Intenta de nuevo.');
  }

  if (blob?.type?.includes('application/json')) {
    throw new Error(await leerError(blob));
  }

  guardarArchivo(blob, nombreArchivo);
};

// --- AUTENTICACIÓN ---
export const login = async (username, password) =>
  (await API.post('/auth/login', { username, password })).data;
export const registrarEstudiante = async (data) =>
  (await API.post('/auth/registro', data)).data;
