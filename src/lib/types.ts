// Unified, platform-agnostic domain types.
// Adapters convert each platform's native payloads INTO these shapes, so the
// rest of the app (sync engine, dashboard, analytics) never sees raw platform
// data.

export type PlatformId = "shopify" | "shopee" | "lazada";

export const PLATFORMS: { id: PlatformId; label: string; color: string }[] = [
  { id: "shopify", label: "Shopify", color: "#95bf47" },
  { id: "shopee", label: "Shopee", color: "#ee4d2d" },
  { id: "lazada", label: "Lazada", color: "#0f146d" },
];

export type UnifiedOrderStatus =
  | "pending"
  | "paid"
  | "fulfilled"
  | "cancelled"
  | "refunded";

export interface UnifiedOrderItem {
  sku: string | null;
  title: string;
  quantity: number;
  price: number;
  total: number;
}

export interface UnifiedOrder {
  platform: PlatformId;
  externalId: string;
  orderNumber: string;
  status: UnifiedOrderStatus;
  financialStatus?: string;
  fulfillmentStatus?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  placedAt: Date;
  items: UnifiedOrderItem[];
  raw?: unknown;
}

export interface UnifiedListing {
  platform: PlatformId;
  externalId: string;
  externalSku?: string;
  sku: string; // canonical sku used to join to a Product
  title: string;
  price: number;
  currency: string;
  status: "active" | "draft" | "archived";
  imageUrl?: string;
  url?: string;
  raw?: unknown;
}

export interface UnifiedInventoryLevel {
  platform: PlatformId;
  sku: string;
  quantity: number;
  inStock: boolean;
}

// A request to push a master stock figure out to a platform.
export interface InventoryPush {
  sku: string;
  externalId: string;
  externalSku?: string;
  quantity: number;
}

export interface SyncResult {
  platform: PlatformId;
  type: "orders" | "inventory" | "products";
  direction: "pull" | "push";
  status: "success" | "partial" | "error";
  recordCount: number;
  message?: string;
}
