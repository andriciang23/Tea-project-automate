# SEO apply script

`apply-seo.js` pushes the optimized SEO content (titles, meta descriptions, image alt text)
from [`../optimized-content/products.json`](../optimized-content/products.json) to the live
Shopify store.

## Prerequisites

- Node 18+ (uses built-in `fetch`, no `npm install`).
- A **Shopify Admin API access token** with `write_products` scope:
  Shopify admin → Settings → Apps and sales channels → Develop apps → create a custom app
  → Admin API scopes: `read_products`, `write_products` → install → reveal the
  `shpat_...` token.

## Usage

```bash
# Dry run — prints exactly what it would change, writes nothing
SHOPIFY_STORE_DOMAIN=hojichaya.com \
SHOPIFY_ADMIN_TOKEN=shpat_xxx \
node apply-seo.js

# Apply for real
SHOPIFY_STORE_DOMAIN=hojichaya.com \
SHOPIFY_ADMIN_TOKEN=shpat_xxx \
node apply-seo.js --apply
```

## What it changes (and doesn't)

- ✅ Sets SEO title + meta description (`seo` field) per product.
- ✅ Sets featured-image alt text.
- ❌ Does **not** touch product titles, prices, body HTML, or variants.

> Alternative: you can skip the token entirely and just ask Claude to apply the same
> `products.json` through its Shopify integration — it will show each change first.
