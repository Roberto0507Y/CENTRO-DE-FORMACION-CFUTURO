"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryController = void 0;
const category_service_1 = require("./category.service");
class CategoryController {
    constructor() {
        this.service = new category_service_1.CategoryService();
        this.list = async (_req, res) => {
            const req = _req;
            const q = req.query;
            const wantsAdmin = Boolean(q.all || q.include_counts || q.q || q.estado);
            const categories = wantsAdmin && req.auth?.role === "admin"
                ? await this.service.listAdmin(req.auth, {
                    q: q.q?.trim() || undefined,
                    estado: q.estado,
                    include_counts: Boolean(q.include_counts),
                    all: Boolean(q.all),
                })
                : await this.service.listPublic();
            res.status(200).json({ ok: true, data: categories });
        };
        this.getById = async (req, res) => {
            const id = Number(req.params.id);
            const category = req.auth?.role === "admin"
                ? await this.service.getAdminById(req.auth, id)
                : await this.service.getPublicById(id);
            res.status(200).json({ ok: true, data: category });
        };
        this.create = async (req, res) => {
            const category = await this.service.create(req.body);
            res.status(201).json({ ok: true, data: category });
        };
        this.update = async (req, res) => {
            const id = Number(req.params.id);
            const category = await this.service.update(id, req.body);
            res.status(200).json({ ok: true, data: category });
        };
        this.remove = async (req, res) => {
            const id = Number(req.params.id);
            await this.service.remove(id);
            res.status(200).json({ ok: true, data: { id } });
        };
        this.patchStatus = async (req, res) => {
            const id = Number(req.params.id);
            const { estado } = req.body;
            const category = await this.service.patchStatus(req.auth, id, estado);
            res.status(200).json({ ok: true, data: category });
        };
    }
}
exports.CategoryController = CategoryController;
