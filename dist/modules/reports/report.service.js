"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const httpErrors_1 = require("../../common/errors/httpErrors");
const report_repository_1 = require("./report.repository");
function toNumber(value) {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
}
function round2(value) {
    return Math.round(value * 100) / 100;
}
function percentage(obtained, possible) {
    if (possible <= 0)
        return null;
    return round2((obtained / possible) * 100);
}
class ReportService {
    constructor() {
        this.repo = new report_repository_1.ReportRepository();
    }
    async zone(requester, courseId) {
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        this.assertCanManage(requester, course.docente_id);
        const [students, taskTotals, quizTotals] = await Promise.all([
            this.repo.listActiveStudents(courseId),
            this.repo.listTaskTotals(courseId),
            this.repo.listQuizTotals(courseId),
        ]);
        const taskMap = new Map(taskTotals.map((row) => [row.estudiante_id, row]));
        const quizMap = new Map(quizTotals.map((row) => [row.estudiante_id, row]));
        const rows = students.map((student) => {
            const taskRow = taskMap.get(student.id);
            const quizRow = quizMap.get(student.id);
            const taskObtained = round2(toNumber(taskRow?.puntos_obtenidos));
            const taskPossible = round2(toNumber(taskRow?.puntos_posibles));
            const quizObtained = round2(toNumber(quizRow?.puntos_obtenidos));
            const quizPossible = round2(toNumber(quizRow?.puntos_posibles));
            const zoneObtained = round2(taskObtained + quizObtained);
            const zonePossible = round2(taskPossible + quizPossible);
            const tareas = {
                total: Number(taskRow?.total ?? 0),
                calificadas: Number(taskRow?.calificadas ?? 0),
                puntos_obtenidos: taskObtained,
                puntos_posibles: taskPossible,
                porcentaje: percentage(taskObtained, taskPossible),
            };
            const quizzes = {
                total: Number(quizRow?.total ?? 0),
                completados: Number(quizRow?.completados ?? 0),
                intentos: Number(quizRow?.intentos ?? 0),
                puntos_obtenidos: quizObtained,
                puntos_posibles: quizPossible,
                porcentaje: percentage(quizObtained, quizPossible),
            };
            return {
                estudiante: student,
                tareas,
                quizzes,
                zona: {
                    puntos_obtenidos: zoneObtained,
                    puntos_posibles: zonePossible,
                    porcentaje: percentage(zoneObtained, zonePossible),
                },
            };
        });
        const resumen = rows.reduce((acc, row) => {
            acc.zona_puntos_obtenidos = round2(acc.zona_puntos_obtenidos + row.zona.puntos_obtenidos);
            acc.zona_puntos_posibles = round2(acc.zona_puntos_posibles + row.zona.puntos_posibles);
            return acc;
        }, {
            estudiantes: rows.length,
            tareas_total: rows[0]?.tareas.total ?? 0,
            quizzes_total: rows[0]?.quizzes.total ?? 0,
            tareas_puntos_posibles: rows[0]?.tareas.puntos_posibles ?? 0,
            quizzes_puntos_posibles: rows[0]?.quizzes.puntos_posibles ?? 0,
            zona_puntos_obtenidos: 0,
            zona_puntos_posibles: 0,
            zona_promedio_porcentaje: null,
        });
        resumen.zona_promedio_porcentaje = percentage(resumen.zona_puntos_obtenidos, resumen.zona_puntos_posibles);
        return { curso: course, resumen, rows };
    }
    assertCanManage(requester, docenteId) {
        const isAdmin = requester.role === "admin";
        const isOwnerTeacher = requester.role === "docente" && requester.userId === docenteId;
        if (!isAdmin && !isOwnerTeacher)
            throw (0, httpErrors_1.forbidden)("No autorizado");
    }
}
exports.ReportService = ReportService;
