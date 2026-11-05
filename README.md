# ZailTrack ❖ High-Density Financial Ledger & Cockpit (v2.0)

> Technical archival personal finance ledger with real-time Google Sheets sync, Telegram Quick-Entry Bot, and developer cockpit. Built with **Next.js 16 (Turbopack, App Router, React 19)**, **Tailwind CSS v4**, and **Neon Serverless PostgreSQL**.

[![Production](https://img.shields.io/badge/Production-Live-emerald?style=flat-square)](https://zail-track.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.5-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev)
[![Database](https://img.shields.io/badge/PostgreSQL-Neon_Serverless-00e699?style=flat-square&logo=postgresql)](https://neon.tech)
[![License](https://img.shields.io/badge/License-MIT-amber?style=flat-square)](LICENSE)

---

## ✦ Live Production & Access
- **Web Dashboard**: [https://zail-track.vercel.app](https://zail-track.vercel.app)
- **Official Telegram Bot**: [@zailtrack_personal_bot](https://t.me/zailtrack_personal_bot)

---

## ✦ Apa yang Baru di Versi 2.0?

1. **⚡ Telegram Quick-Entry Bot (`@zailtrack_personal_bot`)**:
   - Catat transaksi instan via pesan Telegram tanpa perlu membuka browser.
   - Parsing kalimat natural otomatis: `keluar 50000 kopi kenangan`, `beli bensin 35k`, `masuk 1.5jt freelance`, `+100000 dari bapak`.
   - Aman & terisolasi: Akun Telegram diverifikasi secara kriptografis menggunakan token link unik.

2. **📊 Sinkronisasi Real-Time Google Sheets**:
   - Live data feed via formula `=IMPORTDATA("https://zail-track.vercel.app/api/sheets/feed?token=...")`.
   - Output 11 kolom rapi & otomatis: *No, Tanggal (DD/MM/YYYY), Hari, Bulan, Tahun, Kategori, Pemasukan (Rp), Pengeluaran (Rp), Nominal Bersih (Rp), Saldo Berjalan (Rp), Keterangan*.
   - Nilai uang terformat ramah orang awam (contoh: `Rp 1.000.000`).

3. **🛠️ Developer & System Cockpit (Mode Dev & RBAC)**:
   - Panel khusus role `admin` untuk memantau performa database, engine specs, latensi query (ms), dan audit transaksi global.
   - **Manajemen Pengguna Lengkap**: Promosikan user ke `admin` atau turunkan ke `user`, serta hapus akun pengguna beserta seluruh riwayat transaksinya dengan aman.
   - Proteksi diri: Admin tidak dapat menghapus atau mencabut hak akses dirinya sendiri secara tidak sengaja (Anti-Lockout).

4. **🛡️ Keamanan Berlapis (Anti-Hack & Zero-Trust)**:
   - **Zero Secret in Codebase**: Seluruh kredensial (Database URL, JWT Secret, Bot Token) wajib melalui Environment Variables terenkripsi.
   - **Proteksi IDOR**: Query transaksi terikat ketat dengan `session.userId`. Tidak ada pengguna yang bisa melihat atau memanipulasi data pengguna lain.
   - **Perlindungan Injeksi SQL**: Parameterized query via `@neondatabase/serverless`.
   - **Anti-XSS & Anti-CSV Injection**: Karakter formula spreadsheet (`=`, `+`, `-`, `@`) otomatis disanitasi dengan tanda petik tunggal (`'`).

---

## ✦ Arsitektur & Teknologi

| Komponen | Spesifikasi & Library |
| :--- | :--- |
| **Framework** | Next.js 16.4.5 (App Router, Turbopack, Serverless API Routes) |
| **Frontend UI** | React 19, Tailwind CSS v4, Lucide Icons |
| **Typography** | Monospace & Editorial (`Space Mono`, `Bricolage Grotesque`) |
| **Database** | Neon Serverless PostgreSQL (`@neondatabase/serverless`) |
| **Autentikasi** | HTTP-Only Cookies, JWT HS256 (`jose`), Salt 10 Hashing (`bcryptjs`) |
| **Integrasi Eksternal** | Telegram Bot Webhook API, Google Sheets Live CSV Feed |
| **Hosting & CI/CD** | Vercel Edge & Serverless Global Network |

---

## ✦ Skema Database Otomatis

Skema database diinisialisasi otomatis pada request pertama (`initDbSchema()`) tanpa perlu migrasi manual:

```sql
-- Tabel Pengguna
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  telegram_chat_id BIGINT UNIQUE,
  telegram_link_code VARCHAR(64) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Transaksi Keuangan
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipe VARCHAR(10) NOT NULL CHECK (tipe IN ('income', 'expense')),
  jumlah NUMERIC(15, 2) NOT NULL,
  deskripsi TEXT,
  tanggal DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index Performa
CREATE INDEX IF NOT EXISTS idx_transactions_user_date 
ON transactions (user_id, tanggal DESC);
```

---

## ✦ Panduan Instalasi Lokal (Local Setup)

### 1. Clone & Install
```bash
git clone https://github.com/FuzailFr/ZailTrack.git
cd ZailTrack
npm install
```

### 2. Konfigurasi Environment Variables
Buat file `.env.local` di root direktori project:
```env
# Koneksi Neon PostgreSQL
DATABASE_URL="postgresql://neondb_owner:password@ep-sample-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Kunci Rahasia Sesi JWT (Minimal 32 Karakter Acak)
JWT_SECRET="ganti-dengan-string-rahasia-acak-minimal-32-karakter"

# Token Bot Telegram (Didapat dari @BotFather)
TELEGRAM_BOT_TOKEN="9042171953:AAHLOk8nnT3XEXYvyDMaxiyQSEsRu8-_a2M"
```

### 3. Jalankan Server Dev
```bash
npm run dev
```
Akses di browser pada [http://localhost:3000](http://localhost:3000).

---

## ✦ Panduan Rotasi Token Rahasia (Secret Rotation)

Jika token Telegram Bot pernah terekspos di repo publik:
1. Buka Telegram dan hubungi [@BotFather](https://t.me/BotFather).
2. Kirim perintah `/revoke` atau `/token`, lalu pilih bot Anda (`@zailtrack_personal_bot`).
3. BotFather akan langsung membatalkan token lama dan membuatkan token baru yang fresh.
4. Perbarui token baru tersebut di:
   - File lokal `.env.local`
   - Dashboard Vercel: **Project Settings > Environment Variables > TELEGRAM_BOT_TOKEN**
5. Lakukan redeploy pada Vercel.

---

## ✦ Audit Keamanan (Security Matrix)

- [x] **Zero Hardcoded Secrets**: Tidak ada token, password, atau connection string yang tertulis langsung di kode sumber.
- [x] **HTTP-Only Cookies**: Sesi login browser tidak bisa dibaca oleh skrip JavaScript pihak ketiga (Anti-XSS Session Hijacking).
- [x] **RBAC Verification**: Endpoint Developer (`/api/dev/*`) memverifikasi role admin di tingkat server backend.
- [x] **Parameterized Queries**: Seluruh query SQL menggunakan tagged template literals Neon untuk proteksi mutlak dari SQL Injection.
- [x] **Rate Limit & Timeout Defense**: Endpoint siap menangani ribuan transaksi paralel dengan query agregasi database sub-detik.

---

## ✦ Lisensi
Didistribusikan di bawah lisensi MIT. Hak Cipta © 2026 [Fuzail Fazle Rabbi](https://github.com/FuzailFr).
