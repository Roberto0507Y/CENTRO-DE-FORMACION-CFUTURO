import { Reveal } from "../ui/Reveal";
import { TestimonialsMarquee } from "../ui/TestimonialsMarquee";

export function TestimonialsSection() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white [content-visibility:auto] [contain-intrinsic-size:620px] dark:border-slate-800/80 dark:bg-slate-950">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/6 via-transparent to-cyan-400/6 dark:from-cyan-400/10 dark:via-transparent dark:to-blue-500/10" />
      <div className="relative px-6 py-12 md:px-12">
        <Reveal>
          <div className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Testimonios de nuestros estudiantes
          </div>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Opiniones reales de estudiantes y docentes que usan el campus todos los días.
          </p>
        </Reveal>

        <div className="mt-8">
          <TestimonialsMarquee />
        </div>
      </div>
    </section>
  );
}
