import { z } from "zod";

export const createAppointmentSchema = z.object({
  hospitalUserId: z.uuid(),
  date: z.string().date(),
  heure: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/u, "Invalid time format, expected HH:mm"),
  donationType: z.string().trim().min(3).max(80).default("Don de sang total"),
  message: z.string().trim().min(1).max(1000).optional(),
});

export type CreateAppointmentDto = z.infer<typeof createAppointmentSchema>;
