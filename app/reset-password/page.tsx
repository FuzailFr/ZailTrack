"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Lock, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!token.trim()) {
      setErrorMsg("Token reset password tidak ditemukan.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("Password baru minimal 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Gagal mereset password.");
      }

      setSuccessMsg(data.message || "Password berhasil diubah!");
      setTimeout(() => {
        router.replace("/");
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="technical-card rounded-2xl p-6 sm:p-8 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-6 text-xs font-mono text-[var(--accent)] uppercase tracking-wider">
          <KeyRound size={16} />
          <span>Security // Reset Password</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
          Atur Ulang Kata Sandi
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mb-6">
          Masukkan token pemulihan dan buat kata sandi baru untuk mengamankan akun Anda.
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
              Token Reset
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Masukkan 64-karakter token..."
              required
              className="technical-input w-full px-3.5 py-2.5 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
              Kata Sandi Baru
            </label>
            <div className="relative">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter..."
                required
                className="technical-input w-full px-3.5 py-2.5 rounded-lg text-xs"
              />
              <Lock size={14} className="absolute right-3 top-3 text-[var(--text-muted)] pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
              Konfirmasi Kata Sandi Baru
            </label>
            <div className="relative">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru..."
                required
                className="technical-input w-full px-3.5 py-2.5 rounded-lg text-xs"
              />
              <Lock size={14} className="absolute right-3 top-3 text-[var(--text-muted)] pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-lg bg-[var(--text-primary)] text-[var(--bg)] font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Simpan Password Baru</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[var(--border)] text-center">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            ← Kembali ke Halaman Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-8 bg-[var(--bg)]">
      <div className="flex justify-between items-center max-w-5xl mx-auto w-full mb-6">
        <div className="flex items-center gap-2 font-mono text-xs tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold">ZAILTRACK</span>
          <span className="text-[var(--text-muted)]">// RECOVERY</span>
        </div>
        <ThemeToggle />
      </div>

      <Suspense fallback={
        <div className="text-center font-mono text-xs text-[var(--text-muted)]">
          Memuat modul pemulihan...
        </div>
      }>
        <ResetPasswordContent />
      </Suspense>

      <footer className="max-w-5xl mx-auto w-full mt-8 pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[var(--text-muted)] font-mono">
        <div>ZailTrack v2.2 — Secure Archival Cockpit</div>
        <div className="flex items-center gap-1">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>Zero-Trust Token Protected</span>
        </div>
      </footer>
    </div>
  );
}
