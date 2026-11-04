import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  UserPlus,
} from 'lucide-react';
import { registrarEstudiante } from '../services/api';
import { branding } from '../config/branding';
import logoUn from '../assets/img.png';

const SEMESTRES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function RegistroPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmar: '',
    semestre: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const cambiar = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const data = await registrarEstudiante({
        email: form.email.trim(),
        password: form.password,
        semestre: parseInt(form.semestre, 10),
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario_id', String(data.id));
      localStorage.setItem('rol', data.rol);
      localStorage.setItem('username', data.username);
      if (data.semestre != null) {
        localStorage.setItem('semestre', String(data.semestre));
      }
      navigate('/mi-horario');
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'No se pudo crear la cuenta. Verifica los datos e inténtalo de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-canvas">
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
              Cuenta de estudiante
            </p>
            <h1 className="mt-4 font-serif text-4xl leading-[1.08] text-white xl:text-[46px]">
              Arma tu horario sin cruces
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-white/60">
              Regístrate con tu correo y tu semestre actual. Después podrás indicar
              las materias que repites y elegir las de tu semestre.
            </p>
          </div>

          <p className="text-[11px] text-white/35">{branding.loginPie}</p>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[420px]">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mb-8 inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al inicio de sesión
          </button>

          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white p-1.5">
              <img src={logoUn} alt="Uninúñez" className="h-full w-full object-contain" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight text-ink">Optimizador de Horarios</p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-brand-700">Uninúñez</p>
            </div>
          </div>

          <h2 className="font-serif text-3xl leading-tight text-ink sm:text-4xl">Crear cuenta</h2>
          <p className="mt-2 text-sm text-muted">
            Usa un correo electrónico y una contraseña de al menos 6 caracteres.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
              >
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={cambiar}
                  required
                  autoComplete="email"
                  placeholder="correo@ejemplo.com"
                  className="w-full rounded-md border border-line-strong bg-surface py-2.5 pl-9 pr-3.5 text-sm text-ink transition-colors placeholder:text-faint focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="semestre"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
              >
                Semestre actual
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <select
                  id="semestre"
                  name="semestre"
                  value={form.semestre}
                  onChange={cambiar}
                  required
                  className="w-full rounded-md border border-line-strong bg-surface py-2.5 pl-9 pr-3.5 text-sm text-ink transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
                >
                  <option value="">-- Selecciona --</option>
                  {SEMESTRES.map((s) => (
                    <option key={s} value={s}>
                      Semestre {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={cambiar}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full rounded-md border border-line-strong bg-surface py-2.5 pl-9 pr-3.5 text-sm text-ink transition-colors placeholder:text-faint focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmar"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
              >
                Confirmar contraseña
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <input
                  id="confirmar"
                  name="confirmar"
                  type="password"
                  value={form.confirmar}
                  onChange={cambiar}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full rounded-md border border-line-strong bg-surface py-2.5 pl-9 pr-3.5 text-sm text-ink transition-colors placeholder:text-faint focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15"
                />
              </div>
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
                  <UserPlus className="h-4 w-4" />
                  Crear cuenta y continuar
                </>
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-faint">
            <GraduationCap className="mr-1 inline h-3.5 w-3.5 text-brand-700" />
            Al entrar podrás indicar tu semestre y las materias que repites.
          </p>
        </div>
      </main>
    </div>
  );
}
