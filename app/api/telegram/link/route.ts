import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb, initDbSchema } from "@/lib/db";
import crypto from "crypto";

const BOT_USERNAME = "zailtrack_personal_bot";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
    }

    await initDbSchema();
    const sql = getDb();

    const users = await sql`
      SELECT id, username, telegram_chat_id, telegram_link_code 
      FROM users 
      WHERE id = ${session.userId} 
      LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json({ status: "error", message: "User not found" }, { status: 404 });
    }

    const user = users[0];
    let linkCode = user.telegram_link_code;

    // Jika belum punya kode link unik, generate kode baru
    if (!linkCode && !user.telegram_chat_id) {
      linkCode = "zt_" + crypto.randomBytes(4).toString("hex");
      await sql`
        UPDATE users SET telegram_link_code = ${linkCode} WHERE id = ${session.userId}
      `;
    }

    return NextResponse.json({
      status: "success",
      is_linked: Boolean(user.telegram_chat_id),
      telegram_chat_id: user.telegram_chat_id,
      bot_username: BOT_USERNAME,
      deep_link: linkCode ? `https://t.me/${BOT_USERNAME}?start=${linkCode}` : null,
    });
  } catch (error: any) {
    console.error("Telegram link get error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 });
    }

    const sql = getDb();
    await sql`
      UPDATE users 
      SET telegram_chat_id = NULL, telegram_link_code = NULL 
      WHERE id = ${session.userId}
    `;

    return NextResponse.json({
      status: "success",
      message: "Akun Telegram berhasil diputuskan dari ZailTrack.",
    });
  } catch (error: any) {
    console.error("Telegram unlink error:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
