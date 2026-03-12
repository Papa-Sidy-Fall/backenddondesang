import { z } from "zod";

export const createConversationSchema = z.object({
  participantUserId: z.uuid(),
  subject: z.string().trim().min(1).max(200).optional(),
});

export type CreateConversationDto = z.infer<typeof createConversationSchema>;
