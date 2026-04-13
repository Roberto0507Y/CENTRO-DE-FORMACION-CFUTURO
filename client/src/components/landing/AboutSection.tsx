import { BookOpenCheck, Compass, Gem, Lightbulb, ShieldCheck, Sparkles, Target } from "lucide-react";
import { Reveal } from "../ui/Reveal";

const values = [
  {
    title: "Excelencia académica",
    desc: "Promovemos una formación rigurosa, relevante y orientada al crecimiento continuo.",
    icon: Target,
  },
  {
    title: "Innovación útil",
    desc: "Integramos herramientas y metodologías que facilitan el aprendizaje con propósito.",
    icon: Lightbulb,
  },
  {
    title: "Confianza y acompañamiento",
    desc: "Construimos una experiencia cercana, clara y comprometida con cada estudiante.",
    icon: ShieldCheck,
  },
] as const;

const differentiators = [
  "Experiencia académica estructurada y fácil de seguir",
  "Herramientas pensadas para avanzar con claridad",
  "Acompañamiento constante durante el proceso formativo",
  "Enfoque práctico para desarrollar habilidades aplicables",
] as const;

export function AboutSection() {
  return (
    <section
      id="nosotros"
      className="relative scroll-mt-28 overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:border-slate-800/80 dark:bg-slate-950"
    >
      <div className="absolute inset-0 bg-[radial-gradient(820px_320px_at_12%_12%,rgba(34,211,238,0.10),transparent_55%),radial-gradient(880px_340px_at_88%_18%,rgba(37,99,235,0.08),transparent_58%)] dark:bg-[radial-gradient(820px_320px_at_12%_12%,rgba(34,211,238,0.12),transparent_55%),radial-gradient(880px_340px_at_88%_18%,rgba(37,99,235,0.12),transparent_58%)]" />

      <div className="relative px-6 py-12 md:px-12">
        <Reveal>
          <div className="max-w-3xl">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-700 dark:text-cyan-300">
              Sobre nosotros
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Formación académica con visión, propósito y acompañamiento real
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              En C.FUTURO impulsamos una experiencia educativa clara, cercana y bien estructurada, diseñada para que cada estudiante fortalezca sus competencias y avance con seguridad en su proceso de formación.
            </p>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <Reveal delayMs={40}>
            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/80">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/15 to-cyan-400/10 ring-1 ring-blue-600/15">
                  <BookOpenCheck className="h-6 w-6 text-slate-900 dark:text-white" aria-hidden="true" />
                </div>
                <div className="mt-4 text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Misión
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Brindar una formación accesible, organizada y de alta calidad que permita a cada estudiante desarrollar habilidades, fortalecer conocimientos y avanzar con confianza en sus metas académicas.
                </p>
              </article>

              <article className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/80">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-blue-600/10 ring-1 ring-emerald-500/15">
                  <Compass className="h-6 w-6 text-slate-900 dark:text-white" aria-hidden="true" />
                </div>
                <div className="mt-4 text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Visión
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Ser una plataforma educativa referente por su capacidad de combinar excelencia académica, innovación y acompañamiento para transformar positivamente el aprendizaje.
                </p>
              </article>
            </div>
          </Reveal>

          <Reveal delayMs={80}>
            <article className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/15 to-blue-600/10 ring-1 ring-amber-400/20">
                  <Sparkles className="h-6 w-6 text-slate-900 dark:text-white" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Qué nos diferencia
                  </div>
                  <div className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Una experiencia educativa más clara, humana y enfocada en resultados.
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {differentiators.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70"
                  >
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.45)]" />
                    <span className="text-sm leading-6 text-slate-700 dark:text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
            </article>
          </Reveal>
        </div>

        <Reveal delayMs={120}>
          <div className="mt-10">
            <div className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Valores
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {values.map((value, index) => {
                const Icon = value.icon;
                const tones = [
                  "from-blue-600/15 to-cyan-400/10 ring-blue-600/15",
                  "from-cyan-400/15 to-emerald-500/10 ring-cyan-400/15",
                  "from-violet-500/15 to-blue-600/10 ring-violet-500/15",
                ] as const;
                const tone = tones[index % tones.length];

                return (
                  <article
                    key={value.title}
                    className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/80"
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 ${tone}`}>
                      <Icon className="h-6 w-6 text-slate-900 dark:text-white" aria-hidden="true" />
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <Gem className="h-4 w-4 text-cyan-500 dark:text-cyan-300" aria-hidden="true" />
                      <div className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                        {value.title}
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {value.desc}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
