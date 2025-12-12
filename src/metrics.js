const fetch = require("node-fetch");

function estimateRisk({ https, redirects, indexable }) {
  let score = 0;
  if (!https) score += 3;
  if (redirects > 1) score += 1;
  if (indexable === false) score += 2;

  if (score <= 1) return "low";
  if (score <= 3) return "medium";
  return "high";
}

async function getDomainAge(domain) {
  try {
    const res = await fetch(`https://${domain}/`, { redirect: "follow" });
    const date = res.headers.get("date");
    if (!date) return null;

    const years = Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * 365)
    );

    return years > 0 ? `${years}y` : "<1y";
  } catch {
    return null;
  }
}

async function isIndexable(domain) {
  try {
    const res = await fetch(`https://${domain}/`, { redirect: "follow" });
    if (!res.ok) return false;

    const xRobots = (res.headers.get("x-robots-tag") || "").toLowerCase();
    if (xRobots.includes("noindex")) return false;

    const html = (await res.text()).toLowerCase();
    if (html.includes('name="robots"') && html.includes("noindex")) return false;

    return true;
  } catch {
    return false;
  }
}

async function metricsHandler(req, res) {
  try {
    const domainRaw = req.query.domain;
    if (!domainRaw) return res.status(400).json({ error: "domain is required" });

    const domain = String(domainRaw)
      .replace(/^https?:\/\//i, "")
      .split("/")[0]
      .replace(/^www\./i, "");

    // Existing “demo” metrics
    const authority_score = Math.floor(Math.random() * 40) + 20;
    const traffic_bucket = authority_score > 50 ? "high" : "low";
    const keywords_bucket = authority_score > 50 ? "2k-10k" : "100-500";
    const value_bucket = authority_score > 50 ? "low" : "very_low";

    const [domain_age, indexable] = await Promise.all([
      getDomainAge(domain),
      isIndexable(domain)
    ]);

    let redirects = 0;
    let https = true;

    try {
      const r = await fetch(`https://${domain}/`, { redirect: "manual" });
      redirects = r.status >= 300 && r.status < 400 ? 1 : 0;
    } catch {
      https = false;
    }

    const risk = estimateRisk({ https, redirects, indexable });

    return res.json({
      domain,
      authority_score,
      traffic_bucket,
      keywords_bucket,
      value_bucket,
      domain_age,
      indexable,
      risk
    });
  } catch (e) {
    return res.status(500).json({ error: "Failed to fetch metrics" });
  }
}

module.exports = { metricsHandler };
