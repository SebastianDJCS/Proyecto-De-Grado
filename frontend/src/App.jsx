import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/layout/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Docentes from './pages/Docentes';
import Salones from './pages/Salones';
import Asignaturas from './pages/Asignaturas';
import Grupos from './pages/Grupos';
import Estudiantes from './pages/Estudiantes';
import MiHorario from './pages/MiHorario';
import MiPerfil from './pages/MiPerfil';
import NotFound from './pages/NotFound';

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />

          <Route path="/" element={
            <ProtectedRoute roles={['admin']}>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/docentes" element={
            <ProtectedRoute roles={['admin']}>
              <Docentes />
            </ProtectedRoute>
          } />
          <Route path="/salones" element={
            <ProtectedRoute roles={['admin']}>
              <Salones />
            </ProtectedRoute>
          } />
          <Route path="/asignaturas" element={
            <ProtectedRoute roles={['admin']}>
              <Asignaturas />
            </ProtectedRoute>
          } />
          <Route path="/grupos" element={
            <ProtectedRoute roles={['admin']}>
              <Grupos />
            </ProtectedRoute>
          } />
          <Route path="/estudiantes" element={
            <ProtectedRoute roles={['admin']}>
              <Estudiantes />
            </ProtectedRoute>
          } />

          <Route path="/mi-horario" element={
            <ProtectedRoute roles={['estudiante']}>
              <MiHorario />
            </ProtectedRoute>
          } />
          <Route path="/mi-perfil" element={
            <ProtectedRoute roles={['estudiante']}>
              <MiPerfil />
            </ProtectedRoute>
          } />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
