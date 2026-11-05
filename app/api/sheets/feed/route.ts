import { NextResponse } from "next/server";
import { verifyFeedToken } from "@/lib/auth";
import { getDb, initDbSchema } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return new NextResponse("Error: Token Google Sheets diperlukan.", {
        status: 400,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const payload = await verifyFeedToken(token);
    if (!payload) {
      return new NextResponse("Error: Token Google Sheets tidak valid atau sudah kedaluwarsa.", {
        status: 401,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    await initDbSchema();
    const sql = getDb();

    // Ambil SEMUA data transaksi pengguna dari tanggal kapanpun (urut kronologis dari awal ke terbaru)
    const rows = await sql`
      SELECT 
        id,
        tipe,
        jumlah,
        deskripsi,
        TO_CHAR(tanggal, 'YYYY-MM-DD') AS tanggal,
        TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at
      FROM transactions
      WHERE user_id = ${payload.userId}
      ORDER BY tanggal ASC, id ASC
    `;

    // Susun header yang rapi, informatif, dan mudah dianalisis
    const headers = [
      "No",
      "Tanggal",
      "Tipe",
      "Pemasukan (IDR)",
      "Pengeluaran (IDR)",
      "Nominal Bersih (IDR)",
      "Saldo Berjalan (IDR)",
      "Keterangan / Deskripsi",
      "Waktu Pencatatan",
    ];

    let runningBalance = 0;
    const csvLines = [headers.join(",")];

    rows.forEach((row, index) => {
      const jumlah = Number(row.jumlah);
      const isIncome = row.tipe === "income";

      const pemasukan = isIncome ? jumlah : 0;
      const pengeluaran = !isIncome ? jumlah : 0;
      const nominalBersih = isIncome ? jumlah : -jumlah;

      runningBalance += nominalBersih;

      const cleanDesc = `"${(row.deskripsi || "-").replace(/"/g, '""')}"`;
      const tipeLabel = isIncome ? "PEMASUKAN (+)" : "PENGELUARAN (-)";

      csvLines.push(
        [
          index + 1,
          row.tanggal,
          tipeLabel,
          pemasukan,
          pengeluaran,
          nominalBersih,
          runningBalance,
          cleanDesc,
          row.created_at,
        ].join(",")
      );
    });

    const csvContent = csvLines.join("\r\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error: any) {
    console.error("Feed error:", error);
    return new NextResponse("Error: Gagal memproses feed data: " + error.message, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
