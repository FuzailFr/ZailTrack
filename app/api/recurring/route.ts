import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb, initDbSchema } from "@/lib/db";

// GET /api/recurring
export async function GET() {
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

    const items = await sql`
      SELECT 
        id, 
        tipe, 
        jumlah, 
        kategori, 
        deskripsi, 
        frekuensi, 
        TO_CHAR(tanggal_berikutnya, 'YYYY-MM-DD') AS tanggal_berikutnya, 
        is_active, 
        created_at
      FROM recurring_transactions
      WHERE user_id = ${session.userId}
      ORDER BY is_active DESC, tanggal_berikutnya ASC
    `;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recurring = items.map((r: any) => {
      const nextDate = new Date(r.tanggal_berikutnya);
      const diffMs = nextDate.getTime() - today.getTime();
      const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return {
        id: r.id,
        tipe: r.tipe,
        jumlah: Number(r.jumlah),
        kategori: r.kategori,
        deskripsi: r.deskripsi,
        frekuensi: r.frekuensi,
        tanggalBerikutnya: r.tanggal_berikutnya,
        isActive: r.is_active,
        daysUntilDue,
        isOverdue: daysUntilDue < 0 && r.is_active,
        isDueSoon: daysUntilDue >= 0 && daysUntilDue <= 3 && r.is_active,
      };
    });

    const activeBills = recurring.filter((r) => r.isActive && r.tipe === "expense");
    const totalMonthlyBills = activeBills.reduce((acc, b) => acc + b.jumlah, 0);

    return NextResponse.json({
      status: "success",
      totalMonthlyBills,
      upcomingCount: activeBills.filter((b) => b.daysUntilDue >= 0 && b.daysUntilDue <= 7).length,
      recurring,
    });
  } catch (error: any) {
    console.error("Recurring fetch error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal memuat transaksi rutin." },
      { status: 500 }
    );
  }
}

// POST /api/recurring
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
    const tipe = body?.tipe;
    const jumlah = parseFloat(body?.jumlah);
    const kategori = body?.kategori ? String(body.kategori).trim().slice(0, 50) : "Tagihan";
    const deskripsi = body?.deskripsi ? String(body.deskripsi).trim().slice(0, 200) : "";
    const frekuensi = body?.frekuensi || "monthly";
    const tanggalBerikutnya = body?.tanggalBerikutnya ? String(body.tanggalBerikutnya).trim() : "";

    if (!tipe || (tipe !== "income" && tipe !== "expense")) {
      return NextResponse.json(
        { status: "error", message: "Tipe harus 'income' atau 'expense'." },
        { status: 400 }
      );
    }

    if (isNaN(jumlah) || jumlah <= 0) {
      return NextResponse.json(
        { status: "error", message: "Nominal harus berupa angka lebih besar dari 0." },
        { status: 400 }
      );
    }

    if (!deskripsi) {
      return NextResponse.json(
        { status: "error", message: "Deskripsi transaksi rutin wajib diisi." },
        { status: 400 }
      );
    }

    if (!tanggalBerikutnya || !/^\d{4}-\d{2}-\d{2}$/.test(tanggalBerikutnya)) {
      return NextResponse.json(
        { status: "error", message: "Tanggal jatuh tempo berikutnya tidak valid (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    await initDbSchema();
    const sql = getDb();

    const result = await sql`
      INSERT INTO recurring_transactions (
        user_id, tipe, jumlah, kategori, deskripsi, frekuensi, tanggal_berikutnya
      ) VALUES (
        ${session.userId}, ${tipe}, ${jumlah}, ${kategori}, ${deskripsi}, ${frekuensi}, ${tanggalBerikutnya}::date
      )
      RETURNING id, tipe, jumlah, kategori, deskripsi, frekuensi, TO_CHAR(tanggal_berikutnya, 'YYYY-MM-DD') AS tanggal_berikutnya, is_active, created_at
    `;

    return NextResponse.json({
      status: "success",
      message: `Transaksi rutin "${deskripsi}" berhasil didaftarkan.`,
      recurring: result[0],
    });
  } catch (error: any) {
    console.error("Recurring add error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal menambahkan transaksi rutin." },
      { status: 500 }
    );
  }
}
