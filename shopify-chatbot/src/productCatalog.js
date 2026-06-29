/**
 * Product catalog used to ground the chatbot's answers.
 *
 * Curated from the live Shopify catalog (June 2026) — the main customer-facing retail
 * products (wholesale-only and out-of-stock items omitted). "from" prices are in MYR and
 * may change; the bot treats them as indicative and points to the live product page.
 *
 * To refresh: ask Claude to "refresh the chatbot product catalog from Shopify".
 */

const SITE = "https://hojichaya.com";

const products = [
  // --- Hojicha (roasted green tea) ---
  { name: 'Signature Hojicha Dark Roast "Aka"', handle: "dark-roast", type: "Hojicha · loose leaf", from: 35,
    blurb: "Deep, smoky dark-roast hojicha with notes of vanilla and warm charcoal. Low caffeine." },
  { name: 'Hojicha "Kyo"', handle: "hojicha-kyo", type: "Hojicha · loose leaf", from: 35,
    blurb: "Traditional charcoal-roasted hojicha — sweet, smoky, no bitterness. Low caffeine." },
  { name: 'Hojicha Powder "Kaori"', handle: "hojicha-kaori", type: "Hojicha · powder", from: 45,
    blurb: "Roasted green tea powder for lattes, baking and desserts." },
  { name: "Dark Roast Hojicha Powder", handle: "dark-roast-hojicha-powder", type: "Hojicha · powder", from: 45,
    blurb: "Bolder, darker hojicha powder for a stronger roasted flavour in lattes and bakes." },
  { name: "Hojicha Teabags", handle: "hojicha-tea-bags", type: "Hojicha · teabags", from: 40,
    blurb: 'Signature "Aka" hojicha in convenient teabags. 20 bags. Low caffeine.' },
  { name: "Hoji-Genmaicha", handle: "hoji-genmaicha", type: "Hojicha + rice · loose leaf", from: 40,
    blurb: "Hojicha Kyo blended with roasted brown rice — roasted, sweet and nutty." },

  // --- Genmaicha (green tea + roasted rice) ---
  { name: "Genmaicha Midori", handle: "genmaicha", type: "Genmaicha · loose leaf", from: 30,
    blurb: "Green tea with roasted brown rice — nutty, comforting, easy-drinking." },
  { name: 'Genmaicha Powder "Asa-Midori"', handle: "genmaicha-powder", type: "Genmaicha · powder", from: 45,
    blurb: "Sencha + roasted rice powder — nutty and smooth, for lattes and baking." },
  { name: "Genmaicha Teabags", handle: "genmaicha-teabags", type: "Genmaicha · teabags", from: 40,
    blurb: "Genmaicha Midori in easy teabags. 20 bags." },

  // --- Matcha (everyday → ceremonial → culinary) ---
  { name: "Kimidori Matcha", handle: "kimidori-matcha", type: "Matcha · everyday", from: 50,
    blurb: "Uji matcha, vibrant green, mellow and smooth — great for lattes and whisking." },
  { name: "YAMA Signature Matcha", handle: "yama-signature-matcha", type: "Matcha · everyday/drinks", from: 90,
    blurb: "House blend made for everyday drinks and lattes." },
  { name: "Kitsune Matcha — First Harvest Uji", handle: "kitsune-matcha", type: "Matcha · ceremonial", from: 90,
    blurb: "Signature ceremonial-grade Uji matcha from aged tencha — smooth for whisking." },
  { name: "Takamidori Matcha", handle: "takamidori-matcha-たかみどり", type: "Matcha · ceremonial", from: 70,
    blurb: "Uji matcha, vibrant green and mellow with a slight pleasant bitterness." },
  { name: "Wazuka Okumidori — Single Cultivar", handle: "wazuka-okumidori-single-cultivar-spring-harvest-matcha", type: "Matcha · ceremonial", from: 150,
    blurb: "Premium single-cultivar ceremonial matcha from Wazuka, Kyoto — rich and bold." },
  { name: "Matcha Kiyo — Confectionery Grade", handle: "matcha-kiyo-premium-confectionary-grade", type: "Matcha · culinary", from: 30,
    blurb: "Confectionery-grade matcha for desserts and baking that need intense matcha flavour." },

  // --- Sencha / Gyokuro / other ---
  { name: "Kyoto Sencha", handle: "kyoto-sencha", type: "Sencha · loose leaf", from: 40,
    blurb: "First-flush Kyoto sencha — refreshing, with umami, sweetness and gentle astringency." },
  { name: "Yame Sencha", handle: "yame-sencha", type: "Sencha · loose leaf", from: 50,
    blurb: "First-flush sencha from the mountains of Yame — aromatic and sweet." },
  { name: "Yame Gyokuro", handle: "yame-gyokuro", type: "Gyokuro · loose leaf", from: 50,
    blurb: "Shaded Yame gyokuro — rich, sweet and full of umami." },
  { name: "Miyazaki Oolong Tea", handle: "oolong", type: "Oolong · loose leaf", from: 80,
    blurb: "A rare Japanese oolong from Miyazaki." },

  // --- Bundles, gifting, teaware ---
  { name: "Japanese Tea Powder Trio", handle: "japanese-tea-powder-trio", type: "Bundle · powders", from: 135,
    blurb: "Hojicha + Genmaicha + Matcha powders — for bakers and baristas." },
  { name: "HojichaYa Loose Leaf Bundle", handle: "hojichaya-essentials-bundle", type: "Bundle · loose leaf", from: 80,
    blurb: "Best-seller loose-leaf bundle — a great first taste of our Kyoto favourites." },
  { name: "HojichaYa Gift Card", handle: "hojichaya-gift-card", type: "Gift card", from: 50,
    blurb: "Let them pick their own teas — RM50 or RM100." },
  { name: "Chasen — Bamboo Matcha Whisk", handle: "chasen-茶筅-japanese-bamboo-whisk-for-tea-ceremony", type: "Teaware", from: 100,
    blurb: "Handmade bamboo whisk for preparing matcha." },
  { name: "Chashaku — Tea Scoop", handle: "chashaku-茶杓-traditional-japanese-tea-scoop", type: "Teaware", from: 15,
    blurb: "Traditional bamboo scoop for measuring matcha." },
];

/** Render the catalog as compact text for the LLM system prompt. */
function catalogText() {
  return products
    .map((p) => `- ${p.name} (${p.type}) — from RM${p.from} — ${SITE}/products/${p.handle}\n    ${p.blurb}`)
    .join("\n");
}

module.exports = { products, catalogText, SITE };
