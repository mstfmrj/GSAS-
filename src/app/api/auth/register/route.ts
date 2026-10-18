/**
 * src/app/api/auth/register/route.ts
 *
 * PURPOSE:
 * API route handler for public or admin user registration and initial password hashing.
 */

import { NextRequest, NextResponse } from "next/server";
import { createUser, findUserByUsername, findUserByEmail } from "@/lib/db";
import { signJwt, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, email, name, password } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Username, email, and password are required" },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedUsername.length < 3) {
      return NextResponse.json(
        { success: false, error: "Username must be at least 3 characters long" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    const existingUser = await findUserByUsername(trimmedUsername);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: `Username "${trimmedUsername}" is already taken` },
        { status: 409 }
      );
    }

    const existingEmail = await findUserByEmail(trimmedEmail);
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: `Email "${trimmedEmail}" is already registered` },
        { status: 409 }
      );
    }

    const newUser = await createUser({
      username: trimmedUsername,
      email: trimmedEmail,
      name: name?.trim() || trimmedUsername,
      passwordPlain: password,
      role: "viewer",
    });

    const token = await signJwt({
      userId: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
    });

    const response = NextResponse.json({
      success: true,
      message: "Account registered successfully",
      data: { user: newUser, token },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    console.error("Register error:", error);
    const message = error instanceof Error ? error.message : "Failed to register account";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
