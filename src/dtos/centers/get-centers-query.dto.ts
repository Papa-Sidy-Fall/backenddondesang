import { z } from "zod";
import { bloodTypeSchema } from "../auth/register-donor.dto.js";

export const getCentersQuerySchema = z.object({
  city: z.string().trim().min(1).max(100).optional(),
  bloodType: bloodTypeSchema.optional(),
});

export type GetCentersQueryDto = z.infer<typeof getCentersQuerySchema>;
