#!/usr/bin/env node
/**
 * apply-seo.js — push the optimized SEO content in ../optimized-content/products.json
 * to the live Shopify store via the Admin GraphQL API.
 *
 * Sets, per product: SEO title, SEO meta description, and featured-image alt text.
 * It does NOT change product titles, prices, or body HTML.
 *
 * Usage:
 *   SHOPIFY_STORE_DOMAIN=hojichaya.com SHOPIFY_ADMIN_TOKEN=shpat_xxx \
 *     node apply-seo.js            # dry run: prints what it WOULD change
 *   ... node apply-seo.js --apply  # actually writes the changes
 *
 * Requires Node 18+ (built-in fetch). No npm install needed.
 */

const fs = require("fs");
const path = require("path");

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = "2024-10";
const APPLY = process.argv.includes("--apply");

if (!DOMAIN || !TOKEN) {
  console.error("Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_TOKEN env vars.");
  process.exit(1);
}

const dataPath = path.join(__dirname, "..", "optimized-content", "products.json");
const { products } = JSON.parse(fs.readFileSync(dataPath, "utf8"));

const endpoint = `https://${DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

async function gql(query, variables) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

const UPDATE = `
  mutation UpdateSEO($input: ProductInput!) {
    productUpdate(input: $input) {
      product { id }
      userErrors { field message }
    }
  }`;

const UPDATE_ALT = `
  mutation UpdateAlt($id: ID!, $alt: String!) {
    productImageUpdate(image: { id: $id, altText: $alt }) {
      image { id altText }
      userErrors { field message }
    }
  }`;

const GET_IMAGE = `
  query($id: ID!) {
    product(id: $id) { featuredImage { id } }
  }`;

async function run() {
  console.log(`${APPLY ? "APPLYING" : "DRY RUN"} — ${products.length} products\n`);
  for (const p of products) {
    console.log(`• ${p.handle}`);
    console.log(`    seo_title: ${p.seo_title}`);
    console.log(`    meta_desc: ${p.meta_description}`);
    console.log(`    image_alt: ${p.image_alt}`);
    if (!APPLY) {
      console.log("");
      continue;
    }
    const input = {
      id: p.product_id,
      seo: { title: p.seo_title, description: p.meta_description },
    };
    const r = await gql(UPDATE, { input });
    const errs = r.productUpdate.userErrors;
    if (errs.length) console.error("    ⚠ SEO errors:", errs);
    else console.log("    ✓ SEO updated");

    if (p.image_alt) {
      const img = await gql(GET_IMAGE, { id: p.product_id });
      const imgId = img.product?.featuredImage?.id;
      if (imgId) {
        const ar = await gql(UPDATE_ALT, { id: imgId, alt: p.image_alt });
        const aerrs = ar.productImageUpdate.userErrors;
        if (aerrs.length) console.error("    ⚠ alt errors:", aerrs);
        else console.log("    ✓ alt text updated");
      }
    }
    console.log("");
  }
  console.log(APPLY ? "Done." : "Dry run complete. Re-run with --apply to write.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
