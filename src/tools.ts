import type Anthropic from "@anthropic-ai/sdk";
import {
  searchProducts,
  findVariant,
  getShopInfo,
  listRecentOrders,
  upsertCustomer,
  createDraftOrder,
} from "./shopify.js";

/** Tool schemas exposed to Claude. */
export const tools: Anthropic.Tool[] = [
  {
    name: "search_products",
    description:
      "Search the Shopify catalog by free text. Use this to answer questions about prices, variants, SKUs, and stock levels (e.g. 'how much is the oolong?', 'do we have jasmine green in stock?').",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free-text product search, e.g. 'oolong' or 'jasmine green tea'." },
      },
      required: ["query"],
    },
  },
  {
    name: "get_shop_info",
    description:
      "Get the store's name, website URL, and currency. Use for questions like 'what's my store URL?' or 'what currency are we in?'.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_recent_orders",
    description:
      "List the most recent orders with customer, total, and payment status. Use for questions like 'what orders came in today?' or 'show me recent sales'.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "How many recent orders to return (1-50, default 10)." },
      },
    },
  },
  {
    name: "create_draft_order",
    description:
      "Create a Shopify DRAFT order from a customer's order that the merchant forwarded. The draft is NOT charged automatically — the merchant reviews it and sends the invoice from Shopify. Only call this once you are confident about every line item and the customer name. If any product can't be matched, this tool returns a 'needs_clarification' result; relay that to the merchant and ask which product they mean instead of guessing.",
    input_schema: {
      type: "object",
      properties: {
        customer_name: {
          type: "string",
          description: "The customer's name as given by the merchant.",
        },
        items: {
          type: "array",
          description: "The ordered items.",
          items: {
            type: "object",
            properties: {
              product: { type: "string", description: "Product name as the customer described it." },
              quantity: { type: "integer", description: "Quantity ordered (must be >= 1)." },
            },
            required: ["product", "quantity"],
          },
        },
        note: {
          type: "string",
          description: "Optional note to attach to the draft order (delivery instructions, etc.).",
        },
      },
      required: ["customer_name", "items"],
    },
  },
];

/** Run a tool by name and return a string result for the model. */
export async function runTool(name: string, input: any): Promise<string> {
  switch (name) {
    case "search_products": {
      const results = await searchProducts(String(input.query ?? ""));
      if (results.length === 0) return JSON.stringify({ products: [], note: "No matching products found." });
      return JSON.stringify({ products: results });
    }

    case "get_shop_info": {
      return JSON.stringify(await getShopInfo());
    }

    case "list_recent_orders": {
      const limit = Math.min(Math.max(Number(input.limit ?? 10), 1), 50);
      return JSON.stringify({ orders: await listRecentOrders(limit) });
    }

    case "create_draft_order": {
      return await handleCreateDraftOrder(input);
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

async function handleCreateDraftOrder(input: any): Promise<string> {
  const customerName = String(input.customer_name ?? "").trim();
  const items: { product: string; quantity: number }[] = Array.isArray(input.items) ? input.items : [];

  if (!customerName) {
    return JSON.stringify({ status: "needs_clarification", reason: "Missing customer name." });
  }
  if (items.length === 0) {
    return JSON.stringify({ status: "needs_clarification", reason: "No items specified." });
  }

  // Resolve every item to a concrete variant. Any miss => ask the merchant.
  const resolved: { variantId: string; quantity: number; label: string }[] = [];
  const unresolved: string[] = [];

  for (const item of items) {
    const qty = Math.max(Number(item.quantity ?? 0), 0);
    if (qty < 1) {
      unresolved.push(`${item.product} (invalid quantity)`);
      continue;
    }
    const match = await findVariant(String(item.product ?? ""));
    if (!match) {
      unresolved.push(String(item.product ?? "(unnamed)"));
      continue;
    }
    resolved.push({
      variantId: match.variantId,
      quantity: qty,
      label: `${qty} x ${match.productTitle}`,
    });
  }

  if (unresolved.length > 0) {
    return JSON.stringify({
      status: "needs_clarification",
      reason:
        "Could not confidently match these to a single product/variant. Ask the merchant which exact product (and size/variant) they mean.",
      unresolved,
      resolved: resolved.map((r) => r.label),
    });
  }

  const customerId = await upsertCustomer(customerName);
  const draft = await createDraftOrder({
    lineItems: resolved.map((r) => ({ variantId: r.variantId, quantity: r.quantity })),
    customerId,
    note: [`WhatsApp order for ${customerName}`, input.note ? String(input.note) : ""]
      .filter(Boolean)
      .join(" — "),
    tags: ["whatsapp"],
  });

  return JSON.stringify({
    status: "created",
    draft_name: draft.name,
    total: `${draft.total} ${draft.currency}`,
    items: resolved.map((r) => r.label),
    admin_url: draft.adminUrl,
  });
}
