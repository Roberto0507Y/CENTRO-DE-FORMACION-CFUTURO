"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LessonService = void 0;
const httpErrors_1 = require("../../common/errors/httpErrors");
const storage_service_1 = require("../../common/services/storage.service");
const fileAsset_service_1 = require("../files/fileAsset.service");
const lesson_repository_1 = require("./lesson.repository");
class LessonService {
    constructor() {
        this.repo = new lesson_repository_1.LessonRepository();
        this.files = new fileAsset_service_1.FileAssetService();
    }
    async listByModule(moduleId, requester) {
        const ctx = await this.repo.getModuleContext(moduleId);
        if (!ctx)
            throw (0, httpErrors_1.notFound)("Módulo no encontrado");
        const isAdmin = requester?.role === "admin";
        const isOwnerTeacher = requester?.role === "docente" && requester.userId === ctx.docente_id;
        if (ctx.curso_estado !== "publicado" && !isAdmin && !isOwnerTeacher) {
            throw (0, httpErrors_1.notFound)("Módulo no encontrado");
        }
        const enrolled = requester?.userId ? await this.repo.userIsEnrolledActive(requester.userId, ctx.curso_id) : false;
        const previewOnly = ctx.curso_estado === "publicado" && !enrolled && !isAdmin && !isOwnerTeacher;
        return this.repo.listLessons(moduleId, previewOnly);
    }
    async getById(lessonId, requester) {
        const access = await this.repo.getLessonAccessContext(lessonId);
        if (!access)
            throw (0, httpErrors_1.notFound)("Lección no encontrada");
        if (access.lesson_estado !== "activo")
            throw (0, httpErrors_1.notFound)("Lección no encontrada");
        const isAdmin = requester?.role === "admin";
        const isOwnerTeacher = requester?.role === "docente" && requester.userId === access.docente_id;
        if (access.curso_estado !== "publicado" && !isAdmin && !isOwnerTeacher) {
            throw (0, httpErrors_1.notFound)("Lección no encontrada");
        }
        if (access.curso_estado === "publicado" && access.es_preview) {
            const lesson = await this.repo.findLessonById(lessonId);
            if (!lesson)
                throw (0, httpErrors_1.notFound)("Lección no encontrada");
            return lesson;
        }
        if (!requester)
            throw (0, httpErrors_1.notFound)("Lección no encontrada");
        if (isAdmin || isOwnerTeacher) {
            const lesson = await this.repo.findLessonById(lessonId);
            if (!lesson)
                throw (0, httpErrors_1.notFound)("Lección no encontrada");
            return lesson;
        }
        const enrolled = await this.repo.userIsEnrolledActive(requester.userId, access.curso_id);
        if (!enrolled)
            throw (0, httpErrors_1.forbidden)("No tienes acceso a esta lección");
        const lesson = await this.repo.findLessonById(lessonId);
        if (!lesson)
            throw (0, httpErrors_1.notFound)("Lección no encontrada");
        return lesson;
    }
    async create(requester, input, file) {
        const ctx = await this.repo.getModuleContext(input.modulo_id);
        if (!ctx)
            throw (0, httpErrors_1.notFound)("Módulo no encontrado");
        this.assertCanManageLessons(requester, ctx.docente_id);
        const tipo = input.tipo ?? "texto";
        const orden = input.orden ?? (await this.repo.getNextOrder(input.modulo_id));
        const prepared = await this.prepareLessonContent({
            tipo,
            contenido: input.contenido ?? null,
            enlace_url: input.enlace_url ?? null,
            video_url: input.video_url ?? null,
            archivo_url: input.archivo_url ?? null,
            file,
            cursoId: ctx.curso_id,
            moduloId: input.modulo_id,
            ownerUsuarioId: requester.userId,
        });
        let id;
        try {
            id = await this.repo.createLesson({
                modulo_id: input.modulo_id,
                titulo: input.titulo.trim(),
                descripcion: input.descripcion ?? null,
                tipo,
                contenido: prepared.contenido,
                video_url: prepared.video_url,
                archivo_url: prepared.archivo_url,
                enlace_url: prepared.enlace_url,
                duracion_minutos: input.duracion_minutos ?? null,
                orden,
                es_preview: input.es_preview ?? false,
            });
        }
        catch (err) {
            if (file)
                await this.deleteLessonManagedFile(prepared.video_url ?? prepared.archivo_url);
            throw err;
        }
        const lesson = await this.repo.findLessonById(id);
        if (!lesson)
            throw new Error("No se pudo crear la lección");
        return lesson;
    }
    async update(requester, lessonId, input, file) {
        const access = await this.repo.getLessonAccessContext(lessonId);
        if (!access)
            throw (0, httpErrors_1.notFound)("Lección no encontrada");
        this.assertCanManageLessons(requester, access.docente_id);
        const current = await this.repo.findLessonById(lessonId);
        if (!current)
            throw (0, httpErrors_1.notFound)("Lección no encontrada");
        const tipo = input.tipo ?? current.tipo;
        const prepared = await this.prepareLessonContent({
            tipo,
            contenido: input.contenido === undefined ? current.contenido : input.contenido,
            enlace_url: input.enlace_url === undefined ? current.enlace_url : input.enlace_url,
            video_url: input.video_url === undefined ? current.video_url : input.video_url,
            archivo_url: input.archivo_url === undefined ? current.archivo_url : input.archivo_url,
            file,
            cursoId: access.curso_id,
            moduloId: access.modulo_id,
            ownerUsuarioId: requester.userId,
        });
        const previousUrl = current.video_url ?? current.archivo_url;
        try {
            await this.repo.updateLessonById(lessonId, {
                titulo: input.titulo?.trim(),
                descripcion: input.descripcion === undefined ? undefined : input.descripcion,
                tipo: input.tipo,
                contenido: prepared.contenido,
                video_url: prepared.video_url,
                archivo_url: prepared.archivo_url,
                enlace_url: prepared.enlace_url,
                duracion_minutos: input.duracion_minutos === undefined ? undefined : input.duracion_minutos,
                orden: input.orden,
                es_preview: input.es_preview,
                estado: input.estado,
            });
        }
        catch (err) {
            if (file)
                await this.deleteLessonManagedFile(prepared.video_url ?? prepared.archivo_url);
            throw err;
        }
        const nextUrl = prepared.video_url ?? prepared.archivo_url;
        if (previousUrl && previousUrl !== nextUrl) {
            await this.deleteLessonManagedFile(previousUrl);
        }
        const updated = await this.repo.findLessonById(lessonId);
        if (!updated)
            throw (0, httpErrors_1.notFound)("Lección no encontrada");
        return updated;
    }
    async remove(requester, lessonId) {
        const access = await this.repo.getLessonAccessContext(lessonId);
        if (!access)
            throw (0, httpErrors_1.notFound)("Lección no encontrada");
        this.assertCanManageLessons(requester, access.docente_id);
        const ok = await this.repo.softDelete(lessonId);
        if (!ok)
            throw (0, httpErrors_1.notFound)("Lección no encontrada");
    }
    async complete(requester, lessonId) {
        const access = await this.repo.getLessonAccessContext(lessonId);
        if (!access)
            throw (0, httpErrors_1.notFound)("Lección no encontrada");
        if (access.lesson_estado !== "activo")
            throw (0, httpErrors_1.notFound)("Lección no encontrada");
        // Para completar, exigimos inscripción activa (o admin/docente dueño).
        const isAdmin = requester.role === "admin";
        const isOwnerTeacher = requester.role === "docente" && requester.userId === access.docente_id;
        if (!isAdmin && !isOwnerTeacher) {
            const enrolled = await this.repo.userIsEnrolledActive(requester.userId, access.curso_id);
            if (!enrolled)
                throw (0, httpErrors_1.forbidden)("No tienes acceso a este curso");
        }
        await this.repo.markLessonComplete(requester.userId, lessonId);
    }
    assertCanManageLessons(requester, docenteId) {
        const isAdmin = requester.role === "admin";
        const isOwnerTeacher = requester.role === "docente" && requester.userId === docenteId;
        if (!isAdmin && !isOwnerTeacher)
            throw (0, httpErrors_1.forbidden)("No autorizado");
    }
    async prepareLessonContent(input) {
        if (input.tipo === "texto") {
            return {
                contenido: input.contenido ?? null,
                enlace_url: null,
                video_url: null,
                archivo_url: null,
            };
        }
        if (input.tipo === "enlace") {
            if (!input.enlace_url)
                throw (0, httpErrors_1.badRequest)("enlace_url es requerido para tipo enlace");
            return { contenido: null, enlace_url: input.enlace_url, video_url: null, archivo_url: null };
        }
        if (input.tipo === "video") {
            if (input.file) {
                const uploaded = await this.files.uploadManaged({
                    module: "lessons",
                    keyPrefix: `lessons/course-${input.cursoId}/module-${input.moduloId}`,
                    originalName: input.file.originalname,
                    buffer: input.file.buffer,
                    mimeType: input.file.mimetype,
                    allowed: storage_service_1.ALLOWED_VIDEOS,
                    ownerUsuarioId: input.ownerUsuarioId,
                    cursoId: input.cursoId,
                    accessScope: "course",
                });
                return { contenido: null, enlace_url: null, video_url: uploaded.url, archivo_url: null };
            }
            if (!input.video_url)
                throw (0, httpErrors_1.badRequest)("Archivo o video_url requerido para tipo video");
            return { contenido: null, enlace_url: null, video_url: input.video_url, archivo_url: null };
        }
        if (input.tipo === "pdf") {
            if (input.file) {
                const uploaded = await this.files.uploadManaged({
                    module: "lessons",
                    keyPrefix: `lessons/course-${input.cursoId}/module-${input.moduloId}`,
                    originalName: input.file.originalname,
                    buffer: input.file.buffer,
                    mimeType: input.file.mimetype,
                    allowed: storage_service_1.ALLOWED_PDFS,
                    ownerUsuarioId: input.ownerUsuarioId,
                    cursoId: input.cursoId,
                    accessScope: "course",
                });
                return { contenido: null, enlace_url: null, video_url: null, archivo_url: uploaded.url };
            }
            if (!input.archivo_url)
                throw (0, httpErrors_1.badRequest)("Archivo o archivo_url requerido para tipo pdf");
            return { contenido: null, enlace_url: null, video_url: null, archivo_url: input.archivo_url };
        }
        throw (0, httpErrors_1.badRequest)("tipo inválido");
    }
    async deleteLessonManagedFile(url) {
        await this.files.deleteByReference(url, ["lessons/"]);
    }
}
exports.LessonService = LessonService;
