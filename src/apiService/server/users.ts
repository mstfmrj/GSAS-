

import { randomBytes } from "node:crypto";
import {
  getUserActivity,
  createUser,
  deleteUser as removeUserFromDb,
  findUserById,
  isBuiltinRoleAvailable,
  updateUser as updateUserInDb,
  toggleUserBlock,
  sanitizeUser,
} from "@/lib/db";
import { AuthorizationError } from "@/helpers/server/authGuard";
import { ALL_PERMISSION_KEYS, can, isBuiltinRole, normalizePermissions, PermissionKey, UserRole } from "@/lib/types";
import { findCustomRole } from "@/lib/db";
import { getPermissionsForUser, roleHasPermission } from "@/lib/permissions";


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

  const { username, email, role, permissions } = data;

  if (typeof username !== "string" || !username.trim()) {
    throw new Error("Username is required");
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new Error("Enter a valid email address for the user's Microsoft sign-in");
  }


  const targetRole: UserRole = (role as UserRole) || "viewer";
  await assertRoleAssignment(currentUser, targetRole);
  const permissionList = validatePermissions(permissions);

  const user = await createUser({
    username,
    email,


    passwordPlain: randomBytes(48).toString("base64url"),
    role: targetRole,
    permissions: permissionList ?? undefined,
  });

  return { user };
}





export async function updateUser(data: Record<string, any>, currentUser?: any) {
  if ("name" in data || "password" in data || "newPassword" in data) {
    throw new Error("Full name and password cannot be changed here; update the username instead.");
  }
  const { id, username, role, permissions } = data;
  if (!id) throw new Error("User ID is required");

  await assertPermission(currentUser, "users.edit", "You do not have permission to edit users");

  const existingUser = await findUserById(id);
  if (!existingUser) throw new Error("User not found");


  if (currentUser && !can.manageUser(currentUser.role, existingUser.role)) {
    throw new AuthorizationError("You do not have permission to manage this user's account");
  }

  if (role) {
    await assertRoleAssignment(currentUser, role as UserRole);
  }
  const permissionList = permissions === undefined ? (role ? null : undefined) : validatePermissions(permissions);

  const user = await updateUserInDb({
    id,
    username,
    role: role as UserRole | undefined,
    permissions: permissionList,
  });

  return { user };
}





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





export async function toggleBlockUser(data: Record<string, any>, currentUser?: any) {
  const { id, blocked } = data;
  if (!id) throw new Error("User ID is required");

  await assertPermission(currentUser, "users.edit", "You do not have permission to block/unblock users");


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





export async function deleteUser(data: Record<string, any>, currentUser?: any) {
  const { id } = data;
  if (!id) throw new Error("User ID is required");

  await assertPermission(currentUser, "users.delete", "You do not have permission to delete users");


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




export async function updateProfile(data: Record<string, any>, currentUser?: any) {
  if (!currentUser?.userId) {
    throw new AuthorizationError("Authentication required");
  }
  if ("name" in data || "currentPassword" in data || "newPassword" in data || "password" in data) {
    throw new Error("Only the username can be changed in your profile.");
  }

  const { username } = data;
  const updateFields: { id: string; username?: string } = {
    id: currentUser.userId,
  };

  if (username !== undefined) {
    if (typeof username !== "string" || !username.trim()) {
      throw new Error("Username cannot be empty");
    }
    updateFields.username = username.trim();
  }

  const user = await updateUserInDb(updateFields);

  return { user, message: "Profile updated successfully" };
}

