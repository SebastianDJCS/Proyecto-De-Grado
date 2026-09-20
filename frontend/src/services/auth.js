import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const authAPI = axios.create({ baseURL: API_URL });

export const login = async (documento, password) => {
  const response = await authAPI.post('/auth/login', { documento, password });
  return response.data;
};

export const getMe = async () => {
  const token = getToken();
  if (!token) throw new Error('No token');
  const response = await authAPI.get('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getToken = () => localStorage.getItem('uctp_token');

export const setToken = (token) => localStorage.setItem('uctp_token', token);

export const getUser = () => {
  const user = localStorage.getItem('uctp_user');
  return user ? JSON.parse(user) : null;
};

export const setUser = (user) => localStorage.setItem('uctp_user', JSON.stringify(user));

export const logout = () => {
  localStorage.removeItem('uctp_token');
  localStorage.removeItem('uctp_user');
};

export const isAuthenticated = () => !!getToken();

export const getUserRole = () => {
  const user = getUser();
  return user?.rol || null;
};
