import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Docentes from './pages/Docentes';
import Salones from './pages/Salones';
import Asignaturas from './pages/Asignaturas';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex bg-gray-100 min-h-screen">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/docentes" element={<Docentes />} />
            
            {/* Si aún no creas las páginas de salones o asignaturas, puedes apuntarlas 
                temporalmente al Dashboard o a Docentes para que no arrojen advertencia */}
            <Route path="/salones" element={<Salones />} />
            <Route path="/asignaturas" element={<Asignaturas />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}