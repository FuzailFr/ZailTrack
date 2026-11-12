import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb, initDbSchema } from "@/lib/db";

// GET /api/savings
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

    const goals = await sql`
      SELECT 
        id, 
        judul, 
        target_nominal, 
        terkumpul_nominal, 
        TO_CHAR(target_tanggal, 'YYYY-MM-DD') AS target_tanggal, 
        warna, 
        status, 
        created_at
      FROM savings_goals
      WHERE user_id = ${session.userId}
      ORDER BY status ASC, id DESC
    `;

    let totalTarget = 0;
    let totalSaved = 0;

    const items = goals.map((g: any) => {
      const target = Number(g.target_nominal);
      const saved = Number(g.terkumpul_nominal);
      totalTarget += target;
      totalSaved += saved;
      const progress = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
      return {
        id: g.id,
        judul: g.judul,
        target,
        saved,
        progress,
        targetTanggal: g.target_tanggal,
        warna: g.warna || "#10b981",
        status: g.status,
        isCompleted: saved >= target || g.status === "completed",
        createdAt: g.created_at,
      };
    });

    const overallProgress = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

    return NextResponse.json({
      status: "success",
      totalTarget,
      totalSaved,
      overallProgress,
      goals: items,
    });
  } catch (error: any) {
    console.error("Savings goals fetch error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal memuat target tabungan." },
      { status: 500 }
    );
  }
}

// POST /api/savings
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
    const judul = body?.judul ? String(body.judul).trim().slice(0, 100) : "";
    const target = parseFloat(body?.targetNominal);
    const initialSaved = parseFloat(body?.initialSaved || "0");
    const targetTanggal = body?.targetTanggal ? String(body.targetTanggal).trim() : null;
    const warna = body?.warna ? String(body.warna).trim().slice(0, 20) : "#10b981";

    if (!judul) {
      return NextResponse.json(
        { status: "error", message: "Judul target tabungan wajib diisi." },
        { status: 400 }
      );
    }

    if (isNaN(target) || target <= 0) {
      return NextResponse.json(
        { status: "error", message: "Target nominal harus lebih besar dari 0." },
        { status: 400 }
      );
    }

    await initDbSchema();
    const sql = getDb();

    const result = await sql`
      INSERT INTO savings_goals (user_id, judul, target_nominal, terkumpul_nominal, target_tanggal, warna)
      VALUES (
        ${session.userId}, 
        ${judul}, 
        ${target}, 
        ${isNaN(initialSaved) || initialSaved < 0 ? 0 : initialSaved}, 
        ${targetTanggal ? targetTanggal : null}::date, 
        ${warna}
      )
      RETURNING id, judul, target_nominal, terkumpul_nominal, TO_CHAR(target_tanggal, 'YYYY-MM-DD') AS target_tanggal, warna, status, created_at
    `;

    return NextResponse.json({
      status: "success",
      message: `Target tabungan "${judul}" berhasil dibuat.`,
      goal: result[0],
    });
  } catch (error: any) {
    console.error("Savings goal create error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal membuat target tabungan." },
      { status: 500 }
    );
  }
}
