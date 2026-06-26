import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import { tools, runTool } from "./tools.js";
import * as store from "./store.js";

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are the private WhatsApp assistant for the owner of a tea shop that runs on Shopify.

The only person you talk to is the merchant (the shop owner) — never a customer. Your jobs:

1. TAKE ORDERS (with confirmation). When the merchant forwards or types a customer's order — as text or a photo — plus the customer's name:
   - Extract the customer name and items. For each item put the base product in "product" and any size/option the customer named in "variant" (e.g. product: "oolong", variant: "250g").
   - ALWAYS call preview_draft_order first. Show the merchant the matched items, subtotal, and any stock warnings, then ask them to confirm (e.g. "Create this draft?").
   - Only after they confirm, call create_draft_order. Then reply with the draft name, total, and admin link. Mention any stock_warnings.
   - The draft is NOT charged — the merchant reviews and invoices it in Shopify. You never charge anyone at order time.

2. REGULARS ("the usual"). If the merchant refers to a customer's "usual", call lookup_regular, then run the normal preview→confirm→create flow with those items. If they ask to save an order as someone's usual, call save_regular.

3. ACCEPT PAYMENT & CLOSE. When the merchant says a customer has PAID:
   - Call list_open_draft_orders and find the draft that matches the customer/items they mention. If it's unclear which one, ask.
   - Then call complete_draft_order with that draft's id. This converts the draft into a real order and marks it PAID.
   - Reply with the new order number and confirm it's marked paid.

4. ANSWER SHOP QUESTIONS. Use search_products, get_shop_info, and list_recent_orders for prices, cost, margin, stock, the store website, recent orders, etc. Always pull live data — never answer product/price/stock questions from memory.

Rules:
- Never guess. If an order, product, size, quantity, or which draft to complete is unclear, ask a short clarifying question. If a tool returns "needs_clarification", relay exactly what was unclear and present the options it lists, then continue once the merchant answers.
- Keep replies short and WhatsApp-friendly (a few lines, minimal formatting, no markdown tables).
- Prices, cost, and currency come from the store; don't invent them.`;

const MAX_TURNS = 24; // cap the per-chat history window

// Per-chat serialization. WhatsApp can deliver messages back-to-back; without
// this, two concurrent turns would interleave their awaits and corrupt the shared
// history array (e.g. an assistant turn left without its matching tool_result).
const chains = new Map<string, Promise<unknown>>();

function enqueue(chatId: string, content: Anthropic.MessageParam["content"]): Promise<string> {
  const prev = chains.get(chatId) ?? Promise.resolve();
  const next = prev.then(
    () => runTurn(chatId, content),
    () => runTurn(chatId, content),
  );
  chains.set(
    chatId,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

/** Handle a plain text message from the merchant. */
export function handleMessage(chatId: string, userText: string): Promise<string> {
  return enqueue(chatId, userText);
}

/** Handle a photo (e.g. a snapshot of a written order) with optional caption. */
export function handleImageMessage(
  chatId: string,
  image: { base64: string; mimeType: string; caption?: string },
): Promise<string> {
  const content: Anthropic.ContentBlockParam[] = [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: image.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data: image.base64,
      },
    },
    {
      type: "text",
      text: image.caption?.trim()
        ? `This photo is from the merchant. Caption: "${image.caption.trim()}". If it's a customer order, read the items and run the order flow.`
        : "This photo is from the merchant. If it's a customer order, read the items and run the order flow; otherwise describe what you see.",
    },
  ];
  return enqueue(chatId, content);
}

async function runTurn(chatId: string, content: Anthropic.MessageParam["content"]): Promise<string> {
  const history = store.getHistory(chatId);
  // Snapshot so a mid-loop failure can be rolled back, leaving history valid for
  // the next turn instead of stranded on a tool_use with no tool_result.
  const checkpoint = history.length;
  // Keep a direct reference to the message we push: trimHistory may shift indices
  // by the time we scrub, so indexing by position would target the wrong message.
  const userMsg: Anthropic.MessageParam = { role: "user", content };
  history.push(userMsg);

  try {
    const reply = await runLoop(history);
    // The image was only needed for the turn that read it. Strip the base64 so it
    // isn't re-uploaded on every later turn or bloated into the persisted store.
    scrubImageData(userMsg);
    store.persist();
    return reply;
  } catch (err) {
    history.length = checkpoint; // discard this turn's partial messages
    store.persist();
    throw err;
  }
}

function scrubImageData(message: Anthropic.MessageParam | undefined): void {
  if (!message || !Array.isArray(message.content)) return;
  message.content = message.content.map((b) =>
    (b as { type?: string }).type === "image"
      ? { type: "text" as const, text: "[photo the merchant sent earlier — already read]" }
      : b,
  );
}

async function runLoop(history: Anthropic.MessageParam[]): Promise<string> {
  let guard = 0;
  while (true) {
    if (guard++ > 10) {
      return "Sorry — I got stuck working on that. Could you rephrase or try again?";
    }

    const response = await client.messages.create({
      model: config.ANTHROPIC_MODEL,
      max_tokens: 4096,
      // Cache the static prefix (tools + system) so it's reused across turns.
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools,
      // A breakpoint on the last message caches the whole conversation prefix, so
      // the repeated tool-loop calls within one order read history from cache
      // instead of re-sending it at full price.
      messages: withCacheBreakpoint(history),
    });

    if (process.env.DEBUG_TOKENS) {
      const u = response.usage;
      console.log(
        `[tokens] in=${u.input_tokens} cache_read=${u.cache_read_input_tokens ?? 0} ` +
          `cache_write=${u.cache_creation_input_tokens ?? 0} out=${u.output_tokens}`,
      );
    }

    if (response.stop_reason === "max_tokens") {
      // Output was truncated — a partial tool_use would be invalid to act on.
      // Drop this assistant turn and ask the merchant to simplify.
      return "That turned into a lot at once — could you send it in a couple of smaller messages?";
    }

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
            result = JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
          }
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
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

/**
 * Return a shallow copy of the history with a cache breakpoint on the last
 * message's last content block. We don't mutate the stored history, so no
 * cache_control markers accumulate (which would blow the 4-breakpoint limit).
 */
function withCacheBreakpoint(history: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  if (history.length === 0) return history;
  const out = history.slice();
  const last = out[out.length - 1];
  const ephemeral = { type: "ephemeral" as const };

  if (typeof last.content === "string") {
    out[out.length - 1] = {
      ...last,
      content: [{ type: "text", text: last.content, cache_control: ephemeral }],
    };
  } else if (Array.isArray(last.content) && last.content.length > 0) {
    const blocks = last.content.slice();
    // Cast: cache_control is valid on the block types we actually emit (text,
    // tool_use, tool_result, image), but the union also includes ThinkingBlockParam.
    blocks[blocks.length - 1] = {
      ...blocks[blocks.length - 1],
      cache_control: ephemeral,
    } as Anthropic.ContentBlockParam;
    out[out.length - 1] = { ...last, content: blocks };
  }
  return out;
}

function isToolResultTurn(m: Anthropic.MessageParam): boolean {
  return (
    m.role === "user" &&
    Array.isArray(m.content) &&
    m.content.some((b) => (b as { type?: string }).type === "tool_result")
  );
}

/** A valid window start is any user turn that isn't a tool_result turn. */
function isValidStart(m: Anthropic.MessageParam): boolean {
  return m.role === "user" && !isToolResultTurn(m);
}

function trimHistory(history: Anthropic.MessageParam[]): void {
  if (history.length <= MAX_TURNS) return;
  history.splice(0, history.length - MAX_TURNS);
  while (history.length > 0 && !isValidStart(history[0])) {
    history.shift();
  }
}
