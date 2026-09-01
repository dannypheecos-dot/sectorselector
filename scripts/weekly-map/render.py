#!/usr/bin/env python3
"""Friday-close weekly map card. Layout is locked. Recut PNG on Friday close only."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
WEEK = Path(__file__).with_name("week.json")
FOX = ROOT / "brand" / "fox-mark-arrow.png"

BG = (16, 18, 20)
PANEL = (20, 23, 26)
LINE = (42, 48, 54)
TEXT = (230, 233, 231)
OFF = (244, 245, 243)
MUTED = (154, 163, 160)
DIM = (111, 120, 117)
MINT = (124, 255, 178)
HOLD = (90, 138, 96)
WATCH = (232, 176, 74)
WEAK = (196, 122, 74)
SKIP = (184, 92, 92)

FONT_DIR = Path("/usr/share/fonts/truetype/macos")
MONO_DIR = Path("/usr/share/fonts/truetype/jetbrains-mono")

STATE_COLOR = {
    "LEADER": MINT,
    "HOLD": HOLD,
    "NEUTRAL": MUTED,
    "WEAKENING": WEAK,
    "WATCH": WATCH,
    "SKIP": SKIP,
}


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_DIR / name), size)


def mono(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(MONO_DIR / name), size)


def wrap(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont, width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        trial = f"{cur} {word}".strip()
        if draw.textlength(trial, font=face) <= width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def draw_compass(base: Image.Image, cx: int, cy: int, r: int = 28) -> None:
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(18, 21, 20, 255), outline=MINT + (255,), width=3)
    inner = int(r * 0.56)
    d.ellipse((cx - inner, cy - inner, cx + inner, cy + inner), outline=(124, 255, 178, 90), width=1)
    needle = 9
    d.polygon([(cx, cy - r + 2), (cx + 4, cy - r + needle + 4), (cx, cy - r + needle), (cx - 4, cy - r + needle + 4)], fill=MINT + (255,))
    d.polygon([(cx, cy + r - 2), (cx - 4, cy + r - needle - 4), (cx, cy + r - needle), (cx + 4, cy + r - needle - 4)], fill=MINT + (255,))
    d.polygon([(cx + r - 2, cy), (cx + r - needle - 4, cy - 4), (cx + r - needle, cy), (cx + r - needle - 4, cy + 4)], fill=MINT + (255,))
    d.polygon([(cx - r + 2, cy), (cx - r + needle + 4, cy + 4), (cx - r + needle, cy), (cx - r + needle + 4, cy - 4)], fill=MINT + (255,))
    d.polygon([(cx, cy - int(r * 0.50)), (cx + 10, cy + 2), (cx, cy - 3), (cx - 10, cy + 2)], fill=(232, 235, 233, 255))
    d.polygon([(cx, cy + int(r * 0.50)), (cx - 10, cy - 2), (cx, cy + 3), (cx + 10, cy - 2)], fill=(58, 67, 64, 255))
    d.ellipse((cx - 4, cy - 4, cx + 4, cy + 4), fill=MINT + (255,))
    base.alpha_composite(layer)


def fox_watermark(size: tuple[int, int], box: tuple[int, int, int, int]) -> Image.Image:
    mark = Image.open(FOX).convert("RGBA")
    x0, y0, x1, y1 = box
    side = int(min(x1 - x0, y1 - y0) * 0.78)
    mark = mark.resize((side, side), Image.Resampling.LANCZOS)
    tinted = Image.new("RGBA", mark.size, (0, 0, 0, 0))
    px = mark.load()
    out = tinted.load()
    for y in range(mark.size[1]):
        for x in range(mark.size[0]):
            r, g, b, a = px[x, y]
            if a < 12:
                continue
            lum = (r + g + b) / 3
            # faint dark-green silhouette so a steal still carries SS
            alpha = int(min(a, 255) * (0.10 + lum / 2550))
            out[x, y] = (28, 52, 38, alpha)
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    ox = x0 + (x1 - x0 - side) // 2
    oy = y0 + (y1 - y0 - side) // 2
    layer.paste(tinted, (ox, oy), tinted)
    return layer.filter(ImageFilter.GaussianBlur(0.4))


def render(week: dict) -> Image.Image:
    w, h = int(week["width"]), int(week["height"])
    img = Image.new("RGBA", (w, h), BG + (255,))
    draw = ImageDraw.Draw(img)

    display = font("Inter-Bold.ttf", 54)
    body = font("Inter-Regular.ttf", 22)
    kicker = mono("JetBrainsMono-Medium.ttf", 16)
    colhead = mono("JetBrainsMono-Medium.ttf", 17)
    cell = font("Inter-Medium.ttf", 24)
    cell_mono = mono("JetBrainsMono-Medium.ttf", 23)
    score_f = mono("JetBrainsMono-Bold.ttf", 26)
    state_f = mono("JetBrainsMono-Bold.ttf", 18)

    pad = 56
    compass_x, compass_y = pad + 28, 78
    draw_compass(img, compass_x, compass_y, 28)
    draw.text((pad + 72, 50), week["title"], font=display, fill=OFF)

    sub_w = w - pad * 2
    sub_lines = wrap(draw, week["subtitle"], body, sub_w)
    sy = 122
    for line in sub_lines:
        draw.text((pad, sy), line, font=body, fill=MUTED)
        sy += 30

    table_top = sy + 28
    table_bottom = h - 168
    table_box = (pad, table_top, w - pad, table_bottom)
    draw.rounded_rectangle(table_box, radius=10, fill=PANEL, outline=LINE, width=1)
    img.alpha_composite(fox_watermark(img.size, table_box))
    draw = ImageDraw.Draw(img)

    draw.text((pad + 22, table_top + 18), week["tableKicker"], font=kicker, fill=DIM)

    cols = [
        ("RANK", 22, "left"),
        ("SECTOR", 110, "left"),
        ("ETF", 500, "left"),
        ("SCORE", 680, "right"),
        ("STATE", 968, "right"),
    ]
    head_y = table_top + 52
    for label, x, align in cols:
        if align == "right":
            tw = draw.textlength(label, font=colhead)
            draw.text((pad + x - tw, head_y), label, font=colhead, fill=DIM)
        else:
            draw.text((pad + x, head_y), label, font=colhead, fill=DIM)

    row_top = head_y + 36
    row_h = 78
    usable = table_bottom - 16 - row_top
    row_h = min(78, usable / max(len(week["rows"]), 1))

    for i, row in enumerate(week["rows"]):
        y = row_top + i * row_h
        if i % 2 == 0:
            draw.rectangle((pad + 8, y, w - pad - 8, y + row_h - 2), fill=(24, 28, 31, 160))
        cy = y + row_h / 2 - 14
        draw.text((pad + 22, cy), row["rank"], font=cell_mono, fill=MUTED)
        draw.text((pad + 110, cy), row["sector"], font=cell, fill=TEXT)
        draw.text((pad + 500, cy), row["etf"], font=cell_mono, fill=OFF)
        score = str(row["score"])
        sw = draw.textlength(score, font=score_f)
        draw.text((pad + 680 - sw, cy - 1), score, font=score_f, fill=MINT)
        state = (row.get("state") or "").strip()
        if state:
            color = STATE_COLOR.get(state, MUTED)
            tw = draw.textlength(state, font=state_f)
            draw.text((pad + 968 - tw, cy + 2), state, font=state_f, fill=color)

    foot_y = table_bottom + 22
    for line in wrap(draw, week["footer"], body, sub_w):
        draw.text((pad, foot_y), line, font=body, fill=OFF)
        foot_y += 30

    return img.convert("RGB")


def main() -> None:
    week = json.loads(WEEK.read_text())
    out = ROOT / week["output"]
    out.parent.mkdir(parents=True, exist_ok=True)
    render(week).save(out, "PNG", optimize=True)
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
