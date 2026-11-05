import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getDb, initDbSchema } from "@/lib/db";

// PATCH: Mengubah role akun pengguna (admin <-> user)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { status: "error", message: "Akses ditolak. Fitur ini hanya untuk mode Developer/Admin." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const targetUserId = parseInt(id, 10);

    if (isNaN(targetUserId)) {
      return NextResponse.json(
        { status: "error", message: "ID pengguna tidak valid." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const newRole = body?.role;

    if (newRole !== "admin" && newRole !== "user") {
      return NextResponse.json(
        { status: "error", message: "Role harus 'admin' atau 'user'." },
        { status: 400 }
      );
    }

    // Proteksi: Admin tidak boleh mencabut role admin dari dirinya sendiri
    if (session.userId === targetUserId && newRole !== "admin") {
      return NextResponse.json(
        { status: "error", message: "Anda tidak dapat mencabut role admin akun Anda sendiri untuk mencegah lockout sistem." },
        { status: 400 }
      );
    }

    await initDbSchema();
    const sql = getDb();

    const updated = await sql`
      UPDATE users 
      SET role = ${newRole} 
      WHERE id = ${targetUserId} 
      RETURNING id, username, role
    `;

    if (updated.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      message: `Role pengguna @${updated[0].username} berhasil diubah menjadi ${newRole.toUpperCase()}.`,
      user: updated[0],
    });
  } catch (error: any) {
    console.error("Update role error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal mengubah role pengguna." },
      { status: 500 }
    );
  }
}

// DELETE: Menghapus akun pengguna beserta seluruh riwayat transaksinya
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { status: "error", message: "Akses ditolak. Fitur ini hanya untuk mode Developer/Admin." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const targetUserId = parseInt(id, 10);

    if (isNaN(targetUserId)) {
      return NextResponse.json(
        { status: "error", message: "ID pengguna tidak valid." },
        { status: 400 }
      );
    }

    // Proteksi: Admin tidak boleh menghapus akunnya sendiri
    if (session.userId === targetUserId) {
      return NextResponse.json(
        { status: "error", message: "Anda tidak dapat menghapus akun Anda sendiri dari Dev Cockpit." },
        { status: 400 }
      );
    }

    await initDbSchema();
    const sql = getDb();

    // Hapus seluruh transaksi milik user terlebih dahulu
    await sql`
      DELETE FROM transactions WHERE user_id = ${targetUserId}
    `;

    // Hapus akun user
    const deleted = await sql`
      DELETE FROM users WHERE id = ${targetUserId} RETURNING id, username
    `;

    if (deleted.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      message: `Akun @${deleted[0].username} dan seluruh data transaksinya berhasil dihapus permanen.`,
    });
  } catch (error: any) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal menghapus pengguna." },
      { status: 500 }
    );
  }
}
