import { Router } from "express";
import type { NextFunction, Response } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { forbidden } from "../../common/errors/httpErrors";
import type { AuthedRequest } from "../../common/types/express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { UserController } from "./user.controller";
import { listUsersQuerySchema, updateUserBodySchema, userIdParamsSchema } from "./user.schema";

const router = Router();
const controller = new UserController();

function requireSelfOrAdmin(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const requestedId = Number(req.params.id);
  if (req.auth?.role === "admin" || req.auth?.userId === requestedId) {
    next();
    return;
  }
  next(forbidden("No autorizado"));
}

router.use(authMiddleware);

router.get(
  "/",
  requireRole("admin"),
  validate({ query: listUsersQuerySchema }),
  asyncHandler(controller.list)
);

router.get(
  "/:id",
  requireSelfOrAdmin,
  validate({ params: userIdParamsSchema }),
  asyncHandler(controller.getById)
);

router.put(
  "/:id",
  requireSelfOrAdmin,
  validate({ params: userIdParamsSchema, body: updateUserBodySchema }),
  asyncHandler(controller.update)
);

router.delete(
  "/:id",
  requireRole("admin"),
  validate({ params: userIdParamsSchema }),
  asyncHandler(controller.delete)
);

export default router;
