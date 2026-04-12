export type UserRole = "admin" | "docente" | "estudiante";
export type UserStatus = "activo" | "inactivo" | "suspendido";

export type AuthTokenPayload = {
  sub: string; // user id
  role: UserRole;
};
