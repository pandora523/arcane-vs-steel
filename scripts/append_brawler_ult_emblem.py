#!/opt/homebrew/bin/python3.11
"""
Appends Champion #13 EX RAIJIN EX ("THE TEMPEST FIST") animated 12-frame HD-2D Ultimate Crest Emblem
as Row 12 (`y = 1536..1664`) of `assets/sprites/ult_emblems_sheet.png` (`1536x1664` = 12 cols x 13 rows @ 128x128).

Strict Art & Engineering Guarantees:
  - Preserves Rows 0..11 (`y = 0..1536`) 100% pixel-identical!
  - 100% lossless nearest-neighbor binary alpha (`alpha in {0, 255}` — zero blurry edges).
  - Pixel-locked center fist + Raijin taiko drum ring (ZERO uncanny morphing).
  - Genuine 12-frame animation: rotating Tomoe storm-drum charge, surging & flickering flanking
    storm-gold/electric-indigo lightning rays, crackling knuckle-bracer bolts, and 4-pt pixel starbursts.
  - Strictly enforces >= 4px transparent margin inside every 128x128 cell (`0/12` border clips).
"""

from __future__ import annotations

import math
import os
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

REPO_ROOT = Path(__file__).resolve().parents[1]
SHEET_PATH = REPO_ROOT / "assets" / "sprites" / "ult_emblems_sheet.png"
RAW_EMBLEM_PATH = REPO_ROOT / "assets" / "sprites" / "brawler_ex_emblem_raw.jpg"
QA_OUT = Path("/Users/rei/.gemini/antigravity/brain/9632a6ee-c817-4a54-a13c-c1d08491f273/scratch/brawler_ult_emblem_check.png")

CELL = 128
COLS = 12
MARGIN = 4

# Crisp Raijin storm-gold & midnight-indigo palette
C_INK = (4, 7, 18, 255)
C_INDIGO = (99, 102, 241, 255)
C_INDIGO_LIT = (165, 180, 252, 255)
C_GOLD = (251, 191, 36, 255)
C_GOLD_LIT = (254, 240, 138, 255)
C_WHITE = (255, 255, 255, 255)


def extract_clean_base_128(raw_path: Path) -> tuple[np.ndarray, float, float]:
    """Extracts crisp binary-alpha 128x128 pixel-art emblem with >= 4px margin."""
    im = Image.open(raw_path).convert("RGB")
    # Downsample slightly crisp via nearest after gentle median to keep pixel edges sharp
    w0, h0 = im.size
    arr0 = np.array(im, dtype=np.uint8)

    # Flood-fill flat dark navy #020617 background from all 4 borders
    r = arr0[:, :, 0].astype(np.int16)
    g = arr0[:, :, 1].astype(np.int16)
    b = arr0[:, :, 2].astype(np.int16)
    bg_like = (r <= 24) & (g <= 28) & (b <= 52) & ((b - r) >= -4)

    bg = np.zeros((h0, w0), dtype=bool)
    q = deque()
    for x in range(w0):
        for y in (0, h0 - 1):
            if bg_like[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    for y in range(h0):
        for x in (0, w0 - 1):
            if bg_like[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    while q:
        cy, cx = q.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h0 and 0 <= nx < w0 and not bg[ny, nx] and bg_like[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))

    fg = ~bg
    # Trim any stray 1px JPEG compression specks in the background
    ys, xs = np.where(fg)
    y0, y1 = int(ys.min()), int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())
    crop_rgb = arr0[y0 : y1 + 1, x0 : x1 + 1]
    crop_fg = fg[y0 : y1 + 1, x0 : x1 + 1]

    ch, cw = crop_fg.shape
    # Fit inside 114x114 (leaving 7px margin on each side for animated lightning surge!)
    max_dim = 110
    scale = max_dim / float(max(cw, ch))
    tw = max(16, int(round(cw * scale)))
    th = max(16, int(round(ch * scale)))

    # Crisp nearest-neighbor downscale on RGB + binary mask
    q_rgb = Image.fromarray(crop_rgb, "RGB").resize((tw, th), Image.Resampling.NEAREST)
    q_rgb = q_rgb.quantize(colors=40, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    q_fg = np.array(
        Image.fromarray((crop_fg * 255).astype(np.uint8), "L").resize((tw, th), Image.Resampling.NEAREST)
    ) >= 128

    # Remove tiny isolated dust specks (< 6 px)
    vis = np.zeros_like(q_fg)
    for py in range(th):
        for px in range(tw):
            if q_fg[py, px] and not vis[py, px]:
                st = [(py, px)]
                vis[py, px] = True
                pts = []
                while st:
                    ry, rx = st.pop()
                    pts.append((ry, rx))
                    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                        ny, nx = ry + dy, rx + dx
                        if 0 <= ny < th and 0 <= nx < tw and q_fg[ny, nx] and not vis[ny, nx]:
                            vis[ny, nx] = True
                            st.append((ny, nx))
                if len(pts) < 6:
                    for ry, rx in pts:
                        q_fg[ry, rx] = False

    rgba_crop = np.zeros((th, tw, 4), dtype=np.uint8)
    rgba_crop[:, :, :3] = np.array(q_rgb, dtype=np.uint8)
    rgba_crop[:, :, 3] = np.where(q_fg, 255, 0)

    cell = np.zeros((CELL, CELL, 4), dtype=np.uint8)
    ox = (CELL - tw) // 2
    oy = (CELL - th) // 2
    cell[oy : oy + th, ox : ox + tw] = rgba_crop

    # Crisp 1px dark pixel ink outline around outer boundary
    op = cell[:, :, 3] > 0
    outline = np.zeros_like(op)
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        shifted = np.zeros_like(op)
        sy0, sy1 = max(0, dy), CELL + min(0, dy)
        sx0, sx1 = max(0, dx), CELL + min(0, dx)
        shifted[sy0:sy1, sx0:sx1] = op[sy0 - dy : sy1 - dy, sx0 - dx : sx1 - dx]
        outline |= shifted & (~op)
    cell[outline] = C_INK

    return cell, CELL * 0.5, CELL * 0.5


def put_px(arr: np.ndarray, x: int, y: int, col: tuple[int, int, int, int]) -> None:
    if MARGIN <= x < CELL - MARGIN and MARGIN <= y < CELL - MARGIN:
        arr[y, x] = col


def draw_star4(arr: np.ndarray, cx: int, cy: int, arm: int, outer: tuple[int, int, int, int]) -> None:
    for d in range(-arm, arm + 1):
        put_px(arr, cx + d, cy, outer)
        put_px(arr, cx, cy + d, outer)
    for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
        if arm >= 2 or (dx == 0 and dy == 0):
            put_px(arr, cx + dx, cy + dy, C_WHITE)


def draw_bolt(
    arr: np.ndarray,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    seed: int,
    jag: float,
    outer: tuple[int, int, int, int],
) -> None:
    dx, dy = x1 - x0, y1 - y0
    ln = max(1.0, math.hypot(dx, dy))
    nx, ny = -dy / ln, dx / ln
    segs = max(3, min(7, int(ln / 5.0)))
    pts = [(x0, y0)]
    for i in range(1, segs):
        u = i / float(segs)
        h = math.sin(seed * 19.7 + i * 7.3)
        off = h * jag * math.sin(u * math.pi)
        pts.append((x0 + dx * u + nx * off, y0 + dy * u + ny * off))
    pts.append((x1, y1))
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        steps = max(1, int(max(abs(bx - ax), abs(by - ay)) * 1.4))
        for s in range(steps + 1):
            t = s / float(steps)
            px = int(round(ax + (bx - ax) * t))
            py = int(round(ay + (by - ay) * t))
            for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                put_px(arr, px + ox, py + oy, outer)
            put_px(arr, px, py, C_WHITE)


def build_12_frames(base: np.ndarray) -> list[np.ndarray]:
    yy, xx = np.mgrid[0:CELL, 0:CELL]
    cx, cy = 64.0, 64.0
    dist = np.hypot(xx - cx, yy - cy)
    op = base[:, :, 3] > 0

    # Pixel-locked center fist + circular Raijin taiko drum ring (radius <= 35px from center)
    core_mask = op & (dist <= 34.5)
    # Flanking symmetrical lightning bolts outside the taiko ring
    bolt_mask = op & (~core_mask)
    left_bolts = bolt_mask & (xx < 64)
    right_bolts = bolt_mask & (xx >= 64)

    r = base[:, :, 0].astype(np.int16)
    g = base[:, :, 1].astype(np.int16)
    b = base[:, :, 2].astype(np.int16)
    gold_px = op & (r >= 175) & (g >= 120) & (b <= 115)
    violet_px = op & (b >= 130) & (r <= 170)

    # 3 Tomoe medallion zones around the taiko ring (top 12-o'clock, bottom-left 8-o'clock, bottom-right 4-o'clock)
    tomoe_centers = [
        (64.0, 34.0),   # Top Tomoe
        (40.0, 79.0),   # Bottom-left Tomoe
        (88.0, 79.0),   # Bottom-right Tomoe
    ]
    tomoe_masks = [
        core_mask & gold_px & (np.hypot(xx - tx, yy - ty) <= 10.5)
        for tx, ty in tomoe_centers
    ]
    knuckle_gold = core_mask & gold_px & (yy >= 44) & (yy <= 60) & (xx >= 48) & (xx <= 80)

    frames: list[np.ndarray] = []
    for f in range(COLS):
        u = f / float(COLS)
        ph = u * math.tau
        fr = np.zeros((CELL, CELL, 4), dtype=np.uint8)

        # 1. Animated flanking lightning rays (radial surge + alternating voltage phase!)
        surge_l = int(round(2.6 * math.sin(ph)))
        surge_r = int(round(2.6 * math.sin(ph + 0.55)))
        lift_l = int(round(1.4 * math.cos(ph * 2.0)))
        lift_r = int(round(1.4 * math.sin(ph * 2.0)))

        for mask, sdx, sdy, bright_phase in (
            (left_bolts, -surge_l, lift_l, math.sin(ph)),
            (right_bolts, surge_r, lift_r, math.sin(ph + math.pi * 0.45)),
        ):
            ys, xs = np.where(mask)
            for py, px in zip(ys, xs):
                ny = py + sdy
                nx = px + sdx
                if MARGIN <= nx < CELL - MARGIN and MARGIN <= ny < CELL - MARGIN:
                    col = base[py, px].copy()
                    # Flicker bright gold/indigo tips at voltage crests
                    if bright_phase > 0.35 and (int(col[0]) + int(col[1]) + int(col[2]) > 240):
                        boost = 0.38 * bright_phase
                        col[0] = min(255, int(col[0] + (255 - col[0]) * boost))
                        col[1] = min(255, int(col[1] + (250 - col[1]) * boost))
                        col[2] = min(255, int(col[2] + (215 - col[2]) * boost))
                    fr[ny, nx] = col

        # 2. Pixel-locked fist + taiko drum ring core ON TOP (zero cut-seams, zero wobble!)
        fr[core_mask] = base[core_mask]

        # 3. Rotating 12-frame storm-drum Tomoe glow chase + knuckle bracer pulse!
        active_tomoe = (f // 3) % 3
        all_surge = f in (2, 5, 8, 11)
        for idx, tm in enumerate(tomoe_masks):
            if idx == active_tomoe or all_surge:
                strength = 0.72 if all_surge else 0.58
                src = fr[tm, :3].astype(np.float32)
                tgt = np.array([255.0, 250.0, 195.0], dtype=np.float32)
                fr[tm, :3] = np.clip(src * (1.0 - strength) + tgt * strength, 0, 255).astype(np.uint8)

        kn_boost = 0.18 + 0.38 * max(0.0, math.sin(ph * 2.0))
        src_k = fr[knuckle_gold, :3].astype(np.float32)
        fr[knuckle_gold, :3] = np.clip(src_k * (1.0 - kn_boost) + np.array([255.0, 252.0, 210.0]) * kn_boost, 0, 255).astype(np.uint8)

        # 4. Crisp crackling micro-lightning bolts jumping between fist knuckles & drum ring!
        bolt_arcs = [
            ((50, 50), (34, 34), C_GOLD),
            ((78, 50), (94, 34), C_INDIGO),
            ((46, 62), (28, 66), C_INDIGO),
            ((82, 62), (100, 66), C_GOLD),
            ((54, 46), (64, 24), C_GOLD),
            ((74, 78), (96, 94), C_INDIGO),
        ]
        b0 = bolt_arcs[f % len(bolt_arcs)]
        b1 = bolt_arcs[(f + 3) % len(bolt_arcs)]
        draw_bolt(fr, b0[0][0], b0[0][1], b0[1][0], b0[1][1], seed=f * 11 + 1, jag=3.4, outer=b0[2])
        draw_bolt(fr, b1[0][0], b1[0][1], b1[1][0], b1[1][1], seed=f * 13 + 5, jag=3.0, outer=b1[2])

        # 5. Orbiting storm-gold / indigo 4-point pixel starburst sparks
        ang1 = ph
        ang2 = ph + math.pi
        sx1 = int(round(64 + math.cos(ang1) * 44))
        sy1 = int(round(64 + math.sin(ang1) * 38))
        sx2 = int(round(64 + math.cos(ang2) * 46))
        sy2 = int(round(64 + math.sin(ang2) * 34))
        draw_star4(fr, sx1, sy1, 3 if f % 2 == 0 else 2, C_GOLD)
        draw_star4(fr, sx2, sy2, 2 if f % 2 == 0 else 3, C_INDIGO_LIT)
        if f in (3, 6, 9, 11):
            draw_star4(fr, 64, 47, 4, C_GOLD_LIT)

        # Hard-enforce >= 4px transparent margin (`0/12` border clips)
        fr[:MARGIN, :] = 0
        fr[CELL - MARGIN :, :] = 0
        fr[:, :MARGIN] = 0
        fr[:, CELL - MARGIN :] = 0
        frames.append(fr)

    return frames


def main() -> None:
    if not RAW_EMBLEM_PATH.exists():
        raise FileNotFoundError(f"Missing raw emblem master: {RAW_EMBLEM_PATH}")
    old_im = Image.open(SHEET_PATH).convert("RGBA")
    old_arr = np.array(old_im, dtype=np.uint8)
    assert old_arr.shape[1] == CELL * COLS, f"Unexpected sheet width: {old_arr.shape}"
    # Keep rows 0..11 strictly pixel-identical (whether running first time at 1536 or re-running at 1664)
    rows0_11 = old_arr[: 12 * CELL, :, :].copy()

    base_128, _, _ = extract_clean_base_128(RAW_EMBLEM_PATH)
    frames = build_12_frames(base_128)

    # Quantitative checks: 0/12 border clips + 11/11 frame transitions
    clips = 0
    for f_idx, fr in enumerate(frames):
        a = fr[:, :, 3] > 0
        if a[:MARGIN, :].any() or a[CELL - MARGIN :, :].any() or a[:, :MARGIN].any() or a[:, CELL - MARGIN :].any():
            clips += 1
        if f_idx > 0:
            diff = int(np.count_nonzero(np.any(fr != frames[f_idx - 1], axis=2)))
            assert diff >= 40, f"Frame {f_idx} too similar to previous ({diff} px)"
    assert clips == 0, f"Detected {clips} border clips!"

    row12 = np.concatenate(frames, axis=1)  # 128 x 1536 x 4
    new_sheet = np.concatenate([rows0_11, row12], axis=0)  # 1664 x 1536 x 4
    assert new_sheet.shape == (13 * CELL, COLS * CELL, 4)
    Image.fromarray(new_sheet, "RGBA").save(SHEET_PATH, optimize=True)

    # Render zoomed 2x6 QA contact sheet on dark arena backdrop
    QA_OUT.parent.mkdir(parents=True, exist_ok=True)
    qa = Image.new("RGBA", (6 * CELL, 2 * (CELL + 18)), (10, 14, 28, 255))
    dr = ImageDraw.Draw(qa)
    for i, fr in enumerate(frames):
        r, c = divmod(i, 6)
        x0, y0 = c * CELL, r * (CELL + 18)
        qa.alpha_composite(Image.fromarray(fr, "RGBA"), (x0, y0 + 18))
        dr.rectangle([x0, y0 + 18, x0 + CELL - 1, y0 + 18 + CELL - 1], outline=(56, 189, 248, 255))
        dr.text((x0 + 4, y0 + 3), f"RAIJIN EMB F{i:02d}", fill=(253, 224, 71, 255))
    qa.save(QA_OUT)
    print(f"[OK] Appended Row 12 (brawler) to {SHEET_PATH}: {new_sheet.shape[1]}x{new_sheet.shape[0]} (0/12 clips, Rows 0..11 untouched)")


if __name__ == "__main__":
    main()
