import { badRequest, forbidden, notFound } from "../../common/errors/httpErrors";
import { ALLOWED_IMAGES, ALLOWED_PDFS, ALLOWED_TASK_FILES, ALLOWED_VIDEOS } from "../../common/services/storage.service";
import type { AuthContext } from "../../common/types/express";
import { FileAssetService } from "../files/fileAsset.service";
import { MaterialRepository } from "./material.repository";
import type { CreateMaterialInput, Material, MaterialStatus, MaterialType, UpdateMaterialInput } from "./material.types";

function isYoutubeOrVimeo(url: string): boolean {
  const u = url.toLowerCase();
  return u.includes("youtube.com/") || u.includes("youtu.be/") || u.includes("vimeo.com/");
}

function inferTypeFromMime(mimeType: string): MaterialType {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "imagen";
  if (mimeType.startsWith("video/")) return "video";
  return "archivo";
}

export class MaterialService {
  private readonly repo = new MaterialRepository();
  private readonly files = new FileAssetService();

  async list(requester: AuthContext, courseId: number): Promise<Material[]> {
    const course = await this.repo.findCourseOwner(courseId);
    if (!course) throw notFound("Curso no encontrado");

    if (requester.role === "estudiante") {
      if (course.curso_estado !== "publicado") throw notFound("Curso no encontrado");
      const enrolled = await this.repo.isEnrolledActive(courseId, requester.userId);
      if (!enrolled) throw forbidden("No autorizado");
      return this.repo.listActiveByCourse(courseId);
    }

    // Admin y docente dueño pueden ver todo
    this.assertCanManage(requester, course.docente_id);
    return this.repo.listByCourse(courseId);
  }

  async create(
    requester: AuthContext,
    courseId: number,
    input: CreateMaterialInput,
    file?: Express.Multer.File
  ): Promise<Material> {
    const course = await this.repo.findCourseOwner(courseId);
    if (!course) throw notFound("Curso no encontrado");
    this.assertCanManage(requester, course.docente_id);

    const moduloId = input.modulo_id ?? null;
    if (moduloId !== null) {
      const ok = await this.repo.moduleBelongsToCourse(moduloId, courseId);
      if (!ok) throw badRequest("modulo_id no pertenece al curso");
    }

    const trimmedTitle = input.titulo.trim();
    if (!trimmedTitle) throw badRequest("titulo es requerido");

    const link = (input.enlace_url ?? "").trim();

    let tipo: MaterialType | undefined = input.tipo;
    if (!tipo) {
      if (file) tipo = inferTypeFromMime(file.mimetype);
      else if (link) tipo = isYoutubeOrVimeo(link) ? "video" : "enlace";
      else tipo = "archivo";
    }

    let archivoUrl: string | null = input.archivo_url ?? null;
    let enlaceUrl: string | null = link.length > 0 ? link : null;

    if (file) {
      const allowed =
        tipo === "video"
          ? ALLOWED_VIDEOS
          : tipo === "pdf"
            ? ALLOWED_PDFS
            : tipo === "imagen"
              ? ALLOWED_IMAGES
              : ALLOWED_TASK_FILES;

      const uploaded = await this.files.uploadManaged({
        module: "materials",
        keyPrefix: `materials/course-${courseId}${moduloId ? `/module-${moduloId}` : ""}`,
        file,
        allowed,
        ownerUsuarioId: requester.userId,
        cursoId: courseId,
        accessScope: "course",
      });
      archivoUrl = uploaded.url;
    }

    if (!enlaceUrl && !archivoUrl) {
      throw badRequest("Debes enviar enlace_url o archivo");
    }

    const orden = input.orden ?? (await this.repo.getNextOrder(courseId, moduloId));
    const estado: MaterialStatus = input.estado ?? "activo";

    let id: number;
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
    } catch (err) {
      if (file) await this.files.deleteByReference(archivoUrl, ["materials/"]);
      throw err;
    }

    const created = await this.repo.findById(courseId, id);
    if (!created) throw notFound("Material no encontrado");
    return created;
  }

  async update(
    requester: AuthContext,
    courseId: number,
    id: number,
    input: UpdateMaterialInput,
    file?: Express.Multer.File
  ): Promise<Material> {
    const course = await this.repo.findCourseOwner(courseId);
    if (!course) throw notFound("Curso no encontrado");
    this.assertCanManage(requester, course.docente_id);

    const existing = await this.repo.findById(courseId, id);
    if (!existing) throw notFound("Material no encontrado");

    const moduloId = input.modulo_id ?? existing.modulo_id ?? null;
    if (input.modulo_id !== undefined && moduloId !== null) {
      const ok = await this.repo.moduleBelongsToCourse(moduloId, courseId);
      if (!ok) throw badRequest("modulo_id no pertenece al curso");
    }

    const link = input.enlace_url !== undefined ? (input.enlace_url ?? "").trim() : (existing.enlace_url ?? "");

    const nextTipo: MaterialType =
      input.tipo ??
      (file ? inferTypeFromMime(file.mimetype) : existing.tipo) ??
      (link ? (isYoutubeOrVimeo(link) ? "video" : "enlace") : "archivo");

    let archivoUrl: string | null = input.archivo_url ?? existing.archivo_url;
    if (file) {
      const allowed =
        nextTipo === "video"
          ? ALLOWED_VIDEOS
          : nextTipo === "pdf"
            ? ALLOWED_PDFS
            : nextTipo === "imagen"
              ? ALLOWED_IMAGES
              : ALLOWED_TASK_FILES;

      const uploaded = await this.files.uploadManaged({
        module: "materials",
        keyPrefix: `materials/course-${courseId}${moduloId ? `/module-${moduloId}` : ""}`,
        file,
        allowed,
        ownerUsuarioId: requester.userId,
        cursoId: courseId,
        accessScope: "course",
      });
      archivoUrl = uploaded.url;
    }

    const enlaceUrl = input.enlace_url !== undefined ? (link.length > 0 ? link : null) : existing.enlace_url;

    if (!enlaceUrl && !archivoUrl) {
      throw badRequest("Debes enviar enlace_url o archivo");
    }

    const titulo = input.titulo !== undefined ? input.titulo.trim() : undefined;
    if (input.titulo !== undefined && !titulo) throw badRequest("titulo es requerido");

    try {
      await this.repo.update(courseId, id, {
        ...input,
        modulo_id: input.modulo_id !== undefined ? (input.modulo_id ?? null) : undefined,
        titulo,
        tipo: nextTipo,
        archivo_url: archivoUrl,
        enlace_url: enlaceUrl ?? null,
      });
    } catch (err) {
      if (file) await this.files.deleteByReference(archivoUrl, ["materials/"]);
      throw err;
    }

    if (input.archivo_url !== undefined || file) {
      if (existing.archivo_url && existing.archivo_url !== archivoUrl) {
        await this.files.deleteByReference(existing.archivo_url, ["materials/"]);
      }
    }

    const updated = await this.repo.findById(courseId, id);
    if (!updated) throw notFound("Material no encontrado");
    return updated;
  }

  async patchStatus(requester: AuthContext, courseId: number, id: number, estado: MaterialStatus): Promise<void> {
    const course = await this.repo.findCourseOwner(courseId);
    if (!course) throw notFound("Curso no encontrado");
    this.assertCanManage(requester, course.docente_id);
    const existing = await this.repo.findById(courseId, id);
    if (!existing) throw notFound("Material no encontrado");
    await this.repo.patchStatus(courseId, id, estado);
  }

  private assertCanManage(requester: AuthContext, docenteId: number): void {
    const isAdmin = requester.role === "admin";
    const isOwnerTeacher = requester.role === "docente" && requester.userId === docenteId;
    if (!isAdmin && !isOwnerTeacher) throw forbidden("No autorizado");
  }
}
