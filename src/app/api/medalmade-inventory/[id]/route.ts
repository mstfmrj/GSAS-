






import { NextRequest } from "next/server";
import { getAuthUser } from "@/helpers/server/getAuthUser";
import { errorResponse, successResponse } from "@/lib/server/api-response";
import { getMedalmadeItem, updateMedalmadeItem, deleteMedalmadeItem } from "@/lib/db";
import { roleHasPermission } from "@/lib/permissions";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const user = await getAuthUser(req);
  if (!user) return errorResponse("Authentication required", 401);
  if (!(await roleHasPermission(user.role, "plaque.view", user.permissions)))
    return errorResponse("Access denied: insufficient permissions", 403);

  const { id } = await context.params;
  const item = await getMedalmadeItem(id);
  if (!item) return errorResponse("Not found", 404);
  return successResponse(item);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const user = await getAuthUser(req);
  if (!user) return errorResponse("Authentication required", 401);
  if (!(await roleHasPermission(user.role, "plaque.edit", user.permissions)))
    return errorResponse("Access denied: insufficient permissions", 403);

  const { id } = await context.params;
  const body = await req.json();
  const updated = await updateMedalmadeItem(id, body);
  if (!updated) return errorResponse("Not found", 404);
  return successResponse(updated);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const user = await getAuthUser(req);
  if (!user) return errorResponse("Authentication required", 401);
  if (!(await roleHasPermission(user.role, "plaque.delete", user.permissions)))
    return errorResponse("Access denied: insufficient permissions", 403);

  const { id } = await context.params;
  const deleted = await deleteMedalmadeItem(id);
  if (!deleted) return errorResponse("Not found", 404);
  return successResponse({ success: true });
}
