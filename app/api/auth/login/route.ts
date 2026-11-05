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

    await initDbSchema();
    const sql = getDb();

    const users = await sql`
      SELECT id, username, password, role FROM users 
      WHERE LOWER(username) = LOWER(${username}) 
      LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Username atau password salah." },
        { status: 401 }
      );
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { status: "error", message: "Username atau password salah." },
        { status: 401 }
      );
    }

    // Set HTTP-Only Cookie with role
    await setSessionCookie({
      userId: Number(user.id),
      username: String(user.username),
      role: String(user.role || "user"),
    });

    return NextResponse.json({
      status: "success",
      message: "Login berhasil.",
      user: { id: user.id, username: user.username, role: user.role || "user" },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal memproses login." },
      { status: 500 }
    );
  }
}
