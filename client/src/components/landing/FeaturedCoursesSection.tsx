import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { CourseListItem, CourseListResponse } from "../../types/course";
import { CourseCard } from "../ui/CourseCard";

function CourseCardSkeleton() {
  return (
    <div className="h-[27rem] rounded-[1.8rem] border border-slate-200/70 bg-white/80 p-4 shadow-sm shadow-slate-900/5 dark:border-slate-800/80 dark:bg-slate-900/70">
      <div className="h-40 animate-pulse rounded-[1.4rem] bg-slate-200/80 dark:bg-slate-800/80" />
      <div className="mt-4 h-4 w-24 animate-pulse rounded-full bg-slate-200/80 dark:bg-slate-800/80" />
      <div className="mt-4 h-7 w-3/4 animate-pulse rounded-full bg-slate-200/80 dark:bg-slate-800/80" />
      <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-slate-200/70 dark:bg-slate-800/70" />
      <div className="mt-2 h-4 w-5/6 animate-pulse rounded-full bg-slate-200/70 dark:bg-slate-800/70" />
      <div className="mt-6 h-24 animate-pulse rounded-[1.35rem] bg-slate-100/90 dark:bg-slate-950/80" />
      <div className="mt-6 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-14 animate-pulse rounded-full bg-slate-200/80 dark:bg-slate-800/80" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200/80 dark:bg-slate-800/80" />
        </div>
        <div className="h-11 w-28 animate-pulse rounded-2xl bg-blue-200/70 dark:bg-slate-800/80" />
      </div>
    </div>
  );
}

export function FeaturedCoursesSection() {
  const { api } = useAuth();
  const [featured, setFeatured] = useState<CourseListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const res = await api.get<ApiResponse<CourseListResponse>>("/courses", {
          params: { page: 1, limit: 4 },
        });

        if (!active) return;
        setFeatured(res.data.data.items);
      } catch {
        if (!active) return;
        setFeatured([]);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [api]);

  return (
    <section className="space-y-5 [content-visibility:auto] [contain-intrinsic-size:960px]">
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
        {isLoading
          ? Array.from({ length: 4 }, (_, index) => <CourseCardSkeleton key={index} />)
          : featured.map((course) => <CourseCard key={course.id} course={course} />)}
      </div>
    </section>
  );
}
