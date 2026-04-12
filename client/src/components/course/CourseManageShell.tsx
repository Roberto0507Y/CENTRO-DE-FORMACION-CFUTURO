import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { Spinner } from "../ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { CourseDetail, CourseStatus } from "../../types/course";

function statusBadge(estado: CourseStatus | undefined) {
  if (estado === "publicado") return <Badge variant="green">Publicado</Badge>;
  if (estado === "oculto") return <Badge variant="slate">Oculto</Badge>;
  return <Badge variant="amber">Borrador</Badge>;
}

export function CourseManageShell({ base }: { base: "admin" | "teacher" }) {
  const { api } = useAuth();
  const { courseId } = useParams();
  const id = Number(courseId);

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const tabs = useMemo(
    () => [
      { to: `/${base}/course/${id}/tasks`, label: "Tareas" },
      { to: `/${base}/course/${id}/announcements`, label: "Anuncios" },
    ],
    [base, id],
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

  if (!Number.isFinite(id) || id <= 0) {
    return <Card className="p-4 text-sm text-rose-600">Curso inválido.</Card>;
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          {isLoading ? (
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Spinner />
              Cargando curso…
            </div>
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Gestión del curso
                </div>
                <div className="mt-1 text-xl font-black tracking-tight text-slate-900 line-clamp-1">
                  {course?.titulo ?? `Curso #${id}`}
                </div>
                {course ? (
                  <div className="mt-1 text-sm text-slate-600">
                    Docente: {course.docente.nombres} {course.docente.apellidos}
                  </div>
                ) : null}
              </div>
              <div className="shrink-0">{statusBadge(course?.estado as CourseStatus | undefined)}</div>
            </div>
          )}
        </div>

        <div className="bg-white px-3 py-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  `inline-flex items-center rounded-2xl px-4 py-2 text-sm font-extrabold transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "bg-slate-50 text-slate-800 hover:bg-slate-100"
                  }`
                }
                end
              >
                {t.label}
              </NavLink>
            ))}
          </div>
        </div>
      </Card>

      <Outlet context={{ courseId: id, courseTitle: course?.titulo ?? `Curso #${id}` }} />
    </div>
  );
}

