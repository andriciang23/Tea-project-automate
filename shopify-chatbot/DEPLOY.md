# Deploy the chatbot to Render (24/7, no computer needed)

This gets your chatbot running in the cloud so it works around the clock, independent of
your laptop. **Render** is the simplest host with a free tier. ~15 minutes.

The repo already includes a [`render.yaml`](../render.yaml) blueprint, so most settings are
pre-filled.

---

## Step 1 — Create a Render account

1. Go to <https://render.com> → **Get Started** → sign up (signing up with your **GitHub**
   account is easiest, since the code lives there).

## Step 2 — Create the service from the blueprint

1. In the Render dashboard: **New +** → **Blueprint**.
2. Connect your GitHub and pick the **`Tea-project-automate`** repo.
3. When asked for the branch, choose **`claude/ads-seo-social-automation-xjg3c4`**
   (or `main` once this is merged).
4. Render reads `render.yaml` and shows a service named **`hojichaya-chatbot`**. Click
   **Apply** / **Create**.

> Prefer to do it manually instead of the blueprint? **New + → Web Service** → pick the repo
> → set **Root Directory** = `shopify-chatbot`, **Build Command** = `npm install`,
> **Start Command** = `npm start`, **Health Check Path** = `/health`, plan **Free**.

## Step 3 — First deploy (free keyword mode)

Render installs and starts it automatically. After a minute you'll get a public URL like:

```
https://hojichaya-chatbot.onrender.com
```

Test it:

- Open `https://hojichaya-chatbot.onrender.com/health` → should show
  `{"ok":true,"mode":"keyword"}`.
- Open `https://hojichaya-chatbot.onrender.com/demo.html` → click the tea bubble and chat.

🎉 It's now running 24/7 in free keyword mode — **$0, no API account, your computer off.**

## Step 4 — (Optional) Turn on smart LLM answers

1. Create an Anthropic API account at <https://console.anthropic.com> (separate from
   Claude.ai). Add a little credit (e.g. $5) under **Billing**.
2. **Set a spend limit** under Billing → Limits so it can never exceed what you want.
3. Create an API key (**API Keys → Create Key**), copy it.
4. In Render: your service → **Environment** tab → **Add Environment Variable**:
   - Key: `ANTHROPIC_API_KEY`  ·  Value: your `sk-ant-...` key
   - (Optional) `CHATBOT_MODEL` is already `claude-haiku-4-5` (cheap/fast). Set it to
     `claude-opus-4-8` for the smartest answers at higher cost.
5. Save → Render redeploys. `/health` should now show `mode":"llm:claude-haiku-4-5"`.

If the key is ever missing or a call fails, the bot automatically falls back to free
keyword answers — customers are never left without a reply.

## Step 5 — Embed it in your Shopify store

Follow [`README.md` → "Deploy + embed in Shopify"](./README.md#deploy--embed-in-shopify):
paste `theme/hojichaya-chat.liquid` as a snippet, set `backend_url` to your Render URL, and
add `{% render 'hojichaya-chat' %}` before `</body>` in `theme.liquid`.

---

## Important: free-tier cold starts

Render's **free** plan spins the service down after ~15 minutes of inactivity. The next
visitor then waits ~30–60s for it to wake up (their first message is slow; after that it's
instant). Three ways to handle it:

1. **Upgrade to the Starter plan (~$7/month)** in the service settings → no spin-down,
   always instant. Recommended once the bot is live for customers.
2. **Keep it warm for free:** add a free uptime monitor (e.g. UptimeRobot) that pings
   `https://your-url.onrender.com/health` every 10 minutes.
3. **Leave it** if occasional slow first-responses are acceptable while testing.

## Updating later

Because `autoDeploy` is on, any push to the branch (including changes I make to the FAQ or
catalog) redeploys automatically — nothing for you to do.

## Same steps for the WhatsApp/Instagram bot

The `messaging/` service deploys the same way (Root Directory = `messaging`). Its extra
setup — getting a public webhook URL and Meta tokens — is in
[`../docs/SETUP.md`](../docs/SETUP.md) and [`../messaging/README.md`](../messaging/README.md).
