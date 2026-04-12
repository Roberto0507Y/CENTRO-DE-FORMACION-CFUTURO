import type { Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import type { CreateMaterialInput, MaterialStatus, UpdateMaterialInput } from "./material.types";
import { MaterialService } from "./material.service";

export class MaterialController {
  private readonly service = new MaterialService();

  list = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const items = await this.service.list(req.auth!, courseId);
    res.status(200).json({ ok: true, data: items });
  };

  create = async (req: AuthedRequest & { file?: Express.Multer.File }, res: Response) => {
    const courseId = Number(req.params.courseId);
    const body = req.body as CreateMaterialInput;
    const created = await this.service.create(req.auth!, courseId, body, req.file);
    res.status(201).json({ ok: true, data: created });
  };

  update = async (req: AuthedRequest & { file?: Express.Multer.File }, res: Response) => {
    const courseId = Number(req.params.courseId);
    const id = Number(req.params.id);
    const body = req.body as UpdateMaterialInput;
    const updated = await this.service.update(req.auth!, courseId, id, body, req.file);
    res.status(200).json({ ok: true, data: updated });
  };

  patchStatus = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const id = Number(req.params.id);
    const body = req.body as { estado: MaterialStatus };
    await this.service.patchStatus(req.auth!, courseId, id, body.estado);
    res.status(200).json({ ok: true });
  };
}
