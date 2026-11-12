import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "zailtrack_session";

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || "zailtrack-dev-only-secret-key-32chars-min";
  return new TextEncoder().encode(secret);
}

interface DecodedSession {
  userId: number;
  username: string;
  role: string;
  status: string;
}

async function verifySessionToken(token?: string): Promise<DecodedSession | null> {
  if (!token) return null;
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // 1. Validasi CSRF Origin untuk mutasi API berbasis cookie
  if (pathname.startsWith("/api/")) {
    const method = request.method.toUpperCase();
    if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
      // Kecualikan webhook dan feed pihak ketiga yang menggunakan token URL / secret header
      const isPublicEndpoint =
        pathname.startsWith("/api/telegram/") ||
        pathname.startsWith("/api/sheets/feed") ||
        pathname.startsWith("/api/auth/login") ||
        pathname.startsWith("/api/auth/register") ||
        pathname.startsWith("/api/auth/forgot-password") ||
        pathname.startsWith("/api/auth/reset-password") ||
        pathname.startsWith("/api/analytics/collect");

      if (!isPublicEndpoint) {
        const origin = request.headers.get("origin");
        const host = request.headers.get("host");
        if (origin && host) {
          try {
            const originHost = new URL(origin).host;
            if (originHost !== host) {
              return NextResponse.json(
                { status: "error", message: "Forbidden: CSRF validation failed." },
                { status: 403 }
              );
            }
          } catch {
            return NextResponse.json(
              { status: "error", message: "Forbidden: Invalid Origin header." },
              { status: 403 }
            );
          }
        }
      }
    }
  }

  // 2. Proteksi Akses Halaman Dashboard (/dashboard)
  if (pathname.startsWith("/dashboard")) {
    const session = await verifySessionToken(token);
    if (!session || session.status === "banned") {
      const loginUrl = new URL("/", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const response = NextResponse.redirect(loginUrl);
      if (session?.status === "banned") {
        response.cookies.delete(COOKIE_NAME);
      }
      return response;
    }
  }

  // 3. Proteksi Akses Halaman Admin (/admin) — Role-Based Access Control
  if (pathname.startsWith("/admin")) {
    const session = await verifySessionToken(token);
    if (!session || session.status === "banned") {
      const loginUrl = new URL("/", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (session.role !== "admin" && session.role !== "developer") {
      // Pengguna biasa dialihkan ke dashboard transaksi pribadi
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // 4. Pengalihan Halaman Auth (/) jika sudah login
  if (pathname === "/") {
    const session = await verifySessionToken(token);
    if (session && session.status !== "banned") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // 5. Injeksi Security Headers
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.svg, manifest.json
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.json).*)",
  ],
};
