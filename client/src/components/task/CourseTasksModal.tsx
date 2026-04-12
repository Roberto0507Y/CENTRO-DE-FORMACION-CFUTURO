import { useEffect, useMemo, useState } from "react";
import type { AxiosInstance } from "axios";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { Input } from "../ui/Input";
import { Spinner } from "../ui/Spinner";
import { ConfirmDeleteModal } from "../ui/ConfirmDeleteModal";
import type { ApiResponse } from "../../types/api";
import type { CreateTaskInput, Task, TaskStatus, UpdateTaskInput } from "../../types/task";
import { getApiErrorMessage } from "../../utils/apiError";

type Banner = { tone: "success" | "error"; text: string } | null;

function statusBadge(estado: TaskStatus) {
  if (estado === "publicada") return <Badge variant="green">Publicada</Badge>;
  if (estado === "borrador") return <Badge variant="slate">Borrador</Badge>;
  return <Badge variant="amber">Cerrada</Badge>;
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
  puntos: string;
  fecha_entrega: string; // local input
  estado: TaskStatus;
};

export function CourseTasksModal({
  api,
  open,
  courseId,
  courseTitle,
  onClose,
}: {
  api: AxiosInstance;
  open: boolean;
  courseId: number;
  courseTitle: string;
  onClose: () => void;
}) {
  const [banner, setBanner] = useState<Banner>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<Task[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [pendingCloseTask, setPendingCloseTask] = useState<Task | null>(null);
  const [form, setForm] = useState<FormState>({
    titulo: "",
    descripcion: "",
    instrucciones: "",
    puntos: "100",
    fecha_entrega: "",
    estado: "borrador",
  });

  const load = async () => {
    try {
      setIsLoading(true);
      setBanner(null);
      const res = await api.get<ApiResponse<Task[]>>(`/tasks/course/${courseId}`);
      setItems(res.data.data);
    } catch (err) {
      setItems([]);
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudieron cargar las tareas.") });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, courseId]);

  const resetForm = () => {
    setEditing(null);
    setForm({
      titulo: "",
      descripcion: "",
      instrucciones: "",
      puntos: "100",
      fecha_entrega: "",
      estado: "borrador",
    });
  };

  const openEdit = (t: Task) => {
    setEditing(t);
    setForm({
      titulo: t.titulo ?? "",
      descripcion: t.descripcion ?? "",
      instrucciones: t.instrucciones ?? "",
      puntos: String(t.puntos ?? "100"),
      fecha_entrega: toLocalInputValue(t.fecha_entrega),
      estado: t.estado,
    });
  };

  const validation = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!form.titulo.trim()) errors.titulo = "Título requerido";
    if (!form.fecha_entrega) errors.fecha_entrega = "Fecha de entrega requerida";
    const pts = Number(form.puntos);
    if (!Number.isFinite(pts) || pts < 0) errors.puntos = "Puntos inválidos";
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
        puntos: Number(form.puntos || "100"),
        fecha_entrega: toMysqlDatetime(form.fecha_entrega),
        estado: form.estado,
      };

      if (!editing) {
        const payload: CreateTaskInput = payloadBase as CreateTaskInput;
        await api.post(`/tasks/course/${courseId}`, payload);
        setBanner({ tone: "success", text: "Tarea creada." });
      } else {
        const payload: UpdateTaskInput = payloadBase as UpdateTaskInput;
        await api.put(`/tasks/${editing.id}`, payload);
        setBanner({ tone: "success", text: "Tarea actualizada." });
      }
      resetForm();
      await load();
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo guardar la tarea.") });
    } finally {
      setSaving(false);
    }
  };

  const closeTask = async (id: number) => {
    try {
      setSaving(true);
      setBanner(null);
      await api.delete(`/tasks/${id}`);
      setBanner({ tone: "success", text: "Tarea cerrada." });
      await load();
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo cerrar la tarea.") });
    } finally {
      setSaving(false);
      setPendingCloseTask(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <Card className="w-full max-w-6xl overflow-hidden">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-black text-slate-900">Tareas</div>
              <div className="mt-1 text-sm text-slate-600 line-clamp-1">{courseTitle}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => { resetForm(); onClose(); }}>
                Cerrar
              </Button>
            </div>
          </div>
          {banner ? (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                banner.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
              role="status"
            >
              {banner.text}
            </div>
          ) : null}
        </div>

        <div className="grid gap-6 bg-slate-50 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0">
            <Card className="overflow-hidden">
              <div className="border-b border-slate-200 bg-white px-5 py-4">
                <div className="text-sm font-black text-slate-900">Listado</div>
                <div className="mt-1 text-xs text-slate-600">Se ordena por fecha de entrega.</div>
              </div>
              <div className="p-5">
                {isLoading ? (
                  <div className="grid place-items-center py-10">
                    <Spinner />
                  </div>
                ) : items.length === 0 ? (
                  <EmptyState
                    title="Sin tareas"
                    description="Crea la primera tarea para este curso."
                    actionLabel="Nueva tarea"
                    onAction={() => resetForm()}
                  />
                ) : (
                  <div className="space-y-3">
                    {items.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-900/5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-black text-slate-900">{t.titulo}</div>
                            <div className="mt-1 text-xs text-slate-600">
                              Entrega:{" "}
                              <span className="font-bold">
                                {new Date(t.fecha_entrega).toLocaleString("es-GT")}
                              </span>{" "}
                              · {t.puntos} pts
                            </div>
                            {t.descripcion ? (
                              <div className="mt-2 text-sm text-slate-700 line-clamp-2">{t.descripcion}</div>
                            ) : null}
                          </div>
                          <div className="shrink-0">{statusBadge(t.estado)}</div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
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
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="min-w-0">
            <Card className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-900">
                    {editing ? "Editar tarea" : "Nueva tarea"}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">Campos esenciales para publicar.</div>
                </div>
                <div className="shrink-0">{statusBadge(form.estado)}</div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <div className="text-xs font-extrabold text-slate-700">Título</div>
                  <div className="mt-2">
                    <Input value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))} />
                    {validation.errors.titulo ? (
                      <div className="mt-2 text-xs font-bold text-rose-700">{validation.errors.titulo}</div>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-extrabold text-slate-700">Entrega</div>
                    <div className="mt-2">
                      <Input
                        type="datetime-local"
                        value={form.fecha_entrega}
                        onChange={(e) => setForm((p) => ({ ...p, fecha_entrega: e.target.value }))}
                      />
                      {validation.errors.fecha_entrega ? (
                        <div className="mt-2 text-xs font-bold text-rose-700">{validation.errors.fecha_entrega}</div>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-700">Puntos</div>
                    <div className="mt-2">
                      <Input
                        inputMode="numeric"
                        value={form.puntos}
                        onChange={(e) => setForm((p) => ({ ...p, puntos: e.target.value }))}
                      />
                      {validation.errors.puntos ? (
                        <div className="mt-2 text-xs font-bold text-rose-700">{validation.errors.puntos}</div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-extrabold text-slate-700">Estado</div>
                  <div className="mt-2">
                    <select
                      value={form.estado}
                      onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value as TaskStatus }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                    >
                      <option value="borrador">Borrador</option>
                      <option value="publicada">Publicada</option>
                      <option value="cerrada">Cerrada</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-extrabold text-slate-700">Descripción</div>
                  <textarea
                    value={form.descripcion}
                    onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                    placeholder="Resumen breve…"
                  />
                </div>

                <div>
                  <div className="text-xs font-extrabold text-slate-700">Instrucciones</div>
                  <textarea
                    value={form.instrucciones}
                    onChange={(e) => setForm((p) => ({ ...p, instrucciones: e.target.value }))}
                    rows={5}
                    className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                    placeholder="Qué debe entregar el estudiante…"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                  {editing ? (
                    <Button variant="ghost" onClick={resetForm}>
                      Nueva
                    </Button>
                  ) : null}
                  <Button onClick={() => void save()} disabled={saving}>
                    {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear tarea"}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

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
      </Card>
    </div>
  );
}
