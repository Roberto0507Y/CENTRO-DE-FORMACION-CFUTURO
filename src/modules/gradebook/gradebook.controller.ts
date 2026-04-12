import type { Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import { GradebookService } from "./gradebook.service";

export class GradebookController {
  private readonly service = new GradebookService();

  myCourse = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const data = await this.service.getMyCourseGradebook(req.auth!, courseId);
    res.status(200).json({ ok: true, data });
  };
}
