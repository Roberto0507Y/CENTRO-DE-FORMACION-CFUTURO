export type AnnouncementStatus = "publicado" | "oculto";

export type AnnouncementAuthor = {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  foto_url: string | null;
};

export type AnnouncementListItem = {
  id: number;
  curso_id: number;
  usuario_id: number;
  titulo: string;
  mensaje: string;
  archivo_url: string | null;
  estado: AnnouncementStatus;
  fecha_publicacion: string;
  created_at: string;
  updated_at: string;
  autor: AnnouncementAuthor;
};

