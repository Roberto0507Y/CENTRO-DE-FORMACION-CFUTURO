"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskController = void 0;
const task_service_1 = require("./task.service");
class TaskController {
    constructor() {
        this.service = new task_service_1.TaskService();
        this.listByCourse = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const items = await this.service.listByCourse(req.auth, courseId);
            res.status(200).json({ ok: true, data: items });
        };
        this.getById = async (req, res) => {
            const id = Number(req.params.id);
            const task = await this.service.getById(req.auth, id);
            res.status(200).json({ ok: true, data: task });
        };
        this.create = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const file = req.file;
            const task = await this.service.create(req.auth, courseId, req.body, file);
            res.status(201).json({ ok: true, data: task });
        };
        this.update = async (req, res) => {
            const id = Number(req.params.id);
            const file = req.file;
            const task = await this.service.update(req.auth, id, req.body, file);
            res.status(200).json({ ok: true, data: task });
        };
        this.close = async (req, res) => {
            const id = Number(req.params.id);
            await this.service.close(req.auth, id);
            res.status(200).json({ ok: true, data: { id } });
        };
        this.submitMyWork = async (req, res) => {
            const taskId = Number(req.params.taskId);
            const file = req.file;
            const submission = await this.service.submitMyWork(req.auth, taskId, req.body, file);
            res.status(201).json({ ok: true, data: submission });
        };
        this.getMySubmission = async (req, res) => {
            const taskId = Number(req.params.taskId);
            const submission = await this.service.getMySubmission(req.auth, taskId);
            res.status(200).json({ ok: true, data: submission });
        };
        this.listSubmissions = async (req, res) => {
            const taskId = Number(req.params.taskId);
            const items = await this.service.listSubmissions(req.auth, taskId, req.query);
            res.status(200).json({ ok: true, data: items });
        };
        this.gradeSubmission = async (req, res) => {
            const taskId = Number(req.params.taskId);
            const submissionId = Number(req.params.submissionId);
            const submission = await this.service.gradeSubmission(req.auth, taskId, submissionId, req.body);
            res.status(200).json({ ok: true, data: submission });
        };
        this.gradeStudentWithoutSubmission = async (req, res) => {
            const taskId = Number(req.params.taskId);
            const studentId = Number(req.params.studentId);
            const submission = await this.service.gradeStudentWithoutSubmission(req.auth, taskId, studentId, req.body);
            res.status(200).json({ ok: true, data: submission });
        };
    }
}
exports.TaskController = TaskController;
