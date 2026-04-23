import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { useAuth } from "../hooks/useAuth";
import type { ApiResponse } from "../types/api";
import type { CourseDetail } from "../types/course";
import type { CourseManageOutletContext } from "../pages/shared/courseManage.types";
import "../styles/admin-dark-scope.css";
import "../styles/internal-shell.css";

type CourseNavItem = {
  to: string;
  label: string;
  iconPath: string;
  end?: boolean;
};

type AdmissionStatusLite = {
  enabled: boolean;
  passed: boolean;
  can_take_exam: boolean;
  quiz: { id: number } | null;
};

function courseContextTone(estado?: CourseDetail["estado"]) {
  if (estado === "publicado") {
    return "border-emerald-200/20 bg-[linear-gradient(135deg,rgba(6,95,70,0.42),rgba(8,47,73,0.28)_58%,rgba(15,23,42,0.46))] shadow-[0_30px_90px_-60px_rgba(5,150,105,0.45)]";
  }
  if (estado === "oculto") {
    return "border-white/10 bg-[linear-gradient(135deg,rgba(51,65,85,0.4),rgba(15,23,42,0.3)_58%,rgba(2,6,23,0.5))] shadow-[0_30px_90px_-60px_rgba(30,41,59,0.48)]";
  }
  return "border-cyan-200/15 bg-[linear-gradient(135deg,rgba(8,145,178,0.3),rgba(30,41,59,0.22)_55%,rgba(15,23,42,0.5))] shadow-[0_30px_90px_-60px_rgba(8,145,178,0.4)]";
}

function courseStateLabel(estado?: CourseDetail["estado"]) {
  if (estado === "publicado") return "Publicado";
  if (estado === "oculto") return "Oculto";
  return null;
}

function NavItem({
  to,
  label,
  iconPath,
  end,
  onClick,
}: {
  to: string;
  label: string;
  iconPath: string;
  end?: boolean;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `group relative flex h-12 items-center gap-3 rounded-2xl px-4 text-sm font-extrabold transition ${
          isActive
            ? "bg-white text-slate-950 shadow-sm shadow-black/10 ring-1 ring-white/10"
            : "text-white/80 hover:bg-white/10 hover:text-white"
        }`
      }
    >
      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white/5 ring-1 ring-white/10 transition group-hover:bg-white/10">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={iconPath} />
        </svg>
      </span>
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

function CourseMobileDrawer({
  open,
  onClose,
  backTo,
  course,
  courseId,
  sidebarSubtitle,
  contentItems,
  managementItems,
}: {
  open: boolean;
  onClose: () => void;
  backTo: string;
  course: CourseDetail | null;
  courseId: number;
  sidebarSubtitle: string;
  contentItems: CourseNavItem[];
  managementItems: CourseNavItem[];
}) {
  return (
    <div className="xl:hidden">
      <div
        className={`fixed inset-0 z-40 bg-black/45 backdrop-blur-sm transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`cf-course-shell-drawer fixed inset-y-0 left-0 z-50 flex transform flex-col bg-slate-950 text-white shadow-2xl transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menú del curso"
      >
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-black tracking-tight text-white">C.FUTURO</div>
              <div className="text-[11px] font-semibold text-white/55">{sidebarSubtitle}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Cerrar menú"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-4 pt-4">
          <Card className={`overflow-hidden p-0 text-white ${courseContextTone(course?.estado)}`}>
            <div className="relative p-4">
              <div className="cf-course-shell-context-glow pointer-events-none absolute inset-0" />
              <div className="relative flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/12 text-sm font-black text-cyan-50 ring-1 ring-white/15 shadow-lg shadow-cyan-950/20">
                  {(course?.titulo?.trim()?.[0] ?? "C").toUpperCase()}
                </div>
                <div className="min-w-0">
                  {course?.categoria?.nombre ? (
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/60">
                      {course.categoria.nombre}
                    </div>
                  ) : null}
                  <div className="line-clamp-2 text-base font-black leading-snug tracking-tight text-white">
                    {course?.titulo ?? `Curso #${courseId}`}
                  </div>
                  {course ? (
                    <>
                      <div className="mt-1 line-clamp-1 text-xs font-semibold text-white/72">
                        {course.docente.nombres} {course.docente.apellidos}
                      </div>
                      {courseStateLabel(course.estado) ? (
                        <div className="mt-2 inline-flex items-center rounded-full border border-white/12 bg-white/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/78">
                          {courseStateLabel(course.estado)}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-2">
            <div className="px-2 text-[11px] font-black uppercase tracking-wider text-white/50">
              Contenido
            </div>
            <div className="space-y-2">
              {contentItems.map((it) => (
                <NavItem key={it.to} to={it.to} label={it.label} iconPath={it.iconPath} onClick={onClose} />
              ))}
            </div>
          </div>

          {managementItems.length > 0 ? (
            <div className="mt-6 space-y-2">
              <div className="px-2 text-[11px] font-black uppercase tracking-wider text-white/50">
                Gestión
              </div>
              <div className="space-y-2">
                {managementItems.map((it) => (
                  <NavItem key={it.to} to={it.to} label={it.label} iconPath={it.iconPath} onClick={onClose} />
                ))}
              </div>
            </div>
          ) : null}
        </nav>

        <div className="border-t border-white/10 p-4">
          <a
            href={backTo}
            className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-white hover:bg-white/10"
          >
            Volver a cursos
          </a>
        </div>
      </aside>
    </div>
  );
}

export function CourseManageLayout({ base }: { base: "admin" | "teacher" | "student" }) {
  const { api } = useAuth();
  const { courseId } = useParams();
  const id = Number(courseId);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [admissionOnly, setAdmissionOnly] = useState(false);
  const [admissionStatusLoading, setAdmissionStatusLoading] = useState(base === "student");

  const backTo = useMemo(() => {
    if (base === "admin") return "/admin/courses";
    if (base === "teacher") return "/teacher/courses";
    if (admissionOnly) {
      return course?.slug ? `/courses/${course.slug}` : "/courses";
    }
    return "/student/my-courses";
  }, [admissionOnly, base, course?.slug]);

  const sidebarSubtitle = base === "student" ? "Curso" : "Gestión del curso";

  const items = useMemo<CourseNavItem[]>(() => {
    if (base === "student") {
      if (admissionOnly || admissionStatusLoading) {
        return [
          {
            to: `/${base}/course/${id}/quizzes`,
            label: "Examen de admisión",
            iconPath: "M9 11h6M9 15h6M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z",
          },
        ];
      }

      return [
        {
          to: `/${base}/course/${id}/home`,
          label: "Página principal",
          iconPath: "M3 10.5 12 3l9 7.5V21a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 21V10.5Z M9 22V12h6v10",
        },
        {
          to: `/${base}/course/${id}/announcements`,
          label: "Anuncios",
          iconPath: "M4 4h16v12H5.5L4 17.5V4Z M8 8h8 M8 11h6",
        },
        {
          to: `/${base}/course/${id}/materials`,
          label: "Materiales",
          iconPath: "M4 5h16v14H4V5Z M8 9h8 M8 13h6 M7 5v14",
        },
        {
          to: `/${base}/course/${id}/tasks`,
          label: "Tareas",
          iconPath: "M4 7h16M4 12h16M4 17h10",
        },
        {
          to: `/${base}/course/${id}/grades`,
          label: "Calificaciones",
          iconPath: "M4 19h16M7 16V9m5 7V5m5 11v-4M5 19V4h14",
        },
        {
          to: `/${base}/course/${id}/quizzes`,
          label: "Quizzes",
          iconPath: "M9 11h6M9 15h6M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z",
        },
        {
          to: `/${base}/course/${id}/forum`,
          label: "Foro",
          iconPath: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z M8 8h7 M8 12h9",
        },
      ];
    }

    return [
      {
        to: `/${base}/course/${id}/home`,
        label: "Página principal",
        iconPath: "M3 10.5 12 3l9 7.5V21a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 21V10.5Z M9 22V12h6v10",
      },
      {
        to: `/${base}/course/${id}/students`,
        label: "Estudiantes",
        iconPath:
          "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
      },
      {
        to: `/${base}/course/${id}/tasks`,
        label: "Tareas",
        iconPath: "M4 7h16M4 12h16M4 17h10",
      },
      {
        to: `/${base}/course/${id}/announcements`,
        label: "Anuncios",
        iconPath: "M4 4h16v12H5.5L4 17.5V4Z M8 8h8 M8 11h6",
      },
      {
        to: `/${base}/course/${id}/materials`,
        label: "Materiales",
        iconPath: "M4 5h16v14H4V5Z M8 9h8 M8 13h6 M7 5v14",
      },
      {
        to: `/${base}/course/${id}/forum`,
        label: "Foro",
        iconPath: "M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z M8 8h7 M8 12h9",
      },
      {
        to: `/${base}/course/${id}/attendance`,
        label: "Asistencia",
        iconPath: "M8 7V5m8 2V5M3 9h18M7 13h4m-4 4h10 M5 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z",
      },
      {
        to: `/${base}/course/${id}/quizzes`,
        label: "Quizzes",
        iconPath: "M9 11h6M9 15h6M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z",
      },
    ];
  }, [admissionOnly, admissionStatusLoading, base, id]);

  const contentItems = useMemo(
    () => items.filter((it) => !["Asistencia", "Estudiantes"].includes(it.label)),
    [items],
  );

  const managementItems = useMemo(
    () => items.filter((it) => ["Asistencia", "Estudiantes"].includes(it.label)),
    [items],
  );

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) return;
    (async () => {
      try {
        setIsLoading(true);
        const res = await api.get<ApiResponse<CourseDetail>>(`/courses/${id}`);
        setCourse(res.data.data);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [api, id]);

  useEffect(() => {
    if (base !== "student" || !Number.isFinite(id) || id <= 0) {
      setAdmissionOnly(false);
      setAdmissionStatusLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setAdmissionStatusLoading(true);
        const res = await api.get<ApiResponse<AdmissionStatusLite>>(`/courses/${id}/quizzes/admission/status`);
        if (cancelled) return;
        const status = res.data.data;
        setAdmissionOnly(Boolean(status.enabled && status.quiz && status.can_take_exam && !status.passed));
      } catch {
        if (cancelled) return;
        setAdmissionOnly(false);
      } finally {
        if (!cancelled) {
          setAdmissionStatusLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, base, id]);

  useEffect(() => {
    if (base !== "student" || !admissionOnly || !Number.isFinite(id) || id <= 0) return;
    const quizPath = `/student/course/${id}/quizzes`;
    if (pathname !== quizPath) {
      navigate(quizPath, { replace: true });
    }
  }, [admissionOnly, base, id, navigate, pathname]);

  const outletCtx: CourseManageOutletContext = useMemo(
    () => ({
      courseId: id,
      courseTitle: course?.titulo ?? `Curso #${id}`,
      courseSlug: course?.slug,
      admissionOnly,
    }),
    [admissionOnly, course?.slug, course?.titulo, id],
  );

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-slate-100 xl:flex xl:h-[100dvh] xl:overflow-hidden dark:bg-slate-950">
      <CourseMobileDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        backTo={backTo}
        course={course}
        courseId={id}
        sidebarSubtitle={sidebarSubtitle}
        contentItems={contentItems}
        managementItems={managementItems}
      />

      {/* Sidebar propia del curso (reemplaza la antigua) */}
      <aside className="hidden w-80 shrink-0 bg-slate-950 text-white xl:flex xl:flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10 font-black">
                CF
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black tracking-tight truncate">C.FUTURO</div>
                <div className="text-[11px] text-white/60 truncate">{sidebarSubtitle}</div>
              </div>
            </div>
            <a href={backTo} className="shrink-0">
              <Button variant="ghost" className="h-10 px-3 text-white hover:bg-white/10">
                Volver
              </Button>
            </a>
          </div>
        </div>

        {/* Contexto del curso */}
        <div className="px-6 pt-5">
          <Card className={`cf-course-shell-context-card overflow-hidden p-0 text-white ${courseContextTone(course?.estado)}`}>
            {isLoading ? (
              <div className="flex items-center gap-3 p-4 text-sm text-white/80">
                <Spinner />
                Cargando…
              </div>
            ) : (
              <div className="relative p-4">
                <div className="cf-course-shell-context-glow pointer-events-none absolute inset-0" />
                <div className="relative flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/12 text-sm font-black text-cyan-50 ring-1 ring-white/15 shadow-lg shadow-cyan-950/20">
                    {(course?.titulo?.trim()?.[0] ?? "C").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    {course?.categoria?.nombre ? (
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/60">
                        {course.categoria.nombre}
                      </div>
                    ) : null}
                    <div className="line-clamp-2 text-base font-black leading-snug tracking-tight text-white">
                      {course?.titulo ?? `Curso #${id}`}
                    </div>
                    {course ? (
                      <>
                        <div className="mt-1 line-clamp-1 text-xs font-semibold text-white/72">
                          {course.docente.nombres} {course.docente.apellidos}
                        </div>
                        {courseStateLabel(course.estado) ? (
                          <div className="mt-2 inline-flex items-center rounded-full border border-white/12 bg-white/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/78">
                            {courseStateLabel(course.estado)}
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Navegación */}
        <div className="mt-6 flex-1 min-h-0 px-4 pb-4 overflow-y-auto">
          <div className="space-y-2">
            <div className="px-2 text-[11px] font-black uppercase tracking-wider text-white/50">
              Contenido
            </div>
            <div className="space-y-2">
              {contentItems.map((it) => (
                <NavItem key={it.to} to={it.to} label={it.label} iconPath={it.iconPath} />
              ))}
            </div>
          </div>

          {managementItems.length > 0 ? (
            <div className="mt-6 space-y-2">
              <div className="px-2 text-[11px] font-black uppercase tracking-wider text-white/50">
                Gestión
              </div>
              <div className="space-y-2">
                {managementItems.map((it) => (
                  <NavItem key={it.to} to={it.to} label={it.label} iconPath={it.iconPath} />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-white/50">© 2026 C.FUTURO</div>
            <div className="text-[11px] font-bold text-white/70">
              {pathname.startsWith(`/${base}/course/`) ? sidebarSubtitle : ""}
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col xl:min-h-0">
        <header className="cf-course-shell-mobile-header relative z-20 border-b border-slate-200/70 bg-white/90 px-3 py-3 backdrop-blur-xl sm:px-4 xl:hidden dark:border-slate-800/80 dark:bg-slate-950/90">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              aria-label="Abrir menú del curso"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-black tracking-tight text-slate-950 dark:text-white">
                {course?.titulo ?? "Curso"}
              </div>
              <div className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {sidebarSubtitle}
              </div>
            </div>

            <a
              href={backTo}
              className="shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Volver
            </a>
          </div>
        </header>
        <main className="cf-admin-dark-scope cf-app-shell-main min-h-0 min-w-0 flex-1 overflow-visible xl:overflow-y-auto">
          <div className="cf-internal-content mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6">
            <Outlet context={outletCtx} />
          </div>
        </main>
      </div>
    </div>
  );
}
