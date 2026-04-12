import type { Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import { badRequest } from "../../common/errors/httpErrors";
import { AnnouncementService } from "./announcement.service";
import type { CreateAnnouncementInput, UpdateAnnouncementInput } from "./announcement.types";

type UploadRequest = AuthedRequest & { file?: Express.Multer.File };

export class AnnouncementController {
  private readonly service = new AnnouncementService();

  list = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const data = await this.service.list(req.auth!, courseId);
    res.status(200).json({ ok: true, data });
  };

  getById = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const id = Number(req.params.id);
    const data = await this.service.getById(req.auth!, courseId, id);
    res.status(200).json({ ok: true, data });
  };

  create = async (req: UploadRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const file = req.file;
    const body = req.body as CreateAnnouncementInput;
    if (!body.titulo || !body.mensaje) {
      // should be validated by zod, but keep safe
      throw badRequest("Debe enviar título y mensaje");
    }
    const data = await this.service.create(req.auth!, courseId, body, file);
    res.status(201).json({ ok: true, data });
  };

  update = async (req: UploadRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const id = Number(req.params.id);
    const file = req.file;
    const body = req.body as UpdateAnnouncementInput;
    const data = await this.service.update(req.auth!, courseId, id, body, file);
    res.status(200).json({ ok: true, data });
  };

  patchStatus = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const id = Number(req.params.id);
    const { estado } = req.body as { estado: "publicado" | "oculto" };
    const data = await this.service.patchStatus(req.auth!, courseId, id, estado);
    res.status(200).json({ ok: true, data });
  };
}
