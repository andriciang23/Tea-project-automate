import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Demo dataset so the dashboard is meaningful before any real store is
// connected. Safe to run repeatedly — it clears and re-seeds.
const PRODUCTS = [
  { sku: "TEA-OOLONG-50", title: "Oolong Tea — 50g", price: 12.5, stock: 8 },
  { sku: "TEA-MATCHA-100", title: "Ceremonial Matcha — 100g", price: 28.0, stock: 40 },
  { sku: "TEA-JASMINE-50", title: "Jasmine Green — 50g", price: 9.9, stock: 3 },
  { sku: "TEA-PUERH-200", title: "Aged Pu-erh Cake — 200g", price: 45.0, stock: 15 },
  { sku: "TEA-CHAMOMILE-30", title: "Chamomile Blend — 30g", price: 7.5, stock: 60 },
  { sku: "TEA-INFUSER-STL", title: "Stainless Steel Infuser", price: 6.0, stock: 25 },
];

const PLATFORMS = ["shopify", "shopee", "lazada"] as const;
type P = (typeof PLATFORMS)[number];

const STATUSES = ["paid", "fulfilled", "fulfilled", "fulfilled", "pending", "cancelled"];
const NAMES = ["Mei Ling", "Arjun P.", "Siti N.", "Wei Jie", "Priya R.", "Daniel T.", "Aisyah K."];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("Clearing existing data…");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.platformInventoryLevel.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.syncLog.deleteMany();

  console.log("Seeding products + listings + inventory…");
  const productIds: Record<string, string> = {};
  for (const p of PRODUCTS) {
    const product = await prisma.product.create({
      data: {
        sku: p.sku,
        title: p.title,
        costPrice: Number((p.price * 0.45).toFixed(2)),
        inventory: {
          create: {
            sku: p.sku,
            available: p.stock,
            lowStockAt: 5,
            platformLevels: {
              create: PLATFORMS.map((pl) => ({
                platform: pl,
                quantity: p.stock,
                inStockExternal: p.stock > 0,
              })),
            },
          },
        },
        // List most products on all platforms; leave a couple of gaps to show
        // the "not listed on" feature.
        listings: {
          create: PLATFORMS.filter(
            (pl) => !(p.sku === "TEA-OOLONG-50" && pl === "lazada"),
          ).map((pl) => ({
            platform: pl,
            externalId: `${pl}-${p.sku}`,
            externalSku: `${pl}-var-${p.sku}`,
            title: p.title,
            price:
              pl === "shopee"
                ? Number((p.price * 0.97).toFixed(2))
                : pl === "lazada"
                  ? Number((p.price * 0.98).toFixed(2))
                  : p.price,
            currency: "SGD",
            status: "active",
          })),
        },
      },
    });
    productIds[p.sku] = product.id;
  }

  console.log("Seeding 90 days of orders across platforms…");
  const now = Date.now();
  let orderSeq = 1000;
  for (let day = 0; day < 90; day++) {
    const ordersToday = 1 + Math.floor(Math.random() * 5);
    for (let i = 0; i < ordersToday; i++) {
      const platform: P = rand([...PLATFORMS]);
      const status = rand(STATUSES);
      const placedAt = new Date(now - day * 24 * 3600 * 1000 - i * 3600 * 1000);
      orderSeq++;

      // 1–3 line items per order.
      const lineCount = 1 + Math.floor(Math.random() * 3);
      const chosen = [...PRODUCTS].sort(() => Math.random() - 0.5).slice(0, lineCount);
      const items = chosen.map((c) => {
        const qty = 1 + Math.floor(Math.random() * 3);
        return {
          sku: c.sku,
          title: c.title,
          quantity: qty,
          price: c.price,
          total: Number((c.price * qty).toFixed(2)),
          productId: productIds[c.sku],
        };
      });
      const subtotal = items.reduce((s, it) => s + it.total, 0);
      const shipping = platform === "shopify" ? 0 : 2.5;

      await prisma.order.create({
        data: {
          platform,
          externalId: `${platform}-${orderSeq}`,
          orderNumber: `#${orderSeq}`,
          status,
          financialStatus: status,
          fulfillmentStatus: status === "fulfilled" ? "fulfilled" : "unfulfilled",
          customerName: rand(NAMES),
          subtotal,
          shipping,
          tax: 0,
          total: Number((subtotal + shipping).toFixed(2)),
          currency: "SGD",
          placedAt,
          items: { create: items },
        },
      });
    }
  }

  const orderCount = await prisma.order.count();
  console.log(`Done. Seeded ${PRODUCTS.length} products and ${orderCount} orders.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
