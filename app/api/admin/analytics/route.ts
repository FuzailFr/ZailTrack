import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/auth";
import { getDb, initDbSchema } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session || !hasAdminAccess(session.role)) {
      return NextResponse.json(
        { status: "error", message: "Akses ditolak. Endpoint ini khusus Admin/Developer." },
        { status: 403 }
      );
    }

    await initDbSchema();
    const sql = getDb();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d"; // 'today', '7d', '30d', 'year'

    let daysInterval = 14;
    if (range === "today") daysInterval = 1;
    else if (range === "7d") daysInterval = 7;
    else if (range === "30d") daysInterval = 30;
    else if (range === "year") daysInterval = 365;

    const pingStart = performance.now();
    const [
      userStats,
      cashflowStats,
      recentUsersCount,
      activeUsersCount,
      topCommands,
      dailyTrend,
      trafficStats,
      userGrowthTrend,
      botPerformance,
    ] = await Promise.all([
      // 1. User role counts & statuses & online count
      sql`
        SELECT 
          COUNT(*)::int AS total,
          COUNT(CASE WHEN role = 'admin' THEN 1 END)::int AS admin_count,
          COUNT(CASE WHEN role = 'developer' THEN 1 END)::int AS developer_count,
          COUNT(CASE WHEN role = 'user' THEN 1 END)::int AS user_count,
          COUNT(CASE WHEN status = 'active' THEN 1 END)::int AS active_count,
          COUNT(CASE WHEN status = 'suspended' THEN 1 END)::int AS suspended_count,
          COUNT(CASE WHEN status = 'banned' THEN 1 END)::int AS banned_count,
          COUNT(CASE WHEN last_active_at >= NOW() - INTERVAL '15 minutes' THEN 1 END)::int AS online_count
        FROM users
      `,

      // 2. Platform Cashflow summary
      sql`
        SELECT 
          COUNT(*)::int AS total_transactions,
          COALESCE(SUM(CASE WHEN tipe = 'income' THEN jumlah ELSE 0 END), 0) AS total_income,
          COALESCE(SUM(CASE WHEN tipe = 'expense' THEN jumlah ELSE 0 END), 0) AS total_expense
        FROM transactions
      `,

      // 3. User baru dalam 7 hari terakhir
      sql`
        SELECT COUNT(*)::int AS count 
        FROM users 
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `,

      // 4. User aktif dalam 30 hari terakhir
      sql`
        SELECT COUNT(DISTINCT user_id)::int AS count 
        FROM transactions 
        WHERE tanggal >= CURRENT_DATE - INTERVAL '30 days'
      `,

      // 5. Command bot terpopuler
      sql`
        SELECT command, COUNT(*)::int as count 
        FROM bot_logs 
        GROUP BY command 
        ORDER BY count DESC 
        LIMIT 6
      `,

      // 6. Tren harian kas & transaksi (14 hari terakhir)
      sql`
        SELECT 
          TO_CHAR(d.day, 'YYYY-MM-DD') AS date,
          TO_CHAR(d.day, 'DD Mon') AS label,
          COALESCE(SUM(CASE WHEN t.tipe = 'income' THEN t.jumlah ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN t.tipe = 'expense' THEN t.jumlah ELSE 0 END), 0) AS expense,
          COUNT(t.id)::int AS tx_count
        FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, '1 day'::interval) d(day)
        LEFT JOIN transactions t ON t.tanggal = d.day::date
        GROUP BY d.day
        ORDER BY d.day ASC
      `,

      // 7. Traffic & Error summary (24 jam terakhir)
      sql`
        SELECT 
          COUNT(*)::int AS total_requests,
          COUNT(CASE WHEN status_code >= 400 THEN 1 END)::int AS error_requests,
          COALESCE(AVG(response_time_ms), 0)::int AS avg_latency
        FROM traffic_logs
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `,

      // 8. Tren pertumbuhan user baru (14 hari)
      sql`
        SELECT 
          TO_CHAR(d.day, 'YYYY-MM-DD') AS date,
          TO_CHAR(d.day, 'DD Mon') AS label,
          COUNT(u.id)::int AS new_users
        FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, '1 day'::interval) d(day)
        LEFT JOIN users u ON u.created_at::date = d.day::date
        GROUP BY d.day
        ORDER BY d.day ASC
      `,

      // 9. Statistik penggunaan AI / Bot Natural Language Parser
      sql`
        SELECT 
          COUNT(*)::int AS total_bot_actions,
          COUNT(CASE WHEN command LIKE 'tx:%' THEN 1 END)::int AS nlp_parsed_tx,
          COUNT(CASE WHEN status = 'success' THEN 1 END)::int AS success_count
        FROM bot_logs
      `,
    ]);

    const latencyMs = Math.round(performance.now() - pingStart);

    const u = userStats[0];
    const c = cashflowStats[0];
    const t = trafficStats[0];
    const bp = botPerformance[0];

    const totalIncome = Number(c.total_income || 0);
    const totalExpense = Number(c.total_expense || 0);
    const netBalance = totalIncome - totalExpense;

    const totalBotActions = bp.total_bot_actions || 0;
    const botSuccessRate = totalBotActions > 0 
      ? Math.round((bp.success_count / totalBotActions) * 100) 
      : 100;

    return NextResponse.json({
      status: "success",
      overview: {
        users: {
          total: u.total,
          onlineCount: u.online_count || 0,
          admins: u.admin_count,
          developers: u.developer_count,
          regularUsers: u.user_count,
          active: u.active_count,
          suspended: u.suspended_count,
          banned: u.banned_count,
          newLast7Days: recentUsersCount[0]?.count || 0,
          activeTransacting30Days: activeUsersCount[0]?.count || 0,
        },
        financials: {
          totalTransactions: c.total_transactions,
          totalIncome,
          totalExpense,
          netBalance,
        },
        telemetry: {
          dbLatencyMs: latencyMs,
          totalRequests24h: t.total_requests || 0,
          errorRequests24h: t.error_requests || 0,
          avgLatencyMs: t.avg_latency || latencyMs,
          uptimePercent: t.total_requests > 0 
            ? Math.round(((t.total_requests - t.error_requests) / t.total_requests) * 1000) / 10 
            : 100,
        },
        aiBotUsage: {
          totalActions: totalBotActions,
          naturalLanguageParsedTx: bp.nlp_parsed_tx || 0,
          successRate: botSuccessRate,
        },
        topCommands: topCommands.map((cmd: any) => ({
          command: cmd.command,
          count: cmd.count,
        })),
        trends: dailyTrend.map((row: any) => ({
          date: row.date,
          label: row.label,
          income: Number(row.income),
          expense: Number(row.expense),
          txCount: Number(row.tx_count),
        })),
        userGrowth: userGrowthTrend.map((row: any) => ({
          date: row.date,
          label: row.label,
          newUsers: Number(row.new_users),
        })),
      },
    });
  } catch (error: any) {
    console.error("Admin analytics error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal memuat analitik admin." },
      { status: 500 }
    );
  }
}
