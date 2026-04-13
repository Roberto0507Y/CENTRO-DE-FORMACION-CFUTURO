import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { MyPaymentHistoryItem, MyPaymentsCourseItem, PaymentStatus } from "../../types/payment";
import { formatMoneyGTQ } from "../../utils/format";

function statusBadge(estado: PaymentStatus) {
  if (estado === "pagado") return <Badge variant="green">Aprobado</Badge>;
  if (estado === "pendiente") return <Badge variant="amber">Pendiente</Badge>;
  if (estado === "rechazado") return <Badge variant="rose">Rechazado</Badge>;
  if (estado === "reembolsado") return <Badge variant="blue">Reembolsado</Badge>;
  return <Badge variant="slate">{estado}</Badge>;
}

function formatDateTimeEs(raw: string) {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function getCourseInitial(title: string) {
  return title.trim().charAt(0).toUpperCase() || "C";
}

export function MyPaymentsPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<MyPaymentsCourseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [history, setHistory] = useState<MyPaymentHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const res = await api.get<ApiResponse<MyPaymentsCourseItem[]>>("/payments/my/courses");
        setItems(res.data.data);
        if (res.data.data[0]?.course.id) setSelectedCourseId(res.data.data[0].course.id);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [api]);

  useEffect(() => {
    (async () => {
      if (!selectedCourseId) {
        setHistory([]);
        return;
      }
      try {
        setHistoryLoading(true);
        const res = await api.get<ApiResponse<MyPaymentHistoryItem[]>>(
          `/payments/my/course/${selectedCourseId}/history`,
        );
        setHistory(res.data.data);
      } finally {
        setHistoryLoading(false);
      }
    })();
  }, [api, selectedCourseId]);

  const selected = useMemo(
    () => items.find((x) => x.course.id === selectedCourseId) ?? null,
    [items, selectedCourseId],
  );

  return (
    <div className="cf-payments-scope space-y-6">
      <PageHeader
        title="Mis pagos"
        subtitle="Historial de estados de aprobación por curso"
      />

      {isLoading ? (
        <div className="grid place-items-center py-10">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Aún no tienes pagos registrados"
          description="Cuando envíes un comprobante de pago, aquí verás el estado de aprobación por curso."
          actionLabel="Explorar cursos"
          onAction={() => navigate("/courses")}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          {/* Lista */}
          <Card className="overflow-hidden border-white/80 bg-white/85 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.48)] dark:border-slate-800 dark:bg-slate-900/90">
            <div className="border-b border-slate-200 bg-white/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/90">
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">Cursos con pago</div>
              <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                Selecciona un curso para ver el historial de pagos.
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((it) => {
                const isActive = it.course.id === selectedCourseId;
                const latest = it.latestPayment;
                return (
                  <button
                    key={it.course.id}
                    type="button"
                    onClick={() => setSelectedCourseId(it.course.id)}
                    className={`w-full text-left transition ${
                      isActive
                        ? "bg-blue-50/80 shadow-[inset_0_0_0_1px_rgba(191,219,254,0.95)] dark:bg-cyan-400/10 dark:shadow-[inset_0_0_0_1px_rgba(34,211,238,0.18)]"
                        : "bg-white/90 hover:bg-slate-50 dark:bg-slate-900/80 dark:hover:bg-slate-800/90"
                    }`}
                  >
                    <div className="flex items-center gap-4 px-4 py-4">
                      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-cyan-600 to-slate-950 ring-1 ring-black/5 dark:ring-white/10">
                        <div className="pointer-events-none absolute -right-4 -top-5 h-12 w-12 rounded-full border border-white/20" />
                        <div className="grid h-full w-full place-items-center text-sm font-black text-white">
                          {getCourseInitial(it.course.titulo)}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="line-clamp-1 text-sm font-extrabold text-slate-900 dark:text-white">
                              {it.course.titulo}
                            </div>
                            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                              {it.course.tipo_acceso === "pago"
                                ? formatMoneyGTQ(it.course.precio)
                                : "Gratis"}{" "}
                              · {it.course.nivel}
                              {it.paymentsCount > 1 ? ` · ${it.paymentsCount} pagos` : ""}
                            </div>
                          </div>
                          <div className="shrink-0">
                            {latest ? statusBadge(latest.estado) : <Badge variant="slate">Sin pago</Badge>}
                          </div>
                        </div>

                        {latest?.observaciones && latest.estado === "rechazado" ? (
                          <div className="mt-2 line-clamp-2 text-xs font-semibold text-rose-700">
                            Motivo: {latest.observaciones}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Detalle */}
          <div className="space-y-4">
            <Card className="border-white/80 bg-white/88 p-4 shadow-[0_22px_70px_-50px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Curso seleccionado
                  </div>
                  <div className="mt-1 line-clamp-2 text-base font-black text-slate-900 dark:text-white">
                    {selected?.course.titulo ?? "—"}
                  </div>
                  {selected ? (
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      {selected.course.tipo_acceso === "pago"
                        ? formatMoneyGTQ(selected.course.precio)
                        : "Gratis"}{" "}
                      · {selected.course.nivel}
                    </div>
                  ) : null}
                </div>
                {selected?.latestPayment ? (
                  <div className="shrink-0">{statusBadge(selected.latestPayment.estado)}</div>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {selected ? (
                  <>
                    <Link to={`/courses/${selected.course.slug}`}>
                      <Button size="sm" variant="secondary">
                        Ver curso
                      </Button>
                    </Link>
                  </>
                ) : null}
              </div>
            </Card>

            <Card className="overflow-hidden border-white/80 bg-white/88 dark:border-slate-800 dark:bg-slate-900/90">
              <div className="border-b border-slate-200 bg-white/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/90">
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">Historial</div>
                <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  Últimos movimientos (máximo 50).
                </div>
              </div>

              {historyLoading ? (
                <div className="grid place-items-center py-10">
                  <Spinner />
                </div>
              ) : history.length === 0 ? (
                <div className="p-4 text-sm text-slate-600 dark:text-slate-400">Sin pagos para este curso.</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {history.map((p) => (
                    <div key={p.id} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 rounded-[1.15rem] border border-slate-200/80 bg-slate-50/70 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/55">
                          <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {formatMoneyGTQ(p.monto_total)}{" "}
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">· {p.metodo_pago}</span>
                          </div>
                          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            Enviado: {formatDateTimeEs(p.created_at)}
                            {p.fecha_pago ? ` · Pagado: ${formatDateTimeEs(p.fecha_pago)}` : ""}
                          </div>
                          {p.observaciones && p.estado === "rechazado" ? (
                            <div className="mt-2 text-xs font-semibold text-rose-700">
                              Motivo: {p.observaciones}
                            </div>
                          ) : null}
                        </div>
                        <div className="shrink-0">{statusBadge(p.estado)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
