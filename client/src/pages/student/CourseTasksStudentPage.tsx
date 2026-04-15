import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { FilePicker } from "../../components/ui/FilePicker";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { Task, TaskSubmission } from "../../types/task";
import { getApiErrorMessage } from "../../utils/apiError";
import { downloadFileUrl } from "../../utils/downloadFile";

type Banner = { tone: "success" | "error"; text: string } | null;
type SubmissionMethod = "file" | "link";
const MAX_STUDENT_FILE_UPLOADS_PER_TASK = 3;

function getPreferredSubmissionMethod(submission: TaskSubmission | null): SubmissionMethod {
  if ((submission?.subidas_archivo ?? 0) >= MAX_STUDENT_FILE_UPLOADS_PER_TASK) return "link";
  if (submission?.enlace_url && !submission.archivo_url) return "link";
  return "file";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
}

function gradeText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function taskAvailability(task: Task) {
  const now = Date.now();
  const due = new Date(task.fecha_entrega).getTime();
  const close = task.fecha_cierre ? new Date(task.fecha_cierre).getTime() : null;

  if (task.estado === "cerrada" || (close && Number.isFinite(close) && now > close)) {
    return { label: "Cerrada", variant: "rose" as const };
  }
  if (Number.isFinite(due) && now > due) {
    return task.permite_entrega_tardia
      ? { label: "Tardia permitida", variant: "amber" as const }
      : { label: "Vencida", variant: "rose" as const };
  }
  return { label: "Disponible", variant: "green" as const };
}

function submissionBadge(submission: TaskSubmission | null) {
  if (!submission) return { label: "Sin entrega", variant: "slate" as const };
  if (submission.estado === "atrasada") return { label: "Entregada tarde", variant: "amber" as const };
  if (submission.estado === "revisada") return { label: "Revisada", variant: "blue" as const };
  if (submission.estado === "devuelta") return { label: "Devuelta", variant: "rose" as const };
  return { label: "Entregada", variant: "green" as const };
}

export function CourseTasksStudentPage() {
  const { api } = useAuth();
  const { courseId } = useParams();
  const id = Number(courseId);

  const [banner, setBanner] = useState<Banner>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Task[]>([]);
  const [selected, setSelected] = useState<Task | null>(null);

  const [submission, setSubmission] = useState<TaskSubmission | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [submissionMethod, setSubmissionMethod] = useState<SubmissionMethod>("file");
  const [showComment, setShowComment] = useState(false);
  const [isReplacingSubmission, setIsReplacingSubmission] = useState(false);

  const selectedTaskId = selected?.id ?? null;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setBanner(null);
      const res = await api.get<ApiResponse<Task[]>>(`/tasks/course/${id}`);
      setItems(res.data.data);
      setSelected(null);
    } catch (err) {
      setItems([]);
      setSelected(null);
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudieron cargar las tareas.") });
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  const loadTaskDetail = useCallback(async (taskId: number) => {
    try {
      const res = await api.get<ApiResponse<Task>>(`/tasks/${taskId}`);
      setSelected((prev) => (prev?.id === taskId ? res.data.data : prev));
      return res.data.data;
    } catch {
      // dejamos la tarea actual si falla el refresh puntual
      return null;
    }
  }, [api]);

  const loadMySubmission = useCallback(async (taskId: number) => {
    try {
      const res = await api.get<ApiResponse<TaskSubmission | null>>(`/tasks/${taskId}/submissions/my`);
      const saved = res.data.data;
      setSubmission(saved);
      setComment(saved?.comentario_estudiante ?? "");
      setSubmissionMethod(getPreferredSubmissionMethod(saved));
    } catch {
      setSubmission(null);
      setComment("");
      setSubmissionMethod("file");
    }
  }, [api]);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) return;
    void load();
  }, [id, load]);

  useEffect(() => {
    if (!selectedTaskId) {
      setSubmission(null);
      return;
    }
    setBanner(null);
    setComment("");
    setFile(null);
    setLink("");
    setSubmissionMethod("file");
    setShowComment(false);
    setIsReplacingSubmission(false);
    void loadTaskDetail(selectedTaskId);
    void loadMySubmission(selectedTaskId);
  }, [loadMySubmission, loadTaskDetail, selectedTaskId]);

  const fileUploadsUsed = Math.min(
    MAX_STUDENT_FILE_UPLOADS_PER_TASK,
    Number(submission?.subidas_archivo ?? 0)
  );
  const fileUploadsRemaining = Math.max(0, MAX_STUDENT_FILE_UPLOADS_PER_TASK - fileUploadsUsed);
  const canUploadFile = fileUploadsRemaining > 0;

  const canSubmit = useMemo(() => {
    const hasSomething = submissionMethod === "file" ? Boolean(file) && canUploadFile : Boolean(link.trim());
    return Boolean(selected && hasSomething);
  }, [canUploadFile, file, link, selected, submissionMethod]);

  const submit = async () => {
    if (!selected) return;
    if (!canSubmit) {
      setBanner({
        tone: "error",
        text:
          submissionMethod === "file" && !canUploadFile
            ? `Ya usaste las ${MAX_STUDENT_FILE_UPLOADS_PER_TASK} subidas de archivo para esta tarea. Puedes entregar por enlace.`
            : "Selecciona un archivo o agrega un enlace para entregar la tarea.",
      });
      return;
    }
    try {
      setSubmitting(true);
      setBanner(null);
      const latestTask = (await loadTaskDetail(selected.id)) ?? selected;
      const trimmedComment = comment.trim();
      const res =
        submissionMethod === "file"
          ? await submitFile(latestTask.id, file, trimmedComment)
          : await api.post<ApiResponse<TaskSubmission>>(`/tasks/${latestTask.id}/submissions`, {
              enlace_url: link.trim(),
              ...(trimmedComment ? { comentario_estudiante: trimmedComment } : {}),
            });
      const saved = res.data.data;
      setSubmission(saved);
      setComment(saved.comentario_estudiante ?? "");
      setFile(null);
      setLink("");
      setSubmissionMethod("file");
      setShowComment(false);
      setIsReplacingSubmission(false);
      setBanner({ tone: "success", text: "Entrega enviada." });
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo enviar la entrega.") });
    } finally {
      setSubmitting(false);
    }
  };

  const submitFile = async (taskId: number, selectedFile: File | null, trimmedComment: string) => {
    if (!selectedFile) throw new Error("Archivo requerido");
    const fd = new FormData();
    fd.append("file", selectedFile);
    if (trimmedComment) fd.append("comentario_estudiante", trimmedComment);
    return api.post<ApiResponse<TaskSubmission>>(`/tasks/${taskId}/submissions`, fd);
  };

  const submitComment = async () => {
    if (!selected || commentSaving) return;
    const normalizedComment = comment.trim();
    const hadComment = Boolean(submission?.comentario_estudiante?.trim());
    if (!normalizedComment && !hadComment) {
      setBanner({ tone: "error", text: "Escribe un comentario antes de guardarlo." });
      return;
    }
    try {
      setCommentSaving(true);
      setBanner(null);
      const res = await api.post<ApiResponse<TaskSubmission>>(`/tasks/${selected.id}/submissions`, {
        comentario_estudiante: normalizedComment || null,
      });
      setSubmission(res.data.data);
      setComment(res.data.data.comentario_estudiante ?? "");
      setShowComment(false);
      setBanner({ tone: "success", text: "Comentario guardado." });
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo guardar el comentario.") });
    } finally {
      setCommentSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-10">
        <Spinner />
      </div>
    );
  }

  const hasSubmittedWork = Boolean(submission?.archivo_url || submission?.enlace_url);
  const hasSavedComment = Boolean(submission?.comentario_estudiante?.trim());
  const deliveryStatus = hasSubmittedWork
    ? submissionBadge(submission)
    : hasSavedComment
      ? { label: "Comentario guardado", variant: "blue" as const }
      : submissionBadge(null);
  const hasCommentChanges = comment.trim() !== (submission?.comentario_estudiante ?? "").trim();
  const canSaveComment = Boolean(selected) && !commentSaving && (Boolean(comment.trim()) || hasSavedComment) && hasCommentChanges;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Tareas</div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
            {selected ? selected.titulo : "Selecciona una tarea"}
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {selected
              ? "Revisa los detalles y envía tu archivo, enlace o comentario."
              : "Primero elige una tarea del listado. El formulario aparecerá después de seleccionarla."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selected ? (
            <Button
              variant="ghost"
              onClick={() => {
                setSelected(null);
                setBanner(null);
              }}
            >
              Volver a tareas
            </Button>
          ) : null}
          <Link to={`/student/course/${id}`}>
            <Button variant="ghost">Volver al curso</Button>
          </Link>
        </div>
      </div>

      {banner ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            banner.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
          role="status"
        >
          {banner.text}
        </div>
      ) : null}

      {!selected ? (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-black text-slate-900">Tareas disponibles</div>
              <div className="text-xs font-bold text-slate-500">{items.length} tareas publicadas</div>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Sin tareas" description="Cuando tu docente publique tareas, aparecerán aquí." />
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {items.map((task) => {
                const status = taskAvailability(task);
                return (
                  <button
                    key={task.id}
                    className="group flex w-full items-center gap-4 bg-white px-5 py-4 text-left transition hover:bg-slate-50"
                    onClick={() => setSelected(task)}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-700">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                        <path
                          d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinejoin="round"
                        />
                        <path d="M14 3v5h5M9 13h6M9 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-black text-slate-950">{task.titulo}</span>
                      <span className="mt-1 block text-xs font-semibold text-slate-500">
                        Entrega: {formatDate(task.fecha_entrega)} · {task.puntos} pts
                      </span>
                    </span>

                    <span className="hidden shrink-0 sm:block">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </span>

                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 transition group-hover:bg-blue-600 group-hover:text-white">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      ) : (
        <div className="bg-white px-4 py-6 md:px-8 md:py-8">
          <div className="grid gap-6 border-b border-slate-200 pb-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="min-w-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value="1"
                  disabled
                  className="h-10 w-full rounded-none border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none sm:w-56"
                >
                  <option value="1">Intento 1</option>
                </select>
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`h-8 w-8 rounded-full border-2 bg-white ${
                      hasSubmittedWork ? "border-emerald-500" : "border-amber-400"
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-700">
                      {hasSubmittedWork
                        ? `Entregado el ${formatDate(submission?.fecha_entrega ?? selected.fecha_entrega)}`
                        : hasSavedComment
                          ? "Comentario guardado"
                          : "En progreso"}
                    </div>
                    <div className="text-sm font-black text-emerald-700">
                      SIGUIENTE: {hasSubmittedWork ? "Revisar la retroalimentación" : "Presentar tarea"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-sm font-black text-slate-950">Se permite 1 intento</div>
              <div className="mt-1 text-sm text-slate-700">Disponible hasta {formatDate(selected.fecha_cierre ?? selected.fecha_entrega)}</div>
            </div>

            <aside className="lg:text-right">
              <div className="text-3xl font-medium tracking-tight text-slate-950">{selected.puntos} Punto Posible</div>
              <div className="mt-10 text-sm text-slate-700">
                Intento 1 Puntaje:
                <div className="font-semibold">
                  {gradeText(submission?.calificacion) ? `${submission?.calificacion} / ${selected.puntos}` : "N. a."}
                </div>
              </div>
              <button
                type="button"
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                onClick={() => setShowComment((value) => !value)}
                aria-expanded={showComment}
                aria-controls="task-submission-comment-panel"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                  <path
                    d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {comment.trim() || hasSavedComment ? "Editar comentario" : "Agregar comentario"}
              </button>
              {!showComment && hasSavedComment ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold leading-5 text-slate-600">
                  {submission?.comentario_estudiante}
                </div>
              ) : null}
            </aside>

            {showComment ? (
              <div
                id="task-submission-comment-panel"
                className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 lg:col-span-2"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-950">Comentario de entrega</div>
                  </div>
                  <Badge variant={hasSavedComment ? "blue" : "slate"}>
                    {hasSavedComment ? "Comentario guardado" : "Opcional"}
                  </Badge>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="mt-4 w-full resize-none rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none ring-blue-500 focus:ring-2"
                  placeholder="Escribe aquí tu comentario para el docente..."
                />
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => setComment(submission?.comentario_estudiante ?? "")}
                    disabled={commentSaving || !hasCommentChanges}
                  >
                    Deshacer
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-white"
                    onClick={() => setShowComment(false)}
                    disabled={commentSaving}
                  >
                    Cerrar
                  </button>
                  <Button onClick={() => void submitComment()} disabled={!canSaveComment}>
                    {commentSaving ? "Guardando..." : "Guardar comentario"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <section className="border-b border-slate-200 py-7">
            <div className="inline-flex items-center gap-2 text-base font-black text-slate-950">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Detalles
            </div>

            <div className="mt-5 max-w-5xl space-y-4 text-[15px] leading-7 text-slate-700">
              {selected.descripcion ? <p>{selected.descripcion}</p> : null}
              {selected.instrucciones ? <div className="whitespace-pre-wrap">{selected.instrucciones}</div> : null}
              {!selected.descripcion && !selected.instrucciones ? (
                <p className="text-sm text-slate-500">Esta tarea no tiene instrucciones adicionales.</p>
              ) : null}
            </div>
          </section>

          {selected.archivo_url || selected.enlace_url ? (
            <section className="border-b border-slate-200 py-7">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <div className="hidden border-b border-slate-300 px-5 py-3 text-sm font-black text-slate-800 md:grid md:grid-cols-[minmax(0,1fr)_180px]">
                  <div>Nombre del recurso</div>
                  <div>Acción</div>
                </div>

                {selected.archivo_url ? (
                  <button
                    className="flex flex-col items-start gap-3 border-b border-slate-200 bg-white px-5 py-4 text-left text-sm text-slate-700 hover:bg-slate-50 md:grid md:grid-cols-[minmax(0,1fr)_180px] md:items-center"
                    type="button"
                    onClick={() => void downloadFileUrl(api, selected.archivo_url!, selected.titulo)}
                  >
                    <span className="inline-flex min-w-0 items-center gap-4">
                      <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-slate-600" fill="none" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" />
                        <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      <span className="truncate font-semibold">Archivo adjunto del docente</span>
                    </span>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 md:justify-self-start md:rounded-none md:bg-transparent md:px-0 md:py-0 md:text-sm">
                      Abrir
                    </span>
                  </button>
                ) : null}

                {selected.enlace_url ? (
                  <button
                    className="flex flex-col items-start gap-3 border-b border-slate-200 bg-white px-5 py-4 text-left text-sm text-slate-700 hover:bg-slate-50 md:grid md:grid-cols-[minmax(0,1fr)_180px] md:items-center"
                    type="button"
                    onClick={() => void downloadFileUrl(api, selected.enlace_url!, selected.titulo)}
                  >
                    <span className="inline-flex min-w-0 items-center gap-4">
                      <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-slate-600" fill="none" aria-hidden="true">
                        <path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <span className="truncate font-semibold">Enlace de apoyo</span>
                    </span>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 md:justify-self-start md:rounded-none md:bg-transparent md:px-0 md:py-0 md:text-sm">
                      Abrir
                    </span>
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}

          {submission && hasSubmittedWork ? (
            <section className="border-b border-slate-200 py-7">
              <div className="text-base font-black text-slate-950">Tu entrega actual</div>
              <div className="mt-2 text-sm text-slate-700">Entregada el {formatDate(submission.fecha_entrega)}</div>
              <div className="mt-1 text-xs font-bold text-slate-500">
                Subidas de archivo usadas: {fileUploadsUsed}/{MAX_STUDENT_FILE_UPLOADS_PER_TASK}
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                {submission.archivo_url ? (
                  <button
                    className="font-black text-blue-700 hover:underline"
                    type="button"
                    onClick={() => void downloadFileUrl(api, submission.archivo_url!, selected.titulo)}
                  >
                    Ver tu archivo
                  </button>
                ) : null}
                {submission.enlace_url ? (
                  <button
                    className="font-black text-blue-700 hover:underline"
                    type="button"
                    onClick={() => void downloadFileUrl(api, submission.enlace_url!, selected.titulo)}
                  >
                    Ver tu enlace
                  </button>
                ) : null}
                {!submission.archivo_url && !submission.enlace_url ? (
                  <span className="font-semibold text-slate-600">Entrega sin archivo o enlace.</span>
                ) : null}
              </div>
              {submission.comentario_estudiante ? (
                <div className="mt-4 max-w-4xl border-l-2 border-slate-300 pl-4 text-sm leading-6 text-slate-700">
                  {submission.comentario_estudiante}
                </div>
              ) : null}
            </section>
          ) : null}

          {gradeText(submission?.calificacion) || submission?.comentario_docente ? (
            <section className="border-b border-slate-200 py-7">
              <div className="text-base font-black text-slate-950">Retroalimentación del docente</div>
              {gradeText(submission?.calificacion) ? (
                <div className="mt-3 inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
                  Nota: {submission?.calificacion} / {selected.puntos}
                </div>
              ) : null}
              {submission?.comentario_docente ? (
                <div className="mt-4 max-w-4xl rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                  {submission.comentario_docente}
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="py-7">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-base font-black text-slate-950">
                  {hasSubmittedWork && !isReplacingSubmission ? "Entrega enviada" : "Presentar tarea"}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {hasSubmittedWork && !isReplacingSubmission
                    ? "Tu entrega ya fue recibida. Puedes reemplazar el archivo o enlace si necesitas actualizarla."
                    : "Sube un archivo o comparte un enlace. El comentario se guarda arriba de forma independiente."}
                </div>
              </div>
              <Badge variant={deliveryStatus.variant}>{deliveryStatus.label}</Badge>
            </div>

            {hasSubmittedWork && !isReplacingSubmission ? (
              <div className="mt-5 flex max-w-5xl flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-black text-slate-950">No hay nada pendiente por subir.</div>
                  <div className="mt-1 text-sm text-slate-700">
                    Si entregas nuevamente, el nuevo archivo o enlace reemplazará al anterior.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      void loadTaskDetail(selected.id);
                      void loadMySubmission(selected.id);
                    }}
                    disabled={submitting}
                  >
                    Recargar
                  </Button>
                  <Button
                    onClick={() => {
                      setFile(null);
                      setLink("");
                      setShowComment(false);
                      setSubmissionMethod(getPreferredSubmissionMethod(submission));
                      setIsReplacingSubmission(true);
                    }}
                  >
                    ¿Quieres entregar nuevamente?
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-5 max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-black text-slate-950">Selecciona cómo entregar</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">
                      Elige archivo para subir a S3 o enlace para compartir una URL.
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-500">
                      {canUploadFile
                        ? `Te quedan ${fileUploadsRemaining} de ${MAX_STUDENT_FILE_UPLOADS_PER_TASK} subidas de archivo.`
                        : `Ya usaste las ${MAX_STUDENT_FILE_UPLOADS_PER_TASK} subidas de archivo; puedes entregar por enlace.`}
                    </div>
                  </div>
                  <div className="grid rounded-2xl bg-slate-100 p-1 sm:grid-cols-2">
                    <button
                      type="button"
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        submissionMethod === "file" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:bg-white/70"
                      }`}
                      onClick={() => {
                        setSubmissionMethod("file");
                        setLink("");
                      }}
                      aria-pressed={submissionMethod === "file"}
                      disabled={!canUploadFile}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                        <path d="M12 16V4m0 0-4 4m4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M20 16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Archivo
                    </button>
                    <button
                      type="button"
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${
                        submissionMethod === "link" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:bg-white/70"
                      }`}
                      onClick={() => {
                        setSubmissionMethod("link");
                        setFile(null);
                      }}
                      aria-pressed={submissionMethod === "link"}
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                        <path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Enlace
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  {submissionMethod === "file" ? (
                    <FilePicker
                      label="Archivo"
                      helperText={
                        isReplacingSubmission
                          ? `Selecciona un archivo nuevo para reemplazar el anterior. Te quedan ${fileUploadsRemaining} subidas.`
                          : `PDF, imagen, Word, Excel, PowerPoint, ZIP o TXT. Te quedan ${fileUploadsRemaining} subidas.`
                      }
                      accept="application/pdf,image/jpeg,image/png,image/webp,text/plain,application/zip,application/x-zip-compressed,application/msword,application/vnd.ms-excel,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                      value={file}
                      onChange={setFile}
                      disabled={submitting || !canUploadFile}
                    />
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="text-sm font-black text-slate-950">Enlace de entrega</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        Pega una URL pública para compartir tu trabajo.
                      </div>
                      <div className="mt-3">
                        <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4">
                  {isReplacingSubmission ? (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setFile(null);
                        setLink("");
                        setComment(submission?.comentario_estudiante ?? "");
                        setShowComment(false);
                        setIsReplacingSubmission(false);
                        setSubmissionMethod(getPreferredSubmissionMethod(submission));
                      }}
                      disabled={submitting}
                    >
                      Cancelar
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    onClick={() => {
                      void loadTaskDetail(selected.id);
                      void loadMySubmission(selected.id);
                    }}
                    disabled={submitting}
                  >
                    Recargar entrega
                  </Button>
                  <Button onClick={() => void submit()} disabled={submitting || !canSubmit}>
                    {submitting ? "Enviando..." : hasSubmittedWork ? "Reemplazar entrega" : "Enviar entrega"}
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
