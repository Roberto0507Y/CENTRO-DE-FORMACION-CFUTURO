import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const PRIMARY_HERO_IMAGE = "/landing/heroprincipal.png";
const FALLBACK_HERO_IMAGE = "/landing/hero-main.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

const softSpring = { type: "spring", stiffness: 120, damping: 18 } as const;

function HeroActions({ mobile = false }: { mobile?: boolean }) {
  return (
    <motion.div
      variants={fadeUp}
      transition={softSpring}
      className={`mt-8 flex flex-col items-stretch gap-3 ${mobile ? "" : "sm:flex-row sm:flex-wrap sm:items-center sm:gap-4"}`}
    >
      <Link
        to="/auth/register"
        className={`group inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-extrabold text-white transition ${
          mobile
            ? "bg-blue-600 shadow-[0_12px_34px_rgba(37,99,235,0.28)] hover:bg-blue-500"
            : "bg-blue-600 shadow-[0_12px_34px_rgba(37,99,235,0.28)] hover:bg-blue-500 sm:w-auto"
        }`}
      >
        Empezar ahora
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>

      <Link
        to="/courses"
        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-extrabold transition ${
          mobile
            ? "border border-white/20 bg-slate-950/28 text-white backdrop-blur-md hover:bg-slate-950/40"
            : "border border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 sm:w-auto"
        }`}
      >
        Ver cursos
        <PlayCircle className="h-4 w-4 opacity-90" />
      </Link>
    </motion.div>
  );
}

function HeroContent({ mobile = false }: { mobile?: boolean }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      className="relative z-10 max-w-[42rem] min-w-0"
    >
      <motion.div variants={fadeUp} transition={softSpring}>
        <div
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${
            mobile
              ? "border border-white/10 bg-white/12 text-white backdrop-blur-md"
              : "border border-cyan-200 bg-cyan-50 text-cyan-800 shadow-sm shadow-cyan-100/70 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100 dark:shadow-none"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${mobile ? "bg-cyan-300" : "bg-cyan-500 dark:bg-cyan-300"}`} />
          Campus C.FUTURO
        </div>
      </motion.div>

      <motion.h1
        variants={fadeUp}
        transition={softSpring}
        className={`mt-7 max-w-[14ch] text-[2.95rem] font-black leading-[0.94] tracking-[-0.04em] sm:text-5xl ${
          mobile ? "text-white" : "text-slate-950 dark:text-white"
        } lg:max-w-[13ch] lg:text-[4.15rem]`}
      >
        Comprometidos con tu{" "}
        <span className={mobile ? "text-cyan-300" : "text-cyan-600 dark:text-cyan-300"}>formación académica</span>{" "}
        y desarrollo integral.
      </motion.h1>

      <motion.p
        variants={fadeUp}
        transition={softSpring}
        className={`mt-6 max-w-[38rem] text-[1.02rem] leading-8 sm:text-lg ${
          mobile ? "text-slate-200/92" : "text-slate-600 dark:text-slate-300"
        }`}
      >
        Organiza tu aprendizaje, desarrolla tus habilidades y avanza con claridad en cada etapa de tu formación académica.
      </motion.p>

      <HeroActions mobile={mobile} />
    </motion.div>
  );
}

export function Hero() {
  const [heroImage, setHeroImage] = useState(PRIMARY_HERO_IMAGE);

  const handleImageError = () => {
    setHeroImage((current) => (current === FALLBACK_HERO_IMAGE ? current : FALLBACK_HERO_IMAGE));
  };

  return (
    <section className="relative left-1/2 right-1/2 w-screen max-w-none -translate-x-1/2 -mt-6 overflow-hidden border-b border-slate-200/80 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] sm:-mt-8 md:-mt-10 dark:border-slate-800 dark:bg-[linear-gradient(180deg,#020617_0%,#020817_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(820px_360px_at_18%_20%,rgba(34,211,238,0.14),transparent_42%),radial-gradient(860px_380px_at_82%_22%,rgba(59,130,246,0.08),transparent_44%)] dark:bg-[radial-gradient(820px_360px_at_18%_20%,rgba(34,211,238,0.12),transparent_42%),radial-gradient(860px_380px_at_82%_22%,rgba(59,130,246,0.12),transparent_44%)]" />

      <div className="relative mx-auto w-full max-w-7xl px-0 py-0 lg:px-12 lg:py-14">
        <div className="overflow-hidden rounded-none border-x-0 border-t-0 border-b border-slate-200/80 bg-white/92 shadow-none backdrop-blur-sm lg:rounded-[2rem] lg:border lg:shadow-[0_30px_80px_-50px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/88 dark:lg:shadow-[0_30px_90px_-55px_rgba(2,6,23,0.8)]">
          <div className="relative min-h-[680px] overflow-hidden bg-slate-950 lg:hidden">
            <img
              src={heroImage}
              alt="Estudiantes aprendiendo en C.FUTURO"
              onError={handleImageError}
              className="absolute inset-0 h-full w-full object-cover object-[74%_center]"
              loading="eager"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,18,40,0.40)_0%,rgba(4,18,40,0.22)_18%,rgba(4,18,40,0.48)_42%,rgba(2,6,23,0.82)_72%,rgba(2,6,23,0.90)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(540px_280px_at_18%_18%,rgba(34,211,238,0.18),transparent_42%),radial-gradient(420px_240px_at_84%_18%,rgba(59,130,246,0.14),transparent_42%)]" />

            <div className="relative flex min-h-[680px] items-start px-7 py-12 sm:px-9 sm:py-14">
              <HeroContent mobile />
            </div>
          </div>

          <div className="hidden items-stretch lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="relative min-w-0 px-6 py-10 sm:px-9 sm:py-12 lg:px-12 lg:py-16">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,0.10),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.76))] dark:bg-[radial-gradient(circle_at_10%_10%,rgba(34,211,238,0.08),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.82),rgba(2,6,23,0.96))]" />
              <HeroContent />
            </div>

            <div className="relative min-h-[620px] overflow-hidden border-l border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
              <div className="absolute inset-y-0 left-0 z-10 w-40 bg-[linear-gradient(90deg,rgba(255,255,255,1)_0%,rgba(255,255,255,0.82)_35%,rgba(255,255,255,0.32)_68%,rgba(255,255,255,0)_100%)] dark:bg-[linear-gradient(90deg,rgba(2,6,23,0.96)_0%,rgba(2,6,23,0.72)_35%,rgba(2,6,23,0.24)_68%,rgba(2,6,23,0)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(255,255,255,0.35),transparent_30%),radial-gradient(circle_at_68%_82%,rgba(59,130,246,0.08),transparent_34%)] dark:bg-[radial-gradient(circle_at_78%_18%,rgba(255,255,255,0.08),transparent_30%),radial-gradient(circle_at_68%_82%,rgba(59,130,246,0.12),transparent_34%)]" />

              <img
                src={heroImage}
                alt="Estudiantes aprendiendo en C.FUTURO"
                onError={handleImageError}
                className="h-full w-full object-cover object-[72%_center]"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
