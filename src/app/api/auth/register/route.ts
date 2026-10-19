import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { success: false, error: "Public registration has been disabled." },
    { status: 410 }
  );
}
