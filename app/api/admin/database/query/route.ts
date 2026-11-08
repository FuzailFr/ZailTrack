import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/auth";
import { getDb, initDbSchema } from "@/lib/db";
import { logAudit } from "@/lib/logger";
import { getClientIp } from "@/lib/security";

// Governed Safe Query Execution
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
    const rawQuery = body?.query ? String(body.query).trim() : "";
    const confirmedRisk = Boolean(body?.confirmRisky);

    if (!rawQuery) {
      return NextResponse.json(
        { status: "error", message: "Query SQL tidak boleh kosong." },
        { status: 400 }
      );
    }

    const upper = rawQuery.toUpperCase();

    // 1. Blacklist DDL destruktif berbahaya
    const forbiddenPatterns = [
      /DROP\s+DATABASE/i,
      /DROP\s+SCHEMA/i,
      /DROP\s+TABLE/i,
      /ALTER\s+TABLE/i,
      /TRUNCATE/i,
      /GRANT\s+/i,
      /REVOKE\s+/i,
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(rawQuery)) {
        return NextResponse.json(
          {
            status: "error",
            message: "Query ditolak demi keamanan: Operasi DDL destruktif (DROP/ALTER/TRUNCATE) dilarang via Web Studio.",
          },
          { status: 403 }
        );
      }
    }

    // 2. Jika bukan SELECT murni (misal UPDATE / DELETE bebas), wajib konfirmasi dan hanya role 'developer'
    const isMutation = upper.startsWith("UPDATE") || upper.startsWith("DELETE") || upper.startsWith("INSERT");
    if (isMutation) {
      if (session.role !== "developer") {
        return NextResponse.json(
          {
            status: "error",
            message: "Akses ditolak: Eksekusi query mutasi langsung (INSERT/UPDATE/DELETE) via SQL Console hanya diizinkan untuk peran Developer.",
          },
          { status: 403 }
        );
      }

      if (!confirmedRisk) {
        return NextResponse.json(
          {
            status: "error",
            requiresConfirmation: true,
            message: "Query ini mengubah atau menghapus data database. Diperlukan konfirmasi risiko sebelum eksekusi.",
          },
          { status: 400 }
        );
      }
    }

    // 3. Batasi SELECT agar tidak out-of-memory
    let finalQuery = rawQuery;
    if (upper.startsWith("SELECT") && !upper.includes("LIMIT")) {
      finalQuery = `${rawQuery.replace(/;$/, "")} LIMIT 100;`;
    }

    await initDbSchema();
    const sql = getDb();

    const startPing = performance.now();
    // Eksekusi query governed
    const results = await sql(finalQuery);
    const executionTimeMs = Math.round(performance.now() - startPing);

    const ip = getClientIp(request.headers);
    await logAudit({
      userId: session.userId,
      username: session.username,
      role: session.role,
      action: "db:sql_console_query",
      details: { query: finalQuery.slice(0, 300), executionTimeMs, rowCount: Array.isArray(results) ? results.length : 1 },
      ipAddress: ip,
      status: "success",
    });

    return NextResponse.json({
      status: "success",
      query: finalQuery,
      executionTimeMs,
      rowCount: Array.isArray(results) ? results.length : 1,
      results: Array.isArray(results) ? results : [results],
    });
  } catch (error: any) {
    console.error("SQL query runner error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal mengeksekusi query SQL." },
      { status: 500 }
    );
  }
}
