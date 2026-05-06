import type { Request, Response } from "express";
import { AssistantService } from "./assistant.service";
import type { AssistantChatInput } from "./assistant.types";

export class AssistantController {
  private readonly service = new AssistantService();

  bootstrap = async (_req: Request, res: Response) => {
    const data = await this.service.bootstrap();
    res.status(200).json({ ok: true, data });
  };

  chat = async (req: Request, res: Response) => {
    const data = await this.service.chat(req.body as AssistantChatInput);
    res.status(200).json({ ok: true, data });
  };
}
