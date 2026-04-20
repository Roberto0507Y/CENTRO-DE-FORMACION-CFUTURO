import { forbidden } from "../../common/errors/httpErrors";
import type { AuthContext } from "../../common/types/express";
import { TtlCache } from "../../common/utils/ttlCache";
import { AdminRepository } from "./admin.repository";
import type { AdminMetrics } from "./admin.types";

export class AdminService {
  private static readonly metricsCache = new TtlCache<"metrics", AdminMetrics>({
    ttlMs: 10_000,
    maxEntries: 1,
  });

  private readonly repo = new AdminRepository();

  async metrics(requester: AuthContext): Promise<AdminMetrics> {
    if (requester.role !== "admin") throw forbidden("Solo admin puede ver métricas");
    return AdminService.metricsCache.getOrSet("metrics", () => this.repo.metrics());
  }
}
