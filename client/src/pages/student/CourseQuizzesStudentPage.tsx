import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { AttemptResult, Quiz, QuizQuestionPublic, QuizVariant, StartQuizResponse } from "../../types/quiz";
import { getApiErrorMessage } from "../../utils/apiError";

type Banner = { tone: "success" | "error"; text: string } | null;
type Stage = "list" | "taking" | "result";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-GT");
}

function secondsFromMinutes(min: number | null) {
  if (!min || min <= 0) return null;
  return min * 60;
}

function mmss(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CourseQuizzesStudentPage() {
  const { api } = useAuth();
  const { courseId } = useParams();
  const id = Number(courseId);

  const [banner, setBanner] = useState<Banner>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Quiz[]>([]);

  const [stage, setStage] = useState<Stage>("list");
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [variant, setVariant] = useState<QuizVariant | null>(null);
  const [startingQuizId, setStartingQuizId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionPublic[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setBanner(null);
      const res = await api.get<ApiResponse<Quiz[]>>(`/courses/${id}/quizzes`);
      setItems(res.data.data);
    } catch (err) {
      setItems([]);
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudieron cargar los quizzes.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (stage !== "taking") return;
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      void submit();
      return;
    }
    const t = window.setTimeout(() => setTimeLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, timeLeft]);

  const start = async (quiz: Quiz) => {
    if (startingQuizId !== null) return;
    try {
      setStartingQuizId(quiz.id);
      setBanner(null);
      const res = await api.post<ApiResponse<StartQuizResponse>>(`/courses/${id}/quizzes/${quiz.id}/start`, {});
      setActiveQuiz(res.data.data.quiz);
      setAttemptId(res.data.data.intento_id);
      setVariant(res.data.data.variante);
      setQuestions(res.data.data.preguntas);
      setAnswers({});
      setResult(null);
      const secs = secondsFromMinutes(res.data.data.quiz.tiempo_limite_minutos);
      setTimeLeft(secs);
      setStage("taking");
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo iniciar el quiz.") });
    } finally {
      setStartingQuizId(null);
    }
  };

  const submit = async () => {
    if (!activeQuiz || !attemptId) return;
    if (submitting) return;
    try {
      setSubmitting(true);
      setBanner(null);
      const payload = {
        respuestas: questions.map((q) => ({
          pregunta_id: q.id,
          respuesta_usuario: answers[q.id] ?? null,
        })),
      };
      const res = await api.post<ApiResponse<AttemptResult>>(
        `/courses/${id}/quizzes/${activeQuiz.id}/attempts/${attemptId}/submit`,
        payload
      );
      setResult(res.data.data);
      setStage("result");
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo enviar el quiz.") });
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = useMemo(() => Object.keys(answers).filter((k) => (answers[Number(k)] ?? "").trim().length > 0).length, [answers]);

  if (loading) {
    return (
      <div className="grid place-items-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-lg font-black tracking-tight text-slate-900">Quizzes</div>
          <div className="mt-1 text-sm text-slate-600">Responde quizzes publicados del curso.</div>
        </div>
        <Link to={`/student/course/${id}`}>
          <Button variant="secondary" size="sm">
            Volver al curso
          </Button>
        </Link>
      </div>

      {banner ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            banner.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
          role="status"
        >
          {banner.text}
        </div>
      ) : null}

      {stage === "list" ? (
        items.length === 0 ? (
          <EmptyState title="Sin quizzes" description="Cuando tu docente publique quizzes, aparecerán aquí." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((q) => (
              <Card key={q.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base font-black text-slate-900">{q.titulo}</div>
                    <div className="mt-1 text-sm text-slate-600 line-clamp-2">{q.descripcion ?? "—"}</div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {q.tipo === "admision" ? <Badge variant="amber">Examen de admisión</Badge> : null}
                      <Badge variant="blue">Intentos: {q.intentos_permitidos}</Badge>
                      {q.tipo === "admision" ? (
                        <Badge variant="green">Aprobación: {q.porcentaje_aprobacion}%</Badge>
                      ) : null}
                      {q.tiempo_limite_minutos ? <Badge variant="amber">Tiempo: {q.tiempo_limite_minutos} min</Badge> : <Badge variant="slate">Sin tiempo</Badge>}
                      <Badge variant="green">Publicado</Badge>
                    </div>
                    {q.tipo === "admision" && q.requiere_pago_reintento === 1 ? (
                      <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                        Si agotas tus oportunidades sin aprobar, deberás realizar un nuevo pago para habilitar más intentos.
                      </div>
                    ) : null}
                    <div className="mt-2 text-xs text-slate-500">
                      Apertura: {formatDate(q.fecha_apertura)} · Cierre: {formatDate(q.fecha_cierre)}
                    </div>
                  </div>
                  <Button onClick={() => void start(q)} className="shrink-0" disabled={startingQuizId !== null}>
                    {startingQuizId === q.id ? "Iniciando…" : "Iniciar"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : stage === "taking" && activeQuiz ? (
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-black text-slate-900">{activeQuiz.titulo}</div>
              <div className="mt-1 text-sm text-slate-600">{activeQuiz.instrucciones ?? "Responde todas las preguntas."}</div>
              <div className="mt-2 text-xs text-slate-500">
                Respondidas: <span className="font-bold text-slate-700">{answeredCount}</span> / {questions.length}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {variant ? <Badge variant="blue">Variante {variant}</Badge> : null}
              {timeLeft !== null ? <Badge variant="amber">Tiempo: {mmss(Math.max(0, timeLeft))}</Badge> : <Badge variant="slate">Sin tiempo</Badge>}
              <Button onClick={() => void submit()} disabled={submitting}>
                {submitting ? "Enviando…" : "Enviar"}
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {questions.map((q, idx) => (
              <Card key={q.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-black uppercase tracking-wider text-slate-500">Pregunta {idx + 1}</div>
                    <div className="mt-2 text-sm font-extrabold text-slate-900 whitespace-pre-wrap">{q.enunciado}</div>
                  </div>
                  <Badge variant="slate">{q.puntos} pts</Badge>
                </div>

                <div className="mt-4">
                  {q.tipo === "respuesta_corta" ? (
                    <Input
                      value={answers[q.id] ?? ""}
                      onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                      placeholder="Escribe tu respuesta…"
                    />
                  ) : (
                    <div className="grid gap-2">
                      {q.tipo === "verdadero_falso" ? (
                        ["verdadero", "falso"].map((opt) => (
                          <label key={opt} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800">
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              checked={(answers[q.id] ?? "") === opt}
                              onChange={() => setAnswers((p) => ({ ...p, [q.id]: opt }))}
                            />
                            {opt === "verdadero" ? "Verdadero" : "Falso"}
                          </label>
                        ))
                      ) : (
                        [
                          q.opcion_a ? { key: "a", text: q.opcion_a } : null,
                          q.opcion_b ? { key: "b", text: q.opcion_b } : null,
                          q.opcion_c ? { key: "c", text: q.opcion_c } : null,
                          q.opcion_d ? { key: "d", text: q.opcion_d } : null,
                        ]
                          .filter(Boolean)
                          .map((o) => (
                            <label key={(o as { key: string }).key} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800">
                              <input
                                type="radio"
                                name={`q-${q.id}`}
                                checked={(answers[q.id] ?? "") === (o as { text: string }).text}
                                onChange={() => setAnswers((p) => ({ ...p, [q.id]: (o as { text: string }).text }))}
                              />
                              {(o as { text: string }).text}
                            </label>
                          ))
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="text-lg font-black text-slate-900">Resultado</div>
          {!result ? (
            <div className="mt-2 text-sm text-slate-600">No disponible.</div>
          ) : (
            <>
              <div className="mt-2 text-sm text-slate-600">
                Puntaje:{" "}
                <span className="font-black text-slate-900">
                  {result.puntaje_obtenido} / {result.puntaje_total}
                </span>
              </div>
              {result.intento.variante ? (
                <div className="mt-2">
                  <Badge variant="blue">Variante {result.intento.variante}</Badge>
                </div>
              ) : null}
              {result.aprobado !== null ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={result.aprobado ? "green" : "rose"}>
                      {result.aprobado ? "Admisión aprobada" : "Admisión no aprobada"}
                    </Badge>
                    <Badge variant="slate">
                      {result.porcentaje_obtenido}% / mínimo {result.porcentaje_aprobacion}%
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    {result.aprobado
                      ? "Cumpliste con el porcentaje requerido para aprobar el examen de admisión."
                      : "No alcanzaste el porcentaje requerido. Si ya no tienes intentos, necesitarás seguir el proceso de pago indicado por la plataforma."}
                  </div>
                </div>
              ) : null}
              {result.mostrar_resultado && result.detalle ? (
                <div className="mt-6 grid gap-3">
                  {result.detalle.map((d) => (
                    <Card key={d.pregunta_id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-800">
                          Pregunta #{d.pregunta_id}
                        </div>
                        <Badge variant={d.es_correcta ? "green" : "rose"}>
                          {d.es_correcta ? "Correcta" : "Incorrecta"} · {d.puntos_obtenidos} pts
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm text-slate-700">
                        Tu respuesta: <span className="font-semibold">{d.respuesta_usuario ?? "—"}</span>
                      </div>
                      {d.respuesta_correcta ? (
                        <div className="mt-1 text-sm text-slate-700">
                          Correcta: <span className="font-semibold">{d.respuesta_correcta}</span>
                        </div>
                      ) : null}
                      {d.explicacion ? <div className="mt-2 text-xs text-slate-500">{d.explicacion}</div> : null}
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  El resultado detallado no está disponible.
                </div>
              )}
            </>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setStage("list");
                setActiveQuiz(null);
                setAttemptId(null);
                setVariant(null);
                setQuestions([]);
                setAnswers({});
                setResult(null);
                setTimeLeft(null);
              }}
            >
              Volver a quizzes
            </Button>
            <Link to={`/student/course/${id}`}>
              <Button variant="ghost">Volver al curso</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
