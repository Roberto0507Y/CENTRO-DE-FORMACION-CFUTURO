import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { PaginationControls } from "../../components/ui/PaginationControls";
import { ConfirmActionModal } from "../../components/ui/ConfirmActionModal";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { PaymentDetail, PaymentListItem, PaymentsListResponse, PaymentsSummary, RevenuePoint } from "../../types/payment";
import type { PaymentMethod, PaymentStatus } from "../../types/payment";
import { getApiErrorMessage } from "../../utils/apiError";
import { downloadPaymentProof } from "../../utils/downloadFile";

type Banner = { tone: "success" | "error"; text: string } | null;
const PAGE_SIZE = 10;

function formatMoney(amount: string, currency: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
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
  return d.toLocaleDateString("es-GT", { day: "2-digit", month: "short" });
}

function formatCompactMoney(amount: number, currency = "GTQ") {
  if (!Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat("es-GT", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function statusUi(estado: PaymentStatus) {
  switch (estado) {
    case "pagado":
      return { label: "Pagado", variant: "green" as const };
    case "pendiente":
      return { label: "Pendiente", variant: "amber" as const };
    case "reembolsado":
      return { label: "Reembolsado", variant: "blue" as const };
    case "rechazado":
      return { label: "Rechazado", variant: "rose" as const };
    case "cancelado":
    default:
      return { label: "Cancelado", variant: "slate" as const };
  }
}

function methodLabel(m: PaymentMethod) {
  if (m === "bi_pay") return "BiPay";
  if (m === "transferencia") return "Transferencia";
  if (m === "deposito") return "Depósito";
  if (m === "efectivo") return "Efectivo";
  return "Manual";
}

export function AdminPaymentsPage() {
  const { api } = useAuth();
  const [banner, setBanner] = useState<Banner>(null);

  const [summary, setSummary] = useState<PaymentsSummary | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [list, setList] = useState<PaymentsListResponse | null>(null);
  const [page, setPage] = useState(1);

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

  const hasActiveFilters = Boolean(
    filters.date_from ||
      filters.date_to ||
      filters.estado ||
      filters.metodo_pago ||
      filters.curso_id ||
      filters.usuario_id
  );

  const updateFilters = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

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
      curso_id: toNum(filters.curso_id),
      usuario_id: toNum(filters.usuario_id),
      date_from: filters.date_from || undefined,
      date_to: filters.date_to || undefined,
    };
  }, [filters, page]);

  const loadDashboard = async () => {
    try {
      const summaryReq = api.get<ApiResponse<PaymentsSummary>>("/payments/summary");
      const revenueReq = api.get<ApiResponse<RevenuePoint[]>>("/payments/reports/revenue", {
        params: { days: 14 },
      });

      const [s, r] = await Promise.all([summaryReq, revenueReq]);
      setSummary(s.data.data);
      setRevenue(r.data.data);
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudieron cargar los pagos.") });
      setSummary(null);
      setRevenue([]);
    }
  };

  const loadList = async (pageToLoad = page) => {
    try {
      setIsLoading(true);
      setBanner(null);
      const res = await api.get<ApiResponse<PaymentsListResponse>>("/payments", { params: query });
      const data = res.data.data;
      const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
      if (data.total > 0 && pageToLoad > totalPages) {
        setPage(totalPages);
        return;
      }
      setList(data);
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudieron cargar los pagos.") });
      setList({ items: [], total: 0, limit: PAGE_SIZE, offset: (pageToLoad - 1) * PAGE_SIZE });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAll = async () => {
    await Promise.all([loadDashboard(), loadList()]);
  };

  useEffect(() => {
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  useEffect(() => {
    void loadList(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, query]);

  const openDetail = async (id: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await api.get<ApiResponse<PaymentDetail>>(`/payments/${id}`);
      setDetail(res.data.data);
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo cargar el detalle.") });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const updateStatus = async (
    id: number,
    estado: "pendiente" | "pagado" | "rechazado" | "reembolsado",
    observaciones?: string | null
  ) => {
    setMutating((p) => ({ ...p, [id]: true }));
    setBanner(null);
    try {
      const res = await api.put<ApiResponse<PaymentDetail>>(`/payments/${id}/status`, { estado, observaciones: observaciones ?? null });
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagos"
        subtitle="Gestión y conciliación (admin)"
        right={
          <Button variant="ghost" onClick={() => void loadAll()}>
            Actualizar
          </Button>
        }
      />

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Ingresos totales"
          value={summary ? formatMoney(summary.totalRevenue, "GTQ") : "—"}
          tone="green"
        />
        <SummaryCard label="Pagos del mes" value={summary ? `${summary.monthPaidCount}` : "—"} tone="blue" />
        <SummaryCard label="Pagos pendientes" value={summary ? `${summary.pendingCount}` : "—"} tone="amber" />
        <SummaryCard label="Reembolsos" value={summary ? formatMoney(summary.refundsTotal, "GTQ") : "—"} tone="slate" />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-950 px-6 py-5 text-white dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">Reportes</div>
              <div className="mt-2 text-2xl font-black tracking-tight">Ingresos recientes</div>
              <div className="mt-1 text-sm font-semibold text-slate-300">Últimos 14 días registrados</div>
            </div>
            <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-slate-200">
              GTQ
            </div>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <RevenueChart points={revenue} />
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-black text-slate-900 dark:text-slate-100">Filtros</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">Ajusta filtros y se actualizará el listado.</div>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  setPage(1);
                  setFilters({
                    date_from: "",
                    date_to: "",
                    estado: "",
                    metodo_pago: "",
                    curso_id: "",
                    usuario_id: "",
                  });
                }}
              >
                Limpiar
              </Button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Desde</div>
                <div className="mt-2">
                  <Input
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => updateFilters("date_from", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Hasta</div>
                <div className="mt-2">
                  <Input
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => updateFilters("date_to", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Estado</div>
                <div className="mt-2">
                  <select
                    value={filters.estado}
                    onChange={(e) => updateFilters("estado", e.target.value as "" | PaymentStatus)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none ring-blue-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="">Todos</option>
                    <option value="pagado">Pagado</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="rechazado">Rechazado</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="reembolsado">Reembolsado</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Método</div>
                <div className="mt-2">
                  <select
                    value={filters.metodo_pago}
                    onChange={(e) => updateFilters("metodo_pago", e.target.value as "" | PaymentMethod)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none ring-blue-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="">Todos</option>
                    <option value="bi_pay">BiPay</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="deposito">Depósito</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Curso (ID)</div>
                <div className="mt-2">
                  <Input
                    inputMode="numeric"
                    value={filters.curso_id}
                    onChange={(e) => updateFilters("curso_id", e.target.value)}
                    placeholder="Ej: 12"
                  />
                </div>
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Estudiante (ID)</div>
                <div className="mt-2">
                  <Input
                    inputMode="numeric"
                    value={filters.usuario_id}
                    onChange={(e) => updateFilters("usuario_id", e.target.value)}
                    placeholder="Ej: 25"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-950/80">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-900 dark:text-slate-100">Pagos</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {list ? `${list.total} registros` : "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {isLoading ? (
                <div className="grid place-items-center py-10">
                  <Spinner />
                </div>
              ) : !list || list.items.length === 0 ? (
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
                      setPage(1);
                      setFilters({
                        date_from: "",
                        date_to: "",
                        estado: "",
                        metodo_pago: "",
                        curso_id: "",
                        usuario_id: "",
                      });
                      return;
                    }
                    void loadAll();
                  }}
                />
              ) : (
                <div className="overflow-hidden">
                  <div className="grid gap-3">
                    {list.items.map((p) => {
                      const s = statusUi(p.estado);
                      const busy = Boolean(mutating[p.id]);
                      return (
                        <article
                          key={p.id}
                          className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-cyan-400/40 dark:hover:shadow-cyan-950/20"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-black text-slate-950 dark:text-white">Pago #{p.id}</div>
                                <Badge variant={s.variant}>{s.label}</Badge>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  {methodLabel(p.metodo_pago)}
                                </span>
                              </div>

                              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.15fr_1fr_0.7fr_0.8fr]">
                                <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950/60">
                                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                    Estudiante
                                  </div>
                                  <div className="mt-1 truncate text-sm font-black text-slate-950 dark:text-white">
                                    {p.usuario.nombres} {p.usuario.apellidos}
                                  </div>
                                  <div className="mt-1 break-all text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    {p.usuario.correo}
                                  </div>
                                </div>

                                <div className="min-w-0 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950/60">
                                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                    Curso
                                  </div>
                                  <div className="mt-1 truncate text-sm font-black text-slate-950 dark:text-white">
                                    {p.cursos ?? "—"}
                                  </div>
                                  <div className="mt-1 break-all text-xs font-semibold text-slate-500 dark:text-slate-500">
                                    {p.referencia_pago}
                                  </div>
                                </div>

                                <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950/60">
                                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                    Monto
                                  </div>
                                  <div className="mt-1 text-sm font-black text-slate-950 dark:text-white">
                                    {formatMoney(p.monto_total, p.moneda)}
                                  </div>
                                  <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-500">
                                    {formatDateTime(p.fecha_pago ?? p.created_at)}
                                  </div>
                                </div>

                                <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950/60">
                                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                    Comprobante
                                  </div>
                                  {p.comprobante_url ? (
                                    <button
                                      type="button"
                                      onClick={() => void downloadProof(p.id)}
                                      className="mt-1 text-sm font-black text-blue-700 hover:underline dark:text-cyan-300"
                                    >
                                      Ver comprobante
                                    </button>
                                  ) : (
                                    <div className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Sin archivo</div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2 xl:flex-col xl:items-stretch">
                              <Button size="sm" variant="ghost" onClick={() => void openDetail(p.id)}>
                                Ver detalle
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
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    disabled={busy}
                                    onClick={() => openReject(p.id)}
                                  >
                                    Rechazar
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      );
                    })}
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
      </div>

      {detailOpen ? (
        <DetailModal
          isLoading={detailLoading}
          payment={detail}
          onClose={() => setDetailOpen(false)}
          onApprove={() => (detail ? setPendingApprovePayment(detail) : undefined)}
          onReject={() => (detail ? openReject(detail.id) : undefined)}
          onDownloadProof={downloadProof}
        />
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
        <RejectModal
          value={rejectReason}
          onChange={setRejectReason}
          onClose={() => {
            setRejectOpen(false);
            setRejectId(null);
            setRejectReason("");
          }}
          onConfirm={() => void confirmReject()}
        />
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "blue" | "amber" | "slate";
}) {
  const toneStyles =
    tone === "green"
      ? "from-emerald-50 to-teal-50 dark:from-emerald-500/15 dark:to-teal-400/10"
      : tone === "blue"
        ? "from-blue-50 to-cyan-50 dark:from-blue-500/15 dark:to-cyan-400/10"
        : tone === "amber"
          ? "from-amber-50 to-orange-50 dark:from-amber-500/15 dark:to-orange-400/10"
          : "from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/80";

  return (
    <Card className="overflow-hidden">
      <div className={`bg-gradient-to-br ${toneStyles} p-5`}>
        <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
        <div className="mt-1 truncate text-base font-black tracking-tight text-slate-900 dark:text-white">{value}</div>
      </div>
    </Card>
  );
}

function RevenueChart({ points }: { points: RevenuePoint[] }) {
  const data = useMemo(() => {
    return points.slice(-14).map((p) => {
      const amount = Number(p.total);
      return {
        date: p.date,
        amount: Number.isFinite(amount) ? amount : 0,
      };
    });
  }, [points]);

  const metrics = useMemo(() => {
    if (data.length === 0) return null;
    const total = data.reduce((sum, p) => sum + p.amount, 0);
    const max = Math.max(...data.map((p) => p.amount));
    const best = data.reduce((winner, p) => (p.amount > winner.amount ? p : winner), data[0]);
    return {
      total,
      max,
      average: total / data.length,
      best,
    };
  }, [data]);

  if (!metrics) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
        No hay datos suficientes para graficar.
      </div>
    );
  }

  const chartWidth = 980;
  const chartHeight = 260;
  const padding = { top: 24, right: 28, bottom: 56, left: 70 };
  const baseline = chartHeight - padding.bottom;
  const usableWidth = chartWidth - padding.left - padding.right;
  const usableHeight = chartHeight - padding.top - padding.bottom;
  const ceiling = Math.max(metrics.max, 1);
  const plotted = data.map((p, index) => {
    const x =
      data.length === 1
        ? padding.left + usableWidth / 2
        : padding.left + (index / (data.length - 1)) * usableWidth;
    const y = padding.top + usableHeight - (p.amount / ceiling) * usableHeight;
    return { ...p, x, y };
  });
  const linePath = plotted.map((p, index) => `${index === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${plotted[plotted.length - 1].x} ${baseline} L ${plotted[0].x} ${baseline} Z`;
  const guideLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/80">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Periodo</div>
          <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
            {formatMoney(metrics.total.toFixed(2), "GTQ")}
          </div>
        </div>
        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/80">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Promedio diario</div>
          <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
            {formatMoney(metrics.average.toFixed(2), "GTQ")}
          </div>
        </div>
        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/80">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Mejor día</div>
          <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
            {formatMoney(metrics.best.amount.toFixed(2), "GTQ")}
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{formatChartDate(metrics.best.date)}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-slate-900 bg-slate-950 p-4 shadow-[0_24px_80px_-50px_rgba(14,165,233,0.8)]">
        <div className="flex flex-col gap-2 px-1 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.26em] text-cyan-300">Curva de ingresos</div>
            <div className="mt-1 text-sm font-semibold text-slate-300">Pagos aprobados por día</div>
          </div>
          <div className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-200 ring-1 ring-cyan-300/20">
            Pico: {formatCompactMoney(metrics.max)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="h-[280px] w-full min-w-[760px]"
            role="img"
            aria-label="Gráfica de ingresos de los últimos 14 días"
          >
            <defs>
              <linearGradient id="paymentsRevenueArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="paymentsRevenueLine" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
            </defs>

            {guideLines.map((guide) => {
              const y = padding.top + usableHeight - guide * usableHeight;
              return (
                <g key={guide}>
                  <line x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} stroke="#1e293b" strokeDasharray="4 8" />
                  <text x={padding.left - 12} y={y + 4} textAnchor="end" className="fill-slate-500 text-[11px] font-bold">
                    {formatCompactMoney(ceiling * guide)}
                  </text>
                </g>
              );
            })}

            <path d={areaPath} fill="url(#paymentsRevenueArea)" />
            <path d={linePath} fill="none" stroke="url(#paymentsRevenueLine)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />

            {plotted.map((p) => (
              <g key={p.date}>
                <circle cx={p.x} cy={p.y} r="6" fill="#0f172a" stroke="#67e8f9" strokeWidth="4" />
                {p.amount > 0 ? (
                  <text x={p.x} y={Math.max(18, p.y - 14)} textAnchor="middle" className="fill-slate-100 text-[11px] font-black">
                    {formatCompactMoney(p.amount)}
                  </text>
                ) : null}
              </g>
            ))}

            {plotted.map((p, index) => {
              const shouldShow = index === 0 || index === plotted.length - 1 || index % 3 === 0;
              if (!shouldShow) return null;
              return (
                <text key={`${p.date}-label`} x={p.x} y={chartHeight - 18} textAnchor="middle" className="fill-slate-400 text-[12px] font-bold">
                  {formatChartDate(p.date)}
                </text>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

function DetailModal({
  isLoading,
  payment,
  onClose,
  onApprove,
  onReject,
  onDownloadProof,
}: {
  isLoading: boolean;
  payment: PaymentDetail | null;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDownloadProof: (id: number) => Promise<void>;
}) {
  const s = payment ? statusUi(payment.estado) : null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-0 overflow-y-auto p-4">
        <div className="mx-auto w-full max-w-3xl">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 bg-white px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-900">Detalle de pago</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {payment ? `Pago #${payment.id}` : "Cargando…"}
                  </div>
                </div>
                <Button variant="ghost" onClick={onClose}>
                  Cerrar
                </Button>
              </div>
            </div>

            <div className="p-6">
              {isLoading ? (
                <div className="grid place-items-center py-10">
                  <Spinner />
                </div>
              ) : !payment ? (
                <EmptyState title="No se pudo cargar el pago" description="Intenta de nuevo." />
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-extrabold text-slate-500">Estado</div>
                      <div className="mt-2">{s ? <Badge variant={s.variant}>{s.label}</Badge> : null}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-extrabold text-slate-500">Monto</div>
                      <div className="mt-1 text-base font-black text-slate-900">
                        {formatMoney(payment.monto_total, payment.moneda)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-extrabold text-slate-500">Método</div>
                      <div className="mt-1 text-base font-black text-slate-900">
                        {methodLabel(payment.metodo_pago)}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-extrabold text-slate-500">Estudiante</div>
                      <div className="mt-1 text-sm font-black text-slate-900">
                        {payment.usuario.nombres} {payment.usuario.apellidos}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">{payment.usuario.correo}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-extrabold text-slate-500">Fechas</div>
                      <div className="mt-1 text-sm text-slate-700">
                        Creado: <span className="font-bold">{formatDateTime(payment.created_at)}</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-700">
                        Pago: <span className="font-bold">{formatDateTime(payment.fecha_pago)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-extrabold text-slate-500">Comprobante</div>
                    <div className="mt-2">
                      {payment.comprobante_url ? (
                        <button
                          type="button"
                          onClick={() => void onDownloadProof(payment.id)}
                          className="text-sm font-semibold text-blue-700 hover:underline"
                        >
                          Abrir comprobante
                        </button>
                      ) : (
                        <div className="text-sm text-slate-600">—</div>
                      )}
                    </div>
                    {payment.observaciones ? (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                        {payment.observaciones}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-extrabold text-slate-500">Detalle por curso</div>
                    <div className="mt-3 space-y-2">
                      {payment.items.length === 0 ? (
                        <div className="text-sm text-slate-600">Sin items.</div>
                      ) : (
                        payment.items.map((it) => (
                          <div
                            key={it.id}
                            className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-black text-slate-900">{it.curso.titulo}</div>
                              <div className="mt-1 text-xs text-slate-500">Curso ID: {it.curso.id}</div>
                            </div>
                            <div className="text-sm font-black text-slate-900">
                              {formatMoney(it.subtotal, payment.moneda)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {payment.estado === "pendiente" ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button variant="secondary" onClick={onApprove}>
                        Aprobar pago
                      </Button>
                      <Button variant="danger" onClick={onReject}>
                        Rechazar
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RejectModal({
  value,
  onChange,
  onClose,
  onConfirm,
}: {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <Card className="w-full max-w-lg overflow-hidden">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="text-base font-black text-slate-900">Rechazar pago</div>
          <div className="mt-1 text-sm text-slate-600">
            Si quieres, escribe el motivo. El estudiante lo verá en el curso.
          </div>
        </div>
        <div className="p-6">
          <div className="text-xs font-extrabold text-slate-700">Motivo (opcional)</div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            placeholder="Ej: Comprobante ilegible, monto incorrecto…"
            className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
          />
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={onConfirm}>
              Rechazar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
