import { motion } from "framer-motion";
import { Gauge, Headphones, Layers3, LineChart } from "lucide-react";

const cards = [
  {
    title: "Cursos organizados",
    desc: "Módulos y lecciones en orden para que sepas qué sigue, sin perderte.",
    icon: Layers3,
    tone: "from-blue-600/15 to-cyan-400/10",
    ring: "ring-blue-600/15",
  },
  {
    title: "Acceso rápido",
    desc: "Entras, encuentras tu curso y continúas. Menos clics, más avance.",
    icon: Gauge,
    tone: "from-cyan-400/15 to-emerald-500/10",
    ring: "ring-cyan-400/15",
  },
  {
    title: "Seguimiento claro",
    desc: "Progreso visible para que sepas cómo vas y qué te falta por completar.",
    icon: LineChart,
    tone: "from-emerald-500/15 to-blue-600/10",
    ring: "ring-emerald-500/15",
  },
  {
    title: "Soporte cercano",
    desc: "Si te atoras, te ayudamos. Respuesta rápida por WhatsApp o correo.",
    icon: Headphones,
    tone: "from-amber-400/15 to-blue-600/10",
    ring: "ring-amber-400/20",
  },
] as const;

export function WhyChoose() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(900px_360px_at_10%_10%,rgba(37,99,235,0.08),transparent_55%),radial-gradient(900px_360px_at_90%_30%,rgba(6,182,212,0.08),transparent_55%)]" />

      <div className="relative px-6 py-12 md:px-12">
        <div className="max-w-2xl">
          <div className="text-3xl font-black tracking-tight text-slate-900">
            ¿Por qué estudiar con C.FUTURO?
          </div>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Un campus pensado para aprender con orden, claridad y acompañamiento real.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, idx) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ type: "spring", stiffness: 120, damping: 18, delay: idx * 0.04 }}
                className="group"
              >
                <div
                  className={[
                    "h-full rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-900/5",
                    "transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/10",
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
                    <Icon className="h-6 w-6 text-slate-900" />
                  </div>

                  <div className="mt-4 text-base font-extrabold tracking-tight text-slate-900">
                    {c.title}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">
                    {c.desc}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

