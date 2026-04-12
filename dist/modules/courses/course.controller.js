"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseController = void 0;
const course_service_1 = require("./course.service");
class CourseController {
    constructor() {
        this.service = new course_service_1.CourseService();
        this.list = async (req, res) => {
            const page = Number(req.query.page ?? 1);
            const limit = Number(req.query.limit ?? 20);
            const filters = {
                categoria_id: req.query.categoria_id,
                tipo_acceso: req.query.tipo_acceso,
                nivel: req.query.nivel,
                docente_id: req.query.docente_id,
                search: req.query.search,
            };
            const result = await this.service.listPublic(filters, { page, limit });
            res.status(200).json({ ok: true, data: result });
        };
        this.getById = async (req, res) => {
            const id = Number(req.params.id);
            const course = await this.service.getPublicById(id, req.auth);
            res.status(200).json({ ok: true, data: course });
        };
        this.getBySlug = async (req, res) => {
            const slug = String(req.params.slug);
            const course = await this.service.getPublicBySlug(slug);
            res.status(200).json({ ok: true, data: course });
        };
        this.create = async (req, res) => {
            const course = await this.service.create(req.auth, req.body);
            res.status(201).json({ ok: true, data: course });
        };
        this.update = async (req, res) => {
            const id = Number(req.params.id);
            const course = await this.service.update(req.auth, id, req.body);
            res.status(200).json({ ok: true, data: course });
        };
        this.remove = async (req, res) => {
            const id = Number(req.params.id);
            await this.service.remove(req.auth, id);
            res.status(200).json({ ok: true, data: { id } });
        };
        this.myTeaching = async (req, res) => {
            const page = Number(req.query.page ?? 1);
            const limit = Number(req.query.limit ?? 20);
            const docenteId = req.query.docente_id === undefined ? null : Number(req.query.docente_id);
            const search = typeof req.query.search === "string" ? req.query.search : undefined;
            const result = await this.service.listTeaching(req.auth, docenteId, { page, limit }, search);
            res.status(200).json({ ok: true, data: result });
        };
        this.myEnrolled = async (req, res) => {
            const items = await this.service.listEnrolled(req.auth);
            res.status(200).json({ ok: true, data: items });
        };
    }
}
exports.CourseController = CourseController;
