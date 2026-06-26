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
  id: string; // WhatsApp message ID (wamid...), used for dedup
  from: string; // sender's WhatsApp number, E.164 without "+"
  text: string;
  name?: string; // sender's WhatsApp profile name, if provided
  type: string; // message type, e.g. "text", "image", "audio"
  mediaId?: string; // for image messages: the media id to download
  caption?: string; // for image messages: optional caption
}

/**
 * Pull every inbound message out of a WhatsApp webhook payload. Iterates all
 * entries/changes so nothing is dropped, and skips status callbacks (delivered/
 * read receipts) and malformed events.
 */
export function parseInboundMessages(body: any): InboundMessage[] {
  const out: InboundMessage[] = [];
  try {
    for (const entry of body?.entry ?? []) {
      for (const change of entry?.changes ?? []) {
        const value = change?.value;
        const contactName: string | undefined = value?.contacts?.[0]?.profile?.name;
        for (const message of value?.messages ?? []) {
          if (!message?.id || !message?.from) continue;
          const base = { id: message.id, from: message.from, name: contactName, type: message.type ?? "unknown" };
          if (message.type === "text") {
            out.push({ ...base, text: message.text?.body ?? "" });
          } else if (message.type === "image") {
            out.push({
              ...base,
              text: message.image?.caption ?? "",
              mediaId: message.image?.id,
              caption: message.image?.caption,
            });
          } else {
            out.push({ ...base, text: "" });
          }
        }
      }
    }
  } catch {
    // Malformed payload — return whatever we managed to parse.
  }
  return out;
}

/** Send a text message back to a WhatsApp number via the Cloud API. */
export async function sendText(to: string, body: string): Promise<void> {
  // WhatsApp rejects empty message bodies — never send a blank reply.
  const safeBody = body && body.trim() ? body : "Done.";
  // WhatsApp caps a single text message body at 4096 chars — chunk longer replies.
  const chunks = chunkText(safeBody, 4000);
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

/**
 * Download a WhatsApp media object (e.g. an image) by its media id.
 * Two steps: resolve the temporary media URL, then fetch the bytes (both
 * authenticated with the WhatsApp token). Returns null on any failure.
 */
export async function downloadMedia(
  mediaId: string,
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const metaRes = await fetch(`${GRAPH_BASE}/${mediaId}`, {
      headers: { Authorization: `Bearer ${config.WHATSAPP_TOKEN}` },
    });
    if (!metaRes.ok) {
      console.error(`Media metadata fetch failed (${metaRes.status}): ${await metaRes.text()}`);
      return null;
    }
    const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
    if (!meta.url) return null;

    const binRes = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${config.WHATSAPP_TOKEN}` },
    });
    if (!binRes.ok) {
      console.error(`Media download failed (${binRes.status})`);
      return null;
    }
    const buf = Buffer.from(await binRes.arrayBuffer());
    return { base64: buf.toString("base64"), mimeType: meta.mime_type ?? "image/jpeg" };
  } catch (err) {
    console.error("downloadMedia error:", err);
    return null;
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
