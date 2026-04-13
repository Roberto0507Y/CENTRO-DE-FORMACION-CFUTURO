import { Suspense, useEffect, useMemo, useState } from "react";
import type { AxiosInstance } from "axios";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { Spinner } from "../ui/Spinner";
import type { ApiResponse } from "../../types/api";
import type { CourseAccessType, CourseDetail, CourseLevel, CourseStatus } from "../../types/course";
import { getApiErrorMessage } from "../../utils/apiError";
import { lazyNamed } from "../../utils/lazyNamed";
import { normalizePaymentLinkInput } from "../../utils/paymentLink";

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
  const shortDescriptionCount = form.descripcion_corta.length;

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
      } catch (err) {
        setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo cargar el curso.") });
        setDetail(null);
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <Card className="w-full max-w-5xl overflow-hidden">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
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

        <div className="grid gap-6 bg-slate-50 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_380px]">
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
                    <Field label="Tipo">
                      <select
                        value={form.tipo_acceso}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            tipo_acceso: e.target.value as CourseAccessType,
                            precio: e.target.value === "gratis" ? "0" : p.precio,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                      >
                        <option value="gratis">Gratis</option>
                        <option value="pago">Pago</option>
                      </select>
                    </Field>

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

                    {form.tipo_acceso === "pago" ? (
                      <Field label="Precio" error={validation.errors.precio ?? null}>
                        <Input
                          inputMode="decimal"
                          value={form.precio}
                          onChange={(e) => setForm((p) => ({ ...p, precio: e.target.value }))}
                          placeholder="Ej: 199.99"
                        />
                      </Field>
                    ) : (
                      <div />
                    )}
                  </div>
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
              <Field label="Boton BI Pay / EBI" hint="Acepta URL o snippet del iframe." error={validation.errors.payment_link ?? null}>
                <Input
                  value={form.payment_link}
                  onChange={(e) => setForm((p) => ({ ...p, payment_link: e.target.value }))}
                  placeholder="Pega la URL o el snippet de EBI"
                />
              </Field>
              {normalizePaymentLinkInput(form.payment_link) ? (
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
      </Card>
    </div>
  );
}
