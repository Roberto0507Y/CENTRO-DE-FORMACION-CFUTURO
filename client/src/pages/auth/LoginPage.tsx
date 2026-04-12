import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { getSafeAuthRedirect } from "../../utils/authRedirect";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = getSafeAuthRedirect(location.search);

  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  const slides = useMemo(
    () => [
      {
        src: "/auth/hero-1.png",
        title: "Aprende en comunidad",
        subtitle: "Colabora con compañeros y alcanza tus metas académicas.",
      },
      {
        src: "/auth/hero-2.png",
        title: "Crece profesionalmente",
        subtitle: "Desarrolla habilidades que transformarán tu futuro.",
      },
      {
        src: "/auth/hero-3.png",
        title: "Aprende a tu ritmo",
        subtitle: "Gestiona tu horario y estudia desde cualquier lugar.",
      },
      {
        src: "/auth/hero-4.png",
        title: "Educación moderna",
        subtitle: "Accede a recursos educativos de última generación.",
      },
    ],
    [],
  );

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    if (reduceMotion) return;

    const id = window.setInterval(() => {
      setHeroIndex((i) => (i + 1) % slides.length);
    }, 6500); // auto
    return () => window.clearInterval(id);
  }, [slides.length]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      const u = await login(correo, password);
      navigate(redirectTo ?? (u.rol === "admin" ? "/admin" : u.rol === "docente" ? "/teacher" : "/student"));
    } catch {
      setError("Credenciales inválidas.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`h-screen w-full overflow-hidden bg-white dark:bg-slate-950 ${mounted ? "cf-animate-fade-in" : "opacity-0"}`}>
      <div className="grid h-full w-full grid-cols-1 lg:grid-cols-[3fr_2fr]">
        {/* Left: fullscreen hero slider (hidden on mobile) */}
        <div className="relative hidden h-full w-full lg:block">
          {slides.map((s, idx) => (
            <div
              key={s.src}
              className={`absolute inset-0 motion-safe:transition-opacity motion-safe:duration-1000 motion-safe:ease-out ${idx === heroIndex ? "opacity-100" : "opacity-0"}`}
              aria-hidden={idx !== heroIndex}
            >
              <img src={s.src} alt="" className="h-full w-full object-cover" />
            </div>
          ))}

          <div className="absolute inset-0 bg-gradient-to-b from-blue-950/60 via-blue-950/55 to-blue-950/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-950/65 via-blue-950/45 to-transparent" />

          <div className="relative flex h-full w-full flex-col">
            <div className="flex flex-1 items-center justify-center px-10">
              <div key={heroIndex} className="mx-auto w-full max-w-xl text-center text-white cf-animate-fade-up">
                <div className="mx-auto inline-flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2 ring-1 ring-white/15 backdrop-blur">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-sm font-black">
                    CF
                  </span>
                  <span className="text-base font-black tracking-tight">C.FUTURO</span>
                </div>

                <div className="mt-10 text-4xl font-black leading-tight tracking-tight sm:text-6xl">
                  {slides[heroIndex]?.title}
                </div>
                <div className="mx-auto mt-4 max-w-lg text-sm font-medium leading-6 text-white/80 sm:text-lg sm:leading-7">
                  {slides[heroIndex]?.subtitle}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-10 pb-10">
              <button
                type="button"
                onClick={() => setHeroIndex((i) => (i - 1 + slides.length) % slides.length)}
                className="grid h-11 w-11 place-items-center rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                aria-label="Anterior"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>

              <div className="flex items-center gap-2">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setHeroIndex(idx)}
                    className={`h-2.5 rounded-full transition-all ${
                      idx === heroIndex ? "w-8 bg-white" : "w-2.5 bg-white/45 hover:bg-white/70"
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                    aria-current={idx === heroIndex}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setHeroIndex((i) => (i + 1) % slides.length)}
                className="grid h-11 w-11 place-items-center rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                aria-label="Siguiente"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Right: login form (fullscreen on mobile) */}
        <div className="flex h-full w-full items-center justify-center bg-white px-6 py-10 dark:bg-slate-950">
          <div className="w-full max-w-md">
              <div className="mb-6 flex items-center justify-end">
                <Link to="/" className="inline-flex">
                  <Button variant="ghost" className="gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M15 18l-6-6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    Volver al inicio
                  </Button>
                </Link>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">Inicia sesión</h1>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400 sm:text-base">
                Ingresa tus credenciales para acceder.
              </p>

              <form className="mt-8 grid gap-5" onSubmit={submit}>
                <div>
                  <label className="text-sm font-bold text-slate-800 dark:text-slate-200">Correo</label>
                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M4 6h16v12H4V6Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M4 7l8 6 8-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <Input
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      type="email"
                      required
                      placeholder="correo@ejemplo.com"
                      autoComplete="email"
                      className="h-12 rounded-xl border-slate-200 bg-white pl-10 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900/90"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-800 dark:text-slate-200">Contraseña</label>
                    <Link
                      to="/auth/forgot-password"
                      className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline dark:text-cyan-300 dark:hover:text-cyan-200"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>

                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M7 11V8a5 5 0 0 1 10 0v3"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M6 11h12v9H6v-9Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Ingresa tu contraseña"
                      autoComplete="current-password"
                      className="h-12 rounded-xl border-slate-200 bg-white pl-10 pr-11 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900/90"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                          <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <path
                            d="M10.6 10.6a2.5 2.5 0 0 0 3.5 3.5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <path
                            d="M9.5 5.3A10.5 10.5 0 0 1 12 5c5.5 0 9.8 4.2 11 7-0.5 1.2-1.6 3-3.4 4.4M6.7 6.7C4.2 8.5 2.6 10.9 2 12c1.2 2.8 5.5 7 10 7 1.2 0 2.3-0.2 3.4-0.6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                          <path
                            d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  </div>

                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Consejo: usa una contraseña segura y no la compartas con nadie.
                  </div>
                </div>

                {error ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-100">
                    {error}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="mt-1 h-12 w-full rounded-xl text-base font-black transition hover:shadow-sm"
                >
                  {isLoading ? "Ingresando…" : "Entrar"}
                </Button>
              </form>

              <div className="mt-6 text-sm text-slate-600 dark:text-slate-400">
                ¿No tienes cuenta?{" "}
                <Link to="/auth/register" className="font-bold text-blue-600 hover:underline dark:text-cyan-300">
                  Crea una aquí
                </Link>
              </div>

              <div className="mt-10 text-center text-xs text-slate-500 dark:text-slate-500">
                © 2026 C.FUTURO. Todos los derechos reservados.
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
