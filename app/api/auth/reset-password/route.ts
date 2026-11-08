import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb, initDbSchema } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/security";
import { logAudit } from "@/lib/logger";

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent") || "";

  // Rate limit: maks 10 percobaan per 15 menit
  const limiter = checkRateLimit(`reset-pwd:${ip}`, 10, 15 * 60 * 1000);
  if (!limiter.allowed) {
    return NextResponse.json(
      {
        status: "error",
        message: `Terlalu banyak percobaan reset password. Harap tunggu ${limiter.resetInSec} detik.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const token = body?.token ? String(body.token).trim() : "";
    const newPassword = body?.newPassword ? String(body.newPassword).trim() : "";

    if (!token || !newPassword) {
      return NextResponse.json(
        { status: "error", message: "Token dan password baru wajib diisi." },
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

    // Cari user dengan reset_token yang masih valid (belum kedaluwarsa)
    const matchingUsers = await sql`
      SELECT id, username, role, reset_token_expires_at 
      FROM users 
      WHERE reset_token = ${token} 
        AND reset_token_expires_at > CURRENT_TIMESTAMP 
      LIMIT 1
    `;

    if (matchingUsers.length === 0) {
      await logAudit({
        action: "auth:reset_password_failed",
        ipAddress: ip,
        userAgent,
        status: "warning",
        details: { reason: "Invalid or expired token" },
      });
      return NextResponse.json(
        { status: "error", message: "Token reset password tidak valid atau sudah kedaluwarsa." },
        { status: 400 }
      );
    }

    const user = matchingUsers[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password dan kosongkan reset_token agar tidak bisa dipakai ulang
    await sql`
      UPDATE users 
      SET password = ${hashedPassword}, reset_token = NULL, reset_token_expires_at = NULL 
      WHERE id = ${user.id}
    `;

    await logAudit({
      userId: user.id,
      username: user.username,
      role: user.role,
      action: "auth:reset_password_completed",
      ipAddress: ip,
      userAgent,
      status: "success",
    });

    return NextResponse.json({
      status: "success",
      message: "Password berhasil diperbarui. Silakan login dengan password baru Anda.",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal mereset password." },
      { status: 500 }
    );
  }
}
