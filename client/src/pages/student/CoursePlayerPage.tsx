import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ModuleCard } from "../../components/ui/ModuleCard";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { AccessCheck } from "../../types/enrollment";
import type { CourseDetail } from "../../types/course";
import type { CourseModule } from "../../types/courseModule";
import type { AnnouncementListItem } from "../../types/announcement";
import type { LessonDetail, LessonListItem } from "../../types/lesson";
import { downloadFileUrl } from "../../utils/downloadFile";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function CoursePlayerPage() {
  const { courseId } = useParams();
  const { api } = useAuth();

  const [access, setAccess] = useState<AccessCheck | null>(null);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [lessons, setLessons] = useState<LessonListItem[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<LessonDetail | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const accessRes = await api.get<ApiResponse<AccessCheck>>(
          `/enrollments/${courseId}/check-access`
        );
        setAccess(accessRes.data.data);

        const courseRes = await api.get<ApiResponse<CourseDetail>>(`/courses/${courseId}`);
        setCourse(courseRes.data.data);

        if (!accessRes.data.data.access) {
          setModules([]);
          setSelectedModuleId(null);
          setLessons([]);
          setSelectedLesson(null);
          setAnnouncements([]);
          return;
        }

        // Anuncios publicados del curso
        try {
          const annRes = await api.get<ApiResponse<AnnouncementListItem[]>>(
            `/courses/${courseId}/announcements`
          );
          setAnnouncements(annRes.data.data);
        } catch {
          setAnnouncements([]);
        }

        // Si tu backend tiene course-modules: GET /api/course-modules/course/:courseId
        const res = await api.get<ApiResponse<CourseModule[]>>(
          `/course-modules/course/${courseId}`
        );
        setModules(res.data.data);
        const first = res.data.data[0];
        setSelectedModuleId(first ? first.id : null);
      } catch {
        setError(
          "No se pudieron cargar los módulos. Verifica que exista el endpoint /api/course-modules/course/:courseId."
        );
      } finally {
        setIsLoading(false);
      }
    })();
  }, [api, courseId]);

  useEffect(() => {
    (async () => {
      if (!selectedModuleId) {
        setLessons([]);
        return;
      }
      const res = await api.get<ApiResponse<LessonListItem[]>>(
        `/lessons/module/${selectedModuleId}`
      );
      setLessons(res.data.data);
    })();
  }, [api, selectedModuleId]);

  const openLesson = async (lessonId: number) => {
    const res = await api.get<ApiResponse<LessonDetail>>(`/lessons/${lessonId}`);
    setSelectedLesson(res.data.data);
  };

  if (isLoading) {
    return (
      <div className="grid place-items-center py-10">
        <Spinner />
      </div>
    );
  }
  if (error) return <Card className="p-4 text-sm text-rose-600">{error}</Card>;

  if (access && !access.access) {
    return (
      <Card className="p-6">
        <div className="text-base font-black text-slate-900">Acceso pendiente</div>
        <div className="mt-2 text-sm text-slate-600">
          {access.estado_inscripcion === "pendiente"
            ? "Tu inscripción está en revisión. Cuando tu pago sea aprobado podrás acceder al contenido."
            : "No tienes acceso a este curso."}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {course ? (
            <Link to={`/courses/${course.slug}`}>
              <Button>Ver detalles del curso</Button>
            </Link>
          ) : null}
          <Link to="/student/my-courses">
            <Button variant="secondary">Volver a mis cursos</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Card className="p-3 lg:col-span-4">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Módulos
        </div>
        <div className="mt-3 grid gap-3">
          {modules.map((m) => (
            <ModuleCard
              key={m.id}
              title={m.titulo}
              description={m.descripcion ?? undefined}
              imageSrc={null}
              tooltip={`Módulo: ${m.titulo}`}
              active={selectedModuleId === m.id}
              onClick={() => setSelectedModuleId(m.id)}
            />
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:col-span-8">
        <Card className="p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Anuncios
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                Novedades y avisos del curso
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            {announcements.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                No hay anuncios publicados.
              </div>
            ) : (
              announcements.slice(0, 5).map((a) => (
                <details
                  key={a.id}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-slate-900">
                          {a.titulo}
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-500">
                          {a.autor.nombres} {a.autor.apellidos} · {formatDate(a.fecha_publicacion)}
                        </div>
                      </div>
                      {a.archivo_url ? (
                        <button
                          className="shrink-0 text-xs font-bold text-blue-600 hover:underline"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void downloadFileUrl(api, a.archivo_url!, a.titulo);
                          }}
                        >
                          Adjunto
                        </button>
                      ) : null}
                    </div>
                  </summary>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {a.mensaje}
                  </div>
                </details>
              ))
            )}
          </div>
        </Card>

        <Card className="p-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Lecciones
          </div>
          <div className="mt-2 grid gap-1">
            {lessons.map((l) => (
              <button
                key={l.id}
                className="rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50"
                onClick={() => openLesson(l.id)}
              >
                {l.orden}. {l.titulo}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          {!selectedLesson ? (
            <div className="text-sm text-slate-600">Selecciona una lección.</div>
          ) : selectedLesson.tipo === "texto" ? (
            <div className="space-y-2">
              <div className="text-lg font-extrabold">{selectedLesson.titulo}</div>
              <div className="text-sm whitespace-pre-wrap text-slate-700">
                {selectedLesson.contenido || "Sin contenido."}
              </div>
            </div>
          ) : selectedLesson.tipo === "enlace" ? (
            <div className="space-y-2">
              <div className="text-lg font-extrabold">{selectedLesson.titulo}</div>
              <button
                type="button"
                onClick={() => {
                  if (selectedLesson.enlace_url) void downloadFileUrl(api, selectedLesson.enlace_url, selectedLesson.titulo);
                }}
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                Abrir enlace
              </button>
            </div>
          ) : selectedLesson.tipo === "pdf" ? (
            <div className="space-y-2">
              <div className="text-lg font-extrabold">{selectedLesson.titulo}</div>
              {selectedLesson.archivo_url ? (
                <button
                  className="text-sm font-semibold text-blue-600 hover:underline"
                  type="button"
                  onClick={() => void downloadFileUrl(api, selectedLesson.archivo_url!, selectedLesson.titulo)}
                >
                  Ver PDF
                </button>
              ) : (
                <div className="text-sm text-slate-600">Sin archivo.</div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-lg font-extrabold">{selectedLesson.titulo}</div>
              {selectedLesson.video_url?.startsWith("/api/files/download/") ? (
                <button
                  className="text-sm font-semibold text-blue-600 hover:underline"
                  type="button"
                  onClick={() => void downloadFileUrl(api, selectedLesson.video_url!, selectedLesson.titulo)}
                >
                  Descargar video
                </button>
              ) : selectedLesson.video_url ? (
                <video controls className="w-full rounded-xl bg-slate-100">
                  <source src={selectedLesson.video_url} />
                </video>
              ) : (
                <div className="text-sm text-slate-600">Sin video.</div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
