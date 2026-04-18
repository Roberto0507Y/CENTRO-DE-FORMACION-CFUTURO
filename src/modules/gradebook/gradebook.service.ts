import { forbidden, notFound } from "../../common/errors/httpErrors";
import type { AuthContext } from "../../common/types/express";
import { GradebookRepository } from "./gradebook.repository";
import type {
  GradebookAttendanceItem,
  GradebookQuizItem,
  GradebookSummary,
  GradebookTaskItem,
  MyCourseGradebook,
} from "./gradebook.types";

function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildSummary(
  tareas: GradebookTaskItem[],
  quizzes: GradebookQuizItem[],
  asistencia: GradebookAttendanceItem[]
): GradebookSummary {
  let tareasPuntosObtenidos = 0;
  let tareasPuntosPosibles = 0;
  let tareasCalificadas = 0;
  let quizzesPuntosObtenidos = 0;
  let quizzesPuntosPosibles = 0;
  let quizzesCompletados = 0;
  let quizzesIntentos = 0;

  for (const tarea of tareas) {
    const calificacion = Number(tarea.entrega?.calificacion);
    const puntos = Number(tarea.puntos);
    if (!Number.isFinite(calificacion) || !Number.isFinite(puntos) || puntos <= 0) continue;
    tareasCalificadas += 1;
    tareasPuntosObtenidos += calificacion;
    tareasPuntosPosibles += puntos;
  }

  for (const quiz of quizzes) {
    quizzesIntentos += quiz.intentos;
    const puntaje = Number(quiz.puntaje_obtenido);
    const total = Number(quiz.puntaje_total);
    if (!quiz.completado || !Number.isFinite(puntaje) || !Number.isFinite(total) || total <= 0) continue;
    quizzesCompletados += 1;
    quizzesPuntosObtenidos += puntaje;
    quizzesPuntosPosibles += total;
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
  const zonaPuntosObtenidos = tareasPuntosObtenidos + quizzesPuntosObtenidos;
  const zonaPuntosPosibles = tareasPuntosPosibles + quizzesPuntosPosibles;
  const zonaPorcentaje = zonaPuntosPosibles > 0 ? roundPercent((zonaPuntosObtenidos / zonaPuntosPosibles) * 100) : null;

  return {
    tareas_total: tareas.length,
    tareas_calificadas: tareasCalificadas,
    quizzes_total: quizzes.length,
    quizzes_completados: quizzesCompletados,
    quizzes_intentos: quizzesIntentos,
    tareas_puntos_obtenidos: roundPercent(tareasPuntosObtenidos),
    tareas_puntos_posibles: roundPercent(tareasPuntosPosibles),
    quizzes_puntos_obtenidos: roundPercent(quizzesPuntosObtenidos),
    quizzes_puntos_posibles: roundPercent(quizzesPuntosPosibles),
    zona_puntos_obtenidos: roundPercent(zonaPuntosObtenidos),
    zona_puntos_posibles: roundPercent(zonaPuntosPosibles),
    zona_porcentaje: zonaPorcentaje,
    puntos_obtenidos: roundPercent(zonaPuntosObtenidos),
    puntos_posibles: roundPercent(zonaPuntosPosibles),
    promedio_porcentaje: zonaPorcentaje,
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

    const [tareas, quizzes, asistencia] = await Promise.all([
      this.repo.listTaskGrades(courseId, requester.userId),
      this.repo.listQuizGrades(courseId, requester.userId),
      this.repo.listAttendance(courseId, requester.userId),
    ]);

    return {
      curso: {
        id: curso.id,
        titulo: curso.titulo,
      },
      resumen: buildSummary(tareas, quizzes, asistencia),
      tareas,
      quizzes,
      asistencia,
    };
  }
}
