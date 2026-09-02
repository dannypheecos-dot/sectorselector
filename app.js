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

  function odteIsChallengePage() {
    return document.body && document.body.getAttribute("data-page") === "odte-challenge";
  }

  function odteUniqueById(rows) {
    var seen = {};
    var out = [];
    (rows || []).forEach(function (row) {
      var id = row && row.id;
      if (!id || seen[id]) return;
      seen[id] = true;
      out.push(row);
    });
    return out;
  }

  function odteIsRulesBased(t) {
    if (!t) return false;
    if (t.rulesBased === false) return false;
    if (String(t.classification || "") === "pre-rule-baseline") return false;
    if (String(t.classification || "") === "official-daily-record") return false;
    return true;
  }

  function odteIsExecuted(t) {
    if (!t) return false;
    if (t.officialCandidate === false) return false;
    if (String(t.classification || "") === "official-daily-record") return false;
    var s = String(t.status || "").toLowerCase();
    return s === "open" || s === "closed" || t.entry != null;
  }

  function odteEtDate(iso) {
    if (!iso) return "";
    var fallback = String(iso).match(/^(\d{4}-\d{2}-\d{2})/);
    var d = new Date(iso);
    if (isNaN(d.getTime())) return fallback ? fallback[1] : "";
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(d);
    var get = function (type) {
      var hit = parts.filter(function (p) { return p.type === type; })[0];
      return hit ? hit.value : "";
    };
    return get("year") + "-" + get("month") + "-" + get("day");
  }

  function odteMoneyInt(n) {
    var v = typeof n === "number" ? n : Number(n);
    if (isNaN(v)) return "—";
    var abs = Math.abs(v).toLocaleString("en-US");
    if (v < 0) return "−$" + abs;
    return "$" + abs;
  }

  function odteStatusClass(t) {
    var s = String((t && t.status) || "").toLowerCase();
    var label = String((t && (t.statusLabel || t.status)) || "").toUpperCase();
    if (label.indexOf("WATCH") !== -1 || label.indexOf("NO ENTRY") !== -1 || label.indexOf("NO QUALIFYING") !== -1) {
      return "status-badge status-watch";
    }
    if (label.indexOf("PROTECTED") !== -1) return "status-badge status-protected";
    if (label.indexOf("LOSS") !== -1 || s === "closed") return "status-badge status-closed";
    if (s === "open" || label.indexOf("ACTIVE") !== -1) return "status-badge status-open";
    if (s === "no-trade" || s === "no-ticket") return "status-badge status-skip";
    return "status-badge";
  }

  function odteSetText(id, text) {
    var el = $(id);
    if (el && text != null) el.textContent = text;
  }

  function renderOdteHero(data) {
    var day = (data && data.windowDay) || 2;
    var days = (data && data.windowDays) || 30;
    var status = (data && (data.heroStatus || (data.today && data.today.heroStatus))) || "SETUP WATCHING";
    var asOf = data && data.asOfLabel ? data.asOfLabel.replace(/^.*,\s*/, "") : "~1:25 PM ET";
    odteSetText("odte-hero-day", "Day " + day + "/" + days);
    odteSetText("odte-sticky-day", "DAY " + day + "/" + days);
    var heroStatus = $("odte-hero-status");
    if (heroStatus) {
      heroStatus.className = "status-badge status-watch";
      heroStatus.textContent = status;
    }
    odteSetText("odte-sticky-status", status);
    odteSetText("odte-sticky-update", "LAST UPDATE " + asOf);
  }

  function renderOdteOpenCard(data) {
    var card = $("odte-open-card");
    var empty = $("odte-no-open");
    if (!card) return;
    var today = data && data.today;
    if (!today) {
      return;
    }
    card.hidden = false;
    if (empty) empty.hidden = true;
    var badge = $("odte-open-badge");
    if (badge) {
      badge.className = odteStatusClass({ status: today.status, statusLabel: today.status });
      badge.textContent = today.status || "WATCHING — NO ENTRY";
    }
    odteSetText("odte-open-label", "SIMULATED");
    odteSetText("odte-open-dte", today.dteLabel && today.dteLabel !== "—" ? today.dteLabel : "0DTE session");
    odteSetText("odte-open-contract", today.contract || "None — no qualifying entry");
    odteSetText("odte-today-copy", today.copy || "");
    odteSetText("odte-f-status", today.status || "WATCHING — NO ENTRY");
    odteSetText("odte-f-underlying", today.underlying || "—");
    odteSetText("odte-f-contract", today.contract || "—");
    odteSetText("odte-f-dte", today.dteLabel || "—");
    odteSetText("odte-f-entry", today.preferredEntryRange || "—");
    odteSetText("odte-f-maxentry", today.maxEntry || "—");
    odteSetText("odte-f-actionable", today.actionable || "—");
    odteSetText("odte-f-invalidation", today.invalidation || "—");
    odteSetText("odte-f-target", today.primaryTarget || "—");
    odteSetText("odte-f-size", today.positionSize || "—");
    odteSetText("odte-f-stop", today.plannedStopLoss || "—");
    odteSetText("odte-f-maxrisk", today.maxCapitalAtRisk || "—");
    odteSetText("odte-f-alert", today.alertExpiration || "—");
    odteSetText("odte-f-updated", today.lastUpdated || (data && data.asOfLabel) || "—");
  }

  function renderOdteStats(data) {
    var published = data && data.progress;
    var trades = odteUniqueById((data && data.trades) || []);
    var rulesClosed = trades.filter(function (t) {
      return odteIsRulesBased(t) && String(t.status || "").toLowerCase() === "closed";
    });
    var wins = rulesClosed.filter(function (t) { return Number(t.pnl) > 0; }).length;
    var losses = rulesClosed.filter(function (t) { return Number(t.pnl) < 0; }).length;
    var rulesPnl = rulesClosed.reduce(function (sum, t) { return sum + (Number(t.pnl) || 0); }, 0);
    var modelPnl = trades.reduce(function (sum, t) {
      if (!odteIsExecuted(t) || t.pnl == null || t.pnl === "") return sum;
      return sum + Number(t.pnl);
    }, 0);
    var start = data && data.startingCash != null ? Number(data.startingCash) : 10000;
    var model = data && data.modelCash != null ? Number(data.modelCash) : start + modelPnl;
    var day = (published && published.day) || (data && data.windowDay) || 2;
    var days = (published && published.days) || (data && data.windowDays) || 30;
    var completed = published && published.rulesBasedCompleted != null ? published.rulesBasedCompleted : rulesClosed.length;
    var winN = published && published.wins != null ? published.wins : wins;
    var lossN = published && published.losses != null ? published.losses : losses;
    var net = published && published.rulesBasedNetPnl != null ? published.rulesBasedNetPnl : (rulesClosed.length ? rulesPnl : null);
    var cash = published && published.modelBalance != null ? published.modelBalance : model;
    var comp = published && published.compliance != null ? published.compliance : null;
    odteSetText("odte-p-day", day + "/" + days);
    odteSetText("odte-p-completed", String(completed));
    odteSetText("odte-p-wl", winN + " / " + lossN);
    odteSetText("odte-p-pnl", net == null || net === "" ? "—" : odteMoneyInt(net));
    odteSetText("odte-p-cash", odteMoneyInt(cash));
    odteSetText("odte-p-comp", comp == null || comp === "" ? "N/A" : String(comp));
    var caption = (published && published.caption) || "Rules-based record begins after Trade Zero. Win rate: Not enough data.";
    odteSetText("odte-progress-caption", caption);
    var asof = $("odte-asof");
    if (asof && data && data.asOfAt) {
      asof.innerHTML = 'Last updated <time class="stamp-et" datetime="' + data.asOfAt + '"' + (data.asOfApprox ? " data-et data-et-approx" : " data-et") + ">" + (data.asOfLabel || "") + "</time>";
    }
  }

  function renderOdteBlotter(trades) {
    var root = $("odte-results");
    if (!root) return;
    var rows = odteUniqueById(trades).filter(odteIsExecuted);
    if (!rows.length) {
      return;
    }
    root.textContent = "";
    rows.forEach(function (t) {
      var art = document.createElement("article");
      art.className = "odte-result";
      art.setAttribute("data-trade-id", t.id || "");
      var top = document.createElement("div");
      top.className = "odte-ticket-top";
      var badge = document.createElement("span");
      badge.className = odteStatusClass(t);
      badge.textContent = t.statusLabel || "CLOSED";
      var dte = document.createElement("span");
      dte.className = "odte-dte";
      dte.textContent = t.dteLabel || "—";
      var comp = document.createElement("span");
      comp.className = "odte-label odte-label-sim";
      comp.textContent = t.complianceLabel || "SIMULATED";
      top.appendChild(badge);
      top.appendChild(dte);
      top.appendChild(comp);
      var h = document.createElement("h3");
      h.textContent = t.contract || t.id;
      var p = document.createElement("p");
      p.textContent = (t.entry != null ? "Entry " + moneyPremium(t.entry) : "") +
        (t.cashOpen != null ? " · cash open " + moneyPremium(t.cashOpen) : "") +
        (t.mfeLabel ? " · MFE " + t.mfeLabel : "") +
        (t.exit != null ? " · exit " + moneyPremium(t.exit) : "") +
        (t.pnlLabel ? " · P&L " + t.pnlLabel : "") + ".";
      var linkP = document.createElement("p");
      var a = document.createElement("a");
      a.href = "#journal-" + (t.id || "");
      a.textContent = "Open journal";
      linkP.appendChild(a);
      art.appendChild(top);
      art.appendChild(h);
      art.appendChild(p);
      art.appendChild(linkP);
      root.appendChild(art);
    });
  }

  function renderOdteLessons(lessons) {
    if (!lessons || !lessons.length) return;
  }

  function odteDayMeta(data, date) {
    var days = (data && data.days) || [];
    var found = null;
    days.forEach(function (d) {
      if (d.date === date) found = d;
    });
    return found;
  }

  function odteTradeById(data, id) {
    var found = null;
    ((data && data.trades) || []).forEach(function (t) {
      if (t.id === id) found = t;
    });
    return found;
  }

  function renderOdteDayEvents(events) {
    var ol = document.createElement("ol");
    ol.className = "odte-timeline";
    events.forEach(function (ev) {
      var li = document.createElement("li");
      if (ev.id) li.id = ev.id;
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
      ol.appendChild(li);
    });
    return ol;
  }

  function odteSetDayOpen(btn, open) {
    if (!btn) return;
    var panelId = btn.getAttribute("aria-controls");
    var panel = panelId ? document.getElementById(panelId) : null;
    var day = btn.closest(".odte-day");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (panel) panel.hidden = !open;
    if (day) day.classList.toggle("is-open", open);
  }

  function odteToggleDay(btn, forceOpen) {
    if (!btn) return;
    var day = btn.closest(".odte-day");
    var isToday = day && day.getAttribute("data-odte-today") === "true";
    var open = btn.getAttribute("aria-expanded") === "true";
    var willOpen = forceOpen === true ? true : forceOpen === false ? false : !open;
    if (isToday && forceOpen == null) willOpen = true;
    if (willOpen && day && !isToday) {
      document.querySelectorAll('.odte-day:not([data-odte-today="true"]) .odte-day-btn').forEach(function (other) {
        if (other !== btn) odteSetDayOpen(other, false);
      });
    }
    odteSetDayOpen(btn, willOpen);
  }

  function renderOdteApplyHash() {
    var hash = (location.hash || "").replace(/^#/, "");
    if (!hash) return;
    var day = document.querySelector('[data-odte-day="' + hash + '"]');
    if (!day) return;
    var btn = day.querySelector(".odte-day-btn");
    odteToggleDay(btn, true);
    if (typeof day.scrollIntoView === "function") {
      day.scrollIntoView({ block: "start" });
    }
  }

  function bindOdteArchive() {
    var root = $("odte-archive");
    if (!root || root.getAttribute("data-odte-bound") === "1") {
      if (root) renderOdteApplyHash();
      return;
    }
    root.setAttribute("data-odte-bound", "1");
    root.addEventListener("click", function (e) {
      var btn = e.target.closest(".odte-day-btn");
      if (!btn || !root.contains(btn)) return;
      odteToggleDay(btn);
    });
    window.addEventListener("hashchange", renderOdteApplyHash);
    renderOdteApplyHash();
  }

  function renderOdteTimeline(events, data) {
    var root = $("odte-archive");
    if (!root) return;
    if (!events || !events.length) return;
    var today = (data && data.asOf) || (data && data.today && data.today.id && String(data.today.id).slice(0, 10)) || "2026-09-02";
    var groups = {};
    events.forEach(function (ev) {
      var date = odteEtDate(ev.at);
      if (!date) return;
      if (!groups[date]) groups[date] = [];
      groups[date].push(ev);
    });
    ((data && data.days) || []).forEach(function (d) {
      if (d.date && !groups[d.date]) groups[d.date] = [];
    });
    var dates = Object.keys(groups).sort().reverse();
    if (!dates.length) return;
    root.textContent = "";
    dates.forEach(function (date) {
      var meta = odteDayMeta(data, date) || {};
      var isToday = date === today || meta.isToday === true;
      var art = document.createElement("article");
      art.className = "odte-day" + (isToday ? " is-today is-open" : "");
      art.id = date;
      art.setAttribute("data-odte-day", date);
      if (isToday) art.setAttribute("data-odte-today", "true");
      var h3 = document.createElement("h3");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "odte-day-btn";
      btn.id = "odte-day-btn-" + date;
      btn.setAttribute("aria-expanded", isToday ? "true" : "false");
      btn.setAttribute("aria-controls", "odte-day-panel-" + date);
      var dateSpan = document.createElement("span");
      dateSpan.className = "odte-day-date";
      dateSpan.textContent = meta.label || date;
      var recSpan = document.createElement("span");
      recSpan.className = "odte-day-rec";
      recSpan.textContent = meta.officialLabel || meta.officialRecord || "DAILY RECORD";
      btn.appendChild(dateSpan);
      btn.appendChild(recSpan);
      h3.appendChild(btn);
      var panel = document.createElement("div");
      panel.className = "odte-day-panel";
      panel.id = "odte-day-panel-" + date;
      panel.setAttribute("role", "region");
      panel.setAttribute("aria-labelledby", btn.id);
      if (!isToday) panel.hidden = true;
      var statusP = document.createElement("p");
      statusP.className = "odte-day-status";
      var badge = document.createElement("span");
      badge.className = isToday ? "status-badge status-watch" : "status-badge status-open";
      badge.textContent = meta.officialLabel || (isToday ? "WATCHING — NO ENTRY" : "OPEN — CARRIED OVERNIGHT");
      var dte = document.createElement("span");
      dte.className = "odte-dte";
      dte.textContent = isToday ? "0DTE" : "1DTE";
      statusP.appendChild(badge);
      statusP.appendChild(dte);
      panel.appendChild(statusP);
      var body = document.createElement("p");
      if (isToday) {
        body.textContent = "Official same-day record. Candidates monitored: " +
          ((meta.candidatesMonitored || ["SPY", "QQQ", "IWM"]).join(", ")) +
          ". Why none qualified: " + (meta.whyNoneQualified || "No setup met the published entry and risk standards.") +
          " Same-day P&L $0.";
      } else {
        body.textContent = meta.sameDayPnlNote || "Official record: executed trade. No realized P&L on the entry date.";
      }
      panel.appendChild(body);
      if (meta.carryInId) {
        var carry = document.createElement("aside");
        carry.className = "odte-carry";
        var k = document.createElement("p");
        k.className = "odte-watch-kicker";
        k.textContent = "Carry-in · same journal";
        var cp = document.createElement("p");
        cp.innerHTML = '<span class="status-badge status-closed">' + (meta.carryInLabel || "CARRY-IN") +
          "</span> Realized " + odteMoneyInt(meta.carryInPnl) + " here only. <a href=\"#journal-" + meta.carryInId + "\">Open journal</a>";
        carry.appendChild(k);
        carry.appendChild(cp);
        panel.appendChild(carry);
      }
      if (meta.carryOutId) {
        var carryOut = document.createElement("aside");
        carryOut.className = "odte-carry";
        var ck = document.createElement("p");
        ck.className = "odte-watch-kicker";
        ck.textContent = "Carry-out · same journal";
        var ctp = document.createElement("p");
        var ct = odteTradeById(data, meta.carryOutId);
        ctp.innerHTML = (ct && ct.contract ? ct.contract : "Overnight ticket") +
          ' entered. <a href="#journal-' + meta.carryOutId + '">Open journal</a>';
        carryOut.appendChild(ck);
        carryOut.appendChild(ctp);
        panel.appendChild(carryOut);
      }
      panel.appendChild(renderOdteDayEvents(groups[date] || []));
      art.appendChild(h3);
      art.appendChild(panel);
      root.appendChild(art);
    });
    bindOdteArchive();
  }

  function bindOdteDetails() {
    document.querySelectorAll(".odte-details-btn").forEach(function (btn) {
      if (btn.getAttribute("data-odte-bound") === "1") return;
      btn.setAttribute("data-odte-bound", "1");
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("aria-controls");
        var panel = id ? document.getElementById(id) : null;
        if (!panel) return;
        var open = panel.hidden;
        panel.hidden = !open;
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        btn.textContent = open ? "HIDE FULL TRADE DETAILS" : "VIEW FULL TRADE DETAILS";
      });
    });
  }

  function renderOdteScoreboards() {
    /* Live/Paper four-board scoreboards removed in Phase 2. */
  }

  function loadOdteBlotter() {
    if (!odteIsChallengePage()) return;
    bindOdteDetails();
    bindOdteArchive();
    fetch(odtePath(), { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("odte blotter " + res.status);
        return res.json();
      })
      .then(function (data) {
        var trades = (data && data.trades) || [];
        renderOdteHero(data || {});
        renderOdteOpenCard(data || {});
        renderOdteStats(data || {});
        renderOdteBlotter(trades);
        renderOdteLessons(data && data.lessons);
        renderOdteTimeline(data && data.timeline, data || {});
        bindOdteDetails();
        bindEtStamps();
      })
      .catch(function () {
        bindOdteDetails();
        bindOdteArchive();
      });
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
