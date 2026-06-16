/**
 * HojichaYa chat widget — embeddable, dependency-free.
 *
 * Configure the backend URL before this script loads, e.g.:
 *   <script>window.HOJICHAYA_CHAT = { backendUrl: "https://your-bot.example.com" };</script>
 *   <script src="https://your-bot.example.com/widget.js" defer></script>
 *
 * Or set data-backend on the script tag:
 *   <script src=".../widget.js" data-backend="https://your-bot.example.com" defer></script>
 */
(function () {
  "use strict";

  var cfg = window.HOJICHAYA_CHAT || {};
  var current = document.currentScript;
  var backend =
    cfg.backendUrl ||
    (current && current.getAttribute("data-backend")) ||
    (current && new URL(current.src).origin) ||
    "";
  backend = backend.replace(/\/$/, "");

  var GREETING =
    cfg.greeting ||
    "Hi! 🍵 I'm the HojichaYa assistant. Ask me about our teas, shipping, brewing, or wholesale.";

  var history = []; // [{role, content}]
  var sending = false;

  // --- Build DOM ---
  var root = document.createElement("div");
  root.id = "hy-chat";
  root.innerHTML =
    '<button class="hy-bubble" aria-label="Open chat">🍵</button>' +
    '<div class="hy-panel" role="dialog" aria-label="HojichaYa chat" hidden>' +
    '  <div class="hy-header"><span>HojichaYa</span><button class="hy-close" aria-label="Close">×</button></div>' +
    '  <div class="hy-log" aria-live="polite"></div>' +
    '  <form class="hy-form">' +
    '    <input class="hy-input" type="text" autocomplete="off" placeholder="Type a message…" maxlength="800" />' +
    '    <button class="hy-send" type="submit" aria-label="Send">Send</button>' +
    "  </form>" +
    '  <div class="hy-foot">Powered by HojichaYa</div>' +
    "</div>";
  document.body.appendChild(root);

  var bubble = root.querySelector(".hy-bubble");
  var panel = root.querySelector(".hy-panel");
  var log = root.querySelector(".hy-log");
  var form = root.querySelector(".hy-form");
  var input = root.querySelector(".hy-input");
  var closeBtn = root.querySelector(".hy-close");
  var opened = false;

  function addMsg(text, who) {
    var el = document.createElement("div");
    el.className = "hy-msg hy-" + who;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function open() {
    panel.hidden = false;
    bubble.style.display = "none";
    input.focus();
    if (!opened) {
      opened = true;
      addMsg(GREETING, "bot");
    }
  }
  function close() {
    panel.hidden = true;
    bubble.style.display = "";
  }

  bubble.addEventListener("click", open);
  closeBtn.addEventListener("click", close);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || sending) return;
    input.value = "";
    addMsg(text, "user");
    history.push({ role: "user", content: text });

    sending = true;
    var typing = addMsg("…", "bot typing");

    fetch(backend + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history: history.slice(0, -1) }),
    })
      .then(function (r) {
        return r.json().catch(function () {
          return { reply: "Sorry, something went wrong. Please try again." };
        });
      })
      .then(function (data) {
        typing.remove();
        var reply = (data && data.reply) || "Sorry, something went wrong. Please try again.";
        addMsg(reply, "bot");
        history.push({ role: "assistant", content: reply });
        if (data && data.handoff) {
          addMsg("A team member will follow up if needed. 🙏", "bot note");
        }
      })
      .catch(function () {
        typing.remove();
        addMsg("Sorry, I couldn't reach the server. Please try again in a moment.", "bot");
      })
      .finally(function () {
        sending = false;
      });
  });
})();
