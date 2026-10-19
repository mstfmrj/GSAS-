






import { NextRequest } from "next/server";
import { verifyJwt } from "@/lib/auth";
import { getUserToken } from "./getUserToken";
import { SessionPayload } from "@/lib/types";
import { findUserById } from "@/lib/db";
import { getPermissionsForUser } from "@/lib/permissions";

export async function getAuthUser(req: NextRequest): Promise<SessionPayload | null> {
  const token = getUserToken(req);
  if (!token) return null;

  let payload: SessionPayload;
  try {
    const verified = await verifyJwt(token);
    if (!verified) return null;
    payload = verified;
  } catch {
    return null;
  }

  if (!payload.userId) return null;
  const user = await findUserById(payload.userId);
  if (!user || user.isBlocked) return null;
  const permissions = await getPermissionsForUser(user);

  return {
    ...payload,
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    roleName: user.roleName,
    permissions,
  };
}
