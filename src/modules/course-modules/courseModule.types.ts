export type CourseEstado = "borrador" | "publicado" | "oculto";

export type CourseModuleEstado = "activo" | "inactivo";

export type CourseModuleItem = {
  id: number;
  curso_id: number;
  titulo: string;
  descripcion: string | null;
  orden: number;
  estado: CourseModuleEstado;
};

