"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrollmentController = void 0;
const enrollment_service_1 = require("./enrollment.service");
class EnrollmentController {
    constructor() {
        this.service = new enrollment_service_1.EnrollmentService();
        this.enrollFree = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const data = await this.service.enrollFree(req.auth, courseId);
            res.status(201).json({ ok: true, data });
        };
        this.confirmPaid = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const data = await this.service.confirmPaid(req.auth, courseId);
            res.status(201).json({ ok: true, data });
        };
        this.myCourses = async (req, res) => {
            const items = await this.service.myCourses(req.auth);
            res.status(200).json({ ok: true, data: items });
        };
        this.checkAccess = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const data = await this.service.checkAccess(req.auth, courseId);
            res.status(200).json({ ok: true, data });
        };
        this.courseStudents = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const items = await this.service.courseStudents(req.auth, courseId);
            res.status(200).json({ ok: true, data: items });
        };
        this.updateProgress = async (req, res) => {
            const id = Number(req.params.id);
            await this.service.updateProgress(req.auth, id, req.body.progreso);
            res.status(200).json({ ok: true, data: { id } });
        };
        this.cancel = async (req, res) => {
            const id = Number(req.params.id);
            await this.service.cancel(req.auth, id);
            res.status(200).json({ ok: true, data: { id } });
        };
    }
}
exports.EnrollmentController = EnrollmentController;
