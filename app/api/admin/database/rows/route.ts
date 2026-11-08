import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionUser, hasAdminAccess } from "@/lib/auth";
import { getDb, initDbSchema } from "@/lib/db";
import { logAudit } from "@/lib/logger";
import { getClientIp } from "@/lib/security";

const ALLOWED_TABLES = ["users", "transactions", "audit_logs", "bot_logs", "traffic_logs"];

export async function GET(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session || !hasAdminAccess(session.role)) {
      return NextResponse.json(
        { status: "error", message: "Akses ditolak." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table") || "transactions";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get("limit") || "15", 10)));
    const offset = (page - 1) * limit;
    const search = searchParams.get("search") || "";

    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json(
        { status: "error", message: `Tabel '${table}' tidak diizinkan atau tidak ditemukan.` },
        { status: 400 }
      );
    }

    await initDbSchema();
    const sql = getDb();

    let rows: any[] = [];
    let total = 0;

    // Query per tabel secara terstruktur untuk mencegah SQL injection
    if (table === "transactions") {
      if (search) {
        const s = `%${search.toLowerCase()}%`;
        const [r, c] = await Promise.all([
          sql`
            SELECT id, user_id, tipe, jumlah, deskripsi, TO_CHAR(tanggal, 'YYYY-MM-DD') AS tanggal, created_at 
            FROM transactions 
            WHERE LOWER(deskripsi) LIKE ${s} OR CAST(jumlah AS TEXT) LIKE ${s}
            ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}
          `,
          sql`
            SELECT COUNT(*)::int AS count FROM transactions 
            WHERE LOWER(deskripsi) LIKE ${s} OR CAST(jumlah AS TEXT) LIKE ${s}
          `,
        ]);
        rows = r;
        total = c[0]?.count || 0;
      } else {
        const [r, c] = await Promise.all([
          sql`
            SELECT id, user_id, tipe, jumlah, deskripsi, TO_CHAR(tanggal, 'YYYY-MM-DD') AS tanggal, created_at 
            FROM transactions 
            ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}
          `,
          sql`SELECT COUNT(*)::int AS count FROM transactions`,
        ]);
        rows = r;
        total = c[0]?.count || 0;
      }
    } else if (table === "users") {
      if (search) {
        const s = `%${search.toLowerCase()}%`;
        const [r, c] = await Promise.all([
          sql`
            SELECT id, username, role, status, telegram_chat_id, created_at, last_active_at 
            FROM users 
            WHERE LOWER(username) LIKE ${s}
            ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}
          `,
          sql`SELECT COUNT(*)::int AS count FROM users WHERE LOWER(username) LIKE ${s}`,
        ]);
        rows = r;
        total = c[0]?.count || 0;
      } else {
        const [r, c] = await Promise.all([
          sql`
            SELECT id, username, role, status, telegram_chat_id, created_at, last_active_at 
            FROM users 
            ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}
          `,
          sql`SELECT COUNT(*)::int AS count FROM users`,
        ]);
        rows = r;
        total = c[0]?.count || 0;
      }
    } else if (table === "audit_logs") {
      if (search) {
        const s = `%${search.toLowerCase()}%`;
        const [r, c] = await Promise.all([
          sql`
            SELECT id, user_id, username, role, action, target_type, target_id, details, ip_address, status, created_at 
            FROM audit_logs 
            WHERE LOWER(action) LIKE ${s} OR LOWER(COALESCE(username, '')) LIKE ${s}
            ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}
          `,
          sql`
            SELECT COUNT(*)::int AS count FROM audit_logs 
            WHERE LOWER(action) LIKE ${s} OR LOWER(COALESCE(username, '')) LIKE ${s}
          `,
        ]);
        rows = r;
        total = c[0]?.count || 0;
      } else {
        const [r, c] = await Promise.all([
          sql`
            SELECT id, user_id, username, role, action, target_type, target_id, details, ip_address, status, created_at 
            FROM audit_logs 
            ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}
          `,
          sql`SELECT COUNT(*)::int AS count FROM audit_logs`,
        ]);
        rows = r;
        total = c[0]?.count || 0;
      }
    } else if (table === "bot_logs") {
      if (search) {
        const s = `%${search.toLowerCase()}%`;
        const [r, c] = await Promise.all([
          sql`
            SELECT id, chat_id, user_id, username, command, raw_text, status, response_time_ms, created_at 
            FROM bot_logs 
            WHERE LOWER(command) LIKE ${s} OR LOWER(COALESCE(raw_text, '')) LIKE ${s}
            ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}
          `,
          sql`
            SELECT COUNT(*)::int AS count FROM bot_logs 
            WHERE LOWER(command) LIKE ${s} OR LOWER(COALESCE(raw_text, '')) LIKE ${s}
          `,
        ]);
        rows = r;
        total = c[0]?.count || 0;
      } else {
        const [r, c] = await Promise.all([
          sql`
            SELECT id, chat_id, user_id, username, command, raw_text, status, response_time_ms, created_at 
            FROM bot_logs 
            ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}
          `,
          sql`SELECT COUNT(*)::int AS count FROM bot_logs`,
        ]);
        rows = r;
        total = c[0]?.count || 0;
      }
    } else if (table === "traffic_logs") {
      const [r, c] = await Promise.all([
        sql`
          SELECT id, endpoint, method, status_code, response_time_ms, user_id, ip_address, created_at 
          FROM traffic_logs 
          ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}
        `,
        sql`SELECT COUNT(*)::int AS count FROM traffic_logs`,
      ]);
      rows = r;
      total = c[0]?.count || 0;
    }

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      status: "success",
      table,
      rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error("Admin database rows error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal mengambil data baris tabel." },
      { status: 500 }
    );
  }
}

// POST: Insert baris baru ke tabel
export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session || !hasAdminAccess(session.role)) {
      return NextResponse.json({ status: "error", message: "Akses ditolak." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const { table, data } = body || {};

    if (!table || !ALLOWED_TABLES.includes(table) || !data) {
      return NextResponse.json({ status: "error", message: "Parameter tabel atau data tidak valid." }, { status: 400 });
    }

    await initDbSchema();
    const sql = getDb();
    let insertedRow: any = null;

    if (table === "transactions") {
      const { user_id, tipe, jumlah, deskripsi, tanggal } = data;
      if (!user_id || !tipe || !jumlah || !tanggal) {
        return NextResponse.json({ status: "error", message: "Semua field transaksi wajib diisi." }, { status: 400 });
      }
      const res = await sql`
        INSERT INTO transactions (user_id, tipe, jumlah, deskripsi, tanggal)
        VALUES (${parseInt(user_id, 10)}, ${tipe}, ${parseFloat(jumlah)}, ${deskripsi || ""}, ${tanggal})
        RETURNING *
      `;
      insertedRow = res[0];
    } else if (table === "users") {
      const { username, password, role, status } = data;
      if (!username || !password) {
        return NextResponse.json({ status: "error", message: "Username dan password wajib diisi." }, { status: 400 });
      }
      const hashed = await bcrypt.hash(password, 10);
      const res = await sql`
        INSERT INTO users (username, password, role, status, last_active_at)
        VALUES (${username}, ${hashed}, ${role || "user"}, ${status || "active"}, CURRENT_TIMESTAMP)
        RETURNING id, username, role, status, created_at
      `;
      insertedRow = res[0];
    } else {
      return NextResponse.json({ status: "error", message: `Penambahan langsung ke tabel '${table}' tidak didukung via CRUD browser.` }, { status: 400 });
    }

    const ip = getClientIp(request.headers);
    await logAudit({
      userId: session.userId,
      username: session.username,
      role: session.role,
      action: "db:insert",
      targetType: table,
      targetId: insertedRow?.id,
      details: { insertedData: insertedRow },
      ipAddress: ip,
      status: "success",
    });

    return NextResponse.json({
      status: "success",
      message: `Data berhasil ditambahkan ke tabel '${table}'.`,
      row: insertedRow,
    });
  } catch (error: any) {
    console.error("Insert row error:", error);
    return NextResponse.json({ status: "error", message: error.message || "Gagal menyisipkan baris baru." }, { status: 500 });
  }
}

// PUT: Update baris di tabel
export async function PUT(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session || !hasAdminAccess(session.role)) {
      return NextResponse.json({ status: "error", message: "Akses ditolak." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const { table, id, data } = body || {};

    if (!table || !ALLOWED_TABLES.includes(table) || !id || !data) {
      return NextResponse.json({ status: "error", message: "Parameter tidak lengkap." }, { status: 400 });
    }

    const rowId = parseInt(id, 10);
    await initDbSchema();
    const sql = getDb();
    let updatedRow: any = null;

    if (table === "transactions") {
      const { tipe, jumlah, deskripsi, tanggal } = data;
      const res = await sql`
        UPDATE transactions 
        SET tipe = ${tipe}, jumlah = ${parseFloat(jumlah)}, deskripsi = ${deskripsi || ""}, tanggal = ${tanggal}
        WHERE id = ${rowId}
        RETURNING *
      `;
      if (res.length === 0) return NextResponse.json({ status: "error", message: "Data tidak ditemukan." }, { status: 404 });
      updatedRow = res[0];
    } else if (table === "users") {
      const { role, status, password } = data;
      // Proteksi anti-lockout diri sendiri
      if (session.userId === rowId && (role !== session.role || status !== "active")) {
        return NextResponse.json({ status: "error", message: "Anda tidak dapat mengubah status atau mencabut role akun Anda sendiri." }, { status: 400 });
      }

      if (password) {
        const hashed = await bcrypt.hash(password, 10);
        await sql`UPDATE users SET password = ${hashed} WHERE id = ${rowId}`;
      }

      const res = await sql`
        UPDATE users 
        SET role = ${role || "user"}, status = ${status || "active"}
        WHERE id = ${rowId}
        RETURNING id, username, role, status
      `;
      if (res.length === 0) return NextResponse.json({ status: "error", message: "Data tidak ditemukan." }, { status: 404 });
      updatedRow = res[0];
    }

    const ip = getClientIp(request.headers);
    await logAudit({
      userId: session.userId,
      username: session.username,
      role: session.role,
      action: "db:update",
      targetType: table,
      targetId: rowId,
      details: { updatedFields: data },
      ipAddress: ip,
      status: "success",
    });

    return NextResponse.json({
      status: "success",
      message: `Baris #${rowId} di tabel '${table}' berhasil diperbarui.`,
      row: updatedRow,
    });
  } catch (error: any) {
    console.error("Update row error:", error);
    return NextResponse.json({ status: "error", message: error.message || "Gagal memperbarui baris." }, { status: 500 });
  }
}

// DELETE: Hapus baris dari tabel
export async function DELETE(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session || !hasAdminAccess(session.role)) {
      return NextResponse.json({ status: "error", message: "Akses ditolak." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table");
    const idStr = searchParams.get("id");

    if (!table || !ALLOWED_TABLES.includes(table) || !idStr) {
      return NextResponse.json({ status: "error", message: "Parameter tabel atau id tidak valid." }, { status: 400 });
    }

    const rowId = parseInt(idStr, 10);
    if (isNaN(rowId)) {
      return NextResponse.json({ status: "error", message: "ID tidak valid." }, { status: 400 });
    }

    // Proteksi anti-lockout jika menghapus akun sendiri
    if (table === "users" && session.userId === rowId) {
      return NextResponse.json({ status: "error", message: "Anda tidak dapat menghapus akun Anda sendiri dari Database Studio." }, { status: 400 });
    }

    await initDbSchema();
    const sql = getDb();

    if (table === "transactions") {
      await sql`DELETE FROM transactions WHERE id = ${rowId}`;
    } else if (table === "users") {
      await sql`DELETE FROM transactions WHERE user_id = ${rowId}`;
      await sql`DELETE FROM users WHERE id = ${rowId}`;
    } else if (table === "audit_logs") {
      await sql`DELETE FROM audit_logs WHERE id = ${rowId}`;
    } else if (table === "bot_logs") {
      await sql`DELETE FROM bot_logs WHERE id = ${rowId}`;
    } else if (table === "traffic_logs") {
      await sql`DELETE FROM traffic_logs WHERE id = ${rowId}`;
    }

    const ip = getClientIp(request.headers);
    await logAudit({
      userId: session.userId,
      username: session.username,
      role: session.role,
      action: "db:delete",
      targetType: table,
      targetId: rowId,
      details: { deletedId: rowId },
      ipAddress: ip,
      status: "success",
    });

    return NextResponse.json({
      status: "success",
      message: `Baris #${rowId} berhasil dihapus dari tabel '${table}'.`,
    });
  } catch (error: any) {
    console.error("Delete row error:", error);
    return NextResponse.json({ status: "error", message: error.message || "Gagal menghapus baris." }, { status: 500 });
  }
}
