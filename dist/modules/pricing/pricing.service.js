"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingService = void 0;
const httpErrors_1 = require("../../common/errors/httpErrors");
const pricing_repository_1 = require("./pricing.repository");
function baseNombreFromPrecio(precio) {
    const normalized = Number.isFinite(precio) ? precio : 0;
    return `Q${normalized.toFixed(2)}`;
}
class PricingService {
    constructor() {
        this.repo = new pricing_repository_1.PricingRepository();
    }
    async list(estado) {
        return this.repo.list(estado);
    }
    async getById(id) {
        const item = await this.repo.findById(id);
        if (!item)
            throw (0, httpErrors_1.notFound)("Precio no encontrado");
        return item;
    }
    async create(input) {
        const precio = input.precio;
        const link = input.payment_link.trim();
        // Genera nombre único basado en precio
        const base = baseNombreFromPrecio(precio);
        let nombre = base;
        for (let i = 0; i < 10; i += 1) {
            const exists = await this.repo.findByNombre(nombre);
            if (!exists)
                break;
            nombre = `${base}-${i + 2}`;
        }
        const still = await this.repo.findByNombre(nombre);
        if (still)
            throw (0, httpErrors_1.conflict)("No se pudo generar un nombre único para este precio");
        const id = await this.repo.create({ nombre, precio, payment_link: link });
        const created = await this.repo.findById(id);
        if (!created)
            throw new Error("No se pudo crear el precio");
        return created;
    }
    async update(id, input) {
        const existing = await this.repo.findById(id);
        if (!existing)
            throw (0, httpErrors_1.notFound)("Precio no encontrado");
        const patch = {};
        if (input.precio !== undefined) {
            patch.precio = input.precio;
            // Recalcular nombre (único) si cambió el precio
            const base = baseNombreFromPrecio(input.precio);
            let nombre = base;
            for (let i = 0; i < 10; i += 1) {
                const byName = await this.repo.findByNombre(nombre);
                if (!byName || byName.id === id)
                    break;
                nombre = `${base}-${i + 2}`;
            }
            const byName = await this.repo.findByNombre(nombre);
            if (byName && byName.id !== id)
                throw (0, httpErrors_1.conflict)("Ya existe un precio con ese nombre");
            patch.nombre = nombre;
        }
        if (input.payment_link !== undefined)
            patch.payment_link = input.payment_link.trim();
        if (input.estado !== undefined)
            patch.estado = input.estado;
        const ok = await this.repo.updateById(id, patch);
        if (!ok)
            throw (0, httpErrors_1.notFound)("Precio no encontrado");
        const updated = await this.repo.findById(id);
        if (!updated)
            throw (0, httpErrors_1.notFound)("Precio no encontrado");
        return updated;
    }
    async patchStatus(id, estado) {
        const ok = await this.repo.updateStatusById(id, estado);
        if (!ok)
            throw (0, httpErrors_1.notFound)("Precio no encontrado");
        const updated = await this.repo.findById(id);
        if (!updated)
            throw (0, httpErrors_1.notFound)("Precio no encontrado");
        return updated;
    }
}
exports.PricingService = PricingService;
