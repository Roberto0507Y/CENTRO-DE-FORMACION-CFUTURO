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
};

export type CourseListItemTeaching = CourseListItem & {
  estado: CourseStatus;
};

export type CourseDetail = CourseListItem & {
  descripcion: string | null;
  video_intro_url: string | null;
  duracion_horas: string | null;
  requisitos: string | null;
  objetivos: string | null;
  payment_link: string | null;
};

export type CourseDetailPrivate = CourseDetail & {
  estado: CourseStatus;
  updated_at: string;
  docente_id: number;
  categoria_id: number;
};

export type CreateCourseInput = {
  categoria_id: number;
  docente_id?: number;
  titulo: string;
  slug?: string;
  descripcion_corta?: string | null;
  descripcion?: string | null;
  imagen_url?: string | null;
  video_intro_url?: string | null;
  tipo_acceso?: CourseAccessType;
  precio?: number;
  nivel?: CourseLevel;
  estado?: CourseStatus;
  duracion_horas?: number | null;
  requisitos?: string | null;
  objetivos?: string | null;
  fecha_publicacion?: string | null;
  payment_link?: string | null;
};

export type UpdateCourseInput = Partial<{
  categoria_id: number;
  docente_id: number;
  titulo: string;
  slug: string;
  descripcion_corta: string | null;
  descripcion: string | null;
  imagen_url: string | null;
  video_intro_url: string | null;
  tipo_acceso: CourseAccessType;
  precio: number;
  nivel: CourseLevel;
  estado: CourseStatus;
  duracion_horas: number | null;
  requisitos: string | null;
  objetivos: string | null;
  fecha_publicacion: string | null;
  payment_link: string | null;
}>;

export type CourseFilters = Partial<{
  categoria_id: number;
  tipo_acceso: CourseAccessType;
  nivel: CourseLevel;
  docente_id: number;
  search: string;
}>;

export type Pagination = {
  page: number;
  limit: number;
};

export type EnrolledCourseItem = CourseListItem & {
  progreso: string;
};
