export type QuizStatus = "borrador" | "publicado" | "cerrado";
export type QuizVariant = "A" | "B" | "C" | "D";
export type QuizKind = "regular" | "admision";

export type Quiz = {
  id: number;
  curso_id: number;
  modulo_id: number | null;
  titulo: string;
  descripcion: string | null;
  instrucciones: string | null;
  tipo: QuizKind;
  puntaje_total: string;
  porcentaje_aprobacion: string;
  precio_admision: string;
  payment_link_admision: string | null;
  tiempo_limite_minutos: number | null;
  intentos_permitidos: number;
  requiere_pago_reintento: 0 | 1;
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
  puntos: string;
  orden: number;
  estado: QuestionStatus;
  created_at: string;
  updated_at: string;
};

export type QuizQuestionPublic = Omit<
  QuizQuestion,
  "respuesta_correcta" | "respuesta_correcta_a" | "respuesta_correcta_b" | "respuesta_correcta_c" | "respuesta_correcta_d"
>;

export type StartQuizResponse = {
  intento_id: number;
  numero_intento: number;
  variante: QuizVariant | null;
  quiz: Quiz;
  preguntas: QuizQuestionPublic[];
};

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

export type AttemptResult = {
  intento: Attempt;
  mostrar_resultado: boolean;
  puntaje_obtenido: number;
  puntaje_total: number;
  porcentaje_obtenido: number;
  porcentaje_aprobacion: number | null;
  aprobado: boolean | null;
  detalle?: Array<{
    pregunta_id: number;
    respuesta_usuario: string | null;
    es_correcta: boolean;
    puntos_obtenidos: number;
    respuesta_correcta?: string;
    explicacion?: string | null;
  }>;
};
