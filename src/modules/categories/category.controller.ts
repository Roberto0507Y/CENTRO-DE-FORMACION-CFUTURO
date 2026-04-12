import type { Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import { CategoryService } from "./category.service";
import type { ListCategoriesQuery } from "./category.types";

export class CategoryController {
  private readonly service = new CategoryService();

  list = async (_req: AuthedRequest, res: Response) => {
    const req = _req;
    const q = req.query as unknown as Partial<ListCategoriesQuery>;
    const wantsAdmin = Boolean(q.all || q.include_counts || q.q || q.estado);

    const categories =
      wantsAdmin && req.auth?.role === "admin"
        ? await this.service.listAdmin(req.auth, {
            q: q.q?.trim() || undefined,
            estado: q.estado,
            include_counts: Boolean(q.include_counts),
            all: Boolean(q.all),
          })
        : await this.service.listPublic();
    res.status(200).json({ ok: true, data: categories });
  };

  getById = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const category =
      req.auth?.role === "admin"
        ? await this.service.getAdminById(req.auth, id)
        : await this.service.getPublicById(id);
    res.status(200).json({ ok: true, data: category });
  };

  create = async (req: AuthedRequest, res: Response) => {
    const category = await this.service.create(req.body);
    res.status(201).json({ ok: true, data: category });
  };

  update = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const category = await this.service.update(id, req.body);
    res.status(200).json({ ok: true, data: category });
  };

  remove = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    await this.service.remove(id);
    res.status(200).json({ ok: true, data: { id } });
  };

  patchStatus = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const { estado } = req.body as { estado: "activo" | "inactivo" };
    const category = await this.service.patchStatus(req.auth!, id, estado);
    res.status(200).json({ ok: true, data: category });
  };
}
