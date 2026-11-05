import { NextResponse } from "next/server";
import { verifyFeedToken } from "@/lib/auth";
import { getDb, initDbSchema } from "@/lib/db";

// Format mata uang Rupiah yang sangat jelas dan ramah orang awam (contoh: "Rp 1.000.000")
function formatRupiah(num: number): string {
  const isNeg = num < 0;
  const abs = Math.abs(num);
  const formatted = new Intl.NumberFormat("id-ID").format(abs);
  return isNeg ? `"-Rp ${formatted}"` : `"Rp ${formatted}"`;
}

// Bersihkan teks agar tidak merusak format CSV dan aman dari formula injection
function cleanCsvText(val: string): string {
  if (!val) return '""';
  let str = String(val).trim();
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
        TO_CHAR(tanggal, 'DD/MM/YYYY') AS tanggal_formatted,
        TO_CHAR(tanggal, 'DD') AS hari,
        TO_CHAR(tanggal, 'MM') AS bulan,
        TO_CHAR(tanggal, 'YYYY') AS tahun
      FROM transactions
      WHERE user_id = ${payload.userId}
      ORDER BY tanggal ASC, id ASC
    `;

    // 11 Kolom Lengkap, Rapi & Nominal Rupiah yang Jelas (Format: Rp 1.000.000)
    const headers = [
      "No",
      "Tanggal",
      "Hari",
      "Bulan",
      "Tahun",
      "Kategori",
      "Pemasukan (Rp)",
      "Pengeluaran (Rp)",
      "Nominal Bersih (Rp)",
      "Saldo Berjalan (Rp)",
      "Keterangan",
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

      const kategori = isIncome ? "PEMASUKAN" : "PENGELUARAN";
      const keterangan = cleanCsvText(row.deskripsi || "-");

      csvLines.push(
        [
          index + 1,
          row.tanggal_formatted,
          row.hari,
          row.bulan,
          row.tahun,
          kategori,
          formatRupiah(pemasukan),
          formatRupiah(pengeluaran),
          formatRupiah(nominalBersih),
          formatRupiah(runningBalance),
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
