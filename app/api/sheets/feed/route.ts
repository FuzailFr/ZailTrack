import { NextResponse } from "next/server";
import { verifyFeedToken } from "@/lib/auth";
import { getDb, initDbSchema } from "@/lib/db";

// Proteksi Anti-Hack: Formula / CSV Injection Sanitizer (OWASP Standard)
function sanitizeCell(val: string): string {
  if (!val) return '""';
  let str = String(val).trim();
  // Jika karakter pertama adalah simbol formula spreadsheet, netralkan dengan tanda kutip tunggal
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

    // Ambil SEMUA transaksi pengguna terurut kronologis dari awal sampai terbaru
    const rows = await sql`
      SELECT 
        id,
        tipe,
        jumlah,
        deskripsi,
        TO_CHAR(tanggal, 'DD') AS hari,
        TO_CHAR(tanggal, 'MM') AS bulan,
        TO_CHAR(tanggal, 'YYYY') AS tahun,
        TO_CHAR(tanggal, 'DD/MM/YYYY') AS tanggal_formatted
      FROM transactions
      WHERE user_id = ${payload.userId}
      ORDER BY tanggal ASC, id ASC
    `;

    // Kolom terpisah yang sangat jelas, rapi, dan mudah dibaca tanpa jam
    const headers = [
      "No",
      "Tanggal (DD/MM/YYYY)",
      "Hari",
      "Bulan",
      "Tahun",
      "Kategori",
      "Pemasukan (IDR)",
      "Pengeluaran (IDR)",
      "Nominal Bersih (IDR)",
      "Saldo Berjalan (IDR)",
      "Keterangan / Deskripsi",
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
      const sanitizedDesc = sanitizeCell(row.deskripsi || "-");

      // Format formula literal ="DD/MM/YYYY" agar Google Sheets tidak mengubahnya jadi angka serial 46331
      const tanggalCell = `="${row.tanggal_formatted}"`;
      const hariCell = `="${row.hari}"`;
      const bulanCell = `="${row.bulan}"`;
      const tahunCell = `="${row.tahun}"`;

      csvLines.push(
        [
          index + 1,
          tanggalCell,
          hariCell,
          bulanCell,
          tahunCell,
          kategori,
          pemasukan,
          pengeluaran,
          nominalBersih,
          runningBalance,
          sanitizedDesc,
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
