const { runSql } = require('./src/databricks');

const categories = [
  'cool_stuff',
  'relogios_presentes',
  'brinquedos',
  'bebes',
  'moveis_decoracao',
  'casa_conforto',
  'cama_mesa_banho'
];

(async () => {
  const result = {};
  for (const category of categories) {
    const rows = await runSql(`
      SELECT DISTINCT product_id
      FROM workspace.default.reco_cbf_features
      WHERE product_category_name = '${category}'
      ORDER BY RAND()
      LIMIT 5
    `);
    result[category] = rows.map((row) => row.product_id || row[0]);
  }
  console.log(JSON.stringify(result, null, 2));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
