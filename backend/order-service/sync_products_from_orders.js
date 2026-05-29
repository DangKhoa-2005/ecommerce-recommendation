require('dotenv').config();
const { Pool } = require('pg');
const { MongoClient, ObjectId } = require('mongodb');

const pgUri = process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/ecommerce';
const mongoUri = process.env.MONGO_URL || 'mongodb://mongo:27017';

const pool = new Pool({ connectionString: pgUri });

async function sync() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db('ecommerce');
  const products = db.collection('products');

  // Fetch recent orders with items
  const res = await pool.query(`SELECT id, items FROM orders WHERE items IS NOT NULL`);
  for (const row of res.rows) {
    let items = [];
    try {
      items = Array.isArray(row.items) ? row.items : JSON.parse(row.items || '[]');
    } catch (_err) {
      continue;
    }

    for (const it of items) {
      const pid = String(it.product_id || it.id || '').trim();
      if (!pid) continue;

      const doc = {
        name: it.product_name || it.product?.name || 'Unknown Product',
        price: typeof it.unit_price === 'number' ? it.unit_price : (typeof it.unit_price === 'string' ? Number(it.unit_price) || 0 : Number(it.price || 0)),
        stock: typeof it.stock === 'number' ? it.stock : 100,
        image_url: it.image_url || it.product?.image_url || null,
        updated_at: new Date(),
        historical_synced: true
      };

      try {
        if (ObjectId.isValid(pid) && pid.length === 24) {
          await products.updateOne({ _id: new ObjectId(pid) }, { $set: { ...doc, olist_product_id: pid } }, { upsert: true });
        } else {
          // fallback: store by olist_product_id
          await products.updateOne({ olist_product_id: pid }, { $set: { ...doc, olist_product_id: pid } }, { upsert: true });
        }
      } catch (err) {
        console.warn('Failed to upsert product', pid, err.message);
      }
    }
  }

  await client.close();
  await pool.end();
  console.log('Sync complete');
}

sync().catch((err) => { console.error(err); process.exit(1); });
