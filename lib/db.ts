import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let sqlInstance: NeonQueryFunction<false, false> | null = null;
let schemaInitialized = false;

export function getDb() {
  const connectionString =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL belum diatur. Harap setel DATABASE_URL di .env.local atau Vercel Environment Variables."
    );
  }

  if (!sqlInstance) {
    sqlInstance = neon(connectionString);
  }

  return sqlInstance;
}

// Inisialisasi skema tabel otomatis satu kali
export async function initDbSchema() {
  if (schemaInitialized) return;

  const sql = getDb();

  try {
    // 1. Tabel users
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        telegram_chat_id BIGINT UNIQUE,
        telegram_link_code VARCHAR(32) UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 2. Migrasi kolom role & telegram jika tabel lama sudah terbuat
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
    `;
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT UNIQUE;
    `;
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_link_code VARCHAR(32) UNIQUE;
    `;

    // 3. Tabel transactions
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tipe VARCHAR(10) NOT NULL CHECK (tipe IN ('income', 'expense')),
        jumlah NUMERIC(15, 2) NOT NULL,
        deskripsi TEXT,
        tanggal DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 4. Index performa tinggi
    await sql`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_date 
      ON transactions (user_id, tanggal DESC);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_username_lower 
      ON users (LOWER(username));
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_telegram_chat_id 
      ON users (telegram_chat_id);
    `;

    schemaInitialized = true;
  } catch (err) {
    console.error("Schema init error:", err);
    schemaInitialized = true;
  }
}
