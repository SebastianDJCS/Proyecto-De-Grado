import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, getMe, getToken, getUser, setUser, setToken, logout as apiLogout, isAuthenticated } from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (isAuthenticated()) {
        try {
          const userData = await getMe();
          setUserState(userData);
          setUser(userData);
        } catch {
          apiLogout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (documento, password) => {
    const data = await apiLogin(documento, password);
    setToken(data.access_token);
    setUser(data.user);
    setUserState(data.user);
    return data.user;
  };

  const logout = () => {
    apiLogout();
    setUserState(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
