export type CourseAccessType = "gratis" | "pago";
export type CourseLevel = "basico" | "intermedio" | "avanzado";
export type CourseStatus = "borrador" | "publicado" | "oculto";

export type CategorySummary = {
  id: number;
  nombre: string;
  imagen_url: string | null;
};

export type TeacherSummary = {
  id: number;
  nombres: string;
  apellidos: string;
  foto_url: string | null;
  rol: "admin" | "docente";
};

export type CourseListItem = {
  id: number;
  titulo: string;
  slug: string;
  descripcion_corta: string | null;
  imagen_url: string | null;
  tipo_acceso: CourseAccessType;
  precio: string;
  nivel: CourseLevel;
  fecha_publicacion: string | null;
  created_at: string;
  categoria: CategorySummary;
  docente: TeacherSummary;
  // Opcionales: si el backend los envía, se muestran en cards premium
  duracion_horas?: string | null;
  rating_promedio?: number | null;
  estudiantes_count?: number | null;
};

export type CourseListResponse = {
  items: CourseListItem[];
  total: number;
  page: number;
  limit: number;
};

export type CourseDetail = CourseListItem & {
  descripcion: string | null;
  video_intro_url: string | null;
  duracion_horas: string | null;
  requisitos: string | null;
  objetivos: string | null;
  payment_link: string | null;
  // Cuando eres admin/docente dueño, puede venir estado
  estado?: CourseStatus;
};
