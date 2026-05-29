const { Pool } = require("pg");

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@postgres:5432/ecommerce";

const pool = new Pool({ connectionString });

async function initPostgres() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      items JSONB NOT NULL,
      total_amount NUMERIC(12, 2) NOT NULL,
      freight_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
      shipping_address TEXT NOT NULL,
      phone TEXT,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'created',
      purchase_timestamp TIMESTAMPTZ,
      delivered_carrier_date TIMESTAMPTZ,
      delivered_customer_date TIMESTAMPTZ,
      estimated_delivery_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS freight_total NUMERIC(12, 2) NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS purchase_timestamp TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_carrier_date TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_customer_date TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_date TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone TEXT`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS note TEXT`);
}

module.exports = { pool, initPostgres };
