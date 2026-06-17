# Shopify storefront chatbot

An on-site chat widget for **hojichaya.com** plus a small backend that answers customer
questions. It shares the same FAQ brain as the WhatsApp/Instagram bot (in
[`../shared`](../shared)), so you maintain answers in one place across every channel.

```
Shopify storefront (widget.js) ──POST /chat──► backend ──► Claude (LLM mode)
                                                  │           or
                                                  └──► keyword matcher (free fallback)
                                            grounded in ../shared FAQ + product catalog
```

## Two modes

| Mode | When | Cost | Quality |
| --- | --- | --- | --- |
| **LLM** | `ANTHROPIC_API_KEY` set | per-message API cost | Understands free-form questions; warm, on-brand answers grounded in your FAQ + catalog |
| **Keyword** | no key | free | Matches the same FAQ intents as the messaging bot; predictable |

If the LLM call fails for any reason, the backend automatically falls back to the keyword
answer — a customer is never left without a reply.

## Run it locally

```bash
cd shopify-chatbot
npm install
cp .env.example .env        # optionally add ANTHROPIC_API_KEY
npm start
# open http://localhost:3100/demo.html and click the tea bubble
```

Check the mode at <http://localhost:3100/health>.

## Configuration (`.env`)

| Var | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Enables LLM mode. Leave blank for free keyword mode. |
| `CHATBOT_MODEL` | Default `claude-opus-4-8`. Set `claude-haiku-4-5` for a cheaper/faster bot. |
| `ALLOWED_ORIGINS` | Comma-separated storefront origins allowed to call `/chat`. |
| `RATE_LIMIT_PER_MIN` | Per-IP request cap (default 20) to bound abuse/cost. |
| `PORT` | Default 3100. |

## Deploy + embed in Shopify

> 📘 **New to hosting? Follow the step-by-step [DEPLOY.md](./DEPLOY.md)** — a guided Render
> walkthrough (free tier, ~15 min, no computer left on).

1. **Deploy the backend** to any Node host (Render, Railway, Fly, a VPS). Set the env vars,
   especially `ALLOWED_ORIGINS=https://hojichaya.com,https://www.hojichaya.com`. Note the
   public URL, e.g. `https://hojichaya-bot.onrender.com`.
2. **Add the widget to your theme:** Shopify admin → Online Store → Themes → ⋯ → **Edit
   code** → Snippets → **Add a new snippet** named `hojichaya-chat`, and paste
   [`theme/hojichaya-chat.liquid`](./theme/hojichaya-chat.liquid). Replace the
   `backend_url` value with your deployed URL.
3. In `layout/theme.liquid`, add `{% render 'hojichaya-chat' %}` just before `</body>`.
4. Save and visit your store — the tea bubble appears bottom-right. 🍵

> The widget can also be embedded on any non-Shopify page — just include `widget.css` and
> `widget.js` and set `window.HOJICHAYA_CHAT = { backendUrl: "..." }` (see
> [`public/demo.html`](./public/demo.html)).

## Files

| Path | Role |
| --- | --- |
| `src/server.js` | Express backend: `/chat`, `/health`, serves the widget; CORS + rate limit |
| `src/llm.js` | Claude call, grounded in the shared FAQ + product catalog |
| `src/productCatalog.js` | **Edit this** — products used to ground answers (keep in sync with Shopify) |
| `public/widget.js` / `widget.css` | The embeddable chat widget |
| `public/demo.html` | Local test page |
| `theme/hojichaya-chat.liquid` | Snippet to drop into your Shopify theme |
| `../shared/knowledgeBase.js` | **Edit this** — the FAQ, shared with the messaging bot |

## Keeping it accurate

- Update [`src/productCatalog.js`](./src/productCatalog.js) when products/prices change —
  or ask Claude to "refresh the chatbot product catalog from Shopify".
- The bot is instructed to treat prices as indicative and link to the live product page,
  and never to invent stock, tracking, or order details — it offers a human handoff for
  those instead.
