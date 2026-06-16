# Messaging pillar — WhatsApp + Instagram auto-reply

A small Node/Express service that receives WhatsApp and Instagram messages via the Meta
Graph API and auto-replies using HojichaYa's FAQ, handing off to a human when needed.

```
Customer DM ──► Meta (WhatsApp Cloud API / IG Messaging) ──► /webhook ──► autoReply
                                                                   │
                                          reply (FAQ) ◄────────────┤
                                          human handoff flag ──────┘
```

## Try it right now (no setup, no credentials)

The reply logic runs fully offline:

```bash
cd messaging
node src/replyTest.js                       # sample conversation suite
node src/replyTest.js "how much is matcha?" # test a single message
```

This lets you tune the FAQ in [`src/knowledgeBase.js`](./src/knowledgeBase.js) before
connecting anything live.

## Run the server (still safe — DRY_RUN on by default)

```bash
cd messaging
npm install
cp .env.example .env        # then edit .env
npm start
```

With `DRY_RUN=true` (the default) it logs the replies it *would* send but never contacts
Meta — perfect for end-to-end testing with a tunnel.

## Connect it to WhatsApp & Instagram (going live)

1. Follow [`docs/SETUP.md`](../docs/SETUP.md) §2 to create the Meta App and get tokens.
2. Fill in `.env` (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `IG_PAGE_ACCESS_TOKEN`,
   `IG_PAGE_ID`, `WEBHOOK_VERIFY_TOKEN`).
3. Expose the server publicly:
   - Local testing: `npx ngrok http 3000` → use the HTTPS URL.
   - Production: deploy to Render / Railway / Fly / a VPS (any Node host).
4. In the Meta App, set the webhook **Callback URL** = `https://YOUR_URL/webhook` and
   **Verify token** = your `WEBHOOK_VERIFY_TOKEN`; subscribe to `messages` for both
   WhatsApp and Instagram.
5. Set `DRY_RUN=false` and restart. Send your shop a test DM. 🎉

## How it works

| File | Role |
| --- | --- |
| `src/server.js` | Express app; webhook verify + inbound routing for both channels |
| `../shared/autoReply.js` | Keyword-scored intent matching → reply + handoff decision |
| `../shared/knowledgeBase.js` | **Edit this** — the FAQ (intents, keywords, replies) |
| `src/channels/whatsapp.js` | Parse + send for WhatsApp Cloud API |
| `src/channels/instagram.js` | Parse + send for Instagram Messaging |
| `src/replyTest.js` | Offline tester |

> The FAQ in [`../shared/`](../shared) is shared with the [Shopify chatbot](../shopify-chatbot) —
> edit it once and both the messaging bot and the website widget stay in sync.

## Customizing replies

Open [`../shared/knowledgeBase.js`](../shared/knowledgeBase.js) and edit the `intents` array — add
keywords and reply text. Anything with `handoff: true` flags the message for a human. The
placeholders (prices, free-shipping threshold) should be updated to match your live store.

## Roadmap (ask Claude to build any of these)

- **Human handoff notifications** — ping your team (email/Slack/WhatsApp) on `handoff`.
- **Order-status lookups** — wire the `order_status` intent to the Shopify Admin API.
- **LLM fallback** — replace the keyword matcher with a Claude call for free-form questions,
  grounded in the same knowledge base.
- **Business-hours awareness** — different greeting/handoff copy outside `SUPPORT_HOURS`.
- **Signature verification** — validate Meta's `X-Hub-Signature-256` header on the webhook.

## Compliance notes

- WhatsApp: you can freely reply within the **24-hour customer service window**. Outside it,
  you must use approved **message templates** (for broadcasts/marketing).
- Instagram: replies allowed within the platform's messaging window; respect rate limits.
- Always offer a path to a human and honor opt-outs.
