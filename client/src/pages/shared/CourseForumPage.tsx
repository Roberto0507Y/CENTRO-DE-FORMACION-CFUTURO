import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { PaginationControls } from "../../components/ui/PaginationControls";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { ForumReplyStatus, ForumTopicDetail, ForumTopicListItem, ForumTopicStatus } from "../../types/forum";
import type { CourseManageOutletContext } from "./courseManage.types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function topicStatusBadge(status: ForumTopicStatus) {
  if (status === "activo") return <Badge variant="green">Activo</Badge>;
  if (status === "cerrado") return <Badge variant="amber">Cerrado</Badge>;
  return <Badge variant="slate">Oculto</Badge>;
}

function replyStatusBadge(status: ForumReplyStatus) {
  return status === "activo" ? <Badge variant="green">Visible</Badge> : <Badge variant="slate">Oculta</Badge>;
}

type Mode = "idle" | "create";

type TopicForm = { titulo: string; mensaje: string };
const emptyTopic: TopicForm = { titulo: "", mensaje: "" };
const TOPICS_PAGE_SIZE = 6;
const REPLIES_PAGE_SIZE = 5;

export function CourseForumPage() {
  const ctx = useOutletContext<CourseManageOutletContext>();
  const { api, user } = useAuth();

  const [topics, setTopics] = useState<ForumTopicListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ForumTopicDetail | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [topicPage, setTopicPage] = useState(1);
  const [replyPage, setReplyPage] = useState(1);

  const [topicForm, setTopicForm] = useState<TopicForm>(emptyTopic);
  const [replyMsg, setReplyMsg] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canModerate = user?.rol === "admin" || user?.rol === "docente";

  const topicTotalPages = Math.max(1, Math.ceil(topics.length / TOPICS_PAGE_SIZE));
  const visibleTopics = useMemo(
    () => topics.slice((topicPage - 1) * TOPICS_PAGE_SIZE, topicPage * TOPICS_PAGE_SIZE),
    [topicPage, topics]
  );

  const visibleReplies = useMemo(
    () => detail?.respuestas.slice((replyPage - 1) * REPLIES_PAGE_SIZE, replyPage * REPLIES_PAGE_SIZE) ?? [],
    [detail?.respuestas, replyPage]
  );

  const loadTopics = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      const res = await api.get<ApiResponse<ForumTopicListItem[]>>(`/courses/${ctx.courseId}/forum/topics`);
      setTopics(res.data.data);
      setTopicPage((page) => Math.min(page, Math.max(1, Math.ceil(res.data.data.length / TOPICS_PAGE_SIZE))));
    } catch {
      setError("No se pudieron cargar los temas del foro.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadDetail = async (topicId: number) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await api.get<ApiResponse<ForumTopicDetail>>(`/courses/${ctx.courseId}/forum/topics/${topicId}`);
      setDetail(res.data.data);
    } catch {
      setDetail(null);
      setError("No se pudo cargar el tema.");
    }
  };

  useEffect(() => {
    void loadTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.courseId]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    setReplyPage(1);
  }, [detail?.id]);

  const startCreate = () => {
    setMode("create");
    setTopicPage(1);
    setSelectedId(null);
    setDetail(null);
    setTopicForm(emptyTopic);
    setReplyMsg("");
    setError(null);
    setSuccess(null);
  };

  const cancelCreate = () => {
    setMode("idle");
    setTopicForm(emptyTopic);
    setError(null);
    setSuccess(null);
  };

  const submitTopic = async () => {
    if (isBusy) return;
    if (!topicForm.titulo.trim() || !topicForm.mensaje.trim()) {
      setError("Título y mensaje son requeridos.");
      return;
    }
    setIsBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post<ApiResponse<ForumTopicDetail>>(`/courses/${ctx.courseId}/forum/topics`, {
        titulo: topicForm.titulo.trim(),
        mensaje: topicForm.mensaje.trim(),
      });
      setSuccess("Tema creado.");
      setMode("idle");
      setTopicPage(1);
      await loadTopics();
      setSelectedId(res.data.data.id);
    } catch {
      setError("No se pudo crear el tema.");
    } finally {
      setIsBusy(false);
    }
  };

  const submitReply = async () => {
    if (!detail) return;
    if (isBusy) return;
    if (!replyMsg.trim()) return;
    setIsBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post<ApiResponse<ForumTopicDetail>>(
        `/courses/${ctx.courseId}/forum/topics/${detail.id}/replies`,
        { mensaje: replyMsg.trim() }
      );
      setDetail(res.data.data);
      setReplyPage(Math.max(1, Math.ceil(res.data.data.respuestas.length / REPLIES_PAGE_SIZE)));
      setReplyMsg("");
      setSuccess("Respuesta enviada.");
      await loadTopics();
    } catch {
      setError("No se pudo enviar la respuesta.");
    } finally {
      setIsBusy(false);
    }
  };

  const patchTopic = async (patch: { estado?: ForumTopicStatus; fijado?: 0 | 1 }) => {
    if (!detail) return;
    if (!canModerate) return;
    if (isBusy) return;
    setIsBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.patch<ApiResponse<ForumTopicDetail>>(`/courses/${ctx.courseId}/forum/topics/${detail.id}`, patch);
      setDetail(res.data.data);
      setSuccess("Tema actualizado.");
      await loadTopics();
    } catch {
      setError("No se pudo actualizar el tema.");
    } finally {
      setIsBusy(false);
    }
  };

  const patchReply = async (replyId: number, estado: ForumReplyStatus) => {
    if (!detail) return;
    if (!canModerate) return;
    if (isBusy) return;
    setIsBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.patch<ApiResponse<ForumTopicDetail>>(
        `/courses/${ctx.courseId}/forum/topics/${detail.id}/replies/${replyId}/status`,
        { estado }
      );
      setDetail(res.data.data);
      setSuccess("Respuesta actualizada.");
      await loadTopics();
    } catch {
      setError("No se pudo actualizar la respuesta.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleTopicPageChange = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), topicTotalPages);
    setTopicPage(nextPage);
    setSelectedId(null);
    setDetail(null);
    setReplyMsg("");
  };

  const backToTopics = () => {
    setMode("idle");
    setSelectedId(null);
    setDetail(null);
    setReplyMsg("");
    setSuccess(null);
    setError(null);
  };

  const hasTopics = topics.length > 0;
  const singleEmpty = !isLoading && !hasTopics && mode === "idle";

  // UX rule: si NO hay temas, mostrar un solo empty state principal + una sola acción.
  if (singleEmpty) {
    return (
      <Card className="p-8">
        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {success}
          </div>
        ) : null}
        <EmptyState
          title="Aún no hay temas"
          description="Sé el primero en abrir una conversación para este curso."
          actionLabel="+ Crear tema"
          onAction={startCreate}
        />
      </Card>
    );
  }

  return (
    <div className="cf-course-scope space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Foro</div>
          <div className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">Temas del curso</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Preguntas, dudas y conversación del curso.</div>
        </div>
        {mode === "idle" ? <Button onClick={startCreate}>+ Nuevo tema</Button> : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/35 dark:text-rose-200">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-200">
          {success}
        </div>
      ) : null}

      {isLoading && !hasTopics ? (
        <Card className="border-white/80 bg-white/88 p-6 shadow-[0_24px_72px_-52px_rgba(15,23,42,0.68)] dark:border-slate-800/80 dark:bg-slate-900/92">
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <Spinner />
            Cargando…
          </div>
        </Card>
      ) : null}

      {mode === "create" ? (
        <Card className="border-white/80 bg-white/88 p-6 shadow-[0_24px_72px_-52px_rgba(15,23,42,0.68)] dark:border-slate-800/80 dark:bg-slate-900/92">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Nuevo tema</div>
                <div className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">Crear tema</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Comparte una pregunta o inicia una conversación.</div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={cancelCreate} disabled={isBusy}>
                  Cancelar
                </Button>
                <Button onClick={submitTopic} disabled={isBusy}>
                  {isBusy ? "Creando…" : "Crear"}
                </Button>
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-extrabold text-slate-800 dark:text-slate-100">Título</div>
              <Input
                value={topicForm.titulo}
                onChange={(e) => setTopicForm((s) => ({ ...s, titulo: e.target.value }))}
                placeholder="Ej: Duda sobre la tarea 1…"
              />
            </div>
            <div>
              <div className="mb-2 text-sm font-extrabold text-slate-800 dark:text-slate-100">Mensaje</div>
              <textarea
                className="w-full rounded-2xl border border-slate-200 bg-white/92 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950/85 dark:text-slate-100"
                rows={8}
                value={topicForm.mensaje}
                onChange={(e) => setTopicForm((s) => ({ ...s, mensaje: e.target.value }))}
                placeholder="Describe tu pregunta o contexto…"
              />
            </div>
          </div>
        </Card>
      ) : null}

      {mode === "idle" && hasTopics && !selectedId ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {visibleTopics.map((t) => (
              <Card
                key={t.id}
                className="cursor-pointer border-white/80 bg-white/88 p-5 shadow-[0_22px_60px_-48px_rgba(15,23,42,0.6)] transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800/80 dark:bg-slate-900/92"
                onClick={() => setSelectedId(t.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {t.fijado ? <Badge variant="amber">Fijado</Badge> : null}
                      {topicStatusBadge(t.estado)}
                    </div>
                    <div className="mt-3 truncate text-lg font-black text-slate-900 dark:text-slate-100">{t.titulo}</div>
                    <div className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                      {t.autor.nombres} {t.autor.apellidos} · {formatDate(t.created_at)}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="font-extrabold">{t.respuestas_count}</span>
                      <span>respuestas</span>
                      {t.last_reply_at ? (
                        <>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span>Última: {formatDate(t.last_reply_at)}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <PaginationControls
            page={topicPage}
            pageSize={TOPICS_PAGE_SIZE}
            total={topics.length}
            isLoading={isLoading}
            onPageChange={handleTopicPageChange}
          />
        </div>
      ) : null}

      {mode === "idle" && hasTopics && selectedId ? (
        <div className="space-y-4">
          <Button variant="ghost" onClick={backToTopics}>
            Volver a temas
          </Button>

          <Card className="border-white/80 bg-white/88 p-6 shadow-[0_24px_72px_-52px_rgba(15,23,42,0.68)] dark:border-slate-800/80 dark:bg-slate-900/92">
            {detail ? (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {detail.fijado ? <Badge variant="amber">Fijado</Badge> : null}
                      {topicStatusBadge(detail.estado)}
                    </div>
                    <div className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">{detail.titulo}</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {detail.autor.nombres} {detail.autor.apellidos} · {formatDate(detail.created_at)}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canModerate ? (
                      <>
                        <Button
                          variant="ghost"
                          onClick={() => patchTopic({ fijado: detail.fijado ? 0 : 1 })}
                          disabled={isBusy}
                        >
                          {detail.fijado ? "Quitar fijado" : "Fijar"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => patchTopic({ estado: detail.estado === "cerrado" ? "activo" : "cerrado" })}
                          disabled={isBusy}
                        >
                          {detail.estado === "cerrado" ? "Reabrir" : "Cerrar"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => patchTopic({ estado: detail.estado === "oculto" ? "activo" : "oculto" })}
                          disabled={isBusy}
                        >
                          {detail.estado === "oculto" ? "Mostrar" : "Ocultar"}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-100">{detail.mensaje}</div>

                <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100">Respuestas</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{detail.respuestas_count} en total</div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {detail.respuestas.length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                        Todavía no hay respuestas.
                      </div>
                    ) : (
                      visibleReplies.map((r) => (
                        <div key={r.id} className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-950/65">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                                {r.autor.nombres} {r.autor.apellidos}
                              </div>
                              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDate(r.created_at)}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {canModerate ? replyStatusBadge(r.estado) : null}
                              {canModerate ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => patchReply(r.id, r.estado === "activo" ? "oculto" : "activo")}
                                  disabled={isBusy}
                                >
                                  {r.estado === "activo" ? "Ocultar" : "Mostrar"}
                                </Button>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{r.mensaje}</div>
                        </div>
                      ))
                    )}
                    <PaginationControls
                      page={replyPage}
                      pageSize={REPLIES_PAGE_SIZE}
                      total={detail.respuestas.length}
                      isLoading={isBusy}
                      onPageChange={setReplyPage}
                    />
                  </div>

                  <div className="mt-6">
                    {detail.estado === "cerrado" ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                        Este tema está cerrado. Ya no admite nuevas respuestas.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Responder</div>
                        <textarea
                          className="w-full rounded-2xl border border-slate-200 bg-white/92 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950/85 dark:text-slate-100"
                          rows={4}
                          value={replyMsg}
                          onChange={(e) => setReplyMsg(e.target.value)}
                          placeholder="Escribe tu respuesta…"
                        />
                        <div className="flex justify-end">
                          <Button onClick={submitReply} disabled={isBusy || !replyMsg.trim()}>
                            {isBusy ? "Enviando…" : "Enviar respuesta"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <Spinner />
                Cargando tema...
              </div>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
