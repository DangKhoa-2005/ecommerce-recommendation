require('dotenv').config();
const { Pool } = require('pg');
const { MongoClient, ObjectId } = require('mongodb');

const pgUri = process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/ecommerce';
const mongoUri = process.env.MONGO_URL || 'mongodb://mongo:27017';

const pool = new Pool({ connectionString: pgUri });

function normalizeProductId(productId) {
  const value = String(productId || '').trim();
  if (!value) return value;
  return value.length > 24 ? value.slice(0, 24) : value;
}

async function sync() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db('ecommerce');
  const products = db.collection('products');

  // Fetch orders with items
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
      const normalizedId = normalizeProductId(pid);

      const doc = {
        name: it.product_name || (it.product && it.product.name) || 'Unknown Product',
        price: typeof it.unit_price === 'number' ? it.unit_price : (typeof it.unit_price === 'string' ? Number(it.unit_price) || 0 : Number(it.price || 0)),
        stock: typeof it.stock === 'number' ? it.stock : 100,
        image_url: it.image_url || (it.product && it.product.image_url) || null,
        updated_at: new Date(),
        historical_synced: true
      };

      try {
        await products.updateOne(
          { _id: normalizedId },
          { $set: { ...doc, _id: normalizedId, olist_product_id: pid } },
          { upsert: true }
        );
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
