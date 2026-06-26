import { shopifyConfig } from "@/lib/platforms/config";

// Thin wrapper over the Shopify Admin GraphQL API. Shopify uses a simple
// header token (X-Shopify-Access-Token) — no request signing required.
export class ShopifyClient {
  private get endpoint() {
    return `https://${shopifyConfig.domain}/admin/api/${shopifyConfig.apiVersion}/graphql.json`;
  }

  async graphql<T = unknown>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": shopifyConfig.accessToken,
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Shopify API ${res.status}: ${await res.text()}`);
    }

    const json = (await res.json()) as { data?: T; errors?: unknown };
    if (json.errors) {
      throw new Error(`Shopify GraphQL error: ${JSON.stringify(json.errors)}`);
    }
    return json.data as T;
  }
}
