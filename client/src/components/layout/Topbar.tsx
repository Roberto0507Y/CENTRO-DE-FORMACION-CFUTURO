import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { usePreferences } from "../../hooks/usePreferences";
import { Avatar } from "../ui/Avatar";
import { NotificationsBell } from "./NotificationsBell";

export function Topbar({
  title,
  onMenuClick,
}: {
  title?: string;
  onMenuClick?: () => void;
}) {
  const { user, logout, api } = useAuth();
  const { notifications } = usePreferences();
  const { pathname } = useLocation();
  const [menuState, setMenuState] = useState<{ open: boolean; path: string }>({
    open: false,
    path: pathname,
  });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuOpen = menuState.open && menuState.path === pathname;

  const toggleMenu = () => {
    setMenuState((prev) => {
      const isOpenNow = prev.open && prev.path === pathname;
      return { open: !isOpenNow, path: pathname };
    });
  };

  const initials = useMemo(() => {
    if (!user) return "U";
    const a = user.nombres?.[0] ?? "U";
    const b = user.apellidos?.[0] ?? "";
    return `${a}${b}`.toUpperCase();
  }, [user]);

  const accountHref = useMemo(() => {
    if (!user) return "/";
    if (user.rol === "admin") return "/admin/account";
    if (user.rol === "docente") return "/teacher/account";
    return "/student/account";
  }, [user]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = menuRef.current;
      if (!el) return;
      const target = e.target as Node;
      if (!el.contains(target)) {
        setMenuState({ open: false, path: pathname });
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen, pathname]);

  return (
    <header className="relative z-20 border-b border-slate-200/70 bg-white/[0.88] shadow-[0_18px_50px_-42px_rgba(15,23,42,0.65)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/[0.86]">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/25 to-transparent dark:via-cyan-300/25" />
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4 md:min-h-20 md:px-6 md:py-3">
        <div className="flex min-w-0 items-center gap-3">
          {onMenuClick ? (
            <button
              type="button"
              onClick={onMenuClick}
              className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 lg:hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Abrir menú"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}

          <div className="min-w-0 rounded-3xl px-1">
            {title ? (
              <div className="truncate text-base font-black tracking-tight text-slate-950 sm:text-lg dark:text-white">
                {title}
              </div>
            ) : (
              <div className="truncate text-base font-black tracking-tight text-slate-950 sm:text-lg dark:text-white">
                Panel
              </div>
            )}
            {user ? (
              <div className="mt-1 hidden min-w-0 items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:flex dark:text-slate-400">
                <span>{user.rol}</span>
                <span className="h-1 w-1 rounded-full bg-blue-500/70 dark:bg-cyan-300/70" aria-hidden="true" />
                <span className="truncate normal-case tracking-normal">{user.correo}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user && notifications === "on" ? <NotificationsBell api={api} role={user.rol} /> : null}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={toggleMenu}
              className="group flex items-center gap-3 rounded-[1.35rem] border border-slate-200/80 bg-white/[0.92] px-3 py-2.5 shadow-sm shadow-slate-950/[0.03] transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-lg hover:shadow-blue-950/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-cyan-400/30 dark:hover:bg-slate-900"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              {user ? (
                <Avatar
                  name={`${user.nombres} ${user.apellidos}`}
                  src={user.foto_url}
                  size={44}
                  className="rounded-2xl shadow-sm ring-1 ring-white/70 dark:ring-slate-700"
                />
              ) : (
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-slate-950 text-xs font-black text-white shadow-sm">
                  {initials}
                </div>
              )}
              <div className="hidden leading-tight md:block">
                <div className="max-w-44 truncate text-sm font-black text-slate-950 dark:text-white">
                  {user?.nombres} {user?.apellidos}
                </div>
                <div className="mt-0.5 max-w-44 truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {user?.correo}
                </div>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="text-slate-500 transition group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white"
              >
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {menuOpen ? (
              <div
                className="absolute right-0 mt-3 w-64 overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/[0.12] dark:border-slate-800 dark:bg-slate-900"
                role="menu"
                aria-label="Menú de usuario"
              >
                <div className="border-b border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/70 px-4 py-4 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
                  <div className="text-xs font-black text-slate-900 dark:text-slate-100">Sesión</div>
                  <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{user?.rol}</div>
                </div>
                <div className="p-2">
                  <Link
                    to={accountHref}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                    role="menuitem"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-900 text-white">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M20 21a8 8 0 1 0-16 0"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </span>
                    Mi cuenta
                  </Link>

                  <button
                    type="button"
                    onClick={logout}
                    className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                    role="menuitem"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-2xl bg-rose-600 text-white">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M16 17l5-5-5-5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M21 12H9"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    Cerrar sesión
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
