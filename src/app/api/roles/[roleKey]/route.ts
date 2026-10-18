/**
 * src/app/api/roles/[roleKey]/route.ts
 *
 * PURPOSE:
 * API route handler for fetching, updating, or deleting a specific role configuration.
 */

import { NextRequest } from "next/server";
import { getAuthUser } from "@/helpers/server/getAuthUser";
import {
  deleteBuiltinRole,
  deleteCustomRole,
  findCustomRole,
  getBuiltinRolePermissions,
  isBuiltinRoleAvailable,
  updateBuiltinRolePermissions,
  updateCustomRole,
} from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/server/api-response";
import {
  ALL_PERMISSION_KEYS,
  isBuiltinRole,
  isBuiltinRoleLabel,
  normalizePermissions,
  PermissionKey,
} from "@/lib/types";

type RouteContext = { params: Promise<{ roleKey: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const user = await getAuthUser(req);
  if (!user) return errorResponse("Authentication required", 401);
  if (user.role !== "super_admin" && user.role !== "admin") {
    return errorResponse("Only Super Admin and Admin can view role settings", 403);
  }

  try {
    const { roleKey } = await context.params;
    if (isBuiltinRole(roleKey) && roleKey !== "super_admin") {
      if (!(await isBuiltinRoleAvailable(roleKey))) {
        return errorResponse("This role has been deleted", 404);
      }
      const names = { admin: "Admin", moderator: "Moderator", viewer: "Viewer" };
      return successResponse({
        roleKey,
        name: names[roleKey],
        permissions: await getBuiltinRolePermissions(roleKey),
      });
    }
    if (roleKey.startsWith("custom:")) {
      const role = await findCustomRole(roleKey);
      return role ? successResponse(role) : errorResponse("Custom role not found", 404);
    }
    return errorResponse("Role not found or cannot be edited", 404);
  } catch (error) {
    console.error("Get role error:", error);
    return errorResponse("Could not load role settings", 500);
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const user = await getAuthUser(req);
  if (!user) return errorResponse("Authentication required", 401);
  if (user.role !== "super_admin" && user.role !== "admin") {
    return errorResponse("Only Super Admin and Admin can update roles", 403);
  }

  const { roleKey } = await context.params;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }
    if (!body || typeof body !== "object") {
      return errorResponse("Invalid role update", 400);
    }
    const { name, permissions } = body as { name?: unknown; permissions?: unknown };
    if (isBuiltinRole(roleKey)) {
      if (roleKey === "super_admin") {
        return errorResponse("Super Admin permissions cannot be changed", 403);
      }
      if (!(await isBuiltinRoleAvailable(roleKey))) {
        return errorResponse("This role has been deleted", 404);
      }
      if (!Array.isArray(permissions) || !permissions.every(
        (permission): permission is PermissionKey =>
          typeof permission === "string" && ALL_PERMISSION_KEYS.includes(permission as PermissionKey)
      )) {
        return errorResponse("Select valid permissions for this role", 400);
      }
      const updatedPermissions = await updateBuiltinRolePermissions(roleKey, normalizePermissions(permissions));
      return successResponse({
        roleKey,
        name: { admin: "Admin", moderator: "Moderator", viewer: "Viewer" }[roleKey],
        permissions: updatedPermissions,
      });
    }
    if (!/^custom:[0-9a-f-]{36}$/i.test(roleKey)) {
      return errorResponse("Invalid custom role", 400);
    }
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 48) {
      return errorResponse("Role name must be between 2 and 48 characters", 400);
    }
    if (!Array.isArray(permissions) || !permissions.every(
      (permission): permission is PermissionKey =>
        typeof permission === "string" && ALL_PERMISSION_KEYS.includes(permission as PermissionKey)
    )) {
      return errorResponse("Select valid permissions for this role", 400);
    }
    if (isBuiltinRoleLabel(name)) {
      return errorResponse("Role name conflicts with a built-in role", 400);
    }
    if (!/^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u.test(name.trim())) {
      return errorResponse("Role name can contain letters, numbers, spaces, hyphens, and underscores", 400);
    }
    const role = await updateCustomRole(roleKey, name.trim(), normalizePermissions(permissions));
    if (!role) return errorResponse("Custom role not found", 404);
    return successResponse(role);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return errorResponse("A role with that name already exists", 409);
    }
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    console.error("Update custom role error:", error);
    return errorResponse("Could not update custom role", 500);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const user = await getAuthUser(req);
  if (!user) return errorResponse("Authentication required", 401);
  if (user.role !== "super_admin" && user.role !== "admin") {
    return errorResponse("Only Super Admin and Admin can delete custom roles", 403);
  }

  const { roleKey } = await context.params;
  if (isBuiltinRole(roleKey)) {
    if (roleKey === "super_admin") {
      return errorResponse("Super Admin cannot be deleted", 403);
    }
    try {
      const result = await deleteBuiltinRole(roleKey);
      if (result === "in_use") {
        return errorResponse("Cannot delete role: it is currently assigned to one or more users", 400);
      }
      if (result === "not_found") return errorResponse("Role has already been deleted", 404);
      return successResponse({ success: true });
    } catch (error) {
      console.error("Delete built-in role error:", error);
      return errorResponse("Could not delete role", 500);
    }
  }
  const result = await deleteCustomRole(roleKey);
  if (result === "not_found") return errorResponse("Custom role not found", 404);
  if (result === "in_use") return errorResponse("Cannot delete role: it is currently assigned to one or more users", 400);
  return successResponse({ success: true });
}
