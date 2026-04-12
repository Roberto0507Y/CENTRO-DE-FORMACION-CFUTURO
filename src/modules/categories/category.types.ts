export type CategoryStatus = "activo" | "inactivo";

export type Category = {
  id: number;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  estado: CategoryStatus;
  created_at: string;
  updated_at: string;
};

export type CategoryAdminListItem = Category & { cursos_count: number };

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

export type ListCategoriesQuery = {
  q?: string;
  estado?: CategoryStatus;
  include_counts?: boolean;
  all?: boolean;
};
