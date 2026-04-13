import { MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

export function PublicFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#020617] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-0 top-10 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.25fr_0.8fr_1fr]">
          <div>
            <Link
              to="/"
              aria-label="Ir al inicio"
              className="group inline-flex items-center"
            >
              <img
                src="/logo-horizontal.png"
                alt="C.FUTURO"
                className="h-24 w-auto select-none object-contain transition will-change-transform group-hover:drop-shadow-[0_0_18px_rgba(34,211,238,0.55)] md:h-[4.75rem]"
                draggable={false}
              />
            </Link>

            <p className="mt-6 max-w-md text-lg leading-8 text-slate-300">
              C.FUTURO acompaña tu formación con una experiencia académica clara, cercana y
              orientada al progreso real en cada etapa del aprendizaje.
            </p>

            <div className="mt-8 flex items-center gap-3">
              {[
                {
                  href: "https://facebook.com",
                  label: "Facebook",
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v3H7v3h3v6h3v-6h3l1-3h-4v-3c0-.6.4-1 1-1Z"
                        fill="currentColor"
                      />
                    </svg>
                  ),
                },
                {
                  href: "https://instagram.com",
                  label: "Instagram",
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M17.5 6.5h.01"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  ),
                },
                {
                  href: "https://x.com",
                  label: "X",
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M18 6 6 18M6 6l12 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  ),
                },
                {
                  href: "https://wa.me/50200000000",
                  label: "WhatsApp",
                  icon: <MessageCircle className="h-5 w-5" />,
                },
              ].map((item) => {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-white hover:shadow-[0_12px_24px_rgba(34,211,238,0.12)]"
                    aria-label={item.label}
                  >
                    <span className="transition-transform duration-300 group-hover:scale-110">
                      {item.icon}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-[0.2em] text-slate-400">
              Navegación
            </h3>

            <ul className="mt-6 space-y-4">
              {[
                { label: "Inicio", to: "/" },
                { label: "Explorar cursos", to: "/courses" },
                { label: "Contacto", to: "/contact" },
                { label: "Ingresar", to: "/auth/login" },
                { label: "Crear cuenta", to: "/auth/register" },
              ].map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="inline-flex text-lg text-slate-200 transition-all duration-200 hover:translate-x-1 hover:text-cyan-300 hover:drop-shadow-[0_0_12px_rgba(34,211,238,0.18)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-[0.2em] text-slate-400">
              Herramientas
            </h3>

            <ul className="mt-6 space-y-5">
              <li className="flex items-start gap-3">
                <span className="mt-2 h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
                <span className="text-lg text-slate-200">Rutas de aprendizaje estructuradas</span>
              </li>

              <li className="flex items-start gap-3">
                <span className="mt-2 h-3 w-3 rounded-full bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.7)]" />
                <span className="text-lg text-slate-200">Recursos y contenidos en un solo lugar</span>
              </li>

              <li className="flex items-start gap-3">
                <span className="mt-2 h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.7)]" />
                <span className="text-lg text-slate-200">Seguimiento académico y actividades</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-12 border-t border-white/10 pt-8" />

        <div className="flex flex-col gap-5 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>© 2026 C.FUTURO. Todos los derechos reservados.</p>

          <div className="flex flex-wrap items-center gap-6">
            <a href="#" className="transition duration-200 hover:text-cyan-300">
              Privacidad
            </a>
            <a href="#" className="transition duration-200 hover:text-cyan-300">
              Términos
            </a>
            <Link to="/contact" className="transition duration-200 hover:text-cyan-300">
              Contacto
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
