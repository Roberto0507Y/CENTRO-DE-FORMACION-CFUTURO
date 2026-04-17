import { Suspense, useEffect, useMemo, useState } from "react";
import type { AxiosInstance } from "axios";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { Spinner } from "../ui/Spinner";
import type { ApiResponse } from "../../types/api";
import type { CourseAccessType, CourseDetail, CourseLevel, CourseStatus } from "../../types/course";
import type { PricingSetting } from "../../types/pricing";
import { getApiErrorMessage } from "../../utils/apiError";
import { lazyNamed } from "../../utils/lazyNamed";
import { normalizePaymentLinkInput } from "../../utils/paymentLink";
import "../../styles/course-editor.css";

type UploadedFileDto = { url: string; key: string; mimeType: string; size: number };

const SHORT_DESCRIPTION_MAX = 255;
const BiPayEmbed = lazyNamed(() => import("../payment/BiPayEmbed"), "BiPayEmbed");

function slugify(input: string): string {
  const normalized = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  const cleaned = normalized
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned.slice(0, 180);
}

type FormState = {
  titulo: string;
  slug: string;
  slugMode: "auto" | "manual";
  descripcion_corta: string;
  descripcion: string;
  tipo_acceso: CourseAccessType;
  precio: string;
  nivel: CourseLevel;
  estado: CourseStatus;
  imagen_url: string;
  video_intro_url: string;
  payment_link: string;
};

function prettyStatus(s: CourseStatus) {
  if (s === "publicado") return "Publicado";
  if (s === "oculto") return "Oculto";
  return "Borrador";
}

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

export function CourseEditModal({
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
  const [uploading, setUploading] = useState(false);
  const [pricingOptions, setPricingOptions] = useState<PricingSetting[]>([]);
  const [priceMenuOpen, setPriceMenuOpen] = useState(false);

  const [form, setForm] = useState<FormState>({
    titulo: "",
    slug: "",
    slugMode: "auto",
    descripcion_corta: "",
    descripcion: "",
    tipo_acceso: "gratis",
    precio: "0",
    nivel: "basico",
    estado: "borrador",
    imagen_url: "",
    video_intro_url: "",
    payment_link: "",
  });

  const validation = useMemo(() => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!form.titulo.trim()) errors.titulo = "Título requerido";
    if (!form.slug.trim()) errors.slug = "Slug requerido";
    if (form.descripcion_corta.trim().length > SHORT_DESCRIPTION_MAX) {
      errors.descripcion_corta = `La descripción corta debe tener máximo ${SHORT_DESCRIPTION_MAX} caracteres`;
    }
    if (form.tipo_acceso === "pago") {
      const n = Number(form.precio);
      if (!Number.isFinite(n) || n <= 0) errors.precio = "Precio debe ser mayor a 0";
      if (!normalizePaymentLinkInput(form.payment_link)) errors.payment_link = "Boton de pago invalido";
    }
    return { ok: Object.keys(errors).length === 0, errors };
  }, [form]);
  const selectedPricing = useMemo(() => {
    if (form.tipo_acceso !== "pago") return null;
    const precioN = Number(form.precio);
    if (!Number.isFinite(precioN) || precioN <= 0) return null;
    const selectedLink = normalizePaymentLinkInput(form.payment_link);
    return (
      pricingOptions.find(
        (p) =>
          Number(p.precio) === precioN &&
          normalizePaymentLinkInput(p.payment_link) === selectedLink
      ) ?? null
    );
  }, [form.payment_link, form.precio, form.tipo_acceso, pricingOptions]);
  const shortDescriptionCount = form.descripcion_corta.length;

  const selectPricingOption = (item: PricingSetting) => {
    setForm((p) => ({
      ...p,
      tipo_acceso: "pago",
      precio: String(item.precio),
      payment_link: item.payment_link,
    }));
    setPriceMenuOpen(false);
  };

  useEffect(() => {
    if (!open || !courseId) return;
    (async () => {
      try {
        setIsLoading(true);
        setBanner(null);
        const [courseRes, pricingRes] = await Promise.all([
          api.get<ApiResponse<CourseDetail>>(`/courses/${courseId}`),
          api.get<ApiResponse<PricingSetting[]>>("/pricing-settings", { params: { estado: "activo" } }),
        ]);
        const c = courseRes.data.data;
        setDetail(c);
        setPricingOptions(pricingRes.data.data);
        setForm({
          titulo: c.titulo ?? "",
          slug: c.slug ?? "",
          slugMode: "auto",
          descripcion_corta: c.descripcion_corta ?? "",
          descripcion: c.descripcion ?? "",
          tipo_acceso: c.tipo_acceso,
          precio: String(c.precio ?? "0"),
          nivel: c.nivel,
          estado: (c.estado ?? "borrador") as CourseStatus,
          imagen_url: c.imagen_url ?? "",
          video_intro_url: c.video_intro_url ?? "",
          payment_link: c.payment_link ?? "",
        });
        setPriceMenuOpen(false);
      } catch (err) {
        setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo cargar el curso.") });
        setDetail(null);
        setPricingOptions([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [api, courseId, open]);

  useEffect(() => {
    if (form.slugMode === "auto") {
      setForm((p) => ({ ...p, slug: slugify(p.titulo) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.titulo]);

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);
      setBanner(null);
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<ApiResponse<UploadedFileDto>>("/uploads/course-image", fd);
      setForm((p) => ({ ...p, imagen_url: res.data.data.url }));
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo subir la imagen.") });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!courseId) return;
    if (!validation.ok) {
      setBanner({ tone: "error", text: "Revisa los campos marcados." });
      return;
    }
    try {
      setIsSaving(true);
      setBanner(null);

      const tipo = form.tipo_acceso;
      const precio = tipo === "gratis" ? 0 : Number(form.precio);
      const paymentLink = tipo === "pago" ? normalizePaymentLinkInput(form.payment_link) : null;

      await api.put(`/courses/${courseId}`, {
        titulo: form.titulo.trim(),
        slug: slugify(form.slug),
        descripcion_corta: form.descripcion_corta ? form.descripcion_corta : null,
        descripcion: form.descripcion ? form.descripcion : null,
        imagen_url: form.imagen_url ? form.imagen_url : null,
        video_intro_url: form.video_intro_url ? form.video_intro_url : null,
        payment_link: paymentLink,
        tipo_acceso: tipo,
        precio,
        nivel: form.nivel,
        estado: form.estado,
      });

      setBanner({ tone: "success", text: "Curso actualizado." });
      onSaved?.();
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo actualizar el curso.") });
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-3 sm:p-4" role="dialog" aria-modal="true">
      <Card className="mx-auto my-4 flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden sm:my-6 sm:max-h-[calc(100dvh-3rem)]">
        <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-base font-black text-slate-900">Editar curso</div>
              <div className="mt-1 text-sm text-slate-600">
                {detail ? (
                  <>
                    <span className="font-semibold">{detail.titulo}</span>{" "}
                    <span className="text-slate-400">·</span>{" "}
                    <span className="text-slate-700">
                      Docente: {detail.docente.nombres} {detail.docente.apellidos}
                    </span>
                  </>
                ) : (
                  "Carga de información…"
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onClose}>
                Cerrar
              </Button>
              <Button onClick={() => void save()} disabled={isSaving || uploading || isLoading}>
                {isSaving ? "Guardando…" : "Guardar"}
              </Button>
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

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
        <div className="grid gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-6">
            {isLoading ? (
              <div className="grid place-items-center py-10">
                <Spinner />
              </div>
            ) : (
              <>
                <Card className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-black text-slate-900">Información</div>
                    <Badge variant="slate">{prettyStatus(form.estado)}</Badge>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Field label="Título" error={validation.errors.titulo ?? null}>
                      <Input value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))} />
                    </Field>

                    <Field
                      label="Descripción corta"
                      hint={`${shortDescriptionCount}/${SHORT_DESCRIPTION_MAX}`}
                      error={validation.errors.descripcion_corta ?? null}
                    >
                      <Input
                        value={form.descripcion_corta}
                        onChange={(e) => setForm((p) => ({ ...p, descripcion_corta: e.target.value }))}
                        maxLength={SHORT_DESCRIPTION_MAX}
                        placeholder="Máx. 255"
                      />
                    </Field>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Slug" hint={form.slugMode === "auto" ? "Auto" : "Manual"} error={validation.errors.slug ?? null}>
                      <div className="flex gap-2">
                        <Input
                          value={form.slug}
                          onChange={(e) => setForm((p) => ({ ...p, slugMode: "manual", slug: e.target.value }))}
                          placeholder="programacion-iii"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setForm((p) => ({ ...p, slugMode: "auto", slug: slugify(p.titulo) }))}
                          title="Generar desde el título"
                        >
                          Auto
                        </Button>
                      </div>
                    </Field>

                    <Field label="Estado">
                      <select
                        value={form.estado}
                        onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value as CourseStatus }))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                      >
                        <option value="borrador">Borrador</option>
                        <option value="publicado">Publicado</option>
                        <option value="oculto">Oculto</option>
                      </select>
                    </Field>
                  </div>

                  <div className="mt-4">
                    <Field label="Descripción" hint="Opcional">
                      <textarea
                        value={form.descripcion}
                        onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                        rows={6}
                        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                        placeholder="Contenido del curso…"
                      />
                    </Field>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="text-sm font-black text-slate-900">Acceso y precio</div>
                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <Field label="Acceso" hint="Gratis o pago">
                        <div className="grid grid-cols-2 gap-2 sm:max-w-md">
                          <button
                            type="button"
                            onClick={() => {
                              setPriceMenuOpen(false);
                              setForm((p) => ({
                                ...p,
                                tipo_acceso: "gratis",
                                precio: "0",
                                payment_link: "",
                              }));
                            }}
                            className={`rounded-2xl border px-3 py-3 text-left text-sm font-black transition ${
                              form.tipo_acceso === "gratis"
                                ? "border-blue-200 bg-blue-50 ring-2 ring-blue-100"
                                : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                            }`}
                            title="Gratis"
                          >
                            Gratis
                            <div className="mt-1 text-xs font-semibold text-slate-500">Q 0.00</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (pricingOptions.length > 0) {
                                setForm((p) => ({ ...p, tipo_acceso: "pago" }));
                                setPriceMenuOpen((v) => !v || form.tipo_acceso !== "pago");
                                return;
                              }
                              setForm((p) => ({ ...p, tipo_acceso: "pago" }));
                              setPriceMenuOpen(false);
                            }}
                            className={`rounded-2xl border px-3 py-3 text-left text-sm font-black transition ${
                              form.tipo_acceso === "pago"
                                ? "border-blue-200 bg-blue-50 ring-2 ring-blue-100"
                                : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                            }`}
                            title="Pago"
                          >
                            Pago
                            <div className="mt-1 text-xs font-semibold text-slate-500">
                              {selectedPricing
                                ? `Q ${Number(selectedPricing.precio).toFixed(2)}`
                                : pricingOptions.length > 0
                                  ? `${pricingOptions.length} botones`
                                  : "Sin precios"}
                            </div>
                          </button>
                        </div>
                      </Field>
                    </div>

                    <Field label="Nivel">
                      <select
                        value={form.nivel}
                        onChange={(e) => setForm((p) => ({ ...p, nivel: e.target.value as CourseLevel }))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                      >
                        <option value="basico">Básico</option>
                        <option value="intermedio">Intermedio</option>
                        <option value="avanzado">Avanzado</option>
                      </select>
                    </Field>

                    <div />
                  </div>

                  {form.tipo_acceso === "pago" ? (
                    <div className="mt-4">
                      {pricingOptions.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                          No hay botones activos en el modulo <span className="font-black">Precio</span>.
                        </div>
                      ) : (
                        <div className="rounded-3xl border border-slate-200 bg-white p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                                Precio del curso
                              </div>
                              <div className="mt-1 text-sm font-black text-slate-900">
                                {selectedPricing
                                  ? `Seleccionado: Q ${Number(selectedPricing.precio).toFixed(2)}`
                                  : "Selecciona un precio del menu"}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {pricingOptions.length} opciones activas en el modulo Precio
                              </div>
                            </div>

                            <div className="hidden shrink-0 sm:relative sm:block">
                              <button
                                type="button"
                                onClick={() => setPriceMenuOpen((v) => !v)}
                                className={`cf-course-editor-price-select inline-flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${
                                  priceMenuOpen
                                    ? "border-blue-200 bg-blue-50 text-blue-900 ring-2 ring-blue-100"
                                    : "border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100"
                                }`}
                              >
                                <span className="truncate">
                                  {selectedPricing
                                    ? `Q ${Number(selectedPricing.precio).toFixed(2)}`
                                    : "Elegir precio"}
                                </span>
                                <svg
                                  viewBox="0 0 24 24"
                                  className={`h-4 w-4 shrink-0 transition ${priceMenuOpen ? "rotate-180" : ""}`}
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>

                              {priceMenuOpen ? (
                                <div className="cf-course-editor-price-menu absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                  <div className="max-h-72 overflow-y-auto p-2">
                                    {pricingOptions.map((it) => {
                                      const active =
                                        selectedPricing?.id === it.id ||
                                        (Number(form.precio) === Number(it.precio) &&
                                          normalizePaymentLinkInput(form.payment_link) ===
                                            normalizePaymentLinkInput(it.payment_link));
                                      return (
                                        <button
                                          key={it.id}
                                          type="button"
                                          onClick={() => selectPricingOption(it)}
                                          className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition ${
                                            active
                                              ? "bg-blue-50 text-blue-900"
                                              : "text-slate-800 hover:bg-slate-50"
                                          }`}
                                        >
                                          <div className="min-w-0">
                                            <div className="text-sm font-black">
                                              Q {Number(it.precio).toFixed(2)}
                                            </div>
                                            <div className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                                              {it.nombre}
                                            </div>
                                          </div>
                                          <span
                                            className={`cf-course-editor-note-badge inline-flex items-center rounded-full px-2.5 py-1 font-black ${
                                              active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                                            }`}
                                          >
                                            {active ? "Activo" : "Usar"}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-4 grid gap-2 sm:hidden">
                            {pricingOptions.map((it) => {
                              const active =
                                selectedPricing?.id === it.id ||
                                (Number(form.precio) === Number(it.precio) &&
                                  normalizePaymentLinkInput(form.payment_link) ===
                                    normalizePaymentLinkInput(it.payment_link));
                              return (
                                <button
                                  key={it.id}
                                  type="button"
                                  onClick={() => selectPricingOption(it)}
                                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                                    active
                                      ? "border-blue-200 bg-blue-50 text-blue-900 ring-2 ring-blue-100"
                                      : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-white"
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="text-sm font-black">
                                      Q {Number(it.precio).toFixed(2)}
                                    </div>
                                    <div className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                                      {it.nombre}
                                    </div>
                                  </div>
                                  <span
                                    className={`cf-course-editor-note-badge shrink-0 rounded-full px-2.5 py-1 font-black ${
                                      active ? "bg-blue-600 text-white" : "bg-white text-slate-700"
                                    }`}
                                  >
                                    {active ? "Activo" : "Usar"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                            <Field label="Precio" error={validation.errors.precio ?? null}>
                              <Input
                                inputMode="decimal"
                                value={form.precio}
                                onChange={(e) =>
                                  setForm((p) => ({ ...p, precio: e.target.value }))
                                }
                                placeholder="Ej: 199.99"
                              />
                            </Field>

                            <Field
                              label="Botón fijo BI Pay / EBI"
                              hint="Puedes pegar el script iframe si no quieres usar el menu."
                              error={validation.errors.payment_link ?? null}
                            >
                              <textarea
                                value={form.payment_link}
                                onChange={(e) =>
                                  setForm((p) => ({ ...p, payment_link: e.target.value }))
                                }
                                rows={4}
                                placeholder='<script>/*Pay Bi*/document.write(unescape("%3Ciframe..."))</script>'
                                className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-xs text-slate-900 outline-none ring-blue-500 transition focus:ring-2"
                              />
                            </Field>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </Card>
              </>
            )}
          </div>

          <div className="min-w-0 space-y-6">
            <Card className="p-5">
              <div className="text-sm font-black text-slate-900">Imagen de página principal</div>
              <div className="mt-1 text-xs font-semibold text-slate-600">
                Solo se mostrará dentro del curso, no en las tarjetas.
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-black/5">
                <div className="aspect-[16/10]">
                  {form.imagen_url ? (
                    <img src={form.imagen_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-slate-200 via-slate-100 to-white" />
                  )}
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                <label className="grid cursor-pointer place-items-center rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-800 transition hover:bg-slate-50">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadImage(f);
                      e.currentTarget.value = "";
                    }}
                    disabled={uploading}
                  />
                  {uploading ? "Subiendo…" : "Cambiar imagen"}
                </label>
                {form.imagen_url ? (
                  <Button variant="ghost" onClick={() => setForm((p) => ({ ...p, imagen_url: "" }))}>
                    Quitar imagen
                  </Button>
                ) : null}
              </div>
            </Card>

            <Card className="p-5 space-y-4">
              <div className="text-sm font-black text-slate-900">Multimedia</div>
              <Field label="Video intro URL" hint="Opcional">
                <Input
                  value={form.video_intro_url}
                  onChange={(e) => setForm((p) => ({ ...p, video_intro_url: e.target.value }))}
                  placeholder="https://…"
                />
              </Field>
              {form.tipo_acceso === "pago" && normalizePaymentLinkInput(form.payment_link) ? (
                <Suspense
                  fallback={
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
                      Cargando vista previa del pago...
                    </div>
                  }
                >
                  <BiPayEmbed paymentLink={form.payment_link} />
                </Suspense>
              ) : null}
            </Card>
          </div>
        </div>
        </div>
      </Card>
    </div>
  );
}
