import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { FilePicker } from "../../components/ui/FilePicker";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import { ConfirmDeleteModal } from "../../components/ui/ConfirmDeleteModal";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { CourseDetail, CourseStatus } from "../../types/course";
import type {
  CreateTaskInput,
  GradeSubmissionInput,
  Task,
  TaskStatus,
  TaskSubmissionWithStudent,
  UpdateTaskInput,
} from "../../types/task";
import { getApiErrorMessage } from "../../utils/apiError";
import { downloadFileUrl } from "../../utils/downloadFile";
import type { CourseManageOutletContext } from "./courseManage.types";

type Banner = { tone: "success" | "error"; text: string } | null;

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

function toLocalInputValue(mysqlDatetime: string | null) {
  if (!mysqlDatetime) return "";
  return mysqlDatetime.replace(" ", "T").slice(0, 16);
}

function toMysqlDatetime(local: string) {
  if (!local) return local;
  const v = local.replace("T", " ");
  return v.length === 16 ? `${v}:00` : v;
}

type FormState = {
  titulo: string;
  descripcion: string;
  instrucciones: string;
  enlace_url: string;
  puntos: string;
  fecha_entrega: string;
  estado: TaskStatus;
};

function buildTaskFormData(payload: Record<string, string | number | null | undefined>, file: File) {
  const fd = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;
    fd.append(key, value === null ? "" : String(value));
  });
  fd.append("file", file);
  return fd;
}

function toDraftText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
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
    estado: "borrador",
  });

  const [submissionsOpen, setSubmissionsOpen] = useState(false);
  const [submissionsTask, setSubmissionsTask] = useState<Task | null>(null);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissions, setSubmissions] = useState<TaskSubmissionWithStudent[]>([]);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      setBanner(null);
      const res = await api.get<ApiResponse<Task[]>>(`/tasks/course/${ctx.courseId}`);
      setItems(res.data.data);
    } catch (err) {
      setItems([]);
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudieron cargar las tareas.") });
    } finally {
      setIsLoading(false);
    }
  }, [api, ctx.courseId]);

  const loadCourse = useCallback(async () => {
    try {
      setCourseLoading(true);
      const res = await api.get<ApiResponse<CourseDetail>>(`/courses/${ctx.courseId}`);
      setCourse(res.data.data);
    } catch {
      setCourse(null);
    } finally {
      setCourseLoading(false);
    }
  }, [api, ctx.courseId]);

  useEffect(() => {
    void loadTasks();
    void loadCourse();
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
      fecha_entrega: toLocalInputValue(t.fecha_entrega),
      estado: t.estado,
    });
    setModalOpen(true);
    window.setTimeout(() => focusTitle(), 0);
  };

  const validation = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!form.titulo.trim()) errors.titulo = "Título requerido";
    if (!form.fecha_entrega) errors.fecha_entrega = "Fecha de entrega requerida";
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
        fecha_entrega: toMysqlDatetime(form.fecha_entrega),
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

  const openSubmissions = async (t: Task) => {
    setSubmissionsTask(t);
    setSubmissions([]);
    setSubmissionsError(null);
    setSubmissionsOpen(true);
    try {
      setSubmissionsLoading(true);
      const res = await api.get<ApiResponse<TaskSubmissionWithStudent[]>>(`/tasks/${t.id}/submissions`, {
        params: { limit: 50, offset: 0 },
      });
      setSubmissions(res.data.data);
    } catch (err) {
      const message = getApiErrorMessage(err, "No se pudieron cargar las entregas.");
      setSubmissionsError(message);
      setBanner({ tone: "error", text: message });
      setSubmissions([]);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const gradeSubmission = async (submissionId: number, input: GradeSubmissionInput) => {
    if (!submissionsTask) return;
    const res = await api.put<ApiResponse<TaskSubmissionWithStudent>>(
      `/tasks/${submissionsTask.id}/submissions/${submissionId}/grade`,
      input
    );
    setSubmissions((prev) => prev.map((item) => (item.id === submissionId ? res.data.data : item)));
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
    const now = new Date();
    const upcoming = items
      .filter((t) => t.estado !== "cerrada")
      .map((t) => ({ t, dt: new Date(t.fecha_entrega) }))
      .filter((x) => Number.isFinite(x.dt.getTime()) && x.dt.getTime() >= now.getTime())
      .sort((a, b) => a.dt.getTime() - b.dt.getTime());

    const nextDue = upcoming[0]?.dt ?? null;
    const next7DaysCount = upcoming.filter((x) => x.dt.getTime() <= now.getTime() + 7 * 24 * 3600 * 1000).length;

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
                  {stats.nextDue ? `Siguiente: ${stats.nextDue.toLocaleString("es-GT")}` : "Sin pendientes"}
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
                              <span className="font-black">{new Date(t.fecha_entrega).toLocaleString("es-GT")}</span>
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
        <Card className="p-5">
          <div className="text-sm font-black text-slate-900">Curso</div>
          <div className="mt-1 text-sm text-slate-600">Información rápida</div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {courseLoading ? (
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Spinner />
                Cargando…
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Título</div>
                    <div className="mt-1 text-sm font-black text-slate-900 line-clamp-2">
                      {course?.titulo ?? ctx.courseTitle}
                    </div>
                  </div>
                  <div className="shrink-0">{courseStatusBadge(course?.estado)}</div>
                </div>
                {course ? (
                  <div className="text-xs text-slate-600">
                    Docente:{" "}
                    <span className="font-bold">
                      {course.docente.nombres} {course.docente.apellidos}
                    </span>
                  </div>
                ) : null}
                <div className="text-xs text-slate-600">
                  Curso ID: <span className="font-bold">{ctx.courseId}</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-2">
            <Button variant="ghost" onClick={() => void loadTasks()}>
              Actualizar
            </Button>
          </div>
        </Card>
      </aside>

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

      {submissionsOpen && submissionsTask ? (
        <SubmissionsModal
          taskTitle={submissionsTask.titulo}
          maxPoints={Number(submissionsTask.puntos)}
          loading={submissionsLoading}
          items={submissions}
          errorMessage={submissionsError}
          onOpenFileUrl={(url, filename) => void downloadFileUrl(api, url, filename)}
          onGrade={(submissionId, input) => gradeSubmission(submissionId, input)}
          onRetry={() => void openSubmissions(submissionsTask)}
          onClose={() => {
            setSubmissionsOpen(false);
            setSubmissionsTask(null);
            setSubmissions([]);
            setSubmissionsError(null);
          }}
        />
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

function TaskModal({
  title,
  saving,
  value,
  selectedFile,
  onFileChange,
  existingFileUrl,
  onOpenExistingFile,
  onRemoveExistingFile,
  errors,
  onChange,
  onClose,
  onSave,
}: {
  title: string;
  saving: boolean;
  value: FormState;
  selectedFile: File | null;
  onFileChange: (f: File | null) => void;
  existingFileUrl: string | null;
  onOpenExistingFile?: () => void;
  onRemoveExistingFile?: () => void;
  errors: Record<string, string>;
  onChange: (v: FormState) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <Card className="mx-auto my-6 flex w-full max-w-3xl flex-col overflow-hidden max-h-[calc(100vh-3rem)]">
        <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-black text-slate-900">{title}</div>
              <div className="mt-1 text-sm text-slate-600">Información básica, entrega y contenido.</div>
            </div>
            <div className="shrink-0">{statusBadge(value.estado)}</div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white p-6 space-y-6">
          {/* Información básica */}
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-900 text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7h16M4 12h16M4 17h10" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-black text-slate-900">Información básica</div>
                <div className="text-xs text-slate-600">Título y estado.</div>
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              <div>
                <div className="text-xs font-extrabold text-slate-700">Título</div>
                <div className="mt-2">
                  <Input
                    id="task-title"
                    value={value.titulo}
                    onChange={(e) => onChange({ ...value, titulo: e.target.value })}
                    placeholder="Ej: Tarea 1 — Introducción"
                  />
                  {errors.titulo ? <div className="mt-2 text-xs font-bold text-rose-700">{errors.titulo}</div> : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-extrabold text-slate-700">Estado</div>
                  <div className="mt-2">
                    <select
                      value={value.estado}
                      onChange={(e) => onChange({ ...value, estado: e.target.value as TaskStatus })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                    >
                      <option value="borrador">Borrador</option>
                      <option value="publicada">Publicada</option>
                      <option value="cerrada">Cerrada</option>
                    </select>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-700">Puntos</div>
                  <div className="mt-2">
                    <Input
                      inputMode="numeric"
                      value={value.puntos}
                      onChange={(e) => onChange({ ...value, puntos: e.target.value })}
                    />
                    {errors.puntos ? <div className="mt-2 text-xs font-bold text-rose-700">{errors.puntos}</div> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Entrega */}
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-blue-600 text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v2M16 3v2M3 9h18M5 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-black text-slate-900">Entrega</div>
                <div className="text-xs text-slate-600">Fecha y hora límite.</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-extrabold text-slate-700">Fecha de entrega</div>
              <div className="mt-2">
                <Input
                  type="datetime-local"
                  value={value.fecha_entrega}
                  onChange={(e) => onChange({ ...value, fecha_entrega: e.target.value })}
                />
                {errors.fecha_entrega ? (
                  <div className="mt-2 text-xs font-bold text-rose-700">{errors.fecha_entrega}</div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-emerald-500 text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16v16H4V4Zm4 4h8M8 12h8M8 16h6" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-black text-slate-900">Contenido</div>
                <div className="text-xs text-slate-600">Descripción e instrucciones.</div>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <div className="text-xs font-extrabold text-slate-700">Enlace externo (opcional)</div>
                <div className="mt-2">
                  <Input
                    value={value.enlace_url}
                    onChange={(e) => onChange({ ...value, enlace_url: e.target.value })}
                    placeholder="https://youtube.com/..."
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    Puedes pegar un enlace (YouTube/Vimeo/URL directa). Se guarda en la base de datos.
                  </div>
                  {errors.enlace_url ? (
                    <div className="mt-2 text-xs font-bold text-rose-700">{errors.enlace_url}</div>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="text-xs font-extrabold text-slate-700">Adjunto en S3 (opcional)</div>
                <div className="mt-2 space-y-2">
                  <FilePicker
                    label={existingFileUrl ? "Reemplazar archivo" : "Adjuntar archivo"}
                    helperText={
                      existingFileUrl
                        ? "Si seleccionas un nuevo archivo, se sube a S3 y luego se elimina el anterior."
                        : "PDF, imágenes, ZIP o documentos (opcional)."
                    }
                    accept="application/pdf,image/jpeg,image/png,image/webp,text/plain,application/zip,application/x-zip-compressed,application/msword,application/vnd.ms-excel,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    value={selectedFile}
                    onChange={onFileChange}
                    disabled={saving}
                  />

                  {!selectedFile && existingFileUrl ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <button
                        className="font-semibold text-blue-600 hover:underline"
                        type="button"
                        onClick={onOpenExistingFile}
                      >
                        Ver adjunto actual
                      </button>
                      {onRemoveExistingFile ? (
                        <Button variant="ghost" size="sm" type="button" onClick={onRemoveExistingFile}>
                          Quitar adjunto actual
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="text-xs font-extrabold text-slate-700">Descripción</div>
                <textarea
                  value={value.descripcion}
                  onChange={(e) => onChange({ ...value, descripcion: e.target.value })}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                  placeholder="Resumen breve…"
                />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-700">Instrucciones</div>
                <textarea
                  value={value.instrucciones}
                  onChange={(e) => onChange({ ...value, instrucciones: e.target.value })}
                  rows={6}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                  placeholder="Qué debe entregar el estudiante…"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SubmissionsModal({
  taskTitle,
  maxPoints,
  loading,
  items,
  errorMessage,
  onOpenFileUrl,
  onGrade,
  onRetry,
  onClose,
}: {
  taskTitle: string;
  maxPoints: number;
  loading: boolean;
  items: TaskSubmissionWithStudent[];
  errorMessage: string | null;
  onOpenFileUrl: (url: string, filename: string) => void;
  onGrade: (submissionId: number, input: GradeSubmissionInput) => Promise<void>;
  onRetry: () => void;
  onClose: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<number, { calificacion: string; comentario_docente: string }>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        items.map((item) => [
          item.id,
          {
            calificacion: toDraftText(item.calificacion),
            comentario_docente: toDraftText(item.comentario_docente),
          },
        ])
      )
    );
  }, [items]);

  const maxLabel = Number.isFinite(maxPoints) ? maxPoints : 1000;

  const saveGrade = async (submission: TaskSubmissionWithStudent) => {
    const draft = drafts[submission.id] ?? { calificacion: "", comentario_docente: "" };
    const score = Number(toDraftText(draft.calificacion).replace(",", "."));

    if (!Number.isFinite(score) || score < 0) {
      setLocalError("Ingresa una calificación válida.");
      return;
    }
    if (Number.isFinite(maxPoints) && score > maxPoints) {
      setLocalError(`La calificación no puede ser mayor a ${maxPoints} puntos.`);
      return;
    }

    try {
      setSavingId(submission.id);
      setLocalError(null);
      await onGrade(submission.id, {
        calificacion: score,
        comentario_docente: draft.comentario_docente.trim() || null,
        estado: "revisada",
      });
    } catch (err) {
      setLocalError(getApiErrorMessage(err, "No se pudo guardar la calificación."));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true">
      <Card className="mx-auto my-6 w-full max-w-[96rem] overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-950">
          <div>
            <div className="text-base font-black text-slate-900 dark:text-white">Entregas</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">Tarea: “{taskTitle}”</div>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto bg-white p-6 dark:bg-slate-950">
          {localError ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 dark:border-rose-400/30 dark:bg-rose-950/40 dark:text-rose-200">
              {localError}
            </div>
          ) : null}

          {loading ? (
            <div className="grid place-items-center py-10">
              <Spinner />
            </div>
          ) : errorMessage ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-400/30 dark:bg-rose-950/40 dark:text-rose-200">
              <div className="font-black">No se pudieron cargar las entregas</div>
              <div className="mt-2">{errorMessage}</div>
              <div className="mt-4">
                <Button size="sm" onClick={onRetry}>
                  Reintentar
                </Button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <EmptyState title="Sin entregas todavía" description="Aún no hay estudiantes que hayan entregado esta tarea." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1320px] text-left text-sm">
                <thead className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr className="[&>th]:pb-3">
                    <th>Estudiante</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Entrega</th>
                    <th>Calificación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {items.map((s) => {
                    const draft = drafts[s.id] ?? {
                      calificacion: toDraftText(s.calificacion),
                      comentario_docente: toDraftText(s.comentario_docente),
                    };
                    const badgeVariant =
                      s.estado === "revisada"
                        ? "blue"
                        : s.estado === "devuelta"
                          ? "rose"
                          : s.estado === "atrasada"
                            ? "amber"
                            : "green";

                    return (
                      <tr key={s.id} className="[&>td]:py-3 [&>td]:align-top">
                        <td className="font-semibold text-slate-900 dark:text-slate-100">
                          {s.estudiante.nombres} {s.estudiante.apellidos}
                          <div className="text-xs font-normal text-slate-500 dark:text-slate-400">{s.estudiante.correo}</div>
                        </td>
                        <td>
                          <Badge variant={badgeVariant}>{s.estado}</Badge>
                          {s.fecha_calificacion ? (
                            <div className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              Revisada: {new Date(s.fecha_calificacion).toLocaleString("es-GT")}
                            </div>
                          ) : null}
                        </td>
                        <td className="text-slate-600 dark:text-slate-300">{new Date(s.fecha_entrega).toLocaleString("es-GT")}</td>
                        <td className="max-w-[260px] space-y-1">
                          {s.archivo_url ? (
                            <button
                              className="block font-semibold text-blue-600 hover:underline dark:text-cyan-300"
                              type="button"
                              onClick={() => onOpenFileUrl(s.archivo_url!, `${s.estudiante.nombres}-${s.estudiante.apellidos}`)}
                            >
                              Ver archivo
                            </button>
                          ) : null}
                          {s.enlace_url ? (
                            <button
                              className="block font-semibold text-blue-600 hover:underline dark:text-cyan-300"
                              type="button"
                              onClick={() => onOpenFileUrl(s.enlace_url!, `${s.estudiante.nombres}-${s.estudiante.apellidos}`)}
                            >
                              Ver enlace
                            </button>
                          ) : null}
                          {s.comentario_estudiante ? (
                            <div className="line-clamp-3 text-xs text-slate-600 dark:text-slate-400">{s.comentario_estudiante}</div>
                          ) : (
                            <div className="text-xs text-slate-400 dark:text-slate-500">Sin comentario</div>
                          )}
                        </td>
                        <td className="w-[560px]">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                            <div className="grid gap-3 lg:grid-cols-[170px_minmax(0,1fr)]">
                              <div>
                                <div className="mb-1 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                  Puntos
                                </div>
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={draft.calificacion}
                                    onChange={(event) =>
                                      setDrafts((prev) => ({
                                        ...prev,
                                        [s.id]: { ...draft, calificacion: event.target.value },
                                      }))
                                    }
                                    inputMode="decimal"
                                    placeholder={`0 - ${maxLabel}`}
                                    className="h-10"
                                  />
                                  <span className="shrink-0 text-xs font-black text-slate-500 dark:text-slate-400">/ {maxLabel}</span>
                                </div>
                                <div className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                  {toDraftText(s.calificacion) ? `Nota actual: ${s.calificacion}` : "Sin nota"}
                                </div>
                              </div>
                              <div>
                                <div className="mb-1 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                  Comentario del docente
                                </div>
                                <textarea
                                  value={draft.comentario_docente}
                                  onChange={(event) =>
                                    setDrafts((prev) => ({
                                      ...prev,
                                      [s.id]: { ...draft, comentario_docente: event.target.value },
                                    }))
                                  }
                                  rows={3}
                                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none ring-blue-500 transition placeholder:text-slate-400 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                                  placeholder="Retroalimentación para el estudiante..."
                                />
                              </div>
                            </div>
                            <div className="mt-3 flex justify-end">
                              <Button
                                size="sm"
                                onClick={() => void saveGrade(s)}
                                disabled={savingId === s.id || !toDraftText(draft.calificacion).trim()}
                              >
                                {savingId === s.id ? "Guardando..." : "Guardar nota"}
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
