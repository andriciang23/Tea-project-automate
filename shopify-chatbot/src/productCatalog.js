/**
 * Lightweight product catalog used to ground the chatbot's answers.
 *
 * Keep this in sync with the live store (or, better, regenerate it from the Shopify
 * Admin API — ask Claude to "refresh the chatbot product catalog from Shopify").
 * Prices are "from" prices in MYR and may change — the bot is instructed to treat them
 * as indicative and point customers to the live product page for the current price.
 */

const SITE = "https://hojichaya.com";

const products = [
  { name: 'Signature Hojicha Dark Roast "Aka"', handle: "dark-roast", type: "Hojicha", from: 35,
    blurb: "Smoky, deep-roasted loose-leaf hojicha with notes of vanilla and warm charcoal. Low caffeine." },
  { name: 'Hojicha "Kyo"', handle: "hojicha-kyo", type: "Hojicha", from: 35,
    blurb: "Traditional charcoal-roasted loose-leaf hojicha — sweet, smoky, no bitterness. Low caffeine." },
  { name: 'Hojicha Powder "Kaori"', handle: "hojicha-kaori", type: "Hojicha powder", from: 45,
    blurb: "Roasted green tea powder for lattes, baking and desserts." },
  { name: "Hojicha Teabags", handle: "hojicha-tea-bags", type: "Teabags", from: 40,
    blurb: 'Signature "Aka" hojicha in convenient teabags. 20 bags. Low caffeine.' },
  { name: "Genmaicha Midori", handle: "genmaicha", type: "Genmaicha", from: 30,
    blurb: "Japanese green tea with roasted brown rice — nutty and comforting. Loose leaf." },
  { name: "Genmaicha Teabags", handle: "genmaicha-teabags", type: "Teabags", from: 40,
    blurb: "Genmaicha roasted-rice green tea in easy teabags. 20 bags." },
  { name: 'Genmaicha Powder "Asa-Midori"', handle: "genmaicha-powder", type: "Genmaicha powder", from: 45,
    blurb: "Sencha + roasted rice powder, nutty and smooth, for lattes and baking." },
  { name: "Kimidori Matcha", handle: "kimidori-matcha", type: "Matcha", from: 50,
    blurb: "Premium Uji-grown Japanese matcha powder — vibrant green, mellow, smooth. For lattes and whisking." },
  { name: "Japanese Tea Powder Trio", handle: "japanese-tea-powder-trio", type: "Bundle", from: 135,
    blurb: "Matcha + hojicha + genmaicha powders — for bakers and baristas." },
];

/** Render the catalog as compact text for the LLM system prompt. */
function catalogText() {
  return products
    .map((p) => `- ${p.name} (${p.type}) — from RM${p.from} — ${SITE}/products/${p.handle}\n    ${p.blurb}`)
    .join("\n");
}

module.exports = { products, catalogText, SITE };
