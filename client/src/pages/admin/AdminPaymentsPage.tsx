import { Suspense, memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmActionModal } from "../../components/ui/ConfirmActionModal";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { PaginationControls } from "../../components/ui/PaginationControls";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type {
  PaymentDetail,
  PaymentListItem,
  PaymentMethod,
  PaymentsListResponse,
  PaymentsSummary,
  PaymentStatus,
  RevenuePoint,
} from "../../types/payment";
import { getApiErrorMessage } from "../../utils/apiError";
import { downloadPaymentProof } from "../../utils/downloadFile";
import { lazyNamed } from "../../utils/lazyNamed";
import "../../styles/admin-payments.css";

type Banner = { tone: "success" | "error"; text: string } | null;
type QuickRange = "today" | "week" | "month";

const PAGE_SIZE = 10;

const PaymentDetailModal = lazyNamed(
  () => import("../../components/payment/AdminPaymentModals"),
  "PaymentDetailModal"
);
const PaymentRejectModal = lazyNamed(
  () => import("../../components/payment/AdminPaymentModals"),
  "PaymentRejectModal"
);

function formatMoney(amount: string | number, currency: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  try {
    return new Intl.NumberFormat("es-GT", {
      style: "currency",
      currency: currency || "GTQ",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
}

function formatChartDate(value: string) {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-GT", { weekday: "short", day: "2-digit" });
}

function formatInputDate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function statusUi(estado: PaymentStatus) {
  switch (estado) {
    case "pagado":
      return { label: "Pagado", className: "cf-payments-status--paid" };
    case "pendiente":
      return { label: "Pendiente", className: "cf-payments-status--pending" };
    case "reembolsado":
      return { label: "Reembolsado", className: "cf-payments-status--refunded" };
    case "rechazado":
      return { label: "Rechazado", className: "cf-payments-status--rejected" };
    case "cancelado":
    default:
      return { label: "Cancelado", className: "cf-payments-status--canceled" };
  }
}

function methodLabel(m: PaymentMethod) {
  if (m === "bi_pay") return "BI Pay";
  if (m === "transferencia") return "Transferencia";
  if (m === "deposito") return "Depósito";
  if (m === "efectivo") return "Efectivo";
  return "Manual";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(rows: PaymentListItem[]) {
  const headers = ["Pago", "Referencia", "Estudiante", "Correo", "Curso", "Monto", "Metodo", "Estado", "Fecha"];
  const body = rows.map((p) => [
    p.id,
    p.referencia_pago,
    `${p.usuario.nombres} ${p.usuario.apellidos}`,
    p.usuario.correo,
    p.cursos ?? "",
    formatMoney(p.monto_total, p.moneda),
    methodLabel(p.metodo_pago),
    statusUi(p.estado).label,
    formatDateTime(p.fecha_pago ?? p.created_at),
  ]);
  const csv = [headers, ...body].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pagos-transacciones-${formatInputDate(new Date())}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const modalFallback = (
  <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
    <Card className="w-full max-w-md p-6">
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
        <Spinner />
        Cargando…
      </div>
    </Card>
  </div>
);

export function AdminPaymentsPage() {
  const { api } = useAuth();
  const [banner, setBanner] = useState<Banner>(null);

  const [summary, setSummary] = useState<PaymentsSummary | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [list, setList] = useState<PaymentsListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [quickRange, setQuickRangeState] = useState<QuickRange | null>(null);

  const [filters, setFilters] = useState<{
    date_from: string;
    date_to: string;
    estado: "" | PaymentStatus;
    metodo_pago: "" | PaymentMethod;
    curso_id: string;
    usuario_id: string;
  }>({
    date_from: "",
    date_to: "",
    estado: "",
    metodo_pago: "",
    curso_id: "",
    usuario_id: "",
  });

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<PaymentDetail | null>(null);

  const [mutating, setMutating] = useState<Record<number, boolean>>({});
  const [pendingApprovePayment, setPendingApprovePayment] = useState<PaymentDetail | PaymentListItem | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const detailRequestRef = useRef<AbortController | null>(null);

  const deferredSearchTerm = useDeferredValue(searchTerm.trim().toLowerCase());
  const deferredCourseId = useDeferredValue(filters.curso_id.trim());
  const deferredUsuarioId = useDeferredValue(filters.usuario_id.trim());

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
      filters.date_from ||
      filters.date_to ||
      filters.estado ||
      filters.metodo_pago ||
      deferredCourseId ||
      deferredUsuarioId
  );

  const updateFilters = useCallback(<K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setPage(1);
    setQuickRangeState(null);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const query = useMemo(() => {
    const toNum = (v: string) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    return {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      estado: filters.estado || undefined,
      metodo_pago: filters.metodo_pago || undefined,
      curso_id: toNum(deferredCourseId),
      usuario_id: toNum(deferredUsuarioId),
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
    };
  }, [deferredCourseId, deferredUsuarioId, filters.date_from, filters.date_to, filters.estado, filters.metodo_pago, page]);

  const loadDashboard = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const summaryReq = api.get<ApiResponse<PaymentsSummary>>("/payments/summary", { signal });
        const revenueReq = api.get<ApiResponse<RevenuePoint[]>>("/payments/reports/revenue", {
          params: { days: 7 },
          signal,
        });

        const [s, r] = await Promise.all([summaryReq, revenueReq]);
        if (signal?.aborted) return;
        setSummary(s.data.data);
        setRevenue(r.data.data);
      } catch (err) {
        if ((err as { code?: string }).code === "ERR_CANCELED" || signal?.aborted) return;
        setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudieron cargar los pagos.") });
        setSummary(null);
        setRevenue([]);
      }
    },
    [api]
  );

  const loadList = useCallback(
    async (pageToLoad = page, signal?: AbortSignal) => {
      try {
        setIsLoading(true);
        setBanner(null);
        const nextQuery = {
          ...query,
          offset: (pageToLoad - 1) * PAGE_SIZE,
        };
        const res = await api.get<ApiResponse<PaymentsListResponse>>("/payments", {
          params: nextQuery,
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
        setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudieron cargar los pagos.") });
        setList({ items: [], total: 0, limit: PAGE_SIZE, offset: (pageToLoad - 1) * PAGE_SIZE });
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [api, page, query]
  );

  const loadAll = useCallback(async () => {
    await Promise.all([loadDashboard(), loadList(page)]);
  }, [loadDashboard, loadList, page]);

  useEffect(() => {
    const controller = new AbortController();
    void loadDashboard(controller.signal);
    return () => controller.abort();
  }, [loadDashboard]);

  useEffect(() => {
    const controller = new AbortController();
    void loadList(page, controller.signal);
    return () => controller.abort();
  }, [loadList, page]);

  const visibleItems = useMemo(() => {
    const items = list?.items ?? [];
    if (!deferredSearchTerm) return items;
    return items.filter((p) => {
      const text = [
        p.id,
        p.referencia_pago,
        p.usuario.nombres,
        p.usuario.apellidos,
        p.usuario.correo,
        p.cursos ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return text.includes(deferredSearchTerm);
    });
  }, [deferredSearchTerm, list]);

  const analytics = useMemo(() => {
    const revenueData = revenue.slice(-7).map((p) => ({ date: p.date, amount: Number(p.total) || 0 }));
    const revenueTotal = revenueData.reduce((sum, p) => sum + p.amount, 0);
    const bestDay = revenueData.reduce(
      (winner, p) => (p.amount > winner.amount ? p : winner),
      revenueData[0] ?? { date: "", amount: 0 }
    );
    const average = revenueData.length > 0 ? revenueTotal / revenueData.length : 0;
    const listed = list?.items ?? [];
    const decided = listed.filter((p) => p.estado !== "pendiente" && p.estado !== "cancelado");
    const approvalRate =
      decided.length > 0
        ? Math.round((decided.filter((p) => p.estado === "pagado").length / decided.length) * 100)
        : 0;
    const courseTotals = new Map<string, number>();
    listed
      .filter((p) => p.estado === "pagado")
      .forEach((p) => {
        const key = p.cursos ?? "Sin curso";
        courseTotals.set(key, (courseTotals.get(key) ?? 0) + Number(p.monto_total || 0));
      });
    const topCourse =
      [...courseTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Sin datos todavía";
    return { revenueTotal, bestDay, average, approvalRate, topCourse };
  }, [list, revenue]);

  const openDetail = useCallback(
    async (id: number) => {
      detailRequestRef.current?.abort();
      const controller = new AbortController();
      detailRequestRef.current = controller;
      setDetailOpen(true);
      setDetailLoading(true);
      setDetail(null);
      try {
        const res = await api.get<ApiResponse<PaymentDetail>>(`/payments/${id}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setDetail(res.data.data);
      } catch (err) {
        if ((err as { code?: string }).code === "ERR_CANCELED" || controller.signal.aborted) return;
        setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo cargar el detalle.") });
        setDetailOpen(false);
      } finally {
        if (!controller.signal.aborted) setDetailLoading(false);
      }
    },
    [api]
  );

  useEffect(() => {
    return () => detailRequestRef.current?.abort();
  }, []);

  const updateStatus = async (
    id: number,
    estado: "pendiente" | "pagado" | "rechazado" | "reembolsado",
    observaciones?: string | null
  ) => {
    setMutating((p) => ({ ...p, [id]: true }));
    setBanner(null);
    try {
      const res = await api.put<ApiResponse<PaymentDetail>>(`/payments/${id}/status`, {
        estado,
        observaciones: observaciones ?? null,
      });
      const updated = res.data.data;
      setList((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((it) =>
                it.id === id ? { ...it, estado: updated.estado, fecha_pago: updated.fecha_pago } : it
              ),
            }
          : prev
      );
      setDetail((prev) => (prev && prev.id === id ? updated : prev));
      setBanner({ tone: "success", text: "Pago actualizado." });
      void Promise.all([loadDashboard(), loadList()]);
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo actualizar el pago.") });
    } finally {
      setMutating((p) => ({ ...p, [id]: false }));
      if (pendingApprovePayment?.id === id) setPendingApprovePayment(null);
    }
  };

  const downloadProof = async (id: number) => {
    try {
      await downloadPaymentProof(api, id);
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo descargar el comprobante.") });
    }
  };

  const openReject = (id: number) => {
    setRejectId(id);
    setRejectReason("");
    setRejectOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectId) return;
    const msg = rejectReason.trim() || null;
    setRejectOpen(false);
    await updateStatus(rejectId, "rechazado", msg);
    setRejectId(null);
    setRejectReason("");
  };

  const setQuickRange = (range: QuickRange) => {
    const today = new Date();
    const start = new Date(today);
    if (range === "today") {
      start.setTime(today.getTime());
    } else if (range === "week") {
      start.setDate(today.getDate() - 6);
    } else {
      start.setDate(1);
    }
    setQuickRangeState(range);
    setPage(1);
    setFilters((prev) => ({
      ...prev,
      date_from: formatInputDate(start),
      date_to: formatInputDate(today),
    }));
  };

  const clearFilters = () => {
    setPage(1);
    setSearchTerm("");
    setQuickRangeState(null);
    setFilters({
      date_from: "",
      date_to: "",
      estado: "",
      metodo_pago: "",
      curso_id: "",
      usuario_id: "",
    });
  };

  const exportCurrentRows = () => {
    if (visibleItems.length === 0) {
      setBanner({ tone: "error", text: "No hay transacciones para exportar con los filtros actuales." });
      return;
    }
    downloadCsv(visibleItems);
  };

  return (
    <div className="cf-payments-page space-y-6">
      <section className="cf-payments-hero">
        <div className="cf-payments-hero__content">
          <div className="cf-payments-eyebrow">
            <span className="cf-payments-live-dot" />
            Panel financiero
          </div>
          <h1>Pagos y Transacciones</h1>
          <p>Control, validación y seguimiento de movimientos registrados</p>
        </div>
        <div className="cf-payments-hero__actions">
          <Button variant="ghost" className="cf-payments-hero-btn" onClick={() => void loadAll()}>
            Actualizar
          </Button>
          <Button variant="ghost" className="cf-payments-hero-btn" onClick={exportCurrentRows}>
            Exportar
          </Button>
          <Button
            className="cf-payments-primary-btn"
            onClick={() =>
              setBanner({
                tone: "success",
                text: "Botón listo para conectar al formulario de registro manual de pago.",
              })
            }
          >
            Nuevo pago
          </Button>
        </div>
      </section>

      {banner ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            banner.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
              : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
          }`}
          role="status"
        >
          {banner.text}
        </div>
      ) : null}

      <section className="cf-payments-stats">
        <FinancialStatCard
          label="Ingresos del mes"
          value={formatMoney(analytics.revenueTotal, "GTQ")}
          note="Pagos aprobados recientes"
          tone="blue"
        />
        <FinancialStatCard
          label="Pagos aprobados"
          value={summary ? `${summary.monthPaidCount}` : "—"}
          note="Confirmados este mes"
          tone="green"
        />
        <FinancialStatCard
          label="Pagos pendientes"
          value={summary ? `${summary.pendingCount}` : "—"}
          note="Requieren validación"
          tone="amber"
        />
        <FinancialStatCard
          label="Reembolsos"
          value={summary ? formatMoney(summary.refundsTotal, "GTQ") : "—"}
          note="Movimientos devueltos"
          tone="purple"
        />
      </section>

      <section className="cf-payments-main-grid">
        <Card className="cf-payments-panel">
          <div className="cf-payments-panel-header">
            <div>
              <h2>Ingresos de los últimos 7 días</h2>
              <p>Movimientos confirmados por día, expresados en quetzales.</p>
            </div>
            <span className="cf-payments-total-pill">{formatMoney(analytics.revenueTotal, "GTQ")}</span>
          </div>
          <RevenueChart points={revenue} />
        </Card>

        <Card className="cf-payments-panel cf-payments-summary-panel">
          <div className="cf-payments-panel-header">
            <div>
              <h2>Resumen rápido</h2>
              <p>Lectura ejecutiva del comportamiento reciente.</p>
            </div>
          </div>
          <div className="cf-payments-summary-list">
            <SummaryItem label="Mejor día" value={analytics.bestDay.date ? `${formatChartDate(analytics.bestDay.date)} · ${formatMoney(analytics.bestDay.amount, "GTQ")}` : "Sin datos"} />
            <SummaryItem label="Promedio diario" value={formatMoney(analytics.average, "GTQ")} />
            <SummaryItem label="Tasa de aprobación" value={`${analytics.approvalRate}%`} />
            <SummaryItem label="Curso más pagado" value={analytics.topCourse} />
          </div>
        </Card>
      </section>

      <Card className="cf-payments-filters">
        <div className="cf-payments-search-row">
          <div>
            <div className="cf-payments-section-title">Filtros</div>
            <div className="cf-payments-section-copy">Busca y segmenta las transacciones sin perder claridad.</div>
          </div>
          <div className="cf-payments-search-field">
            <span aria-hidden="true">⌕</span>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por estudiante, correo o número de pago..."
              className="pl-11"
            />
          </div>
        </div>

        <div className="cf-payments-quick-row">
          <button type="button" className={quickRange === "today" ? "is-active" : ""} onClick={() => setQuickRange("today")}>
            Hoy
          </button>
          <button type="button" className={quickRange === "week" ? "is-active" : ""} onClick={() => setQuickRange("week")}>
            Semana
          </button>
          <button type="button" className={quickRange === "month" ? "is-active" : ""} onClick={() => setQuickRange("month")}>
            Mes
          </button>
          <button type="button" onClick={clearFilters}>
            Limpiar
          </button>
        </div>

        <div className="cf-payments-filter-grid">
          <FilterField label="Fecha desde">
            <Input type="date" value={filters.date_from} onChange={(e) => updateFilters("date_from", e.target.value)} />
          </FilterField>
          <FilterField label="Fecha hasta">
            <Input type="date" value={filters.date_to} onChange={(e) => updateFilters("date_to", e.target.value)} />
          </FilterField>
          <FilterField label="Estado">
            <select value={filters.estado} onChange={(e) => updateFilters("estado", e.target.value as "" | PaymentStatus)}>
              <option value="">Todos</option>
              <option value="pagado">Pagado</option>
              <option value="pendiente">Pendiente</option>
              <option value="rechazado">Rechazado</option>
              <option value="cancelado">Cancelado</option>
              <option value="reembolsado">Reembolsado</option>
            </select>
          </FilterField>
          <FilterField label="Método">
            <select
              value={filters.metodo_pago}
              onChange={(e) => updateFilters("metodo_pago", e.target.value as "" | PaymentMethod)}
            >
              <option value="">Todos</option>
              <option value="bi_pay">BI Pay</option>
              <option value="transferencia">Transferencia</option>
              <option value="deposito">Depósito</option>
              <option value="efectivo">Efectivo</option>
              <option value="manual">Manual</option>
            </select>
          </FilterField>
          <FilterField label="Curso o ID estudiante">
            <div className="cf-payments-combo-inputs">
              <Input
                inputMode="numeric"
                value={filters.curso_id}
                onChange={(e) => updateFilters("curso_id", e.target.value)}
                placeholder="Curso ID"
              />
              <Input
                inputMode="numeric"
                value={filters.usuario_id}
                onChange={(e) => updateFilters("usuario_id", e.target.value)}
                placeholder="Estudiante ID"
              />
            </div>
          </FilterField>
        </div>
      </Card>

      <Card className="cf-payments-table-card">
        <div className="cf-payments-table-toolbar">
          <div>
            <h2>Transacciones recientes</h2>
            <p>
              {list ? `${list.total} registros encontrados` : "Cargando registros"} ·{" "}
              {visibleItems.length} visibles en esta página
            </p>
          </div>
          <span className="cf-payments-count-pill">{visibleItems.length} registros</span>
        </div>

        <div className="cf-payments-table-body">
          {isLoading ? (
            <div className="grid place-items-center py-12">
              <Spinner />
            </div>
          ) : !list || visibleItems.length === 0 ? (
            <EmptyState
              title={hasActiveFilters ? "Sin resultados" : "No hay pagos todavía"}
              description={
                hasActiveFilters
                  ? "Prueba con otros filtros o limpia la búsqueda."
                  : "Cuando existan transacciones, aparecerán aquí."
              }
              actionLabel={hasActiveFilters ? "Limpiar filtros" : "Actualizar"}
              onAction={() => {
                if (hasActiveFilters) {
                  clearFilters();
                  return;
                }
                void loadAll();
              }}
            />
          ) : (
            <>
              <div className="cf-payments-table-wrap">
                <table className="cf-payments-table">
                  <thead>
                    <tr>
                      <th>Pago</th>
                      <th>Estudiante</th>
                      <th>Curso</th>
                      <th>Monto</th>
                      <th>Método</th>
                      <th>Estado</th>
                      <th>Comprobante</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((p) => {
                      const s = statusUi(p.estado);
                      const busy = Boolean(mutating[p.id]);
                      const studentName = `${p.usuario.nombres} ${p.usuario.apellidos}`;
                      return (
                        <tr key={p.id}>
                          <td>
                            <div className="cf-payments-payment-id">
                              <strong>Pago #{p.id}</strong>
                              <span>{p.referencia_pago}</span>
                            </div>
                          </td>
                          <td>
                            <div className="cf-payments-student">
                              <div className="cf-payments-avatar">{initials(studentName)}</div>
                              <div className="min-w-0">
                                <strong>{studentName}</strong>
                                <span>{p.usuario.correo}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="cf-payments-course">{p.cursos ?? "—"}</div>
                          </td>
                          <td>
                            <div className="cf-payments-amount">{formatMoney(p.monto_total, p.moneda)}</div>
                            <div className="cf-payments-date">{formatDateTime(p.fecha_pago ?? p.created_at)}</div>
                          </td>
                          <td>
                            <span className="cf-payments-method">{methodLabel(p.metodo_pago)}</span>
                          </td>
                          <td>
                            <span className={`cf-payments-status ${s.className}`}>{s.label}</span>
                          </td>
                          <td>
                            {p.comprobante_url ? (
                              <button
                                type="button"
                                onClick={() => void downloadProof(p.id)}
                                className="cf-payments-proof-btn"
                              >
                                Ver comprobante
                              </button>
                            ) : (
                              <span className="cf-payments-muted">Sin archivo</span>
                            )}
                          </td>
                          <td>
                            <div className="cf-payments-row-actions">
                              <Button size="sm" variant="ghost" onClick={() => void openDetail(p.id)}>
                                Detalle
                              </Button>
                              {p.estado === "pendiente" ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={busy}
                                    onClick={() => setPendingApprovePayment(p)}
                                  >
                                    Aprobar
                                  </Button>
                                  <Button size="sm" variant="danger" disabled={busy} onClick={() => openReject(p.id)}>
                                    Rechazar
                                  </Button>
                                </>
                              ) : null}
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
                pageSize={list.limit}
                total={list.total}
                isLoading={isLoading}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </Card>

      {detailOpen ? (
        <Suspense fallback={modalFallback}>
          <PaymentDetailModal
            isLoading={detailLoading}
            payment={detail}
            onClose={() => setDetailOpen(false)}
            onApprove={() => (detail ? setPendingApprovePayment(detail) : undefined)}
            onReject={() => (detail ? openReject(detail.id) : undefined)}
            onDownloadProof={downloadProof}
          />
        </Suspense>
      ) : null}

      <ConfirmActionModal
        open={Boolean(pendingApprovePayment)}
        tone="green"
        eyebrow="Confirmar pago"
        title="¿Aprobar este pago?"
        description={`Se marcará como pagado el comprobante ${pendingApprovePayment?.referencia_pago ?? ""}.\nMonto: ${
          pendingApprovePayment ? formatMoney(pendingApprovePayment.monto_total, pendingApprovePayment.moneda) : "—"
        }`}
        confirmLabel="Aprobar pago"
        isLoading={pendingApprovePayment ? Boolean(mutating[pendingApprovePayment.id]) : false}
        onCancel={() => setPendingApprovePayment(null)}
        onConfirm={() => {
          if (pendingApprovePayment) void updateStatus(pendingApprovePayment.id, "pagado");
        }}
      />

      {rejectOpen ? (
        <Suspense fallback={modalFallback}>
          <PaymentRejectModal
            value={rejectReason}
            onChange={setRejectReason}
            onClose={() => {
              setRejectOpen(false);
              setRejectId(null);
              setRejectReason("");
            }}
            onConfirm={() => void confirmReject()}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

function FinancialStatCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone: "blue" | "green" | "amber" | "purple";
}) {
  return (
    <Card className={`cf-payments-stat cf-payments-stat--${tone}`}>
      <div className="cf-payments-stat__top">
        <span>{label}</span>
        <i aria-hidden="true">{tone === "green" ? "✓" : tone === "amber" ? "!" : tone === "purple" ? "↺" : "Q"}</i>
      </div>
      <strong>{value}</strong>
      <p>{note}</p>
    </Card>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="cf-payments-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="cf-payments-filter-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

const RevenueChart = memo(function RevenueChart({ points }: { points: RevenuePoint[] }) {
  const data = useMemo(() => {
    return points.slice(-7).map((p) => ({
      date: p.date,
      amount: Number(p.total) || 0,
    }));
  }, [points]);

  const max = Math.max(...data.map((p) => p.amount), 1);

  if (data.length === 0) {
    return (
      <div className="cf-payments-chart-empty">
        No hay datos suficientes para graficar ingresos recientes.
      </div>
    );
  }

  return (
    <div className="cf-payments-chart">
      {data.map((item) => {
        const width = `${Math.max((item.amount / max) * 100, item.amount > 0 ? 8 : 2)}%`;
        return (
          <div className="cf-payments-chart-row" key={item.date}>
            <span>{formatChartDate(item.date)}</span>
            <div className="cf-payments-chart-track">
              <div className="cf-payments-chart-fill" style={{ width }} />
            </div>
            <strong>{formatMoney(item.amount, "GTQ")}</strong>
          </div>
        );
      })}
    </div>
  );
});
