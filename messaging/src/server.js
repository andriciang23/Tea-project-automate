/**
 * HojichaYa messaging webhook server.
 *
 * One Express app handles both WhatsApp and Instagram webhooks from Meta:
 *   GET  /webhook  → webhook verification handshake (both platforms)
 *   POST /webhook  → inbound messages (object: "whatsapp_business_account" | "instagram")
 *
 * Auto-replies using the FAQ in knowledgeBase.js. Set DRY_RUN=true to log instead of send.
 */

require("dotenv").config();
const express = require("express");

const { getReply } = require("../../shared/autoReply");
const whatsapp = require("./channels/whatsapp");
const instagram = require("./channels/instagram");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;
const DRY_RUN = String(process.env.DRY_RUN).toLowerCase() !== "false";
const PORT = process.env.PORT || 3000;

app.get("/", (_req, res) => res.send("HojichaYa messaging bot is running 🍵"));

// --- Webhook verification (Meta calls this once when you set the webhook URL) ---
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✓ Webhook verified");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// --- Inbound messages ---
app.post("/webhook", async (req, res) => {
  // Acknowledge fast — Meta retries if we're slow. Process after responding.
  res.sendStatus(200);

  try {
    const body = req.body;
    let channel = null;
    if (body.object === "whatsapp_business_account") channel = whatsapp;
    else if (body.object === "instagram" || body.object === "page") channel = instagram;
    else return;

    const messages = channel.parseInbound(body);
    for (const m of messages) {
      if (!m.from) continue;

      const { intent, reply, handoff } = m.text
        ? getReply(m.text)
        : {
            intent: "non_text",
            reply:
              "Thanks for your message! 🍵 I can best help with text — could you type your " +
              "question? Or say \"talk to a human\" and our team will follow up.",
            handoff: true,
          };

      console.log(
        `[${channel.channel}] from=${m.from} intent=${intent} handoff=${handoff} ` +
          `text=${JSON.stringify(m.text || m.nonText || "")}`
      );

      if (handoff) {
        // Hook point: notify your team (email / Slack / WhatsApp) for human follow-up.
        // notifyTeam({ channel: channel.channel, from: m.from, text: m.text });
      }

      if (DRY_RUN) {
        console.log(`   ↪ [DRY_RUN] would reply: ${reply}`);
        continue;
      }

      try {
        await channel.sendText({ to: m.from, text: reply });
        console.log("   ↪ sent");
      } catch (err) {
        console.error("   ✗ send error:", err.message);
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
  }
});

app.listen(PORT, () => {
  console.log(`HojichaYa messaging bot listening on :${PORT} (DRY_RUN=${DRY_RUN})`);
  if (!VERIFY_TOKEN) console.warn("⚠ WEBHOOK_VERIFY_TOKEN not set — verification will fail.");
});

module.exports = app;
