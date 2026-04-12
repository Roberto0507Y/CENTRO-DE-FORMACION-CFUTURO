import type { Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import { QuizService } from "./quiz.service";
import type { CreateQuestionInput, CreateQuizInput, SubmitQuizInput, UpdateQuestionInput, UpdateQuizInput } from "./quiz.types";

export class QuizController {
  private readonly service = new QuizService();

  list = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const data = await this.service.listByCourse(req.auth!, courseId);
    res.status(200).json({ ok: true, data });
  };

  get = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const quizId = Number(req.params.quizId);
    const data = await this.service.getQuiz(req.auth!, courseId, quizId);
    res.status(200).json({ ok: true, data });
  };

  create = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const data = await this.service.createQuiz(req.auth!, courseId, req.body as CreateQuizInput);
    res.status(201).json({ ok: true, data });
  };

  update = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const quizId = Number(req.params.quizId);
    const data = await this.service.updateQuiz(req.auth!, courseId, quizId, req.body as UpdateQuizInput);
    res.status(200).json({ ok: true, data });
  };

  patchStatus = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const quizId = Number(req.params.quizId);
    const { estado } = req.body as { estado: "borrador" | "publicado" | "cerrado" };
    const data = await this.service.patchStatus(req.auth!, courseId, quizId, estado);
    res.status(200).json({ ok: true, data });
  };

  listQuestions = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const quizId = Number(req.params.quizId);
    const data = await this.service.listQuestions(req.auth!, courseId, quizId);
    res.status(200).json({ ok: true, data });
  };

  createQuestion = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const quizId = Number(req.params.quizId);
    const data = await this.service.createQuestion(req.auth!, courseId, quizId, req.body as CreateQuestionInput);
    res.status(201).json({ ok: true, data });
  };

  updateQuestion = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const quizId = Number(req.params.quizId);
    const questionId = Number(req.params.questionId);
    const data = await this.service.updateQuestion(
      req.auth!,
      courseId,
      quizId,
      questionId,
      req.body as UpdateQuestionInput
    );
    res.status(200).json({ ok: true, data });
  };

  deleteQuestion = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const quizId = Number(req.params.quizId);
    const questionId = Number(req.params.questionId);
    await this.service.deleteQuestion(req.auth!, courseId, quizId, questionId);
    res.status(200).json({ ok: true, data: { id: questionId } });
  };

  start = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const quizId = Number(req.params.quizId);
    const data = await this.service.startQuiz(req.auth!, courseId, quizId);
    res.status(201).json({ ok: true, data });
  };

  submit = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const quizId = Number(req.params.quizId);
    const attemptId = Number(req.params.attemptId);
    const data = await this.service.submitQuiz(req.auth!, courseId, quizId, attemptId, req.body as SubmitQuizInput);
    res.status(200).json({ ok: true, data });
  };
}

