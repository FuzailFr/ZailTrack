import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, initDbSchema } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { checkRateLimit, getClientIp, getClientRegion } from "@/lib/security";
import { logAudit } from "@/lib/logger";

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const region = getClientRegion(request.headers, ip);
  const userAgent = request.headers.get("user-agent") || "";

  // 1. Rate limiting: Maksimal 10 percobaan per IP per 5 menit
  const limiter = checkRateLimit(`login:${ip}`, 10, 5 * 60 * 1000);
  if (!limiter.allowed) {
    await logAudit({
      action: "auth:rate_limited",
      ipAddress: ip,
      region,
      userAgent,
      status: "warning",
      details: { reason: "Too many login attempts", ip },
    });
    return NextResponse.json(
      {
        status: "error",
        message: `Terlalu banyak percobaan login. Harap coba lagi dalam ${limiter.resetInSec} detik.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const username = body?.username ? String(body.username).trim() : "";
    const password = body?.password ? String(body.password).trim() : "";

    if (!username || !password) {
      return NextResponse.json(
        { status: "error", message: "Username dan password wajib diisi." },
        { status: 400 }
      );
    }

    await initDbSchema();
    const sql = getDb();

    const users = await sql`
      SELECT id, username, password, role, status FROM users 
      WHERE LOWER(username) = LOWER(${username}) 
      LIMIT 1
    `;

    if (users.length === 0) {
      await logAudit({
        action: "auth:login_failed",
        username,
        ipAddress: ip,
        userAgent,
        status: "warning",
        details: { reason: "User not found" },
      });
      return NextResponse.json(
        { status: "error", message: "Username atau password salah." },
        { status: 401 }
      );
    }

    const user = users[0];

    // Cek status akun (banned / suspended)
    if (user.status === "banned") {
      await logAudit({
        userId: user.id,
        username: user.username,
        role: user.role,
        action: "auth:login_blocked",
        ipAddress: ip,
        userAgent,
        status: "error",
        details: { reason: "Account is banned" },
      });
      return NextResponse.json(
        { status: "error", message: "Akun ini telah dinonaktifkan permanen (BANNED). Hubungi administrator." },
        { status: 403 }
      );
    }

    if (user.status === "suspended") {
      await logAudit({
        userId: user.id,
        username: user.username,
        role: user.role,
        action: "auth:login_blocked",
        ipAddress: ip,
        userAgent,
        status: "warning",
        details: { reason: "Account is suspended" },
      });
      return NextResponse.json(
        { status: "error", message: "Akun ini sedang ditangguhkan sementara (SUSPENDED). Hubungi administrator." },
        { status: 403 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await logAudit({
        userId: user.id,
        username: user.username,
        role: user.role,
        action: "auth:login_failed",
        ipAddress: ip,
        userAgent,
        status: "warning",
        details: { reason: "Invalid password" },
      });
      return NextResponse.json(
        { status: "error", message: "Username atau password salah." },
        { status: 401 }
      );
    }

    // Update last_active_at
    await sql`
      UPDATE users 
      SET last_active_at = CURRENT_TIMESTAMP 
      WHERE id = ${user.id}
    `;

    // Set HTTP-Only Cookie with role & status
    await setSessionCookie({
      userId: Number(user.id),
      username: String(user.username),
      role: String(user.role || "user"),
      status: String(user.status || "active"),
    });

    // Catat log audit login berhasil
    await logAudit({
      userId: user.id,
      username: user.username,
      role: user.role,
      action: "auth:login",
      ipAddress: ip,
      region,
      userAgent,
      status: "success",
    });

    return NextResponse.json({
      status: "success",
      message: "Login berhasil.",
      user: {
        id: user.id,
        username: user.username,
        role: user.role || "user",
        status: user.status || "active",
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal memproses login." },
      { status: 500 }
    );
  }
}
