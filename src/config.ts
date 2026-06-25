import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  WHATSAPP_TOKEN: z.string().min(1, "WHATSAPP_TOKEN is required"),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1, "WHATSAPP_PHONE_NUMBER_ID is required"),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1, "WHATSAPP_VERIFY_TOKEN is required"),
  WHATSAPP_APP_SECRET: z.string().min(1, "WHATSAPP_APP_SECRET is required"),
  // Comma-separated E.164 numbers (no "+"). Whitespace tolerated.
  ALLOWED_SENDERS: z
    .string()
    .min(1, "ALLOWED_SENDERS is required (your own WhatsApp number)")
    .transform((v) =>
      v
        .split(",")
        .map((s) => s.trim().replace(/^\+/, ""))
        .filter(Boolean),
    ),
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  ANTHROPIC_MODEL: z.string().default("claude-opus-4-8"),
  SHOPIFY_STORE_DOMAIN: z.string().min(1, "SHOPIFY_STORE_DOMAIN is required"),
  SHOPIFY_ADMIN_TOKEN: z.string().min(1, "SHOPIFY_ADMIN_TOKEN is required"),
  SHOPIFY_API_VERSION: z.string().default("2025-01"),
  PORT: z.coerce.number().default(3000),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  console.error(
    `\nConfiguration error. Check your .env file (see .env.example):\n${issues}\n`,
  );
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
