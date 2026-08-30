/* Sector Selector — board + blotter from board.json. Waitlist in localStorage. */
(function () {
  "use strict";

  var WAIT_KEY = "sectorselector.waitlist";
  var RS_SCALE = 15; // bar scale for ±13.1-ish 13w RS

  function $(id) {
    return document.getElementById(id);
  }

  function fmtPrice(n) {
    if (n == null || Number.isNaN(n)) return "—";
    return Number(n).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function fmtSigned(n, digits) {
    if (n == null || n === "" || Number.isNaN(Number(n))) return null;
    var v = Number(n);
    var abs = Math.abs(v).toFixed(digits);
    if (v > 0) return "+" + abs;
    if (v < 0) return "\u2212" + abs; // minus sign, not hyphen
    return (0).toFixed(digits);
  }

  function clsFor(n) {
    if (n == null || Number.isNaN(Number(n))) return "na";
    var v = Number(n);
    if (v > 0) return "pos";
    if (v < 0) return "neg";
    return "flat";
  }

  function cellNum(n, digits, suffix) {
    var signed = fmtSigned(n, digits);
    if (signed == null) return '<span class="num na">—</span>';
    return '<span class="num ' + clsFor(n) + '">' + signed + (suffix || "") + "</span>";
  }

  function rsBar(n) {
    if (n == null || Number.isNaN(Number(n))) return "";
    var v = Number(n);
    var pct = Math.round(Math.min(50, (Math.abs(v) / RS_SCALE) * 50) * 10) / 10;
    var side = v > 0 ? "pos" : v < 0 ? "neg" : "flat";
    var style =
      v >= 0
        ? "width:" + pct + "%;left:50%"
        : "width:" + pct + "%;right:50%;left:auto";
    return (
      '<span class="rs-bar" aria-hidden="true"><i class="' +
      side +
      '" style="' +
      style +
      '"></i></span>'
    );
  }

  function cash(ticker) {
    return "$" + ticker;
  }

  function compare(a, b, key, dir) {
    var av = a[key];
    var bv = b[key];
    var aNull = av == null || av === "";
    var bNull = bv == null || bv === "";
    if (aNull && bNull) return 0;
    if (aNull) return 1;
    if (bNull) return -1;
    if (typeof av === "string") {
      var c = av.localeCompare(bv);
      return dir === "asc" ? c : -c;
    }
    var d = Number(av) - Number(bv);
    return dir === "asc" ? d : -d;
  }

  function sortRows(rows, key, dir) {
    var sectors = rows.filter(function (r) {
      return r.role !== "bench";
    });
    var bench = rows.filter(function (r) {
      return r.role === "bench";
    });
    sectors.sort(function (a, b) {
      return compare(a, b, key, dir);
    });
    return sectors.concat(bench);
  }

  function roleTag(row) {
    if (row.role === "ticket") return '<span class="role-tag">ticket</span>';
    if (row.role === "hold") return '<span class="role-tag">hold</span>';
    if (row.role === "skip") return '<span class="role-tag">skip</span>';
    if (row.role === "bench") return '<span class="role-tag">bench</span>';
    return "";
  }

  function renderRow(row) {
    var role = row.role || "";
    var rank =
      row.rank == null
        ? '<span class="num na">—</span>'
        : '<span class="rank">' + row.rank + "</span>";
    var regime = row.regime
      ? '<span class="regime ' + row.regime + '">' + row.regime + "</span>"
      : '<span class="num na">—</span>';
    var title = row.note ? ' title="' + String(row.note).replace(/"/g, "&quot;") + '"' : "";
    return (
      "<tr class=\"" +
      role +
      "\"" +
      title +
      ">" +
      "<td>" +
      rank +
      "</td>" +
      '<td class="col-ticker"><span class="cash">' +
      cash(row.ticker) +
      "</span>" +
      roleTag(row) +
      '<span class="sector">' +
      (row.name || "") +
      "</span></td>" +
      '<td><span class="rs-cell">' +
      rsBar(row.rs13w) +
      cellNum(row.rs13w, 1) +
      "</span></td>" +
      '<td class="num">' +
      fmtPrice(row.last) +
      "</td>" +
      "<td>" +
      cellNum(row.chg1m, 2, "%") +
      "</td>" +
      "<td>" +
      cellNum(row.rs6m, 2) +
      "</td>" +
      "<td>" +
      cellNum(row.vs50, 1, "%") +
      "</td>" +
      "<td>" +
      cellNum(row.vs200, 1, "%") +
      "</td>" +
      "<td>" +
      regime +
      "</td>" +
      "</tr>"
    );
  }

  function renderRead(items) {
    var el = $("read");
    if (!el || !items || !items.length) return;
    el.innerHTML = items
      .map(function (item) {
        return (
          '<span class="chip ' +
          (item.kind || "") +
          '"><span class="cash">' +
          cash(item.ticker) +
          "</span> " +
          item.text +
          "</span>"
        );
      })
      .join("");
  }

  function renderBlotter(blotter) {
    if (!blotter) return;
    var badge = $("sim-badge");
    var cap = $("blotter-caption");
    var list = $("blotter-list");
    if (badge && blotter.badge) badge.textContent = blotter.badge;
    if (cap && blotter.caption) cap.textContent = blotter.caption;
    if (!list) return;
    list.innerHTML = (blotter.tickets || [])
      .map(function (t) {
        var debit =
          t.debit == null
            ? '<p class="dl-val tbd">' + (t.debitLabel || "TBD") + "</p>"
            : '<p class="dl-val">' + t.debit + "</p>";
        var result =
          t.result == null
            ? '<p class="dl-val tbd">' + (t.resultLabel || "—") + "</p>"
            : '<p class="dl-val">' + t.result + "</p>";
        return (
          '<article class="ticket-card">' +
          "<div><p class=\"dl-label\">Name</p><p class=\"dl-val\"><span class=\"cash\">" +
          cash(t.ticker) +
          "</span> " +
          (t.name || "") +
          "</p></div>" +
          "<div><p class=\"dl-label\">Structure</p><p class=\"dl-val\">" +
          t.structure +
          "</p></div>" +
          "<div><p class=\"dl-label\">Debit / max loss</p>" +
          debit +
          '<p class="dl-val" style="color:var(--ivory-3);font-size:0.85rem;margin-top:0.2rem">' +
          (t.maxLoss || "The debit") +
          "</p></div>" +
          "<div><p class=\"dl-label\">Opened</p><p class=\"dl-val\">" +
          t.openedLabel +
          '</p><p class="status-open">' +
          t.status +
          "</p></div>" +
          "<div><p class=\"dl-label\">Result</p>" +
          result +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  var state = {
    rows: [],
    sortKey: "rs13w",
    sortDir: "desc"
  };

  function paint() {
    var body = $("board-body");
    if (!body) return;
    var sorted = sortRows(state.rows, state.sortKey, state.sortDir);
    body.innerHTML = sorted.map(renderRow).join("");
    var heads = document.querySelectorAll("#board-table thead th[data-key]");
    heads.forEach(function (th) {
      var key = th.getAttribute("data-key");
      if (key === state.sortKey) th.setAttribute("aria-sort", state.sortDir === "desc" ? "descending" : "ascending");
      else th.removeAttribute("aria-sort");
    });
  }

  function bindSort() {
    var table = $("board-table");
    if (!table) return;
    table.querySelectorAll("thead th[data-key]").forEach(function (th) {
      th.addEventListener("click", function () {
        var key = th.getAttribute("data-key");
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === "desc" ? "asc" : "desc";
        } else {
          state.sortKey = key;
          state.sortDir = key === "ticker" || key === "regime" ? "asc" : "desc";
        }
        paint();
      });
    });
  }

  function loadBoard() {
    return fetch("board.json", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("board.json " + r.status);
        return r.json();
      })
      .catch(function () {
        var seed = $("board-seed");
        if (seed && seed.textContent.trim()) return JSON.parse(seed.textContent);
        throw new Error("No board data");
      });
  }

  function validEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }

  function readList() {
    try {
      var raw = localStorage.getItem(WAIT_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function writeList(list) {
    localStorage.setItem(WAIT_KEY, JSON.stringify(list));
  }

  function alreadyOn(email) {
    var needle = email.toLowerCase();
    return readList().some(function (row) {
      return row.email && row.email.toLowerCase() === needle;
    });
  }

  function bindWaitlist() {
    var form = $("wait-form");
    var input = $("wait-email");
    var msg = $("wait-msg");
    if (!form || !input || !msg) return;

    var existing = readList();
    if (existing.length) {
      msg.className = "wait-msg ok";
      msg.textContent = "You’re on the list on this browser. One email after Friday’s close — when a host is wired. Nothing leaves this device.";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = (input.value || "").trim();
      msg.className = "wait-msg";
      if (!validEmail(email)) {
        msg.className = "wait-msg err";
        msg.textContent = "Need a real email — stored here, not sent anywhere.";
        input.focus();
        return;
      }
      if (alreadyOn(email)) {
        msg.className = "wait-msg ok";
        msg.textContent = "Already on the waitlist on this browser. Thank you.";
        form.hidden = true;
        return;
      }
      var list = readList();
      list.push({ email: email, ts: new Date().toISOString() });
      try {
        writeList(list);
      } catch (err) {
        msg.className = "wait-msg err";
        msg.textContent = "Could not store the address in this browser.";
        return;
      }
      form.hidden = true;
      msg.className = "wait-msg ok";
      msg.textContent =
        "Thank you. You’re on the waitlist on this device. No Discord. No webinar. One note after Friday’s close — when we send from a real host, not from this page.";
    });
  }

  bindWaitlist();
  bindSort();

  loadBoard()
    .then(function (data) {
      state.rows = data.rows || [];
      state.sortKey = data.sortDefault || "rs13w";
      state.sortDir = data.sortDir || "desc";
      if (data.asOfLabel && $("asof")) {
        $("asof").textContent = "As of " + data.asOfLabel;
      }
      renderRead(data.read);
      renderBlotter(data.blotter);
      paint();
    })
    .catch(function (err) {
      var body = $("board-body");
      if (body) {
        body.innerHTML =
          '<tr><td colspan="9">Could not load board.json. Open this folder via any static host, or keep board-seed in the page.</td></tr>';
      }
      console.warn(err);
    });
})();
