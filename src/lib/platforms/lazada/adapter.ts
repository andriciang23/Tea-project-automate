import { lazadaConfig } from "@/lib/platforms/config";
import type { OrderPullOptions, PlatformAdapter } from "@/lib/platforms/types";
import type {
  InventoryPush,
  UnifiedInventoryLevel,
  UnifiedListing,
  UnifiedOrder,
  UnifiedOrderStatus,
} from "@/lib/types";
import { LazadaClient } from "./client";

function mapStatus(s: string): UnifiedOrderStatus {
  switch (s) {
    case "unpaid":
    case "pending":
      return "pending";
    case "ready_to_ship":
    case "packed":
      return "paid";
    case "shipped":
    case "delivered":
      return "fulfilled";
    case "canceled":
    case "cancelled":
      return "cancelled";
    case "returned":
    case "refund":
      return "refunded";
    default:
      return "pending";
  }
}

export class LazadaAdapter implements PlatformAdapter {
  readonly id = "lazada" as const;
  readonly label = "Lazada";
  private client = new LazadaClient();

  isConfigured() {
    return lazadaConfig.configured;
  }

  async healthCheck() {
    if (!this.isConfigured()) {
      return { ok: false, message: "Missing Lazada app key/secret/token" };
    }
    try {
      await this.client.call("/seller/get");
      return { ok: true, message: "Connected to Lazada seller account" };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  }

  async fetchOrders(opts: OrderPullOptions = {}): Promise<UnifiedOrder[]> {
    if (!this.isConfigured()) return [];
    const since = opts.since ?? new Date(Date.now() - 30 * 24 * 3600 * 1000);

    const list = await this.client.call<{
      data: {
        orders: {
          order_id: number;
          order_number: string;
          statuses: string[];
          created_at: string;
          price: string;
          shipping_fee?: string;
          customer_first_name?: string;
          customer_last_name?: string;
        }[];
      };
    }>("/orders/get", {
      created_after: since.toISOString(),
      limit: Math.min(opts.limit ?? 50, 100),
      sort_by: "created_at",
      sort_direction: "DESC",
    });

    const orders: UnifiedOrder[] = [];
    for (const o of list.data.orders) {
      // Line items come from a separate endpoint per order.
      let items: UnifiedOrder["items"] = [];
      try {
        const oi = await this.client.call<{
          data: {
            order_item_id: number;
            sku?: string;
            name: string;
            paid_price: string;
          }[];
        }>("/order/items/get", { order_id: o.order_id });
        const counts = new Map<string, { title: string; price: number; qty: number }>();
        for (const it of oi.data) {
          const key = it.sku || it.name;
          const cur = counts.get(key) ?? {
            title: it.name,
            price: Number(it.paid_price),
            qty: 0,
          };
          cur.qty += 1;
          counts.set(key, cur);
        }
        items = [...counts.entries()].map(([sku, v]) => ({
          sku: sku || null,
          title: v.title,
          quantity: v.qty,
          price: v.price,
          total: v.price * v.qty,
        }));
      } catch {
        // proceed without line items
      }

      const total = Number(o.price);
      const shipping = Number(o.shipping_fee ?? 0);
      orders.push({
        platform: "lazada",
        externalId: String(o.order_id),
        orderNumber: o.order_number,
        status: mapStatus(o.statuses?.[0] ?? ""),
        financialStatus: o.statuses?.[0],
        fulfillmentStatus: o.statuses?.[0],
        customerName: [o.customer_first_name, o.customer_last_name]
          .filter(Boolean)
          .join(" "),
        subtotal: total - shipping,
        shipping,
        tax: 0,
        total,
        currency: "SGD",
        placedAt: new Date(o.created_at),
        items,
        raw: o,
      });
    }
    return orders;
  }

  async fetchListings(): Promise<UnifiedListing[]> {
    if (!this.isConfigured()) return [];
    const res = await this.client.call<{
      data: {
        products: {
          item_id: number;
          attributes: { name: string };
          skus: { SellerSku: string; price: number; Status: string; Images?: string[] }[];
        }[];
      };
    }>("/products/get", { filter: "all", limit: 100 });

    return res.data.products.flatMap((p) => {
      const sku = p.skus[0];
      if (!sku?.SellerSku) return [];
      return [
        {
          platform: "lazada",
          externalId: String(p.item_id),
          externalSku: sku.SellerSku,
          sku: sku.SellerSku,
          title: p.attributes.name,
          price: Number(sku.price),
          currency: "SGD",
          status: sku.Status === "active" ? "active" : "draft",
          imageUrl: sku.Images?.[0],
          raw: p,
        } satisfies UnifiedListing,
      ];
    });
  }

  async fetchInventory(): Promise<UnifiedInventoryLevel[]> {
    if (!this.isConfigured()) return [];
    const res = await this.client.call<{
      data: {
        products: {
          skus: { SellerSku: string; quantity?: number }[];
        }[];
      };
    }>("/products/get", { filter: "all", limit: 100 });

    return res.data.products.flatMap((p) =>
      p.skus
        .filter((s) => s.SellerSku)
        .map((s) => {
          const qty = s.quantity ?? 0;
          return {
            platform: "lazada" as const,
            sku: s.SellerSku,
            quantity: qty,
            inStock: qty > 0,
          };
        }),
    );
  }

  async pushInventory(items: InventoryPush[]) {
    const errors: string[] = [];
    let updated = 0;
    if (!this.isConfigured()) return { updated, errors: ["Lazada not configured"] };

    for (const item of items) {
      try {
        // Lazada expects an XML payload describing the SKU stock update.
        const payload =
          `<Request><Product><Skus><Sku>` +
          `<SellerSku>${item.externalSku ?? item.sku}</SellerSku>` +
          `<Quantity>${item.quantity}</Quantity>` +
          `</Sku></Skus></Product></Request>`;
        await this.client.call(
          "/product/price_quantity/update",
          { payload },
          "POST",
        );
        updated++;
      } catch (e) {
        errors.push(`${item.sku}: ${(e as Error).message}`);
      }
    }
    return { updated, errors };
  }
}
