import { shopeeConfig } from "@/lib/platforms/config";
import type { OrderPullOptions, PlatformAdapter } from "@/lib/platforms/types";
import type {
  InventoryPush,
  UnifiedInventoryLevel,
  UnifiedListing,
  UnifiedOrder,
  UnifiedOrderStatus,
} from "@/lib/types";
import { ShopeeClient } from "./client";

// Map Shopee order_status → unified status.
function mapStatus(s: string): UnifiedOrderStatus {
  switch (s) {
    case "UNPAID":
      return "pending";
    case "READY_TO_SHIP":
    case "PROCESSED":
    case "RETRY_SHIP":
      return "paid";
    case "SHIPPED":
    case "TO_CONFIRM_RECEIVE":
    case "COMPLETED":
      return "fulfilled";
    case "CANCELLED":
    case "INVOICE_PENDING":
      return "cancelled";
    case "TO_RETURN":
      return "refunded";
    default:
      return "pending";
  }
}

export class ShopeeAdapter implements PlatformAdapter {
  readonly id = "shopee" as const;
  readonly label = "Shopee";
  private client = new ShopeeClient();

  isConfigured() {
    return shopeeConfig.configured;
  }

  async healthCheck() {
    if (!this.isConfigured()) {
      return { ok: false, message: "Missing Shopee partner/shop credentials" };
    }
    try {
      await this.client.get("/api/v2/shop/get_shop_info");
      return { ok: true, message: `Connected to shop ${shopeeConfig.shopId}` };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  }

  async fetchOrders(opts: OrderPullOptions = {}): Promise<UnifiedOrder[]> {
    if (!this.isConfigured()) return [];
    const now = Math.floor(Date.now() / 1000);
    const from = opts.since
      ? Math.floor(opts.since.getTime() / 1000)
      : now - 15 * 24 * 3600; // Shopee caps the window at 15 days per call.

    // 1) Page through order_sn list.
    const list = await this.client.get<{
      response: { order_list: { order_sn: string }[] };
    }>("/api/v2/order/get_order_list", {
      time_range_field: "create_time",
      time_from: from,
      time_to: now,
      page_size: Math.min(opts.limit ?? 50, 100),
      order_status: "ALL",
    });
    const orderSns = list.response.order_list.map((o) => o.order_sn);
    if (orderSns.length === 0) return [];

    // 2) Fetch full detail (max 50 SNs per call).
    const detail = await this.client.get<{
      response: {
        order_list: {
          order_sn: string;
          order_status: string;
          create_time: number;
          total_amount: number;
          currency: string;
          buyer_username?: string;
          recipient_address?: { name?: string; phone?: string };
          item_list: {
            item_sku?: string;
            model_sku?: string;
            item_name: string;
            model_quantity_purchased: number;
            model_discounted_price: number;
          }[];
        }[];
      };
    }>("/api/v2/order/get_order_detail", {
      order_sn_list: orderSns.slice(0, 50).join(","),
      response_optional_fields:
        "buyer_username,recipient_address,item_list,total_amount,currency",
    });

    return detail.response.order_list.map((o) => {
      const items = o.item_list.map((it) => {
        const price = it.model_discounted_price;
        const qty = it.model_quantity_purchased;
        return {
          sku: it.item_sku || it.model_sku || null,
          title: it.item_name,
          quantity: qty,
          price,
          total: price * qty,
        };
      });
      const subtotal = items.reduce((s, i) => s + i.total, 0);
      return {
        platform: "shopee",
        externalId: o.order_sn,
        orderNumber: o.order_sn,
        status: mapStatus(o.order_status),
        financialStatus: o.order_status,
        fulfillmentStatus: o.order_status,
        customerName: o.recipient_address?.name || o.buyer_username,
        customerPhone: o.recipient_address?.phone,
        subtotal,
        shipping: 0,
        tax: 0,
        total: o.total_amount ?? subtotal,
        currency: o.currency || "SGD",
        placedAt: new Date(o.create_time * 1000),
        items,
        raw: o,
      } satisfies UnifiedOrder;
    });
  }

  async fetchListings(): Promise<UnifiedListing[]> {
    if (!this.isConfigured()) return [];
    const list = await this.client.get<{
      response: { item: { item_id: number }[] };
    }>("/api/v2/product/get_item_list", {
      offset: 0,
      page_size: 100,
      item_status: "NORMAL",
    });
    const ids = list.response.item.map((i) => i.item_id);
    if (ids.length === 0) return [];

    const info = await this.client.get<{
      response: {
        item_list: {
          item_id: number;
          item_name: string;
          item_sku?: string;
          price_info?: { current_price: number }[];
          currency?: string;
          image?: { image_url_list: string[] };
        }[];
      };
    }>("/api/v2/product/get_item_base_info", { item_id_list: ids.join(",") });

    return info.response.item_list.flatMap((it) => {
      if (!it.item_sku) return [];
      return [
        {
          platform: "shopee",
          externalId: String(it.item_id),
          sku: it.item_sku,
          title: it.item_name,
          price: it.price_info?.[0]?.current_price ?? 0,
          currency: it.currency || "SGD",
          status: "active",
          imageUrl: it.image?.image_url_list?.[0],
          raw: it,
        } satisfies UnifiedListing,
      ];
    });
  }

  async fetchInventory(): Promise<UnifiedInventoryLevel[]> {
    const listings = await this.fetchListings();
    if (listings.length === 0) return [];
    const levels: UnifiedInventoryLevel[] = [];
    for (const l of listings) {
      try {
        const stock = await this.client.get<{
          response: { stock_info_list?: { total_available_stock: number }[] };
        }>("/api/v2/product/get_model_list", { item_id: Number(l.externalId) });
        const qty =
          stock.response.stock_info_list?.[0]?.total_available_stock ?? 0;
        levels.push({ platform: "shopee", sku: l.sku, quantity: qty, inStock: qty > 0 });
      } catch {
        // skip items we can't read
      }
    }
    return levels;
  }

  async pushInventory(items: InventoryPush[]) {
    const errors: string[] = [];
    let updated = 0;
    if (!this.isConfigured()) return { updated, errors: ["Shopee not configured"] };

    for (const item of items) {
      try {
        await this.client.post("/api/v2/product/update_stock", {
          item_id: Number(item.externalId),
          stock_list: [
            {
              model_id: item.externalSku ? Number(item.externalSku) : 0,
              seller_stock: [{ stock: item.quantity }],
            },
          ],
        });
        updated++;
      } catch (e) {
        errors.push(`${item.sku}: ${(e as Error).message}`);
      }
    }
    return { updated, errors };
  }
}
