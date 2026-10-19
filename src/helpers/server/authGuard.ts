






import type { SessionPayload, UserRole } from "@/lib/types";
import type { PermissionKey } from "@/lib/types";
import { roleHasPermission } from "@/lib/permissions";

export class AuthorizationError extends Error {}

export interface PermissionRule {
  viewPermission?: string;
  role?: UserRole;
  canFn?: (role: UserRole) => boolean;
  permission?: PermissionKey;
}

export async function authGuard(user: SessionPayload | null, rule?: PermissionRule): Promise<boolean> {
  if (!user) return false;
  if (!rule) return true;

  if (rule.permission && !(await roleHasPermission(user.role, rule.permission, user.permissions))) {
    return false;
  }

  if (rule.canFn && !rule.canFn(user.role)) {
    return false;
  }

  if (rule.role && user.role !== rule.role) {
    return false;
  }

  return true;
}
