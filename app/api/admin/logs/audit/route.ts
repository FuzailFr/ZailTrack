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
    const action = searchParams.get("action") || "";
    const status = searchParams.get("status") || "";
    const role = searchParams.get("role") || "";
    const format = searchParams.get("format"); // 'csv' or null
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = format === "csv" ? 1000 : Math.min(100, Math.max(5, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const s = search ? `%${search.toLowerCase()}%` : null;
    const a = action || null;
    const st = status || null;
    const r = role || null;

    const [logs, countRes] = await Promise.all([
      sql`
        SELECT id, user_id, username, role, action, target_type, target_id, details, ip_address, region, status, created_at
        FROM audit_logs
        WHERE (${s}::text IS NULL OR LOWER(action) LIKE ${s} OR LOWER(COALESCE(username, '')) LIKE ${s} OR LOWER(COALESCE(target_type, '')) LIKE ${s} OR LOWER(COALESCE(region, '')) LIKE ${s})
          AND (${a}::text IS NULL OR action = ${a})
          AND (${st}::text IS NULL OR status = ${st})
          AND (${r}::text IS NULL OR role = ${r})
        ORDER BY id DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`
        SELECT COUNT(*)::int AS count FROM audit_logs
        WHERE (${s}::text IS NULL OR LOWER(action) LIKE ${s} OR LOWER(COALESCE(username, '')) LIKE ${s} OR LOWER(COALESCE(target_type, '')) LIKE ${s} OR LOWER(COALESCE(region, '')) LIKE ${s})
          AND (${a}::text IS NULL OR action = ${a})
          AND (${st}::text IS NULL OR status = ${st})
          AND (${r}::text IS NULL OR role = ${r})
      `,
    ]);

    // Jika user minta format CSV
    if (format === "csv") {
      let csv = "ID,Timestamp,Username,Role,Action,Target Type,Target ID,Status,IP Address,Region\n";
      for (const row of logs) {
        const ts = new Date(row.created_at).toISOString();
        csv += `"${row.id}","${ts}","${row.username || ''}","${row.role || ''}","${row.action}","${row.target_type || ''}","${row.target_id || ''}","${row.status || ''}","${row.ip_address || ''}","${row.region || ''}"\n`;
      }
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="audit_logs_${new Date().toISOString().slice(0, 10)}.csv"`,
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
    console.error("Admin audit logs error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal memuat log audit." },
      { status: 500 }
    );
  }
}
