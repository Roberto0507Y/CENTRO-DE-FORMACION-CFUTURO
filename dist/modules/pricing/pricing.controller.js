"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingController = void 0;
const pricing_service_1 = require("./pricing.service");
class PricingController {
    constructor() {
        this.service = new pricing_service_1.PricingService();
        this.list = async (req, res) => {
            const estadoRaw = req.query["estado"];
            const estado = estadoRaw === "activo" || estadoRaw === "inactivo" ? estadoRaw : undefined;
            const items = await this.service.list(estado);
            res.status(200).json({ ok: true, data: items });
        };
        this.getById = async (req, res) => {
            const id = Number(req.params.id);
            const item = await this.service.getById(id);
            res.status(200).json({ ok: true, data: item });
        };
        this.create = async (req, res) => {
            const created = await this.service.create(req.body);
            res.status(201).json({ ok: true, data: created });
        };
        this.update = async (req, res) => {
            const id = Number(req.params.id);
            const updated = await this.service.update(id, req.body);
            res.status(200).json({ ok: true, data: updated });
        };
        this.patchStatus = async (req, res) => {
            const id = Number(req.params.id);
            const updated = await this.service.patchStatus(id, req.body.estado);
            res.status(200).json({ ok: true, data: updated });
        };
    }
}
exports.PricingController = PricingController;
