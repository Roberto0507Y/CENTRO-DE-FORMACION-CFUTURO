"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const db_1 = require("../../config/db");
const admin_service_1 = require("./admin.service");
class AdminController {
    constructor() {
        this.service = new admin_service_1.AdminService();
        this.metrics = async (req, res) => {
            const data = await this.service.metrics(req.auth);
            res.status(200).json({ ok: true, data });
        };
        this.dbHealth = async (_req, res) => {
            await (0, db_1.pingDb)();
            res.setHeader("Cache-Control", "no-store");
            res.status(200).json({ ok: true, db: "up" });
        };
    }
}
exports.AdminController = AdminController;
