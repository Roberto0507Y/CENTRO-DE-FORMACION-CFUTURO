import type { Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import { readCookieValue } from "../../common/utils/cookies";
import { clearAuthSessionCookie, setAuthSessionCookie } from "./auth-session";
import { clearCsrfToken, CSRF_COOKIE_NAME, issueCsrfToken, rotateCsrfToken } from "./csrf";
import { AuthService } from "./auth.service";
import type { AuthResult, BearerAuthResponse, WebAuthResponse } from "./auth.types";

type AuthResponseBody = WebAuthResponse | BearerAuthResponse;

function wantsBearerResponse(req: AuthedRequest): boolean {
  const requestedTransport = String(req.headers["x-auth-transport"] || "")
    .trim()
    .toLowerCase();
  return requestedTransport === "bearer" || requestedTransport === "cookie+bearer";
}

function buildWebAuthResponse(result: AuthResult, csrfToken: string): WebAuthResponse {
  return {
    user: result.user,
    session: {
      authenticated: true,
      transport: "cookie",
      csrfToken,
    },
  };
}

function buildBearerAuthResponse(result: AuthResult): BearerAuthResponse {
  return {
    user: result.user,
    token: result.token,
  };
}

export class AuthController {
  private readonly service = new AuthService();

  csrf = async (req: AuthedRequest, res: Response) => {
    const currentCsrfToken = readCookieValue(req.headers.cookie, CSRF_COOKIE_NAME);
    const csrfToken = issueCsrfToken(res, currentCsrfToken);
    res.status(200).json({ ok: true, data: { csrfToken } });
  };

  register = async (req: AuthedRequest, res: Response) => {
    const result = await this.service.register(req.body);
    const wantsBearer = wantsBearerResponse(req);

    if (wantsBearer) {
      res.status(201).json({ ok: true, data: buildBearerAuthResponse(result) satisfies AuthResponseBody });
      return;
    }

    setAuthSessionCookie(res, result.token);
    const csrfToken = rotateCsrfToken(res);
    res.status(201).json({ ok: true, data: buildWebAuthResponse(result, csrfToken) satisfies AuthResponseBody });
  };

  login = async (req: AuthedRequest, res: Response) => {
    const result = await this.service.login(req.body);
    const wantsBearer = wantsBearerResponse(req);

    if (wantsBearer) {
      res.status(200).json({ ok: true, data: buildBearerAuthResponse(result) satisfies AuthResponseBody });
      return;
    }

    setAuthSessionCookie(res, result.token);
    const csrfToken = rotateCsrfToken(res);
    res.status(200).json({ ok: true, data: buildWebAuthResponse(result, csrfToken) satisfies AuthResponseBody });
  };

  logout = async (_req: AuthedRequest, res: Response) => {
    clearAuthSessionCookie(res);
    clearCsrfToken(res);
    res.status(200).json({ ok: true, data: { ok: true } });
  };

  me = async (req: AuthedRequest, res: Response) => {
    const result = await this.service.me(req.auth!.userId);
    res.status(200).json({ ok: true, data: result });
  };

  forgotPassword = async (req: AuthedRequest, res: Response) => {
    await this.service.forgotPassword(req.body);
    res.status(200).json({
      ok: true,
      data: { ok: true },
      message: "Si el correo existe, te enviaremos instrucciones para recuperar tu contraseña.",
    });
  };

  resetPassword = async (req: AuthedRequest, res: Response) => {
    await this.service.resetPassword(req.body);
    res.status(200).json({ ok: true, data: { ok: true } });
  };
}
