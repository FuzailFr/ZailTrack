# ZailTrack ❖ High-Density Financial Ledger

> Technical archival personal finance management application with zero generic slop. Built with Next.js 16 (App Router, Turbopack, React 19), Tailwind CSS v4, and Neon Serverless PostgreSQL.

![ZailTrack Preview](https://raw.githubusercontent.com/FuzailFr/ZailTrack/main/public/preview.png)

---

## ✦ Overview

**ZailTrack** is an engineered financial tracking system crafted for developers and power users who value information density, speed, and uncompromising data security. It replaces legacy manual spreadsheets and bloated finance trackers with a clean, editorial ledger interface.

### Highlights
- **Zero-Trust Security**: Passwords hashed with `bcrypt` (salt 10). Session authenticated exclusively via **HTTP-Only Cookies** signed with `jose` (JWT). Zero `localStorage` credential exposure.
- **Immunity from IDOR & SQL Injection**: Parameterized SQL queries via `@neondatabase/serverless` with multi-tenant row-level authorization (`WHERE user_id = session.userId`).
- **Serverless PostgreSQL**: Ultra-low latency database with automated schema creation and indexed transaction lookup.
- **High-Density Technical UI**: Inspired by technical archival ledgers and monospace typography (`Bricolage Grotesque` & `Space Mono`). Seamless Dark and Light theme toggle.
- **Reporting & Export**: Real-time monthly cashflow calculation (Income, Expense, Net Balance) with instant CSV/Excel export.

---

## ✦ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router, Turbopack, Serverless API Routes) |
| **UI & Styling** | React 19, Tailwind CSS v4, Lucide Icons |
| **Typography** | Bricolage Grotesque (Sans), Space Mono (Monospace) |
| **Database** | Neon Serverless PostgreSQL (`@neondatabase/serverless`) |
| **Authentication** | JWT (`jose`), HTTP-Only Cookies, `bcryptjs` |
| **Deployment** | Vercel Serverless Architecture |

---

## ✦ Database Schema

ZailTrack initializes its own database tables automatically upon the first API request. You do not need to run manual migration scripts.

```sql
-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
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

-- Performance Index
CREATE INDEX IF NOT EXISTS idx_transactions_user_date 
ON transactions (user_id, tanggal DESC);
```

---

## ✦ Quick Start (Local Development)

### 1. Clone Repository
```bash
git clone https://github.com/FuzailFr/ZailTrack.git
cd ZailTrack
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root directory:
```env
DATABASE_URL=postgres://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=your-secure-random-32-character-secret-key
```
> *Tip: You can get a free serverless PostgreSQL database within 30 seconds at [neon.tech](https://neon.tech).*

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ✦ Deploy to Vercel

### Method 1: Vercel Dashboard (Recommended)
1. Import the repository `https://github.com/FuzailFr/ZailTrack` on [vercel.com](https://vercel.com).
2. Add the following **Environment Variables** in Project Settings:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string.
   - `JWT_SECRET`: A secure random string (minimum 32 characters).
3. Click **Deploy**.

### Method 2: Vercel CLI
```bash
npm i -g vercel
vercel
```

---

## ✦ Architecture & Security Features

1. **Anti-XSS**: All user inputs (descriptions, usernames) are strictly escaped and rendered as text nodes by React, neutralizing script injection vectors.
2. **Anti-IDOR**: Deletions and data queries evaluate `session.userId` extracted from the cryptographically verified JWT cookie on every request. A user cannot view or delete another user's ledger entries.
3. **Hardened HTTP Headers**: Strict `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Strict-Transport-Security` configured in `next.config.ts`.

---

## ✦ License
MIT License © [Fuzail Fazle Rabbi](https://github.com/FuzailFr).
