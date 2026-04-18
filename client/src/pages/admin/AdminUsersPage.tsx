import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { PaginationControls } from "../../components/ui/PaginationControls";
import { ConfirmDeleteModal } from "../../components/ui/ConfirmDeleteModal";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../context/ToastContext";
import type { ApiResponse } from "../../types/api";
import type { User, UserListResponse, UserRole } from "../../types/auth";
import { getApiErrorMessage } from "../../utils/apiError";

type UserEstado = User["estado"];

const PAGE_SIZE = 12;

function roleLabel(role: UserRole) {
  if (role === "admin") return "Admin";
  if (role === "docente") return "Docente";
  return "Estudiante";
}

function roleBadge(role: UserRole) {
  if (role === "admin") return { variant: "blue" as const, label: roleLabel(role) };
  if (role === "docente") return { variant: "amber" as const, label: roleLabel(role) };
  return { variant: "slate" as const, label: roleLabel(role) };
}

function estadoBadge(estado: UserEstado) {
  if (estado === "activo") return { variant: "green" as const, label: "Activo" };
  if (estado === "suspendido") return { variant: "rose" as const, label: "Suspendido" };
  return { variant: "amber" as const, label: "Inactivo" };
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-GT", { dateStyle: "long" });
}

function detailValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "—";
  const text = String(value).trim();
  return text.length > 0 ? text : "—";
}

function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/65">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-bold leading-6 text-slate-900 dark:text-slate-100">
        {detailValue(value)}
      </div>
    </div>
  );
}

function UserDetailModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  if (!user) return null;

  const role = roleBadge(user.rol);
  const estado = estadoBadge(user.estado);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-950/55 px-4 py-6 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-detail-title"
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/40">
        <div className="border-b border-slate-200 bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 px-5 py-5 text-white dark:border-slate-800 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <Avatar name={`${user.nombres} ${user.apellidos}`} src={user.foto_url} size={56} />
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-100/80">
                  Detalle del usuario
                </div>
                <h2 id="user-detail-title" className="mt-1 break-words text-2xl font-black tracking-tight">
                  {user.nombres} {user.apellidos}
                </h2>
                <p className="mt-1 break-words text-sm font-medium text-white/75">{user.correo}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant={role.variant}>{role.label}</Badge>
                  <Badge variant={estado.variant}>{estado.label}</Badge>
                  <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-bold leading-none text-white">
                    ID #{user.id}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/15"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="max-h-[72vh] overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailField label="DPI" value={user.dpi} />
            <DetailField label="Teléfono" value={user.telefono} />
            <DetailField label="Fecha de nacimiento" value={formatDate(user.fecha_nacimiento)} />
            <DetailField label="Correo" value={user.correo} />
          </div>

          <div className="mt-3">
            <DetailField label="Dirección registrada" value={user.direccion} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <DetailField label="Último login" value={formatDateTime(user.ultimo_login)} />
            <DetailField label="Creado" value={formatDateTime(user.created_at)} />
            <DetailField label="Actualizado" value={formatDateTime(user.updated_at)} />
          </div>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-blue-900 dark:border-cyan-400/15 dark:bg-cyan-400/10 dark:text-cyan-100">
            Esta información corresponde a los datos capturados durante el registro y los cambios administrativos posteriores.
          </div>
        </div>
      </div>
    </div>
  );
}

function UserCard({
  user,
  currentUserId,
  busy,
  onRoleChange,
  onStatusChange,
  onViewDetail,
  onActivate,
  onSuspend,
  onDisable,
  onDelete,
}: {
  user: User;
  currentUserId?: number;
  busy: boolean;
  onRoleChange: (role: UserRole) => void;
  onStatusChange: (estado: UserEstado) => void;
  onViewDetail: () => void;
  onActivate: () => void;
  onSuspend: () => void;
  onDisable: () => void;
  onDelete: () => void;
}) {
  const role = roleBadge(user.rol);
  const estado = estadoBadge(user.estado);
  const isSelf = currentUserId === user.id;

  return (
    <Card className="rounded-[1.75rem] border-slate-200/80 p-4 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.45)] md:hidden dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex items-start gap-3">
        <Avatar name={`${user.nombres} ${user.apellidos}`} src={user.foto_url} size={48} />
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-sm font-black leading-5 text-slate-900 dark:text-slate-100">
            {user.nombres} {user.apellidos} <span className="text-xs font-bold text-slate-500 dark:text-slate-400">#{user.id}</span>
          </div>
          <div className="mt-0.5 break-all text-sm text-slate-600 dark:text-slate-300">{user.correo}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={role.variant}>{role.label}</Badge>
            <Badge variant={estado.variant}>{estado.label}</Badge>
            {isSelf ? <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Tú</span> : null}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={onViewDetail}
          className="h-11 rounded-2xl bg-gradient-to-r from-slate-950 to-blue-700 text-white shadow-[0_14px_28px_-18px_rgba(37,99,235,0.65)] dark:from-cyan-400 dark:to-blue-500 dark:text-slate-950"
        >
          Ver detalle del usuario
        </Button>

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/55">
        <div>
          <div className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Rol</div>
          <select
            value={user.rol}
            disabled={busy || isSelf}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none ring-blue-500 focus:ring-2 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="estudiante">Estudiante</option>
            <option value="docente">Docente</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Estado</div>
          <select
            value={user.estado}
            disabled={busy || isSelf}
            onChange={(e) => onStatusChange(e.target.value as UserEstado)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none ring-blue-500 focus:ring-2 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="suspendido">Suspendido</option>
          </select>
        </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/55 dark:text-slate-300">
          <div>
            Último login: <span className="font-semibold text-slate-800 dark:text-slate-100">{formatDateTime(user.ultimo_login)}</span>
          </div>
          <div className="mt-1">
            Creado: <span className="font-semibold text-slate-800 dark:text-slate-100">{formatDateTime(user.created_at)}</span>
          </div>
        </div>

        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Gestión
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" size="sm" disabled={busy || isSelf} onClick={onActivate}>
            Activar
          </Button>
          <Button variant="ghost" size="sm" disabled={busy || isSelf} onClick={onSuspend}>
            Suspender
          </Button>
          <Button variant="ghost" size="sm" disabled={busy || isSelf} onClick={onDisable}>
            Desactivar
          </Button>
          <Button variant="danger" size="sm" disabled={busy || isSelf} onClick={onDelete}>
            Eliminar
          </Button>
        </div>

        {isSelf ? (
          <div className="text-xs text-slate-500 dark:text-slate-400">No puedes cambiar tu propio rol ni desactivar tu cuenta aquí.</div>
        ) : null}
        {busy ? <div className="text-xs text-slate-500 dark:text-slate-400">Guardando…</div> : null}
      </div>
    </Card>
  );
}

export function AdminUsersPage() {
  const { api, user: me, refreshMe } = useAuth();
  const toast = useToast();
  const [list, setList] = useState<UserListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [page, setPage] = useState(1);
  const [isSaving, setIsSaving] = useState<Record<number, boolean>>({});
  const [pendingDeleteUser, setPendingDeleteUser] = useState<User | null>(null);
  const [detailUser, setDetailUser] = useState<User | null>(null);

  const load = useCallback(
    async (pageToLoad = page, signal?: AbortSignal) => {
      try {
        setIsLoading(true);
        const res = await api.get<ApiResponse<UserListResponse>>("/users", {
          params: {
            limit: PAGE_SIZE,
            offset: (pageToLoad - 1) * PAGE_SIZE,
            search: deferredSearch || undefined,
          },
          signal,
        });
        if (signal?.aborted) return;
        const data = res.data.data;
        const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
        if (data.total > 0 && pageToLoad > totalPages) {
          setPage(totalPages);
          return;
        }
        setList(data);
      } catch (err) {
        if ((err as { code?: string }).code === "ERR_CANCELED" || signal?.aborted) return;
        setList({ items: [], total: 0, limit: PAGE_SIZE, offset: (pageToLoad - 1) * PAGE_SIZE });
        toast.push({
          kind: "error",
          title: "No se pudieron cargar los usuarios",
          description: getApiErrorMessage(err, "Intenta de nuevo."),
        });
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [api, deferredSearch, page, toast]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(page, controller.signal);
    return () => controller.abort();
  }, [load, page]);

  const updateUser = async (id: number, patch: Partial<Pick<User, "rol" | "estado">>) => {
    setIsSaving((p) => ({ ...p, [id]: true }));
    try {
      const res = await api.put<ApiResponse<User>>(`/users/${id}`, patch);
      setList((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((u) => (u.id === id ? res.data.data : u)),
            }
          : prev
      );
      if (me?.id === id) await refreshMe();
      toast.push({ kind: "success", title: "Cambios guardados" });
    } catch (err) {
      toast.push({
        kind: "error",
        title: "No se pudo actualizar el usuario",
        description: getApiErrorMessage(err, "Intenta de nuevo."),
      });
    } finally {
      setIsSaving((p) => ({ ...p, [id]: false }));
    }
  };

  const disableUser = async (id: number) => updateUser(id, { estado: "inactivo" });
  const suspendUser = async (id: number) => updateUser(id, { estado: "suspendido" });
  const activateUser = async (id: number) => updateUser(id, { estado: "activo" });

  const deleteUser = async (id: number) => {
    if (me?.id === id) {
      toast.push({ kind: "error", title: "No puedes eliminar tu propia cuenta" });
      return;
    }
    setIsSaving((p) => ({ ...p, [id]: true }));
    try {
      await api.delete(`/users/${id}`);
      toast.push({ kind: "success", title: "Usuario eliminado" });
      if (page > 1 && (list?.items.length ?? 0) === 1) {
        setPage((prev) => Math.max(1, prev - 1));
      } else {
        await load();
      }
    } catch (err) {
      toast.push({
        kind: "error",
        title: "No se pudo eliminar el usuario",
        description: getApiErrorMessage(err, "Intenta de nuevo."),
      });
    } finally {
      setIsSaving((p) => ({ ...p, [id]: false }));
      setPendingDeleteUser(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        subtitle="Gestión (admin)"
        right={
          <Button variant="ghost" onClick={() => void load()}>
            Actualizar
          </Button>
        }
      />

      <Card className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-black text-slate-900">Listado</div>
            <div className="mt-1 text-sm text-slate-600">
              Cambia rol, estado o elimina usuarios (admin).
              {list ? <span className="ml-2 font-black text-slate-900">{list.total} registros</span> : null}
            </div>
          </div>
          <div className="w-full md:w-[360px]">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por nombre, correo, id, rol o estado…"
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          {isLoading ? (
            <div className="grid place-items-center py-10">
              <Spinner />
            </div>
          ) : !list || list.items.length === 0 ? (
            <EmptyState
              title={deferredSearch ? "Sin resultados" : "No hay usuarios registrados"}
              description={
                deferredSearch
                  ? "Prueba con otro texto de búsqueda o limpia el filtro."
                  : "Cuando se registren usuarios, aparecerán aquí. También puedes actualizar para recargar el listado."
              }
              actionLabel={deferredSearch ? "Limpiar búsqueda" : "Actualizar"}
              onAction={() => {
                if (deferredSearch) {
                  setSearch("");
                  setPage(1);
                  return;
                }
                void load();
              }}
              secondaryActionLabel={deferredSearch ? undefined : "Volver al tablero"}
              onSecondaryAction={deferredSearch ? undefined : () => (window.location.href = "/admin")}
            />
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 md:hidden">
                {list.items.map((u) => {
                  const busy = Boolean(isSaving[u.id]);
                  return (
                    <UserCard
                      key={u.id}
                      user={u}
                      currentUserId={me?.id}
                      busy={busy}
                      onRoleChange={(rol) => void updateUser(u.id, { rol })}
                      onStatusChange={(estado) => void updateUser(u.id, { estado })}
                      onViewDetail={() => setDetailUser(u)}
                      onActivate={() => void activateUser(u.id)}
                      onSuspend={() => void suspendUser(u.id)}
                      onDisable={() => void disableUser(u.id)}
                      onDelete={() => setPendingDeleteUser(u)}
                    />
                  );
                })}
              </div>

              <div className="hidden overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_48px_-42px_rgba(15,23,42,0.45)] md:block dark:border-slate-800 dark:bg-slate-950/70">
              <table className="w-full min-w-[1080px] border-separate border-spacing-0 bg-white dark:bg-slate-950/70">
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[22%]" />
                  <col className="w-[18%]" />
                  <col className="w-[13%]" />
                  <col className="w-[19%]" />
                </colgroup>
                <thead>
                  <tr className="text-left text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    <th className="bg-slate-50 px-5 pb-3 pt-4 pr-4 dark:bg-slate-900/80">Usuario</th>
                    <th className="bg-slate-50 px-4 pb-3 pt-4 pr-4 dark:bg-slate-900/80">Rol y estado</th>
                    <th className="bg-slate-50 px-4 pb-3 pt-4 pr-4 dark:bg-slate-900/80">Actividad</th>
                    <th className="bg-slate-50 px-4 pb-3 pt-4 pr-4 dark:bg-slate-900/80">Detalle</th>
                    <th className="bg-slate-50 px-4 pb-3 pt-4 pr-5 dark:bg-slate-900/80">Gestión</th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((u) => {
                    const role = roleBadge(u.rol);
                    const estado = estadoBadge(u.estado);
                    const busy = Boolean(isSaving[u.id]);
                    const isSelf = me?.id === u.id;

                    return (
                      <tr key={u.id} className="border-t border-slate-200 transition hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-900/45">
                        <td className="px-5 py-4 pr-4 align-top">
                          <div className="flex items-start gap-3">
                            <Avatar name={`${u.nombres} ${u.apellidos}`} src={u.foto_url} size={44} />
                            <div className="min-w-0">
                              <div className="line-clamp-2 text-sm font-black leading-5 text-slate-900 dark:text-slate-100">
                                {u.nombres} {u.apellidos}{" "}
                                <span className="text-xs font-bold text-slate-500">#{u.id}</span>
                              </div>
                              <div className="mt-1 break-all text-sm text-slate-600 dark:text-slate-300">{u.correo}</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge variant={role.variant}>{role.label}</Badge>
                                <Badge variant={estado.variant}>{estado.label}</Badge>
                                {isSelf ? <span className="text-xs font-bold text-slate-500">Tú</span> : null}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 pr-4 align-top">
                          <div className="grid gap-3">
                            <div>
                              <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                Rol
                              </label>
                          <select
                            value={u.rol}
                            disabled={busy || isSelf}
                            onChange={(e) => void updateUser(u.id, { rol: e.target.value as UserRole })}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none ring-blue-500 transition focus:ring-2 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          >
                            <option value="estudiante">Estudiante</option>
                            <option value="docente">Docente</option>
                            <option value="admin">Admin</option>
                          </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                Estado
                              </label>
                              <select
                                value={u.estado}
                                disabled={busy || isSelf}
                                onChange={(e) => void updateUser(u.id, { estado: e.target.value as UserEstado })}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none ring-blue-500 transition focus:ring-2 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                              >
                                <option value="activo">Activo</option>
                                <option value="inactivo">Inactivo</option>
                                <option value="suspendido">Suspendido</option>
                              </select>
                            </div>
                          </div>
                          {isSelf ? (
                            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">No puedes cambiar tu propio rol ni estado.</div>
                          ) : null}
                        </td>

                        <td className="px-4 py-4 pr-4 align-top">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/65">
                            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                              Último login
                            </div>
                            <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                              {formatDateTime(u.ultimo_login)}
                            </div>
                            <div className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                              Creado
                            </div>
                            <div className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                              {formatDateTime(u.created_at)}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 pr-4 align-top">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setDetailUser(u)}
                            className="h-10 w-full rounded-xl bg-gradient-to-r from-slate-950 to-blue-700 text-white shadow-[0_14px_28px_-18px_rgba(37,99,235,0.65)] dark:from-cyan-400 dark:to-blue-500 dark:text-slate-950"
                          >
                            Ver detalle
                          </Button>
                          <div className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            DPI, teléfono, dirección y fechas.
                          </div>
                        </td>

                        <td className="px-4 py-4 pr-5 align-top">
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busy || isSelf}
                              onClick={() => void activateUser(u.id)}
                            >
                              Activar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busy || isSelf}
                              onClick={() => void suspendUser(u.id)}
                            >
                              Suspender
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busy || isSelf}
                              onClick={() => void disableUser(u.id)}
                            >
                              Desactivar
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={busy || isSelf}
                              onClick={() => setPendingDeleteUser(u)}
                              title="Eliminación física (puede fallar si tiene registros asociados)"
                            >
                              Eliminar
                            </Button>
                          </div>
                          {busy ? <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">Guardando…</div> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>

              <PaginationControls
                page={page}
                pageSize={list.limit}
                total={list.total}
                isLoading={isLoading}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </Card>

      <ConfirmDeleteModal
        open={Boolean(pendingDeleteUser)}
        title="¿Eliminar usuario?"
        description={`Vas a eliminar a ${pendingDeleteUser?.nombres ?? "este usuario"} ${pendingDeleteUser?.apellidos ?? ""}.\nSi tiene cursos, inscripciones o pagos asociados, el sistema puede bloquearlo.`}
        confirmLabel="Eliminar"
        isLoading={pendingDeleteUser ? Boolean(isSaving[pendingDeleteUser.id]) : false}
        onCancel={() => setPendingDeleteUser(null)}
        onConfirm={() => {
          if (pendingDeleteUser) void deleteUser(pendingDeleteUser.id);
        }}
      />
      <UserDetailModal user={detailUser} onClose={() => setDetailUser(null)} />
    </div>
  );
}
