import type { AuthContext } from "../../common/types/express";
import { notFound } from "../../common/errors/httpErrors";
import { withTransaction } from "../../config/db";
import { NotificationRepository } from "./notification.repository";
import type { ListNotificationsQuery, NotificationListResponse } from "./notification.types";

function formatPoints(value: number | string | null | undefined): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value ?? "");
  if (Number.isInteger(numeric)) return String(numeric);
  return numeric.toFixed(2).replace(/\.?0+$/, "");
}

export class NotificationService {
  private readonly repo = new NotificationRepository();

  private normalizeListQuery(q: ListNotificationsQuery): ListNotificationsQuery {
    return {
      ...q,
      limit: Math.max(1, Math.min(Number(q.limit) || 20, 50)),
      offset: Math.max(0, Number(q.offset) || 0),
    };
  }

  async listMy(requester: AuthContext, q: ListNotificationsQuery): Promise<NotificationListResponse> {
    const normalized = this.normalizeListQuery(q);
    const { items, total, unreadCount } = await this.repo.listForUser(requester.userId, normalized);
    return { items, total, limit: normalized.limit, offset: normalized.offset, unreadCount };
  }

  async markRead(requester: AuthContext, id: number): Promise<void> {
    const ok = await this.repo.markRead(requester.userId, id);
    if (!ok) throw notFound("Notificación no encontrada");
  }

  async markAllRead(requester: AuthContext): Promise<{ affected: number }> {
    const affected = await this.repo.markAllRead(requester.userId);
    return { affected };
  }

  async deleteMy(requester: AuthContext, id: number): Promise<void> {
    const ok = await this.repo.deleteForUser(requester.userId, id);
    if (!ok) throw notFound("Notificación no encontrada");
  }

  async notifyAdminsCourseCreated(params: { courseId: number; courseTitle: string; teacherName: string }): Promise<void> {
    try {
      await withTransaction(async (conn) => {
        const adminIds = await this.repo.listActiveAdminIds(conn);
        await this.repo.createMany(
          conn,
          adminIds.map((id) => ({
            usuario_id: id,
            titulo: "Curso creado",
            mensaje: `Se creó el curso “${params.courseTitle}” (docente: ${params.teacherName}).`,
            tipo: "curso",
            referencia_tipo: "cursos",
            referencia_id: params.courseId,
          }))
        );
      });
    } catch {
      // No bloquea el flujo principal
    }
  }

  async notifyAdminsPaymentPending(params: { paymentId: number; courseId: number; courseTitle: string; studentName: string }): Promise<void> {
    try {
      await withTransaction(async (conn) => {
        const adminIds = await this.repo.listActiveAdminIds(conn);
        await this.repo.createMany(
          conn,
          adminIds.map((id) => ({
            usuario_id: id,
            titulo: "Pago pendiente",
            mensaje: `Nuevo comprobante para “${params.courseTitle}” (estudiante: ${params.studentName}).`,
            tipo: "pago",
            referencia_tipo: "pagos",
            referencia_id: params.paymentId,
          }))
        );
      });
    } catch {
      // No bloquea el flujo principal
    }
  }

  async notifyStudentTaskGraded(params: {
    studentId: number;
    courseId: number;
    taskTitle: string;
    courseTitle: string;
    score: number | string;
    maxPoints: number | string;
  }): Promise<void> {
    try {
      const score = formatPoints(params.score);
      const maxPoints = formatPoints(params.maxPoints);
      await withTransaction(async (conn) => {
        await this.repo.createMany(conn, [
          {
            usuario_id: params.studentId,
            titulo: "Tarea calificada",
            mensaje: `Tu entrega de “${params.taskTitle}” en “${params.courseTitle}” fue calificada con ${score}/${maxPoints}.`,
            tipo: "calificacion",
            referencia_tipo: "course_tasks",
            referencia_id: params.courseId,
          },
        ]);
      });
    } catch (err) {
      console.warn("No se pudo crear la notificación de calificación", err);
    }
  }

  async notifyStudentPaymentStatus(params: {
    studentId: number;
    paymentId: number;
    courseTitle: string;
    estado: "pagado" | "rechazado" | "reembolsado";
    observaciones?: string | null;
  }): Promise<void> {
    try {
      const reason = params.observaciones?.trim();
      const isApproved = params.estado === "pagado";
      const isRefunded = params.estado === "reembolsado";
      await withTransaction(async (conn) => {
        await this.repo.createMany(conn, [
          {
            usuario_id: params.studentId,
            titulo: isApproved ? "Pago aprobado" : isRefunded ? "Pago reembolsado" : "Pago rechazado",
            mensaje: isApproved
              ? `Tu pago para “${params.courseTitle}” fue aprobado. Ya tienes acceso al curso.`
              : isRefunded
                ? `Tu pago para “${params.courseTitle}” fue reembolsado y el acceso quedó cancelado.${reason ? ` Motivo: ${reason}` : ""}`
                : `Tu pago para “${params.courseTitle}” fue rechazado.${reason ? ` Motivo: ${reason}` : " Revisa el comprobante o intenta subirlo nuevamente."}`,
            tipo: "pago",
            referencia_tipo: "pagos",
            referencia_id: params.paymentId,
          },
        ]);
      });
    } catch (err) {
      console.warn("No se pudo crear la notificación de pago", err);
    }
  }
}
