import crypto from "crypto";
import { shopeeConfig } from "@/lib/platforms/config";

// Shopee Open Platform client.
// Shop-level calls are authenticated with an HMAC-SHA256 signature over the
// base string: partner_id + api_path + timestamp + access_token + shop_id,
// signed with the partner_key. The signature + common params go in the query
// string. See https://open.shopee.com/documents (API v2).
export class ShopeeClient {
  private sign(apiPath: string, timestamp: number): string {
    const base = `${shopeeConfig.partnerId}${apiPath}${timestamp}${shopeeConfig.accessToken}${shopeeConfig.shopId}`;
    return crypto
      .createHmac("sha256", shopeeConfig.partnerKey)
      .update(base)
      .digest("hex");
  }

  private commonParams(apiPath: string): URLSearchParams {
    const timestamp = Math.floor(Date.now() / 1000);
    return new URLSearchParams({
      partner_id: shopeeConfig.partnerId,
      timestamp: String(timestamp),
      access_token: shopeeConfig.accessToken,
      shop_id: shopeeConfig.shopId,
      sign: this.sign(apiPath, timestamp),
    });
  }

  async get<T = unknown>(
    apiPath: string,
    params: Record<string, string | number> = {},
  ): Promise<T> {
    const qs = this.commonParams(apiPath);
    for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
    const res = await fetch(`${shopeeConfig.host}${apiPath}?${qs.toString()}`, {
      cache: "no-store",
    });
    return this.parse<T>(res);
  }

  async post<T = unknown>(
    apiPath: string,
    body: Record<string, unknown> = {},
  ): Promise<T> {
    const qs = this.commonParams(apiPath);
    const res = await fetch(`${shopeeConfig.host}${apiPath}?${qs.toString()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return this.parse<T>(res);
  }

  private async parse<T>(res: Response): Promise<T> {
    const json = (await res.json()) as { error?: string; message?: string } & T;
    if (json.error) {
      throw new Error(`Shopee error ${json.error}: ${json.message ?? ""}`);
    }
    return json;
  }
}
