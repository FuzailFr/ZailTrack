# ZailTrack - Financial Ledger & System Cockpit (v2.0)

Technical personal finance ledger with real-time Google Sheets synchronization, Telegram Quick-Entry Bot, and developer administration cockpit. Built with Next.js 16 (Turbopack, App Router, React 19), Tailwind CSS v4, and Neon Serverless PostgreSQL.

[![Production](https://img.shields.io/badge/Production-Live-emerald?style=flat-square)](https://zail-track.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.5-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev)
[![Database](https://img.shields.io/badge/PostgreSQL-Neon_Serverless-00e699?style=flat-square&logo=postgresql)](https://neon.tech)
[![License](https://img.shields.io/badge/License-MIT-amber?style=flat-square)](LICENSE)

---

## Live Production & Services

- Web Dashboard: [https://zail-track.vercel.app](https://zail-track.vercel.app)
- Telegram Bot: [@zailtrack_personal_bot](https://t.me/zailtrack_personal_bot)

---

## Core Features

### 1. Telegram Quick-Entry Bot
- Record transactions directly via chat without opening a web browser.
- Smart natural language transaction parser:
  - `keluar 50000 kopi kenangan`
  - `beli bensin 35k`
  - `masuk 1.5jt freelance web`
  - `+100000 dari bapak`
  - `-25rb jajan`
- Built-in Bot Commands:
  - `/help`: Usage guide, examples, and command list.
  - `/saldo`: Current month income, expense, and net balance summary.
  - `/terakhir`: View last 5 recorded transactions.
  - `/status`: Realtime check of web server health and database query latency.
  - `/acc`: Account information, role, and encryption status.

### 2. Real-Time Google Sheets Synchronization
- Live data feed using formula:
  ```excel
  =IMPORTDATA("https://zail-track.vercel.app/api/sheets/feed?token=YOUR_FEED_TOKEN")
  ```
- 11 structured columns: No, Tanggal (DD/MM/YYYY), Hari, Bulan, Tahun, Kategori, Pemasukan (Rp), Pengeluaran (Rp), Nominal Bersih (Rp), Saldo Berjalan (Rp), Keterangan.
- Sanitized against spreadsheet formula injection (`=`, `+`, `-`, `@`).

### 3. Developer & System Cockpit (Mode Dev & RBAC)
- Role-based access control (`admin` vs `user`).
- Real-time engine telemetry: PostgreSQL version, database latency in ms, global audit logs.
- User management:
  - Promote to Admin or demote to User (`PATCH /api/dev/users/:id`).
  - Cascade user account deletion (`DELETE /api/dev/users/:id`).
  - Built-in anti-lockout protection: Admins cannot delete or demote their own account.

### 4. Interactive Ledger & Daily Cashflow Analytics
- Real-time instant search bar across descriptions, amounts, and categories.
- In-place transaction editing (`PUT /api/transactions/:id`) with anti-IDOR authorization.
- Cashflow ratio & volume analytics bar comparing income vs expense in real time.
- Dedicated user security modal for self-service password changes (`POST /api/auth/change-password`).

### 5. Progressive Web App (PWA) & Telemetry
- Installable as a native app on iOS & Android devices (`manifest.json` with standalone display).
- Integrated `@vercel/analytics` and `@vercel/speed-insights` for privacy-first visitor and Core Web Vitals telemetry.

### 6. Zero-Trust Security Architecture
- Zero hardcoded secrets: all credentials read from environment variables.
- Authentication via secure, HTTP-Only, SameSite cookies signed with HS256 JWT.
- Immunity to IDOR: All transaction queries strictly scope to `WHERE user_id = session.userId`.
- Immunity to SQL Injection: Tagged template parameterized queries via `@neondatabase/serverless`.

---

## Technology Stack

| Component | Technology |
| :--- | :--- |
| Framework | Next.js 16.4.5 (App Router, Turbopack, Serverless API Routes) |
| Frontend | React 19, Tailwind CSS v4, Lucide Icons |
| Typography | Space Mono (Monospace), Bricolage Grotesque (Sans) |
| Database | Neon Serverless PostgreSQL (`@neondatabase/serverless`) |
| Auth & Crypto | HTTP-Only Cookies, Jose JWT, Bcrypt Salt 10 |
| External APIs | Telegram Bot Webhook API, Google Sheets CSV Feed |
| Deployment | Vercel Edge Network |

---

## Database Schema

Database tables and indexes are initialized automatically on first run (`initDbSchema()`):

```sql
-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  telegram_chat_id BIGINT UNIQUE,
  telegram_link_code VARCHAR(64) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipe VARCHAR(10) NOT NULL CHECK (tipe IN ('income', 'expense')),
  jumlah NUMERIC(15, 2) NOT NULL,
  deskripsi TEXT,
  tanggal DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Query Performance Index
CREATE INDEX IF NOT EXISTS idx_transactions_user_date 
ON transactions (user_id, tanggal DESC);
```

---

## Local Development Setup

### 1. Clone & Install
```bash
git clone https://github.com/FuzailFr/ZailTrack.git
cd ZailTrack
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
# Neon PostgreSQL Connection URL
DATABASE_URL="postgresql://username:password@ep-sample.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Random Secret String for JWT (Min 32 characters)
JWT_SECRET="your_secure_random_jwt_secret_key_min_32_characters"

# Telegram Bot Token (from @BotFather)
TELEGRAM_BOT_TOKEN="your_telegram_bot_token_here"
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## License
Distributed under the MIT License. Copyright (c) 2026.
