import { z } from "zod";
import { bloodTypeSchema } from "../auth/register-donor.dto.js";
import { EmergencyPriority } from "../../domain/enums/emergency-priority.enum.js";

export const createEmergencyAlertSchema = z.object({
  groupeSanguin: bloodTypeSchema,
  quantite: z.coerce.number().int().positive().max(1_000_000),
  message: z.string().trim().min(5).max(1000),
  priorite: z.nativeEnum(EmergencyPriority).default(EmergencyPriority.HIGH),
});

export type CreateEmergencyAlertDto = z.infer<typeof createEmergencyAlertSchema>;
