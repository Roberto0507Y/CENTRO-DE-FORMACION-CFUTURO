"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileService = void 0;
const httpErrors_1 = require("../../common/errors/httpErrors");
const storage_service_1 = require("../../common/services/storage.service");
const file_repository_1 = require("./file.repository");
const DOWNLOAD_EXPIRES_IN_SECONDS = 5 * 60;
class FileService {
    constructor() {
        this.repo = new file_repository_1.FileRepository();
        this.storage = new storage_service_1.StorageService();
    }
    async createDownloadStream(requester, id) {
        const file = await this.repo.findById(id);
        if (!file)
            throw (0, httpErrors_1.notFound)("Archivo no encontrado");
        await this.assertCanDownload(requester, file);
        return this.storage.createDownloadStream({
            key: file.s3_key,
            originalName: file.nombre_original,
            contentType: file.mime_type,
            expiresInSeconds: DOWNLOAD_EXPIRES_IN_SECONDS,
        });
    }
    async assertCanDownload(requester, file) {
        if (requester.role === "admin")
            return;
        if (file.access_scope === "authenticated")
            return;
        if (file.owner_usuario_id === requester.userId)
            return;
        if (file.access_scope === "admin")
            throw (0, httpErrors_1.forbidden)("No autorizado");
        const courseAccess = file.curso_id
            ? await this.repo.getCourseAccessContext(file.curso_id, requester.userId)
            : null;
        if (file.access_scope === "owner") {
            if (requester.role === "docente" && courseAccess?.docente_id === requester.userId)
                return;
            throw (0, httpErrors_1.forbidden)("No autorizado");
        }
        if (!courseAccess)
            throw (0, httpErrors_1.forbidden)("No autorizado");
        if (file.access_scope === "course_manage") {
            if (requester.role === "docente" && courseAccess.docente_id === requester.userId)
                return;
            throw (0, httpErrors_1.forbidden)("No autorizado");
        }
        if (file.access_scope === "course") {
            if (requester.role === "docente" && courseAccess.docente_id === requester.userId)
                return;
            if (requester.role === "estudiante" &&
                courseAccess.curso_estado === "publicado" &&
                courseAccess.enrolled) {
                return;
            }
        }
        throw (0, httpErrors_1.forbidden)("No autorizado");
    }
}
exports.FileService = FileService;
