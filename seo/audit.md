# SEO audit — HojichaYa (2026-06-16)

Based on live product data pulled from the Shopify Admin API.

## Summary

HojichaYa has strong, genuinely differentiated products (real Japanese hojicha/matcha,
roasted in-house branding) but the catalog has accumulated clutter and the SEO basics
(meta titles, meta descriptions, alt text, "Malaysia" geo-keywords) are inconsistent. The
biggest wins are cheap: tighten titles, write meta descriptions, geo-target Malaysia, and
clean up draft/duplicate products that dilute crawl focus.

## Findings & priorities

### 🔴 High impact

1. **No geo-targeting in titles.** Titles like *"Hojicha Powder Kaori"* don't contain
   "Malaysia". Malaysians search *"hojicha powder malaysia"*, *"matcha malaysia"*,
   *"buy matcha online malaysia"*. Add the modifier to SEO titles (not necessarily the
   on-page H1). See [`keyword-strategy.md`](./keyword-strategy.md).
2. **Missing/auto-generated meta descriptions.** Each product needs a hand-written
   150–160 char meta description with the keyword + a reason to click (price from RMxx,
   free shipping threshold, low caffeine, etc.). Drafted in `optimized-content/`.
3. **Catalog clutter hurting crawl & trust.** Several products are `DRAFT` and/or
   permanently out of stock:
   - `Backup Hojicha Aka` — internal/backup item, should never be public-facing.
   - `Suzume Kukicha` (tag: *Legacy*), `Kyobancha`, `Genmai`, `Hojicha Natsu`,
     `Sakura Sencha`, `Obukucha`, old bundles, `Tea Scoop Yume`, anniversary bundle.
   Decide per item: **archive** (gone for good) vs **keep as draft** (seasonal, returning).
   Archived items shouldn't 404 — set up redirects to the closest live product.

### 🟡 Medium impact

4. **Inconsistent product-type taxonomy.** `productType` values are mixed:
   `Hojicha`, `Genmaicha`, `Genmai`, `Tea`, `Tea Powder`, `Tea & Infusions`, `Bundle`,
   and several blank. Normalize so collections and the Google/Meta feed categorize
   cleanly. Suggested set: `Hojicha`, `Genmaicha`, `Matcha`, `Sencha`, `Teabags`,
   `Bundle`, `Accessories`.
5. **Image alt text.** Product images appear to use filename-style URLs; alt text should
   describe the product + keyword, e.g. *"HojichaYa roasted hojicha green tea powder,
   50g tin — Malaysia"*. Helps image search + accessibility.
6. **Thin collection pages.** Collections should have a 60–120 word intro paragraph with
   keywords (e.g. a "Hojicha" collection page targeting *"hojicha malaysia"*). These intro
   blocks rank surprisingly well.
7. **Duplicate SKU `HJ-D-1-1-1`** appears on both `Hojicha Kyo` and `Backup Hojicha Aka` —
   clean up to avoid feed/inventory confusion.

### 🟢 Low impact / housekeeping

8. **Handles are mostly good** (`dark-roast`, `hojicha-kaori`). One has non-ASCII:
   `sakura-sencha-桜煎茶` — if revived, change to `sakura-sencha`.
9. **Bundles** are a conversion strength — make sure the live ones
   (`Japanese Tea Powder Trio`) have strong meta + are linked from related products.
10. **Negative inventory** on `HojichaYa Tasting Pack` variant (-5) — fix oversold count.

## Quick-win checklist (do these first)

- [ ] Archive/redirect `Backup Hojicha Aka` and clearly-dead legacy items.
- [ ] Add hand-written SEO title + meta description to every **active** product
      (content ready in `optimized-content/`).
- [ ] Add Malaysia-geo alt text to each active product's primary image.
- [ ] Normalize `productType` across active products.
- [ ] Create/refresh "Hojicha", "Matcha", "Genmaicha" collections with intro copy.
- [ ] Connect Google Search Console + submit sitemap.
- [ ] Publish the first 2 blog posts from [`blog-plan.md`](./blog-plan.md).

## Active products in scope (as of audit)

| Product | Handle | Type | From (MYR) |
| --- | --- | --- | --- |
| Signature Hojicha Dark Roast "Aka" | `dark-roast` | Hojicha | 35 |
| Hojicha Powder "Kaori" | `hojicha-kaori` | Hojicha | 45 |
| Hojicha Teabags | `hojicha-tea-bags` | Teabags | 40 |
| Genmaicha Midori | `genmaicha` | Genmaicha | 30 |
| Hojicha "Kyo" | `hojicha-kyo` | Hojicha | 35 |
| Genmaicha Teabags | `genmaicha-teabags` | Teabags | 40 |
| Genmaicha Powder "Asa-Midori" | `genmaicha-powder` | Genmaicha | 45 |
| Kimidori Matcha | `kimidori-matcha` | Matcha | 50 |
| Japanese Tea Powder Trio | `japanese-tea-powder-trio` | Bundle | 135 |
