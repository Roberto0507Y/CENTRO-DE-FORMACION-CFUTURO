export type EnrollmentType = "gratis" | "pagada";
export type EnrollmentStatus = "activa" | "pendiente" | "cancelada" | "finalizada";

export type CourseAccessType = "gratis" | "pago";
export type CourseLevel = "basico" | "intermedio" | "avanzado";
export type CourseStatus = "borrador" | "publicado" | "oculto";

export type CourseSummary = {
  id: number;
  titulo: string;
  slug: string;
  imagen_url: string | null;
  tipo_acceso: CourseAccessType;
  precio: string;
  nivel: CourseLevel;
  estado: CourseStatus;
  fecha_publicacion: string | null;
};

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
};

export type MyEnrollmentItem = {
  id: number;
  progreso: string;
  fecha_inscripcion: string;
  tipo_inscripcion: EnrollmentType;
  estado: EnrollmentStatus;
  curso: CourseSummary;
  categoria: CategorySummary;
  docente: TeacherSummary;
};

export type AccessCheck = {
  enrolled: boolean;
  access: boolean;
  tipo_inscripcion: EnrollmentType | null;
  estado_inscripcion: EnrollmentStatus | null;
  progreso: string | null;
};

export type CourseStudentItem = {
  usuario_id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  foto_url: string | null;
  progreso: string;
  tipo_inscripcion: EnrollmentType;
  fecha_inscripcion: string;
};

export type ProgressUpdateInput = {
  progreso: number;
};

