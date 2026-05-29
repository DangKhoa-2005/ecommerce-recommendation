// Cleanup old product categories from MongoDB
require("dotenv").config({ path: __dirname + "/.env" });
const { MongoClient } = require("mongodb");

const mongoUri = process.env.MONGO_URL || "mongodb://localhost:27017";

async function cleanup() {
  const mongoClient = new MongoClient(mongoUri);
  try {
    await mongoClient.connect();
    const db = mongoClient.db("ecommerce");
    const productsColl = db.collection("products");

    const oldCategories = [
      'telefonica',
      'ferramentas_jardim',
      'fashion_bolsas_e_acessorios',
      'informatica_acessorios',
      'papelaria',
      'esporte_lazer'
    ];

    console.log('Removing products with old categories...');
    const result = await productsColl.deleteMany({
      category: { $in: oldCategories }
    });

    console.log(`✅ Deleted ${result.deletedCount} products with old categories`);
    
    // List remaining categories
    const categories = await productsColl.distinct('category');
    console.log('\n📦 Remaining categories:', categories.sort());
  } finally {
    await mongoClient.close();
  }
}

cleanup().catch(err => {
  console.error('❌ Cleanup failed:', err.message);
  process.exit(1);
});
