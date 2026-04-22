export type QuizStatus = "borrador" | "publicado" | "cerrado";
export type QuizVariant = "A" | "B" | "C" | "D";

export type Quiz = {
  id: number;
  curso_id: number;
  modulo_id: number | null;
  titulo: string;
  descripcion: string | null;
  instrucciones: string | null;
  puntaje_total: string; // decimal
  tiempo_limite_minutos: number | null;
  intentos_permitidos: number;
  fecha_apertura: string | null;
  fecha_cierre: string | null;
  mostrar_resultado_inmediato: 0 | 1;
  estado: QuizStatus;
  created_at: string;
  updated_at: string;
};

export type QuestionType = "opcion_unica" | "verdadero_falso" | "respuesta_corta";
export type QuestionStatus = "activo" | "inactivo";

export type QuizQuestion = {
  id: number;
  quiz_id: number;
  enunciado: string;
  tipo: QuestionType;
  opcion_a: string | null;
  opcion_b: string | null;
  opcion_c: string | null;
  opcion_d: string | null;
  respuesta_correcta: string;
  respuesta_correcta_a: string | null;
  respuesta_correcta_b: string | null;
  respuesta_correcta_c: string | null;
  respuesta_correcta_d: string | null;
  explicacion: string | null;
  puntos: string; // decimal
  orden: number;
  estado: QuestionStatus;
  created_at: string;
  updated_at: string;
};

export type QuizQuestionPublic = Omit<
  QuizQuestion,
  "respuesta_correcta" | "respuesta_correcta_a" | "respuesta_correcta_b" | "respuesta_correcta_c" | "respuesta_correcta_d"
>;

export type CreateQuizInput = Partial<{
  modulo_id: number | null;
  titulo: string;
  descripcion: string | null;
  instrucciones: string | null;
  puntaje_total: number;
  tiempo_limite_minutos: number | null;
  intentos_permitidos: number;
  fecha_apertura: string | null; // DATETIME
  fecha_cierre: string | null; // DATETIME
  mostrar_resultado_inmediato: boolean;
  estado: QuizStatus;
}>;

export type UpdateQuizInput = Partial<{
  modulo_id: number | null;
  titulo: string;
  descripcion: string | null;
  instrucciones: string | null;
  puntaje_total: number;
  tiempo_limite_minutos: number | null;
  intentos_permitidos: number;
  fecha_apertura: string | null;
  fecha_cierre: string | null;
  mostrar_resultado_inmediato: boolean;
}>;

export type CreateQuestionInput = {
  enunciado: string;
  tipo: QuestionType;
  opcion_a?: string | null;
  opcion_b?: string | null;
  opcion_c?: string | null;
  opcion_d?: string | null;
  respuesta_correcta: string;
  respuesta_correcta_a?: string | null;
  respuesta_correcta_b?: string | null;
  respuesta_correcta_c?: string | null;
  respuesta_correcta_d?: string | null;
  explicacion?: string | null;
  puntos?: number;
  orden?: number;
  estado?: QuestionStatus;
};

export type UpdateQuestionInput = Partial<{
  enunciado: string;
  tipo: QuestionType;
  opcion_a: string | null;
  opcion_b: string | null;
  opcion_c: string | null;
  opcion_d: string | null;
  respuesta_correcta: string;
  respuesta_correcta_a: string | null;
  respuesta_correcta_b: string | null;
  respuesta_correcta_c: string | null;
  respuesta_correcta_d: string | null;
  explicacion: string | null;
  puntos: number;
  orden: number;
  estado: QuestionStatus;
}>;

export type Attempt = {
  id: number;
  quiz_id: number;
  estudiante_id: number;
  numero_intento: number;
  variante: QuizVariant | null;
  puntaje_obtenido: string | null;
  completado: 0 | 1;
  fecha_inicio: string;
  fecha_fin: string | null;
  created_at: string;
  updated_at: string;
};

export type SubmitAnswerInput = {
  pregunta_id: number;
  respuesta_usuario: string | null;
};

export type SubmitQuizInput = {
  respuestas: SubmitAnswerInput[];
};

export type AttemptResult = {
  intento: Attempt;
  mostrar_resultado: boolean;
  puntaje_obtenido: number;
  puntaje_total: number;
  detalle?: Array<{
    pregunta_id: number;
    respuesta_usuario: string | null;
    es_correcta: boolean;
    puntos_obtenidos: number;
    respuesta_correcta?: string;
    explicacion?: string | null;
  }>;
};
