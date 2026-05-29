require("dotenv").config({ path: __dirname + "/.env" });
const { Pool } = require("pg");
const { MongoClient, ObjectId } = require("mongodb");
const { historicalOlistProducts } = require("./order-service/src/mongo");
const bcrypt = require("bcryptjs");

const pgUri = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/ecommerce";
const mongoUri = process.env.MONGO_URL || "mongodb://localhost:27017";

const pool = new Pool({ connectionString: pgUri });
const OLIST_CUSTOMER_ID = "dc813062e0fc23409cd255f7f53c7074";

// Historical products used for order history (VND prices from mongo.js)
const historicalById = new Map(
  historicalOlistProducts.map((item) => [item.olist_product_id, item])
);

const top10Olist = [
  { id: "aca2eb7d00ea1a7b8ebd4e68314663af", name: "Ghế Văn Phòng Công Thái Học", category: "moveis_decoracao", price: 1699000, qty: 0, image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=800&auto=format&fit=crop" },
  { id: "422879e10f46682990de24d770e7f83d", name: "Đồng Hồ Theo Dõi Sức Khỏe", category: "relogios_presentes", price: 799000, qty: 0, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop" },
  { id: "f2d9c5e1b8a3f7c2e9d1f4a6b8c0e2a5", name: "Tủ Lưu Trữ Gỗ Hiện Đại", category: "casa_conforto", price: 1250000, qty: 0, image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?q=80&w=800&auto=format&fit=crop" },
  { id: "c3b9e7f2d1a6c8e5f3b0d2a9c1e6f4b8", name: "Bộ Chăn Ga Gối Cao Cấp", category: "cama_mesa_banho", price: 1599000, qty: 0, image: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?q=80&w=800&auto=format&fit=crop" },
  { id: "a4d6f2e9b1c7e3f5d8a0c2e4f6b9d1a3", name: "Dụng Cụ Nhà Bếp Thông Minh", category: "moveis_decoracao", price: 899000, qty: 0, image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=800&auto=format&fit=crop" },
  { id: "b5e7c3f0a2d8e1f4c6a9b1d3e5f7c9b2", name: "Máy Chơi Nhạc Bluetooth", category: "cool_stuff", price: 650000, qty: 0, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop" },
  { id: "d8f1c4a9e2b6f3d0c7e9a1b3f5d7c8a0", name: "Bộ Đồ Chơi Giáo Dục Trẻ", category: "bebes", price: 549000, qty: 0, image: "https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?q=80&w=800&auto=format&fit=crop" },
  { id: "e9a2d5f8c1b4e7f0d3a6c9e2f4b7d0c3", name: "Lều Chơi Trẻ Em", category: "brinquedos", price: 899000, qty: 0, image: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?q=80&w=800&auto=format&fit=crop" },
  { id: "f0c3e6a9d2b5f8e1c4a7d0f3b6e9c2a5", name: "Gối Trang Trí Cao Cấp", category: "cama_mesa_banho", price: 289000, qty: 0, image: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?q=80&w=800&auto=format&fit=crop" },
  { id: "a1b4c7d0e3f6a9c2d5e8f1b4c7d0a3e6", name: "Đồng Hồ Treo Tường Sang Trọng", category: "relogios_presentes", price: 449000, qty: 0, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop" }
];

// Recommendation products moved to Databricks dynamic pipeline
// Previously hardcoded recProducts array is now sourced from:
// - workspace.default.reco_cf_interactions (Collaborative Filtering)
// - workspace.default.reco_cbf_features (Content-Based Filtering)
// - workspace.default.reco_fp_growth_rules (Association Rules)
// Called via /recommendations/user/:userId?mode=hybrid
const recProducts = []; // No longer used; populated from Databricks at runtime

async function seed() {
  let mongoClient;
  try {
    console.log("Seeding PostgreSQL...");
    
    // Ensure users table exists first in case User Service is too slow to start
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'customer',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Add olist_customer_id to users if not exists
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS olist_customer_id TEXT UNIQUE;`);

    // Ensure orders table exists first in case Order Service is too slow to start
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        items JSONB NOT NULL,
        total_amount NUMERIC(12, 2) NOT NULL,
        freight_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
        shipping_address TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'created',
        purchase_timestamp TIMESTAMPTZ,
        delivered_carrier_date TIMESTAMPTZ,
        delivered_customer_date TIMESTAMPTZ,
        estimated_delivery_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS freight_total NUMERIC(12, 2) NOT NULL DEFAULT 0;`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS purchase_timestamp TIMESTAMPTZ;`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_carrier_date TIMESTAMPTZ;`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_customer_date TIMESTAMPTZ;`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_date TIMESTAMPTZ;`);

    // Keep only Olist demo user for this project context
    const email = 'dc813062@olist.com';
    const hashed = await bcrypt.hash("password123", 10);
    await pool.query(`DELETE FROM orders WHERE user_id IN (SELECT id FROM users WHERE email <> $1)`, [email]);
    await pool.query(`DELETE FROM users WHERE email <> $1`, [email]);

    await pool.query(`
      INSERT INTO users (email, password_hash, full_name, role, olist_customer_id) 
      VALUES ($1, $2, 'Khach Hang Olist', 'customer', $3)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        olist_customer_id = EXCLUDED.olist_customer_id
    `, [email, hashed, OLIST_CUSTOMER_ID]);
    
    const userRes = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
    const userId = userRes.rows[0].id;
    console.log("User inserted with local ID:", userId);

    console.log("Seeding MongoDB...");
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    console.log("MongoDB product seeding is handled by order-service initMongo().");

    // Insert separate Olist-style invoices for the bought products
    // Based on Databricks aggregates for the Olist customer
    console.log("Inserting Order history...");
    await pool.query(`DELETE FROM orders WHERE user_id = $1`, [userId]);

    const invoiceSeeds = [
      // Order 1: 4 items, net 200.00, freight 136.60, 2017-07-01
      { product_id: "db12039c7ff4e850d48e0312fa9b3473", qty: 4, freight: 136.60, purchase: '2017-07-01T04:22:21.000Z', carrier: '2017-07-04T10:00:00.000Z', delivered: '2017-07-10T14:00:00.000Z', estimated: '2017-07-18T00:00:00.000Z' },
      // Order 2: 1 item, net 71.99, freight 27.04, 2017-10-06
      { product_id: "756791c03bd72f60ad98162dd69d054c", qty: 1, freight: 27.04, purchase: '2017-10-06T14:30:00.000Z', carrier: '2017-10-09T08:45:00.000Z', delivered: '2017-10-16T12:00:00.000Z', estimated: '2017-10-23T00:00:00.000Z' },
      // Order 3: 3 items, net 165.00, freight 77.01, 2017-11-13
      { product_id: "b623b7cb05ee3248fbe4a6ecbeed79a4", qty: 3, freight: 77.01, purchase: '2017-11-13T10:15:00.000Z', carrier: '2017-11-15T14:30:00.000Z', delivered: '2017-11-22T16:00:00.000Z', estimated: '2017-11-30T00:00:00.000Z' },
      // Order 4: 1 item, net 104.90, freight 29.13, 2017-11-14
      { product_id: "423b46d7ff817b1cd19ab195c7b76546", qty: 1, freight: 29.13, purchase: '2017-11-14T11:20:00.000Z', carrier: '2017-11-17T09:00:00.000Z', delivered: '2017-11-24T15:45:00.000Z', estimated: '2017-12-02T00:00:00.000Z' },
      // Order 5: 1 item, net 70.97, freight 28.90, 2017-11-25
      { product_id: "094efc8b088034585ebda1a32da7181d", qty: 1, freight: 28.90, purchase: '2017-11-25T16:45:00.000Z', carrier: '2017-11-28T11:15:00.000Z', delivered: '2017-12-05T13:30:00.000Z', estimated: '2017-12-12T00:00:00.000Z' },
      // Order 6: 1 item, net 74.90, freight 47.18, 2018-08-23
      { product_id: "094efc8b088034585ebda1a32da7181d", qty: 1, freight: 47.18, purchase: '2018-08-23T00:07:26.000Z', carrier: '2018-08-25T09:30:00.000Z', delivered: '2018-08-31T17:10:00.000Z', estimated: '2018-09-07T00:00:00.000Z' }
    ];

    for (const seed of invoiceSeeds) {
      const product = historicalById.get(seed.product_id);
      if (!product) {
        console.warn("Historical product not found for", seed.product_id);
        continue;
      }

      const validObjectId = seed.product_id.slice(0, 24);
      const unitPrice = Number(product.price);
      const quantity = seed.qty;
      const lineTotal = Number((unitPrice * quantity).toFixed(2));
      const freight = Number(seed.freight.toFixed(2));
      const totalWithFreight = Number((lineTotal + freight).toFixed(2));
      const imageUrl = product.image_url;

      await pool.query(
        `INSERT INTO orders (
           user_id,
           items,
           total_amount,
           freight_total,
           shipping_address,
           status,
           purchase_timestamp,
           delivered_carrier_date,
           delivered_customer_date,
           estimated_delivery_date,
           created_at
         ) VALUES ($1, $2::jsonb, $3, $4, $5, 'delivered', $6, $7, $8, $9, $6)`,
        [
          userId,
            JSON.stringify([
              {
                product_id: validObjectId,
                product_name: product.name,
                unit_price: unitPrice,
                quantity,
                line_total: lineTotal,
                freight_value: freight,
                image_url: imageUrl
              }
            ]),
          totalWithFreight,
          freight,
          "Sao Paulo, BR",
          seed.purchase,
          seed.carrier,
          seed.delivered,
          seed.estimated
        ]
      );
    }
    console.log("Order history inserted.");
    
    console.log("\n--- Demo Setup Complete ---");
    console.log("User Email:", email);
    console.log("Password: password123");
    console.log("Olist Unique ID:", OLIST_CUSTOMER_ID);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    if (mongoClient) await mongoClient.close();
    await pool.end();
  }
}

seed();
