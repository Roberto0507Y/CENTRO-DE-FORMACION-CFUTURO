import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type CarouselSlide = {
  src: string;
  alt: string;
  title?: string;
  subtitle?: string;
  badge?: string;
};

function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

export function ImageCarousel({
  slides,
  intervalMs = 5500,
  className,
  topRight,
}: {
  slides: CarouselSlide[];
  intervalMs?: number;
  className?: string;
  topRight?: ReactNode;
}) {
  const safeSlides = useMemo(() => slides.filter((s) => !!s.src), [slides]);
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (safeSlides.length <= 1) return;
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      setIndex((i) => (i + 1) % safeSlides.length);
    }, Math.max(1500, intervalMs));
    return () => window.clearInterval(id);
  }, [intervalMs, safeSlides.length]);

  const currentIndex = safeSlides.length === 0 ? 0 : index % safeSlides.length;
  const active = safeSlides[currentIndex];
  if (!active) return null;

  const hasLeftText = Boolean(active.subtitle || active.title);

  return (
    <div
      className={classNames("relative overflow-hidden rounded-2xl", className)}
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      <div className="absolute inset-0">
        {safeSlides.map((s, i) => (
          <img
            key={s.src}
            src={s.src}
            alt={s.alt}
            className={classNames(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
              i === currentIndex ? "opacity-100" : "opacity-0"
            )}
            draggable={false}
            loading={i === 0 ? "eager" : "lazy"}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/75 via-slate-950/40 to-blue-950/70" />
      </div>

      <div className="relative p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          {hasLeftText ? (
            <div className="min-w-0">
              {active.subtitle ? <div className="text-xs font-bold text-white/75">{active.subtitle}</div> : null}
              {active.title ? <div className="mt-1 truncate text-base font-black tracking-tight">{active.title}</div> : null}
            </div>
          ) : (
            <div />
          )}
          <div className="shrink-0">{topRight}</div>
        </div>

        {active.badge ? (
          <div className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold ring-1 ring-white/15">
            {active.badge}
          </div>
        ) : null}

        {safeSlides.length > 1 ? (
          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              {safeSlides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={classNames(
                    "h-2 rounded-full transition-all",
                    i === currentIndex ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/60"
                  )}
                  aria-label={`Ir a slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 transition hover:bg-white/15"
                aria-label="Anterior"
                onClick={() => setIndex((i) => (i - 1 + safeSlides.length) % safeSlides.length)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 transition hover:bg-white/15"
                aria-label="Siguiente"
                onClick={() => setIndex((i) => (i + 1) % safeSlides.length)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
