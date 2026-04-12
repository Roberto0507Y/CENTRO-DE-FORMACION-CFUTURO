import type { Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import { sendDownloadStream } from "../../common/utils/downloadResponse";
import { PaymentService } from "./payment.service";
import type {
  ListPaymentsQuery,
  ManualCoursePaymentInput,
  MyCoursePayment,
  PaymentMethod,
  PaymentStatus,
} from "./payment.types";

type UploadRequest = AuthedRequest & { file?: Express.Multer.File };

export class PaymentController {
  private readonly service = new PaymentService();

  myCoursesPayments = async (req: AuthedRequest, res: Response) => {
    const data = await this.service.myPaymentsCourses(req.auth!);
    res.status(200).json({ ok: true, data });
  };

  myCoursePayment = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const data: MyCoursePayment = await this.service.myCoursePayment(req.auth!, courseId);
    res.status(200).json({ ok: true, data });
  };

  myCoursePaymentHistory = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const data = await this.service.myCoursePaymentHistory(req.auth!, courseId);
    res.status(200).json({ ok: true, data });
  };

  createManualCoursePayment = async (req: UploadRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const body = req.body as ManualCoursePaymentInput;
    const file = req.file!;
    const data = await this.service.createManualCoursePayment(req.auth!, courseId, body, file);
    res.status(201).json({ ok: true, data });
  };

  list = async (req: AuthedRequest, res: Response) => {
    const query = req.query as unknown as Partial<ListPaymentsQuery> & {
      estado?: PaymentStatus;
      metodo_pago?: PaymentMethod;
    };
    const q: ListPaymentsQuery = {
      limit: Number(query.limit ?? 20),
      offset: Number(query.offset ?? 0),
      estado: query.estado,
      metodo_pago: query.metodo_pago,
      curso_id: query.curso_id ? Number(query.curso_id) : undefined,
      usuario_id: query.usuario_id ? Number(query.usuario_id) : undefined,
      date_from: query.date_from,
      date_to: query.date_to,
    };
    const data = await this.service.list(req.auth!, q);
    res.status(200).json({ ok: true, data });
  };

  getById = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const data = await this.service.getById(req.auth!, id);
    res.status(200).json({ ok: true, data });
  };

  downloadProof = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const file = await this.service.downloadProof(req.auth!, id);
    sendDownloadStream(res, file);
  };

  summary = async (req: AuthedRequest, res: Response) => {
    const data = await this.service.summary(req.auth!);
    res.status(200).json({ ok: true, data });
  };

  revenue = async (req: AuthedRequest, res: Response) => {
    const days = Number(req.query.days ?? 30);
    const data = await this.service.revenueByDay(req.auth!, days);
    res.status(200).json({ ok: true, data });
  };

  updateStatus = async (req: AuthedRequest, res: Response) => {
    const id = Number(req.params.id);
    const { estado, observaciones } = req.body as { estado: PaymentStatus; observaciones?: string | null };
    const data = await this.service.updateStatus(req.auth!, id, estado, observaciones);
    res.status(200).json({ ok: true, data });
  };
}
