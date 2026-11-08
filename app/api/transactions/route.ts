import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb, initDbSchema } from "@/lib/db";

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
    const month = searchParams.get("month"); // '1' - '12' or null
    const year = searchParams.get("year");   // e.g. '2026' or null

    let transactions;
    let summary;

    if (month && year && month !== "all" && year !== "all") {
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);

      // Jalankan query transaksi dan kalkulasi summary secara paralel untuk performa maksimal
      [transactions, summary] = await Promise.all([
        sql`
          SELECT id, tipe, jumlah, deskripsi, TO_CHAR(tanggal, 'YYYY-MM-DD') AS tanggal, created_at
          FROM transactions
          WHERE user_id = ${session.userId}
            AND EXTRACT(MONTH FROM tanggal) = ${monthNum}
            AND EXTRACT(YEAR FROM tanggal) = ${yearNum}
          ORDER BY tanggal DESC, id DESC
        `,
        sql`
          SELECT 
            COALESCE(SUM(CASE WHEN tipe = 'income' THEN jumlah ELSE 0 END), 0) AS total_income,
            COALESCE(SUM(CASE WHEN tipe = 'expense' THEN jumlah ELSE 0 END), 0) AS total_expense
          FROM transactions
          WHERE user_id = ${session.userId}
            AND EXTRACT(MONTH FROM tanggal) = ${monthNum}
            AND EXTRACT(YEAR FROM tanggal) = ${yearNum}
        `
      ]);
    } else {
      [transactions, summary] = await Promise.all([
        sql`
          SELECT id, tipe, jumlah, deskripsi, TO_CHAR(tanggal, 'YYYY-MM-DD') AS tanggal, created_at
          FROM transactions
          WHERE user_id = ${session.userId}
          ORDER BY tanggal DESC, id DESC
        `,
        sql`
          SELECT 
            COALESCE(SUM(CASE WHEN tipe = 'income' THEN jumlah ELSE 0 END), 0) AS total_income,
            COALESCE(SUM(CASE WHEN tipe = 'expense' THEN jumlah ELSE 0 END), 0) AS total_expense
          FROM transactions
          WHERE user_id = ${session.userId}
        `
      ]);
    }

    const totalIncome = Number(summary[0]?.total_income || 0);
    const totalExpense = Number(summary[0]?.total_expense || 0);
    const saldo = totalIncome - totalExpense;

    // Heartbeat update
    sql`UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ${session.userId}`.catch(() => {});

    return NextResponse.json({
      status: "success",
      summary: {
        total_income: totalIncome,
        total_expense: totalExpense,
        saldo: saldo,
      },
      transactions: transactions.map((t) => ({
        id: Number(t.id),
        tipe: t.tipe,
        jumlah: Number(t.jumlah),
        deskripsi: t.deskripsi || "-",
        tanggal: t.tanggal,
        created_at: t.created_at,
      })),
    });
  } catch (error: any) {
    console.error("Fetch transactions error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal mengambil data transaksi." },
      { status: 500 }
    );
  }
}

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
    const jumlah = Number(body?.jumlah);
    const deskripsi = body?.deskripsi ? String(body.deskripsi).trim() : "";
    const tanggal = body?.tanggal ? String(body.tanggal).trim() : "";

    if (!tipe || (tipe !== "income" && tipe !== "expense")) {
      return NextResponse.json(
        { status: "error", message: "Tipe transaksi harus 'income' atau 'expense'." },
        { status: 400 }
      );
    }

    if (isNaN(jumlah) || jumlah <= 0) {
      return NextResponse.json(
        { status: "error", message: "Jumlah harus berupa angka lebih besar dari 0." },
        { status: 400 }
      );
    }

    if (!tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
      return NextResponse.json(
        { status: "error", message: "Format tanggal tidak valid (gunakan YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    await initDbSchema();
    const sql = getDb();

    const result = await sql`
      INSERT INTO transactions (user_id, tipe, jumlah, deskripsi, tanggal)
      VALUES (${session.userId}, ${tipe}, ${jumlah}, ${deskripsi}, ${tanggal})
      RETURNING id, tipe, jumlah, deskripsi, TO_CHAR(tanggal, 'YYYY-MM-DD') AS tanggal, created_at
    `;

    // Heartbeat update
    sql`UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ${session.userId}`.catch(() => {});

    return NextResponse.json({
      status: "success",
      message: "Transaksi berhasil dicatat.",
      transaction: result[0],
    });
  } catch (error: any) {
    console.error("Add transaction error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal menambahkan transaksi." },
      { status: 500 }
    );
  }
}
