import { badRequest, forbidden, notFound } from "../../common/errors/httpErrors";
import type { AuthContext } from "../../common/types/express";
import { ALLOWED_PDFS, ALLOWED_VIDEOS } from "../../common/services/storage.service";
import { FileAssetService } from "../files/fileAsset.service";
import { LessonRepository } from "./lesson.repository";
import type { CreateLessonInput, LessonDetail, LessonListItem, LessonType, UpdateLessonInput } from "./lesson.types";

export class LessonService {
  private readonly repo = new LessonRepository();
  private readonly files = new FileAssetService();

  async listByModule(moduleId: number, requester?: AuthContext): Promise<LessonListItem[]> {
    const ctx = await this.repo.getModuleContext(moduleId);
    if (!ctx) throw notFound("Módulo no encontrado");

    const isAdmin = requester?.role === "admin";
    const isOwnerTeacher = requester?.role === "docente" && requester.userId === ctx.docente_id;

    if (ctx.curso_estado !== "publicado" && !isAdmin && !isOwnerTeacher) {
      throw notFound("Módulo no encontrado");
    }

    const enrolled =
      requester?.userId ? await this.repo.userIsEnrolledActive(requester.userId, ctx.curso_id) : false;

    const previewOnly = ctx.curso_estado === "publicado" && !enrolled && !isAdmin && !isOwnerTeacher;
    return this.repo.listLessons(moduleId, previewOnly);
  }

  async getById(lessonId: number, requester?: AuthContext): Promise<LessonDetail> {
    const access = await this.repo.getLessonAccessContext(lessonId);
    if (!access) throw notFound("Lección no encontrada");
    if (access.lesson_estado !== "activo") throw notFound("Lección no encontrada");

    const isAdmin = requester?.role === "admin";
    const isOwnerTeacher = requester?.role === "docente" && requester.userId === access.docente_id;

    if (access.curso_estado !== "publicado" && !isAdmin && !isOwnerTeacher) {
      throw notFound("Lección no encontrada");
    }

    if (access.curso_estado === "publicado" && access.es_preview) {
      const lesson = await this.repo.findLessonById(lessonId);
      if (!lesson) throw notFound("Lección no encontrada");
      return lesson;
    }

    if (!requester) throw notFound("Lección no encontrada");

    if (isAdmin || isOwnerTeacher) {
      const lesson = await this.repo.findLessonById(lessonId);
      if (!lesson) throw notFound("Lección no encontrada");
      return lesson;
    }

    const enrolled = await this.repo.userIsEnrolledActive(requester.userId, access.curso_id);
    if (!enrolled) throw forbidden("No tienes acceso a esta lección");

    const lesson = await this.repo.findLessonById(lessonId);
    if (!lesson) throw notFound("Lección no encontrada");
    return lesson;
  }

  async create(
    requester: AuthContext,
    input: CreateLessonInput,
    file?: Express.Multer.File
  ): Promise<LessonDetail> {
    const ctx = await this.repo.getModuleContext(input.modulo_id);
    if (!ctx) throw notFound("Módulo no encontrado");

    this.assertCanManageLessons(requester, ctx.docente_id);

    const tipo: LessonType = input.tipo ?? "texto";
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

    let id: number;
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
    } catch (err) {
      if (file) await this.deleteLessonManagedFile(prepared.video_url ?? prepared.archivo_url);
      throw err;
    }

    const lesson = await this.repo.findLessonById(id);
    if (!lesson) throw new Error("No se pudo crear la lección");
    return lesson;
  }

  async update(
    requester: AuthContext,
    lessonId: number,
    input: UpdateLessonInput,
    file?: Express.Multer.File
  ): Promise<LessonDetail> {
    const access = await this.repo.getLessonAccessContext(lessonId);
    if (!access) throw notFound("Lección no encontrada");
    this.assertCanManageLessons(requester, access.docente_id);

    const current = await this.repo.findLessonById(lessonId);
    if (!current) throw notFound("Lección no encontrada");

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
    } catch (err) {
      if (file) await this.deleteLessonManagedFile(prepared.video_url ?? prepared.archivo_url);
      throw err;
    }

    const nextUrl = prepared.video_url ?? prepared.archivo_url;
    if (previousUrl && previousUrl !== nextUrl) {
      await this.deleteLessonManagedFile(previousUrl);
    }

    const updated = await this.repo.findLessonById(lessonId);
    if (!updated) throw notFound("Lección no encontrada");
    return updated;
  }

  async remove(requester: AuthContext, lessonId: number): Promise<void> {
    const access = await this.repo.getLessonAccessContext(lessonId);
    if (!access) throw notFound("Lección no encontrada");
    this.assertCanManageLessons(requester, access.docente_id);
    const ok = await this.repo.softDelete(lessonId);
    if (!ok) throw notFound("Lección no encontrada");
  }

  async complete(requester: AuthContext, lessonId: number): Promise<void> {
    const access = await this.repo.getLessonAccessContext(lessonId);
    if (!access) throw notFound("Lección no encontrada");
    if (access.lesson_estado !== "activo") throw notFound("Lección no encontrada");

    // Para completar, exigimos inscripción activa (o admin/docente dueño).
    const isAdmin = requester.role === "admin";
    const isOwnerTeacher = requester.role === "docente" && requester.userId === access.docente_id;
    if (!isAdmin && !isOwnerTeacher) {
      const enrolled = await this.repo.userIsEnrolledActive(requester.userId, access.curso_id);
      if (!enrolled) throw forbidden("No tienes acceso a este curso");
    }

    await this.repo.markLessonComplete(requester.userId, lessonId);
  }

  private assertCanManageLessons(requester: AuthContext, docenteId: number): void {
    const isAdmin = requester.role === "admin";
    const isOwnerTeacher = requester.role === "docente" && requester.userId === docenteId;
    if (!isAdmin && !isOwnerTeacher) throw forbidden("No autorizado");
  }

  private async prepareLessonContent(input: {
    tipo: LessonType;
    contenido: string | null;
    enlace_url: string | null;
    video_url: string | null;
    archivo_url: string | null;
    file?: Express.Multer.File;
    cursoId: number;
    moduloId: number;
    ownerUsuarioId: number;
  }): Promise<{
    contenido: string | null;
    enlace_url: string | null;
    video_url: string | null;
    archivo_url: string | null;
  }> {
    if (input.tipo === "texto") {
      return {
        contenido: input.contenido ?? null,
        enlace_url: null,
        video_url: null,
        archivo_url: null,
      };
    }

    if (input.tipo === "enlace") {
      if (!input.enlace_url) throw badRequest("enlace_url es requerido para tipo enlace");
      return { contenido: null, enlace_url: input.enlace_url, video_url: null, archivo_url: null };
    }

    if (input.tipo === "video") {
      if (input.file) {
        const uploaded = await this.files.uploadManaged({
          module: "lessons",
          keyPrefix: `lessons/course-${input.cursoId}/module-${input.moduloId}`,
          file: input.file,
          allowed: ALLOWED_VIDEOS,
          ownerUsuarioId: input.ownerUsuarioId,
          cursoId: input.cursoId,
          accessScope: "course",
        });
        return { contenido: null, enlace_url: null, video_url: uploaded.url, archivo_url: null };
      }
      if (!input.video_url) throw badRequest("Archivo o video_url requerido para tipo video");
      return { contenido: null, enlace_url: null, video_url: input.video_url, archivo_url: null };
    }

    if (input.tipo === "pdf") {
      if (input.file) {
        const uploaded = await this.files.uploadManaged({
          module: "lessons",
          keyPrefix: `lessons/course-${input.cursoId}/module-${input.moduloId}`,
          file: input.file,
          allowed: ALLOWED_PDFS,
          ownerUsuarioId: input.ownerUsuarioId,
          cursoId: input.cursoId,
          accessScope: "course",
        });
        return { contenido: null, enlace_url: null, video_url: null, archivo_url: uploaded.url };
      }
      if (!input.archivo_url) throw badRequest("Archivo o archivo_url requerido para tipo pdf");
      return { contenido: null, enlace_url: null, video_url: null, archivo_url: input.archivo_url };
    }

    throw badRequest("tipo inválido");
  }

  private async deleteLessonManagedFile(url: string | null | undefined): Promise<void> {
    await this.files.deleteByReference(url, ["lessons/"]);
  }
}
