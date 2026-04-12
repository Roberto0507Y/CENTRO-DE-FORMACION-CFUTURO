"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_service_1 = require("./user.service");
class UserController {
    constructor() {
        this.service = new user_service_1.UserService();
        this.getById = async (req, res) => {
            const id = Number(req.params.id);
            const user = await this.service.getById(req.auth, id);
            res.status(200).json({ ok: true, data: user });
        };
        this.list = async (req, res) => {
            const limit = Number(req.query.limit ?? 20);
            const offset = Number(req.query.offset ?? 0);
            const search = typeof req.query.search === "string" ? req.query.search : undefined;
            const result = await this.service.list(req.auth, { limit, offset, search });
            res.status(200).json({ ok: true, data: { ...result, limit, offset } });
        };
        this.update = async (req, res) => {
            const id = Number(req.params.id);
            const user = await this.service.update(req.auth, id, req.body);
            res.status(200).json({ ok: true, data: user });
        };
        this.delete = async (req, res) => {
            const id = Number(req.params.id);
            const result = await this.service.delete(req.auth, id);
            res.status(200).json({ ok: true, data: result });
        };
    }
}
exports.UserController = UserController;
