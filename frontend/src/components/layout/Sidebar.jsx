import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, DoorOpen, BookOpen, CalendarCheck } from 'lucide-react';

export default function Sidebar() {
  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-orange-600 text-white shadow-md'
        : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col justify-between">
      <div>
        {/* Logo / Encabezado Institucional */}
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="bg-orange-600 p-2 rounded-lg text-white">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-gray-900 leading-tight">Optimizador</h2>
            <p className="text-xs text-orange-600 font-semibold">Uninúñez</p>
          </div>
        </div>

        {/* Enlaces de Navegación */}
        <nav className="p-4 space-y-1.5">
          <NavLink to="/" className={navLinkClass} end>
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard / Solver</span>
          </NavLink>

          <NavLink to="/docentes" className={navLinkClass}>
            <Users className="w-5 h-5" />
            <span>Gestión de Docentes</span>
          </NavLink>

          <NavLink to="/salones" className={navLinkClass}>
            <DoorOpen className="w-5 h-5" />
            <span>Salones y Espacios</span>
          </NavLink>

          <NavLink to="/asignaturas" className={navLinkClass}>
            <BookOpen className="w-5 h-5" />
            <span>Asignaturas</span>
          </NavLink>
        </nav>
      </div>

      {/* Pie del Sidebar */}
      <div className="p-4 border-t border-gray-100 text-xs text-gray-400 text-center">
        Proyecto de Grado • 2026
      </div>
    </aside>
  );
}