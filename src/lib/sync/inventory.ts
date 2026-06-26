import { prisma } from "@/lib/db";
import { configuredAdapters, getAdapter } from "@/lib/platforms/registry";
import type { InventoryPush, PlatformId, SyncResult } from "@/lib/types";
import { withSyncLog } from "./util";

// 1) PULL: record each platform's current stock so the dashboard can show drift
// between the master figure and what each store actually has.
export async function pullInventoryForPlatform(
  platform: PlatformId,
): Promise<SyncResult> {
  const adapter = getAdapter(platform);
  return withSyncLog(platform, "inventory", "pull", async () => {
    const levels = await adapter.fetchInventory();
    for (const lvl of levels) {
      const item = await prisma.inventoryItem.findUnique({ where: { sku: lvl.sku } });
      if (!item) continue;
      await prisma.platformInventoryLevel.upsert({
        where: {
          inventoryItemId_platform: {
            inventoryItemId: item.id,
            platform: lvl.platform,
          },
        },
        update: { quantity: lvl.quantity, inStockExternal: lvl.inStock },
        create: {
          inventoryItemId: item.id,
          platform: lvl.platform,
          quantity: lvl.quantity,
          inStockExternal: lvl.inStock,
        },
      });
    }
    return { recordCount: levels.length, message: `Read ${levels.length} stock levels` };
  });
}

// 2) PUSH: send the master `available` quantity for every SKU out to one
// platform, but only for SKUs that actually have a listing there.
export async function pushInventoryForPlatform(
  platform: PlatformId,
): Promise<SyncResult> {
  const adapter = getAdapter(platform);
  return withSyncLog(platform, "inventory", "push", async () => {
    const listings = await prisma.listing.findMany({
      where: { platform },
      include: { product: { include: { inventory: true } } },
    });

    const pushes: InventoryPush[] = listings
      .filter((l) => l.product.inventory)
      .map((l) => ({
        sku: l.product.sku,
        externalId: l.externalId,
        externalSku: l.externalSku ?? undefined,
        quantity: l.product.inventory!.available,
      }));

    if (pushes.length === 0) {
      return { recordCount: 0, message: "No listings to push" };
    }

    const { updated, errors } = await adapter.pushInventory(pushes);

    // Record what we pushed so drift detection has a baseline.
    for (const p of pushes) {
      const item = await prisma.inventoryItem.findUnique({ where: { sku: p.sku } });
      if (!item) continue;
      await prisma.platformInventoryLevel.upsert({
        where: {
          inventoryItemId_platform: { inventoryItemId: item.id, platform },
        },
        update: { quantity: p.quantity, lastPushedAt: new Date() },
        create: {
          inventoryItemId: item.id,
          platform,
          quantity: p.quantity,
          lastPushedAt: new Date(),
        },
      });
    }

    if (errors.length > 0) {
      throw new Error(`${updated} updated, ${errors.length} failed: ${errors.join("; ")}`);
    }
    return { recordCount: updated, message: `Pushed stock for ${updated} SKUs` };
  });
}

// Set the master available quantity for a SKU and immediately fan it out to
// every configured platform. This is the anti-oversell primitive.
export async function setMasterStock(
  sku: string,
  available: number,
): Promise<{ updated: SyncResult[] }> {
  await prisma.inventoryItem.update({
    where: { sku },
    data: { available },
  });
  const updated: SyncResult[] = [];
  for (const adapter of configuredAdapters()) {
    updated.push(await pushInventoryForPlatform(adapter.id));
  }
  return { updated };
}

export async function pullAllInventory(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  for (const adapter of configuredAdapters()) {
    results.push(await pullInventoryForPlatform(adapter.id));
  }
  return results;
}

export async function pushAllInventory(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  for (const adapter of configuredAdapters()) {
    results.push(await pushInventoryForPlatform(adapter.id));
  }
  return results;
}
