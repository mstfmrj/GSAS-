import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import {
  createUser,
  claimPendingUser,
  findPendingUserByEmail,
  findUserByEmail,
  requestPendingUser,
  recordSessionStart,
  updateUser,
} from "@/lib/db";
import { signJwt, AUTH_COOKIE_NAME } from "@/lib/auth";
import { getPermissionsForUser, getRoleName } from "@/lib/permissions";
import type { User } from "@/lib/types";

const SUPER_ADMIN_EMAIL = (process.env.MICROSOFT_SUPER_ADMIN_EMAIL || "mstf.meraj@gmail.com").trim().toLowerCase();

export async function POST() {
  if (process.env.MICROSOFT_LOGIN_ENABLED !== "true") {
    return NextResponse.json({ success: false, error: "Microsoft sign-in is disabled" }, { status: 403 });
  }

  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ success: false, error: "Microsoft sign-in required" }, { status: 401 });
  }

  try {
    let user: User | undefined = await findUserByEmail(email);
    const name = session?.user?.name?.trim() || email.split("@")[0];

    if (!user) {
      user = await claimPendingUser(email, name);
      if (!user) user = await findUserByEmail(email);
    }

    if (!user && email !== SUPER_ADMIN_EMAIL) {
      let pendingUser = await findPendingUserByEmail(email);
      if (!pendingUser) pendingUser = await requestPendingUser(email, name);
      if (pendingUser.approved) {
        user = await claimPendingUser(email, name);
        if (!user) user = await findUserByEmail(email);
      }
      if (!user) {
        const response = NextResponse.json({
          success: true,
          data: { status: "pending", email: pendingUser.email },
        });
        response.cookies.set(AUTH_COOKIE_NAME, "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 0,
          path: "/",
        });
        return response;
      }
    }

    if (!user) {
      const baseUsername = (email.split("@")[0].replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 40) || "microsoft-user");
      user = await createUser({
        username: `${baseUsername}-${crypto.randomUUID().slice(0, 8)}`,
        email,
        name,

        passwordPlain: crypto.randomUUID() + crypto.randomUUID(),


        role: "viewer",
      });
    }

    if (user.isBlocked) {
      return NextResponse.json({ success: false, error: "This account is blocked" }, { status: 403 });
    }

    if (email === SUPER_ADMIN_EMAIL && user.role !== "super_admin") {
      user = await updateUser({ id: user.id, role: "super_admin" });
    }

    await recordSessionStart(user.id);
    const token = await signJwt({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
    const safeUser = {
      ...user,
      roleName: user.roleName ?? await getRoleName(user.role),
      permissions: await getPermissionsForUser(user),
    };

    const response = NextResponse.json({ success: true, data: { status: "active", user: safeUser } });
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Microsoft account setup failed:", error);
    return NextResponse.json({ success: false, error: "Unable to set up this Microsoft account" }, { status: 500 });
  }
}
