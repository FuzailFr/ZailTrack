import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

// PATCH /api/recurring/[id] — Toggle aktif, atau catat sebagai sudah bayar (advance due date)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const recurringId = parseInt(id, 10);
    if (isNaN(recurringId)) {
      return NextResponse.json(
        { status: "error", message: "ID transaksi rutin tidak valid." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const sql = getDb();

    const existing = await sql`
      SELECT id, user_id, tipe, jumlah, kategori, deskripsi, frekuensi, tanggal_berikutnya, is_active
      FROM recurring_transactions
      WHERE id = ${recurringId} AND user_id = ${session.userId}
      LIMIT 1
    `;

    if (existing.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Transaksi rutin tidak ditemukan." },
        { status: 404 }
      );
    }

    const current = existing[0];

    // Opsi 1: Tandai sudah dibayar / dijalankan -> catat ke transactions & majukan tanggal
    if (body?.action === "pay_now") {
      const today = new Date().toISOString().slice(0, 10);

      // 1. Masukkan ke tabel transactions
      await sql`
        INSERT INTO transactions (user_id, tipe, jumlah, kategori, deskripsi, tanggal)
        VALUES (${session.userId}, ${current.tipe}, ${current.jumlah}, ${current.kategori}, ${current.deskripsi}, ${today})
      `;

      // 2. Majukan tanggal jatuh tempo berikutnya
      const nextDate = new Date(current.tanggal_berikutnya);
      if (current.frekuensi === "daily") {
        nextDate.setDate(nextDate.getDate() + 1);
      } else if (current.frekuensi === "weekly") {
        nextDate.setDate(nextDate.getDate() + 7);
      } else {
        // default monthly
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      const nextDateStr = nextDate.toISOString().slice(0, 10);

      const updated = await sql`
        UPDATE recurring_transactions
        SET tanggal_berikutnya = ${nextDateStr}::date
        WHERE id = ${recurringId} AND user_id = ${session.userId}
        RETURNING id, tipe, jumlah, kategori, deskripsi, frekuensi, TO_CHAR(tanggal_berikutnya, 'YYYY-MM-DD') AS tanggal_berikutnya, is_active
      `;

      return NextResponse.json({
        status: "success",
        message: `Transaksi "${current.deskripsi}" berhasil dicatat ke buku kas dan periode berikutnya telah dimajukan.`,
        recurring: updated[0],
      });
    }

    // Opsi 2: Toggle isActive
    if (body?.isActive !== undefined) {
      const updated = await sql`
        UPDATE recurring_transactions
        SET is_active = ${Boolean(body.isActive)}
        WHERE id = ${recurringId} AND user_id = ${session.userId}
        RETURNING id, tipe, jumlah, kategori, deskripsi, frekuensi, TO_CHAR(tanggal_berikutnya, 'YYYY-MM-DD') AS tanggal_berikutnya, is_active
      `;

      return NextResponse.json({
        status: "success",
        message: "Status transaksi rutin berhasil diperbarui.",
        recurring: updated[0],
      });
    }

    return NextResponse.json({ status: "success", recurring: current });
  } catch (error: any) {
    console.error("Update recurring error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal memperbarui transaksi rutin." },
      { status: 500 }
    );
  }
}

// DELETE /api/recurring/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const recurringId = parseInt(id, 10);
    if (isNaN(recurringId)) {
      return NextResponse.json(
        { status: "error", message: "ID transaksi rutin tidak valid." },
        { status: 400 }
      );
    }

    const sql = getDb();
    const deleted = await sql`
      DELETE FROM recurring_transactions
      WHERE id = ${recurringId} AND user_id = ${session.userId}
      RETURNING id
    `;

    if (deleted.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Transaksi rutin tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      message: "Transaksi rutin berhasil dihapus.",
    });
  } catch (error: any) {
    console.error("Delete recurring error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal menghapus transaksi rutin." },
      { status: 500 }
    );
  }
}
