import { notFound } from "../../common/errors/httpErrors";
import type { AuthContext } from "../../common/types/express";
import { CourseModuleRepository } from "./courseModule.repository";
import type { CourseModuleItem } from "./courseModule.types";

export class CourseModuleService {
  private readonly repo = new CourseModuleRepository();

  async listByCourse(requester: AuthContext | null, courseId: number): Promise<CourseModuleItem[]> {
    const course = await this.repo.findCourseById(courseId);
    if (!course) throw notFound("Curso no encontrado");

    const isPublished = course.estado === "publicado";
    const isAdmin = requester?.role === "admin";
    const isOwnerTeacher = requester?.role === "docente" && requester.userId === course.docente_id;

    if (!isPublished && !isAdmin && !isOwnerTeacher) {
      // Para el público, ocultamos existencia de cursos no publicados.
      throw notFound("Curso no encontrado");
    }

    const onlyActive = !isAdmin && !isOwnerTeacher;
    return this.repo.listByCourse(courseId, { onlyActive });
  }
}

