/**
 * Instagram Messaging channel (via the Meta Graph API on a linked Facebook Page).
 * Parses inbound webhook payloads and sends text replies.
 * Docs: https://developers.facebook.com/docs/messenger-platform/instagram
 */

const GRAPH = "https://graph.facebook.com/v21.0";

/**
 * Extract {from, text, messageId} from an Instagram messaging webhook body.
 * Skips echoes (messages your own account sent).
 */
function parseInbound(body) {
  const out = [];
  for (const entry of body.entry || []) {
    for (const ev of entry.messaging || []) {
      const msg = ev.message;
      if (!msg || msg.is_echo) continue;
      out.push({
        from: ev.sender?.id,
        text: msg.text || "",
        messageId: msg.mid,
        nonText: msg.text ? undefined : "attachment",
      });
    }
  }
  return out;
}

async function sendText({ to, text }) {
  const token = process.env.IG_PAGE_ACCESS_TOKEN;
  const pageId = process.env.IG_PAGE_ID;
  if (!token || !pageId) throw new Error("Instagram env vars not set");

  const res = await fetch(`${GRAPH}/${pageId}/messages?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: to },
      message: { text },
    }),
  });
  if (!res.ok) {
    throw new Error(`Instagram send failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

module.exports = { parseInbound, sendText, channel: "instagram" };
