import { Router } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { FileController } from "./file.controller";
import { fileIdParamsSchema } from "./file.schema";

const router = Router();
const controller = new FileController();

router.get(
  "/download/:id",
  authMiddleware,
  validate({ params: fileIdParamsSchema }),
  asyncHandler(controller.download)
);

export default router;

