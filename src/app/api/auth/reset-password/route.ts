/**
 * src/app/api/auth/reset-password/route.ts
 *
 * PURPOSE:
 * API route handler for validating verification codes and setting new account passwords.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkPasswordStrength } from "@/lib/passwordStrength";
import { resetPasswordWithCode, resetPasswordWithToken, verifyResetToken } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Missing reset token." },
      { status: 400 }
    );
  }

  const check = await verifyResetToken(token);
  if (!check.valid || !check.user) {
    return NextResponse.json(
      { success: false, error: check.error || "Invalid or expired reset token." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      username: check.user.username,
      email: check.user.email,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = typeof body?.token === "string" ? body.token : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (email || code) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code)) {
        return NextResponse.json(
          { success: false, error: "Enter the email address and six-digit code from the message." },
          { status: 400 }
        );
      }

      const codeSecret = process.env.PASSWORD_RESET_CODE_SECRET;
      if (!codeSecret || Buffer.byteLength(codeSecret) < 32) {
        return NextResponse.json(
          { success: false, error: "Password recovery is not configured. Please contact an administrator." },
          { status: 503 }
        );
      }

      const strength = checkPasswordStrength(newPassword);
      if (!Object.values(strength.checks).every(Boolean)) {
        return NextResponse.json(
          { success: false, error: "Use at least 8 characters, including uppercase, lowercase, a number, and a special character." },
          { status: 400 }
        );
      }

      const result = await resetPasswordWithCode(email, code, newPassword);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || "Failed to reset password." },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Your password has been successfully reset! You can now log in.",
      });
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Reset token is required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const result = await resetPasswordWithToken(token, newPassword);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to reset password." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Your password has been successfully reset! You can now log in.",
    });
  } catch (error: unknown) {
    console.error("Reset password error:", error);
    const message = error instanceof Error ? error.message : "Internal error resetting password.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
