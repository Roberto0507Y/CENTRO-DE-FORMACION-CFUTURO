import type { UserRole, UserStatus } from "../../common/types/auth";

export type UserPublic = {
  id: number;
  nombres: string;
  apellidos: string;
  dpi: string | null;
  correo: string;
  telefono: string | null;
  foto_url: string | null;
  fecha_nacimiento: string | null;
  direccion: string | null;
  rol: UserRole;
  estado: UserStatus;
  ultimo_login: string | null;
  created_at: string;
  updated_at: string;
};

export type UpdateUserInput = Partial<{
  nombres: string;
  apellidos: string;
  telefono: string | null;
  foto_url: string | null;
  fecha_nacimiento: string | null;
  direccion: string | null;
  rol: UserRole;
  estado: UserStatus;
}>;

export type ListUsersParams = {
  limit: number;
  offset: number;
  search?: string;
};

export type ListUsersResult = {
  items: UserPublic[];
  total: number;
};
