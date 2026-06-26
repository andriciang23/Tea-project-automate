import express, { type Request, type Response } from "express";
import { config } from "./config.js";
import { verifySignature, parseInboundMessages, sendText, downloadMedia } from "./whatsapp.js";
import { handleMessage, handleImageMessage } from "./agent.js";
import * as store from "./store.js";

store.loadStore();

const app = express();

// Capture the raw body so we can verify Meta's HMAC signature.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  }),
);

// Health check for uptime monitors.
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).send("ok");
});

// Meta webhook verification handshake.
app.get("/webhook", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === config.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Inbound WhatsApp messages.
app.post("/webhook", (req: Request, res: Response) => {
  const rawBody: Buffer | undefined = (req as any).rawBody;
  if (!rawBody || !verifySignature(rawBody, req.header("x-hub-signature-256"))) {
    res.sendStatus(401);
    return;
  }

  // Acknowledge immediately so Meta doesn't retry; process asynchronously.
  res.sendStatus(200);
  void processWebhook(req.body);
});

async function processWebhook(body: unknown): Promise<void> {
  for (const inbound of parseInboundMessages(body)) {
    // Security: only the merchant's own number(s) may use the bot.
    if (!config.ALLOWED_SENDERS.includes(inbound.from)) {
      console.warn(`Ignoring message from non-allowed sender: ${inbound.from}`);
      continue;
    }
    // Dedup: Meta may deliver the same message more than once.
    if (store.hasSeen(inbound.id)) {
      console.log(`Skipping duplicate message ${inbound.id}`);
      continue;
    }
    store.markSeen(inbound.id);

    try {
      let reply: string;
      if (inbound.type === "text") {
        reply = await handleMessage(inbound.from, inbound.text);
      } else if (inbound.type === "image" && inbound.mediaId) {
        const media = await downloadMedia(inbound.mediaId);
        if (!media) {
          await sendText(inbound.from, "I couldn't open that photo — please resend it or type the order as text.");
          continue;
        }
        // Claude vision accepts only these image formats.
        const supported = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        const mimeType = media.mimeType.split(";")[0].trim().toLowerCase();
        if (!supported.includes(mimeType)) {
          await sendText(inbound.from, "That image format isn't supported — please send a JPG or PNG, or type the order.");
          continue;
        }
        reply = await handleImageMessage(inbound.from, {
          base64: media.base64,
          mimeType,
          caption: inbound.caption,
        });
      } else {
        // Voice notes and other media aren't supported (no transcription provider wired up).
        await sendText(
          inbound.from,
          "I can read text and photos. For voice notes, please type the order or send a photo of it.",
        );
        continue;
      }
      await sendText(inbound.from, reply);
    } catch (err) {
      console.error("Error handling message:", err);
      try {
        await sendText(
          inbound.from,
          "Sorry — something went wrong on my end. Please try again in a moment.",
        );
      } catch {
        // best effort
      }
    }
  }
}

const server = app.listen(config.PORT, () => {
  console.log(`WhatsApp → Shopify agent listening on port ${config.PORT}`);
  console.log(`Allowed senders: ${config.ALLOWED_SENDERS.join(", ")}`);
});

// Flush persisted state on shutdown so nothing in the debounce window is lost.
function shutdown(signal: string) {
  console.log(`\n${signal} received — flushing store and exiting.`);
  store.saveNow();
  server.close(() => process.exit(0));
  // Don't hang forever if connections are open.
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
