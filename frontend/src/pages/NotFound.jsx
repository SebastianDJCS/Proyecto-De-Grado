import React from 'react';
import { CalendarX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <CalendarX className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-6xl font-extrabold text-gray-200">404</h1>
        <p className="text-gray-500 mt-3 text-lg">Página no encontrada</p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl transition cursor-pointer"
        >
          Volver al Inicio
        </button>
      </div>
    </div>
  );
}
