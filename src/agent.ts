import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import { tools, runTool } from "./tools.js";

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are the private WhatsApp assistant for the owner of a tea shop that runs on Shopify.

The only person you talk to is the merchant (the shop owner) — never a customer. Your two jobs:

1. CREATE DRAFT ORDERS. When the merchant forwards or types a customer's order plus the customer's name, extract the customer name and the items, then call create_draft_order. For each item, put the base product in "product" and any size/option the customer named in "variant" (e.g. product: "oolong", variant: "250g"). The draft is reviewed and charged by the merchant in Shopify — you never charge anyone. After a draft is created, reply with the draft name, the total, and the admin link in a short friendly message. If the result includes stock_warnings, mention them so the merchant knows an item is low or out of stock.

2. ANSWER SHOP QUESTIONS. Use search_products, get_shop_info, and list_recent_orders to answer the merchant's questions about prices, cost, margin, stock/quantity, the store website, recent orders, etc. Always pull live data via the tools — never answer product/price/stock questions from memory.

Rules:
- If an order is ambiguous (unknown product, unclear which size/variant, missing quantity, or "the usual"), do NOT guess and do NOT create the draft. Ask the merchant a short clarifying question.
- If create_draft_order returns "needs_clarification", relay exactly what was unclear and present the options it lists (e.g. the available sizes) so the merchant can pick. Mention any items that DID match for context. Once they answer, call create_draft_order again with the full corrected order.
- Keep replies short and WhatsApp-friendly (a few lines, minimal formatting, no markdown tables).
- Currency, prices, and cost come from the store; don't invent them.`;

// Simple in-memory conversation history, keyed by the merchant's chat (their number).
// Resets on restart; fine for v1.
const histories = new Map<string, Anthropic.MessageParam[]>();
const MAX_TURNS = 20; // keep the last N messages per chat

function getHistory(chatId: string): Anthropic.MessageParam[] {
  let h = histories.get(chatId);
  if (!h) {
    h = [];
    histories.set(chatId, h);
  }
  return h;
}

// Per-chat serialization. WhatsApp can deliver messages back-to-back; without
// this, two concurrent turns would interleave their awaits and corrupt the shared
// history array (e.g. an assistant turn left without its matching tool_result).
const chains = new Map<string, Promise<unknown>>();

/**
 * Public entry point. Queues this turn behind any in-flight turn for the same
 * chat so history mutations stay strictly ordered.
 */
export function handleMessage(chatId: string, userText: string): Promise<string> {
  const prev = chains.get(chatId) ?? Promise.resolve();
  const next = prev.then(
    () => runTurn(chatId, userText),
    () => runTurn(chatId, userText),
  );
  // Keep the chain alive regardless of this turn's outcome.
  chains.set(
    chatId,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

/**
 * Run one turn of the agent for a given chat. Appends the user's message to the
 * chat history, drives the tool-use loop, and returns the assistant's reply text.
 */
async function runTurn(chatId: string, userText: string): Promise<string> {
  const history = getHistory(chatId);
  // Snapshot so a mid-loop failure can be rolled back, leaving history valid for
  // the next turn instead of stranded on a tool_use with no tool_result.
  const checkpoint = history.length;
  history.push({ role: "user", content: userText });

  try {
    return await runLoop(history);
  } catch (err) {
    history.length = checkpoint; // discard this turn's partial messages
    throw err;
  }
}

async function runLoop(history: Anthropic.MessageParam[]): Promise<string> {
  let guard = 0;
  while (true) {
    if (guard++ > 8) {
      return "Sorry — I got stuck working on that. Could you rephrase or try again?";
    }

    const response = await client.messages.create({
      model: config.ANTHROPIC_MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools,
      messages: history,
    });

    // Record the assistant turn (text + any tool_use blocks) verbatim.
    history.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          let result: string;
          try {
            result = await runTool(block.name, block.input);
          } catch (err) {
            result = JSON.stringify({
              error: err instanceof Error ? err.message : String(err),
            });
          }
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }
      history.push({ role: "user", content: toolResults });
      continue; // loop again so the model can use the tool results
    }

    // No more tools — extract the final text reply.
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    trimHistory(history);
    return text || "Done.";
  }
}

function isPlainUserMessage(m: Anthropic.MessageParam): boolean {
  // Our real user turns are plain strings; tool-result turns are role:"user"
  // but carry an array of tool_result blocks and must not start the window.
  return m.role === "user" && typeof m.content === "string";
}

function trimHistory(history: Anthropic.MessageParam[]): void {
  // Drop oldest messages, then realign so the window begins on a plain user
  // text turn (a leading assistant or tool_result turn would be invalid).
  if (history.length <= MAX_TURNS) return;
  history.splice(0, history.length - MAX_TURNS);
  while (history.length > 0 && !isPlainUserMessage(history[0])) {
    history.shift();
  }
}
