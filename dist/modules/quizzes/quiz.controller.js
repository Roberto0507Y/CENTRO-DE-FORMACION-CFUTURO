"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizController = void 0;
const quiz_service_1 = require("./quiz.service");
class QuizController {
    constructor() {
        this.service = new quiz_service_1.QuizService();
        this.list = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const data = await this.service.listByCourse(req.auth, courseId);
            res.status(200).json({ ok: true, data });
        };
        this.get = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const quizId = Number(req.params.quizId);
            const data = await this.service.getQuiz(req.auth, courseId, quizId);
            res.status(200).json({ ok: true, data });
        };
        this.create = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const data = await this.service.createQuiz(req.auth, courseId, req.body);
            res.status(201).json({ ok: true, data });
        };
        this.update = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const quizId = Number(req.params.quizId);
            const data = await this.service.updateQuiz(req.auth, courseId, quizId, req.body);
            res.status(200).json({ ok: true, data });
        };
        this.patchStatus = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const quizId = Number(req.params.quizId);
            const { estado } = req.body;
            const data = await this.service.patchStatus(req.auth, courseId, quizId, estado);
            res.status(200).json({ ok: true, data });
        };
        this.listQuestions = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const quizId = Number(req.params.quizId);
            const data = await this.service.listQuestions(req.auth, courseId, quizId);
            res.status(200).json({ ok: true, data });
        };
        this.createQuestion = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const quizId = Number(req.params.quizId);
            const data = await this.service.createQuestion(req.auth, courseId, quizId, req.body);
            res.status(201).json({ ok: true, data });
        };
        this.updateQuestion = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const quizId = Number(req.params.quizId);
            const questionId = Number(req.params.questionId);
            const data = await this.service.updateQuestion(req.auth, courseId, quizId, questionId, req.body);
            res.status(200).json({ ok: true, data });
        };
        this.deleteQuestion = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const quizId = Number(req.params.quizId);
            const questionId = Number(req.params.questionId);
            await this.service.deleteQuestion(req.auth, courseId, quizId, questionId);
            res.status(200).json({ ok: true, data: { id: questionId } });
        };
        this.start = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const quizId = Number(req.params.quizId);
            const data = await this.service.startQuiz(req.auth, courseId, quizId);
            res.status(201).json({ ok: true, data });
        };
        this.submit = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const quizId = Number(req.params.quizId);
            const attemptId = Number(req.params.attemptId);
            const data = await this.service.submitQuiz(req.auth, courseId, quizId, attemptId, req.body);
            res.status(200).json({ ok: true, data });
        };
    }
}
exports.QuizController = QuizController;
