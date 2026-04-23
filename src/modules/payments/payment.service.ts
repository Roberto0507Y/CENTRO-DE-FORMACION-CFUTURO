import crypto from "crypto";
import path from "path";
import { badRequest, conflict, forbidden, notFound } from "../../common/errors/httpErrors";
import { TtlCache } from "../../common/utils/ttlCache";
import { extractKeyFromPublicUrl } from "../../common/utils/file.util";
import type { AuthContext } from "../../common/types/express";
import { withTransaction } from "../../config/db";
import { getS3Config } from "../../config/s3";
import { PaymentRepository } from "./payment.repository";
import { StorageService, ALLOWED_PAYMENT_PROOFS, type DownloadStreamResult } from "../../common/services/storage.service";
import { NotificationService } from "../notifications/notification.service";
import type {
  ListPaymentsQuery,
  ManualCoursePaymentInput,
  MyCoursePayment,
  MyPaymentHistoryItem,
  MyPaymentsCourseItem,
  PaymentsListResponse,
  PaymentsSummary,
  PaymentStatus,
  RevenuePoint,
} from "./payment.types";

export class PaymentService {
  private static readonly summaryCache = new TtlCache<"summary", PaymentsSummary>({
    ttlMs: 10_000,
    maxEntries: 1,
  });

  private static readonly revenueCache = new TtlCache<number, RevenuePoint[]>({
    ttlMs: 30_000,
    maxEntries: 10,
  });

  private readonly repo = new PaymentRepository();
  private readonly storage = new StorageService();
  private readonly notifications = new NotificationService();

  private normalizeListQuery(q: ListPaymentsQuery): ListPaymentsQuery {
    return {
      ...q,
      limit: Math.max(1, Math.min(Number(q.limit) || 20, 100)),
      offset: Math.max(0, Number(q.offset) || 0),
    };
  }

  async list(requester: AuthContext, q: ListPaymentsQuery): Promise<PaymentsListResponse> {
    if (requester.role !== "admin") throw forbidden("Solo admin puede ver pagos");
    const normalized = this.normalizeListQuery(q);
    const { items, total } = await this.repo.list(normalized);
    return { items, total, limit: normalized.limit, offset: normalized.offset };
  }

  async getById(requester: AuthContext, id: number) {
    if (requester.role !== "admin") throw forbidden("Solo admin puede ver pagos");
    const payment = await this.repo.findById(id);
    if (!payment) throw notFound("Pago no encontrado");
    return payment;
  }

  async downloadProof(requester: AuthContext, id: number): Promise<DownloadStreamResult> {
    const proof = await this.repo.findProofById(id);
    if (!proof) throw notFound("Pago no encontrado");
    if (requester.role !== "admin" && proof.usuario_id !== requester.userId) {
      throw forbidden("No autorizado");
    }
    if (!proof.comprobante_url) throw notFound("Comprobante no encontrado");

    const key = this.resolveProofKey(proof.comprobante_url);
    return this.storage.createDownloadStream({
      key,
      originalName: this.inferOriginalNameFromKey(key),
      contentType: null,
    });
  }

  async summary(requester: AuthContext): Promise<PaymentsSummary> {
    if (requester.role !== "admin") throw forbidden("Solo admin puede ver pagos");
    return PaymentService.summaryCache.getOrSet("summary", () => this.repo.summary());
  }

  async revenueByDay(requester: AuthContext, days: number): Promise<RevenuePoint[]> {
    if (requester.role !== "admin") throw forbidden("Solo admin puede ver pagos");
    return PaymentService.revenueCache.getOrSet(days, () => this.repo.revenueByDay(days));
  }

  async myCoursePayment(requester: AuthContext, courseId: number): Promise<MyCoursePayment> {
    return this.repo.myCoursePayment(requester.userId, courseId);
  }

  async myAdmissionPayment(requester: AuthContext, courseId: number): Promise<MyCoursePayment["payment"]> {
    return this.repo.myAdmissionPayment(requester.userId, courseId);
  }

  async myPaymentsCourses(requester: AuthContext): Promise<MyPaymentsCourseItem[]> {
    return this.repo.myPaymentsCourses(requester.userId);
  }

  async myCoursePaymentHistory(requester: AuthContext, courseId: number): Promise<MyPaymentHistoryItem[]> {
    return this.repo.myCoursePaymentHistory(requester.userId, courseId);
  }

  async createManualCoursePayment(
    requester: AuthContext,
    courseId: number,
    input: ManualCoursePaymentInput,
    file: Express.Multer.File
  ): Promise<MyCoursePayment> {
    const course = await this.repo.findCourseForManualPayment(courseId);
    if (!course) throw notFound("Curso no encontrado");
    if (course.estado !== "publicado") throw notFound("Curso no encontrado");
    if (course.tipo_acceso !== "pago") throw badRequest("Este curso no es de pago");
    const admissionPassed = await this.repo.admissionPassedForUserCourse(requester.userId, courseId);
    if (!admissionPassed) {
      throw forbidden("Debes aprobar el examen de admisión antes de comprar este curso");
    }

    const monto = String(course.precio);
    const moneda = "GTQ";
    const metodo = input.metodo_pago ?? "manual";

    const uploaded = await this.storage.uploadMulterFile({
      module: "payments",
      keyPrefix: `payments/proofs/user-${requester.userId}/course-${courseId}`,
      file,
      allowed: ALLOWED_PAYMENT_PROOFS,
    });

    let previousProofToDelete: string | null = null;
    try {
      await withTransaction(async (conn) => {
        const existingEnr = await this.repo.findEnrollmentForUserCourse(conn, requester.userId, courseId);
        if (existingEnr?.estado === "activa") throw conflict("Ya tienes acceso a este curso");

        const pendingPaymentId = await this.repo.findPendingPaymentIdForUserCourse(conn, requester.userId, courseId);
        if (pendingPaymentId) {
          previousProofToDelete = await this.repo.updatePendingPaymentProof(conn, pendingPaymentId, metodo, uploaded.key);
        } else {
          const ref = this.generateReference();
          const paymentId = await this.repo.createManualPayment(conn, {
            userId: requester.userId,
            referencia: ref,
            metodo,
            monto_total: monto,
            moneda,
            comprobanteUrl: uploaded.key,
          });
          await this.repo.createPaymentDetail(conn, { pago_id: paymentId, curso_id: courseId, precio_unitario: monto });
        }

        if (!existingEnr) {
          await this.repo.createEnrollmentPendingPaid(conn, requester.userId, courseId);
        } else if (existingEnr.estado !== "pendiente" || existingEnr.tipo_inscripcion !== "pagada") {
          await this.repo.updateEnrollmentToPendingPaid(conn, existingEnr.id);
        }
      });
    } catch (err) {
      await this.deleteProofReference(uploaded.key);
      throw err;
    }

    if (previousProofToDelete && previousProofToDelete !== uploaded.key) {
      await this.deleteProofReference(previousProofToDelete);
    }

    const result = await this.repo.myCoursePayment(requester.userId, courseId);

    // Notificación para admin: pago pendiente (no bloquea el flujo)
    if (result.payment && result.payment.estado === "pendiente") {
      const u = await this.repo.findUserName(requester.userId);
      const studentName = u ? `${u.nombres} ${u.apellidos}`.trim() : `Usuario #${requester.userId}`;
      void this.notifications.notifyAdminsPaymentPending({
        paymentId: result.payment.id,
        courseId,
        courseTitle: course.titulo,
        studentName,
      });
    }

    PaymentService.clearAdminCaches();
    return result;
  }

  async createManualAdmissionPayment(
    requester: AuthContext,
    courseId: number,
    input: ManualCoursePaymentInput,
    file: Express.Multer.File
  ): Promise<MyCoursePayment["payment"]> {
    const course = await this.repo.findCourseForManualPayment(courseId);
    if (!course) throw notFound("Curso no encontrado");
    if (course.estado !== "publicado") throw notFound("Curso no encontrado");

    const admissionQuiz = await this.repo.findPublishedAdmissionQuizForPayment(courseId);
    if (!admissionQuiz) throw notFound("Examen de admisión no disponible");

    const passed = await this.repo.admissionPassedForUserCourse(requester.userId, courseId);
    if (passed) throw conflict("Ya aprobaste el examen de admisión");

    const monto = String(admissionQuiz.precio_admision);
    if (Number(monto) <= 0) throw badRequest("Este examen de admisión no requiere pago");

    const metodo = input.metodo_pago ?? "manual";
    const uploaded = await this.storage.uploadMulterFile({
      module: "payments",
      keyPrefix: `payments/proofs/user-${requester.userId}/course-${courseId}/admission`,
      file,
      allowed: ALLOWED_PAYMENT_PROOFS,
    });

    let previousProofToDelete: string | null = null;
    try {
      await withTransaction(async (conn) => {
        const pendingPaymentId = await this.repo.findPendingPaymentIdForUserCourse(
          conn,
          requester.userId,
          courseId,
          "admision"
        );
        if (pendingPaymentId) {
          previousProofToDelete = await this.repo.updatePendingPaymentProof(conn, pendingPaymentId, metodo, uploaded.key);
        } else {
          const paymentId = await this.repo.createManualPayment(conn, {
            userId: requester.userId,
            referencia: this.generateReference(),
            metodo,
            monto_total: monto,
            moneda: "GTQ",
            comprobanteUrl: uploaded.key,
          });
          await this.repo.createPaymentDetail(conn, {
            pago_id: paymentId,
            curso_id: courseId,
            precio_unitario: monto,
            concepto: "admision",
          });
        }
      });
    } catch (err) {
      await this.deleteProofReference(uploaded.key);
      throw err;
    }

    if (previousProofToDelete && previousProofToDelete !== uploaded.key) {
      await this.deleteProofReference(previousProofToDelete);
    }

    const result = await this.repo.myAdmissionPayment(requester.userId, courseId);

    if (result && result.estado === "pendiente") {
      const u = await this.repo.findUserName(requester.userId);
      const studentName = u ? `${u.nombres} ${u.apellidos}`.trim() : `Usuario #${requester.userId}`;
      void this.notifications.notifyAdminsPaymentPending({
        paymentId: result.id,
        courseId,
        courseTitle: `${course.titulo} · examen de admisión`,
        studentName,
      });
    }

    PaymentService.clearAdminCaches();
    return result;
  }

  async updateStatus(
    requester: AuthContext,
    id: number,
    estado: PaymentStatus,
    observaciones?: string | null
  ) {
    if (requester.role !== "admin") throw forbidden("Solo admin puede actualizar pagos");

    await withTransaction(async (conn) => {
      const userId = await this.repo.findPaymentUser(conn, id);
      if (!userId) throw notFound("Pago no encontrado");

      const affected = await this.repo.updateStatusWithObservaciones(conn, id, estado, observaciones);
      if (affected === 0) throw notFound("Pago no encontrado");

      if (estado === "pagado" || estado === "rechazado" || estado === "reembolsado") {
        const courseItems = await this.repo.listCourseItemsByPaymentId(conn, id);
        for (const { curso_id: courseId, concepto } of courseItems) {
          if (concepto !== "curso") continue;
          const enr = await this.repo.findEnrollmentForUserCourse(conn, userId, courseId);
          if (estado === "pagado") {
            if (!enr) await this.repo.createEnrollmentActivePaid(conn, userId, courseId);
            else await this.repo.updateEnrollmentStatusByUserCourse(conn, userId, courseId, "activa");
          } else {
            const hasAnotherPaidPayment = await this.repo.hasPaidPaymentForUserCourse(
              conn,
              userId,
              courseId
            );
            if (enr && !hasAnotherPaidPayment) {
              await this.repo.updateEnrollmentStatusByUserCourse(conn, userId, courseId, "cancelada");
            }
          }
        }
      }
    });

    const updated = await this.repo.findById(id);
    if (!updated) throw notFound("Pago no encontrado");
    if (estado === "pagado" || estado === "rechazado" || estado === "reembolsado") {
      void this.notifications.notifyStudentPaymentStatus({
        studentId: updated.usuario.id,
        paymentId: updated.id,
        courseTitle: updated.cursos ?? "tu curso",
        estado,
        observaciones: updated.observaciones,
      });
    }
    PaymentService.clearAdminCaches();
    return updated;
  }

  private generateReference(): string {
    const ts = Date.now();
    const rand = crypto.randomBytes(6).toString("hex");
    return `MAN-${ts}-${rand}`.slice(0, 100);
  }

  private resolveProofKey(value: string): string {
    if (!/^https?:\/\//i.test(value)) return value.replace(/^\/+/, "");

    try {
      const keyFromConfiguredBase = extractKeyFromPublicUrl(getS3Config().baseUrl, value);
      if (keyFromConfiguredBase) return keyFromConfiguredBase;
    } catch {
      // Si falta config, dejamos que la descarga falle con el error de S3 correspondiente.
    }

    try {
      const url = new URL(value);
      if (url.hostname.includes("amazonaws.com")) {
        const key = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
        if (key) return key;
      }
    } catch {
      // ignore malformed URL
    }

    throw notFound("Comprobante no encontrado");
  }

  private inferOriginalNameFromKey(key: string): string {
    const fileName = path.basename(key || "comprobante");
    return fileName.replace(/^\d+-[0-9a-fA-F-]{36}-/, "") || "comprobante";
  }

  private async deleteProofReference(value: string): Promise<void> {
    let key: string;
    try {
      key = this.resolveProofKey(value);
    } catch {
      return;
    }
    if (!key.startsWith("payments/proofs/")) return;
    try {
      await this.storage.deleteByKey(key);
    } catch (err) {
      console.warn("No se pudo eliminar comprobante anterior en S3", err);
    }
  }

  private static clearAdminCaches(): void {
    PaymentService.summaryCache.clear();
    PaymentService.revenueCache.clear();
  }
}
