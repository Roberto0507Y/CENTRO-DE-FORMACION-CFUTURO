import { badRequest, conflict, forbidden, notFound } from "../../common/errors/httpErrors";
import type { AuthContext } from "../../common/types/express";
import { EnrollmentRepository } from "./enrollment.repository";
import type { AccessCheck, CourseStudentItem, MyEnrollmentItem } from "./enrollment.types";

export class EnrollmentService {
  private readonly repo = new EnrollmentRepository();

  async enrollFree(requester: AuthContext, courseId: number): Promise<{ enrollmentId: number }> {
    const course = await this.repo.findCourseById(courseId);
    if (!course) throw notFound("Curso no encontrado");
    if (course.estado !== "publicado") throw notFound("Curso no encontrado");
    if (course.tipo_acceso !== "gratis") {
      throw forbidden("Este curso requiere pago para inscribirse");
    }

    const existing = await this.repo.findEnrollmentByUserAndCourse(requester.userId, courseId);
    if (existing) throw conflict("Ya estás inscrito en este curso");

    const enrollmentId = await this.repo.createEnrollment({
      usuario_id: requester.userId,
      curso_id: courseId,
      tipo_inscripcion: "gratis",
      estado: "activa",
    });

    return { enrollmentId };
  }

  async confirmPaid(requester: AuthContext, courseId: number): Promise<{ enrollmentId: number }> {
    const course = await this.repo.findCourseById(courseId);
    if (!course) throw notFound("Curso no encontrado");
    if (course.estado !== "publicado") throw notFound("Curso no encontrado");
    if (course.tipo_acceso !== "pago") {
      throw badRequest("Este curso no es de pago");
    }

    const existing = await this.repo.findEnrollmentByUserAndCourse(requester.userId, courseId);
    if (existing) throw conflict("Ya estás inscrito en este curso");

    const paid = await this.repo.paymentExistsForUserAndCourse(requester.userId, courseId);
    if (!paid) throw forbidden("No hay un pago confirmado para este curso");

    const enrollmentId = await this.repo.createEnrollment({
      usuario_id: requester.userId,
      curso_id: courseId,
      tipo_inscripcion: "pagada",
      estado: "activa",
    });

    return { enrollmentId };
  }

  async myCourses(requester: AuthContext): Promise<MyEnrollmentItem[]> {
    return this.repo.listMyActiveCourses(requester.userId);
  }

  async checkAccess(requester: AuthContext, courseId: number): Promise<AccessCheck> {
    const course = await this.repo.findCourseById(courseId);
    if (!course) throw notFound("Curso no encontrado");
    // check-access es autenticado; no filtramos por publicado aquí, pero la regla principal depende de inscripción activa.
    return this.repo.checkAccess(requester.userId, courseId);
  }

  async courseStudents(requester: AuthContext, courseId: number): Promise<CourseStudentItem[]> {
    const course = await this.repo.findCourseById(courseId);
    if (!course) throw notFound("Curso no encontrado");

    const isAdmin = requester.role === "admin";
    const isOwnerTeacher = requester.role === "docente" && requester.userId === course.docente_id;
    if (!isAdmin && !isOwnerTeacher) throw forbidden("No tienes permisos para ver estudiantes");

    return this.repo.listActiveStudents(courseId);
  }

  async updateProgress(
    requester: AuthContext,
    enrollmentId: number,
    progreso: number
  ): Promise<void> {
    // Temporal: solo admin o docente dueño del curso
    const enrollment = await this.repo.findEnrollmentById(enrollmentId);
    if (!enrollment) throw notFound("Inscripción no encontrada");

    const course = await this.repo.findCourseById(enrollment.curso_id);
    if (!course) throw notFound("Curso no encontrado");

    const isAdmin = requester.role === "admin";
    const isOwnerTeacher = requester.role === "docente" && requester.userId === course.docente_id;
    if (!isAdmin && !isOwnerTeacher) throw forbidden("No autorizado");

    if (!Number.isFinite(progreso) || progreso < 0 || progreso > 100) {
      throw badRequest("progreso debe estar entre 0 y 100");
    }

    const finalize = progreso >= 100;
    const ok = await this.repo.updateProgress(enrollmentId, progreso, finalize);
    if (!ok) throw notFound("Inscripción no encontrada");
  }

  async cancel(requester: AuthContext, enrollmentId: number): Promise<void> {
    const enrollment = await this.repo.findEnrollmentById(enrollmentId);
    if (!enrollment) throw notFound("Inscripción no encontrada");

    const isAdmin = requester.role === "admin";
    const isOwner = requester.userId === enrollment.usuario_id;
    if (!isAdmin && !isOwner) throw forbidden("No autorizado");

    const ok = await this.repo.cancelEnrollment(enrollmentId);
    if (!ok) throw notFound("Inscripción no encontrada");
  }
}

