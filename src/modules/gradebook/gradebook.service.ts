import { forbidden, notFound } from "../../common/errors/httpErrors";
import type { AuthContext } from "../../common/types/express";
import { GradebookRepository } from "./gradebook.repository";
import type { GradebookAttendanceItem, GradebookSummary, GradebookTaskItem, MyCourseGradebook } from "./gradebook.types";

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildSummary(tareas: GradebookTaskItem[], asistencia: GradebookAttendanceItem[]): GradebookSummary {
  let puntosObtenidos = 0;
  let puntosPosibles = 0;
  let tareasCalificadas = 0;

  for (const tarea of tareas) {
    const calificacion = Number(tarea.entrega?.calificacion);
    const puntos = Number(tarea.puntos);
    if (!Number.isFinite(calificacion) || !Number.isFinite(puntos) || puntos <= 0) continue;
    tareasCalificadas += 1;
    puntosObtenidos += calificacion;
    puntosPosibles += puntos;
  }

  const attendanceTotals = {
    presente: 0,
    tarde: 0,
    justificado: 0,
    ausente: 0,
  };

  for (const item of asistencia) {
    attendanceTotals[item.estado] += 1;
  }

  const asistenciaTotal = asistencia.length;
  const asistenciaOk = attendanceTotals.presente + attendanceTotals.tarde + attendanceTotals.justificado;

  return {
    tareas_total: tareas.length,
    tareas_calificadas: tareasCalificadas,
    puntos_obtenidos: roundPercent(puntosObtenidos),
    puntos_posibles: roundPercent(puntosPosibles),
    promedio_porcentaje: puntosPosibles > 0 ? roundPercent((puntosObtenidos / puntosPosibles) * 100) : null,
    asistencia_total: asistenciaTotal,
    asistencias_presentes: attendanceTotals.presente,
    asistencias_tarde: attendanceTotals.tarde,
    asistencias_justificadas: attendanceTotals.justificado,
    asistencias_ausentes: attendanceTotals.ausente,
    asistencia_porcentaje: asistenciaTotal > 0 ? roundPercent((asistenciaOk / asistenciaTotal) * 100) : null,
  };
}

export class GradebookService {
  private readonly repo = new GradebookRepository();

  async getMyCourseGradebook(requester: AuthContext, courseId: number): Promise<MyCourseGradebook> {
    if (requester.role !== "estudiante") throw forbidden("No autorizado");

    const curso = await this.repo.findStudentCourse(courseId, requester.userId);
    if (!curso) throw notFound("Curso no encontrado");
    if (curso.estado !== "publicado") throw notFound("Curso no encontrado");
    if (curso.inscripcion_estado !== "activa") throw forbidden("No tienes acceso a este curso");

    const [tareas, asistencia] = await Promise.all([
      this.repo.listTaskGrades(courseId, requester.userId),
      this.repo.listAttendance(courseId, requester.userId),
    ]);

    return {
      curso: {
        id: curso.id,
        titulo: curso.titulo,
      },
      resumen: buildSummary(tareas, asistencia),
      tareas,
      asistencia,
    };
  }
}
