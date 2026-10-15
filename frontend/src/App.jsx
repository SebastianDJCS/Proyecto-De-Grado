import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Menu, CalendarCheck } from 'lucide-react';
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
      <Contenido />
    </BrowserRouter>
  );
}

function Contenido() {
  const { pathname } = useLocation();
  const enLogin = pathname.replace(/\/+$/, '') === '/login';
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  // Recordar si la barra lateral quedo colapsada (mini-barra)
  const [sidebarPc, setSidebarPc] = useState(() => localStorage.getItem('sidebarColapsado') !== '1');
  const [rutaPrevia, setRutaPrevia] = useState(pathname);

  if (rutaPrevia !== pathname) {
    setRutaPrevia(pathname);
    setDrawerAbierto(false);
  }

  const aplicarPc = (nuevoAbierto) => {
    setSidebarPc(nuevoAbierto);
    localStorage.setItem('sidebarColapsado', nuevoAbierto ? '0' : '1');
  };

  const alternarPc = () => aplicarPc(!sidebarPc);

  const abrirSidebar = () => {
    setDrawerAbierto(true);
    aplicarPc(true);
  };

  return (
    <div className="flex bg-gray-100 min-h-screen">
      {/* En el login no se muestra la navegacion principal */}
      {!enLogin && (
        <>
          <Sidebar
            abierto={drawerAbierto}
            pcAbierto={sidebarPc}
            onCerrar={() => setDrawerAbierto(false)}
            onTogglePc={alternarPc}
          />

          {/* Fondo oscuro al abrir el menu en movil */}
          {drawerAbierto && (
            <div
              className="fixed inset-0 z-30 bg-black/40 md:hidden"
              onClick={() => setDrawerAbierto(false)}
              aria-hidden="true"
            />
          )}
        </>
      )}
      <main
        className={`flex-1 overflow-y-auto ${enLogin ? '' : 'p-4 pt-20 md:px-8 md:pb-8 md:pt-8'}`}
      >
        {!enLogin && (
          <div className="fixed top-0 left-0 right-0 z-20 flex items-center gap-3 bg-white px-4 py-3 shadow-sm border-b border-gray-200 md:hidden">
            <button
              onClick={abrirSidebar}
              aria-label="Abrir menú"
              aria-expanded={drawerAbierto}
              className="text-gray-600 hover:text-orange-600 bg-gray-100 hover:bg-orange-50 p-2 rounded-xl transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-orange-600" />
              <span className="font-extrabold text-gray-900">Optimizador</span>
            </div>
          </div>
        )}
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
  );
}
