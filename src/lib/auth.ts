import { SignJWT, jwtVerify } from "jose";
import { SessionPayload } from "./types";

const SECRET_KEY = process.env.JWT_SECRET || "fallback_default_jwt_secret_antigravity_key_987654321";
const key = new TextEncoder().encode(SECRET_KEY);

export const AUTH_COOKIE_NAME = "auth_token";


export async function signJwt(payload: SessionPayload, expiresIn = "7d"): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

export async function verifyJwt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
