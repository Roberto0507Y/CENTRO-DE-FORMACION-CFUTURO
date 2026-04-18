import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../context/ToastContext";
import type { ApiResponse } from "../../types/api";
import type { CategoryAdminListItem, CategoryStatus, CreateCategoryInput, UpdateCategoryInput } from "../../types/category";
import { getApiErrorMessage } from "../../utils/apiError";

function statusBadge(estado: CategoryStatus) {
  return estado === "activo" ? <Badge variant="green">Activo</Badge> : <Badge variant="slate">Inactivo</Badge>;
}

export function AdminCategoriesPage() {
  const { api } = useAuth();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<CategoryAdminListItem[]>([]);

  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<"" | CategoryStatus>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryAdminListItem | null>(null);

  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<CreateCategoryInput & { estado?: CategoryStatus }>({
    nombre: "",
    descripcion: "",
    imagen_url: null,
    estado: "activo",
  });

  const queryParams = useMemo(
    () => ({
      all: true,
      include_counts: true,
      q: q.trim() || undefined,
      estado: estado || undefined,
    }),
    [q, estado],
  );

  const load = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<ApiResponse<CategoryAdminListItem[]>>("/categories", { params: queryParams });
      setItems(res.data.data);
    } catch (err) {
      setItems([]);
      toast.push({
        kind: "error",
        title: "No se pudieron cargar las categorías",
        description: getApiErrorMessage(err, "Intenta de nuevo."),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams]);

  const openCreate = () => {
    setEditing(null);
    setForm({ nombre: "", descripcion: "", imagen_url: null, estado: "activo" });
    setModalOpen(true);
  };

  const openEdit = (cat: CategoryAdminListItem) => {
    setEditing(cat);
    setForm({
      nombre: cat.nombre,
      descripcion: cat.descripcion ?? "",
      imagen_url: cat.imagen_url,
      estado: cat.estado,
    });
    setModalOpen(true);
  };

  const save = async () => {
    const nombre = (form.nombre ?? "").trim();
    if (!nombre) {
      toast.push({ kind: "error", title: "El nombre es requerido" });
      return;
    }
    try {
      setSaving(true);
      if (!editing) {
        const body: CreateCategoryInput = {
          nombre,
          descripcion: form.descripcion ? String(form.descripcion) : null,
          imagen_url: null,
        };
        await api.post("/categories", body);
        toast.push({ kind: "success", title: "Categoría creada" });
      } else {
        const body: UpdateCategoryInput = {
          nombre,
          descripcion: form.descripcion === undefined ? undefined : (form.descripcion ? String(form.descripcion) : null),
          imagen_url: editing.imagen_url ?? null,
          estado: form.estado,
        };
        await api.put(`/categories/${editing.id}`, body);
        toast.push({ kind: "success", title: "Categoría actualizada" });
      }
      setModalOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      toast.push({
        kind: "error",
        title: "No se pudo guardar la categoría",
        description: getApiErrorMessage(err, "Intenta de nuevo."),
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (cat: CategoryAdminListItem) => {
    const next: CategoryStatus = cat.estado === "activo" ? "inactivo" : "activo";
    const actionLabel = next === "inactivo" ? "inactivar" : "activar";
    if (!window.confirm(`¿Seguro que deseas ${actionLabel} la categoría “${cat.nombre}”?`)) return;
    try {
      await api.patch(`/categories/${cat.id}/status`, { estado: next });
      toast.push({ kind: "success", title: "Estado actualizado" });
      await load();
    } catch (err) {
      toast.push({
        kind: "error",
        title: "No se pudo cambiar el estado",
        description: getApiErrorMessage(err, "Intenta de nuevo."),
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorías"
        subtitle="Gestión (admin)"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => void load()}>
              Actualizar
            </Button>
            <Button onClick={openCreate}>Nueva categoría</Button>
          </div>
        }
      />

      <Card className="p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <div className="text-xs font-extrabold text-slate-700">Buscar</div>
            <div className="mt-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre de categoría…" />
            </div>
          </div>
          <div>
            <div className="text-xs font-extrabold text-slate-700">Estado</div>
            <div className="mt-2">
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as "" | CategoryStatus)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none ring-blue-500 focus:ring-2"
              >
                <option value="">Todos</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-900">Listado</div>
              <div className="mt-1 text-sm text-slate-600">{items.length} categorías</div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="grid place-items-center py-10">
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="Sin categorías"
              description="Crea tu primera categoría para organizar los cursos."
              actionLabel="Nueva categoría"
              onAction={openCreate}
            />
          ) : (
            <div className="space-y-4">
              <div className="w-full overflow-x-auto [-webkit-overflow-scrolling:touch]">
                <table className="w-full min-w-[980px] border-separate border-spacing-0">
                  <thead>
                    <tr className="text-left text-[11px] font-black uppercase tracking-wider text-slate-500">
                      <th className="pb-3 pr-4">Categoría</th>
                      <th className="pb-3 pr-4">Descripción</th>
                      <th className="pb-3 pr-4">Cursos</th>
                      <th className="pb-3 pr-4">Estado</th>
                      <th className="pb-3 pr-4">Actualización</th>
                      <th className="pb-3 pr-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((c) => (
                      <tr key={c.id} className="border-t">
                        <td className="py-3 pr-4 align-top">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-16 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-black/5">
                              {c.imagen_url ? (
                                <img src={c.imagen_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                              ) : (
                                <div className="h-full w-full bg-gradient-to-br from-blue-600/15 via-slate-100 to-white" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-black text-slate-900">{c.nombre}</div>
                              <div className="mt-1 text-xs font-bold text-slate-500">ID: {c.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 align-top">
                          <div className="text-sm text-slate-700 line-clamp-2">{c.descripcion || "—"}</div>
                        </td>
                        <td className="py-3 pr-4 align-top">
                          <div className="text-sm font-black text-slate-900">{c.cursos_count}</div>
                        </td>
                        <td className="py-3 pr-4 align-top">{statusBadge(c.estado)}</td>
                        <td className="py-3 pr-4 align-top">
                          <div className="text-sm text-slate-700">{new Date(c.updated_at).toLocaleString("es-GT")}</div>
                        </td>
                        <td className="py-3 pr-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                              Editar
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => void toggleStatus(c)}>
                              {c.estado === "activo" ? "Inactivar" : "Activar"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Card>

      {modalOpen ? (
        <CategoryModal
          title={editing ? "Editar categoría" : "Nueva categoría"}
          saving={saving}
          value={form}
          onChange={setForm}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={() => void save()}
        />
      ) : null}
    </div>
  );
}

function CategoryModal({
  title,
  saving,
  value,
  onChange,
  onClose,
  onSave,
}: {
  title: string;
  saving: boolean;
  value: CreateCategoryInput & { estado?: CategoryStatus };
  onChange: (v: CreateCategoryInput & { estado?: CategoryStatus }) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <Card className="w-full max-w-2xl overflow-hidden">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="text-base font-black text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-600">Nombre, descripción e imagen (opcional).</div>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-extrabold text-slate-700">Nombre</div>
              <div className="mt-2">
                <Input
                  value={value.nombre ?? ""}
                  onChange={(e) => onChange({ ...value, nombre: e.target.value })}
                  placeholder="Ej: Programación"
                />
              </div>
            </div>

            <div>
              <div className="text-xs font-extrabold text-slate-700">Descripción</div>
              <textarea
                value={(value.descripcion ?? "") as string}
                onChange={(e) => onChange({ ...value, descripcion: e.target.value })}
                rows={4}
                placeholder="Descripción breve…"
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
              />
            </div>

            <div>
              <div className="text-xs font-extrabold text-slate-700">Estado</div>
              <div className="mt-2">
                <select
                  value={value.estado ?? "activo"}
                  onChange={(e) => onChange({ ...value, estado: e.target.value as CategoryStatus })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none ring-blue-500 focus:ring-2"
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-extrabold text-slate-700">Imagen</div>
              <div className="mt-3 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-black/5">
                <div className="aspect-[16/10]">
                  {value.imagen_url ? (
                    <img src={value.imagen_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-blue-600/15 via-slate-100 to-white" />
                  )}
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-600">
                La imagen se gestiona desde el sistema de contenidos (por ahora).
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 bg-white px-6 py-5 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
