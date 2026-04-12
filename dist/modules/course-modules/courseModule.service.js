"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseModuleService = void 0;
const httpErrors_1 = require("../../common/errors/httpErrors");
const courseModule_repository_1 = require("./courseModule.repository");
class CourseModuleService {
    constructor() {
        this.repo = new courseModule_repository_1.CourseModuleRepository();
    }
    async listByCourse(requester, courseId) {
        const course = await this.repo.findCourseById(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        const isPublished = course.estado === "publicado";
        const isAdmin = requester?.role === "admin";
        const isOwnerTeacher = requester?.role === "docente" && requester.userId === course.docente_id;
        if (!isPublished && !isAdmin && !isOwnerTeacher) {
            // Para el público, ocultamos existencia de cursos no publicados.
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        }
        const onlyActive = !isAdmin && !isOwnerTeacher;
        return this.repo.listByCourse(courseId, { onlyActive });
    }
}
exports.CourseModuleService = CourseModuleService;
