import type { Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import { CourseService } from "./course.service";

export class CourseController {
  private readonly service = new CourseService();

  list = async (req: AuthedRequest, res: Response) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const filters = {
      categoria_id: req.query.categoria_id as unknown as number | undefined,
      tipo_acceso: req.query.tipo_acceso as "gratis" | "pago" | undefined,
      nivel: req.query.nivel as "basico" | "intermedio" | "avanzado" | undefined,
      docente_id: req.query.docente_id as unknown as number | undefined,
      search: req.query.search as string | undefined,
    };
    const result = await this.service.listPublic(filters, { page, limit });
    res.status(200).json({ ok: true, data: result });
  };

  getById = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const course = await this.service.getPublicById(id, req.auth);
    res.status(200).json({ ok: true, data: course });
  };

  getBySlug = async (req: AuthedRequest, res: Response) => {
    const slug = String(req.params.slug);
    const course = await this.service.getPublicBySlug(slug);
    res.status(200).json({ ok: true, data: course });
  };

  create = async (req: AuthedRequest, res: Response) => {
    const course = await this.service.create(req.auth!, req.body);
    res.status(201).json({ ok: true, data: course });
  };

  update = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const course = await this.service.update(req.auth!, id, req.body);
    res.status(200).json({ ok: true, data: course });
  };

  remove = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    await this.service.remove(req.auth!, id);
    res.status(200).json({ ok: true, data: { id } });
  };

  myTeaching = async (req: AuthedRequest, res: Response) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const docenteId = req.query.docente_id === undefined ? null : Number(req.query.docente_id);
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const result = await this.service.listTeaching(req.auth!, docenteId, { page, limit }, search);
    res.status(200).json({ ok: true, data: result });
  };

  myEnrolled = async (req: AuthedRequest, res: Response) => {
    const items = await this.service.listEnrolled(req.auth!);
    res.status(200).json({ ok: true, data: items });
  };
}
