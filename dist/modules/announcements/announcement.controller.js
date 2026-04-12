"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementController = void 0;
const httpErrors_1 = require("../../common/errors/httpErrors");
const announcement_service_1 = require("./announcement.service");
class AnnouncementController {
    constructor() {
        this.service = new announcement_service_1.AnnouncementService();
        this.list = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const data = await this.service.list(req.auth, courseId);
            res.status(200).json({ ok: true, data });
        };
        this.getById = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const id = Number(req.params.id);
            const data = await this.service.getById(req.auth, courseId, id);
            res.status(200).json({ ok: true, data });
        };
        this.create = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const file = req.file;
            const body = req.body;
            if (!body.titulo || !body.mensaje) {
                // should be validated by zod, but keep safe
                throw (0, httpErrors_1.badRequest)("Debe enviar título y mensaje");
            }
            const data = await this.service.create(req.auth, courseId, body, file);
            res.status(201).json({ ok: true, data });
        };
        this.update = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const id = Number(req.params.id);
            const file = req.file;
            const body = req.body;
            const data = await this.service.update(req.auth, courseId, id, body, file);
            res.status(200).json({ ok: true, data });
        };
        this.patchStatus = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const id = Number(req.params.id);
            const { estado } = req.body;
            const data = await this.service.patchStatus(req.auth, courseId, id, estado);
            res.status(200).json({ ok: true, data });
        };
    }
}
exports.AnnouncementController = AnnouncementController;
