/**
 * HojichaYa business facts — the single source of truth for both the keyword bot
 * (knowledgeBase.js) and the LLM chatbot (shopify-chatbot/src/llm.js).
 *
 * Most fields were researched from the live site (hojichaya.com FAQ / About / Contact /
 * Wholesale pages) and the Shopify catalog in June 2026. A few are marked UNKNOWN /
 * unconfirmed — confirm those and update here, and every channel updates at once.
 *
 * Sources:
 *   FAQ      https://hojichaya.com/pages/faq
 *   About    https://hojichaya.com/pages/about-hojichaya
 *   Contact  https://hojichaya.com/pages/contact-us
 *   Wholesale https://hojichaya.com/pages/hojichaya-wholesale
 */

const SITE = "https://hojichaya.com";

const BUSINESS = {
  name: "HojichaYa",
  site: SITE,
  tagline: "Authentic Japanese tea, sourced from Kyoto, for Malaysia.",
  foundedYear: 2020,
  baseCity: "Kuala Lumpur, Malaysia",
  currency: "MYR (RM)",

  // --- Story / about (confirmed) ---
  story:
    "HojichaYa was started in 2020 by two young tea lovers with a simple mission: to " +
    "introduce hojicha (roasted green tea) to Malaysia. Teas are sourced directly from " +
    "partnered farms in Uji, Kyoto (and other regions like Wazuka, Yame and Miyazaki). " +
    "The founders are members of the Global Japanese Tea Association. The shop values " +
    "quality, sustainability, respect for tradition, and sharing Japanese tea culture.",

  // --- Contact (confirmed) ---
  contact: {
    email: "hello@hojichaya.com",
    altEmail: "hojichaya@gmail.com",
    whatsapp: "+60 11-5646 6231",
    whatsappLink: "https://wa.me/601156466231",
    instagram: "@hojichaya",
  },

  // --- Shipping (mostly confirmed) ---
  shipping: {
    coverage: "Within Malaysia — both West Malaysia and East Malaysia (Sabah & Sarawak)",
    freeOverWestMYR: 100, // free shipping over RM100 to West Malaysia
    freeOverEastMYR: 150, // free shipping over RM150 to East Malaysia
    flatRateWestMYR: null, // UNKNOWN — exact flat rate to West Malaysia (confirm)
    flatRateEastMYR: null, // UNKNOWN — exact flat rate to East Malaysia (confirm)
    origin: "Kuala Lumpur",
    processing: "2–4 business days",
    delivery: "about 2–7 days after dispatch",
    tracking: "Yes — a tracking number is emailed once the order ships",
    international: false, // appears Malaysia-only; not advertised. Confirm if you do ship abroad.
    internationalNote:
      "Currently shipping within Malaysia only; overseas customers can ask via WhatsApp/email.",
  },

  // --- Storage / freshness (confirmed from FAQ) ---
  storage: {
    sealedFreshDays: 180, // stays fresh ~180 days from packing
    drinkableUpToMonths: 12, // still drinkable within a year, with less freshness
    openedBestWithinMonths: 3, // once opened, best within 3 months
    place: "a cool, dark place, away from heat, moisture and strong smells",
  },

  // --- Returns / issues (no formal self-serve policy found) ---
  returns: {
    note:
      "For order changes, missing/damaged items, returns or refunds, contact the team with " +
      "your order number (chat, email hello@hojichaya.com, or WhatsApp). They'll sort it out.",
  },

  // --- Wholesale (confirmed) ---
  wholesale: {
    who: "Cafés, bakeries, restaurants, and other businesses",
    formats: "Larger formats such as 500g powders and 1kg loose leaf, at wholesale pricing",
    note:
      "Tea powders hold colour well through heat — good for lattes, ice-blended drinks, " +
      "baked goods and pastries. Enquire via the wholesale page form or WhatsApp.",
    page: SITE + "/pages/hojichaya-wholesale",
  },

  // --- Payment (UNKNOWN specifics) ---
  payment: {
    confirmed: false,
    note:
      "Secure checkout with the usual Malaysian online payment methods. " +
      "Exact methods (e.g. FPX, cards, e-wallets) not confirmed here — verify and update.",
  },

  // --- Halal (tea is naturally suitable; certification unconfirmed) ---
  halal: {
    naturallySuitable: true,
    certified: null, // UNKNOWN — official halal certification status (confirm)
    note:
      "The teas are pure Japanese tea leaves (genmaicha also has roasted rice) — no alcohol, " +
      "animal products, or additives. Official halal-certification status is not confirmed here.",
  },

  // --- Product range overview (from the live Shopify catalog) ---
  range:
    "Japanese tea across: Hojicha (roasted green tea — loose leaf, powder, teabags), " +
    "Genmaicha (green tea + roasted rice — loose leaf, powder, teabags) and Hoji-Genmaicha, " +
    "Matcha (everyday to ceremonial-grade Uji matcha + confectionery grade for baking), " +
    "Sencha and Gyokuro, plus Oolong and seasonal teas, teaware (bamboo whisk/chasen, scoops, " +
    "bowls), bundles, samplers and gift cards.",

  pages: {
    faq: SITE + "/pages/faq",
    about: SITE + "/pages/about-hojichaya",
    contact: SITE + "/pages/contact-us",
    wholesale: SITE + "/pages/hojichaya-wholesale",
    blog: SITE + "/blogs/blog",
  },

  // Facts still to confirm (the bot avoids asserting these).
  unknowns: [
    "Exact flat-rate shipping cost to West Malaysia (and East Malaysia)",
    "Accepted payment methods (FPX / cards / e-wallets / etc.)",
    "Official halal certification status",
    "Whether any international shipping is offered",
  ],
};

/** Compact facts block for the LLM system prompt. */
function businessFactsText() {
  const s = BUSINESS.shipping;
  const st = BUSINESS.storage;
  const c = BUSINESS.contact;
  return [
    `Business: ${BUSINESS.name} — ${BUSINESS.tagline} Founded ${BUSINESS.foundedYear}, based in ${BUSINESS.baseCity}. Prices in ${BUSINESS.currency}.`,
    `Story: ${BUSINESS.story}`,
    `Product range: ${BUSINESS.range}`,
    `Shipping: ${s.coverage}. Free shipping over RM${s.freeOverWestMYR} to West Malaysia and over RM${s.freeOverEastMYR} to East Malaysia; otherwise a flat rate applies (exact amount not listed here — say it's shown at checkout). Posted from ${s.origin} within ${s.processing}; arrives ${s.delivery}; ${s.tracking}. ${s.internationalNote}`,
    `Storage/freshness: keep in ${st.place}. Sealed, stays fresh ~${st.sealedFreshDays} days from packing (drinkable up to ~${st.drinkableUpToMonths} months, less vibrant). Once opened, best within ${st.openedBestWithinMonths} months.`,
    `Returns/issues: ${BUSINESS.returns.note}`,
    `Wholesale: ${BUSINESS.wholesale.who}. ${BUSINESS.wholesale.formats}. ${BUSINESS.wholesale.note} Page: ${BUSINESS.wholesale.page}`,
    `Halal: ${BUSINESS.halal.note}`,
    `Payment: ${BUSINESS.payment.note}`,
    `Contact: email ${c.email} (or ${c.altEmail}), WhatsApp ${c.whatsapp} (${c.whatsappLink}), Instagram ${c.instagram}.`,
    `Do NOT invent or assert any of these unconfirmed facts — offer to connect a human instead: ${BUSINESS.unknowns.join("; ")}.`,
  ].join("\n");
}

module.exports = { BUSINESS, businessFactsText, SITE };
