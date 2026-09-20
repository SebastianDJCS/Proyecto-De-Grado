import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, DoorOpen, BookOpen, Layers,
  CalendarCheck, LogOut, GraduationCap, UserCircle, ClipboardList
} from 'lucide-react';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const adminItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/docentes', label: 'Docentes', icon: Users },
    { path: '/salones', label: 'Salones y Espacios', icon: DoorOpen },
    { path: '/asignaturas', label: 'Asignaturas', icon: BookOpen },
    { path: '/grupos', label: 'Grupos Esperados', icon: Layers },
    { path: '/estudiantes', label: 'Estudiantes', icon: GraduationCap },
  ];

  const estudianteItems = [
    { path: '/mi-horario', label: 'Mi Horario', icon: CalendarCheck },
    { path: '/mi-perfil', label: 'Mi Perfil', icon: UserCircle },
  ];

  const menuItems = user?.rol === 'admin' ? adminItems : estudianteItems;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col justify-between shadow-sm">
      <div>
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="bg-orange-600 p-2.5 rounded-xl text-white shadow-md shadow-orange-600/20">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-gray-900 leading-tight">Optimizador</h2>
            <p className="text-xs text-orange-600 font-semibold tracking-wide">Uninúñez</p>
          </div>
        </div>

        <div className="p-4 space-y-1.5">
          <p className="px-3 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
            {user?.rol === 'admin' ? 'Panel Admin' : 'Mi Cuenta'}
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 group ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                    : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-orange-600'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{user?.nombre || 'Usuario'}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.rol || 'sin rol'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
        <p className="text-xs text-gray-400 text-center mt-3">Proyecto de Grado • 2026</p>
      </div>
    </aside>
  );
}
