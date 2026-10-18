

import {
  getUserActivity,
  createUser,
  deleteUser as removeUserFromDb,
  findUserById,
  isBuiltinRoleAvailable,
  updateUser as updateUserInDb,
  toggleUserBlock,
  sanitizeUser,
  changeUserPassword,
} from "@/lib/db";
import { AuthorizationError } from "@/helpers/server/authGuard";
import { ALL_PERMISSION_KEYS, can, isBuiltinRole, normalizePermissions, PermissionKey, UserRole } from "@/lib/types";
import { findCustomRole } from "@/lib/db";
import { getPermissionsForUser, roleHasPermission } from "@/lib/permissions";
import { checkPasswordStrength } from "@/lib/passwordStrength";


async function assertPermission(user: any, permission: Parameters<typeof roleHasPermission>[1], message: string) {
  if (user && !(await roleHasPermission(user.role, permission, user.permissions))) {
    throw new AuthorizationError(message);
  }
}


async function assertRoleAssignment(actor: any, targetRole: UserRole) {
  if (!actor) return;
  
  if (targetRole === "super_admin") {
    throw new AuthorizationError("The Super Admin role cannot be assigned");
  }
  
  if (
    isBuiltinRole(targetRole) &&
    !(await isBuiltinRoleAvailable(targetRole))
  ) {
    throw new AuthorizationError(`The "${targetRole}" role has been deleted`);
  }
  
  if (targetRole.startsWith("custom:")) {
    if ((actor.role !== "super_admin" && actor.role !== "admin") || !(await findCustomRole(targetRole))) {
      throw new AuthorizationError("You do not have permission to assign this custom role");
    }
    return;
  }
  if (actor.role.startsWith("custom:") && targetRole === "viewer") return;

  if (!isBuiltinRole(targetRole) || !can.grantRole(actor.role as UserRole, targetRole)) {
    throw new AuthorizationError(`You do not have permission to assign the "${targetRole}" role`);
  }
}


export async function getUser(data: Record<string, any>, currentUser?: any) {
  const { id } = data;
  if (!id) throw new Error("User ID is required");
  const user = await findUserById(id);
  if (!user) throw new Error("User not found");
  const safeUser = sanitizeUser(user);
  return { user: { ...safeUser, permissions: await getPermissionsForUser(safeUser) } };
}


export async function getUsers(data?: Record<string, any>, currentUser?: any) {
  const activity = await getUserActivity();
  const onlineCount = activity.filter((u) => u.isOnline).length;
  const offlineCount = activity.filter((u) => !u.isOnline).length;

  return {
    users: activity,
    summary: {
      total: activity.length,
      online: onlineCount,
      offline: offlineCount,
    },
  };
}


export async function addUser(data: Record<string, any>, currentUser?: any) {
  await assertPermission(currentUser, "users.create", "You do not have permission to add users");

  const { username, email, password, name, role, permissions } = data;

  if (!username || !email || !password) {
    throw new Error("Username, email and password are required");
  }

  // Validate the caller can assign this role
  const targetRole: UserRole = (role as UserRole) || "viewer";
  await assertRoleAssignment(currentUser, targetRole);
  const permissionList = validatePermissions(permissions);

  const user = await createUser({
    username,
    email,
    passwordPlain: password,
    name,
    role: targetRole,
    permissions: permissionList ?? undefined,
  });

  return { user };
}

/**
 * Updates an existing user's name, username, assigned role, or custom permissions list.
 * Verifies caller has `users.edit` permission and role management authority.
 */
export async function updateUser(data: Record<string, any>, currentUser?: any) {
  const { id, name, username, role, permissions } = data;
  if (!id) throw new Error("User ID is required");

  await assertPermission(currentUser, "users.edit", "You do not have permission to edit users");

  const existingUser = await findUserById(id);
  if (!existingUser) throw new Error("User not found");

  // Prevent lower-tier role from modifying higher-tier accounts (e.g. admin editing super_admin)
  if (currentUser && !can.manageUser(currentUser.role, existingUser.role)) {
    throw new AuthorizationError("You do not have permission to manage this user's account");
  }

  if (role) {
    await assertRoleAssignment(currentUser, role as UserRole);
  }
  const permissionList = permissions === undefined ? (role ? null : undefined) : validatePermissions(permissions);

  const user = await updateUserInDb({
    id,
    name,
    username,
    role: role as UserRole | undefined,
    permissions: permissionList,
  });

  return { user };
}

/**
 * Helper: Validates permission keys array against system defined keys.
 * Ensures no invalid or malformed permission strings are persisted.
 */
function validatePermissions(value: unknown): PermissionKey[] | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Array.isArray(value) || value.some((permission) =>
    typeof permission !== "string" || !ALL_PERMISSION_KEYS.includes(permission as PermissionKey)
  )) {
    throw new Error("Invalid permissions list");
  }
  return normalizePermissions([...new Set(value as PermissionKey[])]);
}

/**
 * Toggles a user's blocked flag.
 * Blocked users are prohibited from logging in. Users cannot block their own account.
 */
export async function toggleBlockUser(data: Record<string, any>, currentUser?: any) {
  const { id, blocked } = data;
  if (!id) throw new Error("User ID is required");

  await assertPermission(currentUser, "users.edit", "You do not have permission to block/unblock users");

  // Self-protection check
  if (currentUser && currentUser.userId === id) {
    throw new AuthorizationError("You cannot block your own account");
  }

  const existingUser = await findUserById(id);
  if (!existingUser) throw new Error("User not found");

  if (currentUser && !can.manageUser(currentUser.role, existingUser.role)) {
    throw new AuthorizationError("You do not have permission to manage this user's account");
  }

  const user = await toggleUserBlock(id, blocked);
  return { user, message: `User @${user.username} is now ${user.isBlocked ? "blocked" : "unblocked"}.` };
}

/**
 * Deletes a user record permanently.
 * Enforces permission checks and prevents an administrator from deleting their own active account.
 */
export async function deleteUser(data: Record<string, any>, currentUser?: any) {
  const { id } = data;
  if (!id) throw new Error("User ID is required");

  await assertPermission(currentUser, "users.delete", "You do not have permission to delete users");

  // Self-protection check
  if (currentUser && currentUser.userId === id) {
    throw new AuthorizationError("Cannot delete your own account");
  }

  const user = await findUserById(id);
  if (!user) throw new Error("User not found");
  if (currentUser && !can.manageUser(currentUser.role, user.role)) {
    throw new AuthorizationError("You do not have permission to manage this user's account");
  }

  const success = await removeUserFromDb(id);
  return { success, message: `User @${user.username} deleted successfully` };
}

/**
 * Updates the currently logged-in user's own profile (full name, username, and optionally password).
 * Allows any authenticated user to edit their profile details.
 */
export async function updateProfile(data: Record<string, any>, currentUser?: any) {
  if (!currentUser?.userId) {
    throw new AuthorizationError("Authentication required");
  }

  const { name, username, currentPassword, newPassword } = data;

  // If updating password, verify current password first and validate password complexity
  if (currentPassword || newPassword) {
    if (!currentPassword) {
      throw new Error("Current password is required to set a new password");
    }
    if (!newPassword || typeof newPassword !== "string") {
      throw new Error("New password is required");
    }
    const strength = checkPasswordStrength(newPassword);
    if (!Object.values(strength.checks).every(Boolean)) {
      throw new Error("New password does not meet complexity requirements (must be 8+ chars with uppercase, lowercase, number, and special character)");
    }
    const pwdRes = await changeUserPassword(currentUser.userId, currentPassword, newPassword);
    if (!pwdRes.success) {
      throw new Error(pwdRes.error || "Failed to update password");
    }
  }

  const updateFields: { id: string; name?: string; username?: string } = {
    id: currentUser.userId,
  };

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      throw new Error("Full name cannot be empty");
    }
    updateFields.name = name.trim();
  }

  if (username !== undefined) {
    if (typeof username !== "string" || !username.trim()) {
      throw new Error("Username cannot be empty");
    }
    updateFields.username = username.trim();
  }

  const user = await updateUserInDb(updateFields);

  return { user, message: "Profile updated successfully" };
}

