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

  // Rate limit pendaftaran: maks 5 akun per IP per 10 menit
  const limiter = checkRateLimit(`register:${ip}`, 5, 10 * 60 * 1000);
  if (!limiter.allowed) {
    return NextResponse.json(
      {
        status: "error",
        message: `Terlalu banyak permintaan pendaftaran dari jaringan Anda. Coba lagi dalam ${limiter.resetInSec} detik.`,
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

    if (username.length < 3 || username.length > 50) {
      return NextResponse.json(
        { status: "error", message: "Username harus antara 3 - 50 karakter." },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { status: "error", message: "Username hanya boleh huruf, angka, dan garis bawah (_)." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { status: "error", message: "Password minimal 6 karakter." },
        { status: 400 }
      );
    }

    // Pastikan skema tabel sudah siap
    await initDbSchema();
    const sql = getDb();

    // Cek apakah username sudah ada
    const existing = await sql`
      SELECT id FROM users WHERE LOWER(username) = LOWER(${username}) LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { status: "error", message: "Username sudah terdaftar. Silakan gunakan username lain." },
        { status: 409 }
      );
    }

    // Hash password dengan bcrypt salt 10
    const hashedPassword = await bcrypt.hash(password, 10);

    // Simpan user baru (role default 'user', status 'active')
    const insertResult = await sql`
      INSERT INTO users (username, password, role, status, last_active_at)
      VALUES (${username}, ${hashedPassword}, 'user', 'active', CURRENT_TIMESTAMP)
      RETURNING id, username, role, status
    `;

    const newUser = insertResult[0];

    // Buat sesi login otomatis via HTTP-Only cookie
    await setSessionCookie({
      userId: Number(newUser.id),
      username: String(newUser.username),
      role: String(newUser.role || "user"),
      status: String(newUser.status || "active"),
    });

    await logAudit({
      userId: newUser.id,
      username: newUser.username,
      role: newUser.role,
      action: "auth:register",
      ipAddress: ip,
      region,
      userAgent,
      status: "success",
    });

    return NextResponse.json({
      status: "success",
      message: "Akun berhasil dibuat.",
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role || "user",
        status: newUser.status || "active",
      },
    });
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal memproses registrasi." },
      { status: 500 }
    );
  }
}
