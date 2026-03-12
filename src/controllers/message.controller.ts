import { z } from "zod";
import type { Request, Response } from "express";
import { createConversationSchema } from "../dtos/messages/create-conversation.dto.js";
import { getMessagesQuerySchema } from "../dtos/messages/get-messages-query.dto.js";
import { sendMessageSchema } from "../dtos/messages/send-message.dto.js";
import { AppError } from "../shared/errors/app-error.js";
import { MessageService } from "../services/message.service.js";

const paramsSchema = z.object({
  id: z.uuid(),
});

export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  listConversations = async (req: Request, res: Response): Promise<void> => {
    if (!req.authUser) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const conversations = await this.messageService.listConversations(req.authUser.userId);
    res.json({ conversations, total: conversations.length });
  };

  listMessages = async (req: Request, res: Response): Promise<void> => {
    if (!req.authUser) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const params = paramsSchema.parse(req.params);
    const query = getMessagesQuerySchema.parse(req.query);
    const messages = await this.messageService.listMessages(req.authUser.userId, params.id, query.limit);

    res.json({ messages, total: messages.length });
  };

  createConversation = async (req: Request, res: Response): Promise<void> => {
    if (!req.authUser) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const dto = createConversationSchema.parse(req.body);
    const created = await this.messageService.createConversation(req.authUser.userId, dto);
    res.status(201).json(created);
  };

  sendMessage = async (req: Request, res: Response): Promise<void> => {
    if (!req.authUser) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const params = paramsSchema.parse(req.params);
    const dto = sendMessageSchema.parse(req.body);

    await this.messageService.sendMessage(req.authUser.userId, params.id, dto);
    res.status(201).json({ message: "Message sent" });
  };

  listContacts = async (req: Request, res: Response): Promise<void> => {
    if (!req.authUser) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const contacts = await this.messageService.listContacts(req.authUser.userId);
    res.json({ contacts, total: contacts.length });
  };
}
