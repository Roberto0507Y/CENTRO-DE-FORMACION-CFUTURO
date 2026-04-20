import type { Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import { UserService } from "./user.service";

export class UserController {
  private readonly service = new UserService();

  getById = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const user = await this.service.getById(req.auth!, id);
    res.status(200).json({ ok: true, data: user });
  };

  list = async (req: AuthedRequest, res: Response) => {
    const limit = Math.max(1, Math.min(Number(req.query.limit ?? 20) || 20, 50));
    const offset = Math.max(0, Number(req.query.offset ?? 0) || 0);
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const result = await this.service.list(req.auth!, { limit, offset, search });
    res.status(200).json({ ok: true, data: { ...result, limit, offset } });
  };

  update = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const user = await this.service.update(req.auth!, id, req.body);
    res.status(200).json({ ok: true, data: user });
  };

  delete = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const result = await this.service.delete(req.auth!, id);
    res.status(200).json({ ok: true, data: result });
  };
}
