"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceController = void 0;
const attendance_service_1 = require("./attendance.service");
class AttendanceController {
    constructor() {
        this.service = new attendance_service_1.AttendanceService();
        this.list = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const date = typeof req.query.date === "string" ? req.query.date : undefined;
            const data = await this.service.list(req.auth, courseId, date);
            res.status(200).json({ ok: true, data });
        };
        this.upsert = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const { date, items } = req.body;
            const data = await this.service.upsert(req.auth, courseId, date, items);
            res.status(200).json({ ok: true, data });
        };
    }
}
exports.AttendanceController = AttendanceController;
