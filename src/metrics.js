import fetch from "node-fetch";

function estimateRisk({ https, redirects }) {
  if (!https) return "high";
  if (redirects > 2) return "medium";
  return "low";
}

async function getDomainAge(domain) {
  try {
    const res = await fetch(`https://${domain}`, { redirect: "follow" });
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
    const res = await fetch(`https://${domain}`, { redirect: "follow" });
    if (!res.ok) return false;

    const html = await res.text();
    if (html.toLowerCase().includes("noindex")) return false;

    return true;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  const domain = req.query.domain;
  if (!domain) {
    return res.status(400).json({ error: "Domain required" });
  }

  // Your existing logic (simulated authority)
  const authority_score = Math.floor(Math.random() * 40) + 20;
  const traffic_bucket = authority_score > 50 ? "high" : "low";
  const keywords_bucket = authority_score > 50 ? "2k-10k" : "100-500";
  const value_bucket = authority_score > 50 ? "low" : "very_low";

  // NEW FREE METRICS
  const domain_age = await getDomainAge(domain);
  const indexable = await isIndexable(domain);

  let redirects = 0;
  let https = true;

  try {
    const r = await fetch(`https://${domain}`, { redirect: "manual" });
    redirects = r.status >= 300 && r.status < 400 ? 1 : 0;
  } catch {
    https = false;
  }

  const risk = estimateRisk({ https, redirects });

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
}
