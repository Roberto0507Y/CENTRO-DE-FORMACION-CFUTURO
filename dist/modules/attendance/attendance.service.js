"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const httpErrors_1 = require("../../common/errors/httpErrors");
const db_1 = require("../../config/db");
const attendance_repository_1 = require("./attendance.repository");
function todayIsoDate() {
    // YYYY-MM-DD en la zona local del servidor
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}
class AttendanceService {
    constructor() {
        this.repo = new attendance_repository_1.AttendanceRepository();
    }
    async list(requester, courseId, date) {
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        this.assertCanManage(requester, course.docente_id);
        const effectiveDate = date ?? todayIsoDate();
        const items = await this.repo.buildStudentItems(courseId, effectiveDate);
        return { date: effectiveDate, items };
    }
    async upsert(requester, courseId, date, items) {
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        this.assertCanManage(requester, course.docente_id);
        if (items.length === 0)
            throw (0, httpErrors_1.badRequest)("Debes enviar al menos un estudiante");
        const activeStudents = await this.repo.listActiveStudents(courseId);
        const activeSet = new Set(activeStudents.map((s) => s.id));
        const invalid = items.find((i) => !activeSet.has(i.estudiante_id));
        if (invalid)
            throw (0, httpErrors_1.badRequest)("Hay estudiantes que no pertenecen a este curso");
        await (0, db_1.withTransaction)(async (conn) => {
            await this.repo.upsertMany(conn, {
                courseId,
                date,
                registeredBy: requester.userId,
                items: items.map((i) => ({
                    estudiante_id: i.estudiante_id,
                    estado: i.estado,
                    comentario: i.comentario ?? null,
                })),
            });
        });
        return { ok: true };
    }
    assertCanManage(requester, docenteId) {
        const isAdmin = requester.role === "admin";
        const isOwnerTeacher = requester.role === "docente" && requester.userId === docenteId;
        if (!isAdmin && !isOwnerTeacher)
            throw (0, httpErrors_1.forbidden)("No autorizado");
    }
}
exports.AttendanceService = AttendanceService;
