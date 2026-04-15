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

function UserCard({
  user,
  currentUserId,
  busy,
  onRoleChange,
  onStatusChange,
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
  onActivate: () => void;
  onSuspend: () => void;
  onDisable: () => void;
  onDelete: () => void;
}) {
  const role = roleBadge(user.rol);
  const estado = estadoBadge(user.estado);
  const isSelf = currentUserId === user.id;

  return (
    <Card className="rounded-[1.75rem] p-4 md:hidden">
      <div className="flex items-start gap-3">
        <Avatar name={`${user.nombres} ${user.apellidos}`} src={user.foto_url} size={48} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-black text-slate-900">
            {user.nombres} {user.apellidos} <span className="text-xs font-bold text-slate-500">#{user.id}</span>
          </div>
          <div className="truncate text-sm text-slate-600">{user.correo}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={role.variant}>{role.label}</Badge>
            <Badge variant={estado.variant}>{estado.label}</Badge>
            {isSelf ? <span className="text-xs font-bold text-slate-500">Tú</span> : null}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <div>
          <div className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">Rol</div>
          <select
            value={user.rol}
            disabled={busy || isSelf}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none ring-blue-500 focus:ring-2 disabled:opacity-60"
          >
            <option value="estudiante">Estudiante</option>
            <option value="docente">Docente</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <div className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">Estado</div>
          <select
            value={user.estado}
            disabled={busy || isSelf}
            onChange={(e) => onStatusChange(e.target.value as UserEstado)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none ring-blue-500 focus:ring-2 disabled:opacity-60"
          >
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="suspendido">Suspendido</option>
          </select>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <div>
            Último login: <span className="font-semibold text-slate-800">{formatDateTime(user.ultimo_login)}</span>
          </div>
          <div className="mt-1">
            Creado: <span className="font-semibold text-slate-800">{formatDateTime(user.created_at)}</span>
          </div>
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
          <div className="text-xs text-slate-500">No puedes cambiar tu propio rol ni desactivar tu cuenta aquí.</div>
        ) : null}
        {busy ? <div className="text-xs text-slate-500">Guardando…</div> : null}
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
                      onActivate={() => void activateUser(u.id)}
                      onSuspend={() => void suspendUser(u.id)}
                      onDisable={() => void disableUser(u.id)}
                      onDelete={() => setPendingDeleteUser(u)}
                    />
                  );
                })}
              </div>

              <div className="hidden overflow-hidden rounded-[28px] border border-slate-200 md:block">
              <table className="w-full min-w-[900px] border-separate border-spacing-0 bg-white">
                <thead>
                  <tr className="text-left text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="bg-slate-50 px-4 pb-3 pt-4 pr-4">Usuario</th>
                    <th className="bg-slate-50 px-4 pb-3 pt-4 pr-4">Rol</th>
                    <th className="bg-slate-50 px-4 pb-3 pt-4 pr-4">Estado</th>
                    <th className="bg-slate-50 px-4 pb-3 pt-4 pr-4">Último login</th>
                    <th className="bg-slate-50 px-4 pb-3 pt-4 pr-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((u) => {
                    const role = roleBadge(u.rol);
                    const estado = estadoBadge(u.estado);
                    const busy = Boolean(isSaving[u.id]);
                    const isSelf = me?.id === u.id;

                    return (
                      <tr key={u.id} className="border-t">
                        <td className="px-4 py-3 pr-4 align-top">
                          <div className="flex items-start gap-3">
                            <Avatar name={`${u.nombres} ${u.apellidos}`} src={u.foto_url} size={44} />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-black text-slate-900">
                                {u.nombres} {u.apellidos}{" "}
                                <span className="text-xs font-bold text-slate-500">#{u.id}</span>
                              </div>
                              <div className="truncate text-sm text-slate-600">{u.correo}</div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge variant={role.variant}>{role.label}</Badge>
                                <Badge variant={estado.variant}>{estado.label}</Badge>
                                {isSelf ? <span className="text-xs font-bold text-slate-500">Tú</span> : null}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 pr-4 align-top">
                          <select
                            value={u.rol}
                            disabled={busy || isSelf}
                            onChange={(e) => void updateUser(u.id, { rol: e.target.value as UserRole })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none ring-blue-500 focus:ring-2 disabled:opacity-60"
                          >
                            <option value="estudiante">Estudiante</option>
                            <option value="docente">Docente</option>
                            <option value="admin">Admin</option>
                          </select>
                          {isSelf ? (
                            <div className="mt-2 text-xs text-slate-500">No puedes cambiar tu propio rol.</div>
                          ) : null}
                        </td>

                        <td className="px-4 py-3 pr-4 align-top">
                          <select
                            value={u.estado}
                            disabled={busy || isSelf}
                            onChange={(e) => void updateUser(u.id, { estado: e.target.value as UserEstado })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none ring-blue-500 focus:ring-2 disabled:opacity-60"
                          >
                            <option value="activo">Activo</option>
                            <option value="inactivo">Inactivo</option>
                            <option value="suspendido">Suspendido</option>
                          </select>
                          {isSelf ? (
                            <div className="mt-2 text-xs text-slate-500">No puedes desactivar tu propia cuenta aquí.</div>
                          ) : null}
                        </td>

                        <td className="px-4 py-3 pr-4 align-top">
                          <div className="text-sm font-semibold text-slate-800">{formatDateTime(u.ultimo_login)}</div>
                          <div className="mt-1 text-xs text-slate-500">Creado: {formatDateTime(u.created_at)}</div>
                        </td>

                        <td className="px-4 py-3 pr-4 align-top">
                          <div className="flex flex-wrap gap-2">
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
                          {busy ? <div className="mt-2 text-xs text-slate-500">Guardando…</div> : null}
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
    </div>
  );
}
