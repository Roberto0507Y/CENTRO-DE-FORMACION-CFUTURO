import type { Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import { sendDownloadStream } from "../../common/utils/downloadResponse";
import { FileService } from "./file.service";

export class FileController {
  private readonly service = new FileService();

  download = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const file = await this.service.createDownloadStream(req.auth!, id);
    sendDownloadStream(res, file);
  };
}
