import { useEffect, useMemo, useRef, useState } from "react";
import type { AxiosInstance } from "axios";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { ConfirmActionModal } from "../ui/ConfirmActionModal";
import { BiPayEmbed } from "../payment/BiPayEmbed";
import type { ApiResponse } from "../../types/api";
import type { User, UserListResponse } from "../../types/auth";
import type { CourseAccessType, CourseLevel, CourseStatus } from "../../types/course";
import type { PricingSetting } from "../../types/pricing";
import { getApiErrorMessage } from "../../utils/apiError";
import { normalizePaymentLinkInput } from "../../utils/paymentLink";

type CategoryItem = { id: number; nombre: string };

type Props = {
  api: AxiosInstance;
  currentUser: User;
  variant: "teacher" | "admin";
  onCreated?: () => void;
  hideHeaderText?: boolean;
};

type CreateCoursePayload = {
  categoria_id: number;
  docente_id?: number;
  titulo: string;
  slug?: string;
  descripcion_corta?: string | null;
  descripcion?: string | null;
  imagen_url?: string | null;
  video_intro_url?: string | null;
  payment_link?: string | null;
  tipo_acceso?: CourseAccessType;
  precio?: number;
  nivel?: CourseLevel;
  estado?: CourseStatus;
  duracion_horas?: number | null;
  requisitos?: string | null;
  objetivos?: string | null;
  fecha_publicacion?: string | null;
};

type UploadedFileDto = {
  key: string;
  url: string;
  mimeType: string;
  size: number;
};

function toMysqlDatetimeLocal(raw: string): string {
  if (!raw) return raw;
  const v = raw.replace("T", " ");
  return v.length === 16 ? `${v}:00` : v;
}

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

function prettyAccess(t: CourseAccessType) {
  return t === "gratis" ? "Gratis" : "Pago";
}

function prettyLevel(l: CourseLevel) {
  if (l === "intermedio") return "Intermedio";
  if (l === "avanzado") return "Avanzado";
  return "Básico";
}

function prettyStatus(s: CourseStatus) {
  if (s === "publicado") return "Publicado";
  if (s === "oculto") return "Oculto";
  return "Borrador";
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-xs font-extrabold text-slate-700">
          {label} {required ? <span className="text-rose-600">*</span> : null}
        </div>
        {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
      </div>
      <div className="mt-2">{children}</div>
      {error ? <div className="mt-2 text-xs font-bold text-rose-700">{error}</div> : null}
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-900 text-white shadow-sm">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-black text-slate-900">{title}</div>
        {subtitle ? <div className="mt-0.5 text-sm text-slate-600">{subtitle}</div> : null}
      </div>
    </div>
  );
}

function StatusPill({
  variant,
  children,
}: {
  variant: "blue" | "slate" | "amber";
  children: string;
}) {
  const styles =
    variant === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-800"
      : variant === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-slate-200 bg-slate-50 text-slate-800";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black ${styles}`}
    >
      {children}
    </span>
  );
}

export function CourseCreateForm({ api, currentUser, variant, onCreated, hideHeaderText = false }: Props) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [pricingOptions, setPricingOptions] = useState<PricingSetting[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [priceMenuOpen, setPriceMenuOpen] = useState(false);

  const canPickTeacher = variant === "admin";

  type FormState = {
    categoria_id: string;
    docente_id: string;
    titulo: string;
    slug: string;
    slugMode: "auto" | "manual";
    descripcion_corta: string;
    descripcion: string;
    imagen_url: string;
    video_intro_url: string;
    payment_link: string;
    tipo_acceso: CourseAccessType;
    precio: string;
    nivel: CourseLevel;
    estado: CourseStatus;
    duracion_horas: string;
    requisitos: string;
    objetivos: string;
    fecha_publicacion: string;
  };

  const [form, setForm] = useState<FormState>({
    categoria_id: "",
    docente_id: String(currentUser.id),
    titulo: "",
    slug: "",
    slugMode: "auto",
    descripcion_corta: "",
    descripcion: "",
    imagen_url: "",
    video_intro_url: "",
    payment_link: "",
    tipo_acceso: "gratis",
    precio: "0",
    nivel: "basico",
    estado: "borrador",
    duracion_horas: "",
    requisitos: "",
    objetivos: "",
    fecha_publicacion: "",
  });

  const selectedPricing = useMemo(() => {
    if (form.tipo_acceso !== "pago") return null;
    const precioN = Number(form.precio);
    if (!Number.isFinite(precioN) || precioN <= 0) return null;
    const selectedLink = normalizePaymentLinkInput(form.payment_link);
    return (
      pricingOptions.find(
        (p) => Number(p.precio) === precioN && normalizePaymentLinkInput(p.payment_link) === selectedLink
      ) ?? null
    );
  }, [form.payment_link, form.precio, form.tipo_acceso, pricingOptions]);

  const selectPricingOption = (item: PricingSetting) => {
    setForm((p) => ({
      ...p,
      tipo_acceso: "pago",
      precio: String(item.precio),
      payment_link: item.payment_link,
    }));
    setPriceMenuOpen(false);
  };

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<UploadedFileDto | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  // Auto-slug desde título (si está en modo auto)
  useEffect(() => {
    if (!open) return;
    if (form.slugMode !== "auto") return;
    const next = slugify(form.titulo);
    setForm((p) => ({ ...p, slug: next }));
  }, [form.titulo, form.slugMode, open]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setIsLoadingMeta(true);
        setMetaError(null);

        const cats = api.get<ApiResponse<Array<{ id: number; nombre: string }>>>("/categories");
        const pricing = api.get<ApiResponse<PricingSetting[]>>("/pricing-settings", { params: { estado: "activo" } });
        const users = canPickTeacher
          ? api.get<ApiResponse<UserListResponse>>("/users", { params: { limit: 200, offset: 0 } })
          : Promise.resolve(null);

        const [catsRes, pricingRes, usersRes] = await Promise.all([cats, pricing, users]);
        const nextCategories = catsRes.data.data;
        setCategories(nextCategories);
        const firstCategoryId = nextCategories[0]?.id;
        if (firstCategoryId) setForm((p) => ({ ...p, categoria_id: String(firstCategoryId) }));
        else setMetaError("No hay categorías activas configuradas. Crea una categoría para poder crear cursos.");

        setPricingOptions(pricingRes.data.data);

        if (canPickTeacher && usersRes) {
          const list = usersRes.data.data.items.filter((u) => u.rol === "docente" || u.rol === "admin");
          setTeachers(list);
          setForm((p) => ({ ...p, docente_id: String(list[0]?.id ?? currentUser.id) }));
        }
      } catch (e) {
        setMetaError(getApiErrorMessage(e, "No se pudieron cargar los datos del formulario."));
      } finally {
        setIsLoadingMeta(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedTeacher = useMemo(() => {
    const id = Number(form.docente_id);
    if (!canPickTeacher) return currentUser;
    return teachers.find((t) => t.id === id) ?? null;
  }, [canPickTeacher, currentUser, form.docente_id, teachers]);

  const validation = useMemo(() => {
    const errors: Record<string, string> = {};

    const titulo = form.titulo.trim();
    if (!titulo) errors.titulo = "El título es obligatorio.";

    const categoriaId = Number(form.categoria_id);
    if (categories.length === 0) errors.categoria_id = "No hay categorías disponibles.";
    if (!Number.isFinite(categoriaId) || categoriaId <= 0) errors.categoria_id = "No hay categorías disponibles.";

    if (canPickTeacher) {
      const docenteId = Number(form.docente_id);
      if (!Number.isFinite(docenteId) || docenteId <= 0) errors.docente_id = "Selecciona un docente.";
    }

    const slug = form.slug.trim();
    if (slug) {
      const ok = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
      if (!ok) errors.slug = "Usa solo minúsculas, números y guiones (ej: programacion-iii).";
    }

    if (form.tipo_acceso === "pago") {
      const precio = Number(form.precio);
      if (!Number.isFinite(precio) || precio <= 0) {
        errors.precio = "Para cursos de pago, el precio debe ser mayor que 0.";
      }
      if (!normalizePaymentLinkInput(form.payment_link)) {
        errors.payment_link = "Selecciona un boton de precio valido.";
      }
    }

    return { errors, isValid: Object.keys(errors).length === 0 };
  }, [canPickTeacher, categories.length, form]);

  const payload = useMemo((): CreateCoursePayload | null => {
    if (!validation.isValid) return null;

    const categoriaId = Number(form.categoria_id);
    const docenteIdN = Number(form.docente_id);
    const docente_id = canPickTeacher
      ? (Number.isFinite(docenteIdN) ? docenteIdN : undefined)
      : currentUser.id;

    const precioN = Number(form.precio);
    const precio = Number.isFinite(precioN) ? precioN : 0;

    const dur = form.duracion_horas.trim() ? Number(form.duracion_horas) : null;
    const duracion_horas = dur === null ? null : Number.isFinite(dur) ? dur : null;

    const fecha_publicacion = form.fecha_publicacion.trim()
      ? toMysqlDatetimeLocal(form.fecha_publicacion.trim())
      : null;

    return {
      categoria_id: categoriaId,
      docente_id,
      titulo: form.titulo.trim(),
      tipo_acceso: form.tipo_acceso,
      precio: form.tipo_acceso === "gratis" ? 0 : precio,
      nivel: form.nivel,
      estado: form.estado,
      slug: form.slug.trim() || undefined,
      descripcion_corta: form.descripcion_corta.trim() || null,
      descripcion: form.descripcion.trim() || null,
      imagen_url: form.imagen_url.trim() || null,
      video_intro_url: form.video_intro_url.trim() || null,
      payment_link: form.tipo_acceso === "pago" ? normalizePaymentLinkInput(form.payment_link) : null,
      duracion_horas,
      requisitos: form.requisitos.trim() || null,
      objetivos: form.objetivos.trim() || null,
      fecha_publicacion,
    };
  }, [canPickTeacher, currentUser.id, form, validation.isValid]);

  const submitEnabled = payload !== null && !isSubmitting && !isUploadingImage;

  const uploadImage = async (file: File) => {
    try {
      setIsUploadingImage(true);
      setMetaError(null);

      const localUrl = URL.createObjectURL(file);
      setImagePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return localUrl;
      });

      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post<ApiResponse<UploadedFileDto>>("/uploads/course-image", fd);
      setUploadedImage(res.data.data);
      setForm((p) => ({ ...p, imagen_url: res.data.data.url }));
    } catch (e) {
      setUploadedImage(null);
      setForm((p) => ({ ...p, imagen_url: "" }));
      setMetaError(
        `${getApiErrorMessage(e, "No se pudo subir la imagen.")} Tip: este upload requiere configurar AWS S3 en el backend (.env).`
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const submit = async () => {
    if (!payload) return;
    try {
      setIsSubmitting(true);
      setMetaError(null);
      setSuccess(null);
      await api.post<ApiResponse<unknown>>("/courses", payload);
      setSuccess("Curso creado correctamente.");
      setOpen(false);
      onCreated?.();
      setForm({
        categoria_id: "",
        docente_id: String(currentUser.id),
        titulo: "",
        slug: "",
        slugMode: "auto",
        descripcion_corta: "",
        descripcion: "",
        imagen_url: "",
        video_intro_url: "",
        payment_link: "",
        tipo_acceso: "gratis",
        precio: "0",
        nivel: "basico",
        estado: "borrador",
        duracion_horas: "",
        requisitos: "",
        objetivos: "",
        fecha_publicacion: "",
      });
      setUploadedImage(null);
      setImagePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (e) {
      setMetaError(getApiErrorMessage(e, "No se pudo crear el curso."));
    } finally {
      setIsSubmitting(false);
      setConfirmCreateOpen(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className={`flex flex-wrap items-start gap-3 ${hideHeaderText ? "justify-center" : "justify-between"}`}>
          {!hideHeaderText ? (
            <div>
              <div className="text-sm font-extrabold text-slate-900">Crear curso</div>
              <div className="mt-1 text-xs text-slate-500">
                {variant === "admin" ? "Crea cursos y asígnalos a un docente." : "Crea un curso para tu biblioteca docente."}
              </div>
            </div>
          ) : null}
          <div className="flex items-center gap-3">
            {success ? <div className="text-xs font-bold text-emerald-700">{success}</div> : null}
            <Button variant={open ? "ghost" : "primary"} onClick={() => setOpen((v) => !v)}>
              {open ? "Cerrar" : "Nuevo curso"}
            </Button>
          </div>
        </div>
        {metaError ? <div className="mt-3 text-sm font-semibold text-rose-700">{metaError}</div> : null}
      </div>

      {open ? (
        <div className="bg-slate-50 px-5 py-5">
          {isLoadingMeta ? (
            <div className="text-sm text-slate-600">Cargando datos…</div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
              <div className="min-w-0 space-y-6">
                <Card className="p-6">
                  <SectionTitle
                    title="Información básica"
                    subtitle="Lo esencial para identificar el curso."
                    icon={
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M4 7h16M4 12h16M4 17h10" />
                      </svg>
                    }
                  />

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <Field label="Título" required error={validation.errors.titulo ?? null}>
                      <Input
                        value={form.titulo}
                        onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
                        placeholder="Ej: Programación III"
                      />
                    </Field>

                    <Field label="Descripción corta" hint="Opcional">
                      <Input
                        value={form.descripcion_corta}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, descripcion_corta: e.target.value }))
                        }
                        placeholder="Resumen del curso (máx. 255)."
                      />
                    </Field>
                  </div>

                  {canPickTeacher ? (
                    <div className="mt-4">
                      <Field label="Docente" required error={validation.errors.docente_id ?? null}>
                        <select
                          value={form.docente_id}
                          onChange={(e) => setForm((p) => ({ ...p, docente_id: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                        >
                          {teachers.map((t) => (
                            <option key={t.id} value={String(t.id)}>
                              {t.nombres} {t.apellidos} ({t.rol})
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  ) : null}

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <Field
                      label="Slug"
                      hint={form.slugMode === "auto" ? "Auto" : "Manual"}
                      error={validation.errors.slug ?? null}
                    >
                      <div className="flex gap-2">
                        <Input
                          value={form.slug}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, slugMode: "manual", slug: e.target.value }))
                          }
                          placeholder="programacion-iii"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            setForm((p) => ({ ...p, slugMode: "auto", slug: slugify(p.titulo) }))
                          }
                          title="Generar automáticamente desde el título"
                        >
                          Auto
                        </Button>
                      </div>
                    </Field>
                    <div />
                  </div>
                </Card>

                <Card className="p-6">
                  <SectionTitle
                    title="Configuración"
                    subtitle="Acceso, precio, estado y publicación."
                    icon={
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 3v3M12 18v3M4.2 6.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M6.3 15.8l-2.1 2.1M20.8 6.2l-2.1 2.1" />
                        <path d="M12 8a4 4 0 100 8 4 4 0 000-8z" />
                      </svg>
                    }
                  />

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <Field label="Nivel">
                      <select
                        value={form.nivel}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, nivel: e.target.value as CourseLevel }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                      >
                        <option value="basico">Básico</option>
                        <option value="intermedio">Intermedio</option>
                        <option value="avanzado">Avanzado</option>
                      </select>
                    </Field>

                    <Field label="Estado">
                      <select
                        value={form.estado}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, estado: e.target.value as CourseStatus }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                      >
                        <option value="borrador">Borrador</option>
                        <option value="publicado">Publicado</option>
                        <option value="oculto">Oculto</option>
                      </select>
                    </Field>

                    <div />
                  </div>

                  <div className="mt-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-xs font-extrabold text-slate-700">
                        Precio <span className="text-rose-600">*</span>
                      </div>
                      <div className="text-xs text-slate-500">Gratis o pago</div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => {
                          setPriceMenuOpen(false);
                          setForm((p) => ({ ...p, tipo_acceso: "gratis", precio: "0", payment_link: "" }));
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

                              <div className="relative shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setPriceMenuOpen((v) => !v)}
                                  className={`inline-flex min-w-[220px] items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${
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
                                  <div className="absolute right-0 z-20 mt-2 w-full min-w-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                                    <div className="max-h-72 overflow-y-auto p-2">
                                      {pricingOptions.map((it) => {
                                        const active =
                                          selectedPricing?.id === it.id ||
                                          (Number(form.precio) === Number(it.precio) &&
                                            normalizePaymentLinkInput(form.payment_link) === normalizePaymentLinkInput(it.payment_link));
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
                                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ${
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

                            {selectedPricing ? (
                              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <div className="text-sm font-black text-slate-900">
                                      Boton seleccionado
                                    </div>
                                    <div className="mt-1 text-xs font-semibold text-slate-500">
                                      {selectedPricing.nombre}
                                    </div>
                                  </div>
                                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
                                    Q {Number(selectedPricing.precio).toFixed(2)}
                                  </span>
                                </div>

                                <BiPayEmbed paymentLink={selectedPricing.payment_link} className="mt-4" />
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {validation.errors.payment_link ? (
                      <div className="mt-2 text-xs font-bold text-rose-700">{validation.errors.payment_link}</div>
                    ) : null}
                    {validation.errors.precio ? (
                      <div className="mt-2 text-xs font-bold text-rose-700">{validation.errors.precio}</div>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Fecha publicación" hint="Opcional">
                      <Input
                        type="datetime-local"
                        value={form.fecha_publicacion}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, fecha_publicacion: e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Duración (horas)" hint="Opcional">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.duracion_horas}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, duracion_horas: e.target.value }))
                        }
                        placeholder="Ej: 12.5"
                      />
                    </Field>
                  </div>
                </Card>

                <Card className="p-6">
                  <SectionTitle
                    title="Contenido"
                    subtitle="Descripción y estructura del curso."
                    icon={
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M4 5h16v14H4z" />
                        <path d="M8 9h8M8 13h6" />
                      </svg>
                    }
                  />
                  <div className="mt-6">
                    <Field label="Descripción" hint="Opcional">
                      <textarea
                        value={form.descripcion}
                        onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                        className="min-h-[140px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                        placeholder="Describe el curso…"
                      />
                    </Field>
                  </div>
                </Card>

                <Card className="p-6">
                  <SectionTitle
                    title="Multimedia"
                    subtitle="La imagen se mostrará solo en la página principal del curso."
                    icon={
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 15V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" />
                        <path d="M7 14l2-2 3 3 4-4 2 2" />
                      </svg>
                    }
                  />

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div>
                      <Field
                        label="Imagen de página principal"
                        hint={isUploadingImage ? "Subiendo…" : uploadedImage ? "Subida" : "Opcional"}
                      >
                        <div
                          className={`rounded-2xl border bg-white p-4 transition ${
                            isDragging
                              ? "border-blue-300 ring-2 ring-blue-200"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                          onDragEnter={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDragging(true);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDragging(true);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDragging(false);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDragging(false);
                            const f = e.dataTransfer.files?.[0];
                            if (f) void uploadImage(f);
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-extrabold text-slate-900">Subir imagen</div>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => fileRef.current?.click()}
                            >
                              Seleccionar
                            </Button>
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            Arrastra y suelta o selecciona un archivo (PNG, JPG, WEBP). No se usará en tarjetas.
                          </div>
                          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                            {imagePreviewUrl || form.imagen_url ? (
                              <img
                                src={imagePreviewUrl ?? form.imagen_url}
                                alt="Preview"
                                className="h-32 w-full object-cover"
                              />
                            ) : (
                              <div className="grid h-32 w-full place-items-center bg-slate-100 text-xs font-bold text-slate-500">
                                Sin imagen
                              </div>
                            )}
                          </div>
                          <input
                            ref={fileRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.currentTarget.files?.[0] ?? null;
                              if (!f) return;
                              void uploadImage(f);
                            }}
                          />
                        </div>

                        <div className="mt-3">
                          <Input
                            value={form.imagen_url}
                            onChange={(e) => setForm((p) => ({ ...p, imagen_url: e.target.value }))}
                            placeholder="URL"
                          />
                        </div>
                      </Field>
                    </div>

                    <div>
                      <Field label="Video intro URL" hint="Opcional">
                        <Input
                          value={form.video_intro_url}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, video_intro_url: e.target.value }))
                          }
                          placeholder="https://..."
                        />
                      </Field>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <SectionTitle
                    title="Detalles adicionales"
                    subtitle="Requisitos y objetivos para tus estudiantes."
                    icon={
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M9 12l2 2 4-4" />
                        <path d="M20 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" />
                      </svg>
                    }
                  />

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <Field label="Requisitos" hint="Opcional">
                      <textarea
                        value={form.requisitos}
                        onChange={(e) => setForm((p) => ({ ...p, requisitos: e.target.value }))}
                        className="min-h-[110px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                        placeholder="Ej: Conocimientos básicos…"
                      />
                    </Field>
                    <Field label="Objetivos" hint="Opcional">
                      <textarea
                        value={form.objetivos}
                        onChange={(e) => setForm((p) => ({ ...p, objetivos: e.target.value }))}
                        className="min-h-[110px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                        placeholder="Ej: Aprenderás a…"
                      />
                    </Field>
                  </div>
                </Card>

                <div className="sticky bottom-4 z-10">
                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-lg shadow-slate-900/5 backdrop-blur">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-slate-600">
                        {submitEnabled ? (
                          <span>
                            Listo para crear. Estado actual:{" "}
                            <span className="font-black text-slate-900">
                              {prettyStatus(form.estado)}
                            </span>
                          </span>
                        ) : (
                          <span>
                            Completa los campos requeridos para habilitar{" "}
                            <span className="font-black text-slate-900">Crear curso</span>.
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
                          Cancelar
                        </Button>
                        <Button variant="primary" disabled={!submitEnabled} onClick={() => setConfirmCreateOpen(true)}>
                          {isSubmitting ? "Guardando…" : "Crear curso"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
                <div className="space-y-4">
                  <Card className="overflow-hidden">
                    <div className="border-b border-slate-200 bg-white px-5 py-4">
                      <div className="text-xs font-extrabold text-slate-600">Preview</div>
                      <div className="mt-1 text-sm font-black text-slate-900">Vista previa del curso</div>
                    </div>
                    <div className="p-5">
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                        {imagePreviewUrl || form.imagen_url ? (
                          <img
                            src={imagePreviewUrl ?? form.imagen_url}
                            alt="Imagen del curso"
                            className="h-40 w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-40 place-items-center bg-gradient-to-br from-slate-200 to-slate-100 text-xs font-black text-slate-500">
                            Sin imagen
                          </div>
                        )}
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="text-base font-black tracking-tight text-slate-900">
                          {form.titulo.trim() || "Título del curso"}
                        </div>
                        <div className="text-sm text-slate-600">
                          {form.descripcion_corta.trim() || "Descripción corta del curso (opcional)."}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          <StatusPill
                            variant={
                              form.estado === "publicado"
                                ? "blue"
                                : form.estado === "oculto"
                                  ? "amber"
                                  : "slate"
                            }
                          >
                            {prettyStatus(form.estado)}
                          </StatusPill>
                          <StatusPill variant={form.tipo_acceso === "pago" ? "amber" : "slate"}>
                            {prettyAccess(form.tipo_acceso)}
                          </StatusPill>
                          <StatusPill variant="slate">{prettyLevel(form.nivel)}</StatusPill>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 text-sm">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="text-xs font-extrabold text-slate-500">Slug</div>
                          <div className="mt-1 break-all text-xs font-bold text-slate-800">
                            {form.slug.trim() ? `/${form.slug.trim()}` : "—"}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="text-xs font-extrabold text-slate-500">Docente</div>
                          <div className="mt-1 text-sm font-extrabold text-slate-900">
                            {selectedTeacher ? `${selectedTeacher.nombres} ${selectedTeacher.apellidos}` : "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5">
                    <div className="text-sm font-black text-slate-900">Checklist</div>
                    <div className="mt-3 space-y-2 text-sm">
                      <ChecklistItem ok={!validation.errors.titulo} text="Título definido" />
                      <ChecklistItem
                        ok={form.tipo_acceso === "gratis" ? true : !validation.errors.precio}
                        text="Precio válido"
                      />
                      <ChecklistItem ok={!validation.errors.slug} text="Slug válido" />
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
      </Card>

      <ConfirmActionModal
        open={confirmCreateOpen}
        tone="blue"
        eyebrow="Nuevo curso"
        title="¿Crear este curso?"
        description={`Se creará "${form.titulo.trim() || "este curso"}" en estado ${prettyStatus(form.estado).toLowerCase()}.\nRevisa que docente, precio y categoría sean correctos.`}
        confirmLabel="Crear curso"
        isLoading={isSubmitting}
        onCancel={() => setConfirmCreateOpen(false)}
        onConfirm={() => void submit()}
      />
    </>
  );
}

function ChecklistItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] font-black ${
          ok
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-slate-50 text-slate-500"
        }`}
      >
        {ok ? "✓" : "•"}
      </span>
      <span className={`text-sm ${ok ? "text-slate-900" : "text-slate-600"}`}>{text}</span>
    </div>
  );
}
