# Ads automation

How to take the manual work out of running campaigns. Start with the platforms' built-in
rules (zero code), graduate to API scripts when you want custom logic or unified reporting.

## Tier 1 — built-in automated rules (do this first, no code)

### Meta automated rules (Ads Manager → Rules)
- **Pause losers:** if `cost per purchase > RM40` AND `spend > RM30` in last 3 days → pause
  ad set. Notify only (don't auto-pause) for the first few weeks.
- **Scale winners:** if `ROAS > 3` AND `spend > RM30` last 3 days → increase budget 20%
  (max once/day).
- **Creative fatigue:** if `frequency > 3` AND `CTR` dropped >30% → notify to refresh.

### Google Ads automated rules (Tools → Rules) + scripts
- Pause keywords with `cost > RM30` AND `0 conversions` (last 14 days).
- Raise/lower CPC caps by performance bands.
- Email a weekly performance summary.

## Tier 2 — API automation (this repo)

When you're ready, scripts here will use the **Google Ads API** and **Meta Marketing API**
(credentials per [`docs/SETUP.md`](../docs/SETUP.md)) to:

1. **Weekly report** → pull spend / ROAS / CPA per campaign from both platforms + actual
   orders from Shopify, and post a single digest (e.g. to email or WhatsApp via the
   messaging pillar).
2. **Budget pacing** → shift daily budget toward the lower-CPA channel automatically,
   within guardrails.
3. **Inventory-aware ads** → pause ads for products that go out of stock (read Shopify
   inventory), resume when restocked. *(High value for HojichaYa — many SKUs sell out.)*
4. **Creative rotation reminders** → flag fatigued Meta creatives.

> Planned location: `ads/scripts/` (Node). Not built yet — needs ad-account tokens first.
> Tell Claude "build the weekly ads report script" once credentials are in `.env`.

## Guardrails (always)

- Hard daily + monthly spend caps at the account level.
- Auto-actions should **notify-first** for the first 2–4 weeks before allowing auto-pause /
  auto-scale.
- Trust **Shopify orders** over platform-reported conversions for money decisions.
