import { forbidden, notFound } from "../../common/errors/httpErrors";
import type { AuthContext } from "../../common/types/express";
import { ReportRepository } from "./report.repository";
import type { ZoneReportBucket, ZoneReportResponse, ZoneReportSummary } from "./report.types";

function toNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function percentage(obtained: number, possible: number): number | null {
  if (possible <= 0) return null;
  return round2((obtained / possible) * 100);
}

export class ReportService {
  private readonly repo = new ReportRepository();

  async zone(requester: AuthContext, courseId: number): Promise<ZoneReportResponse> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");
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

      const tareas: ZoneReportBucket = {
        total: Number(taskRow?.total ?? 0),
        calificadas: Number(taskRow?.calificadas ?? 0),
        puntos_obtenidos: taskObtained,
        puntos_posibles: taskPossible,
        porcentaje: percentage(taskObtained, taskPossible),
      };

      const quizzes: ZoneReportBucket = {
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

    const resumen = rows.reduce<ZoneReportSummary>(
      (acc, row) => {
        acc.zona_puntos_obtenidos = round2(acc.zona_puntos_obtenidos + row.zona.puntos_obtenidos);
        acc.zona_puntos_posibles = round2(acc.zona_puntos_posibles + row.zona.puntos_posibles);
        return acc;
      },
      {
        estudiantes: rows.length,
        tareas_total: rows[0]?.tareas.total ?? 0,
        quizzes_total: rows[0]?.quizzes.total ?? 0,
        tareas_puntos_posibles: rows[0]?.tareas.puntos_posibles ?? 0,
        quizzes_puntos_posibles: rows[0]?.quizzes.puntos_posibles ?? 0,
        zona_puntos_obtenidos: 0,
        zona_puntos_posibles: 0,
        zona_promedio_porcentaje: null,
      }
    );

    resumen.zona_promedio_porcentaje = percentage(resumen.zona_puntos_obtenidos, resumen.zona_puntos_posibles);

    return { curso: course, resumen, rows };
  }

  private assertCanManage(requester: AuthContext, docenteId: number): void {
    const isAdmin = requester.role === "admin";
    const isOwnerTeacher = requester.role === "docente" && requester.userId === docenteId;
    if (!isAdmin && !isOwnerTeacher) throw forbidden("No autorizado");
  }
}
