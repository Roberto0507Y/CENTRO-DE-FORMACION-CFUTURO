import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bot,
  BookOpen,
  CreditCard,
  GraduationCap,
  LifeBuoy,
  Loader2,
  MessageCircle,
  SendHorizonal,
  Sparkles,
  X,
} from "lucide-react";
import { createApiClient } from "../../api/axios";
import { Button } from "../ui/Button";
import type { ApiResponse } from "../../types/api";
import type {
  AssistantBootstrap,
  AssistantChatResult,
  AssistantCourseCard,
  AssistantSource,
  AssistantSuggestion,
  AssistantSupportInfo,
} from "../../types/assistant";

type UiMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  suggestions?: AssistantSuggestion[];
  courses?: AssistantCourseCard[];
  sources?: AssistantSource[];
  status?: "ready" | "loading" | "error";
};

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatPrice(course: AssistantCourseCard) {
  if (course.tipo_acceso === "gratis") return "Gratis";
  const amount = Number(course.precio);
  return Number.isFinite(amount) ? `Q ${amount.toFixed(2)}` : `Q ${course.precio}`;
}

function supportFallback(): AssistantSupportInfo {
  return {
    email: "informacion@centrodeformacionparaelfuturo.com",
    whatsappNumber: "+502 3017 8501",
    whatsappLink: "https://wa.me/50230178501",
    hours: "Lun a Vie · 8:00 a.m. – 5:00 p.m.",
  };
}

function bootstrapFallback(): AssistantBootstrap {
  return {
    welcome:
      "Hola, soy el asistente de C.FUTURO. Puedo orientarte sobre cursos, admisión, pagos, registro y soporte.",
    suggestions: [
      { label: "Cursos gratis", query: "Muéstrame cursos gratis" },
      { label: "Examen de admisión", query: "¿Qué cursos tienen examen de admisión?" },
      { label: "Pagos", query: "¿Cómo funciona el pago?" },
      { label: "Registro", query: "¿Cómo me registro?" },
    ],
    featuredCourses: [],
    support: supportFallback(),
  };
}

function ChatCourseCard({
  course,
  onOpen,
}: {
  course: AssistantCourseCard;
  onOpen: (slug: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(course.slug)}
      className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/75 dark:hover:border-cyan-400/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-slate-900 dark:text-slate-100">
            {course.titulo}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {course.categoria_nombre} · {course.docente_nombre}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700 dark:bg-cyan-400/15 dark:text-cyan-200">
          {formatPrice(course)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">
          {course.nivel}
        </span>
        {course.requiere_admision ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
            Admisión
          </span>
        ) : null}
      </div>
      {course.descripcion_corta ? (
        <div className="mt-3 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
          {course.descripcion_corta}
        </div>
      ) : null}
    </button>
  );
}

export function PublicChatbot() {
  const api = useMemo(() => createApiClient(), []);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [hasBootstrapped, setHasBootstrapped] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [support, setSupport] = useState<AssistantSupportInfo>(supportFallback());
  const messagesRef = useRef<UiMessage[]>([]);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const courseSlug = useMemo(() => {
    if (!pathname.startsWith("/courses/")) return null;
    const value = pathname.split("/")[2] ?? "";
    return value ? decodeURIComponent(value) : null;
  }, [pathname]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, [messages, isSending, isOpen]);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.scrollTo({ top: scrollY, behavior: "auto" });
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeChat();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeChat, isOpen]);

  const openCourse = useCallback(
    (slug: string) => {
      navigate(`/courses/${slug}`);
      closeChat();
    },
    [closeChat, navigate]
  );

  const bootstrapChat = useCallback(async () => {
    if (hasBootstrapped || isBootstrapping) return;
    setIsBootstrapping(true);
    try {
      const res = await api.get<ApiResponse<AssistantBootstrap>>("/assistant/bootstrap");
      const data = res.data.data;
      setSupport(data.support);
      setMessages([
        {
          id: makeId(),
          role: "assistant",
          content: data.welcome,
          suggestions: data.suggestions,
          courses: data.featuredCourses,
          sources: [
            { kind: "page", label: "Ver cursos", href: "/courses" },
            { kind: "page", label: "Contacto", href: "/contact" },
          ],
          status: "ready",
        },
      ]);
    } catch {
      const fallback = bootstrapFallback();
      setSupport(fallback.support);
      setMessages([
        {
          id: makeId(),
          role: "assistant",
          content: fallback.welcome,
          suggestions: fallback.suggestions,
          courses: fallback.featuredCourses,
          status: "ready",
        },
      ]);
    } finally {
      setHasBootstrapped(true);
      setIsBootstrapping(false);
    }
  }, [api, hasBootstrapped, isBootstrapping]);

  useEffect(() => {
    if (!isOpen) return;
    void bootstrapChat();
  }, [bootstrapChat, isOpen]);

  const sendMessage = useCallback(
    async (rawMessage: string) => {
      const message = rawMessage.trim();
      if (!message || isSending) return;

      const history = messagesRef.current
        .filter((item) => item.status !== "loading")
        .map((item) => ({ role: item.role, content: item.content }))
        .slice(-6);
      const userMessage: UiMessage = {
        id: makeId(),
        role: "user",
        content: message,
        status: "ready",
      };
      const loadingId = makeId();

      setDraft("");
      setIsSending(true);
      setMessages((prev) => [
        ...prev,
        userMessage,
        {
          id: loadingId,
          role: "assistant",
          content: "Pensando…",
          status: "loading",
        },
      ]);

      try {
        const res = await api.post<ApiResponse<AssistantChatResult>>("/assistant/chat", {
          message,
          history,
          pageContext: {
            path: pathname,
            courseSlug,
          },
        });
        const data = res.data.data;
        setSupport(data.support);
        setMessages((prev) =>
          prev.map((item) =>
            item.id === loadingId
              ? {
                  id: loadingId,
                  role: "assistant",
                  content: data.answer,
                  suggestions: data.suggestions,
                  courses: data.courses,
                  sources: data.sources,
                  status: "ready",
                }
              : item
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((item) =>
            item.id === loadingId
              ? {
                  id: loadingId,
                  role: "assistant",
                  content:
                    "No pude responder en este momento. Si quieres, prueba otra pregunta o contáctanos por soporte.",
                  suggestions: [
                    { label: "Ver cursos", query: "Muéstrame cursos disponibles" },
                    { label: "Soporte", query: "Necesito ayuda con soporte" },
                  ],
                  sources: [{ kind: "page", label: "Contacto", href: "/contact" }],
                  status: "error",
                }
              : item
          )
        );
      } finally {
        setIsSending(false);
      }
    },
    [api, courseSlug, isSending, pathname]
  );

  return (
    <>
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-[70] inline-flex items-center gap-3 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-[0_24px_80px_-30px_rgba(15,23,42,0.75)] transition hover:-translate-y-0.5 hover:bg-blue-600 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400 sm:bottom-6 sm:right-6"
        >
          <MessageCircle className="h-4 w-4" />
          Ayuda rápida
        </button>
      ) : null}

      {isOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center overscroll-contain sm:items-auto sm:justify-end sm:p-6">
          <button
            type="button"
            aria-label="Cerrar chat"
            onClick={closeChat}
            className="absolute inset-0 bg-slate-950/38 backdrop-blur-[2px]"
          />

          <div className="relative mx-2 my-2 flex h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-[540px] flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_40px_120px_-50px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950 sm:mx-0 sm:my-0 sm:h-[min(760px,calc(100dvh-3rem))] sm:w-[420px]">
            <div className="flex justify-center pt-3 sm:hidden">
              <button
                type="button"
                onClick={closeChat}
                className="inline-flex h-1.5 w-14 rounded-full bg-slate-300/90 transition hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600"
                aria-label="Cerrar chat"
              />
            </div>

            <div className="relative shrink-0 overflow-hidden border-b border-slate-200/80 bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 px-5 py-5 text-white dark:border-slate-800">
              <div className="absolute inset-0 bg-[radial-gradient(520px_180px_at_100%_0%,rgba(255,255,255,0.18),transparent_55%)]" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100">
                    <Sparkles className="h-3.5 w-3.5" />
                    Asistente virtual
                  </div>
                  <div className="mt-3 text-xl font-black tracking-tight">C.FUTURO</div>
                  <div className="mt-1 text-sm text-white/80">
                    Cursos, admisión, pagos y soporte.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeChat}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 text-sm font-black text-white transition hover:bg-white/15"
                >
                  <span>Cerrar</span>
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              ref={viewportRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 px-4 py-4 touch-pan-y dark:bg-slate-950/90"
            >
              {messages.length === 0 && isBootstrapping ? (
                <div className="grid place-items-center py-10 text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : null}

              <div className="space-y-4">
                {messages.map((message) => {
                  const isAssistant = message.role === "assistant";
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[92%] rounded-[1.6rem] px-4 py-3 shadow-sm ${
                          isAssistant
                            ? "border border-slate-200/80 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                            : "bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
                        }`}
                      >
                        {isAssistant ? (
                          <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            <Bot className="h-3.5 w-3.5" />
                            Asistente
                          </div>
                        ) : null}

                        <div className="whitespace-pre-line text-sm leading-6">{message.content}</div>

                        {message.status === "loading" ? (
                          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Preparando respuesta…
                          </div>
                        ) : null}

                        {message.courses && message.courses.length > 0 ? (
                          <div className="mt-4 space-y-2">
                            {message.courses.map((course) => (
                              <ChatCourseCard key={course.id} course={course} onOpen={openCourse} />
                            ))}
                          </div>
                        ) : null}

                        {message.sources && message.sources.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {message.sources.map((source) =>
                              source.href ? (
                                <Link
                                  key={`${source.label}:${source.href}`}
                                  to={source.href}
                                  onClick={closeChat}
                                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-blue-200 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-cyan-400/30 dark:hover:text-cyan-200"
                                >
                                  {source.label}
                                </Link>
                              ) : (
                                <span
                                  key={source.label}
                                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                                >
                                  {source.label}
                                </span>
                              )
                            )}
                          </div>
                        ) : null}

                        {message.suggestions && message.suggestions.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {message.suggestions.map((suggestion) => (
                              <button
                                key={suggestion.label}
                                type="button"
                                onClick={() => void sendMessage(suggestion.query)}
                                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-black text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100 dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-cyan-200 dark:hover:bg-cyan-400/15"
                              >
                                {suggestion.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-200/80 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-3 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <a
                  href={support.whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 transition hover:border-emerald-200 hover:text-emerald-700 dark:border-slate-700 dark:hover:border-emerald-400/25 dark:hover:text-emerald-200"
                >
                  <LifeBuoy className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
                <Link
                  to="/contact"
                  onClick={closeChat}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 transition hover:border-blue-200 hover:text-blue-700 dark:border-slate-700 dark:hover:border-cyan-400/25 dark:hover:text-cyan-200"
                >
                  <LifeBuoy className="h-3.5 w-3.5" />
                  Contacto
                </Link>
              </div>

              <form
                className="flex items-end gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendMessage(draft);
                }}
              >
                <label className="sr-only" htmlFor="cfuturo-chatbot-input">
                  Escribe tu pregunta
                </label>
                <textarea
                  id="cfuturo-chatbot-input"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage(draft);
                    }
                  }}
                  placeholder="Ej: ¿qué cursos son gratis?, ¿cómo pago?, ¿cómo funciona admisión?"
                  rows={2}
                  className="min-h-[56px] w-full resize-none rounded-[1.3rem] border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/15 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-400/40 dark:focus:bg-slate-900 dark:focus:ring-cyan-400/15"
                />
                <Button type="submit" className="h-14 shrink-0 px-5" disabled={isSending || !draft.trim()}>
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
                </Button>
              </form>

              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-900">
                  <BookOpen className="h-3.5 w-3.5" />
                  Cursos
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-900">
                  <CreditCard className="h-3.5 w-3.5" />
                  Pagos
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-900">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Admisión
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
