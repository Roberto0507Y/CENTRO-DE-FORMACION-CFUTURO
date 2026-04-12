export type StoredFileAccessScope =
  | "owner"
  | "course"
  | "course_manage"
  | "authenticated"
  | "admin";

export type StoredFile = {
  id: number;
  s3_key: string;
  nombre_original: string;
  mime_type: string;
  size_bytes: number | null;
  owner_usuario_id: number | null;
  curso_id: number | null;
  access_scope: StoredFileAccessScope;
  created_at: string;
  updated_at: string;
};

export type CourseFileAccessContext = {
  docente_id: number;
  curso_estado: "borrador" | "publicado" | "oculto";
  enrolled: boolean;
};

