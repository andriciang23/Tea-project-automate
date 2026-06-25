# Tea Project — WhatsApp → Shopify Order Assistant

A personal WhatsApp assistant for a tea shop owner. You forward (or type) a
customer's order plus the customer's name, and the bot creates a **draft order**
in your Shopify store for you to review and charge. The same chat also answers
your questions about the shop — product prices, stock, your store URL, recent
orders, and so on.

The bot only ever talks to **you** (the merchant). It never messages your
customers, and it never charges anyone — it creates draft orders that you review
and invoice from Shopify.

## How it works

```
You (WhatsApp) ──▶ Meta WhatsApp Cloud API ──▶ POST /webhook (this app)
                                                    │ verify signature + sender allow-list
                                                    ▼
                                       Claude agent loop (tool use)
        search_products · get_shop_info · list_recent_orders · create_draft_order
                                                    │
                                  reply ──▶ WhatsApp back to you
```

- **"Order for Jane Doe: 2 jasmine green + a 250g oolong"** → creates a draft order,
  replies with the draft name, total, and admin link.
- **"How much is the oolong?" / "do we still have jasmine in stock?"** → looks it up live.
- **"What's my store URL?"** → returns it.
- **Ambiguous order** ("send John the usual") → asks you to clarify; no draft created.

Stack: Node.js + TypeScript, Express webhook, the Anthropic SDK (`claude-opus-4-8`
by default), and the Shopify Admin GraphQL API.

## Project layout

```
src/
  index.ts      Express server: webhook verification + inbound messages
  config.ts     Loads and validates environment variables (fails fast)
  whatsapp.ts   Cloud API client: signature check, parse inbound, send text
  shopify.ts    Admin GraphQL helpers (search, shop info, orders, draft order)
  tools.ts      Claude tool definitions + handlers
  agent.ts      Claude tool-use loop + per-chat history
scripts/
  test-agent.ts CLI to chat with the agent locally (no WhatsApp needed)
```

## Setup

### 1. Install

```bash
npm install
cp .env.example .env   # then fill it in (see below)
```

### 2. Shopify custom app

In Shopify admin → **Settings → Apps and sales channels → Develop apps → Create an app**:

- Configure **Admin API scopes**: `read_products`, `read_inventory`,
  `write_draft_orders`, `read_orders`, `read_customers`, `write_customers`.
- Install the app, then copy the **Admin API access token** into `SHOPIFY_ADMIN_TOKEN`.
- Set `SHOPIFY_STORE_DOMAIN` to your `*.myshopify.com` domain.

Use a **development store** while testing so you don't create real draft orders.

### 3. Meta WhatsApp Cloud API

In the [Meta for Developers](https://developers.facebook.com/) dashboard:

- Create an app, add the **WhatsApp** product.
- Copy the **phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`, and a
  (preferably permanent) **access token** → `WHATSAPP_TOKEN`.
- Copy the **app secret** → `WHATSAPP_APP_SECRET`.
- Choose any random string for `WHATSAPP_VERIFY_TOKEN`.
- Put **your own** WhatsApp number(s) in `ALLOWED_SENDERS` (E.164, no `+`,
  comma-separated), e.g. `6281234567890`.

### 4. Run locally + expose the webhook

```bash
npm run dev          # starts the server on PORT (default 3000)
# in another terminal:
ngrok http 3000      # gives you an https URL
```

In the Meta dashboard → WhatsApp → **Configuration → Webhook**:

- Callback URL: `https://<your-ngrok>.ngrok.io/webhook`
- Verify token: the same value as `WHATSAPP_VERIFY_TOKEN`
- Subscribe to the **messages** field.

Now message your WhatsApp business number from your own phone.

## Testing without WhatsApp

The agent loop can be exercised directly against your Shopify store + Anthropic:

```bash
# one-shot
npx tsx scripts/test-agent.ts "how much is the oolong?"
npx tsx scripts/test-agent.ts "Order for Jane Doe: 2 jasmine green and a 250g oolong"

# interactive
npx tsx scripts/test-agent.ts
```

Check that:
1. A question returns live data from your store.
2. An order creates a draft in Shopify admin, tagged `whatsapp`, **not** marked paid.
3. An ambiguous order ("send John the usual") gets a clarifying question — no draft.

## Notes / limitations (v1)

- Text messages only — media/voice notes get a "please type it as text" reply.
- Conversation history is in-memory and resets when the process restarts.
- Product matching is intentionally conservative: if a name maps to more than one
  product, or to a product with multiple variants, the bot asks you which one
  rather than guessing.
- No auto-charging — you always review the draft and send the invoice from Shopify.

## Environment variables

See [`.env.example`](./.env.example) for the full list with descriptions.
