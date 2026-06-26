// Central place to read platform credentials from the environment.
// Keeping this in one module means adapters never touch process.env directly.

export const shopifyConfig = {
  domain: process.env.SHOPIFY_STORE_DOMAIN ?? "",
  accessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? "",
  apiVersion: process.env.SHOPIFY_API_VERSION || "2024-10",
  get configured() {
    return Boolean(this.domain && this.accessToken);
  },
};

export const shopeeConfig = {
  partnerId: process.env.SHOPEE_PARTNER_ID ?? "",
  partnerKey: process.env.SHOPEE_PARTNER_KEY ?? "",
  shopId: process.env.SHOPEE_SHOP_ID ?? "",
  accessToken: process.env.SHOPEE_ACCESS_TOKEN ?? "",
  region: process.env.SHOPEE_REGION || "SG",
  host: process.env.SHOPEE_HOST || "https://partner.shopeemobile.com",
  get configured() {
    return Boolean(this.partnerId && this.partnerKey && this.shopId && this.accessToken);
  },
};

const LAZADA_HOSTS: Record<string, string> = {
  SG: "https://api.lazada.sg/rest",
  MY: "https://api.lazada.com.my/rest",
  ID: "https://api.lazada.co.id/rest",
  TH: "https://api.lazada.co.th/rest",
  VN: "https://api.lazada.vn/rest",
  PH: "https://api.lazada.com.ph/rest",
};

export const lazadaConfig = {
  appKey: process.env.LAZADA_APP_KEY ?? "",
  appSecret: process.env.LAZADA_APP_SECRET ?? "",
  accessToken: process.env.LAZADA_ACCESS_TOKEN ?? "",
  region: process.env.LAZADA_REGION || "SG",
  get host() {
    return (
      process.env.LAZADA_HOST ||
      LAZADA_HOSTS[this.region] ||
      LAZADA_HOSTS.SG
    );
  },
  get configured() {
    return Boolean(this.appKey && this.appSecret && this.accessToken);
  },
};
