import { AuthProvider } from "../enums/auth-provider.enum.js";
import { UserRole } from "../enums/user-role.enum.js";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  hospitalName: string | null;
  cni: string | null;
  phone: string | null;
  birthDate: string | null;
  bloodType: string | null;
  city: string | null;
  district: string | null;
  passwordHash: string | null;
  authProvider: AuthProvider;
  googleId: string | null;
  createdAt: string;
  updatedAt: string;
}
