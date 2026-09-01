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
LOCK = Path(__file__).resolve().parent / "weekly-map" / "lock-2026-08-28.json"
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
    return errs


def main() -> int:
    problems = scan() + check_lock()
    if problems:
        print("public copy guard failed:")
        for item in problems:
            print(f"  {item}")
        return 1
    print("public copy guard passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
