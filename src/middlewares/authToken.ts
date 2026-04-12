import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { forbidden, unauthorized } from "../common/errors/httpErrors";
import type { AuthContext } from "../common/types/express";
import { AuthRepository } from "../modules/auth/auth.repository";

const payloadSchema = z.object({
  sub: z.string().min(1),
});

const authRepo = new AuthRepository();

export async function resolveAuthContextFromBearer(header?: string): Promise<AuthContext> {
  if (!header?.startsWith("Bearer ")) {
    throw unauthorized("Token Bearer requerido");
  }

  const token = header.slice("Bearer ".length).trim();
  let userId: number;
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
    const payload = payloadSchema.parse(decoded);
    userId = Number(payload.sub);
  } catch {
    throw unauthorized("Token inválido o expirado");
  }

  if (!Number.isFinite(userId)) {
    throw unauthorized("Token inválido");
  }

  const user = await authRepo.findPublicById(userId);
  if (!user) {
    throw unauthorized("Usuario no encontrado");
  }

  if (user.estado !== "activo") {
    throw forbidden("Tu usuario no está activo");
  }

  return { userId: user.id, role: user.rol };
}
