import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/auth";
import { getDb, initDbSchema } from "@/lib/db";

const ALLOWED_TABLES = ["users", "transactions", "audit_logs", "bot_logs", "traffic_logs"];

export async function GET() {
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

    // Ambil metadata kolom untuk seluruh tabel publik yang diizinkan
    const columns = await sql`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = ANY(${ALLOWED_TABLES})
      ORDER BY table_name, ordinal_position
    `;

    // Ambil row count untuk masing-masing tabel
    const [uCount, txCount, auditCount, botCount, trafficCount] = await Promise.all([
      sql`SELECT COUNT(*)::int AS count FROM users`,
      sql`SELECT COUNT(*)::int AS count FROM transactions`,
      sql`SELECT COUNT(*)::int AS count FROM audit_logs`,
      sql`SELECT COUNT(*)::int AS count FROM bot_logs`,
      sql`SELECT COUNT(*)::int AS count FROM traffic_logs`,
    ]);

    const countMap: Record<string, number> = {
      users: uCount[0]?.count || 0,
      transactions: txCount[0]?.count || 0,
      audit_logs: auditCount[0]?.count || 0,
      bot_logs: botCount[0]?.count || 0,
      traffic_logs: trafficCount[0]?.count || 0,
    };

    // Kelompokkan kolom per tabel
    const tableInfo = ALLOWED_TABLES.map((tableName) => {
      const tableColumns = columns
        .filter((c: any) => c.table_name === tableName)
        .map((c: any) => ({
          name: c.column_name,
          type: c.data_type,
          nullable: c.is_nullable === "YES",
          default: c.column_default,
          isPrimary: c.column_name === "id",
        }));

      return {
        name: tableName,
        rowCount: countMap[tableName] || 0,
        columns: tableColumns,
      };
    });

    return NextResponse.json({
      status: "success",
      tables: tableInfo,
    });
  } catch (error: any) {
    console.error("Admin database tables error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal memuat skema database." },
      { status: 500 }
    );
  }
}
