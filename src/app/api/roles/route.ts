/**
 * src/app/api/roles/route.ts
 *
 * PURPOSE:
 * API route handler for listing all available system roles and creating custom roles.
 */

import { NextRequest } from "next/server";
import { getAuthUser } from "@/helpers/server/getAuthUser";
import { errorResponse, successResponse } from "@/lib/server/api-response";
import { createCustomRole, listActiveBuiltinRoles, listCustomRoles } from "@/lib/db";
import { ALL_PERMISSION_KEYS, isBuiltinRoleLabel, normalizePermissions, PermissionKey } from "@/lib/types";

async function requireRoleManager(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return { response: errorResponse("Authentication required", 401) };
  if (user.role !== "super_admin" && user.role !== "admin") {
    return { response: errorResponse("Only Super Admin and Admin can manage custom roles", 403) };
  }
  return { user };
}

export async function GET(req: NextRequest) {
  const auth = await requireRoleManager(req);
  if (auth.response) return auth.response;

  try {
    const [builtinRoles, customRoles] = await Promise.all([
      listActiveBuiltinRoles(),
      listCustomRoles(),
    ]);
    return successResponse({ builtinRoles, customRoles });
  } catch (error) {
    console.error("List custom roles error:", error);
    return errorResponse("Could not load custom roles", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRoleManager(req);
  if (auth.response) return auth.response;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }
    if (!body || typeof body !== "object") {
      return errorResponse("Invalid role request", 400);
    }

    const { name, permissions } = body as { name?: unknown; permissions?: unknown };
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 48) {
      return errorResponse("Role name must be between 2 and 48 characters", 400);
    }
    if (isBuiltinRoleLabel(name)) {
      return errorResponse("Role name conflicts with a built-in role", 400);
    }
    if (!/^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u.test(name.trim())) {
      return errorResponse("Role name can contain letters, numbers, spaces, hyphens, and underscores", 400);
    }
    if (!Array.isArray(permissions) || permissions.length === 0) {
      return errorResponse("Select at least one permission", 400);
    }

    const permissionSet = new Set<PermissionKey>();
    for (const permission of permissions) {
      if (typeof permission !== "string" || !ALL_PERMISSION_KEYS.includes(permission as PermissionKey)) {
        return errorResponse("The role includes an unknown permission", 400);
      }
      permissionSet.add(permission as PermissionKey);
    }

    try {
      const role = await createCustomRole(
        name.trim(),
        normalizePermissions([...permissionSet]),
        auth.user.userId
      );
      return successResponse(role, 201);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "23505") {
        return errorResponse("A role with that name already exists", 409);
      }
      if (error instanceof Error) {
        return errorResponse(error.message, 400);
      }
      throw error;
    }
  } catch (error) {
    console.error("Create custom role error:", error);
    return errorResponse("Could not create custom role", 500);
  }
}
