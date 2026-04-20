import type { Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import { AdminService } from "./admin.service";

export class AdminController {
  private readonly service = new AdminService();

  metrics = async (req: AuthedRequest, res: Response) => {
    const data = await this.service.metrics(req.auth!);
    res.status(200).json({ ok: true, data });
  };
}
