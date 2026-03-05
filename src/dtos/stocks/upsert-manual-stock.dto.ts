import { z } from "zod";
import { bloodTypeSchema } from "../auth/register-donor.dto.js";

export const upsertManualStockSchema = z.object({
  groupeSanguin: bloodTypeSchema,
  quantite: z.coerce.number().int().min(0).max(1_000_000),
  seuil: z.coerce.number().int().min(0).max(1_000_000).optional(),
  mode: z.enum(["SET", "ADD"]).default("SET"),
});

export type UpsertManualStockDto = z.infer<typeof upsertManualStockSchema>;
