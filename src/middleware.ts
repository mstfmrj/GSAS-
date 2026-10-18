import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = process.env.JWT_SECRET || "fallback_default_jwt_secret_antigravity_key_987654321";

const key = new TextEncoder().encode(SECRET_KEY);

const AUTH_COOKIE_NAME = "auth_token";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;

  const isProtectedPath =
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/users");

  let isValidSession = false;
  let isAdminSession = false;

  if (token) {
    try {

      const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
      isValidSession = true;

      isAdminSession = payload.role === "admin" || payload.role === "super_admin";
    } catch {

      isValidSession = false;
    }
  }

  if (isProtectedPath && !isValidSession) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && isValidSession) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname === "/register" && isValidSession && !isAdminSession) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/users/:path*", "/login", "/register"],
};
