"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialController = void 0;
const material_service_1 = require("./material.service");
class MaterialController {
    constructor() {
        this.service = new material_service_1.MaterialService();
        this.list = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const items = await this.service.list(req.auth, courseId);
            res.status(200).json({ ok: true, data: items });
        };
        this.create = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const body = req.body;
            const created = await this.service.create(req.auth, courseId, body, req.file);
            res.status(201).json({ ok: true, data: created });
        };
        this.update = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const id = Number(req.params.id);
            const body = req.body;
            const updated = await this.service.update(req.auth, courseId, id, body, req.file);
            res.status(200).json({ ok: true, data: updated });
        };
        this.patchStatus = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const id = Number(req.params.id);
            const body = req.body;
            await this.service.patchStatus(req.auth, courseId, id, body.estado);
            res.status(200).json({ ok: true });
        };
    }
}
exports.MaterialController = MaterialController;
