import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import { ConfirmDeleteModal } from "../../components/ui/ConfirmDeleteModal";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { Quiz, QuizKind, QuizQuestion, QuizStatus, QuestionType, QuestionStatus, QuizVariant } from "../../types/quiz";
import { getApiErrorMessage } from "../../utils/apiError";
import type { CourseManageOutletContext } from "./courseManage.types";

type Banner = { tone: "success" | "error"; text: string } | null;
type TabKey = "config" | "questions" | "results";

function quizBadge(s: QuizStatus) {
  if (s === "publicado") return <Badge variant="green">Publicado</Badge>;
  if (s === "cerrado") return <Badge variant="amber">Cerrado</Badge>;
  return <Badge variant="slate">Borrador</Badge>;
}

function questionBadge(s: QuestionStatus) {
  return s === "activo" ? <Badge variant="green">Activa</Badge> : <Badge variant="slate">Inactiva</Badge>;
}

function quizKindBadge(kind: QuizKind) {
  return kind === "admision" ? <Badge variant="amber">Admisión</Badge> : <Badge variant="blue">Quiz regular</Badge>;
}

function toLocalInputValue(mysqlDatetime: string | null) {
  if (!mysqlDatetime) return "";
  return mysqlDatetime.replace(" ", "T").slice(0, 16);
}
function toMysqlDatetime(local: string) {
  if (!local) return null;
  const v = local.replace("T", " ");
  return v.length === 16 ? `${v}:00` : v;
}

function sortQuestions(items: QuizQuestion[]) {
  return [...items].sort((a, b) => {
    const orderDiff = Number(a.orden ?? 0) - Number(b.orden ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return a.id - b.id;
  });
}

function roundPoints(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function formatPoints(value: number) {
  const rounded = roundPoints(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(3).replace(/\.?0+$/, "");
}

function normalizeAnswerInput(value: string) {
  return value.trim().toLowerCase();
}

function hasQuestionVariants(question: Pick<
  QuizQuestion,
  "respuesta_correcta_a" | "respuesta_correcta_b" | "respuesta_correcta_c" | "respuesta_correcta_d"
>) {
  return [
    question.respuesta_correcta_a,
    question.respuesta_correcta_b,
    question.respuesta_correcta_c,
    question.respuesta_correcta_d,
  ].some((answer) => (answer ?? "").trim().length > 0);
}

type QuizForm = {
  titulo: string;
  descripcion: string;
  instrucciones: string;
  tipo: QuizKind;
  puntaje_total: string;
  porcentaje_aprobacion: string;
  precio_admision: string;
  payment_link_admision: string;
  tiempo_limite_minutos: string;
  intentos_permitidos: string;
  requiere_pago_reintento: boolean;
  fecha_apertura: string;
  fecha_cierre: string;
  mostrar_resultado_inmediato: boolean;
  estado: QuizStatus;
};

type QuestionForm = {
  enunciado: string;
  tipo: QuestionType;
  opcion_a: string;
  opcion_b: string;
  opcion_c: string;
  opcion_d: string;
  respuesta_correcta: string;
  respuesta_correcta_a: string;
  respuesta_correcta_b: string;
  respuesta_correcta_c: string;
  respuesta_correcta_d: string;
  explicacion: string;
  puntos: string;
  orden: string;
  estado: QuestionStatus;
};

const emptyQuizForm: QuizForm = {
  titulo: "",
  descripcion: "",
  instrucciones: "",
  tipo: "regular",
  puntaje_total: "100",
  porcentaje_aprobacion: "60",
  precio_admision: "0",
  payment_link_admision: "",
  tiempo_limite_minutos: "",
  intentos_permitidos: "1",
  requiere_pago_reintento: false,
  fecha_apertura: "",
  fecha_cierre: "",
  mostrar_resultado_inmediato: true,
  estado: "borrador",
};

const emptyQuestionForm: QuestionForm = {
  enunciado: "",
  tipo: "opcion_unica",
  opcion_a: "",
  opcion_b: "",
  opcion_c: "",
  opcion_d: "",
  respuesta_correcta: "",
  respuesta_correcta_a: "",
  respuesta_correcta_b: "",
  respuesta_correcta_c: "",
  respuesta_correcta_d: "",
  explicacion: "",
  puntos: "1",
  orden: "1",
  estado: "activo",
};

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-sm font-extrabold transition ${
        active
          ? "bg-slate-900 text-white shadow-sm shadow-slate-900/10"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

export function CourseQuizzesPage() {
  const { api } = useAuth();
  const ctx = useOutletContext<CourseManageOutletContext>();

  const [banner, setBanner] = useState<Banner>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Quiz[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = useMemo(() => items.find((q) => q.id === selectedId) ?? null, [items, selectedId]);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<QuizForm>(emptyQuizForm);
  const [tab, setTab] = useState<TabKey>("config");
  const [creating, setCreating] = useState(false);

  const [qLoading, setQLoading] = useState(false);
  const [qError, setQError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qModal, setQModal] = useState(false);
  const [qEditing, setQEditing] = useState<QuizQuestion | null>(null);
  const [pendingDeleteQuestion, setPendingDeleteQuestion] = useState<QuizQuestion | null>(null);
  const [qForm, setQForm] = useState<QuestionForm>(emptyQuestionForm);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setBanner(null);
      const res = await api.get<ApiResponse<Quiz[]>>(`/courses/${ctx.courseId}/quizzes`);
      setItems(res.data.data);
      setSelectedId((prev) => {
        if (prev && res.data.data.some((quiz) => quiz.id === prev)) return prev;
        return res.data.data[0]?.id ?? null;
      });
      setCreating(false);
    } catch (err) {
      setItems([]);
      setSelectedId(null);
      setCreating(false);
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudieron cargar los quizzes.") });
    } finally {
      setLoading(false);
    }
  }, [api, ctx.courseId]);

  const loadQuestions = useCallback(async (quizId: number) => {
    try {
      setQLoading(true);
      setQError(null);
      const res = await api.get<ApiResponse<QuizQuestion[]>>(`/courses/${ctx.courseId}/quizzes/${quizId}/questions`);
      setQuestions(res.data.data);
    } catch (err) {
      setQuestions([]);
      setQError(getApiErrorMessage(err, "No se pudieron cargar las preguntas."));
    } finally {
      setQLoading(false);
    }
  }, [api, ctx.courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selected) {
      setForm(emptyQuizForm);
      setQuestions([]);
      setQError(null);
      setTab("config");
      return;
    }
    setCreating(false);
    setForm({
      titulo: selected.titulo,
      descripcion: selected.descripcion ?? "",
      instrucciones: selected.instrucciones ?? "",
      tipo: selected.tipo ?? "regular",
      puntaje_total: String(selected.puntaje_total ?? "100"),
      porcentaje_aprobacion: String(selected.porcentaje_aprobacion ?? "60"),
      precio_admision: String(selected.precio_admision ?? "0"),
      payment_link_admision: selected.payment_link_admision ?? "",
      tiempo_limite_minutos: selected.tiempo_limite_minutos ? String(selected.tiempo_limite_minutos) : "",
      intentos_permitidos: String(selected.intentos_permitidos ?? 1),
      requiere_pago_reintento: selected.requiere_pago_reintento === 1,
      fecha_apertura: toLocalInputValue(selected.fecha_apertura),
      fecha_cierre: toLocalInputValue(selected.fecha_cierre),
      mostrar_resultado_inmediato: selected.mostrar_resultado_inmediato === 1,
      estado: selected.estado,
    });
    void loadQuestions(selected.id);
    setTab("config");
  }, [loadQuestions, selected]);

  const createNew = () => {
    setSelectedId(null);
    setCreating(true);
    setForm({ ...emptyQuizForm, estado: "borrador" });
    setQuestions([]);
    setQError(null);
    setTab("config");
    setBanner(null);
  };

  const configuredTotalPoints = useMemo(() => {
    const total = Number((selected?.puntaje_total ?? form.puntaje_total) || "0");
    return Number.isFinite(total) && total > 0 ? roundPoints(total) : 0;
  }, [form.puntaje_total, selected]);

  const questionStats = useMemo(() => {
    const active = questions.filter((q) => q.estado === "activo");
    const total = questions.length;
    const activeCount = active.length;
    const pointsSum = roundPoints(active.reduce((acc, q) => acc + (Number(q.puntos) || 0), 0));
    const byType = active.reduce(
      (acc, q) => {
        acc[q.tipo] += 1;
        return acc;
      },
      { opcion_unica: 0, verdadero_falso: 0, respuesta_corta: 0 } as Record<QuestionType, number>
    );
    return { total, activeCount, pointsSum, byType };
  }, [questions]);

  const questionValidation = useMemo(() => {
    const errors: Record<string, string> = {};

    if (!qForm.enunciado.trim()) errors.enunciado = "Escribe el enunciado.";

    const points = Number(qForm.puntos || "0");
    if (!Number.isFinite(points) || points <= 0) {
      errors.puntos = "Los puntos deben ser mayores a 0.";
    }

    const order = Number(qForm.orden || "0");
    if (!Number.isFinite(order) || order <= 0) {
      errors.orden = "El orden debe ser mayor a 0.";
    }

    const variantAnswers: Array<[QuizVariant, string]> = [
      ["A", qForm.respuesta_correcta_a],
      ["B", qForm.respuesta_correcta_b],
      ["C", qForm.respuesta_correcta_c],
      ["D", qForm.respuesta_correcta_d],
    ];
    const hasVariants = variantAnswers.some(([, answer]) => answer.trim().length > 0);

    if (qForm.tipo === "opcion_unica") {
      const options = [
        qForm.opcion_a.trim(),
        qForm.opcion_b.trim(),
        qForm.opcion_c.trim(),
        qForm.opcion_d.trim(),
      ].filter(Boolean);

      if (options.length < 2) {
        errors.options = "Agrega al menos dos opciones.";
      }

      if (!["a", "b", "c", "d"].includes(qForm.respuesta_correcta.trim().toLowerCase())) {
        errors.respuesta_correcta = "Selecciona cuál opción es la correcta.";
      }

      if (hasVariants) {
        variantAnswers.forEach(([variant, answer]) => {
          if (!["a", "b", "c", "d"].includes(answer.trim().toLowerCase())) {
            errors[`respuesta_correcta_${variant.toLowerCase()}`] =
              `Selecciona la respuesta de la variante ${variant}.`;
          }
        });
      }
    } else if (qForm.tipo === "verdadero_falso") {
      const answer = qForm.respuesta_correcta.trim().toLowerCase();
      if (answer !== "verdadero" && answer !== "falso") {
        errors.respuesta_correcta = "Selecciona si la respuesta correcta es verdadero o falso.";
      }

      if (hasVariants) {
        variantAnswers.forEach(([variant, value]) => {
          const normalized = value.trim().toLowerCase();
          if (normalized !== "verdadero" && normalized !== "falso") {
            errors[`respuesta_correcta_${variant.toLowerCase()}`] =
              `Selecciona verdadero o falso para la variante ${variant}.`;
          }
        });
      }
    } else if (!qForm.respuesta_correcta.trim()) {
      errors.respuesta_correcta = "La respuesta correcta es obligatoria.";
    } else if (hasVariants) {
      variantAnswers.forEach(([variant, answer]) => {
        if (!answer.trim()) {
          errors[`respuesta_correcta_${variant.toLowerCase()}`] =
            `Escribe la respuesta de la variante ${variant}.`;
        }
      });
    }

    const editingContribution =
      qEditing && qEditing.estado === "activo" ? Number(qEditing.puntos || "0") : 0;
    const activePointsWithoutCurrent = roundPoints(Math.max(questionStats.pointsSum - editingContribution, 0));
    const nextContribution = qForm.estado === "activo" && Number.isFinite(points) && points > 0 ? points : 0;
    const projectedPoints = roundPoints(activePointsWithoutCurrent + nextContribution);
    const availablePoints = roundPoints(Math.max(configuredTotalPoints - activePointsWithoutCurrent, 0));

    if (
      qForm.estado === "activo" &&
      Number.isFinite(points) &&
      points > 0 &&
      configuredTotalPoints > 0 &&
      projectedPoints - configuredTotalPoints > 1e-9
    ) {
      errors.puntos_budget = `Esta pregunta supera el puntaje total del quiz. Disponible: ${formatPoints(
        availablePoints
      )} pts de ${formatPoints(configuredTotalPoints)}.`;
    }

    return {
      ok: Object.keys(errors).length === 0,
      errors,
      activePointsWithoutCurrent,
      availablePoints,
      projectedPoints,
    };
  }, [configuredTotalPoints, qEditing, qForm, questionStats.pointsSum]);

  const saveQuiz = async () => {
    try {
      setSaving(true);
      setBanner(null);
      const payload = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() ? form.descripcion.trim() : null,
        instrucciones: form.instrucciones.trim() ? form.instrucciones.trim() : null,
        tipo: form.tipo,
        puntaje_total: Number(form.puntaje_total || "100"),
        porcentaje_aprobacion: Number(form.porcentaje_aprobacion || "60"),
        precio_admision: form.tipo === "admision" ? Number(form.precio_admision || "0") : 0,
        payment_link_admision:
          form.tipo === "admision" && form.payment_link_admision.trim()
            ? form.payment_link_admision.trim()
            : null,
        tiempo_limite_minutos: form.tiempo_limite_minutos ? Number(form.tiempo_limite_minutos) : null,
        intentos_permitidos: Number(form.intentos_permitidos || "1"),
        requiere_pago_reintento: form.requiere_pago_reintento,
        fecha_apertura: toMysqlDatetime(form.fecha_apertura),
        fecha_cierre: toMysqlDatetime(form.fecha_cierre),
        mostrar_resultado_inmediato: form.mostrar_resultado_inmediato,
      };
      if (!selected) {
        const res = await api.post<ApiResponse<Quiz>>(`/courses/${ctx.courseId}/quizzes`, {
          ...payload,
          estado: form.estado,
        });
        setBanner({ tone: "success", text: "Quiz creado." });
        await load();
        setSelectedId(res.data.data.id);
      } else {
        await api.put(`/courses/${ctx.courseId}/quizzes/${selected.id}`, payload);
        setBanner({ tone: "success", text: "Quiz actualizado." });
        await load();
      }
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo guardar el quiz.") });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (estado: QuizStatus) => {
    if (!selected) return;
    try {
      setSaving(true);
      setBanner(null);
      await api.patch(`/courses/${ctx.courseId}/quizzes/${selected.id}/status`, { estado });
      setBanner({ tone: "success", text: "Estado actualizado." });
      await load();
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo cambiar el estado.") });
    } finally {
      setSaving(false);
    }
  };

  const openCreateQuestion = () => {
    setQEditing(null);
    setQForm(emptyQuestionForm);
    setQModal(true);
  };

  const openEditQuestion = (q: QuizQuestion) => {
    setQEditing(q);
    setQForm({
      enunciado: q.enunciado,
      tipo: q.tipo,
      opcion_a: q.opcion_a ?? "",
      opcion_b: q.opcion_b ?? "",
      opcion_c: q.opcion_c ?? "",
      opcion_d: q.opcion_d ?? "",
      respuesta_correcta: q.respuesta_correcta ?? "",
      respuesta_correcta_a: q.respuesta_correcta_a ?? "",
      respuesta_correcta_b: q.respuesta_correcta_b ?? "",
      respuesta_correcta_c: q.respuesta_correcta_c ?? "",
      respuesta_correcta_d: q.respuesta_correcta_d ?? "",
      explicacion: q.explicacion ?? "",
      puntos: String(q.puntos ?? "1"),
      orden: String(q.orden ?? 1),
      estado: q.estado,
    });
    setQModal(true);
  };

  const saveQuestion = async () => {
    if (!selected) return;
    if (!questionValidation.ok) {
      const firstError = Object.values(questionValidation.errors)[0] ?? "Revisa los campos de la pregunta.";
      setBanner({ tone: "error", text: firstError });
      return;
    }
    try {
      setSaving(true);
      setBanner(null);
      const payload = {
        enunciado: qForm.enunciado.trim(),
        tipo: qForm.tipo,
        opcion_a: qForm.opcion_a.trim() ? qForm.opcion_a.trim() : null,
        opcion_b: qForm.opcion_b.trim() ? qForm.opcion_b.trim() : null,
        opcion_c: qForm.opcion_c.trim() ? qForm.opcion_c.trim() : null,
        opcion_d: qForm.opcion_d.trim() ? qForm.opcion_d.trim() : null,
        respuesta_correcta: normalizeAnswerInput(qForm.respuesta_correcta),
        respuesta_correcta_a: qForm.respuesta_correcta_a.trim()
          ? normalizeAnswerInput(qForm.respuesta_correcta_a)
          : null,
        respuesta_correcta_b: qForm.respuesta_correcta_b.trim()
          ? normalizeAnswerInput(qForm.respuesta_correcta_b)
          : null,
        respuesta_correcta_c: qForm.respuesta_correcta_c.trim()
          ? normalizeAnswerInput(qForm.respuesta_correcta_c)
          : null,
        respuesta_correcta_d: qForm.respuesta_correcta_d.trim()
          ? normalizeAnswerInput(qForm.respuesta_correcta_d)
          : null,
        explicacion: qForm.explicacion.trim() ? qForm.explicacion.trim() : null,
        puntos: Number(qForm.puntos || "1"),
        orden: Number(qForm.orden || "1"),
        estado: qForm.estado,
      };

      if (!qEditing) {
        const res = await api.post<ApiResponse<QuizQuestion>>(
          `/courses/${ctx.courseId}/quizzes/${selected.id}/questions`,
          payload
        );
        setQuestions((prev) => sortQuestions([...prev, res.data.data]));
        setBanner({ tone: "success", text: "Pregunta creada." });
      } else {
        const res = await api.put<ApiResponse<QuizQuestion>>(
          `/courses/${ctx.courseId}/quizzes/${selected.id}/questions/${qEditing.id}`,
          payload
        );
        setQuestions((prev) =>
          sortQuestions(prev.map((item) => (item.id === qEditing.id ? res.data.data : item)))
        );
        setBanner({ tone: "success", text: "Pregunta actualizada." });
      }
      setQModal(false);
      setQEditing(null);
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo guardar la pregunta.") });
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (q: QuizQuestion) => {
    if (!selected) return;
    try {
      setSaving(true);
      setBanner(null);
      await api.delete(`/courses/${ctx.courseId}/quizzes/${selected.id}/questions/${q.id}`);
      setQuestions((prev) => prev.filter((item) => item.id !== q.id));
      setBanner({ tone: "success", text: "Pregunta eliminada." });
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo eliminar la pregunta.") });
    } finally {
      setSaving(false);
      setPendingDeleteQuestion(null);
    }
  };

  const quizTitle = selected?.titulo ?? (form.titulo.trim() ? form.titulo.trim() : "Nuevo quiz");
  const remainingPoints = roundPoints(Math.max(configuredTotalPoints - questionStats.pointsSum, 0));

  const hasItems = items.length > 0;
  const showForm = Boolean(selected) || creating;

  // UX rule: si NO hay quizzes y no estamos creando, mostramos 1 empty state principal + 1 acción.
  if (!loading && !hasItems && !creating) {
    return (
      <Card className="p-8">
        {banner ? (
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
              banner.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
            role="status"
          >
            {banner.text}
          </div>
        ) : null}
        <EmptyState
          title="Aún no has creado un quiz"
          description="Crea tu primer quiz para evaluar el aprendizaje del curso."
          actionLabel="+ Crear quiz"
          onAction={createNew}
        />
      </Card>
    );
  }

  return (
    <div className={hasItems ? "grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]" : "grid gap-6"}>
      {/* Lista quizzes (solo si hay quizzes) */}
      {hasItems ? (
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-900">Quizzes</div>
              <div className="mt-1 text-xs text-slate-500">Curso: {ctx.courseTitle}</div>
            </div>
            <Button size="sm" onClick={createNew}>
              + Nuevo
            </Button>
          </div>

          {loading ? (
            <div className="grid place-items-center py-10">
              <Spinner />
            </div>
          ) : (
            <div className="mt-4 grid gap-2">
              {items.map((q) => (
                <button
                  key={q.id}
                  className={`rounded-2xl border p-3 text-left transition ${
                    selectedId === q.id
                      ? "border-blue-200 bg-blue-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                  onClick={() => {
                    setSelectedId(q.id);
                    setCreating(false);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-slate-900">{q.titulo}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-600">
                        {quizKindBadge(q.tipo ?? "regular")}
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1">
                          Intentos: <span className="text-slate-900">{q.intentos_permitidos}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1">
                          Tiempo:{" "}
                          <span className="text-slate-900">
                            {q.tiempo_limite_minutos ? `${q.tiempo_limite_minutos}m` : "—"}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">{quizBadge(q.estado)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {/* Editor + preguntas */}
      <div className="min-w-0 space-y-4">
        {!showForm ? (
          <Card className="p-8">
            <EmptyState
              title="Selecciona un quiz"
              description="Selecciona un quiz de la lista para editar o crea uno nuevo."
              actionLabel="+ Crear quiz"
              onAction={createNew}
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 bg-white px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Quiz</div>
                  <div className="mt-2 text-xl font-black tracking-tight text-slate-900 line-clamp-2">
                    {quizTitle}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {selected ? quizBadge(selected.estado) : quizBadge(form.estado)}
                    {selected ? quizKindBadge(selected.tipo ?? "regular") : quizKindBadge(form.tipo)}
                    {selected ? <Badge variant="slate">ID: {selected.id}</Badge> : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => void saveQuiz()} disabled={saving} className="h-11 px-4">
                    {saving ? "Guardando…" : "Guardar cambios"}
                  </Button>
                  {selected ? (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => toggleStatus("publicado")}
                        disabled={saving}
                      >
                        Publicar
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => toggleStatus("cerrado")} disabled={saving}>
                        Cerrar
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={saving}
                      onClick={() => {
                        setCreating(false);
                        setForm(emptyQuizForm);
                        setQuestions([]);
                        setBanner(null);
                      }}
                    >
                      Cancelar
                    </Button>
                  )}
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

              <div className="mt-5 flex flex-wrap gap-2 rounded-2xl bg-slate-50 p-2">
                <TabButton active={tab === "config"} onClick={() => setTab("config")}>
                  Configuración
                </TabButton>
                <TabButton active={tab === "questions"} onClick={() => setTab("questions")}>
                  Preguntas
                </TabButton>
                <TabButton active={tab === "results"} onClick={() => setTab("results")}>
                  Resultados
                </TabButton>
              </div>
            </div>

            {tab === "config" ? (
            <div className="bg-white px-6 py-6 space-y-6">
              {/* Información básica */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-sm font-black text-slate-900">Información básica</div>
                <div className="mt-1 text-sm text-slate-600">Título, descripción e instrucciones.</div>
                <div className="mt-4 grid gap-4">
                  <div>
                    <div className="text-xs font-extrabold text-slate-700">Título</div>
                    <div className="mt-2">
                      <Input value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-700">Descripción</div>
                    <textarea
                      value={form.descripcion}
                      onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                      rows={3}
                      className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-700">Instrucciones</div>
                    <textarea
                      value={form.instrucciones}
                      onChange={(e) => setForm((p) => ({ ...p, instrucciones: e.target.value }))}
                      rows={4}
                      className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                    />
                  </div>
                </div>
              </div>

              {/* Configuración */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-sm font-black text-slate-900">Configuración</div>
                <div className="mt-1 text-sm text-slate-600">Tipo, puntaje, intentos, tiempo y resultado.</div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-xs font-extrabold text-slate-700">Tipo de evaluación</div>
                    <select
                      value={form.tipo}
                      onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value as QuizKind }))}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-blue-500 focus:ring-2"
                    >
                      <option value="regular">Quiz regular</option>
                      <option value="admision">Examen de admisión</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-700">Puntaje total</div>
                    <div className="mt-2">
                      <Input inputMode="numeric" value={form.puntaje_total} onChange={(e) => setForm((p) => ({ ...p, puntaje_total: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-700">Intentos permitidos</div>
                    <div className="mt-2">
                      <Input inputMode="numeric" value={form.intentos_permitidos} onChange={(e) => setForm((p) => ({ ...p, intentos_permitidos: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-700">Tiempo límite (min)</div>
                    <div className="mt-2">
                      <Input inputMode="numeric" value={form.tiempo_limite_minutos} onChange={(e) => setForm((p) => ({ ...p, tiempo_limite_minutos: e.target.value }))} />
                    </div>
                  </div>
                  <label className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.mostrar_resultado_inmediato}
                      onChange={(e) => setForm((p) => ({ ...p, mostrar_resultado_inmediato: e.target.checked }))}
                    />
                    Mostrar resultado inmediato
                  </label>
                </div>
                {form.tipo === "admision" ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                    <div className="text-sm font-black text-amber-950">Reglas de admisión</div>
                    <div className="mt-1 text-xs font-semibold leading-5 text-amber-900">
                      El alumno debe alcanzar el porcentaje mínimo configurado. Si agota sus oportunidades sin aprobar, el sistema puede bloquear nuevos intentos e indicar que debe pagar nuevamente.
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <div className="text-xs font-extrabold text-slate-700">Porcentaje para aprobar</div>
                        <div className="mt-2">
                          <Input
                            inputMode="numeric"
                            value={form.porcentaje_aprobacion}
                            onChange={(e) => setForm((p) => ({ ...p, porcentaje_aprobacion: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-slate-700">Precio del examen</div>
                        <div className="mt-2">
                          <Input
                            inputMode="decimal"
                            value={form.precio_admision}
                            onChange={(e) => setForm((p) => ({ ...p, precio_admision: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <div className="text-xs font-extrabold text-slate-700">Botón o enlace de pago BI Pay</div>
                        <div className="mt-2">
                          <Input
                            value={form.payment_link_admision}
                            onChange={(e) => setForm((p) => ({ ...p, payment_link_admision: e.target.value }))}
                            placeholder="https://link.ebi.com.gt/... o iframe de BI Pay"
                          />
                        </div>
                        <div className="mt-1 text-xs font-semibold text-amber-900">
                          Si el precio es 0, el alumno podrá intentar el examen sin comprobante previo.
                        </div>
                      </div>
                      <label className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.requiere_pago_reintento}
                          onChange={(e) => setForm((p) => ({ ...p, requiere_pago_reintento: e.target.checked }))}
                        />
                        Si no aprueba, debe pagar de nuevo
                      </label>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Fechas */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-sm font-black text-slate-900">Fechas</div>
                <div className="mt-1 text-sm text-slate-600">Apertura y cierre opcionales.</div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-xs font-extrabold text-slate-700">Apertura</div>
                    <div className="mt-2">
                      <Input type="datetime-local" value={form.fecha_apertura} onChange={(e) => setForm((p) => ({ ...p, fecha_apertura: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-700">Cierre</div>
                    <div className="mt-2">
                      <Input type="datetime-local" value={form.fecha_cierre} onChange={(e) => setForm((p) => ({ ...p, fecha_cierre: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>

              {!selected ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="text-sm font-black text-slate-900">Estado inicial</div>
                  <div className="mt-3">
                    <select
                      value={form.estado}
                      onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value as QuizStatus }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-blue-500 focus:ring-2"
                    >
                      <option value="borrador">Borrador</option>
                      <option value="publicado">Publicado</option>
                      <option value="cerrado">Cerrado</option>
                    </select>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => void load()} disabled={saving}>
                  Actualizar
                </Button>
              </div>
            </div>
          ) : tab === "questions" ? (
            <div className="bg-white px-6 py-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div>
                  <div className="text-sm font-black text-slate-900">Preguntas</div>
                  <div className="mt-1 text-sm text-slate-600">Agrega preguntas y define respuesta correcta.</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                    <Badge variant="slate">Total quiz: {formatPoints(configuredTotalPoints)} pts</Badge>
                    <Badge variant="blue">Asignado: {formatPoints(questionStats.pointsSum)} pts</Badge>
                    <Badge variant={remainingPoints === 0 ? "green" : "amber"}>
                      Disponible: {formatPoints(remainingPoints)} pts
                    </Badge>
                  </div>
                </div>
                <Button size="sm" onClick={openCreateQuestion} disabled={!selected}>
                  + Agregar pregunta
                </Button>
              </div>

              {!selected ? (
                <EmptyState title="Selecciona un quiz" description="Primero crea o selecciona un quiz para agregar preguntas." />
              ) : qLoading ? (
                <div className="grid place-items-center py-10">
                  <Spinner />
                </div>
              ) : qError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
                  <div className="font-black">No se pudieron cargar las preguntas</div>
                  <div className="mt-2">{qError}</div>
                  <div className="mt-4">
                    <Button size="sm" variant="secondary" onClick={() => void loadQuestions(selected.id)}>
                      Reintentar
                    </Button>
                  </div>
                </div>
              ) : questions.length === 0 ? (
                <EmptyState
                  title="Sin preguntas"
                  description="Crea la primera pregunta para este quiz."
                  actionLabel="Agregar pregunta"
                  onAction={openCreateQuestion}
                />
              ) : (
                <div className="grid gap-3">
                  {questions.map((q) => (
                    <Card key={q.id} className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="slate">#{q.orden}</Badge>
                            {questionBadge(q.estado)}
                            <Badge variant="blue">{q.tipo}</Badge>
                            <Badge variant="slate">{q.puntos} pts</Badge>
                            {hasQuestionVariants(q) ? <Badge variant="amber">Variantes A-D</Badge> : null}
                          </div>
                          <div className="mt-3 text-sm font-semibold text-slate-900 whitespace-pre-wrap">
                            {q.enunciado}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => openEditQuestion(q)}>
                            Editar
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => setPendingDeleteQuestion(q)}>
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white px-6 py-6 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-sm font-black text-slate-900">Resultados</div>
                <div className="mt-1 text-sm text-slate-600">
                  Resumen del quiz y control del puntaje total configurado.
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Card className="p-5">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Preguntas</div>
                  <div className="mt-2 text-2xl font-black text-slate-900">{questionStats.activeCount}</div>
                  <div className="mt-1 text-xs text-slate-500">Activas / total: {questionStats.total}</div>
                </Card>
                <Card className="p-5">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Puntos (activos)</div>
                  <div className="mt-2 text-2xl font-black text-slate-900">{formatPoints(questionStats.pointsSum)}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Puntaje total configurado: {formatPoints(configuredTotalPoints)}
                  </div>
                </Card>
              </div>

              <Card className="p-5">
                <div className="text-sm font-black text-slate-900">Distribución por tipo</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="blue">Opción única: {questionStats.byType.opcion_unica}</Badge>
                  <Badge variant="blue">V/F: {questionStats.byType.verdadero_falso}</Badge>
                  <Badge variant="blue">Respuesta corta: {questionStats.byType.respuesta_corta}</Badge>
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  {questionStats.activeCount === 0
                    ? "No hay preguntas activas. Publicar no tendrá efecto hasta que agregues preguntas."
                    : questionStats.pointsSum === configuredTotalPoints
                      ? "Los puntos de las preguntas activas coinciden con el puntaje total."
                      : `Aún faltan ${formatPoints(remainingPoints)} pts para completar el puntaje total del quiz.`}
                </div>
              </Card>
            </div>
          )}
          </Card>
        )}
      </div>

      {qModal ? (
        <QuestionModal
          title={qEditing ? "Editar pregunta" : "Nueva pregunta"}
          saving={saving}
          value={qForm}
          errors={questionValidation.errors}
          budget={{
            configuredTotal: configuredTotalPoints,
            usedWithoutCurrent: questionValidation.activePointsWithoutCurrent,
            available: questionValidation.availablePoints,
            projectedTotal: questionValidation.projectedPoints,
          }}
          onChange={setQForm}
          onClose={() => {
            setQModal(false);
            setQEditing(null);
          }}
          onSave={() => void saveQuestion()}
        />
      ) : null}

      <ConfirmDeleteModal
        open={Boolean(pendingDeleteQuestion)}
        title="¿Eliminar pregunta?"
        description="Esta pregunta quedará inactiva y no se tomará en cuenta para el quiz."
        confirmLabel="Eliminar"
        isLoading={saving}
        onCancel={() => setPendingDeleteQuestion(null)}
        onConfirm={() => {
          if (pendingDeleteQuestion) void deleteQuestion(pendingDeleteQuestion);
        }}
      />
    </div>
  );
}

function QuestionModal({
  title,
  saving,
  value,
  errors,
  budget,
  onChange,
  onClose,
  onSave,
}: {
  title: string;
  saving: boolean;
  value: QuestionForm;
  errors: Record<string, string>;
  budget: {
    configuredTotal: number;
    usedWithoutCurrent: number;
    available: number;
    projectedTotal: number;
  };
  onChange: (v: QuestionForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const showOptions = value.tipo === "opcion_unica";
  const showTF = value.tipo === "verdadero_falso";
  const canSave = !saving && Object.keys(errors).length === 0;
  const optionChoices = [
    { value: "a", label: value.opcion_a.trim() ? `A · ${value.opcion_a.trim()}` : "A", enabled: value.opcion_a.trim().length > 0 },
    { value: "b", label: value.opcion_b.trim() ? `B · ${value.opcion_b.trim()}` : "B", enabled: value.opcion_b.trim().length > 0 },
    { value: "c", label: value.opcion_c.trim() ? `C · ${value.opcion_c.trim()}` : "C", enabled: value.opcion_c.trim().length > 0 },
    { value: "d", label: value.opcion_d.trim() ? `D · ${value.opcion_d.trim()}` : "D", enabled: value.opcion_d.trim().length > 0 },
  ];
  const variantFields: Array<{
    variant: QuizVariant;
    key: "respuesta_correcta_a" | "respuesta_correcta_b" | "respuesta_correcta_c" | "respuesta_correcta_d";
  }> = [
    { variant: "A", key: "respuesta_correcta_a" },
    { variant: "B", key: "respuesta_correcta_b" },
    { variant: "C", key: "respuesta_correcta_c" },
    { variant: "D", key: "respuesta_correcta_d" },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true">
      <Card className="mx-auto my-6 w-full max-w-3xl overflow-hidden">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-black text-slate-900">{title}</div>
              <div className="mt-1 text-sm text-slate-600">Configura el tipo, opciones y respuesta correcta.</div>
            </div>
            <Button variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto bg-white p-6 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <div className="font-extrabold text-slate-900">Control de puntaje</div>
            <div className="mt-1">
              Total del quiz: <span className="font-bold">{formatPoints(budget.configuredTotal)} pts</span>
              {" · "}
              Asignado: <span className="font-bold">{formatPoints(budget.usedWithoutCurrent)} pts</span>
              {" · "}
              Disponible para esta pregunta: <span className="font-bold">{formatPoints(budget.available)} pts</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Si esta pregunta queda activa, el quiz proyectado quedará en {formatPoints(budget.projectedTotal)} pts.
            </div>
          </div>

          <div>
            <div className="text-xs font-extrabold text-slate-700">Enunciado</div>
            <textarea
              value={value.enunciado}
              onChange={(e) => onChange({ ...value, enunciado: e.target.value })}
              rows={4}
              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            />
            {errors.enunciado ? <div className="mt-2 text-xs font-bold text-rose-700">{errors.enunciado}</div> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs font-extrabold text-slate-700">Tipo</div>
              <select
                value={value.tipo}
                onChange={(e) => {
                  const nextType = e.target.value as QuestionType;
                  const currentAnswer = value.respuesta_correcta.trim().toLowerCase();
                  onChange({
                    ...value,
                    tipo: nextType,
                    respuesta_correcta:
                      nextType === "verdadero_falso"
                        ? currentAnswer === "falso"
                          ? "falso"
                          : "verdadero"
                        : nextType === "opcion_unica"
                          ? ["a", "b", "c", "d"].includes(currentAnswer)
                            ? currentAnswer
                            : "a"
                          : "",
                    respuesta_correcta_a: "",
                    respuesta_correcta_b: "",
                    respuesta_correcta_c: "",
                    respuesta_correcta_d: "",
                  });
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-blue-500 focus:ring-2"
              >
                <option value="opcion_unica">Opción única</option>
                <option value="verdadero_falso">Verdadero/Falso</option>
                <option value="respuesta_corta">Respuesta corta</option>
              </select>
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-700">Estado</div>
              <select
                value={value.estado}
                onChange={(e) => onChange({ ...value, estado: e.target.value as QuestionStatus })}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-blue-500 focus:ring-2"
              >
                <option value="activo">Activa</option>
                <option value="inactivo">Inactiva</option>
              </select>
            </div>
          </div>

          {showOptions ? (
            <div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input value={value.opcion_a} onChange={(e) => onChange({ ...value, opcion_a: e.target.value })} placeholder="Opción A" />
                <Input value={value.opcion_b} onChange={(e) => onChange({ ...value, opcion_b: e.target.value })} placeholder="Opción B" />
                <Input value={value.opcion_c} onChange={(e) => onChange({ ...value, opcion_c: e.target.value })} placeholder="Opción C" />
                <Input value={value.opcion_d} onChange={(e) => onChange({ ...value, opcion_d: e.target.value })} placeholder="Opción D" />
              </div>
              {errors.options ? <div className="mt-2 text-xs font-bold text-rose-700">{errors.options}</div> : null}
            </div>
          ) : null}

          {showTF ? (
            <div className="text-sm text-slate-600">
              Para verdadero/falso, usa <span className="font-bold">verdadero</span> o <span className="font-bold">falso</span> como respuesta correcta.
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs font-extrabold text-slate-700">Respuesta correcta</div>
              {showOptions ? (
                <select
                  value={value.respuesta_correcta.trim().toLowerCase()}
                  onChange={(e) => onChange({ ...value, respuesta_correcta: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-blue-500 focus:ring-2"
                >
                  <option value="">Selecciona una opción</option>
                  {optionChoices
                    .filter((item) => item.enabled)
                    .map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                </select>
              ) : showTF ? (
                <select
                  value={value.respuesta_correcta.trim().toLowerCase() || "verdadero"}
                  onChange={(e) => onChange({ ...value, respuesta_correcta: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-blue-500 focus:ring-2"
                >
                  <option value="verdadero">Verdadero</option>
                  <option value="falso">Falso</option>
                </select>
              ) : (
                <Input value={value.respuesta_correcta} onChange={(e) => onChange({ ...value, respuesta_correcta: e.target.value })} />
              )}
              {errors.respuesta_correcta ? (
                <div className="mt-2 text-xs font-bold text-rose-700">{errors.respuesta_correcta}</div>
              ) : null}
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div>
                <div className="text-xs font-extrabold text-slate-700">Puntos</div>
                <Input inputMode="numeric" value={value.puntos} onChange={(e) => onChange({ ...value, puntos: e.target.value })} />
                {errors.puntos ? <div className="mt-2 text-xs font-bold text-rose-700">{errors.puntos}</div> : null}
                {errors.puntos_budget ? (
                  <div className="mt-2 text-xs font-bold text-rose-700">{errors.puntos_budget}</div>
                ) : null}
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-700">Orden</div>
                <Input inputMode="numeric" value={value.orden} onChange={(e) => onChange({ ...value, orden: e.target.value })} />
                {errors.orden ? <div className="mt-2 text-xs font-bold text-rose-700">{errors.orden}</div> : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
            <div className="text-sm font-black text-slate-900">Variantes A/B/C/D (opcional)</div>
            <div className="mt-1 text-xs font-semibold text-slate-600">
              Si llenas estas respuestas, cada alumno recibirá una variante aleatoria al iniciar el quiz.
              Para activar variantes debes completar A, B, C y D.
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {variantFields.map(({ variant, key }) => (
                <div key={variant}>
                  <div className="text-xs font-extrabold text-slate-700">Variante {variant}</div>
                  {showOptions ? (
                    <select
                      value={value[key].trim().toLowerCase()}
                      onChange={(e) => onChange({ ...value, [key]: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-cyan-500 focus:ring-2"
                    >
                      <option value="">Sin variante</option>
                      {optionChoices
                        .filter((item) => item.enabled)
                        .map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                    </select>
                  ) : showTF ? (
                    <select
                      value={value[key].trim().toLowerCase()}
                      onChange={(e) => onChange({ ...value, [key]: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-cyan-500 focus:ring-2"
                    >
                      <option value="">Sin variante</option>
                      <option value="verdadero">Verdadero</option>
                      <option value="falso">Falso</option>
                    </select>
                  ) : (
                    <Input
                      value={value[key]}
                      onChange={(e) => onChange({ ...value, [key]: e.target.value })}
                      placeholder={`Respuesta variante ${variant}`}
                    />
                  )}
                  {errors[`respuesta_correcta_${variant.toLowerCase()}`] ? (
                    <div className="mt-2 text-xs font-bold text-rose-700">
                      {errors[`respuesta_correcta_${variant.toLowerCase()}`]}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-extrabold text-slate-700">Explicación (opcional)</div>
            <textarea
              value={value.explicacion}
              onChange={(e) => onChange({ ...value, explicacion: e.target.value })}
              rows={3}
              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            />
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white/95 px-6 py-4">
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={onSave} disabled={!canSave}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
