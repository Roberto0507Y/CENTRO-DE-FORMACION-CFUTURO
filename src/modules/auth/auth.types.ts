import type { UserRole, UserStatus } from "../../common/types/auth";

export type RegisterInput = {
  nombres: string;
  apellidos: string;
  dpi: string;
  correo: string;
  password: string;
  telefono?: string | null;
  foto_url?: string | null;
  fecha_nacimiento?: string | null; // YYYY-MM-DD
  direccion?: string | null;
};

export type AuthLoginInput = {
  correo: string;
  password: string;
};

export type AuthUserPublic = {
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

export type AuthUserWithPassword = AuthUserPublic & { password: string };
export type AuthUserSessionState = Pick<AuthUserWithPassword, "id" | "password" | "rol" | "estado">;

export type AuthResult = {
  token: string;
  user: AuthUserPublic;
};

export type WebAuthSession = {
  authenticated: true;
  transport: "cookie";
  csrfToken: string;
};

export type WebAuthResponse = {
  user: AuthUserPublic;
  session: WebAuthSession;
};

export type BearerAuthResponse = {
  user: AuthUserPublic;
  token: string;
};

export type ForgotPasswordInput = {
  correo: string;
};

export type ResetPasswordInput = {
  token: string;
  password: string;
};

export type PasswordResetRow = {
  id: number;
  usuario_id: number;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

export type CreateUserInput = {
  nombres: string;
  apellidos: string;
  dpi: string | null;
  correo: string;
  passwordHash: string;
  telefono: string | null;
  fotoUrl: string | null;
  fechaNacimiento: string | null;
  direccion: string | null;
  rol: UserRole;
  estado: UserStatus;
};
