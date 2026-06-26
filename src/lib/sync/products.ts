import { prisma } from "@/lib/db";
import { configuredAdapters, getAdapter } from "@/lib/platforms/registry";
import type { PlatformId, SyncResult } from "@/lib/types";
import { ensureProduct, withSyncLog } from "./util";

// Pull listings from one platform and upsert them as Listings attached to the
// canonical Product (matched by SKU). This is how the same item across all 3
// stores gets unified into a single catalog row.
export async function syncProductsForPlatform(
  platform: PlatformId,
): Promise<SyncResult> {
  const adapter = getAdapter(platform);
  return withSyncLog(platform, "products", "pull", async () => {
    const listings = await adapter.fetchListings();
    for (const l of listings) {
      const productId = await ensureProduct(l.sku, l.title, l.imageUrl);

      // Keep the canonical product's display fields fresh from any platform.
      await prisma.product.update({
        where: { id: productId },
        data: {
          title: l.title,
          imageUrl: l.imageUrl ?? undefined,
        },
      });

      await prisma.listing.upsert({
        where: {
          platform_externalId: { platform: l.platform, externalId: l.externalId },
        },
        update: {
          title: l.title,
          price: l.price,
          currency: l.currency,
          status: l.status,
          externalSku: l.externalSku,
          url: l.url,
          raw: l.raw ? JSON.stringify(l.raw) : null,
        },
        create: {
          platform: l.platform,
          externalId: l.externalId,
          externalSku: l.externalSku,
          title: l.title,
          price: l.price,
          currency: l.currency,
          status: l.status,
          url: l.url,
          raw: l.raw ? JSON.stringify(l.raw) : null,
          productId,
        },
      });
    }
    return {
      recordCount: listings.length,
      message: `Synced ${listings.length} listings`,
    };
  });
}

export async function syncAllProducts(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  for (const adapter of configuredAdapters()) {
    results.push(await syncProductsForPlatform(adapter.id));
  }
  return results;
}
