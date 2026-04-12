export type MaterialType = "archivo" | "video" | "enlace" | "pdf" | "imagen";

export type MaterialStatus = "activo" | "inactivo";

export type MaterialListItem = {
  id: number;
  curso_id: number;
  modulo_id: number | null;
  titulo: string;
  descripcion: string | null;
  tipo: MaterialType;
  archivo_url: string | null;
  enlace_url: string | null;
  orden: number;
  estado: MaterialStatus;
  created_at: string;
  updated_at: string;
};

