import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Docentes from './pages/Docentes';
import Salones from './pages/Salones';
import Asignaturas from './pages/Asignaturas';
import MiHorario from './pages/MiHorario';
import LoginPage from './pages/LoginPage';
import logoUn from './assets/img.png';

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
    <div className="flex min-h-screen bg-canvas">
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
              className="fixed inset-0 z-30 bg-ink/50 md:hidden"
              onClick={() => setDrawerAbierto(false)}
              aria-hidden="true"
            />
          )}
        </>
      )}
      <main
        className={`flex-1 overflow-y-auto ${enLogin ? '' : 'p-4 pt-20 md:px-8 md:pb-10 md:pt-8'}`}
      >
        {!enLogin && (
          <div className="fixed inset-x-0 top-0 z-20 flex items-center gap-3 border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur-sm md:hidden">
            <button
              onClick={abrirSidebar}
              aria-label="Abrir menú"
              aria-expanded={drawerAbierto}
              className="rounded-md border border-line bg-surface p-1.5 text-muted transition-colors hover:bg-canvas hover:text-ink"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white">
                <img src={logoUn} alt="Uninúñez" className="h-6 w-6 object-contain" />
              </span>
              <span className="text-sm font-semibold tracking-tight text-ink">Optimizador de Horarios</span>
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
