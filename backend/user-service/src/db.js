const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@postgres:5432/ecommerce";

const pool = new Pool({ connectionString });

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS olist_customer_id TEXT UNIQUE`);

  const olistEmail = process.env.OLIST_DEMO_EMAIL || "dc813062@olist.com";
  const olistPassword = process.env.OLIST_DEMO_PASSWORD || "password123";
  const olistFullName = process.env.OLIST_DEMO_FULL_NAME || "Khach Hang Olist";
  const olistCustomerId =
    process.env.OLIST_CUSTOMER_ID || "dc813062e0fc23409cd255f7f53c7074";
  const onlyOlistAccount =
    String(process.env.ONLY_OLIST_ACCOUNT || "true").toLowerCase() === "true";

  const hashed = await bcrypt.hash(olistPassword, 10);
  await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role, olist_customer_id)
     VALUES ($1, $2, $3, 'customer', $4)
     ON CONFLICT (email)
     DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       full_name = EXCLUDED.full_name,
       role = 'customer',
       olist_customer_id = EXCLUDED.olist_customer_id`,
    [olistEmail, hashed, olistFullName, olistCustomerId]
  );

  if (onlyOlistAccount) {
    await pool.query("DELETE FROM users WHERE email <> $1", [olistEmail]);
  }
}

module.exports = { pool, initDb };
