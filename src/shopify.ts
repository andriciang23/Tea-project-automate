import { config } from "./config.js";

/** Execute a GraphQL operation against the Shopify Admin API. */
export async function adminGraphQL<T = any>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const url = `https://${config.SHOPIFY_STORE_DOMAIN}/admin/api/${config.SHOPIFY_API_VERSION}/graphql.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": config.SHOPIFY_ADMIN_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Shopify API error (${res.status}): ${detail}`);
  }

  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (json.errors) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data as T;
}

export interface VariantNode {
  id: string;
  title: string;
  price: string;
  sku: string | null;
  available: number | null;
  unitCost: string | null;
}

export interface VariantMatch extends VariantNode {
  productTitle: string;
}

export interface ProductSummary {
  title: string;
  status: string;
  variants: {
    title: string;
    price: string;
    sku: string | null;
    available: number | null;
    unitCost: string | null;
  }[];
}

// Shared GraphQL fragment for the variant fields we care about.
const VARIANT_FIELDS = `
  id
  title
  price
  sku
  inventoryQuantity
  inventoryItem { unitCost { amount } }
`;

interface RawProductNode {
  title: string;
  status?: string;
  variants: {
    edges: {
      node: {
        id: string;
        title: string;
        price: string;
        sku: string | null;
        inventoryQuantity: number | null;
        inventoryItem: { unitCost: { amount: string } | null } | null;
      };
    }[];
  };
}

function toVariantNodes(product: RawProductNode): VariantNode[] {
  return product.variants.edges.map((v) => ({
    id: v.node.id,
    title: v.node.title,
    price: v.node.price,
    sku: v.node.sku,
    available: v.node.inventoryQuantity,
    unitCost: v.node.inventoryItem?.unitCost?.amount ?? null,
  }));
}

/**
 * Search products by free text. Returns a flat, model-friendly summary used for
 * answering questions about prices, cost, SKUs, and stock.
 */
export async function searchProducts(queryText: string, first = 10): Promise<ProductSummary[]> {
  const data = await adminGraphQL<{ products: { edges: { node: RawProductNode }[] } }>(
    `query SearchProducts($q: String!, $first: Int!) {
      products(first: $first, query: $q) {
        edges {
          node {
            title
            status
            variants(first: 25) { edges { node { ${VARIANT_FIELDS} } } }
          }
        }
      }
    }`,
    { q: queryText, first },
  );

  return data.products.edges.map((e) => ({
    title: e.node.title,
    status: e.node.status ?? "UNKNOWN",
    variants: toVariantNodes(e.node).map((v) => ({
      title: v.title,
      price: v.price,
      sku: v.sku,
      available: v.available,
      unitCost: v.unitCost,
    })),
  }));
}

export type ResolveResult =
  | { status: "matched"; variant: VariantMatch }
  | { status: "ambiguous_product"; query: string; candidates: string[] }
  | {
      status: "ambiguous_variant";
      productTitle: string;
      hint?: string;
      options: { title: string; price: string; available: number | null }[];
    }
  | { status: "not_found"; query: string };

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_-]+/g, "");
}

/** Pick variants whose title matches a free-text hint (e.g. "250g", "large"). */
function matchVariantsByHint(variants: VariantNode[], hint: string): VariantNode[] {
  const h = normalize(hint);
  if (!h) return [];
  // Prefer an exact normalized title match; fall back to substring containment
  // in either direction (so "250g oolong" matches the "250g" variant title).
  const exact = variants.filter((v) => normalize(v.title) === h);
  if (exact.length > 0) return exact;
  return variants.filter((v) => {
    const t = normalize(v.title);
    return t.length > 0 && (h.includes(t) || t.includes(h));
  });
}

/**
 * Resolve an order line ("250g oolong" x2) to a single Shopify variant.
 *
 * The result tells the caller exactly why a resolution is uncertain so the agent
 * can ask the merchant a precise question instead of guessing:
 *  - matched           → use this variant
 *  - ambiguous_product → the name matched several products; ask which one
 *  - ambiguous_variant → one product, but multiple sizes/options; ask which variant
 *  - not_found         → nothing matched
 */
export async function resolveOrderItem(name: string, variantHint?: string): Promise<ResolveResult> {
  const data = await adminGraphQL<{ products: { edges: { node: RawProductNode }[] } }>(
    `query ResolveItem($q: String!) {
      products(first: 5, query: $q) {
        edges {
          node {
            title
            variants(first: 50) { edges { node { ${VARIANT_FIELDS} } } }
          }
        }
      }
    }`,
    { q: name },
  );

  const products = data.products.edges;
  if (products.length === 0) return { status: "not_found", query: name };
  if (products.length > 1) {
    return {
      status: "ambiguous_product",
      query: name,
      candidates: products.map((p) => p.node.title),
    };
  }

  const product = products[0].node;
  const variants = toVariantNodes(product);
  if (variants.length === 0) return { status: "not_found", query: name };

  const toMatch = (v: VariantNode): VariantMatch => ({ ...v, productTitle: product.title });

  // Single variant ("Default Title") — unambiguous.
  if (variants.length === 1) return { status: "matched", variant: toMatch(variants[0]) };

  // Multiple variants — use the hint to pick one.
  if (variantHint && variantHint.trim()) {
    const hits = matchVariantsByHint(variants, variantHint);
    if (hits.length === 1) return { status: "matched", variant: toMatch(hits[0]) };
  }

  // No hint, or the hint matched zero / multiple variants — ask the merchant.
  return {
    status: "ambiguous_variant",
    productTitle: product.title,
    hint: variantHint,
    options: variants.map((v) => ({ title: v.title, price: v.price, available: v.available })),
  };
}

export interface ShopInfo {
  name: string;
  url: string;
  currencyCode: string;
  contactEmail: string | null;
}

export async function getShopInfo(): Promise<ShopInfo> {
  const data = await adminGraphQL<{
    shop: {
      name: string;
      contactEmail: string | null;
      currencyCode: string;
      primaryDomain: { url: string };
    };
  }>(
    `query {
      shop {
        name
        contactEmail
        currencyCode
        primaryDomain { url }
      }
    }`,
  );
  return {
    name: data.shop.name,
    url: data.shop.primaryDomain.url,
    currencyCode: data.shop.currencyCode,
    contactEmail: data.shop.contactEmail,
  };
}

let cachedCurrency: string | null = null;

/** Store currency code (e.g. "IDR", "USD"), cached after the first lookup. */
export async function getShopCurrency(): Promise<string> {
  if (cachedCurrency) return cachedCurrency;
  cachedCurrency = (await getShopInfo()).currencyCode;
  return cachedCurrency;
}

export interface RecentOrder {
  name: string;
  customer: string | null;
  total: string;
  currency: string;
  financialStatus: string | null;
  createdAt: string;
}

export async function listRecentOrders(first = 10): Promise<RecentOrder[]> {
  const data = await adminGraphQL<{
    orders: {
      edges: {
        node: {
          name: string;
          createdAt: string;
          displayFinancialStatus: string | null;
          customer: { displayName: string | null } | null;
          totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
        };
      }[];
    };
  }>(
    `query RecentOrders($first: Int!) {
      orders(first: $first, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            name
            createdAt
            displayFinancialStatus
            customer { displayName }
            totalPriceSet { shopMoney { amount currencyCode } }
          }
        }
      }
    }`,
    { first },
  );
  return data.orders.edges.map((e) => ({
    name: e.node.name,
    customer: e.node.customer?.displayName ?? null,
    total: e.node.totalPriceSet.shopMoney.amount,
    currency: e.node.totalPriceSet.shopMoney.currencyCode,
    financialStatus: e.node.displayFinancialStatus,
    createdAt: e.node.createdAt,
  }));
}

/** Escape a value for safe interpolation into a Shopify search query string. */
function escapeQueryValue(v: string): string {
  return v.replace(/["\\]/g, "\\$&");
}

/** Find an existing customer by name, or create one. Best-effort; returns null on failure. */
export async function upsertCustomer(name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ") || undefined;

  // Try to find an existing customer by name first. Quote + escape the values so
  // names with spaces or special characters don't break the search query.
  const q = lastName
    ? `first_name:"${escapeQueryValue(firstName)}" AND last_name:"${escapeQueryValue(lastName)}"`
    : `first_name:"${escapeQueryValue(firstName)}"`;
  const search = await adminGraphQL<{
    customers: { edges: { node: { id: string } }[] };
  }>(
    `query FindCustomer($q: String!) {
      customers(first: 1, query: $q) { edges { node { id } } }
    }`,
    { q },
  );
  const existing = search.customers.edges[0]?.node.id;
  if (existing) return existing;

  // Otherwise create a new customer record.
  const created = await adminGraphQL<{
    customerCreate: {
      customer: { id: string } | null;
      userErrors: { field: string[] | null; message: string }[];
    };
  }>(
    `mutation CreateCustomer($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer { id }
        userErrors { field message }
      }
    }`,
    { input: { firstName, lastName } },
  );
  if (created.customerCreate.userErrors.length > 0) {
    console.error("customerCreate errors:", created.customerCreate.userErrors);
    return null;
  }
  return created.customerCreate.customer?.id ?? null;
}

export interface DraftOrderResult {
  name: string;
  invoiceUrl: string | null;
  total: string;
  currency: string;
  adminUrl: string;
}

/**
 * Create a Shopify draft order from resolved line items. The draft stays unpaid;
 * the merchant reviews it and sends the invoice/charge from Shopify admin.
 */
export async function createDraftOrder(params: {
  lineItems: { variantId: string; quantity: number }[];
  customerId?: string | null;
  note?: string;
  tags?: string[];
}): Promise<DraftOrderResult> {
  const input: Record<string, unknown> = {
    lineItems: params.lineItems.map((li) => ({
      variantId: li.variantId,
      quantity: li.quantity,
    })),
    tags: params.tags ?? ["whatsapp"],
  };
  if (params.customerId) input.purchasingEntity = { customerId: params.customerId };
  if (params.note) input.note = params.note;

  const data = await adminGraphQL<{
    draftOrderCreate: {
      draftOrder: {
        id: string;
        name: string;
        invoiceUrl: string | null;
        totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
      } | null;
      userErrors: { field: string[] | null; message: string }[];
    };
  }>(
    `mutation CreateDraft($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          name
          invoiceUrl
          totalPriceSet { shopMoney { amount currencyCode } }
        }
        userErrors { field message }
      }
    }`,
    { input },
  );

  const errs = data.draftOrderCreate.userErrors;
  if (errs.length > 0) {
    throw new Error(`draftOrderCreate failed: ${JSON.stringify(errs)}`);
  }
  const draft = data.draftOrderCreate.draftOrder;
  if (!draft) throw new Error("draftOrderCreate returned no draft order");

  const numericId = draft.id.split("/").pop();
  const adminUrl = `https://${config.SHOPIFY_STORE_DOMAIN}/admin/draft_orders/${numericId}`;

  return {
    name: draft.name,
    invoiceUrl: draft.invoiceUrl,
    total: draft.totalPriceSet.shopMoney.amount,
    currency: draft.totalPriceSet.shopMoney.currencyCode,
    adminUrl,
  };
}

export interface OpenDraft {
  id: string;
  name: string;
  customer: string | null;
  total: string;
  currency: string;
  createdAt: string;
  items: { title: string; quantity: number }[];
}

/** List open (not-yet-completed) draft orders so the agent can find one to mark paid. */
export async function listDraftOrders(first = 25): Promise<OpenDraft[]> {
  const data = await adminGraphQL<{
    draftOrders: {
      edges: {
        node: {
          id: string;
          name: string;
          createdAt: string;
          customer: { displayName: string | null } | null;
          totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
          lineItems: { edges: { node: { title: string; quantity: number } }[] };
        };
      }[];
    };
  }>(
    `query OpenDrafts($first: Int!) {
      draftOrders(first: $first, query: "status:open", sortKey: UPDATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            createdAt
            customer { displayName }
            totalPriceSet { shopMoney { amount currencyCode } }
            lineItems(first: 20) { edges { node { title quantity } } }
          }
        }
      }
    }`,
    { first },
  );
  return data.draftOrders.edges.map((e) => ({
    id: e.node.id,
    name: e.node.name,
    customer: e.node.customer?.displayName ?? null,
    total: e.node.totalPriceSet.shopMoney.amount,
    currency: e.node.totalPriceSet.shopMoney.currencyCode,
    createdAt: e.node.createdAt,
    items: e.node.lineItems.edges.map((li) => ({ title: li.node.title, quantity: li.node.quantity })),
  }));
}

export interface CompletedOrder {
  orderName: string;
  financialStatus: string | null;
  note: string | null;
}

/**
 * Complete a draft order (turning it into a real order) and mark it as paid.
 * In Admin API 2025+, completing no longer takes a paymentPending flag, so we
 * complete first, then call orderMarkAsPaid on the resulting order.
 */
export async function completeDraftOrderPaid(draftId: string): Promise<CompletedOrder> {
  const completed = await adminGraphQL<{
    draftOrderComplete: {
      draftOrder: { id: string; order: { id: string; name: string } | null } | null;
      userErrors: { field: string[] | null; message: string }[];
    };
  }>(
    `mutation CompleteDraft($id: ID!) {
      draftOrderComplete(id: $id) {
        draftOrder { id order { id name } }
        userErrors { field message }
      }
    }`,
    { id: draftId },
  );

  const cErrs = completed.draftOrderComplete.userErrors;
  if (cErrs.length > 0) {
    throw new Error(`draftOrderComplete failed: ${JSON.stringify(cErrs)}`);
  }
  const order = completed.draftOrderComplete.draftOrder?.order;
  if (!order) throw new Error("Draft completed but no order was returned.");

  const paid = await adminGraphQL<{
    orderMarkAsPaid: {
      order: { name: string; displayFinancialStatus: string | null } | null;
      userErrors: { field: string[] | null; message: string }[];
    };
  }>(
    `mutation MarkPaid($input: OrderMarkAsPaidInput!) {
      orderMarkAsPaid(input: $input) {
        order { name displayFinancialStatus }
        userErrors { field message }
      }
    }`,
    { input: { id: order.id } },
  );

  const pErrs = paid.orderMarkAsPaid.userErrors;
  if (pErrs.length > 0) {
    // The order exists, but recording payment failed — report so the merchant can finish in admin.
    return {
      orderName: order.name,
      financialStatus: null,
      note: `Order created, but marking it paid failed: ${pErrs.map((e) => e.message).join("; ")}`,
    };
  }
  return {
    orderName: paid.orderMarkAsPaid.order?.name ?? order.name,
    financialStatus: paid.orderMarkAsPaid.order?.displayFinancialStatus ?? null,
    note: null,
  };
}
