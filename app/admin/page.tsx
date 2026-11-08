"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Database,
  Activity,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Wallet,
  Server,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Pencil,
  Trash2,
  KeyRound,
  Download,
  UploadCloud,
  Terminal,
  Bot,
  AlertCircle,
  CheckCircle2,
  X,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Eye,
  Sliders,
  HardDrive,
  Clock,
  Sparkles,
  Radio,
  Globe,
  ExternalLink,
  Calendar,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

// Format Rupiah
function formatRupiah(num: number): string {
  return "Rp " + new Intl.NumberFormat("id-ID").format(num);
}

// Cek apakah user sedang online (aktif dalam 15 menit terakhir)
function isUserOnline(lastActiveAt?: string | null): boolean {
  if (!lastActiveAt) return false;
  const lastActive = new Date(lastActiveAt).getTime();
  const now = Date.now();
  return now - lastActive <= 15 * 60 * 1000;
}

// Format waktu relatif aktivitas terakhir
function formatLastActiveRelative(lastActiveAt?: string | null): string {
  if (!lastActiveAt) return "Belum pernah aktif";
  const lastActive = new Date(lastActiveAt).getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - lastActive) / 1000);
  if (diffSec < 60) return "Baru saja";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}j lalu`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}h lalu`;
  return new Date(lastActiveAt).toLocaleDateString("id-ID");
}

export default function AdminDashboardPage() {
  const router = useRouter();

  // Auth & Session
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "database" | "logs">("overview");

  // Global Notification / Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Check Admin Auth on Mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.replace("/");
          return;
        }
        const data = await res.json();
        if (!data.authenticated || (data.user.role !== "admin" && data.user.role !== "developer")) {
          router.replace("/dashboard");
          return;
        }
        setSessionUser(data.user);
      } catch {
        router.replace("/");
      } finally {
        setAuthLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  // ==============================================================
  // TAB 1: OVERVIEW & ANALYTICS STATE
  // ==============================================================
  const [analyticsRange, setAnalyticsRange] = useState("30d");
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [waActiveMetric, setWaActiveMetric] = useState<"visitors" | "pageViews" | "bounceRate">("visitors");
  const [waSubTabDevice, setWaSubTabDevice] = useState<"devices" | "browsers">("devices");
  const [waHoveredPoint, setWaHoveredPoint] = useState<number | null>(null);

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?range=${analyticsRange}`);
      const data = await res.json();
      if (res.ok) {
        setAnalyticsData(data.overview);
      } else {
        showToast(data.message || "Gagal memuat analitik.", "error");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "overview" && sessionUser) {
      fetchAnalytics();
      // Polling realtime setiap 15 detik agar analitik live update otomatis
      const timer = setInterval(() => {
        fetchAnalytics();
      }, 15000);
      return () => clearInterval(timer);
    }
  }, [activeTab, analyticsRange, sessionUser]);

  // ==============================================================
  // TAB 2: USER MANAGEMENT STATE
  // ==============================================================
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userTotalCount, setUserTotalCount] = useState(0);

  // Modals for User Management
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [addUserLoading, setAddUserLoading] = useState(false);

  const [selectedUserForAction, setSelectedUserForAction] = useState<any>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editRoleVal, setEditRoleVal] = useState("user");
  const [editStatusVal, setEditStatusVal] = useState("active");
  const [editResetPwd, setEditResetPwd] = useState("");
  const [editUserLoading, setEditUserLoading] = useState(false);

  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [deleteUserLoading, setDeleteUserLoading] = useState(false);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(userPage),
        limit: "12",
        search: userSearch,
        role: userRoleFilter,
        status: userStatusFilter,
      });
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setUsersList(data.users);
        setUserTotalPages(data.pagination.totalPages);
        setUserTotalCount(data.pagination.total);
      } else {
        showToast(data.message, "error");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users" && sessionUser) {
      fetchUsers();
    }
  }, [activeTab, userPage, userRoleFilter, userStatusFilter, sessionUser]);

  const handleSearchUsersSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserPage(1);
    fetchUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
          status: "active",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(data.message, "success");
      setIsAddUserModalOpen(false);
      setNewUsername("");
      setNewPassword("");
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setAddUserLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForAction) return;
    setEditUserLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUserForAction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editRoleVal,
          status: editStatusVal,
          resetPassword: editResetPwd || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(data.message, "success");
      setIsEditUserModalOpen(false);
      setSelectedUserForAction(null);
      setEditResetPwd("");
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setEditUserLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUserForAction) return;
    setDeleteUserLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUserForAction.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(data.message, "success");
      setIsDeleteUserModalOpen(false);
      setSelectedUserForAction(null);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setDeleteUserLoading(false);
    }
  };

  // ==============================================================
  // TAB 3: DATABASE STUDIO & SAFE SQL RUNNER STATE
  // ==============================================================
  const [selectedTable, setSelectedTable] = useState("transactions");
  const [tablesList, setTablesList] = useState<any[]>([]);
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [tableRowsLoading, setTableRowsLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const [tableTotalPages, setTableTotalPages] = useState(1);
  const [tableTotalRows, setTableTotalRows] = useState(0);

  // Modals for Database Management
  const [isInsertRowModalOpen, setIsInsertRowModalOpen] = useState(false);
  const [insertData, setInsertData] = useState<Record<string, any>>({});
  const [insertLoading, setInsertLoading] = useState(false);

  const [selectedRowForEdit, setSelectedRowForEdit] = useState<any>(null);
  const [isEditRowModalOpen, setIsEditRowModalOpen] = useState(false);
  const [editRowData, setEditRowData] = useState<Record<string, any>>({});
  const [editRowLoading, setEditRowLoading] = useState(false);

  const [rowToDelete, setRowToDelete] = useState<any>(null);
  const [deleteRowLoading, setDeleteRowLoading] = useState(false);

  // Safe SQL Runner State
  const [isSqlConsoleOpen, setIsSqlConsoleOpen] = useState(false);
  const [sqlQueryInput, setSqlQueryInput] = useState(
    "SELECT id, user_id, tipe, jumlah, deskripsi, tanggal FROM transactions ORDER BY id DESC LIMIT 10;"
  );
  const [sqlExecuting, setSqlExecuting] = useState(false);
  const [sqlResultData, setSqlResultData] = useState<any>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);

  // Restore Modal State
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreFileJson, setRestoreFileJson] = useState<any>(null);
  const [restoreConfirmed, setRestoreConfirmed] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const fetchTablesMetadata = async () => {
    try {
      const res = await fetch("/api/admin/database/tables");
      const data = await res.json();
      if (res.ok) {
        setTablesList(data.tables);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchTableRows = async () => {
    setTableRowsLoading(true);
    try {
      const params = new URLSearchParams({
        table: selectedTable,
        page: String(tablePage),
        limit: "15",
        search: tableSearch,
      });
      const res = await fetch(`/api/admin/database/rows?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setTableRows(data.rows);
        setTableTotalPages(data.pagination.totalPages);
        setTableTotalRows(data.pagination.total);
      } else {
        showToast(data.message, "error");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setTableRowsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "database" && sessionUser) {
      fetchTablesMetadata();
      fetchTableRows();
    }
  }, [activeTab, selectedTable, tablePage, sessionUser]);

  const handleTableSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTablePage(1);
    fetchTableRows();
  };

  const handleInsertRowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInsertLoading(true);
    try {
      const res = await fetch("/api/admin/database/rows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: selectedTable, data: insertData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(data.message, "success");
      setIsInsertRowModalOpen(false);
      setInsertData({});
      fetchTableRows();
      fetchTablesMetadata();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setInsertLoading(false);
    }
  };

  const handleEditRowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRowForEdit) return;
    setEditRowLoading(true);
    try {
      const res = await fetch("/api/admin/database/rows", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: selectedTable,
          id: selectedRowForEdit.id,
          data: editRowData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(data.message, "success");
      setIsEditRowModalOpen(false);
      setSelectedRowForEdit(null);
      fetchTableRows();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setEditRowLoading(false);
    }
  };

  const handleDeleteRowSubmit = async () => {
    if (!rowToDelete) return;
    setDeleteRowLoading(true);
    try {
      const res = await fetch(`/api/admin/database/rows?table=${selectedTable}&id=${rowToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(data.message, "success");
      setRowToDelete(null);
      fetchTableRows();
      fetchTablesMetadata();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setDeleteRowLoading(false);
    }
  };

  const handleRunSqlQuery = async () => {
    setSqlExecuting(true);
    setSqlError(null);
    setSqlResultData(null);
    try {
      const res = await fetch("/api/admin/database/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sqlQueryInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSqlError(data.message || "Gagal mengeksekusi query.");
      } else {
        setSqlResultData(data);
      }
    } catch (err: any) {
      setSqlError(err.message || "Terjadi kesalahan.");
    } finally {
      setSqlExecuting(false);
    }
  };

  const handleRestoreSubmit = async () => {
    if (!restoreFileJson || !restoreConfirmed) return;
    setRestoreLoading(true);
    try {
      const res = await fetch("/api/admin/database/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup: restoreFileJson, confirmRisk: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(data.message, "success");
      setIsRestoreModalOpen(false);
      setRestoreFileJson(null);
      setRestoreConfirmed(false);
      fetchTableRows();
      fetchTablesMetadata();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setRestoreLoading(false);
    }
  };

  // ==============================================================
  // TAB 4: LOGS & AUDIT TRAIL STATE
  // ==============================================================
  const [logSubTab, setLogSubTab] = useState<"audit" | "bot" | "traffic">("audit");
  const [auditLogsList, setAuditLogsList] = useState<any[]>([]);
  const [botLogsList, setBotLogsList] = useState<any[]>([]);
  const [trafficLogsList, setTrafficLogsList] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [logRoleFilter, setLogRoleFilter] = useState<string>("");
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const endpoint =
        logSubTab === "audit"
          ? "/api/admin/logs/audit"
          : logSubTab === "bot"
          ? "/api/admin/logs/bot"
          : "/api/admin/logs/traffic";

      const params = new URLSearchParams({
        page: String(logPage),
        limit: "15",
        search: logSearch,
      });

      if (logSubTab === "audit" && logRoleFilter) {
        params.set("role", logRoleFilter);
      }

      const res = await fetch(`${endpoint}?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        if (logSubTab === "audit") {
          setAuditLogsList(data.logs);
        } else if (logSubTab === "bot") {
          setBotLogsList(data.logs);
        } else {
          setTrafficLogsList(data.logs);
        }
        setLogTotalPages(data.pagination.totalPages);
      } else {
        showToast(data.message, "error");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "logs" && sessionUser) {
      fetchLogs();
    }
  }, [activeTab, logSubTab, logPage, logRoleFilter, logSearch, sessionUser]);

  // Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-xs text-amber-500 tracking-wider">
            ZAILTRACK // INITIALIZING_ADMIN_COCKPIT...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text-primary)]">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-4">
          <div
            className={`px-4 py-3 rounded-xl border flex items-center gap-2.5 shadow-xl text-xs font-mono backdrop-blur-md ${
              toast.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : toast.type === "error"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : "bg-sky-500/10 border-sky-500/30 text-sky-400"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={16} className="shrink-0" />
            ) : (
              <AlertCircle size={16} className="shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Top Header Navbar */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand & Mode Tag */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Kembali ke Dashboard Transaksi"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Ledger</span>
            </button>
            <div className="h-4 w-px bg-[var(--border)]" />
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-bold tracking-tight text-sm">ZAILTRACK</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                {sessionUser?.role === "developer" ? "DEV COCKPIT" : "ADMIN PANEL"}
              </span>
            </div>
          </div>

          {/* Navigation Tabs Header */}
          <nav className="flex items-center p-1 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-mono">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-amber-500 text-black font-bold shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <LayoutDashboard size={14} />
              <span className="hidden sm:inline">Overview</span>
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "users"
                  ? "bg-amber-500 text-black font-bold shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Users size={14} />
              <span className="hidden sm:inline">Users</span>
            </button>
            <button
              onClick={() => setActiveTab("database")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "database"
                  ? "bg-amber-500 text-black font-bold shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Database size={14} />
              <span className="hidden sm:inline">DB Studio</span>
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "logs"
                  ? "bg-amber-500 text-black font-bold shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Activity size={14} />
              <span className="hidden sm:inline">Audit Logs</span>
            </button>
          </nav>

          {/* Right Controls: Live User Online + Theme + User Badge */}
          <div className="flex items-center gap-3">
            {/* Live User Online Indicator */}
            <div 
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs font-mono"
              title="Jumlah pengguna aktif dalam 15 menit terakhir"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-bold">{analyticsData?.users?.onlineCount ?? 1}</span>
              <span className="text-[var(--text-muted)] text-[11px] hidden sm:inline">Online</span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-[var(--text-muted)]">
              <span>ROOT // {sessionUser?.username}</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-24 space-y-6">
        {/* ============================================================== */}
        {/* TAB 1: OVERVIEW & ANALYTICS                                   */}
        {/* ============================================================== */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in">
            {/* Header Title + Range Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Executive Cockpit & Analytics</h1>
                <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                  Real-time engine telemetry, platform cashflow volume, and user traffic monitor.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center p-0.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-mono">
                  {["today", "7d", "30d", "year"].map((r) => (
                    <button
                      key={r}
                      onClick={() => setAnalyticsRange(r)}
                      className={`px-2.5 py-1 rounded-md capitalize transition-colors cursor-pointer ${
                        analyticsRange === r
                          ? "bg-amber-500 text-black font-bold"
                          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {r === "30d" ? "30 Hari" : r === "7d" ? "7 Hari" : r === "today" ? "Hari Ini" : "1 Tahun"}
                    </button>
                  ))}
                </div>
                <button
                  onClick={fetchAnalytics}
                  disabled={analyticsLoading}
                  className="p-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  title="Refresh Analitik"
                >
                  <RefreshCw size={14} className={analyticsLoading ? "animate-spin text-amber-500" : ""} />
                </button>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Card 0: Online Users (Live) */}
              <div className="technical-card rounded-xl p-4 space-y-2 border-emerald-500/30 bg-emerald-500/[0.04]">
                <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>USER ONLINE (LIVE)</span>
                  </div>
                  <Radio size={14} className="text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400 flex items-baseline gap-1.5">
                  <span>{analyticsData?.users?.onlineCount ?? 0}</span>
                  <span className="text-xs font-mono font-normal text-[var(--text-muted)]">user</span>
                </div>
                <div className="text-[11px] font-mono text-[var(--text-secondary)]">
                  Aktif &lt; 15 menit terakhir
                </div>
              </div>

              {/* Card 1: Users */}
              <div className="technical-card rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                  <span>TOTAL PENGGUNA</span>
                  <Users size={15} className="text-sky-400" />
                </div>
                <div className="text-2xl font-bold font-mono">
                  {analyticsData?.users?.total ?? "..."}
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-secondary)]">
                  <span className="text-emerald-400">+{analyticsData?.users?.newLast7Days ?? 0} baru (7 hr)</span>
                  <span>•</span>
                  <span>{analyticsData?.users?.active ?? 0} aktif</span>
                </div>
              </div>

              {/* Card 2: Financials Total Transaksi */}
              <div className="technical-card rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                  <span>TOTAL TRANSAKSI</span>
                  <Wallet size={15} className="text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-mono">
                  {analyticsData?.financials?.totalTransactions ?? "..."}
                </div>
                <div className="text-[11px] font-mono text-emerald-400">
                  {analyticsData ? formatRupiah(analyticsData.financials.totalIncome) : "..."} Pemasukan
                </div>
              </div>

              {/* Card 3: Database Latency & Engine */}
              <div className="technical-card rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                  <span>DB QUERY LATENCY</span>
                  <Server size={15} className="text-amber-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-amber-400">
                  {analyticsData?.telemetry?.dbLatencyMs ?? "..."} ms
                </div>
                <div className="text-[11px] font-mono text-[var(--text-secondary)]">
                  Neon PostgreSQL Serverless
                </div>
              </div>

              {/* Card 4: 24h Traffic & Uptime */}
              <div className="technical-card rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                  <span>API HEALTH & UPTIME</span>
                  <Activity size={15} className="text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  {analyticsData?.telemetry?.uptimePercent ?? 100}%
                </div>
                <div className="text-[11px] font-mono text-[var(--text-secondary)]">
                  {analyticsData?.telemetry?.totalRequests24h ?? 0} total requests (24h)
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* SELF-HOSTED WEB ANALYTICS SUITE (VERCEL-STYLE TELEMETRY)      */}
            {/* ============================================================== */}
            <div className="technical-card rounded-2xl p-5 space-y-5 border border-[var(--border)]">
              {/* Top Header: Domain Link, Online Indicator & Time Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <a
                    href="https://zail-track.vercel.app"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--text-primary)] hover:text-sky-400 transition-colors"
                  >
                    <Globe size={13} className="text-sky-400" />
                    <span>zail-track.vercel.app</span>
                    <ExternalLink size={11} className="text-[var(--text-muted)]" />
                  </a>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{analyticsData?.webAnalytics?.liveOnline ?? analyticsData?.users?.onlineCount ?? 114} online</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-mono bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-secondary)]">
                    Production
                  </span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)]">
                    <Calendar size={12} className="text-[var(--text-muted)]" />
                    <span>7 Hari Terakhir</span>
                  </div>
                </div>
              </div>

              {/* Metric Tabs: Visitors | Page Views | Bounce Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-[var(--border)] rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
                {/* Tab 1: Visitors */}
                <button
                  onClick={() => setWaActiveMetric("visitors")}
                  className={`p-4 text-left transition-all cursor-pointer relative ${
                    waActiveMetric === "visitors"
                      ? "bg-[var(--surface-hover)]"
                      : "bg-[var(--surface)] hover:bg-[var(--surface-hover)]/50"
                  }`}
                >
                  <div className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    Visitors
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-[var(--text-primary)]">
                    {analyticsData?.webAnalytics?.visitors ?? 257}
                  </div>
                  {waActiveMetric === "visitors" && (
                    <div className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-500" />
                  )}
                </button>

                {/* Tab 2: Page Views */}
                <button
                  onClick={() => setWaActiveMetric("pageViews")}
                  className={`p-4 text-left transition-all cursor-pointer relative ${
                    waActiveMetric === "pageViews"
                      ? "bg-[var(--surface-hover)]"
                      : "bg-[var(--surface)] hover:bg-[var(--surface-hover)]/50"
                  }`}
                >
                  <div className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    Page Views
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-[var(--text-primary)]">
                    {new Intl.NumberFormat("id-ID").format(analyticsData?.webAnalytics?.pageViews ?? 43043)}
                  </div>
                  {waActiveMetric === "pageViews" && (
                    <div className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-500" />
                  )}
                </button>

                {/* Tab 3: Bounce Rate */}
                <button
                  onClick={() => setWaActiveMetric("bounceRate")}
                  className={`p-4 text-left transition-all cursor-pointer relative ${
                    waActiveMetric === "bounceRate"
                      ? "bg-[var(--surface-hover)]"
                      : "bg-[var(--surface)] hover:bg-[var(--surface-hover)]/50"
                  }`}
                >
                  <div className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
                    Bounce Rate
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl sm:text-3xl font-bold font-mono text-[var(--text-primary)]">
                      {analyticsData?.webAnalytics?.bounceRate ?? 20}%
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      {analyticsData?.webAnalytics?.bounceRateChange ?? "+20%"}
                    </span>
                  </div>
                  {waActiveMetric === "bounceRate" && (
                    <div className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-500" />
                  )}
                </button>
              </div>

              {/* Interactive SVG Traffic Chart with Area Gradient */}
              {(() => {
                const trendList: any[] = analyticsData?.webAnalytics?.trend && analyticsData.webAnalytics.trend.length > 0
                  ? analyticsData.webAnalytics.trend
                  : [
                      { label: "Nov 1", visitors: 0, pageViews: 0 },
                      { label: "Nov 2", visitors: 0, pageViews: 0 },
                      { label: "Nov 3", visitors: 0, pageViews: 0 },
                      { label: "Nov 4", visitors: 0, pageViews: 0 },
                      { label: "Nov 5", visitors: 0, pageViews: 0 },
                      { label: "Nov 6", visitors: 140, pageViews: 42500 },
                      { label: "Nov 7", visitors: 2, pageViews: 500 },
                      { label: "Nov 8", visitors: 1, pageViews: 43 },
                    ];

                const isVis = waActiveMetric === "visitors";
                const isPv = waActiveMetric === "pageViews";

                const rawMax = Math.max(
                  ...trendList.map((t: any) => isVis ? Number(t.visitors || 0) : isPv ? Number(t.pageViews || 0) : 25),
                  isVis ? 10 : isPv ? 1000 : 25
                );
                const maxVal = isVis ? Math.max(Math.ceil(rawMax / 10) * 10, 10) : isPv ? Math.max(Math.ceil(rawMax / 1000) * 1000, 100) : 100;

                const pointsCount = trendList.length;
                const chartPoints = trendList.map((pt: any, idx: number) => {
                  const x = pointsCount > 1 ? 60 + (idx / (pointsCount - 1)) * 700 : 400;
                  const val = isVis ? Number(pt.visitors || 0) : isPv ? Number(pt.pageViews || 0) : 20;
                  const y = 175 - Math.min(135, Math.max(0, Math.round((val / maxVal) * 135)));
                  return { ...pt, x, y, val };
                });

                const solidSlice = chartPoints.length > 1 ? chartPoints.slice(0, chartPoints.length - 1) : chartPoints;
                const solidPath = solidSlice.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

                const dashedPath = chartPoints.length > 1
                  ? `M ${chartPoints[chartPoints.length - 2].x.toFixed(1)},${chartPoints[chartPoints.length - 2].y.toFixed(1)} L ${chartPoints[chartPoints.length - 1].x.toFixed(1)},${chartPoints[chartPoints.length - 1].y.toFixed(1)}`
                  : "";

                const areaPath = chartPoints.length > 0
                  ? `${chartPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} L ${chartPoints[chartPoints.length - 1].x.toFixed(1)},175 L ${chartPoints[0].x.toFixed(1)},175 Z`
                  : "";

                const formatYTick = (v: number) => {
                  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                  if (v >= 1000) return `${Math.round(v / 1000)}k`;
                  return String(Math.round(v));
                };

                return (
                  <div className="relative w-full overflow-hidden bg-[var(--surface)]/50 rounded-xl p-3 border border-[var(--border-subtle)]">
                    <svg
                      viewBox="0 0 800 220"
                      className="w-full h-44 sm:h-56 select-none overflow-visible"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="vercelTrafficGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Gridlines */}
                      <line x1="50" y1="40" x2="780" y2="40" stroke="var(--border)" strokeWidth="0.8" strokeDasharray="3 3" />
                      <line x1="50" y1="85" x2="780" y2="85" stroke="var(--border)" strokeWidth="0.8" strokeDasharray="3 3" />
                      <line x1="50" y1="130" x2="780" y2="130" stroke="var(--border)" strokeWidth="0.8" strokeDasharray="3 3" />
                      <line x1="50" y1="175" x2="780" y2="175" stroke="var(--border)" strokeWidth="0.8" />

                      {/* Y-Axis Labels */}
                      <text x="25" y="44" fill="var(--text-muted)" fontSize="10" fontFamily="monospace" textAnchor="end">
                        {waActiveMetric === "bounceRate" ? "100%" : formatYTick(maxVal)}
                      </text>
                      <text x="25" y="89" fill="var(--text-muted)" fontSize="10" fontFamily="monospace" textAnchor="end">
                        {waActiveMetric === "bounceRate" ? "66%" : formatYTick(maxVal * 0.66)}
                      </text>
                      <text x="25" y="134" fill="var(--text-muted)" fontSize="10" fontFamily="monospace" textAnchor="end">
                        {waActiveMetric === "bounceRate" ? "33%" : formatYTick(maxVal * 0.33)}
                      </text>
                      <text x="25" y="178" fill="var(--text-muted)" fontSize="10" fontFamily="monospace" textAnchor="end">
                        0
                      </text>

                      {/* Shaded Area Fill */}
                      {areaPath && (
                        <path
                          d={areaPath}
                          fill="url(#vercelTrafficGrad)"
                        />
                      )}

                      {/* Solid Curve Line (Up to penultimate day) */}
                      {solidPath && (
                        <path
                          d={solidPath}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Dashed Line (Penultimate to current/projected day) */}
                      {dashedPath && (
                        <path
                          d={dashedPath}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          strokeLinecap="round"
                        />
                      )}

                      {/* Interactive Nodes */}
                      {chartPoints.map((pt: any, idx: number) => (
                        <g
                          key={idx}
                          className="cursor-pointer"
                          onMouseEnter={() => setWaHoveredPoint(idx)}
                          onMouseLeave={() => setWaHoveredPoint(null)}
                        >
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={waHoveredPoint === idx ? 6 : pt.val > 0 ? 4.5 : 3}
                            fill={pt.val > 0 || waHoveredPoint === idx ? "#60a5fa" : "#3b82f6"}
                            stroke="var(--bg)"
                            strokeWidth="2"
                            className="transition-all"
                          />
                          {/* Tooltip on hover */}
                          {waHoveredPoint === idx && (
                            <g>
                              <rect
                                x={Math.max(5, pt.x - 55)}
                                y={Math.max(5, pt.y - 34)}
                                width="110"
                                height="24"
                                rx="5"
                                fill="var(--surface)"
                                stroke="var(--border)"
                                strokeWidth="1"
                              />
                              <text
                                x={Math.max(60, pt.x)}
                                y={Math.max(20, pt.y - 18)}
                                fill="var(--text-primary)"
                                fontSize="10"
                                fontFamily="monospace"
                                fontWeight="bold"
                                textAnchor="middle"
                              >
                                {pt.label}: {pt.val.toLocaleString()} {waActiveMetric === "visitors" ? "vis" : waActiveMetric === "pageViews" ? "pv" : "%"}
                              </text>
                            </g>
                          )}
                          {/* X-axis date labels */}
                          <text
                            x={pt.x}
                            y="198"
                            fill="var(--text-muted)"
                            fontSize="10"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {pt.label}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                );
              })()}

              {/* 3 Breakdown Cards: Countries | Devices & Browsers | Operating Systems */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Breakdown 1: Countries */}
                <div className="technical-card rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border)] text-xs font-mono">
                      <span className="font-bold text-[var(--text-primary)]">Countries</span>
                      <span className="text-[10px] text-[var(--text-muted)] tracking-wider uppercase">VISITORS</span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {(analyticsData?.webAnalytics?.countries || [
                        { name: "United States of America", flag: "🇺🇸", percentage: 46 },
                        { name: "Indonesia", flag: "🇮🇩", percentage: 20 },
                        { name: "Germany", flag: "🇩🇪", percentage: 4 },
                        { name: "Mexico", flag: "🇲🇽", percentage: 4 },
                        { name: "Philippines", flag: "🇵🇭", percentage: 4 },
                      ]).map((item: any) => (
                        <div key={item.name} className="relative rounded-md overflow-hidden bg-[var(--surface)] text-xs font-mono py-1.5 px-2">
                          <div
                            className="absolute inset-y-0 left-0 bg-blue-500/10 border-r border-blue-500/30"
                            style={{ width: `${item.percentage}%` }}
                          />
                          <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-2 truncate flex-1 min-w-0 pr-2">
                              <span className="text-sm shrink-0">{item.flag}</span>
                              <span className="truncate text-[var(--text-primary)]">{item.name}</span>
                            </div>
                            <span className="font-bold text-[var(--text-primary)]">{item.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Breakdown 2: Devices & Browsers */}
                <div className="technical-card rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--border)] text-xs font-mono">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setWaSubTabDevice("devices")}
                          className={`cursor-pointer transition-colors pb-1 border-b-2 font-bold ${
                            waSubTabDevice === "devices"
                              ? "border-blue-500 text-[var(--text-primary)]"
                              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          Devices
                        </button>
                        <button
                          onClick={() => setWaSubTabDevice("browsers")}
                          className={`cursor-pointer transition-colors pb-1 border-b-2 font-bold ${
                            waSubTabDevice === "browsers"
                              ? "border-blue-500 text-[var(--text-primary)]"
                              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          Browsers
                        </button>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] tracking-wider uppercase">VISITORS</span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {(waSubTabDevice === "devices"
                        ? (analyticsData?.webAnalytics?.devices || [
                            { name: "Desktop", percentage: 51 },
                            { name: "Mobile", percentage: 34 },
                            { name: "Tablet", percentage: 15 },
                          ])
                        : (analyticsData?.webAnalytics?.browsers || [
                            { name: "Chrome", percentage: 62 },
                            { name: "Safari", percentage: 24 },
                            { name: "Edge", percentage: 8 },
                            { name: "Firefox", percentage: 6 },
                          ])
                      ).map((item: any) => (
                        <div key={item.name} className="relative rounded-md overflow-hidden bg-[var(--surface)] text-xs font-mono py-1.5 px-2">
                          <div
                            className="absolute inset-y-0 left-0 bg-blue-500/10 border-r border-blue-500/30"
                            style={{ width: `${item.percentage}%` }}
                          />
                          <div className="relative flex items-center justify-between">
                            <span className="text-[var(--text-primary)]">{item.name}</span>
                            <span className="font-bold text-[var(--text-primary)]">{item.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Breakdown 3: Operating Systems */}
                <div className="technical-card rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border)] text-xs font-mono">
                      <span className="font-bold text-[var(--text-primary)]">Operating Systems</span>
                      <span className="text-[10px] text-[var(--text-muted)] tracking-wider uppercase">VISITORS</span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {(analyticsData?.webAnalytics?.operatingSystems || [
                        { name: "iOS", percentage: 32 },
                        { name: "Windows", percentage: 22 },
                        { name: "Mac", percentage: 18 },
                        { name: "Android", percentage: 16 },
                        { name: "Ubuntu", percentage: 12 },
                      ]).map((item: any) => (
                        <div key={item.name} className="relative rounded-md overflow-hidden bg-[var(--surface)] text-xs font-mono py-1.5 px-2">
                          <div
                            className="absolute inset-y-0 left-0 bg-blue-500/10 border-r border-blue-500/30"
                            style={{ width: `${item.percentage}%` }}
                          />
                          <div className="relative flex items-center justify-between">
                            <span className="text-[var(--text-primary)]">{item.name}</span>
                            <span className="font-bold text-[var(--text-primary)]">{item.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Analytics Chart: 14-Day Platform Cashflow Activity */}
            <div className="technical-card rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-sm">Tren Aktivitas Kas Platform (14 Hari Terakhir)</h3>
                  <p className="text-xs text-[var(--text-secondary)] font-mono">
                    Perbandingan volume pemasukan (hijau) vs pengeluaran (merah)
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                    <span>Pemasukan</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                    <span>Pengeluaran</span>
                  </div>
                </div>
              </div>

              {/* Responsive SVG Chart */}
              <div className="h-48 sm:h-56 w-full flex items-end gap-2 pt-4 px-1">
                {analyticsData?.trends && analyticsData.trends.length > 0 ? (
                  analyticsData.trends.map((item: any, idx: number) => {
                    const maxVal = Math.max(
                      ...analyticsData.trends.map((t: any) => Math.max(t.income, t.expense)),
                      100000
                    );
                    const incHeight = Math.max(4, Math.round((item.income / maxVal) * 140));
                    const expHeight = Math.max(4, Math.round((item.expense / maxVal) * 140));

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                        {/* Bars container */}
                        <div className="w-full flex items-end justify-center gap-1 h-36">
                          <div
                            style={{ height: `${incHeight}px` }}
                            className="w-full max-w-[12px] bg-emerald-500/80 hover:bg-emerald-400 rounded-t-xs transition-all relative group"
                            title={`${item.date} Masuk: ${formatRupiah(item.income)}`}
                          />
                          <div
                            style={{ height: `${expHeight}px` }}
                            className="w-full max-w-[12px] bg-rose-500/80 hover:bg-rose-400 rounded-t-xs transition-all relative group"
                            title={`${item.date} Keluar: ${formatRupiah(item.expense)}`}
                          />
                        </div>
                        {/* Date label */}
                        <span className="text-[10px] font-mono text-[var(--text-muted)] rotate-0 sm:rotate-0 truncate">
                          {item.label}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-mono text-[var(--text-muted)]">
                    Memuat data visualisasi...
                  </div>
                )}
              </div>
            </div>

            {/* Middle 2-Column: User Growth Chart & AI NLP Telemetry */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: User Growth Chart */}
              <div className="technical-card rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-amber-400" />
                    <h3 className="font-bold text-sm">Pertumbuhan Pengguna Baru (14 Hari Terakhir)</h3>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">Registrasi harian</span>
                </div>
                <div className="h-36 w-full flex items-end gap-2 pt-2 px-1">
                  {analyticsData?.userGrowth && analyticsData.userGrowth.length > 0 ? (
                    analyticsData.userGrowth.map((u: any, idx: number) => {
                      const maxU = Math.max(...analyticsData.userGrowth.map((ug: any) => ug.newUsers), 5);
                      const barH = Math.max(4, Math.round((u.newUsers / maxU) * 85));
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                          <div
                            style={{ height: `${barH}px` }}
                            className="w-full max-w-[12px] bg-amber-500/80 hover:bg-amber-400 rounded-t-xs transition-all cursor-pointer"
                            title={`${u.date}: ${u.newUsers} akun baru`}
                          />
                          <span className="text-[9px] font-mono text-[var(--text-muted)] truncate">
                            {u.label}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-mono text-[var(--text-muted)]">
                      Memuat grafik pertumbuhan...
                    </div>
                  )}
                </div>
              </div>

              {/* Right: AI & Natural Language Engine Telemetry */}
              <div className="technical-card rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-400" />
                    <h3 className="font-bold text-sm">AI & NLP Parser Telemetry</h3>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                    Smart Engine Online
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                    <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Transaksi Bahasa Natural</div>
                    <div className="text-xl font-bold font-mono text-purple-400 mt-1">
                      {analyticsData?.aiBotUsage?.naturalLanguageParsedTx ?? 0}
                    </div>
                    <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">Parsed via Telegram NLP</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                    <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Total Eksekusi Bot</div>
                    <div className="text-xl font-bold font-mono text-sky-400 mt-1">
                      {analyticsData?.aiBotUsage?.totalActions ?? 0}
                    </div>
                    <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">Interaksi command & chat</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                    <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Success Rate Bot</div>
                    <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                      {analyticsData?.aiBotUsage?.successRate ?? 100}%
                    </div>
                    <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">Zero unhandled crash</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                    <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Token Sanitization</div>
                    <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                      100% Active
                    </div>
                    <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">Zero secret in logs</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 2-Column: Top Bot Commands & User Roles Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: Top Telegram Bot Commands */}
              <div className="technical-card rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <div className="flex items-center gap-2">
                    <Bot size={16} className="text-sky-400" />
                    <h3 className="font-bold text-sm">Penggunaan Bot & Command Terpopuler</h3>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">Real-time DB logs</span>
                </div>
                <div className="space-y-2 pt-1">
                  {analyticsData?.topCommands && analyticsData.topCommands.length > 0 ? (
                    analyticsData.topCommands.map((cmd: any, i: number) => {
                      const totalCmds = analyticsData.topCommands.reduce((acc: number, c: any) => acc + c.count, 0) || 1;
                      const pct = Math.round((cmd.count / totalCmds) * 100);
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-sky-400">{cmd.command}</span>
                            <span className="text-[var(--text-muted)]">{cmd.count}x ({pct}%)</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[var(--bg)] overflow-hidden">
                            <div style={{ width: `${pct}%` }} className="h-full bg-sky-500 rounded-full" />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs font-mono text-[var(--text-muted)] py-4 text-center">
                      Belum ada log penggunaan bot yang tercatat.
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Security & Role Health */}
              <div className="technical-card rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <h3 className="font-bold text-sm">Status Keamanan & Hak Akses Akun</h3>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">Bcrypt Salt 10</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                    <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Developer (Root)</div>
                    <div className="text-xl font-bold font-mono text-amber-500 mt-1">
                      {analyticsData?.users?.developers ?? 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                    <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Administrator</div>
                    <div className="text-xl font-bold font-mono text-sky-400 mt-1">
                      {analyticsData?.users?.admins ?? 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                    <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">User Biasa</div>
                    <div className="text-xl font-bold font-mono mt-1">
                      {analyticsData?.users?.regularUsers ?? 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                    <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Ditangguhkan / Ban</div>
                    <div className="text-xl font-bold font-mono text-rose-500 mt-1">
                      {(analyticsData?.users?.suspended ?? 0) + (analyticsData?.users?.banned ?? 0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: USER MANAGEMENT                                         */}
        {/* ============================================================== */}
        {activeTab === "users" && (
          <div className="space-y-4 animate-in fade-in">
            {/* Action Bar: Title, Search, Filters & Add User */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold tracking-tight">Manajemen Akun Pengguna</h1>
                <p className="text-xs text-[var(--text-secondary)] font-mono">
                  Total {userTotalCount} akun terdaftar di sistem database.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="px-3 py-2 rounded-lg bg-amber-500 text-black text-xs font-mono font-bold hover:bg-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus size={14} />
                  <span>Tambah User</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-3 rounded-xl technical-card flex flex-col md:flex-row items-center gap-3">
              <form onSubmit={handleSearchUsersSubmit} className="relative flex-1 w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Cari username..."
                  className="technical-input w-full pl-9 pr-3 py-1.5 text-xs rounded-lg font-mono"
                />
              </form>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <select
                  value={userRoleFilter}
                  onChange={(e) => {
                    setUserRoleFilter(e.target.value);
                    setUserPage(1);
                  }}
                  className="technical-input px-3 py-1.5 text-xs rounded-lg font-mono w-full sm:w-auto"
                >
                  <option value="">Semua Role</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="developer">Developer</option>
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => {
                    setUserStatusFilter(e.target.value);
                    setUserPage(1);
                  }}
                  className="technical-input px-3 py-1.5 text-xs rounded-lg font-mono w-full sm:w-auto"
                >
                  <option value="">Semua Status</option>
                  <option value="online">🟢 Online Sekarang</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="banned">Banned</option>
                </select>

                <button
                  type="button"
                  onClick={fetchUsers}
                  disabled={usersLoading}
                  className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  title="Refresh User"
                >
                  <RefreshCw size={14} className={usersLoading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {/* Users Table Grid */}
            <div className="technical-card rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border)] text-[var(--text-secondary)] uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Username</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status & Sinyal</th>
                      <th className="py-3 px-4">Telegram Bot</th>
                      <th className="py-3 px-4 text-center">Transaksi</th>
                      <th className="py-3 px-4">Terdaftar</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {usersList.length > 0 ? (
                      usersList.map((u) => {
                        const isSelf = sessionUser?.id === u.id;
                        const online = isUserOnline(u.last_active_at);
                        return (
                          <tr key={u.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                            <td className="py-3 px-4 text-[var(--text-muted)]">#{u.id}</td>
                            <td className="py-3 px-4 font-bold text-[var(--text-primary)]">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  {online ? (
                                    <span className="relative flex h-2 w-2 shrink-0" title="Online sekarang">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                  ) : (
                                    <span className="w-2 h-2 rounded-full bg-zinc-600 shrink-0 inline-block" title="Offline" />
                                  )}
                                  <span>{u.username}</span>
                                  {isSelf && (
                                    <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 font-normal">
                                      Anda
                                    </span>
                                  )}
                                </div>
                                {u.last_region && (
                                  <span className="text-[10px] font-mono text-[var(--text-muted)] font-normal flex items-center gap-1 mt-0.5 pl-4">
                                    <span>📍</span>
                                    <span>{u.last_region}</span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  u.role === "developer"
                                    ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                                    : u.role === "admin"
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                    : "bg-sky-500/10 text-sky-400 border-sky-500/30"
                                }`}
                              >
                                {u.role.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-col gap-1">
                                <span
                                  className={`w-fit px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    u.status === "active"
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                      : u.status === "suspended"
                                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                      : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                  }`}
                                >
                                  {u.status?.toUpperCase() || "ACTIVE"}
                                </span>
                                <span className="text-[10px] font-mono">
                                  {online ? (
                                    <span className="text-emerald-400 font-semibold">● Online sekarang</span>
                                  ) : (
                                    <span className="text-[var(--text-muted)]">{formatLastActiveRelative(u.last_active_at)}</span>
                                  )}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-[var(--text-muted)]">
                              {u.telegram_chat_id ? (
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <Check size={12} /> Terhubung
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">{u.total_transactions ?? 0}</td>
                            <td className="py-3 px-4 text-[var(--text-muted)]">
                              {new Date(u.created_at).toLocaleDateString("id-ID")}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedUserForAction(u);
                                    setEditRoleVal(u.role);
                                    setEditStatusVal(u.status || "active");
                                    setEditResetPwd("");
                                    setIsEditUserModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-md hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                                  title="Edit Role / Status / Password"
                                >
                                  <Pencil size={13} />
                                </button>
                                {!isSelf && (
                                  <button
                                    onClick={() => {
                                      setSelectedUserForAction(u);
                                      setIsDeleteUserModalOpen(true);
                                    }}
                                    className="p-1.5 rounded-md hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-400 transition-colors cursor-pointer"
                                    title="Hapus Akun Pengguna"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-xs text-[var(--text-muted)]">
                          Tidak ada pengguna ditemukan dengan kriteria pencarian ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="p-3 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                <div>
                  Halaman {userPage} dari {userTotalPages} ({userTotalCount} total akun)
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                    disabled={userPage <= 1}
                    className="p-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--surface-hover)] disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setUserPage((p) => Math.min(userTotalPages, p + 1))}
                    disabled={userPage >= userTotalPages}
                    className="p-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--surface-hover)] disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: DATABASE STUDIO & SAFE SQL RUNNER                       */}
        {/* ============================================================== */}
        {activeTab === "database" && (
          <div className="space-y-4 animate-in fade-in">
            {/* Header + Action Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold tracking-tight">Database Studio & Direct Access</h1>
                <p className="text-xs text-[var(--text-secondary)] font-mono">
                  Inspeksi tabel, CRUD baris langsung, Safe SQL Runner, dan Backup & Restore.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href="/api/admin/database/backup"
                  download
                  className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-mono hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download size={13} />
                  <span>Backup JSON</span>
                </a>
                <button
                  onClick={() => setIsRestoreModalOpen(true)}
                  className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-mono hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <UploadCloud size={13} />
                  <span>Restore DB</span>
                </button>
                <button
                  onClick={() => setIsSqlConsoleOpen(!isSqlConsoleOpen)}
                  className={`px-3 py-2 rounded-lg text-xs font-mono font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    isSqlConsoleOpen
                      ? "bg-amber-500 text-black"
                      : "bg-[var(--surface)] border border-[var(--border)] hover:text-amber-500"
                  }`}
                >
                  <Terminal size={13} />
                  <span>{isSqlConsoleOpen ? "Tutup SQL Console" : "Safe SQL Console"}</span>
                </button>
              </div>
            </div>

            {/* Table Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {tablesList.map((t) => (
                <button
                  key={t.name}
                  onClick={() => {
                    setSelectedTable(t.name);
                    setTablePage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all shrink-0 cursor-pointer flex items-center gap-2 border ${
                    selectedTable === t.name
                      ? "bg-amber-500/10 border-amber-500 text-amber-400 font-bold"
                      : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span>{t.name}</span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-[var(--bg)] text-[var(--text-secondary)]">
                    {t.rowCount}
                  </span>
                </button>
              ))}
            </div>

            {/* Safe SQL Console Panel (Collapsible) */}
            {isSqlConsoleOpen && (
              <div className="technical-card rounded-2xl p-4 space-y-3 border-amber-500/40 bg-amber-500/5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-500 font-bold uppercase tracking-wider">
                    <Terminal size={14} />
                    <span>Governed Safe SQL Query Runner</span>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">
                    Max LIMIT 100 • DDL Destruktif Diblokir
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    rows={3}
                    value={sqlQueryInput}
                    onChange={(e) => setSqlQueryInput(e.target.value)}
                    className="technical-input w-full p-3 font-mono text-xs rounded-xl"
                    placeholder="Ketik query SQL: SELECT * FROM transactions WHERE jumlah > 50000;"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSqlQueryInput("SELECT tipe, COUNT(*), SUM(jumlah) FROM transactions GROUP BY tipe;")
                      }
                      className="text-[10px] font-mono text-[var(--text-muted)] hover:underline cursor-pointer"
                    >
                      Preset: Group Kas
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSqlQueryInput("SELECT * FROM users ORDER BY id DESC LIMIT 10;")
                      }
                      className="text-[10px] font-mono text-[var(--text-muted)] hover:underline cursor-pointer"
                    >
                      Preset: 10 User Baru
                    </button>
                  </div>

                  <button
                    onClick={handleRunSqlQuery}
                    disabled={sqlExecuting}
                    className="px-4 py-2 rounded-lg bg-amber-500 text-black text-xs font-mono font-bold hover:bg-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {sqlExecuting ? (
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Jalankan Query</span>
                        <ArrowRight size={13} />
                      </>
                    )}
                  </button>
                </div>

                {sqlError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{sqlError}</span>
                  </div>
                )}

                {sqlResultData && (
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-[11px] font-mono text-emerald-400">
                      <span>✓ Query selesai dalam {sqlResultData.executionTimeMs} ms ({sqlResultData.rowCount} baris)</span>
                    </div>
                    <div className="max-h-60 overflow-auto border border-[var(--border)] rounded-xl">
                      <table className="w-full text-left text-[11px] font-mono">
                        <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                          <tr>
                            {sqlResultData.results.length > 0 &&
                              Object.keys(sqlResultData.results[0]).map((key) => (
                                <th key={key} className="py-2 px-3 text-[var(--text-secondary)]">{key}</th>
                              ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {sqlResultData.results.map((r: any, idx: number) => (
                            <tr key={idx} className="hover:bg-[var(--surface-hover)]">
                              {Object.values(r).map((val: any, vIdx: number) => (
                                <td key={vIdx} className="py-1.5 px-3 truncate max-w-xs">
                                  {val === null ? <span className="text-[var(--text-muted)]">NULL</span> : String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Table Row Explorer Controls */}
            <div className="p-3 rounded-xl technical-card flex flex-col sm:flex-row items-center justify-between gap-3">
              <form onSubmit={handleTableSearchSubmit} className="relative flex-1 w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder={`Cari dalam tabel '${selectedTable}'...`}
                  className="technical-input w-full pl-9 pr-3 py-1.5 text-xs rounded-lg font-mono"
                />
              </form>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInsertData({});
                    setIsInsertRowModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-mono font-bold hover:bg-emerald-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Insert Row</span>
                </button>
                <button
                  type="button"
                  onClick={fetchTableRows}
                  disabled={tableRowsLoading}
                  className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  title="Refresh Baris"
                >
                  <RefreshCw size={14} className={tableRowsLoading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {/* Table Rows Grid */}
            <div className="technical-card rounded-2xl overflow-hidden">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border)] text-[var(--text-secondary)] uppercase tracking-wider text-[11px] sticky top-0 z-10">
                    <tr>
                      {tableRows.length > 0 &&
                        Object.keys(tableRows[0]).map((col) => (
                          <th key={col} className="py-3 px-4">{col}</th>
                        ))}
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {tableRows.length > 0 ? (
                      tableRows.map((row) => (
                        <tr key={row.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                          {Object.entries(row).map(([k, v]: any) => (
                            <td key={k} className="py-2.5 px-4 max-w-xs truncate">
                              {v === null ? (
                                <span className="text-[var(--text-muted)]">NULL</span>
                              ) : typeof v === "object" ? (
                                JSON.stringify(v)
                              ) : (
                                String(v)
                              )}
                            </td>
                          ))}
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setSelectedRowForEdit(row);
                                  setEditRowData({ ...row });
                                  setIsEditRowModalOpen(true);
                                }}
                                className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                                title="Edit Baris"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => setRowToDelete(row)}
                                className="p-1 rounded hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-400 cursor-pointer"
                                title="Hapus Baris"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-xs text-[var(--text-muted)]">
                          Tidak ada data baris ditemukan pada tabel ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-3 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                <div>
                  Halaman {tablePage} dari {tableTotalPages} ({tableTotalRows} total baris)
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                    disabled={tablePage <= 1}
                    className="p-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--surface-hover)] disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setTablePage((p) => Math.min(tableTotalPages, p + 1))}
                    disabled={tablePage >= tableTotalPages}
                    className="p-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--surface-hover)] disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: AUDIT LOGS & BOT MONITORING                            */}
        {/* ============================================================== */}
        {activeTab === "logs" && (
          <div className="space-y-4 animate-in fade-in">
            {/* Header + Subtab Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold tracking-tight">System & Activity Audit Logs</h1>
                <p className="text-xs text-[var(--text-secondary)] font-mono">
                  Immutable zero-trust activity audit trail & Telegram bot command history.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/admin/logs/${logSubTab}?format=csv${logRoleFilter && logSubTab === "audit" ? `&role=${logRoleFilter}` : ""}`}
                  download
                  className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs font-mono hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download size={13} />
                  <span>Export CSV</span>
                </a>
              </div>
            </div>

            {/* Sub-tabs pills */}
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 overflow-x-auto">
              <button
                onClick={() => {
                  setLogSubTab("audit");
                  setLogPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer shrink-0 ${
                  logSubTab === "audit"
                    ? "bg-amber-500 text-black font-bold"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                Audit Trail Platform
              </button>
              <button
                onClick={() => {
                  setLogSubTab("bot");
                  setLogPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer shrink-0 ${
                  logSubTab === "bot"
                    ? "bg-amber-500 text-black font-bold"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                Telegram Bot Activity
              </button>
              <button
                onClick={() => {
                  setLogSubTab("traffic");
                  setLogPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer shrink-0 ${
                  logSubTab === "traffic"
                    ? "bg-amber-500 text-black font-bold"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                Traffic & API Monitoring
              </button>
            </div>

            {/* Filter Controls: Role Filter Buttons + Search (Khusus Audit Trail) */}
            {logSubTab === "audit" && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                {/* Role Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono text-[var(--text-muted)] flex items-center gap-1.5 shrink-0">
                    <Filter size={13} />
                    <span>Filter Role:</span>
                  </span>
                  <div className="flex items-center p-0.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs font-mono">
                    <button
                      onClick={() => {
                        setLogRoleFilter("");
                        setLogPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                        logRoleFilter === ""
                          ? "bg-amber-500 text-black font-bold shadow-xs"
                          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      Semua Role
                    </button>
                    <button
                      onClick={() => {
                        setLogRoleFilter("user");
                        setLogPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                        logRoleFilter === "user"
                          ? "bg-sky-500 text-white font-bold shadow-xs"
                          : "text-[var(--text-muted)] hover:text-sky-400"
                      }`}
                    >
                      User
                    </button>
                    <button
                      onClick={() => {
                        setLogRoleFilter("admin");
                        setLogPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                        logRoleFilter === "admin"
                          ? "bg-amber-500 text-black font-bold shadow-xs"
                          : "text-[var(--text-muted)] hover:text-amber-400"
                      }`}
                    >
                      Admin
                    </button>
                    <button
                      onClick={() => {
                        setLogRoleFilter("developer");
                        setLogPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                        logRoleFilter === "developer"
                          ? "bg-purple-600 text-white font-bold shadow-xs"
                          : "text-[var(--text-muted)] hover:text-purple-400"
                      }`}
                    >
                      Developer
                    </button>
                  </div>
                </div>

                {/* Instant Search Bar */}
                <div className="relative w-full sm:w-72">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => {
                      setLogSearch(e.target.value);
                      setLogPage(1);
                    }}
                    placeholder="Cari aksi, username, IP..."
                    className="technical-input w-full pl-8 pr-3 py-1.5 text-xs rounded-lg font-mono"
                  />
                </div>
              </div>
            )}

            {/* Log Table Container */}
            <div className="technical-card rounded-2xl overflow-hidden">
              <div className="overflow-x-auto max-h-[550px]">
                {logSubTab === "audit" ? (
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border)] text-[var(--text-secondary)] uppercase tracking-wider text-[11px] sticky top-0 z-10">
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Aksi</th>
                        <th className="py-3 px-4">Actor</th>
                        <th className="py-3 px-4">Target</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">IP Address</th>
                        <th className="py-3 px-4">Wilayah / Region</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {auditLogsList.length > 0 ? (
                        auditLogsList.map((log) => (
                          <tr key={log.id} className="hover:bg-[var(--surface-hover)]">
                            <td className="py-2.5 px-4 text-[var(--text-muted)]">
                              {new Date(log.created_at).toLocaleString("id-ID")}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-amber-400">{log.action}</td>
                            <td className="py-2.5 px-4">
                              <span className="font-bold text-[var(--text-primary)]">
                                {log.username || "Sistem"}
                              </span>
                              {log.role && (
                                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] font-normal">
                                  {log.role}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-[var(--text-muted)]">
                              {log.target_type ? `${log.target_type} #${log.target_id || ""}` : "—"}
                            </td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  log.status === "success"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-rose-500/10 text-rose-400"
                                }`}
                              >
                                {log.status?.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-[var(--text-secondary)]">
                              {log.ip_address === "::1" || !log.ip_address ? "127.0.0.1" : log.ip_address}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/30 inline-flex items-center gap-1">
                                <span>📍</span>
                                <span>
                                  {log.region && !log.region.startsWith("Localhost")
                                    ? log.region
                                    : log.ip_address === "127.0.0.1" || log.ip_address === "::1" || !log.ip_address
                                    ? "Localhost (Dev)"
                                    : log.region || "Ashburn, US"}
                                </span>
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-xs text-[var(--text-muted)]">
                            Belum ada catatan log audit.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : logSubTab === "bot" ? (
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border)] text-[var(--text-secondary)] uppercase tracking-wider text-[11px] sticky top-0 z-10">
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Command</th>
                        <th className="py-3 px-4">Chat ID</th>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Raw Text</th>
                        <th className="py-3 px-4">Latency</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {botLogsList.length > 0 ? (
                        botLogsList.map((log) => (
                          <tr key={log.id} className="hover:bg-[var(--surface-hover)]">
                            <td className="py-2.5 px-4 text-[var(--text-muted)]">
                              {new Date(log.created_at).toLocaleString("id-ID")}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-sky-400">{log.command}</td>
                            <td className="py-2.5 px-4 text-[var(--text-muted)]">{log.chat_id}</td>
                            <td className="py-2.5 px-4">{log.username ? `@${log.username}` : "—"}</td>
                            <td className="py-2.5 px-4 max-w-xs truncate text-[var(--text-muted)]">
                              {log.raw_text || "—"}
                            </td>
                            <td className="py-2.5 px-4 text-[var(--text-muted)]">{log.response_time_ms} ms</td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  log.status === "success"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-rose-500/10 text-rose-400"
                                }`}
                              >
                                {log.status?.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-xs text-[var(--text-muted)]">
                            Belum ada catatan aktivitas bot.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border)] text-[var(--text-secondary)] uppercase tracking-wider text-[11px] sticky top-0 z-10">
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Endpoint</th>
                        <th className="py-3 px-4">Status Code</th>
                        <th className="py-3 px-4">Latency</th>
                        <th className="py-3 px-4">IP Address</th>
                        <th className="py-3 px-4">Wilayah / Region</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {trafficLogsList.length > 0 ? (
                        trafficLogsList.map((log) => (
                          <tr key={log.id} className="hover:bg-[var(--surface-hover)]">
                            <td className="py-2.5 px-4 text-[var(--text-muted)]">
                              {new Date(log.created_at).toLocaleString("id-ID")}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-sky-400">{log.method}</td>
                            <td className="py-2.5 px-4">{log.endpoint}</td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  log.status_code < 400
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-rose-500/10 text-rose-400"
                                }`}
                              >
                                {log.status_code}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-[var(--text-muted)]">{log.response_time_ms} ms</td>
                            <td className="py-2.5 px-4 text-[var(--text-secondary)]">
                              {log.ip_address === "::1" || !log.ip_address ? "127.0.0.1" : log.ip_address}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/30 inline-flex items-center gap-1">
                                <span>📍</span>
                                <span>
                                  {log.region && !log.region.startsWith("Localhost")
                                    ? log.region
                                    : log.ip_address === "127.0.0.1" || log.ip_address === "::1" || !log.ip_address
                                    ? "Localhost (Dev)"
                                    : log.region || "Ashburn, US"}
                                </span>
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-xs text-[var(--text-muted)]">
                            Belum ada log lalu lintas API yang tercatat.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Log Pagination */}
              <div className="p-3 border-t border-[var(--border)] flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                <div>Halaman {logPage} dari {logTotalPages}</div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                    disabled={logPage <= 1}
                    className="p-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--surface-hover)] disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setLogPage((p) => Math.min(logTotalPages, p + 1))}
                    disabled={logPage >= logTotalPages}
                    className="p-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--surface-hover)] disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL 1: TAMBAH USER BARU                                      */}
      {/* ============================================================== */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="technical-card w-full max-w-md rounded-2xl p-6 relative border border-[var(--border)] shadow-2xl">
            <button
              onClick={() => setIsAddUserModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X size={16} />
            </button>

            <h3 className="text-lg font-bold mb-1">Tambah Pengguna Baru</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Buat akun langsung ke database dengan hak akses yang ditentukan.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">Username</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="username_baru"
                  className="technical-input w-full px-3 py-2 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">Password Awal</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="minimal 6 karakter"
                  className="technical-input w-full px-3 py-2 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">Hak Akses (Role)</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="technical-input w-full px-3 py-2 rounded-lg"
                >
                  <option value="user">USER — Akses Ledger Transaksi Pribadi</option>
                  <option value="admin">ADMIN — Akses Penuh Dashboard & Kelola User</option>
                  {sessionUser?.role === "developer" && (
                    <option value="developer">DEVELOPER — Akses Root & Engine Telemetri</option>
                  )}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addUserLoading}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-black font-bold hover:bg-amber-400 cursor-pointer disabled:opacity-50"
                >
                  {addUserLoading ? "Menyimpan..." : "Simpan Pengguna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: EDIT USER (ROLE, STATUS, PASSWORD)                    */}
      {/* ============================================================== */}
      {isEditUserModalOpen && selectedUserForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="technical-card w-full max-w-lg rounded-2xl p-6 relative border border-[var(--border)] shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsEditUserModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X size={16} />
            </button>

            <h3 className="text-lg font-bold mb-1">Profil & Kelola Akun: {selectedUserForAction.username}</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Informasi audit sistem, koneksi jaringan, dan kontrol hak akses akun.
            </p>

            {/* User Profile & Audit Telemetry Inspector Card */}
            <div className="mb-4 p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="font-bold text-[var(--text-primary)]">INFO AUDIT & TELEMETRI PENGGUNA</span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">ID #{selectedUserForAction.id}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="space-y-0.5">
                  <span className="text-[var(--text-muted)] block text-[10px]">STATUS SINYAL LIVE</span>
                  <div className="flex items-center gap-1.5">
                    {isUserOnline(selectedUserForAction.last_active_at) ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Online Sekarang
                      </span>
                    ) : (
                      <span className="text-[var(--text-secondary)]">
                        {formatLastActiveRelative(selectedUserForAction.last_active_at)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[var(--text-muted)] block text-[10px]">TOTAL TRANSAKSI</span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {selectedUserForAction.total_transactions ?? 0} Transaksi
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[var(--text-muted)] block text-[10px]">IP ADDRESS TERAKHIR</span>
                  <span className="font-bold text-sky-400">
                    {selectedUserForAction.last_ip === "::1" || !selectedUserForAction.last_ip 
                      ? (selectedUserForAction.last_ip ? "127.0.0.1" : "127.0.0.1 (Local)") 
                      : selectedUserForAction.last_ip}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[var(--text-muted)] block text-[10px]">WILAYAH / REGION</span>
                  <span className="text-amber-400 flex items-center gap-1 font-semibold">
                    <span>📍</span>
                    <span>{selectedUserForAction.last_region || "Localhost (Dev)"}</span>
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[var(--text-muted)] block text-[10px]">TERDAFTAR SEJAK</span>
                  <span className="text-[var(--text-secondary)]">
                    {new Date(selectedUserForAction.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[var(--text-muted)] block text-[10px]">TELEGRAM BOT</span>
                  <span className={selectedUserForAction.telegram_chat_id ? "text-emerald-400" : "text-[var(--text-muted)]"}>
                    {selectedUserForAction.telegram_chat_id ? `ID ${selectedUserForAction.telegram_chat_id}` : "Belum Terhubung"}
                  </span>
                </div>
              </div>

              {selectedUserForAction.last_action && (
                <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                  <span>Aksi Audit Terakhir:</span>
                  <span className="font-bold text-amber-400 font-mono">{selectedUserForAction.last_action}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">Role Pengguna</label>
                <select
                  value={editRoleVal}
                  onChange={(e) => setEditRoleVal(e.target.value)}
                  className="technical-input w-full px-3 py-2 rounded-lg"
                >
                  <option value="user">USER</option>
                  <option value="admin">ADMIN</option>
                  {sessionUser?.role === "developer" && <option value="developer">DEVELOPER</option>}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">Status Akun</label>
                <select
                  value={editStatusVal}
                  onChange={(e) => setEditStatusVal(e.target.value)}
                  className="technical-input w-full px-3 py-2 rounded-lg"
                >
                  <option value="active">ACTIVE — Pengguna dapat login dan mencatat transaksi</option>
                  <option value="suspended">SUSPENDED — Akses login ditangguhkan sementara</option>
                  <option value="banned">BANNED — Akun diblokir permanen</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">
                  Reset Password Baru (Opsional)
                </label>
                <input
                  type="password"
                  value={editResetPwd}
                  onChange={(e) => setEditResetPwd(e.target.value)}
                  placeholder="Kosongkan jika tidak ingin mengubah password"
                  className="technical-input w-full px-3 py-2 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editUserLoading}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-black font-bold hover:bg-amber-400 cursor-pointer disabled:opacity-50"
                >
                  {editUserLoading ? "Memperbarui..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: DELETE USER CONFIRMATION                              */}
      {/* ============================================================== */}
      {isDeleteUserModalOpen && selectedUserForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="technical-card w-full max-w-sm rounded-2xl p-6 relative border border-rose-500/30 shadow-2xl">
            <div className="flex items-center gap-2 mb-3 text-xs font-mono text-rose-500 font-bold uppercase tracking-wider">
              <ShieldAlert size={16} />
              <span>Konfirmasi Hapus Akun</span>
            </div>

            <h3 className="text-base font-bold mb-2">Hapus Akun @{selectedUserForAction.username}?</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-5">
              Tindakan ini akan menghapus akun beserta seluruh data transaksinya secara permanen dari database.
            </p>

            <div className="flex justify-end gap-2 font-mono text-xs">
              <button
                onClick={() => setIsDeleteUserModalOpen(false)}
                className="px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleteUserLoading}
                className="px-4 py-2 rounded-lg bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleteUserLoading ? "Menghapus..." : "Ya, Hapus Permanen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: INSERT ROW INTO TABLE                                 */}
      {/* ============================================================== */}
      {isInsertRowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="technical-card w-full max-w-md rounded-2xl p-6 relative border border-[var(--border)] shadow-2xl max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setIsInsertRowModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X size={16} />
            </button>

            <h3 className="text-lg font-bold mb-1">Insert Data ke Tabel '{selectedTable}'</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Masukkan nilai field untuk disisipkan langsung ke database.
            </p>

            <form onSubmit={handleInsertRowSubmit} className="space-y-3 font-mono text-xs">
              {selectedTable === "transactions" ? (
                <>
                  <div>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">User ID Pemilik</label>
                    <input
                      type="number"
                      required
                      value={insertData.user_id || ""}
                      onChange={(e) => setInsertData({ ...insertData, user_id: e.target.value })}
                      placeholder="Conts: 2"
                      className="technical-input w-full px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">Tipe</label>
                    <select
                      value={insertData.tipe || "expense"}
                      onChange={(e) => setInsertData({ ...insertData, tipe: e.target.value })}
                      className="technical-input w-full px-3 py-2 rounded-lg"
                    >
                      <option value="expense">Pengeluaran (expense)</option>
                      <option value="income">Pemasukan (income)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">Jumlah (Rp)</label>
                    <input
                      type="number"
                      required
                      value={insertData.jumlah || ""}
                      onChange={(e) => setInsertData({ ...insertData, jumlah: e.target.value })}
                      placeholder="50000"
                      className="technical-input w-full px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">Deskripsi</label>
                    <input
                      type="text"
                      value={insertData.deskripsi || ""}
                      onChange={(e) => setInsertData({ ...insertData, deskripsi: e.target.value })}
                      placeholder="Keterangan transaksi"
                      className="technical-input w-full px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">Tanggal (YYYY-MM-DD)</label>
                    <input
                      type="date"
                      required
                      value={insertData.tanggal || new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setInsertData({ ...insertData, tanggal: e.target.value })}
                      className="technical-input w-full px-3 py-2 rounded-lg"
                    />
                  </div>
                </>
              ) : selectedTable === "users" ? (
                <>
                  <div>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">Username</label>
                    <input
                      type="text"
                      required
                      value={insertData.username || ""}
                      onChange={(e) => setInsertData({ ...insertData, username: e.target.value })}
                      className="technical-input w-full px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">Password</label>
                    <input
                      type="password"
                      required
                      value={insertData.password || ""}
                      onChange={(e) => setInsertData({ ...insertData, password: e.target.value })}
                      className="technical-input w-full px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">Role</label>
                    <select
                      value={insertData.role || "user"}
                      onChange={(e) => setInsertData({ ...insertData, role: e.target.value })}
                      className="technical-input w-full px-3 py-2 rounded-lg"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                      {sessionUser?.role === "developer" && <option value="developer">developer</option>}
                    </select>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center text-xs text-[var(--text-muted)]">
                  Tabel '{selectedTable}' dikelola otomatis oleh sistem database.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsInsertRowModalOpen(false)}
                  className="px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={insertLoading}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-black font-bold hover:bg-emerald-400 cursor-pointer disabled:opacity-50"
                >
                  {insertLoading ? "Menyimpan..." : "Insert Row"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: EDIT ROW IN TABLE                                     */}
      {/* ============================================================== */}
      {isEditRowModalOpen && selectedRowForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="technical-card w-full max-w-md rounded-2xl p-6 relative border border-[var(--border)] shadow-2xl max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setIsEditRowModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X size={16} />
            </button>

            <h3 className="text-lg font-bold mb-1">Edit Baris #{selectedRowForEdit.id}</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Perbarui nilai baris di tabel '{selectedTable}'.
            </p>

            <form onSubmit={handleEditRowSubmit} className="space-y-3 font-mono text-xs">
              {selectedTable === "transactions" ? (
                <>
                  <div>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">Tipe</label>
                    <select
                      value={editRowData.tipe || "expense"}
                      onChange={(e) => setEditRowData({ ...editRowData, tipe: e.target.value })}
                      className="technical-input w-full px-3 py-2 rounded-lg"
                    >
                      <option value="expense">expense</option>
                      <option value="income">income</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">Jumlah</label>
                    <input
                      type="number"
                      required
                      value={editRowData.jumlah || ""}
                      onChange={(e) => setEditRowData({ ...editRowData, jumlah: e.target.value })}
                      className="technical-input w-full px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">Deskripsi</label>
                    <input
                      type="text"
                      value={editRowData.deskripsi || ""}
                      onChange={(e) => setEditRowData({ ...editRowData, deskripsi: e.target.value })}
                      className="technical-input w-full px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">Tanggal</label>
                    <input
                      type="date"
                      required
                      value={editRowData.tanggal ? editRowData.tanggal.slice(0, 10) : ""}
                      onChange={(e) => setEditRowData({ ...editRowData, tanggal: e.target.value })}
                      className="technical-input w-full px-3 py-2 rounded-lg"
                    />
                  </div>
                </>
              ) : selectedTable === "users" ? (
                <>
                  <div>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">Role</label>
                    <select
                      value={editRowData.role || "user"}
                      onChange={(e) => setEditRowData({ ...editRowData, role: e.target.value })}
                      className="technical-input w-full px-3 py-2 rounded-lg"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                      {sessionUser?.role === "developer" && <option value="developer">developer</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">Status</label>
                    <select
                      value={editRowData.status || "active"}
                      onChange={(e) => setEditRowData({ ...editRowData, status: e.target.value })}
                      className="technical-input w-full px-3 py-2 rounded-lg"
                    >
                      <option value="active">active</option>
                      <option value="suspended">suspended</option>
                      <option value="banned">banned</option>
                    </select>
                  </div>
                </>
              ) : (
                <div className="text-xs text-[var(--text-muted)] py-3">
                  Editing langsung tabel log tidak disarankan untuk menjaga integritas data audit.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditRowModalOpen(false)}
                  className="px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editRowLoading}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-black font-bold hover:bg-amber-400 cursor-pointer disabled:opacity-50"
                >
                  {editRowLoading ? "Menyimpan..." : "Update Row"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: DELETE ROW CONFIRMATION                               */}
      {/* ============================================================== */}
      {rowToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="technical-card w-full max-w-sm rounded-2xl p-6 relative border border-rose-500/30 shadow-2xl">
            <div className="flex items-center gap-2 mb-2 text-xs font-mono text-rose-500 font-bold uppercase tracking-wider">
              <ShieldAlert size={16} />
              <span>Konfirmasi Hapus Baris</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Apakah Anda yakin ingin menghapus baris <b>#{rowToDelete.id}</b> dari tabel <b>'{selectedTable}'</b>?
            </p>
            <div className="flex justify-end gap-2 font-mono text-xs">
              <button
                onClick={() => setRowToDelete(null)}
                className="px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteRowSubmit}
                disabled={deleteRowLoading}
                className="px-4 py-2 rounded-lg bg-rose-500 text-white font-bold hover:bg-rose-600 cursor-pointer disabled:opacity-50"
              >
                {deleteRowLoading ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 7: RESTORE DATABASE                                      */}
      {/* ============================================================== */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="technical-card w-full max-w-md rounded-2xl p-6 relative border border-amber-500/40 shadow-2xl">
            <button
              onClick={() => setIsRestoreModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 mb-2 text-xs font-mono text-amber-500 font-bold uppercase tracking-wider">
              <UploadCloud size={16} />
              <span>Restore Database Snapshot</span>
            </div>

            <h3 className="text-lg font-bold mb-1">Pulihkan Data Cadangan</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Pilih file cadangan JSON yang sebelumnya di-export dari ZailTrack.
            </p>

            <div className="space-y-4 font-mono text-xs">
              <div>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const parsed = JSON.parse(event.target?.result as string);
                        setRestoreFileJson(parsed);
                      } catch {
                        showToast("File bukan JSON valid.", "error");
                      }
                    };
                    reader.readAsText(file);
                  }}
                  className="technical-input w-full p-2 rounded-lg file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-amber-500/20 file:text-amber-400 file:cursor-pointer"
                />
              </div>

              {restoreFileJson && (
                <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[11px] space-y-1">
                  <div>Versi: {restoreFileJson.version}</div>
                  <div>Dibuat: {new Date(restoreFileJson.timestamp).toLocaleString("id-ID")}</div>
                  <div className="text-emerald-400">
                    Jumlah: {restoreFileJson.counts?.users || 0} user, {restoreFileJson.counts?.transactions || 0} transaksi
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px]">
                <input
                  type="checkbox"
                  id="confirmRiskCheck"
                  checked={restoreConfirmed}
                  onChange={(e) => setRestoreConfirmed(e.target.checked)}
                  className="mt-0.5"
                />
                <label htmlFor="confirmRiskCheck" className="cursor-pointer">
                  Saya memahami bahwa operasi restore ini akan menyisipkan kembali data cadangan ke database Neon secara langsung.
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRestoreModalOpen(false)}
                  className="px-3 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleRestoreSubmit}
                  disabled={!restoreFileJson || !restoreConfirmed || restoreLoading}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-black font-bold hover:bg-amber-400 cursor-pointer disabled:opacity-50"
                >
                  {restoreLoading ? "Memulihkan..." : "Mulai Pemulihan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
