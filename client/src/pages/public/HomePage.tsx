import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AboutSection } from "../../components/landing/AboutSection";
import { Hero } from "../../components/landing/Hero";
import { WhyChoose } from "../../components/landing/WhyChoose";
import { CourseCard } from "../../components/ui/CourseCard";
import { Reveal } from "../../components/ui/Reveal";
import { TestimonialsMarquee } from "../../components/ui/TestimonialsMarquee";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { CourseListItem, CourseListResponse } from "../../types/course";

export function HomePage() {
  const { api } = useAuth();
  const [featured, setFeatured] = useState<CourseListItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<ApiResponse<CourseListResponse>>("/courses", {
          params: { page: 1, limit: 8 },
        });
        setFeatured(res.data.data.items);
      } catch {
        setFeatured([]);
      }
    })();
  }, [api]);

  return (
    <div className="space-y-16">
      {/* Hero */}
      <Hero />

      {/* About */}
      <AboutSection />

      {/* Featured courses */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Cursos destacados
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Empieza hoy
            </div>
          </div>
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 transition-colors hover:text-blue-800 dark:text-cyan-300 dark:hover:text-cyan-200"
          >
            Ver todos
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {featured.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      </section>

      {/* Why choose */}
      <WhyChoose />

      {/* Testimonials */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white dark:border-slate-800/80 dark:bg-slate-950">
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

    </div>
  );
}
