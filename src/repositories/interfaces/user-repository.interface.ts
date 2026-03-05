import type { User } from "../../domain/entities/user.entity.js";
import type { AuthProvider } from "../../domain/enums/auth-provider.enum.js";
import type { UserRole } from "../../domain/enums/user-role.enum.js";

export interface CreateUserInput {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  hospitalName?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  bloodType?: string | null;
  city?: string | null;
  district?: string | null;
  passwordHash?: string | null;
  authProvider: AuthProvider;
  googleId?: string | null;
}

export interface IUserRepository {
  findById(userId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
  attachGoogleIdentity(userId: string, googleId: string): Promise<void>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
}
