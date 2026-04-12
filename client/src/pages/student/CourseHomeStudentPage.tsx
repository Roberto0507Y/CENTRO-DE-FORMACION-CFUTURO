import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { CourseDetail } from "../../types/course";
import type { AccessCheck } from "../../types/enrollment";

function isYouTubeUrl(url: string) {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/)/i.test(url);
}

function youtubeEmbedUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "").trim();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    const v = u.searchParams.get("v");
    return v ? `https://www.youtube.com/embed/${v}` : null;
  } catch {
    return null;
  }
}

function splitLines(text: string | null) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  return raw
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^-+\s*/, ""));
}

export function CourseHomeStudentPage() {
  const { api } = useAuth();
  const { courseId } = useParams();

  const [access, setAccess] = useState<AccessCheck | null>(null);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [accessRes, courseRes] = await Promise.all([
          api.get<ApiResponse<AccessCheck>>(`/enrollments/${courseId}/check-access`),
          api.get<ApiResponse<CourseDetail>>(`/courses/${courseId}`),
        ]);
        setAccess(accessRes.data.data);
        setCourse(courseRes.data.data);
      } catch {
        setError("No se pudo cargar la información del curso.");
      } finally {
        setLoading(false);
      }
    })();
  }, [api, courseId]);

  const requisitos = useMemo(() => splitLines(course?.requisitos ?? null), [course?.requisitos]);
  const objetivos = useMemo(() => splitLines(course?.objetivos ?? null), [course?.objetivos]);

  if (loading) {
    return (
      <div className="grid place-items-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error) return <Card className="p-4 text-sm text-rose-700">{error}</Card>;

  if (!course) return null;

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
          <Link to={`/courses/${course.slug}`}>
            <Button>Ver detalles</Button>
          </Link>
          <Link to="/student/my-courses">
            <Button variant="secondary">Volver</Button>
          </Link>
        </div>
      </Card>
    );
  }

  const videoUrl = String(course.video_intro_url || "").trim();
  const ytEmbed = videoUrl && isYouTubeUrl(videoUrl) ? youtubeEmbedUrl(videoUrl) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Página principal</div>
          <div className="mt-1 text-2xl font-black tracking-tight text-slate-900 truncate">{course.titulo}</div>
        </div>
        <Link to={`/student/course/${courseId}/materials`}>
          <Button variant="secondary">Ver materiales</Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="overflow-hidden lg:col-span-7">
          <div className="relative aspect-[16/9] bg-slate-200">
            {course.imagen_url ? (
              <img src={course.imagen_url} alt={course.titulo} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-slate-200 to-slate-100" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/0" />
            <div className="absolute left-4 bottom-4">
              <div className="text-white text-xl font-black tracking-tight">{course.titulo}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="slate" className="text-[11px] px-2.5 py-1">{course.nivel}</Badge>
                <Badge variant="blue" className="text-[11px] px-2.5 py-1">
                  {course.tipo_acceso === "gratis" ? "Gratis" : `Q${course.precio}`}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-5 space-y-4">
          <Card className="p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Docente</div>
            <div className="mt-2 font-black text-slate-900">
              {course.docente.nombres} {course.docente.apellidos}
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Descripción</div>
            <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
              {course.descripcion_corta || course.descripcion || "—"}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="p-6 lg:col-span-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Video</div>
              <div className="mt-1 text-lg font-black text-slate-900">Introducción</div>
            </div>
            {videoUrl ? (
              <a href={videoUrl} target="_blank" rel="noreferrer">
                <Button size="sm" variant="secondary">Abrir</Button>
              </a>
            ) : null}
          </div>

          <div className="mt-4">
            {ytEmbed ? (
              <div className="aspect-video overflow-hidden rounded-2xl ring-1 ring-slate-200 bg-black">
                <iframe
                  title="Video introductorio"
                  src={ytEmbed}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : videoUrl ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                Este curso tiene un video introductorio. Usa “Abrir” para verlo.
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                No hay video configurado.
              </div>
            )}
          </div>
        </Card>

        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Requisitos</div>
            <div className="mt-1 text-lg font-black text-slate-900">Lo que necesitas</div>
            <div className="mt-4">
              {requisitos.length > 0 ? (
                <ul className="space-y-2 text-sm text-slate-700">
                  {requisitos.map((r, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                      <span className="min-w-0">{r}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  No hay requisitos configurados.
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Objetivos</div>
            <div className="mt-1 text-lg font-black text-slate-900">Qué aprenderás</div>
            <div className="mt-4">
              {objetivos.length > 0 ? (
                <ul className="space-y-2 text-sm text-slate-700">
                  {objetivos.map((o, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="min-w-0">{o}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  No hay objetivos configurados.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
