import { NextResponse } from "next/server";
import { verifyFeedToken } from "@/lib/auth";
import { getDb, initDbSchema } from "@/lib/db";

// Bersihkan teks agar tidak merusak format CSV dan aman dari formula injection
function cleanCsvText(val: string): string {
  if (!val) return '""';
  let str = String(val).trim();
  // Netralkan jika diawali karakter formula spreadsheet berbahaya
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

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
      return new NextResponse("Error: Token tidak valid atau sesi telah berakhir.", {
        status: 401,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    await initDbSchema();
    const sql = getDb();

    // Ambil SEMUA transaksi pengguna terurut kronologis dari awal ke terbaru
    const rows = await sql`
      SELECT 
        id,
        tipe,
        jumlah,
        deskripsi,
        TO_CHAR(tanggal, 'DD/MM/YYYY') AS tanggal_formatted
      FROM transactions
      WHERE user_id = ${payload.userId}
      ORDER BY tanggal ASC, id ASC
    `;

    // 8 Kolom Standar Keuangan: Bersih, Rapi, Tanpa Jam, Tanpa Formula Aneh
    const headers = [
      "No",
      "Tanggal",
      "Kategori",
      "Pemasukan (IDR)",
      "Pengeluaran (IDR)",
      "Saldo Bersih (IDR)",
      "Saldo Akumulasi (IDR)",
      "Keterangan",
    ];

    let runningBalance = 0;
    const csvLines = [headers.join(",")];

    rows.forEach((row, index) => {
      const jumlah = Number(row.jumlah);
      const isIncome = row.tipe === "income";

      const pemasukan = isIncome ? jumlah : 0;
      const pengeluaran = !isIncome ? jumlah : 0;
      const saldoBersih = isIncome ? jumlah : -jumlah;

      runningBalance += saldoBersih;

      const kategori = isIncome ? "PEMASUKAN" : "PENGELUARAN";
      const keterangan = cleanCsvText(row.deskripsi || "-");
      const tanggal = row.tanggal_formatted; // Murni string DD/MM/YYYY tanpa tanda kutip ganda/sama dengan

      csvLines.push(
        [
          index + 1,
          tanggal,
          kategori,
          pemasukan,
          pengeluaran,
          saldoBersih,
          runningBalance,
          keterangan,
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
    console.error("Sheets feed error:", error);
    return new NextResponse("Error: Gagal memproses feed data: " + error.message, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
