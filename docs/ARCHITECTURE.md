# Architecture

How the three automation pillars fit together for HojichaYa.

```
                         ┌─────────────────────────────┐
                         │        HojichaYa store        │
                         │      (Shopify · hojichaya.com)│
                         └───────────────┬──────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                 │                                 │
┌───────▼────────┐               ┌────────▼────────┐               ┌────────▼────────┐
│   SEO pillar   │               │   Ads pillar    │               │ Messaging pillar │
│   /seo         │               │   /ads          │               │ /messaging       │
├────────────────┤               ├─────────────────┤               ├──────────────────┤
│ Shopify Admin  │               │ Google Ads API  │               │ WhatsApp Cloud   │
│ API (products, │               │ Meta Marketing  │               │ API + Instagram  │
│ metafields,    │               │ API             │               │ Messaging API    │
│ blogs)         │               │                 │               │ (Meta Graph)     │
└────────────────┘               └─────────────────┘               └──────────────────┘
```

## Pillar 1 — SEO (`/seo`)

- **Data source:** Shopify Admin API (already connected via MCP in Claude sessions).
- **What it changes:** product titles, body HTML, SEO meta title/description
  (`metafields` under `global` / `seo` namespaces), image `alt` text, URL handles,
  and blog articles.
- **Execution model:** Content is drafted as data files in `/seo`. Applying it is a
  deliberate, reviewed step — either run by Claude through the Shopify MCP tools, or via
  the optional script in `/seo/scripts`.
- **No external infra required.** SEO work is content + Shopify config.

## Pillar 2 — Ads (`/ads`)

- **Google Ads:** Performance Max + Search campaigns targeting Malaysian tea buyers.
- **Meta Ads:** Advantage+ Shopping / catalog sales campaigns pulling from the Shopify
  product feed (Meta & Google sales channels on Shopify auto-generate the catalog).
- **Execution model:** Campaign structures, budgets, keywords, and ad copy live as
  templates in `/ads`. Automation (rule-based bid/budget tweaks, reporting) runs through
  the respective APIs once credentials exist.
- **Requires:** Google Ads account + developer token; Meta Business + ad account + system
  user token. See [`SETUP.md`](./SETUP.md).

## Pillar 3 — Messaging (`/messaging`)

- A Node.js webhook service that receives inbound WhatsApp and Instagram messages via the
  **Meta Graph API** and replies automatically.
- **Auto-reply logic:** intent matching against a tea-shop FAQ knowledge base
  (shipping, brewing, wholesale, order status), with graceful handoff to a human for
  anything it can't answer.
- **Order status** answers can optionally query the Shopify Admin API.
- **Requires:** Meta Business account, a WhatsApp Business Platform phone number, and an
  Instagram Professional account linked to a Facebook Page. See [`SETUP.md`](./SETUP.md).

## Shared conventions

- Secrets live in environment variables, never committed. Each service ships a
  `.env.example`.
- All money is **MYR**; all times are **Asia/Kuala_Lumpur (UTC+8)**.
- Brand voice: warm, knowledgeable, calm — like a tea sommelier. Bilingual-friendly
  (English + simple Malay where natural).
