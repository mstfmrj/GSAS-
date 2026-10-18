/**
 * src/app/api/auth/login/route.ts
 *
 * PURPOSE:
 * API route handler for validating credentials and issuing JWT authentication tokens.
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByUsernameOrEmail, sanitizeUser, recordSessionStart } from "@/lib/db";
import { signJwt, AUTH_COOKIE_NAME } from "@/lib/auth";
import { getPermissionsForUser, getRoleName } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = body.identifier || body.username || body.email;
    const { password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: "Username/email and password are required" },
        { status: 400 }
      );
    }

    const user = await findUserByUsernameOrEmail(identifier);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid username/email or password" },
        { status: 401 }
      );
    }

    if (user.isBlocked) {
      return NextResponse.json(
        { success: false, error: "This account has been banned/blocked by an administrator." },
        { status: 403 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: "Invalid username/email or password" },
        { status: 401 }
      );
    }

    await recordSessionStart(user.id);

    const token = await signJwt({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    const sanitizedUser = sanitizeUser(user);
    const safeUser = {
      ...sanitizedUser,
      roleName: sanitizedUser.roleName ?? await getRoleName(sanitizedUser.role),
      permissions: await getPermissionsForUser(sanitizedUser),
    };
    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      data: { user: safeUser, token },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error occurred during login" },
      { status: 500 }
    );
  }
}
