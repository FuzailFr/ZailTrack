import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, initDbSchema } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
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

    // Simpan user baru (role default 'user')
    const insertResult = await sql`
      INSERT INTO users (username, password, role)
      VALUES (${username}, ${hashedPassword}, 'user')
      RETURNING id, username, role
    `;

    const newUser = insertResult[0];

    // Buat sesi login otomatis via HTTP-Only cookie
    await setSessionCookie({
      userId: Number(newUser.id),
      username: String(newUser.username),
      role: String(newUser.role || "user"),
    });

    return NextResponse.json({
      status: "success",
      message: "Akun berhasil dibuat.",
      user: { id: newUser.id, username: newUser.username, role: newUser.role || "user" },
    });
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal memproses registrasi." },
      { status: 500 }
    );
  }
}
