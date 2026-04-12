"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const httpErrors_1 = require("../../common/errors/httpErrors");
const file_util_1 = require("../../common/utils/file.util");
const db_1 = require("../../config/db");
const s3_1 = require("../../config/s3");
const payment_repository_1 = require("./payment.repository");
const storage_service_1 = require("../../common/services/storage.service");
const notification_service_1 = require("../notifications/notification.service");
class PaymentService {
    constructor() {
        this.repo = new payment_repository_1.PaymentRepository();
        this.storage = new storage_service_1.StorageService();
        this.notifications = new notification_service_1.NotificationService();
    }
    async list(requester, q) {
        if (requester.role !== "admin")
            throw (0, httpErrors_1.forbidden)("Solo admin puede ver pagos");
        const { items, total } = await this.repo.list(q);
        return { items, total, limit: q.limit, offset: q.offset };
    }
    async getById(requester, id) {
        if (requester.role !== "admin")
            throw (0, httpErrors_1.forbidden)("Solo admin puede ver pagos");
        const payment = await this.repo.findById(id);
        if (!payment)
            throw (0, httpErrors_1.notFound)("Pago no encontrado");
        return payment;
    }
    async downloadProof(requester, id) {
        const proof = await this.repo.findProofById(id);
        if (!proof)
            throw (0, httpErrors_1.notFound)("Pago no encontrado");
        if (requester.role !== "admin" && proof.usuario_id !== requester.userId) {
            throw (0, httpErrors_1.forbidden)("No autorizado");
        }
        if (!proof.comprobante_url)
            throw (0, httpErrors_1.notFound)("Comprobante no encontrado");
        const key = this.resolveProofKey(proof.comprobante_url);
        return this.storage.createDownloadStream({
            key,
            originalName: this.inferOriginalNameFromKey(key),
            contentType: null,
        });
    }
    async summary(requester) {
        if (requester.role !== "admin")
            throw (0, httpErrors_1.forbidden)("Solo admin puede ver pagos");
        return this.repo.summary();
    }
    async revenueByDay(requester, days) {
        if (requester.role !== "admin")
            throw (0, httpErrors_1.forbidden)("Solo admin puede ver pagos");
        return this.repo.revenueByDay(days);
    }
    async myCoursePayment(requester, courseId) {
        return this.repo.myCoursePayment(requester.userId, courseId);
    }
    async myPaymentsCourses(requester) {
        return this.repo.myPaymentsCourses(requester.userId);
    }
    async myCoursePaymentHistory(requester, courseId) {
        return this.repo.myCoursePaymentHistory(requester.userId, courseId);
    }
    async createManualCoursePayment(requester, courseId, input, file) {
        const course = await this.repo.findCourseForManualPayment(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        if (course.estado !== "publicado")
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        if (course.tipo_acceso !== "pago")
            throw (0, httpErrors_1.badRequest)("Este curso no es de pago");
        const monto = String(course.precio);
        const moneda = "GTQ";
        const metodo = input.metodo_pago ?? "manual";
        const uploaded = await this.storage.uploadBuffer({
            module: "payments",
            keyPrefix: `payments/proofs/user-${requester.userId}/course-${courseId}`,
            originalName: file.originalname,
            buffer: file.buffer,
            mimeType: file.mimetype,
            allowed: storage_service_1.ALLOWED_PAYMENT_PROOFS,
        });
        let previousProofToDelete = null;
        try {
            await (0, db_1.withTransaction)(async (conn) => {
                const existingEnr = await this.repo.findEnrollmentForUserCourse(conn, requester.userId, courseId);
                if (existingEnr?.estado === "activa")
                    throw (0, httpErrors_1.conflict)("Ya tienes acceso a este curso");
                const pendingPaymentId = await this.repo.findPendingPaymentIdForUserCourse(conn, requester.userId, courseId);
                if (pendingPaymentId) {
                    previousProofToDelete = await this.repo.updatePendingPaymentProof(conn, pendingPaymentId, metodo, uploaded.key);
                }
                else {
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
                }
                else if (existingEnr.estado !== "pendiente" || existingEnr.tipo_inscripcion !== "pagada") {
                    await this.repo.updateEnrollmentToPendingPaid(conn, existingEnr.id);
                }
            });
        }
        catch (err) {
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
        return result;
    }
    async updateStatus(requester, id, estado, observaciones) {
        if (requester.role !== "admin")
            throw (0, httpErrors_1.forbidden)("Solo admin puede actualizar pagos");
        await (0, db_1.withTransaction)(async (conn) => {
            const userId = await this.repo.findPaymentUser(conn, id);
            if (!userId)
                throw (0, httpErrors_1.notFound)("Pago no encontrado");
            const affected = await this.repo.updateStatusWithObservaciones(conn, id, estado, observaciones);
            if (affected === 0)
                throw (0, httpErrors_1.notFound)("Pago no encontrado");
            if (estado === "pagado" || estado === "rechazado" || estado === "reembolsado") {
                const courseIds = await this.repo.listCourseIdsByPaymentId(conn, id);
                for (const courseId of courseIds) {
                    const enr = await this.repo.findEnrollmentForUserCourse(conn, userId, courseId);
                    if (estado === "pagado") {
                        if (!enr)
                            await this.repo.createEnrollmentActivePaid(conn, userId, courseId);
                        else
                            await this.repo.updateEnrollmentStatusByUserCourse(conn, userId, courseId, "activa");
                    }
                    else {
                        const hasAnotherPaidPayment = await this.repo.hasPaidPaymentForUserCourse(conn, userId, courseId);
                        if (enr && !hasAnotherPaidPayment) {
                            await this.repo.updateEnrollmentStatusByUserCourse(conn, userId, courseId, "cancelada");
                        }
                    }
                }
            }
        });
        const updated = await this.repo.findById(id);
        if (!updated)
            throw (0, httpErrors_1.notFound)("Pago no encontrado");
        if (estado === "pagado" || estado === "rechazado" || estado === "reembolsado") {
            void this.notifications.notifyStudentPaymentStatus({
                studentId: updated.usuario.id,
                paymentId: updated.id,
                courseTitle: updated.cursos ?? "tu curso",
                estado,
                observaciones: updated.observaciones,
            });
        }
        return updated;
    }
    generateReference() {
        const ts = Date.now();
        const rand = crypto_1.default.randomBytes(6).toString("hex");
        return `MAN-${ts}-${rand}`.slice(0, 100);
    }
    resolveProofKey(value) {
        if (!/^https?:\/\//i.test(value))
            return value.replace(/^\/+/, "");
        try {
            const keyFromConfiguredBase = (0, file_util_1.extractKeyFromPublicUrl)((0, s3_1.getS3Config)().baseUrl, value);
            if (keyFromConfiguredBase)
                return keyFromConfiguredBase;
        }
        catch {
            // Si falta config, dejamos que la descarga falle con el error de S3 correspondiente.
        }
        try {
            const url = new URL(value);
            if (url.hostname.includes("amazonaws.com")) {
                const key = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
                if (key)
                    return key;
            }
        }
        catch {
            // ignore malformed URL
        }
        throw (0, httpErrors_1.notFound)("Comprobante no encontrado");
    }
    inferOriginalNameFromKey(key) {
        const fileName = path_1.default.basename(key || "comprobante");
        return fileName.replace(/^\d+-[0-9a-fA-F-]{36}-/, "") || "comprobante";
    }
    async deleteProofReference(value) {
        let key;
        try {
            key = this.resolveProofKey(value);
        }
        catch {
            return;
        }
        if (!key.startsWith("payments/proofs/"))
            return;
        try {
            await this.storage.deleteByKey(key);
        }
        catch (err) {
            console.warn("No se pudo eliminar comprobante anterior en S3", err);
        }
    }
}
exports.PaymentService = PaymentService;
