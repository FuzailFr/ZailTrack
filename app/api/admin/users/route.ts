import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionUser, hasAdminAccess } from "@/lib/auth";
import { getDb, initDbSchema } from "@/lib/db";
import { logAudit } from "@/lib/logger";
import { getClientIp } from "@/lib/security";

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
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const status = searchParams.get("status") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get("limit") || "15", 10)));
    const offset = (page - 1) * limit;

    // Filter query
    const searchFilter = search ? `%${search.toLowerCase()}%` : null;
    const isOnlineFilter = status === "online";
    const dbStatus = isOnlineFilter ? null : (status || null);
    const roleVal = role || null;

    const [users, totalCount] = await Promise.all([
      sql`
        SELECT 
          u.id, u.username, u.role, u.status, u.telegram_chat_id, u.created_at, u.last_active_at,
          COUNT(t.id)::int AS total_transactions,
          latest_log.last_ip,
          latest_log.last_region,
          latest_log.last_action
        FROM users u
        LEFT JOIN transactions t ON t.user_id = u.id
        LEFT JOIN LATERAL (
          SELECT al.ip_address AS last_ip, al.region AS last_region, al.action AS last_action
          FROM audit_logs al 
          WHERE al.user_id = u.id OR al.username = u.username 
          ORDER BY al.id DESC 
          LIMIT 1
        ) latest_log ON true
        WHERE (${searchFilter}::text IS NULL OR LOWER(u.username) LIKE ${searchFilter})
          AND (${roleVal}::text IS NULL OR u.role = ${roleVal})
          AND (${dbStatus}::text IS NULL OR u.status = ${dbStatus})
          AND (${isOnlineFilter}::boolean = false OR u.last_active_at >= NOW() - INTERVAL '15 minutes')
        GROUP BY u.id, u.username, u.role, u.status, u.telegram_chat_id, u.created_at, u.last_active_at, latest_log.last_ip, latest_log.last_region, latest_log.last_action
        ORDER BY u.id DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      sql`
        SELECT COUNT(*)::int AS count FROM users
        WHERE (${searchFilter}::text IS NULL OR LOWER(username) LIKE ${searchFilter})
          AND (${roleVal}::text IS NULL OR role = ${roleVal})
          AND (${dbStatus}::text IS NULL OR status = ${dbStatus})
          AND (${isOnlineFilter}::boolean = false OR last_active_at >= NOW() - INTERVAL '15 minutes')
      `,
    ]);

    const total = totalCount[0]?.count || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      status: "success",
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error("Admin list users error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal mengambil daftar pengguna." },
      { status: 500 }
    );
  }
}

// POST: Admin membuat user baru secara langsung
export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session || !hasAdminAccess(session.role)) {
      return NextResponse.json(
        { status: "error", message: "Akses ditolak." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const username = body?.username ? String(body.username).trim() : "";
    const password = body?.password ? String(body.password).trim() : "";
    const role = body?.role || "user";
    const status = body?.status || "active";

    if (!username || !password) {
      return NextResponse.json(
        { status: "error", message: "Username dan password wajib diisi." },
        { status: 400 }
      );
    }

    if (!["user", "admin", "developer"].includes(role)) {
      return NextResponse.json(
        { status: "error", message: "Role tidak valid." },
        { status: 400 }
      );
    }

    // Hanya Developer yang boleh membuat role Developer
    if (role === "developer" && session.role !== "developer") {
      return NextResponse.json(
        { status: "error", message: "Hanya akun Developer yang berhak mengangkat Developer baru." },
        { status: 403 }
      );
    }

    await initDbSchema();
    const sql = getDb();

    const existing = await sql`SELECT id FROM users WHERE LOWER(username) = LOWER(${username}) LIMIT 1`;
    if (existing.length > 0) {
      return NextResponse.json(
        { status: "error", message: "Username sudah digunakan." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const insertResult = await sql`
      INSERT INTO users (username, password, role, status, last_active_at)
      VALUES (${username}, ${hashedPassword}, ${role}, ${status}, CURRENT_TIMESTAMP)
      RETURNING id, username, role, status, created_at
    `;

    const newUser = insertResult[0];
    const ip = getClientIp(request.headers);

    await logAudit({
      userId: session.userId,
      username: session.username,
      role: session.role,
      action: "user:create",
      targetType: "user",
      targetId: newUser.id,
      details: { createdUsername: newUser.username, role: newUser.role, status: newUser.status },
      ipAddress: ip,
      status: "success",
    });

    return NextResponse.json({
      status: "success",
      message: `Pengguna @${newUser.username} berhasil dibuat.`,
      user: newUser,
    });
  } catch (error: any) {
    console.error("Admin create user error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal membuat pengguna." },
      { status: 500 }
    );
  }
}
