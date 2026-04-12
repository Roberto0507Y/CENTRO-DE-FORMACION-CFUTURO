"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementService = void 0;
const httpErrors_1 = require("../../common/errors/httpErrors");
const db_1 = require("../../config/db");
const storage_service_1 = require("../../common/services/storage.service");
const fileAsset_service_1 = require("../files/fileAsset.service");
const announcement_repository_1 = require("./announcement.repository");
class AnnouncementService {
    constructor() {
        this.repo = new announcement_repository_1.AnnouncementRepository();
        this.files = new fileAsset_service_1.FileAssetService();
    }
    async list(requester, courseId) {
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        if (requester.role === "admin") {
            return this.repo.listByCourse(courseId);
        }
        if (requester.role === "docente") {
            if (course.docente_id !== requester.userId)
                throw (0, httpErrors_1.forbidden)("No autorizado");
            return this.repo.listByCourse(courseId);
        }
        // estudiante
        if (course.estado !== "publicado")
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        const enrolled = await this.repo.userIsEnrolledActive(requester.userId, courseId);
        if (!enrolled)
            throw (0, httpErrors_1.forbidden)("No tienes acceso a este curso");
        return this.repo.listByCourse(courseId, "publicado");
    }
    async getById(requester, courseId, id) {
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        const ann = await this.repo.findById(courseId, id);
        if (!ann)
            throw (0, httpErrors_1.notFound)("Anuncio no encontrado");
        if (requester.role === "admin")
            return ann;
        if (requester.role === "docente") {
            if (course.docente_id !== requester.userId)
                throw (0, httpErrors_1.forbidden)("No autorizado");
            return ann;
        }
        // estudiante
        if (course.estado !== "publicado")
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        const enrolled = await this.repo.userIsEnrolledActive(requester.userId, courseId);
        if (!enrolled)
            throw (0, httpErrors_1.forbidden)("No tienes acceso a este curso");
        if (ann.estado !== "publicado")
            throw (0, httpErrors_1.notFound)("Anuncio no encontrado");
        return ann;
    }
    async create(requester, courseId, input, file) {
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        this.assertCanManage(requester, course.docente_id);
        const estado = input.estado ?? "publicado";
        const uploadedUrl = file
            ? (await this.files.uploadManaged({
                module: "announcements",
                keyPrefix: `announcements/course-${courseId}/user-${requester.userId}`,
                originalName: file.originalname,
                buffer: file.buffer,
                mimeType: file.mimetype,
                allowed: storage_service_1.ALLOWED_ANNOUNCEMENT_FILES,
                ownerUsuarioId: requester.userId,
                cursoId: courseId,
                accessScope: "course",
            })).url
            : null;
        const archivo_url = uploadedUrl ?? (input.archivo_url === undefined ? null : input.archivo_url ?? null);
        let id;
        try {
            id = await (0, db_1.withTransaction)(async (conn) => {
                return this.repo.create(conn, {
                    curso_id: courseId,
                    usuario_id: requester.userId,
                    titulo: input.titulo.trim(),
                    mensaje: input.mensaje.trim(),
                    archivo_url,
                    estado,
                });
            });
        }
        catch (err) {
            if (file)
                await this.files.deleteByReference(archivo_url, ["announcements/"]);
            throw err;
        }
        const created = await this.repo.findById(courseId, id);
        if (!created)
            throw new Error("No se pudo crear el anuncio");
        return created;
    }
    async update(requester, courseId, id, input, file) {
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        this.assertCanManage(requester, course.docente_id);
        const current = await this.repo.findById(courseId, id);
        if (!current)
            throw (0, httpErrors_1.notFound)("Anuncio no encontrado");
        const uploadedUrl = file
            ? (await this.files.uploadManaged({
                module: "announcements",
                keyPrefix: `announcements/course-${courseId}/user-${requester.userId}`,
                originalName: file.originalname,
                buffer: file.buffer,
                mimeType: file.mimetype,
                allowed: storage_service_1.ALLOWED_ANNOUNCEMENT_FILES,
                ownerUsuarioId: requester.userId,
                cursoId: courseId,
                accessScope: "course",
            })).url
            : null;
        const nextArchivoUrl = uploadedUrl ?? (input.archivo_url === undefined ? undefined : input.archivo_url);
        try {
            await (0, db_1.withTransaction)(async (conn) => {
                const affected = await this.repo.updateById(conn, courseId, id, {
                    titulo: input.titulo?.trim(),
                    mensaje: input.mensaje?.trim(),
                    archivo_url: nextArchivoUrl,
                });
                if (affected === 0)
                    throw (0, httpErrors_1.notFound)("Anuncio no encontrado");
            });
        }
        catch (err) {
            if (file)
                await this.files.deleteByReference(uploadedUrl, ["announcements/"]);
            throw err;
        }
        if (nextArchivoUrl !== undefined && current.archivo_url && current.archivo_url !== nextArchivoUrl) {
            await this.files.deleteByReference(current.archivo_url, ["announcements/"]);
        }
        const updated = await this.repo.findById(courseId, id);
        if (!updated)
            throw (0, httpErrors_1.notFound)("Anuncio no encontrado");
        return updated;
    }
    async patchStatus(requester, courseId, id, estado) {
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        this.assertCanManage(requester, course.docente_id);
        await (0, db_1.withTransaction)(async (conn) => {
            const affected = await this.repo.updateStatus(conn, courseId, id, estado);
            if (affected === 0)
                throw (0, httpErrors_1.notFound)("Anuncio no encontrado");
        });
        const updated = await this.repo.findById(courseId, id);
        if (!updated)
            throw (0, httpErrors_1.notFound)("Anuncio no encontrado");
        return updated;
    }
    assertCanManage(requester, docenteId) {
        const isAdmin = requester.role === "admin";
        const isOwnerTeacher = requester.role === "docente" && requester.userId === docenteId;
        if (!isAdmin && !isOwnerTeacher)
            throw (0, httpErrors_1.forbidden)("No autorizado");
    }
}
exports.AnnouncementService = AnnouncementService;
