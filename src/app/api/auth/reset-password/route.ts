import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { success: false, error: "Password recovery has been disabled." },
    { status: 410 }
  );
}
