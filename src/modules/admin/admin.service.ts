import { forbidden } from "../../common/errors/httpErrors";
import type { AuthContext } from "../../common/types/express";
import { AdminRepository } from "./admin.repository";
import type { AdminMetrics } from "./admin.types";

export class AdminService {
  private readonly repo = new AdminRepository();

  async metrics(requester: AuthContext): Promise<AdminMetrics> {
    if (requester.role !== "admin") throw forbidden("Solo admin puede ver métricas");
    return this.repo.metrics();
  }
}

