import axios from 'axios';
import { getToken, logout } from './auth';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
});

API.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const resolverHorarios = async () => {
  const response = await API.post('/solver/resolver-horarios');
  return response.data;
};

export const getHorarioDocente = async (documento) => {
  const response = await API.get(`/horarios/docente/identificacion/${documento}`);
  return response.data;
};

export const getHorarioGrupo = async (grupoId) => {
  const response = await API.get(`/horarios/grupo/${grupoId}`);
  return response.data;
};

export const getHorarioEstudiante = async (documento) => {
  const response = await API.get(`/horarios/estudiante/${documento}`);
  return response.data;
};

export const createSalon = async (salonData) => (await API.post('/salones', salonData)).data;
export const getSalones = async () => (await API.get('/salones')).data;
export const updateSalon = async (id, salonData) => (await API.put(`/salones/${id}`, salonData)).data;
export const deleteSalon = async (id) => (await API.delete(`/salones/${id}`)).data;

export const getDocentes = async () => (await API.get('/v1/docentes/')).data;
export const createDocente = async (data) => (await API.post('/v1/docentes/', data)).data;
export const updateDocente = async (id, data) => (await API.put(`/v1/docentes/${id}`, data)).data;
export const deleteDocente = async (id) => (await API.delete(`/v1/docentes/${id}`)).data;

export const getAsignaturas = async () => (await API.get('/asignaturas')).data;
export const createAsignatura = async (data) => (await API.post('/asignaturas', data)).data;
export const updateAsignatura = async (id, data) => (await API.put(`/asignaturas/${id}`, data)).data;
export const deleteAsignatura = async (id) => (await API.delete(`/asignaturas/${id}`)).data;

export const getGrupos = async () => (await API.get('/grupos')).data;
export const createGrupo = async (data) => (await API.post('/grupos', data)).data;
export const updateGrupo = async (id, data) => (await API.put(`/grupos/${id}`, data)).data;
export const deleteGrupo = async (id) => (await API.delete(`/grupos/${id}`)).data;

export const getEstudiantes = async () => (await API.get('/estudiantes/')).data;
export const createEstudiante = async (data) => (await API.post('/estudiantes/', data)).data;
export const updateEstudiante = async (id, data) => (await API.put(`/estudiantes/${id}`, data)).data;
export const deleteEstudiante = async (id) => (await API.delete(`/estudiantes/${id}`)).data;
export const getEstudiante = async (id) => (await API.get(`/estudiantes/${id}`)).data;
export const getEstudianteMaterias = async (id) => (await API.get(`/estudiantes/${id}/materias`)).data;
export const asignarMateriaEstudiante = async (id, data) => (await API.post(`/estudiantes/${id}/materias`, data)).data;
export const eliminarMateriaEstudiante = async (estId, matId) => (await API.delete(`/estudiantes/${estId}/materias/${matId}`)).data;
export const bulkCreateEstudiantes = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return (await API.post('/estudiantes/bulk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })).data;
};
