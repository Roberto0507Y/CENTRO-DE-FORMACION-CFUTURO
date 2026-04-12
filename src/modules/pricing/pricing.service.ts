import { conflict, notFound } from "../../common/errors/httpErrors";
import { PricingRepository } from "./pricing.repository";
import type { CreatePricingInput, PricingSetting, PricingStatus, UpdatePricingInput } from "./pricing.types";

function baseNombreFromPrecio(precio: number): string {
  const normalized = Number.isFinite(precio) ? precio : 0;
  return `Q${normalized.toFixed(2)}`;
}

export class PricingService {
  private readonly repo = new PricingRepository();

  async list(estado: PricingStatus | undefined): Promise<PricingSetting[]> {
    return this.repo.list(estado);
  }

  async getById(id: number): Promise<PricingSetting> {
    const item = await this.repo.findById(id);
    if (!item) throw notFound("Precio no encontrado");
    return item;
  }

  async create(input: CreatePricingInput): Promise<PricingSetting> {
    const precio = input.precio;
    const link = input.payment_link.trim();

    // Genera nombre único basado en precio
    const base = baseNombreFromPrecio(precio);
    let nombre = base;
    for (let i = 0; i < 10; i += 1) {
      const exists = await this.repo.findByNombre(nombre);
      if (!exists) break;
      nombre = `${base}-${i + 2}`;
    }

    const still = await this.repo.findByNombre(nombre);
    if (still) throw conflict("No se pudo generar un nombre único para este precio");

    const id = await this.repo.create({ nombre, precio, payment_link: link });
    const created = await this.repo.findById(id);
    if (!created) throw new Error("No se pudo crear el precio");
    return created;
  }

  async update(id: number, input: UpdatePricingInput): Promise<PricingSetting> {
    const existing = await this.repo.findById(id);
    if (!existing) throw notFound("Precio no encontrado");

    const patch: Partial<{ nombre: string; precio: number; payment_link: string; estado: PricingStatus }> = {};

    if (input.precio !== undefined) {
      patch.precio = input.precio;
      // Recalcular nombre (único) si cambió el precio
      const base = baseNombreFromPrecio(input.precio);
      let nombre = base;
      for (let i = 0; i < 10; i += 1) {
        const byName = await this.repo.findByNombre(nombre);
        if (!byName || byName.id === id) break;
        nombre = `${base}-${i + 2}`;
      }
      const byName = await this.repo.findByNombre(nombre);
      if (byName && byName.id !== id) throw conflict("Ya existe un precio con ese nombre");
      patch.nombre = nombre;
    }

    if (input.payment_link !== undefined) patch.payment_link = input.payment_link.trim();
    if (input.estado !== undefined) patch.estado = input.estado;

    const ok = await this.repo.updateById(id, patch);
    if (!ok) throw notFound("Precio no encontrado");
    const updated = await this.repo.findById(id);
    if (!updated) throw notFound("Precio no encontrado");
    return updated;
  }

  async patchStatus(id: number, estado: PricingStatus): Promise<PricingSetting> {
    const ok = await this.repo.updateStatusById(id, estado);
    if (!ok) throw notFound("Precio no encontrado");
    const updated = await this.repo.findById(id);
    if (!updated) throw notFound("Precio no encontrado");
    return updated;
  }
}

