export type CourseModule = {
  id: number;
  curso_id: number;
  titulo: string;
  descripcion: string | null;
  orden: number;
  estado: "activo" | "inactivo";
};

