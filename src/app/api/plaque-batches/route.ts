/**
 * src/app/api/plaque-batches/route.ts
 *
 * PURPOSE:
 * API route handler for Plaque Printing Batches list retrieval (GET) and new batch creation (POST).
 */

import { NextRequest } from "next/server";
import { getAuthUser } from "@/helpers/server/getAuthUser";
import { errorResponse, successResponse } from "@/lib/server/api-response";
import { listPlaqueBatches, createPlaqueBatch } from "@/lib/db";
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
  const status = searchParams.get("status") ?? undefined;
  const rating = searchParams.get("rating") ?? undefined;
  const sortBy = searchParams.get("sortBy") ?? undefined;
  const year = searchParams.get("year") ?? undefined;
  const month = searchParams.get("month") ?? undefined;
  const day = searchParams.get("day") ?? undefined;

  const result = await listPlaqueBatches(search, page, pageSize, status, rating, sortBy, year, month, day);
  return successResponse(result);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return errorResponse("Authentication required", 401);
  if (!await roleHasPermission(user.role, "plaque.create", user.permissions))
    return errorResponse("Access denied: insufficient permissions", 403);

  const body = await req.json();
  const item = await createPlaqueBatch(body);
  return successResponse(item, 201);
}
