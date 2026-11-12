import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const COOKIE_NAME = "zailtrack_session";
export const JWT_ISSUER = "zailtrack";
export const JWT_AUDIENCE = "zailtrack-app";

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: JWT_SECRET environment variable is missing in production!");
    }
    return new TextEncoder().encode("zailtrack-dev-only-secret-key-32chars-min");
  }
  return new TextEncoder().encode(secret);
}

export interface UserPayload {
  userId: number;
  username: string;
  role: "user" | "admin" | "developer" | string;
  status?: "active" | "suspended" | "banned" | string;
}

// Otoritas peran (Role-Based Access Control)
export function hasAdminAccess(role?: string): boolean {
  return role === "admin" || role === "developer";
}

export function hasDevAccess(role?: string): boolean {
  return role === "developer";
}

// Generate JWT token 7 hari untuk sesi web browser
export async function signToken(payload: UserPayload): Promise<string> {
  const secretKey = getSecretKey();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime("7d")
    .sign(secretKey);
}

// Generate token jangka panjang (365 hari) khusus integrasi Google Sheets
export async function signFeedToken(userId: number, username: string): Promise<string> {
  const secretKey = getSecretKey();
  return new SignJWT({ userId, username, scope: "sheets_feed" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setExpirationTime("365d")
    .sign(secretKey);
}

// Verifikasi Feed Token Google Sheets
export async function verifyFeedToken(token: string): Promise<{ userId: number; username: string } | null> {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    if (payload.scope !== "sheets_feed") return null;
    return {
      userId: Number(payload.userId),
      username: String(payload.username),
    };
  } catch {
    return null;
  }
}

// Verifikasi JWT token sesi browser
export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      clockTolerance: 15,
    });
    return {
      userId: Number(payload.userId),
      username: String(payload.username),
      role: String(payload.role || "user"),
      status: String(payload.status || "active"),
    };
  } catch {
    return null;
  }
}

// Set HTTP-Only Cookie (Anti-XSS, tidak bisa diakses lewat JavaScript)
export async function setSessionCookie(payload: UserPayload) {
  const token = await signToken(payload);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 hari
  });
}

// Ambil sesi user saat ini dari Cookie
export async function getSessionUser(): Promise<UserPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// Hapus sesi / Logout
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
