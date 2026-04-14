import { Gauge, Headphones, Layers3, LineChart } from "lucide-react";

const cards = [
  {
    title: "Cursos organizados",
    desc: "Accede a una ruta de aprendizaje clara, con contenidos estructurados para avanzar con enfoque y sin fricción.",
    icon: Layers3,
    tone: "from-blue-600/15 to-cyan-400/10",
    ring: "ring-blue-600/15",
  },
  {
    title: "Acceso rápido",
    desc: "Encuentra tus cursos, recursos y próximas actividades en segundos para retomar tu ritmo sin perder tiempo.",
    icon: Gauge,
    tone: "from-cyan-400/15 to-emerald-500/10",
    ring: "ring-cyan-400/15",
  },
  {
    title: "Seguimiento claro",
    desc: "Visualiza tu progreso, identifica lo pendiente y mantén el control de cada etapa de tu formación.",
    icon: LineChart,
    tone: "from-emerald-500/15 to-blue-600/10",
    ring: "ring-emerald-500/15",
  },
  {
    title: "Soporte cercano",
    desc: "Recibe acompañamiento oportuno cuando lo necesites, con una experiencia de soporte ágil y cercana.",
    icon: Headphones,
    tone: "from-amber-400/15 to-blue-600/10",
    ring: "ring-amber-400/20",
  },
] as const;

export function WhyChoose() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:border-slate-800/80 dark:bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(900px_360px_at_10%_10%,rgba(37,99,235,0.08),transparent_55%),radial-gradient(900px_360px_at_90%_30%,rgba(6,182,212,0.08),transparent_55%)] dark:bg-[radial-gradient(900px_360px_at_10%_10%,rgba(37,99,235,0.12),transparent_55%),radial-gradient(900px_360px_at_90%_30%,rgba(6,182,212,0.10),transparent_55%)]" />

      <div className="relative px-6 py-12 md:px-12">
        <div className="max-w-3xl">
          <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-700 dark:text-cyan-300">
            Ventajas C.FUTURO
          </div>
          <div className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            ¿Por qué elegir C.FUTURO?
          </div>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Impulsa tu formación con una experiencia académica más clara, ágil y enfocada en resultados desde el primer acceso.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, idx) => {
            const Icon = c.icon;
            return (
              <div
                key={c.title}
                className="group"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div
                  className={[
                    "h-full rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-900/5",
                    "transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/10",
                    "dark:border-slate-800 dark:bg-slate-900/80 dark:hover:shadow-cyan-950/20",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br",
                      c.tone,
                      "ring-1",
                      c.ring,
                    ].join(" ")}
                  >
                    <Icon className="h-6 w-6 text-slate-900 dark:text-white" />
                  </div>

                  <div className="mt-4 text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {c.title}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {c.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
