export type LessonType = "video" | "pdf" | "texto" | "enlace";

export type LessonListItem = {
  id: number;
  modulo_id: number;
  titulo: string;
  descripcion: string | null;
  tipo: LessonType;
  duracion_minutos: number | null;
  orden: number;
  es_preview: boolean;
  estado: "activo" | "inactivo";
};

export type LessonDetail = LessonListItem & {
  contenido: string | null;
  video_url: string | null;
  archivo_url: string | null;
  enlace_url: string | null;
  created_at: string;
  updated_at: string;
};

