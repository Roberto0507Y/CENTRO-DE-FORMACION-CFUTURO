import type { Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import { AuthService } from "./auth.service";

export class AuthController {
  private readonly service = new AuthService();

  register = async (req: AuthedRequest, res: Response) => {
    const result = await this.service.register(req.body);
    res.status(201).json({ ok: true, data: result });
  };

  login = async (req: AuthedRequest, res: Response) => {
    const result = await this.service.login(req.body);
    res.status(200).json({ ok: true, data: result });
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
