"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseModuleController = void 0;
const courseModule_service_1 = require("./courseModule.service");
class CourseModuleController {
    constructor() {
        this.service = new courseModule_service_1.CourseModuleService();
        this.listByCourse = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const data = await this.service.listByCourse(req.auth ?? null, courseId);
            res.status(200).json({ ok: true, data });
        };
    }
}
exports.CourseModuleController = CourseModuleController;
