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
  variante_objetivo: QuizVariant | null;
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

export type AdmissionResultItem = {
  usuario_id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  pago_estado: "sin_pago" | "pendiente" | "pagado" | "rechazado" | "reembolsado";
  intentos: number;
  completados: number;
  mejor_puntaje: number | null;
  puntaje_total: number;
  porcentaje: number | null;
  porcentaje_aprobacion: number;
  aprobado: boolean;
  fecha_ultimo_intento: string | null;
  fecha_ultimo_pago: string | null;
};

export type AdmissionAttemptAnswerItem = {
  intento_id: number;
  pregunta_id: number;
  orden: number;
  enunciado: string;
  tipo: QuestionType;
  respuesta_usuario: string | null;
  respuesta_correcta_publicada: string;
  es_correcta: boolean;
  puntos_pregunta: number;
  puntos_obtenidos: number;
  explicacion: string | null;
};

export type AdmissionAttemptDetail = {
  id: number;
  estudiante_id: number;
  numero_intento: number;
  variante: QuizVariant | null;
  puntaje_obtenido: number | null;
  puntaje_total: number;
  porcentaje_obtenido: number | null;
  porcentaje_aprobacion: number;
  aprobado: boolean;
  completado: boolean;
  fecha_inicio: string;
  fecha_fin: string | null;
  created_at: string;
  updated_at: string;
  respuestas: AdmissionAttemptAnswerItem[];
};

export type AdmissionStudentDetail = AdmissionResultItem & {
  quiz_id: number;
  quiz_titulo: string;
  intentos_permitidos: number;
  requiere_pago_reintento: boolean;
  intentos_detalle: AdmissionAttemptDetail[];
};
