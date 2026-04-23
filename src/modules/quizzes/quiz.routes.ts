import { Router } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { QuizController } from "./quiz.controller";
import {
  attemptParamsSchema,
  courseIdParamsSchema,
  createQuestionBodySchema,
  createQuizBodySchema,
  patchQuizStatusBodySchema,
  questionIdParamsSchema,
  quizIdParamsSchema,
  submitQuizBodySchema,
  updateQuestionBodySchema,
  updateQuizBodySchema,
} from "./quiz.schema";

const router = Router({ mergeParams: true });
const controller = new QuizController();

router.use(authMiddleware);

// list quizzes (admin/docente: todos, estudiante: publicados)
router.get("/", validate({ params: courseIdParamsSchema }), asyncHandler(controller.list));

router.get(
  "/admission/status",
  validate({ params: courseIdParamsSchema }),
  asyncHandler(controller.admissionStatus)
);

router.get("/:quizId", validate({ params: quizIdParamsSchema }), asyncHandler(controller.get));

// admin/docente
router.post(
  "/",
  requireRole("admin", "docente"),
  validate({ params: courseIdParamsSchema, body: createQuizBodySchema }),
  asyncHandler(controller.create)
);
router.put(
  "/:quizId",
  requireRole("admin", "docente"),
  validate({ params: quizIdParamsSchema, body: updateQuizBodySchema }),
  asyncHandler(controller.update)
);
router.patch(
  "/:quizId/status",
  requireRole("admin", "docente"),
  validate({ params: quizIdParamsSchema, body: patchQuizStatusBodySchema }),
  asyncHandler(controller.patchStatus)
);

// preguntas (admin/docente)
router.get(
  "/:quizId/questions",
  requireRole("admin", "docente"),
  validate({ params: quizIdParamsSchema }),
  asyncHandler(controller.listQuestions)
);
router.post(
  "/:quizId/questions",
  requireRole("admin", "docente"),
  validate({ params: quizIdParamsSchema, body: createQuestionBodySchema }),
  asyncHandler(controller.createQuestion)
);
router.put(
  "/:quizId/questions/:questionId",
  requireRole("admin", "docente"),
  validate({ params: questionIdParamsSchema, body: updateQuestionBodySchema }),
  asyncHandler(controller.updateQuestion)
);
router.delete(
  "/:quizId/questions/:questionId",
  requireRole("admin", "docente"),
  validate({ params: questionIdParamsSchema }),
  asyncHandler(controller.deleteQuestion)
);

// estudiante: iniciar y enviar
router.post(
  "/:quizId/start",
  requireRole("estudiante"),
  validate({ params: quizIdParamsSchema }),
  asyncHandler(controller.start)
);
router.post(
  "/:quizId/attempts/:attemptId/submit",
  requireRole("estudiante"),
  validate({ params: attemptParamsSchema, body: submitQuizBodySchema }),
  asyncHandler(controller.submit)
);

export default router;
