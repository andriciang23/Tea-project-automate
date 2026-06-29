/**
 * Intent matching + reply selection (shared across all channels).
 *
 * Strategy: transparent WHOLE-WORD keyword scoring. Fast, free, predictable, and easy for
 * the shop owner to tune by editing knowledgeBase.js. The Shopify chatbot can layer an LLM
 * on top of this (shopify-chatbot/src/llm.js); this stays the zero-cost fallback.
 *
 * Whole-word matching means a keyword like "hi" matches the word "hi" but NOT "this" or
 * "shipping" — which removes the most common false matches of naive substring matching.
 */

const { intents, fallback, handoffIntent } = require("./knowledgeBase");

function normalize(text) {
  return (text || "").toLowerCase().trim();
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Cache one compiled regex per keyword (keywords are static).
const reCache = new Map();
function keywordRegex(kw) {
  let re = reCache.get(kw);
  if (!re) {
    // Match kw bounded by non-alphanumeric chars (or string ends), case-insensitive.
    // Works for single words ("matcha") and phrases ("how long").
    re = new RegExp(`(^|[^a-z0-9])${escapeRe(kw)}([^a-z0-9]|$)`, "i");
    reCache.set(kw, re);
  }
  return re;
}

function matchesKeyword(msg, kw) {
  return keywordRegex(kw).test(msg);
}

/**
 * Score an intent by its matched keywords. Longer keyword matches count more, so a
 * specific phrase ("what is hojicha") beats an incidental short word ("hi").
 */
function scoreIntent(msg, intent) {
  let score = 0;
  for (const kw of intent.keywords || []) {
    if (matchesKeyword(msg, kw)) score += kw.length;
  }
  return score;
}

/**
 * Decide the reply for an inbound message.
 * @returns {{ intent: string, reply: string, handoff: boolean }}
 */
function getReply(message) {
  const msg = normalize(message);

  if (!msg) {
    return { intent: fallback.name, reply: fallback.reply, handoff: Boolean(fallback.handoff) };
  }

  // An order-number like "#1234" is a strong signal regardless of other words.
  if (/#\s*\d{2,}/.test(msg)) {
    const oi = intents.find((i) => i.name === "order_status");
    if (oi) return { intent: oi.name, reply: oi.reply, handoff: true };
  }

  // Explicit handoff requests (refund, "talk to a human", etc.) win outright.
  if (scoreIntent(msg, handoffIntent) > 0) {
    return { intent: handoffIntent.name, reply: handoffIntent.reply, handoff: true };
  }

  let best = null;
  let bestScore = 0;
  for (const intent of intents) {
    const score = scoreIntent(msg, intent);
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }

  if (best && bestScore > 0) {
    return { intent: best.name, reply: best.reply, handoff: Boolean(best.handoff) };
  }

  return { intent: fallback.name, reply: fallback.reply, handoff: Boolean(fallback.handoff) };
}

module.exports = { getReply, normalize };
