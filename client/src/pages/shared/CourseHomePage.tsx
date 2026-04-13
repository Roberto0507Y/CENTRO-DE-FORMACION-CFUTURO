import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { CourseDetail } from "../../types/course";
import type { CourseManageOutletContext } from "./courseManage.types";

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

export function CourseHomePage() {
  const { api } = useAuth();
  const { courseId } = useOutletContext<CourseManageOutletContext>();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<ApiResponse<CourseDetail>>(`/courses/${courseId}`);
        setCourse(res.data.data);
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

  if (error) {
    return (
      <Card className="border-rose-200/80 bg-rose-50/90 p-4 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
        {error}
      </Card>
    );
  }

  if (!course) return null;

  const videoUrl = String(course.video_intro_url || "").trim();
  const ytEmbed = videoUrl && isYouTubeUrl(videoUrl) ? youtubeEmbedUrl(videoUrl) : null;

  return (
    <div className="cf-course-scope space-y-6">
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="overflow-hidden border-white/80 bg-white/88 shadow-[0_26px_80px_-56px_rgba(15,23,42,0.7)] lg:col-span-7 dark:border-slate-800/80 dark:bg-slate-900/92">
          <div className="relative aspect-[16/9] bg-slate-200 dark:bg-slate-900">
            {course.imagen_url ? (
              <img src={course.imagen_url} alt={course.titulo} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-800" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/0" />
            <div className="absolute left-4 bottom-4">
              <div className="text-white/80 text-xs font-bold uppercase tracking-wider">Curso</div>
              <div className="mt-1 text-white text-2xl font-black tracking-tight">{course.titulo}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="slate" className="text-[11px] px-2.5 py-1">
                  {course.nivel}
                </Badge>
                <Badge variant="blue" className="text-[11px] px-2.5 py-1">
                  {course.tipo_acceso === "gratis" ? "Gratis" : `Q${course.precio}`}
                </Badge>
                {course.estado ? (
                  <Badge variant={course.estado === "publicado" ? "green" : course.estado === "oculto" ? "slate" : "amber"} className="text-[11px] px-2.5 py-1">
                    {course.estado}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-5 space-y-4">
          <Card className="border-white/80 bg-white/88 p-5 shadow-[0_24px_72px_-52px_rgba(15,23,42,0.68)] dark:border-slate-800/80 dark:bg-slate-900/92">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Docente</div>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-11 w-11 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200 shrink-0 dark:bg-slate-950 dark:ring-slate-800">
                {course.docente.foto_url ? (
                  <img src={course.docente.foto_url} alt="Docente" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="truncate font-black text-slate-900 dark:text-slate-100">
                  {course.docente.nombres} {course.docente.apellidos}
                </div>
                <div className="truncate text-sm text-slate-600 dark:text-slate-300">Nivel: {course.nivel}</div>
              </div>
            </div>
          </Card>

          <Card className="border-white/80 bg-white/88 p-5 shadow-[0_24px_72px_-52px_rgba(15,23,42,0.68)] dark:border-slate-800/80 dark:bg-slate-900/92">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Descripción</div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
              {course.descripcion_corta || course.descripcion || "—"}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="border-white/80 bg-white/88 p-6 shadow-[0_26px_80px_-56px_rgba(15,23,42,0.7)] lg:col-span-7 dark:border-slate-800/80 dark:bg-slate-900/92">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Video</div>
              <div className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">Introducción</div>
            </div>
            {videoUrl ? (
              <a href={videoUrl} target="_blank" rel="noreferrer">
                <Button size="sm" variant="secondary">Abrir</Button>
              </a>
            ) : null}
          </div>

          <div className="mt-4">
            {ytEmbed ? (
              <div className="aspect-video overflow-hidden rounded-2xl bg-black ring-1 ring-slate-200 dark:ring-slate-800">
                <iframe
                  title="Video introductorio"
                  src={ytEmbed}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : videoUrl ? (
              <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200">
                Este curso tiene un video introductorio. Usa “Abrir” para verlo.
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
                No hay video configurado.
              </div>
            )}
          </div>
        </Card>

        <div className="lg:col-span-5 space-y-6">
          <Card className="border-white/80 bg-white/88 p-6 shadow-[0_26px_80px_-56px_rgba(15,23,42,0.7)] dark:border-slate-800/80 dark:bg-slate-900/92">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Requisitos</div>
            <div className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">Lo que necesitas</div>
            <div className="mt-4">
              {requisitos.length > 0 ? (
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  {requisitos.map((r, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                      <span className="min-w-0">{r}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
                  No hay requisitos configurados.
                </div>
              )}
            </div>
          </Card>

          <Card className="border-white/80 bg-white/88 p-6 shadow-[0_26px_80px_-56px_rgba(15,23,42,0.7)] dark:border-slate-800/80 dark:bg-slate-900/92">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Objetivos</div>
            <div className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">Qué aprenderás</div>
            <div className="mt-4">
              {objetivos.length > 0 ? (
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  {objetivos.map((o, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="min-w-0">{o}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
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
