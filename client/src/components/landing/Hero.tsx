import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

const softSpring = { type: "spring", stiffness: 120, damping: 18 } as const;

export function Hero() {
  return (
    <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] -mt-10 w-screen overflow-hidden border-y border-slate-200/70 bg-slate-950 shadow-sm shadow-slate-900/10 sm:rounded-3xl sm:border sm:border-slate-200/70">
      {/* Background image */}
      <img
        src="/auth/hero-1.png"
        alt="C.FUTURO Campus"
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
      />
      {/* Dark overlay + glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#020617]/92 via-[#020617]/72 to-[#020617]/10" />
      <div className="absolute inset-0 bg-[radial-gradient(1100px_460px_at_18%_12%,rgba(34,211,238,0.20),transparent_55%),radial-gradient(980px_420px_at_86%_34%,rgba(59,130,246,0.18),transparent_60%)]" />
      <div className="pointer-events-none absolute -bottom-48 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid items-center gap-10">
          {/* Content */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
            className="max-w-3xl"
          >
            <motion.div variants={fadeUp} transition={softSpring}>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-sm text-white backdrop-blur-md ring-1 ring-white/10">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                Campus C.FUTURO
              </div>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              transition={softSpring}
              className="mt-6 max-w-2xl text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              Aprende y gestiona tus cursos con{" "}
              <span className="text-cyan-300">claridad</span>.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={softSpring}
              className="mt-6 max-w-xl text-lg leading-relaxed text-slate-200/85"
            >
              Un campus moderno para cursos, módulos y lecciones. Diseñado para estudiantes y docentes con navegación rápida y orden real.
            </motion.p>

            <motion.div variants={fadeUp} transition={softSpring} className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/register"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-extrabold text-white shadow-[0_12px_34px_rgba(37,99,235,0.40)] transition hover:bg-blue-500"
              >
                Empezar ahora
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <Link
                to="/courses"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-extrabold text-white backdrop-blur-md transition hover:bg-white/10"
              >
                Ver cursos
                <PlayCircle className="h-4 w-4 opacity-90" />
              </Link>
            </motion.div>

          </motion.div>
        </div>
      </div>
    </section>
  );
}
