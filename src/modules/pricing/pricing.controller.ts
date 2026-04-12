import type { Request, Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import { PricingService } from "./pricing.service";
import type { PricingStatus } from "./pricing.types";

export class PricingController {
  private readonly service = new PricingService();

  list = async (req: Request, res: Response) => {
    const estadoRaw = (req.query as Record<string, unknown>)["estado"];
    const estado = estadoRaw === "activo" || estadoRaw === "inactivo" ? (estadoRaw as PricingStatus) : undefined;
    const items = await this.service.list(estado);
    res.status(200).json({ ok: true, data: items });
  };

  getById = async (req: Request, res: Response) => {
    const id = Number((req.params as Record<string, string>).id);
    const item = await this.service.getById(id);
    res.status(200).json({ ok: true, data: item });
  };

  create = async (req: AuthedRequest, res: Response) => {
    const created = await this.service.create(req.body as { precio: number; payment_link: string });
    res.status(201).json({ ok: true, data: created });
  };

  update = async (req: AuthedRequest, res: Response) => {
    const id = Number((req.params as Record<string, string>).id);
    const updated = await this.service.update(id, req.body as { precio?: number; payment_link?: string; estado?: PricingStatus });
    res.status(200).json({ ok: true, data: updated });
  };

  patchStatus = async (req: AuthedRequest, res: Response) => {
    const id = Number((req.params as Record<string, string>).id);
    const updated = await this.service.patchStatus(id, (req.body as { estado: PricingStatus }).estado);
    res.status(200).json({ ok: true, data: updated });
  };
}
