export type LessonType = "video" | "pdf" | "texto" | "enlace";
export type LessonStatus = "activo" | "inactivo";

export type LessonListItem = {
  id: number;
  modulo_id: number;
  titulo: string;
  descripcion: string | null;
  tipo: LessonType;
  duracion_minutos: number | null;
  orden: number;
  es_preview: boolean;
  estado: LessonStatus;
};

export type LessonDetail = LessonListItem & {
  contenido: string | null;
  video_url: string | null;
  archivo_url: string | null;
  enlace_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateLessonInput = {
  modulo_id: number;
  titulo: string;
  descripcion?: string | null;
  tipo?: LessonType;
  contenido?: string | null;
  video_url?: string | null;
  archivo_url?: string | null;
  enlace_url?: string | null;
  duracion_minutos?: number | null;
  orden?: number;
  es_preview?: boolean;
};

export type UpdateLessonInput = Partial<{
  titulo: string;
  descripcion: string | null;
  tipo: LessonType;
  contenido: string | null;
  video_url: string | null;
  archivo_url: string | null;
  enlace_url: string | null;
  duracion_minutos: number | null;
  orden: number;
  es_preview: boolean;
  estado: LessonStatus;
}>;

export type LessonAccessContext = {
  lessonId: number;
  modulo_id: number;
  curso_id: number;
  curso_estado: "borrador" | "publicado" | "oculto";
  docente_id: number;
  es_preview: boolean;
  lesson_estado: LessonStatus;
};

