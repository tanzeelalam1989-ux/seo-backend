// src/index.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { getMetricsForDomain } = require("./metrics");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";

app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

// Simple health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "SEO Backend running" });
});

// Main metrics endpoint
app.get("/metrics", async (req, res) => {
  const { domain } = req.query;
  if (!domain) {
    return res.status(400).json({ error: "domain is required" });
  }

  try {
    const data = await getMetricsForDomain(domain);
    res.json(data);
  } catch (err) {
    console.error("Error in /metrics:", err.message);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
