import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type {
  AdmissionAttemptDetail,
  AdmissionResultItem,
  AdmissionStudentDetail,
  Quiz,
} from "../../types/quiz";
import { getApiErrorMessage } from "../../utils/apiError";
import type { CourseManageOutletContext } from "./courseManage.types";

type Banner = { tone: "success" | "error"; text: string } | null;

function roundPoints(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function formatPoints(value: number) {
  const rounded = roundPoints(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(3).replace(/\.?0+$/, "");
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
}

function admissionOutcomeBadge(item: AdmissionResultItem) {
  if (item.aprobado) return <Badge variant="green">Aprobado</Badge>;
  if (item.completados > 0) return <Badge variant="rose">No aprobado</Badge>;
  if (item.intentos > 0) return <Badge variant="amber">En proceso</Badge>;
  if (item.pago_estado === "pagado") return <Badge variant="blue">Listo para iniciar</Badge>;
  return <Badge variant="slate">Sin intento</Badge>;
}

function admissionPaymentBadge(status: AdmissionResultItem["pago_estado"]) {
  if (status === "pagado") return <Badge variant="green">Pago aprobado</Badge>;
  if (status === "pendiente") return <Badge variant="amber">Pago pendiente</Badge>;
  if (status === "rechazado") return <Badge variant="rose">Pago rechazado</Badge>;
  if (status === "reembolsado") return <Badge variant="slate">Reembolsado</Badge>;
  return <Badge variant="slate">Sin pago</Badge>;
}

function attemptBadge(attempt: AdmissionAttemptDetail) {
  if (!attempt.completado) return <Badge variant="amber">Intento abierto</Badge>;
  return <Badge variant={attempt.aprobado ? "green" : "rose"}>{attempt.aprobado ? "Aprobado" : "No aprobado"}</Badge>;
}

export function CourseAdmissionsPage() {
  const { api } = useAuth();
  const ctx = useOutletContext<CourseManageOutletContext>();
  const courseId = ctx.courseId;
  const manageBase = ctx.base === "admin" || ctx.base === "teacher" ? ctx.base : "teacher";
  const quizzesHref = `/${manageBase}/course/${courseId}/quizzes`;

  const [banner, setBanner] = useState<Banner>(null);
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const selectedQuiz = useMemo(
    () => quizzes.find((quiz) => quiz.id === selectedQuizId) ?? null,
    [quizzes, selectedQuizId]
  );

  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [results, setResults] = useState<AdmissionResultItem[]>([]);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdmissionStudentDetail | null>(null);
  const [scoreDrafts, setScoreDrafts] = useState<Record<number, string>>({});
  const [savingAttemptId, setSavingAttemptId] = useState<number | null>(null);

  const loadQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      setBanner(null);
      const res = await api.get<ApiResponse<Quiz[]>>(`/courses/${courseId}/quizzes`);
      const admissionOnly = res.data.data.filter((item) => item.tipo === "admision");
      setQuizzes(admissionOnly);
      setSelectedQuizId((prev) => {
        if (prev && admissionOnly.some((item) => item.id === prev)) return prev;
        return admissionOnly[0]?.id ?? null;
      });
    } catch (err) {
      setQuizzes([]);
      setSelectedQuizId(null);
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudieron cargar los exámenes de admisión.") });
    } finally {
      setLoading(false);
    }
  }, [api, courseId]);

  const loadResults = useCallback(
    async (quizId: number) => {
      try {
        setResultsLoading(true);
        setResultsError(null);
        const res = await api.get<ApiResponse<AdmissionResultItem[]>>(
          `/courses/${courseId}/quizzes/${quizId}/admission-results`
        );
        setResults(res.data.data);
      } catch (err) {
        setResults([]);
        setResultsError(getApiErrorMessage(err, "No se pudieron cargar los resultados de admisión."));
      } finally {
        setResultsLoading(false);
      }
    },
    [api, courseId]
  );

  const openDetail = useCallback(
    async (studentId: number) => {
      if (!selectedQuiz) return;
      try {
        setDetailLoading(true);
        setDetailError(null);
        const res = await api.get<ApiResponse<AdmissionStudentDetail>>(
          `/courses/${courseId}/quizzes/${selectedQuiz.id}/admission-results/${studentId}`
        );
        setDetail(res.data.data);
        setScoreDrafts(
          Object.fromEntries(
            res.data.data.intentos_detalle.map((attempt) => [
              attempt.id,
              attempt.puntaje_obtenido === null ? "" : String(attempt.puntaje_obtenido),
            ])
          )
        );
      } catch (err) {
        setDetail(null);
        setDetailError(getApiErrorMessage(err, "No se pudo cargar el detalle del alumno."));
      } finally {
        setDetailLoading(false);
      }
    },
    [api, courseId, selectedQuiz]
  );

  useEffect(() => {
    void loadQuizzes();
  }, [loadQuizzes]);

  useEffect(() => {
    if (!selectedQuiz) {
      setResults([]);
      setResultsError(null);
      return;
    }
    void loadResults(selectedQuiz.id);
  }, [loadResults, selectedQuiz]);

  useEffect(() => {
    setDetail(null);
    setDetailError(null);
    setDetailLoading(false);
  }, [selectedQuizId]);

  const stats = useMemo(() => {
    const approved = results.filter((item) => item.aprobado).length;
    const failed = results.filter((item) => !item.aprobado && item.completados > 0).length;
    const pending = results.filter((item) => !item.aprobado && item.completados === 0).length;
    const paid = results.filter((item) => item.pago_estado === "pagado").length;
    return { approved, failed, pending, paid, total: results.length };
  }, [results]);

  const saveManualScore = async (attemptId: number) => {
    if (!selectedQuiz || !detail) return;
    const raw = scoreDrafts[attemptId] ?? "";
    const score = Number(raw);
    if (!Number.isFinite(score) || score < 0) {
      setBanner({ tone: "error", text: "Ingresa una nota válida mayor o igual a 0." });
      return;
    }

    try {
      setSavingAttemptId(attemptId);
      setBanner(null);
      const res = await api.patch<ApiResponse<AdmissionStudentDetail>>(
        `/courses/${courseId}/quizzes/${selectedQuiz.id}/admission-attempts/${attemptId}/score`,
        { puntaje_obtenido: score }
      );
      setDetail(res.data.data);
      setScoreDrafts(
        Object.fromEntries(
          res.data.data.intentos_detalle.map((attempt) => [
            attempt.id,
            attempt.puntaje_obtenido === null ? "" : String(attempt.puntaje_obtenido),
          ])
        )
      );
      setBanner({ tone: "success", text: "Nota de admisión actualizada." });
      await loadResults(selectedQuiz.id);
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo actualizar la nota del intento.") });
    } finally {
      setSavingAttemptId(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-900">Admisión</div>
            <div className="mt-1 text-xs text-slate-500">Curso: {ctx.courseTitle}</div>
          </div>
          <Link to={quizzesHref}>
            <Button size="sm" variant="secondary">Ir a quizzes</Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid place-items-center py-10">
            <Spinner />
          </div>
        ) : quizzes.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Sin examen de admisión"
              description="Crea o publica primero un examen de admisión desde el módulo de quizzes."
              actionLabel="Abrir quizzes"
              onAction={() => {
                window.location.href = quizzesHref;
              }}
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-2">
            {quizzes.map((quiz) => (
              <button
                key={quiz.id}
                type="button"
                onClick={() => {
                  setSelectedQuizId(quiz.id);
                  setDetail(null);
                  setDetailError(null);
                }}
                className={`rounded-2xl border p-4 text-left transition ${
                  selectedQuizId === quiz.id
                    ? "border-cyan-200 bg-cyan-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-slate-900">{quiz.titulo}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-slate-600">
                      <Badge variant="amber">Admisión</Badge>
                      <Badge variant="blue">Intentos: {quiz.intentos_permitidos}</Badge>
                      <Badge variant="green">Meta: {quiz.porcentaje_aprobacion}%</Badge>
                    </div>
                  </div>
                  <Badge variant={quiz.estado === "publicado" ? "green" : quiz.estado === "cerrado" ? "amber" : "slate"}>
                    {quiz.estado}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <div className="min-w-0 space-y-4">
        {banner ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              banner.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
            role="status"
          >
            {banner.text}
          </div>
        ) : null}

        {!selectedQuiz ? (
          <Card className="p-8">
            <EmptyState
              title="Selecciona un examen"
              description="Elige un examen de admisión para revisar quién ganó, con qué nota y corregir si hace falta."
            />
          </Card>
        ) : (
          <>
            <Card className="border-cyan-100 bg-cyan-50/50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-900">Detalle de admisión</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Revisa la nota con la que ganó cada alumno, sus respuestas publicadas y corrige puntajes si hubo una mala calificación automática.
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void loadResults(selectedQuiz.id)}
                  disabled={resultsLoading}
                >
                  {resultsLoading ? "Actualizando…" : "Actualizar"}
                </Button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Aprobados" value={stats.approved} tone="emerald" />
                <StatCard label="No aprobados" value={stats.failed} tone="rose" />
                <StatCard label="Pendientes" value={stats.pending} tone="amber" />
                <StatCard label="Pagos aprobados" value={stats.paid} tone="blue" />
              </div>
            </Card>

            {resultsLoading ? (
              <Card className="grid place-items-center py-12">
                <Spinner />
              </Card>
            ) : resultsError ? (
              <Card className="border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-800">
                {resultsError}
              </Card>
            ) : stats.total === 0 ? (
              <Card className="p-6 text-sm text-slate-600">
                Aún no hay alumnos con pago o intento registrado para este examen de admisión.
              </Card>
            ) : (
              <div className="grid gap-3">
                {results.map((item) => {
                  const scoreLabel =
                    item.mejor_puntaje === null
                      ? "—"
                      : `${formatPoints(item.mejor_puntaje)} / ${formatPoints(item.puntaje_total)}`;

                  return (
                    <Card key={item.usuario_id} className="border-cyan-100 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-black text-slate-900">
                            {item.apellidos}, {item.nombres}
                          </div>
                          <div className="mt-1 truncate text-sm text-slate-600">{item.correo}</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {admissionOutcomeBadge(item)}
                          {admissionPaymentBadge(item.pago_estado)}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                        <Metric label={item.aprobado ? "Ganó con" : "Mejor nota"} value={scoreLabel} />
                        <Metric
                          label="Porcentaje"
                          value={item.porcentaje === null ? "—" : `${formatPoints(item.porcentaje)}%`}
                        />
                        <Metric
                          label="Intentos"
                          value={`${item.completados} completados / ${item.intentos} iniciados`}
                        />
                        <Metric
                          label="Último movimiento"
                          value={formatDateTime(item.fecha_ultimo_intento ?? item.fecha_ultimo_pago)}
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => void openDetail(item.usuario_id)}>
                          Ver detalle y respuestas
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {detail || detailLoading || detailError ? (
        <AdmissionDetailModal
          detail={detail}
          loading={detailLoading}
          error={detailError}
          scoreDrafts={scoreDrafts}
          savingAttemptId={savingAttemptId}
          onClose={() => {
            setDetail(null);
            setDetailError(null);
            setDetailLoading(false);
          }}
          onScoreChange={(attemptId, value) =>
            setScoreDrafts((prev) => ({
              ...prev,
              [attemptId]: value,
            }))
          }
          onSaveScore={(attemptId) => void saveManualScore(attemptId)}
        />
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "rose" | "amber" | "blue";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "rose"
        ? "text-rose-700"
        : tone === "amber"
          ? "text-amber-700"
          : "text-blue-700";

  return (
    <div className="rounded-2xl border border-cyan-100 bg-white p-4">
      <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-black ${toneClass}`}>{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 font-black text-slate-900">{value}</div>
    </div>
  );
}

function AdmissionDetailModal({
  detail,
  loading,
  error,
  scoreDrafts,
  savingAttemptId,
  onClose,
  onScoreChange,
  onSaveScore,
}: {
  detail: AdmissionStudentDetail | null;
  loading: boolean;
  error: string | null;
  scoreDrafts: Record<number, string>;
  savingAttemptId: number | null;
  onClose: () => void;
  onScoreChange: (attemptId: number, value: string) => void;
  onSaveScore: (attemptId: number) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45 p-4" role="dialog" aria-modal="true">
      <Card className="mx-auto my-6 w-full max-w-6xl overflow-hidden">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-black text-slate-900">Detalle de admisión</div>
              <div className="mt-1 text-sm text-slate-600">
                {detail
                  ? `${detail.apellidos}, ${detail.nombres} · ${detail.quiz_titulo}`
                  : "Cargando detalle del alumno"}
              </div>
            </div>
            <Button variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>

        <div className="max-h-[78vh] overflow-y-auto bg-white p-6">
          {loading ? (
            <div className="grid place-items-center py-16">
              <Spinner />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
              {error}
            </div>
          ) : !detail ? null : (
            <div className="space-y-5">
              <Card className="border-cyan-100 bg-cyan-50/40 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-lg font-black text-slate-900">
                      {detail.apellidos}, {detail.nombres}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">{detail.correo}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {admissionOutcomeBadge(detail)}
                      {admissionPaymentBadge(detail.pago_estado)}
                      <Badge variant="blue">Meta: {formatPoints(detail.porcentaje_aprobacion)}%</Badge>
                      <Badge variant="slate">Intentos: {detail.intentos_permitidos}</Badge>
                    </div>
                  </div>
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <Metric
                      label={detail.aprobado ? "Ganó con" : "Mejor nota"}
                      value={
                        detail.mejor_puntaje === null
                          ? "—"
                          : `${formatPoints(detail.mejor_puntaje)} / ${formatPoints(detail.puntaje_total)}`
                      }
                    />
                    <Metric
                      label="Último intento"
                      value={formatDateTime(detail.fecha_ultimo_intento ?? detail.fecha_ultimo_pago)}
                    />
                  </div>
                </div>
              </Card>

              {detail.intentos_detalle.length === 0 ? (
                <Card className="p-5 text-sm text-slate-600">
                  Este alumno todavía no tiene intentos registrados.
                </Card>
              ) : (
                <div className="space-y-4">
                  {detail.intentos_detalle.map((attempt) => (
                    <Card key={attempt.id} className="overflow-hidden border-slate-200">
                      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="slate">Intento #{attempt.numero_intento}</Badge>
                              {attemptBadge(attempt)}
                              {attempt.variante ? <Badge variant="blue">Variante {attempt.variante}</Badge> : null}
                            </div>
                            <div className="mt-2 text-sm text-slate-600">
                              Inicio: {formatDateTime(attempt.fecha_inicio)} · Fin: {formatDateTime(attempt.fecha_fin)}
                            </div>
                          </div>
                          <div className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                            <Metric
                              label="Nota"
                              value={
                                attempt.puntaje_obtenido === null
                                  ? "—"
                                  : `${formatPoints(attempt.puntaje_obtenido)} / ${formatPoints(attempt.puntaje_total)}`
                              }
                            />
                            <Metric
                              label="Porcentaje"
                              value={
                                attempt.porcentaje_obtenido === null
                                  ? "—"
                                  : `${formatPoints(attempt.porcentaje_obtenido)}%`
                              }
                            />
                            <Metric
                              label="Meta"
                              value={`${formatPoints(attempt.porcentaje_aprobacion)}%`}
                            />
                            <Metric
                              label="Respuestas"
                              value={`${attempt.respuestas.length} publicadas`}
                            />
                          </div>
                        </div>

                        {attempt.completado ? (
                          <div className="mt-4 rounded-2xl border border-cyan-100 bg-white p-4">
                            <div className="flex flex-wrap items-end gap-3">
                              <div className="w-full max-w-xs">
                                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                                  Corregir nota manualmente
                                </div>
                                <div className="mt-2">
                                  <Input
                                    inputMode="decimal"
                                    value={scoreDrafts[attempt.id] ?? ""}
                                    onChange={(e) => onScoreChange(attempt.id, e.target.value)}
                                  />
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => onSaveScore(attempt.id)}
                                disabled={savingAttemptId === attempt.id}
                              >
                                {savingAttemptId === attempt.id ? "Guardando…" : "Guardar nota"}
                              </Button>
                            </div>
                            <div className="mt-2 text-xs font-semibold text-slate-500">
                              Usa este ajuste solo si la calificación automática necesitó corrección.
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-3 bg-white p-5">
                        <div className="text-sm font-black text-slate-900">Respuestas publicadas</div>
                        {attempt.respuestas.length === 0 ? (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                            Este intento no tiene respuestas guardadas.
                          </div>
                        ) : (
                          attempt.respuestas.map((answer) => (
                            <div
                              key={`${attempt.id}-${answer.pregunta_id}`}
                              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                                    Pregunta {answer.orden}
                                  </div>
                                  <div className="mt-2 whitespace-pre-wrap text-sm font-semibold text-slate-900">
                                    {answer.enunciado}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant={answer.es_correcta ? "green" : "rose"}>
                                    {answer.es_correcta ? "Correcta" : "Incorrecta"}
                                  </Badge>
                                  <Badge variant="slate">
                                    {formatPoints(answer.puntos_obtenidos)} / {formatPoints(answer.puntos_pregunta)} pts
                                  </Badge>
                                </div>
                              </div>
                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                                    Respuesta del alumno
                                  </div>
                                  <div className="mt-2 text-sm font-semibold text-slate-900">
                                    {answer.respuesta_usuario?.trim() ? answer.respuesta_usuario : "Sin respuesta"}
                                  </div>
                                </div>
                                <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-3">
                                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                                    Respuesta publicada
                                  </div>
                                  <div className="mt-2 text-sm font-semibold text-slate-900">
                                    {answer.respuesta_correcta_publicada}
                                  </div>
                                </div>
                              </div>
                              {answer.explicacion ? (
                                <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                                  {answer.explicacion}
                                </div>
                              ) : null}
                            </div>
                          ))
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
