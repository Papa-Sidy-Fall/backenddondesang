import { z } from "zod";
import { CampaignStatus } from "../../domain/enums/campaign-status.enum.js";

export const createCampaignSchema = z.object({
  titre: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(2000),
  dateDebut: z.string().date(),
  dateFin: z.string().date(),
  objectif: z.coerce.number().int().positive().max(1_000_000),
  lieu: z.string().trim().min(2).max(255),
  statut: z.nativeEnum(CampaignStatus).optional(),
});

export type CreateCampaignDto = z.infer<typeof createCampaignSchema>;
