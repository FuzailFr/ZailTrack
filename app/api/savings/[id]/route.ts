import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

// PATCH /api/savings/[id] — Deposit, withdraw, atau edit target
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
    const goalId = parseInt(id, 10);
    if (isNaN(goalId)) {
      return NextResponse.json(
        { status: "error", message: "ID target tidak valid." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const sql = getDb();

    // Cek keberadaan target dan kepemilikan
    const existing = await sql`
      SELECT id, judul, target_nominal, terkumpul_nominal, status
      FROM savings_goals
      WHERE id = ${goalId} AND user_id = ${session.userId}
      LIMIT 1
    `;

    if (existing.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Target tabungan tidak ditemukan." },
        { status: 404 }
      );
    }

    const current = existing[0];
    let newSaved = Number(current.terkumpul_nominal);

    // Opsi 1: Tambah setoran (deposit)
    if (body?.depositAmount !== undefined) {
      const deposit = parseFloat(body.depositAmount);
      if (isNaN(deposit) || deposit <= 0) {
        return NextResponse.json(
          { status: "error", message: "Nominal setoran harus positif." },
          { status: 400 }
        );
      }
      newSaved += deposit;
    }

    // Opsi 2: Tarik dana (withdraw)
    if (body?.withdrawAmount !== undefined) {
      const withdraw = parseFloat(body.withdrawAmount);
      if (isNaN(withdraw) || withdraw <= 0) {
        return NextResponse.json(
          { status: "error", message: "Nominal penarikan harus positif." },
          { status: 400 }
        );
      }
      if (withdraw > newSaved) {
        return NextResponse.json(
          { status: "error", message: "Saldo tabungan tidak mencukupi untuk ditarik." },
          { status: 400 }
        );
      }
      newSaved -= withdraw;
    }

    const targetNominal = body?.targetNominal ? parseFloat(body.targetNominal) : Number(current.target_nominal);
    const judul = body?.judul ? String(body.judul).trim() : current.judul;
    const status = newSaved >= targetNominal ? "completed" : "in_progress";

    const updated = await sql`
      UPDATE savings_goals
      SET 
        judul = ${judul},
        target_nominal = ${targetNominal},
        terkumpul_nominal = ${newSaved},
        status = ${status}
      WHERE id = ${goalId} AND user_id = ${session.userId}
      RETURNING id, judul, target_nominal, terkumpul_nominal, TO_CHAR(target_tanggal, 'YYYY-MM-DD') AS target_tanggal, warna, status
    `;

    return NextResponse.json({
      status: "success",
      message: "Target tabungan berhasil diperbarui.",
      goal: updated[0],
    });
  } catch (error: any) {
    console.error("Update savings error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal memperbarui target tabungan." },
      { status: 500 }
    );
  }
}

// DELETE /api/savings/[id]
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
    const goalId = parseInt(id, 10);
    if (isNaN(goalId)) {
      return NextResponse.json(
        { status: "error", message: "ID target tidak valid." },
        { status: 400 }
      );
    }

    const sql = getDb();
    const deleted = await sql`
      DELETE FROM savings_goals
      WHERE id = ${goalId} AND user_id = ${session.userId}
      RETURNING id
    `;

    if (deleted.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Target tabungan tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      message: "Target tabungan berhasil dihapus.",
    });
  } catch (error: any) {
    console.error("Delete savings error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal menghapus target tabungan." },
      { status: 500 }
    );
  }
}
