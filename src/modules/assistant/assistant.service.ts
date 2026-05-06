import { badRequest } from "../../common/errors/httpErrors";
import { env } from "../../config/env";
import { AssistantRepository } from "./assistant.repository";
import type {
  AssistantBootstrap,
  AssistantChatInput,
  AssistantChatResult,
  AssistantCourseCard,
  AssistantSource,
  AssistantSuggestion,
  AssistantSupportInfo,
} from "./assistant.types";

const SUPPORT: AssistantSupportInfo = {
  email: "informacion@centrodeformacionparaelfuturo.com",
  whatsappNumber: "+502 3017 8501",
  whatsappLink: "https://wa.me/50230178501",
  hours: "Lun a Vie · 8:00 a.m. – 5:00 p.m.",
};

const DEFAULT_SUGGESTIONS: AssistantSuggestion[] = [
  { label: "Cursos gratis", query: "Muéstrame cursos gratis" },
  { label: "Examen de admisión", query: "¿Qué cursos tienen examen de admisión?" },
  { label: "Cómo pagar", query: "¿Cómo funciona el pago de un curso?" },
  { label: "Crear cuenta", query: "¿Cómo me registro en la plataforma?" },
];

const COURSE_PAGE_SOURCE: AssistantSource = {
  kind: "page",
  label: "Catálogo de cursos",
  href: "/courses",
};

const CONTACT_PAGE_SOURCE: AssistantSource = {
  kind: "page",
  label: "Contacto y soporte",
  href: "/contact",
};

const REGISTER_PAGE_SOURCE: AssistantSource = {
  kind: "page",
  label: "Crear cuenta",
  href: "/auth/register",
};

const LOGIN_PAGE_SOURCE: AssistantSource = {
  kind: "page",
  label: "Iniciar sesión",
  href: "/auth/login",
};

const STOPWORDS = new Set([
  "el",
  "la",
  "los",
  "las",
  "de",
  "del",
  "y",
  "o",
  "para",
  "por",
  "con",
  "que",
  "me",
  "quiero",
  "puedo",
  "puedes",
  "necesito",
  "como",
  "cuanto",
  "cuesta",
  "curso",
  "cursos",
  "sobre",
  "tema",
  "temas",
  "informacion",
  "información",
]);

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function levelLabel(level: AssistantCourseCard["nivel"]): string {
  if (level === "basico") return "Básico";
  if (level === "intermedio") return "Intermedio";
  return "Avanzado";
}

function priceLabel(course: AssistantCourseCard): string {
  if (course.tipo_acceso === "gratis") return "Gratis";
  const amount = Number(course.precio);
  if (!Number.isFinite(amount)) return `Q ${course.precio}`;
  return `Q ${amount.toFixed(2)}`;
}

function courseSource(course: AssistantCourseCard): AssistantSource {
  return {
    kind: "course",
    label: course.titulo,
    href: `/courses/${course.slug}`,
  };
}

function courseBullet(course: AssistantCourseCard): string {
  const access = course.tipo_acceso === "gratis" ? "gratis" : priceLabel(course);
  const admission = course.requiere_admision
    ? ` · admisión${course.precio_admision ? ` desde Q ${Number(course.precio_admision).toFixed(2)}` : ""}`
    : "";
  return `• ${course.titulo} (${access} · ${levelLabel(course.nivel)}${admission})`;
}

function summarizeCourse(course: AssistantCourseCard): string {
  const admissionText = course.requiere_admision
    ? `Sí, usa examen de admisión${course.precio_admision ? ` desde Q ${Number(course.precio_admision).toFixed(2)}` : ""}.`
    : "No requiere examen de admisión.";

  return [
    `${course.titulo}`,
    `Categoría: ${course.categoria_nombre}.`,
    `Docente: ${course.docente_nombre}.`,
    `Acceso: ${course.tipo_acceso === "gratis" ? "Gratis" : priceLabel(course)}.`,
    admissionText,
  ].join(" ");
}

function dedupeSources(items: AssistantSource[]): AssistantSource[] {
  const seen = new Set<string>();
  const result: AssistantSource[] = [];

  for (const item of items) {
    const key = `${item.kind}:${item.label}:${item.href ?? "-"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function deriveSearchQuery(rawMessage: string): string {
  const tokens = normalizeText(rawMessage)
    .replace(/[^a-z0-9ñáéíóúü\s-]/gi, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));

  return tokens.slice(0, 6).join(" ");
}

function sliceHistory(history: AssistantChatInput["history"]): Array<{ role: "user" | "assistant"; content: string }> {
  return (history ?? [])
    .filter((item) => item && (item.role === "user" || item.role === "assistant"))
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, 600),
    }))
    .filter((item) => item.content.length > 0)
    .slice(-6);
}

function extractResponseText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const maybeText = (payload as { output_text?: unknown }).output_text;
  if (typeof maybeText === "string" && maybeText.trim()) return maybeText.trim();

  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return null;

  const chunks: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;

    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string" && text.trim()) {
        chunks.push(text.trim());
      }
    }
  }

  const joined = chunks.join("\n").trim();
  return joined || null;
}

export class AssistantService {
  private readonly repo = new AssistantRepository();

  async bootstrap(): Promise<AssistantBootstrap> {
    const featuredCourses = await this.repo.listFeaturedCourses(4);
    return {
      welcome:
        "Hola, soy el asistente de C.FUTURO. Puedo ayudarte con cursos, admisión, pagos, registro y soporte general.",
      suggestions: DEFAULT_SUGGESTIONS,
      featuredCourses,
      support: SUPPORT,
    };
  }

  async chat(input: AssistantChatInput): Promise<AssistantChatResult> {
    const message = input.message.trim();
    if (!message) throw badRequest("Escribe una consulta para continuar");

    const normalized = normalizeText(message);
    const contextCourse = input.pageContext?.courseSlug
      ? await this.repo.findPublicCourseBySlug(input.pageContext.courseSlug)
      : null;
    const searchQuery = deriveSearchQuery(message);
    let matchedCourses = searchQuery ? await this.repo.searchPublishedCourses(searchQuery, 5) : [];

    if (!matchedCourses.length && contextCourse) {
      matchedCourses = [contextCourse];
    }

    const wantsGreeting =
      normalized.length < 40 &&
      includesAny(normalized, ["hola", "buenas", "buen dia", "buen dia", "hello", "ayuda"]);
    const wantsCourses =
      includesAny(normalized, ["curso", "cursos", "clase", "clases", "programa", "programacion"]);
    const wantsFree = includesAny(normalized, ["gratis", "gratuito", "sin pago"]);
    const wantsPaid = includesAny(normalized, ["pago", "pagado", "precio", "cuesta", "coste"]);
    const wantsAdmission = includesAny(normalized, ["admision", "admisión", "examen", "prueba"]);
    const wantsRegister = includesAny(normalized, [
      "registro",
      "registr",
      "crear cuenta",
      "confirmar correo",
      "verificar correo",
      "iniciar sesion",
      "iniciar sesión",
      "login",
      "cuenta",
      "contrasena",
      "contraseña",
    ]);
    const wantsSupport = includesAny(normalized, [
      "contacto",
      "soporte",
      "whatsapp",
      "correo",
      "email",
      "ayuda",
      "problema",
      "error",
    ]);

    if (wantsGreeting && !wantsCourses && !wantsPaid && !wantsAdmission && !wantsRegister && !wantsSupport) {
      const featuredCourses = await this.repo.listFeaturedCourses(4);
      return {
        mode: "rules",
        answer:
          "Claro. Puedo orientarte sobre cursos, examen de admisión, pagos, registro y soporte. Si quieres, también te muestro opciones de cursos disponibles ahora mismo.",
        suggestions: DEFAULT_SUGGESTIONS,
        courses: featuredCourses,
        sources: [COURSE_PAGE_SOURCE, CONTACT_PAGE_SOURCE],
        support: SUPPORT,
      };
    }

    if (wantsSupport && !wantsCourses && !wantsPaid && !wantsAdmission) {
      return {
        mode: "rules",
        answer: [
          "Puedes contactarnos por estos canales:",
          `• WhatsApp: ${SUPPORT.whatsappNumber}`,
          `• Correo: ${SUPPORT.email}`,
          `• Horario: ${SUPPORT.hours}`,
          "Si tu duda es sobre un pago o acceso, incluye tu correo y el nombre del curso para atenderte más rápido.",
        ].join("\n"),
        suggestions: [
          { label: "Ir a contacto", query: "Necesito hablar con soporte" },
          { label: "Ver cursos", query: "Muéstrame cursos disponibles" },
        ],
        courses: [],
        sources: [CONTACT_PAGE_SOURCE],
        support: SUPPORT,
      };
    }

    if (wantsRegister && !wantsCourses && !wantsPaid && !wantsAdmission) {
      return {
        mode: "rules",
        answer: [
          "El flujo de registro es este:",
          "• Creas tu cuenta con tus datos.",
          "• Recibes un correo para confirmar tu acceso.",
          "• Después ya puedes iniciar sesión y continuar con cursos, pagos o admisión según corresponda.",
          "Si no te llega el correo, revisa spam o escríbenos a soporte.",
        ].join("\n"),
        suggestions: [
          { label: "Crear cuenta", query: "Quiero crear una cuenta" },
          { label: "Iniciar sesión", query: "Necesito iniciar sesión" },
        ],
        courses: [],
        sources: [REGISTER_PAGE_SOURCE, LOGIN_PAGE_SOURCE, CONTACT_PAGE_SOURCE],
        support: SUPPORT,
      };
    }

    if (wantsAdmission) {
      const admissionCourses =
        matchedCourses.filter((course) => course.requiere_admision).length > 0
          ? matchedCourses.filter((course) => course.requiere_admision)
          : await this.repo.listAdmissionCourses(5);

      const answer =
        admissionCourses.length > 0
          ? [
              "Estos cursos manejan examen de admisión o proceso previo:",
              ...admissionCourses.map(courseBullet),
              "Cuando el examen está habilitado, primero se paga el examen, luego se presenta, y si el alumno aprueba se habilita la compra del curso.",
            ].join("\n")
          : "Ahora mismo no encontré cursos publicados con examen de admisión activo. Si quieres, puedo mostrarte cursos disponibles o ayudarte con soporte.";

      return {
        mode: "rules",
        answer,
        suggestions: [
          { label: "Cursos con admisión", query: "Muéstrame cursos con examen de admisión" },
          { label: "Cómo pagar admisión", query: "¿Cómo pago el examen de admisión?" },
        ],
        courses: admissionCourses,
        sources: dedupeSources([COURSE_PAGE_SOURCE, ...admissionCourses.map(courseSource)]),
        support: SUPPORT,
      };
    }

    if (wantsPaid || wantsFree) {
      let paymentCourses = matchedCourses;
      if (wantsFree && paymentCourses.length === 0) {
        paymentCourses = await this.repo.listCoursesByAccess("gratis", 5);
      } else if (wantsPaid && paymentCourses.length === 0) {
        paymentCourses = await this.repo.listCoursesByAccess("pago", 5);
      }

      if (wantsFree) {
        paymentCourses = paymentCourses.filter((course) => course.tipo_acceso === "gratis");
      }

      const paymentSummary =
        paymentCourses.length > 0
          ? [
              "Esto es lo que encontré:",
              ...paymentCourses.map(courseBullet),
              "Para cursos de pago puedes completar el proceso con BI Pay o subir comprobante manual, según la opción disponible.",
            ].join("\n")
          : [
              "El sistema maneja cursos gratis y de pago.",
              "• En cursos gratis el acceso puede habilitarse directamente.",
              "• En cursos de pago puedes usar BI Pay o comprobante manual, y luego se valida el movimiento.",
              "• Si un pago se rechaza o aprueba, el alumno recibe notificación por correo.",
            ].join("\n");

      return {
        mode: "rules",
        answer: paymentSummary,
        suggestions: [
          { label: "Cursos de pago", query: "Muéstrame cursos de pago" },
          { label: "Cursos gratis", query: "Muéstrame cursos gratis" },
          { label: "Soporte de pagos", query: "Necesito ayuda con un pago" },
        ],
        courses: paymentCourses,
        sources: dedupeSources([COURSE_PAGE_SOURCE, CONTACT_PAGE_SOURCE, ...paymentCourses.map(courseSource)]),
        support: SUPPORT,
      };
    }

    if (wantsCourses || matchedCourses.length > 0) {
      const courses =
        matchedCourses.length > 0 ? matchedCourses : await this.repo.listFeaturedCourses(5);

      const answer =
        matchedCourses.length > 0
          ? [
              "Encontré estas opciones relacionadas con tu consulta:",
              ...courses.map(courseBullet),
              contextCourse && matchedCourses[0]?.slug === contextCourse.slug
                ? `Además, estás viendo este curso: ${summarizeCourse(contextCourse)}`
                : null,
            ]
              .filter(Boolean)
              .join("\n")
          : [
              "Te comparto algunos cursos publicados en este momento:",
              ...courses.map(courseBullet),
            ].join("\n");

      return {
        mode: "rules",
        answer,
        suggestions: [
          { label: "Ver catálogo", query: "Muéstrame todos los cursos" },
          { label: "Cursos con admisión", query: "¿Qué cursos tienen examen de admisión?" },
          { label: "Cursos gratis", query: "Muéstrame cursos gratis" },
        ],
        courses,
        sources: dedupeSources([COURSE_PAGE_SOURCE, ...courses.map(courseSource)]),
        support: SUPPORT,
      };
    }

    const openAiResult = await this.tryOpenAiFallback(input, normalized, contextCourse, matchedCourses);
    if (openAiResult) return openAiResult;

    return {
      mode: "rules",
      answer:
        "Puedo ayudarte con cursos, pagos, examen de admisión, registro y soporte. Si me dices el nombre del curso o el tema exacto, te respondo mejor.",
      suggestions: DEFAULT_SUGGESTIONS,
      courses: await this.repo.listFeaturedCourses(4),
      sources: [COURSE_PAGE_SOURCE, CONTACT_PAGE_SOURCE],
      support: SUPPORT,
    };
  }

  private async tryOpenAiFallback(
    input: AssistantChatInput,
    normalizedMessage: string,
    contextCourse: AssistantCourseCard | null,
    matchedCourses: AssistantCourseCard[]
  ): Promise<AssistantChatResult | null> {
    if (!env.OPENAI_API_KEY) return null;

    const relevantCourses =
      matchedCourses.length > 0 ? matchedCourses.slice(0, 4) : await this.repo.listFeaturedCourses(4);
    const history = sliceHistory(input.history);

    const courseContext = [
      contextCourse ? `Curso actual: ${summarizeCourse(contextCourse)}` : null,
      relevantCourses.length > 0
        ? `Cursos relevantes:\n${relevantCourses.map(summarizeCourse).join("\n")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const policyContext = [
      "Reglas del campus:",
      "- Hay cursos gratis y cursos de pago.",
      "- Los pagos pueden gestionarse con BI Pay o comprobante manual, según la opción configurada.",
      "- Algunos cursos usan examen de admisión; primero se paga el examen, luego se presenta, y si se aprueba se habilita la compra del curso.",
      "- El registro crea una cuenta y luego se confirma por correo.",
      `- Soporte por WhatsApp ${SUPPORT.whatsappNumber}, correo ${SUPPORT.email}, horario ${SUPPORT.hours}.`,
      "- No inventes precios, enlaces ni estados no presentes en el contexto.",
      "- Si no sabes algo, sugiere contactar soporte o revisar el catálogo.",
    ].join("\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.OPENAI_CHATBOT_MODEL || "gpt-5.4-mini",
        max_output_tokens: 320,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text:
                  "Eres el asistente virtual de C.FUTURO. Responde en español, con tono claro, profesional y breve. Usa solo el contexto entregado. Si el dato exacto no está disponible, dilo con honestidad y deriva al soporte o al catálogo. No inventes precios, enlaces, fechas ni estados.",
              },
            ],
          },
          ...history.map((item) => ({
            role: item.role,
            content: [{ type: "input_text", text: item.content }],
          })),
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `${policyContext}\n\n${courseContext}\n\nConsulta del usuario: ${normalizedMessage}`,
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as unknown;
    const answer = extractResponseText(payload);
    if (!answer) return null;

    return {
      mode: "openai",
      answer,
      suggestions: DEFAULT_SUGGESTIONS,
      courses: matchedCourses.length > 0 ? matchedCourses : relevantCourses,
      sources: dedupeSources([
        COURSE_PAGE_SOURCE,
        CONTACT_PAGE_SOURCE,
        ...relevantCourses.map(courseSource),
      ]),
      support: SUPPORT,
    };
  }
}
