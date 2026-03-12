import { z } from "zod";

export const devLoginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(100),
});

export type DevLoginDto = z.infer<typeof devLoginSchema>;
