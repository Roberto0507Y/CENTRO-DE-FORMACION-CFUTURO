import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AxiosInstance } from "axios";
import type { ApiResponse } from "../../types/api";
import type { NotificationItem, NotificationListResponse } from "../../types/notification";
import { getApiErrorMessage } from "../../utils/apiError";
import { Button } from "../ui/Button";
import { ConfirmDeleteModal } from "../ui/ConfirmDeleteModal";

type NotificationRole = "admin" | "docente" | "estudiante";

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Ahora";
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h} h`;
  const days = Math.floor(h / 24);
  return `Hace ${days} d`;
}

function notificationHref(n: NotificationItem, role: NotificationRole): string | null {
  if (role === "estudiante") {
    if (n.tipo === "pago" || n.referencia_tipo === "pagos") return "/student/payments";
    if (n.tipo === "calificacion" && n.referencia_tipo === "course_tasks" && n.referencia_id) {
      return `/student/course/${n.referencia_id}/tasks`;
    }
    if (n.tipo === "curso") return "/student/my-courses";
  }

  if (role === "admin") {
    if (n.tipo === "pago" || n.referencia_tipo === "pagos") return "/admin/payments";
    if (n.tipo === "curso" || n.referencia_tipo === "cursos") return "/admin/courses";
  }

  if (role === "docente" && n.referencia_tipo === "course_tasks" && n.referencia_id) {
    return `/teacher/course/${n.referencia_id}/tasks`;
  }

  return null;
}

export function NotificationsBell({ api, role }: { api: AxiosInstance; role: NotificationRole }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [pendingDelete, setPendingDelete] = useState<NotificationItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const pollInFlightRef = useRef(false);
  const navigate = useNavigate();

  const hasUnread = unreadCount > 0;

  const load = async (opts?: { unreadOnly?: boolean; silent?: boolean }) => {
    try {
      if (!opts?.silent) {
        setLoading(true);
        setError("");
      }
      const res = await api.get<ApiResponse<NotificationListResponse>>("/notifications", {
        params: {
          limit: opts?.unreadOnly ? 1 : 12,
          offset: 0,
          unread: opts?.unreadOnly ? 1 : undefined,
        },
      });
      if (!opts?.unreadOnly) {
        setItems(res.data.data.items);
      }
      setUnreadCount(res.data.data.unreadCount);
    } catch (err) {
      if (!opts?.silent) {
        setError(getApiErrorMessage(err, "No se pudieron cargar notificaciones."));
      }
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Poll ligero para el contador (solo si está cerrado y la pestaña está visible)
    const t = window.setInterval(() => {
      if (open || document.visibilityState !== "visible" || pollInFlightRef.current) return;
      pollInFlightRef.current = true;
      void load({ unreadOnly: true, silent: true }).finally(() => {
        pollInFlightRef.current = false;
      });
    }, 60000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    void load({ unreadOnly: true, silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (open || document.visibilityState !== "visible" || pollInFlightRef.current) return;
      pollInFlightRef.current = true;
      void load({ unreadOnly: true, silent: true }).finally(() => {
        pollInFlightRef.current = false;
      });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const target = e.target as Node;
      if (!el.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const markRead = async (id: number) => {
    try {
      await api.patch<ApiResponse<{ ok: true }>>(`/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, leida: 1 } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const openNotification = async (n: NotificationItem) => {
    await markRead(n.id);
    const href = notificationHref(n, role);
    if (!href) return;
    setOpen(false);
    navigate(href);
  };

  const deleteNotification = async (n: NotificationItem) => {
    try {
      setDeletingId(n.id);
      await api.delete<ApiResponse<{ ok: true }>>(`/notifications/${n.id}`);
      setItems((prev) => prev.filter((item) => item.id !== n.id));
      if (!n.leida) setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo eliminar la notificación."));
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  const markAll = async () => {
    try {
      await api.patch<ApiResponse<{ affected: number }>>("/notifications/read-all");
      setItems((prev) => prev.map((n) => ({ ...n, leida: 1 })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const headerText = useMemo(() => {
    if (hasUnread) return `Notificaciones (${unreadCount})`;
    return "Notificaciones";
  }, [hasUnread, unreadCount]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative hidden rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-700 transition hover:bg-slate-50 md:inline-flex dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-label="Notificaciones"
        title="Notificaciones"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M15 17H9m10-1V11a7 7 0 1 0-14 0v5l-2 2h18l-2-2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {hasUnread ? (
          <span
            className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-amber-400 px-1 text-[11px] font-black text-slate-900 ring-2 ring-white dark:ring-slate-900"
            aria-label={`${unreadCount} sin leer`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/30">
            <div className="text-xs font-black text-slate-900 dark:text-slate-100">{headerText}</div>
            <Button size="sm" variant="ghost" onClick={() => void markAll()}>
              Marcar todo
            </Button>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-2">
            {loading ? (
              <div className="px-3 py-8 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">
                Cargando…
              </div>
            ) : error ? (
              <div className="px-3 py-4 text-sm font-semibold text-rose-700">{error}</div>
            ) : items.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">
                No hay notificaciones.
              </div>
            ) : (
              <div className="space-y-1">
                {items.map((n) => (
                  <div
                    key={n.id}
                    className={`group flex w-full items-stretch overflow-hidden rounded-xl transition hover:bg-slate-50 dark:hover:bg-slate-800 ${
                      n.leida ? "" : "bg-amber-50/60 dark:bg-amber-400/10"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void openNotification(n)}
                      className="min-w-0 flex-1 px-3 py-3 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-slate-900 dark:text-slate-100">
                            {n.titulo}
                          </div>
                          <div className="mt-1 line-clamp-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {n.mensaje}
                          </div>
                        </div>
                        <div className="shrink-0 text-[11px] font-bold text-slate-400">{timeAgo(n.created_at)}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setPendingDelete(n);
                      }}
                      className="my-2 mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30 dark:text-slate-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                      aria-label={`Eliminar notificación: ${n.titulo}`}
                      title="Eliminar"
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <ConfirmDeleteModal
        open={Boolean(pendingDelete)}
        title="¿Eliminar notificación?"
        description={`Vas a eliminar "${pendingDelete?.titulo ?? "esta notificación"}".\nEsta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        isLoading={pendingDelete ? deletingId === pendingDelete.id : false}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) void deleteNotification(pendingDelete);
        }}
      />
    </div>
  );
}
