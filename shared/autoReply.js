/**
 * Intent matching + reply selection (shared across all channels).
 *
 * Strategy: simple, transparent keyword scoring. It's fast, free, predictable, and easy
 * for the shop owner to tune by editing knowledgeBase.js. The Shopify chatbot can layer
 * an LLM on top of this (see shopify-chatbot/src/llm.js); this remains the zero-cost,
 * always-available fallback.
 */

const { intents, fallback, handoffIntent } = require("./knowledgeBase");

function normalize(text) {
  return (text || "").toLowerCase().trim();
}

/**
 * Score an intent by how many of its keywords appear in the message.
 * Longer keyword matches count more (so "what is hojicha" beats a stray "hi").
 */
function scoreIntent(msg, intent) {
  let score = 0;
  for (const kw of intent.keywords || []) {
    if (msg.includes(kw)) score += kw.length;
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
    return { intent: fallback.name, reply: fallback.reply, handoff: true };
  }

  // Explicit handoff requests win outright.
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

  return { intent: fallback.name, reply: fallback.reply, handoff: true };
}

module.exports = { getReply, normalize };
