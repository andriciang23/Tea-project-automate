/**
 * Chat with the agent locally — no WhatsApp/Meta required.
 *
 * One-shot:   npx tsx scripts/test-agent.ts "how much is the oolong?"
 * Interactive: npx tsx scripts/test-agent.ts        (then type messages, Ctrl+C to exit)
 *
 * Talks to the REAL Shopify store and the REAL Anthropic API using your .env,
 * so use a Shopify dev store when testing create_draft_order.
 */
import readline from "node:readline";
import { handleMessage } from "../src/agent.js";

const CHAT_ID = "local-test";

async function main() {
  const oneShot = process.argv.slice(2).join(" ").trim();

  if (oneShot) {
    const reply = await handleMessage(CHAT_ID, oneShot);
    console.log(`\n🫖  ${reply}\n`);
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("Chat with your shop assistant (Ctrl+C to exit).\n");
  const ask = () =>
    rl.question("you > ", async (line) => {
      const text = line.trim();
      if (!text) return ask();
      try {
        const reply = await handleMessage(CHAT_ID, text);
        console.log(`\n🫖  ${reply}\n`);
      } catch (err) {
        console.error("Error:", err instanceof Error ? err.message : err);
      }
      ask();
    });
  ask();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
