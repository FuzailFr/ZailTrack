import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

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
