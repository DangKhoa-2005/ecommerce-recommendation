require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const mongoUri = process.env.MONGO_URL || 'mongodb://mongo:27017';

async function normalize() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db('ecommerce');
  const products = db.collection('products');

  const cursor = products.find({ olist_product_id: { $exists: true } });
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const olist = String(doc.olist_product_id || '').trim();
    if (!olist || olist.length < 24) continue;

    const targetId = olist.slice(0, 24);
    try {
      const existing = await products.findOne({ _id: new ObjectId(targetId) });
      const merged = {
        olist_product_id: olist,
        name: doc.name || (existing && existing.name) || 'Unknown',
        price: (doc.price || (existing && existing.price) || 0),
        stock: doc.stock || (existing && existing.stock) || 100,
        image_url: doc.image_url || (existing && existing.image_url) || null,
        updated_at: new Date(),
        normalized_from: doc._id
      };

      await products.updateOne({ _id: new ObjectId(targetId) }, { $set: merged }, { upsert: true });

      // If original doc _id differs from normalized id, remove it
      if (String(doc._id) !== targetId) {
        await products.deleteOne({ _id: doc._id });
      }
    } catch (err) {
      console.warn('normalize error for', olist, err.message);
    }
  }

  await client.close();
  console.log('Normalization complete');
}

normalize().catch((err) => { console.error(err); process.exit(1); });
