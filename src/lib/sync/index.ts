import type { SyncResult } from "@/lib/types";
import { pullAllInventory, pushAllInventory } from "./inventory";
import { syncAllOrders } from "./orders";
import { syncAllProducts } from "./products";

export * from "./orders";
export * from "./products";
export * from "./inventory";

// Full sync: products first (so order line items + inventory can match SKUs),
// then orders, then read back inventory levels. Inventory PUSH is deliberately
// left as an explicit action so we never overwrite stock unexpectedly.
export async function runFullSync(opts: { pushInventory?: boolean } = {}): Promise<{
  results: SyncResult[];
}> {
  const results: SyncResult[] = [];
  results.push(...(await syncAllProducts()));
  results.push(...(await syncAllOrders()));
  results.push(...(await pullAllInventory()));
  if (opts.pushInventory) {
    results.push(...(await pushAllInventory()));
  }
  return { results };
}
