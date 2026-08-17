// /api/state — the shared backend for the Charger Manufacturing Line dashboard.
//
// GET  -> returns the current saved dashboard state as JSON (or {savedAt:0} if
//         nothing has been saved yet, so the page falls back to its baked-in data).
// PUT  -> body is the dashboard's full state (same shape the "Save shareable
//         HTML" button already produces); it's stored as the new shared copy.
//
// Storage: a single key in an Upstash Redis database, connected through the
// Vercel Marketplace "Upstash for Redis" integration. That integration injects
// the URL/token as environment variables automatically — this file checks both
// naming conventions Vercel has used for that (KV_REST_API_* and
// UPSTASH_REDIS_REST_*) so it works regardless of which one your integration set.
//
// No npm packages required — this talks to Upstash's plain REST API directly,
// so there's nothing to `npm install` and nothing that can go out of date.

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const STATE_KEY = "cml-dashboard:state";

async function redisCommand(command) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error(
      "Redis isn't configured. In your Vercel project, add the 'Upstash for Redis' " +
      "integration from the Marketplace, then redeploy."
    );
  }
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Redis request failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data.result;
}

module.exports = async (req, res) => {
  // Same-origin by default (the dashboard and this function are deployed
  // together), but these headers make it harmless to call from elsewhere too.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    if (req.method === "GET") {
      const raw = await redisCommand(["GET", STATE_KEY]);
      if (!raw) {
        res.status(200).json({ savedAt: 0 });
        return;
      }
      // Stored as a JSON string; parse it back into the real object.
      res.status(200).json(JSON.parse(raw));
      return;
    }

    if (req.method === "PUT" || req.method === "POST") {
      // Vercel's Node runtime parses a JSON request body into req.body for
      // Content-Type: application/json automatically.
      const body = req.body;
      if (!body || typeof body !== "object" || !body.savedAt) {
        res.status(400).json({ error: "Expected a dashboard state object with a savedAt field." });
        return;
      }
      await redisCommand(["SET", STATE_KEY, JSON.stringify(body)]);
      res.status(200).json({ ok: true, savedAt: body.savedAt });
      return;
    }

    res.status(405).json({ error: "Use GET to read or PUT to save." });
  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
};
