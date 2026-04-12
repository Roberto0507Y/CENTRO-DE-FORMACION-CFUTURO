import type { ReactNode } from "react";

export type TestimonialMarqueeItem = {
  id: string;
  image: string;
  name: string;
  handle?: string;
  role?: string;
  text: string;
};

function VerifiedBadge() {
  return (
    <svg
      className="mt-0.5 fill-blue-500"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.555.72a4 4 0 0 1-.297.24c-.179.12-.38.202-.59.244a4 4 0 0 1-.38.041c-.48.039-.721.058-.922.129a1.63 1.63 0 0 0-.992.992c-.071.2-.09.441-.129.922a4 4 0 0 1-.041.38 1.6 1.6 0 0 1-.245.59 3 3 0 0 1-.239.297c-.313.368-.47.551-.56.743-.213.444-.213.96 0 1.404.09.192.247.375.56.743.125.146.187.219.24.297.12.179.202.38.244.59.018.093.026.189.041.38.039.48.058.721.129.922.163.464.528.829.992.992.2.071.441.09.922.129.191.015.287.023.38.041.21.042.411.125.59.245.078.052.151.114.297.239.368.313.551.47.743.56.444.213.96.213 1.404 0 .192-.09.375-.247.743-.56.146-.125.219-.187.297-.24.179-.12.38-.202.59-.244a4 4 0 0 1 .38-.041c.48-.039.721-.058.922-.129.464-.163.829-.528.992-.992.071-.2.09-.441.129-.922a4 4 0 0 1 .041-.38c.042-.21.125-.411.245-.59.052-.078.114-.151.239-.297.313-.368.47-.551.56-.743.213-.444.213-.96 0-1.404-.09-.192-.247-.375-.56-.743a4 4 0 0 1-.24-.297 1.6 1.6 0 0 1-.244-.59 3 3 0 0 1-.041-.38c-.039-.48-.058-.721-.129-.922a1.63 1.63 0 0 0-.992-.992c-.2-.071-.441-.09-.922-.129a4 4 0 0 1-.38-.041 1.6 1.6 0 0 1-.59-.245A3 3 0 0 1 7.445.72C7.077.407 6.894.25 6.702.16a1.63 1.63 0 0 0-1.404 0c-.192.09-.375.247-.743.56m4.07 3.998a.488.488 0 0 0-.691-.69l-2.91 2.91-.958-.957a.488.488 0 0 0-.69.69l1.302 1.302c.19.191.5.191.69 0z"
      />
    </svg>
  );
}

function TestimonialCard({ item }: { item: TestimonialMarqueeItem }) {
  return (
    <div className="mx-4 w-80 shrink-0 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-900/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/10">
      <div className="flex gap-3">
        <img
          className="h-11 w-11 rounded-full object-cover"
          src={item.image}
          alt={item.name}
          loading="lazy"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <p className="truncate text-sm font-extrabold text-slate-900">{item.name}</p>
            <VerifiedBadge />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {item.role ? (
              <span className="text-xs font-semibold text-slate-500">{item.role}</span>
            ) : null}
            {item.handle ? (
              <span className="text-xs font-semibold text-slate-400">{item.handle}</span>
            ) : null}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-700">{item.text}</p>
    </div>
  );
}

function MarqueeRow({
  children,
  reverse,
}: {
  children: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="relative mx-auto w-full max-w-6xl overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-white to-transparent" />
      <div
        className={[
          "cf-marquee-inner flex min-w-[200%] transform-gpu py-7",
          reverse ? "cf-marquee-reverse" : "",
        ].join(" ")}
      >
        {children}
      </div>
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-white to-transparent md:w-40" />
    </div>
  );
}

export function TestimonialsMarquee({
  items,
}: {
  items?: TestimonialMarqueeItem[];
}) {
  const data: TestimonialMarqueeItem[] =
    items ??
    [
      {
        id: "juan",
        image:
          "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200&auto=format&fit=crop",
        name: "Juan Pablo López",
        role: "Estudiante",
        text: "Lo que más me gusta es que todo está en un solo lugar. Entro y ya sé qué tengo que hacer.",
      },
      {
        id: "carlos",
        image:
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop",
        name: "Carlos Méndez",
        role: "Docente",
        text: "Publicar anuncios y tareas es rápido. Me ahorra tiempo y los estudiantes lo encuentran todo más fácil.",
      },
      {
        id: "andres",
        image:
          "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&auto=format&fit=crop&q=60",
        name: "Andrés Pérez",
        role: "Estudiante",
        text: "Antes me perdía con los módulos. Ahora sí entiendo el orden y voy avanzando sin enredarme.",
      },
      {
        id: "kevin",
        image:
          "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=60",
        name: "Kevin Morales",
        role: "Estudiante",
        text: "Lo uso desde el celular y va bien. Subir una tarea o ver un anuncio no me toma nada.",
      },
    ];

  const doubled = [...data, ...data];

  return (
    <div className="cf-marquee">
      <style>{`
        @keyframes cfMarqueeScroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }

        .cf-marquee-inner {
          animation: cfMarqueeScroll 28s linear infinite;
        }

        .cf-marquee-reverse {
          animation-direction: reverse;
        }

        @media (prefers-reduced-motion: reduce) {
          .cf-marquee-inner { animation: none; transform: translateX(0); }
        }

        .cf-marquee:hover .cf-marquee-inner {
          animation-play-state: paused;
        }
      `}</style>

      <MarqueeRow>
        {doubled.map((item, idx) => (
          <TestimonialCard key={`${item.id}-${idx}`} item={item} />
        ))}
      </MarqueeRow>

      <MarqueeRow reverse>
        {doubled.map((item, idx) => (
          <TestimonialCard key={`r-${item.id}-${idx}`} item={item} />
        ))}
      </MarqueeRow>
    </div>
  );
}
