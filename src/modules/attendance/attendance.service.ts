import { badRequest, forbidden, notFound } from "../../common/errors/httpErrors";
import type { AuthContext } from "../../common/types/express";
import { withTransaction } from "../../config/db";
import { AttendanceRepository } from "./attendance.repository";
import type { AttendanceStudentItem, UpsertAttendanceItemInput } from "./attendance.types";

function todayIsoDate(): string {
  // YYYY-MM-DD en la zona local del servidor
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export class AttendanceService {
  private readonly repo = new AttendanceRepository();

  async list(requester: AuthContext, courseId: number, date?: string): Promise<{ date: string; items: AttendanceStudentItem[] }> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");
    this.assertCanManage(requester, course.docente_id);

    const effectiveDate = date ?? todayIsoDate();
    const items = await this.repo.buildStudentItems(courseId, effectiveDate);
    return { date: effectiveDate, items };
  }

  async upsert(
    requester: AuthContext,
    courseId: number,
    date: string,
    items: UpsertAttendanceItemInput[]
  ): Promise<{ ok: true }> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");
    this.assertCanManage(requester, course.docente_id);

    if (items.length === 0) throw badRequest("Debes enviar al menos un estudiante");

    const activeStudents = await this.repo.listActiveStudents(courseId);
    const activeSet = new Set(activeStudents.map((s) => s.id));
    const invalid = items.find((i) => !activeSet.has(i.estudiante_id));
    if (invalid) throw badRequest("Hay estudiantes que no pertenecen a este curso");

    await withTransaction(async (conn) => {
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

  private assertCanManage(requester: AuthContext, docenteId: number): void {
    const isAdmin = requester.role === "admin";
    const isOwnerTeacher = requester.role === "docente" && requester.userId === docenteId;
    if (!isAdmin && !isOwnerTeacher) throw forbidden("No autorizado");
  }
}

