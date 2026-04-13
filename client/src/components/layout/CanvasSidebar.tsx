import { NavLink } from "react-router-dom";
import { useMemo, useState } from "react";
import { studentNav } from "./canvasSidebarNav";
import type { CanvasNavSection, CanvasSidebarEntry } from "./canvasSidebar.types";

export type { CanvasNavItem, CanvasNavSection, CanvasSidebarEntry } from "./canvasSidebar.types";

function isSection(entry: CanvasSidebarEntry): entry is CanvasNavSection {
  return (entry as CanvasNavSection).type === "section";
}

export function CanvasSidebar({
  brand = "C.FUTURO",
  items = studentNav,
  logoSrc,
  logoAlt = "Logo",
  showHelp = true,
}: {
  brand?: string;
  role?: string;
  items?: CanvasSidebarEntry[];
  logoSrc?: string;
  logoAlt?: string;
  showHelp?: boolean;
}) {
  const [showLogo, setShowLogo] = useState(true);

  const initials = useMemo(() => {
    const parts = brand.trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "C";
    const b = parts[1]?.[0] ?? "F";
    return `${a}${b}`.toUpperCase();
  }, [brand]);

  return (
    <aside className="hidden w-[17rem] shrink-0 bg-slate-950 text-white xl:fixed xl:inset-y-0 xl:left-0 xl:flex xl:h-screen xl:flex-col">
      <div className="px-4 pt-4">
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-[#020617] via-[#020617]/85 to-[#0f172a]/75 px-5 py-5 shadow-[0_22px_50px_rgba(2,6,23,0.35)] ring-1 ring-white/5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_82%_92%,rgba(37,99,235,0.18),transparent_36%)]" />
          {logoSrc && showLogo ? (
            <img
              src={logoSrc}
              alt={logoAlt}
              className="relative mx-auto h-14 w-full max-w-[220px] select-none object-contain drop-shadow-[0_0_18px_rgba(34,211,238,0.24)]"
              draggable={false}
              onError={() => setShowLogo(false)}
            />
          ) : (
            <div className="relative flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-sm font-black text-white">
                {initials}
              </div>
              <div className="min-w-0 text-sm font-black tracking-tight text-white">
                {brand}
              </div>
            </div>
          )}
        </div>
      </div>

      <nav className="mt-5 flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-5">
        {items.map((entry) => {
          if (isSection(entry)) {
            return (
              <div key={entry.label} className="space-y-2">
                <div className="px-3 text-[11px] font-black uppercase tracking-[0.24em] text-white/35">
                  {entry.label}
                </div>
                <div className="grid gap-1.5">
                  {entry.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `group relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                          isActive
                            ? "bg-white text-slate-950 shadow-[0_16px_30px_rgba(15,23,42,0.25)]"
                            : "text-white/76 hover:bg-white/[0.06] hover:text-white"
                        }`
                      }
                      title={item.label}
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={`absolute inset-y-2 left-0 w-1 rounded-r-full transition ${
                              isActive ? "bg-blue-500" : "bg-transparent"
                            }`}
                            aria-hidden="true"
                          />
                          <span
                            className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border transition ${
                              isActive
                                ? "border-slate-200 bg-slate-100 text-slate-950"
                                : "border-white/10 bg-white/[0.05] text-white/90 group-hover:border-white/20 group-hover:bg-white/[0.1]"
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          }

          const item = entry;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `group relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                  isActive
                    ? "bg-white text-slate-950 shadow-[0_16px_30px_rgba(15,23,42,0.25)]"
                    : "text-white/76 hover:bg-white/[0.06] hover:text-white"
                }`
              }
              title={item.label}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute inset-y-2 left-0 w-1 rounded-r-full transition ${
                      isActive ? "bg-blue-500" : "bg-transparent"
                    }`}
                    aria-hidden="true"
                  />
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border transition ${
                      isActive
                        ? "border-slate-200 bg-slate-100 text-slate-950"
                        : "border-white/10 bg-white/[0.05] text-white/90 group-hover:border-white/20 group-hover:bg-white/[0.1]"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
        </div>
      </nav>

      {showHelp ? (
        <div className="px-4 pb-4">
          <a
            href="mailto:soporte@cfuturo.com"
            className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-semibold text-white/72 transition hover:bg-white/[0.06] hover:text-white"
            title="Ayuda"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] transition group-hover:bg-white/[0.1]">
              <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.85"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 18h.01M9.09 9a3 3 0 1 1 5.82 1c-.77 1.07-1.91 1.33-2.41 2.5-.1.23-.18.6-.18 1.5" />
                <path d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
              </svg>
            </span>
            <span className="flex-1">Ayuda</span>
            <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
              Mail
            </span>
          </a>
        </div>
      ) : null}
    </aside>
  );
}
