import type { Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import { EnrollmentService } from "./enrollment.service";

export class EnrollmentController {
  private readonly service = new EnrollmentService();

  enrollFree = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const data = await this.service.enrollFree(req.auth!, courseId);
    res.status(201).json({ ok: true, data });
  };

  confirmPaid = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const data = await this.service.confirmPaid(req.auth!, courseId);
    res.status(201).json({ ok: true, data });
  };

  myCourses = async (req: AuthedRequest, res: Response) => {
    const items = await this.service.myCourses(req.auth!);
    res.status(200).json({ ok: true, data: items });
  };

  checkAccess = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const data = await this.service.checkAccess(req.auth!, courseId);
    res.status(200).json({ ok: true, data });
  };

  courseStudents = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const items = await this.service.courseStudents(req.auth!, courseId);
    res.status(200).json({ ok: true, data: items });
  };

  updateProgress = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    await this.service.updateProgress(req.auth!, id, req.body.progreso);
    res.status(200).json({ ok: true, data: { id } });
  };

  cancel = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    await this.service.cancel(req.auth!, id);
    res.status(200).json({ ok: true, data: { id } });
  };

  expel = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    await this.service.expel(req.auth!, id);
    res.status(200).json({ ok: true, data: { id } });
  };
}
