/**
 * src/app/api/data/stats/route.ts
 *
 * PURPOSE:
 * API route handler providing platform health diagnostics, user counts, and server timestamp.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllUsers } from "@/lib/db";
import { roleHasPermission } from "@/lib/permissions";
import { getAuthUser } from "@/helpers/server/getAuthUser";

export async function GET(req: NextRequest) {
  const session = await getAuthUser(req);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized access: Please login first." },
      { status: 401 }
    );
  }

  if (!(await roleHasPermission(session.role, "dashboard.view", session.permissions))) {
    return NextResponse.json(
      { success: false, error: "Access denied: insufficient permissions" },
      { status: 403 }
    );
  }

  const allUsers = await getAllUsers();

  return NextResponse.json({
    success: true,
    data: {
      serverTime: new Date().toISOString(),
      authenticatedUser: session.username,
      userRole: session.role,
      totalRegisteredUsers: allUsers.length,
      systemStatus: "Healthy",
      environment: process.env.NODE_ENV || "development",
      features: [
        "Modern Next.js App Router",
        "Dynamic Responsive UI System",
        "JWT Authentication with HTTP-Only Cookies",
        "Bcrypt Password Hashing",
        "Role-Based Route Protection",
        "PostgreSQL Persistent Data Store",
      ],
    },
  });
}
