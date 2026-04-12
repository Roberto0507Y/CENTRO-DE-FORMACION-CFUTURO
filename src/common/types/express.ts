import type { Request } from "express";
import type { UserRole } from "./auth";

export type AuthContext = {
  userId: number;
  role: UserRole;
};

export type AuthedRequest = Request & {
  auth?: AuthContext;
};

