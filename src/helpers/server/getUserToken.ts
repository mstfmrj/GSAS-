






import { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

export function getUserToken(req: NextRequest): string | null {
  const tokenFromCookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (tokenFromCookie) return tokenFromCookie;

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return null;
}
