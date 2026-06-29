/**
 * HojichaYa FAQ knowledge base — shared by the messaging bot (WhatsApp/Instagram)
 * and the Shopify storefront chatbot, so answers are maintained in ONE place.
 *
 * Each intent has:
 *   - keywords:  lowercase words/phrases that map a message to this intent.
 *                Matching is WHOLE-WORD (see autoReply.js), so "hi" matches the word
 *                "hi" but not "this" or "shipping". Multi-word phrases match in order.
 *   - reply:     the auto-reply text (keep warm, concise, on-brand)
 *   - handoff:   true if the answer implies a human should follow up
 *
 * Edit freely — this is meant to be maintained by the shop owner. Keep replies short
 * enough for chat, and prefer pointing to a link/CTA over long paragraphs.
 *
 * NOTE: values referencing price / shipping thresholds / certifications are placeholders —
 * confirm and update them to match your live store and policies.
 */

const SITE = "https://hojichaya.com";

const intents = [
  {
    name: "greeting",
    keywords: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "helo", "halo", "hai", "salam", "assalamualaikum"],
    reply:
      "Hi! 🍵 Welcome to HojichaYa — authentic Japanese tea in Malaysia. " +
      "Ask me about our teas, shipping, brewing, halal, or wholesale and I'll help right away. " +
      `You can also browse everything at ${SITE}.`,
  },
  {
    name: "shipping",
    keywords: ["shipping", "delivery", "postage", "deliver", "ship", "courier", "how long", "arrive", "tracking", "track", "poslaju", "west malaysia", "east malaysia", "sabah", "sarawak"],
    reply:
      "We ship across Malaysia 🇲🇾 — orders usually arrive in 2–5 working days after " +
      "dispatch, and you'll get a tracking number by email once it's shipped. " +
      `Shipping rates and any free-shipping threshold are shown at checkout: ${SITE}.`,
  },
  {
    name: "international_shipping",
    keywords: ["international", "overseas", "outside malaysia", "singapore", "brunei", "worldwide", "export", "ship abroad"],
    reply:
      "Right now we focus on shipping within Malaysia. If you're overseas and keen, drop us " +
      "your country and what you'd like — our team will let you know what's possible.",
    handoff: true,
  },
  {
    name: "order_status",
    keywords: ["where is my order", "order status", "my order", "haven't received", "not received", "not arrived", "didn't arrive", "order number", "missing order", "late"],
    reply:
      "I can help with your order. Please share your *order number* (e.g. #1234) and the " +
      "email or name used at checkout, and our team will look it up for you. " +
      "The tracking link in your shipping email also shows live status.",
    handoff: true,
  },
  {
    name: "hojicha_what",
    keywords: ["what is hojicha", "about hojicha", "hojicha caffeine", "caffeine", "low caffeine", "caffeine free", "pregnant", "pregnancy", "night", "evening tea"],
    reply:
      "Hojicha is a *roasted* Japanese green tea — warm, smoky and naturally low in " +
      "caffeine, so many enjoy it in the evening. We carry it as loose leaf (Aka & Kyo), " +
      `powder (for lattes/baking), and teabags. See them here: ${SITE}.`,
  },
  {
    name: "matcha",
    keywords: ["matcha", "kimidori"],
    reply:
      "Our Kimidori Matcha is premium Uji-grown Japanese matcha — vibrant green, mellow " +
      `and smooth, lovely for lattes or whisking. From RM50: ${SITE}/products/kimidori-matcha.`,
  },
  {
    name: "genmaicha",
    keywords: ["genmaicha", "genmai", "brown rice tea", "roasted rice", "rice tea"],
    reply:
      "Genmaicha is Japanese green tea blended with roasted brown rice — nutty, comforting " +
      `and easy-drinking. We have it as loose leaf, powder, and teabags: ${SITE}.`,
  },
  {
    name: "products_overview",
    keywords: ["what do you sell", "sell", "selling", "what tea", "what teas", "which tea", "your teas", "products", "menu", "catalogue", "catalog", "what do you have", "selection", "recommend", "recommendation", "suggestion", "best seller", "bestseller", "popular", "which is best"],
    reply:
      "We specialise in Japanese tea 🍵 — Hojicha (roasted green tea, low caffeine), " +
      "Genmaicha (green tea + roasted rice), and Kimidori Matcha (Uji matcha), in loose " +
      `leaf, powder, and teabags, plus bundles. Browse them all at ${SITE}. Tell me what ` +
      "flavour or use (drinking, lattes, baking) you're after and I'll suggest one!",
  },
  {
    name: "brewing",
    keywords: ["how to brew", "how to make", "how do i make", "brew", "steep", "how to prepare", "latte", "recipe", "temperature", "how much tea", "ratio", "whisk"],
    reply:
      "Brewing tips 🍵\n• *Loose leaf hojicha/genmaicha:* ~1 tbsp per cup, near-boiling " +
      "water (90–95°C), steep 30–60s.\n• *Matcha:* ~1–2g (½–1 tsp) sifted, ~70–80°C water, " +
      "whisk well; top with warm milk for a latte.\n• *Powders* dissolve straight into milk " +
      `for quick lattes. More recipes on our blog: ${SITE}/blogs/news.`,
  },
  {
    name: "halal",
    keywords: ["halal", "haram", "pork", "alcohol", "syariah", "muslim", "jakim"],
    reply:
      "Our teas are simply pure Japanese tea leaves (genmaicha also has roasted rice) — no " +
      "alcohol, no animal products, no additives. For official halal-certification details, " +
      "I'll have our team confirm the latest status for you. 🍵",
    handoff: true,
  },
  {
    name: "ingredients",
    keywords: ["vegan", "vegetarian", "allergy", "allergen", "allergic", "gluten", "dairy", "milk", "nuts", "ingredient", "ingredients", "additive", "sugar", "preservative"],
    reply:
      "Our loose-leaf teas and powders are just tea (genmaicha also has roasted rice) — " +
      "naturally plant-based, with no added dairy, nuts, sugar, or preservatives. If you " +
      "have a specific allergy concern, tell me and our team will double-check for you.",
    handoff: true,
  },
  {
    name: "availability",
    keywords: ["in stock", "out of stock", "stock", "available", "availability", "sold out", "restock", "back in stock", "ready stock"],
    reply:
      `Live stock is shown on each product page at ${SITE} — if you can add it to cart, ` +
      "it's available. If something you want is sold out, tell me which one and our team " +
      "can let you know about a restock.",
    handoff: true,
  },
  {
    name: "wholesale",
    keywords: ["wholesale", "bulk", "cafe", "café", "kedai", "business", "reseller", "supply", "supplier", "b2b", "1kg", "distributor", "corporate", "bulk order"],
    reply:
      "We'd love to supply your café or business! 🤝 We offer larger formats (e.g. 1kg loose " +
      "leaf and 500g powders) and wholesale pricing. Tell us a little about your business and " +
      "what you're after, and our team will follow up with details.",
    handoff: true,
  },
  {
    name: "gift",
    keywords: ["gift", "present", "hadiah", "gift set", "hamper", "for my friend", "for a friend", "gift card"],
    reply:
      "Our bundles make lovely gifts 🎁 — like the Japanese Tea Powder Trio, or a mix of " +
      `loose-leaf favourites. Browse gift-friendly sets at ${SITE}. Tell me a budget and ` +
      "who it's for, and I'll suggest one!",
  },
  {
    name: "discount",
    keywords: ["discount", "promo", "promotion", "voucher", "coupon", "code", "sale", "offer", "cheaper", "cheap", "deal"],
    reply:
      `Any current promotions and discount codes show up on our site and at checkout: ${SITE}. ` +
      "Joining our newsletter is the best way to hear about deals and new teas first.",
  },
  {
    name: "price",
    keywords: ["price", "how much", "cost", "harga", "berapa", "rm", "ringgit", "pricing"],
    reply:
      "Our teas start from around RM30 for loose leaf and RM45 for powders, with bundles for " +
      `better value. Live pricing is on each product page: ${SITE}. Tell me which tea ` +
      "you're interested in and I'll point you straight to it!",
  },
  {
    name: "payment",
    keywords: ["payment", "pay", "fpx", "card", "credit card", "debit", "bank transfer", "grabpay", "tng", "touch n go", "touchngo", "duitnow", "ewallet", "e-wallet", "cod", "cash on delivery"],
    reply:
      "You can pay securely at checkout by card and the usual Malaysian methods supported by " +
      `our store (e.g. FPX / online banking). Just add items to cart and check out at ${SITE}.`,
  },
  {
    name: "contact",
    keywords: ["contact", "email", "phone", "whatsapp", "call you", "reach you", "your instagram", "your number", "speak to your team"],
    reply:
      `You can reach our team via the contact options on ${SITE} and our social channels. ` +
      "You can also leave your question right here and we'll make sure it reaches a human. 🍵",
    handoff: true,
  },
  {
    name: "store_location",
    keywords: ["where are you", "location", "shop address", "physical store", "outlet", "pickup", "pick up", "self collect", "self-collect", "address", "based"],
    reply:
      "We're an online tea shop based in Malaysia, shipping nationwide. For any pickup or " +
      "visit questions, let me know and our team will advise.",
    handoff: true,
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
    "Thanks for your message! 🍵 I can help with our teas, shipping, brewing, halal, " +
    "pricing, gifts, and wholesale. Could you tell me a bit more about what you need? " +
    "If you'd like a person, just say \"talk to a human\" and our team will follow up.",
};

// Explicit human-handoff request.
const handoffIntent = {
  name: "handoff",
  keywords: ["human", "real person", "speak to someone", "talk to someone", "customer service", "talk to a human", "complain", "complaint", "refund", "return", "exchange", "cancel order", "agent"],
  reply:
    "Of course — I'll pass this to our team and a human will get back to you during " +
    "support hours. In the meantime, feel free to add any details that might help. 🙏",
  handoff: true,
};

module.exports = { intents, fallback, handoffIntent, SITE };
