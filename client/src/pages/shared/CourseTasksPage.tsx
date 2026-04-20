import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Spinner } from "../../components/ui/Spinner";
import { ConfirmDeleteModal } from "../../components/ui/ConfirmDeleteModal";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { CourseDetail, CourseStatus } from "../../types/course";
import type {
  CreateTaskInput,
  GradeSubmissionInput,
  Task,
  TaskSubmissionFilter,
  TaskSubmissionList,
  TaskStatus,
  TaskSubmissionWithStudent,
  UpdateTaskInput,
} from "../../types/task";
import { getApiErrorMessage } from "../../utils/apiError";
import { downloadFileUrl } from "../../utils/downloadFile";
import {
  compareDateTimeLocalValues,
  formatGuatemalaDateTime,
  fromDateTimeLocalValue,
  parseGuatemalaDateTime,
  toDateTimeLocalValue,
} from "../../utils/guatemalaDate";
import { lazyNamed } from "../../utils/lazyNamed";
import type { CourseManageOutletContext } from "./courseManage.types";

type Banner = { tone: "success" | "error"; text: string } | null;

function submissionRowKey(item: TaskSubmissionWithStudent) {
  return item.id > 0 ? `submission:${item.id}` : `student:${item.estudiante.id}`;
}

const TaskModal = lazyNamed(() => import("../../components/course/CourseTaskModals"), "TaskModal");
const SubmissionsModal = lazyNamed(
  () => import("../../components/course/CourseTaskModals"),
  "SubmissionsModal"
);
const SUBMISSIONS_PAGE_SIZE = 8;

function statusBadge(estado: TaskStatus) {
  if (estado === "publicada") return <Badge variant="green">Publicada</Badge>;
  if (estado === "borrador") return <Badge variant="slate">Borrador</Badge>;
  return <Badge variant="amber">Cerrada</Badge>;
}

function courseStatusBadge(estado?: CourseStatus) {
  if (estado === "publicado") return <Badge variant="green">Publicado</Badge>;
  if (estado === "oculto") return <Badge variant="slate">Oculto</Badge>;
  return <Badge variant="amber">Borrador</Badge>;
}

function courseQuickCardTone(estado?: CourseStatus) {
  if (estado === "publicado") {
    return "border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 shadow-[0_28px_70px_-52px_rgba(5,150,105,0.45)]";
  }
  if (estado === "oculto") {
    return "border-slate-200 bg-gradient-to-br from-slate-100 via-white to-slate-50 shadow-[0_28px_70px_-52px_rgba(51,65,85,0.42)]";
  }
  return "border-cyan-100/80 bg-gradient-to-br from-cyan-50 via-white to-blue-50 shadow-[0_28px_70px_-52px_rgba(14,116,144,0.35)]";
}

function courseQuickCardAccent(estado?: CourseStatus) {
  if (estado === "publicado") return "from-emerald-600 to-cyan-500 text-white";
  if (estado === "oculto") return "from-slate-700 to-slate-500 text-white";
  return "from-sky-600 to-cyan-500 text-white";
}

function courseInitial(title?: string) {
  return (title?.trim()?.[0] ?? "C").toUpperCase();
}

type FormState = {
  titulo: string;
  descripcion: string;
  instrucciones: string;
  enlace_url: string;
  puntos: string;
  fecha_entrega: string;
  fecha_cierre: string;
  permite_entrega_tardia: boolean;
  estado: TaskStatus;
};

function buildTaskFormData(payload: Record<string, string | number | boolean | null | undefined>, file: File) {
  const fd = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;
    fd.append(key, value === null ? "" : String(value));
  });
  fd.append("file", file);
  return fd;
}

function EmptyTasksIcon() {
  return (
    <div className="grid h-14 w-14 place-items-center rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm ring-1 ring-black/5">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 7h16M4 12h16M4 17h10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

const modalFallback = (
  <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
    <Card className="w-full max-w-md p-6">
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
        <Spinner />
        Cargando…
      </div>
    </Card>
  </div>
);

export function CourseTasksPage() {
  const { api } = useAuth();
  const ctx = useOutletContext<CourseManageOutletContext>();

  const [banner, setBanner] = useState<Banner>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<Task[]>([]);

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [courseLoading, setCourseLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingRemoveAttachment, setPendingRemoveAttachment] = useState<Task | null>(null);
  const [pendingCloseTask, setPendingCloseTask] = useState<Task | null>(null);
  const [form, setForm] = useState<FormState>({
    titulo: "",
    descripcion: "",
    instrucciones: "",
    enlace_url: "",
    puntos: "100",
    fecha_entrega: "",
    fecha_cierre: "",
    permite_entrega_tardia: false,
    estado: "borrador",
  });

  const [submissionsOpen, setSubmissionsOpen] = useState(false);
  const [submissionsTask, setSubmissionsTask] = useState<Task | null>(null);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissions, setSubmissions] = useState<TaskSubmissionList>({
    items: [],
    total: 0,
    limit: SUBMISSIONS_PAGE_SIZE,
    offset: 0,
    filter: "todos",
  });
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [submissionsFilter, setSubmissionsFilter] = useState<TaskSubmissionFilter>("todos");
  const submissionsRequestRef = useRef<AbortController | null>(null);

  const loadTasks = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setIsLoading(true);
        setBanner(null);
        const res = await api.get<ApiResponse<Task[]>>(`/tasks/course/${ctx.courseId}`, { signal });
        if (signal?.aborted) return;
        setItems(res.data.data);
      } catch (err) {
        if ((err as { code?: string }).code === "ERR_CANCELED" || signal?.aborted) return;
        setItems([]);
        setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudieron cargar las tareas.") });
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [api, ctx.courseId]
  );

  const loadCourse = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setCourseLoading(true);
        const res = await api.get<ApiResponse<CourseDetail>>(`/courses/${ctx.courseId}`, { signal });
        if (signal?.aborted) return;
        setCourse(res.data.data);
      } catch (err) {
        if ((err as { code?: string }).code === "ERR_CANCELED" || signal?.aborted) return;
        setCourse(null);
      } finally {
        if (!signal?.aborted) setCourseLoading(false);
      }
    },
    [api, ctx.courseId]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadTasks(controller.signal);
    void loadCourse(controller.signal);
    return () => controller.abort();
  }, [loadCourse, loadTasks]);

  const focusTitle = () => {
    const el = document.getElementById("task-title") as HTMLInputElement | null;
    el?.focus();
  };

  const resetForm = () => {
    setEditing(null);
    setSelectedFile(null);
    setForm({
      titulo: "",
      descripcion: "",
      instrucciones: "",
      enlace_url: "",
      puntos: "100",
      fecha_entrega: "",
      fecha_cierre: "",
      permite_entrega_tardia: false,
      estado: "borrador",
    });
  };

  const openCreate = () => {
    setBanner(null);
    resetForm();
    setModalOpen(true);
    window.setTimeout(() => focusTitle(), 0);
  };

  const openEdit = (t: Task) => {
    setBanner(null);
    setEditing(t);
    setSelectedFile(null);
    setForm({
      titulo: t.titulo ?? "",
      descripcion: t.descripcion ?? "",
      instrucciones: t.instrucciones ?? "",
      enlace_url: t.enlace_url ?? "",
      puntos: String(t.puntos ?? "100"),
      fecha_entrega: toDateTimeLocalValue(t.fecha_entrega),
      fecha_cierre: toDateTimeLocalValue(t.fecha_cierre),
      permite_entrega_tardia: t.permite_entrega_tardia === 1,
      estado: t.estado,
    });
    setModalOpen(true);
    window.setTimeout(() => focusTitle(), 0);
  };

  const validation = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!form.titulo.trim()) errors.titulo = "Título requerido";
    if (!form.fecha_entrega) errors.fecha_entrega = "Fecha de entrega requerida";
    if (form.fecha_cierre) {
      const diff = compareDateTimeLocalValues(form.fecha_cierre, form.fecha_entrega);
      if (diff === null) {
        errors.fecha_cierre = "Fecha de cierre inválida";
      } else if (diff < 0) {
        errors.fecha_cierre = "La fecha de cierre no puede ser anterior a la fecha de entrega.";
      }
    }
    const pts = Number(form.puntos);
    if (!Number.isFinite(pts) || pts < 0) errors.puntos = "Puntos inválidos";
    if (form.enlace_url.trim()) {
      try {
        new URL(form.enlace_url.trim());
      } catch {
        errors.enlace_url = "Enlace inválido";
      }
    }
    return { ok: Object.keys(errors).length === 0, errors };
  }, [form]);

  const save = async () => {
    if (!validation.ok) {
      setBanner({ tone: "error", text: "Revisa los campos marcados." });
      return;
    }
    try {
      setSaving(true);
      setBanner(null);

      const payloadBase = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion ? form.descripcion : null,
        instrucciones: form.instrucciones ? form.instrucciones : null,
        enlace_url: form.enlace_url ? form.enlace_url : null,
        puntos: Number(form.puntos || "100"),
        fecha_entrega: fromDateTimeLocalValue(form.fecha_entrega),
        fecha_cierre: form.fecha_cierre ? fromDateTimeLocalValue(form.fecha_cierre) : null,
        permite_entrega_tardia: form.permite_entrega_tardia,
        estado: form.estado,
      };

      if (!editing) {
        if (selectedFile) {
          const fd = buildTaskFormData(payloadBase, selectedFile);
          await api.post(`/tasks/course/${ctx.courseId}`, fd);
        } else {
          const payload: CreateTaskInput = payloadBase as CreateTaskInput;
          await api.post(`/tasks/course/${ctx.courseId}`, payload);
        }
        setBanner({ tone: "success", text: "Tarea creada." });
      } else {
        if (selectedFile) {
          const fd = buildTaskFormData(payloadBase, selectedFile);
          await api.put(`/tasks/${editing.id}`, fd);
        } else {
          const payload: UpdateTaskInput = payloadBase as UpdateTaskInput;
          await api.put(`/tasks/${editing.id}`, payload);
        }
        setBanner({ tone: "success", text: "Tarea actualizada." });
      }

      setModalOpen(false);
      resetForm();
      await loadTasks();
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo guardar la tarea.") });
    } finally {
      setSaving(false);
    }
  };

  const removeAttachment = async (t: Task) => {
    try {
      setSaving(true);
      setBanner(null);
      await api.put(`/tasks/${t.id}`, { archivo_url: null } satisfies UpdateTaskInput);
      setBanner({ tone: "success", text: "Adjunto eliminado." });
      await loadTasks();
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo eliminar el adjunto.") });
    } finally {
      setSaving(false);
      setPendingRemoveAttachment(null);
    }
  };

  const loadSubmissions = useCallback(
    async (task: Task, page: number, filter: TaskSubmissionFilter) => {
      submissionsRequestRef.current?.abort();
      const controller = new AbortController();
      submissionsRequestRef.current = controller;
      try {
        setSubmissionsLoading(true);
        setSubmissionsError(null);
        const limit = SUBMISSIONS_PAGE_SIZE;
        const offset = (page - 1) * limit;
        const res = await api.get<ApiResponse<TaskSubmissionList>>(`/tasks/${task.id}/submissions`, {
          params: { limit, offset, filter },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setSubmissions(res.data.data);
      } catch (err) {
        if ((err as { code?: string }).code === "ERR_CANCELED" || controller.signal.aborted) return;
        const message = getApiErrorMessage(err, "No se pudieron cargar las entregas.");
        setSubmissionsError(message);
        setBanner({ tone: "error", text: message });
        setSubmissions((prev) => ({
          ...prev,
          items: [],
          total: 0,
          limit: SUBMISSIONS_PAGE_SIZE,
          offset: (page - 1) * SUBMISSIONS_PAGE_SIZE,
          filter,
        }));
      } finally {
        if (!controller.signal.aborted) setSubmissionsLoading(false);
      }
    },
    [api]
  );

  const openSubmissions = (t: Task) => {
    submissionsRequestRef.current?.abort();
    setSubmissionsTask(t);
    setSubmissions({
      items: [],
      total: 0,
      limit: SUBMISSIONS_PAGE_SIZE,
      offset: 0,
      filter: "todos",
    });
    setSubmissionsPage(1);
    setSubmissionsFilter("todos");
    setSubmissionsError(null);
    setSubmissionsOpen(true);
  };

  useEffect(() => {
    if (!submissionsOpen || !submissionsTask) return;
    void loadSubmissions(submissionsTask, submissionsPage, submissionsFilter);
  }, [loadSubmissions, submissionsFilter, submissionsOpen, submissionsPage, submissionsTask]);

  useEffect(() => {
    return () => submissionsRequestRef.current?.abort();
  }, []);

  const gradeSubmission = async (submission: TaskSubmissionWithStudent, input: GradeSubmissionInput) => {
    if (!submissionsTask) return;
    const res =
      submission.has_submission && submission.id > 0
        ? await api.put<ApiResponse<TaskSubmissionWithStudent>>(
            `/tasks/${submissionsTask.id}/submissions/${submission.id}/grade`,
            input
          )
        : await api.put<ApiResponse<TaskSubmissionWithStudent>>(
            `/tasks/${submissionsTask.id}/students/${submission.estudiante.id}/grade`,
            input
          );
    const targetKey = submissionRowKey(submission);
    setSubmissions((prev) => ({
      ...prev,
      items: prev.items.map((item) => (submissionRowKey(item) === targetKey ? res.data.data : item)),
    }));
    setBanner({ tone: "success", text: "Entrega calificada." });
  };

  const closeTask = async (id: number) => {
    try {
      setSaving(true);
      setBanner(null);
      await api.delete(`/tasks/${id}`);
      setBanner({ tone: "success", text: "Tarea cerrada." });
      await loadTasks();
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo cerrar la tarea.") });
    } finally {
      setSaving(false);
      setPendingCloseTask(null);
    }
  };

  const stats = useMemo(() => {
    const total = items.length;
    const now = Date.now();
    const upcoming = items
      .filter((t) => t.estado !== "cerrada")
      .map((t) => ({ t, dt: parseGuatemalaDateTime(t.fecha_entrega, { endOfDayIfMidnight: true }) }))
      .filter((x): x is { t: Task; dt: Date } => {
        const dt = x.dt;
        return dt !== null && dt.getTime() >= now;
      })
      .sort((a, b) => a.dt.getTime() - b.dt.getTime());

    const nextDue = upcoming[0]?.dt ?? null;
    const next7DaysCount = upcoming.filter((x) => x.dt.getTime() <= now + 7 * 24 * 3600 * 1000).length;

    return { total, nextDue, next7DaysCount };
  }, [items]);

  const showEmptyOnly = !isLoading && items.length === 0;

  if (showEmptyOnly) {
    return (
      <>
        <Card className="p-8">
          <EmptyState
            icon={<EmptyTasksIcon />}
            title="Sin tareas"
            description="Crea la primera tarea y define su fecha de entrega."
            actionLabel="Crear primera tarea"
            onAction={openCreate}
          />
        </Card>

        {modalOpen ? (
          <TaskModal
            title={editing ? "Editar tarea" : "Nueva tarea"}
            saving={saving}
            value={form}
            selectedFile={selectedFile}
            onFileChange={setSelectedFile}
            existingFileUrl={editing?.archivo_url ?? null}
            onOpenExistingFile={
              editing?.archivo_url ? () => void downloadFileUrl(api, editing.archivo_url!, editing.titulo) : undefined
            }
            onRemoveExistingFile={editing?.archivo_url ? () => setPendingRemoveAttachment(editing) : undefined}
            errors={validation.errors}
            onChange={setForm}
            onClose={() => {
              setModalOpen(false);
              resetForm();
            }}
            onSave={() => void save()}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* Izquierda: contenido principal */}
      <section className="min-w-0 space-y-4">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 bg-white px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-black tracking-tight text-slate-900">Tareas</div>
                <div className="mt-1 text-sm text-slate-600">
                  Crea, publica y gestiona actividades del curso.
                </div>
              </div>
              <Button onClick={openCreate} className="h-11 px-4">
                <span className="inline-flex items-center gap-2">
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
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Nueva tarea
                </span>
              </Button>
            </div>
          </div>

          {banner ? (
            <div
              className={`mx-6 mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                banner.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
              role="status"
            >
              {banner.text}
            </div>
          ) : null}

          <div className="px-6 pb-6 pt-5">
            {/* Métricas */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="p-4">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Total de tareas</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{stats.total}</div>
                <div className="mt-1 text-xs text-slate-500">Incluye borradores y cerradas</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Próximas entregas</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{stats.next7DaysCount}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {stats.nextDue ? `Siguiente: ${formatGuatemalaDateTime(stats.nextDue)}` : "Sin pendientes"}
                </div>
              </Card>
            </div>

            {/* Lista */}
            <div className="mt-5">
              {isLoading ? (
                <div className="grid place-items-center py-10">
                  <Spinner />
                </div>
              ) : (
                <div className="mt-2 grid gap-3">
                  {items.map((t) => (
                    <Card
                      key={t.id}
                      className="border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-900/10"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-black tracking-tight text-slate-900">{t.titulo}</div>
                            {statusBadge(t.estado)}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                            <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                              Entrega:{" "}
                              <span className="font-black">
                                {formatGuatemalaDateTime(t.fecha_entrega, { endOfDayIfMidnight: true })}
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                              Puntos: <span className="font-black">{t.puntos}</span>
                            </span>
                            {t.archivo_url ? (
                              <button
                                type="button"
                                onClick={() => void downloadFileUrl(api, t.archivo_url!, t.titulo)}
                                className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100"
                              >
                                Adjunto
                              </button>
                            ) : null}
                            {t.enlace_url ? (
                              <button
                                type="button"
                                onClick={() => void downloadFileUrl(api, t.enlace_url!, t.titulo)}
                                className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                              >
                                Enlace
                              </button>
                            ) : null}
                          </div>
                          {t.descripcion ? (
                            <div className="mt-3 text-sm leading-relaxed text-slate-700 line-clamp-2">
                              {t.descripcion}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="ghost" onClick={() => void openSubmissions(t)}>
                            Entregas
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => openEdit(t)}>
                            Editar
                          </Button>
                          {t.estado !== "cerrada" ? (
                            <Button size="sm" variant="danger" onClick={() => setPendingCloseTask(t)}>
                              Cerrar
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </section>

      {/* Derecha: panel lateral */}
      <aside className="min-w-0 space-y-4">
        <Card className="border-white/80 bg-white/92 p-5 shadow-[0_28px_80px_-56px_rgba(15,23,42,0.18)]">
          <div className={`mt-4 rounded-3xl border p-4 shadow-sm shadow-slate-900/5 ${courseQuickCardTone(course?.estado)}`}>
            {courseLoading ? (
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Spinner />
                Cargando…
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`grid h-14 w-14 shrink-0 place-items-center rounded-[1.4rem] bg-gradient-to-br text-lg font-black ring-1 ring-white/70 shadow-lg shadow-slate-900/10 ${courseQuickCardAccent(course?.estado)}`}
                  >
                    {courseInitial(course?.titulo ?? ctx.courseTitle)}
                  </div>
                  <div className="min-w-0 flex-1">
                    {course?.categoria?.nombre ? (
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        {course.categoria.nombre}
                      </div>
                    ) : null}
                    <div className="mt-1 text-lg font-black tracking-tight text-slate-950 line-clamp-2">
                      {course?.titulo ?? ctx.courseTitle}
                    </div>
                    {course?.estado && course.estado !== "borrador" ? (
                      <div className="mt-2">{courseStatusBadge(course.estado)}</div>
                    ) : null}
                  </div>
                </div>
                {course ? (
                  <div className="rounded-[1.35rem] border border-white/75 bg-white/75 px-3.5 py-3 text-xs text-slate-600 backdrop-blur-sm">
                    <span className="font-bold uppercase tracking-[0.18em] text-slate-400">Docente</span>
                    <div className="mt-1 text-[15px] font-black text-slate-900">
                      {course.docente.nombres} {course.docente.apellidos}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-2">
            <Button variant="ghost" className="bg-slate-50/90 hover:bg-slate-100" onClick={() => void loadTasks()}>
              Actualizar
            </Button>
          </div>
        </Card>
      </aside>

      {modalOpen ? (
        <Suspense fallback={modalFallback}>
          <TaskModal
            title={editing ? "Editar tarea" : "Nueva tarea"}
            saving={saving}
            value={form}
            selectedFile={selectedFile}
            onFileChange={setSelectedFile}
            existingFileUrl={editing?.archivo_url ?? null}
            onOpenExistingFile={
              editing?.archivo_url ? () => void downloadFileUrl(api, editing.archivo_url!, editing.titulo) : undefined
            }
            onRemoveExistingFile={editing?.archivo_url ? () => setPendingRemoveAttachment(editing) : undefined}
            errors={validation.errors}
            onChange={setForm}
            onClose={() => {
              setModalOpen(false);
              resetForm();
            }}
            onSave={() => void save()}
          />
        </Suspense>
      ) : null}

      {submissionsOpen && submissionsTask ? (
        <Suspense fallback={modalFallback}>
          <SubmissionsModal
            taskTitle={submissionsTask.titulo}
            maxPoints={Number(submissionsTask.puntos)}
            loading={submissionsLoading}
            items={submissions.items}
            filter={submissionsFilter}
            page={submissionsPage}
            pageSize={submissions.limit}
            total={submissions.total}
            errorMessage={submissionsError}
            onOpenFileUrl={(url: string, filename: string) => void downloadFileUrl(api, url, filename)}
            onGrade={(submission: TaskSubmissionWithStudent, input: GradeSubmissionInput) =>
              gradeSubmission(submission, input)
            }
            onFilterChange={(nextFilter: TaskSubmissionFilter) => {
              setSubmissionsFilter(nextFilter);
              setSubmissionsPage(1);
            }}
            onPageChange={setSubmissionsPage}
            onRetry={() => void loadSubmissions(submissionsTask, submissionsPage, submissionsFilter)}
            onClose={() => {
              submissionsRequestRef.current?.abort();
              setSubmissionsOpen(false);
              setSubmissionsTask(null);
              setSubmissions({
                items: [],
                total: 0,
                limit: SUBMISSIONS_PAGE_SIZE,
                offset: 0,
                filter: "todos",
              });
              setSubmissionsPage(1);
              setSubmissionsFilter("todos");
              setSubmissionsError(null);
            }}
          />
        </Suspense>
      ) : null}

      <ConfirmDeleteModal
        open={Boolean(pendingRemoveAttachment)}
        title="¿Quitar adjunto?"
        description={`Vas a quitar el archivo adjunto de "${pendingRemoveAttachment?.titulo ?? "esta tarea"}".\nEsta acción no se puede deshacer.`}
        confirmLabel="Quitar"
        isLoading={saving}
        onCancel={() => setPendingRemoveAttachment(null)}
        onConfirm={() => {
          if (pendingRemoveAttachment) void removeAttachment(pendingRemoveAttachment);
        }}
      />

      <ConfirmDeleteModal
        open={Boolean(pendingCloseTask)}
        title="¿Cerrar tarea?"
        description={`Vas a cerrar "${pendingCloseTask?.titulo ?? "esta tarea"}".\nLos estudiantes ya no podrán entregarla.`}
        confirmLabel="Cerrar"
        isLoading={saving}
        onCancel={() => setPendingCloseTask(null)}
        onConfirm={() => {
          if (pendingCloseTask) void closeTask(pendingCloseTask.id);
        }}
      />
    </div>
  );
}
