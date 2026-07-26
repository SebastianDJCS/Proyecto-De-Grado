import axios from 'axios';

// Instancia base de Axios
const API = axios.create({
  baseURL: 'http://localhost:8000/api', // Revisa que este sea el puerto donde corre tu FastAPI
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