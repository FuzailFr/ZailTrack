import { NextResponse } from "next/server";
import { getDb, initDbSchema } from "@/lib/db";
import { checkRateLimit, generateOneTimeToken, hashToken, getClientIp, getClientRegion } from "@/lib/security";
import { logAudit } from "@/lib/logger";

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const region = getClientRegion(request.headers, ip);
  const userAgent = request.headers.get("user-agent") || "";

  // Rate limit: maks 5 permintaan per 10 menit per IP
  const limiter = checkRateLimit(`forgot-pwd:${ip}`, 5, 10 * 60 * 1000);
  if (!limiter.allowed) {
    return NextResponse.json(
      {
        status: "error",
        message: `Terlalu banyak permintaan reset password. Silakan tunggu ${limiter.resetInSec} detik.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const username = body?.username ? String(body.username).trim() : "";

    if (!username) {
      return NextResponse.json(
        { status: "error", message: "Username wajib diisi." },
        { status: 400 }
      );
    }

    await initDbSchema();
    const sql = getDb();

    const users = await sql`
      SELECT id, username, telegram_chat_id, status 
      FROM users 
      WHERE LOWER(username) = LOWER(${username}) 
      LIMIT 1
    `;

    // Proteksi timing attack & user enumeration: jika user tidak ada, tetap beri pesan netral
    if (users.length === 0) {
      await logAudit({
        action: "auth:forgot_password_not_found",
        username,
        ipAddress: ip,
        region,
        userAgent,
        status: "warning",
      });
      return NextResponse.json({
        status: "success",
        message: "Jika akun ditemukan, instruksi reset password telah dibuat.",
      });
    }

    const user = users[0];

    if (user.status === "banned") {
      return NextResponse.json(
        { status: "error", message: "Akun ini telah dinonaktifkan (BANNED)." },
        { status: 403 }
      );
    }

    // Buat token satu kali pakai berlaku 1 jam (disimpan dalam bentuk cryptographic SHA-256 hash)
    const resetToken = generateOneTimeToken();
    const hashedResetToken = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 jam

    await sql`
      UPDATE users 
      SET reset_token = ${hashedResetToken}, reset_token_expires_at = ${expiresAt}
      WHERE id = ${user.id}
    `;

    await logAudit({
      userId: user.id,
      username: user.username,
      action: "auth:forgot_password_requested",
      ipAddress: ip,
      region,
      userAgent,
      status: "success",
      details: { expiresAt: expiresAt.toISOString() },
    });

    const resetLink = `/reset-password?token=${resetToken}`;

    return NextResponse.json({
      status: "success",
      message: "Token reset password berhasil dibuat (berlaku 1 jam).",
      resetLink,
      token: resetToken,
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal memproses permintaan reset password." },
      { status: 500 }
    );
  }
}
