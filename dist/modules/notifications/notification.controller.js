"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const notification_service_1 = require("./notification.service");
class NotificationController {
    constructor() {
        this.service = new notification_service_1.NotificationService();
        this.listMy = async (req, res) => {
            const q = req.query;
            const limit = Number(q.limit ?? 20);
            const offset = Number(q.offset ?? 0);
            const unread = String(q.unread ?? "") === "1";
            const data = await this.service.listMy(req.auth, { limit, offset, unread: q.unread !== undefined ? unread : undefined });
            res.status(200).json({ ok: true, data });
        };
        this.markRead = async (req, res) => {
            const id = Number(req.params.id);
            await this.service.markRead(req.auth, id);
            res.status(200).json({ ok: true, data: { ok: true } });
        };
        this.markAllRead = async (req, res) => {
            const data = await this.service.markAllRead(req.auth);
            res.status(200).json({ ok: true, data });
        };
        this.remove = async (req, res) => {
            const id = Number(req.params.id);
            await this.service.deleteMy(req.auth, id);
            res.status(200).json({ ok: true, data: { ok: true } });
        };
    }
}
exports.NotificationController = NotificationController;
