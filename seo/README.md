# SEO pillar

Goal: rank HojichaYa for high-intent Malaysian tea searches and convert that traffic.

## Files

| File | What it is |
| --- | --- |
| [`audit.md`](./audit.md) | Audit of the current live store (run 2026-06-16) with prioritized fixes |
| [`keyword-strategy.md`](./keyword-strategy.md) | Target keywords for the Malaysian tea market, mapped to pages |
| [`optimized-content/`](./optimized-content) | Ready-to-apply SEO titles, meta descriptions, alt text, and body copy per product |
| [`blog-plan.md`](./blog-plan.md) | Content calendar for the Shopify blog (the long-tail SEO engine) |
| [`scripts/`](./scripts) | Optional Node script to push the optimized content to Shopify |

## How to apply

**Easiest:** ask Claude — "apply the SEO content for Hojicha Aka" — and it will update the
product via the Shopify API after showing you the change.

**Manual:** open each product in Shopify admin → edit the **title** and **description**,
then scroll to **Search engine listing → Edit** to set the SEO title & meta description,
and set **image alt text** on each product image.

**Scripted:** see [`scripts/README.md`](./scripts/README.md).

## Measuring results

- Connect **Google Search Console** (verify via DNS or the Shopify theme) and submit
  `https://hojichaya.com/sitemap.xml`.
- Track impressions/clicks per query monthly. Expect movement in 4–8 weeks.
- Watch Shopify Analytics → "Online store sessions by referrer → Search" for organic
  growth.
