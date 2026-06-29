/**
 * HojichaYa FAQ knowledge base — shared by the messaging bot (WhatsApp/Instagram)
 * and the Shopify storefront chatbot, so answers are maintained in ONE place.
 *
 * Facts come from shared/businessInfo.js (researched from the live site + Shopify catalog),
 * so updating a number there updates every reply here.
 *
 * Each intent has:
 *   - keywords:  lowercase words/phrases that map a message to this intent.
 *                Matching is WHOLE-WORD (see autoReply.js): "hi" matches the word "hi"
 *                but not "this" or "shipping". Multi-word phrases match in order.
 *   - reply:     the auto-reply text (warm, concise, on-brand)
 *   - handoff:   true if the answer implies a human should follow up
 */

const { BUSINESS, SITE } = require("./businessInfo");

const C = BUSINESS.contact;
const S = BUSINESS.shipping;
const ST = BUSINESS.storage;

const intents = [
  {
    name: "greeting",
    keywords: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "helo", "halo", "hai", "salam", "assalamualaikum"],
    reply:
      "Hi! 🍵 Welcome to HojichaYa — authentic Japanese tea from Kyoto, here in Malaysia. " +
      "Ask me about our teas, shipping, brewing, storage, halal, or wholesale and I'll help. " +
      `You can also browse everything at ${SITE}.`,
  },
  {
    name: "about",
    keywords: ["about you", "about hojichaya", "your story", "who are you", "your company", "where is your tea from", "where do you source", "sourcing", "uji", "kyoto", "authentic", "real japanese"],
    reply:
      "HojichaYa was started in 2020 by two tea lovers to bring hojicha (roasted green tea) " +
      "to Malaysia 🍵 We source directly from partnered farms in Uji, Kyoto and other regions " +
      `of Japan. More on our story: ${BUSINESS.pages.about}.`,
  },
  {
    name: "shipping",
    keywords: ["shipping", "delivery", "postage", "deliver", "ship", "courier", "how long to", "how long does delivery", "how long does shipping", "when will it", "when will i get", "arrive", "tracking", "track", "poslaju", "west malaysia", "east malaysia", "sabah", "sarawak", "semenanjung", "shipping cost", "shipping fee"],
    reply:
      `We ship across Malaysia 🇲🇾 (West & East). Free shipping over RM${S.freeOverWestMYR} to ` +
      `West Malaysia and over RM${S.freeOverEastMYR} to East Malaysia (Sabah & Sarawak); below ` +
      `that a flat shipping rate shows at checkout. Orders are posted from ${S.origin} within ` +
      `${S.processing} and arrive in ${S.delivery}, with a tracking number by email.`,
  },
  {
    name: "international_shipping",
    keywords: ["international", "overseas", "outside malaysia", "singapore", "brunei", "worldwide", "export", "ship abroad", "another country"],
    reply:
      "At the moment we ship within Malaysia only. If you're overseas and keen, message us at " +
      `${C.email} or WhatsApp ${C.whatsapp} with your country and what you'd like, and we'll ` +
      "let you know what's possible.",
    handoff: true,
  },
  {
    name: "order_status",
    keywords: ["where is my order", "order status", "my order", "haven't received", "not received", "not arrived", "didn't arrive", "order number", "missing order", "track my order", "late"],
    reply:
      "I can help with your order. Please share your *order number* (e.g. #1234) and the name " +
      `or email used at checkout — or message ${C.email} / WhatsApp ${C.whatsapp} — and the team ` +
      "will look it up. The tracking link in your shipping email also shows live status.",
    handoff: true,
  },
  {
    name: "hojicha_what",
    keywords: ["what is hojicha", "about hojicha", "hojicha caffeine", "caffeine", "low caffeine", "caffeine free", "pregnant", "pregnancy", "night", "evening tea", "jittery"],
    reply:
      "Hojicha is a *roasted* Japanese green tea — roasted over high heat so it's warm, smoky " +
      "and naturally low in caffeine, which is why many enjoy it in the evening. We have it as " +
      `loose leaf (Aka & Kyo), powder (lattes/baking), and teabags: ${SITE}/collections/hojicha.`,
  },
  {
    name: "matcha",
    keywords: ["matcha", "kimidori", "kitsune", "takamidori", "ceremonial", "culinary", "confectionary", "confectionery", "yama", "wazuka", "okumidori"],
    reply:
      "We carry a full matcha range — everyday blends like Kimidori & YAMA Signature, " +
      "ceremonial-grade Uji matcha like Kitsune & Wazuka Okumidori, and confectionery-grade " +
      `Matcha Kiyo for baking. From RM50: ${SITE}/collections/tea-powders. Tell me if it's for ` +
      "lattes, whisking, or baking and I'll point you to the right one!",
  },
  {
    name: "genmaicha",
    keywords: ["genmaicha", "genmai", "brown rice tea", "roasted rice", "rice tea", "hoji-genmaicha", "hoji genmaicha"],
    reply:
      "Genmaicha is Japanese green tea blended with roasted brown rice — nutty and comforting. " +
      "We have Genmaicha Midori (loose leaf), Genmaicha Powder, teabags, and Hoji-Genmaicha (a " +
      `roasted hojicha + rice blend): ${SITE}.`,
  },
  {
    name: "other_teas",
    keywords: ["sencha", "gyokuro", "oolong", "wakoucha", "black tea", "green tea", "what other tea", "other teas"],
    reply:
      "Beyond hojicha, genmaicha and matcha, we also stock Sencha and Gyokuro (refined Kyoto " +
      `green teas), Japanese Oolong, and seasonal teas. Browse them all at ${SITE}/collections/all.`,
  },
  {
    name: "teaware",
    keywords: ["chasen", "whisk", "chashaku", "scoop", "bowl", "chawan", "teaware", "tools", "matcha set", "starter kit", "kit"],
    reply:
      "Yes — we stock teaware for matcha: bamboo whisks (chasen), tea scoops (chashaku), and " +
      `tea bowls, so you can whisk café-style matcha at home. See them at ${SITE}.`,
  },
  {
    name: "brewing",
    keywords: ["how to brew", "how to make", "how do i make", "brew", "steep", "how to prepare", "latte", "recipe", "temperature", "how much tea", "ratio", "whisk matcha"],
    reply:
      "Brewing tips 🍵\n• *Loose leaf hojicha/genmaicha/sencha:* ~1 tbsp per cup, hot water " +
      "(80–95°C; sencha cooler), steep 30–60s.\n• *Matcha:* ~1–2g (½–1 tsp) sifted, ~70–80°C " +
      "water, whisk well; top with warm milk for a latte.\n• *Powders* dissolve into milk for " +
      `quick lattes. More guides on our blog: ${BUSINESS.pages.blog}.`,
  },
  {
    name: "storage",
    keywords: ["how to store", "how do i store", "store my", "storing", "store", "storage", "keep fresh", "keep it fresh", "how to keep", "shelf life", "expiry", "expiration", "best before", "expire", "fridge", "freshness", "how long", "last", "keeps"],
    reply:
      `Keep your tea in ${ST.place}. Sealed, it stays fresh for about ${ST.sealedFreshDays} days ` +
      `from packing (still drinkable up to a year, just less vibrant). Once opened, enjoy within ` +
      `about ${ST.openedBestWithinMonths} months for the best flavour. 🍵`,
  },
  {
    name: "halal",
    keywords: ["halal", "haram", "pork", "alcohol", "syariah", "muslim", "jakim"],
    reply:
      "Our teas are simply pure Japanese tea leaves (genmaicha also has roasted rice) — no " +
      "alcohol, no animal products, no additives. For the latest on official halal certification, " +
      `I'll have our team confirm — drop us a note at ${C.email} or WhatsApp ${C.whatsapp}. 🍵`,
    handoff: true,
  },
  {
    name: "ingredients",
    keywords: ["vegan", "vegetarian", "allergy", "allergen", "allergic", "gluten", "dairy", "milk", "nuts", "ingredient", "ingredients", "additive", "sugar", "preservative", "caffeine content"],
    reply:
      "Our loose-leaf teas and powders are just tea (genmaicha also has roasted rice) — " +
      "naturally plant-based, with no added dairy, nuts, sugar, or preservatives. If you have a " +
      "specific allergy concern, tell me and our team will double-check for you.",
    handoff: true,
  },
  {
    name: "availability",
    keywords: ["in stock", "out of stock", "stock", "available", "availability", "sold out", "restock", "back in stock", "ready stock"],
    reply:
      `Live stock shows on each product page at ${SITE} — if you can add it to cart, it's ` +
      "available. If something you want is sold out, tell me which and our team can let you " +
      "know about a restock.",
    handoff: true,
  },
  {
    name: "wholesale",
    keywords: ["wholesale", "bulk", "cafe", "café", "kedai", "business", "reseller", "supply", "supplier", "b2b", "1kg", "distributor", "corporate", "bulk order", "restaurant", "bakery", "barista"],
    reply:
      `We'd love to supply your café or business! 🤝 We offer larger formats (500g powders, 1kg ` +
      `loose leaf) at wholesale pricing — powders hold colour well for lattes, ice-blended drinks ` +
      `and baking. Enquire via ${BUSINESS.pages.wholesale} or WhatsApp ${C.whatsapp}.`,
    handoff: true,
  },
  {
    name: "gift",
    keywords: ["gift", "present", "hadiah", "gift set", "hamper", "for my friend", "for a friend", "gift card", "gift voucher"],
    reply:
      "Lovely idea 🎁 — our bundles (like the Japanese Tea Powder Trio or Loose Leaf Bundle) make " +
      `great gifts, and we also have gift cards if they'd like to pick their own. Browse at ${SITE}. ` +
      "Tell me a budget and who it's for and I'll suggest something!",
  },
  {
    name: "discount",
    keywords: ["discount", "promo", "promotion", "voucher", "coupon", "code", "sale", "offer", "cheaper", "deal", "free shipping"],
    reply:
      `Free shipping kicks in over RM${S.freeOverWestMYR} (West Malaysia) / RM${S.freeOverEastMYR} ` +
      `(East Malaysia). Any current promo codes show on our site and at checkout: ${SITE}. ` +
      "Joining our newsletter is the best way to hear about deals first.",
  },
  {
    name: "price",
    keywords: ["price", "how much", "cost", "harga", "berapa", "rm", "ringgit", "pricing"],
    reply:
      "Loose-leaf teas start from around RM30, powders from RM45, matcha from RM50, with bundles " +
      `for better value. Live pricing is on each product page: ${SITE}. Tell me which tea you're ` +
      "interested in and I'll point you straight to it!",
  },
  {
    name: "payment",
    keywords: ["payment", "pay", "fpx", "card", "credit card", "debit", "bank transfer", "grabpay", "tng", "touch n go", "touchngo", "duitnow", "ewallet", "e-wallet", "cod", "cash on delivery"],
    reply:
      "You can pay securely at checkout using the usual Malaysian online payment methods. If " +
      `you'd like to confirm a specific method, just ask and we'll help — or check out at ${SITE}.`,
  },
  {
    name: "contact",
    keywords: ["contact", "email", "phone", "whatsapp", "call you", "reach you", "your instagram", "your number", "speak to your team", "message you"],
    reply:
      `You can reach us by email at ${C.email}, WhatsApp ${C.whatsapp}, or Instagram ${C.instagram}. ` +
      "You can also leave your question right here and we'll make sure it reaches a human. 🍵",
    handoff: true,
  },
  {
    name: "store_location",
    keywords: ["where are you", "location", "shop address", "physical store", "outlet", "pickup", "pick up", "self collect", "self-collect", "address", "based", "showroom", "visit"],
    reply:
      "We're an online tea shop based in Kuala Lumpur, shipping nationwide. For any pickup or " +
      `visit questions, message us at ${C.email} / WhatsApp ${C.whatsapp} and the team will advise.`,
    handoff: true,
  },
  {
    name: "products_overview",
    keywords: ["what do you sell", "sell", "selling", "what tea", "what teas", "which tea", "your teas", "products", "menu", "catalogue", "catalog", "what do you have", "selection", "recommend", "recommendation", "suggestion", "best seller", "bestseller", "popular", "which is best", "beginner"],
    reply:
      "We specialise in Japanese tea 🍵 — Hojicha (roasted, low caffeine), Genmaicha (green tea + " +
      "roasted rice), and a full Matcha range (everyday to ceremonial), plus Sencha, Gyokuro, " +
      `Oolong, teaware, bundles and gift cards. Browse everything at ${SITE}. New to us? The ` +
      "Loose Leaf Bundle or a teabag set is a great start — tell me your taste and I'll suggest one!",
  },
  {
    name: "thanks",
    keywords: ["thank", "thanks", "terima kasih", "tq", "thank you", "appreciate"],
    reply: "You're very welcome! 🍵 Enjoy your tea, and reach out any time.",
  },
];

// Shown when nothing matches — offers help. handoff:false so we don't promise a
// follow-up on every unknown message (the text already offers a human if wanted).
const fallback = {
  name: "fallback",
  handoff: false,
  reply:
    "Thanks for your message! 🍵 I can help with our teas, shipping, brewing, storage, halal, " +
    "pricing, gifts, and wholesale. Could you tell me a bit more about what you need? " +
    `If you'd like a person, just say "talk to a human" and our team will follow up.`,
};

// Explicit human-handoff request (refunds, returns, complaints, etc.).
const handoffIntent = {
  name: "handoff",
  keywords: ["human", "real person", "speak to someone", "talk to someone", "customer service", "talk to a human", "complain", "complaint", "refund", "return", "exchange", "cancel order", "damaged", "broken", "wrong item", "agent"],
  reply:
    "Of course — I'll pass this to our team and a human will get back to you. For order issues, " +
    `please include your order number. You can also reach us at ${C.email} or WhatsApp ${C.whatsapp}. 🙏`,
  handoff: true,
};

module.exports = { intents, fallback, handoffIntent, SITE };
