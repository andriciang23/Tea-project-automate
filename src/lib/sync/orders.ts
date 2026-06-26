import { prisma } from "@/lib/db";
import { configuredAdapters, getAdapter } from "@/lib/platforms/registry";
import type { PlatformId, SyncResult } from "@/lib/types";
import { ensureProduct, withSyncLog } from "./util";

// Pull orders from one platform and upsert them (and their line items) into the
// unified Order/OrderItem tables.
export async function syncOrdersForPlatform(
  platform: PlatformId,
  since?: Date,
): Promise<SyncResult> {
  const adapter = getAdapter(platform);
  return withSyncLog(platform, "orders", "pull", async () => {
    const orders = await adapter.fetchOrders({ since });
    for (const o of orders) {
      // Link line items to catalog products by SKU where possible.
      const itemData = [];
      for (const it of o.items) {
        let productId: string | undefined;
        if (it.sku) productId = await ensureProduct(it.sku, it.title);
        itemData.push({
          sku: it.sku,
          title: it.title,
          quantity: it.quantity,
          price: it.price,
          total: it.total,
          productId,
        });
      }

      await prisma.order.upsert({
        where: {
          platform_externalId: { platform: o.platform, externalId: o.externalId },
        },
        update: {
          status: o.status,
          financialStatus: o.financialStatus,
          fulfillmentStatus: o.fulfillmentStatus,
          total: o.total,
          // Replace line items wholesale to reflect edits/cancellations.
          items: { deleteMany: {}, create: itemData },
        },
        create: {
          platform: o.platform,
          externalId: o.externalId,
          orderNumber: o.orderNumber,
          status: o.status,
          financialStatus: o.financialStatus,
          fulfillmentStatus: o.fulfillmentStatus,
          customerName: o.customerName,
          customerEmail: o.customerEmail,
          customerPhone: o.customerPhone,
          subtotal: o.subtotal,
          shipping: o.shipping,
          tax: o.tax,
          total: o.total,
          currency: o.currency,
          placedAt: o.placedAt,
          raw: o.raw ? JSON.stringify(o.raw) : null,
          items: { create: itemData },
        },
      });
    }
    return { recordCount: orders.length, message: `Synced ${orders.length} orders` };
  });
}

// Pull orders from every configured platform.
export async function syncAllOrders(since?: Date): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  for (const adapter of configuredAdapters()) {
    results.push(await syncOrdersForPlatform(adapter.id, since));
  }
  return results;
}
