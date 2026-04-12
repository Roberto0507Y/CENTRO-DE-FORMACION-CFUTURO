export type CategoryStatus = "activo" | "inactivo";

export type CategoryAdminListItem = {
  id: number;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  estado: CategoryStatus;
  cursos_count: number;
  created_at: string;
  updated_at: string;
};

export type CreateCategoryInput = {
  nombre: string;
  descripcion?: string | null;
  imagen_url?: string | null;
};

export type UpdateCategoryInput = Partial<{
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  estado: CategoryStatus;
}>;

