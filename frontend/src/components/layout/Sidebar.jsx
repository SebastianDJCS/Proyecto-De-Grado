import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, DoorOpen, BookOpen, CalendarCheck, Sparkles, LogOut, X, PanelLeftClose } from 'lucide-react';

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

  const irA = (path) => {
    navigate(path);
    onCerrar();
  };

  const todosItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
    { path: '/docentes', label: 'Docentes', icon: Users, roles: ['admin'] },
    { path: '/salones', label: 'Salones y Espacios', icon: DoorOpen, roles: ['admin'] },
    { path: '/asignaturas', label: 'Asignaturas', icon: BookOpen, roles: ['admin'] },
    { path: '/mi-horario', label: 'Mi Horario', icon: Sparkles, roles: ['admin', 'estudiante'] },
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
      className={`fixed inset-y-0 left-0 z-40 h-screen w-64 transform bg-white border-r border-gray-200 flex flex-col justify-between shadow-sm transition-transform duration-300 md:static md:h-auto md:min-h-screen md:translate-x-0 ${
        abierto ? 'translate-x-0' : '-translate-x-full'
      } ${pcAbierto ? '' : 'md:hidden'}`}
    >
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Logo / Encabezado Institucional */}
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="bg-orange-600 p-2.5 rounded-xl text-white shadow-md shadow-orange-600/20">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="font-extrabold text-gray-900 leading-tight">Optimizador</h2>
            <p className="text-xs text-orange-600 font-semibold tracking-wide">Uninúñez</p>
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar menú"
            className="md:hidden text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={onTogglePc}
            aria-label="Ocultar menú"
            className="hidden md:flex text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors cursor-pointer"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>

        {rol !== 'invitado' && (
          <div className="px-6 py-3 border-b border-gray-100">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider font-bold">Sesión</p>
            <p className="text-sm font-semibold text-gray-700 capitalize">
              {rol === 'estudiante' ? 'Estudiante' : (localStorage.getItem('username') || 'Admin')}
            </p>
          </div>
        )}

        {/* Navegación Vertical */}
        <div className="p-4 space-y-1.5 overflow-y-auto flex-1">
          <p className="px-3 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
            Navegación Principal
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => irA(item.path)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 group ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                    : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-gray-400 group-hover:text-orange-600'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pie del Sidebar */}
      <div className="p-4 border-t border-gray-100">
        {rol !== 'invitado' && (
          <button
            onClick={salir}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors mb-3"
          >
            <LogOut className="w-5 h-5" />
            <span>Salir</span>
          </button>
        )}
        <p className="text-xs text-gray-400 text-center">Proyecto de Grado • 2026</p>
      </div>
    </aside>
  );
}
