#!/usr/bin/env python3
"""Fail if public Pages copy reprints engine internals.

Needles are assembled at runtime so this file does not store a recipe.
SVG compass path numbers are drawing, not weights, and are not scanned.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEEKLY = Path(__file__).resolve().parent / "weekly-map"
LOCKS = sorted(WEEKLY.glob("lock-*.json"))
LOCK = LOCKS[-1] if LOCKS else WEEKLY / "lock-2026-08-28.json"
HISTORY_DIR = ROOT / "data" / "history"
AUG28_LOCK = {
    "asOf": "2026-08-28",
    "rows": [
        {"ticker": "XLV", "rank": 1, "score": 95, "state": "LEADER"},
        {"ticker": "XLF", "rank": 2, "score": 87, "state": "LEADER"},
        {"ticker": "XLE", "rank": 3, "score": 87, "state": "HOLD"},
        {"ticker": "XLB", "rank": 4, "score": 59, "state": "SKIP"},
        {"ticker": "XLP", "rank": 5, "score": 56, "state": "NEUTRAL"},
        {"ticker": "XLI", "rank": 6, "score": 50, "state": "WEAKENING"},
        {"ticker": "XLRE", "rank": 7, "score": 49, "state": "WEAKENING"},
        {"ticker": "XLC", "rank": 8, "score": 39, "state": "WATCH"},
        {"ticker": "XLK", "rank": 9, "score": 36, "state": "SKIP"},
        {"ticker": "XLY", "rank": 10, "score": 35, "state": "WEAKENING"},
        {"ticker": "XLU", "rank": 11, "score": 31, "state": "WEAKENING"},
    ],
}
SELF = Path(__file__).resolve()

PUBLIC_SUFFIXES = {".html", ".json", ".js", ".md"}
SKIP_DIR_NAMES = {".git", ".github", "node_modules"}


def needles() -> list[str]:
    times = "\u00d7"
    return [
        "clip" + "(" + "round" + "(" + "50",
        "3.2" + times + "rs13w",
        "3.2" + "*" + "rs13w",
        "63" + "-" + "session",
        "94" + "." + "62",
        "location term" + " = " + "0",
        "HOLD" + " #" + "3",
        "top two" + " only",
        "vs50d uses" + " 0",
        "top one or two",
        "8/11 above 50d",
        "Rule is top two",
        "rule is top two",
    ]


def public_files() -> list[Path]:
    out: list[Path] = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if path.resolve() == SELF:
            continue
        if any(part in SKIP_DIR_NAMES for part in path.parts):
            continue
        if path.suffix.lower() not in PUBLIC_SUFFIXES:
            continue
        out.append(path)
    return sorted(out)


def svg_drawing_only(line: str, hit: str) -> bool:
    if "3.2" not in hit:
        return False
    stripped = line.strip()
    return stripped.startswith("<path") or stripped.startswith("<circle")


def scan() -> list[str]:
    hits: list[str] = []
    banned = needles()
    for path in public_files():
        text = path.read_text(encoding="utf-8", errors="replace")
        rel = path.relative_to(ROOT).as_posix()
        for i, line in enumerate(text.splitlines(), 1):
            for needle in banned:
                if needle in line and not svg_drawing_only(line, needle):
                    hits.append(f"{rel}:{i}: public copy leak")
    return hits


def _no_formula(obj: object, label: str, errs: list[str]) -> None:
    if isinstance(obj, dict):
        for key, val in obj.items():
            if key in ("formula", "formulaNote", "raw"):
                errs.append(f"{label}: must not ship {key}")
            _no_formula(val, label, errs)
    elif isinstance(obj, list):
        for item in obj:
            _no_formula(item, label, errs)


def check_lock() -> list[str]:
    errs: list[str] = []
    lock = json.loads(LOCK.read_text())
    board = json.loads((ROOT / "board.json").read_text())
    if board.get("asOf") != lock.get("asOf"):
        errs.append("board.json asOf does not match locked week outputs")
    lock_rows = lock.get("rows") or []
    board_rows = board.get("rows") or []
    if len(lock_rows) != len(board_rows):
        errs.append("board.json row count does not match locked week outputs")
        return errs
    for locked, row in zip(lock_rows, board_rows):
        ticker = locked.get("ticker")
        if row.get("ticker") != ticker:
            errs.append(f"{ticker}: ticker mismatch")
        if row.get("rank") != locked.get("rank"):
            errs.append(f"{ticker}: rank mismatch")
        if row.get("score") != locked.get("score"):
            errs.append(f"{ticker}: score mismatch")
        if row.get("flag") != locked.get("state"):
            errs.append(f"{ticker}: state mismatch")
        if "raw" in row:
            errs.append(f"{ticker}: raw key must not ship")
        if "formula" in row:
            errs.append(f"{ticker}: formula key must not ship")
    for banned in ("formula", "formulaNote"):
        if banned in board:
            errs.append(f"board.json must not ship {banned}")
    _no_formula(board, "board.json", errs)
    return errs


def check_history() -> list[str]:
    errs: list[str] = []
    index_path = HISTORY_DIR / "index.json"
    if not index_path.exists():
        errs.append("data/history/index.json missing")
        return errs
    index = json.loads(index_path.read_text())
    weeks = index.get("weeks") or []
    as_ofs = [w.get("asOf") for w in weeks]
    if "2026-08-28" not in as_ofs:
        errs.append("history index dropped 2026-08-28")
    if "2026-09-04" not in as_ofs:
        errs.append("history index missing 2026-09-04")
    if as_ofs and as_ofs != sorted(as_ofs, reverse=True):
        errs.append("history index must list weeks newest-first")
    prior = HISTORY_DIR / "2026-08-28.json"
    if not prior.exists():
        errs.append("data/history/2026-08-28.json missing")
        return errs
    card = json.loads(prior.read_text())
    if card.get("asOf") != AUG28_LOCK["asOf"]:
        errs.append("2026-08-28 history asOf was rewritten")
    rows = card.get("rows") or []
    if len(rows) != len(AUG28_LOCK["rows"]):
        errs.append("2026-08-28 history row count was rewritten")
        return errs
    for locked, row in zip(AUG28_LOCK["rows"], rows):
        ticker = locked["ticker"]
        if row.get("ticker") != ticker or row.get("rank") != locked["rank"]:
            errs.append(f"2026-08-28 {ticker}: rank/ticker rewritten")
        if row.get("score") != locked["score"]:
            errs.append(f"2026-08-28 {ticker}: score rewritten")
        if row.get("flag") != locked["state"]:
            errs.append(f"2026-08-28 {ticker}: state rewritten")
    for week in weeks:
        path = HISTORY_DIR / week["file"]
        if not path.exists():
            errs.append(f"history file missing: {week['file']}")
            continue
        payload = json.loads(path.read_text())
        _no_formula(payload, path.as_posix(), errs)
    return errs


def main() -> int:
    problems = scan() + check_lock() + check_history()
    if problems:
        print("public copy guard failed:")
        for item in problems:
            print(f"  {item}")
        return 1
    print("public copy guard passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
