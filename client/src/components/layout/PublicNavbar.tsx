import { useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/Button";
import { Container } from "../ui/Container";

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
      className={[
        "relative inline-flex items-center rounded-2xl px-3.5 py-2 text-sm font-semibold transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40",
        isActive
          ? "text-white"
          : "text-white/70 hover:bg-white/5 hover:text-white",
        isActive
          ? "after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-cyan-300"
          : "",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export function PublicNavbar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const panelHref = useMemo(() => {
    if (!user) return null;
    return user.rol === "admin" ? "/admin" : user.rol === "docente" ? "/teacher" : "/student";
  }, [user]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-b from-[#020617]/80 to-[#020617]/60 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur supports-[backdrop-filter]:from-[#020617]/70 supports-[backdrop-filter]:to-[#020617]/45">
      <Container className="px-3 sm:px-4 md:px-6 lg:px-10">
        <div className="flex h-[68px] items-center gap-3 sm:gap-4 lg:h-24 lg:gap-5">
          {/* Brand */}
          <Link
            to="/"
            className="group flex items-center"
            onClick={() => setMobileOpen(false)}
            aria-label="Ir al inicio"
          >
            <img
              src="/logo-horizontal.png"
              alt="C.FUTURO"
              className="h-11 w-auto max-w-[190px] select-none object-contain transition will-change-transform group-hover:drop-shadow-[0_0_18px_rgba(34,211,238,0.55)] sm:h-12 sm:max-w-[280px] lg:h-20 lg:max-w-[640px]"
              draggable={false}
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden flex-1 items-center justify-center gap-6 lg:flex">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                [
                  "relative inline-flex items-center rounded-2xl px-3.5 py-2 text-sm font-semibold transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40",
                  isActive
                    ? "text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white",
                  isActive
                    ? "after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-cyan-300"
                    : "",
                ].join(" ")
              }
            >
              Inicio
            </NavLink>
            <NavLink
              to="/courses"
              className={({ isActive }) =>
                [
                  "relative inline-flex items-center rounded-2xl px-3.5 py-2 text-sm font-semibold transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40",
                  isActive
                    ? "text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white",
                  isActive
                    ? "after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-cyan-300"
                    : "",
                ].join(" ")
              }
            >
              Cursos
            </NavLink>
            <HashLink toHash="#nosotros" label="Nosotros" />
            <NavLink
              to="/contact"
              className={({ isActive }) =>
                [
                  "relative inline-flex items-center rounded-2xl px-3.5 py-2 text-sm font-semibold transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40",
                  isActive
                    ? "text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white",
                  isActive
                    ? "after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-cyan-300"
                    : "",
                ].join(" ")
              }
            >
              Contacto
            </NavLink>
          </nav>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-3">
            {/* Mobile menu */}
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 shadow-sm shadow-black/30 transition hover:bg-white/10 hover:text-white lg:hidden"
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
                    className="rounded-2xl border border-white/12 bg-white/5 px-5 text-white/85 shadow-sm shadow-black/25 hover:bg-white/10 hover:text-white hover:shadow-md hover:shadow-black/30"
                  >
                    Ingresar
                  </Button>
                </Link>
                <Link to="/auth/register" className="hidden sm:block">
                  <Button className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 text-white shadow-[0_18px_50px_rgba(34,211,238,0.18)] ring-1 ring-white/10 hover:from-cyan-400 hover:to-blue-500 hover:shadow-[0_22px_60px_rgba(34,211,238,0.24)]">
                    Crear cuenta
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
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2 shadow-sm shadow-black/30 backdrop-blur">
              <div className="flex flex-col">
                <NavLink
                  to="/"
                  end
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    [
                      "relative inline-flex items-center rounded-2xl px-3.5 py-2 text-sm font-semibold transition",
                      isActive ? "text-white" : "text-white/80 hover:bg-white/10 hover:text-white",
                    ].join(" ")
                  }
                >
                  Inicio
                </NavLink>
                <NavLink
                  to="/courses"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    [
                      "relative inline-flex items-center rounded-2xl px-3.5 py-2 text-sm font-semibold transition",
                      isActive ? "text-white" : "text-white/80 hover:bg-white/10 hover:text-white",
                    ].join(" ")
                  }
                >
                  Cursos
                </NavLink>
                <HashLink toHash="#nosotros" label="Nosotros" onClick={() => setMobileOpen(false)} />
                <NavLink
                  to="/contact"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    [
                      "relative inline-flex items-center rounded-2xl px-3.5 py-2 text-sm font-semibold transition",
                      isActive ? "text-white" : "text-white/80 hover:bg-white/10 hover:text-white",
                    ].join(" ")
                  }
                >
                  Contacto
                </NavLink>

                <div className="mt-2 border-t border-slate-200/70 pt-2">
                  {!user ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Link to="/auth/login" onClick={() => setMobileOpen(false)}>
                        <Button
                          variant="ghost"
                          className="w-full rounded-2xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                        >
                          Ingresar
                        </Button>
                      </Link>
                      <Link to="/auth/register" onClick={() => setMobileOpen(false)}>
                        <Button className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 ring-1 ring-white/10">
                          Crear cuenta
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
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
