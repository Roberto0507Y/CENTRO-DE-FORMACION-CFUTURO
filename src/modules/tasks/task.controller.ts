import type { Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import { TaskService } from "./task.service";
import type {
  CreateTaskInput,
  GradeSubmissionInput,
  ListSubmissionsQuery,
  UpdateTaskInput,
  UpsertSubmissionInput,
} from "./task.types";

export class TaskController {
  private readonly service = new TaskService();

  listByCourse = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const items = await this.service.listByCourse(req.auth!, courseId);
    res.status(200).json({ ok: true, data: items });
  };

  getById = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const task = await this.service.getById(req.auth!, id);
    res.status(200).json({ ok: true, data: task });
  };

  create = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const file = (req as AuthedRequest & { file?: Express.Multer.File }).file;
    const task = await this.service.create(req.auth!, courseId, req.body as CreateTaskInput, file);
    res.status(201).json({ ok: true, data: task });
  };

  update = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const file = (req as AuthedRequest & { file?: Express.Multer.File }).file;
    const task = await this.service.update(req.auth!, id, req.body as UpdateTaskInput, file);
    res.status(200).json({ ok: true, data: task });
  };

  close = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    await this.service.close(req.auth!, id);
    res.status(200).json({ ok: true, data: { id } });
  };

  submitMyWork = async (req: AuthedRequest, res: Response) => {
    const taskId = Number(req.params.taskId);
    const file = (req as AuthedRequest & { file?: Express.Multer.File }).file;
    const submission = await this.service.submitMyWork(
      req.auth!,
      taskId,
      req.body as UpsertSubmissionInput,
      file
    );
    res.status(201).json({ ok: true, data: submission });
  };

  getMySubmission = async (req: AuthedRequest, res: Response) => {
    const taskId = Number(req.params.taskId);
    const submission = await this.service.getMySubmission(req.auth!, taskId);
    res.status(200).json({ ok: true, data: submission });
  };

  listSubmissions = async (req: AuthedRequest, res: Response) => {
    const taskId = Number(req.params.taskId);
    const items = await this.service.listSubmissions(
      req.auth!,
      taskId,
      req.query as unknown as ListSubmissionsQuery
    );
    res.status(200).json({ ok: true, data: items });
  };

  gradeSubmission = async (req: AuthedRequest, res: Response) => {
    const taskId = Number(req.params.taskId);
    const submissionId = Number(req.params.submissionId);
    const submission = await this.service.gradeSubmission(
      req.auth!,
      taskId,
      submissionId,
      req.body as GradeSubmissionInput
    );
    res.status(200).json({ ok: true, data: submission });
  };
}
