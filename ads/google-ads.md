# Google Ads plan

## Account structure

```
HojichaYa (Google Ads)
├── Campaign: Search — Brand              [budget RM3/day]
│   └── Ad group: HojichaYa brand terms
├── Campaign: Search — Hojicha            [budget RM6/day]
│   ├── Ad group: hojicha (loose leaf)
│   └── Ad group: hojicha powder
├── Campaign: Search — Matcha             [budget RM6/day]
│   └── Ad group: matcha powder
├── Campaign: Search — Genmaicha          [budget RM2/day]
└── Campaign: Performance Max — Shopping  [budget RM3/day, scale later]
    └── Asset group: All teas (feed-driven)
```

Start with Search (intent) + a small PMax once Merchant Center is approved. PMax needs the
product feed from Shopify's **Google sales channel**.

## Keywords

### Brand (exact/phrase) — cheap, protects your name
`[hojichaya]`, `[hojicha ya]`, `"hojichaya matcha"`

### Hojicha ad group
- Phrase: `"hojicha malaysia"`, `"hojicha powder"`, `"buy hojicha"`, `"hojicha tea"`
- Exact: `[hojicha malaysia]`, `[hojicha powder malaysia]`, `[roasted green tea]`

### Matcha ad group
- Phrase: `"matcha powder malaysia"`, `"matcha malaysia"`, `"buy matcha online"`,
  `"ceremonial matcha"`, `"uji matcha"`
- Exact: `[matcha powder malaysia]`, `[matcha malaysia]`

### Genmaicha ad group
- Phrase: `"genmaicha"`, `"genmaicha malaysia"`, `"brown rice green tea"`

### Negative keywords (add at campaign level)
`free`, `recipe` (move to organic/blog), `jobs`, `wholesale` *(unless you want B2B)*,
`kit kat`, `starbucks`, `secondhand`, competitor brand names, `how to make` (informational).

## Responsive Search Ad copy

Use 12–15 headlines + 4 descriptions per ad group. Pull from [`ad-copy.md`](./ad-copy.md).
Example (Matcha ad group):

**Headlines:** `Matcha Powder Malaysia` · `Authentic Uji Japanese Matcha` · `Smooth, Mellow
Ceremonial Matcha` · `Free Shipping Over RM150` · `Shop HojichaYa Matcha` · `Whisk a Café
Matcha Latte at Home` · `Vibrant Green, Never Bitter`
**Descriptions:** `Premium Uji matcha, mellow and smooth. From RM50. Order online, fast MY
delivery.` · `Loved by Malaysian matcha drinkers. Whisk lattes at home. Shop HojichaYa.`

Add **sitelinks** (Hojicha, Matcha, Genmaicha, Bundles), **callouts** (Free shipping over
RMxxx, Authentic Japanese, Low caffeine), and **price/promotion** extensions.

## Bidding

- Start **Maximize Clicks** with a max CPC cap (~RM1.50) for 1–2 weeks to gather data.
- Switch to **Maximize Conversions / Target CPA** once you have ~15–30 conversions.
- PMax: **Maximize Conversion Value**, set a tROAS only after it has data.

## Setup checklist

- [ ] Google Ads account in Expert Mode
- [ ] Conversion tracking (purchase) verified firing
- [ ] Merchant Center linked + product feed approved (via Shopify Google channel)
- [ ] Brand + Hojicha + Matcha search campaigns live
- [ ] Negatives applied; UTM tracking template set
- [ ] PMax launched after feed approval
