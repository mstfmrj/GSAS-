import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { success: false, error: "Password sign-in has been disabled. Use Microsoft sign-in." },
    { status: 410 }
  );
}
