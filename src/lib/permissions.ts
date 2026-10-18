import { findCustomRole, getBuiltinRolePermissions } from "@/lib/db";
import {
  BUILTIN_ROLE_PERMISSIONS,
  isBuiltinRole,
  normalizePermissions,
  PermissionKey,
  UserRole,
} from "@/lib/types";

export async function getPermissionsForRole(role: UserRole): Promise<PermissionKey[]> {
  if (isBuiltinRole(role)) {
    if (role !== "super_admin") return getBuiltinRolePermissions(role);
    return normalizePermissions(BUILTIN_ROLE_PERMISSIONS[role]);
  }

  const customRole = await findCustomRole(role);
  return normalizePermissions(customRole?.permissions ?? []);
}

export async function getPermissionsForUser(user: {
  role: UserRole;
  permissions?: PermissionKey[];
}): Promise<PermissionKey[]> {
  if (user.role === "super_admin") {
    return BUILTIN_ROLE_PERMISSIONS.super_admin;
  }

  return normalizePermissions(user.permissions ?? await getPermissionsForRole(user.role));
}

export async function roleHasPermission(
  role: UserRole,
  permission: PermissionKey,
  userPermissions?: PermissionKey[]
): Promise<boolean> {
  const permissions = role === "super_admin"
    ? BUILTIN_ROLE_PERMISSIONS.super_admin
    : userPermissions ?? await getPermissionsForRole(role);
  return normalizePermissions(permissions).includes(permission);
}

export async function getRoleName(role: UserRole): Promise<string> {
  if (isBuiltinRole(role)) {
    return ({
      super_admin: "Super Admin",
      admin: "Admin",
      moderator: "Moderator",
      viewer: "User",
    })[role];
  }

  const customRole = await findCustomRole(role);
  return customRole?.name ?? "Unknown role";
}
