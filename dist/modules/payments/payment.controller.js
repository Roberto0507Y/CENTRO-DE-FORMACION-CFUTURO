"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const downloadResponse_1 = require("../../common/utils/downloadResponse");
const payment_service_1 = require("./payment.service");
class PaymentController {
    constructor() {
        this.service = new payment_service_1.PaymentService();
        this.myCoursesPayments = async (req, res) => {
            const data = await this.service.myPaymentsCourses(req.auth);
            res.status(200).json({ ok: true, data });
        };
        this.myCoursePayment = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const data = await this.service.myCoursePayment(req.auth, courseId);
            res.status(200).json({ ok: true, data });
        };
        this.myCoursePaymentHistory = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const data = await this.service.myCoursePaymentHistory(req.auth, courseId);
            res.status(200).json({ ok: true, data });
        };
        this.createManualCoursePayment = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const body = req.body;
            const file = req.file;
            const data = await this.service.createManualCoursePayment(req.auth, courseId, body, file);
            res.status(201).json({ ok: true, data });
        };
        this.list = async (req, res) => {
            const query = req.query;
            const q = {
                limit: Number(query.limit ?? 20),
                offset: Number(query.offset ?? 0),
                estado: query.estado,
                metodo_pago: query.metodo_pago,
                curso_id: query.curso_id ? Number(query.curso_id) : undefined,
                usuario_id: query.usuario_id ? Number(query.usuario_id) : undefined,
                date_from: query.date_from,
                date_to: query.date_to,
            };
            const data = await this.service.list(req.auth, q);
            res.status(200).json({ ok: true, data });
        };
        this.getById = async (req, res) => {
            const id = Number(req.params.id);
            const data = await this.service.getById(req.auth, id);
            res.status(200).json({ ok: true, data });
        };
        this.downloadProof = async (req, res) => {
            const id = Number(req.params.id);
            const file = await this.service.downloadProof(req.auth, id);
            (0, downloadResponse_1.sendDownloadStream)(res, file);
        };
        this.summary = async (req, res) => {
            const data = await this.service.summary(req.auth);
            res.status(200).json({ ok: true, data });
        };
        this.revenue = async (req, res) => {
            const days = Number(req.query.days ?? 30);
            const data = await this.service.revenueByDay(req.auth, days);
            res.status(200).json({ ok: true, data });
        };
        this.updateStatus = async (req, res) => {
            const id = Number(req.params.id);
            const { estado, observaciones } = req.body;
            const data = await this.service.updateStatus(req.auth, id, estado, observaciones);
            res.status(200).json({ ok: true, data });
        };
    }
}
exports.PaymentController = PaymentController;
