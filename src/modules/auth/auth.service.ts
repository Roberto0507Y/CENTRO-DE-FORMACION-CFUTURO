import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";
import { badRequest, conflict, unauthorized } from "../../common/errors/httpErrors";
import { AuthRepository } from "./auth.repository";
import type {
  AuthLoginInput,
  AuthResult,
  AuthUserPublic,
  ForgotPasswordInput,
  RegisterResult,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "./auth.types";
import { sendMail } from "../../common/services/mailer.service";
import { withTransaction } from "../../config/db";
import type { AuthTokenPayload } from "../../common/types/auth";
import { buildPasswordTokenVersion } from "./auth-token-version";

const GENERIC_LOGIN_ERROR_MESSAGE = "Credenciales inválidas";
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("cfuturo-invalid-login-placeholder", 12);
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export class AuthService {
  private readonly repo = new AuthRepository();

  async register(input: RegisterInput): Promise<RegisterResult> {
    const correo = input.correo.toLowerCase().trim();
    const existing = await this.repo.findByEmail(correo);
    if (existing) throw conflict("El correo ya está registrado");

    const passwordHash = await bcrypt.hash(input.password, 12);

    const userId = await this.repo.createUser({
      nombres: input.nombres.trim(),
      apellidos: input.apellidos.trim(),
      dpi: input.dpi.trim(),
      correo,
      passwordHash,
      telefono: input.telefono ?? null,
      fotoUrl: input.foto_url ?? null,
      fechaNacimiento: input.fecha_nacimiento ?? null,
      direccion: input.direccion ?? null,
      rol: "estudiante",
      estado: "inactivo",
    });

    const user = await this.repo.findPublicById(userId);
    if (!user) throw new Error("No se pudo crear el usuario");

    const verificationToken = this.generateResetToken();
    const tokenHash = this.hashToken(verificationToken);
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

    await withTransaction(async (conn) => {
      const userLocked = await this.repo.lockUserById(conn, user.id);
      if (!userLocked) throw new Error("No se pudo preparar la verificación de correo");

      await this.repo.invalidateUnusedEmailVerificationsForUser(user.id, conn);
      await this.repo.createEmailVerification(user.id, tokenHash, expiresAt, conn);
    });

    const emailSent = await this.sendAccountVerificationEmail(user, verificationToken);
    return {
      user,
      verification: {
        required: true,
        emailSent,
      },
    };
  }

  async login(input: AuthLoginInput): Promise<AuthResult> {
    const correo = input.correo.toLowerCase().trim();
    const user = await this.repo.findByEmail(correo);
    const passwordHashToCheck = user?.password ?? DUMMY_PASSWORD_HASH;
    const valid = await bcrypt.compare(input.password, passwordHashToCheck);

    if (!user || !valid || user.estado !== "activo") {
      this.logLoginFailure(
        correo,
        !user ? "user_not_found" : !valid ? "password_mismatch" : "inactive_user",
        user
          ? {
              userId: user.id,
              estado: user.estado,
            }
          : undefined
      );
      throw unauthorized(GENERIC_LOGIN_ERROR_MESSAGE);
    }

    await this.repo.updateLastLogin(user.id);
    const publicUser = await this.repo.findPublicById(user.id);
    if (!publicUser) throw new Error("Usuario no encontrado");

    const token = this.signToken(publicUser, user.password);
    return { token, user: publicUser };
  }

  async me(userId: number): Promise<AuthUserPublic> {
    const user = await this.repo.findPublicById(userId);
    if (!user) throw unauthorized("Usuario no encontrado");
    return user;
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<{ ok: true }> {
    const correo = input.correo.toLowerCase().trim();
    const user = await this.repo.findByEmail(correo);

    // Respuesta uniforme para evitar enumeración de usuarios
    if (!user) return { ok: true };

    try {
      const frontendUrl = env.FRONTEND_URL;
      if (!frontendUrl) {
        // eslint-disable-next-line no-console
        console.error("[auth] FRONTEND_URL no está configurado; no se pudo enviar correo de recuperación.");
        return { ok: true };
      }

      const token = this.generateResetToken();
      const tokenHash = this.hashToken(token);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      let created = false;
      await withTransaction(async (conn) => {
        const userLocked = await this.repo.lockUserById(conn, user.id);
        if (!userLocked) return;

        await this.repo.invalidateUnusedPasswordResetsForUser(user.id, conn);
        await this.repo.createPasswordReset(user.id, tokenHash, expiresAt, conn);
        created = true;
      });

      if (!created) return { ok: true };

      const resetUrl = `${frontendUrl.replace(/\/+$/, "")}/auth/reset-password?token=${encodeURIComponent(token)}`;

      const subject = "Restablece tu contraseña - C.FUTURO";
      const text = [
        `Hola ${user.nombres},`,
        "",
        "Recibimos una solicitud para restablecer tu contraseña de C.FUTURO.",
        "",
        "Usa este enlace para crear una nueva contraseña:",
        resetUrl,
        "",
        "Este enlace expira en 1 hora.",
        "",
        "Seguridad: si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no se modificará.",
        "",
        "— Equipo C.FUTURO",
      ].join("\n");

      const html = `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Restablecer contraseña</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f1f5f9;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;width:100%;">
            <tr>
              <td align="center" style="padding:0 0 18px 0;">
                <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-weight:900;letter-spacing:-0.04em;color:#0f172a;font-size:18px;line-height:1;">
                  C.FUTURO
                </div>
              </td>
            </tr>

            <tr>
              <td style="background:#ffffff;border-radius:20px;box-shadow:0 12px 40px rgba(15,23,42,0.12);border:1px solid #e2e8f0;overflow:hidden;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="background:linear-gradient(135deg,#2563eb 0%, #06b6d4 100%);padding:22px 24px;">
                      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#ffffff;">
                        <div style="font-size:22px;line-height:1.25;font-weight:900;letter-spacing:-0.02em;margin:0 0 6px 0;">
                          Restablecer contraseña
                        </div>
                        <div style="font-size:13px;line-height:1.5;font-weight:600;opacity:0.95;margin:0;">
                          Enlace válido por <strong>1 hora</strong>.
                        </div>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:22px 24px 0 24px;">
                      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#0f172a;">
                        <div style="font-size:14px;line-height:1.7;color:#334155;margin:0 0 14px 0;">
                          Recibimos una solicitud para cambiar tu contraseña. Si fuiste tú, usa el botón para continuar.
                        </div>
                        <div style="font-size:14px;line-height:1.7;color:#334155;margin:0 0 14px 0;">
                          Hola <strong>${escapeHtml(user.nombres)}</strong>.
                        </div>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td align="left" style="padding:0 24px 8px 24px;">
                      <a href="${resetUrl}"
                         style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-weight:900;font-size:14px;padding:12px 18px;border-radius:14px;box-shadow:0 10px 22px rgba(37,99,235,0.25);">
                        Cambiar contraseña
                      </a>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:10px 24px 0 24px;">
                      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:12px 12px;">
                        <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:13px;line-height:1.6;color:#0f172a;margin:0;">
                          <strong>Seguridad:</strong> si no solicitaste este cambio, puedes ignorar este mensaje. Tu cuenta permanecerá segura y tu contraseña no se modificará.
                        </div>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:16px 24px 0 24px;">
                      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:12px;line-height:1.6;color:#64748b;margin:0;">
                        Si el botón no funciona, copia y pega este enlace en tu navegador:
                      </div>
                      <div style="margin-top:8px;word-break:break-all;">
                        <a href="${resetUrl}"
                           style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12px;color:#2563eb;text-decoration:underline;">
                          ${resetUrl}
                        </a>
                      </div>
                      <div style="margin-top:14px;border-top:1px solid #e2e8f0;"></div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:14px 24px 22px 24px;">
                      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:12px;line-height:1.6;color:#94a3b8;margin:0;">
                        Este correo fue enviado automáticamente por C.FUTURO.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:14px 8px 0 8px;">
                <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:12px;line-height:1.6;color:#94a3b8;">
                  Este correo fue enviado a ${escapeHtml(user.correo)} · © ${new Date().getFullYear()} C.FUTURO
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
      `.trim();

      await sendMail({ to: user.correo, subject, text, html });
    } catch (err) {
      // Mantenemos respuesta uniforme para evitar enumeración de usuarios.
      // eslint-disable-next-line no-console
      console.error("[auth] Error en forgotPassword:", err);
    }

    return { ok: true };
  }

  async resetPassword(input: ResetPasswordInput): Promise<{ ok: true }> {
    const token = input.token.trim();
    const tokenHash = this.hashToken(token);

    const preRow = await this.repo.findPasswordResetByHash(tokenHash);
    if (!preRow) throw badRequest("Token inválido o expirado");
    if (preRow.used_at) throw badRequest("Token ya fue utilizado");

    const preExpires = new Date(preRow.expires_at);
    if (Number.isNaN(preExpires.getTime()) || preExpires.getTime() < Date.now()) {
      throw badRequest("Token inválido o expirado");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    await withTransaction(async (conn) => {
      const row = await this.repo.findPasswordResetByHashForUpdate(conn, tokenHash);
      if (!row) throw badRequest("Token inválido o expirado");
      if (row.used_at) throw badRequest("Token ya fue utilizado");

      const expires = new Date(row.expires_at);
      if (Number.isNaN(expires.getTime()) || expires.getTime() < Date.now()) {
        throw badRequest("Token inválido o expirado");
      }

      const userUpdated = await this.repo.updateUserPassword(row.usuario_id, passwordHash, conn);
      if (userUpdated === 0) throw badRequest("Token inválido o expirado");

      const tokenUsed = await this.repo.markPasswordResetUsed(row.id, conn);
      if (tokenUsed === 0) throw badRequest("Token inválido o expirado");

      await this.repo.invalidateUnusedPasswordResetsForUser(row.usuario_id, conn);
    });

    return { ok: true };
  }

  async verifyEmail(input: VerifyEmailInput): Promise<{ ok: true }> {
    const token = input.token.trim();
    const tokenHash = this.hashToken(token);

    const preRow = await this.repo.findEmailVerificationByHash(tokenHash);
    if (!preRow) throw badRequest("Token inválido o expirado");
    if (preRow.used_at) throw badRequest("Token ya fue utilizado");

    const preExpires = new Date(preRow.expires_at);
    if (Number.isNaN(preExpires.getTime()) || preExpires.getTime() < Date.now()) {
      throw badRequest("Token inválido o expirado");
    }

    await withTransaction(async (conn) => {
      const row = await this.repo.findEmailVerificationByHashForUpdate(conn, tokenHash);
      if (!row) throw badRequest("Token inválido o expirado");
      if (row.used_at) throw badRequest("Token ya fue utilizado");

      const expires = new Date(row.expires_at);
      if (Number.isNaN(expires.getTime()) || expires.getTime() < Date.now()) {
        throw badRequest("Token inválido o expirado");
      }

      const userLocked = await this.repo.lockUserById(conn, row.usuario_id);
      if (!userLocked) throw badRequest("Token inválido o expirado");

      const userUpdated = await this.repo.updateUserStatus(row.usuario_id, "activo", conn);
      if (userUpdated === 0) throw badRequest("Token inválido o expirado");

      const tokenUsed = await this.repo.markEmailVerificationUsed(row.id, conn);
      if (tokenUsed === 0) throw badRequest("Token inválido o expirado");

      await this.repo.invalidateUnusedEmailVerificationsForUser(row.usuario_id, conn);
    });

    return { ok: true };
  }

  private signToken(user: Pick<AuthUserPublic, "id" | "rol">, passwordHash: string): string {
    const expiresIn = env.JWT_EXPIRES_IN as SignOptions["expiresIn"];
    const payload: AuthTokenPayload = {
      sub: String(user.id),
      role: user.rol,
      pwdv: buildPasswordTokenVersion(passwordHash),
    };
    return jwt.sign(payload, env.JWT_SECRET, {
      algorithm: "HS256",
      expiresIn,
    });
  }

  private generateResetToken(): string {
    const buf = crypto.randomBytes(32);
    // base64url
    return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private async sendAccountVerificationEmail(
    user: Pick<AuthUserPublic, "nombres" | "correo">,
    token: string
  ): Promise<boolean> {
    try {
      const frontendUrl = env.FRONTEND_URL;
      if (!frontendUrl) {
        // eslint-disable-next-line no-console
        console.error("[auth] FRONTEND_URL no está configurado; no se pudo enviar correo de confirmación.");
        return false;
      }

      const verifyUrl = `${frontendUrl.replace(/\/+$/, "")}/auth/verify-email?token=${encodeURIComponent(token)}`;
      const subject = "Confirma tu cuenta - C.FUTURO";
      const text = [
        `Hola ${user.nombres},`,
        "",
        "Gracias por crear tu cuenta en C.FUTURO.",
        "",
        "Confirma tu correo para activar tu cuenta:",
        verifyUrl,
        "",
        "Este enlace expira en 24 horas.",
        "",
        "Si no creaste esta cuenta, puedes ignorar este correo.",
        "",
        "— Equipo C.FUTURO",
      ].join("\n");

      const html = `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Confirma tu cuenta</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f1f5f9;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;width:100%;">
            <tr>
              <td align="center" style="padding:0 0 18px 0;">
                <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-weight:900;letter-spacing:-0.04em;color:#0f172a;font-size:18px;line-height:1;">
                  C.FUTURO
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;border-radius:20px;box-shadow:0 12px 40px rgba(15,23,42,0.12);border:1px solid #e2e8f0;overflow:hidden;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="background:linear-gradient(135deg,#0f172a 0%, #2563eb 55%, #06b6d4 100%);padding:24px;">
                      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#ffffff;">
                        <div style="font-size:22px;line-height:1.25;font-weight:900;letter-spacing:-0.02em;margin:0 0 6px 0;">
                          Confirma tu cuenta
                        </div>
                        <div style="font-size:13px;line-height:1.5;font-weight:600;opacity:0.95;margin:0;">
                          Activa tu acceso seguro a C.FUTURO.
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:22px 24px 0 24px;">
                      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#0f172a;">
                        <div style="font-size:14px;line-height:1.7;color:#334155;margin:0 0 14px 0;">
                          Hola <strong>${escapeHtml(user.nombres)}</strong>, gracias por crear tu cuenta. Para proteger tu acceso, confirma que este correo te pertenece.
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td align="left" style="padding:0 24px 8px 24px;">
                      <a href="${verifyUrl}"
                         style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-weight:900;font-size:14px;padding:12px 18px;border-radius:14px;box-shadow:0 10px 22px rgba(37,99,235,0.25);">
                        Confirmar cuenta
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 24px 0 24px;">
                      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:12px;">
                        <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:13px;line-height:1.6;color:#0f172a;margin:0;">
                          Este enlace expira en <strong>24 horas</strong>. Si no creaste esta cuenta, ignora este mensaje.
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 24px 0 24px;">
                      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:12px;line-height:1.6;color:#64748b;margin:0;">
                        Si el botón no funciona, copia y pega este enlace en tu navegador:
                      </div>
                      <div style="margin-top:8px;word-break:break-all;">
                        <a href="${verifyUrl}"
                           style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12px;color:#2563eb;text-decoration:underline;">
                          ${verifyUrl}
                        </a>
                      </div>
                      <div style="margin-top:14px;border-top:1px solid #e2e8f0;"></div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:14px 24px 22px 24px;">
                      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:12px;line-height:1.6;color:#94a3b8;margin:0;">
                        Este correo fue enviado automáticamente por C.FUTURO.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:14px 8px 0 8px;">
                <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;font-size:12px;line-height:1.6;color:#94a3b8;">
                  Este correo fue enviado a ${escapeHtml(user.correo)} · © ${new Date().getFullYear()} C.FUTURO
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
      `.trim();

      await sendMail({ to: user.correo, subject, text, html });
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[auth] Error enviando correo de confirmación:", err);
      return false;
    }
  }

  private logLoginFailure(
    correo: string,
    reason: "user_not_found" | "password_mismatch" | "inactive_user",
    extra?: Record<string, unknown>
  ): void {
    // eslint-disable-next-line no-console
    console.warn("[auth] Login fallido", {
      correo,
      reason,
      ...extra,
    });
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
