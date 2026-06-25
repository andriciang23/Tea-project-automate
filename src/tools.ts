import type Anthropic from "@anthropic-ai/sdk";
import {
  searchProducts,
  resolveOrderItem,
  getShopInfo,
  listRecentOrders,
  upsertCustomer,
  createDraftOrder,
  type ResolveResult,
} from "./shopify.js";

/** Tool schemas exposed to Claude. */
export const tools: Anthropic.Tool[] = [
  {
    name: "search_products",
    description:
      "Search the Shopify catalog by free text. Use this to answer questions about prices, cost, variants, SKUs, and stock levels (e.g. 'how much is the oolong?', 'what's our cost on jasmine?', 'do we have it in stock?'). Returns each product's variants with price, unit cost, SKU, and quantity available.",
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
      "Create a Shopify DRAFT order from a customer's order the merchant forwarded. The draft is NOT charged automatically — the merchant reviews it and sends the invoice from Shopify. Only call this once you know the customer name and every item. For each item, put the base product in `product` and any size/option the customer specified in `variant` (e.g. product: 'oolong', variant: '250g'). If any item can't be matched to one product/variant, this tool returns a 'needs_clarification' result listing the options — relay it and ask the merchant which one, instead of guessing.",
    input_schema: {
      type: "object",
      properties: {
        customer_name: { type: "string", description: "The customer's name as given by the merchant." },
        items: {
          type: "array",
          description: "The ordered items.",
          items: {
            type: "object",
            properties: {
              product: { type: "string", description: "Base product name as the customer described it (without the size/option)." },
              variant: {
                type: "string",
                description: "Optional size/option the customer specified, e.g. '250g', 'large', 'red'. Omit if they didn't say.",
              },
              quantity: { type: "integer", description: "Quantity ordered (must be >= 1)." },
            },
            required: ["product", "quantity"],
          },
        },
        note: { type: "string", description: "Optional note for the draft order (delivery instructions, etc.)." },
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
    case "get_shop_info":
      return JSON.stringify(await getShopInfo());
    case "list_recent_orders": {
      const limit = Math.min(Math.max(Number(input.limit ?? 10), 1), 50);
      return JSON.stringify({ orders: await listRecentOrders(limit) });
    }
    case "create_draft_order":
      return await handleCreateDraftOrder(input);
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

interface OrderItemInput {
  product?: string;
  variant?: string;
  quantity?: number;
}

interface ResolvedLine {
  variantId: string;
  quantity: number;
  label: string;
  available: number | null;
}

async function handleCreateDraftOrder(input: any): Promise<string> {
  const customerName = String(input.customer_name ?? "").trim();
  const items: OrderItemInput[] = Array.isArray(input.items) ? input.items : [];

  if (!customerName) {
    return JSON.stringify({ status: "needs_clarification", reason: "Missing customer name." });
  }
  if (items.length === 0) {
    return JSON.stringify({ status: "needs_clarification", reason: "No items specified." });
  }

  const resolved: ResolvedLine[] = [];
  const clarifications: Record<string, unknown>[] = [];

  for (const item of items) {
    const productName = String(item.product ?? "").trim();
    const qty = Math.floor(Number(item.quantity ?? 0));

    if (!productName) {
      clarifications.push({ item: "(unnamed)", issue: "missing product name" });
      continue;
    }
    if (!Number.isFinite(qty) || qty < 1) {
      clarifications.push({ item: productName, issue: "missing or invalid quantity" });
      continue;
    }

    const result: ResolveResult = await resolveOrderItem(productName, item.variant);
    switch (result.status) {
      case "matched":
        resolved.push({
          variantId: result.variant.id,
          quantity: qty,
          label: lineLabel(qty, result.variant.productTitle, result.variant.title),
          available: result.variant.available,
        });
        break;
      case "ambiguous_product":
        clarifications.push({
          item: productName,
          issue: "matched several products — ask which one",
          options: result.candidates,
        });
        break;
      case "ambiguous_variant":
        clarifications.push({
          item: result.hint ? `${productName} (${result.hint})` : productName,
          issue: "this product has several variants — ask which size/option",
          product: result.productTitle,
          options: result.options.map((o) => `${o.title} — ${o.price}`),
        });
        break;
      case "not_found":
        clarifications.push({ item: productName, issue: "no matching product found" });
        break;
    }
  }

  // If anything is uncertain, create nothing and ask the merchant.
  if (clarifications.length > 0) {
    return JSON.stringify({
      status: "needs_clarification",
      reason: "Could not confidently resolve every item. Ask the merchant about the items below before creating the draft.",
      unresolved: clarifications,
      already_matched: resolved.map((r) => r.label),
    });
  }

  // Note any items where the order quantity exceeds tracked stock (informational —
  // the draft is still created; the merchant decides what to do).
  const stockWarnings = resolved
    .filter((r) => r.available !== null && r.available < r.quantity)
    .map((r) => `${r.label} (only ${r.available} in stock)`);

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
    stock_warnings: stockWarnings,
    admin_url: draft.adminUrl,
    customer_linked: Boolean(customerId),
  });
}

function lineLabel(qty: number, productTitle: string, variantTitle: string): string {
  const showVariant = variantTitle && variantTitle.toLowerCase() !== "default title";
  return `${qty} x ${productTitle}${showVariant ? ` (${variantTitle})` : ""}`;
}
