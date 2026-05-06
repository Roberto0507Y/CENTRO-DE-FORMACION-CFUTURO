export type AssistantSuggestion = {
  label: string;
  query: string;
};

export type AssistantSource = {
  kind: "page" | "course" | "policy";
  label: string;
  href: string | null;
};

export type AssistantSupportInfo = {
  email: string;
  whatsappNumber: string;
  whatsappLink: string;
  hours: string;
};

export type AssistantCourseCard = {
  id: number;
  titulo: string;
  slug: string;
  descripcion_corta: string | null;
  imagen_url: string | null;
  tipo_acceso: "gratis" | "pago";
  precio: string;
  nivel: "basico" | "intermedio" | "avanzado";
  categoria_nombre: string;
  docente_nombre: string;
  requiere_admision: boolean;
  precio_admision: string | null;
};

export type AssistantPageContext = {
  path?: string | null;
  courseSlug?: string | null;
};

export type AssistantChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantChatInput = {
  message: string;
  history?: AssistantChatMessage[];
  pageContext?: AssistantPageContext;
};

export type AssistantBootstrap = {
  welcome: string;
  suggestions: AssistantSuggestion[];
  featuredCourses: AssistantCourseCard[];
  support: AssistantSupportInfo;
};

export type AssistantChatResult = {
  mode: "rules" | "openai";
  answer: string;
  suggestions: AssistantSuggestion[];
  courses: AssistantCourseCard[];
  sources: AssistantSource[];
  support: AssistantSupportInfo;
};
