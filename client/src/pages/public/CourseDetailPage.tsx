import { Suspense, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { CourseDetail } from "../../types/course";
import type { CourseModule } from "../../types/courseModule";
import type { LessonListItem } from "../../types/lesson";
import type { PaymentMethod, PaymentStatus } from "../../types/payment";
import { getApiErrorMessage } from "../../utils/apiError";
import { downloadPaymentProof } from "../../utils/downloadFile";
import { formatMoneyGTQ } from "../../utils/format";
import { normalizePaymentLinkInput } from "../../utils/paymentLink";
import { lazyNamed } from "../../utils/lazyNamed";

const BiPayEmbed = lazyNamed(() => import("../../components/payment/BiPayEmbed"), "BiPayEmbed");

type MyCoursePayment = {
  payment: {
    id: number;
    estado: PaymentStatus;
    metodo_pago: PaymentMethod;
    monto_total: string;
    moneda: string;
    comprobante_url: string | null;
    observaciones: string | null;
    created_at: string;
    fecha_pago: string | null;
  } | null;
  enrollment: {
    id: number;
    estado: "activa" | "pendiente" | "cancelada" | "finalizada";
    tipo_inscripcion: "gratis" | "pagada";
  } | null;
};

type AccessCheck = {
  enrolled: boolean;
  access: boolean;
  tipo_inscripcion: "gratis" | "pagada" | null;
  estado_inscripcion: "activa" | "pendiente" | "cancelada" | "finalizada" | null;
  progreso: string | null;
};

function statusBadge(estado: PaymentStatus) {
  if (estado === "pagado") return <Badge variant="green">Aprobado</Badge>;
  if (estado === "pendiente") return <Badge variant="amber">Pendiente</Badge>;
  if (estado === "rechazado") return <Badge variant="rose">Rechazado</Badge>;
  if (estado === "reembolsado") return <Badge variant="blue">Reembolsado</Badge>;
  return <Badge variant="slate">{estado}</Badge>;
}

function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function asList(raw: string | null | undefined) {
  const text = String(raw || "").trim();
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[•\-–]\s*/, "").trim())
    .filter(Boolean);
}

function LessonTypeIcon({ tipo }: { tipo: LessonListItem["tipo"] }) {
  if (tipo === "video") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <path d="M8 7h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" />
        <path d="m11 10 5 3-5 3v-6Z" fill="currentColor" />
      </svg>
    );
  }
  if (tipo === "pdf") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5Z" stroke="currentColor" strokeWidth="2" />
        <path d="M14 2v5h5" stroke="currentColor" strokeWidth="2" />
        <path d="M8 13h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M8 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (tipo === "enlace") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
        <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M4 6h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CourseDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { api, token } = useAuth();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [payInfo, setPayInfo] = useState<MyCoursePayment | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [accessInfo, setAccessInfo] = useState<AccessCheck | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [method, setMethod] = useState<"manual" | "bi_pay">("manual");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const proofInputRef = useRef<HTMLInputElement | null>(null);

  const [modules, setModules] = useState<CourseModule[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [modulesError, setModulesError] = useState<string | null>(null);
  const [openModuleId, setOpenModuleId] = useState<number | null>(null);
  const [lessonsByModuleId, setLessonsByModuleId] = useState<Record<number, LessonListItem[]>>({});
  const [lessonsLoadingIds, setLessonsLoadingIds] = useState<Record<number, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await api.get<ApiResponse<CourseDetail>>(`/courses/slug/${slug}`);
        setCourse(res.data.data);
      } catch {
        setError("Curso no encontrado.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [api, slug]);

  useEffect(() => {
    (async () => {
      if (!course) return;
      if (!token) {
        setPayInfo(null);
        setAccessInfo(null);
        return;
      }

      // Consultar acceso/inscripción (gratis o pago) para evitar re-inscripciones y dar feedback correcto.
      try {
        setAccessLoading(true);
        const res = await api.get<ApiResponse<AccessCheck>>(`/enrollments/${course.id}/check-access`);
        setAccessInfo(res.data.data);
      } catch {
        setAccessInfo(null);
      } finally {
        setAccessLoading(false);
      }

      if (course.tipo_acceso !== "pago") {
        setPayInfo(null);
        return;
      }
      try {
        setPayLoading(true);
        const res = await api.get<ApiResponse<MyCoursePayment>>(`/payments/my/course/${course.id}`);
        setPayInfo(res.data.data);
      } catch {
        setPayInfo(null);
      } finally {
        setPayLoading(false);
      }
    })();
  }, [api, course, token]);

  useEffect(() => {
    (async () => {
      if (!course) return;
      try {
        setModulesLoading(true);
        setModulesError(null);
        const res = await api.get<ApiResponse<CourseModule[]>>(`/course-modules/course/${course.id}`);
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        setModules(list);
        setOpenModuleId((prev) => prev ?? (list[0]?.id ?? null));
      } catch {
        setModules([]);
        setModulesError("No se pudo cargar el contenido del curso.");
      } finally {
        setModulesLoading(false);
      }
    })();
  }, [api, course]);

  useEffect(() => {
    (async () => {
      if (!openModuleId) return;
      if (lessonsByModuleId[openModuleId]) return;
      try {
        setLessonsLoadingIds((m) => ({ ...m, [openModuleId]: true }));
        const res = await api.get<ApiResponse<LessonListItem[]>>(`/lessons/module/${openModuleId}`);
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        setLessonsByModuleId((m) => ({ ...m, [openModuleId]: list }));
      } catch {
        setLessonsByModuleId((m) => ({ ...m, [openModuleId]: [] }));
      } finally {
        setLessonsLoadingIds((m) => ({ ...m, [openModuleId]: false }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, openModuleId]);

  const enrollFree = async () => {
    if (!course) return;
    if (!token) {
      setActionError("Debes iniciar sesión para inscribirte.");
      return;
    }
    try {
      setIsEnrolling(true);
      setActionError(null);
      await api.post(`/enrollments/free/${course.id}`);
      try {
        const res = await api.get<ApiResponse<AccessCheck>>(`/enrollments/${course.id}/check-access`);
        setAccessInfo(res.data.data);
      } catch {
        // ignore
      }
      navigate(`/student/course/${course.id}/home`);
    } catch (err) {
      setActionError(getApiErrorMessage(err, "No se pudo completar la inscripción."));
    } finally {
      setIsEnrolling(false);
    }
  };

  const uploadProof = async (file: File) => {
    if (!course) return;
    if (!token) {
      setActionError("Debes iniciar sesión para enviar comprobante.");
      return;
    }
    try {
      setUploadingProof(true);
      setActionError(null);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("metodo_pago", method);
      const res = await api.post<ApiResponse<MyCoursePayment>>(`/payments/manual/course/${course.id}`, fd);
      setPayInfo(res.data.data);
    } catch {
      setActionError("No se pudo enviar el comprobante. Intenta de nuevo.");
    } finally {
      setUploadingProof(false);
    }
  };

  const downloadProof = async (paymentId: number) => {
    try {
      setActionError(null);
      await downloadPaymentProof(api, paymentId);
    } catch {
      setActionError("No se pudo descargar el comprobante.");
    }
  };

  if (isLoading) {
    return (
      <div className="grid place-items-center py-10">
        <Spinner />
      </div>
    );
  }
  if (error) return <Card className="p-4 text-sm text-rose-600 dark:text-rose-200">{error}</Card>;
  if (!course) return null;

  const requisitos = asList(course.requisitos);
  const objetivos = asList(course.objetivos);

  const docenteNombre = `${course.docente.nombres} ${course.docente.apellidos}`.trim();
  const duracionLabel = course.duracion_horas ? `${course.duracion_horas} h` : null;
  const isPaid = course.tipo_acceso === "pago";
  const priceLabel = course.tipo_acceso === "gratis" ? "Gratis" : formatMoneyGTQ(course.precio);
  const safePaymentLink = normalizePaymentLinkInput(course.payment_link);
  const needsPaymentSession = isPaid && !token;
  const authRedirect = encodeURIComponent(`/courses/${course.slug}`);
  const paymentLoginPath = `/auth/login?redirect=${authRedirect}`;
  const paymentRegisterPath = `/auth/register?redirect=${authRedirect}`;

  const payEstado = payInfo?.payment?.estado ?? null;
  const enrollEstado = payInfo?.enrollment?.estado ?? accessInfo?.estado_inscripcion ?? null;
  const accessPill = !isPaid
    ? <Badge variant="green">Acceso libre</Badge>
    : payEstado
      ? statusBadge(payEstado)
      : enrollEstado === "pendiente"
        ? <Badge variant="amber">En revisión</Badge>
        : null;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8 space-y-6 min-w-0">
        {/* Header */}
        <Card className="p-5 md:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="slate">{course.categoria.nombre}</Badge>
              <Badge variant="blue">{course.nivel}</Badge>
              <Badge variant={course.tipo_acceso === "gratis" ? "green" : "amber"}>
                {course.tipo_acceso === "gratis" ? "Gratis" : "Pago"}
              </Badge>
              {accessPill ? <span className="ml-auto">{accessPill}</span> : null}
            </div>

            <div className="grid gap-3">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white md:text-3xl">
                {course.titulo}
              </h1>
              <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="inline-flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                      <path d="M20 21a8 8 0 1 0-16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{docenteNombre}</span>
                </div>
                {duracionLabel ? (
                  <div className="inline-flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{duracionLabel}</span>
                  </div>
                ) : null}
              </div>

              {course.descripcion_corta ? (
                <p className="max-w-3xl text-sm text-slate-700 dark:text-slate-300">
                  {course.descripcion_corta}
                </p>
              ) : null}
            </div>
          </div>
        </Card>

        {/* Payment instructions */}
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 p-4 md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Instrucciones</div>
                <div className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">
                  {isPaid ? "Completa tu pago sin errores" : "Acceso al curso"}
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {isPaid
                    ? "Realiza el pago, descarga tu voucher y súbelo como comprobante para validar tu inscripción."
                    : "Este curso no requiere comprobante de pago para iniciar."}
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Badge variant="slate">{priceLabel}</Badge>
              </div>
            </div>
          </div>

          {isPaid ? (
            <div className="grid gap-4 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-5 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 md:grid-cols-3 md:p-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-cyan-400/10 dark:text-cyan-200 dark:ring-cyan-300/20">
                  <span className="text-sm font-black">1</span>
                </div>
                <div className="mt-4 text-sm font-black text-slate-900 dark:text-white">Realiza el pago</div>
                <div className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Usa el botón de BI Pay del panel derecho para completar el pago del curso.
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-400/20">
                  <span className="text-sm font-black">2</span>
                </div>
                <div className="mt-4 text-sm font-black text-slate-900 dark:text-white">Descarga el voucher</div>
                <div className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Antes de cerrar la ventana del banco, descarga o guarda el voucher/comprobante.
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20">
                  <span className="text-sm font-black">3</span>
                </div>
                <div className="mt-4 text-sm font-black text-slate-900 dark:text-white">Sube el comprobante</div>
                <div className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Adjunta el voucher en el formulario de abajo para que un admin lo revise y apruebe.
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-5 dark:bg-slate-950/70 md:p-6">
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold leading-6 text-emerald-900 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-100">
                Puedes inscribirte gratis y entrar al curso sin subir comprobante.
              </div>
            </div>
          )}
        </Card>

        {/* Content (solo si hay módulos cargados) */}
        {!modulesError && modules.length > 0 ? (
          <Card className="p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Contenido del curso</div>
                <div className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">Módulos y lecciones</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {token ? "Las lecciones disponibles dependen de tu acceso." : "Inicia sesión para ver contenido completo si aplica."}
                </div>
              </div>
              <div className="shrink-0">
                {modulesLoading ? <Badge variant="slate">Cargando</Badge> : <Badge variant="slate">{modules.length} módulos</Badge>}
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              {modules.map((m) => {
                const open = openModuleId === m.id;
                const lessons = lessonsByModuleId[m.id] || null;
                const lLoading = !!lessonsLoadingIds[m.id];
                return (
                  <div key={m.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/90">
                    <button
                      type="button"
                      onClick={() => setOpenModuleId((prev) => (prev === m.id ? null : m.id))}
                      className={classNames(
                        "w-full flex items-center justify-between gap-3 px-4 py-3 text-left",
                        "transition hover:bg-slate-50 dark:hover:bg-slate-800/80"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{m.titulo}</div>
                        {m.descripcion ? <div className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-400">{m.descripcion}</div> : null}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {lLoading ? <Badge variant="slate">…</Badge> : lessons ? <Badge variant="slate">{lessons.length} lecciones</Badge> : <Badge variant="slate">Ver</Badge>}
                        <svg viewBox="0 0 24 24" className={classNames("h-4 w-4 text-slate-500 transition dark:text-slate-400", open ? "rotate-180" : "")} fill="none" aria-hidden="true">
                          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </button>

                    {open ? (
                      <div className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/70">
                        {lLoading ? (
                          <div className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">Cargando lecciones…</div>
                        ) : lessons && lessons.length === 0 ? (
                          <div className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">Sin lecciones disponibles.</div>
                        ) : (
                          <div className="divide-y divide-slate-200 dark:divide-slate-800">
                            {(lessons || []).map((l) => (
                              <div key={l.id} className="flex items-center gap-3 px-4 py-3">
                                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                                  <LessonTypeIcon tipo={l.tipo} />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{l.titulo}</div>
                                    {l.es_preview ? <Badge variant="amber">Preview</Badge> : null}
                                  </div>
                                  <div className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-400">
                                    {l.tipo.toUpperCase()}
                                    {l.duracion_minutos ? ` · ${l.duracion_minutos} min` : ""}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}

        {/* Description */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5 md:p-6">
            <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Sobre el curso</div>
            <div className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">Descripción</div>
            <div className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
              {course.descripcion || course.descripcion_corta || "Sin descripción."}
            </div>
          </Card>

          <div className="grid gap-6">
            <Card className="p-5 md:p-6">
              <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Lo que aprenderás</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">Objetivos</div>
              {objetivos.length ? (
                <ul className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-300">
                  {objetivos.slice(0, 8).map((x, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">Objetivos no configurados.</div>
              )}
            </Card>

            <Card className="p-5 md:p-6">
              <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Antes de comenzar</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">Requisitos</div>
              {requisitos.length ? (
                <ul className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-300">
                  {requisitos.slice(0, 8).map((x, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">Sin requisitos.</div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="lg:col-span-4 space-y-4">
        <div className="lg:sticky lg:top-24 space-y-4">
          <Card className="p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Acceso</div>
                <div className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{priceLabel}</div>
                <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {isPaid
                    ? needsPaymentSession
                      ? "Inicia sesión o crea una cuenta antes de pagar para asociar la transacción a tu curso."
                      : safePaymentLink
                        ? "Usa el botón de BI Pay, descarga tu voucher y súbelo abajo como comprobante."
                        : "Paga fuera de la plataforma, guarda tu voucher y súbelo como comprobante."
                    : "Inscripción inmediata."}
                </div>
              </div>
              <div className="shrink-0">{accessPill}</div>
            </div>

            <div className="mt-5 grid gap-2">
              {!isPaid ? (
                accessInfo?.access ? (
                  <Button
                    className="w-full"
                    disabled={accessLoading}
                    onClick={() => navigate(`/student/course/${course.id}/home`)}
                  >
                    Ir al curso
                  </Button>
                ) : (
                  <Button
                    onClick={enrollFree}
                    disabled={isEnrolling || accessLoading || accessInfo?.enrolled === true}
                    className="w-full"
                  >
                    {accessLoading
                      ? "Verificando…"
                      : accessInfo?.enrolled
                        ? "Ya estás inscrito"
                        : isEnrolling
                          ? "Inscribiendo…"
                      : "Inscribirme gratis"}
                  </Button>
                )
              ) : needsPaymentSession ? (
                <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4 shadow-sm dark:border-cyan-400/20 dark:from-slate-900 dark:via-slate-950 dark:to-cyan-950/40">
                  <div className="text-sm font-extrabold text-slate-950 dark:text-white">
                    Primero entra a tu cuenta
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Así podremos guardar tu comprobante, revisar el pago y activar tu inscripción sin errores.
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <Link to={paymentLoginPath} className="block">
                      <Button className="w-full">Iniciar sesión</Button>
                    </Link>
                    <Link to={paymentRegisterPath} className="block">
                      <Button variant="secondary" className="w-full">Crear cuenta</Button>
                    </Link>
                  </div>
                </div>
              ) : safePaymentLink ? (
                <div className="grid gap-3">
                  <Suspense
                    fallback={
                      <div className="grid min-h-[9rem] place-items-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/70">
                        <Spinner />
                      </div>
                    }
                  >
                    <BiPayEmbed paymentLink={course.payment_link} />
                  </Suspense>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
                    Completa el pago, descarga el voucher del banco y luego súbelo en el formulario de comprobante.
                  </div>
                </div>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => {
                    if (!safePaymentLink) return;
                    window.open(safePaymentLink, "_blank", "noopener,noreferrer");
                  }}
                  disabled={!safePaymentLink}
                >
                  {safePaymentLink ? `Abrir pago ${priceLabel}` : "Pago no configurado"}
                </Button>
              )}

              <Link to="/courses" className="block">
                <Button variant="ghost" className="w-full">
                  Volver
                </Button>
              </Link>
            </div>

            {actionError ? <div className="mt-3 text-xs text-rose-600 dark:text-rose-200">{actionError}</div> : null}
          </Card>

          {isPaid && token ? (
            <Card className="p-5 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Comprobante</div>
                  <div className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">Subir comprobante</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Envía una imagen o PDF. Un admin lo revisará.
                  </div>
                </div>
                <div className="shrink-0">
                  {payLoading ? <Badge variant="slate">Cargando</Badge> : payInfo?.payment ? statusBadge(payInfo.payment.estado) : null}
                </div>
              </div>

              {payInfo?.payment?.observaciones && payInfo.payment.estado === "rechazado" ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-100">
                  {payInfo.payment.observaciones}
                </div>
              ) : null}

              <div className="mt-5 grid gap-3">
                <div className="grid gap-1.5">
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-300">Método de pago</div>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as "manual" | "bi_pay")}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none ring-blue-500 focus:ring-2 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100"
                  >
                    <option value="manual">Manual</option>
                    <option value="bi_pay">BiPay</option>
                  </select>
                </div>

                <input
                  ref={proofInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setProofFile(f);
                    e.currentTarget.value = "";
                  }}
                  disabled={uploadingProof}
                />

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="grid gap-3">
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-300">Archivo</div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-slate-900 dark:text-white">
                          {proofFile ? proofFile.name : "Ningún archivo seleccionado"}
                        </div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Formatos: imagen o PDF</div>
                      </div>
                      <button
                        type="button"
                        className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-3 py-2 text-sm font-extrabold text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800"
                        onClick={() => proofInputRef.current?.click()}
                        disabled={uploadingProof}
                      >
                        Subir archivo
                      </button>
                    </div>

                    <button
                      type="button"
                      className={classNames(
                        "w-full rounded-xl px-4 py-2.5 text-sm font-extrabold transition",
                        proofFile && !uploadingProof
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-slate-200 text-slate-500 cursor-not-allowed"
                      )}
                      disabled={!proofFile || uploadingProof}
                      onClick={async () => {
                        if (!proofFile) return;
                        await uploadProof(proofFile);
                        setProofFile(null);
                      }}
                    >
                      {uploadingProof ? "Confirmando…" : "Confirmar"}
                    </button>
                  </div>
                </div>

                {payInfo?.payment?.comprobante_url ? (
                  <button
                    type="button"
                    onClick={() => void downloadProof(payInfo.payment!.id)}
                    className="text-sm font-extrabold text-blue-700 hover:underline dark:text-cyan-300"
                  >
                    Ver comprobante enviado
                  </button>
                ) : null}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
