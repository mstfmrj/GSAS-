/**
 * src/lib/server/api-response.ts
 *
 * PURPOSE:
 * Standardized JSON response formatters for success and error HTTP payloads.
 */

import { NextResponse } from "next/server";

export function successResponse(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}
