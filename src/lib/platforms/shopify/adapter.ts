import { shopifyConfig } from "@/lib/platforms/config";
import type { OrderPullOptions, PlatformAdapter } from "@/lib/platforms/types";
import type {
  InventoryPush,
  UnifiedInventoryLevel,
  UnifiedListing,
  UnifiedOrder,
  UnifiedOrderStatus,
} from "@/lib/types";
import { ShopifyClient } from "./client";

function mapStatus(financial?: string, fulfillment?: string): UnifiedOrderStatus {
  const f = (financial ?? "").toUpperCase();
  const ff = (fulfillment ?? "").toUpperCase();
  if (f === "REFUNDED" || f === "PARTIALLY_REFUNDED") return "refunded";
  if (ff === "FULFILLED") return "fulfilled";
  if (f === "PAID") return "paid";
  if (f === "VOIDED") return "cancelled";
  return "pending";
}

export class ShopifyAdapter implements PlatformAdapter {
  readonly id = "shopify" as const;
  readonly label = "Shopify";
  private client = new ShopifyClient();

  isConfigured() {
    return shopifyConfig.configured;
  }

  async healthCheck() {
    if (!this.isConfigured()) {
      return { ok: false, message: "Missing SHOPIFY_STORE_DOMAIN / access token" };
    }
    try {
      const data = await this.client.graphql<{ shop: { name: string } }>(
        `{ shop { name } }`,
      );
      return { ok: true, message: `Connected to ${data.shop.name}` };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  }

  async fetchOrders(opts: OrderPullOptions = {}): Promise<UnifiedOrder[]> {
    if (!this.isConfigured()) return [];
    const limit = Math.min(opts.limit ?? 100, 250);
    const queryFilter = opts.since
      ? `created_at:>=${opts.since.toISOString()}`
      : "";

    const data = await this.client.graphql<{
      orders: {
        edges: {
          node: {
            id: string;
            name: string;
            displayFinancialStatus?: string;
            displayFulfillmentStatus?: string;
            createdAt: string;
            currentSubtotalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
            totalShippingPriceSet: { shopMoney: { amount: string } };
            totalTaxSet: { shopMoney: { amount: string } };
            currentTotalPriceSet: { shopMoney: { amount: string } };
            customer?: { displayName?: string; email?: string; phone?: string };
            lineItems: {
              edges: {
                node: {
                  title: string;
                  quantity: number;
                  sku?: string;
                  variant?: { sku?: string };
                  originalUnitPriceSet: { shopMoney: { amount: string } };
                };
              }[];
            };
          };
        }[];
      };
    }>(
      `query Orders($first: Int!, $query: String) {
        orders(first: $first, query: $query, sortKey: CREATED_AT, reverse: true) {
          edges { node {
            id name displayFinancialStatus displayFulfillmentStatus createdAt
            currentSubtotalPriceSet { shopMoney { amount currencyCode } }
            totalShippingPriceSet { shopMoney { amount } }
            totalTaxSet { shopMoney { amount } }
            currentTotalPriceSet { shopMoney { amount } }
            customer { displayName email phone }
            lineItems(first: 50) { edges { node {
              title quantity sku variant { sku }
              originalUnitPriceSet { shopMoney { amount } }
            } } }
          } }
        }
      }`,
      { first: limit, query: queryFilter || null },
    );

    return data.orders.edges.map(({ node }) => {
      const currency = node.currentSubtotalPriceSet.shopMoney.currencyCode;
      return {
        platform: "shopify",
        externalId: node.id,
        orderNumber: node.name,
        status: mapStatus(node.displayFinancialStatus, node.displayFulfillmentStatus),
        financialStatus: node.displayFinancialStatus,
        fulfillmentStatus: node.displayFulfillmentStatus,
        customerName: node.customer?.displayName,
        customerEmail: node.customer?.email,
        customerPhone: node.customer?.phone,
        subtotal: Number(node.currentSubtotalPriceSet.shopMoney.amount),
        shipping: Number(node.totalShippingPriceSet.shopMoney.amount),
        tax: Number(node.totalTaxSet.shopMoney.amount),
        total: Number(node.currentTotalPriceSet.shopMoney.amount),
        currency,
        placedAt: new Date(node.createdAt),
        items: node.lineItems.edges.map(({ node: li }) => {
          const qty = li.quantity;
          const price = Number(li.originalUnitPriceSet.shopMoney.amount);
          return {
            sku: li.sku || li.variant?.sku || null,
            title: li.title,
            quantity: qty,
            price,
            total: price * qty,
          };
        }),
        raw: node,
      } satisfies UnifiedOrder;
    });
  }

  async fetchListings(): Promise<UnifiedListing[]> {
    if (!this.isConfigured()) return [];
    const data = await this.client.graphql<{
      products: {
        edges: {
          node: {
            id: string;
            title: string;
            status: string;
            onlineStoreUrl?: string;
            featuredImage?: { url: string };
            variants: {
              edges: {
                node: { id: string; sku?: string; price: string };
              }[];
            };
          };
        }[];
      };
    }>(
      `{ products(first: 100) { edges { node {
          id title status onlineStoreUrl
          featuredImage { url }
          variants(first: 1) { edges { node { id sku price } } }
      } } } }`,
    );

    return data.products.edges.flatMap(({ node }) => {
      const variant = node.variants.edges[0]?.node;
      if (!variant?.sku) return [];
      return [
        {
          platform: "shopify",
          externalId: node.id,
          externalSku: variant.id,
          sku: variant.sku,
          title: node.title,
          price: Number(variant.price),
          currency: "SGD",
          status:
            node.status === "ACTIVE"
              ? "active"
              : node.status === "ARCHIVED"
                ? "archived"
                : "draft",
          imageUrl: node.featuredImage?.url,
          url: node.onlineStoreUrl ?? undefined,
          raw: node,
        } satisfies UnifiedListing,
      ];
    });
  }

  async fetchInventory(): Promise<UnifiedInventoryLevel[]> {
    if (!this.isConfigured()) return [];
    const data = await this.client.graphql<{
      products: {
        edges: {
          node: {
            variants: {
              edges: {
                node: { sku?: string; inventoryQuantity?: number };
              }[];
            };
          };
        }[];
      };
    }>(
      `{ products(first: 100) { edges { node {
          variants(first: 1) { edges { node { sku inventoryQuantity } } }
      } } } }`,
    );

    return data.products.edges.flatMap(({ node }) => {
      const v = node.variants.edges[0]?.node;
      if (!v?.sku) return [];
      const qty = v.inventoryQuantity ?? 0;
      return [{ platform: "shopify" as const, sku: v.sku, quantity: qty, inStock: qty > 0 }];
    });
  }

  async pushInventory(items: InventoryPush[]) {
    const errors: string[] = [];
    let updated = 0;
    if (!this.isConfigured()) return { updated, errors: ["Shopify not configured"] };

    // Resolve the primary location once.
    const loc = await this.client.graphql<{
      locations: { edges: { node: { id: string } }[] };
    }>(`{ locations(first: 1) { edges { node { id } } } }`);
    const locationId = loc.locations.edges[0]?.node.id;
    if (!locationId) return { updated, errors: ["No Shopify location found"] };

    for (const item of items) {
      try {
        // externalSku holds the variant GID; resolve its inventory item id.
        const vi = await this.client.graphql<{
          productVariant?: { inventoryItem: { id: string } };
        }>(
          `query($id: ID!) { productVariant(id: $id) { inventoryItem { id } } }`,
          { id: item.externalSku },
        );
        const inventoryItemId = vi.productVariant?.inventoryItem.id;
        if (!inventoryItemId) {
          errors.push(`${item.sku}: variant not found`);
          continue;
        }
        await this.client.graphql(
          `mutation($input: InventorySetQuantitiesInput!) {
            inventorySetQuantities(input: $input) { userErrors { message } }
          }`,
          {
            input: {
              name: "available",
              reason: "correction",
              ignoreCompareQuantity: true,
              quantities: [
                { inventoryItemId, locationId, quantity: item.quantity },
              ],
            },
          },
        );
        updated++;
      } catch (e) {
        errors.push(`${item.sku}: ${(e as Error).message}`);
      }
    }
    return { updated, errors };
  }
}
