

import {
  getUserActivity,
  createPendingUser,
  approvePendingUser as approvePendingUserInDb,
  deletePendingUser as removePendingUserFromDb,
  deleteUser as removeUserFromDb,
  getPendingUsers as getPendingUsersFromDb,
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
import { SessionPayload } from "@/lib/types";


async function assertPermission(user: SessionPayload | undefined, permission: Parameters<typeof roleHasPermission>[1], message: string) {
  if (user && !(await roleHasPermission(user.role, permission, user.permissions))) {
    throw new AuthorizationError(message);
  }
}


async function assertRoleAssignment(actor: SessionPayload | undefined, targetRole: UserRole) {
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


export async function getUser(data: Record<string, unknown>, currentUser?: SessionPayload) {
  const { id } = data;
  if (typeof id !== "string" || !id) throw new Error("User ID is required");
  const user = await findUserById(id);
  if (!user) throw new Error("User not found");
  const safeUser = sanitizeUser(user);
  return { user: { ...safeUser, permissions: await getPermissionsForUser(safeUser) } };
}


export async function getUsers(data?: Record<string, unknown>, currentUser?: SessionPayload) {
  const activity = await getUserActivity();
  const pendingUsers = await getPendingUsersFromDb();
  const onlineCount = activity.filter((u) => u.isOnline).length;
  const offlineCount = activity.filter((u) => !u.isOnline).length;

  return {
    users: activity,
    pendingUsers,
    summary: {
      total: activity.length,
      online: onlineCount,
      offline: offlineCount,
    },
  };
}


export async function addUser(data: Record<string, unknown>, currentUser?: SessionPayload) {
  await assertPermission(currentUser, "users.create", "You do not have permission to add users");

  const { name, email, role, permissions } = data;

  if (typeof name !== "string" || !name.trim()) {
    throw new Error("Full name is required");
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new Error("Enter a valid email address for the user's Microsoft sign-in");
  }


  const targetRole: UserRole = (role as UserRole) || "viewer";
  await assertRoleAssignment(currentUser, targetRole);
  const permissionList = validatePermissions(permissions);

  const pendingUser = await createPendingUser({
    name,
    email,
    role: targetRole,
    permissions: permissionList ?? undefined,
    createdBy: currentUser?.userId,
  });

  return { pendingUser };
}

export async function deletePendingUser(data: Record<string, unknown>, currentUser?: SessionPayload) {
  const { id } = data;
  if (typeof id !== "string" || !id) throw new Error("Pending user ID is required");
  await assertPermission(currentUser, "users.delete", "You do not have permission to remove pending users");
  const success = await removePendingUserFromDb(id);
  if (!success) throw new Error("Pending user not found");
  return { success };
}

export async function approvePendingUser(data: Record<string, unknown>, currentUser?: SessionPayload) {
  const { id } = data;
  if (typeof id !== "string" || !id) throw new Error("Pending user ID is required");
  await assertPermission(currentUser, "users.edit", "You do not have permission to approve users");
  const pendingUser = await approvePendingUserInDb(id);
  if (!pendingUser) throw new Error("Pending user not found");
  return { pendingUser };
}





export async function updateUser(data: Record<string, unknown>, currentUser?: SessionPayload) {
  if ("password" in data || "newPassword" in data) {
    throw new Error("Password cannot be changed here.");
  }
  const { id, name, role, permissions } = data;
  if (typeof id !== "string" || !id) throw new Error("User ID is required");

  await assertPermission(currentUser, "users.edit", "You do not have permission to edit users");

  const existingUser = await findUserById(id);
  if (!existingUser) throw new Error("User not found");


  if (currentUser && !can.manageUser(currentUser.role, existingUser.role)) {
    throw new AuthorizationError("You do not have permission to manage this user's account");
  }

  if (role) {
    await assertRoleAssignment(currentUser, role as UserRole);
  }
  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    throw new Error("Full name cannot be empty");
  }
  const permissionList = permissions === undefined ? (role ? null : undefined) : validatePermissions(permissions);

  const user = await updateUserInDb({
    id,
    name: typeof name === "string" ? name.trim() : undefined,
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





export async function toggleBlockUser(data: Record<string, unknown>, currentUser?: SessionPayload) {
  const { id, blocked } = data;
  if (typeof id !== "string" || !id) throw new Error("User ID is required");
  if (typeof blocked !== "boolean") throw new Error("Blocked status must be a boolean");

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
  return { user, message: `${user.name} is now ${user.isBlocked ? "blocked" : "unblocked"}.` };
}





export async function deleteUser(data: Record<string, unknown>, currentUser?: SessionPayload) {
  const { id } = data;
  if (typeof id !== "string" || !id) throw new Error("User ID is required");

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
  return { success, message: `User ${user.name} deleted successfully` };
}




export async function updateProfile(data: Record<string, unknown>, currentUser?: SessionPayload) {
  if (!currentUser?.userId) {
    throw new AuthorizationError("Authentication required");
  }
  if ("username" in data || "currentPassword" in data || "newPassword" in data || "password" in data) {
    throw new Error("Only your full name can be changed in your profile.");
  }

  const { name } = data;
  const updateFields: { id: string; name?: string } = {
    id: currentUser.userId,
  };

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      throw new Error("Full name cannot be empty");
    }
    updateFields.name = name.trim();
  }

  const user = await updateUserInDb(updateFields);

  return { user, message: "Profile updated successfully" };
}

