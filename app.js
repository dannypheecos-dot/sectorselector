/* Sector Selector — Kit capture + unlock + chrome.
 *
 * Architecture (not built):
 * - Real-time scoring: snapshots stay dated JSON. Never overwrite a prior YYYY-MM-DD.
 * - Names-in-sector: see /coming-soon/. Not a live stock list.
 * - 0DTE: market-structure input only. Never a control claim.
 * - Rotation Score 0–100: field reserved (COMING SOON). Do not invent values.
 *   Do not treat 13-week RS as a validated 30–60 day forecast.
 * - 80+ is a V1 Sector Score threshold, not an 80% win rate and not 80% PoP.
 * - No member portal paywall. No $997 webinar product. Billing is not enabled.
 */
(function () {
  "use strict";

  var UNLOCK_KEY = "sectorselector.v2.unlocked";
  var PRO_PRICE_MONTHLY = 97; /* configurable; do not enable billing */

  function $(id) {
    return document.getElementById(id);
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

  function blotterPath() {
    return dataAttr("data-blotter", "blotter.json");
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
      "Your Sector Selector is unlocked. The full sector report is in your inbox. Simulated research. Not advice."
    );
    setMsg(
      $("gate-msg"),
      "ok",
      "Unlocked. The full sector report is in your inbox. Simulated research. Not advice."
    );
    if (blotterTickets) renderHomeBlotter(blotterTickets);
    else unlockStaticBlotter();
    syncStickyCta();
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

  function bindHoneypot(form) {
    if (!form) return;
    form.addEventListener("submit", function (e) {
      var honey = form.querySelector(".honey");
      if (honey && honey.value) e.preventDefault();
    });
  }

  function bindAllCaptures() {
    document.querySelectorAll("form.capture").forEach(bindHoneypot);
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

  function moneyDebit(value) {
    var n = typeof value === "number" ? value : Number(value);
    if (isNaN(n)) return String(value);
    return "$" + n.toFixed(2);
  }

  function entryDisplay(t) {
    if (isNoTicket(t)) return "—";
    if (t.debit == null || t.debit === "") {
      return t.debitLabel || "ORDER DETAILS PUBLISH MONDAY AFTER OPEN";
    }
    return moneyDebit(t.debit);
  }

  function expirationDisplay(t) {
    if (isNoTicket(t)) return "—";
    return t.expiration || t.expirationLabel || "—";
  }

  function strikeDisplay(t, key) {
    if (isNoTicket(t)) return "—";
    var v = t[key];
    if (v == null || v === "") return "—";
    return String(v);
  }

  function exitDisplay(t) {
    if (t.exit == null || t.exit === "") return "—";
    return String(t.exit);
  }

  function resultDisplay(t) {
    if (String(t.status || "").toLowerCase() === "open") return "—";
    if (t.result == null || t.result === "") return "—";
    return String(t.result);
  }

  function isDebitPending(t) {
    return !isNoTicket(t) && (t.debit == null || t.debit === "");
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

  function addResultCell(tr, text) {
    var td = document.createElement("td");
    var label = document.createElement("span");
    label.className = "sim-mini";
    label.textContent = "SIMULATED";
    td.appendChild(label);
    td.appendChild(document.createTextNode(" " + text));
    tr.appendChild(td);
  }

  function fillBlotterRow(tr, t, opts) {
    var redactTicker = opts && opts.redactTicker;
    var ticker = isNoTicket(t) ? "—" : (redactTicker ? publicTicker(t) : (t.ticker || "—"));
    var structure = isNoTicket(t) ? (t.structure || "No ticket") : (t.structure || "—");
    addCell(tr, t.date || "—", "mono");
    var tickerTd = addCell(tr, ticker, "mono");
    if (redactTicker && !isUnlocked() && !isNoTicket(t)) {
      tickerTd.className = "redact blotter-ticker mono";
    }
    addCell(tr, structure);
    addCell(tr, expirationDisplay(t), "mono");
    addCell(tr, strikeDisplay(t, "longStrike"), "mono");
    addCell(tr, strikeDisplay(t, "shortStrike"), "mono");
    addCell(tr, entryDisplay(t), isDebitPending(t) ? "debit-pending" : "mono");
    addStatusCell(tr, t.status);
    addCell(tr, exitDisplay(t));
    addResultCell(tr, resultDisplay(t));
  }

  function renderHomeBlotter(tickets) {
    var body = $("blotter-body");
    if (!body || !tickets || !tickets.length) return;
    blotterTickets = tickets;
    body.textContent = "";
    tickets.forEach(function (t) {
      var tr = document.createElement("tr");
      fillBlotterRow(tr, t, { redactTicker: true });
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
      td.colSpan = 10;
      td.textContent = "No tickets published.";
      empty.appendChild(td);
      body.appendChild(empty);
      return;
    }
    tickets.forEach(function (t) {
      var tr = document.createElement("tr");
      fillBlotterRow(tr, t, { redactTicker: false });
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
        if (track) {
          renderTrackBlotter([
            {
              date: "2026-08-30",
              ticker: "XLV",
              structure: "Debit call spread, 30–60 DTE",
              expiration: "Oct 16, 2026",
              longStrike: 170,
              shortStrike: 175,
              status: "open",
              debit: 2.43,
              debitMid: 2.26,
              debitLabel: "$2.43 or better",
              result: null,
              notes: "SIMULATED RESEARCH. OPEN — watching; not a simulated fill. Limit $2.43 or better; do not chase above 2.43. Invalidation: drops out of top 3 on 13w RS vs SPY."
            }
          ]);
          renderRecordStats({
            asOfLabel: "31 Aug 2026",
            disclosure: "SIMULATED RESULTS NOT LIVE MONEY. No advertised win rate until 20 closed paper tickets.",
            closedNeededForWinRate: 20,
            tickets: [{ status: "open", notes: "SIMULATED RESEARCH. OPEN — watching; not a simulated fill. Limit $2.43 or better; do not chase above 2.43. Invalidation: drops out of top 3 on 13w RS vs SPY." }]
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
      btn.textContent = open ? "HIDE FULL RESEARCH ↑" : "VIEW THE FULL RESEARCH →";
    });
  }

  function bindNav() {
    var btn = $("nav-toggle");
    var nav = $("site-nav");
    if (!btn || !nav) return;
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      document.body.classList.toggle("nav-open", !open);
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        btn.setAttribute("aria-expanded", "false");
        document.body.classList.remove("nav-open");
      });
    });
  }

  function bindBoard() {
    document.querySelectorAll(".board-row").forEach(function (row) {
      row.addEventListener("click", function () {
        row.classList.toggle("is-open");
      });
      row.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          row.classList.toggle("is-open");
        }
      });
    });
  }

  function rootPrefix() {
    return dataAttr("data-root", "");
  }

  function syncStickyCta() {
    var btn = $("sticky-cta-btn");
    if (!btn) return;
    document.body.classList.add("has-sticky");
    if (isUnlocked()) {
      btn.textContent = "VIEW MY SECTOR REPORT →";
      btn.setAttribute("href", "#trade");
    } else {
      btn.textContent = "UNLOCK THIS MONTH'S #1 SETUP →";
      btn.setAttribute("href", "#capture");
    }
  }

  function bindRankingsRanges() {
    var note = $("rankings-range-note");
    var buttons = document.querySelectorAll("[data-range]");
    if (!buttons.length) return;
    var prefix = rootPrefix();
    fetch(prefix + "data/rankings/index.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("rankings index " + res.status);
        return res.json();
      })
      .then(function (index) {
        var ranges = (index && index.ranges) || {};
        buttons.forEach(function (btn) {
          var key = btn.getAttribute("data-range");
          var spec = ranges[key] || {};
          if (spec.ready === false) {
            btn.disabled = true;
            btn.setAttribute("aria-disabled", "true");
            btn.title = spec.reason || "History not published yet.";
          }
          btn.addEventListener("click", function () {
            buttons.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
            btn.setAttribute("aria-pressed", "true");
            if (spec.ready === false && note) {
              note.textContent = spec.reason || "History not published yet. Improving / Stable / Deteriorating needs two stored dates.";
            } else if (note) {
              note.textContent = "Current snapshot · " + (index.currentLabel || "As of Friday 28 Aug 2026 close") + ". First stored day — CHANGE is —.";
            }
          });
        });
        if (note && (!index.dates || index.dates.length < 2)) {
          note.textContent = "First snapshot. Improving / Stable / Deteriorating will appear when a second date is stored.";
        }
      })
      .catch(function () {
        if (note) {
          note.textContent = "Showing the published Friday 28 Aug 2026 close board. History files are not loaded.";
        }
      });
  }

  function bindProCheckout() {
    document.querySelectorAll("[data-pro-price]").forEach(function (el) {
      el.textContent = String(PRO_PRICE_MONTHLY);
    });
    var form = $("pro-checkout");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      setMsg(
        $("pro-checkout-msg"),
        "ok",
        "Prototype only. Billing is not enabled. No payment was taken."
      );
    });
    var cancel = $("pro-cancel");
    if (cancel) {
      cancel.addEventListener("click", function (e) {
        e.preventDefault();
        setMsg(
          $("pro-checkout-msg"),
          "ok",
          "Cancellation is not live. This prototype cannot charge or cancel anything."
        );
      });
    }
  }

  function awaitingText(value, fallback) {
    if (value == null || value === "") return fallback || "awaiting verified data";
    return String(value);
  }

  function moneyOrAwaiting(value) {
    if (value == null || value === "") return "awaiting verified data";
    var n = typeof value === "number" ? value : Number(value);
    if (isNaN(n)) return String(value);
    return "$" + n.toFixed(2);
  }

  function renderEightyHistory(data) {
    var body = $("eighty-history-body");
    if (!body || !data || !data.entries) return;
    body.textContent = "";
    data.entries.forEach(function (row) {
      var tr = document.createElement("tr");
      addCell(tr, row.label || (row.kind === "demo" ? "DEMO / SAMPLE — NOT A LIVE SIGNAL" : "—"));
      addCell(tr, row.asOfLabel || row.asOf || "—", "mono");
      addCell(tr, row.sector || "—");
      addCell(tr, row.score != null ? String(row.score) : "—", "mono");
      addCell(tr, row.rotationScore != null ? String(row.rotationScore) : "COMING SOON", "mono");
      addCell(tr, row.direction || "—");
      addCell(tr, row.live ? "LIVE" : "NOT A LIVE SIGNAL");
      body.appendChild(tr);
    });
  }

  function fillEightyCard(data) {
    var entry = data && data.entries && data.entries[0];
    if (!entry) return;
    function set(id, text) {
      var el = $(id);
      if (el) el.textContent = text;
    }
    set("ep-sector", awaitingText(entry.sector));
    set("ep-ticker", awaitingText(entry.ticker));
    set("ep-score", entry.score != null ? String(entry.score) : "awaiting verified data");
    set("ep-rotation", "COMING SOON");
    set("ep-direction", awaitingText(entry.direction));
    set("ep-underlying", awaitingText(entry.underlying));
    set("ep-strategy", awaitingText(entry.strategy));
    set("ep-exp", awaitingText(entry.expiration));
    set("ep-strikes", awaitingText(entry.strikes));
    set("ep-debit", moneyOrAwaiting(entry.maxDebit));
    set("ep-risk", entry.maxRisk != null ? "$" + String(entry.maxRisk) : "awaiting verified data");
    set("ep-management", awaitingText(entry.management));
    set("ep-invalidation", awaitingText(entry.invalidation));
    set("ep-catalyst", awaitingText(entry.catalyst));
    set("ep-horizon", awaitingText(entry.horizon));
    set("ep-why", awaitingText(entry.why80));
    set("ep-timestamp", awaitingText(entry.timestamp || entry.asOfLabel));
  }

  function loadEightyPlus() {
    var needCard = $("ep-sector");
    var needHist = $("eighty-history-body");
    if (!needCard && !needHist) return;
    var prefix = rootPrefix();
    fetch(prefix + "data/eighty-plus/history.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("eighty-plus " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (needCard) fillEightyCard(data);
        if (needHist) renderEightyHistory(data);
      })
      .catch(function () {});
  }

  bindAllCaptures();
  bindFullSetup();
  bindNav();
  bindBoard();
  bindRankingsRanges();
  bindProCheckout();
  loadEightyPlus();
  loadBlotter();
  syncStickyCta();

  if ($("trade") && alreadyUnlocked()) {
    persistUnlock();
    revealTrade();
  }
})();
