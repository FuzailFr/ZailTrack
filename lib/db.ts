import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let sqlInstance: NeonQueryFunction<false, false> | null = null;

export function getDb() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
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

// Inisialisasi skema tabel otomatis jika belum ada
export async function initDbSchema() {
  const sql = getDb();

  // Tabel users
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Tabel transactions
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

  // Index untuk query performa tinggi
  await sql`
    CREATE INDEX IF NOT EXISTS idx_transactions_user_date 
    ON transactions (user_id, tanggal DESC);
  `;
}
