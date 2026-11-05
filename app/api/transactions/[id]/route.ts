import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

// PUT / PATCH: Update transaksi yang sudah ada (hanya oleh pemilik)
export async function PUT(
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
    const transactionId = parseInt(id, 10);

    if (isNaN(transactionId)) {
      return NextResponse.json(
        { status: "error", message: "ID transaksi tidak valid." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const tipe = body?.tipe;
    const jumlah = parseFloat(body?.jumlah);
    const deskripsi = (body?.deskripsi || "-").trim();
    const tanggal = body?.tanggal;

    if (!tipe || (tipe !== "income" && tipe !== "expense")) {
      return NextResponse.json(
        { status: "error", message: "Tipe harus 'income' atau 'expense'." },
        { status: 400 }
      );
    }

    if (isNaN(jumlah) || jumlah <= 0) {
      return NextResponse.json(
        { status: "error", message: "Nominal harus berupa angka positif." },
        { status: 400 }
      );
    }

    if (!tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
      return NextResponse.json(
        { status: "error", message: "Format tanggal tidak valid (harus YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Update dengan kepemilikan mutlak (Anti-IDOR)
    const updated = await sql`
      UPDATE transactions
      SET 
        tipe = ${tipe},
        jumlah = ${jumlah},
        deskripsi = ${deskripsi},
        tanggal = ${tanggal}::date
      WHERE id = ${transactionId} AND user_id = ${session.userId}
      RETURNING id, tipe, jumlah, deskripsi, TO_CHAR(tanggal, 'YYYY-MM-DD') AS tanggal, created_at
    `;

    if (updated.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Transaksi tidak ditemukan atau Anda tidak memiliki akses." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      message: "Transaksi berhasil diperbarui.",
      transaction: updated[0],
    });
  } catch (error: any) {
    console.error("Update transaction error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal memperbarui transaksi." },
      { status: 500 }
    );
  }
}

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
    const transactionId = parseInt(id, 10);

    if (isNaN(transactionId)) {
      return NextResponse.json(
        { status: "error", message: "ID transaksi tidak valid." },
        { status: 400 }
      );
    }

    const sql = getDb();

    // Pastikan hanya pemilik yang bisa menghapus transaksi miliknya sendiri
    const deleted = await sql`
      DELETE FROM transactions
      WHERE id = ${transactionId} AND user_id = ${session.userId}
      RETURNING id
    `;

    if (deleted.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Transaksi tidak ditemukan atau Anda tidak memiliki akses." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      message: "Transaksi berhasil dihapus.",
    });
  } catch (error: any) {
    console.error("Delete transaction error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal menghapus transaksi." },
      { status: 500 }
    );
  }
}
