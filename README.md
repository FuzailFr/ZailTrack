# ZailTrack - Financial Ledger & System Cockpit (v2.2)

Technical personal finance ledger with real-time Google Sheets synchronization, Telegram Quick-Entry Bot, and developer administration cockpit with direct database access. Built with Next.js 16 (Turbopack, App Router, React 19), Tailwind CSS v4, and Neon Serverless PostgreSQL.

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

### 1. Admin Cockpit & Database Studio (`/admin`)
- **Executive Overview & Visual Analytics**:
  - Live metric cards: **User Online (Live)** with real-time heartbeat beacon (< 15 mins), Total Users, Role Breakdown (`user`, `admin`, `developer`), User Status (`active`, `suspended`, `banned`), New Registrations (7 days), and Active Users (30 days).
  - Cashflow Volume: Total In, Total Out, Net Balance, Total Transactions.
  - Interactive SVG Charts: 14-day cashflow comparison and daily user growth.
  - Engine Telemetry: Real-time PostgreSQL query latency (ms), 24h HTTP traffic requests, error rate, and uptime percentage.
  - Telegram Bot Usage: Command popularity rankings and Natural Language Processing (NLP) smart parser telemetry.
- **User Management (RBAC)**:
  - Instant search and multi-criteria filters (by Role, Status, and **Online Sekarang**).
  - Live online indicator badge per user row with relative last-active telemetry.
  - Direct account creation modal from dashboard.
  - Promote/Demote roles, suspend, ban, reactivate, and reset passwords with Bcrypt hashing.
  - Anti-Self-Lockout protection: Admins cannot demote, suspend, or delete their own account.
  - Cascading user account deletion with transaction cleanup.
- **Database Studio & Governed Safe SQL Runner**:
  - Interactive Table Inspector for `users`, `transactions`, `audit_logs`, `bot_logs`, and `traffic_logs`.
  - Direct Table CRUD: Insert row, Edit row, Delete row with confirmation dialogs.
  - Governed Safe SQL Console: Pre-set query templates, automatic `LIMIT 100` enforcement, query execution timer (ms), and automatic blocking of destructive DDL keywords (`DROP`, `ALTER`, `TRUNCATE`).
  - Database Backup & Restore: Downloadable full JSON database snapshot and 2-step risk-validated restore wizard.
- **Activity & Security Audit Logs**:
  - Immutable audit trail recording logins, logouts, password resets, CRUD operations, and role modifications.
  - Real-time client IP resolution and automatic geolocation region tagging (`📍 Localhost (ID)` / `📍 City, Country`).
  - Telegram Bot activity logs and HTTP traffic logs.
  - One-click **Export to CSV** for all audit trails.

### 2. Telegram Quick-Entry Bot (v2.2 Upgrade)
- **Inline Keyboards & Interactive Navigation**:
  - Full inline keyboard menus optimized for Android, iOS, Desktop, and Telegram Web.
  - Quick action buttons: `[💰 Cek Saldo]`, `[📋 Riwayat]`, `[👤 Akun Saya]`, `[⚡ Status Server]`, `[📖 Panduan]`, `[🌐 Buka Dashboard]`.
- **Transaction Pagination**:
  - `/terakhir` displays 5 transactions per page with interactive inline navigation (`[◀️ Sebelumnya]` and `[Berikutnya ▶️]`).
- **Role-Aware Commands**:
  - `/admin` & `/admin_stats`: Platform cashflow volume and user stats (strictly guarded for Admin & Developer).
  - `/admin_users`: Latest registered users list.
  - `/dev_info`: PostgreSQL engine version, latency, public tables count (Developer guarded).
- **Smart Natural Language Parser**:
  - `keluar 50000 kopi kenangan`
  - `beli bensin 35k`
  - `masuk 1.5jt freelance web`
  - `+100000 dari bapak`
  - `-25rb jajan`
- **Command Telemetry**: All bot actions are logged to `bot_logs` with execution time.

### 3. Authentication & Recovery Security
- **Role-Based Access Control (RBAC)**: Distinct permissions for `user`, `admin`, and `developer`.
- **One-Time Token Password Reset**:
  - Self-service cryptographic reset token (64 hex characters) valid for 1 hour (`/api/auth/forgot-password`).
  - Dedicated isolated recovery interface at `/reset-password?token=...`.
- **Brute-Force Protection & Rate Limiting**:
  - Sliding-window rate limiter on login, registration, and password recovery endpoints.
- **Account Status Guard**: Suspended and banned accounts are rejected instantly during login.
- **Zero Secrets Leaked**: Passwords and JWT tokens are sanitized (`[REDACTED]`) before entering logs.

### 4. Real-Time Google Sheets Synchronization
- Live data feed using formula:
  ```excel
  =IMPORTDATA("https://zail-track.vercel.app/api/sheets/feed?token=YOUR_FEED_TOKEN")
  ```
- 11 structured columns: No, Tanggal (DD/MM/YYYY), Hari, Bulan, Tahun, Kategori, Pemasukan (Rp), Pengeluaran (Rp), Nominal Bersih (Rp), Saldo Berjalan (Rp), Keterangan.
- Sanitized against spreadsheet formula injection (`=`, `+`, `-`, `@`).

### 5. Interactive Ledger & Daily Cashflow Analytics
- Real-time instant search bar across descriptions, amounts, and categories.
- In-place transaction editing (`PUT /api/transactions/:id`) with anti-IDOR authorization.
- Cashflow ratio & volume analytics bar comparing income vs expense in real time.
- Dedicated user security modal for self-service password changes (`POST /api/auth/change-password`).

### 6. Progressive Web App (PWA) & Telemetry
- Installable as a native app on iOS & Android devices (`manifest.json` with standalone display).
- Integrated `@vercel/analytics` and `@vercel/speed-insights` for privacy-first visitor and Core Web Vitals telemetry.

---

## Technology Stack

| Component | Technology |
| :--- | :--- |
| Framework | Next.js 16.4.5 (App Router, Turbopack, Serverless API Routes) |
| Frontend | React 19, Tailwind CSS v4, Lucide Icons |
| Typography | Space Mono (Monospace), Bricolage Grotesque (Sans) |
| Theme System | Dual Dark/Light Mode (Slate-Charcoal `#0f1115` / Paper-Lead `#fafaf9`), 150ms smooth transition, Zero-FOUC |
| Database | Neon Serverless PostgreSQL (`@neondatabase/serverless`) |
| Auth & Crypto | HTTP-Only Cookies, Jose JWT, Bcrypt Salt 10, Crypto One-Time Tokens |
| External APIs | Telegram Bot Webhook API (Inline Keyboards & Callbacks), Google Sheets CSV Feed |
| Deployment | Vercel Edge Network |

---

## Database Schema

Database tables and indexes are initialized automatically on first run (`initDbSchema()`):

```sql
-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  telegram_chat_id BIGINT UNIQUE,
  telegram_link_code VARCHAR(32) UNIQUE,
  reset_token VARCHAR(128) UNIQUE,
  reset_token_expires_at TIMESTAMP WITH TIME ZONE,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipe VARCHAR(10) NOT NULL CHECK (tipe IN ('income', 'expense')),
  jumlah NUMERIC(15, 2) NOT NULL,
  deskripsi TEXT,
  tanggal DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  username VARCHAR(100),
  role VARCHAR(20),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id VARCHAR(50),
  details JSONB,
  ip_address VARCHAR(100),
  region VARCHAR(100) DEFAULT 'Localhost',
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'success',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bot Logs Table
CREATE TABLE IF NOT EXISTS bot_logs (
  id SERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  username VARCHAR(100),
  command VARCHAR(100) NOT NULL,
  raw_text TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'success',
  response_time_ms INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Traffic Logs Table
CREATE TABLE IF NOT EXISTS traffic_logs (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INT NOT NULL,
  response_time_ms INT,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  ip_address VARCHAR(100),
  region VARCHAR(100) DEFAULT 'Localhost',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
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
Admin Cockpit: [http://localhost:3000/admin](http://localhost:3000/admin).

---

## Changelog & Release Notes

### Version 2.2 (08 November 2026)
- **Dedicated Admin Cockpit & Database Studio (`/admin`)**:
  - Real-time platform cashflow, 14-day visual cashflow SVG chart, user growth tracking, and API uptime/latency monitor.
  - Interactive Table Inspector with pagination, search, and direct row CRUD.
  - Governed Safe SQL Query Runner with DDL protection and execution timer.
  - Database Backup & Restore wizard with full JSON snapshot export.
  - Full audit trail with client IP resolution and geolocation region detection (`📍 Localhost (ID)` / `📍 City, Country`).
  - Export audit and traffic logs to CSV.
- **Telegram Bot v2.2 Upgrade**:
  - Full interactive inline keyboard menus with callback query handler.
  - Transaction pagination for `/terakhir` with interactive previous/next buttons.
  - Role-guarded commands: `/admin`, `/admin_stats`, `/admin_users`, `/dev_info`.
  - Comprehensive bot command logging into database.
- **Authentication & Security Upgrades**:
  - Three-tier Role-Based Access Control (`user`, `admin`, `developer`).
  - One-time cryptographic password reset token workflow (`/reset-password`).
  - Sliding-window rate limiting for brute-force prevention.
  - Dynamic user status check (`active`, `suspended`, `banned`).
- **Design System Contrast Enhancement**:
  - Brightened slate-charcoal dark palette for optimal readability and eye comfort.

### Version 2.1 (06 November 2026)
- **Vercel Analytics & Speed Insights**: Real-time traffic, pageviews, and Core Web Vitals telemetry integration.
- **In-Place Transaction Editing**: Added modal for editing existing transactions (`PUT /api/transactions/:id`) with anti-IDOR checks.
- **Instant Search Bar**: Sub-millisecond client-side filtering by description, category, and amount.
- **User Security & Password Change**: Self-service modal for authenticated password updates with Bcrypt Salt 10 hashing.
- **Cashflow Ratio Bar**: Dynamic progress bar visualizer for income vs. expense ratio and monthly volume.
- **Progressive Web App (PWA)**: Web app manifest and standalone home screen icon for iOS and Android.

### Version 2.0 (05 November 2026)
- **Telegram Quick-Entry Bot**: Natural language transaction parser with command suite.
- **Google Sheets Real-Time Sync**: Live 11-column CSV feed formula integration with formula injection sanitization.
- **Developer Cockpit**: Database metrics, system telemetry, and user management.
- **Mobile Dual-View Ledger**: Automatic adaptation between mobile card list and dense desktop tabular ledger.

---

## License
Distributed under the MIT License. Copyright (c) 2026.
