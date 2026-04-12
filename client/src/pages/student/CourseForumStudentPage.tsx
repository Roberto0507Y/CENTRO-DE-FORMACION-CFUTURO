import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { PaginationControls } from "../../components/ui/PaginationControls";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { AccessCheck } from "../../types/enrollment";
import type { ForumTopicDetail, ForumTopicListItem, ForumTopicStatus } from "../../types/forum";

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

const TOPICS_PAGE_SIZE = 6;
const REPLIES_PAGE_SIZE = 5;

export function CourseForumStudentPage() {
  const { courseId } = useParams();
  const courseIdNum = Number(courseId);
  const { api } = useAuth();

  const [access, setAccess] = useState<AccessCheck | null>(null);
  const [topics, setTopics] = useState<ForumTopicListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ForumTopicDetail | null>(null);
  const [topicPage, setTopicPage] = useState(1);
  const [replyPage, setReplyPage] = useState(1);

  const [replyMsg, setReplyMsg] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const topicTotalPages = Math.max(1, Math.ceil(topics.length / TOPICS_PAGE_SIZE));
  const visibleTopics = useMemo(
    () => topics.slice((topicPage - 1) * TOPICS_PAGE_SIZE, topicPage * TOPICS_PAGE_SIZE),
    [topicPage, topics]
  );

  const visibleReplies = useMemo(
    () => detail?.respuestas.slice((replyPage - 1) * REPLIES_PAGE_SIZE, replyPage * REPLIES_PAGE_SIZE) ?? [],
    [detail?.respuestas, replyPage]
  );

  const load = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      const accessRes = await api.get<ApiResponse<AccessCheck>>(`/enrollments/${courseId}/check-access`);
      setAccess(accessRes.data.data);

      const res = await api.get<ApiResponse<ForumTopicListItem[]>>(`/courses/${courseId}/forum/topics`);
      setTopics(res.data.data);
      setTopicPage((page) => Math.min(page, Math.max(1, Math.ceil(res.data.data.length / TOPICS_PAGE_SIZE))));
    } catch {
      setError("No se pudo cargar el foro.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadDetail = async (topicId: number) => {
    setError(null);
    try {
      const res = await api.get<ApiResponse<ForumTopicDetail>>(`/courses/${courseId}/forum/topics/${topicId}`);
      setDetail(res.data.data);
    } catch {
      setDetail(null);
      setError("No se pudo cargar el tema.");
    }
  };

  useEffect(() => {
    if (!Number.isFinite(courseIdNum) || courseIdNum <= 0) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseIdNum]);

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

  const submitReply = async () => {
    if (!detail) return;
    if (isBusy) return;
    if (!replyMsg.trim()) return;
    setIsBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post<ApiResponse<ForumTopicDetail>>(`/courses/${courseId}/forum/topics/${detail.id}/replies`, {
        mensaje: replyMsg.trim(),
      });
      setDetail(res.data.data);
      setReplyPage(Math.max(1, Math.ceil(res.data.data.respuestas.length / REPLIES_PAGE_SIZE)));
      setReplyMsg("");
      setSuccess("Respuesta enviada.");
      await load();
    } catch {
      setError("No se pudo enviar la respuesta.");
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
    setSelectedId(null);
    setDetail(null);
    setReplyMsg("");
    setSuccess(null);
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="grid place-items-center py-10">
        <Spinner />
      </div>
    );
  }

  if (access && !access.access) {
    return (
      <Card className="p-6">
        <div className="text-base font-black text-slate-900">Acceso pendiente</div>
        <div className="mt-2 text-sm text-slate-600">
          {access.estado_inscripcion === "pendiente"
            ? "Tu inscripción está en revisión. Cuando tu pago sea aprobado podrás acceder al contenido."
            : "No tienes acceso a este curso."}
        </div>
        <div className="mt-4">
          <Link to="/student/my-courses">
            <Button variant="secondary">Volver a mis cursos</Button>
          </Link>
        </div>
      </Card>
    );
  }

  const singleEmpty = topics.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-wider text-slate-500">Foro</div>
          <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">Conversación del curso</div>
          <div className="mt-1 text-sm text-slate-600">Lee los temas abiertos por tu docente y participa respondiendo.</div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {success}
        </div>
      ) : null}

      {singleEmpty ? (
        <EmptyState
          title="Aún no hay temas"
          description="Cuando tu docente o un administrador abra una conversación, podrás responder aquí."
        />
      ) : null}

      {!singleEmpty && !selectedId ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {visibleTopics.map((t) => (
              <Card
                key={t.id}
                className="cursor-pointer p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
                onClick={() => setSelectedId(t.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {t.fijado ? <Badge variant="amber">Fijado</Badge> : null}
                      {topicStatusBadge(t.estado)}
                    </div>
                    <div className="mt-3 truncate text-lg font-black text-slate-900">{t.titulo}</div>
                    <div className="mt-1 truncate text-sm text-slate-500">
                      {t.autor.nombres} {t.autor.apellidos} · {formatDate(t.created_at)}
                    </div>
                    <div className="mt-4 text-sm text-slate-600">
                      <span className="font-extrabold">{t.respuestas_count}</span> respuestas
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

      {!singleEmpty && selectedId ? (
        <div className="space-y-4">
          <Button variant="ghost" onClick={backToTopics}>
            Volver a temas
          </Button>

          <Card className="p-6">
            {detail ? (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {detail.fijado ? <Badge variant="amber">Fijado</Badge> : null}
                      {topicStatusBadge(detail.estado)}
                    </div>
                    <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">{detail.titulo}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {detail.autor.nombres} {detail.autor.apellidos} · {formatDate(detail.created_at)}
                    </div>
                  </div>
                </div>

                <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{detail.mensaje}</div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="text-sm font-black text-slate-900">Respuestas</div>
                  <div className="mt-4 space-y-3">
                    {detail.respuestas.length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        Todavía no hay respuestas.
                      </div>
                    ) : (
                      visibleReplies.map((r) => (
                        <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="text-sm font-black text-slate-900">
                            {r.autor.nombres} {r.autor.apellidos}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">{formatDate(r.created_at)}</div>
                          <div className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{r.mensaje}</div>
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
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Este tema está cerrado. Ya no admite nuevas respuestas.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-sm font-extrabold text-slate-800">Responder</div>
                        <textarea
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
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
              <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
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
