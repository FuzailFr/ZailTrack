"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Trash2,
  LogOut,
  Calendar,
  Filter,
  X,
  AlertCircle,
  FileSpreadsheet,
  Terminal,
  Users,
  Database,
  Activity,
  ShieldCheck,
  LayoutDashboard,
  Server,
  RefreshCw,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface Transaction {
  id: number;
  tipe: "income" | "expense";
  jumlah: number;
  deskripsi: string;
  tanggal: string;
  created_at: string;
}

interface SummaryData {
  total_income: number;
  total_expense: number;
  saldo: number;
}

interface DevMetrics {
  total_users: number;
  total_transactions: number;
  db_latency_ms: number;
  db_engine: string;
  db_version: string;
}

interface DevUserItem {
  id: number;
  username: string;
  role: string;
  created_at: string;
  total_transactions: number;
}

interface DevAuditItem {
  id: number;
  tipe: "income" | "expense";
  jumlah: number;
  deskripsi: string;
  tanggal: string;
  created_at: string;
  username: string;
}

const MONTHS = [
  { value: "all", label: "Semua Bulan" },
  { value: "1", label: "01 — Januari" },
  { value: "2", label: "02 — Februari" },
  { value: "3", label: "03 — Maret" },
  { value: "4", label: "04 — April" },
  { value: "5", label: "05 — Mei" },
  { value: "6", label: "06 — Juni" },
  { value: "7", label: "07 — Juli" },
  { value: "8", label: "08 — Agustus" },
  { value: "9", label: "09 — September" },
  { value: "10", label: "10 — Oktober" },
  { value: "11", label: "11 — November" },
  { value: "12", label: "12 — Desember" },
];

export default function DashboardPage() {
  const router = useRouter();

  // User State
  const [user, setUser] = useState<{ id: number; username: string; role: string } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Active View (User Mode vs Dev Mode)
  const [activeView, setActiveView] = useState<"user" | "dev">("user");

  // User Mode: Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    total_income: 0,
    total_expense: 0,
    saldo: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Filters
  const currentMonth = String(new Date().getMonth() + 1);
  const currentYear = String(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTipe, setFormTipe] = useState<"income" | "expense">("expense");
  const [formJumlah, setFormJumlah] = useState("");
  const [formDeskripsi, setFormDeskripsi] = useState("");
  const [formTanggal, setFormTanggal] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Dev Mode State
  const [devMetrics, setDevMetrics] = useState<DevMetrics | null>(null);
  const [devUsers, setDevUsers] = useState<DevUserItem[]>([]);
  const [devAudit, setDevAudit] = useState<DevAuditItem[]>([]);
  const [loadingDev, setLoadingDev] = useState(false);
  const [devTab, setDevTab] = useState<"users" | "audit">("users");

  // Format Mata Uang IDR
  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // 1. Check Auth
  useEffect(() => {
    async function verifyUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.replace("/");
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch {
        router.replace("/");
      } finally {
        setAuthChecking(false);
      }
    }
    verifyUser();
  }, [router]);

  // 2. Fetch User Transactions & Summary
  const fetchTransactions = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const query = new URLSearchParams();
      if (selectedMonth !== "all") query.set("month", selectedMonth);
      if (selectedYear !== "all") query.set("year", selectedYear);

      const res = await fetch(`/api/transactions?${query.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Gagal mengambil data transaksi.");
      }

      setTransactions(data.transactions || []);
      setSummary(data.summary || { total_income: 0, total_expense: 0, saldo: 0 });
    } catch (err: any) {
      setDbError(err.message || "Koneksi database bermasalah.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, selectedMonth, selectedYear]);

  // 3. Fetch Dev Data (Hanya jika admin & view === 'dev')
  const fetchDevData = async () => {
    if (!user || user.role !== "admin") return;
    setLoadingDev(true);
    try {
      const res = await fetch("/api/dev/overview");
      if (res.ok) {
        const data = await res.json();
        setDevMetrics(data.metrics);
        setDevUsers(data.users || []);
        setDevAudit(data.recent_audit_transactions || []);
      }
    } catch (err) {
      console.error("Gagal memuat data dev", err);
    } finally {
      setLoadingDev(false);
    }
  };

  useEffect(() => {
    if (activeView === "dev" && user?.role === "admin") {
      fetchDevData();
    }
  }, [activeView, user]);

  // Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/");
    }
  };

  // Handle Form Submit
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const parsedJumlah = parseFloat(formJumlah.replace(/[^0-9]/g, ""));
    if (isNaN(parsedJumlah) || parsedJumlah <= 0) {
      setModalError("Nominal transaksi harus berupa angka positif.");
      return;
    }

    if (!formTanggal) {
      setModalError("Tanggal transaksi wajib diisi.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipe: formTipe,
          jumlah: parsedJumlah,
          deskripsi: formDeskripsi.trim() || "-",
          tanggal: formTanggal,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal mencatat transaksi.");
      }

      setFormJumlah("");
      setFormDeskripsi("");
      setFormTanggal(new Date().toISOString().slice(0, 10));
      setIsModalOpen(false);

      fetchTransactions();
      if (user?.role === "admin") fetchDevData();
    } catch (err: any) {
      setModalError(err.message || "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id);
      const res = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Gagal menghapus transaksi.");
        return;
      }

      fetchTransactions();
      if (user?.role === "admin") fetchDevData();
    } catch (err) {
      console.error("Gagal menghapus transaksi", err);
    } finally {
      setDeletingId(null);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const query = new URLSearchParams();
    if (selectedMonth !== "all") query.set("month", selectedMonth);
    if (selectedYear !== "all") query.set("year", selectedYear);
    window.open(`/api/transactions/export?${query.toString()}`, "_blank");
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-xs text-[var(--text-secondary)] tracking-wider">
            ZAILTRACK // INITIALIZING_LEDGER...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-8">
      {/* Top Header */}
      <header className="max-w-6xl w-full mx-auto pb-6 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-sm font-mono font-bold text-[var(--accent)] shadow-sm">
            ZT
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">ZailTrack</h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]">
                v2.0
              </span>
              {user?.role === "admin" && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                  <ShieldCheck size={11} /> DEV / ADMIN
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-mono mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              <span>USER // {user?.username}</span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Switcher Mode: Khusus Akun Admin/Dev */}
          {user?.role === "admin" && (
            <div className="flex items-center p-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveView("user")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeView === "user"
                    ? "bg-[var(--text-primary)] text-[var(--bg)] font-bold shadow-xs"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <LayoutDashboard size={13} />
                <span>Mode User</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView("dev")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeView === "dev"
                    ? "bg-amber-500 text-black font-bold shadow-xs"
                    : "text-[var(--text-muted)] hover:text-amber-500"
                }`}
              >
                <Terminal size={13} />
                <span>Mode Dev</span>
              </button>
            </div>
          )}

          <ThemeToggle />
          <button
            onClick={handleLogout}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs font-mono text-[var(--text-secondary)] hover:text-rose-500 hover:border-rose-500/30 transition-colors cursor-pointer"
          >
            <LogOut size={13} />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-6xl w-full mx-auto my-8 space-y-8 flex-1">
        {/* ============================================================== */}
        {/* VIEW 1: DEVELOPER COCKPIT (Hanya Muncul di Mode Dev) */}
        {/* ============================================================== */}
        {activeView === "dev" && user?.role === "admin" ? (
          <div className="space-y-6 animate-in fade-in">
            {/* Dev Mode Banner */}
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-amber-500 uppercase tracking-wider">
                  <Terminal size={15} />
                  <span>Developer & System Cockpit</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Anda berada dalam panel kendali sistem. Anda dapat memantau performa database, audit seluruh transaksi platform, dan memeriksa akun terdaftar.
                </p>
              </div>
              <button
                onClick={fetchDevData}
                disabled={loadingDev}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-amber-500/30 bg-[var(--surface)] text-xs font-mono text-amber-500 hover:bg-amber-500/10 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={12} className={loadingDev ? "animate-spin" : ""} />
                <span>Refresh Data</span>
              </button>
            </div>

            {/* Dev System Metrics */}
            <section className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="technical-card p-4 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)] uppercase">
                  <span>Engine Database</span>
                  <Database size={15} className="text-amber-500" />
                </div>
                <div className="text-lg font-mono font-bold">{devMetrics?.db_engine || "Neon Postgres"}</div>
                <p className="text-[11px] font-mono text-[var(--text-muted)]">{devMetrics?.db_version || "PostgreSQL 17"}</p>
              </div>

              <div className="technical-card p-4 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)] uppercase">
                  <span>Ping / Latensi</span>
                  <Activity size={15} className="text-emerald-500" />
                </div>
                <div className="text-lg font-mono font-bold text-emerald-500">
                  {devMetrics?.db_latency_ms ? `${devMetrics.db_latency_ms} ms` : "Checking..."}
                </div>
                <p className="text-[11px] font-mono text-[var(--text-muted)]">Singapore Southeast Region</p>
              </div>

              <div className="technical-card p-4 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)] uppercase">
                  <span>Total Pengguna</span>
                  <Users size={15} className="text-[var(--accent)]" />
                </div>
                <div className="text-lg font-mono font-bold">{devMetrics?.total_users ?? 0} Akun</div>
                <p className="text-[11px] font-mono text-[var(--text-muted)]">Tersimpan di tabel users</p>
              </div>

              <div className="technical-card p-4 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)] uppercase">
                  <span>Total Transaksi Global</span>
                  <Server size={15} className="text-indigo-400" />
                </div>
                <div className="text-lg font-mono font-bold">{devMetrics?.total_transactions ?? 0} Entri</div>
                <p className="text-[11px] font-mono text-[var(--text-muted)]">Semua catatan keuangan sistem</p>
              </div>
            </section>

            {/* Dev Tabs */}
            <div className="technical-card rounded-xl overflow-hidden">
              <div className="p-3 border-b border-[var(--border)] flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDevTab("users")}
                  className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors cursor-pointer ${
                    devTab === "users"
                      ? "bg-[var(--text-primary)] text-[var(--bg)] font-bold"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Daftar Pengguna ({devUsers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDevTab("audit")}
                  className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors cursor-pointer ${
                    devTab === "audit"
                      ? "bg-[var(--text-primary)] text-[var(--bg)] font-bold"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Audit Transaksi Global ({devAudit.length})
                </button>
              </div>

              {devTab === "users" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">User ID</th>
                        <th className="py-3 px-4">Username</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Transaksi Dicatat</th>
                        <th className="py-3 px-4">Terdaftar Sejak</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {devUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-[var(--surface-hover)]">
                          <td className="py-3 px-4 text-[var(--text-muted)]">#{u.id}</td>
                          <td className="py-3 px-4 font-bold text-[var(--text-primary)]">
                            {u.username}
                          </td>
                          <td className="py-3 px-4">
                            {u.role === "admin" ? (
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20 text-[10px]">
                                ADMIN / DEV
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border)] text-[10px]">
                                USER
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">{u.total_transactions} transaksi</td>
                          <td className="py-3 px-4 text-[var(--text-muted)]">
                            {new Date(u.created_at).toLocaleString("id-ID")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-4">ID</th>
                        <th className="py-3 px-4">Pemilik (User)</th>
                        <th className="py-3 px-4">Tanggal</th>
                        <th className="py-3 px-4">Deskripsi</th>
                        <th className="py-3 px-4">Tipe</th>
                        <th className="py-3 px-4 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {devAudit.map((a) => (
                        <tr key={a.id} className="hover:bg-[var(--surface-hover)]">
                          <td className="py-3 px-4 text-[var(--text-muted)]">#{a.id}</td>
                          <td className="py-3 px-4 font-bold text-[var(--text-primary)]">
                            {a.username}
                          </td>
                          <td className="py-3 px-4 text-[var(--text-secondary)]">{a.tanggal}</td>
                          <td className="py-3 px-4 font-sans font-medium">{a.deskripsi}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                a.tipe === "income"
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : "bg-rose-500/10 text-rose-500"
                              }`}
                            >
                              {a.tipe.toUpperCase()}
                            </span>
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-bold ${
                              a.tipe === "income" ? "text-emerald-500" : "text-rose-500"
                            }`}
                          >
                            {a.tipe === "income" ? `+ ${formatIDR(a.jumlah)}` : `- ${formatIDR(a.jumlah)}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* VIEW 2: STANDARD USER LEDGER & PERSONAL FINANCE                */
          /* ============================================================== */
          <div className="space-y-8 animate-in fade-in">
            {/* Database Warning if DATABASE_URL missing or failed */}
            {dbError && (
              <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-mono space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle size={15} />
                  <span>Koneksi Database Neon Belum Dikonfigurasi</span>
                </div>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  Pastikan environment variable <code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">DATABASE_URL</code> sudah disetel pada file <code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">.env.local</code> atau pada dashboard Vercel Settings.
                </p>
              </div>
            )}

            {/* Financial Metrics Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Saldo Bersih */}
              <div className="technical-card p-5 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">
                  <span>Saldo Bersih (Net)</span>
                  <Wallet size={16} className="text-[var(--accent)]" />
                </div>
                <div
                  className={`text-2xl sm:text-3xl font-mono font-bold tracking-tight ${
                    summary.saldo >= 0 ? "text-[var(--text-primary)]" : "text-[var(--expense)]"
                  }`}
                >
                  {formatIDR(summary.saldo)}
                </div>
                <p className="text-[11px] font-mono text-[var(--text-muted)]">
                  Akumulasi pemasukan dikurangi pengeluaran.
                </p>
              </div>

              {/* Card 2: Total Pemasukan */}
              <div className="technical-card p-5 rounded-xl space-y-2 border-l-4 border-l-emerald-500">
                <div className="flex items-center justify-between text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  <span>Total Pemasukan</span>
                  <TrendingUp size={16} />
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {formatIDR(summary.total_income)}
                </div>
                <p className="text-[11px] font-mono text-[var(--text-muted)]">
                  Total dana masuk dalam periode terpilih.
                </p>
              </div>

              {/* Card 3: Total Pengeluaran */}
              <div className="technical-card p-5 rounded-xl space-y-2 border-l-4 border-l-rose-500">
                <div className="flex items-center justify-between text-xs font-mono text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                  <span>Total Pengeluaran</span>
                  <TrendingDown size={16} />
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-rose-600 dark:text-rose-400">
                  {formatIDR(summary.total_expense)}
                </div>
                <p className="text-[11px] font-mono text-[var(--text-muted)]">
                  Total belanja & beban pengeluaran periode ini.
                </p>
              </div>
            </section>

            {/* Actions & Filters Bar */}
            <section className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-xl technical-card">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)]">
                  <Filter size={14} />
                  <span>Filter Periode:</span>
                </div>

                {/* Select Month */}
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="technical-input px-3 py-1.5 rounded-md text-xs font-mono cursor-pointer"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>

                {/* Select Year */}
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="technical-input px-3 py-1.5 rounded-md text-xs font-mono cursor-pointer"
                >
                  <option value="all">Semua Tahun</option>
                  <option value="2027">2027</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleExportCSV}
                  type="button"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs font-mono text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors cursor-pointer"
                  title="Unduh data dalam format CSV yang kompatibel dengan Excel & Google Sheets"
                >
                  <FileSpreadsheet size={14} className="text-emerald-500" />
                  <span>Ekspor CSV</span>
                </button>

                <button
                  onClick={() => setIsModalOpen(true)}
                  type="button"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-[var(--text-primary)] text-[var(--bg)] text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                >
                  <Plus size={15} />
                  <span>Tambah Transaksi</span>
                </button>
              </div>
            </section>

            {/* Transactions Table Ledger */}
            <section className="technical-card rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">Ledger Transaksi Pribadi</h2>
                  <p className="text-[11px] font-mono text-[var(--text-muted)]">
                    Daftar pembukuan terverifikasi ({transactions.length} entri ditemukan)
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border)] text-[var(--text-muted)] font-mono uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Deskripsi</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4 text-right">Nominal</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] font-mono">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-[var(--text-muted)]">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                            <span>Memuat data transaksi...</span>
                          </div>
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-[var(--text-muted)]">
                          <div className="max-w-xs mx-auto space-y-2">
                            <Calendar size={28} className="mx-auto opacity-30" />
                            <p className="font-semibold text-xs text-[var(--text-primary)]">
                              Belum ada transaksi pada periode ini
                            </p>
                            <p className="text-[11px]">
                              Klik tombol &quot;Tambah Transaksi&quot; di atas untuk mulai mencatat pemasukan atau pengeluaran.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      transactions.map((t) => (
                        <tr
                          key={t.id}
                          className="hover:bg-[var(--surface-hover)] transition-colors group"
                        >
                          <td className="py-3.5 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                            {t.tanggal}
                          </td>
                          <td className="py-3.5 px-4 font-sans text-sm font-medium text-[var(--text-primary)] max-w-xs truncate">
                            {t.deskripsi}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {t.tipe === "income" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                PEMASUKAN
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                PENGELUARAN
                              </span>
                            )}
                          </td>
                          <td
                            className={`py-3.5 px-4 text-right whitespace-nowrap font-bold text-sm ${
                              t.tipe === "income"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {t.tipe === "income" ? `+ ${formatIDR(t.jumlah)}` : `- ${formatIDR(t.jumlah)}`}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleDelete(t.id)}
                              disabled={deletingId === t.id}
                              className="p-1 rounded text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-40"
                              title="Hapus transaksi ini"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Modal: Tambah Transaksi */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="technical-card w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <div>
                <h3 className="text-base font-bold">Catat Transaksi Baru</h3>
                <p className="text-[11px] font-mono text-[var(--text-muted)]">
                  Entri arus kas terenkripsi ke database
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 rounded border border-rose-500/20 bg-rose-500/10 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddTransaction} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Jenis Transaksi
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
                  <button
                    type="button"
                    onClick={() => setFormTipe("expense")}
                    className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      formTipe === "expense"
                        ? "bg-rose-500 text-white shadow-xs"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    Pengeluaran (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTipe("income")}
                    className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      formTipe === "income"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    Pemasukan (+)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Nominal (IDR)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Contoh: 150000"
                  value={formJumlah}
                  onChange={(e) => setFormJumlah(e.target.value)}
                  required
                  className="technical-input w-full px-3 py-2 text-sm rounded-md font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={formTanggal}
                  onChange={(e) => setFormTanggal(e.target.value)}
                  required
                  className="technical-input w-full px-3 py-2 text-sm rounded-md font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Deskripsi / Keterangan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Belanja Bulanan / Honor Desain"
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  maxLength={200}
                  className="technical-input w-full px-3 py-2 text-sm rounded-md"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-[var(--border)] text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-md bg-[var(--text-primary)] text-[var(--bg)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Transaksi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--text-muted)] gap-3 font-mono">
        <p>© {new Date().getFullYear()} ZailTrack Ledger. Engineered for speed & security.</p>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/FuzailFr/ZailTrack"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--text-primary)] transition-colors underline underline-offset-4"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
