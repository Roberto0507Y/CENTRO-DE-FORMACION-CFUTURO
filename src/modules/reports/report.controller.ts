import type { Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import { ReportService } from "./report.service";

export class ReportController {
  private readonly service = new ReportService();

  zone = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.query.course_id);
    const data = await this.service.zone(req.auth!, courseId);
    res.status(200).json({ ok: true, data });
  };
}
