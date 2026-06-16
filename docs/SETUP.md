# Setup — accounts, APIs & credentials

Everything you need to enable each pillar. Work top-to-bottom; you can stop after any
pillar you're not ready for. **Nothing goes live until the relevant credentials exist.**

---

## 0. Prerequisites (one-time)

- A **Meta Business account** (business.facebook.com) — needed for BOTH Meta Ads and
  WhatsApp/Instagram messaging. If you run the HojichaYa Facebook/Instagram pages, you
  likely already have one.
- A **Google account** with **Google Ads** (ads.google.com).
- Node.js 18+ installed (only for the messaging bot).

---

## 1. SEO — ✅ no new credentials needed

SEO work uses the Shopify Admin API, already connected through Claude's Shopify
integration in this session. To apply the drafted SEO content in [`/seo`](../seo),
just ask Claude to apply it, or run the optional script with a Shopify Admin API token
(see [`/seo/scripts/README.md`](../seo/scripts/README.md)).

---

## 2. Meta (WhatsApp + Instagram + Meta Ads)

All three share one **Meta App**. Create it once.

### 2a. Create the Meta App
1. Go to <https://developers.facebook.com/apps> → **Create App** → type **Business**.
2. Link it to your HojichaYa **Business portfolio**.
3. Note the **App ID** and **App Secret** (Settings → Basic).

### 2b. WhatsApp Business Platform (Cloud API)
1. In the app, add the **WhatsApp** product.
2. You get a free **test number** immediately. To use your real shop number, add it under
   **WhatsApp → API Setup → Add phone number** (the number must NOT already be on the
   WhatsApp consumer or Business *app* — it has to be migrated to the Platform).
3. Copy: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, and a
   **permanent access token** (create a **System User** in Business Settings → assign the
   app → generate a token with `whatsapp_business_messaging` + `whatsapp_business_management`).
4. Set a **webhook**: callback URL = `https://YOUR_DOMAIN/webhook`, verify token =
   whatever you put in `WEBHOOK_VERIFY_TOKEN`. Subscribe to the `messages` field.

### 2c. Instagram Messaging
1. Your Instagram must be a **Professional (Business) account** and **linked to a Facebook
   Page**.
2. In the Meta App, add **Instagram** + **Messenger** products.
3. Generate a Page access token with scopes: `instagram_basic`,
   `instagram_manage_messages`, `pages_manage_metadata`, `pages_messaging`.
4. Subscribe the same webhook to Instagram `messages` events.
5. In the IG app: Settings → Messages → **Connected Tools → allow access** so the API can
   reply.

### 2d. Meta Ads (Marketing API)
1. Create/confirm an **Ad account** in Business Settings → note `META_AD_ACCOUNT_ID`
   (format `act_XXXXXXXX`).
2. Add the **Marketing API** product to the app.
3. Give your System User token the `ads_management` + `ads_read` scopes.
4. Connect the **Facebook & Instagram sales channel** in Shopify so your product catalog
   syncs automatically (Shopify admin → Settings → Apps and sales channels → Facebook).

---

## 3. Google Ads

1. Create a Google Ads account at <https://ads.google.com> (skip the guided campaign;
   choose "Switch to Expert Mode").
2. Apply for a **developer token**: Google Ads → Tools → API Center. (Basic access is
   enough to start; approval can take a day or two.)
3. Create OAuth credentials in **Google Cloud Console** (a Desktop or Web app) → get
   `GOOGLE_ADS_CLIENT_ID` + `GOOGLE_ADS_CLIENT_SECRET`, then generate a **refresh token**.
4. Note your `GOOGLE_ADS_CUSTOMER_ID` (the 10-digit ID, no dashes).
5. Connect the **Google sales channel** in Shopify so Merchant Center gets your product
   feed (needed for Shopping / Performance Max).

---

## 4. Where to put the secrets

Copy each service's `.env.example` to `.env` and fill it in. Never commit `.env`
(`.gitignore` already excludes it). Suggested top-level `.env` keys:

```
# Meta (shared)
META_APP_ID=
META_APP_SECRET=
WEBHOOK_VERIFY_TOKEN=

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_TOKEN=

# Instagram / Messenger
IG_PAGE_ACCESS_TOKEN=
IG_PAGE_ID=

# Meta Ads
META_AD_ACCOUNT_ID=act_

# Google Ads
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REFRESH_TOKEN=
GOOGLE_ADS_CUSTOMER_ID=

# Shopify (only for the optional SEO script / order lookups)
SHOPIFY_STORE_DOMAIN=hojichaya.com
SHOPIFY_ADMIN_TOKEN=
```

---

## Recommended order

1. **SEO** — immediate, free, high ROI. Do this first.
2. **Meta App + WhatsApp/Instagram auto-reply** — biggest day-to-day time saver.
3. **Ads** — once SEO landing pages are polished, so paid traffic converts better.
