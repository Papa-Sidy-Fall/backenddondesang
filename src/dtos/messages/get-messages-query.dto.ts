import { z } from "zod";

export const getMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export type GetMessagesQueryDto = z.infer<typeof getMessagesQuerySchema>;
