# Tea Project Automate — Unified Commerce Hub

One dashboard to run your **Shopify**, **Shopee**, and **Lazada** stores together:
unified orders, master inventory that syncs to every channel, cross-platform
analytics, and a unified product catalog.

> Status: foundation is complete and runnable with demo data. **Shopify** is
> wired to the live Admin API; **Shopee** and **Lazada** connectors are fully
> implemented (including request signing) and activate the moment you add their
> credentials.

---

## What it does

| Feature | Description |
| --- | --- |
| **Unified orders** | Every order from all 3 stores in one inbox, normalized to a common shape (status, customer, totals, line items). Filter by platform. |
| **Master inventory** | One stock figure per SKU. Edit it once and it's pushed to every channel so you never oversell. Low-stock alerts + per-platform drift view. |
| **Analytics** | Combined revenue, orders, AOV, units, 30-day stacked revenue chart by platform, best sellers, platform comparison. |
| **Unified catalog** | Each product shows its listing (and price) on every platform, and flags channels where it isn't listed yet. |
| **Connection health** | Settings page shows which platforms are connected and recent sync activity. |

## Architecture

Everything normalizes into **one** data model, so the UI/analytics never touch
raw platform payloads.

```
Shopify  ─┐
Shopee   ─┤→  PlatformAdapter  →  Sync engine  →  Unified DB  →  Dashboard
Lazada   ─┘   (per platform)      (orders/inv/      (Prisma)      (Next.js)
                                   products)
```

- **`src/lib/platforms/`** — one folder per marketplace. Each exposes a
  `client` (HTTP + auth/signing) and an `adapter` that implements the shared
  [`PlatformAdapter`](src/lib/platforms/types.ts) interface
  (`fetchOrders`, `fetchListings`, `fetchInventory`, `pushInventory`, …).
  Adding a 4th marketplace = one new folder + one line in
  [`registry.ts`](src/lib/platforms/registry.ts).
- **`src/lib/sync/`** — pulls data into the DB and pushes inventory out. Every
  run is recorded in `SyncLog`.
- **`prisma/schema.prisma`** — the unified model: `Product`, `Listing`,
  `InventoryItem`, `PlatformInventoryLevel`, `Order`, `OrderItem`, `SyncLog`.
- **`src/app/`** — Next.js App Router dashboard + `/api/sync` and `/api/health`.

### Tech stack
Next.js 14 (App Router) · TypeScript · Prisma + SQLite (swap `DATABASE_URL` for
Postgres in prod) · Tailwind CSS · Recharts.

---

## Quick start

```bash
npm install
cp .env.example .env        # fill in credentials when you have them
npm run db:push             # create the database
npm run db:seed             # OPTIONAL: load demo data so the UI is alive
npm run dev                 # http://localhost:3000
```

The app runs fine with **no credentials** — it just shows seeded demo data and
all three platforms as "Not connected". Connect them one at a time below.

---

## Connecting your stores

Add the relevant keys to `.env`. A platform "activates" automatically once its
required variables are present (see the **Settings** page for live status).

### Shopify (works today)
1. Shopify admin → **Settings → Apps and sales channels → Develop apps → Create
   an app**.
2. Configure Admin API scopes: `read_orders`, `read_products`, `write_products`,
   `read_inventory`, `write_inventory`.
3. Install the app, copy the **Admin API access token**.
4. Set `SHOPIFY_STORE_DOMAIN` (`your-store.myshopify.com`) and
   `SHOPIFY_ADMIN_ACCESS_TOKEN`.

### Shopee
1. Register at [Shopee Open Platform](https://open.shopee.com) → get
   `partner_id` + `partner_key`.
2. Authorize your shop to obtain `shop_id` + an `access_token`.
3. Set `SHOPEE_PARTNER_ID`, `SHOPEE_PARTNER_KEY`, `SHOPEE_SHOP_ID`,
   `SHOPEE_ACCESS_TOKEN`, `SHOPEE_REGION`.
   - Requests are signed with HMAC-SHA256 — handled for you in
     [`shopee/client.ts`](src/lib/platforms/shopee/client.ts).

### Lazada
1. Register at [Lazada Open Platform](https://open.lazada.com) → get **App Key**
   + **App Secret**.
2. Authorize your seller account to obtain an `access_token`.
3. Set `LAZADA_APP_KEY`, `LAZADA_APP_SECRET`, `LAZADA_ACCESS_TOKEN`,
   `LAZADA_REGION`.
   - The sorted-parameter signature is handled in
     [`lazada/client.ts`](src/lib/platforms/lazada/client.ts).

> **Note on OAuth tokens:** Shopee and Lazada access tokens are obtained via
> their OAuth authorization flow and expire periodically. This foundation reads
> a token from the environment; a token-refresh flow is the recommended next
> step (see Roadmap).

---

## Syncing

From the UI: use the **Sync** buttons on each page (Overview, Orders, Inventory,
Products).

From the CLI / cron:
```bash
npm run sync            # pull products, orders, inventory levels
npm run sync -- --push  # also push master stock out to every platform
```
Schedule it (e.g. every 15 min):
```cron
*/15 * * * * cd /path/to/app && npm run sync >> sync.log 2>&1
```

Or hit the API directly:
```bash
curl -X POST localhost:3000/api/sync -H 'content-type: application/json' \
  -d '{"scope":"orders"}'        # all | orders | products | inventory-pull | inventory-push
# set & fan-out master stock for one SKU:
curl -X POST localhost:3000/api/sync -H 'content-type: application/json' \
  -d '{"scope":"set-stock","sku":"TEA-MATCHA-100","available":40}'
```

---

## Scripts
| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run db:push` | Apply schema to the database |
| `npm run db:seed` | Load demo data |
| `npm run db:studio` | Browse the DB in Prisma Studio |
| `npm run sync` | Run a full sync (add `-- --push` to push stock) |

---

## Roadmap (next steps)
- OAuth token-refresh flow for Shopee/Lazada (store + auto-refresh tokens).
- Webhooks for real-time order/inventory events (vs. polling).
- Push **new product creation** to each platform (currently we sync existing
  listings; `pushInventory` is the write path that's live).
- Order fulfilment actions (print labels, mark shipped) from the unified inbox.
- Multi-currency normalization for true cross-platform revenue totals.
- Auth for the dashboard before deploying publicly.
