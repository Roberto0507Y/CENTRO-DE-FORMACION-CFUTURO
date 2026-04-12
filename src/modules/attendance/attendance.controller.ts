import type { Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import { AttendanceService } from "./attendance.service";
import type { UpsertAttendanceItemInput } from "./attendance.types";

export class AttendanceController {
  private readonly service = new AttendanceService();

  list = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const date = typeof req.query.date === "string" ? req.query.date : undefined;
    const data = await this.service.list(req.auth!, courseId, date);
    res.status(200).json({ ok: true, data });
  };

  upsert = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const { date, items } = req.body as { date: string; items: UpsertAttendanceItemInput[] };
    const data = await this.service.upsert(req.auth!, courseId, date, items);
    res.status(200).json({ ok: true, data });
  };
}
