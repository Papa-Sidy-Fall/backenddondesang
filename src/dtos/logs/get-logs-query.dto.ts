import { z } from "zod";

export const getLogsQuerySchema = z.object({
  level: z.enum(["debug", "info", "warn", "error"]).optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
  search: z.string().trim().max(100).optional(),
});

export type GetLogsQueryDto = z.infer<typeof getLogsQuerySchema>;
