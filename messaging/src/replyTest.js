/**
 * Offline tester for the auto-reply logic — no credentials, no network.
 *
 *   node src/replyTest.js                 # runs a sample suite
 *   node src/replyTest.js "your message"  # test one message
 */

const { getReply } = require("./autoReply");

const samples = process.argv[2]
  ? [process.argv[2]]
  : [
      "Hi there!",
      "how much is matcha?",
      "do you ship to penang and how long?",
      "where is my order #1234",
      "what is hojicha, is it caffeine free?",
      "how do I make a hojicha latte",
      "I run a cafe, do you do wholesale / bulk 1kg?",
      "can I pay with touch n go",
      "I want to talk to a human about a refund",
      "asdfghjkl random text",
    ];

for (const text of samples) {
  const { intent, reply, handoff } = getReply(text);
  console.log("──────────────────────────────────────────");
  console.log("IN : ", text);
  console.log("INTENT:", intent, handoff ? "(→ human handoff)" : "");
  console.log("OUT: ", reply);
}
console.log("──────────────────────────────────────────");
