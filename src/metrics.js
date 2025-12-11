// src/metrics.js
const axios = require("axios");
const db = require("./db");

// Normalize domain (remove protocol, path, www)
function extractDomain(input) {
  try {
    if (!input.startsWith("http")) {
      input = "https://" + input;
    }
    const url = new URL(input);
    return url.hostname.replace(/^www\./, "");
  } catch (e) {
    // if it's already just a hostname
    return input.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  }
}

async function fetchOpr(domain) {
  const apiKey = process.env.OPR_API_KEY;
  if (!apiKey) throw new Error("OPR_API_KEY missing");

  const resp = await axios.get(
    "https://openpagerank.com/api/v1.0/getPageRank",
    {
      headers: {
        "API-OPR": apiKey
      },
      params: {
        "domains[]": domain
      }
    }
  );

  const data = resp.data;
  if (!data || !data.response || !data.response[0]) {
    throw new Error("Invalid OPR response");
  }

  const item = data.response[0];
  const oprScore = parseFloat(item.page_rank_decimal || item.page_rank || 0);
  return oprScore;
}

// Convert authority_score -> buckets
function calculateBuckets(authorityScore) {
  let trafficBucket;
  if (authorityScore < 10) trafficBucket = "very_low";
  else if (authorityScore < 30) trafficBucket = "low";
  else if (authorityScore < 50) trafficBucket = "medium";
  else if (authorityScore < 75) trafficBucket = "high";
  else trafficBucket = "very_high";

  let keywordsBucket;
  switch (trafficBucket) {
    case "very_low":
      keywordsBucket = "0–100";
      break;
    case "low":
      keywordsBucket = "100–500";
      break;
    case "medium":
      keywordsBucket = "500–2k";
      break;
    case "high":
      keywordsBucket = "2k–10k";
      break;
    case "very_high":
      keywordsBucket = "10k+";
      break;
    default:
      keywordsBucket = "unknown";
  }

  const weightMap = {
    very_low: 1,
    low: 2,
    medium: 3,
    high: 4,
    very_high: 5
  };
  const w = weightMap[trafficBucket] || 1;
  const valueScore = w * (authorityScore > 0 ? 2 : 1); // simple formula

  let valueBucket;
  if (valueScore <= 4) valueBucket = "very_low";
  else if (valueScore <= 8) valueBucket = "low";
  else if (valueScore <= 12) valueBucket = "medium";
  else if (valueScore <= 16) valueBucket = "high";
  else valueBucket = "very_high";

  return { trafficBucket, keywordsBucket, valueBucket };
}

async function getMetricsForDomain(rawDomain) {
  const domain = extractDomain(rawDomain);

  // 1) Check DB first
  const existingRes = await db.query(
    "SELECT * FROM domains WHERE domain = $1",
    [domain]
  );
  if (existingRes.rows.length > 0) {
    const row = existingRes.rows[0];

    const lastFetched = row.last_fetched_at;
    const now = new Date();
    if (lastFetched && (now - lastFetched) < 7 * 24 * 60 * 60 * 1000) {
      return {
        domain,
        authority_score: row.authority_score,
        traffic_bucket: row.traffic_bucket,
        keywords_bucket: row.keywords_bucket,
        value_bucket: row.value_bucket
      };
    }
  }

  // 2) Need fresh data from Open PageRank
  const oprScore = await fetchOpr(domain);
  const authorityScore = Math.round(oprScore * 10); // 0–100

  const {
    trafficBucket,
    keywordsBucket,
    valueBucket
  } = calculateBuckets(authorityScore);

  const now = new Date();

  if (existingRes.rows.length === 0) {
    await db.query(
      `INSERT INTO domains (domain, opr_score, authority_score, traffic_bucket, keywords_bucket, value_bucket, last_fetched_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [domain, oprScore, authorityScore, trafficBucket, keywordsBucket, valueBucket, now]
    );
  } else {
    await db.query(
      `UPDATE domains
         SET opr_score = $2,
             authority_score = $3,
             traffic_bucket = $4,
             keywords_bucket = $5,
             value_bucket = $6,
             last_fetched_at = $7
       WHERE domain = $1`,
      [domain, oprScore, authorityScore, trafficBucket, keywordsBucket, valueBucket, now]
    );
  }

  return {
    domain,
    authority_score: authorityScore,
    traffic_bucket: trafficBucket,
    keywords_bucket: keywordsBucket,
    value_bucket: valueBucket
  };
}

module.exports = {
  getMetricsForDomain
};
