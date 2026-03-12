import { randomUUID } from "node:crypto";
import type { CreateConversationDto } from "../dtos/messages/create-conversation.dto.js";
import type { SendMessageDto } from "../dtos/messages/send-message.dto.js";
import type { IDashboardRepository } from "../repositories/interfaces/dashboard-repository.interface.js";
import type { IUserRepository } from "../repositories/interfaces/user-repository.interface.js";
import { AppError } from "../shared/errors/app-error.js";

export class MessageService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly dashboardRepository: IDashboardRepository
  ) {}

  async listConversations(userId: string): Promise<any[]> {
    const summaries = await this.dashboardRepository.listConversations(userId, 100);
    const participants = await this.dashboardRepository.listConversationParticipants(
      summaries.map((conversation) => conversation.id)
    );

    const byConversation = new Map<string, typeof participants>();

    for (const participant of participants) {
      const existing = byConversation.get(participant.conversationId) ?? [];
      existing.push(participant);
      byConversation.set(participant.conversationId, existing);
    }

    return summaries.map((conversation) => ({
      ...conversation,
      participants: (byConversation.get(conversation.id) ?? []).map((participant) => ({
        userId: participant.userId,
        nom: `${participant.firstName} ${participant.lastName}`.trim(),
        email: participant.email,
        role: participant.role,
        hospitalName: participant.hospitalName,
      })),
    }));
  }

  async listMessages(userId: string, conversationId: string, limit: number): Promise<any[]> {
    const messages = await this.dashboardRepository.listConversationMessages(userId, conversationId, limit);

    if (messages.length === 0) {
      const hasConversation = (await this.dashboardRepository.listConversations(userId, 500)).some(
        (conversation) => conversation.id === conversationId
      );

      if (!hasConversation) {
        throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND");
      }
    }

    return messages;
  }

  async createConversation(userId: string, dto: CreateConversationDto): Promise<{ conversationId: string }> {
    const sender = await this.userRepository.findById(userId);

    if (!sender) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const participant = await this.userRepository.findById(dto.participantUserId);

    if (!participant) {
      throw new AppError("Participant not found", 404, "PARTICIPANT_NOT_FOUND");
    }

    if (participant.id === sender.id) {
      throw new AppError("Cannot create conversation with yourself", 400, "INVALID_PARTICIPANT");
    }

    const existingConversationId = await this.dashboardRepository.findDirectConversation(
      sender.id,
      participant.id
    );

    if (existingConversationId) {
      return { conversationId: existingConversationId };
    }

    const conversationId = randomUUID();
    await this.dashboardRepository.createConversation({
      id: conversationId,
      subject: dto.subject ?? `Conversation ${participant.email}`,
      createdByUserId: sender.id,
      participantUserIds: [participant.id],
    });

    return { conversationId };
  }

  async sendMessage(userId: string, conversationId: string, dto: SendMessageDto): Promise<void> {
    const allowed = (await this.dashboardRepository.listConversations(userId, 500)).some(
      (conversation) => conversation.id === conversationId
    );

    if (!allowed) {
      throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND");
    }

    await this.dashboardRepository.createConversationMessage({
      id: randomUUID(),
      conversationId,
      senderUserId: userId,
      body: dto.body,
    });
  }

  async listContacts(userId: string): Promise<any[]> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    const contacts = await this.dashboardRepository.listContacts(user.id, user.role);

    return contacts.map((contact) => ({
      id: contact.id,
      nom: `${contact.firstName} ${contact.lastName}`.trim(),
      email: contact.email,
      role: contact.role,
      hospitalName: contact.hospitalName,
      ville: contact.city,
    }));
  }
}
