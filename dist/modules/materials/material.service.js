"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialService = void 0;
const httpErrors_1 = require("../../common/errors/httpErrors");
const storage_service_1 = require("../../common/services/storage.service");
const fileAsset_service_1 = require("../files/fileAsset.service");
const material_repository_1 = require("./material.repository");
function isYoutubeOrVimeo(url) {
    const u = url.toLowerCase();
    return u.includes("youtube.com/") || u.includes("youtu.be/") || u.includes("vimeo.com/");
}
function inferTypeFromMime(mimeType) {
    if (mimeType === "application/pdf")
        return "pdf";
    if (mimeType.startsWith("image/"))
        return "imagen";
    if (mimeType.startsWith("video/"))
        return "video";
    return "archivo";
}
class MaterialService {
    constructor() {
        this.repo = new material_repository_1.MaterialRepository();
        this.files = new fileAsset_service_1.FileAssetService();
    }
    async list(requester, courseId) {
        const course = await this.repo.findCourseOwner(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        if (requester.role === "estudiante") {
            if (course.curso_estado !== "publicado")
                throw (0, httpErrors_1.notFound)("Curso no encontrado");
            const enrolled = await this.repo.isEnrolledActive(courseId, requester.userId);
            if (!enrolled)
                throw (0, httpErrors_1.forbidden)("No autorizado");
            return this.repo.listActiveByCourse(courseId);
        }
        // Admin y docente dueño pueden ver todo
        this.assertCanManage(requester, course.docente_id);
        return this.repo.listByCourse(courseId);
    }
    async create(requester, courseId, input, file) {
        const course = await this.repo.findCourseOwner(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        this.assertCanManage(requester, course.docente_id);
        const moduloId = input.modulo_id ?? null;
        if (moduloId !== null) {
            const ok = await this.repo.moduleBelongsToCourse(moduloId, courseId);
            if (!ok)
                throw (0, httpErrors_1.badRequest)("modulo_id no pertenece al curso");
        }
        const trimmedTitle = input.titulo.trim();
        if (!trimmedTitle)
            throw (0, httpErrors_1.badRequest)("titulo es requerido");
        const link = (input.enlace_url ?? "").trim();
        let tipo = input.tipo;
        if (!tipo) {
            if (file)
                tipo = inferTypeFromMime(file.mimetype);
            else if (link)
                tipo = isYoutubeOrVimeo(link) ? "video" : "enlace";
            else
                tipo = "archivo";
        }
        let archivoUrl = input.archivo_url ?? null;
        let enlaceUrl = link.length > 0 ? link : null;
        if (file) {
            const allowed = tipo === "video"
                ? storage_service_1.ALLOWED_VIDEOS
                : tipo === "pdf"
                    ? storage_service_1.ALLOWED_PDFS
                    : tipo === "imagen"
                        ? storage_service_1.ALLOWED_IMAGES
                        : storage_service_1.ALLOWED_TASK_FILES;
            const uploaded = await this.files.uploadManaged({
                module: "materials",
                keyPrefix: `materials/course-${courseId}${moduloId ? `/module-${moduloId}` : ""}`,
                originalName: file.originalname,
                buffer: file.buffer,
                mimeType: file.mimetype,
                allowed,
                ownerUsuarioId: requester.userId,
                cursoId: courseId,
                accessScope: "course",
            });
            archivoUrl = uploaded.url;
        }
        if (!enlaceUrl && !archivoUrl) {
            throw (0, httpErrors_1.badRequest)("Debes enviar enlace_url o archivo");
        }
        const orden = input.orden ?? (await this.repo.getNextOrder(courseId, moduloId));
        const estado = input.estado ?? "activo";
        let id;
        try {
            id = await this.repo.create(courseId, {
                modulo_id: moduloId,
                titulo: trimmedTitle,
                descripcion: input.descripcion ?? null,
                tipo,
                archivo_url: archivoUrl,
                enlace_url: enlaceUrl,
                orden,
                estado,
            });
        }
        catch (err) {
            if (file)
                await this.files.deleteByReference(archivoUrl, ["materials/"]);
            throw err;
        }
        const created = await this.repo.findById(courseId, id);
        if (!created)
            throw (0, httpErrors_1.notFound)("Material no encontrado");
        return created;
    }
    async update(requester, courseId, id, input, file) {
        const course = await this.repo.findCourseOwner(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        this.assertCanManage(requester, course.docente_id);
        const existing = await this.repo.findById(courseId, id);
        if (!existing)
            throw (0, httpErrors_1.notFound)("Material no encontrado");
        const moduloId = input.modulo_id ?? existing.modulo_id ?? null;
        if (input.modulo_id !== undefined && moduloId !== null) {
            const ok = await this.repo.moduleBelongsToCourse(moduloId, courseId);
            if (!ok)
                throw (0, httpErrors_1.badRequest)("modulo_id no pertenece al curso");
        }
        const link = input.enlace_url !== undefined ? (input.enlace_url ?? "").trim() : (existing.enlace_url ?? "");
        const nextTipo = input.tipo ??
            (file ? inferTypeFromMime(file.mimetype) : existing.tipo) ??
            (link ? (isYoutubeOrVimeo(link) ? "video" : "enlace") : "archivo");
        let archivoUrl = input.archivo_url ?? existing.archivo_url;
        if (file) {
            const allowed = nextTipo === "video"
                ? storage_service_1.ALLOWED_VIDEOS
                : nextTipo === "pdf"
                    ? storage_service_1.ALLOWED_PDFS
                    : nextTipo === "imagen"
                        ? storage_service_1.ALLOWED_IMAGES
                        : storage_service_1.ALLOWED_TASK_FILES;
            const uploaded = await this.files.uploadManaged({
                module: "materials",
                keyPrefix: `materials/course-${courseId}${moduloId ? `/module-${moduloId}` : ""}`,
                originalName: file.originalname,
                buffer: file.buffer,
                mimeType: file.mimetype,
                allowed,
                ownerUsuarioId: requester.userId,
                cursoId: courseId,
                accessScope: "course",
            });
            archivoUrl = uploaded.url;
        }
        const enlaceUrl = input.enlace_url !== undefined ? (link.length > 0 ? link : null) : existing.enlace_url;
        if (!enlaceUrl && !archivoUrl) {
            throw (0, httpErrors_1.badRequest)("Debes enviar enlace_url o archivo");
        }
        const titulo = input.titulo !== undefined ? input.titulo.trim() : undefined;
        if (input.titulo !== undefined && !titulo)
            throw (0, httpErrors_1.badRequest)("titulo es requerido");
        try {
            await this.repo.update(courseId, id, {
                ...input,
                modulo_id: input.modulo_id !== undefined ? (input.modulo_id ?? null) : undefined,
                titulo,
                tipo: nextTipo,
                archivo_url: archivoUrl,
                enlace_url: enlaceUrl ?? null,
            });
        }
        catch (err) {
            if (file)
                await this.files.deleteByReference(archivoUrl, ["materials/"]);
            throw err;
        }
        if (input.archivo_url !== undefined || file) {
            if (existing.archivo_url && existing.archivo_url !== archivoUrl) {
                await this.files.deleteByReference(existing.archivo_url, ["materials/"]);
            }
        }
        const updated = await this.repo.findById(courseId, id);
        if (!updated)
            throw (0, httpErrors_1.notFound)("Material no encontrado");
        return updated;
    }
    async patchStatus(requester, courseId, id, estado) {
        const course = await this.repo.findCourseOwner(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        this.assertCanManage(requester, course.docente_id);
        const existing = await this.repo.findById(courseId, id);
        if (!existing)
            throw (0, httpErrors_1.notFound)("Material no encontrado");
        await this.repo.patchStatus(courseId, id, estado);
    }
    assertCanManage(requester, docenteId) {
        const isAdmin = requester.role === "admin";
        const isOwnerTeacher = requester.role === "docente" && requester.userId === docenteId;
        if (!isAdmin && !isOwnerTeacher)
            throw (0, httpErrors_1.forbidden)("No autorizado");
    }
}
exports.MaterialService = MaterialService;
