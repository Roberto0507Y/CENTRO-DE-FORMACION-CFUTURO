"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LessonController = void 0;
const lesson_service_1 = require("./lesson.service");
class LessonController {
    constructor() {
        this.service = new lesson_service_1.LessonService();
        this.listByModule = async (req, res) => {
            const moduleId = Number(req.params.moduleId);
            const items = await this.service.listByModule(moduleId, req.auth);
            res.status(200).json({ ok: true, data: items });
        };
        this.getById = async (req, res) => {
            const id = Number(req.params.id);
            const lesson = await this.service.getById(id, req.auth);
            res.status(200).json({ ok: true, data: lesson });
        };
        this.create = async (req, res) => {
            const lesson = await this.service.create(req.auth, req.body, req.file);
            res.status(201).json({ ok: true, data: lesson });
        };
        this.update = async (req, res) => {
            const id = Number(req.params.id);
            const lesson = await this.service.update(req.auth, id, req.body, req.file);
            res.status(200).json({ ok: true, data: lesson });
        };
        this.remove = async (req, res) => {
            const id = Number(req.params.id);
            await this.service.remove(req.auth, id);
            res.status(200).json({ ok: true, data: { id } });
        };
        this.complete = async (req, res) => {
            const id = Number(req.params.id);
            await this.service.complete(req.auth, id);
            res.status(200).json({ ok: true, data: { id, completed: true } });
        };
    }
}
exports.LessonController = LessonController;
