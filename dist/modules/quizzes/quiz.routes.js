"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../../common/utils/asyncHandler");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const validate_middleware_1 = require("../../middlewares/validate.middleware");
const quiz_controller_1 = require("./quiz.controller");
const quiz_schema_1 = require("./quiz.schema");
const router = (0, express_1.Router)({ mergeParams: true });
const controller = new quiz_controller_1.QuizController();
router.use(auth_middleware_1.authMiddleware);
// list quizzes (admin/docente: todos, estudiante: publicados)
router.get("/", (0, validate_middleware_1.validate)({ params: quiz_schema_1.courseIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.list));
router.get("/:quizId", (0, validate_middleware_1.validate)({ params: quiz_schema_1.quizIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.get));
// admin/docente
router.post("/", (0, role_middleware_1.requireRole)("admin", "docente"), (0, validate_middleware_1.validate)({ params: quiz_schema_1.courseIdParamsSchema, body: quiz_schema_1.createQuizBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.create));
router.put("/:quizId", (0, role_middleware_1.requireRole)("admin", "docente"), (0, validate_middleware_1.validate)({ params: quiz_schema_1.quizIdParamsSchema, body: quiz_schema_1.updateQuizBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.update));
router.patch("/:quizId/status", (0, role_middleware_1.requireRole)("admin", "docente"), (0, validate_middleware_1.validate)({ params: quiz_schema_1.quizIdParamsSchema, body: quiz_schema_1.patchQuizStatusBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.patchStatus));
// preguntas (admin/docente)
router.get("/:quizId/questions", (0, role_middleware_1.requireRole)("admin", "docente"), (0, validate_middleware_1.validate)({ params: quiz_schema_1.quizIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.listQuestions));
router.post("/:quizId/questions", (0, role_middleware_1.requireRole)("admin", "docente"), (0, validate_middleware_1.validate)({ params: quiz_schema_1.quizIdParamsSchema, body: quiz_schema_1.createQuestionBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.createQuestion));
router.put("/:quizId/questions/:questionId", (0, role_middleware_1.requireRole)("admin", "docente"), (0, validate_middleware_1.validate)({ params: quiz_schema_1.questionIdParamsSchema, body: quiz_schema_1.updateQuestionBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.updateQuestion));
router.delete("/:quizId/questions/:questionId", (0, role_middleware_1.requireRole)("admin", "docente"), (0, validate_middleware_1.validate)({ params: quiz_schema_1.questionIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.deleteQuestion));
// estudiante: iniciar y enviar
router.post("/:quizId/start", (0, role_middleware_1.requireRole)("estudiante"), (0, validate_middleware_1.validate)({ params: quiz_schema_1.quizIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.start));
router.post("/:quizId/attempts/:attemptId/submit", (0, role_middleware_1.requireRole)("estudiante"), (0, validate_middleware_1.validate)({ params: quiz_schema_1.attemptParamsSchema, body: quiz_schema_1.submitQuizBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.submit));
exports.default = router;
