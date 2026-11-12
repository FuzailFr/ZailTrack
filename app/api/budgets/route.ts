import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb, initDbSchema } from "@/lib/db";

// GET /api/budgets?month=11&year=2026
export async function GET(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    await initDbSchema();
    const sql = getDb();

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);

    // Ambil daftar anggaran yang disetel untuk bulan ini
    const budgets = await sql`
      SELECT id, kategori, nominal_limit, bulan, tahun, created_at
      FROM budgets
      WHERE user_id = ${session.userId}
        AND bulan = ${month}
        AND tahun = ${year}
      ORDER BY nominal_limit DESC
    `;

    // Ambil pengeluaran riil per kategori pada bulan/tahun ini
    const spentByCategory = await sql`
      SELECT 
        COALESCE(kategori, 'Umum') AS kategori,
        COALESCE(SUM(jumlah), 0)::numeric AS total_spent
      FROM transactions
      WHERE user_id = ${session.userId}
        AND tipe = 'expense'
        AND EXTRACT(MONTH FROM tanggal) = ${month}
        AND EXTRACT(YEAR FROM tanggal) = ${year}
      GROUP BY kategori
    `;

    const spentMap: Record<string, number> = {};
    let totalExpenseMonth = 0;
    for (const row of spentByCategory) {
      const val = Number(row.total_spent || 0);
      spentMap[row.kategori] = val;
      totalExpenseMonth += val;
    }

    const items = budgets.map((b: any) => {
      const limit = Number(b.nominal_limit);
      const spent = spentMap[b.kategori] || 0;
      const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      const remaining = limit - spent;
      return {
        id: b.id,
        kategori: b.kategori,
        limit,
        spent,
        percentage,
        remaining,
        isOverBudget: spent > limit,
        bulan: b.bulan,
        tahun: b.tahun,
      };
    });

    return NextResponse.json({
      status: "success",
      month,
      year,
      totalExpenseMonth,
      budgets: items,
    });
  } catch (error: any) {
    console.error("Budget fetch error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal memuat anggaran." },
      { status: 500 }
    );
  }
}

// POST /api/budgets
export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const kategori = body?.kategori ? String(body.kategori).trim().slice(0, 50) : "";
    const limit = parseFloat(body?.limit);
    const now = new Date();
    const month = parseInt(body?.month || String(now.getMonth() + 1), 10);
    const year = parseInt(body?.year || String(now.getFullYear()), 10);

    if (!kategori) {
      return NextResponse.json(
        { status: "error", message: "Kategori anggaran wajib ditentukan." },
        { status: 400 }
      );
    }

    if (isNaN(limit) || limit <= 0) {
      return NextResponse.json(
        { status: "error", message: "Batas nominal anggaran harus berupa angka positif." },
        { status: 400 }
      );
    }

    await initDbSchema();
    const sql = getDb();

    // Upsert budget
    const result = await sql`
      INSERT INTO budgets (user_id, kategori, nominal_limit, bulan, tahun)
      VALUES (${session.userId}, ${kategori}, ${limit}, ${month}, ${year})
      ON CONFLICT (user_id, kategori, bulan, tahun)
      DO UPDATE SET nominal_limit = EXCLUDED.nominal_limit
      RETURNING id, kategori, nominal_limit, bulan, tahun, created_at
    `;

    return NextResponse.json({
      status: "success",
      message: `Anggaran ${kategori} berhasil disimpan.`,
      budget: result[0],
    });
  } catch (error: any) {
    console.error("Budget save error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal menyimpan anggaran." },
      { status: 500 }
    );
  }
}

// DELETE /api/budgets?id=123
export async function DELETE(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "", 10);

    if (isNaN(id)) {
      return NextResponse.json(
        { status: "error", message: "ID anggaran tidak valid." },
        { status: 400 }
      );
    }

    await initDbSchema();
    const sql = getDb();

    const deleted = await sql`
      DELETE FROM budgets
      WHERE id = ${id} AND user_id = ${session.userId}
      RETURNING id
    `;

    if (deleted.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Anggaran tidak ditemukan atau bukan milik Anda." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      message: "Anggaran berhasil dihapus.",
    });
  } catch (error: any) {
    console.error("Budget delete error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal menghapus anggaran." },
      { status: 500 }
    );
  }
}
