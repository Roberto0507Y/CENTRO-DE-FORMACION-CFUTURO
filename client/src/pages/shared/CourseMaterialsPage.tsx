import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { CourseManageOutletContext } from "./courseManage.types";
import type { MaterialListItem, MaterialStatus, MaterialType } from "../../types/material";
import { getApiErrorMessage } from "../../utils/apiError";
import { downloadFileUrl } from "../../utils/downloadFile";

function statusBadge(estado: MaterialStatus) {
  return estado === "activo" ? <Badge variant="green">Activo</Badge> : <Badge variant="slate">Inactivo</Badge>;
}

function typeBadge(tipo: MaterialType) {
  const label =
    tipo === "pdf"
      ? "PDF"
      : tipo === "video"
        ? "Video"
        : tipo === "imagen"
          ? "Imagen"
          : tipo === "enlace"
            ? "Enlace"
            : "Archivo";
  const variant = tipo === "video" ? "amber" : tipo === "pdf" ? "blue" : tipo === "imagen" ? "green" : "slate";
  return <Badge variant={variant}>{label}</Badge>;
}

type Mode = "idle" | "create" | "edit";

type FormState = {
  titulo: string;
  descripcion: string;
  tipo: MaterialType;
  enlace_url: string;
  orden: string;
  estado: MaterialStatus;
};

const emptyForm: FormState = {
  titulo: "",
  descripcion: "",
  tipo: "archivo",
  enlace_url: "",
  orden: "",
  estado: "activo",
};

export function CourseMaterialsPage() {
  const ctx = useOutletContext<CourseManageOutletContext>();
  const { api, user } = useAuth();

  const [items, setItems] = useState<MaterialListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [file, setFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canManage = user?.rol === "admin" || user?.rol === "docente";
  const showSingleEmpty = !isLoading && items.length === 0 && mode === "idle";
  const showEditor = canManage && mode !== "idle";
  const selectedMaterial = selectedId ? items.find((item) => item.id === selectedId) ?? null : null;

  const load = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      const res = await api.get<ApiResponse<MaterialListItem[]>>(`/courses/${ctx.courseId}/materials`);
      setItems(res.data.data);
    } catch {
      setError("No se pudieron cargar los materiales.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.courseId]);

  const startCreate = () => {
    setMode("create");
    setSelectedId(null);
    setForm(emptyForm);
    setFile(null);
    setError(null);
    setSuccess(null);
  };

  const startEdit = (m: MaterialListItem) => {
    setMode("edit");
    setSelectedId(m.id);
    setForm({
      titulo: m.titulo,
      descripcion: m.descripcion ?? "",
      tipo: m.tipo,
      enlace_url: m.enlace_url ?? "",
      orden: String(m.orden ?? ""),
      estado: m.estado,
    });
    setFile(null);
    setError(null);
    setSuccess(null);
  };

  const clearForm = () => {
    setMode("idle");
    setSelectedId(null);
    setForm(emptyForm);
    setFile(null);
    setError(null);
    setSuccess(null);
  };

  const submit = async () => {
    if (!canManage) return;
    if (!form.titulo.trim()) {
      setError("El título es requerido.");
      return;
    }
    const enlaceUrl = form.enlace_url.trim();
    const hasExistingFile = Boolean(selectedMaterial?.archivo_url);
    const hasExistingLink = Boolean(selectedMaterial?.enlace_url);
    if (!enlaceUrl && !file && !hasExistingLink && !hasExistingFile) {
      setError("Debes agregar un enlace o seleccionar un archivo para crear el material.");
      return;
    }
    if (enlaceUrl && !/^https?:\/\//i.test(enlaceUrl)) {
      setError("El enlace debe comenzar con http:// o https://.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const fd = new FormData();
      fd.append("titulo", form.titulo.trim());
      if (form.descripcion.trim()) fd.append("descripcion", form.descripcion.trim());
      if (enlaceUrl) fd.append("enlace_url", enlaceUrl);
      fd.append("tipo", form.tipo);
      if (form.orden.trim()) fd.append("orden", form.orden.trim());
      fd.append("estado", form.estado);
      if (file) fd.append("file", file);

      if (mode === "create") {
        await api.post(`/courses/${ctx.courseId}/materials`, fd);
        setSuccess("Material creado.");
      } else if (mode === "edit" && selectedId) {
        await api.put(`/courses/${ctx.courseId}/materials/${selectedId}`, fd);
        setSuccess("Material actualizado.");
      }

      clearForm();
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo guardar el material."));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (m: MaterialListItem) => {
    if (!canManage) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const next: MaterialStatus = m.estado === "activo" ? "inactivo" : "activo";
      await api.patch(`/courses/${ctx.courseId}/materials/${m.id}/status`, { estado: next });
      setSuccess("Estado actualizado.");
      await load();
    } catch {
      setError("No se pudo actualizar el estado.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className={showEditor ? "lg:col-span-7" : "lg:col-span-12"}>
        <div className="flex flex-col items-center gap-3 text-center">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-slate-500">Materiales</div>
            <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">Recursos del curso</div>
            <div className="mt-1 text-sm text-slate-600">
              Archivos, PDFs, enlaces y videos para complementar el contenido.
            </div>
          </div>

          {canManage && items.length > 0 && mode === "idle" ? (
            <Button onClick={startCreate}>+ Nuevo material</Button>
          ) : null}
        </div>

        <div className="mt-6">
          {isLoading ? (
            <Card className="p-6">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Spinner />
                Cargando…
              </div>
            </Card>
          ) : null}

          {!isLoading && showSingleEmpty ? (
            <EmptyState
              title="Aún no hay materiales"
              description="Agrega recursos para tu curso: archivos, PDFs o enlaces."
              actionLabel={canManage ? "Crear primer material" : undefined}
              onAction={canManage ? startCreate : undefined}
            />
          ) : null}

          {!isLoading && items.length > 0 ? (
            <div className="space-y-3">
              {items.map((m) => (
                <Card
                  key={m.id}
                  className="p-5 hover:shadow-sm transition cursor-pointer"
                  onClick={() => setSelectedId(m.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-black text-slate-900">{m.titulo}</div>
                        {typeBadge(m.tipo)}
                      </div>
                      {m.descripcion ? (
                        <div className="mt-1 line-clamp-2 text-sm text-slate-600">{m.descripcion}</div>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {statusBadge(m.estado)}
                        <span>•</span>
                        <span>Orden: {m.orden}</span>
                        {m.archivo_url ? (
                          <>
                            <span>•</span>
                            <button
                              className="font-extrabold text-blue-700 hover:underline"
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                void downloadFileUrl(api, m.archivo_url!, m.titulo);
                              }}
                            >
                              Abrir archivo
                            </button>
                          </>
                        ) : null}
                        {m.enlace_url ? (
                          <>
                            <span>•</span>
                            <button
                              className="font-extrabold text-blue-700 hover:underline"
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                void downloadFileUrl(api, m.enlace_url!, m.titulo);
                              }}
                            >
                              Abrir enlace
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {canManage ? (
                      <div className="shrink-0 flex items-center gap-2">
                        <Button variant="secondary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEdit(m); }}>
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void toggleStatus(m);
                          }}
                        >
                          {m.estado === "activo" ? "Inactivar" : "Activar"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {showEditor ? (
        <div className="lg:col-span-5">
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-slate-500">
                  {mode === "edit" ? "Editar" : "Crear"}
                </div>
                <div className="mt-1 text-lg font-black tracking-tight text-slate-900">
                  {mode === "edit" ? "Editar material" : "Nuevo material"}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Completa la información y guarda.
                </div>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {success}
              </div>
            ) : null}

            <div className="mt-6 space-y-4">
                <div>
                  <div className="mb-2 text-sm font-extrabold text-slate-800">Título</div>
                  <Input
                    value={form.titulo}
                    onChange={(e) => setForm((s) => ({ ...s, titulo: e.target.value }))}
                    placeholder="Ej: Guía de estudio / Lectura 1"
                  />
                </div>

                <div>
                  <div className="mb-2 text-sm font-extrabold text-slate-800">Descripción (opcional)</div>
                  <textarea
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    rows={4}
                    value={form.descripcion}
                    onChange={(e) => setForm((s) => ({ ...s, descripcion: e.target.value }))}
                    placeholder="Breve explicación del material…"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="mb-2 text-sm font-extrabold text-slate-800">Tipo</div>
                    <select
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={form.tipo}
                      onChange={(e) => setForm((s) => ({ ...s, tipo: e.target.value as MaterialType }))}
                    >
                      <option value="archivo">Archivo</option>
                      <option value="pdf">PDF</option>
                      <option value="imagen">Imagen</option>
                      <option value="video">Video</option>
                      <option value="enlace">Enlace</option>
                    </select>
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-extrabold text-slate-800">Estado</div>
                    <select
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={form.estado}
                      onChange={(e) => setForm((s) => ({ ...s, estado: e.target.value as MaterialStatus }))}
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="mb-2 text-sm font-extrabold text-slate-800">Orden (opcional)</div>
                    <Input
                      value={form.orden}
                      onChange={(e) => setForm((s) => ({ ...s, orden: e.target.value }))}
                      placeholder="Ej: 1"
                    />
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-extrabold text-slate-800">Enlace externo (opcional)</div>
                    <Input
                      value={form.enlace_url}
                      onChange={(e) => setForm((s) => ({ ...s, enlace_url: e.target.value }))}
                      placeholder="https://…"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-sm font-extrabold text-slate-800">Archivo (opcional)</div>
                  <input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-extrabold file:text-slate-800 hover:file:bg-slate-200"
                  />
                  {file ? <div className="mt-2 text-xs text-slate-600">Seleccionado: {file.name}</div> : null}
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="ghost" onClick={clearForm} disabled={isSaving}>
                    Cancelar
                  </Button>
                  <Button onClick={submit} disabled={isSaving}>
                    {isSaving ? "Guardando…" : "Guardar"}
                  </Button>
                </div>
              </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
