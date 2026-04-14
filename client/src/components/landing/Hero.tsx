import { ArrowRight, PlayCircle } from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";

const HERO_IMAGE_FALLBACK = "/landing/heroprincipal.png";
const HERO_IMAGE_SRC_SET = "/landing/heroprincipal-960.webp 960w, /landing/heroprincipal-1536.webp 1536w";
const HERO_IMAGE_ALT = "Estudiantes aprendiendo en C.FUTURO";
const HERO_IMAGE_WIDTH = 1536;
const HERO_IMAGE_HEIGHT = 1024;

function useDesktopHeroVariant() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 1024px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = (matches: boolean) => setIsDesktop(matches);
    sync(media.matches);

    const handleChange = (event: MediaQueryListEvent) => sync(event.matches);

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  return isDesktop;
}

function FadeUp({
  children,
  delayMs = 0,
}: {
  children: ReactNode;
  delayMs?: number;
}) {
  const style: CSSProperties | undefined = delayMs > 0 ? { animationDelay: `${delayMs}ms` } : undefined;
  return (
    <div className="cf-animate-fade-up motion-reduce:animate-none" style={style}>
      {children}
    </div>
  );
}

function HeroImage({
  className,
  sizes,
  loading,
  fetchPriority,
}: {
  className: string;
  sizes: string;
  loading: "eager" | "lazy";
  fetchPriority: "high" | "low";
}) {
  return (
    <img
      src={HERO_IMAGE_FALLBACK}
      srcSet={HERO_IMAGE_SRC_SET}
      sizes={sizes}
      alt={HERO_IMAGE_ALT}
      width={HERO_IMAGE_WIDTH}
      height={HERO_IMAGE_HEIGHT}
      className={className}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
    />
  );
}

function HeroActions({ mobile = false }: { mobile?: boolean }) {
  return (
    <FadeUp delayMs={180}>
      <div
        className={`mt-8 flex flex-col items-stretch gap-3 ${mobile ? "" : "sm:flex-row sm:flex-wrap sm:items-center sm:gap-4"}`}
      >
        <Link
          to="/auth/register"
          className={`group inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-extrabold text-white transition ${
            mobile
              ? "cf-public-hero-cta bg-blue-600 hover:bg-blue-500"
              : "cf-public-hero-cta bg-blue-600 hover:bg-blue-500 sm:w-auto"
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
      </div>
    </FadeUp>
  );
}

function HeroContent({ mobile = false }: { mobile?: boolean }) {
  return (
    <div className="relative z-10 max-w-[42rem] min-w-0">
      <FadeUp>
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
      </FadeUp>

      <FadeUp delayMs={60}>
        <h1
          className={`cf-public-hero-title mt-7 max-w-[14ch] font-black ${
            mobile ? "text-white" : "text-slate-950 dark:text-white"
          } lg:max-w-[13ch]`}
        >
          Comprometidos con tu{" "}
          <span className={mobile ? "text-cyan-300" : "text-cyan-600 dark:text-cyan-300"}>
            formación académica
          </span>{" "}
          y desarrollo integral.
        </h1>
      </FadeUp>

      <FadeUp delayMs={120}>
        <p
          className={`mt-6 max-w-[38rem] text-[1.02rem] leading-8 sm:text-lg ${
            mobile ? "text-slate-200/92" : "text-slate-600 dark:text-slate-300"
          }`}
        >
          Organiza tu aprendizaje, desarrolla tus habilidades y avanza con claridad en cada etapa de tu formación académica.
        </p>
      </FadeUp>

      <HeroActions mobile={mobile} />
    </div>
  );
}

export function Hero() {
  const isDesktop = useDesktopHeroVariant();

  return (
    <section className="cf-public-hero relative left-1/2 right-1/2 w-screen max-w-none -translate-x-1/2 -mt-6 overflow-hidden border-b border-slate-200/80 sm:-mt-8 md:-mt-10 dark:border-slate-800">
      <div className="cf-public-hero-radiants absolute inset-0" />

      <div className="relative mx-auto w-full max-w-7xl px-0 py-0 lg:px-12 lg:py-14">
        <div className="cf-public-hero-card overflow-hidden rounded-none border-x-0 border-t-0 border-b border-slate-200/80 bg-white/92 shadow-none backdrop-blur-sm lg:rounded-[2rem] lg:border dark:border-slate-800 dark:bg-slate-950/88">
          <div className="relative min-h-[620px] overflow-hidden bg-slate-950 sm:min-h-[680px] lg:hidden">
            <HeroImage
              className="absolute inset-0 h-full w-full object-cover object-[74%_center]"
              sizes="100vw"
              loading={isDesktop ? "lazy" : "eager"}
              fetchPriority={isDesktop ? "low" : "high"}
            />
            <div className="cf-public-hero-mobile-overlay absolute inset-0" />
            <div className="cf-public-hero-mobile-radiants absolute inset-0" />

            <div className="relative flex min-h-[620px] items-start px-7 py-12 sm:min-h-[680px] sm:px-9 sm:py-14">
              <HeroContent mobile />
            </div>
          </div>

          <div className="hidden items-stretch lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="relative min-w-0 px-6 py-10 sm:px-9 sm:py-12 lg:px-12 lg:py-16">
              <div className="cf-public-hero-copy absolute inset-0" />
              <HeroContent />
            </div>

            <div className="relative min-h-[620px] overflow-hidden border-l border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
              <div className="cf-public-hero-media-fade absolute inset-y-0 left-0 z-10 w-40" />
              <div className="cf-public-hero-media-radiants absolute inset-0" />

              <HeroImage
                className="h-full w-full object-cover object-[72%_center]"
                sizes="(min-width: 1280px) 760px, (min-width: 1024px) 58vw, 100vw"
                loading={isDesktop ? "eager" : "lazy"}
                fetchPriority={isDesktop ? "high" : "low"}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
