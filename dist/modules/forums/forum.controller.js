"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForumController = void 0;
const forum_service_1 = require("./forum.service");
class ForumController {
    constructor() {
        this.service = new forum_service_1.ForumService();
        this.listTopics = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const data = await this.service.listTopics(req.auth, courseId);
            res.status(200).json({ ok: true, data });
        };
        this.createTopic = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const body = req.body;
            const data = await this.service.createTopic(req.auth, courseId, body);
            res.status(201).json({ ok: true, data });
        };
        this.getTopic = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const topicId = Number(req.params.topicId);
            const data = await this.service.getTopicDetail(req.auth, courseId, topicId);
            res.status(200).json({ ok: true, data });
        };
        this.replyToTopic = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const topicId = Number(req.params.topicId);
            const body = req.body;
            const data = await this.service.replyToTopic(req.auth, courseId, topicId, body);
            res.status(201).json({ ok: true, data });
        };
        this.patchTopic = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const topicId = Number(req.params.topicId);
            const body = req.body;
            const data = await this.service.patchTopicModeration(req.auth, courseId, topicId, body);
            res.status(200).json({ ok: true, data });
        };
        this.patchReplyStatus = async (req, res) => {
            const courseId = Number(req.params.courseId);
            const topicId = Number(req.params.topicId);
            const replyId = Number(req.params.replyId);
            const body = req.body;
            const data = await this.service.patchReplyStatus(req.auth, courseId, topicId, replyId, body.estado);
            res.status(200).json({ ok: true, data });
        };
    }
}
exports.ForumController = ForumController;
