import axios from 'axios';

// Instancia base de Axios
const API = axios.create({
  baseURL: 'http://localhost:8000/api',
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

// 3. Obtener horarios de un grupo por su ID
export const getHorarioGrupo = async (grupoId) => {
  const response = await API.get(`/horarios/grupo/${grupoId}`);
  return response.data;
};

// --- NUEVOS MÓDULOS DE CRUD ---

// 4. Crear un nuevo salón
export const createSalon = async (salonData) => {
  const response = await API.post('/salones', salonData);
  return response.data;
};

// 5. Obtener todos los salones (para mostrarlos en tablas o listas)
export const getSalones = async () => {
  const response = await API.get('/salones');
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
export const getDocentes = async () => (await API.get('/v1/docentes/')).data;
export const createDocente = async (data) => (await API.post('/v1/docentes/', data)).data;
export const updateDocente = async (id, data) => (await API.put(`/v1/docentes/${id}`, data)).data;
export const deleteDocente = async (id) => (await API.delete(`/v1/docentes/${id}`)).data;

// --- ASIGNATURAS ---
export const getAsignaturas = async () => (await API.get('/asignaturas')).data;
export const createAsignatura = async (data) => (await API.post('/asignaturas', data)).data;
export const updateAsignatura = async (id, data) => (await API.put(`/asignaturas/${id}`, data)).data;
export const deleteAsignatura = async (id) => (await API.delete(`/asignaturas/${id}`)).data;