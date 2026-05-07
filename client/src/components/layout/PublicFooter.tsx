import { MessageCircle } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

function FooterInternalLink({
  to,
  children,
  className,
  ariaLabel,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isCurrentRoute = pathname === to;

  return (
    <Link
      to={to}
      aria-label={ariaLabel}
      onClick={(event) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.altKey ||
          event.ctrlKey ||
          event.shiftKey
        ) {
          return;
        }

        event.preventDefault();

        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        event.currentTarget.blur();

        const scrollToTop = (behavior: ScrollBehavior) => {
          window.scrollTo({ top: 0, left: 0, behavior });
        };

        if (isCurrentRoute) {
          window.requestAnimationFrame(() => {
            scrollToTop("smooth");
          });
          return;
        }

        navigate(to);

        window.requestAnimationFrame(() => {
          scrollToTop("auto");
          window.setTimeout(() => scrollToTop("auto"), 80);
          window.setTimeout(() => scrollToTop("auto"), 220);
        });
      }}
      className={className}
    >
      {children}
    </Link>
  );
}

export function PublicFooter() {
  return (
    <footer className="cf-public-footer relative overflow-hidden border-t border-white/10 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-0 top-10 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.25fr_0.8fr_1fr]">
          <div>
            <FooterInternalLink
              to="/"
              aria-label="Ir al inicio"
              className="group inline-flex items-center"
            >
              <picture>
                <source
                  type="image/webp"
                  srcSet="/logo-horizontal-660.webp 660w, /logo-horizontal-1320.webp 1320w"
                  sizes="(max-width: 768px) 220px, 320px"
                />
                <img
                  src="/logo-horizontal.png"
                  alt="C.FUTURO"
                  width="1320"
                  height="400"
                  decoding="async"
                  loading="lazy"
                  className="h-24 w-auto select-none object-contain transition will-change-transform group-hover:drop-shadow-[0_0_18px_rgba(34,211,238,0.55)] md:h-[4.75rem]"
                  draggable={false}
                />
              </picture>
            </FooterInternalLink>

            <p className="mt-6 max-w-md text-lg leading-8 text-slate-300">
              C.FUTURO acompaña tu formación con una experiencia académica clara, cercana y
              orientada al progreso real en cada etapa del aprendizaje.
            </p>

            <div className="mt-8 flex items-center gap-3">
              {[
                {
                  href: "https://www.facebook.com/people/Centro-de-formaci%C3%B3n-cfuturo/61589134328967/",
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
                  href: "https://www.instagram.com/cfuturo_academia/",
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
                  href: "https://www.tiktok.com/@cfuturo_academia",
                  label: "TikTok",
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M14.5 4c.5 1.7 1.6 3 3.5 3.6v2.4a6.3 6.3 0 0 1-3.5-1.2v6.1a4.9 4.9 0 1 1-4.9-4.9c.3 0 .7 0 1 .1v2.5a2.6 2.6 0 1 0 1.4 2.3V4h2.5Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    </svg>
                  ),
                },
                {
                  href: "https://www.youtube.com/channel/UCbGucw4Yc_aAHJI6kljNU8w",
                  label: "YouTube",
                  icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.8 4.7 12 4.7 12 4.7s-5.8 0-7.6.5a2.8 2.8 0 0 0-2 2A29.8 29.8 0 0 0 2 12a29.8 29.8 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.8.5 7.6.5 7.6.5s5.8 0 7.6-.5a2.8 2.8 0 0 0 2-2A29.8 29.8 0 0 0 22 12a29.8 29.8 0 0 0-.4-4.8Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                      <path
                        d="m10 15.5 5-3.5-5-3.5v7Z"
                        fill="currentColor"
                      />
                    </svg>
                  ),
                },
                {
                  href: "https://wa.me/50230178501",
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
                    className="cf-public-footer-social group relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-slate-300 backdrop-blur-sm"
                    aria-label={item.label}
                  >
                    <span className="cf-public-footer-social-icon">
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
                  <FooterInternalLink
                    to={item.to}
                    className="cf-public-footer-link inline-flex text-lg text-slate-200 transition-all duration-200 hover:translate-x-1 hover:text-cyan-300"
                  >
                    {item.label}
                  </FooterInternalLink>
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
            <FooterInternalLink to="/contact" className="transition duration-200 hover:text-cyan-300">
              Contacto
            </FooterInternalLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
