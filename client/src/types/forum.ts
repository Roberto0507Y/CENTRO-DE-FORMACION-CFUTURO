export type ForumTopicStatus = "activo" | "cerrado" | "oculto";
export type ForumReplyStatus = "activo" | "oculto";

export type ForumAuthor = {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  foto_url: string | null;
};

export type ForumTopicListItem = {
  id: number;
  curso_id: number;
  usuario_id: number;
  titulo: string;
  mensaje: string;
  estado: ForumTopicStatus;
  fijado: 0 | 1;
  created_at: string;
  updated_at: string;
  respuestas_count: number;
  last_reply_at: string | null;
  autor: ForumAuthor;
};

export type ForumReply = {
  id: number;
  tema_id: number;
  usuario_id: number;
  mensaje: string;
  estado: ForumReplyStatus;
  created_at: string;
  updated_at: string;
  autor: ForumAuthor;
};

export type ForumTopicDetail = {
  id: number;
  curso_id: number;
  usuario_id: number;
  titulo: string;
  mensaje: string;
  estado: ForumTopicStatus;
  fijado: 0 | 1;
  created_at: string;
  updated_at: string;
  autor: ForumAuthor;
  respuestas: ForumReply[];
  respuestas_count: number;
};

