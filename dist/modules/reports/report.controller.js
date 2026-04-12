"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportController = void 0;
const report_service_1 = require("./report.service");
class ReportController {
    constructor() {
        this.service = new report_service_1.ReportService();
        this.zone = async (req, res) => {
            const courseId = Number(req.query.course_id);
            const data = await this.service.zone(req.auth, courseId);
            res.status(200).json({ ok: true, data });
        };
    }
}
exports.ReportController = ReportController;
