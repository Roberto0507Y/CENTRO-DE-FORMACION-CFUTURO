import type { Response } from "express";
import type { AuthedRequest } from "../../common/types/express";
import { ForumService } from "./forum.service";
import type { ForumReplyStatus, ForumTopicStatus } from "./forum.types";
import type { CreateReplyInput, CreateTopicInput } from "./forum.types";

export class ForumController {
  private readonly service = new ForumService();

  listTopics = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const data = await this.service.listTopics(req.auth!, courseId);
    res.status(200).json({ ok: true, data });
  };

  createTopic = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const body = req.body as CreateTopicInput;
    const data = await this.service.createTopic(req.auth!, courseId, body);
    res.status(201).json({ ok: true, data });
  };

  getTopic = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const topicId = Number(req.params.topicId);
    const data = await this.service.getTopicDetail(req.auth!, courseId, topicId);
    res.status(200).json({ ok: true, data });
  };

  replyToTopic = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const topicId = Number(req.params.topicId);
    const body = req.body as CreateReplyInput;
    const data = await this.service.replyToTopic(req.auth!, courseId, topicId, body);
    res.status(201).json({ ok: true, data });
  };

  patchTopic = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const topicId = Number(req.params.topicId);
    const body = req.body as { estado?: ForumTopicStatus; fijado?: 0 | 1 };
    const data = await this.service.patchTopicModeration(req.auth!, courseId, topicId, body);
    res.status(200).json({ ok: true, data });
  };

  patchReplyStatus = async (req: AuthedRequest, res: Response) => {
    const courseId = Number(req.params.courseId);
    const topicId = Number(req.params.topicId);
    const replyId = Number(req.params.replyId);
    const body = req.body as { estado: ForumReplyStatus };
    const data = await this.service.patchReplyStatus(req.auth!, courseId, topicId, replyId, body.estado);
    res.status(200).json({ ok: true, data });
  };
}

