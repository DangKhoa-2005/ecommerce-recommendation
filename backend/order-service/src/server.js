require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ObjectId } = require("mongodb");
const { pool, initPostgres } = require("./pg");
const { initMongo, getProductsCollection, pingMongo } = require("./mongo");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 3002);

const ALLOWED_STATUSES = [
  "created",
  "confirmed",
  "shipping",
  "delivered",
  "cancelled"
];

function normalizeLookupId(productId) {
  const value = String(productId || "").trim();
  if (!value) return value;
  return value.length > 24 ? value.slice(0, 24) : value;
}

async function findProductByAnyId(productId) {
  const products = getProductsCollection();
  const normalizedId = normalizeLookupId(productId);

  const byNormalizedId = await products.findOne({ _id: normalizedId });
  if (byNormalizedId) return byNormalizedId;

  if (normalizedId !== productId) {
    const byOriginalId = await products.findOne({ _id: productId });
    if (byOriginalId) return byOriginalId;
  }

  const byOriginalOlistId = await products.findOne({ olist_product_id: productId });
  if (byOriginalOlistId) return byOriginalOlistId;

  if (normalizedId !== productId) {
    return products.findOne({ olist_product_id: normalizedId });
  }

  return null;
}

app.get("/health", async (_req, res) => {
  await pool.query("SELECT 1");
  await pingMongo();
  res.json({ service: "order-service", status: "ok" });
});

app.get("/products", async (req, res) => {
  const { category } = req.query;
  const filter = category ? { category } : {};
  const products = await getProductsCollection().find(filter).limit(100).toArray();
  return res.json({ products });
});

app.get("/products/:id", async (req, res) => {
  const product = await findProductByAnyId(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  return res.json({ product });
});

app.post("/products", async (req, res) => {
  const { name, category, price, stock } = req.body;
  if (!name || !category || price == null) {
    return res.status(400).json({ message: "name, category, price are required" });
  }

  const payload = {
    name,
    category,
    price: Number(price),
    stock: Number(stock ?? 0),
    created_at: new Date()
  };

  const result = await getProductsCollection().insertOne(payload);
  return res.status(201).json({
    product: { _id: result.insertedId, ...payload }
  });
});

app.post("/orders", async (req, res) => {
  const { user_id, items, shipping_address, freight_total, phone, note, purchase_timestamp, delivered_carrier_date, delivered_customer_date, estimated_delivery_date } = req.body;
  if (!user_id || !Array.isArray(items) || items.length === 0 || !shipping_address) {
    return res.status(400).json({ message: "user_id, items, shipping_address are required" });
  }

  const productObjectIds = [];
  for (const item of items) {
    if (!item.product_id || !item.quantity || Number(item.quantity) <= 0) {
      return res.status(400).json({ message: "Each item requires product_id and quantity > 0" });
    }
  }

  const orderItems = [];

  for (const item of items) {
    const product = await findProductByAnyId(String(item.product_id));
    if (!product) {
      return res.status(404).json({ message: `Product not found: ${item.product_id}` });
    }

    const quantity = Number(item.quantity);
    // Allow caller to supply the unit price (keep price unchanged when importing)
    const unitPrice = typeof item.unit_price === 'number' && Number.isFinite(item.unit_price)
      ? Number(item.unit_price)
      : (typeof item.price === 'number' && Number.isFinite(item.price) ? Number(item.price) : Number(product.price || 0));

    const lineTotal = Number((unitPrice * quantity).toFixed(2));
    orderItems.push({
      product_id: String(product._id),
      product_name: product.name,
      unit_price: Number(unitPrice),
      quantity,
      line_total: Number(lineTotal.toFixed(2)),
      image_url: item.image_url || product.image_url
    });
  }

  const totalAmount = Number(
    orderItems.reduce((sum, item) => sum + item.line_total, 0).toFixed(2)
  );
  const freightTotal = Number(Number(freight_total || 0).toFixed(2));

  const now = new Date();
  const finalPurchaseTimestamp = purchase_timestamp || now.toISOString();
  const finalDeliveredCarrierDate = delivered_carrier_date || finalPurchaseTimestamp;
  const finalDeliveredCustomerDate = delivered_customer_date || finalPurchaseTimestamp;

  const inserted = await pool.query(
    `INSERT INTO orders (user_id, items, total_amount, freight_total, shipping_address, phone, note, status, purchase_timestamp, delivered_carrier_date, delivered_customer_date, estimated_delivery_date)
     VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7, 'delivered', $8, $9, $10, $11)
     RETURNING id, user_id, items, total_amount, freight_total, shipping_address, phone, note, status, purchase_timestamp, delivered_carrier_date, delivered_customer_date, estimated_delivery_date, created_at`,
    [
      Number(user_id),
      JSON.stringify(orderItems),
      totalAmount,
      freightTotal,
      shipping_address,
      phone || null,
      note || null,
      finalPurchaseTimestamp,
      finalDeliveredCarrierDate || null,
      finalDeliveredCustomerDate,
      estimated_delivery_date || null
    ]
  );

  return res.status(201).json({ order: inserted.rows[0] });
});

app.get("/orders/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid order id" });

  const result = await pool.query(
    `SELECT id, user_id, items, total_amount, freight_total, shipping_address, phone, note, status, purchase_timestamp, delivered_carrier_date, delivered_customer_date, estimated_delivery_date, created_at
     FROM orders WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) return res.status(404).json({ message: "Order not found" });
  return res.json({ order: result.rows[0] });
});

app.get("/orders/user/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId)) return res.status(400).json({ message: "Invalid user id" });

  const result = await pool.query(
    `SELECT id, user_id, items, total_amount, freight_total, shipping_address, phone, note, status, purchase_timestamp, delivered_carrier_date, delivered_customer_date, estimated_delivery_date, created_at
     FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );

  return res.json({ orders: result.rows });
});

app.get("/orders/customer/:olistCustomerId/summary", async (req, res) => {
  const { olistCustomerId } = req.params;
  if (!olistCustomerId) {
    return res.status(400).json({ message: "olistCustomerId is required" });
  }

  const fxRate = Number(req.query.brl_to_vnd || process.env.BRL_TO_VND || 5000);

  const result = await pool.query(
    `SELECT
       o.id,
       o.user_id,
       u.olist_customer_id,
       o.items,
       o.total_amount,
       o.freight_total,
       (o.total_amount - COALESCE(o.freight_total, 0)) AS net_total_amount,
       o.shipping_address,
       o.phone,
       o.note,
       o.status,
       o.purchase_timestamp,
       o.delivered_carrier_date,
       o.delivered_customer_date,
       o.estimated_delivery_date,
       o.created_at
     FROM orders o
     JOIN users u ON u.id = o.user_id
     WHERE u.olist_customer_id = $1
     ORDER BY COALESCE(o.purchase_timestamp, o.created_at) DESC`,
    [olistCustomerId]
  );

  const totalSpentBrl = Number(
    result.rows.reduce((sum, order) => sum + Number(order.total_amount || 0) - Number(order.freight_total || 0), 0).toFixed(2)
  );

  const totalFreightBrl = Number(
    result.rows.reduce((sum, order) => sum + Number(order.freight_total || 0), 0).toFixed(2)
  );

  const totalSpentVndEstimate = Number((totalSpentBrl * fxRate).toFixed(0));

  const purchaseDates = result.rows.map((order) => order.purchase_timestamp || order.created_at).filter(Boolean);
  const deliveredDates = result.rows.map((order) => order.delivered_customer_date).filter(Boolean);

  return res.json({
    customer_unique_id: olistCustomerId,
    currency: "BRL",
    fx: {
      target_currency: "VND",
      brl_to_vnd: fxRate
    },
    summary: {
      total_orders: result.rows.length,
      total_spent_brl: totalSpentBrl,
      total_freight_brl: totalFreightBrl,
      total_spent_vnd_estimate: totalSpentVndEstimate
    },
    timeline: {
      first_purchase_date: purchaseDates.length ? purchaseDates[purchaseDates.length - 1] : null,
      last_purchase_date: purchaseDates.length ? purchaseDates[0] : null,
      first_delivered_date: deliveredDates.length ? deliveredDates[deliveredDates.length - 1] : null,
      last_delivered_date: deliveredDates.length ? deliveredDates[0] : null
    },
    orders: result.rows
  });
});

app.put("/orders/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid order id" });
  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ message: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` });
  }

  const result = await pool.query(
    `UPDATE orders SET status = $1
     WHERE id = $2
     RETURNING id, user_id, items, total_amount, shipping_address, status, created_at`,
    [status, id]
  );

  if (result.rows.length === 0) return res.status(404).json({ message: "Order not found" });
  return res.json({ order: result.rows[0] });
});

app.get("/orders", async (_req, res) => {
  const result = await pool.query(
    `SELECT id, user_id, items, total_amount, freight_total, shipping_address, phone, note, status, purchase_timestamp, delivered_carrier_date, delivered_customer_date, estimated_delivery_date, created_at
     FROM orders ORDER BY created_at DESC LIMIT 200`
  );
  return res.json({ orders: result.rows });
});

Promise.all([initPostgres(), initMongo()])
  .then(() => {
    app.listen(PORT, () => {
      console.log(`order-service listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize order-service", err);
    process.exit(1);
  });
