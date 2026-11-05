import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

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
        SELECT TO_CHAR(tanggal, 'YYYY-MM-DD') AS tanggal, tipe, jumlah, deskripsi
        FROM transactions
        WHERE user_id = ${session.userId}
          AND EXTRACT(MONTH FROM tanggal) = ${parseInt(month, 10)}
          AND EXTRACT(YEAR FROM tanggal) = ${parseInt(year, 10)}
        ORDER BY tanggal ASC, id ASC
      `;
    } else {
      rows = await sql`
        SELECT TO_CHAR(tanggal, 'YYYY-MM-DD') AS tanggal, tipe, jumlah, deskripsi
        FROM transactions
        WHERE user_id = ${session.userId}
        ORDER BY tanggal ASC, id ASC
      `;
    }

    // Buat format CSV dengan escaping standar
    const headers = ["No", "Tanggal", "Tipe", "Nominal (IDR)", "Deskripsi"];
    const csvLines = [headers.join(",")];

    rows.forEach((row, index) => {
      const tipeLabel = row.tipe === "income" ? "Pemasukan" : "Pengeluaran";
      const sanitizedDesc = `"${(row.deskripsi || "").replace(/"/g, '""')}"`;
      csvLines.push(
        `${index + 1},${row.tanggal},${tipeLabel},${row.jumlah},${sanitizedDesc}`
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
