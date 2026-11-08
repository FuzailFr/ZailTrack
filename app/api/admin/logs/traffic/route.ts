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
          SELECT id, endpoint, method, status_code, response_time_ms, user_id, ip_address, region, created_at
          FROM traffic_logs
          WHERE LOWER(endpoint) LIKE ${s} OR LOWER(method) LIKE ${s} OR LOWER(COALESCE(ip_address, '')) LIKE ${s} OR LOWER(COALESCE(region, '')) LIKE ${s}
          ORDER BY id DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*)::int AS count FROM traffic_logs
          WHERE LOWER(endpoint) LIKE ${s} OR LOWER(method) LIKE ${s} OR LOWER(COALESCE(ip_address, '')) LIKE ${s} OR LOWER(COALESCE(region, '')) LIKE ${s}
        `,
      ]);
    } else {
      [logs, countRes] = await Promise.all([
        sql`
          SELECT id, endpoint, method, status_code, response_time_ms, user_id, ip_address, region, created_at
          FROM traffic_logs
          ORDER BY id DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        sql`SELECT COUNT(*)::int AS count FROM traffic_logs`,
      ]);
    }

    if (format === "csv") {
      let csv = "ID,Timestamp,Endpoint,Method,Status Code,Response Time (ms),User ID,IP Address,Region\n";
      for (const row of logs) {
        const ts = new Date(row.created_at).toISOString();
        csv += `"${row.id}","${ts}","${row.endpoint}","${row.method}","${row.status_code}","${row.response_time_ms}","${row.user_id || ''}","${row.ip_address || ''}","${row.region || ''}"\n`;
      }
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="traffic_logs_${new Date().toISOString().slice(0, 10)}.csv"`,
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
    console.error("Admin traffic logs error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal memuat log lalu lintas." },
      { status: 500 }
    );
  }
}
