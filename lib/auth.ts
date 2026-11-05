import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "zailtrack_session";

function getSecretKey(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ||
    "zailtrack-fallback-development-secret-key-32chars-min";
  return new TextEncoder().encode(secret);
}

export interface UserPayload {
  userId: number;
  username: string;
  role: string;
}

// Generate JWT token 7 hari untuk sesi web browser
export async function signToken(payload: UserPayload): Promise<string> {
  const secretKey = getSecretKey();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

// Generate token jangka panjang (365 hari) khusus integrasi Google Sheets
export async function signFeedToken(userId: number, username: string): Promise<string> {
  const secretKey = getSecretKey();
  return new SignJWT({ userId, username, scope: "sheets_feed" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
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
    const { payload } = await jwtVerify(token, secretKey);
    return {
      userId: Number(payload.userId),
      username: String(payload.username),
      role: String(payload.role || "user"),
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
