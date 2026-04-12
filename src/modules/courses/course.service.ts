import { badRequest, conflict, forbidden, notFound } from "../../common/errors/httpErrors";
import { sanitizeSlug, slugFromTitle } from "../../common/utils/slug";
import type { AuthContext } from "../../common/types/express";
import { CourseRepository } from "./course.repository";
import { NotificationService } from "../notifications/notification.service";
import type {
  CourseDetail,
  CourseDetailPrivate,
  CourseFilters,
  CourseListItem,
  CourseListItemTeaching,
  CreateCourseInput,
  EnrolledCourseItem,
  Pagination,
  UpdateCourseInput,
} from "./course.types";

export class CourseService {
  private readonly repo = new CourseRepository();
  private readonly notifications = new NotificationService();

  async listPublic(filters: CourseFilters, pagination: Pagination): Promise<{
    items: CourseListItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { items, total } = await this.repo.listPublished(filters, pagination);
    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  async getPublicById(id: number, requester?: AuthContext): Promise<CourseDetail | CourseDetailPrivate> {
    const publicCourse = await this.repo.findPublishedDetailById(id);
    if (publicCourse) return publicCourse;

    if (!requester) throw notFound("Curso no encontrado");

    const privateCourse = await this.repo.findDetailById(id);
    if (!privateCourse) throw notFound("Curso no encontrado");

    const isAdmin = requester.role === "admin";
    const isOwner = requester.role === "docente" && requester.userId === privateCourse.docente_id;
    if (!isAdmin && !isOwner) throw notFound("Curso no encontrado");

    return privateCourse;
  }

  async getPublicBySlug(slug: string): Promise<CourseDetail> {
    const course = await this.repo.findPublishedDetailBySlug(slug);
    if (!course) throw notFound("Curso no encontrado");
    return course;
  }

  async create(requester: AuthContext, input: CreateCourseInput): Promise<CourseDetailPrivate> {
    const isAdmin = requester.role === "admin";
    const isTeacher = requester.role === "docente";
    if (!isAdmin && !isTeacher) throw forbidden();

    const categoriaOk = await this.repo.categoryIsActive(input.categoria_id);
    if (!categoriaOk) throw badRequest("La categoría no existe o está inactiva");

    const docenteId = this.resolveDocenteIdForCreate(requester, input.docente_id);

    const docenteOk = await this.repo.teacherIsValid(docenteId);
    if (!docenteOk) throw badRequest("docente_id inválido (debe ser admin/docente activo)");

    const tipoAcceso = input.tipo_acceso ?? "gratis";
    const precio = this.normalizePrice(tipoAcceso, input.precio);

    const estado = input.estado ?? "borrador";
    const fechaPublicacion = this.normalizePublishDate(estado, input.fecha_publicacion);

    const baseSlug = input.slug ? sanitizeSlug(input.slug) : slugFromTitle(input.titulo);
    if (!baseSlug) throw badRequest("slug inválido");
    const slug = await this.ensureUniqueSlug(baseSlug);

    const id = await this.repo.createCourse({
      categoria_id: input.categoria_id,
      docente_id: docenteId,
      titulo: input.titulo.trim(),
      slug,
      descripcion_corta: input.descripcion_corta ?? null,
      descripcion: input.descripcion ?? null,
      imagen_url: input.imagen_url ?? null,
      video_intro_url: input.video_intro_url ?? null,
      payment_link: input.payment_link ?? null,
      tipo_acceso: tipoAcceso,
      precio: precio.toFixed(2),
      nivel: input.nivel ?? "basico",
      estado,
      duracion_horas: input.duracion_horas === undefined ? null : numberOrNullToString(input.duracion_horas),
      requisitos: input.requisitos ?? null,
      objetivos: input.objetivos ?? null,
      fecha_publicacion: fechaPublicacion,
    });

    const created = await this.repo.findDetailById(id);
    if (!created) throw new Error("No se pudo crear el curso");

    const teacherName = `${created.docente.nombres} ${created.docente.apellidos}`.trim();
    void this.notifications.notifyAdminsCourseCreated({ courseId: created.id, courseTitle: created.titulo, teacherName });

    return created;
  }

  async update(requester: AuthContext, id: number, input: UpdateCourseInput): Promise<CourseDetailPrivate> {
    const existing = await this.repo.findCourseOwner(id);
    if (!existing) throw notFound("Curso no encontrado");

    const isAdmin = requester.role === "admin";
    const isOwnerTeacher = requester.role === "docente" && requester.userId === existing.docente_id;
    if (!isAdmin && !isOwnerTeacher) throw notFound("Curso no encontrado");

    if (input.docente_id !== undefined && !isAdmin) {
      throw forbidden("No puedes cambiar el docente del curso");
    }

    if (input.categoria_id !== undefined) {
      const ok = await this.repo.categoryIsActive(input.categoria_id);
      if (!ok) throw badRequest("La categoría no existe o está inactiva");
    }

    if (input.docente_id !== undefined) {
      const ok = await this.repo.teacherIsValid(input.docente_id);
      if (!ok) throw badRequest("docente_id inválido (debe ser admin/docente activo)");
    }

    const desiredTipoAcceso = input.tipo_acceso ?? existing.tipo_acceso;
    const desiredPrecio =
      input.precio !== undefined ? input.precio : Number(existing.precio);
    const normalizedPrecio =
      input.tipo_acceso !== undefined || input.precio !== undefined
        ? this.normalizePrice(desiredTipoAcceso, desiredPrecio)
        : undefined;

    const desiredSlugBase = input.slug !== undefined ? sanitizeSlug(input.slug) : undefined;
    if (desiredSlugBase !== undefined && !desiredSlugBase) throw badRequest("slug inválido");

    const finalSlug =
      desiredSlugBase !== undefined
        ? await this.ensureUniqueSlug(desiredSlugBase, id)
        : undefined;

    const publishingNow = input.estado === "publicado" && existing.estado !== "publicado";
    const fechaPublicacion =
      input.fecha_publicacion === undefined
        ? publishingNow && !existing.fecha_publicacion
          ? new Date().toISOString().slice(0, 19).replace("T", " ")
          : undefined
        : input.fecha_publicacion === null && publishingNow
          ? new Date().toISOString().slice(0, 19).replace("T", " ")
          : input.fecha_publicacion;

    await this.repo.updateCourseById(id, {
      categoria_id: input.categoria_id,
      docente_id: input.docente_id,
      titulo: input.titulo?.trim(),
      slug: finalSlug,
      descripcion_corta: input.descripcion_corta === undefined ? undefined : input.descripcion_corta,
      descripcion: input.descripcion === undefined ? undefined : input.descripcion,
      imagen_url: input.imagen_url === undefined ? undefined : input.imagen_url,
      video_intro_url: input.video_intro_url === undefined ? undefined : input.video_intro_url,
      payment_link: input.payment_link === undefined ? undefined : input.payment_link,
      tipo_acceso: input.tipo_acceso,
      precio: normalizedPrecio === undefined ? undefined : normalizedPrecio.toFixed(2),
      nivel: input.nivel,
      estado: input.estado,
      duracion_horas:
        input.duracion_horas === undefined ? undefined : numberOrNullToString(input.duracion_horas),
      requisitos: input.requisitos === undefined ? undefined : input.requisitos,
      objetivos: input.objetivos === undefined ? undefined : input.objetivos,
      fecha_publicacion: fechaPublicacion,
    });

    const updated = await this.repo.findDetailById(id);
    if (!updated) throw notFound("Curso no encontrado");
    return updated;
  }

  async remove(requester: AuthContext, id: number): Promise<void> {
    const existing = await this.repo.findCourseOwner(id);
    if (!existing) throw notFound("Curso no encontrado");

    const isAdmin = requester.role === "admin";
    const isOwnerTeacher = requester.role === "docente" && requester.userId === existing.docente_id;
    if (!isAdmin && !isOwnerTeacher) throw notFound("Curso no encontrado");

    const ok = await this.repo.hideCourseById(id);
    if (!ok) throw notFound("Curso no encontrado");
  }

  async listTeaching(
    requester: AuthContext,
    docenteId: number | null,
    pagination: Pagination,
    search?: string
  ): Promise<{ items: CourseListItemTeaching[]; total: number; page: number; limit: number }> {
    const isAdmin = requester.role === "admin";
    const isTeacher = requester.role === "docente";
    if (!isAdmin && !isTeacher) throw forbidden();

    const effectiveDocenteId = isAdmin ? docenteId : requester.userId;
    const { items, total } = await this.repo.listTeaching(effectiveDocenteId, pagination, search);
    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  async listEnrolled(requester: AuthContext): Promise<EnrolledCourseItem[]> {
    return this.repo.listEnrolled(requester.userId);
  }

  private resolveDocenteIdForCreate(requester: AuthContext, docenteId?: number): number {
    if (requester.role === "docente") {
      if (docenteId !== undefined && docenteId !== requester.userId) {
        throw forbidden("No puedes crear cursos para otro docente");
      }
      return requester.userId;
    }
    // admin
    if (docenteId === undefined) throw badRequest("docente_id es requerido para admin");
    return docenteId;
  }

  private normalizePrice(tipoAcceso: "gratis" | "pago", precio?: number): number {
    if (tipoAcceso === "gratis") {
      if (precio === undefined) return 0;
      const n = Number(precio);
      if (!Number.isFinite(n) || n < 0) throw badRequest("precio inválido");
      if (n > 0) throw badRequest("precio debe ser 0 para cursos gratis");
      return 0;
    }
    const n = Number(precio);
    if (!Number.isFinite(n) || n <= 0) {
      throw badRequest("precio debe ser mayor que 0 para cursos de pago");
    }
    return n;
  }

  private normalizePublishDate(estado: string, fecha: string | null | undefined): string | null {
    if (estado !== "publicado") return fecha ?? null;
    if (!fecha) {
      return new Date().toISOString().slice(0, 19).replace("T", " ");
    }
    return fecha;
  }

  private async ensureUniqueSlug(baseSlug: string, excludeId?: number): Promise<string> {
    let slug = baseSlug;
    const base = baseSlug.slice(0, 180);
    for (let i = 0; i < 50; i++) {
      const exists = await this.repo.slugExists(slug, excludeId);
      if (!exists) return slug;
      const suffix = `-${i + 2}`;
      const trimmed = base.slice(0, Math.max(1, 180 - suffix.length));
      slug = `${trimmed}${suffix}`;
    }
    throw conflict("No se pudo generar un slug único");
  }
}

function numberOrNullToString(v: number | null): string | null {
  if (v === null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n.toString();
}
