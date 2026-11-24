"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  User,
  ArrowRight,
  Shield,
  Zap,
  Send,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  X,
  Copy,
  Check,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal Lupa Password
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [resetTokenData, setResetTokenData] = useState<{ token: string; link: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Cek apakah sudah login
  useEffect(() => {
    async function checkCurrentSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            router.replace("/dashboard");
            return;
          }
        }
      } catch {
        // Belum login
      } finally {
        setCheckingAuth(false);
      }
    }
    checkCurrentSession();
  }, [router]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setResetTokenData(null);

    if (!forgotUsername.trim()) {
      setForgotError("Masukkan username Anda terlebih dahulu.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: forgotUsername.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal memproses pemulihan kata sandi.");
      }
      setForgotSuccess(data.message || "Token reset berhasil dibuat.");
      if (data.token) {
        setResetTokenData({ token: data.token, link: data.resetLink });
      }
    } catch (err: any) {
      setForgotError(err.message || "Terjadi kendala saat menghubungi server.");
    } finally {
      setForgotLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!username.trim() || !password.trim()) {
      setErrorMsg("Mohon isi username dan kata sandi.");
      return;
    }

    if (mode === "register" && password.length < 6) {
      setErrorMsg("Kata sandi minimal 6 karakter.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Gagal masuk. Periksa kembali username dan kata sandi.");
      }

      setSuccessMsg(
        mode === "login"
          ? "Berhasil masuk! Membuka buku kas..."
          : "Pendaftaran berhasil! Mengalihkan ke dashboard..."
      );

      setTimeout(() => {
        router.replace("/dashboard");
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan sambungan.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-xs text-[var(--text-muted)] tracking-wider">
            ZAILTRACK // MEMERIKSA_SESI...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto">
      {/* Top Bar Navigation */}
      <header className="w-full flex items-center justify-between pb-6 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-sm font-mono font-bold text-[var(--accent)] shadow-xs">
            ZT
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-[var(--text-primary)]">ZailTrack</h1>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]">
                v2.0
              </span>
            </div>
            <p className="font-mono text-[11px] text-[var(--text-muted)] tracking-tight">
              Buku Kas & Analisis Keuangan Pribadi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs font-mono text-[var(--text-secondary)]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sistem Online</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Hero & Authentication Grid */}
      <main className="my-8 sm:my-14 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Hero Showcase */}
        <section className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs font-mono text-[var(--text-secondary)] shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Pencatatan Cepat & Tanpa Iklan</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.12]">
            Catat setiap rupiah masuk dan keluar.{" "}
            <span className="text-[var(--text-muted)] font-normal">Cepat, privat, tanpa distraksi.</span>
          </h2>

          <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl">
            Buku kas digital mandiri yang dirancang untuk kepraktisan harian. Terhubung langsung ke Telegram bot, menyimpan riwayat aman tanpa pelacak pihak ketiga, dan siap diekspor kapan saja.
          </p>

          {/* Miniature Live Ledger Preview Card (Scroll-Craft Visual Depth) */}
          <div className="technical-card p-4 sm:p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3 shadow-sm max-w-xl">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">
                  Ringkasan Kas Bulan Ini
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                +Rp8.090.000
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg)] border border-[var(--border-subtle)]">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Gaji & Pendapatan Proyek</p>
                    <p className="text-[10px] font-mono text-[var(--text-muted)]">Pemasukan • Transfer Bank</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-emerald-400">+Rp8.500.000</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg)] border border-[var(--border-subtle)]">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-rose-500/10 text-rose-400 flex items-center justify-center">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Token Listrik & Internet Rumah</p>
                    <p className="text-[10px] font-mono text-[var(--text-muted)]">Tagihan • via Telegram Bot</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-rose-400">-Rp375.000</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg)] border border-[var(--border-subtle)]">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-rose-500/10 text-rose-400 flex items-center justify-center">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Makan Siang & Kopi</p>
                    <p className="text-[10px] font-mono text-[var(--text-muted)]">Harian • Tunai/QRIS</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-rose-400">-Rp35.000</span>
              </div>
            </div>
          </div>

          {/* 3 Core Value Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 max-w-xl">
            <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-1.5">
              <Send className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">Telegram Bot</h3>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Ketik transaksi lewat chat, saldo otomatis sinkron ke web.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">Privasi Terjaga</h3>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Sesi aman HttpOnly Cookie, bebas pelacak dan iklan.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] space-y-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">Ekspor Bersih</h3>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Unduh data format CSV kapan saja tanpa batasan kuota.
              </p>
            </div>
          </div>
        </section>

        {/* Right Column: Authentication Card */}
        <section className="lg:col-span-5">
          <div className="technical-card p-6 sm:p-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg relative">
            {/* Tab switch */}
            <div className="flex border-b border-[var(--border)] pb-3 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 text-center pb-2.5 text-sm transition-all cursor-pointer min-h-[44px] flex items-center justify-center ${
                  mode === "login"
                    ? "text-[var(--text-primary)] border-b-2 border-[var(--accent)] font-bold"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] font-medium"
                }`}
              >
                Masuk ke Akun
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 text-center pb-2.5 text-sm transition-all cursor-pointer min-h-[44px] flex items-center justify-center ${
                  mode === "register"
                    ? "text-[var(--text-primary)] border-b-2 border-[var(--accent)] font-bold"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] font-medium"
                }`}
              >
                Daftar Akun Baru
              </button>
            </div>

            {/* Error / Success Banners */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-400 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 text-xs flex items-start gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <span className="leading-relaxed">{successMsg}</span>
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="nama_pengguna"
                    required
                    autoComplete="username"
                    className="technical-input w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-mono text-[var(--text-secondary)] uppercase tracking-wider">
                    Kata Sandi
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => {
                        setForgotUsername(username);
                        setForgotError(null);
                        setForgotSuccess(null);
                        setResetTokenData(null);
                        setIsForgotModalOpen(true);
                      }}
                      className="text-[11px] font-mono text-[var(--accent)] hover:underline cursor-pointer py-1"
                    >
                      Lupa sandi?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="technical-input w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg min-h-[44px]"
                  />
                </div>
                {mode === "register" && (
                  <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1.5">
                    Minimal 6 karakter kombinasi huruf atau angka.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3 px-4 rounded-lg bg-[var(--text-primary)] text-[var(--bg)] font-semibold text-sm hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px] shadow-xs active:scale-[0.985]"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-[var(--bg)] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{mode === "login" ? "Buka Buku Kas" : "Daftar Akun Baru"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-[var(--border)] text-center">
              <span className="text-xs font-mono text-[var(--text-muted)]">
                {mode === "login"
                  ? "Belum punya akun? Pilih tab Daftar Akun Baru di atas."
                  : "Sudah punya akun? Pilih tab Masuk ke Akun di atas."}
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Modal Lupa Password */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="technical-card w-full max-w-md rounded-2xl p-6 sm:p-7 relative border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <button
              onClick={() => setIsForgotModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Tutup modal"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-3 text-xs font-mono text-[var(--accent)] uppercase tracking-wider">
              <KeyRound size={16} />
              <span>Pemulihan Kata Sandi</span>
            </div>

            <h3 className="text-lg font-bold mb-1 text-[var(--text-primary)]">Buat Token Pemulihan</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-5 leading-relaxed">
              Ketik username Anda untuk menghasilkan token pemulihan satu kali pakai (berlaku 1 jam).
            </p>

            {forgotError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {!resetTokenData ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                    Username
                  </label>
                  <input
                    type="text"
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    placeholder="nama_pengguna"
                    required
                    className="technical-input w-full px-3.5 py-2.5 text-xs rounded-lg min-h-[44px]"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-mono rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer min-h-[40px]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-4 py-2.5 text-xs font-mono font-bold rounded-lg bg-[var(--text-primary)] text-[var(--bg)] hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[40px]"
                  >
                    {forgotLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Buat Token</span>
                        <ArrowRight size={13} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                      Token Pemulihan (1 Jam)
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(resetTokenData.token)}
                      className="text-[11px] font-mono text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer py-1"
                    >
                      {copiedToken ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedToken ? "Tersalin" : "Salin Token"}</span>
                    </button>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs font-mono break-all text-amber-400 select-all">
                    {resetTokenData.token}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-mono rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer min-h-[40px]"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotModalOpen(false);
                      router.push(resetTokenData.link);
                    }}
                    className="px-4 py-2.5 text-xs font-mono font-bold rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 transition-colors flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                  >
                    <span>Lanjutkan Reset Sandi →</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--text-muted)] gap-3 font-mono">
        <p>© {new Date().getFullYear()} ZailTrack. Buku kas finansial mandiri.</p>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/FuzailFr/ZailTrack"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--text-primary)] transition-colors underline underline-offset-4 py-1"
          >
            GitHub Repository
          </a>
        </div>
      </footer>
    </div>
  );
}
