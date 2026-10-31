import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Loader2, AlertCircle, GraduationCap } from 'lucide-react';
import { login } from '../services/api';
import { branding } from '../config/branding';
import logoUn from '../assets/img.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await login(username, password);
      localStorage.setItem('rol', data.rol);
      localStorage.setItem('username', data.username);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Credenciales incorrectas. Verifica tu usuario y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const ingresarComoEstudiante = () => {
    localStorage.setItem('rol', 'estudiante');
    localStorage.removeItem('username');
    navigate('/mi-horario');
  };

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Panel lateral institucional */}
      <aside className="relative hidden w-[46%] flex-col overflow-hidden bg-ink p-10 lg:flex xl:p-14">
        {branding.loginBackgroundImage && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${branding.loginBackgroundImage})` }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-ink/90 via-ink/75 to-ink/95" aria-hidden="true" />
          </>
        )}

        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="w-fit rounded-md bg-white p-2.5">
            <img src={logoUn} alt="Uninúñez" className="h-14 w-14 object-contain" />
          </div>

          <div className="max-w-md py-12">
            <div className="mb-5 h-px w-12 bg-brand-500" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-300">
              {branding.loginKicker}
            </p>
            <h1 className="mt-4 font-serif text-4xl leading-[1.08] text-white xl:text-[46px]">
              {branding.loginTitulo}
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-white/60">
              {branding.loginDescripcion}
            </p>
          </div>

          <p className="text-[11px] text-white/35">{branding.loginPie}</p>
        </div>
      </aside>

      {/* Formulario */}
      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white p-1.5">
              <img src={logoUn} alt="Uninúñez" className="h-full w-full object-contain" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight text-ink">Optimizador de Horarios</p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-brand-700">Uninúñez</p>
            </div>
          </div>

          <h2 className="font-serif text-3xl leading-tight text-ink sm:text-4xl">Iniciar sesión</h2>
          <p className="mt-2 text-sm text-muted">
            Ingresa con las credenciales asignadas a tu cuenta.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
              >
                Usuario
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="admin"
                className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-sm text-ink transition-colors placeholder:text-faint focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-sm text-ink transition-colors placeholder:text-faint focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-brand-700 bg-brand-700 py-2.5 text-sm font-semibold text-white transition-colors hover:border-brand-800 hover:bg-brand-800 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Entrar al panel
                </>
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-xs leading-relaxed text-muted">
            Si no recuerdas tu contraseña, solicita el cambio al administrador del sistema.
          </p>

          <div className="my-7 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-faint">o</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <button
            type="button"
            onClick={ingresarComoEstudiante}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-line-strong bg-surface py-2.5 text-sm font-semibold text-ink transition-colors hover:border-muted hover:bg-canvas"
          >
            <GraduationCap className="h-4 w-4 text-brand-700" />
            Entrar como estudiante
          </button>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-faint">
            Como estudiante podrás generar tu horario personal.
            Los administradores gestionan docentes, asignaturas y salones.
          </p>
        </div>
      </main>
    </div>
  );
}
