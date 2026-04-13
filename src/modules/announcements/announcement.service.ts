import { badRequest, forbidden, notFound } from "../../common/errors/httpErrors";
import type { AuthContext } from "../../common/types/express";
import { withTransaction } from "../../config/db";
import { ALLOWED_ANNOUNCEMENT_FILES } from "../../common/services/storage.service";
import { FileAssetService } from "../files/fileAsset.service";
import { AnnouncementRepository } from "./announcement.repository";
import type {
  AnnouncementListItem,
  AnnouncementStatus,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "./announcement.types";

export class AnnouncementService {
  private readonly repo = new AnnouncementRepository();
  private readonly files = new FileAssetService();

  async list(requester: AuthContext, courseId: number): Promise<AnnouncementListItem[]> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");

    if (requester.role === "admin") {
      return this.repo.listByCourse(courseId);
    }
    if (requester.role === "docente") {
      if (course.docente_id !== requester.userId) throw forbidden("No autorizado");
      return this.repo.listByCourse(courseId);
    }

    // estudiante
    if (course.estado !== "publicado") throw notFound("Curso no encontrado");
    const enrolled = await this.repo.userIsEnrolledActive(requester.userId, courseId);
    if (!enrolled) throw forbidden("No tienes acceso a este curso");
    return this.repo.listByCourse(courseId, "publicado");
  }

  async getById(requester: AuthContext, courseId: number, id: number): Promise<AnnouncementListItem> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");

    const ann = await this.repo.findById(courseId, id);
    if (!ann) throw notFound("Anuncio no encontrado");

    if (requester.role === "admin") return ann;
    if (requester.role === "docente") {
      if (course.docente_id !== requester.userId) throw forbidden("No autorizado");
      return ann;
    }

    // estudiante
    if (course.estado !== "publicado") throw notFound("Curso no encontrado");
    const enrolled = await this.repo.userIsEnrolledActive(requester.userId, courseId);
    if (!enrolled) throw forbidden("No tienes acceso a este curso");
    if (ann.estado !== "publicado") throw notFound("Anuncio no encontrado");
    return ann;
  }

  async create(
    requester: AuthContext,
    courseId: number,
    input: CreateAnnouncementInput,
    file?: Express.Multer.File
  ): Promise<AnnouncementListItem> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");
    this.assertCanManage(requester, course.docente_id);

    const estado: AnnouncementStatus = input.estado ?? "publicado";

    const uploadedUrl = file
      ? (
          await this.files.uploadManaged({
            module: "announcements",
            keyPrefix: `announcements/course-${courseId}/user-${requester.userId}`,
            file,
            allowed: ALLOWED_ANNOUNCEMENT_FILES,
            ownerUsuarioId: requester.userId,
            cursoId: courseId,
            accessScope: "course",
          })
        ).url
      : null;

    const archivo_url =
      uploadedUrl ?? (input.archivo_url === undefined ? null : input.archivo_url ?? null);

    let id: number;
    try {
      id = await withTransaction(async (conn) => {
        return this.repo.create(conn, {
          curso_id: courseId,
          usuario_id: requester.userId,
          titulo: input.titulo.trim(),
          mensaje: input.mensaje.trim(),
          archivo_url,
          estado,
        });
      });
    } catch (err) {
      if (file) await this.files.deleteByReference(archivo_url, ["announcements/"]);
      throw err;
    }

    const created = await this.repo.findById(courseId, id);
    if (!created) throw new Error("No se pudo crear el anuncio");
    return created;
  }

  async update(
    requester: AuthContext,
    courseId: number,
    id: number,
    input: UpdateAnnouncementInput,
    file?: Express.Multer.File
  ): Promise<AnnouncementListItem> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");
    this.assertCanManage(requester, course.docente_id);

    const current = await this.repo.findById(courseId, id);
    if (!current) throw notFound("Anuncio no encontrado");

    const uploadedUrl = file
      ? (
          await this.files.uploadManaged({
            module: "announcements",
            keyPrefix: `announcements/course-${courseId}/user-${requester.userId}`,
            file,
            allowed: ALLOWED_ANNOUNCEMENT_FILES,
            ownerUsuarioId: requester.userId,
            cursoId: courseId,
            accessScope: "course",
          })
        ).url
      : null;

    const nextArchivoUrl = uploadedUrl ?? (input.archivo_url === undefined ? undefined : input.archivo_url);

    try {
      await withTransaction(async (conn) => {
        const affected = await this.repo.updateById(conn, courseId, id, {
          titulo: input.titulo?.trim(),
          mensaje: input.mensaje?.trim(),
          archivo_url: nextArchivoUrl,
        });
        if (affected === 0) throw notFound("Anuncio no encontrado");
      });
    } catch (err) {
      if (file) await this.files.deleteByReference(uploadedUrl, ["announcements/"]);
      throw err;
    }

    if (nextArchivoUrl !== undefined && current.archivo_url && current.archivo_url !== nextArchivoUrl) {
      await this.files.deleteByReference(current.archivo_url, ["announcements/"]);
    }

    const updated = await this.repo.findById(courseId, id);
    if (!updated) throw notFound("Anuncio no encontrado");
    return updated;
  }

  async patchStatus(
    requester: AuthContext,
    courseId: number,
    id: number,
    estado: AnnouncementStatus
  ): Promise<AnnouncementListItem> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");
    this.assertCanManage(requester, course.docente_id);

    await withTransaction(async (conn) => {
      const affected = await this.repo.updateStatus(conn, courseId, id, estado);
      if (affected === 0) throw notFound("Anuncio no encontrado");
    });

    const updated = await this.repo.findById(courseId, id);
    if (!updated) throw notFound("Anuncio no encontrado");
    return updated;
  }

  private assertCanManage(requester: AuthContext, docenteId: number): void {
    const isAdmin = requester.role === "admin";
    const isOwnerTeacher = requester.role === "docente" && requester.userId === docenteId;
    if (!isAdmin && !isOwnerTeacher) throw forbidden("No autorizado");
  }
}
