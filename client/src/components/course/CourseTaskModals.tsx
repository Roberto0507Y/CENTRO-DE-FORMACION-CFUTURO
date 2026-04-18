import { useEffect, useState } from "react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { FilePicker } from "../ui/FilePicker";
import { Input } from "../ui/Input";
import { PaginationControls } from "../ui/PaginationControls";
import { Spinner } from "../ui/Spinner";
import type {
  GradeSubmissionInput,
  TaskStatus,
  TaskSubmissionFilter,
  TaskSubmissionWithStudent,
} from "../../types/task";
import { getApiErrorMessage } from "../../utils/apiError";

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

function statusBadge(estado: TaskStatus) {
  if (estado === "publicada") return <Badge variant="green">Publicada</Badge>;
  if (estado === "borrador") return <Badge variant="slate">Borrador</Badge>;
  return <Badge variant="amber">Cerrada</Badge>;
}

function toDraftText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function submissionRowKey(submission: TaskSubmissionWithStudent) {
  return submission.id > 0 ? `submission:${submission.id}` : `student:${submission.estudiante.id}`;
}

export function TaskModal({
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true">
      <Card className="mx-auto my-6 flex max-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col overflow-hidden">
        <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-black text-slate-900">{title}</div>
              <div className="mt-1 text-sm text-slate-600">Información básica, entrega y contenido.</div>
            </div>
            <div className="shrink-0">{statusBadge(value.estado)}</div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto bg-white p-6">
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

          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-blue-600 text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v2M16 3v2M3 9h18M5 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-black text-slate-900">Entrega</div>
                <div className="text-xs text-slate-600">Fecha límite, cierre y entregas tardías.</div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
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

              <div>
                <div className="text-xs font-extrabold text-slate-700">Fecha de cierre (opcional)</div>
                <div className="mt-2">
                  <Input
                    type="datetime-local"
                    value={value.fecha_cierre}
                    onChange={(e) => onChange({ ...value, fecha_cierre: e.target.value })}
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    Si la dejas vacía, la tarea se controla con la fecha de entrega.
                  </div>
                  {errors.fecha_cierre ? (
                    <div className="mt-2 text-xs font-bold text-rose-700">{errors.fecha_cierre}</div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <label className="inline-flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={value.permite_entrega_tardia}
                  onChange={(e) => onChange({ ...value, permite_entrega_tardia: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  <span className="block font-black text-slate-900">Permitir entrega tardía</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Si se activa, el estudiante podrá entregar después de la fecha de entrega hasta la fecha de cierre.
                  </span>
                </span>
              </label>
            </div>
          </div>

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
                <div className="text-xs font-extrabold text-slate-700">Adjunto opcional</div>
                <div className="mt-2 space-y-2">
                  <FilePicker
                    label={existingFileUrl ? "Reemplazar archivo" : "Adjuntar archivo"}
                    helperText={
                      existingFileUrl
                        ? "Si seleccionas un nuevo archivo, se reemplazará el adjunto anterior."
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

export function SubmissionsModal({
  taskTitle,
  maxPoints,
  loading,
  items,
  filter,
  page,
  pageSize,
  total,
  errorMessage,
  onOpenFileUrl,
  onGrade,
  onFilterChange,
  onPageChange,
  onRetry,
  onClose,
}: {
  taskTitle: string;
  maxPoints: number;
  loading: boolean;
  items: TaskSubmissionWithStudent[];
  filter: TaskSubmissionFilter;
  page: number;
  pageSize: number;
  total: number;
  errorMessage: string | null;
  onOpenFileUrl: (url: string, filename: string) => void;
  onGrade: (submission: TaskSubmissionWithStudent, input: GradeSubmissionInput) => Promise<void>;
  onFilterChange: (filter: TaskSubmissionFilter) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onClose: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, { calificacion: string; comentario_docente: string }>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        items.map((item) => [
          submissionRowKey(item),
          {
            calificacion: toDraftText(item.calificacion),
            comentario_docente: toDraftText(item.comentario_docente),
          },
        ])
      )
    );
  }, [items]);

  const maxLabel = Number.isFinite(maxPoints) ? maxPoints : 1000;
  const activeFilterLabel = filter === "no_entregados" ? "No entregados" : "Todos";
  const filterDescription =
    filter === "no_entregados"
      ? "Solo se muestran los estudiantes inscritos que aún no han entregado la tarea."
      : "Se muestran entregados y no entregados, según la página actual.";

  const saveGrade = async (submission: TaskSubmissionWithStudent) => {
    const rowKey = submissionRowKey(submission);
    const draft = drafts[rowKey] ?? { calificacion: "", comentario_docente: "" };
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
      setSavingId(submission.id || -submission.estudiante.id);
      setLocalError(null);
      await onGrade(submission, {
        calificacion: score,
        comentario_docente: draft.comentario_docente.trim() || null,
        estado: submission.has_submission ? "revisada" : "no_entregada",
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
          <div className="mb-4 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between dark:border-slate-800 dark:bg-slate-900/60">
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Filtro actual
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{activeFilterLabel}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{filterDescription}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={filter === "todos" ? "secondary" : "ghost"}
                disabled={loading}
                onClick={() => onFilterChange("todos")}
              >
                Todos
              </Button>
              <Button
                size="sm"
                variant={filter === "no_entregados" ? "secondary" : "ghost"}
                disabled={loading}
                onClick={() => onFilterChange("no_entregados")}
              >
                No entregados
              </Button>
            </div>
          </div>

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
            <EmptyState
              title={filter === "no_entregados" ? "Sin pendientes por revisar" : "Sin entregas todavía"}
              description={
                filter === "no_entregados"
                  ? "Todos los estudiantes de esta página ya entregaron la tarea."
                  : "Aún no hay entregas ni estudiantes pendientes en esta página."
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="hidden">
                {items.map((submission) => {
                  const rowKey = submissionRowKey(submission);
                  const savingKey = submission.id || -submission.estudiante.id;
                  const draft = drafts[rowKey] ?? {
                    calificacion: toDraftText(submission.calificacion),
                    comentario_docente: toDraftText(submission.comentario_docente),
                  };
                  const badgeVariant =
                    submission.estado === "revisada"
                      ? "blue"
                      : submission.estado === "devuelta"
                        ? "rose"
                        : submission.estado === "atrasada"
                          ? "amber"
                          : submission.estado === "no_entregada"
                            ? "slate"
                            : "green";

                  return (
                    <div
                      key={rowKey}
                      className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70"
                    >
                      <div className="space-y-2">
                        <div className="font-black text-slate-900 dark:text-slate-100">
                          {submission.estudiante.nombres} {submission.estudiante.apellidos}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{submission.estudiante.correo}</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={badgeVariant}>{submission.estado}</Badge>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {submission.has_submission
                              ? new Date(submission.fecha_entrega).toLocaleString("es-GT")
                              : "Sin entrega"}
                          </span>
                        </div>
                        {submission.fecha_calificacion ? (
                          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Revisada: {new Date(submission.fecha_calificacion).toLocaleString("es-GT")}
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                        <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Entrega
                        </div>
                        <div className="mt-2 space-y-2">
                          {submission.archivo_url ? (
                            <button
                              className="block font-semibold text-blue-600 hover:underline dark:text-cyan-300"
                              type="button"
                              onClick={() =>
                                onOpenFileUrl(
                                  submission.archivo_url!,
                                  `${submission.estudiante.nombres}-${submission.estudiante.apellidos}`
                                )
                              }
                            >
                              Ver archivo
                            </button>
                          ) : null}
                          {submission.enlace_url ? (
                            <button
                              className="block font-semibold text-blue-600 hover:underline dark:text-cyan-300"
                              type="button"
                              onClick={() =>
                                onOpenFileUrl(
                                  submission.enlace_url!,
                                  `${submission.estudiante.nombres}-${submission.estudiante.apellidos}`
                                )
                              }
                            >
                              Ver enlace
                            </button>
                          ) : null}
                          {submission.comentario_estudiante ? (
                            <div className="text-xs text-slate-600 dark:text-slate-400">{submission.comentario_estudiante}</div>
                          ) : !submission.has_submission ? (
                            <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                              El estudiante no ha entregado archivo, enlace ni comentario.
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 dark:text-slate-500">Sin comentario</div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                        <div className="space-y-3">
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
                                    [rowKey]: { ...draft, calificacion: event.target.value },
                                  }))
                                }
                                inputMode="decimal"
                                placeholder={`0 - ${maxLabel}`}
                                className="h-10"
                              />
                              <span className="shrink-0 text-xs font-black text-slate-500 dark:text-slate-400">
                                / {maxLabel}
                              </span>
                            </div>
                            <div className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              {toDraftText(submission.calificacion) ? `Nota actual: ${submission.calificacion}` : "Sin nota"}
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
                                  [rowKey]: { ...draft, comentario_docente: event.target.value },
                                }))
                              }
                              rows={3}
                              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none ring-blue-500 transition placeholder:text-slate-400 focus:ring-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                              placeholder="Retroalimentación para el estudiante..."
                            />
                          </div>
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => void saveGrade(submission)}
                              disabled={savingId === savingKey || !toDraftText(draft.calificacion).trim()}
                            >
                              {savingId === savingKey ? "Guardando..." : "Guardar nota"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="w-full overflow-x-auto [-webkit-overflow-scrolling:touch]">
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
                  {items.map((submission) => {
                    const rowKey = submissionRowKey(submission);
                    const savingKey = submission.id || -submission.estudiante.id;
                    const draft = drafts[rowKey] ?? {
                      calificacion: toDraftText(submission.calificacion),
                      comentario_docente: toDraftText(submission.comentario_docente),
                    };
                    const badgeVariant =
                      submission.estado === "revisada"
                        ? "blue"
                        : submission.estado === "devuelta"
                          ? "rose"
                          : submission.estado === "atrasada"
                            ? "amber"
                            : submission.estado === "no_entregada"
                              ? "slate"
                              : "green";

                    return (
                      <tr key={rowKey} className="[&>td]:py-3 [&>td]:align-top">
                        <td className="font-semibold text-slate-900 dark:text-slate-100">
                          {submission.estudiante.nombres} {submission.estudiante.apellidos}
                          <div className="text-xs font-normal text-slate-500 dark:text-slate-400">
                            {submission.estudiante.correo}
                          </div>
                        </td>
                        <td>
                          <Badge variant={badgeVariant}>{submission.estado}</Badge>
                          {submission.fecha_calificacion ? (
                            <div className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              Revisada: {new Date(submission.fecha_calificacion).toLocaleString("es-GT")}
                            </div>
                          ) : null}
                        </td>
                        <td className="text-slate-600 dark:text-slate-300">
                          {submission.has_submission
                            ? new Date(submission.fecha_entrega).toLocaleString("es-GT")
                            : "Sin entrega"}
                        </td>
                        <td className="max-w-[260px] space-y-1">
                          {submission.archivo_url ? (
                            <button
                              className="block font-semibold text-blue-600 hover:underline dark:text-cyan-300"
                              type="button"
                              onClick={() =>
                                onOpenFileUrl(
                                  submission.archivo_url!,
                                  `${submission.estudiante.nombres}-${submission.estudiante.apellidos}`
                                )
                              }
                            >
                              Ver archivo
                            </button>
                          ) : null}
                          {submission.enlace_url ? (
                            <button
                              className="block font-semibold text-blue-600 hover:underline dark:text-cyan-300"
                              type="button"
                              onClick={() =>
                                onOpenFileUrl(
                                  submission.enlace_url!,
                                  `${submission.estudiante.nombres}-${submission.estudiante.apellidos}`
                                )
                              }
                            >
                              Ver enlace
                            </button>
                          ) : null}
                          {submission.comentario_estudiante ? (
                            <div className="line-clamp-3 text-xs text-slate-600 dark:text-slate-400">
                              {submission.comentario_estudiante}
                            </div>
                          ) : !submission.has_submission ? (
                            <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                              El estudiante no ha entregado archivo, enlace ni comentario.
                            </div>
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
                                        [rowKey]: { ...draft, calificacion: event.target.value },
                                      }))
                                    }
                                    inputMode="decimal"
                                    placeholder={`0 - ${maxLabel}`}
                                    className="h-10"
                                  />
                                  <span className="shrink-0 text-xs font-black text-slate-500 dark:text-slate-400">
                                    / {maxLabel}
                                  </span>
                                </div>
                                <div className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                  {toDraftText(submission.calificacion) ? `Nota actual: ${submission.calificacion}` : "Sin nota"}
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
                                        [rowKey]: { ...draft, comentario_docente: event.target.value },
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
                                onClick={() => void saveGrade(submission)}
                                disabled={savingId === savingKey || !toDraftText(draft.calificacion).trim()}
                              >
                                {savingId === savingKey ? "Guardando..." : "Guardar nota"}
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
              <PaginationControls
                page={page}
                pageSize={pageSize}
                total={total}
                isLoading={loading}
                onPageChange={onPageChange}
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
