import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/auth";
import { getDb, initDbSchema } from "@/lib/db";
import { logAudit } from "@/lib/logger";
import { getClientIp } from "@/lib/security";

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session || !hasAdminAccess(session.role)) {
      return NextResponse.json(
        { status: "error", message: "Akses ditolak. Fitur ini khusus Admin/Developer." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const { backup, confirmRisk } = body || {};

    if (!confirmRisk) {
      return NextResponse.json(
        {
          status: "error",
          requiresConfirmation: true,
          message: "Operasi restore database berisiko tinggi dan dapat menimpa data yang ada. Harap centang konfirmasi risiko sebelum melanjutkan.",
        },
        { status: 400 }
      );
    }

    if (!backup || !backup.data || !Array.isArray(backup.data.transactions)) {
      return NextResponse.json(
        { status: "error", message: "Format file backup tidak valid atau rusak." },
        { status: 400 }
      );
    }

    await initDbSchema();
    const sql = getDb();

    let usersRestored = 0;
    let txRestored = 0;

    // 1. Restore Users (jika belum ada, tambahkan; jika sudah ada, skip)
    if (Array.isArray(backup.data.users)) {
      for (const u of backup.data.users) {
        if (!u.username || !u.password) continue;
        const exists = await sql`SELECT id FROM users WHERE LOWER(username) = LOWER(${u.username}) LIMIT 1`;
        if (exists.length === 0) {
          await sql`
            INSERT INTO users (username, password, role, status, telegram_chat_id, created_at)
            VALUES (${u.username}, ${u.password}, ${u.role || "user"}, ${u.status || "active"}, ${u.telegram_chat_id || null}, ${u.created_at || new Date().toISOString()})
          `;
          usersRestored++;
        }
      }
    }

    // 2. Restore Transactions
    for (const tx of backup.data.transactions) {
      if (!tx.user_id || !tx.tipe || !tx.jumlah || !tx.tanggal) continue;
      // Pastikan user pemilik transaksi ada
      const userCheck = await sql`SELECT id FROM users WHERE id = ${tx.user_id} LIMIT 1`;
      if (userCheck.length > 0) {
        await sql`
          INSERT INTO transactions (user_id, tipe, jumlah, deskripsi, tanggal)
          VALUES (${tx.user_id}, ${tx.tipe}, ${tx.jumlah}, ${tx.deskripsi || ""}, ${tx.tanggal})
        `;
        txRestored++;
      }
    }

    const ip = getClientIp(request.headers);
    await logAudit({
      userId: session.userId,
      username: session.username,
      role: session.role,
      action: "db:restore",
      details: { usersRestored, transactionsRestored: txRestored },
      ipAddress: ip,
      status: "success",
    });

    return NextResponse.json({
      status: "success",
      message: `Pemulihan selesai! Berhasil memulihkan ${usersRestored} akun baru dan ${txRestored} catatan transaksi.`,
      restored: {
        users: usersRestored,
        transactions: txRestored,
      },
    });
  } catch (error: any) {
    console.error("Restore database error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal memproses pemulihan database." },
      { status: 500 }
    );
  }
}
