/**
 * src/app/api/auth/forgot-password/route.ts
 *
 * PURPOSE:
 * API route handler for sending password reset verification codes.
 */

import { randomInt } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createPasswordResetCode, deletePasswordResetCode } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    const codeSecret = process.env.PASSWORD_RESET_CODE_SECRET;
    if (!apiKey || !from || !codeSecret || Buffer.byteLength(codeSecret) < 32) {
      console.error("Password reset email is not configured.");
      return NextResponse.json(
        { success: false, error: "Password recovery is not configured. Please contact an administrator." },
        { status: 503 }
      );
    }

    const code = String(randomInt(100_000, 1_000_000));
    const reset = await createPasswordResetCode(email, code);
    if (!reset?.created) {
      return NextResponse.json({
        success: true,
        message: "If an account exists for that email, a verification code will be sent.",
      });
    }

    const delivery = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [reset.email],
        subject: "Your GORD password reset code",
        text: `Your password reset code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
        html: `<p>Your GORD password reset code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>`,
      }),
    });

    if (!delivery.ok) {
      console.error(`Password reset email delivery failed (${delivery.status}).`);
      await deletePasswordResetCode(reset.userId);
      return NextResponse.json(
        { success: false, error: "Could not send the verification code. Please try again later." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists for that email, a verification code will be sent.",
    });
  } catch (error: unknown) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, error: "Could not process the password reset request. Please try again later." },
      { status: 500 }
    );
  }
}
