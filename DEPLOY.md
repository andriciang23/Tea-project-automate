# Deploying the bot (always-on)

The bot needs to be **running 24/7** and reachable at a **public HTTPS URL** (Meta's
webhook requires HTTPS). Two recommended paths below — pick one.

Before you start, have these values ready (see [`.env.example`](./.env.example)):
`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`,
`WHATSAPP_APP_SECRET`, `ALLOWED_SENDERS`, `ANTHROPIC_API_KEY`,
`SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_TOKEN`.

---

## Option A — Fly.io (recommended, easiest)

Fly gives you a free `https://<app>.fly.dev` URL (no domain needed), a Singapore
region close to Malaysia, and a persistent volume for `data/store.json`.

### 1. Install the CLI and sign in
```bash
# macOS/Linux:
curl -L https://fly.io/install.sh | sh
fly auth signup   # or: fly auth login
```

### 2. Create the app (don't deploy yet)
From the project folder (it already contains `Dockerfile` and `fly.toml`):
```bash
fly launch --no-deploy
```
- When asked, **keep the existing `fly.toml`**.
- Pick a unique app name (update the `app = ...` line in `fly.toml` to match).
- Region: choose **Singapore (sin)**.

### 3. Create the persistent volume (keeps history/regulars across restarts)
```bash
fly volumes create tea_data --region sin --size 1   # 1 GB is plenty
```
(The name `tea_data` must match `[mounts].source` in `fly.toml`.)

### 4. Set your secrets (these are NOT in the repo)
```bash
fly secrets set \
  WHATSAPP_TOKEN="..." \
  WHATSAPP_PHONE_NUMBER_ID="..." \
  WHATSAPP_VERIFY_TOKEN="..." \
  WHATSAPP_APP_SECRET="..." \
  ALLOWED_SENDERS="60123456789" \
  ANTHROPIC_API_KEY="..." \
  SHOPIFY_STORE_DOMAIN="your-shop.myshopify.com" \
  SHOPIFY_ADMIN_TOKEN="..."
```

### 5. Deploy
```bash
fly deploy
```
Your URL is `https://<app>.fly.dev`. Check it's alive:
```bash
curl https://<app>.fly.dev/health     # should print: ok
```

### 6. Point Meta at it
In the Meta dashboard → WhatsApp → Configuration → Webhook:
- Callback URL: `https://<app>.fly.dev/webhook`
- Verify token: the same value as `WHATSAPP_VERIFY_TOKEN`
- Subscribe to the **messages** field.

Done. Message your WhatsApp business number to test.

> Roughly ~US$5/month for an always-on machine + tiny volume. `fly logs` shows live
> logs; set `DEBUG_TOKENS=1` as a secret to see token/cache usage per call.

---

## Option B — Singapore VPS (Docker + Caddy)

Use this if you prefer your own server (Vultr / DigitalOcean / Linode, Singapore
region). You'll need a **domain** pointed at the server for HTTPS. Caddy gets a
free TLS certificate automatically.

### 1. Provision
Create a small VPS (1 GB RAM is enough), Ubuntu 22.04+, in **Singapore**. Point a
domain's `A` record (e.g. `bot.yourshop.com`) at the server's IP.

### 2. Install Docker
```bash
curl -fsSL https://get.docker.com | sh
```

### 3. Get the code and build the image
```bash
git clone <your repo> tea-bot && cd tea-bot
docker build -t tea-bot .
```

### 4. Create an env file
```bash
cp .env.example .env
nano .env          # fill in every value (ALLOWED_SENDERS = your number, etc.)
```

### 5. Run the bot (persistent data volume, restarts on reboot)
```bash
docker run -d --name tea-bot --restart unless-stopped \
  --env-file .env \
  -v "$PWD/data:/app/data" \
  -p 127.0.0.1:3000:3000 \
  tea-bot
```
(Bound to localhost; Caddy will expose it over HTTPS next.)

### 6. Put Caddy in front for HTTPS
```bash
sudo apt install -y caddy
```
Replace `/etc/caddy/Caddyfile` with:
```
bot.yourshop.com {
    reverse_proxy 127.0.0.1:3000
}
```
Then:
```bash
sudo systemctl restart caddy
curl https://bot.yourshop.com/health   # should print: ok
```

### 7. Point Meta at it
Callback URL: `https://bot.yourshop.com/webhook` (verify token = `WHATSAPP_VERIFY_TOKEN`,
subscribe to **messages**).

### Updating later
```bash
git pull && docker build -t tea-bot . \
  && docker rm -f tea-bot \
  && docker run -d --name tea-bot --restart unless-stopped \
       --env-file .env -v "$PWD/data:/app/data" -p 127.0.0.1:3000:3000 tea-bot
```

---

## Self-hosting at home (cheapest, more upkeep)

A Raspberry Pi (or any always-on PC) + **Cloudflare Tunnel** gives a public HTTPS
URL without a static IP or port-forwarding (which is unreliable on most Malaysian
home lines). Run the bot exactly as in Option B steps 2–5, then instead of Caddy:

```bash
# Install cloudflared, then:
cloudflared tunnel login
cloudflared tunnel --url http://localhost:3000
```
Cloudflare prints an `https://...trycloudflare.com` URL — use `/webhook` on it for
Meta. For a stable URL, create a named tunnel and map it to a domain in your
Cloudflare dashboard. Trade-off: if home power or internet drops, the bot is down.

---

## Cost-saving knob

The bot defaults to `claude-opus-4-8`. For order-taking you can switch to a cheaper
model with no code change — set `ANTHROPIC_MODEL=claude-sonnet-4-6` (or
`claude-haiku-4-5`) as a secret/env var. Prompt caching is already enabled, so the
repeated instructions/tool list within an order are billed at a fraction after the
first call.
