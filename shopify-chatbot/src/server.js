/**
 * HojichaYa Shopify storefront chatbot — backend.
 *
 *   POST /chat   { message, history? }  ->  { reply, intent?, handoff?, source }
 *   GET  /health                         ->  { ok, mode }
 *   GET  /widget.js, /widget.css         ->  the embeddable widget assets
 *
 * Uses Claude (LLM mode) when ANTHROPIC_API_KEY is set, otherwise the free keyword
 * matcher from ../../shared. Either way the FAQ lives in ../../shared/knowledgeBase.js.
 */

require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const { getReply } = require("../../shared/autoReply");

const PORT = process.env.PORT || 3100;
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT_PER_MIN || "20", 10);
const LLM_ENABLED = Boolean(process.env.ANTHROPIC_API_KEY);

// Lazy-load the LLM module only when a key is present (keeps fallback dependency-light).
let getLlmReply = null;
let MODEL = null;
if (LLM_ENABLED) {
  ({ getLlmReply, MODEL } = require("./llm"));
}

const app = express();
app.use(express.json({ limit: "32kb" }));

// --- CORS: restrict to your storefront origins ---
const origins = (process.env.ALLOWED_ORIGINS || "https://hojichaya.com")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allowAll = origins.includes("*");
app.use(
  cors({
    origin: allowAll ? true : origins,
    methods: ["POST", "GET", "OPTIONS"],
  })
);
if (allowAll) console.warn("⚠ ALLOWED_ORIGINS is '*': any site can call this bot. Restrict it in production.");

// --- Tiny in-memory per-IP rate limiter (caps cost/abuse) ---
const hits = new Map(); // ip -> { count, resetAt }
function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  rec.count += 1;
  return rec.count > RATE_LIMIT;
}
// Occasional cleanup so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of hits) if (now > rec.resetAt) hits.delete(ip);
}, 5 * 60_000).unref();

app.use("/", express.static(path.join(__dirname, "..", "public")));

app.get("/health", (_req, res) => res.json({ ok: true, mode: LLM_ENABLED ? `llm:${MODEL}` : "keyword" }));

app.post("/chat", async (req, res) => {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.ip;
  if (rateLimited(ip)) {
    return res.status(429).json({
      reply: "You're sending messages a little fast — please wait a moment and try again. 🍵",
    });
  }

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  if (!message) return res.status(400).json({ reply: "Please type a message." });

  // Keyword pass first — it also tells us if this should flag a human handoff.
  const kw = getReply(message);

  if (LLM_ENABLED) {
    try {
      const { reply, source } = await getLlmReply(message, history);
      return res.json({ reply, handoff: kw.handoff, source });
    } catch (err) {
      console.error("LLM error, falling back to keyword reply:", err.message);
      // Graceful degradation: never leave the customer without an answer.
      return res.json({ reply: kw.reply, intent: kw.intent, handoff: kw.handoff, source: "keyword-fallback" });
    }
  }

  return res.json({ reply: kw.reply, intent: kw.intent, handoff: kw.handoff, source: "keyword" });
});

app.listen(PORT, () => {
  console.log(`HojichaYa chatbot on :${PORT} (mode: ${LLM_ENABLED ? `LLM ${MODEL}` : "keyword-only"})`);
});

module.exports = app;
