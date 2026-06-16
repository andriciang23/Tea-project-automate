# HojichaYa — Marketing & Support Automation

Automation toolkit for **[HojichaYa](https://hojichaya.com)**, a Japanese tea shop
(hojicha, genmaicha, matcha) based in Malaysia, running on Shopify.

This repo automates three pillars of the business:

| Pillar | What it does | Status |
| --- | --- | --- |
| 🔎 **SEO** ([`/seo`](./seo)) | Optimize Shopify product/collection pages, meta tags, image alt text, and blog content for Malaysian tea search terms | 🟢 Audit + ready-to-apply content done |
| 📣 **Ads** ([`/ads`](./ads)) | Plan, launch, and manage Google Ads + Meta (FB/IG) campaigns | 🟡 Strategy + setup guides ready; needs ad-account access |
| 💬 **Messaging** ([`/messaging`](./messaging)) | Auto-reply to WhatsApp & Instagram DMs with a tea-shop FAQ + handoff bot | 🟡 Runnable scaffold; needs Meta API access |

## Store snapshot

- **Name:** HojichaYa · **Domain:** hojichaya.com
- **Market:** Malaysia · **Currency:** MYR · **Platform:** Shopify (Basic)
- **Core products:** Hojicha (Aka / Kyo), Genmaicha, Matcha (Kimidori), tea powders, teabags, bundles

## Quick start

1. Read [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for how the pieces fit together.
2. Read [`docs/SETUP.md`](./docs/SETUP.md) for every account, API key, and access token you'll need.
3. Each pillar folder has its own `README.md` with step-by-step instructions.

## What needs your input next

- **Ads & Messaging** require access tokens from your Meta Business and Google Ads
  accounts. See [`docs/SETUP.md`](./docs/SETUP.md) — nothing in those pillars sends live
  traffic or messages until you supply credentials.
- **SEO** content in [`/seo`](./seo) is drafted and ready; I can apply it directly to your
  Shopify store on your approval (it edits live product pages).

> ⚠️ No automation in this repo touches your live store, ad spend, or customer messages
> until you explicitly configure credentials and approve it.
