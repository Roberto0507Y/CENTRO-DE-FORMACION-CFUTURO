import type { Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import { NotificationService } from "./notification.service";

export class NotificationController {
  private readonly service = new NotificationService();

  listMy = async (req: AuthedRequest, res: Response) => {
    const q = req.query as Record<string, unknown>;
    const limit = Number(q.limit ?? 20);
    const offset = Number(q.offset ?? 0);
    const unread = String(q.unread ?? "") === "1";
    const countOnly = String(q.countOnly ?? "") === "1";
    const data = await this.service.listMy(req.auth!, {
      limit,
      offset,
      unread: q.unread !== undefined ? unread : undefined,
      countOnly,
    });
    res.status(200).json({ ok: true, data });
  };

  markRead = async (req: AuthedRequest, res: Response) => {
    const id = Number((req.params as Record<string, string>).id);
    await this.service.markRead(req.auth!, id);
    res.status(200).json({ ok: true, data: { ok: true } });
  };

  markAllRead = async (req: AuthedRequest, res: Response) => {
    const data = await this.service.markAllRead(req.auth!);
    res.status(200).json({ ok: true, data });
  };

  remove = async (req: AuthedRequest, res: Response) => {
    const id = Number((req.params as Record<string, string>).id);
    await this.service.deleteMy(req.auth!, id);
    res.status(200).json({ ok: true, data: { ok: true } });
  };
}
