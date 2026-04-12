"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradebookController = void 0;
const gradebook_service_1 = require("./gradebook.service");
class GradebookController {
    constructor() {
        this.service = new gradebook_service_1.GradebookService();
        this.myCourse = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const data = await this.service.getMyCourseGradebook(req.auth, courseId);
            res.status(200).json({ ok: true, data });
        };
    }
}
exports.GradebookController = GradebookController;
