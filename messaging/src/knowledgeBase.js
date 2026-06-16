/**
 * HojichaYa FAQ knowledge base.
 *
 * Each intent has:
 *   - keywords:  lowercase substrings/triggers that map a message to this intent
 *   - reply:     the auto-reply text (keep warm, concise, on-brand)
 *
 * Edit freely — this is meant to be maintained by the shop owner. Keep replies short
 * enough for chat, and prefer pointing to a link/CTA over long paragraphs.
 *
 * NOTE: values referencing price / shipping thresholds are placeholders — confirm and
 * update them to match your live Shopify settings.
 */

const SITE = "https://hojichaya.com";

const intents = [
  {
    name: "greeting",
    keywords: ["hi", "hello", "hey", "good morning", "good afternoon", "helo", "halo", "salam"],
    reply:
      "Hi! 🍵 Welcome to HojichaYa — authentic Japanese tea in Malaysia. " +
      "Ask me about our teas, shipping, brewing, or wholesale, and I'll help right away. " +
      `You can also browse everything at ${SITE}.`,
  },
  {
    name: "shipping",
    keywords: ["shipping", "delivery", "postage", "deliver", "ship", "courier", "how long", "arrive", "tracking number", "track"],
    reply:
      "We ship across Malaysia 🇲🇾 — orders usually arrive in 2–5 working days after " +
      "dispatch. You'll get a tracking number by email once it's shipped. " +
      `Shipping rates and any free-shipping threshold are shown at checkout: ${SITE}.`,
  },
  {
    name: "order_status",
    keywords: ["where is my order", "order status", "my order", "haven't received", "not arrived", "order number", "#"],
    reply:
      "I can help check your order. Please reply with your *order number* (e.g. #1234) and " +
      "the email or name used at checkout, and our team will look it up for you. " +
      "If you have the tracking link from your shipping email, that shows live status too.",
    handoff: true,
  },
  {
    name: "hojicha_what",
    keywords: ["what is hojicha", "hojicha mean", "about hojicha", "hojicha caffeine", "caffeine"],
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
      `and smooth, lovely for lattes or whisking. Available from RM50: ${SITE}/products/kimidori-matcha.`,
  },
  {
    name: "genmaicha",
    keywords: ["genmaicha", "brown rice tea", "roasted rice"],
    reply:
      "Genmaicha is Japanese green tea blended with roasted brown rice — nutty, comforting " +
      `and easy-drinking. We have it as loose leaf, powder, and teabags: ${SITE}.`,
  },
  {
    name: "brewing",
    keywords: ["how to brew", "how to make", "brew", "steep", "how to prepare", "latte", "recipe", "temperature"],
    reply:
      "Brewing tips 🍵\n• *Loose leaf hojicha/genmaicha:* ~1 tbsp per cup, near-boiling " +
      "water (90–95°C), steep 30–60s.\n• *Matcha:* ~1–2g (½–1 tsp) sifted, ~70–80°C water, " +
      "whisk well; for a latte top with warm milk.\n• *Powders* dissolve straight into milk " +
      `for quick lattes. More recipes on our blog: ${SITE}/blogs/news.`,
  },
  {
    name: "wholesale",
    keywords: ["wholesale", "bulk", "cafe", "café", "business", "reseller", "supply", "b2b", "1kg", "distributor"],
    reply:
      "We'd love to supply your café or business! 🤝 We offer larger formats (e.g. 1kg loose " +
      "leaf and 500g powders) and wholesale pricing. Tell us a little about your business and " +
      "what you're after, and our team will follow up with details.",
    handoff: true,
  },
  {
    name: "price",
    keywords: ["price", "how much", "cost", "harga", "berapa"],
    reply:
      "Our teas start from around RM30 for loose leaf and RM45 for powders, with bundles for " +
      `better value. Full live pricing is on the site: ${SITE}. Tell me which tea you're ` +
      "interested in and I'll point you to it!",
  },
  {
    name: "payment",
    keywords: ["payment", "pay", "fpx", "card", "bank transfer", "grabpay", "tng", "touch n go", "duitnow"],
    reply:
      "You can pay securely at checkout by card and the usual Malaysian methods supported by " +
      `our store (e.g. FPX/online banking). Just add items to cart and check out at ${SITE}.`,
  },
  {
    name: "store_location",
    keywords: ["where are you", "location", "shop address", "physical store", "outlet", "pickup", "pick up", "address"],
    reply:
      "We're an online tea shop based in Malaysia, shipping nationwide. For any pickup or " +
      "visit questions, let me know and our team will advise.",
    handoff: true,
  },
  {
    name: "thanks",
    keywords: ["thank", "thanks", "terima kasih", "tq", "ty"],
    reply: "You're very welcome! 🍵 Enjoy your tea, and reach out any time.",
  },
];

// Shown when nothing matches — offers help and a human handoff.
const fallback = {
  name: "fallback",
  reply:
    "Thanks for your message! 🍵 I can help with teas, shipping, brewing, pricing, and " +
    "wholesale. Could you tell me a bit more about what you need? " +
    "If you'd like to speak to a person, just say \"talk to a human\" and our team will " +
    "follow up during support hours.",
  handoff: true,
};

// Explicit human-handoff request.
const handoffIntent = {
  name: "handoff",
  keywords: ["human", "agent", "real person", "speak to someone", "customer service", "talk to", "complain", "refund", "return"],
  reply:
    "Of course — I'll pass this to our team and a human will get back to you during " +
    "support hours. In the meantime, feel free to add any details that might help. 🙏",
  handoff: true,
};

module.exports = { intents, fallback, handoffIntent, SITE };
