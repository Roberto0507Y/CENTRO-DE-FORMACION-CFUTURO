import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { PaginationControls } from "../../components/ui/PaginationControls";
import { Spinner } from "../../components/ui/Spinner";
import { ConfirmDeleteModal } from "../../components/ui/ConfirmDeleteModal";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { AnnouncementListItem, AnnouncementStatus } from "../../types/announcement";
import { downloadFileUrl } from "../../utils/downloadFile";
import type { CourseManageOutletContext } from "./courseManage.types";

function statusBadge(estado: AnnouncementStatus) {
  return estado === "publicado" ? (
    <Badge variant="green">Publicado</Badge>
  ) : (
    <Badge variant="slate">Oculto</Badge>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Mode = "idle" | "create" | "edit";
type AnnouncementFilter = "all" | "publicado" | "oculto" | "with_attachment";

type FormState = {
  titulo: string;
  mensaje: string;
  estado: AnnouncementStatus;
};

const emptyForm: FormState = { titulo: "", mensaje: "", estado: "publicado" };
const PAGE_SIZE = 6;

export function CourseAnnouncementsPage() {
  const ctx = useOutletContext<CourseManageOutletContext>();
  const { api, user } = useAuth();

  const [items, setItems] = useState<AnnouncementListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AnnouncementFilter>("all");
  const [pendingRemoveAttachment, setPendingRemoveAttachment] = useState<AnnouncementListItem | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selected = useMemo(
    () => (selectedId ? items.find((a) => a.id === selectedId) ?? null : null),
    [items, selectedId],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesFilter =
        filter === "all" ||
        item.estado === filter ||
        (filter === "with_attachment" && Boolean(item.archivo_url));
      const matchesQuery =
        !normalizedQuery ||
        item.titulo.toLowerCase().includes(normalizedQuery) ||
        item.mensaje.toLowerCase().includes(normalizedQuery) ||
        `${item.autor.nombres} ${item.autor.apellidos}`.toLowerCase().includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [filter, items, query]);

  const visibleItems = useMemo(
    () => filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredItems, page],
  );

  const canManage = user?.rol === "admin" || user?.rol === "docente";
  const hasItems = items.length > 0;
  const hasFilteredItems = filteredItems.length > 0;
  const showSingleEmpty = !isLoading && !hasItems && mode === "idle";

  const load = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      const res = await api.get<ApiResponse<AnnouncementListItem[]>>(
        `/courses/${ctx.courseId}/announcements`,
      );
      setItems(res.data.data);
      setPage((current) => Math.min(current, Math.max(1, Math.ceil(res.data.data.length / PAGE_SIZE))));
    } catch {
      setError("No se pudieron cargar los anuncios.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.courseId]);

  useEffect(() => {
    setPage(1);
    setSelectedId(null);
  }, [filter, query]);

  const startCreate = () => {
    setMode("create");
    setSelectedId(null);
    setForm(emptyForm);
    setFile(null);
    setError(null);
    setSuccess(null);
  };

  const startEdit = (ann: AnnouncementListItem) => {
    setMode("edit");
    setSelectedId(ann.id);
    setForm({
      titulo: ann.titulo,
      mensaje: ann.mensaje,
      estado: ann.estado,
    });
    setFile(null);
    setError(null);
    setSuccess(null);
  };

  const cancelForm = () => {
    setMode("idle");
    setSelectedId(null);
    setFile(null);
    setError(null);
    setSuccess(null);
    if (mode === "create") {
      setForm(emptyForm);
    }
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    setSelectedId(null);
    setFile(null);
    setError(null);
    setSuccess(null);
  };

  const submit = async () => {
    if (!canManage) return;
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      if (mode === "create") {
        let created: AnnouncementListItem;
        if (file) {
          const fd = new FormData();
          fd.append("titulo", form.titulo);
          fd.append("mensaje", form.mensaje);
          fd.append("estado", form.estado);
          fd.append("file", file);
          const res = await api.post<ApiResponse<AnnouncementListItem>>(
            `/courses/${ctx.courseId}/announcements`,
            fd,
          );
          created = res.data.data;
        } else {
          const res = await api.post<ApiResponse<AnnouncementListItem>>(
            `/courses/${ctx.courseId}/announcements`,
            { titulo: form.titulo, mensaje: form.mensaje, estado: form.estado },
          );
          created = res.data.data;
        }

        setItems((prev) => [created, ...prev]);
        setSelectedId(null);
        setMode("idle");
        setPage(1);
        setForm({
          titulo: created.titulo,
          mensaje: created.mensaje,
          estado: created.estado,
        });
        setFile(null);
        setSuccess("Anuncio creado.");
        return;
      }

      if (!selected) {
        setError("Selecciona un anuncio para editar.");
        return;
      }

      let updated: AnnouncementListItem;
      if (file) {
        const fd = new FormData();
        fd.append("titulo", form.titulo);
        fd.append("mensaje", form.mensaje);
        fd.append("file", file);
        const res = await api.put<ApiResponse<AnnouncementListItem>>(
          `/courses/${ctx.courseId}/announcements/${selected.id}`,
          fd,
        );
        updated = res.data.data;
      } else {
        const res = await api.put<ApiResponse<AnnouncementListItem>>(
          `/courses/${ctx.courseId}/announcements/${selected.id}`,
          { titulo: form.titulo, mensaje: form.mensaje },
        );
        updated = res.data.data;
      }

      setItems((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setSelectedId(null);
      setMode("idle");
      setForm({
        titulo: updated.titulo,
        mensaje: updated.mensaje,
        estado: updated.estado,
      });
      setFile(null);
      setSuccess("Cambios guardados.");
    } catch {
      setError("No se pudo guardar el anuncio.");
    } finally {
      setIsSaving(false);
      setPendingRemoveAttachment(null);
    }
  };

  const toggleStatus = async (ann: AnnouncementListItem) => {
    if (!canManage) return;
    setError(null);
    setSuccess(null);
    try {
      const next: AnnouncementStatus = ann.estado === "publicado" ? "oculto" : "publicado";
      const res = await api.patch<ApiResponse<AnnouncementListItem>>(
        `/courses/${ctx.courseId}/announcements/${ann.id}/status`,
        { estado: next },
      );
      const updated = res.data.data;
      setItems((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      if (selectedId === updated.id) {
        setForm((f) => ({ ...f, estado: updated.estado }));
      }
      setSuccess(next === "publicado" ? "Anuncio publicado." : "Anuncio oculto.");
    } catch {
      setError("No se pudo actualizar el estado.");
    }
  };

  const removeAttachment = async (ann: AnnouncementListItem) => {
    if (!canManage) return;
    if (!ann.archivo_url) return;
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      const res = await api.put<ApiResponse<AnnouncementListItem>>(
        `/courses/${ctx.courseId}/announcements/${ann.id}`,
        { archivo_url: null },
      );
      const updated = res.data.data;
      setItems((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setSuccess("Adjunto eliminado.");
    } catch {
      setError("No se pudo eliminar el adjunto.");
    } finally {
      setIsSaving(false);
    }
  };

  if (showSingleEmpty) {
    return (
      <Card className="p-8">
        <EmptyState
          title="Sin anuncios todavía"
          description={
            canManage
              ? `Crea un anuncio para informar novedades, fechas y materiales en "${ctx.courseTitle}".`
              : `Aún no hay anuncios publicados en "${ctx.courseTitle}".`
          }
          actionLabel={canManage ? "Crear anuncio" : undefined}
          onAction={canManage ? startCreate : undefined}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {canManage && mode === "idle" ? (
        <div className="flex justify-end">
          <Button onClick={startCreate}>+ Nuevo anuncio</Button>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          {success}
        </div>
      ) : null}

      {isLoading && !hasItems ? (
        <Card className="p-8">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Spinner />
            Cargando anuncios...
          </div>
        </Card>
      ) : null}

      {mode !== "idle" ? (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-200 bg-slate-50/80 p-6 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  {mode === "create" ? "Nuevo anuncio" : "Editar anuncio"}
                </div>
                <div className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                  {mode === "create" ? "Crear comunicado" : form.titulo}
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Título, mensaje y adjunto opcional.
                </div>
              </div>
              <Button variant="ghost" onClick={cancelForm} disabled={isSaving}>
                Cancelar
              </Button>
            </div>
          </div>

          <div className="grid gap-5 p-6">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Título
              </label>
              <div className="mt-2">
                <Input
                  value={form.titulo}
                  onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ej: Cambio de horario"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Mensaje
              </label>
              <div className="mt-2">
                <textarea
                  className="min-h-[220px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-blue-500 transition-colors placeholder:text-slate-400 focus:ring-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                  value={form.mensaje}
                  onChange={(e) => setForm((f) => ({ ...f, mensaje: e.target.value }))}
                  placeholder="Escribe el anuncio..."
                />
              </div>
            </div>

            {mode === "create" ? (
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Estado
                </label>
                <div className="mt-2">
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none ring-blue-500 transition-colors focus:ring-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    value={form.estado}
                    onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value as AnnouncementStatus }))}
                  >
                    <option value="publicado">Publicado</option>
                    <option value="oculto">Oculto</option>
                  </select>
                </div>
              </div>
            ) : selected ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex flex-wrap items-center gap-2">
                  {statusBadge(selected.estado)}
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    Publicado: {formatDate(selected.fecha_publicacion)}
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => toggleStatus(selected)} disabled={isSaving}>
                  {selected.estado === "publicado" ? "Ocultar" : "Publicar"}
                </Button>
              </div>
            ) : null}

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Adjunto opcional
              </label>
              <div className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    Archivo seleccionado: <span className="font-semibold">{file.name}</span>
                  </div>
                ) : null}
                {mode === "edit" && selected?.archivo_url ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <button
                      className="font-semibold text-blue-600 hover:underline dark:text-cyan-300"
                      type="button"
                      onClick={() => void downloadFileUrl(api, selected.archivo_url!, selected.titulo)}
                    >
                      Abrir adjunto
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => setPendingRemoveAttachment(selected)}
                      disabled={isSaving}
                    >
                      Quitar
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-5 dark:border-slate-800">
              <Button variant="ghost" onClick={cancelForm} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={submit} disabled={isSaving}>
                {isSaving ? "Guardando..." : mode === "create" ? "Crear anuncio" : "Guardar cambios"}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {mode === "idle" && hasItems ? (
        <div className="space-y-4">
          <div className="space-y-4 border-b border-slate-200 pb-5 dark:border-slate-800">
            {canManage ? (
              <select
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                value={filter}
                onChange={(event) => setFilter(event.target.value as AnnouncementFilter)}
              >
                <option value="all">Todo</option>
                <option value="publicado">Publicados</option>
                <option value="oculto">Ocultos</option>
                <option value="with_attachment">Con adjunto</option>
              </select>
            ) : null}

            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <svg
                  viewBox="0 0 24 24"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m21 21-4.35-4.35" />
                  <circle cx="11" cy="11" r="7" />
                </svg>
                <input
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar..."
                />
              </div>

              <Button variant="secondary" onClick={() => void load()} disabled={isLoading}>
                Actualizar
              </Button>
            </div>
          </div>

          {!hasFilteredItems ? (
            <Card className="p-6">
              <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                No hay anuncios que coincidan con la búsqueda.
              </div>
            </Card>
          ) : null}

          {hasFilteredItems ? (
            <div className="overflow-hidden border-y border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/40">
              {visibleItems.map((a) => (
                <article
                  key={a.id}
                  className="grid grid-cols-1 gap-4 border-b border-slate-200 px-5 py-5 last:border-b-0 transition hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_12rem] dark:border-slate-800 dark:hover:bg-slate-900/60"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-black leading-6 text-slate-950 dark:text-white">
                        {a.titulo}
                      </h2>
                      {canManage ? statusBadge(a.estado) : null}
                      {canManage && a.archivo_url ? <Badge variant="blue">Adjunto</Badge> : null}
                    </div>
                    <div className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      {ctx.courseTitle}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">
                      {a.mensaje}
                    </p>

                    {canManage ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(a)}>
                          Editar
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => toggleStatus(a)}>
                          {a.estado === "publicado" ? "Ocultar" : "Publicar"}
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <div className="text-sm md:text-right">
                    <div className="font-black text-slate-950 dark:text-white">Publicado el:</div>
                    <time
                      className="mt-1 block text-slate-600 dark:text-slate-300"
                      dateTime={a.fecha_publicacion}
                      title={formatDate(a.fecha_publicacion)}
                    >
                      {formatDateLabel(a.fecha_publicacion)}, {formatTime(a.fecha_publicacion)}
                    </time>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {filteredItems.length > PAGE_SIZE ? (
            <PaginationControls
              page={page}
              pageSize={PAGE_SIZE}
              total={filteredItems.length}
              isLoading={isLoading}
              onPageChange={handlePageChange}
            />
          ) : null}
        </div>
      ) : null}

      <ConfirmDeleteModal
        open={Boolean(pendingRemoveAttachment)}
        title="¿Quitar adjunto?"
        description={`Vas a quitar el adjunto de "${pendingRemoveAttachment?.titulo ?? "este anuncio"}".\nEsta acción no se puede deshacer.`}
        confirmLabel="Quitar"
        isLoading={isSaving}
        onCancel={() => setPendingRemoveAttachment(null)}
        onConfirm={() => {
          if (pendingRemoveAttachment) void removeAttachment(pendingRemoveAttachment);
        }}
      />
    </div>
  );
}
