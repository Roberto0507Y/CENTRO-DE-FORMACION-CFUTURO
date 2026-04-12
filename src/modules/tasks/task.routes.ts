import { Router } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { optionalUploadSingle } from "../../middlewares/upload.middleware";
import { rateLimit } from "../../middlewares/rateLimit.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { ALLOWED_TASK_FILES } from "../../common/services/storage.service";
import { TaskController } from "./task.controller";
import {
  courseIdParamsSchema,
  createSubmissionBodySchema,
  gradeSubmissionBodySchema,
  gradeSubmissionParamsSchema,
  createTaskBodySchema,
  listSubmissionsQuerySchema,
  submissionTaskIdParamsSchema,
  taskIdParamsSchema,
  updateTaskBodySchema,
} from "./task.schema";

const router = Router();
const controller = new TaskController();
const taskUploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyPrefix: "tasks:upload",
  message: "Demasiadas subidas de tareas. Intenta nuevamente en unos minutos.",
});

router.use(authMiddleware);

router.get(
  "/course/:courseId",
  validate({ params: courseIdParamsSchema }),
  asyncHandler(controller.listByCourse)
);
router.get(
  "/:id",
  validate({ params: taskIdParamsSchema }),
  asyncHandler(controller.getById)
);
router.post(
  "/course/:courseId",
  requireRole("admin", "docente"),
  taskUploadRateLimit,
  optionalUploadSingle({ fieldName: "file", allowed: ALLOWED_TASK_FILES, required: false }),
  validate({ params: courseIdParamsSchema, body: createTaskBodySchema }),
  asyncHandler(controller.create)
);
router.put(
  "/:id",
  requireRole("admin", "docente"),
  taskUploadRateLimit,
  optionalUploadSingle({ fieldName: "file", allowed: ALLOWED_TASK_FILES, required: false }),
  validate({ params: taskIdParamsSchema, body: updateTaskBodySchema }),
  asyncHandler(controller.update)
);
router.delete(
  "/:id",
  requireRole("admin", "docente"),
  validate({ params: taskIdParamsSchema }),
  asyncHandler(controller.close)
);

// Entregas (estudiante)
router.post(
  "/:taskId/submissions",
  requireRole("estudiante"),
  taskUploadRateLimit,
  optionalUploadSingle({ fieldName: "file", allowed: ALLOWED_TASK_FILES, required: false }),
  validate({ params: submissionTaskIdParamsSchema, body: createSubmissionBodySchema }),
  asyncHandler(controller.submitMyWork)
);
router.get(
  "/:taskId/submissions/my",
  requireRole("estudiante"),
  validate({ params: submissionTaskIdParamsSchema }),
  asyncHandler(controller.getMySubmission)
);

// Entregas (docente/admin)
router.get(
  "/:taskId/submissions",
  requireRole("admin", "docente"),
  validate({ params: submissionTaskIdParamsSchema, query: listSubmissionsQuerySchema }),
  asyncHandler(controller.listSubmissions)
);
router.put(
  "/:taskId/submissions/:submissionId/grade",
  requireRole("admin", "docente"),
  validate({ params: gradeSubmissionParamsSchema, body: gradeSubmissionBodySchema }),
  asyncHandler(controller.gradeSubmission)
);

export default router;
