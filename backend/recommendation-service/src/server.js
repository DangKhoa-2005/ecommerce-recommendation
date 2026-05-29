require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { runSql } = require("./databricks");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 3003);
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || "http://order-service:3002";

function safeText(value) {
  return String(value || "").replace(/'/g, "''");
}

function normalizeProductId(value) {
  return String(value || "").trim();
}

function toList(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => toList(item));
  }

  if (value == null) {
    return [];
  }

  if (typeof value === "string") {
    // First, try to parse as JSON array (Databricks returns JSON strings for arrays)
    if (value.startsWith("[") && value.endsWith("]")) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.flatMap((item) => toList(item));
        }
      } catch (e) {
        // Not valid JSON, fall through to string parsing
      }
    }

    return value
      .split(/[,|]/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return [String(value)];
}


function uniqueBy(items, keyFn) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

function scoreFrom(...values) {
  return Number(
    values
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
      .reduce((sum, value) => sum + value, 0)
      .toFixed(4)
  );
}

async function fetchProductsByCategories(categories, limitPerCategory = 2) {
  // Read real seeded products from order-service so card names/images match Mongo data.
  if (!categories || categories.length === 0) {
    return [];
  }

  try {
    const responses = await Promise.allSettled(
      categories.map((category) =>
        axios.get(`${ORDER_SERVICE_URL}/products`, {
          params: { category }
        })
      )
    );

    const products = [];
    for (const response of responses) {
      if (response.status !== "fulfilled") {
        continue;
      }

      const rows = Array.isArray(response.value.data?.products) ? response.value.data.products : [];
      for (const row of rows.slice(0, limitPerCategory)) {
        products.push({
          _id: String(row._id?.$oid || row._id || ""),
          olist_product_id: normalizeProductId(row.olist_product_id),
          name: row.name,
          category: row.category,
          price: Number(row.price || 0),
          image_url: row.image_url,
          stock: Number(row.stock || 0)
        });
      }
    }

    return products;
  } catch (err) {
    console.warn(`Failed to fetch products from order-service:`, err.message);
    return [];
  }
}

async function fetchProductLookup(categories) {
  const products = await fetchProductsByCategories(categories);
  return new Map(products.map((product) => [normalizeProductId(product.olist_product_id), product]));
}

function buildFallbackProductList() {
  return [
    {
      id: "beebee010000000000000001",
      name: "Xe Đẩy Em Bé Cao Cấp",
      category: "bebes",
      price: 3150000,
      image_url: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=800&auto=format&fit=crop",
      predicted_rating: 4.9
    },
    {
      id: "beebee020000000000000002",
      name: "Camera Trông Bé Thông Minh",
      category: "bebes",
      price: 2190000,
      image_url: "https://images.unsplash.com/photo-1582727468350-4d2d3d75f5f1?q=80&w=800&auto=format&fit=crop",
      predicted_rating: 4.8
    },
    {
      id: "beebee030000000000000003",
      name: "Địu Em Bé Êm Ái",
      category: "bebes",
      price: 890000,
      image_url: "https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?q=80&w=800&auto=format&fit=crop",
      predicted_rating: 4.5
    }
  ];
}

function buildFallbackSimilarProducts() {
  return [
    {
      id: "cool_stuff_001",
      name: "Đèn LED RGB Smart Home",
      category: "cool_stuff",
      price: 450000,
      image_url: "https://images.unsplash.com/photo-1555929902-5261145633bf?q=80&w=800&auto=format&fit=crop",
      lift: 2.5,
      confidence: 0.35
    },
    {
      id: "bebes_001",
      name: "Gối Lót An Toàn Cho Bé",
      category: "bebes",
      price: 320000,
      image_url: "https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?q=80&w=800&auto=format&fit=crop",
      lift: 1.8,
      confidence: 0.28
    },
    {
      id: "brinquedos_001",
      name: "Bộ Đồ Chơi Xây Dựng Khổng Lồ",
      category: "brinquedos",
      price: 890000,
      image_url: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?q=80&w=800&auto=format&fit=crop",
      lift: 2.1,
      confidence: 0.32
    }
  ];
}

function buildFallbackCategoryAssociations(category) {
  if (category === "cama_mesa_banho") {
    return [
      {
        antecedent: ["cama_mesa_banho"],
        consequent: ["moveis_decoracao"],
        confidence: 0.4943,
        lift: 3.45,
        support: 0.00357
      },
      {
        antecedent: ["cama_mesa_banho"],
        consequent: ["casa_conforto"],
        confidence: 0.4211,
        lift: 2.9804,
        support: 0.0031
      }
    ];
  }

  return [
    {
      antecedent: [category],
      consequent: ["moveis_decoracao"],
      confidence: 0.35,
      lift: 2.1,
      support: 0.002
    }
  ];
}

function isHybridMode(req) {
  return String(req.query.mode || "").toLowerCase() === "hybrid";
}

function buildHybridRuleSql(categories) {
  const predicates = categories
    .map((category) => {
      const term = safeText(category).toLowerCase();
      return `lower(CAST(antecedent AS STRING)) LIKE '%${term}%' OR lower(CAST(consequent AS STRING)) LIKE '%${term}%'`;
    })
    .filter(Boolean);

  if (!predicates.length) {
    return null;
  }

  return `
    SELECT antecedent, consequent, confidence, lift, support
    FROM workspace.default.reco_fp_growth_rules
    WHERE ${predicates.join(" OR ")}
    ORDER BY confidence DESC, lift DESC
    LIMIT 20
  `;
}

function normalizeRuleRowCategories(row) {
  return uniqueBy([...toList(row.antecedent), ...toList(row.consequent)], (value) => String(value || "").trim()).filter(Boolean);
}

async function buildHybridUserPayload(localUserId) {
  const cfSql = `
    SELECT
      cf.customer_unique_id,
      cf.product_id,
      cf.purchase_count,
      cbf.product_category_name
    FROM workspace.default.reco_cf_interactions cf
    LEFT JOIN workspace.default.reco_cbf_features cbf
      ON cf.product_id = cbf.product_id
    WHERE cf.customer_unique_id = '${OLIST_CUSTOMER_ID}'
    ORDER BY cf.purchase_count DESC
    LIMIT 10
  `;

  const cfRows = await runSql(cfSql);
  if (!cfRows.length) {
    throw new Error("Empty CF result");
  }

  const cfCategories = [...new Set(cfRows.map((row) => String(row.product_category_name || "").trim()).filter(Boolean))];
  const productLookup = await fetchProductLookup(cfCategories);

  const directProducts = uniqueBy(
    cfRows
      .map((row) => {
        const productId = normalizeProductId(row.product_id);
        const product = productLookup.get(productId);

        if (!product) {
          return null;
        }

        return {
          id: String(product._id || productId),
          product_id: productId,
          name: product.name,
          category: product.category,
          price: Number(product.price || 0),
          stock: Number(product.stock || 0),
          image_url: product.image_url,
          recommendation_type: "collaborative_filtering",
          score: scoreFrom(row.purchase_count, 10),
          source_category: row.product_category_name || product.category,
          support: Number(row.purchase_count || 0)
        };
      })
      .filter(Boolean),
    (item) => item.product_id
  );

  const ruleSql = buildHybridRuleSql(cfCategories);
  const ruleRows = ruleSql ? await runSql(ruleSql) : [];

  const signalByCategory = new Map();
  for (const row of ruleRows) {
    const categories = normalizeRuleRowCategories(row).filter((category) => !cfCategories.includes(category));
    for (const category of categories) {
      const current = signalByCategory.get(category);
      const candidate = {
        confidence: Number(row.confidence || 0),
        lift: Number(row.lift || 0),
        support: Number(row.support || 0)
      };

      if (!current || candidate.confidence > current.confidence || candidate.lift > current.lift) {
        signalByCategory.set(category, candidate);
      }
    }
  }

  const relatedCategories = [...signalByCategory.keys()];
  const relatedProducts = [];

  if (relatedCategories.length) {
    const relatedLookup = await fetchProductLookup(relatedCategories);
    const productsByCategory = new Map();

    for (const category of relatedCategories) {
      const response = await axios.get(`${ORDER_SERVICE_URL}/products`, {
        params: { category },
        timeout: 10000
      });

      productsByCategory.set(category, response.data?.products || []);
    }

    for (const category of relatedCategories) {
      const signal = signalByCategory.get(category) || { confidence: 0, lift: 0, support: 0 };
      const categoryProducts = productsByCategory.get(category) || [];

      for (const product of categoryProducts.slice(0, 3)) {
        const productId = normalizeProductId(product.olist_product_id);
        const lookupProduct = relatedLookup.get(productId) || product;

        relatedProducts.push({
          id: String(lookupProduct._id || productId),
          product_id: productId,
          name: lookupProduct.name,
          category: lookupProduct.category,
          price: Number(lookupProduct.price || 0),
          stock: Number(lookupProduct.stock || 0),
          image_url: lookupProduct.image_url,
          recommendation_type: "association_rules",
          score: scoreFrom(signal.confidence * 100, signal.lift * 10),
          source_category: category,
          reason: signal
        });
      }
    }
  }

  const data = uniqueBy([...directProducts, ...relatedProducts], (item) => item.product_id).sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return String(left.name || "").localeCompare(String(right.name || ""), "vi");
  });

  return {
    source: "databricks_hybrid",
    user: { local_id: localUserId, olist_id: OLIST_CUSTOMER_ID },
    data,
    signal: {
      cf_categories: cfCategories,
      related_categories: relatedCategories
    }
  };
}

app.get("/health", (_req, res) => {
  const databricksEnabled = Boolean(
    process.env.DATABRICKS_HOST && process.env.DATABRICKS_TOKEN && process.env.DATABRICKS_WAREHOUSE_ID
  );

  return res.json({
    service: "recommendation-service",
    status: "ok",
    databricks_enabled: databricksEnabled
  });
});

const OLIST_CUSTOMER_ID = "dc813062e0fc23409cd255f7f53c7074";

app.get("/recommendations/user/:userId", async (req, res) => {
  const localUserId = req.params.userId;

  if (isHybridMode(req)) {
    try {
      const payload = await buildHybridUserPayload(localUserId);
      return res.json(payload);
    } catch (err) {
      return res.json({
        source: "mock_demo_hybrid",
        warning: `Fallback logic invoked (${err.message})`,
        user: { local_id: localUserId, olist_id: OLIST_CUSTOMER_ID },
        data: [...buildFallbackProductList(), ...buildFallbackSimilarProducts()],
        signal: {
          cf_categories: ["bebes"],
          related_categories: ["moveis_decoracao"]
        }
      });
    }
  }

  const cfSql = `
    SELECT
      cf.customer_unique_id,
      cf.product_id,
      cf.purchase_count AS predicted_rating,
      cbf.product_category_name
    FROM workspace.default.reco_cf_interactions cf
    LEFT JOIN workspace.default.reco_cbf_features cbf
      ON cf.product_id = cbf.product_id
    WHERE cf.customer_unique_id = '${OLIST_CUSTOMER_ID}'
    ORDER BY cf.purchase_count DESC
    LIMIT 5
  `;

  try {
    let recommendations = [];
    if (process.env.DATABRICKS_HOST) {
      const rows = await runSql(cfSql);
      const categories = [...new Set(rows.map((row) => String(row.product_category_name || "").trim()).filter(Boolean))];
      const productLookup = await fetchProductLookup(categories);

      recommendations = rows
        .map((row) => {
          const productId = normalizeProductId(row.product_id);
          const product = productLookup.get(productId);

          if (!product) {
            return null;
          }

          return {
            id: String(product._id || productId),
            product_id: productId,
            name: product.name,
            category: product.category,
            price: Number(product.price || 0),
            stock: Number(product.stock || 0),
            image_url: product.image_url,
            predicted_rating: Number(row.predicted_rating || row.purchase_count || 0),
            recommendation_type: "collaborative_filtering"
          };
        })
        .filter(Boolean);
    } else {
      throw new Error("No databricks config");
    }

    if (!recommendations.length) {
      throw new Error("Empty DB result");
    }

    return res.json({
      source: "databricks_cf",
      user: { local_id: localUserId, olist_id: OLIST_CUSTOMER_ID },
      data: recommendations
    });
  } catch (err) {
    return res.json({
      source: "mock_demo_cf",
      warning: `Fallback logic invoked (${err.message})`,
      user: { local_id: localUserId, olist_id: OLIST_CUSTOMER_ID },
      data: buildFallbackProductList()
    });
  }
});

app.get("/recommendations/hybrid/user/:userId", async (req, res) => {
  const localUserId = req.params.userId;

  try {
    const payload = await buildHybridUserPayload(localUserId);
    return res.json(payload);
  } catch (err) {
    return res.json({
      source: "mock_demo_hybrid",
      warning: `Fallback logic invoked (${err.message})`,
      user: { local_id: localUserId, olist_id: OLIST_CUSTOMER_ID },
      data: [...buildFallbackProductList(), ...buildFallbackSimilarProducts()],
      signal: {
        cf_categories: ["bebes"],
        related_categories: ["moveis_decoracao"]
      }
    });
  }
});

app.get("/recommendations/home/:userId", async (req, res) => {
  const localUserId = req.params.userId;
  const olistCustomerId = req.query.olist_customer_id || OLIST_CUSTOMER_ID;
  const cart = toList(req.query.cart || req.query.cart_product_ids || "");

  try {
    // 1) ALS precomputed recommendations (if table exists)
    let alsRows = [];
    try {
      const alsSql = "SELECT product_id, score FROM workspace.default.reco_als_user_recs WHERE customer_unique_id = '" + safeText(olistCustomerId) + "' ORDER BY score DESC LIMIT 50";
      alsRows = await runSql(alsSql);
    } catch (e) {
      alsRows = [];
    }

    // 2) Item-neighbors for current cart (precomputed table)
    let neighborRows = [];
    if (cart.length) {
      try {
        const inList = cart.map((c) => "'" + safeText(c) + "'").join(',');
        const neighSql = "SELECT product_id, neighbor_id, similarity FROM workspace.default.reco_item_neighbors WHERE product_id IN (" + inList + ") ORDER BY similarity DESC LIMIT 200";
        neighborRows = await runSql(neighSql);
      } catch (e) {
        neighborRows = [];
      }
    }

    // 3) Merge signals into scores
    const scores = new Map();
    for (const r of alsRows) {
      const pid = normalizeProductId(r.product_id);
      if (!pid) continue;
      scores.set(pid, (scores.get(pid) || 0) + Number(r.score || r.predicted_rating || 0));
    }
    for (const r of neighborRows) {
      const nid = normalizeProductId(r.neighbor_id || r[1] || r.neighbor_id);
      if (!nid) continue;
      const sim = Number(r.similarity || r.confidence || r.lift || 0);
      // weight neighbors from cart higher
      scores.set(nid, (scores.get(nid) || 0) + sim * 2.0);
    }

    // 4) Fallback to CF interactions if empty
    if (scores.size === 0) {
      try {
        const cfSql = "SELECT cf.product_id, cf.purchase_count FROM workspace.default.reco_cf_interactions cf WHERE cf.customer_unique_id = '" + safeText(olistCustomerId) + "' ORDER BY cf.purchase_count DESC LIMIT 20";
        const cfRows = await runSql(cfSql);
        for (const r of cfRows) {
          const pid = normalizeProductId(r.product_id);
          if (!pid) continue;
          scores.set(pid, (scores.get(pid) || 0) + Number(r.purchase_count || 0));
        }
      } catch (e) {
        // ignore
      }
    }

    // 5) Candidates ordered by score, exclude cart items
    const candidateIds = [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id)
      .filter((id) => !cart.includes(id))
      .slice(0, 20);

    // helper: fetch product docs by id
    async function fetchProductsByIds(ids) {
      const responses = await Promise.allSettled(
        ids.map((id) => axios.get(ORDER_SERVICE_URL + "/products/" + id, { timeout: 10000 }))
      );
      const out = [];
      for (const r of responses) {
        if (r.status === "fulfilled") {
          const data = r.value.data;
          const prod = data.product || (Array.isArray(data.products) && data.products[0]) || null;
          if (prod) {
            out.push({
              _id: String(prod._id?.$oid || prod._id || ""),
              olist_product_id: normalizeProductId(prod.olist_product_id),
              name: prod.name,
              category: prod.category,
              price: Number(prod.price || 0),
              image_url: prod.image_url,
              stock: Number(prod.stock || 0)
            });
          }
        }
      }
      return out;
    }

    // 6) Fetch product docs for top candidates
    let products = await fetchProductsByIds(candidateIds.slice(0, 12));

    // 7) If not enough, fill using cart categories or CF categories
    if (products.length < 4) {
      const cats = [];
      for (const pid of cart) {
        try {
          const r = await axios.get(ORDER_SERVICE_URL + "/products/" + pid, { timeout: 10000 });
          const p = r.data.product || r.data.data || null;
          if (p && p.category) cats.push(p.category);
        } catch (e) {
          // ignore
        }
      }

      if (!cats.length) {
        try {
          const catSql = "SELECT DISTINCT cbf.product_category_name FROM workspace.default.reco_cf_interactions cf LEFT JOIN workspace.default.reco_cbf_features cbf ON cf.product_id = cbf.product_id WHERE cf.customer_unique_id = '" + safeText(olistCustomerId) + "' LIMIT 5";
          const rows = await runSql(catSql);
          for (const r of rows) if (r.product_category_name) cats.push(r.product_category_name);
        } catch (e) {
          // ignore
        }
      }

      for (const cat of cats) {
        if (products.length >= 4) break;
        const more = await fetchProductsByCategories([cat], 6);
        for (const m of more) {
          const pid = normalizeProductId(m.olist_product_id);
          if (!pid || products.find((x) => x.olist_product_id === pid) || cart.includes(pid)) continue;
          products.push(m);
          if (products.length >= 4) break;
        }
      }
    }

    products = products.slice(0, 4);

    const final = products.map((p) => ({
      id: String(p._id || ""),
      product_id: p.olist_product_id,
      name: p.name,
      category: p.category,
      price: Number(p.price || 0),
      image_url: p.image_url,
      recommendation_type: "home_personalized",
      score: Number(scores.get(p.olist_product_id) || scores.get(p._id) || 0)
    }));

    return res.json({
      source: "databricks_home",
      user: { local_id: localUserId, olist_id: olistCustomerId },
      data: final
    });
  } catch (err) {
    console.error("Home rec error:", err.message);
    return res.json({
      source: "mock_home",
      warning: `Fallback logic invoked (${err.message})`,
      user: { local_id: localUserId, olist_id: olistCustomerId },
      data: buildFallbackProductList()
    });
  }
});

app.get("/recommendations/product/:productId", async (req, res) => {
  const originalProductId = req.params.productId;

  try {
    let productCategory = null;

    // Step 1: Try to fetch product category from order-service first
    try {
      const response = await axios.get(`${ORDER_SERVICE_URL}/products/${originalProductId}`, {
        timeout: 10000
      });
      const product = response.data?.product || response.data?.data;
      if (product && product.category) {
        productCategory = safeText(product.category).toLowerCase();
      }
    } catch (orderServiceErr) {
      console.warn(`Order-service failed for product ${originalProductId}, trying Databricks...`);
    }

    // Step 2: If order-service failed, try to get category from Databricks
    if (!productCategory) {
      const cbfSql = `
        SELECT DISTINCT product_category_name
        FROM workspace.default.reco_cbf_features
        WHERE product_id = '${safeText(originalProductId)}'
        LIMIT 1
      `;
      const cbfRows = await runSql(cbfSql);
      if (cbfRows && cbfRows.length > 0) {
        productCategory = safeText(cbfRows[0].product_category_name).toLowerCase();
      }
    }

    if (!productCategory) {
      throw new Error("Product category not found in both order-service and Databricks");
    }

    // Step 3: Query Association Rules with LIFT > 1.0 (original threshold)
    const arSql = `
      SELECT antecedent, consequent, lift, confidence, support
      FROM workspace.default.reco_fp_growth_rules
      WHERE (lower(CAST(antecedent AS STRING)) LIKE '%${productCategory}%' 
         OR lower(CAST(consequent AS STRING)) LIKE '%${productCategory}%')
        AND lift > 1.0
      ORDER BY lift DESC, confidence DESC
      LIMIT 20
    `;

    const rows = await runSql(arSql);
    
    // If AR rules found, use them
    if (rows.length > 0) {
      // Step 4: Extract related categories
      const categories = uniqueBy(
        rows.flatMap((row) => {
          const categories = normalizeRuleRowCategories(row);
          return categories.filter((cat) => cat.toLowerCase() !== productCategory);
        }),
        (value) => value.toLowerCase()
      );

      // Step 5: Fetch products from related categories (fetch more items per category)
      const products = await fetchProductsByCategories(categories, 6);
      const productsByCategory = new Map();
      for (const prod of products) {
        const list = productsByCategory.get(prod.category) || [];
        list.push(prod);
        productsByCategory.set(prod.category, list);
      }

      // Step 6: Build recommendation list - allocate up to 4 items total
      const MAX_RECS = 4;
      const PER_CATEGORY_LIMIT = 2;

      // Aggregate best signal per related category
      const signalByCategory = new Map();
      for (const row of rows) {
        const rowCategories = normalizeRuleRowCategories(row).filter((cat) => cat.toLowerCase() !== productCategory);
        for (const category of rowCategories) {
          const candidate = {
            confidence: Number(row.confidence || 0),
            lift: Number(row.lift || 0),
            support: Number(row.support || 0)
          };
          const current = signalByCategory.get(category);
          if (!current || candidate.lift > current.lift || (candidate.lift === current.lift && candidate.confidence > current.confidence)) {
            signalByCategory.set(category, candidate);
          }
        }
      }

      const relatedCategoriesSorted = [...signalByCategory.keys()].sort((a, b) => {
        const A = signalByCategory.get(a) || { lift: 0, confidence: 0 };
        const B = signalByCategory.get(b) || { lift: 0, confidence: 0 };
        if (B.lift !== A.lift) return B.lift - A.lift;
        return B.confidence - A.confidence;
      });

      const selected = [];
      const selectedIds = new Set();
      const categoryCounts = new Map();

      for (const category of relatedCategoriesSorted) {
        if (selected.length >= MAX_RECS) break;
        const catProducts = productsByCategory.get(category) || [];
        for (const prod of catProducts) {
          if (selected.length >= MAX_RECS) break;
          const pid = normalizeProductId(prod.olist_product_id);
          if (!pid || pid === normalizeProductId(originalProductId) || selectedIds.has(pid)) continue;
          const cnt = categoryCounts.get(category) || 0;
          if (cnt >= PER_CATEGORY_LIMIT) break;
          const sig = signalByCategory.get(category) || { confidence: 0, lift: 0, support: 0 };
          selected.push({
            id: String(prod._id || pid),
            product_id: pid,
            name: prod.name,
            category: prod.category,
            price: Number(prod.price || 0),
            stock: Number(prod.stock || 0),
            image_url: prod.image_url,
            recommendation_type: "association_rules",
            lift: sig.lift,
            confidence: sig.confidence,
            support: sig.support
          });
          selectedIds.add(pid);
          categoryCounts.set(category, cnt + 1);
        }
      }

      // Fill from same category if not enough
      if (selected.length < MAX_RECS) {
        const sameProducts = await fetchProductsByCategories([productCategory], MAX_RECS + 2);
        for (const prod of sameProducts) {
          if (selected.length >= MAX_RECS) break;
          const pid = normalizeProductId(prod.olist_product_id);
          if (!pid || pid === normalizeProductId(originalProductId) || selectedIds.has(pid)) continue;
          selected.push({
            id: String(prod._id || pid),
            product_id: pid,
            name: prod.name,
            category: prod.category,
            price: Number(prod.price || 0),
            stock: Number(prod.stock || 0),
            image_url: prod.image_url,
            recommendation_type: "top_products_same_category",
            lift: 0,
            confidence: 0,
            support: 0
          });
          selectedIds.add(pid);
        }
      }

      const similar = selected.sort((left, right) => {
        if (right.lift !== left.lift) return right.lift - left.lift;
        if (right.confidence !== left.confidence) return right.confidence - left.confidence;
        return String(left.name || "").localeCompare(String(right.name || ""), "vi");
      });

      if (similar.length > 0) {
        return res.json({
          source: "databricks_ar",
          product_id: originalProductId,
          product_category: productCategory,
          data: similar
        });
      }
    }

    // If no AR rules found, fallback to top 3 products from the same category
    console.warn(`No AR rules found for category ${productCategory}, fetching top products from same category`);
    const topProducts = (await fetchProductsByCategories([productCategory], 3)).slice(0, 3).map((prod) => ({
      id: String(prod._id || normalizeProductId(prod.olist_product_id)),
      product_id: normalizeProductId(prod.olist_product_id),
      name: prod.name,
      category: prod.category,
      price: Number(prod.price || 0),
      stock: Number(prod.stock || 0),
      image_url: prod.image_url,
      recommendation_type: "top_products_same_category",
      lift: 0.8,
      confidence: 0.6,
      support: 0.01
    }));

    if (topProducts.length > 0) {
      return res.json({
        source: "mongo_top_products",
        product_id: originalProductId,
        product_category: productCategory,
        data: topProducts
      });
    }

    throw new Error("No recommendations found for this category");
  } catch (err) {
    console.error(`AR recommendation error for ${originalProductId}:`, err.message);
    return res.json({
      source: "mock_demo_ar",
      warning: `Fallback logic invoked (${err.message})`,
      product_id: originalProductId,
      data: buildFallbackSimilarProducts()
    });
  }
});

// Helper function to build image URL based on category
function buildImageUrlForCategory(category) {
  const categoryImageMap = {
    'casa_conforto': 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?q=80&w=800&auto=format&fit=crop',
    'cama_mesa_banho': 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?q=80&w=800&auto=format&fit=crop',
    'cool_stuff': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop',
    'bebes': 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?q=80&w=800&auto=format&fit=crop',
    'brinquedos': 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?q=80&w=800&auto=format&fit=crop',
    'telefonia': 'https://images.unsplash.com/photo-1511707267537-b85faf00021e?q=80&w=800&auto=format&fit=crop',
    'ferramentas_jardim': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800&auto=format&fit=crop',
    'acessorios': 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=800&auto=format&fit=crop',
    'informatica_acessorios': 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=800&auto=format&fit=crop',
    'papelaria': 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=800&auto=format&fit=crop',
    'esporte_lazer': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=800&auto=format&fit=crop'
  };

  return categoryImageMap[category] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop';
}

app.get("/recommendations/category/:category", async (req, res) => {
  const category = safeText(req.params.category);

  const rulesSql = `
    SELECT
      antecedent,
      consequent,
      confidence,
      lift,
      support,
      CASE
        WHEN lower(CAST(antecedent AS STRING)) LIKE '%${category}%'
          THEN consequent
        ELSE antecedent
      END AS related_category
    FROM workspace.default.reco_fp_growth_rules
    WHERE lower(CAST(antecedent AS STRING)) LIKE '%${category}%'
       OR lower(CAST(consequent AS STRING)) LIKE '%${category}%'
    ORDER BY confidence DESC, lift DESC
    LIMIT 20
  `;

  try {
    let rows = [];
    if (process.env.DATABRICKS_HOST) {
      rows = await runSql(rulesSql);
    } else {
      throw new Error("No databricks config");
    }

    if (!rows.length) {
      throw new Error("Empty association result");
    }

    const normalized = rows.map((row) => {
      const antecedentStr = String(row.antecedent || "").toLowerCase();
      const target = category.toLowerCase();
      const appearsInAntecedent = antecedentStr.includes(target);

      return {
        ...row,
        anchor_category: category,
        related_category: appearsInAntecedent ? row.consequent : row.antecedent,
        direction: appearsInAntecedent ? "anchor_to_related" : "related_to_anchor"
      };
    });

    return res.json({
      source: "databricks_gold_rules",
      category,
      data: normalized
    });
  } catch (err) {
    return res.json({
      source: "mock_gold_rules",
      warning: `Fallback logic invoked (${err.message})`,
      category,
      data: buildFallbackCategoryAssociations(category)
    });
  }
});

app.listen(PORT, () => {
  console.log(`recommendation-service listening on port ${PORT}`);
});
