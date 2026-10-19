






import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifyJwt } from "@/lib/auth";
import { findUserById, sanitizeUser, updateLastSeen } from "@/lib/db";
import { getPermissionsForUser, getRoleName } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const token =
      req.cookies.get(AUTH_COOKIE_NAME)?.value ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const payload = await verifyJwt(token);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    const user = await findUserById(payload.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User no longer exists" },
        { status: 404 }
      );
    }

    if (user.isBlocked) {
      const response = NextResponse.json(
        { success: false, error: "Account has been banned" },
        { status: 403 }
      );
      response.cookies.delete(AUTH_COOKIE_NAME);
      return response;
    }

    await updateLastSeen(payload.userId);

    const safeUser = sanitizeUser(user);
    return NextResponse.json({
      success: true,
      data: {
        user: {
          ...safeUser,
          roleName: safeUser.roleName ?? await getRoleName(safeUser.role),
          permissions: await getPermissionsForUser(safeUser),
        },
      },
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication check failed" },
      { status: 500 }
    );
  }
}
