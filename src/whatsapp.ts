import crypto from "node:crypto";
import { config } from "./config.js";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

/**
 * Verify Meta's X-Hub-Signature-256 header against the raw request body.
 * Uses a constant-time comparison to avoid timing attacks.
 */
export function verifySignature(rawBody: Buffer, header: string | undefined): boolean {
  if (!header) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", config.WHATSAPP_APP_SECRET).update(rawBody).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export interface InboundMessage {
  from: string; // sender's WhatsApp number, E.164 without "+"
  text: string;
  name?: string; // sender's WhatsApp profile name, if provided
  type: string; // message type, e.g. "text"
}

/**
 * Pull the first inbound message out of a WhatsApp webhook payload.
 * Returns null for status callbacks (delivered/read receipts) and empty payloads.
 */
export function parseInbound(body: any): InboundMessage | null {
  try {
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    if (!message) return null; // status callback or unrelated event

    const from: string = message.from;
    const name: string | undefined = value?.contacts?.[0]?.profile?.name;

    if (message.type === "text") {
      return { from, name, type: "text", text: message.text?.body ?? "" };
    }
    // Non-text (image, audio, etc.) — surface the type so the caller can reply politely.
    return { from, name, type: message.type, text: "" };
  } catch {
    return null;
  }
}

/** Send a text message back to a WhatsApp number via the Cloud API. */
export async function sendText(to: string, body: string): Promise<void> {
  // WhatsApp caps a single text message body at 4096 chars — chunk longer replies.
  const chunks = chunkText(body, 4000);
  for (const chunk of chunks) {
    const res = await fetch(
      `${GRAPH_BASE}/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: chunk, preview_url: false },
        }),
      },
    );
    if (!res.ok) {
      const detail = await res.text();
      console.error(`WhatsApp sendText failed (${res.status}): ${detail}`);
    }
  }
}

function chunkText(text: string, size: number): string[] {
  if (text.length <= size) return [text];
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    out.push(text.slice(i, i + size));
  }
  return out;
}
