/* Sector Selector v2 — formsubmit capture + on-page thank-you / unlock. */
(function () {
  "use strict";

  var POST_URL = "https://formsubmit.co/ajax/dannyphee.cos@gmail.com";
  var SUBJECT = "Sector Selector monthly list";
  var UNLOCK_KEY = "sectorselector.v2.unlocked";

  function $(id) {
    return document.getElementById(id);
  }

  function validEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }

  function setMsg(el, kind, text) {
    if (!el) return;
    el.className = "wait-msg" + (kind ? " " + kind : "");
    el.textContent = text || "";
  }

  function revealTrade() {
    document.body.classList.add("unlocked");
    var locked = $("locked-dl");
    var unlocked = $("unlocked-dl");
    if (locked) locked.hidden = true;
    if (unlocked) unlocked.hidden = false;
    var hero = $("hero-form");
    var gate = $("gate-form");
    if (hero) hero.hidden = true;
    if (gate) gate.hidden = true;
    setMsg(
      $("hero-msg"),
      "ok",
      "Thank you. You’re on the monthly list. Healthcare (XLV) is #1 this week — paper structure below. Simulated. Not advice."
    );
    setMsg($("gate-msg"), "ok", "Unlocked. Simulated debit call spread — not a quote, not advice.");
  }

  function persistUnlock() {
    try {
      sessionStorage.setItem(UNLOCK_KEY, "1");
    } catch (e) {}
  }

  function alreadyUnlocked() {
    try {
      if (sessionStorage.getItem(UNLOCK_KEY) === "1") return true;
    } catch (e) {}
    var q = new URLSearchParams(window.location.search);
    return q.get("thanks") === "1";
  }

  function payload(email, source) {
    var body = new FormData();
    body.append("email", email);
    body.append("_subject", SUBJECT);
    body.append("_captcha", "false");
    body.append("_template", "table");
    body.append("source", source || "sectorselector.ai");
    return body;
  }

  function send(email, source) {
    return fetch(POST_URL, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: payload(email, source)
    }).then(function (res) {
      if (!res.ok) throw new Error("formsubmit " + res.status);
      return res.json().catch(function () {
        return { success: true };
      });
    });
  }

  function bind(form, input, msg) {
    if (!form || !input) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = (input.value || "").trim();
      var honey = form.querySelector(".honey");
      if (honey && honey.value) return;
      if (!validEmail(email)) {
        setMsg(msg, "err", "Need a real email.");
        input.focus();
        return;
      }
      var btn = form.querySelector("button[type='submit']");
      if (btn) btn.disabled = true;
      setMsg(msg, "", "Sending…");
      var source = (form.querySelector("input[name='source']") || {}).value || "sectorselector.ai";
      send(email, source)
        .then(function () {
          persistUnlock();
          revealTrade();
          if (window.location.hash !== "#trade") {
            var trade = $("trade");
            if (trade) trade.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        })
        .catch(function () {
          if (btn) btn.disabled = false;
          setMsg(msg, "err", "Could not reach the list host. Trying the backup post…");
          form.submit();
        });
    });
  }

  bind($("hero-form"), $("hero-email"), $("hero-msg"));
  bind($("gate-form"), $("gate-email"), $("gate-msg"));

  if (alreadyUnlocked()) {
    persistUnlock();
    revealTrade();
  }
})();
