import { forbidden, notFound } from "../../common/errors/httpErrors";
import { StorageService, type DownloadStreamResult } from "../../common/services/storage.service";
import type { AuthContext } from "../../common/types/express";
import { FileRepository } from "./file.repository";
import type { StoredFile } from "./file.types";

const DOWNLOAD_EXPIRES_IN_SECONDS = 5 * 60;

export class FileService {
  private readonly repo = new FileRepository();
  private readonly storage = new StorageService();

  async createDownloadStream(requester: AuthContext, id: number): Promise<DownloadStreamResult> {
    const file = await this.repo.findById(id);
    if (!file) throw notFound("Archivo no encontrado");

    await this.assertCanDownload(requester, file);

    return this.storage.createDownloadStream({
      key: file.s3_key,
      originalName: file.nombre_original,
      contentType: file.mime_type,
      expiresInSeconds: DOWNLOAD_EXPIRES_IN_SECONDS,
    });
  }

  private async assertCanDownload(requester: AuthContext, file: StoredFile): Promise<void> {
    if (requester.role === "admin") return;
    if (file.access_scope === "authenticated") return;
    if (file.owner_usuario_id === requester.userId) return;
    if (file.access_scope === "admin") throw forbidden("No autorizado");

    const courseAccess = file.curso_id
      ? await this.repo.getCourseAccessContext(file.curso_id, requester.userId)
      : null;

    if (file.access_scope === "owner") {
      if (requester.role === "docente" && courseAccess?.docente_id === requester.userId) return;
      throw forbidden("No autorizado");
    }

    if (!courseAccess) throw forbidden("No autorizado");

    if (file.access_scope === "course_manage") {
      if (requester.role === "docente" && courseAccess.docente_id === requester.userId) return;
      throw forbidden("No autorizado");
    }

    if (file.access_scope === "course") {
      if (requester.role === "docente" && courseAccess.docente_id === requester.userId) return;
      if (
        requester.role === "estudiante" &&
        courseAccess.curso_estado === "publicado" &&
        courseAccess.enrolled
      ) {
        return;
      }
    }

    throw forbidden("No autorizado");
  }
}
