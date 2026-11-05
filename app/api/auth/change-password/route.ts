import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionUser } from "@/lib/auth";
import { getDb, initDbSchema } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const oldPassword = body?.oldPassword ? String(body.oldPassword).trim() : "";
    const newPassword = body?.newPassword ? String(body.newPassword).trim() : "";

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { status: "error", message: "Password lama dan password baru wajib diisi." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { status: "error", message: "Password baru minimal 6 karakter." },
        { status: 400 }
      );
    }

    await initDbSchema();
    const sql = getDb();

    // Ambil password hash saat ini
    const users = await sql`
      SELECT id, password FROM users WHERE id = ${session.userId} LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    const user = users[0];
    const isOldValid = await bcrypt.compare(oldPassword, user.password);

    if (!isOldValid) {
      return NextResponse.json(
        { status: "error", message: "Password lama yang Anda masukkan salah." },
        { status: 400 }
      );
    }

    // Hash password baru dengan bcrypt salt 10
    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    await sql`
      UPDATE users SET password = ${newHashedPassword} WHERE id = ${session.userId}
    `;

    return NextResponse.json({
      status: "success",
      message: "Password Anda berhasil diperbarui.",
    });
  } catch (error: any) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal mengubah password." },
      { status: 500 }
    );
  }
}
