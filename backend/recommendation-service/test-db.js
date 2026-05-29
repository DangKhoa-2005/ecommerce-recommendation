// Quick test for Databricks connection
const axios = require('axios');

const DATABRICKS_HOST = process.env.DATABRICKS_HOST;
const DATABRICKS_TOKEN = process.env.DATABRICKS_TOKEN;
const WAREHOUSE_ID = process.env.DATABRICKS_WAREHOUSE_ID;

async function testQuery() {
  try {
    console.log('Testing Databricks connection...');
    console.log('Host:', DATABRICKS_HOST);
    console.log('Token:', DATABRICKS_TOKEN ? 'SET' : 'NOT SET');
    console.log('Warehouse:', WAREHOUSE_ID);

    const response = await axios.post(
      `https://${DATABRICKS_HOST}/api/2.1/sql/statements`,
      {
        warehouse_id: WAREHOUSE_ID,
        statement: 'SELECT DISTINCT product_category_name FROM workspace.default.reco_cbf_features LIMIT 20'
      },
      {
        headers: {
          'Authorization': `Bearer ${DATABRICKS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('\nCategories found:');
    if (response.data.result && response.data.result.data_array) {
      response.data.result.data_array.forEach((row, idx) => {
        console.log(`  ${idx + 1}. ${row[0]}`);
      });
    }

    // Now get sample product IDs
    const prodResponse = await axios.post(
      `https://${DATABRICKS_HOST}/api/2.1/sql/statements`,
      {
        warehouse_id: WAREHOUSE_ID,
        statement: `
          SELECT DISTINCT product_id, product_category_name 
          FROM workspace.default.reco_cbf_features 
          WHERE product_category_name IN ('cool_stuff', 'telefonica', 'bebes', 'brinquedos')
          LIMIT 5
        `
      },
      {
        headers: {
          'Authorization': `Bearer ${DATABRICKS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('\nSample product IDs:');
    if (prodResponse.data.result && prodResponse.data.result.data_array) {
      prodResponse.data.result.data_array.forEach((row) => {
        console.log(`  ${row[1]}: ${row[0]}`);
      });
    }
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
      console.error('Response:', err.response.data);
    }
  }
}

testQuery();
