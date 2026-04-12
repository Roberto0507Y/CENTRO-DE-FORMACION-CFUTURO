export type MaterialType = "archivo" | "video" | "enlace" | "pdf" | "imagen";

export type MaterialStatus = "activo" | "inactivo";

export type Material = {
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

export type CreateMaterialInput = {
  modulo_id?: number | null;
  titulo: string;
  descripcion?: string | null;
  tipo?: MaterialType;
  archivo_url?: string | null;
  enlace_url?: string | null;
  orden?: number;
  estado?: MaterialStatus;
};

export type UpdateMaterialInput = Partial<CreateMaterialInput>;

