import type {
  InventoryPush,
  PlatformId,
  UnifiedInventoryLevel,
  UnifiedListing,
  UnifiedOrder,
} from "@/lib/types";

// Options for an incremental order pull.
export interface OrderPullOptions {
  since?: Date;
  limit?: number;
}

// The contract every platform connector implements. Add a new marketplace by
// writing a class that satisfies this interface and registering it — nothing
// else in the app needs to change.
export interface PlatformAdapter {
  readonly id: PlatformId;
  readonly label: string;

  // True when the required credentials are present in the environment.
  isConfigured(): boolean;

  // Lightweight connectivity/credential check for the dashboard health panel.
  healthCheck(): Promise<{ ok: boolean; message: string }>;

  // Pull orders, normalized to UnifiedOrder.
  fetchOrders(opts?: OrderPullOptions): Promise<UnifiedOrder[]>;

  // Pull product listings, normalized to UnifiedListing.
  fetchListings(): Promise<UnifiedListing[]>;

  // Pull current per-platform inventory levels.
  fetchInventory(): Promise<UnifiedInventoryLevel[]>;

  // Push a master stock figure to this platform for the given items.
  pushInventory(items: InventoryPush[]): Promise<{ updated: number; errors: string[] }>;
}
