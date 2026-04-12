"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const admin_service_1 = require("./admin.service");
class AdminController {
    constructor() {
        this.service = new admin_service_1.AdminService();
        this.metrics = async (req, res) => {
            const data = await this.service.metrics(req.auth);
            res.status(200).json({ ok: true, data });
        };
    }
}
exports.AdminController = AdminController;
