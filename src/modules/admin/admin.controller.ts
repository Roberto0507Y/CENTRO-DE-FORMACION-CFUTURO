import type { Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import { pingDb } from "../../config/db";
import { AdminService } from "./admin.service";

export class AdminController {
  private readonly service = new AdminService();

  metrics = async (req: AuthedRequest, res: Response) => {
    const data = await this.service.metrics(req.auth!);
    res.status(200).json({ ok: true, data });
  };

  dbHealth = async (_req: AuthedRequest, res: Response) => {
    await pingDb();
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ ok: true, db: "up" });
  };
}
