"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, ArrowRight, ShieldCheck, Zap, Database, CheckCircle2, AlertCircle } from "lucide-react";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!username.trim() || !password.trim()) {
      setErrorMsg("Harap isi username dan password.");
      return;
    }

    if (mode === "register" && password.length < 6) {
      setErrorMsg("Password minimal 6 karakter.");
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
        throw new Error(data.message || "Terjadi kesalahan saat otentikasi.");
      }

      setSuccessMsg(
        mode === "login"
          ? "Login berhasil! Mengalihkan ke dashboard..."
          : "Pendaftaran berhasil! Mengalihkan ke dashboard..."
      );

      setTimeout(() => {
        router.replace("/dashboard");
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-xs text-[var(--text-secondary)] tracking-wider">
            ZAILTRACK // CHECKING_SESSION...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-8">
      {/* Top Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between pb-6 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-sm font-mono font-bold text-[var(--accent)]">
            ZT
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">ZailTrack</h1>
            <p className="font-mono text-[10px] text-[var(--text-muted)] tracking-wider uppercase">
              Financial Ledger & Analysis
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl w-full mx-auto my-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Column: Technical Overview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[11px] font-mono text-[var(--text-secondary)]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ARCHIVAL LEDGER V2.0 // NEXT.JS & POSTGRES</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            Kelola arus kas pribadi dengan akurasi presisi tinggi.
          </h2>

          <p className="text-base text-[var(--text-secondary)] leading-relaxed max-w-xl">
            Sistem pencatatan keuangan modern tanpa bloatware. Dilengkapi otentikasi aman berlapis, perlindungan injeksi SQL, dan sinkronisasi real-time.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="technical-card p-4 rounded-lg space-y-2">
              <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold">Zero-Leak Auth</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Token JWT disimpan dalam HTTP-Only Cookie, aman dari ancaman XSS & IDOR.
              </p>
            </div>

            <div className="technical-card p-4 rounded-lg space-y-2">
              <Database className="w-5 h-5 text-[var(--income)]" />
              <h3 className="text-sm font-semibold">Serverless DB</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Didukung Neon Serverless PostgreSQL dengan indexing berkecepatan tinggi.
              </p>
            </div>

            <div className="technical-card p-4 rounded-lg space-y-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-semibold">Instant Export</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Ekspor pembukuan instan ke format CSV/Excel untuk audit bulanan.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Authentication Card */}
        <div className="lg:col-span-5">
          <div className="technical-card p-6 sm:p-8 rounded-xl shadow-lg relative overflow-hidden">
            {/* Tab switch */}
            <div className="flex border-b border-[var(--border)] pb-4 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 text-center pb-2 text-sm font-medium transition-colors cursor-pointer ${
                  mode === "login"
                    ? "text-[var(--text-primary)] border-b-2 border-[var(--accent)] font-semibold"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
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
                className={`flex-1 text-center pb-2 text-sm font-medium transition-colors cursor-pointer ${
                  mode === "register"
                    ? "text-[var(--text-primary)] border-b-2 border-[var(--accent)] font-semibold"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                Registrasi Baru
              </button>
            </div>

            {/* Error / Success Banners */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded border border-rose-500/20 bg-rose-500/10 text-rose-500 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="nama_pengguna"
                    required
                    className="technical-input w-full pl-9 pr-3 py-2 text-sm rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="technical-input w-full pl-9 pr-3 py-2 text-sm rounded-md"
                  />
                </div>
                {mode === "register" && (
                  <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1">
                    Minimal 6 karakter kombinasi huruf / angka.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 rounded-md bg-[var(--text-primary)] text-[var(--bg)] font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-[var(--bg)] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{mode === "login" ? "Masuk ke Ledger" : "Buat Akun Sekarang"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-[var(--border)] text-center">
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                {mode === "login"
                  ? "Belum punya akun? Klik tab Registrasi Baru di atas."
                  : "Sudah punya akun? Klik tab Masuk ke Akun di atas."}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--text-muted)] gap-3 font-mono">
        <p>© {new Date().getFullYear()} ZailTrack. Engineered by Fuzail Fazle Rabbi.</p>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/FuzailFr/ZailTrack"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--text-primary)] transition-colors underline underline-offset-4"
          >
            GitHub Repository
          </a>
        </div>
      </footer>
    </div>
  );
}
