export type TaskStatus = "borrador" | "publicada" | "cerrada";

export type Task = {
  id: number;
  curso_id: number;
  modulo_id: number | null;
  titulo: string;
  descripcion: string | null;
  instrucciones: string | null;
  archivo_url: string | null;
  enlace_url: string | null;
  puntos: string;
  fecha_apertura: string | null;
  fecha_entrega: string;
  fecha_cierre: string | null;
  permite_entrega_tardia: 0 | 1;
  estado: TaskStatus;
  created_at: string;
  updated_at: string;
};

export type CreateTaskInput = {
  titulo: string;
  descripcion?: string | null;
  instrucciones?: string | null;
  archivo_url?: string | null;
  enlace_url?: string | null;
  puntos?: number;
  fecha_apertura?: string | null;
  fecha_entrega: string;
  fecha_cierre?: string | null;
  permite_entrega_tardia?: boolean;
  estado?: TaskStatus;
};

export type UpdateTaskInput = Partial<{
  titulo: string;
  descripcion: string | null;
  instrucciones: string | null;
  archivo_url: string | null;
  enlace_url: string | null;
  puntos: number;
  fecha_apertura: string | null;
  fecha_entrega: string;
  fecha_cierre: string | null;
  permite_entrega_tardia: boolean;
  estado: TaskStatus;
}>;

export type TaskSubmissionStatus =
  | "entregada"
  | "revisada"
  | "devuelta"
  | "atrasada"
  | "no_entregada";

export type TaskSubmission = {
  id: number;
  tarea_id: number;
  estudiante_id: number;
  archivo_url: string | null;
  subidas_archivo: number;
  enlace_url: string | null;
  comentario_estudiante: string | null;
  fecha_entrega: string;
  estado: TaskSubmissionStatus;
  calificacion: string | number | null;
  comentario_docente: string | null;
  fecha_calificacion: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskSubmissionWithStudent = TaskSubmission & {
  estudiante: {
    id: number;
    nombres: string;
    apellidos: string;
    correo: string;
    foto_url: string | null;
  };
};

export type GradeSubmissionInput = {
  calificacion: number;
  comentario_docente?: string | null;
  estado?: "revisada" | "devuelta";
};
