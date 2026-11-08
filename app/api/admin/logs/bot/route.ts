import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/auth";
import { getDb, initDbSchema } from "@/lib/db";

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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const format = searchParams.get("format");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = format === "csv" ? 1000 : Math.min(100, Math.max(5, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const s = search ? `%${search.toLowerCase()}%` : null;

    let logs;
    let countRes;

    if (s) {
      [logs, countRes] = await Promise.all([
        sql`
          SELECT id, chat_id, user_id, username, command, raw_text, status, response_time_ms, created_at
          FROM bot_logs
          WHERE LOWER(command) LIKE ${s} OR LOWER(COALESCE(username, '')) LIKE ${s} OR LOWER(COALESCE(raw_text, '')) LIKE ${s}
          ORDER BY id DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*)::int AS count FROM bot_logs
          WHERE LOWER(command) LIKE ${s} OR LOWER(COALESCE(username, '')) LIKE ${s} OR LOWER(COALESCE(raw_text, '')) LIKE ${s}
        `,
      ]);
    } else {
      [logs, countRes] = await Promise.all([
        sql`
          SELECT id, chat_id, user_id, username, command, raw_text, status, response_time_ms, created_at
          FROM bot_logs
          ORDER BY id DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        sql`SELECT COUNT(*)::int AS count FROM bot_logs`,
      ]);
    }

    if (format === "csv") {
      let csv = "ID,Timestamp,Chat ID,User ID,Username,Command,Raw Text,Status,Latency (ms)\n";
      for (const row of logs) {
        const ts = new Date(row.created_at).toISOString();
        const safeText = (row.raw_text || "").replace(/"/g, '""');
        csv += `"${row.id}","${ts}","${row.chat_id}","${row.user_id || ''}","${row.username || ''}","${row.command}","${safeText}","${row.status}","${row.response_time_ms}"\n`;
      }
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="bot_logs_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const total = countRes[0]?.count || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      status: "success",
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error("Admin bot logs error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal memuat log bot." },
      { status: 500 }
    );
  }
}
