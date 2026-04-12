import { useRef, useState } from "react";

type TooltipPosition = { x: number; y: number };

export function ModuleCard({
  title,
  description,
  imageSrc,
  tooltip,
  active,
  onClick,
}: {
  title: string;
  description?: string;
  imageSrc?: string | null;
  tooltip: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const [position, setPosition] = useState<TooltipPosition>({ x: 0, y: 0 });
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const ref = useRef<HTMLButtonElement | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return;
    setPosition({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
      className={[
        "relative w-full overflow-hidden rounded-2xl border bg-white text-left shadow-sm shadow-slate-900/5 transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
        active ? "border-blue-200 ring-1 ring-blue-500/15" : "border-slate-200/70",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none absolute z-10 hidden whitespace-nowrap rounded-lg border border-white/10 bg-[#020617]/70 px-2 py-1 text-xs font-semibold text-white backdrop-blur",
          "transition-all duration-200",
          "md:block",
        ].join(" ")}
        style={{
          top: position.y + 12,
          left: position.x + 12,
          opacity: tooltipVisible ? 1 : 0,
          transform: tooltipVisible ? "scale(1)" : "scale(0.85)",
        }}
      >
        {tooltip}
      </span>

      <div className="relative h-24 w-full bg-gradient-to-br from-blue-600 via-cyan-600 to-slate-950">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/10 via-transparent to-cyan-300/10" />
        <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full border border-white/20" />
        <div className="pointer-events-none absolute -right-2 bottom-4 h-14 w-14 rounded-full bg-white/10 blur-sm" />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold text-slate-900">{title}</div>
            {description ? (
              <div className="mt-1 line-clamp-2 text-xs text-slate-600">{description}</div>
            ) : null}
          </div>
          {active ? (
            <span className="shrink-0 rounded-full bg-blue-600/10 px-2 py-1 text-[11px] font-black text-blue-700">
              Activo
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
