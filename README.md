# Tea Project — WhatsApp → Shopify Order Assistant

A personal WhatsApp assistant for a tea shop owner. You forward (or type) a
customer's order plus the customer's name, and the bot creates a **draft order**
in your Shopify store for you to review and charge. The same chat also answers
your questions about the shop — product prices, stock, your store URL, recent
orders, and so on.

The bot only ever talks to **you** (the merchant). It never messages your
customers, and it never charges anyone — it creates draft orders that you review
and invoice from Shopify.

> New here? Read [`FAQ.md`](./FAQ.md) for a plain-language explanation (does it use
> Claude? is it always on? does it cost a subscription?).

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

- **"Order for Jane Doe: 2 jasmine green + a 250g oolong"** (text **or a photo of a
  written order**) → the bot previews the matched items + subtotal and asks you to
  confirm, then creates the draft and replies with its name, total, and admin link.
- **"Jane paid"** → the bot finds the matching open draft, then completes it into a
  real order **marked paid**, and confirms the new order number.
- **"Save that as Jane's usual"** / **"send Jane her usual"** → remembers and reuses
  a customer's regular order.
- **"How much is the oolong?" / "what's our cost on jasmine?" / "do we still have it in stock?"**
  → looks it up live (price, unit cost, SKU, and quantity all come from Shopify).
- **"What's my store URL?"** → returns it.
- **Ambiguous order** ("send John the usual", or an order for a product that has
  several sizes) → asks you to clarify, listing the available options; no draft created.

### Data source

Nothing is read from a local file or stored snapshot. Every product name, variant,
price, **unit cost**, SKU, and stock level is fetched **live from your Shopify store**
at the moment you message the bot, so it can never act on stale data.

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
  `read_draft_orders`, `write_draft_orders`, `read_orders`, `write_orders`,
  `read_customers`, `write_customers`.
  (`write_orders` is needed to mark a completed order as paid.)
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

## Order lifecycle

```
You forward an order ──▶ bot previews it (items + subtotal + stock) ──▶ you confirm
        ──▶ draft order created (unpaid) ──▶ you tell the bot "Jane paid"
        ──▶ bot completes the draft into a real order, marked PAID
```

The bot never charges anyone on its own. It drafts on your confirmation and only
records payment when you say the customer has paid.

## What the bot remembers

- **Conversation history, the dedup set, and saved "regulars"** are persisted to
  `data/store.json` (gitignored) so they survive restarts. It's flushed on a clean
  shutdown (SIGINT/SIGTERM) and written atomically.
- **Regulars** — "save this as Jane's usual" stores the order; "send Jane her usual"
  recalls it and runs the normal preview → confirm → create flow.

## Photos & voice

- **Photos** of a written/printed order are supported: the bot reads the order from
  the image (via Claude vision), then runs the same preview → confirm → create flow.
- **Voice notes are not supported** — transcription needs a separate speech-to-text
  provider, which isn't wired up. The bot replies asking you to type it or send a
  photo. (Adding STT later is a small change in `src/index.ts`.)

## Reliability details

- **Multi-variant products** are handled: give the bot the size/option (e.g. "250g
  oolong") and it picks the matching variant. If the size is missing or ambiguous,
  it asks you and lists the available variants with prices.
- **Stock check** — when a draft is created, the bot flags any line where the
  ordered quantity exceeds tracked stock (the draft is still created; you decide).
- **Duplicate-safe** — Meta can deliver the same webhook more than once; messages
  are de-duplicated by ID so you never get a double draft order.
- **Ordered processing** — back-to-back messages in one chat are serialized, so the
  conversation can't get tangled.
- **Sender allow-list + signature check** — only your own number(s) are answered,
  and every webhook's `X-Hub-Signature-256` is verified against your app secret.

## Notes / limitations

- Text and photo messages are supported; voice notes are not (see above).
- Persistence is a single JSON file for one process. For multiple instances or
  high volume, swap `src/store.ts` for SQLite or Redis (same small interface).
- Product matching is intentionally conservative: if a name maps to more than one
  product, the bot asks you which one rather than guessing.
- The bot drafts on your confirmation and only records payment when you say so —
  it never charges a customer by itself.

## Environment variables

See [`.env.example`](./.env.example) for the full list with descriptions.
