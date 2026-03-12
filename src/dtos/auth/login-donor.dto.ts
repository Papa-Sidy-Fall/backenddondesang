import { z } from "zod";

export const loginDonorSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(100),
});

export type LoginDonorDto = z.infer<typeof loginDonorSchema>;
