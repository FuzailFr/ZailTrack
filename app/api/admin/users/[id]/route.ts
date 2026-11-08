import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionUser, hasAdminAccess } from "@/lib/auth";
import { getDb, initDbSchema } from "@/lib/db";
import { logAudit } from "@/lib/logger";
import { getClientIp } from "@/lib/security";

// PATCH: Kelola user (ubah role, status suspend/ban/active, atau reset password)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session || !hasAdminAccess(session.role)) {
      return NextResponse.json(
        { status: "error", message: "Akses ditolak. Fitur ini khusus Admin/Developer." },
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
    const { role: newRole, status: newStatus, resetPassword } = body || {};

    await initDbSchema();
    const sql = getDb();

    // Ambil data user target
    const targetUsers = await sql`SELECT id, username, role, status FROM users WHERE id = ${targetUserId} LIMIT 1`;
    if (targetUsers.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }
    const target = targetUsers[0];

    // Proteksi Anti-Lockout Diri Sendiri
    if (session.userId === targetUserId) {
      if (newRole && newRole !== session.role) {
        return NextResponse.json(
          { status: "error", message: "Anda tidak dapat mengubah role akun Anda sendiri untuk mencegah lockout sistem." },
          { status: 400 }
        );
      }
      if (newStatus && newStatus !== "active") {
        return NextResponse.json(
          { status: "error", message: "Anda tidak dapat menangguhkan (suspend) atau memblokir (ban) akun Anda sendiri." },
          { status: 400 }
        );
      }
    }

    // Hak Otoritas Role
    if (newRole === "developer" && session.role !== "developer") {
      return NextResponse.json(
        { status: "error", message: "Hanya akun Developer yang dapat memberikan hak Developer." },
        { status: 403 }
      );
    }

    if (target.role === "developer" && session.role !== "developer") {
      return NextResponse.json(
        { status: "error", message: "Hanya Developer yang dapat memodifikasi akun Developer lain." },
        { status: 403 }
      );
    }

    const updates: any = {};
    const auditChanges: Record<string, any> = {};

    // 1. Role Change
    if (newRole) {
      if (!["user", "admin", "developer"].includes(newRole)) {
        return NextResponse.json(
          { status: "error", message: "Role harus 'user', 'admin', atau 'developer'." },
          { status: 400 }
        );
      }
      await sql`UPDATE users SET role = ${newRole} WHERE id = ${targetUserId}`;
      auditChanges.oldRole = target.role;
      auditChanges.newRole = newRole;
      updates.role = newRole;
    }

    // 2. Status Change (active / suspended / banned)
    if (newStatus) {
      if (!["active", "suspended", "banned"].includes(newStatus)) {
        return NextResponse.json(
          { status: "error", message: "Status harus 'active', 'suspended', atau 'banned'." },
          { status: 400 }
        );
      }
      await sql`UPDATE users SET status = ${newStatus} WHERE id = ${targetUserId}`;
      auditChanges.oldStatus = target.status;
      auditChanges.newStatus = newStatus;
      updates.status = newStatus;
    }

    // 3. Reset Password oleh Admin
    if (resetPassword) {
      if (String(resetPassword).length < 6) {
        return NextResponse.json(
          { status: "error", message: "Password baru minimal 6 karakter." },
          { status: 400 }
        );
      }
      const hashed = await bcrypt.hash(String(resetPassword), 10);
      await sql`UPDATE users SET password = ${hashed}, reset_token = NULL, reset_token_expires_at = NULL WHERE id = ${targetUserId}`;
      auditChanges.passwordReset = true;
      updates.passwordReset = true;
    }

    const ip = getClientIp(request.headers);
    await logAudit({
      userId: session.userId,
      username: session.username,
      role: session.role,
      action: "user:update",
      targetType: "user",
      targetId: targetUserId,
      details: auditChanges,
      ipAddress: ip,
      status: "success",
    });

    return NextResponse.json({
      status: "success",
      message: `Data akun @${target.username} berhasil diperbarui.`,
      updates,
    });
  } catch (error: any) {
    console.error("Admin update user error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal memperbarui pengguna." },
      { status: 500 }
    );
  }
}

// DELETE: Hapus akun pengguna secara permanen
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session || !hasAdminAccess(session.role)) {
      return NextResponse.json(
        { status: "error", message: "Akses ditolak. Fitur ini khusus Admin/Developer." },
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

    // Anti-lockout
    if (session.userId === targetUserId) {
      return NextResponse.json(
        { status: "error", message: "Anda tidak dapat menghapus akun Anda sendiri dari Admin Cockpit." },
        { status: 400 }
      );
    }

    await initDbSchema();
    const sql = getDb();

    const targetUsers = await sql`SELECT id, username, role FROM users WHERE id = ${targetUserId} LIMIT 1`;
    if (targetUsers.length === 0) {
      return NextResponse.json(
        { status: "error", message: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    const target = targetUsers[0];
    if (target.role === "developer" && session.role !== "developer") {
      return NextResponse.json(
        { status: "error", message: "Hanya akun Developer yang dapat menghapus sesama Developer." },
        { status: 403 }
      );
    }

    // Hapus data transaksi terkait
    await sql`DELETE FROM transactions WHERE user_id = ${targetUserId}`;
    // Hapus akun pengguna
    await sql`DELETE FROM users WHERE id = ${targetUserId}`;

    const ip = getClientIp(request.headers);
    await logAudit({
      userId: session.userId,
      username: session.username,
      role: session.role,
      action: "user:delete",
      targetType: "user",
      targetId: targetUserId,
      details: { deletedUsername: target.username, role: target.role },
      ipAddress: ip,
      status: "success",
    });

    return NextResponse.json({
      status: "success",
      message: `Akun @${target.username} dan seluruh transaksinya berhasil dihapus permanen.`,
    });
  } catch (error: any) {
    console.error("Admin delete user error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Gagal menghapus pengguna." },
      { status: 500 }
    );
  }
}
