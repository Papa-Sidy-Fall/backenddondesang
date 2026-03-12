import { z } from "zod";
import {
  isValidCni,
  normalizeCni,
  normalizeSenegalPhone,
} from "../../shared/validation/identity-normalizers.js";

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
  firstName: z
    .string()
    .trim()
    .regex(/^[A-Za-zÀ-ÿ' -]{2,100}$/, "Le prénom doit contenir 2 à 100 caractères alphabétiques."),
  lastName: z
    .string()
    .trim()
    .regex(/^[A-Za-zÀ-ÿ' -]{2,100}$/, "Le nom doit contenir 2 à 100 caractères alphabétiques."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Veuillez saisir une adresse email valide."),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .max(100, "Le mot de passe est trop long.")
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d).+$/,
      "Le mot de passe doit contenir au moins une lettre et un chiffre."
    ),
  cni: z
    .string()
    .trim()
    .min(1, "Le CNI est obligatoire.")
    .transform((value) => normalizeCni(value))
    .refine(
      (value): value is string => isValidCni(value),
      "Le CNI doit contenir exactement 13 caractères (chiffres et/ou lettres)."
    ),
  phone: z
    .string()
    .trim()
    .min(1, "Le numéro de téléphone est obligatoire.")
    .transform((value) => normalizeSenegalPhone(value))
    .refine(
      (value): value is string => Boolean(value),
      "Le numéro doit contenir 9 chiffres (avec ou sans préfixe +221)."
    ),
  birthDate: z
    .string()
    .date("La date de naissance est invalide.")
    .optional(),
  bloodType: bloodTypeSchema.optional(),
  city: z
    .string()
    .trim()
    .regex(/^[A-Za-zÀ-ÿ' -]{2,100}$/, "La ville doit contenir 2 à 100 caractères alphabétiques.")
    .optional(),
  district: z
    .string()
    .trim()
    .regex(/^[A-Za-zÀ-ÿ0-9' -]{2,100}$/, "Le quartier doit contenir 2 à 100 caractères valides.")
    .optional(),
});

export type RegisterDonorDto = z.infer<typeof registerDonorSchema>;
