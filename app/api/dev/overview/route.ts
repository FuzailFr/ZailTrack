import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb, initDbSchema } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { status: "error", message: "Akses ditolak. Endpoint ini hanya untuk mode Developer/Admin." },
        { status: 403 }
      );
    }

    await initDbSchema();
    const sql = getDb();

    const startPing = performance.now();
    const pingResult = await sql`SELECT 1 as ping`;
    const latencyMs = Math.round(performance.now() - startPing);

    // 1. System stats
    const userCount = await sql`SELECT COUNT(*)::int as count FROM users`;
    const txCount = await sql`SELECT COUNT(*)::int as count FROM transactions`;
    const versionResult = await sql`SELECT version() as ver`;

    // 2. User list
    const usersList = await sql`
      SELECT 
        u.id, 
        u.username, 
        u.role, 
        u.created_at,
        COUNT(t.id)::int as total_transactions
      FROM users u
      LEFT JOIN transactions t ON t.user_id = u.id
      GROUP BY u.id, u.username, u.role, u.created_at
      ORDER BY u.id ASC
    `;

    // 3. Global transactions audit (20 terbaru di database)
    const recentGlobalTransactions = await sql`
      SELECT 
        t.id,
        t.tipe,
        t.jumlah,
        t.deskripsi,
        TO_CHAR(t.tanggal, 'YYYY-MM-DD') AS tanggal,
        t.created_at,
        u.username
      FROM transactions t
      JOIN users u ON u.id = t.user_id
      ORDER BY t.id DESC
      LIMIT 20
    `;

    return NextResponse.json({
      status: "success",
      metrics: {
        total_users: userCount[0]?.count || 0,
        total_transactions: txCount[0]?.count || 0,
        db_latency_ms: latencyMs,
        db_engine: "Neon Serverless PostgreSQL",
        db_version: (versionResult[0]?.ver || "").split(" ")[0] + " " + (versionResult[0]?.ver || "").split(" ")[1],
      },
      users: usersList,
      recent_audit_transactions: recentGlobalTransactions,
    });
  } catch (error: any) {
    console.error("Dev overview error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal mengambil metrik dev." },
      { status: 500 }
    );
  }
}
