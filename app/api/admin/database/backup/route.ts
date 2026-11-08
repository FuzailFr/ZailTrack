import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/auth";
import { getDb, initDbSchema } from "@/lib/db";
import { logAudit } from "@/lib/logger";
import { getClientIp } from "@/lib/security";

export async function GET(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session || !hasAdminAccess(session.role)) {
      return NextResponse.json(
        { status: "error", message: "Akses ditolak. Fitur ini khusus Admin/Developer." },
        { status: 403 }
      );
    }

    await initDbSchema();
    const sql = getDb();

    // Export seluruh data tabel utama
    const [users, transactions, auditLogs, botLogs] = await Promise.all([
      sql`SELECT id, username, password, role, status, telegram_chat_id, created_at, last_active_at FROM users ORDER BY id ASC`,
      sql`SELECT id, user_id, tipe, jumlah, deskripsi, TO_CHAR(tanggal, 'YYYY-MM-DD') as tanggal, created_at FROM transactions ORDER BY id ASC`,
      sql`SELECT * FROM audit_logs ORDER BY id DESC LIMIT 500`,
      sql`SELECT * FROM bot_logs ORDER BY id DESC LIMIT 500`,
    ]);

    const backupData = {
      version: "2.2.0",
      timestamp: new Date().toISOString(),
      generator: "ZailTrack Local Admin Studio",
      counts: {
        users: users.length,
        transactions: transactions.length,
        auditLogs: auditLogs.length,
        botLogs: botLogs.length,
      },
      data: {
        users,
        transactions,
        auditLogs,
        botLogs,
      },
    };

    const ip = getClientIp(request.headers);
    await logAudit({
      userId: session.userId,
      username: session.username,
      role: session.role,
      action: "db:backup",
      details: { exportCounts: backupData.counts },
      ipAddress: ip,
      status: "success",
    });

    const filename = `zailtrack_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Backup export error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal membuat backup database." },
      { status: 500 }
    );
  }
}
