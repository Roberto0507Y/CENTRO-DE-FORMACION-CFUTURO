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
import type { Quiz, QuizQuestion, QuizStatus, QuestionType, QuestionStatus } from "../../types/quiz";
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

function toLocalInputValue(mysqlDatetime: string | null) {
  if (!mysqlDatetime) return "";
  return mysqlDatetime.replace(" ", "T").slice(0, 16);
}
function toMysqlDatetime(local: string) {
  if (!local) return null;
  const v = local.replace("T", " ");
  return v.length === 16 ? `${v}:00` : v;
}

type QuizForm = {
  titulo: string;
  descripcion: string;
  instrucciones: string;
  puntaje_total: string;
  tiempo_limite_minutos: string;
  intentos_permitidos: string;
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
  explicacion: string;
  puntos: string;
  orden: string;
  estado: QuestionStatus;
};

const emptyQuizForm: QuizForm = {
  titulo: "",
  descripcion: "",
  instrucciones: "",
  puntaje_total: "100",
  tiempo_limite_minutos: "",
  intentos_permitidos: "1",
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
      const res = await api.get<ApiResponse<QuizQuestion[]>>(`/courses/${ctx.courseId}/quizzes/${quizId}/questions`);
      setQuestions(res.data.data);
    } catch {
      setQuestions([]);
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
      setTab("config");
      return;
    }
    setCreating(false);
    setForm({
      titulo: selected.titulo,
      descripcion: selected.descripcion ?? "",
      instrucciones: selected.instrucciones ?? "",
      puntaje_total: String(selected.puntaje_total ?? "100"),
      tiempo_limite_minutos: selected.tiempo_limite_minutos ? String(selected.tiempo_limite_minutos) : "",
      intentos_permitidos: String(selected.intentos_permitidos ?? 1),
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
    setTab("config");
    setBanner(null);
  };

  const saveQuiz = async () => {
    try {
      setSaving(true);
      setBanner(null);
      const payload = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() ? form.descripcion.trim() : null,
        instrucciones: form.instrucciones.trim() ? form.instrucciones.trim() : null,
        puntaje_total: Number(form.puntaje_total || "100"),
        tiempo_limite_minutos: form.tiempo_limite_minutos ? Number(form.tiempo_limite_minutos) : null,
        intentos_permitidos: Number(form.intentos_permitidos || "1"),
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
      explicacion: q.explicacion ?? "",
      puntos: String(q.puntos ?? "1"),
      orden: String(q.orden ?? 1),
      estado: q.estado,
    });
    setQModal(true);
  };

  const saveQuestion = async () => {
    if (!selected) return;
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
        respuesta_correcta: qForm.respuesta_correcta.trim(),
        explicacion: qForm.explicacion.trim() ? qForm.explicacion.trim() : null,
        puntos: Number(qForm.puntos || "1"),
        orden: Number(qForm.orden || "1"),
        estado: qForm.estado,
      };

      if (!qEditing) {
        await api.post(`/courses/${ctx.courseId}/quizzes/${selected.id}/questions`, payload);
        setBanner({ tone: "success", text: "Pregunta creada." });
      } else {
        await api.put(`/courses/${ctx.courseId}/quizzes/${selected.id}/questions/${qEditing.id}`, payload);
        setBanner({ tone: "success", text: "Pregunta actualizada." });
      }
      setQModal(false);
      setQEditing(null);
      await loadQuestions(selected.id);
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
      setBanner({ tone: "success", text: "Pregunta eliminada." });
      await loadQuestions(selected.id);
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo eliminar la pregunta.") });
    } finally {
      setSaving(false);
      setPendingDeleteQuestion(null);
    }
  };

  const quizTitle = selected?.titulo ?? (form.titulo.trim() ? form.titulo.trim() : "Nuevo quiz");

  const questionStats = useMemo(() => {
    const active = questions.filter((q) => q.estado === "activo");
    const total = questions.length;
    const activeCount = active.length;
    const pointsSum = active.reduce((acc, q) => acc + (Number(q.puntos) || 0), 0);
    const byType = active.reduce(
      (acc, q) => {
        acc[q.tipo] += 1;
        return acc;
      },
      { opcion_unica: 0, verdadero_falso: 0, respuesta_corta: 0 } as Record<QuestionType, number>
    );
    return { total, activeCount, pointsSum, byType };
  }, [questions]);

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
                <div className="mt-1 text-sm text-slate-600">Puntaje, intentos, tiempo y resultado.</div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                  Resumen del quiz y consistencia de puntajes (no requiere cambios de backend).
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
                  <div className="mt-2 text-2xl font-black text-slate-900">{questionStats.pointsSum}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Puntaje total configurado: {Number(form.puntaje_total || "0")}
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
                    : questionStats.pointsSum === Number(form.puntaje_total || "0")
                      ? "Los puntos de las preguntas activas coinciden con el puntaje total."
                      : "Sugerencia: ajusta el puntaje total o los puntos por pregunta para que coincidan (opcional)."}
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
  onChange,
  onClose,
  onSave,
}: {
  title: string;
  saving: boolean;
  value: QuestionForm;
  onChange: (v: QuestionForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const showOptions = value.tipo === "opcion_unica";
  const showTF = value.tipo === "verdadero_falso";

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
          <div>
            <div className="text-xs font-extrabold text-slate-700">Enunciado</div>
            <textarea
              value={value.enunciado}
              onChange={(e) => onChange({ ...value, enunciado: e.target.value })}
              rows={4}
              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs font-extrabold text-slate-700">Tipo</div>
              <select
                value={value.tipo}
                onChange={(e) => onChange({ ...value, tipo: e.target.value as QuestionType })}
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
            <div className="grid gap-3 md:grid-cols-2">
              <Input value={value.opcion_a} onChange={(e) => onChange({ ...value, opcion_a: e.target.value })} placeholder="Opción A" />
              <Input value={value.opcion_b} onChange={(e) => onChange({ ...value, opcion_b: e.target.value })} placeholder="Opción B" />
              <Input value={value.opcion_c} onChange={(e) => onChange({ ...value, opcion_c: e.target.value })} placeholder="Opción C" />
              <Input value={value.opcion_d} onChange={(e) => onChange({ ...value, opcion_d: e.target.value })} placeholder="Opción D" />
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
              <Input value={value.respuesta_correcta} onChange={(e) => onChange({ ...value, respuesta_correcta: e.target.value })} />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div>
                <div className="text-xs font-extrabold text-slate-700">Puntos</div>
                <Input inputMode="numeric" value={value.puntos} onChange={(e) => onChange({ ...value, puntos: e.target.value })} />
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-700">Orden</div>
                <Input inputMode="numeric" value={value.orden} onChange={(e) => onChange({ ...value, orden: e.target.value })} />
              </div>
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
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
