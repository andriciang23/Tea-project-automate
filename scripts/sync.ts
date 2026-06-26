// CLI entry point for scheduled syncs (e.g. a cron job every 15 min):
//   npm run sync            → full pull (products, orders, inventory levels)
//   npm run sync -- --push  → also push master stock out to every platform
import { runFullSync } from "../src/lib/sync";

async function main() {
  const push = process.argv.includes("--push");
  console.log(`Running full sync${push ? " (with inventory push)" : ""}…`);
  const { results } = await runFullSync({ pushInventory: push });
  for (const r of results) {
    const tag = r.status === "success" ? "✓" : "✗";
    console.log(
      `${tag} [${r.platform}] ${r.type}/${r.direction}: ${r.message ?? r.status}`,
    );
  }
  const failed = results.filter((r) => r.status === "error").length;
  process.exit(failed > 0 ? 1 : 0);
}

main();
