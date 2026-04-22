export type UserRole = "admin" | "docente" | "estudiante";

export type User = {
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
  estado: "activo" | "inactivo" | "suspendido";
  ultimo_login: string | null;
  created_at: string;
  updated_at: string;
};

export type UserListResponse = {
  items: User[];
  total: number;
  limit: number;
  offset: number;
};

export type WebAuthSession = {
  authenticated: true;
  transport: "cookie";
  csrfToken: string;
};

export type WebAuthResponse = {
  user: User;
  session: WebAuthSession;
};

export type RegisterResponse = {
  pendingUser: {
    nombres: string;
    apellidos: string;
    correo: string;
  };
  verification: {
    required: true;
    emailSent: boolean;
  };
};

export type BearerAuthResponse = {
  user: User;
  token: string;
};
