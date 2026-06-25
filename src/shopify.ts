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

export interface VariantMatch {
  variantId: string;
  productTitle: string;
  variantTitle: string;
  price: string;
  available: number | null;
  sku: string | null;
}

export interface ProductSummary {
  title: string;
  status: string;
  variants: {
    title: string;
    price: string;
    sku: string | null;
    available: number | null;
  }[];
}

/**
 * Search products by free text. Returns a flat, model-friendly summary used both
 * for answering questions ("how much is the oolong?") and as the basis for
 * resolving order line items.
 */
export async function searchProducts(queryText: string, first = 10): Promise<ProductSummary[]> {
  const data = await adminGraphQL<{
    products: {
      edges: {
        node: {
          title: string;
          status: string;
          variants: {
            edges: {
              node: {
                title: string;
                price: string;
                sku: string | null;
                inventoryQuantity: number | null;
              };
            }[];
          };
        };
      }[];
    };
  }>(
    `query SearchProducts($q: String!, $first: Int!) {
      products(first: $first, query: $q) {
        edges {
          node {
            title
            status
            variants(first: 25) {
              edges {
                node { title price sku inventoryQuantity }
              }
            }
          }
        }
      }
    }`,
    { q: queryText, first },
  );

  return data.products.edges.map((e) => ({
    title: e.node.title,
    status: e.node.status,
    variants: e.node.variants.edges.map((v) => ({
      title: v.node.title,
      price: v.node.price,
      sku: v.node.sku,
      available: v.node.inventoryQuantity,
    })),
  }));
}

/**
 * Resolve a product name to a single best variant for a draft order line item.
 * Returns null when there is no confident match, which tells the agent to ask
 * the merchant to clarify rather than guess.
 */
export async function findVariant(name: string): Promise<VariantMatch | null> {
  const data = await adminGraphQL<{
    products: {
      edges: {
        node: {
          title: string;
          variants: {
            edges: {
              node: {
                id: string;
                title: string;
                price: string;
                sku: string | null;
                inventoryQuantity: number | null;
              };
            }[];
          };
        };
      }[];
    };
  }>(
    `query FindVariant($q: String!) {
      products(first: 5, query: $q) {
        edges {
          node {
            title
            variants(first: 25) {
              edges {
                node { id title price sku inventoryQuantity }
              }
            }
          }
        }
      }
    }`,
    { q: name },
  );

  const products = data.products.edges;
  if (products.length === 0) return null;

  // Confident only when the search points to a single product. If the text is
  // vague and matches several products, return null so the agent asks.
  if (products.length > 1) return null;

  const product = products[0].node;
  const variants = product.variants.edges;
  if (variants.length === 0) return null;

  // Single-variant products are unambiguous; multi-variant ones need the agent
  // to specify which (size/flavour), so treat that as "needs clarification".
  if (variants.length > 1) return null;

  const v = variants[0].node;
  return {
    variantId: v.id,
    productTitle: product.title,
    variantTitle: v.title,
    price: v.price,
    available: v.inventoryQuantity,
    sku: v.sku,
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

/** Find an existing customer by name, or create one. Best-effort; returns null on failure. */
export async function upsertCustomer(name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ") || undefined;

  // Try to find an existing customer by name first.
  const search = await adminGraphQL<{
    customers: { edges: { node: { id: string; displayName: string } }[] };
  }>(
    `query FindCustomer($q: String!) {
      customers(first: 1, query: $q) { edges { node { id displayName } } }
    }`,
    { q: `first_name:${firstName}${lastName ? ` AND last_name:${lastName}` : ""}` },
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
