import type { Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import { LessonService } from "./lesson.service";

export class LessonController {
  private readonly service = new LessonService();

  listByModule = async (req: AuthedRequest, res: Response) => {
    const moduleId = Number(req.params.moduleId);
    const items = await this.service.listByModule(moduleId, req.auth);
    res.status(200).json({ ok: true, data: items });
  };

  getById = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const lesson = await this.service.getById(id, req.auth);
    res.status(200).json({ ok: true, data: lesson });
  };

  create = async (req: AuthedRequest, res: Response) => {
    const lesson = await this.service.create(req.auth!, req.body, req.file);
    res.status(201).json({ ok: true, data: lesson });
  };

  update = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const lesson = await this.service.update(req.auth!, id, req.body, req.file);
    res.status(200).json({ ok: true, data: lesson });
  };

  remove = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    await this.service.remove(req.auth!, id);
    res.status(200).json({ ok: true, data: { id } });
  };

  complete = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    await this.service.complete(req.auth!, id);
    res.status(200).json({ ok: true, data: { id, completed: true } });
  };
}

