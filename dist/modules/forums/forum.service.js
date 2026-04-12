"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForumService = void 0;
const httpErrors_1 = require("../../common/errors/httpErrors");
const db_1 = require("../../config/db");
const forum_repository_1 = require("./forum.repository");
class ForumService {
    constructor() {
        this.repo = new forum_repository_1.ForumRepository();
    }
    async listTopics(requester, courseId) {
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        if (requester.role === "admin") {
            return this.repo.listTopics(courseId, { includeHidden: true, includeHiddenRepliesCount: true });
        }
        if (requester.role === "docente") {
            if (course.docente_id !== requester.userId)
                throw (0, httpErrors_1.forbidden)("No autorizado");
            return this.repo.listTopics(courseId, { includeHidden: true, includeHiddenRepliesCount: true });
        }
        // estudiante
        if (course.estado !== "publicado")
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        const enrolled = await this.repo.userIsEnrolledActive(requester.userId, courseId);
        if (!enrolled)
            throw (0, httpErrors_1.forbidden)("No tienes acceso a este curso");
        return this.repo.listTopics(courseId, { includeHidden: false, includeHiddenRepliesCount: false });
    }
    async createTopic(requester, courseId, input) {
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        if (requester.role === "estudiante") {
            throw (0, httpErrors_1.forbidden)("Solo administradores y docentes pueden crear temas");
        }
        if (requester.role === "docente") {
            if (course.docente_id !== requester.userId)
                throw (0, httpErrors_1.forbidden)("No autorizado");
        }
        const titulo = input.titulo.trim();
        const mensaje = input.mensaje.trim();
        if (!titulo)
            throw (0, httpErrors_1.badRequest)("titulo es requerido");
        if (!mensaje)
            throw (0, httpErrors_1.badRequest)("mensaje es requerido");
        const id = await (0, db_1.withTransaction)(async (conn) => {
            return this.repo.createTopic(conn, { curso_id: courseId, usuario_id: requester.userId, titulo, mensaje });
        });
        const detail = await this.repo.getTopicDetail(courseId, id, { includeHidden: true, includeHiddenReplies: true });
        if (!detail)
            throw new Error("No se pudo crear el tema");
        return detail;
    }
    async getTopicDetail(requester, courseId, topicId) {
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        if (requester.role === "admin") {
            const d = await this.repo.getTopicDetail(courseId, topicId, { includeHidden: true, includeHiddenReplies: true });
            if (!d)
                throw (0, httpErrors_1.notFound)("Tema no encontrado");
            return d;
        }
        if (requester.role === "docente") {
            if (course.docente_id !== requester.userId)
                throw (0, httpErrors_1.forbidden)("No autorizado");
            const d = await this.repo.getTopicDetail(courseId, topicId, { includeHidden: true, includeHiddenReplies: true });
            if (!d)
                throw (0, httpErrors_1.notFound)("Tema no encontrado");
            return d;
        }
        // estudiante
        if (course.estado !== "publicado")
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        const enrolled = await this.repo.userIsEnrolledActive(requester.userId, courseId);
        if (!enrolled)
            throw (0, httpErrors_1.forbidden)("No tienes acceso a este curso");
        const d = await this.repo.getTopicDetail(courseId, topicId, { includeHidden: false, includeHiddenReplies: false });
        if (!d)
            throw (0, httpErrors_1.notFound)("Tema no encontrado");
        if (d.estado === "oculto")
            throw (0, httpErrors_1.notFound)("Tema no encontrado");
        return d;
    }
    async replyToTopic(requester, courseId, topicId, input) {
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        const topic = await this.repo.findTopic(courseId, topicId);
        if (!topic)
            throw (0, httpErrors_1.notFound)("Tema no encontrado");
        if (topic.estado === "oculto") {
            if (requester.role === "admin") {
                // allow
            }
            else if (requester.role === "docente") {
                if (course.docente_id !== requester.userId)
                    throw (0, httpErrors_1.forbidden)("No autorizado");
            }
            else {
                throw (0, httpErrors_1.notFound)("Tema no encontrado");
            }
        }
        if (topic.estado === "cerrado")
            throw (0, httpErrors_1.badRequest)("Este tema está cerrado");
        if (requester.role === "docente") {
            if (course.docente_id !== requester.userId)
                throw (0, httpErrors_1.forbidden)("No autorizado");
        }
        else if (requester.role === "estudiante") {
            if (course.estado !== "publicado")
                throw (0, httpErrors_1.notFound)("Curso no encontrado");
            const enrolled = await this.repo.userIsEnrolledActive(requester.userId, courseId);
            if (!enrolled)
                throw (0, httpErrors_1.forbidden)("No tienes acceso a este curso");
        }
        const mensaje = input.mensaje.trim();
        if (!mensaje)
            throw (0, httpErrors_1.badRequest)("mensaje es requerido");
        await (0, db_1.withTransaction)(async (conn) => {
            await this.repo.createReply(conn, { tema_id: topicId, usuario_id: requester.userId, mensaje });
        });
        const d = await this.repo.getTopicDetail(courseId, topicId, {
            includeHidden: requester.role !== "estudiante",
            includeHiddenReplies: requester.role !== "estudiante",
        });
        if (!d)
            throw (0, httpErrors_1.notFound)("Tema no encontrado");
        return d;
    }
    async patchTopicModeration(requester, courseId, topicId, patch) {
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        this.assertCanModerate(requester, course.docente_id);
        const topic = await this.repo.findTopic(courseId, topicId);
        if (!topic)
            throw (0, httpErrors_1.notFound)("Tema no encontrado");
        await (0, db_1.withTransaction)(async (conn) => {
            const affected = await this.repo.updateTopicModeration(conn, courseId, topicId, patch);
            if (affected === 0)
                throw (0, httpErrors_1.notFound)("Tema no encontrado");
        });
        const d = await this.repo.getTopicDetail(courseId, topicId, { includeHidden: true, includeHiddenReplies: true });
        if (!d)
            throw (0, httpErrors_1.notFound)("Tema no encontrado");
        return d;
    }
    async patchReplyStatus(requester, courseId, topicId, replyId, estado) {
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        this.assertCanModerate(requester, course.docente_id);
        const topic = await this.repo.findTopic(courseId, topicId);
        if (!topic)
            throw (0, httpErrors_1.notFound)("Tema no encontrado");
        await (0, db_1.withTransaction)(async (conn) => {
            const affected = await this.repo.updateReplyStatus(conn, topicId, replyId, estado);
            if (affected === 0)
                throw (0, httpErrors_1.notFound)("Respuesta no encontrada");
        });
        const d = await this.repo.getTopicDetail(courseId, topicId, { includeHidden: true, includeHiddenReplies: true });
        if (!d)
            throw (0, httpErrors_1.notFound)("Tema no encontrado");
        return d;
    }
    assertCanModerate(requester, docenteId) {
        const isAdmin = requester.role === "admin";
        const isOwnerTeacher = requester.role === "docente" && requester.userId === docenteId;
        if (!isAdmin && !isOwnerTeacher)
            throw (0, httpErrors_1.forbidden)("No autorizado");
    }
}
exports.ForumService = ForumService;
