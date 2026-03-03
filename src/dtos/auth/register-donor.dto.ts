import { z } from "zod";

export const bloodTypeSchema = z.enum([
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
]);

export const registerDonorSchema = z.object({
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(100),
  phone: z.string().trim().min(6).max(30).optional(),
  birthDate: z.string().date().optional(),
  bloodType: bloodTypeSchema.optional(),
  city: z.string().trim().min(2).max(100).optional(),
  district: z.string().trim().min(2).max(100).optional(),
});

export type RegisterDonorDto = z.infer<typeof registerDonorSchema>;
