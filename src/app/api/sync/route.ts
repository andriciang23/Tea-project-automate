import { NextRequest, NextResponse } from "next/server";
import { runFullSync } from "@/lib/sync";
import {
  pushAllInventory,
  pullAllInventory,
  setMasterStock,
} from "@/lib/sync/inventory";
import { syncAllOrders } from "@/lib/sync/orders";
import { syncAllProducts } from "@/lib/sync/products";

export const dynamic = "force-dynamic";

// POST /api/sync  { scope: "all" | "orders" | "products" | "inventory" | "set-stock", ... }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const scope = body.scope ?? "all";

  try {
    switch (scope) {
      case "orders":
        return NextResponse.json({ results: await syncAllOrders() });
      case "products":
        return NextResponse.json({ results: await syncAllProducts() });
      case "inventory-pull":
        return NextResponse.json({ results: await pullAllInventory() });
      case "inventory-push":
        return NextResponse.json({ results: await pushAllInventory() });
      case "set-stock": {
        if (!body.sku || typeof body.available !== "number") {
          return NextResponse.json(
            { error: "sku and available are required" },
            { status: 400 },
          );
        }
        return NextResponse.json(await setMasterStock(body.sku, body.available));
      }
      case "all":
      default:
        return NextResponse.json(
          await runFullSync({ pushInventory: Boolean(body.pushInventory) }),
        );
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
