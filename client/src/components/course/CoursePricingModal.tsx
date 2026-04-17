import { Suspense, useEffect, useMemo, useState } from "react";
import type { AxiosInstance } from "axios";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Spinner } from "../ui/Spinner";
import type { ApiResponse } from "../../types/api";
import type { CourseAccessType, CourseDetail } from "../../types/course";
import { getApiErrorMessage } from "../../utils/apiError";
import { lazyNamed } from "../../utils/lazyNamed";
import { normalizePaymentLinkInput } from "../../utils/paymentLink";

type FormState = {
  precio: string;
  payment_link: string;
};
const BiPayEmbed = lazyNamed(() => import("../payment/BiPayEmbed"), "BiPayEmbed");

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-xs font-extrabold text-slate-700">{label}</div>
        {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
      </div>
      <div className="mt-2">{children}</div>
      {error ? <div className="mt-2 text-xs font-bold text-rose-700">{error}</div> : null}
    </div>
  );
}

export function CoursePricingModal({
  api,
  courseId,
  open,
  onClose,
  onSaved,
}: {
  api: AxiosInstance;
  courseId: number | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [detail, setDetail] = useState<CourseDetail | null>(null);

  const [form, setForm] = useState<FormState>({
    precio: "0",
    payment_link: "",
  });

  const computedAccess: CourseAccessType = useMemo(() => {
    const n = Number(form.precio);
    return Number.isFinite(n) && n > 0 ? "pago" : "gratis";
  }, [form.precio]);

  const validation = useMemo(() => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    const n = Number(form.precio);
    if (!Number.isFinite(n) || n < 0) errors.precio = "Precio inválido";

    // Si es curso de pago, el link debe venir (y ser URL válida).
    if (computedAccess === "pago") {
      if (!Number.isFinite(n) || n <= 0) errors.precio = "Precio debe ser mayor a 0";
      if (!normalizePaymentLinkInput(form.payment_link)) errors.payment_link = "Boton de pago invalido";
    }
    return { ok: Object.keys(errors).length === 0, errors };
  }, [computedAccess, form.payment_link, form.precio]);

  useEffect(() => {
    if (!open || !courseId) return;
    (async () => {
      try {
        setIsLoading(true);
        setBanner(null);
        const res = await api.get<ApiResponse<CourseDetail>>(`/courses/${courseId}`);
        const c = res.data.data;
        setDetail(c);
        setForm({
          precio: String(c.precio ?? "0"),
          payment_link: c.payment_link ?? "",
        });
      } catch (err) {
        setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo cargar el curso.") });
        setDetail(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [api, courseId, open]);

  const save = async () => {
    if (!courseId) return;
    if (!validation.ok) {
      setBanner({ tone: "error", text: "Revisa los campos marcados." });
      return;
    }

    try {
      setIsSaving(true);
      setBanner(null);

      const tipo = computedAccess;
      const precio = tipo === "gratis" ? 0 : Number(form.precio);
      const paymentLink = tipo === "pago" ? normalizePaymentLinkInput(form.payment_link) : null;

      await api.put(`/courses/${courseId}`, {
        tipo_acceso: tipo,
        precio,
        payment_link: paymentLink,
      });

      setBanner({ tone: "success", text: "Precio actualizado." });
      onSaved?.();
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo actualizar el precio.") });
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <Card className="w-full max-w-2xl overflow-hidden">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-base font-black text-slate-900">
                Pago: <span className="font-black">{detail?.titulo ?? "—"}</span>
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Configura el precio visible y el botón fijo de pago BI Pay / EBI.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar"
                title="Cerrar"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18" strokeLinecap="round" />
                  <path d="M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
          {banner ? (
            <div
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                banner.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
              role="status"
            >
              {banner.text}
            </div>
          ) : null}
        </div>

        <div className="bg-slate-50 px-6 py-6">
          {isLoading ? (
            <div className="grid place-items-center py-10">
              <Spinner />
            </div>
          ) : (
            <Card className="p-6">
              <div className="grid gap-5">
                <Field
                  label="Precio visible (GTQ)"
                  hint="Este monto se muestra en C.FUTURO"
                  error={validation.errors.precio ?? null}
                >
                  <Input
                    inputMode="decimal"
                    value={form.precio}
                    onChange={(e) => setForm((p) => ({ ...p, precio: e.target.value }))}
                    placeholder="0.00"
                  />
                </Field>

                <Field
                  label="Botón fijo BI Pay / EBI"
                  hint="Pega el script iframe oficial o una URL."
                  error={validation.errors.payment_link ?? null}
                >
                  <textarea
                    value={form.payment_link}
                    onChange={(e) => setForm((p) => ({ ...p, payment_link: e.target.value }))}
                    rows={5}
                    placeholder='<script>/*Pay Bi*/document.write(unescape("%3Ciframe..."))</script>'
                    className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-xs text-slate-900 outline-none ring-blue-500 transition focus:ring-2"
                  />
                </Field>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold leading-5 text-blue-800">
                  Para evitar que el botón se inactive después de un pago, usa el script iframe de BI Pay. La app guardará solo el enlace seguro del iframe.
                </div>

                {computedAccess === "pago" && normalizePaymentLinkInput(form.payment_link) ? (
                  <div>
                    <div className="text-xs font-extrabold text-slate-700">Vista previa</div>
                    <Suspense
                      fallback={
                        <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
                          Cargando vista previa del pago...
                        </div>
                      }
                    >
                      <BiPayEmbed paymentLink={form.payment_link} className="mt-2" />
                    </Suspense>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <Button variant="ghost" onClick={onClose}>
                  Cancelar
                </Button>
                <Button onClick={() => void save()} disabled={isSaving || isLoading}>
                  {isSaving ? "Guardando…" : "Guardar"}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </Card>
    </div>
  );
}
