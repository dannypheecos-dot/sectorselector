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
    if (t.fill != null && t.fill !== "") {
      return moneyDebit(t.fill) + " paper fill";
    }
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
    if (isNoTicket(t)) return false;
    if (t.fill != null && t.fill !== "") return false;
    return t.debit == null || t.debit === "";
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
              date: "2026-09-04",
              ticker: "XLV",
              structure: "Long naked CALL, 30–60 DTE",
              expirationLabel: "30–60 DTE · confirm Monday",
              status: "open",
              debit: null,
              result: null
            },
            {
              date: "2026-09-04",
              ticker: "XLV",
              structure: "Debit call spread, 30–60 DTE",
              expiration: "Oct 16, 2026",
              longStrike: 170,
              shortStrike: 175,
              status: "open",
              debit: null,
              result: null
            },
            {
              date: "2026-08-30",
              ticker: "XLV",
              structure: "Debit call spread, 30–60 DTE",
              expiration: "Oct 16, 2026",
              longStrike: 170,
              shortStrike: 175,
              status: "open",
              debit: 2.43,
              fill: 3.83,
              result: null,
              notes: "SIMULATED RESEARCH. OPEN. Paper fill $3.83. No second fill."
            }
          ]);
          renderRecordStats({
            asOfLabel: "Friday 4 Sep 2026 close",
            disclosure: "SIMULATED RESULTS NOT LIVE MONEY. No advertised win rate until 20 closed paper tickets.",
            closedNeededForWinRate: 20,
            tickets: [{ status: "open" }, { status: "open" }, { status: "open", notes: "SIMULATED RESEARCH. OPEN. Paper fill $3.83. No second fill." }]
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

  /* Three performance types never mix.
     Peak Opportunity After Alert = research-alert quality (executable BID after referenceEntry).
     All-or-Nothing = $1,000 fixed-notional counterfactual. Never mutates modelCash.
     Managed Execution = only input to the $10,000 model account. */
  var ODTE_PEAK_OFFICIAL = {
    "VERIFIED NBBO": true,
    "BROKER QUOTE VERIFIED": true
  };
  var ODTE_REJECTED_PEAK = /candle|last-trade|last trade|ask high|midpoint|theoretical|intrinsic|unsupported|overnight|tradingview|traded-price|traded ohlc|superchart/;

  function odtePeakIsOfficial(verification) {
    return !!(verification && ODTE_PEAK_OFFICIAL[String(verification)]);
  }

  function odteRejectPeakSource(kind) {
    return ODTE_REJECTED_PEAK.test(String(kind || "").toLowerCase());
  }

  function odteNotPreservedPeak(kind) {
    return /not preserved|insufficient historical/i.test(String(kind || ""));
  }

  /* AWAITING is only for a live, still-quoted contract.
     After expiration with no tape, visitor copy is NOT PRESERVED. */
  function odteVisitorPeakLabel(t) {
    if (t && t.peakOpportunityLabel) return t.peakOpportunityLabel;
    var verification = t && (t.peakVerification || (t.signalQuality && t.signalQuality.verification));
    if (odteNotPreservedPeak(verification)) {
      return "NOT PRESERVED — insufficient historical quote evidence";
    }
    return "AWAITING VERIFIED QUOTE DATA";
  }

  function odtePeakOpportunity(t) {
    var out = {
      pct: null,
      label: odteVisitorPeakLabel(t),
      official: false
    };
    if (!t) return out;
    if (t.peakOpportunityLabel) out.label = t.peakOpportunityLabel;
    var verification = t.peakVerification || (t.signalQuality && t.signalQuality.verification);
    var source = t.quoteSource || t.peakSource || "";
    if (t.indicativePeak && t.indicativePeak.excludedFromOfficial) {
      out.label = t.peakOpportunityLabel || (odteNotPreservedPeak(verification)
        ? "NOT PRESERVED — insufficient historical quote evidence"
        : "INDICATIVE PEAK — EXCLUDED FROM OFFICIAL STATISTICS");
      return out;
    }
    if (odteRejectPeakSource(source) || odteRejectPeakSource(verification)) {
      out.label = t.peakOpportunityLabel || (odteNotPreservedPeak(verification)
        ? "NOT PRESERVED — insufficient historical quote evidence"
        : "INDICATIVE PEAK — EXCLUDED FROM OFFICIAL STATISTICS");
      return out;
    }
    if (!t.referenceEntryVerified) {
      out.label = odteVisitorPeakLabel(t);
      return out;
    }
    if (t.peakExecutableBid == null || t.referenceEntry == null) {
      out.label = odteNotPreservedPeak(verification)
        ? "NOT PRESERVED — insufficient historical quote evidence"
        : (verification === "UNAVAILABLE — INSUFFICIENT DATA"
          ? "UNAVAILABLE — INSUFFICIENT DATA"
          : "AWAITING VERIFIED QUOTE DATA");
      return out;
    }
    if (!odtePeakIsOfficial(verification)) {
      out.label = "INDICATIVE PEAK — EXCLUDED FROM OFFICIAL STATISTICS";
      return out;
    }
    var ref = Number(t.referenceEntry);
    var bid = Number(t.peakExecutableBid);
    if (!(ref > 0) || isNaN(bid) || bid < 0) {
      out.label = "UNAVAILABLE — INSUFFICIENT DATA";
      return out;
    }
    out.pct = ((bid - ref) / ref) * 100;
    out.official = true;
    out.label = (out.pct >= 0 ? "+" : "") + out.pct.toFixed(1) + "%";
    return out;
  }

  function odteOpportunityIdentified(t) {
    if (t && t.opportunityIdentified) return t.opportunityIdentified;
    var peak = odtePeakOpportunity(t);
    if (!peak.official || peak.pct == null) return "UNVERIFIED";
    return peak.pct >= 25 ? "YES" : "NO";
  }

  function odteIdentifiedKind(t) {
    return (t && (t.opportunityIdentifiedKind || (t.signalQuality && t.signalQuality.opportunityIdentifiedKind))) || "";
  }

  function odteIdentifiedLabel(t) {
    var id = odteOpportunityIdentified(t);
    var kind = odteIdentifiedKind(t);
    if (id === "YES" && String(kind).toUpperCase() === "CHARTED") return "YES · CHARTED";
    if (id === "YES" && String(kind).toUpperCase() === "VERIFIED") return "YES · VERIFIED";
    return id;
  }

  function odteIsVerifiedIdentifiedYes(t) {
    /* Official YES counts require verified executable +25%. Charted YES never enters. */
    if (String(odteIdentifiedKind(t)).toUpperCase() === "CHARTED") return false;
    var peak = odtePeakOpportunity(t);
    return !!(peak.official && peak.pct != null && peak.pct >= 25);
  }

  function odteChartedPeak(t) {
    var c = t && t.chartedPeak;
    if (!c || c.pct == null) return null;
    if (c.excludedFromOfficialPeak === false) return null;
    return {
      pct: Number(c.pct),
      label: c.label || ((Number(c.pct) >= 0 ? "+" : "") + Number(c.pct).toFixed(1) + "%"),
      verification: c.verification || "TRADINGVIEW TRADED-PRICE HIGH — NOT A VERIFIED EXECUTABLE BID",
      note: c.note || "",
      at: c.atLabel || c.at || "",
      high: c.high
    };
  }

  function odteIsChartedPlus25(t) {
    var c = odteChartedPeak(t);
    return !!(c && c.pct >= 25);
  }

  function odteEvidenceHtml(t) {
    var ev = t && t.evidence;
    if (!ev || !ev.path) return "";
    var ohlc = ev.ohlc || {};
    return "<figure class=\"odte-evidence\">" +
      "<img src=\"" + ev.path + "\" alt=\"TradingView one-minute chart of QQQ Sep 2, 2026 $707 put, 9:30 AM ET candle\">" +
      "<figcaption>" +
      "<span class=\"mono\">" + (ev.platform || "TradingView") + " · " + (ev.timeframe || "One minute") + " · " + (ev.candleTime || "") + "</span>" +
      "<span>Contract: " + (ev.contract || t.contract || "") + "</span>" +
      "<span>OHLC: $" + ohlc.open + " / $" + ohlc.high + " / $" + ohlc.low + " / $" + ohlc.close + "</span>" +
      "<span>Evidence level: " + (ev.evidenceLevel || "Charted traded-price data") + "</span>" +
      "<span>Executable-bid verification: " + (ev.executableBidVerification || "Unavailable") + "</span>" +
      "<span>quoteSource: " + (ev.quoteSource || "") + "</span>" +
      "</figcaption></figure>";
  }

  function odteManagedCash(data) {
    /* Managed Execution Outcomes ONLY. Peak and all-or-nothing dollars never enter. */
    if (data && data.modelCash != null) return Number(data.modelCash);
    var start = data && data.startingCash != null ? Number(data.startingCash) : 10000;
    var seen = {};
    var pnl = 0;
    ((data && data.trades) || []).forEach(function (t) {
      if (!t || !t.id || seen[t.id]) return;
      seen[t.id] = true;
      if (t.classification === "official-daily-record") return;
      var managed = t.managedExecution || {};
      var v = managed.dollarResult != null ? managed.dollarResult : t.pnl;
      if (v == null || v === "") return;
      pnl += Number(v);
    });
    return start + pnl;
  }

  function odteAonOfficialTotal(data) {
    var aon = data && data.allOrNothing;
    if (aon && aon.mutatesModelCash) {
      /* Invariant: AON must never mutate model cash. Ignore the flag if a blotter is wrong. */
    }
    if (aon && aon.officialTotal != null) return Number(aon.officialTotal);
    var excluded = {};
    ((aon && aon.indicativeExcludedIds) || []).forEach(function (id) { excluded[id] = true; });
    var total = 0;
    var any = false;
    odteUniqueById((data && data.trades) || []).forEach(function (t) {
      if (!t || excluded[t.id]) return;
      var row = t.allOrNothingOutcome || {};
      if (row.excludedFromOfficial) return;
      if (row.status && /indicative|unavailable|awaiting/i.test(row.status)) return;
      if (row.dollarOutcome == null) return;
      total += Number(row.dollarOutcome);
      any = true;
    });
    return any ? total : null;
  }

  function odteCaptureRate(t) {
    var peak = odtePeakOpportunity(t);
    var managed = t && t.managedExecution;
    if (!peak.official || peak.pct == null || peak.pct <= 0) return null;
    if (!managed || managed.pctResult == null || Number(managed.pctResult) <= 0) return null;
    if (!t.referenceEntryVerified || !odtePeakIsOfficial(t.peakVerification)) return null;
    return (Number(managed.pctResult) / peak.pct) * 100;
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
    if (today.sessionNote) odteSetText("odte-open-book", today.sessionNote);
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
    var expanded = data && data.expandedRecord;
    var trades = odteUniqueById((data && data.trades) || []);
    var rulesClosed = trades.filter(function (t) {
      return odteIsRulesBased(t) && String(t.status || "").toLowerCase() === "closed";
    });
    var noEntryDays = trades.filter(function (t) {
      return String(t.status || "") === "no-qualifying-entry" || t.officialRecord === "NO QUALIFYING ENTRY — CAPITAL PRESERVED";
    }).length;
    var officialPeaks = trades.map(odtePeakOpportunity).filter(function (p) { return p.official && p.pct != null; });
    var plus25 = officialPeaks.filter(function (p) { return p.pct >= 25; }).length;
    var verifiedYes = trades.filter(odteIsVerifiedIdentifiedYes).length;
    void verifiedYes;
    var chartedPlus = trades.filter(odteIsChartedPlus25).length;
    var chartedExecuted = trades.filter(function (t) { return odteIsExecuted(t) && t.chartedPeak; }).length;
    var median = null;
    if (officialPeaks.length) {
      var sorted = officialPeaks.map(function (p) { return p.pct; }).sort(function (a, b) { return a - b; });
      var mid = Math.floor(sorted.length / 2);
      median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    var wins = rulesClosed.filter(function (t) {
      var v = t.managedExecution && t.managedExecution.dollarResult != null ? t.managedExecution.dollarResult : t.pnl;
      return Number(v) > 0;
    }).length;
    var losses = rulesClosed.filter(function (t) {
      var v = t.managedExecution && t.managedExecution.dollarResult != null ? t.managedExecution.dollarResult : t.pnl;
      return Number(v) < 0;
    }).length;
    var rulesPnl = rulesClosed.reduce(function (sum, t) {
      var v = t.managedExecution && t.managedExecution.dollarResult != null ? t.managedExecution.dollarResult : t.pnl;
      return sum + (Number(v) || 0);
    }, 0);
    var cash = published && published.modelBalance != null ? published.modelBalance : odteManagedCash(data);
    var aonProbe = data && data.allOrNothing ? data.allOrNothing.officialTotal : null;
    void aonProbe;
    var aonTotal = odteAonOfficialTotal(data);
    if (aonTotal != null && cash === 9840 + Number(aonTotal)) {
      cash = odteManagedCash(data);
    }
    var notEnough = !officialPeaks.length;
    var day = (published && published.day) || (data && data.windowDay) || 2;
    var days = (published && published.days) || (data && data.windowDays) || 30;
    odteSetText("odte-p-day", day + "/" + days);
    odteSetText("odte-p-alerts", String(published && published.qualifiedAlerts != null ? published.qualifiedAlerts : 0));
    odteSetText("odte-p-plus25", notEnough ? "NOT ENOUGH VERIFIED DATA" : String(plus25));
    odteSetText("odte-p-peak", notEnough || median == null ? "NOT ENOUGH VERIFIED DATA" : ((median >= 0 ? "+" : "") + median.toFixed(1) + "%"));
    odteSetText("odte-p-cash", odteMoneyInt(cash));
    var net = published && published.managedNetPnlRulesBased != null ? published.managedNetPnlRulesBased : (rulesClosed.length ? rulesPnl : null);
    odteSetText("odte-p-pnl", net == null || net === "" ? "—" : odteMoneyInt(net));
    odteSetText("odte-p-nq", String(published && published.noQualifyingEntryDays != null ? published.noQualifyingEntryDays : noEntryDays));
    var comp = published && (published.complianceLabel || published.compliance);
    odteSetText("odte-p-comp", comp == null || comp === "" ? "N/A" : String(comp));
    var chartedLabel = published && published.chartedPlus25 != null ? String(published.chartedPlus25) : String(chartedPlus);
    odteSetText("odte-p-charted", chartedLabel);
    var chartedRate = published && published.chartedOpportunityRate
      ? published.chartedOpportunityRate
      : (chartedExecuted ? (chartedPlus + " / " + chartedExecuted + " executed · CHARTED, not verified") : "—");
    odteSetText("odte-p-charted-rate", chartedRate);
    var caption = (published && published.caption) || "Official Peak Opportunity statistics require VERIFIED NBBO or BROKER QUOTE VERIFIED.";
    odteSetText("odte-progress-caption", caption);
    var pending = "NOT ENOUGH VERIFIED DATA";
    odteSetText("odte-x-avgpeak", (expanded && expanded.avgVerifiedPeakPct != null) ? String(expanded.avgVerifiedPeakPct) : pending);
    odteSetText("odte-x-rungs", pending);
    odteSetText("odte-x-mae", pending);
    odteSetText("odte-x-ttp", pending);
    odteSetText("odte-x-aon", aonTotal == null ? pending : odteMoneyInt(aonTotal));
    odteSetText("odte-x-wl", (expanded && expanded.managedWins != null ? expanded.managedWins : wins) + " / " + (expanded && expanded.managedLosses != null ? expanded.managedLosses : losses));
    odteSetText("odte-x-cap", "—");
    odteSetText("odte-x-dte", pending);
    odteSetText("odte-x-charted", chartedRate);
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
      var peak = odtePeakOpportunity(t);
      var identified = odteIdentifiedLabel(t);
      var charted = odteChartedPeak(t);
      var managed = t.managedExecution || {};
      var managedDollar = managed.dollarResult != null ? managed.dollarResult : t.pnl;
      var art = document.createElement("article");
      art.className = "odte-result";
      art.setAttribute("data-trade-id", t.id || "");
      var dateP = document.createElement("p");
      dateP.className = "odte-result-date mono";
      dateP.textContent = t.entryDate || t.date || "—";
      var h = document.createElement("h3");
      h.textContent = t.contract || t.id;
      var mini = document.createElement("dl");
      mini.className = "odte-result-mini";
      [
        ["Opportunity identified", identified],
        ["Peak Opportunity", peak.label],
        ["Managed Result", managedDollar == null ? "—" : odteMoneyInt(managedDollar)]
      ].forEach(function (pair) {
        var row = document.createElement("div");
        var dt = document.createElement("dt");
        dt.textContent = pair[0];
        var dd = document.createElement("dd");
        dd.textContent = pair[1];
        row.appendChild(dt);
        row.appendChild(dd);
        mini.appendChild(row);
      });
      var peakLine = document.createElement("p");
      peakLine.className = "odte-peak-line";
      peakLine.textContent = "PEAK OPPORTUNITY AFTER ALERT: " + peak.label;
      var chartedLine = null;
      if (charted) {
        chartedLine = document.createElement("p");
        chartedLine.className = "odte-charted-line";
        chartedLine.textContent = "CHARTED PEAK AFTER ALERT: " + charted.label;
      }
      var detailsId = "odte-result-details-" + (t.id || "row");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ghost-btn odte-details-btn";
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-controls", detailsId);
      btn.textContent = "VIEW DETAILS";
      var panel = document.createElement("div");
      panel.className = "odte-details odte-three";
      panel.id = detailsId;
      panel.hidden = true;
      var aon = t.allOrNothingOutcome || {};
      var sig = t.signalQuality || {};
      panel.innerHTML =
        "<section><h3>Signal quality</h3><dl class=\"odte-card-grid\">" +
        "<div><dt>Opportunity identified</dt><dd>" + identified + "</dd></div>" +
        "<div><dt>Qualifier</dt><dd>" + (t.opportunityIdentifiedQualifier || sig.opportunityIdentifiedQualifier || "—") + "</dd></div>" +
        "<div><dt>Reference entry</dt><dd>" + (t.referenceEntryNote || moneyPremium(t.referenceEntry)) + "</dd></div>" +
        "<div><dt>Verified executable bid</dt><dd>" + (t.peakExecutableBid == null ? peak.label : moneyPremium(t.peakExecutableBid)) + "</dd></div>" +
        "<div><dt>Official Peak Opportunity</dt><dd>" + peak.label + "</dd></div>" +
        "<div><dt>Official verification</dt><dd>" + (t.peakVerification || "UNAVAILABLE — INSUFFICIENT DATA") + "</dd></div>" +
        "<div><dt>Charted peak after alert</dt><dd>" + (charted ? charted.label : "—") + "</dd></div>" +
        "<div><dt>Charted high / time</dt><dd>" + (charted && charted.high != null ? ("$" + Number(charted.high).toFixed(2) + (charted.at ? " · " + charted.at : "")) : "—") + "</dd></div>" +
        "<div><dt>Charted verification</dt><dd>" + (charted ? charted.verification : "—") + "</dd></div>" +
        "<div><dt>MAE before peak</dt><dd>" + (t.maeBeforePeak != null ? String(t.maeBeforePeak) : (sig.maeBeforePeak != null ? String(sig.maeBeforePeak) : "—")) + "</dd></div>" +
        "<div><dt>Time to peak</dt><dd>" + (t.timeToPeak || sig.timeToPeak || "—") + "</dd></div>" +
        "<div><dt>Peak vs managed invalidation</dt><dd>" + (t.peakVsManagedInvalidation || "—") + "</dd></div>" +
        "<div><dt>Peak day</dt><dd>" + (t.peakDay || sig.peakDay || "—") + "</dd></div></dl>" +
        (charted && charted.note ? "<p class=\"odte-charted-disc\">" + charted.note + "</p>" : "") +
        (t.indicativePeak && t.indicativePeak.note ? "<p>" + t.indicativePeak.note + "</p>" : "") +
        odteEvidenceHtml(t) +
        "</section><section><h3>All-or-nothing research model</h3>" +
        "<p>Hypothetical $1,000 fixed-notional research model. Not the model-account position size and not realized performance.</p>" +
        "<dl class=\"odte-card-grid\">" +
        "<div><dt>Notional</dt><dd>$1,000</dd></div>" +
        "<div><dt>Terminal exit time</dt><dd>" + (aon.terminalExitLabel || aon.terminalExitAt || "—") + "</dd></div>" +
        "<div><dt>Terminal value</dt><dd>" + (aon.terminalValue != null ? moneyPremium(aon.terminalValue) + (aon.status ? " · " + aon.status : "") : (aon.status || "—")) + "</dd></div>" +
        "<div><dt>% outcome</dt><dd>" + (aon.terminalPct != null ? aon.terminalPct + "%" : "—") + "</dd></div>" +
        "<div><dt>$ outcome</dt><dd>" + (aon.excludedFromOfficial ? "Not entered in official AON totals" : (aon.dollarOutcome != null ? odteMoneyInt(aon.dollarOutcome) : "—")) + "</dd></div>" +
        "<div><dt>Max possible loss</dt><dd>$1,000</dd></div></dl></section>" +
        "<section><h3>Managed execution model</h3><dl class=\"odte-card-grid\">" +
        "<div><dt>Model position size</dt><dd>" + (managed.modelPositionSize || t.modelPositionSize || "—") + "</dd></div>" +
        "<div><dt>Planned stop-loss amount</dt><dd>" + (managed.plannedStopLoss || t.plannedStopLoss || "—") + "</dd></div>" +
        "<div><dt>Maximum capital at risk</dt><dd>" + (t.maxCapitalAtRisk || "—") + "</dd></div>" +
        "<div><dt>Scales</dt><dd>" + (managed.scales || "—") + "</dd></div>" +
        "<div><dt>Modeled exit</dt><dd>" + (managed.modeledExit != null ? moneyPremium(managed.modeledExit) : "—") + "</dd></div>" +
        "<div><dt>% result</dt><dd>" + (managed.pctResult != null ? managed.pctResult + "%" : "—") + "</dd></div>" +
        "<div><dt>$ result</dt><dd>" + (managedDollar == null ? "—" : odteMoneyInt(managedDollar)) + "</dd></div>" +
        "<div><dt>Rule compliance</dt><dd>" + (managed.ruleCompliance || t.complianceLabel || "—") + "</dd></div>" +
        "<div><dt>Opportunity Capture Rate</dt><dd>" + (odteCaptureRate(t) != null ? odteCaptureRate(t).toFixed(0) + "%" : "—") + "</dd></div></dl>" +
        "<p><a href=\"#journal-" + (t.id || "") + "\">Open journal</a></p></section>";
      art.appendChild(dateP);
      art.appendChild(h);
      art.appendChild(mini);
      art.appendChild(peakLine);
      if (chartedLine) art.appendChild(chartedLine);
      art.appendChild(btn);
      art.appendChild(panel);
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
      recSpan.textContent = meta.officialRecord || meta.officialLabel || "DAILY RECORD";
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
      if (!btn.getAttribute("data-closed-label")) {
        btn.setAttribute("data-closed-label", btn.textContent || "VIEW DETAILS");
      }
      if (!btn.getAttribute("data-open-label")) {
        var closed = btn.getAttribute("data-closed-label") || "";
        btn.setAttribute("data-open-label", /FULL/i.test(closed) ? "HIDE FULL TRADE DETAILS" : "HIDE DETAILS");
      }
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("aria-controls");
        var panel = id ? document.getElementById(id) : null;
        if (!panel) return;
        var open = panel.hidden;
        panel.hidden = !open;
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        btn.textContent = open ? btn.getAttribute("data-open-label") : btn.getAttribute("data-closed-label");
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

  function historyPath() {
    return dataAttr("data-history", "data/history/index.json");
  }

  function stateClassName(flag) {
    var key = String(flag || "").toUpperCase();
    if (key === "LEADER") return "state leader";
    if (key === "HOLD") return "state confirmed";
    if (key === "SKIP") return "state skip";
    if (key === "NEUTRAL") return "state neutral";
    if (key === "WATCH") return "state watch";
    if (key === "WEAKENING") return "state weakening";
    return "state";
  }

  function signedNum(value, suffix) {
    if (value == null || value === "") return "—";
    var n = typeof value === "number" ? value : Number(value);
    if (isNaN(n)) return String(value);
    var core = (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n);
    return suffix ? core + suffix : core;
  }

  function locDisplay(row) {
    if (row && row.locationUnavailable) return "—";
    if (!row || row.vs50 == null || row.vs50 === "") return "—";
    return signedNum(row.vs50, "% vs 50d");
  }

  function lastDisplay(value) {
    if (value == null || value === "") return "—";
    var n = typeof value === "number" ? value : Number(value);
    if (isNaN(n)) return String(value);
    return n.toFixed(2);
  }

  function changeClass(value) {
    var n = typeof value === "number" ? value : Number(value);
    if (isNaN(n) || n === 0) return "col-chg mono";
    return n > 0 ? "col-chg mono chg-up" : "col-chg mono chg-dn";
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderWeekBoard(rows, opts) {
    var showChange = opts && opts.showChange;
    var showLast = opts && opts.showLast;
    var wrap = el("div", "board-wrap");
    var table = el("table", "board");
    var cap = document.createElement("caption");
    cap.className = "visually-hidden";
    cap.textContent = (opts && opts.caption) || "Sector rankings";
    table.appendChild(cap);
    var thead = document.createElement("thead");
    var hr = document.createElement("tr");
    ["Rank", "Sector", "ETF"].forEach(function (label, i) {
      var th = document.createElement("th");
      th.scope = "col";
      th.className = i === 0 ? "col-rank" : i === 1 ? "col-sector" : "col-etf";
      th.textContent = label;
      hr.appendChild(th);
    });
    if (showLast) {
      var thL = document.createElement("th");
      thL.scope = "col";
      thL.className = "col-last";
      thL.textContent = "Last";
      hr.appendChild(thL);
    }
    ["Score", "13W RS", "Location", "State"].forEach(function (label, i) {
      var th = document.createElement("th");
      th.scope = "col";
      th.className = ["col-score", "col-rs", "col-loc", "col-state"][i];
      th.textContent = label;
      hr.appendChild(th);
    });
    if (showChange) {
      var thC = document.createElement("th");
      thC.scope = "col";
      thC.className = "col-chg";
      thC.textContent = "Δ vs 28 Aug";
      hr.appendChild(thC);
    }
    thead.appendChild(hr);
    table.appendChild(thead);
    var tbody = document.createElement("tbody");
    (rows || []).forEach(function (row) {
      var tr = document.createElement("tr");
      addCell(tr, String(row.rank).padStart(2, "0"), "col-rank mono");
      addCell(tr, row.name || "—", "col-sector");
      addCell(tr, row.ticker || "—", "col-etf mono");
      if (showLast) addCell(tr, lastDisplay(row.last), "col-last mono");
      addCell(tr, row.score == null ? "—" : String(row.score), "col-score mono");
      addCell(tr, signedNum(row.rs13w, " pp"), "col-rs mono");
      addCell(tr, locDisplay(row), "col-loc mono");
      var st = document.createElement("td");
      st.className = "col-state";
      var span = document.createElement("span");
      span.className = stateClassName(row.flag);
      span.textContent = row.flag || "—";
      st.appendChild(span);
      tr.appendChild(st);
      if (showChange) {
        var chg = row.changeVsPrior;
        addCell(tr, chg == null ? "—" : signedNum(chg), changeClass(chg));
      }
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  function renderSwingPacket(packet) {
    var box = document.createElement("div");
    if (!packet) return box;
    box.appendChild(el("h3", null, "Swing packet"));
    if (packet.status) box.appendChild(el("p", "asof", packet.status));
    var grid = el("div", "packet-grid");
    (packet.structures || []).forEach(function (s) {
      var art = el("article", "r-card packet");
      if (s.label) art.appendChild(el("p", "packet-kicker", s.label));
      art.appendChild(el("h4", null, s.structure || "Structure"));
      if (s.geometry) art.appendChild(el("p", null, s.geometry));
      var debitText = s.debit == null || s.debit === ""
        ? (s.debitLabel || "ORDER DETAILS PUBLISH MONDAY AFTER OPEN")
        : moneyDebit(s.debit);
      art.appendChild(el("p", s.debit == null || s.debit === "" ? "debit-pending" : "mono", debitText));
      if (s.brokerTranslation) art.appendChild(el("p", "broker-line", s.brokerTranslation));
      if (s.notes) art.appendChild(el("p", "max", s.notes));
      else if (packet.disclosure) art.appendChild(el("p", "max", packet.disclosure));
      grid.appendChild(art);
    });
    box.appendChild(grid);
    if (packet.priorOpen && packet.priorOpen.note) {
      box.appendChild(el("p", "footnote", (packet.priorOpen.id || "Prior open") + " · " + packet.priorOpen.note));
    }
    return box;
  }

  function renderHistoryCard(week, current) {
    var art = el("article", "week-card");
    art.id = week.asOf || "";
    art.appendChild(el("p", "kicker", current ? "Current · Friday lock" : "Prior week · immutable"));
    art.appendChild(el("h2", null, week.asOfLabel || week.asOf || "Friday map"));
    if (week.headline) art.appendChild(el("p", "week-headline", week.headline));
    if (week.story) art.appendChild(el("p", null, week.story));
    if (week.source || week.sourceNote) {
      art.appendChild(el("p", "footnote", [week.source, week.sourceNote].filter(Boolean).join(" ")));
    }
    var details = document.createElement("details");
    if (current) details.open = true;
    var summary = document.createElement("summary");
    summary.textContent = "Full board and swing packet";
    details.appendChild(summary);
    details.appendChild(renderWeekBoard(week.rows || [], {
      caption: (week.asOfLabel || "") + " sector rankings",
      showChange: (week.rows || []).some(function (r) { return r.changeVsPrior != null; }),
      showLast: (week.rows || []).some(function (r) { return r.last != null; })
    }));
    if (week.swingPacket) details.appendChild(renderSwingPacket(week.swingPacket));
    art.appendChild(details);
    return art;
  }

  function applyRankingsHash() {
    var hash = (location.hash || "").replace(/^#/, "");
    if (!hash) return;
    var card = document.getElementById(hash);
    if (!card) return;
    var details = card.querySelector("details");
    if (details) details.open = true;
    if (typeof card.scrollIntoView === "function") {
      card.scrollIntoView({ block: "start" });
    }
  }

  function loadRankingsArchive() {
    var root = $("rankings-archive");
    if (!root) return;
    window.addEventListener("hashchange", applyRankingsHash);
    applyRankingsHash();
    fetch(historyPath(), { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("history " + res.status);
        return res.json();
      })
      .then(function (index) {
        var weeks = (index && index.weeks) || [];
        var base = historyPath().replace(/index\.json$/, "");
        return Promise.all(weeks.map(function (meta) {
          return fetch(base + meta.file, { cache: "no-store" })
            .then(function (res) {
              if (!res.ok) throw new Error(meta.file + " " + res.status);
              return res.json();
            })
            .then(function (card) {
              card.current = !!meta.current || meta.asOf === index.current;
              return card;
            });
        }));
      })
      .then(function (cards) {
        if (!cards || !cards.length) return;
        root.textContent = "";
        cards.forEach(function (card) {
          root.appendChild(renderHistoryCard(card, card.current));
        });
        applyRankingsHash();
      })
      .catch(function () {
        applyRankingsHash();
      });
  }

  bindAllCaptures();
  bindFullSetup();
  bindNav();
  bindBoard();
  bindEtStamps();
  loadBlotter();
  loadOdteBlotter();
  loadRankingsArchive();

  if ($("trade") && alreadyUnlocked()) {
    persistUnlock();
    revealTrade();
  }
})();
