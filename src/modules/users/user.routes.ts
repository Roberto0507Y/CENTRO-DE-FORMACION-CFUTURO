import { Router } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { UserController } from "./user.controller";
import { listUsersQuerySchema, updateUserBodySchema, userIdParamsSchema } from "./user.schema";

const router = Router();
const controller = new UserController();

router.use(authMiddleware);

router.get(
  "/",
  requireRole("admin"),
  validate({ query: listUsersQuerySchema }),
  asyncHandler(controller.list)
);

router.get(
  "/:id",
  validate({ params: userIdParamsSchema }),
  asyncHandler(controller.getById)
);

router.put(
  "/:id",
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
