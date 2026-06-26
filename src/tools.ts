import type Anthropic from "@anthropic-ai/sdk";
import {
  searchProducts,
  resolveOrderItem,
  getShopInfo,
  getShopCurrency,
  listRecentOrders,
  upsertCustomer,
  createDraftOrder,
  listDraftOrders,
  completeDraftOrderPaid,
  type ResolveResult,
} from "./shopify.js";
import * as store from "./store.js";

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
      "List the most recent orders (paid and unpaid) with customer, total, and payment status. Use for questions like 'what orders came in today?' or 'show me recent sales'.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "How many recent orders to return (1-50, default 10)." },
      },
    },
  },
  {
    name: "preview_draft_order",
    description:
      "Resolve a customer's order against the catalog WITHOUT creating anything, and return a summary (matched items, subtotal, stock warnings) or a 'needs_clarification' result. ALWAYS call this first when the merchant gives you an order, show the merchant the summary, and ask them to confirm before you call create_draft_order.",
    input_schema: orderItemsSchema("Items to preview."),
  },
  {
    name: "create_draft_order",
    description:
      "Create a Shopify DRAFT order. Only call this AFTER preview_draft_order succeeded and the merchant explicitly confirmed. The draft is not charged automatically — the merchant reviews and invoices it from Shopify. If anything can't be matched, it returns 'needs_clarification'; relay the options and ask which one.",
    input_schema: orderItemsSchema("Items to put on the draft order."),
  },
  {
    name: "lookup_regular",
    description:
      "Look up a customer's saved 'usual' order. Use when the merchant says things like 'send John his usual'. Returns the saved items (which you then preview/confirm/create) or not_found.",
    input_schema: {
      type: "object",
      properties: { customer_name: { type: "string", description: "Customer name to look up." } },
      required: ["customer_name"],
    },
  },
  {
    name: "save_regular",
    description:
      "Save (or update) a customer's 'usual' order so it can be reused later. Use when the merchant says 'save this as John's usual' or 'John always orders X'.",
    input_schema: orderItemsSchema("The items that make up this customer's usual order."),
  },
  {
    name: "list_open_draft_orders",
    description:
      "List open (not-yet-paid) draft orders with their id, name, customer, items, and total. Use this to find the right draft when the merchant says a customer has paid, so you can then call complete_draft_order with the matching id.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "complete_draft_order",
    description:
      "Accept payment for a draft order: it converts the draft into a real order and marks it as PAID. Use when the merchant confirms a customer has paid. Pass the draft_id from list_open_draft_orders. If you are not sure which draft they mean, ask first.",
    input_schema: {
      type: "object",
      properties: {
        draft_id: { type: "string", description: "The draft order id (gid://shopify/DraftOrder/...) from list_open_draft_orders." },
      },
      required: ["draft_id"],
    },
  },
];

function orderItemsSchema(itemsDescription: string): Anthropic.Tool.InputSchema {
  return {
    type: "object",
    properties: {
      customer_name: { type: "string", description: "The customer's name." },
      items: {
        type: "array",
        description: itemsDescription,
        items: {
          type: "object",
          properties: {
            product: { type: "string", description: "Base product name, without the size/option." },
            variant: {
              type: "string",
              description: "Optional size/option the customer specified, e.g. '250g', 'large', 'red'. Omit if not specified.",
            },
            quantity: { type: "integer", description: "Quantity ordered (must be >= 1)." },
          },
          required: ["product", "quantity"],
        },
      },
      note: { type: "string", description: "Optional note for the draft order (delivery instructions, etc.)." },
    },
    required: ["customer_name", "items"],
  };
}

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
      const limit = clampLimit(input.limit, 10);
      return JSON.stringify({ orders: await listRecentOrders(limit) });
    }
    case "preview_draft_order":
      return await handlePreview(input);
    case "create_draft_order":
      return await handleCreate(input);
    case "lookup_regular":
      return handleLookupRegular(input);
    case "save_regular":
      return handleSaveRegular(input);
    case "list_open_draft_orders":
      return JSON.stringify({ open_drafts: await listDraftOrders() });
    case "complete_draft_order":
      return await handleComplete(input);
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

function clampLimit(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(Math.floor(n), 1), 50) : fallback;
}

interface OrderItemInput {
  product?: string;
  variant?: string;
  quantity?: number;
}

interface ResolvedLine {
  variantId: string;
  quantity: number;
  price: string;
  label: string;
  available: number | null;
}

interface ResolveItemsOutput {
  resolved: ResolvedLine[];
  clarifications: Record<string, unknown>[];
}

/** Shared resolution used by both preview and create so they never drift apart. */
async function resolveItems(items: OrderItemInput[]): Promise<ResolveItemsOutput> {
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
          price: result.variant.price,
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

  return { resolved, clarifications };
}

function needsClarification(resolved: ResolvedLine[], clarifications: Record<string, unknown>[]): string {
  return JSON.stringify({
    status: "needs_clarification",
    reason: "Could not confidently resolve every item. Ask the merchant about the items below before continuing.",
    unresolved: clarifications,
    already_matched: resolved.map((r) => r.label),
  });
}

function stockWarnings(resolved: ResolvedLine[]): string[] {
  return resolved
    .filter((r) => r.available !== null && r.available < r.quantity)
    .map((r) => `${r.label} (only ${r.available} in stock)`);
}

async function handlePreview(input: any): Promise<string> {
  const customerName = String(input.customer_name ?? "").trim();
  const items: OrderItemInput[] = Array.isArray(input.items) ? input.items : [];
  if (!customerName) return JSON.stringify({ status: "needs_clarification", reason: "Missing customer name." });
  if (items.length === 0) return JSON.stringify({ status: "needs_clarification", reason: "No items specified." });

  const { resolved, clarifications } = await resolveItems(items);
  if (clarifications.length > 0) return needsClarification(resolved, clarifications);

  const subtotal = resolved.reduce((sum, r) => sum + Number(r.price) * r.quantity, 0);
  const currency = await getShopCurrency();

  return JSON.stringify({
    status: "preview",
    customer_name: customerName,
    items: resolved.map((r) => `${r.label} @ ${r.price}`),
    items_subtotal: `${subtotal.toFixed(2)} ${currency}`,
    stock_warnings: stockWarnings(resolved),
    note: "Nothing created yet. Show this to the merchant and ask them to confirm before calling create_draft_order.",
  });
}

async function handleCreate(input: any): Promise<string> {
  const customerName = String(input.customer_name ?? "").trim();
  const items: OrderItemInput[] = Array.isArray(input.items) ? input.items : [];
  if (!customerName) return JSON.stringify({ status: "needs_clarification", reason: "Missing customer name." });
  if (items.length === 0) return JSON.stringify({ status: "needs_clarification", reason: "No items specified." });

  const { resolved, clarifications } = await resolveItems(items);
  if (clarifications.length > 0) return needsClarification(resolved, clarifications);

  const warnings = stockWarnings(resolved);
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
    stock_warnings: warnings,
    admin_url: draft.adminUrl,
    customer_linked: Boolean(customerId),
  });
}

function handleLookupRegular(input: any): string {
  const name = String(input.customer_name ?? "").trim();
  if (!name) return JSON.stringify({ status: "needs_clarification", reason: "Missing customer name." });
  const reg = store.getRegular(name);
  if (!reg) return JSON.stringify({ status: "not_found", customer_name: name });
  return JSON.stringify({ status: "found", customer_name: reg.name, items: reg.items });
}

function handleSaveRegular(input: any): string {
  const name = String(input.customer_name ?? "").trim();
  const rawItems: OrderItemInput[] = Array.isArray(input.items) ? input.items : [];
  if (!name) return JSON.stringify({ status: "error", reason: "Missing customer name." });

  const items = rawItems
    .map((i) => ({
      product: String(i.product ?? "").trim(),
      variant: i.variant ? String(i.variant).trim() : undefined,
      quantity: Math.floor(Number(i.quantity ?? 0)),
    }))
    .filter((i) => i.product && Number.isFinite(i.quantity) && i.quantity >= 1);

  if (items.length === 0) return JSON.stringify({ status: "error", reason: "No valid items to save." });

  store.saveRegular({ name, items });
  return JSON.stringify({
    status: "saved",
    customer_name: name,
    items: items.map((i) => `${i.quantity} x ${i.product}${i.variant ? ` (${i.variant})` : ""}`),
  });
}

async function handleComplete(input: any): Promise<string> {
  const draftId = String(input.draft_id ?? "").trim();
  if (!draftId.startsWith("gid://shopify/DraftOrder/")) {
    return JSON.stringify({
      status: "error",
      reason: "Need a valid draft_id from list_open_draft_orders before completing.",
    });
  }
  const result = await completeDraftOrderPaid(draftId);
  return JSON.stringify({
    status: result.note ? "partial" : "completed",
    order_name: result.orderName,
    financial_status: result.financialStatus,
    note: result.note,
  });
}

function lineLabel(qty: number, productTitle: string, variantTitle: string): string {
  const showVariant = variantTitle && variantTitle.toLowerCase() !== "default title";
  return `${qty} x ${productTitle}${showVariant ? ` (${variantTitle})` : ""}`;
}
