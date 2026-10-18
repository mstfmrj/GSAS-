/**
 * src/app/api/gsas/summary/route.ts
 *
 * PURPOSE:
 * API route handler returning high-level project counts and chart distributions for the home dashboard.
 */

import { NextRequest } from "next/server";
import { getAuthUser } from "@/helpers/server/getAuthUser";
import { errorResponse, successResponse } from "@/lib/server/api-response";
import { getGSASDashboardSummary } from "@/lib/db";
import { roleHasPermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return errorResponse("Authentication required", 401);
  if (!(await roleHasPermission(user.role, "gsas.view", user.permissions)) && !(await roleHasPermission(user.role, "dashboard.view", user.permissions))) {
    return errorResponse("Access denied: insufficient permissions", 403);
  }

  const summary = await getGSASDashboardSummary();
  return successResponse(summary);
}
