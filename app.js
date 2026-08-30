/* Sector Selector V1 — board sort + FormSubmit return unlock. */
(function () {
  "use strict";

  function v1Score(rs13w, vs50) {
    var vs = vs50 == null || vs50 === "" ? 0 : Number(vs50);
    var raw = 50 + 3.2 * Number(rs13w) + 0.6 * vs;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }

  function $(id) {
    return document.getElementById(id);
  }

  function setNextUrls() {
    var next = window.location.origin + window.location.pathname.replace(/index\.html$/, "") + "#thanks";
    document.querySelectorAll('input[name="_next"]').forEach(function (el) {
      el.value = next;
    });
  }

  function unlockFromReturn() {
    var hash = (window.location.hash || "").replace("#", "");
    if (hash === "thanks" || hash === "unlocked") {
      document.body.classList.add("is-unlocked");
      try {
        sessionStorage.setItem("sectorselector.unlocked", "1");
      } catch (e) {}
      var banner = $("thanks");
      if (banner && typeof banner.focus === "function") {
        banner.focus();
      }
      var gate = $("gate");
      if (gate) {
        gate.scrollIntoView({ block: "start" });
      }
    } else {
      try {
        if (sessionStorage.getItem("sectorselector.unlocked") === "1") {
          document.body.classList.add("is-unlocked");
        }
      } catch (e) {}
    }
  }

  function bindForms() {
    document.querySelectorAll("form.capture").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        var email = form.querySelector('input[type="email"]');
        if (!email) return;
        var value = (email.value || "").trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          e.preventDefault();
          email.focus();
        }
      });
    });
  }

  function fmtSigned(n, digits, suffix) {
    if (n == null || n === "" || Number.isNaN(Number(n))) return null;
    var v = Number(n);
    var abs = Math.abs(v).toFixed(digits);
    var sign = v > 0 ? "+" : v < 0 ? "\u2212" : "";
    return sign + abs + (suffix || "");
  }

  function clsFor(n) {
    if (n == null || Number.isNaN(Number(n))) return "na";
    var v = Number(n);
    if (v > 0) return "pos";
    if (v < 0) return "neg";
    return "flat";
  }

  function cellNum(n, digits, suffix) {
    var signed = fmtSigned(n, digits, suffix);
    if (signed == null) return '<span class="num na">\u2014</span>';
    return '<span class="num ' + clsFor(n) + '">' + signed + "</span>";
  }

  function fmtPrice(n) {
    if (n == null || Number.isNaN(n)) return "\u2014";
    return Number(n).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function statusClass(label) {
    if (label === "LEADER") return "LEADER";
    if (label === "ROTATION WATCH") return "WATCH";
    if (label === "NEUTRAL") return "NEUTRAL";
    if (label === "WEAKENING") return "WEAKENING";
    if (label === "LAGGING") return "LAGGING";
    if (label === "BENCH") return "BENCH";
    return "";
  }

  function rowClass(row) {
    if (row.role === "bench") return "bench";
    if (row.role === "watch" || row.label === "ROTATION WATCH") return "watch";
    if (row.role === "leader" || row.label === "LEADER") return "leader";
    if (row.role === "skip") return "skip";
    return "";
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
      var primary = compare(a, b, key, dir);
      if (primary !== 0) return primary;
      return compare(a, b, "rs13w", "desc");
    });
    return sectors.concat(bench);
  }

  function renderRow(row) {
    var score =
      row.role === "bench"
        ? '<span class="num na">\u2014</span>'
        : '<span class="score-num">' + v1Score(row.rs13w, row.vs50) + "</span>";
    var rank =
      row.rank == null
        ? '<span class="num na">\u2014</span>'
        : '<span class="rank">' + row.rank + "</span>";
    var label = row.label || "";
    var displayLabel = row.ticker === "XLB" ? "NEUTRAL / SKIP" : label;
    var title = row.note ? ' title="' + String(row.note).replace(/"/g, "&quot;") + '"' : "";
    return (
      '<tr class="' +
      rowClass(row) +
      '"' +
      title +
      ">" +
      "<td>" +
      rank +
      "</td>" +
      '<td class="col-ticker"><span class="cash">' +
      row.ticker +
      '</span><span class="sector">' +
      (row.name || "") +
      (row.role === "bench" ? " · bench" : "") +
      "</span></td>" +
      "<td>" +
      score +
      "</td>" +
      "<td>" +
      cellNum(row.rs13w, 1) +
      "</td>" +
      "<td>" +
      cellNum(row.vs50, 1, "%") +
      "</td>" +
      "<td>" +
      cellNum(row.ret6m, 2, "%") +
      "</td>" +
      '<td class="num">' +
      fmtPrice(row.last) +
      "</td>" +
      '<td><span class="status ' +
      statusClass(label) +
      '">' +
      displayLabel +
      "</span></td>" +
      "</tr>"
    );
  }

  var state = {
    rows: [],
    sortKey: "score",
    sortDir: "desc"
  };

  function paint() {
    var body = $("board-body");
    if (!body || !state.rows.length) return;
    body.innerHTML = sortRows(state.rows, state.sortKey, state.sortDir)
      .map(renderRow)
      .join("");
    document.querySelectorAll("#board-table thead th[data-key]").forEach(function (th) {
      var key = th.getAttribute("data-key");
      if (key === state.sortKey) {
        th.setAttribute("aria-sort", state.sortDir === "desc" ? "descending" : "ascending");
      } else {
        th.removeAttribute("aria-sort");
      }
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
          state.sortDir = key === "ticker" || key === "label" ? "asc" : "desc";
        }
        paint();
      });
    });
  }

  function hydrate(data) {
    (data.rows || []).forEach(function (row) {
      if (row.role !== "bench") {
        row.score = v1Score(row.rs13w, row.vs50);
      }
    });
    state.rows = data.rows || [];
    state.sortKey = data.sortDefault || "score";
    state.sortDir = data.sortDir || "desc";
    if (data.asOfLabel && $("asof")) {
      $("asof").textContent = "AS OF " + String(data.asOfLabel).toUpperCase();
    }
    paint();
  }

  setNextUrls();
  bindForms();
  unlockFromReturn();
  window.addEventListener("hashchange", unlockFromReturn);
  bindSort();

  fetch("board.json", { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error("board.json " + r.status);
      return r.json();
    })
    .then(hydrate)
    .catch(function () {
      /* Static table already in the document. */
    });
})();
