require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
app.use(cors());

const PORT = Number(process.env.PORT || 3000);
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://user-service:3001";
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || "http://order-service:3002";
const RECOMMENDATION_SERVICE_URL =
  process.env.RECOMMENDATION_SERVICE_URL || "http://recommendation-service:3003";

app.get("/health", (_req, res) => {
  res.json({
    service: "api-gateway",
    status: "ok",
    routes: {
      users: "/api/users/*",
      orders: "/api/orders/*",
      recommendations: "/api/recommendations/*"
    }
  });
});

app.use("/api/users", createProxyMiddleware({ target: USER_SERVICE_URL, changeOrigin: true, pathRewrite: { "^/": "/users/" } }));
app.use("/api/orders", createProxyMiddleware({ target: ORDER_SERVICE_URL, changeOrigin: true, pathRewrite: { "^/": "/orders/" } }));

app.get("/api/products/:id", async (req, res) => {
  try {
    const response = await axios.get(`${ORDER_SERVICE_URL}/products/${req.params.id}`, {
      timeout: 10000
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ message: error.message || "Proxy error" });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const response = await axios.get(`${ORDER_SERVICE_URL}/products`, {
      params: req.query,
      timeout: 10000
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ message: error.message || "Proxy error" });
  }
});

app.use("/api/products", createProxyMiddleware({ target: ORDER_SERVICE_URL, changeOrigin: true, pathRewrite: { "^/api/products": "/products" } }));
app.use("/api/recommendations", createProxyMiddleware({ target: RECOMMENDATION_SERVICE_URL, changeOrigin: true, pathRewrite: { "^/": "/recommendations/" } }));

app.listen(PORT, () => {
  console.log(`api-gateway listening on port ${PORT}`);
});
