import type { CategorySummary, TeacherSummary } from "./course";

export type EnrollmentType = "gratis" | "pagada";
export type EnrollmentStatus = "activa" | "pendiente" | "cancelada" | "finalizada";

export type CourseSummary = {
  id: number;
  titulo: string;
  slug: string;
  imagen_url: string | null;
  tipo_acceso: "gratis" | "pago";
  precio: string;
  nivel: "basico" | "intermedio" | "avanzado";
  estado: "borrador" | "publicado" | "oculto";
  fecha_publicacion: string | null;
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
