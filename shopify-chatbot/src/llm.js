/**
 * LLM-backed answering for the Shopify chatbot, using the official Anthropic SDK.
 *
 * Grounded in the shared FAQ knowledge base + the product catalog so answers stay
 * accurate and on-brand. If no ANTHROPIC_API_KEY is configured, callers should use the
 * keyword matcher in ../../shared/autoReply.js instead — this module is only loaded when
 * the key exists.
 */

const Anthropic = require("@anthropic-ai/sdk");
const { intents, SITE } = require("../../shared/knowledgeBase");
const { catalogText } = require("./productCatalog");

const MODEL = process.env.CHATBOT_MODEL || "claude-opus-4-8";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

// Distil the FAQ intents into reference facts for the system prompt.
const faqText = intents
  .map((i) => `- ${i.name}: ${i.reply.replace(/\s+/g, " ").trim()}`)
  .join("\n");

const SYSTEM_PROMPT = `You are the friendly support assistant for HojichaYa (${SITE}), an
authentic Japanese tea shop based in Malaysia (prices in MYR / RM). You answer customer
questions on the website chat widget.

Voice: warm, knowledgeable and calm — like a tea sommelier. Concise: 1–3 short sentences,
chat-style. You may use a single tea emoji occasionally. Reply in the customer's language
(English or Malay) when it's clear.

Product catalog (treat prices as "from" / indicative — point to the live product page for
the current price; never invent products, prices, or stock you weren't given):
${catalogText()}

Reference FAQ (use these facts; rephrase naturally):
${faqText}

Rules:
- Only answer about HojichaYa, its teas, orders, shipping, brewing, wholesale, and similar.
  Politely decline unrelated topics and steer back to tea.
- Never invent order details, tracking, stock levels, exact prices, or shipping dates you
  weren't given. If unsure, say so and offer to connect a human.
- For order status, refunds/returns, complaints, or wholesale enquiries, tell the customer
  a human will follow up and ask for the details needed (e.g. order number + email).
- Link to ${SITE} or a specific /products/<handle> page when helpful.
- Keep answers final and direct — do not show your reasoning.`;

/**
 * Generate a reply with Claude.
 * @param {string} message - latest user message
 * @param {{role: "user"|"assistant", content: string}[]} [history] - prior turns
 * @returns {Promise<{reply: string, source: "llm"}>}
 */
async function getLlmReply(message, history = []) {
  const messages = [
    ...history
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
      .slice(-8) // keep the last few turns for context
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) })),
    { role: "user", content: String(message).slice(0, 2000) },
  ];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages,
  });

  if (response.stop_reason === "refusal") {
    return {
      reply:
        "Sorry, I can't help with that one — but I'm happy to answer anything about our " +
        "teas, orders, shipping, or brewing. 🍵",
      source: "llm",
    };
  }

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return { reply: text || "Sorry, I didn't catch that — could you rephrase?", source: "llm" };
}

module.exports = { getLlmReply, MODEL };
