import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  DoorOpen,
  BookOpen,
  Sparkles,
  LogOut,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import logoUn from '../../assets/img.png';

const getRol = () => localStorage.getItem('rol') || 'invitado';

export default function Sidebar({
  abierto = false,
  pcAbierto = true,
  onCerrar = () => {},
  onTogglePc = () => {},
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const rol = getRol();
  const colapsado = !pcAbierto;
  const usuario = rol === 'estudiante' ? 'Estudiante' : localStorage.getItem('username') || 'Admin';

  const irA = (path) => {
    navigate(path);
    onCerrar();
  };

  const todosItems = [
    { path: '/', label: 'Panel general', icon: LayoutDashboard, roles: ['admin'] },
    { path: '/docentes', label: 'Docentes', icon: Users, roles: ['admin'] },
    { path: '/salones', label: 'Salones y espacios', icon: DoorOpen, roles: ['admin'] },
    { path: '/asignaturas', label: 'Asignaturas', icon: BookOpen, roles: ['admin'] },
    { path: '/mi-horario', label: 'Mi horario', icon: Sparkles, roles: ['admin', 'estudiante'] },
  ];

  const menuItems = todosItems.filter((item) => item.roles.includes(rol));

  const salir = () => {
    localStorage.removeItem('rol');
    localStorage.removeItem('username');
    navigate('/login');
    onCerrar();
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 transform flex-col justify-between border-r border-black/20 bg-ink transition-all duration-300 ease-in-out md:static md:h-auto md:min-h-screen md:translate-x-0 ${
        abierto ? 'translate-x-0' : '-translate-x-full'
      } ${colapsado ? 'md:w-20' : 'md:w-64'}`}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className={`flex items-center gap-3 border-b border-white/10 px-5 py-5 ${
            colapsado ? 'md:flex-col md:gap-2 md:px-2.5 md:py-3' : ''
          }`}
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white p-1.5">
            <img src={logoUn} alt="Uninúñez" className="h-full w-full object-contain" />
          </span>
          <div className={`min-w-0 flex-1 ${colapsado ? 'md:hidden' : ''}`}>
            <p className="truncate text-sm font-semibold leading-tight text-white">Optimizador</p>
            <p className="truncate text-[11px] uppercase tracking-[0.16em] text-brand-300">Uninúñez</p>
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar menú"
            className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            onClick={onTogglePc}
            aria-label={colapsado ? 'Mostrar menú' : 'Ocultar menú'}
            aria-expanded={!colapsado}
            className="hidden shrink-0 rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white md:flex"
          >
            {colapsado ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p
            className={`px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35 ${
              colapsado ? 'md:hidden' : ''
            }`}
          >
            Navegación
          </p>

          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <button
                  key={item.path}
                  onClick={() => irA(item.path)}
                  title={item.label}
                  aria-label={item.label}
                  className={`relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    colapsado ? 'md:justify-center md:gap-0 md:px-0' : ''
                  } ${
                    isActive
                      ? 'bg-white/[0.07] text-white'
                      : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  {isActive && (
                    <span className="absolute bottom-2 left-0 top-2 w-0.5 rounded-full bg-brand-500" />
                  )}
                  <Icon
                    className={`h-4 w-4 shrink-0 ${isActive ? 'text-brand-400' : 'text-white/40'}`}
                  />
                  <span className={`truncate ${colapsado ? 'md:hidden' : ''}`}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <div className="border-t border-white/10 p-3">
        {rol !== 'invitado' && (
          <div
            className={`mb-2 flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5 ${
              colapsado ? 'md:hidden' : ''
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-white/15 bg-white/10 text-xs font-semibold uppercase text-white">
              {usuario.slice(0, 2)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{usuario}</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">
                {rol === 'estudiante' ? 'Estudiante' : 'Administrador'}
              </p>
            </div>
          </div>
        )}

        {rol !== 'invitado' && (
          <button
            onClick={salir}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className={`mb-3 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white ${
              colapsado ? 'md:justify-center md:gap-0 md:px-0' : ''
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={`truncate ${colapsado ? 'md:hidden' : ''}`}>Cerrar sesión</span>
          </button>
        )}

        <p className={`px-2 text-[10px] text-white/30 ${colapsado ? 'md:hidden' : ''}`}>
          Proyecto de Grado · 2026
        </p>
      </div>
    </aside>
  );
}
