import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

function formatRupiah(num: number): string {
  const isNeg = num < 0;
  const abs = Math.abs(num);
  const formatted = new Intl.NumberFormat("id-ID").format(abs);
  return isNeg ? `"-Rp ${formatted}"` : `"Rp ${formatted}"`;
}

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
    const session = await getSessionUser();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const sql = getDb();
    let rows;

    if (month && year && month !== "all" && year !== "all") {
      rows = await sql`
        SELECT 
          TO_CHAR(tanggal, 'DD/MM/YYYY') AS tanggal_formatted,
          TO_CHAR(tanggal, 'DD') AS hari,
          TO_CHAR(tanggal, 'MM') AS bulan,
          TO_CHAR(tanggal, 'YYYY') AS tahun,
          tipe, 
          jumlah, 
          deskripsi
        FROM transactions
        WHERE user_id = ${session.userId}
          AND EXTRACT(MONTH FROM tanggal) = ${parseInt(month, 10)}
          AND EXTRACT(YEAR FROM tanggal) = ${parseInt(year, 10)}
        ORDER BY tanggal ASC, id ASC
      `;
    } else {
      rows = await sql`
        SELECT 
          TO_CHAR(tanggal, 'DD/MM/YYYY') AS tanggal_formatted,
          TO_CHAR(tanggal, 'DD') AS hari,
          TO_CHAR(tanggal, 'MM') AS bulan,
          TO_CHAR(tanggal, 'YYYY') AS tahun,
          tipe, 
          jumlah, 
          deskripsi
        FROM transactions
        WHERE user_id = ${session.userId}
        ORDER BY tanggal ASC, id ASC
      `;
    }

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
    const filename = `zailtrack-transaksi-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return new NextResponse("Gagal mengekspor data: " + error.message, {
      status: 500,
    });
  }
}
