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

  function odteBookLabel(t) {
    var book = String(t.book || "").toLowerCase();
    if (book === "overnight") return "Overnight, managed on expiration";
    if (book === "same-day" || book === "sameday") return "Same-day 0DTE";
    if (t.bookLabel) return t.bookLabel;
    return t.book || "—";
  }

  function odteStatusLabel(t) {
    if (t.statusLabel) return t.statusLabel;
    var s = String(t.status || "").toLowerCase();
    if (s === "open") return "OPEN";
    if (s === "closed") return "CLOSED";
    if (s === "no-trade" || s === "no-ticket") return "NO QUALIFYING ENTRY";
    return String(t.status || "—").toUpperCase();
  }

  function odteStatusClass(t) {
    var s = String(t.status || "").toLowerCase();
    var label = odteStatusLabel(t);
    if (label.indexOf("PROTECTED") !== -1) return "status-badge status-protected";
    if (label.indexOf("LOSS") !== -1 || s === "closed") return "status-badge status-closed";
    if (s === "open") return "status-badge status-open";
    if (s === "no-trade" || s === "no-ticket") return "status-badge status-skip";
    return "status-badge";
  }

  function odteIsNoTrade(t) {
    var s = String(t.status || "").toLowerCase();
    return s === "no-trade" || s === "no-ticket" || t.officialCandidate === false;
  }

  function odtePnlCell(t) {
    if (odteIsNoTrade(t)) return "capital preserved";
    var open = String(t.status || "").toLowerCase() === "open";
    if (open) {
      if (t.openPnlLine) return "open · indicated mark unaudited";
      return "open";
    }
    if (t.pnlLabel) return t.pnlLabel;
    if (t.pnl == null || t.pnl === "") return "—";
    var n = typeof t.pnl === "number" ? t.pnl : Number(t.pnl);
    if (!isNaN(n) && n < 0) return "−$" + Math.abs(n).toFixed(0 === n % 1 ? 0 : 2);
    return moneyPremium(t.pnl);
  }

  function addOdteStatus(tr, t) {
    var td = document.createElement("td");
    var span = document.createElement("span");
    span.className = odteStatusClass(t);
    span.textContent = odteStatusLabel(t);
    td.appendChild(span);
    tr.appendChild(td);
  }

  function addOdteLabelCell(tr, t) {
    var td = document.createElement("td");
    var span = document.createElement("span");
    var live = t.live === true || String(t.label || "").toUpperCase() === "LIVE";
    span.className = live ? "odte-label odte-label-live" : "sim-mini";
    span.textContent = live ? "LIVE" : (t.label || "SIMULATED/PAPER");
    td.appendChild(span);
    tr.appendChild(td);
  }

  function renderOdteRow(tr, t) {
    var noTrade = odteIsNoTrade(t);
    var open = !noTrade && String(t.status || "").toLowerCase() === "open";
    var size = noTrade
      ? "—"
      : (t.contractsRemaining != null && t.contractsEntered != null
        ? String(t.contractsRemaining) + " / " + String(t.contractsEntered)
        : (t.side || "—"));
    addCell(tr, t.date || "—", "mono");
    addCell(tr, odteBookLabel(t));
    addCell(tr, t.underlying || "—", "mono");
    addCell(tr, noTrade ? (t.contract || "No fill — watch / no-entry") : (t.contract || t.contractDetail || "—"));
    addOdteLabelCell(tr, t);
    addCell(tr, noTrade ? "—" : moneyPremium(t.entry), "mono");
    addCell(tr, size, "mono");
    addCell(tr, open || t.exit == null || t.exit === "" ? "—" : moneyPremium(t.exit), "mono");
    addOdteStatus(tr, t);
    addCell(tr, odtePnlCell(t));
    addCell(tr, noTrade ? "—" : (t.mfeLabel || "—"));
    addCell(tr, noTrade ? "—" : (t.maeLabel || "—"), "mono");
    addCell(tr, t.openedAlerted || t.entryAsOf || "—", "mono");
  }

  function publishedMetric(block, key) {
    if (!block || block[key] == null || block[key] === "") return "—";
    return String(block[key]);
  }

  function renderOdteScoreboards(boards) {
    if (!boards) return;
    document.querySelectorAll("[data-odte-board]").forEach(function (dl) {
      var path = (dl.getAttribute("data-odte-board") || "").split(".");
      var block = boards;
      path.forEach(function (key) {
        block = block && block[key];
      });
      if (!block) return;
      dl.querySelectorAll("[data-metric]").forEach(function (dd) {
        var key = dd.getAttribute("data-metric");
        dd.textContent = publishedMetric(block, key);
      });
    });
  }

  function renderOdteTimeline(events) {
    var list = $("odte-timeline");
    if (!list || !events || !events.length) return;
    list.textContent = "";
    events.forEach(function (ev) {
      var li = document.createElement("li");
      var action = document.createElement("p");
      action.className = "odte-tl-action";
      action.textContent = ev.action || "NOTE";
      var stamp = document.createElement("time");
      stamp.className = "stamp-et odte-tl-stamp";
      if (ev.at) stamp.setAttribute("datetime", ev.at);
      stamp.setAttribute("data-et", "");
      if (ev.approx) stamp.setAttribute("data-et-approx", "");
      stamp.textContent = ev.atLabel || ev.at || "—";
      var p = document.createElement("p");
      var extra = ev.sourceClock ? " Source clock: " + ev.sourceClock + "." : "";
      p.textContent = (ev.summary || "") + extra;
      li.appendChild(action);
      li.appendChild(stamp);
      li.appendChild(p);
      list.appendChild(li);
    });
  }

  function renderOdteOpenCard(data) {
    var card = $("odte-open-card");
    var empty = $("odte-no-open");
    if (!card) return;
    var trades = (data && data.trades) || [];
    var officialId = data && data.officialTodayId;
    var t = null;
    trades.forEach(function (row) {
      if (officialId && row.id === officialId) t = row;
    });
    if (!t) {
      trades.forEach(function (row) {
        if (!t && String(row.status || "").toLowerCase() === "open") t = row;
      });
    }
    if (!t) {
      card.hidden = true;
      if (empty) empty.hidden = false;
      return;
    }
    card.hidden = false;
    if (empty) empty.hidden = true;
    var badge = $("odte-open-badge");
    if (badge) {
      badge.className = odteStatusClass(t);
      badge.textContent = odteStatusLabel(t);
    }
    var label = $("odte-open-label");
    if (label) {
      var live = t.live === true;
      label.className = live ? "odte-label odte-label-live" : "odte-label odte-label-sim";
      label.textContent = live ? "LIVE" : (t.label || "SIMULATED/PAPER");
    }
    var contract = $("odte-open-contract");
    if (contract && t.contract) contract.textContent = t.contract;
  }

  function renderOdteStats(data) {
    var asof = $("odte-asof");
    if (asof && data && data.asOfLabel) {
      asof.textContent = "As of " + data.asOfLabel;
    }
    var notes = $("odte-notes");
    var trades = (data && data.trades) || [];
    if (notes && trades.length) {
      var paths = trades
        .filter(function (t) { return t.statusPath && t.statusPath.length; })
        .map(function (t) {
          var steps = t.statusPath.map(function (s) {
            return (s.status || "") + " (" + (s.atLabel || "") + ")";
          }).join(" → ");
          return "Status path for " + (t.id || t.date) + ": " + steps + ".";
        });
      if (paths.length) notes.textContent = paths.join(" ") + " Prior OPEN remains on the timeline. SIMULATED RESEARCH.";
    }
  }

  function renderOdteBlotter(trades) {
    var body = $("odte-blotter-body");
    if (!body) return;
    body.textContent = "";
    if (!trades || !trades.length) {
      var empty = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = 13;
      td.textContent = "No 0DTE tickets published.";
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
    if (!$("odte-blotter-body") && !$("odte-scoreboards")) return;
    fetch(odtePath(), { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("odte blotter " + res.status);
        return res.json();
      })
      .then(function (data) {
        var trades = (data && data.trades) || [];
        renderOdteScoreboards(data && data.scoreboards);
        renderOdteTimeline(data && data.timeline);
        renderOdteBlotter(trades);
        renderOdteOpenCard(data || {});
        renderOdteStats(data || {});
        bindEtStamps();
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
