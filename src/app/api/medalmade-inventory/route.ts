/**
 * src/app/api/medalmade-inventory/route.ts
 *
 * PURPOSE:
 * API route handler for querying (GET) and creating (POST) Outgoing Plaque inventory records.
 */

import { NextRequest } from "next/server";
import { getAuthUser } from "@/helpers/server/getAuthUser";
import { errorResponse, successResponse } from "@/lib/server/api-response";
import { listMedalmadeInventory, createMedalmadeItem } from "@/lib/db";
import { roleHasPermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return errorResponse("Authentication required", 401);
  if (!await roleHasPermission(user.role, "plaque.view", user.permissions))
    return errorResponse("Access denied: insufficient permissions", 403);

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50", 10);
  const category = searchParams.get("category") ?? undefined;
  const sortBy = searchParams.get("sortBy") ?? undefined;

  const result = await listMedalmadeInventory(search, category, sortBy, page, pageSize);
  return successResponse(result);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return errorResponse("Authentication required", 401);
  if (!await roleHasPermission(user.role, "plaque.create", user.permissions))
    return errorResponse("Access denied: insufficient permissions", 403);

  const body = await req.json();
  const item = await createMedalmadeItem(body);
  return successResponse(item, 201);
}
