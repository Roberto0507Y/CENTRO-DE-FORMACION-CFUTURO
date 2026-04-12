"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrollmentService = void 0;
const httpErrors_1 = require("../../common/errors/httpErrors");
const enrollment_repository_1 = require("./enrollment.repository");
class EnrollmentService {
    constructor() {
        this.repo = new enrollment_repository_1.EnrollmentRepository();
    }
    async enrollFree(requester, courseId) {
        const course = await this.repo.findCourseById(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        if (course.estado !== "publicado")
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        if (course.tipo_acceso !== "gratis") {
            throw (0, httpErrors_1.forbidden)("Este curso requiere pago para inscribirse");
        }
        const existing = await this.repo.findEnrollmentByUserAndCourse(requester.userId, courseId);
        if (existing)
            throw (0, httpErrors_1.conflict)("Ya estás inscrito en este curso");
        const enrollmentId = await this.repo.createEnrollment({
            usuario_id: requester.userId,
            curso_id: courseId,
            tipo_inscripcion: "gratis",
            estado: "activa",
        });
        return { enrollmentId };
    }
    async confirmPaid(requester, courseId) {
        const course = await this.repo.findCourseById(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        if (course.estado !== "publicado")
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        if (course.tipo_acceso !== "pago") {
            throw (0, httpErrors_1.badRequest)("Este curso no es de pago");
        }
        const existing = await this.repo.findEnrollmentByUserAndCourse(requester.userId, courseId);
        if (existing)
            throw (0, httpErrors_1.conflict)("Ya estás inscrito en este curso");
        const paid = await this.repo.paymentExistsForUserAndCourse(requester.userId, courseId);
        if (!paid)
            throw (0, httpErrors_1.forbidden)("No hay un pago confirmado para este curso");
        const enrollmentId = await this.repo.createEnrollment({
            usuario_id: requester.userId,
            curso_id: courseId,
            tipo_inscripcion: "pagada",
            estado: "activa",
        });
        return { enrollmentId };
    }
    async myCourses(requester) {
        return this.repo.listMyActiveCourses(requester.userId);
    }
    async checkAccess(requester, courseId) {
        const course = await this.repo.findCourseById(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        // check-access es autenticado; no filtramos por publicado aquí, pero la regla principal depende de inscripción activa.
        return this.repo.checkAccess(requester.userId, courseId);
    }
    async courseStudents(requester, courseId) {
        const course = await this.repo.findCourseById(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        const isAdmin = requester.role === "admin";
        const isOwnerTeacher = requester.role === "docente" && requester.userId === course.docente_id;
        if (!isAdmin && !isOwnerTeacher)
            throw (0, httpErrors_1.forbidden)("No tienes permisos para ver estudiantes");
        return this.repo.listActiveStudents(courseId);
    }
    async updateProgress(requester, enrollmentId, progreso) {
        // Temporal: solo admin o docente dueño del curso
        const enrollment = await this.repo.findEnrollmentById(enrollmentId);
        if (!enrollment)
            throw (0, httpErrors_1.notFound)("Inscripción no encontrada");
        const course = await this.repo.findCourseById(enrollment.curso_id);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        const isAdmin = requester.role === "admin";
        const isOwnerTeacher = requester.role === "docente" && requester.userId === course.docente_id;
        if (!isAdmin && !isOwnerTeacher)
            throw (0, httpErrors_1.forbidden)("No autorizado");
        if (!Number.isFinite(progreso) || progreso < 0 || progreso > 100) {
            throw (0, httpErrors_1.badRequest)("progreso debe estar entre 0 y 100");
        }
        const finalize = progreso >= 100;
        const ok = await this.repo.updateProgress(enrollmentId, progreso, finalize);
        if (!ok)
            throw (0, httpErrors_1.notFound)("Inscripción no encontrada");
    }
    async cancel(requester, enrollmentId) {
        const enrollment = await this.repo.findEnrollmentById(enrollmentId);
        if (!enrollment)
            throw (0, httpErrors_1.notFound)("Inscripción no encontrada");
        const isAdmin = requester.role === "admin";
        const isOwner = requester.userId === enrollment.usuario_id;
        if (!isAdmin && !isOwner)
            throw (0, httpErrors_1.forbidden)("No autorizado");
        const ok = await this.repo.cancelEnrollment(enrollmentId);
        if (!ok)
            throw (0, httpErrors_1.notFound)("Inscripción no encontrada");
    }
}
exports.EnrollmentService = EnrollmentService;
