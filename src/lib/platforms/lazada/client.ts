import crypto from "crypto";
import { lazadaConfig } from "@/lib/platforms/config";

// Lazada Open Platform client.
// Signing: collect all request params (incl. common ones), sort keys
// alphabetically, concatenate as apiPath + key1value1 + key2value2 ...,
// HMAC-SHA256 with the app secret, hex-encoded UPPERCASE.
// See https://open.lazada.com/apps/doc/doc
export class LazadaClient {
  private sign(apiPath: string, params: Record<string, string>): string {
    const sortedKeys = Object.keys(params).sort();
    const base =
      apiPath + sortedKeys.map((k) => `${k}${params[k]}`).join("");
    return crypto
      .createHmac("sha256", lazadaConfig.appSecret)
      .update(base)
      .digest("hex")
      .toUpperCase();
  }

  private buildParams(extra: Record<string, string | number>): Record<string, string> {
    const params: Record<string, string> = {
      app_key: lazadaConfig.appKey,
      access_token: lazadaConfig.accessToken,
      timestamp: String(Date.now()),
      sign_method: "sha256",
    };
    for (const [k, v] of Object.entries(extra)) params[k] = String(v);
    return params;
  }

  async call<T = unknown>(
    apiPath: string,
    extra: Record<string, string | number> = {},
    method: "GET" | "POST" = "GET",
  ): Promise<T> {
    const params = this.buildParams(extra);
    params.sign = this.sign(apiPath, params);
    const qs = new URLSearchParams(params).toString();
    const url = `${lazadaConfig.host}${apiPath}?${qs}`;

    const res = await fetch(url, { method, cache: "no-store" });
    const json = (await res.json()) as {
      code?: string;
      message?: string;
    } & T;
    if (json.code && json.code !== "0") {
      throw new Error(`Lazada error ${json.code}: ${json.message ?? ""}`);
    }
    return json;
  }
}
