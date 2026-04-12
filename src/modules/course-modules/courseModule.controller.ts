import type { Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import { CourseModuleService } from "./courseModule.service";

export class CourseModuleController {
  private readonly service = new CourseModuleService();

  listByCourse = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const data = await this.service.listByCourse(req.auth ?? null, courseId);
    res.status(200).json({ ok: true, data });
  };
}

