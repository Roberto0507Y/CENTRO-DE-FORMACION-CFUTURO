import { badRequest, forbidden, notFound } from "../../common/errors/httpErrors";
import type { AuthContext } from "../../common/types/express";
import { withTransaction } from "../../config/db";
import { ForumRepository } from "./forum.repository";
import type { CreateReplyInput, CreateTopicInput, ForumReplyStatus, ForumTopicDetail, ForumTopicListItem, ForumTopicStatus } from "./forum.types";

export class ForumService {
  private readonly repo = new ForumRepository();

  async listTopics(requester: AuthContext, courseId: number): Promise<ForumTopicListItem[]> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");

    if (requester.role === "admin") {
      return this.repo.listTopics(courseId, { includeHidden: true, includeHiddenRepliesCount: true });
    }
    if (requester.role === "docente") {
      if (course.docente_id !== requester.userId) throw forbidden("No autorizado");
      return this.repo.listTopics(courseId, { includeHidden: true, includeHiddenRepliesCount: true });
    }

    // estudiante
    if (course.estado !== "publicado") throw notFound("Curso no encontrado");
    const enrolled = await this.repo.userIsEnrolledActive(requester.userId, courseId);
    if (!enrolled) throw forbidden("No tienes acceso a este curso");
    return this.repo.listTopics(courseId, { includeHidden: false, includeHiddenRepliesCount: false });
  }

  async createTopic(requester: AuthContext, courseId: number, input: CreateTopicInput): Promise<ForumTopicDetail> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");

    if (requester.role === "estudiante") {
      throw forbidden("Solo administradores y docentes pueden crear temas");
    }

    if (requester.role === "docente") {
      if (course.docente_id !== requester.userId) throw forbidden("No autorizado");
    }

    const titulo = input.titulo.trim();
    const mensaje = input.mensaje.trim();
    if (!titulo) throw badRequest("titulo es requerido");
    if (!mensaje) throw badRequest("mensaje es requerido");

    const id = await withTransaction(async (conn) => {
      return this.repo.createTopic(conn, { curso_id: courseId, usuario_id: requester.userId, titulo, mensaje });
    });

    const detail = await this.repo.getTopicDetail(courseId, id, { includeHidden: true, includeHiddenReplies: true });
    if (!detail) throw new Error("No se pudo crear el tema");
    return detail;
  }

  async getTopicDetail(requester: AuthContext, courseId: number, topicId: number): Promise<ForumTopicDetail> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");

    if (requester.role === "admin") {
      const d = await this.repo.getTopicDetail(courseId, topicId, { includeHidden: true, includeHiddenReplies: true });
      if (!d) throw notFound("Tema no encontrado");
      return d;
    }

    if (requester.role === "docente") {
      if (course.docente_id !== requester.userId) throw forbidden("No autorizado");
      const d = await this.repo.getTopicDetail(courseId, topicId, { includeHidden: true, includeHiddenReplies: true });
      if (!d) throw notFound("Tema no encontrado");
      return d;
    }

    // estudiante
    if (course.estado !== "publicado") throw notFound("Curso no encontrado");
    const enrolled = await this.repo.userIsEnrolledActive(requester.userId, courseId);
    if (!enrolled) throw forbidden("No tienes acceso a este curso");
    const d = await this.repo.getTopicDetail(courseId, topicId, { includeHidden: false, includeHiddenReplies: false });
    if (!d) throw notFound("Tema no encontrado");
    if (d.estado === "oculto") throw notFound("Tema no encontrado");
    return d;
  }

  async replyToTopic(requester: AuthContext, courseId: number, topicId: number, input: CreateReplyInput): Promise<ForumTopicDetail> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");

    const topic = await this.repo.findTopic(courseId, topicId);
    if (!topic) throw notFound("Tema no encontrado");

    if (topic.estado === "oculto") {
      if (requester.role === "admin") {
        // allow
      } else if (requester.role === "docente") {
        if (course.docente_id !== requester.userId) throw forbidden("No autorizado");
      } else {
        throw notFound("Tema no encontrado");
      }
    }

    if (topic.estado === "cerrado") throw badRequest("Este tema está cerrado");

    if (requester.role === "docente") {
      if (course.docente_id !== requester.userId) throw forbidden("No autorizado");
    } else if (requester.role === "estudiante") {
      if (course.estado !== "publicado") throw notFound("Curso no encontrado");
      const enrolled = await this.repo.userIsEnrolledActive(requester.userId, courseId);
      if (!enrolled) throw forbidden("No tienes acceso a este curso");
    }

    const mensaje = input.mensaje.trim();
    if (!mensaje) throw badRequest("mensaje es requerido");

    await withTransaction(async (conn) => {
      await this.repo.createReply(conn, { tema_id: topicId, usuario_id: requester.userId, mensaje });
    });

    const d = await this.repo.getTopicDetail(courseId, topicId, {
      includeHidden: requester.role !== "estudiante",
      includeHiddenReplies: requester.role !== "estudiante",
    });
    if (!d) throw notFound("Tema no encontrado");
    return d;
  }

  async patchTopicModeration(
    requester: AuthContext,
    courseId: number,
    topicId: number,
    patch: { estado?: ForumTopicStatus; fijado?: 0 | 1 }
  ): Promise<ForumTopicDetail> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");
    this.assertCanModerate(requester, course.docente_id);

    const topic = await this.repo.findTopic(courseId, topicId);
    if (!topic) throw notFound("Tema no encontrado");

    await withTransaction(async (conn) => {
      const affected = await this.repo.updateTopicModeration(conn, courseId, topicId, patch);
      if (affected === 0) throw notFound("Tema no encontrado");
    });

    const d = await this.repo.getTopicDetail(courseId, topicId, { includeHidden: true, includeHiddenReplies: true });
    if (!d) throw notFound("Tema no encontrado");
    return d;
  }

  async patchReplyStatus(
    requester: AuthContext,
    courseId: number,
    topicId: number,
    replyId: number,
    estado: ForumReplyStatus
  ): Promise<ForumTopicDetail> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");
    this.assertCanModerate(requester, course.docente_id);

    const topic = await this.repo.findTopic(courseId, topicId);
    if (!topic) throw notFound("Tema no encontrado");

    await withTransaction(async (conn) => {
      const affected = await this.repo.updateReplyStatus(conn, topicId, replyId, estado);
      if (affected === 0) throw notFound("Respuesta no encontrada");
    });

    const d = await this.repo.getTopicDetail(courseId, topicId, { includeHidden: true, includeHiddenReplies: true });
    if (!d) throw notFound("Tema no encontrado");
    return d;
  }

  private assertCanModerate(requester: AuthContext, docenteId: number): void {
    const isAdmin = requester.role === "admin";
    const isOwnerTeacher = requester.role === "docente" && requester.userId === docenteId;
    if (!isAdmin && !isOwnerTeacher) throw forbidden("No autorizado");
  }
}
