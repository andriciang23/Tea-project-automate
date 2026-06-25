import express, { type Request, type Response } from "express";
import { config } from "./config.js";
import { verifySignature, parseInboundMessages, sendText } from "./whatsapp.js";
import { handleMessage } from "./agent.js";

// Bounded set of recently-seen message IDs for at-least-once webhook dedup.
const seenMessageIds = new Set<string>();
const SEEN_LIMIT = 1000;

function alreadyProcessed(id: string): boolean {
  if (seenMessageIds.has(id)) return true;
  seenMessageIds.add(id);
  if (seenMessageIds.size > SEEN_LIMIT) {
    // Drop the oldest entry (insertion order) to keep the set bounded.
    const oldest = seenMessageIds.values().next().value;
    if (oldest !== undefined) seenMessageIds.delete(oldest);
  }
  return false;
}

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
    if (alreadyProcessed(inbound.id)) {
      console.log(`Skipping duplicate message ${inbound.id}`);
      continue;
    }

    try {
      if (inbound.type !== "text") {
        await sendText(
          inbound.from,
          "I can only read text right now. Please type the order or question as text.",
        );
        continue;
      }

      const reply = await handleMessage(inbound.from, inbound.text);
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

app.listen(config.PORT, () => {
  console.log(`WhatsApp → Shopify agent listening on port ${config.PORT}`);
  console.log(`Allowed senders: ${config.ALLOWED_SENDERS.join(", ")}`);
});
