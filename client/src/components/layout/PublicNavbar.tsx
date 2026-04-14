import { useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/Button";
import { Container } from "../ui/Container";

function desktopNavItemClass(isActive: boolean) {
  return [
    "cf-public-nav-link relative inline-flex items-center rounded-2xl px-4 py-2.5 text-sm font-semibold tracking-[0.01em] transition-all duration-300",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40",
    isActive
      ? "cf-public-nav-link-active text-white"
      : "cf-public-hover-link text-white/72 hover:-translate-y-[1px] hover:bg-white/[0.07] hover:text-white",
  ].join(" ");
}

function mobileNavItemClass(isActive: boolean) {
  return [
    "relative inline-flex items-center rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-300",
    isActive
      ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
      : "text-white/80 hover:bg-white/10 hover:text-white",
  ].join(" ");
}

function HashLink({
  toHash,
  label,
  onClick,
}: {
  toHash: string;
  label: string;
  onClick?: () => void;
}) {
  const { pathname, hash } = useLocation();
  const isActive = pathname === "/" && hash === toHash;

  return (
    <Link
      to={{ pathname: "/", hash: toHash }}
      onClick={onClick}
      className={desktopNavItemClass(isActive)}
    >
      {label}
    </Link>
  );
}

export function PublicNavbar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname, hash } = useLocation();

  const panelHref = useMemo(() => {
    if (!user) return null;
    return user.rol === "admin" ? "/admin" : user.rol === "docente" ? "/teacher" : "/student";
  }, [user]);

  const isHomeActive = pathname === "/" && !hash;

  return (
    <header className="cf-public-navbar sticky top-0 z-40">
      <Container className="px-3 sm:px-4 md:px-6 lg:px-10">
        <div className="flex min-w-0 h-[70px] items-center gap-3 sm:gap-4 lg:h-24 lg:gap-6">
          {/* Brand */}
          <Link
            to="/"
            className="group flex min-w-0 flex-1 items-center lg:flex-none"
            onClick={() => setMobileOpen(false)}
            aria-label="Ir al inicio"
          >
            <picture>
              <source
                type="image/webp"
                srcSet="/logo-horizontal-660.webp 660w, /logo-horizontal-1320.webp 1320w"
                sizes="(max-width: 640px) 170px, (max-width: 1024px) 280px, 320px"
              />
              <img
                src="/logo-horizontal.png"
                alt="C.FUTURO"
                width="1320"
                height="400"
                decoding="async"
                fetchPriority="low"
                className="h-11 w-auto max-w-[170px] max-w-full select-none object-contain transition will-change-transform group-hover:drop-shadow-[0_0_18px_rgba(34,211,238,0.55)] sm:h-12 sm:max-w-[280px] lg:h-20 lg:max-w-[640px]"
                draggable={false}
              />
            </picture>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden flex-1 items-center justify-center gap-6 lg:flex">
            <Link to="/" className={desktopNavItemClass(isHomeActive)}>
              Inicio
            </Link>
            <NavLink
              to="/courses"
              className={({ isActive }) => desktopNavItemClass(isActive)}
            >
              Cursos
            </NavLink>
            <HashLink toHash="#nosotros" label="Nosotros" />
            <NavLink
              to="/contact"
              className={({ isActive }) => desktopNavItemClass(isActive)}
            >
              Contacto
            </NavLink>
          </nav>

          {/* Actions */}
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            {/* Mobile menu */}
            <button
              type="button"
              className="cf-public-hover-card inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 shadow-sm shadow-black/30 transition-all duration-300 hover:-translate-y-[1px] hover:bg-white/10 hover:text-white lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileOpen}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 7H20M4 12H20M4 17H20"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {!user ? (
              <>
                <Link to="/auth/login" className="hidden lg:block">
                  <Button
                    variant="ghost"
                    className="cf-public-hover-card rounded-2xl border border-white/12 bg-white/5 px-5 text-white/85 shadow-sm shadow-black/25 transition-all duration-300 hover:-translate-y-[1px] hover:bg-white/10 hover:text-white hover:shadow-md hover:shadow-black/30"
                  >
                    Iniciar sesión
                  </Button>
                </Link>
                <Link to="/auth/register" className="hidden sm:block">
                  <Button className="cf-public-primary-btn rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 text-white ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-[1px] hover:from-cyan-400 hover:to-blue-500">
                    Comenzar ahora
                  </Button>
                </Link>
              </>
            ) : (
              <>
                {panelHref ? (
                  <Link to={panelHref} className="hidden lg:block">
                    <Button
                      variant="ghost"
                      className="rounded-2xl border border-white/12 bg-white/5 px-5 text-white/85 shadow-sm shadow-black/25 hover:bg-white/10 hover:text-white hover:shadow-md hover:shadow-black/30"
                    >
                      Panel
                    </Button>
                  </Link>
                ) : null}

                <div className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 shadow-sm shadow-black/30 lg:flex">
                  <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-white/10 text-xs font-black text-white">
                    {(user.nombres?.[0] ?? "C").toUpperCase()}
                    {(user.apellidos?.[0] ?? "F").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="max-w-[180px] truncate text-sm font-extrabold text-white">
                      {user.nombres}
                    </div>
                    <div className="text-[11px] font-semibold text-white/55">
                      {user.rol === "admin"
                        ? "Admin"
                        : user.rol === "docente"
                          ? "Docente"
                          : "Estudiante"}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  onClick={logout}
                  className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 text-white/80 hover:bg-white/10 hover:text-white sm:inline-flex"
                >
                  Salir
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Mobile panel */}
        <div
          className={`lg:hidden ${mobileOpen ? "block" : "hidden"}`}
          role="dialog"
          aria-label="Menú de navegación"
        >
          <div className="pb-4 pt-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2 shadow-sm shadow-black/30 backdrop-blur-xl">
              <div className="flex flex-col">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className={mobileNavItemClass(isHomeActive)}
                >
                  Inicio
                </Link>
                <NavLink
                  to="/courses"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => mobileNavItemClass(isActive)}
                >
                  Cursos
                </NavLink>
                <HashLink toHash="#nosotros" label="Nosotros" onClick={() => setMobileOpen(false)} />
                <NavLink
                  to="/contact"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => mobileNavItemClass(isActive)}
                >
                  Contacto
                </NavLink>

                <div className="mt-2 border-t border-white/10 pt-2">
                  {!user ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Link to="/auth/login" onClick={() => setMobileOpen(false)}>
                        <Button
                          variant="ghost"
                          className="w-full rounded-2xl border border-white/10 bg-white/5 text-white/80 transition-all duration-300 hover:bg-white/10 hover:text-white"
                        >
                          Iniciar sesión
                        </Button>
                      </Link>
                      <Link to="/auth/register" onClick={() => setMobileOpen(false)}>
                        <Button className="cf-public-primary-btn w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 ring-1 ring-white/10 transition-all duration-300 hover:from-cyan-400 hover:to-blue-500">
                          Comenzar ahora
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {panelHref ? (
                        <Link to={panelHref} onClick={() => setMobileOpen(false)}>
                          <Button
                            variant="ghost"
                            className="w-full rounded-2xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                          >
                            Panel
                          </Button>
                        </Link>
                      ) : null}
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setMobileOpen(false);
                          logout();
                        }}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                      >
                        Salir
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </header>
  );
}
