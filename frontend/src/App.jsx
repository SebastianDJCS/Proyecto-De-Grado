import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Docentes from './pages/Docentes';
import Salones from './pages/Salones';
import Asignaturas from './pages/Asignaturas';
import MiHorario from './pages/MiHorario';
import LoginPage from './pages/LoginPage';

const getRol = () => localStorage.getItem('rol') || 'invitado';

function RutaProtegida({ rolRequerido, children }) {
  const rol = getRol();
  if (!['admin', 'estudiante'].includes(rol)) {
    return <Navigate to="/login" replace />;
  }
  if (rolRequerido === 'admin' && rol !== 'admin') {
    return <Navigate to="/mi-horario" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex bg-gray-100 min-h-screen">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <RutaProtegida>
                  <Dashboard />
                </RutaProtegida>
              }
            />
            <Route
              path="/docentes"
              element={
                <RutaProtegida rolRequerido="admin">
                  <Docentes />
                </RutaProtegida>
              }
            />
            <Route
              path="/salones"
              element={
                <RutaProtegida rolRequerido="admin">
                  <Salones />
                </RutaProtegida>
              }
            />
            <Route
              path="/asignaturas"
              element={
                <RutaProtegida rolRequerido="admin">
                  <Asignaturas />
                </RutaProtegida>
              }
            />
            <Route
              path="/mi-horario"
              element={
                <RutaProtegida>
                  <MiHorario />
                </RutaProtegida>
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
