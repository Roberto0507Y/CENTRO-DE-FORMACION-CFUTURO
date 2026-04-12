export type ForumTopicStatus = "activo" | "cerrado" | "oculto";
export type ForumReplyStatus = "activo" | "oculto";

export type ForumAuthor = {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  foto_url: string | null;
};

export type ForumTopic = {
  id: number;
  curso_id: number;
  usuario_id: number;
  titulo: string;
  mensaje: string;
  estado: ForumTopicStatus;
  fijado: 0 | 1;
  created_at: string;
  updated_at: string;
};

export type ForumReply = {
  id: number;
  tema_id: number;
  usuario_id: number;
  mensaje: string;
  estado: ForumReplyStatus;
  created_at: string;
  updated_at: string;
};

export type ForumTopicListItem = ForumTopic & {
  autor: ForumAuthor;
  respuestas_count: number;
  last_reply_at: string | null;
};

export type ForumTopicDetail = ForumTopic & {
  autor: ForumAuthor;
  respuestas: Array<ForumReply & { autor: ForumAuthor }>;
  respuestas_count: number;
};

export type CreateTopicInput = {
  titulo: string;
  mensaje: string;
};

export type CreateReplyInput = {
  mensaje: string;
};

