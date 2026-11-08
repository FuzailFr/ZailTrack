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
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
    `;
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(128) UNIQUE;
    `;
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP WITH TIME ZONE;
    `;
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
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

    // 4. Tabel audit_logs
    await sql`
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
    `;

    // 5. Tabel bot_logs
    await sql`
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
    `;

    // 6. Tabel traffic_logs
    await sql`
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
    `;

    // 7. Index performa tinggi
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

    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_status 
      ON users (status);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_reset_token 
      ON users (reset_token);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
      ON audit_logs (created_at DESC);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
      ON audit_logs (action);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_bot_logs_created_at 
      ON bot_logs (created_at DESC);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_traffic_logs_created_at 
      ON traffic_logs (created_at DESC);
    `;

    schemaInitialized = true;
  } catch (err) {
    console.error("Schema init error:", err);
    schemaInitialized = true;
  }
}
