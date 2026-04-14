import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { Spinner } from "../ui/Spinner";
import type { PaymentDetail, PaymentMethod, PaymentStatus } from "../../types/payment";

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

export function PaymentDetailModal({
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

export function PaymentRejectModal({
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
