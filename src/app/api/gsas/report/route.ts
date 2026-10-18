/**
 * src/app/api/gsas/report/route.ts
 *
 * PURPOSE:
 * API route handler for generating GSAS certification aggregation statistics and pivot matrices.
 */

import { NextRequest } from "next/server";
import { getAuthUser } from "@/helpers/server/getAuthUser";
import { errorResponse, successResponse } from "@/lib/server/api-response";
import { getGSASReportRows } from "@/lib/db";
import { roleHasPermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return errorResponse("Authentication required", 401);
  if (!(await roleHasPermission(user.role, "gsas.view", user.permissions))) {
    return errorResponse("Access denied: insufficient permissions", 403);
  }

  const rows = await getGSASReportRows();
  return successResponse(rows);
}
