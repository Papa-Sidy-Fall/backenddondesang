import { UserRole } from "../../domain/enums/user-role.enum.js";

export const CNTS_EMAIL = "cnts@dondesang.sn";
export const LEGACY_ADMIN_EMAIL = "admin@dondesang.sn";

export function isCntsUser(user: { email: string; role: string }): boolean {
  return user.role === UserRole.HOSPITAL && user.email.trim().toLowerCase() === CNTS_EMAIL;
}

export function isLegacyAdminUser(user: { email: string; role: string }): boolean {
  return user.role === UserRole.ADMIN && user.email.trim().toLowerCase() === LEGACY_ADMIN_EMAIL;
}

export function canAccessCentralDashboard(user: { email: string; role: string }): boolean {
  return isCntsUser(user) || isLegacyAdminUser(user);
}
