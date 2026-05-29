// Script to extract real product IDs from Databricks reco_cbf_features table
const axios = require('axios');

const DATABRICKS_HOST = process.env.DATABRICKS_HOST;
const DATABRICKS_TOKEN = process.env.DATABRICKS_TOKEN;
const WAREHOUSE_ID = process.env.DATABRICKS_WAREHOUSE_ID;

async function runSql(statement) {
  const url = `https://${DATABRICKS_HOST}/api/2.1/sql/statements`;
  const response = await axios.post(
    url,
    {
      warehouse_id: WAREHOUSE_ID,
      statement: statement
    },
    {
      headers: {
        'Authorization': `Bearer ${DATABRICKS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );

  // Poll for result
  let result = response.data;
  while (result.state !== 'SUCCEEDED' && result.state !== 'FAILED') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const pollResponse = await axios.get(`${url}/${result.statement_id}`, {
      headers: { 'Authorization': `Bearer ${DATABRICKS_TOKEN}` }
    });
    result = pollResponse.data;
  }

  if (result.state === 'FAILED') {
    throw new Error(`Query failed: ${result.error}`);
  }

  return result.result?.data_array || [];
}

async function extractProducts() {
  console.log('Querying Databricks for real product IDs...\n');

  // Categories to keep (as per user request)
  const categoriesToKeep = [
    'cool_stuff',
    'bebes',
    'brinquedos',
    'casa_conforto',
    'cama_mesa_banho',
    'moveis_decoracao',
    'relogios_presentes'
  ];

  const categoryImages = {
    'cool_stuff': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop',
    'bebes': 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?q=80&w=800&auto=format&fit=crop',
    'brinquedos': 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?q=80&w=800&auto=format&fit=crop',
    'casa_conforto': 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?q=80&w=800&auto=format&fit=crop',
    'cama_mesa_banho': 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?q=80&w=800&auto=format&fit=crop',
    'moveis_decoracao': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=800&auto=format&fit=crop',
    'relogios_presentes': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop'
  };

  const allProducts = {
    bought: [],
    top10: []
  };

  // For each category, get 3 products (1 for bought history + 2 for top10)
  for (const category of categoriesToKeep) {
    console.log(`Fetching products from category: ${category}`);
    
    try {
      const sql = `
        SELECT DISTINCT product_id
        FROM workspace.default.reco_cbf_features
        WHERE product_category_name = '${category}'
        ORDER BY RAND()
        LIMIT 5
      `;
      
      const rows = await runSql(sql);
      
      if (rows && rows.length > 0) {
        const productIds = rows.map(row => row[0]);
        
        // Add 1st product to bought products
        if (productIds.length > 0 && allProducts.bought.length < 5) {
          allProducts.bought.push({
            id: productIds[0],
            name: `Sản phẩm ${category}`,
            category: category,
            price: Math.floor(100000 + Math.random() * 1000000),
            qty: Math.floor(Math.random() * 5) + 1,
            image: categoryImages[category]
          });
        }
        
        // Add remaining to top10 (take up to 2 per category)
        for (let i = 1; i < Math.min(3, productIds.length) && allProducts.top10.length < 10; i++) {
          allProducts.top10.push({
            id: productIds[i],
            name: `Sản phẩm ${category} #${i}`,
            category: category,
            price: Math.floor(100000 + Math.random() * 1000000),
            qty: 0,
            image: categoryImages[category]
          });
        }
      }
    } catch (err) {
      console.error(`Error fetching products for ${category}:`, err.message);
    }
  }

  console.log('\n=== BOUGHT PRODUCTS ===');
  console.log(JSON.stringify(allProducts.bought, null, 2));
  
  console.log('\n=== TOP 10 PRODUCTS ===');
  console.log(JSON.stringify(allProducts.top10, null, 2));
  
  return allProducts;
}

extractProducts().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
