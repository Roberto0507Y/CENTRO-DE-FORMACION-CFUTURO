"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadsController = void 0;
const uploads_service_1 = require("./uploads.service");
class UploadsController {
    constructor() {
        this.service = new uploads_service_1.UploadsService();
        this.uploadCourseImage = async (req, res) => {
            const file = req.file;
            const uploaded = await this.service.uploadCourseImage(req.auth, file);
            res.status(201).json({ ok: true, data: uploaded });
        };
        this.uploadCategoryImage = async (req, res) => {
            const file = req.file;
            const uploaded = await this.service.uploadCategoryImage(req.auth, file);
            res.status(201).json({ ok: true, data: uploaded });
        };
        this.uploadAvatar = async (req, res) => {
            const file = req.file;
            const uploaded = await this.service.uploadAvatar(req.auth, file);
            res.status(201).json({ ok: true, data: uploaded });
        };
    }
}
exports.UploadsController = UploadsController;
