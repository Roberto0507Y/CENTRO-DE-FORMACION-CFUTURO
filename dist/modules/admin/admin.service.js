"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const httpErrors_1 = require("../../common/errors/httpErrors");
const admin_repository_1 = require("./admin.repository");
class AdminService {
    constructor() {
        this.repo = new admin_repository_1.AdminRepository();
    }
    async metrics(requester) {
        if (requester.role !== "admin")
            throw (0, httpErrors_1.forbidden)("Solo admin puede ver métricas");
        return this.repo.metrics();
    }
}
exports.AdminService = AdminService;
