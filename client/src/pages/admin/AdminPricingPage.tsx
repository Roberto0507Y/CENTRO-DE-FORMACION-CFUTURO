import { Suspense, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { PricingSetting, PricingStatus } from "../../types/pricing";
import { getApiErrorMessage } from "../../utils/apiError";
import { getBiPayEmbedUrl, normalizePaymentLinkInput } from "../../utils/paymentLink";
import { lazyNamed } from "../../utils/lazyNamed";

const BiPayEmbed = lazyNamed(() => import("../../components/payment/BiPayEmbed"), "BiPayEmbed");

export function AdminPricingPage() {
  const { api } = useAuth();

  const [items, setItems] = useState<PricingSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");

  const [price, setPrice] = useState<string>("");
  const [link, setLink] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [banner, setBanner] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setLoadError("");
        const res = await api.get<ApiResponse<PricingSetting[]>>("/pricing-settings", { params: { estado: "all" } });
        setItems(res.data.data);
      } catch (err) {
        setLoadError(getApiErrorMessage(err, "No se pudieron cargar los precios."));
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [api]);

  const money = (raw: unknown) => {
    const n = Number(raw ?? 0);
    try {
      return new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" }).format(Number.isFinite(n) ? n : 0);
    } catch {
      return `Q ${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
    }
  };

  const validation = useMemo(() => {
    const errors: { price?: string; link?: string } = {};
    const n = Number(price);
    if (price.trim() === "") errors.price = "Precio requerido";
    else if (!Number.isFinite(n) || n < 0) errors.price = "Precio inválido";

    const raw = link.trim();
    if (!raw) {
      errors.link = "Link requerido";
    } else if (!normalizePaymentLinkInput(raw)) {
      errors.link = "Boton de pago invalido";
    }

    return { ok: Object.keys(errors).length === 0, errors };
  }, [link, price]);

  const resetForm = () => {
    setSelectedId(null);
    setMode("create");
    setPrice("");
    setLink("");
    setBanner(null);
  };

  const selectItem = (item: PricingSetting) => {
    setSelectedId(item.id);
    setMode("edit");
    setPrice(String(item.precio ?? 0));
    setLink(item.payment_link ?? "");
    setBanner(null);
  };

  const reload = async () => {
    const res = await api.get<ApiResponse<PricingSetting[]>>("/pricing-settings", { params: { estado: "all" } });
    setItems(res.data.data);
  };

  const onSave = async () => {
    if (!validation.ok) {
      setBanner({ tone: "error", text: "Revisa los campos marcados." });
      return;
    }

    try {
      setSaving(true);
      setBanner(null);
      const payload = { precio: Number(price), payment_link: normalizePaymentLinkInput(link) };

      if (mode === "create") {
        await api.post<ApiResponse<PricingSetting>>("/pricing-settings", payload);
        setBanner({ tone: "success", text: "Precio creado." });
      } else if (selectedId) {
        await api.put<ApiResponse<PricingSetting>>(`/pricing-settings/${selectedId}`, payload);
        setBanner({ tone: "success", text: "Precio actualizado." });
      }

      await reload();
      resetForm();
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo guardar el precio.") });
    } finally {
      setSaving(false);
    }
  };

  const onToggleStatus = async () => {
    if (!selectedId) return;
    const current = items.find((i) => i.id === selectedId);
    if (!current) return;

    const next: PricingStatus = current.estado === "activo" ? "inactivo" : "activo";
    try {
      setSaving(true);
      await api.patch<ApiResponse<PricingSetting>>(`/pricing-settings/${selectedId}/status`, { estado: next });
      const res = await api.get<ApiResponse<PricingSetting[]>>("/pricing-settings", { params: { estado: "all" } });
      setItems(res.data.data);
      const updated = res.data.data.find((i) => i.id === selectedId);
      if (updated) selectItem(updated);
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo cambiar el estado.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <PageHeader
          title="Precio"
          subtitle="Administra el precio visible del curso y el botón fijo BI Pay / EBI por separado."
        />
        <Button onClick={resetForm} variant="secondary">
          Nuevo precio
        </Button>
      </div>

      {isLoading ? (
        <Card className="grid place-items-center py-10">
          <Spinner />
        </Card>
      ) : loadError ? (
        <Card className="p-6">
          <EmptyState title="No se pudieron cargar" description={loadError} actionLabel="Reintentar" onAction={() => window.location.reload()} />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-black text-slate-900">Precios</div>
              <div className="text-xs font-semibold text-slate-500">Total: {items.length}</div>
            </div>

            {items.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin precios todavía"
                  description="Crea un precio para mostrarlo como botón en pagos."
                  actionLabel="Crear precio"
                  onAction={resetForm}
                />
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {items.map((it) => {
                  const active = selectedId === it.id;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => selectItem(it)}
                      className={`group rounded-2xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-blue-200 bg-blue-50 ring-2 ring-blue-100"
                          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-black text-slate-900">{money(it.precio)}</div>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-black ${
                            it.estado === "activo"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {it.estado}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${
                            getBiPayEmbedUrl(it.payment_link)
                              ? "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100"
                              : "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
                          }`}
                        >
                          {getBiPayEmbedUrl(it.payment_link) ? "Iframe fijo" : "Enlace directo"}
                        </span>
                      </div>
                      <div className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
                        {normalizePaymentLinkInput(it.payment_link)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-black text-slate-900">{mode === "create" ? "Crear precio" : "Editar precio"}</div>
              {mode === "edit" ? (
                <Button variant="ghost" onClick={resetForm}>
                  Cancelar
                </Button>
              ) : null}
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

            <div className="mt-5 grid gap-5">
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-xs font-extrabold text-slate-700">Precio visible (GTQ)</div>
                  <div className="text-xs text-slate-500">Solo cambia lo que ve el estudiante</div>
                </div>
                <div className="mt-2">
                  <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1.00" inputMode="decimal" />
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-500">
                  Este monto se muestra en C.FUTURO. El botón de BI Pay queda fijo con el iframe que pegues abajo.
                </div>
                {validation.errors.price ? <div className="mt-2 text-xs font-bold text-rose-700">{validation.errors.price}</div> : null}
              </div>

              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="text-xs font-extrabold text-slate-700">Botón fijo BI Pay / EBI</div>
                  <div className="text-xs text-slate-500">Pega el script iframe oficial</div>
                </div>
                <div className="mt-2">
                  <textarea
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    rows={5}
                    placeholder='<script>/*Pay Bi*/document.write(unescape("%3Ciframe..."))</script>'
                    className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-xs text-slate-900 outline-none ring-blue-500 transition focus:ring-2"
                  />
                </div>
                <div className="mt-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold leading-5 text-blue-800">
                  Recomendado: usa el script iframe de BI Pay para evitar que un enlace directo quede inactivo después de un pago.
                </div>
                {validation.errors.link ? <div className="mt-2 text-xs font-bold text-rose-700">{validation.errors.link}</div> : null}
                {normalizePaymentLinkInput(link) ? (
                  <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                    Se guardará como:{" "}
                    <span className="break-all font-mono text-slate-800">{normalizePaymentLinkInput(link)}</span>
                  </div>
                ) : null}
              </div>

              {normalizePaymentLinkInput(link) ? (
                <div>
                  <div className="text-xs font-extrabold text-slate-700">Vista previa</div>
                  <Suspense
                    fallback={
                      <div className="mt-2 grid min-h-[8rem] place-items-center rounded-2xl border border-slate-200 bg-slate-50">
                        <Spinner />
                      </div>
                    }
                  >
                    <BiPayEmbed paymentLink={link} className="mt-2" />
                  </Suspense>
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              {mode === "edit" ? (
                <Button variant="secondary" disabled={saving} onClick={() => void onToggleStatus()}>
                  Activar / Inactivar
                </Button>
              ) : (
                <div />
              )}
              <Button disabled={saving} onClick={() => void onSave()}>
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
