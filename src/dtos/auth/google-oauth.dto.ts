import { z } from "zod";

export const googleAuthUrlQuerySchema = z.object({
  redirectUri: z.url().optional(),
});

export const googleCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
});

export type GoogleAuthUrlQueryDto = z.infer<typeof googleAuthUrlQuerySchema>;
export type GoogleCallbackQueryDto = z.infer<typeof googleCallbackQuerySchema>;

export interface GoogleIdentityPayload {
  email: string;
  firstName: string;
  lastName: string;
  googleId: string;
}
