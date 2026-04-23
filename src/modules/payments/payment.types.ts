export type PaymentStatus =
  | "pendiente"
  | "pagado"
  | "rechazado"
  | "cancelado"
  | "reembolsado";

export type PaymentMethod = "bi_pay" | "transferencia" | "deposito" | "efectivo" | "manual";
export type PaymentConcept = "curso" | "admision";

export type PaymentListItem = {
  id: number;
  referencia_pago: string;
  concepto: PaymentConcept;
  usuario: {
    id: number;
    nombres: string;
    apellidos: string;
    correo: string;
  };
  cursos: string | null;
  monto_total: string;
  moneda: string;
  metodo_pago: PaymentMethod;
  estado: PaymentStatus;
  comprobante_url?: string | null;
  fecha_pago: string | null;
  created_at: string;
};

export type PaymentDetailItem = {
  id: number;
  concepto: PaymentConcept;
  curso: {
    id: number;
    titulo: string;
  };
  precio_unitario: string;
  descuento: string;
  subtotal: string;
};

export type PaymentDetail = PaymentListItem & {
  transaccion_externa: string | null;
  comprobante_url: string | null;
  observaciones: string | null;
  items: PaymentDetailItem[];
};

export type ListPaymentsQuery = {
  limit: number;
  offset: number;
  estado?: PaymentStatus;
  metodo_pago?: PaymentMethod;
  curso_id?: number;
  usuario_id?: number;
  date_from?: string; // YYYY-MM-DD
  date_to?: string; // YYYY-MM-DD
};

export type PaymentsListResponse = {
  items: PaymentListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type PaymentsSummary = {
  totalRevenue: string;
  monthPaidCount: number;
  pendingCount: number;
  refundsTotal: string;
};

export type RevenuePoint = {
  date: string; // YYYY-MM-DD
  total: string;
};

export type MyCoursePayment = {
  payment: {
    id: number;
    estado: PaymentStatus;
    metodo_pago: PaymentMethod;
    monto_total: string;
    moneda: string;
    comprobante_url: string | null;
    observaciones: string | null;
    created_at: string;
    fecha_pago: string | null;
  } | null;
  enrollment: {
    id: number;
    estado: "activa" | "pendiente" | "cancelada" | "finalizada";
    tipo_inscripcion: "gratis" | "pagada";
  } | null;
};

export type ManualCoursePaymentInput = {
  metodo_pago: "manual" | "bi_pay";
};

export type MyPaymentHistoryItem = {
  id: number;
  estado: PaymentStatus;
  metodo_pago: PaymentMethod;
  monto_total: string;
  moneda: string;
  comprobante_url: string | null;
  observaciones: string | null;
  created_at: string;
  fecha_pago: string | null;
};

export type MyPaymentsCourseItem = {
  course: {
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
  latestPayment: MyPaymentHistoryItem | null;
  enrollment: {
    id: number;
    estado: "activa" | "pendiente" | "cancelada" | "finalizada";
    tipo_inscripcion: "gratis" | "pagada";
  } | null;
  paymentsCount: number;
};
