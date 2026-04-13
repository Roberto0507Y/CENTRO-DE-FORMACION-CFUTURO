import { NavLink } from "react-router-dom";
import { useMemo, useState } from "react";
import type { CanvasSidebarEntry, CanvasNavSection } from "./canvasSidebar.types";

function isSection(entry: CanvasSidebarEntry): entry is CanvasNavSection {
  return (entry as CanvasNavSection).type === "section";
}

export function CanvasMobileDrawer({
  open,
  onClose,
  brand = "C.FUTURO",
  items,
  logoSrc,
  logoAlt = "Logo",
  showHelp = true,
}: {
  open: boolean;
  onClose: () => void;
  brand?: string;
  role?: string;
  items: CanvasSidebarEntry[];
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
    <div className="xl:hidden">
      <div
        className={`fixed inset-0 z-40 bg-black/35 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[336px] max-w-[88vw] transform bg-slate-950 text-white shadow-2xl transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
      >
        <div className="flex h-full flex-col">
          <div className="px-4 pt-4">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_22px_50px_rgba(2,6,23,0.35)] ring-1 ring-white/5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-b from-[#020617] via-[#020617]/85 to-[#0f172a]/75 px-4 py-4 shadow-inner shadow-black/25">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_82%_92%,rgba(37,99,235,0.18),transparent_36%)]" />
                    {logoSrc && showLogo ? (
                      <img
                        src={logoSrc}
                        alt={logoAlt}
                        className="relative mx-auto h-12 w-full max-w-[220px] select-none object-contain drop-shadow-[0_0_18px_rgba(34,211,238,0.24)]"
                        draggable={false}
                        onError={() => setShowLogo(false)}
                      />
                    ) : (
                      <div className="relative flex items-center gap-3">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-sm font-black text-white">
                          {initials}
                        </div>
                        <div className="min-w-0 text-sm font-black tracking-tight text-white">
                          {brand}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl border border-white/10 bg-white/[0.05] p-2.5 text-white/80 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                  aria-label="Cerrar menú"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-4">
            <div className="grid gap-4">
              {items.map((entry) => {
                if (isSection(entry)) {
                  return (
                    <div key={entry.label} className="grid gap-2">
                      <div className="px-3 text-[11px] font-black uppercase tracking-[0.24em] text-white/35">
                        {entry.label}
                      </div>
                      <div className="grid gap-1.5">
                        {entry.items.map((item) => (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={onClose}
                            className={({ isActive }) =>
                              `relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                                isActive
                                  ? "bg-white text-slate-950 shadow-[0_16px_30px_rgba(15,23,42,0.25)]"
                                  : "text-white/80 hover:bg-white/[0.06] hover:text-white"
                              }`
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <span
                                  className={`absolute inset-y-2 left-0 w-1 rounded-r-full ${
                                    isActive ? "bg-blue-500" : "bg-transparent"
                                  }`}
                                  aria-hidden="true"
                                />
                                <span
                                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${
                                    isActive
                                      ? "border-slate-200 bg-slate-100 text-slate-950"
                                      : "border-white/10 bg-white/[0.05] text-white/90"
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
                    onClick={onClose}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                        isActive ? "bg-white text-slate-950 shadow-[0_16px_30px_rgba(15,23,42,0.25)]" : "text-white/80 hover:bg-white/[0.06] hover:text-white"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={`absolute inset-y-2 left-0 w-1 rounded-r-full ${
                            isActive ? "bg-blue-500" : "bg-transparent"
                          }`}
                          aria-hidden="true"
                        />
                        <span
                          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${
                            isActive
                              ? "border-slate-200 bg-slate-100 text-slate-950"
                              : "border-white/10 bg-white/[0.05] text-white/90"
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
            <div className="p-4 pt-0">
              <a
                href="mailto:soporte@cfuturo.com"
                className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-extrabold text-white hover:bg-white/[0.1]"
              >
                Contactar soporte
              </a>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
