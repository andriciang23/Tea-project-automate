import type { PlatformId } from "@/lib/types";
import type { PlatformAdapter } from "./types";
import { ShopifyAdapter } from "./shopify/adapter";
import { ShopeeAdapter } from "./shopee/adapter";
import { LazadaAdapter } from "./lazada/adapter";

// The single source of truth for which marketplaces exist. Register a new one
// here and the sync engine + dashboard pick it up automatically.
const adapters: Record<PlatformId, PlatformAdapter> = {
  shopify: new ShopifyAdapter(),
  shopee: new ShopeeAdapter(),
  lazada: new LazadaAdapter(),
};

export function getAdapter(id: PlatformId): PlatformAdapter {
  return adapters[id];
}

export function allAdapters(): PlatformAdapter[] {
  return Object.values(adapters);
}

// Only the adapters whose credentials are present.
export function configuredAdapters(): PlatformAdapter[] {
  return allAdapters().filter((a) => a.isConfigured());
}
