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

  function validPhone(s) {
    return String(s || "").replace(/\D/g, "").length >= 7;
  }

  function setMsg(el, kind, text) {
    if (!el) return;
    el.className = "wait-msg" + (kind ? " " + kind : "");
    el.textContent = text || "";
  }

  var blotterTickets = null;

  function isUnlocked() {
    return document.body.classList.contains("unlocked");
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
      "Thank you. You’re on the monthly list. This also just emailed you the card — entry, exit, invalidation. Healthcare (XLV) is below. Simulated. Not advice."
    );
    setMsg(
      $("gate-msg"),
      "ok",
      "Unlocked. This also just emailed you. Simulated debit call spread — not a quote, not advice."
    );
    if (blotterTickets) renderBlotter(blotterTickets);
    else unlockStaticBlotter();
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

  function payload(form, email, phone, source) {
    var body = new FormData();
    body.append("email", email);
    body.append("phone", phone);
    body.append("_subject", SUBJECT);
    body.append("_captcha", "false");
    body.append("_template", "table");
    body.append("source", source || "sectorselector.ai");
    var auto = form && form.querySelector("input[name='_autoresponse']");
    if (auto && auto.value) body.append("_autoresponse", auto.value);
    return body;
  }

  function send(form, email, phone, source) {
    return fetch(POST_URL, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: payload(form, email, phone, source)
    }).then(function (res) {
      if (!res.ok) throw new Error("formsubmit " + res.status);
      return res.json().catch(function () {
        return { success: true };
      });
    });
  }

  function bind(form, emailInput, msg) {
    if (!form || !emailInput) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = (emailInput.value || "").trim();
      var phoneInput = form.querySelector("input[name='phone']");
      var phone = phoneInput ? (phoneInput.value || "").trim() : "";
      var honey = form.querySelector(".honey");
      if (honey && honey.value) return;
      if (!validEmail(email)) {
        setMsg(msg, "err", "Need a real email.");
        emailInput.focus();
        return;
      }
      if (!validPhone(phone)) {
        setMsg(msg, "err", "Need a real mobile number.");
        if (phoneInput) phoneInput.focus();
        return;
      }
      var btn = form.querySelector("button[type='submit']");
      if (btn) btn.disabled = true;
      setMsg(msg, "", "Sending…");
      var source = (form.querySelector("input[name='source']") || {}).value || "sectorselector.ai";
      send(form, email, phone, source)
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

  function statusClass(status) {
    var s = String(status || "").toLowerCase();
    if (s === "open") return "status-open";
    if (s === "closed") return "status-closed";
    return "";
  }

  function publicTicker(ticket) {
    if (isUnlocked()) return ticket.ticker || "—";
    return "████";
  }

  function unlockStaticBlotter() {
    var cells = document.querySelectorAll("#blotter-body .blotter-ticker");
    cells.forEach(function (td) {
      td.textContent = "XLV";
      td.classList.remove("redact");
    });
  }

  function renderBlotter(tickets) {
    var body = $("blotter-body");
    if (!body || !tickets || !tickets.length) return;
    blotterTickets = tickets;
    body.textContent = "";
    tickets.forEach(function (t) {
      var tr = document.createElement("tr");
      var status = String(t.status || "").toUpperCase();
      var result = t.result == null || t.result === "" ? "—" : String(t.result);
      var ticker = publicTicker(t);
      var cells = [
        t.date || "—",
        ticker,
        t.structure || "—",
        status || "—",
        result
      ];
      cells.forEach(function (val, i) {
        var td = document.createElement("td");
        if (i === 1 && !isUnlocked()) {
          td.className = "redact blotter-ticker";
        }
        if (i === 3) {
          var span = document.createElement("span");
          span.className = statusClass(t.status);
          span.textContent = val;
          td.appendChild(span);
        } else {
          td.textContent = val;
        }
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
  }

  function loadBlotter() {
    fetch("blotter.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("blotter " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data && data.tickets) renderBlotter(data.tickets);
      })
      .catch(function () {
        /* static row in HTML is the fallback; ticker stays redacted until unlock */
      });
  }

  bind($("hero-form"), $("hero-email"), $("hero-msg"));
  bind($("gate-form"), $("gate-email"), $("gate-msg"));
  loadBlotter();

  if (alreadyUnlocked()) {
    persistUnlock();
    revealTrade();
  }
})();
