import { NavLink } from "react-router-dom";

export type SidebarLink = { to: string; label: string };

export function Sidebar({ title, links }: { title: string; links: SidebarLink[] }) {
  return (
    <aside className="hidden w-72 shrink-0 bg-slate-950 text-white md:block">
      <div className="p-5">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 font-black">
            CF
          </div>
          <div className="leading-tight">
            <div className="text-sm font-black tracking-tight">{title}</div>
            <div className="text-xs text-white/60">Canvas-style</div>
          </div>
        </div>
      </div>
      <nav className="px-3 pb-6">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `block rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/80 hover:bg-white/5 hover:text-white"
              }`
            }
            end
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
