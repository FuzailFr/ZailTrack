import { NextResponse } from "next/server";
import { getSessionUser, clearSessionCookie } from "@/lib/auth";
import { getDb, initDbSchema } from "@/lib/db";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json(
      { status: "error", message: "Unauthorized", authenticated: false },
      { status: 401 }
    );
  }

  try {
    await initDbSchema();
    const sql = getDb();

    const users = await sql`
      SELECT id, username, role, status, telegram_chat_id 
      FROM users WHERE id = ${session.userId} LIMIT 1
    `;

    if (users.length === 0) {
      await clearSessionCookie();
      return NextResponse.json(
        { status: "error", message: "User tidak ditemukan.", authenticated: false },
        { status: 401 }
      );
    }

    const user = users[0];

    // Jika akun di-suspend atau di-ban oleh admin, paksa logout
    if (user.status === "banned" || user.status === "suspended") {
      await clearSessionCookie();
      return NextResponse.json(
        {
          status: "error",
          message: `Akun Anda telah berstatus ${user.status.toUpperCase()}. Sesi dihentikan.`,
          authenticated: false,
        },
        { status: 403 }
      );
    }

    // Perbarui waktu aktif terakhir user (heartbeat / online tracking)
    await sql`
      UPDATE users 
      SET last_active_at = CURRENT_TIMESTAMP 
      WHERE id = ${user.id}
    `;

    return NextResponse.json({
      status: "success",
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role || "user",
        status: user.status || "active",
        telegram_chat_id: user.telegram_chat_id,
      },
    });
  } catch (err: any) {
    // Fallback ke session cookie jika database query bermasalah sementara
    return NextResponse.json({
      status: "success",
      authenticated: true,
      user: session,
    });
  }
}
