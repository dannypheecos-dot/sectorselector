#!/usr/bin/env bash
# Static ship gates for the product-architecture pass.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
fail=0

ok() { echo "OK  $1"; }
bad() { echo "FAIL $1"; fail=1; }

KIT='https://app.kit.com/forms/9861437/subscriptions'
if grep -R --include='*.html' -l 'class="capture"' . | grep -v './site/' >/dev/null; then
  while IFS= read -r f; do
    if ! grep -q "$KIT" "$f"; then
      bad "Kit action missing in $f"
    fi
  done < <(grep -R --include='*.html' -l 'class="capture"' . | grep -v './site/')
  ok "Kit form action unchanged ($KIT)"
fi

for url in \
  research/index.html \
  research/the-print-was-zero.html \
  research/larak-jordan.html \
  research/hormuz-monday.html \
  research/spy-opex-rolloff.html \
  research/regime-robustness.html; do
  if [[ -f "$url" ]]; then ok "research file present $url"; else bad "missing $url"; fi
done

for needle in 'XLV' '170/175' '$2.43' '$243' '95/100' 'Oct 16'; do
  if grep -q "$needle" index.html; then ok "XLV card still has $needle"; else bad "XLV card missing $needle"; fi
done

if grep -qi "Today.s Rankings" index.html rankings/index.html; then
  bad "Found Today’s Rankings label"
else
  ok "No Today’s Rankings label"
fi

if grep -q "As of Friday 28 Aug 2026 close" index.html; then
  ok "Homepage timestamp exact"
else
  bad "Homepage timestamp missing"
fi

python3 - <<'PY'
import json, sys
from pathlib import Path
snap = json.loads(Path("data/rankings/2026-08-28.json").read_text())
expect = [
  (1,"XLV","Health Care",95,"LEADER"),
  (2,"XLF","Financials",87,"LEADER"),
  (3,"XLE","Energy",87,"CONFIRMED"),
  (4,"XLB","Materials",59,"SKIP"),
  (5,"XLP","Consumer Staples",56,"NEUTRAL"),
  (6,"XLI","Industrials",50,"WEAKENING"),
  (7,"XLRE","Real Estate",49,"WEAKENING"),
  (8,"XLC","Communication Services",39,"WATCH"),
  (9,"XLK","Technology",36,"SKIP"),
  (10,"XLY","Consumer Discretionary",35,"WEAKENING"),
  (11,"XLU","Utilities",31,"WEAKENING"),
]
rows = snap["sectors"]
if len(rows) != 11:
    print("FAIL snapshot does not have 11 sectors")
    sys.exit(1)
for i, exp in enumerate(expect):
    r = rows[i]
    got = (r["rank"], r["ticker"], r["name"], r["score"], r["status"])
    if got != exp:
        print("FAIL snapshot row", i+1, "got", got, "want", exp)
        sys.exit(1)
    if r.get("rotationScore") is not None:
        print("FAIL invented rotationScore on", r["ticker"])
        sys.exit(1)
    if r.get("change") is not None:
        print("FAIL invented change on", r["ticker"])
        sys.exit(1)
if not snap.get("immutable"):
    print("FAIL snapshot not marked immutable")
    sys.exit(1)
hist = json.loads(Path("data/eighty-plus/history.json").read_text())
e = hist["entries"][0]
if e["kind"] != "demo" or e["live"] is not False:
    print("FAIL 80+ first row is not a demo")
    sys.exit(1)
pro = json.loads(Path("data/pro.json").read_text())
if pro.get("billingEnabled") or pro.get("priceMonthly") != 97:
    print("FAIL pro config")
    sys.exit(1)
print("OK  verified snapshot scores/states + demo 80+ + pro config")
PY

if grep -q "DEMO / SAMPLE — NOT A LIVE SIGNAL" pro/sample/index.html pro/index.html index.html; then
  ok "Demo 80+ labeled on teaser + sample + home"
else
  bad "Demo 80+ label missing"
fi

if grep -R --include='*.html' -n -E 'Tanuki|TanukiTrade|GEX Live|Danny Phee|danny-phee|@gmail.com' \
  index.html rankings why-sectors pro data >/dev/null; then
  bad "Forbidden public names in new copy"
else
  ok "New copy avoids forbidden names"
fi

if grep -q 'stripe' pro/index.html app.js; then
  bad "Stripe mentioned in live checkout path"
else
  ok "No Stripe checkout wiring"
fi

echo
if [[ "$fail" -ne 0 ]]; then
  echo "SHIP GATES FAILED"
  exit 1
fi
echo "SHIP GATES PASSED"
