import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { bulkCreateEstudiantes } from '../../services/api';

export default function BulkEstudiantesForm({ onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.name.endsWith('.csv')) {
      setFile(selected);
      setError('');
      setResultado(null);
    } else {
      setError('Seleccione un archivo CSV valido');
      setFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Seleccione un archivo CSV');
      return;
    }

    setLoading(true);
    setError('');
    setResultado(null);

    try {
      const result = await bulkCreateEstudiantes(file);
      setResultado(result);
      if (result.creados > 0 && result.errores.length === 0) {
        setTimeout(() => onSuccess(), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cargar el archivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="bg-gray-800 p-3 rounded-xl text-white">
          <Upload className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Carga Masiva de Estudiantes</h2>
          <p className="text-sm text-gray-500">Importar desde archivo CSV</p>
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
        <p className="text-sm font-semibold text-orange-800 mb-2">Formato del CSV:</p>
        <p className="text-xs text-orange-700 mb-1">El archivo debe contener las siguientes columnas:</p>
        <code className="block bg-white p-2 rounded-lg text-xs text-gray-700 border border-orange-100">
          documento,nombre,email,password,semestre_actual
        </code>
        <p className="text-xs text-gray-500 mt-2">Ejemplo: 1098765432,Juan Perez,juan@email.com,mipass123,3</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-6">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Archivo CSV</label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-orange-600 file:text-white hover:file:bg-orange-700 file:cursor-pointer cursor-pointer"
          />
        </div>

        {file && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <FileText className="w-5 h-5 text-orange-500" />
            <span className="text-sm text-gray-700">{file.name}</span>
            <span className="text-xs text-gray-400 ml-auto">{(file.size / 1024).toFixed(1)} KB</span>
          </div>
        )}

        <button type="submit" disabled={loading || !file}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-orange-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Procesando...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>Importar Estudiantes</span>
            </>
          )}
        </button>
      </form>

      {resultado && (
        <div className="mt-6 p-4 rounded-xl border border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="font-semibold text-gray-800">Resultado de la importacion</p>
          </div>
          <p className="text-sm text-green-700 mb-1">Estudiantes creados: <strong>{resultado.creados}</strong></p>
          {resultado.errores.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-red-700 font-medium mb-1">Errores ({resultado.errores.length}):</p>
              <ul className="text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto">
                {resultado.errores.map((err, i) => (
                  <li key={i} className="bg-red-50 p-1.5 rounded">{err}</li>
                ))}
              </ul>
            </div>
          )}
          {resultado.creados > 0 && resultado.errores.length === 0 && (
            <button onClick={onSuccess} className="mt-3 text-sm text-orange-600 font-medium hover:underline cursor-pointer">
              Cerrar y ver lista
            </button>
          )}
        </div>
      )}
    </div>
  );
}
