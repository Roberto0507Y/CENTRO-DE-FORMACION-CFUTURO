import crypto from "crypto";
import { env } from "../../config/env";

export function buildPasswordTokenVersion(passwordHash: string): string {
  return crypto.createHmac("sha256", env.JWT_SECRET).update(passwordHash).digest("hex");
}
