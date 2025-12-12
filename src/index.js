import express from "express";
import cors from "cors";
import { metricsHandler } from "./metrics.js";

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "SEO Backend running" });
});

app.get("/metrics", metricsHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
