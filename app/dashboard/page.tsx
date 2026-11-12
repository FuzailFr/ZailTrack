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
  ExternalLink,
  Copy,
  Check,
  Layers,
  Sparkles,
  Bot,
  Send,
  Unlink,
  Download,
  Search,
  Pencil,
  KeyRound,
  BarChart3,
  Target,
  PiggyBank,
  Repeat,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface Transaction {
  id: number;
  tipe: "income" | "expense";
  jumlah: number;
  kategori?: string;
  deskripsi: string;
  tanggal: string;
  created_at: string;
}

const DEFAULT_EXPENSE_CATEGORIES = ["Makanan", "Transport", "Belanja", "Tagihan", "Hiburan", "Kesehatan", "Lainnya"];
const DEFAULT_INCOME_CATEGORIES = ["Gaji", "Bisnis", "Investasi", "Bonus", "Lainnya"];

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

interface TelegramLinkData {
  is_linked: boolean;
  telegram_chat_id: number | null;
  bot_username: string;
  deep_link: string | null;
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

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  // Modal State: Tambah Transaksi
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTipe, setFormTipe] = useState<"income" | "expense">("expense");
  const [formJumlah, setFormJumlah] = useState("");
  const [formKategori, setFormKategori] = useState("Makanan");
  const [customCategory, setCustomCategory] = useState("");
  const [formDeskripsi, setFormDeskripsi] = useState("");
  const [formTanggal, setFormTanggal] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Modal State: Edit Transaksi
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editTipe, setEditTipe] = useState<"income" | "expense">("expense");
  const [editJumlah, setEditJumlah] = useState("");
  const [editKategori, setEditKategori] = useState("Umum");
  const [customEditCategory, setCustomEditCategory] = useState("");
  const [editDeskripsi, setEditDeskripsi] = useState("");
  const [editTanggal, setEditTanggal] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Modal State: Ganti Password
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Modal State: Google Sheets Realtime
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsData, setSheetsData] = useState<{ feedUrl: string; formula: string } | null>(null);
  const [copiedFormula, setCopiedFormula] = useState(false);

  // Modal State: Telegram Bot
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramData, setTelegramData] = useState<TelegramLinkData | null>(null);
  const [unlinkingTelegram, setUnlinkingTelegram] = useState(false);

  // Dev Mode State
  const [devMetrics, setDevMetrics] = useState<DevMetrics | null>(null);
  const [devUsers, setDevUsers] = useState<DevUserItem[]>([]);
  const [devAudit, setDevAudit] = useState<DevAuditItem[]>([]);
  const [loadingDev, setLoadingDev] = useState(false);
  const [devTab, setDevTab] = useState<"users" | "audit">("users");
  const [userActionLoading, setUserActionLoading] = useState<number | null>(null);
  const [userActionAlert, setUserActionAlert] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Format Mata Uang IDR
  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // User Sub-Tab Navigation
  const [userViewTab, setUserViewTab] = useState<"ledger" | "budgets" | "savings" | "recurring">("ledger");

  // Budget Module State
  const [budgetsList, setBudgetsList] = useState<any[]>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetCategoryInput, setBudgetCategoryInput] = useState("Makanan");
  const [budgetLimitInput, setBudgetLimitInput] = useState("");
  const [budgetSubmitting, setBudgetSubmitting] = useState(false);

  // Savings Goals Module State
  const [savingsList, setSavingsList] = useState<any[]>([]);
  const [loadingSavings, setLoadingSavings] = useState(false);
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [savingsTitleInput, setSavingsTitleInput] = useState("");
  const [savingsTargetInput, setSavingsTargetInput] = useState("");
  const [savingsInitialInput, setSavingsInitialInput] = useState("");
  const [savingsDateInput, setSavingsDateInput] = useState("");
  const [savingsSubmitting, setSavingsSubmitting] = useState(false);
  const [activeSavingsForDeposit, setActiveSavingsForDeposit] = useState<any>(null);
  const [depositAmountInput, setDepositAmountInput] = useState("");
  const [depositSubmitting, setDepositSubmitting] = useState(false);

  // Recurring Transactions State
  const [recurringList, setRecurringList] = useState<any[]>([]);
  const [loadingRecurring, setLoadingRecurring] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [recurringTypeInput, setRecurringTypeInput] = useState<"income" | "expense">("expense");
  const [recurringDescInput, setRecurringDescInput] = useState("");
  const [recurringAmountInput, setRecurringAmountInput] = useState("");
  const [recurringCategoryInput, setRecurringCategoryInput] = useState("Tagihan");
  const [recurringDueDateInput, setRecurringDueDateInput] = useState("");
  const [recurringSubmitting, setRecurringSubmitting] = useState(false);

  const fetchBudgets = async () => {
    setLoadingBudgets(true);
    try {
      const m = selectedMonth === "all" ? new Date().getMonth() + 1 : selectedMonth;
      const y = selectedYear === "all" ? new Date().getFullYear() : selectedYear;
      const res = await fetch(`/api/budgets?month=${m}&year=${y}`);
      if (res.ok) {
        const data = await res.json();
        setBudgetsList(data.budgets || []);
      }
    } catch (err) {
      console.error("Gagal ambil anggaran", err);
    } finally {
      setLoadingBudgets(false);
    }
  };

  const fetchSavings = async () => {
    setLoadingSavings(true);
    try {
      const res = await fetch("/api/savings");
      if (res.ok) {
        const data = await res.json();
        setSavingsList(data.goals || []);
      }
    } catch (err) {
      console.error("Gagal ambil tabungan", err);
    } finally {
      setLoadingSavings(false);
    }
  };

  const fetchRecurring = async () => {
    setLoadingRecurring(true);
    try {
      const res = await fetch("/api/recurring");
      if (res.ok) {
        const data = await res.json();
        setRecurringList(data.recurring || []);
      }
    } catch (err) {
      console.error("Gagal ambil tagihan rutin", err);
    } finally {
      setLoadingRecurring(false);
    }
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

  const handleToggleUserRole = async (targetUser: DevUserItem) => {
    const nextRole = targetUser.role === "admin" ? "user" : "admin";
    const confirmMsg =
      nextRole === "admin"
        ? `Jadikan @${targetUser.username} sebagai ADMIN / DEV? Pengguna akan memiliki akses penuh ke Developer Cockpit.`
        : `Turunkan role @${targetUser.username} menjadi USER biasa?`;

    if (!window.confirm(confirmMsg)) return;

    setUserActionLoading(targetUser.id);
    setUserActionAlert(null);
    try {
      const res = await fetch(`/api/dev/users/${targetUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal mengubah role pengguna.");
      }
      setUserActionAlert({ type: "success", text: data.message });
      await fetchDevData();
    } catch (err: any) {
      setUserActionAlert({ type: "error", text: err.message || "Gagal mengubah role pengguna." });
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleDeleteUser = async (targetUser: DevUserItem) => {
    const confirmMsg =
      `⚠️ PERINGATAN KERAS:\n\nApakah Anda benar-benar yakin ingin menghapus akun @${targetUser.username}?\n\nSemua (${targetUser.total_transactions}) riwayat transaksi pengguna ini akan DIHAPUS PERMANEN dari database dan tidak dapat dipulihkan!`;

    if (!window.confirm(confirmMsg)) return;

    setUserActionLoading(targetUser.id);
    setUserActionAlert(null);
    try {
      const res = await fetch(`/api/dev/users/${targetUser.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal menghapus pengguna.");
      }
      setUserActionAlert({ type: "success", text: data.message });
      await fetchDevData();
    } catch (err: any) {
      setUserActionAlert({ type: "error", text: err.message || "Gagal menghapus pengguna." });
    } finally {
      setUserActionLoading(null);
    }
  };

  useEffect(() => {
    if (activeView === "dev" && (user?.role === "admin" || user?.role === "developer")) {
      fetchDevData();
    }
  }, [activeView, user]);

  // 4. Open Google Sheets Modal & Fetch Token
  const handleOpenSheetsModal = async () => {
    setIsSheetsModalOpen(true);
    if (!sheetsData) {
      setSheetsLoading(true);
      try {
        const res = await fetch("/api/sheets/token");
        if (res.ok) {
          const data = await res.json();
          setSheetsData(data);
        }
      } catch (err) {
        console.error("Gagal memuat data Google Sheets", err);
      } finally {
        setSheetsLoading(false);
      }
    }
  };

  const handleCopyFormula = () => {
    if (!sheetsData?.formula) return;
    navigator.clipboard.writeText(sheetsData.formula);
    setCopiedFormula(true);
    setTimeout(() => setCopiedFormula(false), 2000);
  };

  // 5. Open Telegram Modal & Fetch Link
  const handleOpenTelegramModal = async () => {
    setIsTelegramModalOpen(true);
    setTelegramLoading(true);
    try {
      const res = await fetch("/api/telegram/link");
      if (res.ok) {
        const data = await res.json();
        setTelegramData(data);
      }
    } catch (err) {
      console.error("Gagal memuat info Telegram", err);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    setUnlinkingTelegram(true);
    try {
      const res = await fetch("/api/telegram/link", { method: "DELETE" });
      if (res.ok) {
        setTelegramData((prev) => (prev ? { ...prev, is_linked: false, telegram_chat_id: null } : null));
        // Refresh info link baru
        handleOpenTelegramModal();
      }
    } finally {
      setUnlinkingTelegram(false);
    }
  };

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
      const resolvedKategori = formKategori === "Lainnya"
        ? (customCategory.trim() || "Lainnya")
        : formKategori;

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipe: formTipe,
          jumlah: parsedJumlah,
          kategori: resolvedKategori,
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
      setCustomCategory("");
      setFormTanggal(new Date().toISOString().slice(0, 10));
      setIsModalOpen(false);

      fetchTransactions();
      if (user?.role === "admin" || user?.role === "developer") fetchDevData();
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
      if (user?.role === "admin" || user?.role === "developer") fetchDevData();
    } catch (err) {
      console.error("Gagal menghapus transaksi", err);
    } finally {
      setDeletingId(null);
    }
  };

  // Handle Edit Modal
  const handleOpenEditModal = (t: Transaction) => {
    setEditingTransaction(t);
    setEditTipe(t.tipe);
    setEditJumlah(new Intl.NumberFormat("id-ID").format(t.jumlah));
    const currentKat = t.kategori || "Umum";
    const isKnown = DEFAULT_EXPENSE_CATEGORIES.includes(currentKat) || DEFAULT_INCOME_CATEGORIES.includes(currentKat);
    if (isKnown) {
      setEditKategori(currentKat);
      setCustomEditCategory("");
    } else {
      setEditKategori("Lainnya");
      setCustomEditCategory(currentKat);
    }
    setEditDeskripsi(t.deskripsi === "-" ? "" : t.deskripsi);
    setEditTanggal(t.tanggal);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    const parsedJumlah = parseFloat(editJumlah.replace(/[^0-9]/g, ""));
    if (isNaN(parsedJumlah) || parsedJumlah <= 0) {
      setEditError("Nominal transaksi harus berupa angka positif.");
      return;
    }

    if (!editTanggal) {
      setEditError("Tanggal transaksi wajib diisi.");
      return;
    }

    setEditSubmitting(true);
    setEditError(null);

    try {
      const resolvedEditKat = editKategori === "Lainnya"
        ? (customEditCategory.trim() || "Lainnya")
        : editKategori;

      const res = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipe: editTipe,
          jumlah: parsedJumlah,
          kategori: resolvedEditKat,
          deskripsi: editDeskripsi.trim() || "-",
          tanggal: editTanggal,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal memperbarui transaksi.");
      }

      setEditingTransaction(null);
      fetchTransactions();
      if (user?.role === "admin" || user?.role === "developer") fetchDevData();
    } catch (err: any) {
      setEditError(err.message || "Terjadi kesalahan saat menyimpan perubahan.");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!oldPassword || !newPassword) {
      setPasswordError("Password lama dan baru wajib diisi.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password baru minimal 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password baru tidak cocok.");
      return;
    }

    setPasswordSubmitting(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal mengubah password.");
      }

      setPasswordSuccess(data.message || "Password berhasil diperbarui!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordSuccess(null);
      }, 1500);
    } catch (err: any) {
      setPasswordError(err.message || "Terjadi kesalahan saat mengganti password.");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  // Filtered Transactions by Search Query & Category Filter
  const filteredTransactions = transactions.filter((t) => {
    if (selectedCategoryFilter !== "all") {
      const itemKat = t.kategori || "Umum";
      if (itemKat.toLowerCase() !== selectedCategoryFilter.toLowerCase()) {
        return false;
      }
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      t.deskripsi.toLowerCase().includes(q) ||
      (t.kategori && t.kategori.toLowerCase().includes(q)) ||
      t.jumlah.toString().includes(q) ||
      t.tanggal.includes(q) ||
      (t.tipe === "income" ? "pemasukan" : "pengeluaran").includes(q)
    );
  });

  // Ambil daftar kategori unik dari transaksi yang ada
  const availableCategories = Array.from(
    new Set(transactions.map((t) => t.kategori || "Umum"))
  ).filter(Boolean);

  // Cashflow Ratio & Analytics
  const totalVolume = summary.total_income + summary.total_expense;
  const incomeRatio = totalVolume > 0 ? Math.round((summary.total_income / totalVolume) * 100) : 50;
  const expenseRatio = 100 - incomeRatio;
  const expenseCount = transactions.filter((t) => t.tipe === "expense").length;
  const avgExpense = expenseCount > 0 ? Math.round(summary.total_expense / expenseCount) : 0;

  // Direct CSV Fallback Export
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
    <div className="min-h-screen flex flex-col p-3.5 sm:p-8 pb-32 sm:pb-16">
      {/* Top Header */}
      <header className="max-w-6xl w-full mx-auto pb-5 border-b border-[var(--border)] flex flex-col gap-3.5">
        {/* Row 1: Logo & Title + Actions (Theme & Logout) */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-sm font-mono font-bold text-[var(--accent)] shadow-xs">
              ZT
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight">ZailTrack</h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]">
                  v2.0
                </span>
                {(user?.role === "admin" || user?.role === "developer") && (
                  <span className="inline-flex text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 items-center gap-1">
                    <ShieldCheck size={10} /> {user?.role.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[var(--text-muted)] font-mono mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span>USER // {user?.username}</span>
              </div>
            </div>
          </div>

          {/* Right: Theme Toggle, Ganti Password & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => {
                setIsPasswordModalOpen(true);
                setPasswordError(null);
                setPasswordSuccess(null);
              }}
              type="button"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs font-mono text-[var(--text-secondary)] hover:text-sky-500 hover:border-sky-500/30 transition-colors cursor-pointer"
              title="Ganti Password Akun"
            >
              <KeyRound size={13} />
              <span className="hidden md:inline">Password</span>
            </button>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              type="button"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs font-mono text-[var(--text-secondary)] hover:text-rose-500 hover:border-rose-500/30 transition-colors cursor-pointer"
              title="Keluar dari sesi"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>

        {/* Row 2: Mode Switcher (Khusus Admin / Developer) */}
        {(user?.role === "admin" || user?.role === "developer") && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Database size={13} />
              <span>Buka Admin Cockpit & DB Studio →</span>
            </button>

            <div className="w-full sm:w-auto flex items-center p-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveView("user")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
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
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeView === "dev"
                    ? "bg-amber-500 text-black font-bold shadow-xs"
                    : "text-[var(--text-muted)] hover:text-amber-500"
                }`}
              >
                <Terminal size={13} />
                <span>Quick Dev</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Workspace */}
      <main className="max-w-6xl w-full mx-auto my-8 space-y-8 flex-1">
        {/* ============================================================== */}
        {/* VIEW 1: DEVELOPER COCKPIT (Hanya Muncul di Mode Dev) */}
        {/* ============================================================== */}
        {activeView === "dev" && (user?.role === "admin" || user?.role === "developer") ? (
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

            {/* User Action Feedback Alert */}
            {userActionAlert && (
              <div
                className={`p-3 rounded-lg text-xs font-mono border flex items-center justify-between animate-fadeIn ${
                  userActionAlert.type === "success"
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                    : "bg-rose-500/10 text-rose-500 border-rose-500/30"
                }`}
              >
                <span>{userActionAlert.text}</span>
                <button
                  type="button"
                  onClick={() => setUserActionAlert(null)}
                  className="text-xs hover:opacity-75 cursor-pointer ml-3 font-bold"
                >
                  ✕
                </button>
              </div>
            )}

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
                        <th className="py-3 px-4 text-right">Aksi Manajemen</th>
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
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            {u.id === user?.id ? (
                              <span className="text-[10px] text-[var(--text-muted)] italic font-sans">
                                (Akun Anda)
                              </span>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 justify-end">
                                <button
                                  type="button"
                                  disabled={userActionLoading === u.id}
                                  onClick={() => handleToggleUserRole(u)}
                                  className={`px-2 py-1 text-[10px] font-sans rounded transition-colors cursor-pointer border ${
                                    u.role === "admin"
                                      ? "bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20"
                                      : "bg-blue-500/10 text-blue-500 border-blue-500/30 hover:bg-blue-500/20"
                                  } disabled:opacity-50`}
                                  title={u.role === "admin" ? "Turunkan ke User biasa" : "Jadikan Admin / Developer"}
                                >
                                  {userActionLoading === u.id
                                    ? "..."
                                    : u.role === "admin"
                                    ? "Set sbg User"
                                    : "Set sbg Admin"}
                                </button>
                                <button
                                  type="button"
                                  disabled={userActionLoading === u.id}
                                  onClick={() => handleDeleteUser(u)}
                                  className="px-2 py-1 text-[10px] font-sans rounded bg-rose-500/10 text-rose-500 border border-rose-500/30 hover:bg-rose-500/20 transition-colors cursor-pointer disabled:opacity-50"
                                  title="Hapus akun pengguna dan seluruh transaksinya"
                                >
                                  {userActionLoading === u.id ? "..." : "Hapus Akun"}
                                </button>
                              </div>
                            )}
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

            {/* Rasio Arus Kas & Analitik Cepat */}
            {totalVolume > 0 && (
              <section className="technical-card p-4 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <BarChart3 size={15} className="text-[var(--accent)]" />
                    <span className="uppercase tracking-wider font-semibold text-[var(--text-primary)]">
                      Rasio Arus Kas & Ringkasan Periode
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-muted)]">
                    <span>
                      Total Volume: <strong className="text-[var(--text-primary)]">{formatIDR(totalVolume)}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Rata-rata Pengeluaran: <strong className="text-rose-500">{formatIDR(avgExpense)}</strong>
                    </span>
                  </div>
                </div>

                {/* Progress Bar Rasio */}
                <div className="space-y-1.5">
                  <div className="w-full h-2.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden flex border border-[var(--border)]">
                    <div
                      style={{ width: `${incomeRatio}%` }}
                      className="h-full bg-emerald-500 transition-all duration-500"
                      title={`Pemasukan: ${incomeRatio}%`}
                    />
                    <div
                      style={{ width: `${expenseRatio}%` }}
                      className="h-full bg-rose-500 transition-all duration-500"
                      title={`Pengeluaran: ${expenseRatio}%`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                    <span className="text-emerald-500 font-semibold">Pemasukan: {incomeRatio}%</span>
                    <span className="text-rose-500 font-semibold">Pengeluaran: {expenseRatio}%</span>
                  </div>
                </div>
              </section>
            )}

            {/* SUB-NAVIGATION BAR UNTUK FITUR FINANSIAL LENGKAP */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] overflow-x-auto">
              <button
                type="button"
                onClick={() => setUserViewTab("ledger")}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono rounded-lg transition-colors cursor-pointer shrink-0 ${
                  userViewTab === "ledger"
                    ? "bg-[var(--text-primary)] text-[var(--bg)] font-bold shadow-xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Layers size={14} />
                <span>Buku Kas & Riwayat</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserViewTab("budgets");
                  fetchBudgets();
                }}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono rounded-lg transition-colors cursor-pointer shrink-0 ${
                  userViewTab === "budgets"
                    ? "bg-[var(--text-primary)] text-[var(--bg)] font-bold shadow-xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Target size={14} />
                <span>Anggaran (Budget)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserViewTab("savings");
                  fetchSavings();
                }}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono rounded-lg transition-colors cursor-pointer shrink-0 ${
                  userViewTab === "savings"
                    ? "bg-[var(--text-primary)] text-[var(--bg)] font-bold shadow-xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <PiggyBank size={14} />
                <span>Target Tabungan</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserViewTab("recurring");
                  fetchRecurring();
                }}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono rounded-lg transition-colors cursor-pointer shrink-0 ${
                  userViewTab === "recurring"
                    ? "bg-[var(--text-primary)] text-[var(--bg)] font-bold shadow-xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Repeat size={14} />
                <span>Tagihan Rutin</span>
              </button>
            </div>

            {/* TAB 1: BUKU KAS / TRANSAKSI LEDGER */}
            {userViewTab === "ledger" && (
              <>
                <section className="flex flex-col gap-3.5 p-3.5 sm:p-4 rounded-xl technical-card">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-secondary)]">
                    <Filter size={13} />
                    <span>Periode:</span>
                  </div>

                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="technical-input px-2.5 py-1.5 rounded-md text-xs font-mono cursor-pointer w-full sm:w-auto"
                    >
                      {MONTHS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="technical-input px-2.5 py-1.5 rounded-md text-xs font-mono cursor-pointer w-full sm:w-auto"
                    >
                      <option value="all">Semua Tahun</option>
                      <option value="2027">2027</option>
                      <option value="2026">2026</option>
                      <option value="2025">2025</option>
                      <option value="2024">2024</option>
                    </select>

                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                      className="technical-input px-2.5 py-1.5 rounded-md text-xs font-mono cursor-pointer w-full sm:w-auto"
                    >
                      <option value="all">Semua Kategori</option>
                      {availableCategories.map((kat) => (
                        <option key={kat} value={kat}>
                          {kat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Search Bar Realtime */}
                <div className="relative flex-1 max-w-md">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari transaksi (kopi, bensin, gaji)..."
                    className="technical-input w-full pl-8.5 pr-8 py-1.5 rounded-md text-xs font-mono placeholder:text-[var(--text-muted)]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      title="Hapus pencarian"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleOpenTelegramModal}
                    type="button"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-sky-500/30 bg-sky-500/10 text-xs font-mono font-semibold text-sky-500 hover:bg-sky-500/20 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                    title="Hubungkan akun Telegram untuk mencatat transaksi kilat tanpa buka web"
                  >
                    <Bot size={14} className="text-sky-500 shrink-0" />
                    <span>Telegram Bot</span>
                  </button>

                  <button
                    onClick={handleOpenSheetsModal}
                    type="button"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                    title="Hubungkan seluruh data secara realtime ke Google Spreadsheets"
                  >
                    <FileSpreadsheet size={14} className="text-emerald-500 shrink-0" />
                    <span>Google Sheets</span>
                  </button>
                </div>

                <button
                  onClick={() => setIsModalOpen(true)}
                  type="button"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-[var(--text-primary)] text-[var(--bg)] text-xs font-mono font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <Plus size={14} />
                  <span>+ Tambah Transaksi</span>
                </button>
              </div>
            </section>

            {/* Transactions Ledger */}
            <section className="technical-card rounded-xl overflow-hidden">
              <div className="p-3.5 sm:p-4 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">Ledger Transaksi Pribadi</h2>
                  <p className="text-[10px] sm:text-[11px] font-mono text-[var(--text-muted)]">
                    Daftar pembukuan terverifikasi ({filteredTransactions.length} dari {transactions.length} entri ditemukan)
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  title="Unduh seluruh data dalam format CSV"
                >
                  <Download size={12} />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
              </div>

              {/* TAMPILAN MOBILE: Card List (< 640px) */}
              <div className="block sm:hidden divide-y divide-[var(--border-subtle)]">
                {loading ? (
                  <div className="p-8 text-center text-xs font-mono text-[var(--text-muted)] flex flex-col items-center gap-2">
                    <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    <span>Memuat transaksi...</span>
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-[var(--text-muted)] space-y-2">
                    <Calendar size={24} className="mx-auto opacity-30" />
                    <p className="font-semibold text-[var(--text-primary)]">
                      {searchQuery ? `Tidak ada transaksi untuk "${searchQuery}"` : "Belum ada transaksi"}
                    </p>
                    <p className="text-[11px]">
                      {searchQuery ? (
                        <button onClick={() => setSearchQuery("")} className="text-[var(--accent)] underline cursor-pointer">
                          Reset Pencarian
                        </button>
                      ) : (
                        "Ketik chat di Telegram atau klik Tambah Transaksi."
                      )}
                    </p>
                  </div>
                ) : (
                  filteredTransactions.map((t) => (
                    <div key={t.id} className="p-3.5 space-y-2 hover:bg-[var(--surface-hover)] transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <p className="font-sans text-sm font-medium text-[var(--text-primary)] leading-snug break-words">
                            {t.deskripsi}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-muted)]">
                            <span>{t.tanggal}</span>
                            <span>•</span>
                            <span
                              className={`px-1.5 py-0.5 rounded font-semibold ${
                                t.tipe === "income"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {t.tipe === "income" ? "PEMASUKAN" : "PENGELUARAN"}
                            </span>
                            <span>•</span>
                            <span className="px-1.5 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-secondary)] font-medium">
                              {t.kategori || "Umum"}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className={`font-mono font-bold text-sm ${
                              t.tipe === "income"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {t.tipe === "income" ? `+ ${formatIDR(t.jumlah)}` : `- ${formatIDR(t.jumlah)}`}
                          </div>
                          <div className="mt-1.5 flex items-center justify-end gap-2.5 text-[11px] font-mono text-[var(--text-muted)]">
                            <button
                              onClick={() => handleOpenEditModal(t)}
                              className="hover:text-sky-500 inline-flex items-center gap-1 cursor-pointer"
                              title="Edit transaksi"
                            >
                              <Pencil size={12} />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(t.id)}
                              disabled={deletingId === t.id}
                              className="hover:text-rose-500 inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                              title="Hapus transaksi"
                            >
                              <Trash2 size={12} />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* TAMPILAN DESKTOP: Table (>= 640px) */}
              <div className="hidden sm:block overflow-x-auto">
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
                    ) : filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-[var(--text-muted)]">
                          <div className="max-w-xs mx-auto space-y-2">
                            <Calendar size={28} className="mx-auto opacity-30" />
                            <p className="font-semibold text-xs text-[var(--text-primary)]">
                              {searchQuery ? `Tidak ada transaksi yang cocok untuk "${searchQuery}"` : "Belum ada transaksi pada periode ini"}
                            </p>
                            <p className="text-[11px]">
                              {searchQuery ? (
                                <button onClick={() => setSearchQuery("")} className="text-[var(--accent)] underline cursor-pointer">
                                  Reset Pencarian
                                </button>
                              ) : (
                                "Klik tombol \"Tambah Transaksi\" atau kirim chat ke bot Telegram Anda untuk mulai mencatat."
                              )}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((t) => (
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                  t.tipe === "income"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                }`}
                              >
                                {t.tipe === "income" ? "MASUK" : "KELUAR"}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-secondary)]">
                                {t.kategori || "Umum"}
                              </span>
                            </div>
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
                            <div className="inline-flex items-center gap-1 justify-center">
                              <button
                                onClick={() => handleOpenEditModal(t)}
                                className="p-1 rounded text-[var(--text-muted)] hover:text-sky-500 hover:bg-sky-500/10 transition-colors cursor-pointer"
                                title="Edit transaksi ini"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => handleDelete(t.id)}
                                disabled={deletingId === t.id}
                                className="p-1 rounded text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-40"
                                title="Hapus transaksi ini"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            </>
            )}

            {/* TAB 2: ANGGARAN BULANAN (BUDGETS) */}
            {userViewTab === "budgets" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl technical-card">
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <Target size={18} className="text-emerald-500" />
                      <span>Batas Anggaran Bulanan</span>
                    </h3>
                    <p className="text-xs font-mono text-[var(--text-muted)]">
                      Kendalikan batas pengeluaran kategori untuk periode {selectedMonth === "all" ? "bulan ini" : `bulan ${selectedMonth}`}/{selectedYear === "all" ? "2026" : selectedYear}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBudgetCategoryInput("Makanan");
                      setBudgetLimitInput("");
                      setIsBudgetModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-semibold rounded-md bg-[var(--text-primary)] text-[var(--bg)] hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                  >
                    <Plus size={14} />
                    <span>+ Atur Anggaran Kategori</span>
                  </button>
                </div>

                {loadingBudgets ? (
                  <div className="p-12 text-center text-xs font-mono text-[var(--text-muted)] flex flex-col items-center gap-2">
                    <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    <span>Memuat data anggaran...</span>
                  </div>
                ) : budgetsList.length === 0 ? (
                  <div className="technical-card p-12 text-center space-y-3 rounded-xl">
                    <Target size={36} className="mx-auto text-[var(--text-muted)] opacity-40" />
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Belum Ada Anggaran Disetel</p>
                    <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                      Atur batas pengeluaran untuk kategori seperti Makanan, Transport, atau Tagihan agar sistem dapat memberi peringatan saat Anda mendekati batas.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsBudgetModalOpen(true)}
                      className="px-4 py-2 text-xs font-mono font-semibold rounded-md bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      + Pasang Batas Anggaran Pertama
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {budgetsList.map((b) => (
                      <div
                        key={b.id}
                        className={`technical-card p-4 rounded-xl space-y-3 border transition-colors ${
                          b.isOverBudget
                            ? "border-rose-500/50 bg-rose-500/[0.03]"
                            : b.percentage >= 80
                            ? "border-amber-500/40 bg-amber-500/[0.02]"
                            : "border-[var(--border)]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)]">
                              {b.kategori}
                            </span>
                            {b.isOverBudget && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-500 border border-rose-500/30 animate-pulse">
                                OVER BUDGET
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm(`Hapus anggaran ${b.kategori}?`)) return;
                              await fetch(`/api/budgets?id=${b.id}`, { method: "DELETE" });
                              fetchBudgets();
                            }}
                            className="p-1 rounded text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Hapus anggaran"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div className="flex items-baseline justify-between font-mono">
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] block">TERPAKAI</span>
                            <span className={`text-lg font-bold ${b.isOverBudget ? "text-rose-500" : "text-[var(--text-primary)]"}`}>
                              {formatIDR(b.spent)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-[var(--text-muted)] block">BATAS MAKS</span>
                            <span className="text-sm font-semibold text-[var(--text-muted)]">{formatIDR(b.limit)}</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="w-full h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden border border-[var(--border)]">
                            <div
                              style={{ width: `${Math.min(100, b.percentage)}%` }}
                              className={`h-full transition-all duration-500 ${
                                b.isOverBudget
                                  ? "bg-rose-500"
                                  : b.percentage >= 80
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                            <span>{b.percentage}% terpakai</span>
                            <span>
                              {b.isOverBudget
                                ? `Lebih ${formatIDR(Math.abs(b.remaining))}`
                                : `Sisa ${formatIDR(b.remaining)}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: TARGET TABUNGAN (SAVINGS) */}
            {userViewTab === "savings" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl technical-card">
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <PiggyBank size={18} className="text-emerald-500" />
                      <span>Target Tabungan & Dana Impian</span>
                    </h3>
                    <p className="text-xs font-mono text-[var(--text-muted)]">
                      Alokasikan tabungan terencana untuk dana darurat, investasi, atau impian Anda
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSavingsTitleInput("");
                      setSavingsTargetInput("");
                      setSavingsInitialInput("");
                      setSavingsDateInput("");
                      setIsSavingsModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-semibold rounded-md bg-[var(--text-primary)] text-[var(--bg)] hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                  >
                    <Plus size={14} />
                    <span>+ Buat Target Tabungan</span>
                  </button>
                </div>

                {loadingSavings ? (
                  <div className="p-12 text-center text-xs font-mono text-[var(--text-muted)] flex flex-col items-center gap-2">
                    <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    <span>Memuat target tabungan...</span>
                  </div>
                ) : savingsList.length === 0 ? (
                  <div className="technical-card p-12 text-center space-y-3 rounded-xl">
                    <PiggyBank size={36} className="mx-auto text-[var(--text-muted)] opacity-40" />
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Belum Ada Target Tabungan</p>
                    <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                      Buat target tabungan seperti Dana Darurat 10jt, Liburan, atau Beli Laptop untuk memantau progres tabungan Anda.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsSavingsModalOpen(true)}
                      className="px-4 py-2 text-xs font-mono font-semibold rounded-md bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      + Buat Target Tabungan Pertama
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savingsList.map((g) => (
                      <div
                        key={g.id}
                        className={`technical-card p-4 rounded-xl space-y-3 border transition-colors ${
                          g.isCompleted ? "border-emerald-500/40 bg-emerald-500/[0.02]" : "border-[var(--border)]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[var(--text-primary)]">{g.judul}</span>
                            {g.isCompleted ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <Check size={10} /> TERCAPAI
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20">
                                BERJALAN
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm(`Hapus target tabungan "${g.judul}"?`)) return;
                              await fetch(`/api/savings/${g.id}`, { method: "DELETE" });
                              fetchSavings();
                            }}
                            className="p-1 rounded text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Hapus target"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div className="flex items-baseline justify-between font-mono">
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] block">TERKUMPUL</span>
                            <span className="text-lg font-bold text-emerald-500">{formatIDR(g.saved)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-[var(--text-muted)] block">TARGET</span>
                            <span className="text-sm font-semibold text-[var(--text-muted)]">{formatIDR(g.target)}</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="w-full h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden border border-[var(--border)]">
                            <div
                              style={{ width: `${Math.min(100, g.progress)}%` }}
                              className="h-full bg-emerald-500 transition-all duration-500"
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                            <span>{g.progress}% tercapai</span>
                            <span>{g.targetTanggal ? `Target: ${g.targetTanggal}` : "Tanpa batas waktu"}</span>
                          </div>
                        </div>

                        {/* Quick Deposit / Withdraw Buttons */}
                        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSavingsForDeposit({ ...g, isWithdraw: true });
                              setDepositAmountInput("");
                            }}
                            className="px-2.5 py-1 text-xs font-mono rounded border border-[var(--border)] text-[var(--text-secondary)] hover:text-rose-400 hover:border-rose-400/40 transition-colors cursor-pointer"
                          >
                            - Tarik
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSavingsForDeposit({ ...g, isWithdraw: false });
                              setDepositAmountInput("");
                            }}
                            className="px-3 py-1 text-xs font-mono font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-500 transition-colors cursor-pointer shadow-xs"
                          >
                            + Setor Dana
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: TAGIHAN RUTIN (RECURRING) */}
            {userViewTab === "recurring" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl technical-card">
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <Repeat size={18} className="text-sky-500" />
                      <span>Tagihan & Transaksi Rutin</span>
                    </h3>
                    <p className="text-xs font-mono text-[var(--text-muted)]">
                      Daftar beban rutin bulanan (WiFi, Kost, Netflix) atau pendapatan rutin (Gaji)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRecurringDescInput("");
                      setRecurringAmountInput("");
                      setRecurringDueDateInput(new Date().toISOString().slice(0, 10));
                      setIsRecurringModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono font-semibold rounded-md bg-[var(--text-primary)] text-[var(--bg)] hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                  >
                    <Plus size={14} />
                    <span>+ Tambah Tagihan Rutin</span>
                  </button>
                </div>

                {loadingRecurring ? (
                  <div className="p-12 text-center text-xs font-mono text-[var(--text-muted)] flex flex-col items-center gap-2">
                    <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    <span>Memuat tagihan rutin...</span>
                  </div>
                ) : recurringList.length === 0 ? (
                  <div className="technical-card p-12 text-center space-y-3 rounded-xl">
                    <Repeat size={36} className="mx-auto text-[var(--text-muted)] opacity-40" />
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Belum Ada Tagihan Rutin</p>
                    <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                      Daftarkan pengeluaran berulang Anda seperti WiFi, Sewa Kost, atau Langganan untuk melacak jatuh tempo secara otomatis.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsRecurringModalOpen(true)}
                      className="px-4 py-2 text-xs font-mono font-semibold rounded-md bg-[var(--accent)] text-white hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      + Daftarkan Tagihan Rutin Pertama
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recurringList.map((r) => (
                      <div
                        key={r.id}
                        className={`technical-card p-4 rounded-xl space-y-3 border transition-colors ${
                          r.isOverdue
                            ? "border-rose-500/50 bg-rose-500/[0.02]"
                            : r.isDueSoon
                            ? "border-amber-500/40 bg-amber-500/[0.02]"
                            : "border-[var(--border)]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[var(--text-primary)]">{r.deskripsi}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface-hover)] border border-[var(--border)]">
                              {r.kategori}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                await fetch(`/api/recurring/${r.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ isActive: !r.isActive }),
                                });
                                fetchRecurring();
                              }}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer ${
                                r.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-700 text-zinc-400"
                              }`}
                              title="Klik untuk ubah status aktif"
                            >
                              {r.isActive ? "Aktif" : "Nonaktif"}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!window.confirm(`Hapus transaksi rutin "${r.deskripsi}"?`)) return;
                                await fetch(`/api/recurring/${r.id}`, { method: "DELETE" });
                                fetchRecurring();
                              }}
                              className="p-1 rounded text-[var(--text-muted)] hover:text-rose-500 cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-baseline justify-between font-mono">
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] block">NOMINAL</span>
                            <span
                              className={`text-lg font-bold ${
                                r.tipe === "income" ? "text-emerald-500" : "text-rose-500"
                              }`}
                            >
                              {r.tipe === "income" ? `+ ${formatIDR(r.jumlah)}` : `- ${formatIDR(r.jumlah)}`}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-[var(--text-muted)] block">JATUH TEMPO</span>
                            <span className="text-xs font-semibold text-[var(--text-secondary)]">
                              {r.tanggalBerikutnya}
                            </span>
                          </div>
                        </div>

                        {/* Due Badge and Action */}
                        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                          <span
                            className={`text-[11px] font-mono font-semibold ${
                              r.isOverdue
                                ? "text-rose-500"
                                : r.isDueSoon
                                ? "text-amber-500"
                                : "text-[var(--text-muted)]"
                            }`}
                          >
                            {r.isOverdue
                              ? `🚨 Terlewat ${Math.abs(r.daysUntilDue)} hari`
                              : r.daysUntilDue === 0
                              ? "⚠️ Jatuh tempo hari ini!"
                              : `⏳ ${r.daysUntilDue} hari lagi`}
                          </span>

                          <button
                            type="button"
                            onClick={async () => {
                              const res = await fetch(`/api/recurring/${r.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "pay_now" }),
                              });
                              if (res.ok) {
                                alert(`Transaksi "${r.deskripsi}" telah dicatat ke Buku Kas & periode berikutnya telah dimajukan.`);
                                fetchRecurring();
                                fetchTransactions();
                              }
                            }}
                            className="px-2.5 py-1 text-xs font-mono font-semibold rounded bg-[var(--text-primary)] text-[var(--bg)] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                          >
                            Bayar & Catat
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL: TELEGRAM BOT QUICK-ENTRY */}
      {/* ============================================================== */}
      {isTelegramModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="technical-card w-full max-w-lg rounded-2xl p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500 border border-sky-500/20">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold">Catat Kilat via Telegram Bot</h3>
                  <p className="text-[11px] font-mono text-[var(--text-muted)]">
                    Sinkronisasi instan ke web & Google Sheets dari chat
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTelegramModalOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {telegramLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs font-mono text-[var(--text-muted)]">
                <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <span>Memeriksa status Telegram...</span>
              </div>
            ) : telegramData?.is_linked ? (
              <div className="space-y-4 text-xs font-mono">
                <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <Check size={15} />
                    <span>Akun Telegram Anda Sudah Terhubung!</span>
                  </div>
                  <p className="text-[11px] opacity-90">
                    ID Chat: <code>{telegramData.telegram_chat_id}</code> | Bot: <code>@{telegramData.bot_username}</code>
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] space-y-2">
                  <span className="font-bold text-[var(--text-primary)] block">Cara Mencatat Transaksi di Telegram:</span>
                  <div className="space-y-1 text-[11px] text-[var(--text-secondary)]">
                    <p>• <code>keluar 25000 kopi susu</code> ➔ Pengeluaran Rp 25.000</p>
                    <p>• <code>masuk 500k freelance</code> ➔ Pemasukan Rp 500.000</p>
                    <p>• <code>beli bensin 35rb</code> ➔ Pengeluaran Rp 35.000</p>
                    <p>• <code>-15000 parkir</code> ➔ Pengeluaran Rp 15.000</p>
                    <p>• <code>+1.5jt honor</code> ➔ Pemasukan Rp 1.500.000</p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    onClick={handleUnlinkTelegram}
                    disabled={unlinkingTelegram}
                    className="inline-flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 underline cursor-pointer disabled:opacity-50"
                  >
                    <Unlink size={13} />
                    <span>{unlinkingTelegram ? "Memutuskan..." : "Putuskan Sambungan Telegram"}</span>
                  </button>

                  <a
                    href={`https://t.me/${telegramData.bot_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-sky-500 hover:bg-sky-400 text-white font-semibold transition-colors"
                  >
                    <Send size={13} />
                    <span>Buka Chat Telegram Bot</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs font-mono">
                <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] space-y-2">
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    Hubungkan akun Telegram Anda untuk mulai mencatat pengeluaran atau pemasukan secara kilat tanpa repot membuka browser laptop atau HP.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-[var(--text-muted)]">
                    <li>Kirim chat transaksi, langsung tersimpan ke database Neon.</li>
                    <li>Otomatis tersinkron ke dashboard web & Google Sheets.</li>
                    <li>Mendukung bahasa santai & singkatan angka (k, rb, jt).</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <span className="font-semibold text-[var(--text-primary)] block">Langkah Menghubungkan:</span>
                  <a
                    href={telegramData?.deep_link || `https://t.me/${telegramData?.bot_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs transition-colors"
                  >
                    <Bot size={16} />
                    <span>Klik Di Sini untuk Buka & Hubungkan Bot</span>
                    <ExternalLink size={13} />
                  </a>
                  <p className="text-[11px] text-center text-[var(--text-muted)]">
                    Setelah Telegram terbuka, cukup klik tombol <b>START</b> di bagian bawah chat bot.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-[var(--border)] flex justify-end text-xs font-mono">
              <button
                onClick={() => setIsTelegramModalOpen(false)}
                className="px-4 py-1.5 rounded-md bg-[var(--text-primary)] text-[var(--bg)] font-medium cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: SINKRONISASI REALTIME GOOGLE SPREADSHEETS */}
      {/* ============================================================== */}
      {isSheetsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="technical-card w-full max-w-xl rounded-2xl p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold">Sinkronisasi Google Sheets Realtime</h3>
                  <p className="text-[11px] font-mono text-[var(--text-muted)]">
                    Koneksi live otomatis tanpa perlu download berulang kali
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSheetsModalOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] space-y-2">
                <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                  <Sparkles size={14} className="text-emerald-500" />
                  <span>Keuntungan Mode Google Sheets:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[var(--text-secondary)] font-mono text-[11px]">
                  <li>Mencakup <strong>seluruh riwayat transaksi</strong> dari tahun, bulan, & tanggal kapanpun.</li>
                  <li>Dilengkapi kolom <strong>Saldo Berjalan (Running Balance)</strong> otomatis.</li>
                  <li><strong>Nominal Jelas</strong>: Format Rupiah lengkap (contoh: <code>Rp 1.000.000</code>).</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Langkah 1 — Buka Google Spreadsheet Baru
                </span>
                <div>
                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] hover:border-emerald-500/50 text-xs font-mono font-medium text-[var(--text-primary)] transition-colors"
                  >
                    <span>Buka sheets.new di Tab Baru</span>
                    <ExternalLink size={13} className="text-emerald-500" />
                  </a>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                    Langkah 2 — Paste Rumus Ini di Sel A1
                  </span>
                  {copiedFormula && (
                    <span className="font-mono text-[11px] text-emerald-500 font-bold flex items-center gap-1">
                      <Check size={12} /> Rumus Berhasil Disalin!
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={sheetsLoading ? "Menghasilkan link aman..." : sheetsData?.formula || ""}
                    className="technical-input flex-1 px-3 py-2 text-xs font-mono rounded-md bg-[var(--bg-secondary)] select-all truncate"
                  />
                  <button
                    onClick={handleCopyFormula}
                    disabled={sheetsLoading || !sheetsData?.formula}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {copiedFormula ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedFormula ? "Tersalin" : "Salin Rumus"}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-1.5">
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                  <Layers size={12} />
                  <span>Struktur Kolom yang Dihasilkan:</span>
                </div>
                <p className="font-mono text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  <code className="text-emerald-500 font-bold">No</code> | <code className="text-emerald-500 font-bold">Tanggal</code> | <code className="text-emerald-500 font-bold">Hari</code> | <code className="text-emerald-500 font-bold">Bulan</code> | <code className="text-emerald-500 font-bold">Tahun</code> | <code className="text-emerald-500 font-bold">Kategori</code> | <code className="text-emerald-500 font-bold">Pemasukan (Rp)</code> | <code className="text-emerald-500 font-bold">Pengeluaran (Rp)</code> | <code className="text-emerald-500 font-bold">Nominal Bersih (Rp)</code> | <code className="text-emerald-500 font-bold">Saldo Berjalan (Rp)</code> | <code className="text-emerald-500 font-bold">Keterangan</code>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono">
              <button
                onClick={handleExportCSV}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] underline underline-offset-4 cursor-pointer"
              >
                Unduh file CSV offline biasa
              </button>
              <button
                onClick={() => setIsSheetsModalOpen(false)}
                className="px-4 py-1.5 rounded-md bg-[var(--text-primary)] text-[var(--bg)] font-medium cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: TAMBAH TRANSAKSI MANUAL */}
      {/* ============================================================== */}
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
                    onClick={() => {
                      setFormTipe("income");
                      setFormKategori("Gaji");
                    }}
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
                  Kategori
                </label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {(formTipe === "expense" ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES).map((kat) => (
                    <button
                      key={kat}
                      type="button"
                      onClick={() => setFormKategori(kat)}
                      className={`px-2.5 py-1 text-xs rounded-md border font-mono transition-colors cursor-pointer ${
                        formKategori === kat
                          ? "bg-[var(--accent)] text-white border-[var(--accent)] font-semibold"
                          : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-primary)]"
                      }`}
                    >
                      {kat}
                    </button>
                  ))}
                </div>
                {formKategori === "Lainnya" && (
                  <input
                    type="text"
                    placeholder="Tulis kategori kustom..."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    maxLength={30}
                    className="technical-input w-full px-3 py-1.5 text-xs rounded-md font-mono mt-1"
                  />
                )}
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

      {/* ============================================================== */}
      {/* MODAL: EDIT TRANSAKSI */}
      {/* ============================================================== */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="technical-card w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <div>
                <h3 className="text-base font-bold">Edit Transaksi #{editingTransaction.id}</h3>
                <p className="text-[11px] font-mono text-[var(--text-muted)]">
                  Perbarui detail arus kas secara akurat
                </p>
              </div>
              <button
                onClick={() => setEditingTransaction(null)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {editError && (
              <div className="mt-4 p-3 rounded border border-rose-500/20 bg-rose-500/10 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Jenis Transaksi
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
                  <button
                    type="button"
                    onClick={() => setEditTipe("expense")}
                    className={`py-2 text-xs font-mono font-medium rounded-md transition-all cursor-pointer ${
                      editTipe === "expense"
                        ? "bg-rose-500 text-white font-bold shadow-xs"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    PENGELUARAN (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditTipe("income");
                      if (DEFAULT_EXPENSE_CATEGORIES.includes(editKategori)) setEditKategori("Gaji");
                    }}
                    className={`py-2 text-xs font-mono font-medium rounded-md transition-all cursor-pointer ${
                      editTipe === "income"
                        ? "bg-emerald-500 text-white font-bold shadow-xs"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    PEMASUKAN (+)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Kategori
                </label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {(editTipe === "expense" ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES).map((kat) => (
                    <button
                      key={kat}
                      type="button"
                      onClick={() => setEditKategori(kat)}
                      className={`px-2.5 py-1 text-xs rounded-md border font-mono transition-colors cursor-pointer ${
                        editKategori === kat
                          ? "bg-[var(--accent)] text-white border-[var(--accent)] font-semibold"
                          : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-primary)]"
                      }`}
                    >
                      {kat}
                    </button>
                  ))}
                </div>
                {editKategori === "Lainnya" && (
                  <input
                    type="text"
                    placeholder="Tulis kategori kustom..."
                    value={customEditCategory}
                    onChange={(e) => setCustomEditCategory(e.target.value)}
                    maxLength={30}
                    className="technical-input w-full px-3 py-1.5 text-xs rounded-md font-mono mt-1"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Nominal (IDR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[var(--text-muted)]">
                    Rp
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="0"
                    value={editJumlah}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      if (!raw) {
                        setEditJumlah("");
                      } else {
                        setEditJumlah(new Intl.NumberFormat("id-ID").format(parseInt(raw, 10)));
                      }
                    }}
                    className="technical-input w-full pl-9 pr-3 py-2 text-sm font-mono font-bold rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Tanggal Transaksi
                </label>
                <input
                  type="date"
                  required
                  value={editTanggal}
                  onChange={(e) => setEditTanggal(e.target.value)}
                  className="technical-input w-full px-3 py-2 text-sm font-mono rounded-md"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Deskripsi / Keterangan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Belanja Bulanan / Honor Desain"
                  value={editDeskripsi}
                  onChange={(e) => setEditDeskripsi(e.target.value)}
                  maxLength={200}
                  className="technical-input w-full px-3 py-2 text-sm rounded-md"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTransaction(null)}
                  className="px-4 py-2 rounded-md border border-[var(--border)] text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 rounded-md bg-[var(--accent)] text-black text-xs font-mono font-bold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {editSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: GANTI PASSWORD AKUN */}
      {/* ============================================================== */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="technical-card w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500 border border-sky-500/20">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold">Keamanan & Password</h3>
                  <p className="text-[11px] font-mono text-[var(--text-muted)]">
                    Perbarui kata sandi akun @{user?.username}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {passwordError && (
              <div className="mt-4 p-3 rounded border border-rose-500/20 bg-rose-500/10 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="mt-4 p-3 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 text-xs flex items-center gap-2">
                <Check size={14} />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Password Lama
                </label>
                <input
                  type="password"
                  required
                  placeholder="Masukkan password saat ini"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="technical-input w-full px-3 py-2 text-sm rounded-md"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Password Baru (Min. 6 Karakter)
                </label>
                <input
                  type="password"
                  required
                  placeholder="Masukkan password baru"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="technical-input w-full px-3 py-2 text-sm rounded-md"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  required
                  placeholder="Ketik ulang password baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="technical-input w-full px-3 py-2 text-sm rounded-md"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-[var(--border)] text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="px-5 py-2 rounded-md bg-[var(--text-primary)] text-[var(--bg)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {passwordSubmitting ? "Memproses..." : "Perbarui Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ATUR ANGGARAN (BUDGETS) */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="technical-card w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <Target size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold">Atur Anggaran Kategori</h3>
                  <p className="text-[11px] font-mono text-[var(--text-muted)]">
                    Tetapkan batas pengeluaran bulanan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBudgetModalOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const limitVal = parseFloat(budgetLimitInput.replace(/[^0-9]/g, ""));
                if (isNaN(limitVal) || limitVal <= 0) return alert("Batas anggaran harus berupa angka positif.");
                setBudgetSubmitting(true);
                try {
                  const m = selectedMonth === "all" ? new Date().getMonth() + 1 : selectedMonth;
                  const y = selectedYear === "all" ? new Date().getFullYear() : selectedYear;
                  const res = await fetch("/api/budgets", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ kategori: budgetCategoryInput, limit: limitVal, month: m, year: y }),
                  });
                  if (res.ok) {
                    setIsBudgetModalOpen(false);
                    fetchBudgets();
                  } else {
                    const data = await res.json();
                    alert(data.message || "Gagal menyimpan anggaran.");
                  }
                } finally {
                  setBudgetSubmitting(false);
                }
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase">
                  Pilih Kategori
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {["Makanan", "Transport", "Belanja", "Tagihan", "Hiburan", "Kesehatan", "Total Bulanan"].map((kat) => (
                    <button
                      key={kat}
                      type="button"
                      onClick={() => setBudgetCategoryInput(kat)}
                      className={`px-2.5 py-1 text-xs rounded-md border font-mono transition-colors cursor-pointer ${
                        budgetCategoryInput === kat
                          ? "bg-[var(--accent)] text-white border-[var(--accent)] font-semibold"
                          : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-primary)]"
                      }`}
                    >
                      {kat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase">
                  Batas Maksimal Pengeluaran (IDR)
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 1500000"
                  value={budgetLimitInput}
                  onChange={(e) => setBudgetLimitInput(e.target.value)}
                  required
                  className="technical-input w-full px-3 py-2 text-sm rounded-md font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-[var(--border)] text-xs font-mono text-[var(--text-muted)] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={budgetSubmitting}
                  className="px-5 py-2 rounded-md bg-[var(--text-primary)] text-[var(--bg)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {budgetSubmitting ? "Menyimpan..." : "Simpan Anggaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BUAT TARGET TABUNGAN (SAVINGS) */}
      {isSavingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="technical-card w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <PiggyBank size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold">Target Tabungan Baru</h3>
                  <p className="text-[11px] font-mono text-[var(--text-muted)]">
                    Wujudkan tujuan finansial Anda
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSavingsModalOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const targetVal = parseFloat(savingsTargetInput.replace(/[^0-9]/g, ""));
                if (isNaN(targetVal) || targetVal <= 0) return alert("Target nominal harus berupa angka positif.");
                const initialVal = parseFloat(savingsInitialInput.replace(/[^0-9]/g, "")) || 0;
                setSavingsSubmitting(true);
                try {
                  const res = await fetch("/api/savings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      judul: savingsTitleInput,
                      targetNominal: targetVal,
                      initialSaved: initialVal,
                      targetTanggal: savingsDateInput || null,
                    }),
                  });
                  if (res.ok) {
                    setIsSavingsModalOpen(false);
                    fetchSavings();
                  } else {
                    const data = await res.json();
                    alert(data.message || "Gagal membuat target.");
                  }
                } finally {
                  setSavingsSubmitting(false);
                }
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase">
                  Judul Impian / Tabungan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Dana Darurat / Liburan Jepang"
                  value={savingsTitleInput}
                  onChange={(e) => setSavingsTitleInput(e.target.value)}
                  required
                  className="technical-input w-full px-3 py-2 text-sm rounded-md"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase">
                  Target Nominal (IDR)
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 10000000"
                  value={savingsTargetInput}
                  onChange={(e) => setSavingsTargetInput(e.target.value)}
                  required
                  className="technical-input w-full px-3 py-2 text-sm rounded-md font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase">
                    Tabungan Awal (Opsional)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={savingsInitialInput}
                    onChange={(e) => setSavingsInitialInput(e.target.value)}
                    className="technical-input w-full px-3 py-2 text-sm rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase">
                    Batas Waktu (Opsional)
                  </label>
                  <input
                    type="date"
                    value={savingsDateInput}
                    onChange={(e) => setSavingsDateInput(e.target.value)}
                    className="technical-input w-full px-3 py-2 text-sm rounded-md font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSavingsModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-[var(--border)] text-xs font-mono text-[var(--text-muted)] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingsSubmitting}
                  className="px-5 py-2 rounded-md bg-[var(--text-primary)] text-[var(--bg)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {savingsSubmitting ? "Menyimpan..." : "Buat Target"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SETOR / TARIK DANA TABUNGAN */}
      {activeSavingsForDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="technical-card w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="text-sm font-bold">
                  {activeSavingsForDeposit.isWithdraw ? "Tarik Dana Tabungan" : "Setor Dana Tabungan"}
                </h3>
                <p className="text-[11px] font-mono text-[var(--text-muted)]">
                  {activeSavingsForDeposit.judul} (Saldo: {formatIDR(activeSavingsForDeposit.saved)})
                </p>
              </div>
              <button
                onClick={() => setActiveSavingsForDeposit(null)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const amt = parseFloat(depositAmountInput.replace(/[^0-9]/g, ""));
                if (isNaN(amt) || amt <= 0) return alert("Nominal harus berupa angka positif.");
                setDepositSubmitting(true);
                try {
                  const payload = activeSavingsForDeposit.isWithdraw
                    ? { withdrawAmount: amt }
                    : { depositAmount: amt };
                  const res = await fetch(`/api/savings/${activeSavingsForDeposit.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  if (res.ok) {
                    setActiveSavingsForDeposit(null);
                    fetchSavings();
                  } else {
                    const data = await res.json();
                    alert(data.message || "Gagal memproses transaksi tabungan.");
                  }
                } finally {
                  setDepositSubmitting(false);
                }
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase">
                  Nominal {activeSavingsForDeposit.isWithdraw ? "Penarikan" : "Setoran"} (IDR)
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 250000"
                  value={depositAmountInput}
                  onChange={(e) => setDepositAmountInput(e.target.value)}
                  required
                  className="technical-input w-full px-3 py-2 text-sm rounded-md font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSavingsForDeposit(null)}
                  className="px-3 py-1.5 rounded-md border border-[var(--border)] text-xs font-mono text-[var(--text-muted)] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={depositSubmitting}
                  className="px-4 py-1.5 rounded-md bg-[var(--text-primary)] text-[var(--bg)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {depositSubmitting ? "Menyimpan..." : "Konfirmasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH TAGIHAN RUTIN (RECURRING) */}
      {isRecurringModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="technical-card w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500 border border-sky-500/20">
                  <Repeat size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold">Tambah Tagihan Rutin</h3>
                  <p className="text-[11px] font-mono text-[var(--text-muted)]">
                    Jadwalkan pengeluaran/pemasukan berkala
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRecurringModalOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const amt = parseFloat(recurringAmountInput.replace(/[^0-9]/g, ""));
                if (isNaN(amt) || amt <= 0) return alert("Nominal harus berupa angka positif.");
                if (!recurringDescInput.trim()) return alert("Deskripsi wajib diisi.");
                if (!recurringDueDateInput) return alert("Tanggal jatuh tempo wajib diisi.");
                setRecurringSubmitting(true);
                try {
                  const res = await fetch("/api/recurring", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      tipe: recurringTypeInput,
                      jumlah: amt,
                      kategori: recurringCategoryInput,
                      deskripsi: recurringDescInput.trim(),
                      frekuensi: "monthly",
                      tanggalBerikutnya: recurringDueDateInput,
                    }),
                  });
                  if (res.ok) {
                    setIsRecurringModalOpen(false);
                    fetchRecurring();
                  } else {
                    const data = await res.json();
                    alert(data.message || "Gagal menyimpan tagihan rutin.");
                  }
                } finally {
                  setRecurringSubmitting(false);
                }
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase">
                  Jenis Transaksi
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
                  <button
                    type="button"
                    onClick={() => setRecurringTypeInput("expense")}
                    className={`py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                      recurringTypeInput === "expense"
                        ? "bg-rose-500 text-white font-bold"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    Beban Tagihan (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecurringTypeInput("income")}
                    className={`py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                      recurringTypeInput === "income"
                        ? "bg-emerald-600 text-white font-bold"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    Pemasukan Rutin (+)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase">
                  Deskripsi Tagihan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: WiFi Indihome / Sewa Kost / Gaji Pokok"
                  value={recurringDescInput}
                  onChange={(e) => setRecurringDescInput(e.target.value)}
                  required
                  className="technical-input w-full px-3 py-2 text-sm rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase">
                    Nominal (IDR)
                  </label>
                  <input
                    type="number"
                    placeholder="Contoh: 350000"
                    value={recurringAmountInput}
                    onChange={(e) => setRecurringAmountInput(e.target.value)}
                    required
                    className="technical-input w-full px-3 py-2 text-sm rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase">
                    Jatuh Tempo Berikutnya
                  </label>
                  <input
                    type="date"
                    value={recurringDueDateInput}
                    onChange={(e) => setRecurringDueDateInput(e.target.value)}
                    required
                    className="technical-input w-full px-3 py-2 text-sm rounded-md font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecurringModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-[var(--border)] text-xs font-mono text-[var(--text-muted)] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={recurringSubmitting}
                  className="px-5 py-2 rounded-md bg-[var(--text-primary)] text-[var(--bg)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {recurringSubmitting ? "Menyimpan..." : "Daftarkan Tagihan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
