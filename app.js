/* Sector Selector — Kit capture + unlock + chrome. */
(function () {
  "use strict";

  var UNLOCK_KEY = "sectorselector.v2.unlocked";

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
              notes: "SIMULATED RESEARCH. OPEN — watching; not a simulated fill. Limit $2.43 or better; do not chase above 2.43. Exits are dated on the card."
            }
          ]);
          renderRecordStats({
            asOfLabel: "31 Aug 2026",
            disclosure: "SIMULATED RESULTS NOT LIVE MONEY. No advertised win rate until 20 closed paper tickets.",
            closedNeededForWinRate: 20,
            tickets: [{ status: "open", notes: "SIMULATED RESEARCH. OPEN — watching; not a simulated fill. Limit $2.43 or better; do not chase above 2.43. Exits are dated on the card." }]
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

  function odtePath() {
    return dataAttr("data-odte-blotter", "odte-blotter.json");
  }

  function moneyPremium(value) {
    if (value == null || value === "") return "—";
    var n = typeof value === "number" ? value : Number(value);
    if (isNaN(n)) return String(value);
    return "$" + n.toFixed(2);
  }

  function addOdteStatus(tr, status) {
    var td = document.createElement("td");
    var span = document.createElement("span");
    var s = String(status || "").toLowerCase();
    span.className = "status-badge " + (s === "closed" ? "status-closed" : statusClass(status) || "status-open");
    span.textContent = s === "closed" ? "CLOSED" : s === "open" ? "OPEN" : String(status || "—").toUpperCase();
    td.appendChild(span);
    tr.appendChild(td);
  }

  function renderOdteRow(tr, t) {
    var open = String(t.status || "").toLowerCase() === "open";
    addCell(tr, t.date || "—", "mono");
    addCell(tr, t.underlying || "—", "mono");
    addCell(tr, t.contract || t.contractDetail || "—");
    addCell(tr, t.side || "—", "mono");
    addCell(tr, moneyPremium(t.entry), "mono");
    addCell(tr, open || t.exit == null || t.exit === "" ? "—" : moneyPremium(t.exit), "mono");
    addOdteStatus(tr, t.status);
    addResultCell(tr, open || t.pnl == null || t.pnl === "" ? "—" : moneyPremium(t.pnl));
  }

  function fillOdteDl(dl, rows) {
    if (!dl) return;
    dl.textContent = "";
    rows.forEach(function (row) {
      var wrap = document.createElement("div");
      var dt = document.createElement("dt");
      var dd = document.createElement("dd");
      dt.textContent = row[0];
      dd.className = "mono";
      dd.textContent = row[1];
      wrap.appendChild(dt);
      wrap.appendChild(dd);
      dl.appendChild(wrap);
    });
  }

  function renderOdteOpenCard(trades) {
    var card = $("odte-open-card");
    var empty = $("odte-no-open");
    if (!card) return;
    var openTrades = (trades || []).filter(function (t) {
      return String(t.status || "").toLowerCase() === "open";
    });
    if (!openTrades.length) {
      card.hidden = true;
      if (empty) empty.hidden = false;
      return;
    }
    card.hidden = false;
    if (empty) empty.hidden = true;
    var t = openTrades[0];
    var contract = $("odte-open-contract");
    var side = $("odte-open-side");
    var notes = $("odte-open-notes");
    var badge = $("odte-open-badge");
    var alerted = $("odte-open-alerted");
    var tape = $("odte-open-tape");
    var option = $("odte-open-option");
    var openedLabel = t.openedAlerted || t.entryAsOf || "—";
    var tapeLabel = t.targetLabel || t.underlyingTargetLabel || (t.underlying && (t.target != null || t.underlyingTarget != null) ? t.underlying + " $" + (t.target != null ? t.target : t.underlyingTarget) : "—");
    if (badge) {
      badge.className = "status-badge status-open";
      badge.textContent = "OPEN";
    }
    if (contract) {
      contract.textContent = (t.underlying ? t.underlying + " · " : "") + (t.contract || t.contractDetail || "—");
    }
    if (side) {
      side.textContent = (t.side || "BTO") + " @ " + moneyPremium(t.entry);
    }
    if (alerted) {
      if (t.openedAlertedAt) alerted.setAttribute("datetime", t.openedAlertedAt);
      alerted.textContent = openedLabel;
    }
    if (tape) tape.textContent = tapeLabel.indexOf("Target") === 0 ? tapeLabel : "Target " + tapeLabel;
    if (option) {
      option.hidden = true;
      option.textContent = "";
    }
    fillOdteDl($("odte-open-dl"), [
      ["Target", tapeLabel],
      ["Entry", moneyPremium(t.entry)],
      ["Opened/alerted", openedLabel],
      ["Hard latest", t.hardLatest || "Sep 2, 2026, 4:15 PM ET"],
      ["Spot at entry", t.spotAtEntry != null ? String(t.spotAtEntry) : "—"],
      ["P&L", "—"]
    ]);
    if (notes) {
      var extra = [t.stretchNote, t.invalidationNote].filter(Boolean).join(" ");
      notes.textContent = (t.notes || "") + (extra && (!t.notes || t.notes.indexOf(extra.slice(0, 12)) === -1) ? " " + extra : "");
    }
  }

  function renderOdteStats(data) {
    var trades = (data && data.trades) || [];
    var open = 0;
    var closed = 0;
    trades.forEach(function (t) {
      var s = String(t.status || "").toLowerCase();
      if (s === "open") open += 1;
      else if (s === "closed") closed += 1;
    });
    var openEl = $("odte-stat-open");
    var closedEl = $("odte-stat-closed");
    var rateEl = $("odte-stat-rate");
    if (openEl) openEl.textContent = String(open);
    if (closedEl) closedEl.textContent = String(closed);
    if (rateEl) {
      rateEl.textContent = closed < 1
        ? "Not published — no closed tickets"
        : "See closed rows. We do not invent a headline win rate.";
    }
    var asof = $("odte-asof");
    if (asof && data && data.asOfLabel) asof.textContent = "As of " + data.asOfLabel + " · paper log";
    var disc = $("odte-disclosure");
    if (disc && data && data.disclosure) disc.textContent = data.disclosure;
    var notes = $("odte-notes");
    if (notes) {
      var lines = trades
        .filter(function (t) { return t.notes || t.spotAtEntry != null; })
        .map(function (t) {
          var spot = t.spotAtEntry != null ? "Spot at entry " + t.spotAtEntry + ". " : "";
          return (t.date || "") + " · " + spot + (t.notes || "");
        });
      if (lines.length) notes.textContent = lines.join(" ") + " SIMULATED RESEARCH.";
    }
  }

  function renderOdteBlotter(trades) {
    var body = $("odte-blotter-body");
    if (!body) return;
    body.textContent = "";
    if (!trades || !trades.length) {
      var empty = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = 8;
      td.textContent = "No 0DTE paper tickets published.";
      empty.appendChild(td);
      body.appendChild(empty);
      return;
    }
    trades.forEach(function (t) {
      var tr = document.createElement("tr");
      renderOdteRow(tr, t);
      body.appendChild(tr);
    });
  }

  function loadOdteBlotter() {
    if (!$("odte-blotter-body")) return;
    fetch(odtePath(), { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("odte blotter " + res.status);
        return res.json();
      })
      .then(function (data) {
        var trades = (data && data.trades) || [];
        renderOdteBlotter(trades);
        renderOdteOpenCard(trades);
        renderOdteStats(data || {});
      })
      .catch(function () {});
  }

  /* Research posts: <time class="stamp-et" datetime="2026-09-01T16:15:00-04:00" data-et></time>
     Date-only datetime="2026-08-31" renders without a clock. America/New_York. Label ET. Never PT. */
  var ET_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function formatEtDateOnly(raw) {
    var m = String(raw || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return "";
    return ET_MONTHS[+m[2] - 1] + " " + Number(m[3]) + ", " + m[1] + " · ET";
  }

  function formatEtClock(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).formatToParts(d);
    var get = function (type) {
      var hit = parts.filter(function (p) { return p.type === type; })[0];
      return hit ? hit.value : "";
    };
    return get("month") + " " + get("day") + ", " + get("year") + ", " + get("hour") + ":" + get("minute") + " " + get("dayPeriod") + " ET";
  }

  function bindEtStamps() {
    document.querySelectorAll("time[data-et][datetime]").forEach(function (el) {
      var raw = el.getAttribute("datetime") || "";
      var approx = el.hasAttribute("data-et-approx");
      var text = /T\d{2}:\d{2}/.test(raw) ? formatEtClock(raw) : formatEtDateOnly(raw);
      if (!text) return;
      if (approx && /T\d{2}:\d{2}/.test(raw)) {
        text = text.replace(/, (\d{1,2}:\d{2})/, ", ~$1");
      }
      el.textContent = text;
    });
  }

  bindAllCaptures();
  bindFullSetup();
  bindNav();
  bindBoard();
  bindEtStamps();
  loadBlotter();
  loadOdteBlotter();

  if ($("trade") && alreadyUnlocked()) {
    persistUnlock();
    revealTrade();
  }
})();
