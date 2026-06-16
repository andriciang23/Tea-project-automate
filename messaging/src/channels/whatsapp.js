/**
 * WhatsApp Business Platform (Cloud API) channel.
 * Parses inbound webhook payloads and sends text replies.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const GRAPH = "https://graph.facebook.com/v21.0";

/**
 * Extract simple {from, text, messageId} objects from a WhatsApp webhook body.
 * Ignores non-text and status/delivery events.
 */
function parseInbound(body) {
  const out = [];
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      for (const m of value.messages || []) {
        if (m.type === "text" && m.text?.body) {
          out.push({ from: m.from, text: m.text.body, messageId: m.id });
        } else if (m.type) {
          // Non-text (image, audio, button, etc.) — still capture sender for a generic reply.
          out.push({ from: m.from, text: "", messageId: m.id, nonText: m.type });
        }
      }
    }
  }
  return out;
}

async function sendText({ to, text }) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) throw new Error("WhatsApp env vars not set");

  const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
  if (!res.ok) {
    throw new Error(`WhatsApp send failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

module.exports = { parseInbound, sendText, channel: "whatsapp" };
