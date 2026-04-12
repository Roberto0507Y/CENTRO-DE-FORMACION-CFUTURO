export type NotificationType =
  | "anuncio"
  | "tarea"
  | "entrega"
  | "calificacion"
  | "quiz"
  | "curso"
  | "pago"
  | "sistema";

export type NotificationItem = {
  id: number;
  usuario_id: number;
  titulo: string;
  mensaje: string;
  tipo: NotificationType;
  referencia_tipo: string | null;
  referencia_id: number | null;
  leida: 0 | 1;
  fecha_lectura: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationListResponse = {
  items: NotificationItem[];
  total: number;
  limit: number;
  offset: number;
  unreadCount: number;
};

