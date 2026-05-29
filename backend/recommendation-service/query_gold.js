const { runSql } = require('/app/src/databricks');

const sql = "SELECT first_purchase_date AS first_purchase FROM workspace.default.gold_customer_rfm WHERE customer_unique_id = 'dc813062e0fc23409cd255f7f53c7074' LIMIT 1";

runSql(sql)
  .then(r => { console.log(JSON.stringify(r, null, 2)); process.exit(0); })
  .catch(e => { console.error('ERROR', e.message); process.exit(2); });
