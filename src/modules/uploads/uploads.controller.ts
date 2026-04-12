import type { Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import { UploadsService } from "./uploads.service";

type UploadRequest = AuthedRequest & { file?: Express.Multer.File };

export class UploadsController {
  private readonly service = new UploadsService();

  uploadCourseImage = async (req: UploadRequest, res: Response) => {
    const file = req.file!;
    const uploaded = await this.service.uploadCourseImage(req.auth!, file);
    res.status(201).json({ ok: true, data: uploaded });
  };

  uploadCategoryImage = async (req: UploadRequest, res: Response) => {
    const file = req.file!;
    const uploaded = await this.service.uploadCategoryImage(req.auth!, file);
    res.status(201).json({ ok: true, data: uploaded });
  };

  uploadAvatar = async (req: UploadRequest, res: Response) => {
    const file = req.file!;
    const uploaded = await this.service.uploadAvatar(req.auth!, file);
    res.status(201).json({ ok: true, data: uploaded });
  };
}
