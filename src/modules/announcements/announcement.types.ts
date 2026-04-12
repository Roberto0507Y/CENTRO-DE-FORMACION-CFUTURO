export type AnnouncementStatus = "publicado" | "oculto";

export type Announcement = {
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
};

export type AnnouncementListItem = Pick<
  Announcement,
  | "id"
  | "curso_id"
  | "usuario_id"
  | "titulo"
  | "mensaje"
  | "archivo_url"
  | "estado"
  | "fecha_publicacion"
  | "created_at"
  | "updated_at"
> & {
  autor: {
    id: number;
    nombres: string;
    apellidos: string;
    correo: string;
    foto_url: string | null;
  };
};

export type CreateAnnouncementInput = {
  titulo: string;
  mensaje: string;
  archivo_url?: string | null;
  estado?: AnnouncementStatus;
};

export type UpdateAnnouncementInput = Partial<{
  titulo: string;
  mensaje: string;
  archivo_url: string | null;
}>;
