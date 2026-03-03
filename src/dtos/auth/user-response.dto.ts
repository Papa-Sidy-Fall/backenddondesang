import type { User } from "../../domain/entities/user.entity.js";

export interface UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  birthDate: string | null;
  bloodType: string | null;
  city: string | null;
  district: string | null;
  authProvider: string;
  createdAt: string;
  updatedAt: string;
}

export function toUserResponseDto(user: User): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    birthDate: user.birthDate,
    bloodType: user.bloodType,
    city: user.city,
    district: user.district,
    authProvider: user.authProvider,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
