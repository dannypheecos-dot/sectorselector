/* Sector Selector v2 — formsubmit capture + on-page thank-you / unlock. */
(function () {
  "use strict";

  var POST_URL = "https://formsubmit.co/ajax/2ae01d62a7a0f6637dfe47cc1c673d1c";
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

  function dataAttr(name, fallback) {
    var v = document.body && document.body.getAttribute(name);
    return v || fallback;
  }

  function siteRoot() {
    return dataAttr("data-root", "./");
  }

  function blotterPath() {
    return dataAttr("data-blotter", "blotter.json");
  }

  function homeThanksUrl() {
    return siteRoot() + "?thanks=1#trade";
  }

  var blotterTickets = null;
  var blotterData = null;

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
      "Your Sector Selector is unlocked. The full sector report is in your inbox. Simulated. Not advice."
    );
    setMsg(
      $("gate-msg"),
      "ok",
      "Unlocked. The full sector report is in your inbox. Simulated. Not advice."
    );
    if (blotterTickets) renderHomeBlotter(blotterTickets);
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

  function afterSubmit() {
    persistUnlock();
    var trade = $("trade");
    if (trade) {
      revealTrade();
      if (window.location.hash !== "#trade") {
        trade.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    window.location.href = homeThanksUrl();
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
          afterSubmit();
        })
        .catch(function () {
          if (btn) btn.disabled = false;
          setMsg(msg, "err", "Could not reach the list host. Trying the backup post…");
          form.submit();
        });
    });
  }

  function bindAllCaptures() {
    document.querySelectorAll("form.capture").forEach(function (form) {
      var email = form.querySelector("input[name='email']");
      var msgId = form.id ? form.id.replace(/-form$/, "-msg") : "";
      bind(form, email, msgId ? $(msgId) : null);
    });
  }

  function statusClass(status) {
    var s = String(status || "").toLowerCase();
    if (s === "open") return "status-open";
    if (s === "closed") return "status-closed";
    if (s === "no-ticket") return "status-skip";
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

  function isNoTicket(t) {
    var status = String(t.status || "").toLowerCase();
    return status === "no-ticket" || t.type === "no-ticket";
  }

  function debitDisplay(t) {
    if (isNoTicket(t)) return "—";
    if (t.debit == null || t.debit === "") {
      return t.debitLabel || "Monday open snapshot";
    }
    return String(t.debit);
  }

  function resultDisplay(t) {
    if (t.result == null || t.result === "") return "—";
    return String(t.result);
  }

  function addCell(tr, text, className) {
    var td = document.createElement("td");
    if (className) td.className = className;
    td.textContent = text;
    tr.appendChild(td);
    return td;
  }

  function addStatusCell(tr, status) {
    var td = document.createElement("td");
    var span = document.createElement("span");
    span.className = statusClass(status);
    span.textContent = String(status || "—").toUpperCase();
    td.appendChild(span);
    tr.appendChild(td);
  }

  function renderHomeBlotter(tickets) {
    var body = $("blotter-body");
    if (!body || !tickets || !tickets.length) return;
    blotterTickets = tickets;
    body.textContent = "";
    tickets.forEach(function (t) {
      var tr = document.createElement("tr");
      var ticker = isNoTicket(t) ? "—" : publicTicker(t);
      var structure = isNoTicket(t) ? (t.structure || "No ticket") : (t.structure || "—");
      addCell(tr, t.date || "—");
      var tickerTd = addCell(tr, ticker);
      if (!isUnlocked() && !isNoTicket(t)) {
        tickerTd.className = "redact blotter-ticker";
      }
      addCell(tr, structure);
      addStatusCell(tr, t.status);
      addCell(tr, resultDisplay(t));
      body.appendChild(tr);
    });
  }

  function renderTrackBlotter(tickets) {
    var body = $("track-blotter-body");
    if (!body) return;
    body.textContent = "";
    if (!tickets || !tickets.length) {
      var empty = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = 6;
      td.textContent = "No tickets published.";
      empty.appendChild(td);
      body.appendChild(empty);
      return;
    }
    tickets.forEach(function (t) {
      var tr = document.createElement("tr");
      var noTicket = isNoTicket(t);
      addCell(tr, t.date || "—");
      addCell(tr, noTicket ? "—" : (t.ticker || "—"));
      addCell(tr, noTicket ? (t.structure || "No ticket") : (t.structure || "—"));
      addStatusCell(tr, t.status);
      var debit = debitDisplay(t);
      addCell(tr, debit, debit === "Monday open snapshot" ? "debit-pending" : "");
      addCell(tr, resultDisplay(t));
      body.appendChild(tr);
    });
  }

  function renderRecordStats(data) {
    var tickets = (data && data.tickets) || [];
    var needed = data && data.closedNeededForWinRate != null ? Number(data.closedNeededForWinRate) : 20;
    var closed = 0;
    var open = 0;
    var skips = 0;
    tickets.forEach(function (t) {
      var s = String(t.status || "").toLowerCase();
      if (s === "closed") closed += 1;
      else if (s === "open") open += 1;
      else if (s === "no-ticket" || t.type === "no-ticket") skips += 1;
    });
    var closedEl = $("stat-closed");
    var openEl = $("stat-open");
    var rateEl = $("stat-rate");
    if (closedEl) closedEl.textContent = String(closed);
    if (openEl) openEl.textContent = String(open);
    if (rateEl) {
      if (closed < needed) {
        rateEl.textContent = "Not advertised — " + closed + " of " + needed + " closed paper tickets";
      } else {
        rateEl.textContent = "See closed rows. We do not invent a headline win rate.";
      }
    }
    var skipEl = $("stat-skips");
    if (skipEl) skipEl.textContent = String(skips);
    var asof = $("record-asof");
    if (asof && data && data.asOfLabel) asof.textContent = "As of " + data.asOfLabel + " · paper blotter";
    var disc = $("record-disclosure");
    if (disc && data && data.disclosure) disc.textContent = data.disclosure;
    var notes = $("record-notes");
    if (notes) {
      var lines = tickets
        .filter(function (t) { return t.notes; })
        .map(function (t) { return (t.date || "") + " · " + t.notes; });
      notes.textContent = lines.join(" ");
    }
  }

  function renderBlotter(tickets) {
    blotterTickets = tickets;
    renderHomeBlotter(tickets);
    renderTrackBlotter(tickets);
  }

  function loadBlotter() {
    var home = $("blotter-body");
    var track = $("track-blotter-body");
    if (!home && !track) return;
    fetch(blotterPath(), { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("blotter " + res.status);
        return res.json();
      })
      .then(function (data) {
        blotterData = data;
        if (data && data.tickets) renderBlotter(data.tickets);
        if (track) renderRecordStats(data || {});
      })
      .catch(function () {
        /* static row in HTML is the fallback; ticker stays redacted until unlock */
        if (track) {
          renderTrackBlotter([
            {
              date: "2026-08-30",
              ticker: "XLV",
              structure: "Debit call spread, 30–60 DTE",
              status: "open",
              debit: null,
              result: null,
              notes: "Monday open snapshot for strikes. We do not invent premiums."
            }
          ]);
          renderRecordStats({
            asOfLabel: "30 Aug 2026",
            disclosure: "SIMULATED RESULTS NOT LIVE MONEY. No advertised win rate until 20 closed paper tickets.",
            closedNeededForWinRate: 20,
            tickets: [{ status: "open", notes: "Monday open snapshot for strikes. We do not invent premiums." }]
          });
        }
      });
  }

  function bindFullSetup() {
    var btn = $("view-full-setup");
    var panel = $("full-setup");
    if (!btn || !panel) return;
    btn.addEventListener("click", function () {
      var open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? "HIDE FULL SETUP ↑" : "VIEW FULL SETUP →";
    });
  }

  bindAllCaptures();
  bindFullSetup();
  loadBlotter();

  if ($("trade") && alreadyUnlocked()) {
    persistUnlock();
    revealTrade();
  }
})();
