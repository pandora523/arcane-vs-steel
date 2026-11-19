#!/opt/homebrew/bin/python3.11
"""
Build All-12 Natural 6-Frame 320x320 (1920x320) Lossless Anime Lip-Sync & Cushioned-Blink Bust Sheets:
  assets/sprites/intro_talk/<persona>_talk_sheet.png
  for all 12 Arcane vs Steel personas (shared across EX & Legacy rosters):
    1. nyx           2. warrior       3. mage          4. priestess
    5. chronomancer  6. valkyrie      7. ronin         8. archer
    9. reaper       10. titan        11. icemage      12. android

Design Principle (Zero Forced Body/Ear Chopping — Pure Hand-Sculpted Anime Cel Expression):
  Keep 100% of head, hair, cat-ears, helmets, horns, shoulders, and weapon silhouettes rock-solid,
  animating genuine anime facial cel states:
    F0: Calm Neutral Closed Mouth
    F1: Half-Blink Cushion Lid (50% lowered upper eyelids + lashes for buttery F0->F1->F2->F1->F0 blinks!)
    F2: Full Closed Eye-Blink (seamless local-skin/hood/visor closed eyelids + curved lashes, 0 iris leak)
    F3: Small / Soft Syllable Mouth ('m/s/i/e' subtle 4-5px speech part)
    F4: Medium Vowel Mouth ('o/u/eh' natural 7-8px mid-open speech, 1px jaw drop, upper teeth)
    F5: Wide Accented Vowel Mouth ('a!' expressive 10-11px speech, 2px jaw drop, tongue/teeth + weapon glint)
"""

from __future__ import annotations

import os
import subprocess
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

REPO_ROOT = Path(__file__).resolve().parents[1]
SPRITES_DIR = REPO_ROOT / "assets" / "sprites"
OUT_DIR = SPRITES_DIR / "intro_talk"

CELL = 320
FRAMES = 6
SHEET_W = CELL * FRAMES  # 1920
SHEET_H = CELL           # 320

CROPS_1024: dict[str, tuple[int, int, int, int]] = {
    "nyx":          (0, 0, 1024, 1024),
    "warrior":      (0, 0, 1024, 1024),
    "mage":         (0, 0, 1024, 1024),
    "priestess":    (96, 8, 928, 840),
    "chronomancer": (114, 96, 910, 892),
    "valkyrie":     (68, 68, 956, 956),
    "ronin":        (204, 16, 796, 608),
    "archer":       (0, 0, 1024, 1024),
    "reaper":       (0, 0, 1024, 1024),
    "titan":        (0, 0, 1024, 1024),
    "icemage":      (0, 0, 1024, 1024),
    "android":      (0, 0, 1024, 1024),
}


def quantize_crisp_320(
    raw_jpg_path: Path,
    crop_box: tuple[int, int, int, int] = (0, 0, 1024, 1024),
    is_warrior: bool = False,
) -> np.ndarray:
    """Downsamples 1024x1024 pixel-art master to crisp 320x320 RGBA with zero blur."""
    raw = Image.open(raw_jpg_path).convert("RGB")
    if crop_box != (0, 0, 1024, 1024):
        raw = raw.crop(crop_box)
    med = raw.filter(ImageFilter.MedianFilter(size=3))
    near320 = med.resize((CELL, CELL), Image.Resampling.NEAREST)
    src = np.array(near320, dtype=np.uint8)

    q_img = near320.quantize(colors=96, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    out = np.array(q_img, dtype=np.uint8)

    if is_warrior:
        r = src[:, :, 0].astype(np.int16)
        g = src[:, :, 1].astype(np.int16)
        b = src[:, :, 2].astype(np.int16)
        lum = (r * 2 + g * 5 + b * 3) // 10
        yy, xx = np.mgrid[0:CELL, 0:CELL]
        face_zone = (xx >= 124) & (xx <= 212) & (yy >= 118) & (yy <= 190)
        skin_like = face_zone & ((r - b) >= 28) & (r >= 135) & (g >= 88) & ((r - g) >= 18)
        out[skin_like & (lum >= 208)] = [250, 206, 174]
        out[skin_like & (lum >= 184) & (lum < 208)] = [238, 184, 146]
        out[skin_like & (lum >= 158) & (lum < 184)] = [220, 156, 118]
        out[skin_like & (lum >= 128) & (lum < 158)] = [190, 124, 88]
        out[skin_like & (lum < 128)] = [148, 86, 58]

        cyan_mask = ((b - r) > 42) & (g > 145)
        out[cyan_mask & (lum >= 230)] = [228, 252, 255]
        out[cyan_mask & (lum >= 185) & (lum < 230)] = [110, 234, 255]
        out[cyan_mask & (lum >= 145) & (lum < 185)] = [42, 198, 248]
        out[cyan_mask & (lum < 145)] = [14, 132, 212]

    rgba = np.zeros((CELL, CELL, 4), dtype=np.uint8)
    rgba[:, :, :3] = out
    rgba[:, :, 3] = 255
    return rgba


def shift_chin_only(canvas: np.ndarray, src: np.ndarray, x0: int, y0: int, x1: int, y1: int, dy: int) -> None:
    if dy <= 0:
        return
    patch = src[y0:y1, x0:x1].copy()
    canvas[y0 + dy : y1 + dy, x0:x1] = patch


def draw_px(img: np.ndarray, x: int, y: int, rgb: tuple[int, int, int]) -> None:
    if 0 <= x < CELL and 0 <= y < CELL:
        img[y, x, :3] = rgb
        img[y, x, 3] = 255


def draw_star_sparkle(
    img: np.ndarray,
    cx: int,
    cy: int,
    arm: int,
    outer_rgb: tuple[int, int, int],
    core_rgb: tuple[int, int, int] = (255, 255, 255),
) -> None:
    for d in range(-arm, arm + 1):
        draw_px(img, cx + d, cy, outer_rgb)
        draw_px(img, cx, cy + d, outer_rgb)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            if abs(dx) + abs(dy) <= 1:
                draw_px(img, cx + dx, cy + dy, core_rgb)


def pack_sheet(frames: list[np.ndarray]) -> np.ndarray:
    sheet = np.zeros((SHEET_H, SHEET_W, 4), dtype=np.uint8)
    for idx, fr in enumerate(frames):
        sheet[:, idx * CELL : (idx + 1) * CELL] = fr
    return sheet


# ==============================================================================
# SHARED PARAMETRIC ANIME EYELID & 3-TIER VOWEL MOUTH SCULPTORS
# ==============================================================================

def sculpt_human_eyelids(
    f0_ref: np.ndarray,
    half_open: bool,
    left_box: tuple[int, int, int, int],
    right_box: tuple[int, int, int, int],
    cheek_y: int,
    lash_dark: tuple[int, int, int],
    lash_soft: tuple[int, int, int],
    crease_col: tuple[int, int, int],
    skin_shad: tuple[int, int, int],
    skip_fn=None,
) -> np.ndarray:
    f = f0_ref.copy()
    for bx0, by0, bx1, by1 in (left_box, right_box):
        h = by1 - by0
        mid_y = by0 + max(2, h // 2)
        closed_lash_y = by1 - 3

        if half_open:
            for y in range(by0, mid_y):
                for x in range(bx0, bx1 + 1):
                    if skip_fn and skip_fn(f0_ref, x, y):
                        continue
                    sx = min(bx1 - 1, max(bx0 + 1, x))
                    skin = tuple(int(v) for v in f0_ref[cheek_y, sx, :3])
                    col = crease_col if y == by0 else (skin_shad if y == by0 + 1 else skin)
                    draw_px(f, x, y, col)
            for x in range(bx0, bx1 + 1):
                if skip_fn and skip_fn(f0_ref, x, mid_y):
                    continue
                draw_px(f, x, mid_y, lash_dark)
                if mid_y + 1 <= by1:
                    draw_px(f, x, mid_y + 1, lash_soft)
        else:
            for y in range(by0, by1 + 1):
                for x in range(bx0, bx1 + 1):
                    if skip_fn and skip_fn(f0_ref, x, y):
                        continue
                    sx = min(bx1 - 1, max(bx0 + 1, x))
                    skin = tuple(int(v) for v in f0_ref[cheek_y, sx, :3])
                    col = crease_col if y == by0 else (skin_shad if y <= by0 + 2 else skin)
                    draw_px(f, x, y, col)
            span = max(1, bx1 - bx0)
            for x in range(bx0, bx1 + 1):
                rel = (x - bx0) / span
                curve = 1 if 0.22 <= rel <= 0.78 else 0
                ly = min(by1 - 1, closed_lash_y + curve)
                if skip_fn and skip_fn(f0_ref, x, ly):
                    continue
                draw_px(f, x, ly, lash_dark)
                draw_px(f, x, min(by1, ly + 1), lash_dark if 0.15 <= rel <= 0.85 else lash_soft)
                if ly - 1 >= by0:
                    draw_px(f, x, ly - 1, skin_shad)
    return f


def sculpt_human_vowel_mouth(
    f0_ref: np.ndarray,
    vowel: str,
    mx0: int,
    mx1: int,
    my_top: int,
    erase_y0: int,
    erase_y1: int,
    skin_ref_y: int,
    chin_box: tuple[int, int, int, int],
    lip_col: tuple[int, int, int],
    cavity_col: tuple[int, int, int],
    tongue_mid: tuple[int, int, int],
    tongue_lit: tuple[int, int, int],
    skin_shad: tuple[int, int, int],
    sparkles: list[tuple[int, int, int, tuple[int, int, int]]] | None = None,
) -> np.ndarray:
    f = f0_ref.copy()
    chin_drop = 0 if vowel == "small" else (1 if vowel == "mid" else 2)
    cx0, cy0, cx1, cy1 = chin_box
    if chin_drop > 0:
        shift_chin_only(f, f0_ref, cx0, cy0, cx1, cy1, chin_drop)

    for y in range(erase_y0, erase_y1 + chin_drop + 1):
        for x in range(mx0 - 2, mx1 + 5):
            sx = min(mx1, max(mx0, x))
            f[y, x, :3] = f0_ref[skin_ref_y, sx, :3]

    C_TEETH = (248, 246, 242)
    cx_mid = (mx0 + mx1) // 2

    if vowel == "small":
        sx0, sx1 = mx0 + 1, mx1 - 1
        for x in range(sx0, sx1 + 1):
            draw_px(f, x, my_top, lip_col)
            draw_px(f, x, my_top + 1, C_TEETH if (sx0 + 2 <= x <= sx1 - 2) else cavity_col)
            draw_px(f, x, my_top + 2, tongue_mid if (sx0 + 2 <= x <= sx1 - 2) else cavity_col)
            if sx0 + 1 <= x <= sx1 - 1:
                draw_px(f, x, my_top + 3, lip_col)
        draw_px(f, sx0 - 1, my_top + 1, lip_col)
        draw_px(f, sx1 + 1, my_top + 1, lip_col)
        for x in range(cx_mid - 3, cx_mid + 4):
            draw_px(f, x, my_top + 4, skin_shad)

    elif vowel == "mid":
        for x in range(mx0 + 1, mx1):
            draw_px(f, x, my_top, lip_col)
        for dy in range(1, 6):
            y = my_top + dy
            inset = 1 if dy == 5 else 0
            xa, xb = mx0 + inset, mx1 - inset
            if dy == 5:
                for x in range(xa + 1, xb):
                    draw_px(f, x, y, lip_col)
                continue
            draw_px(f, xa, y, lip_col)
            draw_px(f, xb, y, lip_col)
            for x in range(xa + 1, xb):
                if dy == 1 and (xa + 2 <= x <= xb - 2):
                    draw_px(f, x, y, C_TEETH)
                elif dy <= 2:
                    draw_px(f, x, y, cavity_col)
                else:
                    draw_px(f, x, y, tongue_lit if (dy == 4 and abs(x - cx_mid) <= 3) else tongue_mid)
        for x in range(cx_mid - 4, cx_mid + 5):
            draw_px(f, x, my_top + 6, skin_shad)

    else:
        lx, rx = mx0 - 1, mx1 + 1
        for x in range(lx + 1, rx):
            uy = my_top - 1 if (lx + 3 <= x <= rx - 3) else my_top
            draw_px(f, x, uy, lip_col)
        for dy in range(0, 8):
            y = my_top + dy
            inset = 1 if dy == 5 else (2 if dy == 6 else (4 if dy == 7 else 0))
            xa, xb = lx + inset, rx - inset
            if dy == 7:
                for x in range(xa, xb + 1):
                    draw_px(f, x, y, lip_col)
                continue
            draw_px(f, xa, y, lip_col)
            draw_px(f, xb, y, lip_col)
            for x in range(xa + 1, xb):
                if dy == 0 and (lx + 3 <= x <= rx - 3):
                    draw_px(f, x, y, C_TEETH)
                elif dy <= 3:
                    draw_px(f, x, y, cavity_col)
                else:
                    draw_px(f, x, y, tongue_lit if (dy >= 5 and abs(x - cx_mid) <= 3) else tongue_mid)
        for x in range(cx_mid - 4, cx_mid + 5):
            draw_px(f, x, my_top + 8, skin_shad)
        if sparkles:
            for sx, sy, arm, scol in sparkles:
                draw_star_sparkle(f, sx, sy, arm, scol)

    return f


# ==============================================================================
# 1. NYX & 2. WARRIOR (EXACT VERIFIED SCULPTS PRESERVED)
# ==============================================================================

def sculpt_nyx_eyelids(f0_ref: np.ndarray, half_open: bool = False) -> np.ndarray:
    f = f0_ref.copy()
    skin_main = tuple(int(v) for v in f0_ref[140, 165, :3])
    skin_right = tuple(int(v) for v in f0_ref[138, 198, :3])
    skin_shad = (224, 168, 152)
    crease_col = (184, 122, 118)
    lash_dark = (22, 12, 34)
    lash_plum = (68, 30, 68)

    def is_bang_left(x: int, y: int) -> bool:
        if x >= 168 and y <= 124:
            r, g, b = int(f0_ref[y, x, 0]), int(f0_ref[y, x, 1]), int(f0_ref[y, x, 2])
            return (b - g) >= 18 and b >= 175
        return False

    def is_bang_right(x: int, y: int) -> bool:
        if (x <= 191 or x >= 206) and y <= 125:
            r, g, b = int(f0_ref[y, x, 0]), int(f0_ref[y, x, 1]), int(f0_ref[y, x, 2])
            return (b - g) >= 18 and b >= 175
        return False

    if half_open:
        for y in range(117, 125):
            for x in range(141, 171):
                if is_bang_left(x, y) or (x <= 142 and y >= 122):
                    continue
                col = crease_col if (y == 118 and 147 <= x <= 165) else (skin_shad if y <= 119 else skin_main)
                draw_px(f, x, y, col)
        for x in range(140, 171):
            if not is_bang_left(x, 124):
                draw_px(f, x, 124, skin_shad)
                draw_px(f, x, 125, lash_dark)
                draw_px(f, x, 126, lash_dark if 143 <= x <= 168 else lash_plum)
        draw_px(f, 138, 124, lash_dark)
        draw_px(f, 139, 124, lash_dark)
        draw_px(f, 139, 125, lash_dark)
        for y in range(117, 125):
            for x in range(190, 207):
                if is_bang_right(x, y):
                    continue
                col = crease_col if (y == 118 and 193 <= x <= 203) else (skin_shad if y <= 119 else skin_right)
                draw_px(f, x, y, col)
        for x in range(190, 207):
            if not is_bang_right(x, 125):
                draw_px(f, x, 124, skin_shad)
                draw_px(f, x, 125, lash_dark)
                draw_px(f, x, 126, lash_dark if 192 <= x <= 205 else lash_plum)
        draw_px(f, 207, 124, lash_dark)
        return f

    for y in range(117, 134):
        for x in range(138, 172):
            if is_bang_left(x, y) or (138 <= x <= 142 and y >= 122):
                continue
            base_col = crease_col if (y == 119 and 148 <= x <= 164) else (
                skin_shad if (y <= 119 and 144 <= x <= 167) else skin_main
            )
            r, g, b = int(f[y, x, 0]), int(f[y, x, 1]), int(f[y, x, 2])
            not_cheek = abs(r - skin_main[0]) + abs(g - skin_main[1]) + abs(b - skin_main[2]) > 18
            if not_cheek or (143 <= x <= 170 and 118 <= y <= 133):
                draw_px(f, x, y, base_col)
    for x in range(141, 170):
        curve = 1 if 148 <= x <= 164 else 0
        ly = 128 + curve
        if not is_bang_left(x, ly):
            draw_px(f, x, ly, lash_dark)
            draw_px(f, x, ly + 1, lash_dark if 144 <= x <= 167 else lash_plum)
            if 146 <= x <= 166:
                draw_px(f, x, ly - 1, skin_shad)
    draw_px(f, 139, 127, lash_dark)
    draw_px(f, 140, 127, lash_dark)
    draw_px(f, 140, 128, lash_dark)
    for y in range(117, 134):
        for x in range(190, 207):
            if is_bang_right(x, y):
                continue
            base_col = crease_col if (y == 119 and 193 <= x <= 203) else (
                skin_shad if (y <= 119 or x >= 205) else skin_right
            )
            draw_px(f, x, y, base_col)
    for x in range(190, 207):
        curve = 1 if 194 <= x <= 203 else 0
        ly = 128 + curve
        if not is_bang_right(x, ly):
            draw_px(f, x, ly, lash_dark)
            draw_px(f, x, ly + 1, lash_dark if 192 <= x <= 205 else lash_plum)
            if 193 <= x <= 204:
                draw_px(f, x, ly - 1, skin_shad)
    draw_px(f, 207, 127, lash_dark)
    return f


def sculpt_nyx_mouth_vowel(f0_ref: np.ndarray, vowel: str) -> np.ndarray:
    f = f0_ref.copy()
    chin_drop = 0 if vowel == "small" else (1 if vowel == "mid" else 2)
    if chin_drop > 0:
        shift_chin_only(f, f0_ref, 159, 163, 192, 176, chin_drop)

    C_SKIN_SHAD = (224, 168, 152)
    C_LIP_OUT = (72, 28, 52)
    C_CAVITY = (96, 24, 54)
    C_TONGUE_MID = (218, 86, 122)
    C_TONGUE_LIT = (244, 134, 164)
    C_WHITE = (255, 250, 252)

    for y in range(149, 163):
        for x in range(159, 194):
            ref_y = 148 if x <= 185 else 149
            ref_x = min(184, x)
            f[y, x, :3] = f0_ref[ref_y, ref_x, :3]

    if vowel == "small":
        for x in range(167, 183):
            draw_px(f, x, 152, C_LIP_OUT)
        for xp in (165, 166, 183, 184):
            draw_px(f, xp, 152, C_LIP_OUT)
        for x in range(167, 183):
            draw_px(f, x, 153, C_WHITE if 170 <= x <= 179 else C_CAVITY)
            draw_px(f, x, 154, C_TONGUE_MID if 169 <= x <= 180 else C_CAVITY)
        for yp in (153, 154):
            draw_px(f, 166, yp, C_LIP_OUT)
            draw_px(f, 183, yp, C_LIP_OUT)
        for x in range(168, 182):
            draw_px(f, x, 155, C_LIP_OUT)
        draw_px(f, 167, 153, C_WHITE)
        draw_px(f, 168, 153, C_WHITE)
        draw_px(f, 167, 154, C_WHITE)
        for x in range(171, 179):
            draw_px(f, x, 156, C_SKIN_SHAD)
    elif vowel == "mid":
        for x in range(166, 184):
            draw_px(f, x, 151 if 168 <= x <= 181 else 152, C_LIP_OUT)
        draw_px(f, 164, 152, C_LIP_OUT)
        draw_px(f, 185, 152, C_LIP_OUT)
        for y in range(152, 158):
            inset = 1 if y == 157 else 0
            xa, xb = 165 + inset, 184 - inset
            if y == 157:
                for x in range(xa + 1, xb):
                    draw_px(f, x, y, C_LIP_OUT)
                continue
            draw_px(f, xa, y, C_LIP_OUT)
            draw_px(f, xb, y, C_LIP_OUT)
            for x in range(xa + 1, xb):
                if y == 152 and 169 <= x <= 180:
                    draw_px(f, x, y, C_WHITE)
                elif y <= 154:
                    draw_px(f, x, y, C_CAVITY)
                else:
                    draw_px(f, x, y, C_TONGUE_LIT if (y == 156 and 171 <= x <= 178) else C_TONGUE_MID)
        for fx, fy in ((167, 152), (168, 152), (167, 153), (168, 153), (167, 154)):
            draw_px(f, fx, fy, C_WHITE)
        for x in range(170, 180):
            draw_px(f, x, 158, C_SKIN_SHAD)
    else:
        lx, rx = 164, 185
        draw_px(f, lx - 1, 150, C_LIP_OUT)
        draw_px(f, rx + 1, 150, C_LIP_OUT)
        for x in range(lx, rx + 1):
            draw_px(f, x, 150 if (lx + 2 <= x <= rx - 2) else 151, C_LIP_OUT)
        for y in range(151, 161):
            inset = 1 if y == 158 else (3 if y == 159 else (5 if y == 160 else 0))
            xa, xb = lx + inset, rx - inset
            if y == 160:
                for x in range(xa, xb + 1):
                    draw_px(f, x, y, C_LIP_OUT)
                continue
            draw_px(f, xa, y, C_LIP_OUT)
            draw_px(f, xb, y, C_LIP_OUT)
            if inset >= 2:
                draw_px(f, xa + 1, y, C_LIP_OUT)
                draw_px(f, xb - 1, y, C_LIP_OUT)
            for x in range(xa + 1, xb):
                if y == 151 and (lx + 3 <= x <= rx - 3):
                    draw_px(f, x, y, C_WHITE)
                elif y <= 154:
                    draw_px(f, x, y, C_CAVITY)
                else:
                    dist_c = abs(x - 175)
                    if y == 155 and dist_c >= 6:
                        draw_px(f, x, y, C_CAVITY)
                    elif y >= 157 and dist_c <= 4:
                        draw_px(f, x, y, C_TONGUE_LIT)
                    else:
                        draw_px(f, x, y, C_TONGUE_MID)
        for fx, fy in ((166, 151), (167, 151), (168, 151), (166, 152), (167, 152), (168, 152), (167, 153), (167, 154)):
            draw_px(f, fx, fy, C_WHITE)
        for x in range(170, 180):
            draw_px(f, x, 161, C_SKIN_SHAD)
        for x in range(152, 156):
            for y in range(121, 125):
                draw_px(f, x, y, (255, 255, 255))
        draw_star_sparkle(f, 263, 144, 2, (165, 243, 252))
        draw_star_sparkle(f, 263, 114, 3, (34, 211, 238))
    return f


def build_nyx_talk_sheet() -> np.ndarray:
    f0 = quantize_crisp_320(SPRITES_DIR / "nyx_ex_portrait_raw.jpg", CROPS_1024["nyx"])
    return pack_sheet([
        f0,
        sculpt_nyx_eyelids(f0, True),
        sculpt_nyx_eyelids(f0, False),
        sculpt_nyx_mouth_vowel(f0, "small"),
        sculpt_nyx_mouth_vowel(f0, "mid"),
        sculpt_nyx_mouth_vowel(f0, "wide"),
    ])


def sculpt_warrior_eyelids(f0_ref: np.ndarray, half_open: bool = False) -> np.ndarray:
    f = f0_ref.copy()
    C_LASH = (14, 18, 36)
    C_LASH_SOFT = (46, 36, 48)
    C_CREASE = (148, 86, 58)
    C_SKIN_SHAD = (190, 124, 88)
    if half_open:
        for y in range(137, 142):
            for x in range(150, 175):
                cheek_col = tuple(int(v) for v in f0_ref[153, min(173, max(152, x)), :3])
                draw_px(f, x, y, C_CREASE if y == 137 else (C_SKIN_SHAD if y <= 139 else cheek_col))
        for x in range(150, 175):
            ly = 141 if x <= 157 else 142
            draw_px(f, x, ly, C_LASH)
            draw_px(f, x, ly + 1, C_LASH_SOFT)
        for y in range(138, 142):
            for x in range(191, 207):
                cheek_r = tuple(int(v) for v in f0_ref[153, min(204, max(192, x)), :3])
                draw_px(f, x, y, C_CREASE if y == 138 else (C_SKIN_SHAD if y == 139 else cheek_r))
        for x in range(191, 207):
            draw_px(f, x, 142, C_LASH)
            draw_px(f, x, 143, C_LASH_SOFT)
        return f

    for y in range(137, 151):
        for x in range(149, 176):
            cheek_col = tuple(int(v) for v in f0_ref[153, min(173, max(152, x)), :3])
            draw_px(f, x, y, C_CREASE if (y == 137 and 154 <= x <= 171) else (C_SKIN_SHAD if y <= 140 else cheek_col))
    for x in range(150, 175):
        ly = 145 if x <= 157 else 146
        draw_px(f, x, ly, C_LASH)
        draw_px(f, x, ly + 1, C_LASH if 153 <= x <= 172 else C_LASH_SOFT)
        draw_px(f, x, ly + 2, C_SKIN_SHAD)
    draw_px(f, 148, 144, C_LASH)
    draw_px(f, 149, 144, C_LASH)
    for y in range(138, 151):
        for x in range(190, 207):
            cheek_r = tuple(int(v) for v in f0_ref[153, min(204, max(192, x)), :3])
            draw_px(f, x, y, C_CREASE if y == 138 else (C_SKIN_SHAD if y <= 140 else cheek_r))
    for x in range(191, 207):
        draw_px(f, x, 146, C_LASH)
        draw_px(f, x, 147, C_LASH if 192 <= x <= 205 else C_LASH_SOFT)
        draw_px(f, x, 148, C_SKIN_SHAD)
    return f


def sculpt_warrior_mouth_vowel(f0_ref: np.ndarray, vowel: str) -> np.ndarray:
    return sculpt_human_vowel_mouth(
        f0_ref,
        vowel,
        mx0=172,
        mx1=192,
        my_top=169,
        erase_y0=168,
        erase_y1=176,
        skin_ref_y=167,
        chin_box=(166, 177, 196, 188),
        lip_col=(58, 28, 22),
        cavity_col=(74, 22, 24),
        tongue_mid=(176, 68, 62),
        tongue_lit=(208, 96, 86),
        skin_shad=(190, 124, 88),
        sparkles=[(191, 111, 3, (110, 234, 255)), (191, 239, 4, (110, 234, 255))],
    )


def build_warrior_talk_sheet() -> np.ndarray:
    f0 = quantize_crisp_320(SPRITES_DIR / "warrior_ex_portrait_raw.jpg", CROPS_1024["warrior"], is_warrior=True)
    return pack_sheet([
        f0,
        sculpt_warrior_eyelids(f0, True),
        sculpt_warrior_eyelids(f0, False),
        sculpt_warrior_mouth_vowel(f0, "small"),
        sculpt_warrior_mouth_vowel(f0, "mid"),
        sculpt_warrior_mouth_vowel(f0, "wide"),
    ])


# ==============================================================================
# 3. MAGE (IGNIS SOL — SHADOW-HOOD GOLDEN ARCANE EYES & SOLAR FLAME VOICE)
# ==============================================================================

def build_mage_talk_sheet() -> np.ndarray:
    f0 = quantize_crisp_320(SPRITES_DIR / "mage_ex_portrait_raw.jpg", CROPS_1024["mage"])

    def is_mage_eye_px(x: int, y: int) -> bool:
        r, g, b = int(f0[y, x, 0]), int(f0[y, x, 1]), int(f0[y, x, 2])
        return r >= 36 and (r - b) >= 18

    # F1: Seamless half-lowered shadow-hood lid (only masks upper glowing eye pixels, 0 box!)
    f1 = f0.copy()
    for y in range(124, 134):
        for x in range(140, 208):
            if is_mage_eye_px(x, y):
                hood_bg = tuple(int(v) for v in f0[146, min(194, max(152, x)), :3])
                draw_px(f1, x, y, (205, 88, 18) if y == 133 else hood_bg)

    # F2: Seamless full arcane blink (masks 100% of eye glow x=140..208, warm ember slit at y=135)
    f2 = f0.copy()
    for y in range(124, 143):
        for x in range(140, 208):
            if is_mage_eye_px(x, y):
                hood_bg = tuple(int(v) for v in f0[146, min(194, max(152, x)), :3])
                draw_px(f2, x, y, hood_bg)
    for x in range(152, 166):
        draw_px(f2, x, 135, (195, 84, 18))
    for x in range(187, 198):
        draw_px(f2, x, 135, (195, 84, 18))

    # F3: Small solar-ember mouth slit inside shadow-hood
    f3 = f0.copy()
    for x in range(170, 186):
        draw_px(f3, x, 152, (196, 68, 16))
        draw_px(f3, x, 153, (252, 186, 48) if 173 <= x <= 183 else (228, 106, 20))
        draw_px(f3, x, 154, (156, 44, 12))

    # F4: Medium flickering Black-Mage flame-grin arc
    f4 = f0.copy()
    for x in range(167, 189):
        curve = 1 if 172 <= x <= 184 else 0
        zag = (x % 3 == 0)
        draw_px(f4, x, 150 + curve, (220, 74, 18))
        draw_px(f4, x, 151 + curve, (255, 224, 92) if not zag else (245, 132, 26))
        draw_px(f4, x, 152 + curve, (255, 248, 190) if 171 <= x <= 185 else (245, 132, 26))
        draw_px(f4, x, 153 + curve, (245, 132, 26))
        draw_px(f4, x, 154 + curve, (172, 42, 14))

    # F5: Wide blazing Helios solar chant mouth + Sun-Staff & Hat-Sun flare
    f5 = f0.copy()
    for y in range(149, 159):
        inset = abs(y - 154) // 2
        for x in range(165 + inset, 191 - inset):
            dist = abs(x - 178) + abs(y - 154) * 2
            col = (255, 252, 214) if dist <= 6 else ((253, 198, 54) if dist <= 11 else (234, 88, 18))
            draw_px(f5, x, y, col)
    draw_star_sparkle(f5, 66, 204, 5, (253, 224, 71))
    draw_star_sparkle(f5, 162, 92, 4, (251, 146, 60))

    return pack_sheet([f0, f1, f2, f3, f4, f5])


# ==============================================================================
# 4. PRIESTESS (SERAPHINA — ANGELIC BLINKS & HYMN VOWELS)
# ==============================================================================

def build_priestess_talk_sheet() -> np.ndarray:
    f0 = quantize_crisp_320(SPRITES_DIR / "priestess_ex_portrait_raw.jpg", CROPS_1024["priestess"])

    def skip_hair(ref: np.ndarray, x: int, y: int) -> bool:
        r, g, b = int(ref[y, x, 0]), int(ref[y, x, 1]), int(ref[y, x, 2])
        return x <= 157 and r > 230 and g > 210 and b > 170

    f1 = sculpt_human_eyelids(
        f0, True,
        left_box=(157, 147, 176, 157),
        right_box=(191, 147, 202, 157),
        cheek_y=162,
        lash_dark=(38, 26, 22),
        lash_soft=(92, 66, 48),
        crease_col=(188, 148, 112),
        skin_shad=(226, 188, 148),
        skip_fn=skip_hair,
    )
    f2 = sculpt_human_eyelids(
        f0, False,
        left_box=(157, 147, 176, 157),
        right_box=(191, 147, 202, 157),
        cheek_y=162,
        lash_dark=(38, 26, 22),
        lash_soft=(92, 66, 48),
        crease_col=(188, 148, 112),
        skin_shad=(226, 188, 148),
        skip_fn=skip_hair,
    )
    mouth_kw = dict(
        mx0=175, mx1=189, my_top=176,
        erase_y0=175, erase_y1=181, skin_ref_y=173,
        chin_box=(169, 181, 193, 188),
        lip_col=(118, 62, 56),
        cavity_col=(96, 34, 38),
        tongue_mid=(214, 102, 106),
        tongue_lit=(242, 146, 148),
        skin_shad=(218, 180, 142),
        sparkles=[(288, 94, 5, (254, 240, 138)), (185, 118, 3, (254, 249, 195))],
    )
    return pack_sheet([
        f0, f1, f2,
        sculpt_human_vowel_mouth(f0, "small", **mouth_kw),
        sculpt_human_vowel_mouth(f0, "mid", **mouth_kw),
        sculpt_human_vowel_mouth(f0, "wide", **mouth_kw),
    ])


# ==============================================================================
# 5. CHRONOMANCER (CHRONOS — CYAN EYE BLINKS & SYMMETRICAL VOWEL SPEECH)
# ==============================================================================

def build_chronomancer_talk_sheet() -> np.ndarray:
    f0 = quantize_crisp_320(SPRITES_DIR / "chronomancer_ex_portrait_raw.jpg", CROPS_1024["chronomancer"])
    f1 = sculpt_human_eyelids(
        f0, True,
        left_box=(132, 145, 149, 152),
        right_box=(169, 145, 186, 152),
        cheek_y=158,
        lash_dark=(20, 34, 42),
        lash_soft=(54, 72, 76),
        crease_col=(168, 126, 88),
        skin_shad=(212, 166, 122),
    )
    f2 = sculpt_human_eyelids(
        f0, False,
        left_box=(132, 145, 149, 152),
        right_box=(169, 145, 186, 152),
        cheek_y=158,
        lash_dark=(20, 34, 42),
        lash_soft=(54, 72, 76),
        crease_col=(168, 126, 88),
        skin_shad=(212, 166, 122),
    )
    mouth_kw = dict(
        mx0=151, mx1=168, my_top=173,
        erase_y0=172, erase_y1=179, skin_ref_y=170,
        chin_box=(144, 179, 175, 189),
        lip_col=(86, 52, 36),
        cavity_col=(74, 28, 28),
        tongue_mid=(188, 78, 74),
        tongue_lit=(218, 112, 104),
        skin_shad=(196, 152, 108),
        sparkles=[(159, 123, 4, (94, 234, 212)), (159, 274, 4, (45, 212, 191))],
    )
    return pack_sheet([
        f0, f1, f2,
        sculpt_human_vowel_mouth(f0, "small", **mouth_kw),
        sculpt_human_vowel_mouth(f0, "mid", **mouth_kw),
        sculpt_human_vowel_mouth(f0, "wide", **mouth_kw),
    ])


# ==============================================================================
# 6. VALKYRIE (FREYJA — FIERY AMBER BLINKS & BATTLE-CRY VOWELS)
# ==============================================================================

def build_valkyrie_talk_sheet() -> np.ndarray:
    f0 = quantize_crisp_320(SPRITES_DIR / "valkyrie_ex_portrait_raw.jpg", CROPS_1024["valkyrie"])
    f1 = sculpt_human_eyelids(
        f0, True,
        left_box=(149, 126, 172, 137),
        right_box=(190, 127, 202, 137),
        cheek_y=142,
        lash_dark=(38, 16, 18),
        lash_soft=(92, 42, 38),
        crease_col=(188, 124, 104),
        skin_shad=(228, 166, 140),
    )
    f2 = sculpt_human_eyelids(
        f0, False,
        left_box=(149, 126, 172, 137),
        right_box=(190, 127, 202, 137),
        cheek_y=142,
        lash_dark=(38, 16, 18),
        lash_soft=(92, 42, 38),
        crease_col=(188, 124, 104),
        skin_shad=(228, 166, 140),
    )
    mouth_kw = dict(
        mx0=172, mx1=189, my_top=156,
        erase_y0=155, erase_y1=162, skin_ref_y=153,
        chin_box=(166, 162, 193, 172),
        lip_col=(138, 34, 34),
        cavity_col=(84, 18, 24),
        tongue_mid=(204, 72, 76),
        tongue_lit=(238, 114, 114),
        skin_shad=(218, 156, 132),
        sparkles=[(284, 42, 5, (253, 224, 71)), (185, 98, 3, (251, 191, 36))],
    )
    return pack_sheet([
        f0, f1, f2,
        sculpt_human_vowel_mouth(f0, "small", **mouth_kw),
        sculpt_human_vowel_mouth(f0, "mid", **mouth_kw),
        sculpt_human_vowel_mouth(f0, "wide", **mouth_kw),
    ])


# ==============================================================================
# 7. RONIN (KAZE-MARU — CLOSE-UP SAMURAI SQUINT & MENPO THUNDER-VENT SPEECH)
# ==============================================================================

def build_ronin_talk_sheet() -> np.ndarray:
    f0 = quantize_crisp_320(SPRITES_DIR / "ronin_ex_portrait_raw.jpg", CROPS_1024["ronin"])

    def is_ronin_eye_glow(x: int, y: int) -> bool:
        r, g, b = int(f0[y, x, 0]), int(f0[y, x, 1]), int(f0[y, x, 2])
        return b >= 125 and g >= 95

    # F1: Seamless samurai half-squint (masks only top half of glowing cyan eyes, 0 helmet box!)
    f1 = f0.copy()
    for bx0, by0, bx1, by1 in ((181, 113, 194, 117), (201, 115, 212, 118)):
        for y in range(by0, by1 + 1):
            for x in range(bx0, bx1 + 1):
                if is_ronin_eye_glow(x, y):
                    draw_px(f1, x, y, (28, 42, 74) if y < by1 else (52, 118, 168))

    # F2: Seamless full samurai eye-blink (masks cyan + white core cleanly inside socket)
    f2 = f0.copy()
    for bx0, by0, bx1, by1 in ((181, 113, 194, 121), (201, 115, 212, 122)):
        for y in range(by0, by1 + 1):
            for x in range(bx0, bx1 + 1):
                if is_ronin_eye_glow(x, y):
                    draw_px(f2, x, y, (22, 34, 62))
    for x in range(183, 192):
        draw_px(f2, x, 118, (56, 148, 196))
    for x in range(202, 210):
        draw_px(f2, x, 119, (56, 148, 196))

    # F3: Small Menpo thunder-vent speech glow
    f3 = f0.copy()
    for vx in (188, 193, 198, 203):
        draw_px(f3, vx, 129, (56, 189, 248))
        draw_px(f3, vx + 1, 129, (125, 211, 252))
        draw_px(f3, vx, 130, (14, 116, 178))

    # F4: Mid Menpo jaw-plate 1px articulation + brighter 2-row thunder vents
    f4 = f0.copy()
    shift_chin_only(f4, f0, 181, 127, 209, 143, 1)
    for vx in (187, 192, 197, 202):
        for vy in (128, 129, 130):
            draw_px(f4, vx, vy, (186, 230, 253) if vy == 129 else (56, 189, 248))
            draw_px(f4, vx + 1, vy, (255, 255, 255) if vy == 129 else (56, 189, 248))

    # F5: Wide Susanoo Menpo roar (2px jaw-plate shift + blazing white-cyan vent arc + katana spark)
    f5 = f0.copy()
    shift_chin_only(f5, f0, 181, 127, 209, 143, 2)
    for x in range(186, 206):
        draw_px(f5, x, 128, (56, 189, 248))
        draw_px(f5, x, 129, (255, 255, 255) if (x % 3 != 0) else (56, 189, 248))
        draw_px(f5, x, 130, (125, 211, 252))
        draw_px(f5, x, 131, (14, 116, 178))
    draw_star_sparkle(f5, 292, 176, 5, (125, 211, 252))

    return pack_sheet([f0, f1, f2, f3, f4, f5])


# ==============================================================================
# 8. ARCHER (SYLVARA — EMERALD ELVEN BLINKS & SYLVAN VOWELS)
# ==============================================================================

def build_archer_talk_sheet() -> np.ndarray:
    f0 = quantize_crisp_320(SPRITES_DIR / "archer_ex_portrait_raw.jpg", CROPS_1024["archer"])
    f1 = sculpt_human_eyelids(
        f0, True,
        left_box=(148, 95, 166, 104),
        right_box=(180, 96, 190, 104),
        cheek_y=108,
        lash_dark=(24, 38, 28),
        lash_soft=(68, 76, 52),
        crease_col=(176, 132, 86),
        skin_shad=(216, 172, 126),
    )
    f2 = sculpt_human_eyelids(
        f0, False,
        left_box=(148, 95, 166, 104),
        right_box=(180, 96, 190, 104),
        cheek_y=108,
        lash_dark=(24, 38, 28),
        lash_soft=(68, 76, 52),
        crease_col=(176, 132, 86),
        skin_shad=(216, 172, 126),
    )
    mouth_kw = dict(
        mx0=165, mx1=179, my_top=122,
        erase_y0=121, erase_y1=127, skin_ref_y=119,
        chin_box=(159, 127, 183, 136),
        lip_col=(104, 62, 34),
        cavity_col=(78, 28, 26),
        tongue_mid=(196, 82, 78),
        tongue_lit=(228, 122, 114),
        skin_shad=(198, 152, 104),
        sparkles=[(280, 278, 5, (52, 211, 153)), (178, 74, 3, (110, 231, 183))],
    )
    return pack_sheet([
        f0, f1, f2,
        sculpt_human_vowel_mouth(f0, "small", **mouth_kw),
        sculpt_human_vowel_mouth(f0, "mid", **mouth_kw),
        sculpt_human_vowel_mouth(f0, "wide", **mouth_kw),
    ])


# ==============================================================================
# 9. REAPER (MALAKOR — WRAITH EYE BLINKS & SPECTRAL PHANTOM-MAW SPEECH)
# ==============================================================================

def build_reaper_talk_sheet() -> np.ndarray:
    f0 = quantize_crisp_320(SPRITES_DIR / "reaper_ex_portrait_raw.jpg", CROPS_1024["reaper"])

    def is_reaper_eye_px(x: int, y: int) -> bool:
        r, g, b = int(f0[y, x, 0]), int(f0[y, x, 1]), int(f0[y, x, 2])
        return r >= 38 and (r + b) >= 72

    # F1: Seamless half-narrowed crimson-magenta wraith glare (0 black box!)
    f1 = f0.copy()
    for bx0, bx1 in ((124, 154), (160, 191)):
        for y in range(122, 132):
            for x in range(bx0, bx1 + 1):
                if is_reaper_eye_px(x, y):
                    draw_px(f1, x, y, (148, 32, 138) if y == 131 else (0, 0, 0))

    # F2: Seamless full closed wraith blink (masks 100% of white core + magenta glow cleanly!)
    f2 = f0.copy()
    for bx0, bx1 in ((124, 154), (160, 191)):
        for y in range(122, 142):
            for x in range(bx0, bx1 + 1):
                if is_reaper_eye_px(x, y):
                    draw_px(f2, x, y, (0, 0, 0))
    for x in range(136, 148):
        draw_px(f2, x, 134, (132, 28, 138))
    for x in range(166, 178):
        draw_px(f2, x, 134, (132, 28, 138))

    # F3: Small spectral soul-slit inside hood void
    f3 = f0.copy()
    for x in range(148, 166):
        draw_px(f3, x, 152, (126, 34, 206))
        draw_px(f3, x, 153, (232, 121, 249) if 151 <= x <= 163 else (168, 85, 247))
        draw_px(f3, x, 154, (88, 28, 135))

    # F4: Medium jagged phantom-skull fang maw
    f4 = f0.copy()
    for x in range(145, 169):
        fang = (x % 3 == 0)
        draw_px(f4, x, 150, (147, 51, 234))
        draw_px(f4, x, 151, (250, 232, 255) if fang else (217, 70, 239))
        draw_px(f4, x, 152, (244, 114, 182))
        draw_px(f4, x, 153, (250, 232, 255) if not fang else (192, 38, 211))
        draw_px(f4, x, 154, (107, 33, 168))

    # F5: Wide blazing abyssal soul-roar + brow & chest soul-gem surge
    f5 = f0.copy()
    for y in range(149, 159):
        inset = abs(y - 154) // 2
        for x in range(143 + inset, 171 - inset):
            dist = abs(x - 157) + abs(y - 154) * 2
            col = (255, 245, 255) if dist <= 5 else ((232, 121, 249) if dist <= 10 else (168, 34, 198))
            draw_px(f5, x, y, col)
    draw_star_sparkle(f5, 157, 94, 4, (232, 121, 249))
    draw_star_sparkle(f5, 157, 256, 5, (217, 70, 239))

    return pack_sheet([f0, f1, f2, f3, f4, f5])


# ==============================================================================
# 10. TITAN (GUNNAR — MOLTEN EYE BLINKS & MUSTACHE/BEARD FORGE SHOUT)
# ==============================================================================

def build_titan_talk_sheet() -> np.ndarray:
    f0 = quantize_crisp_320(SPRITES_DIR / "titan_ex_portrait_raw.jpg", CROPS_1024["titan"])
    C_SKIN = (176, 112, 68)
    C_SHAD = (122, 68, 38)
    C_DARK = (38, 22, 14)

    def is_titan_eye_glow(x: int, y: int) -> bool:
        r, g, b = int(f0[y, x, 0]), int(f0[y, x, 1]), int(f0[y, x, 2])
        return r >= 135 and g >= 52 and (r - b) >= 65

    # F1: Seamless rugged dwarf half-squint (masks only glowing amber eye pixels!)
    f1 = f0.copy()
    for y in range(138, 143):
        for x in range(137, 181):
            if is_titan_eye_glow(x, y):
                draw_px(f1, x, y, C_DARK if y == 142 else (C_SHAD if y <= 139 else C_SKIN))

    # F2: Seamless full rugged closed blink
    f2 = f0.copy()
    for y in range(138, 146):
        for x in range(137, 181):
            if is_titan_eye_glow(x, y):
                draw_px(f2, x, y, C_DARK if y >= 144 else (C_SHAD if y <= 140 else C_SKIN))

    # F3: Small hearty syllable part beneath orange mustache + 1px beard drop
    f3 = f0.copy()
    shift_chin_only(f3, f0, 147, 166, 170, 200, 1)
    for x in range(152, 166):
        draw_px(f3, x, 164, C_DARK)
        draw_px(f3, x, 165, (242, 238, 228) if 154 <= x <= 163 else C_DARK)
        draw_px(f3, x, 166, (92, 28, 24))

    # F4: Medium dwarf battle-speak + 2px beard drop + upper teeth
    f4 = f0.copy()
    shift_chin_only(f4, f0, 147, 166, 170, 200, 2)
    for y in range(164, 169):
        for x in range(151, 167):
            if x in (151, 166) or y == 168:
                draw_px(f4, x, y, C_DARK)
            elif y == 164 and 153 <= x <= 164:
                draw_px(f4, x, y, (246, 242, 232))
            elif y <= 166:
                draw_px(f4, x, y, (84, 24, 22))
            else:
                draw_px(f4, x, y, (186, 68, 62))

    # F5: Wide roaring Forge-Shout + 3px beard drop + teeth/tongue + Mjolnir emerald rune flare
    f5 = f0.copy()
    shift_chin_only(f5, f0, 147, 166, 170, 200, 3)
    for y in range(163, 171):
        for x in range(150, 168):
            if x in (150, 167) or y == 170:
                draw_px(f5, x, y, C_DARK)
            elif y == 163 and 152 <= x <= 165:
                draw_px(f5, x, y, (250, 246, 236))
            elif y == 169 and 153 <= x <= 164:
                draw_px(f5, x, y, (232, 226, 214))
            elif y <= 166:
                draw_px(f5, x, y, (76, 20, 20))
            else:
                draw_px(f5, x, y, (214, 92, 82) if 155 <= x <= 162 else (178, 62, 56))
    draw_star_sparkle(f5, 162, 34, 5, (52, 211, 153))
    draw_star_sparkle(f5, 172, 62, 4, (52, 211, 153))

    return pack_sheet([f0, f1, f2, f3, f4, f5])


# ==============================================================================
# 11. ICEMAGE (LYRA — BIG SAPPHIRE ANIME BLINKS & FROST-ROSE VOWELS)
# ==============================================================================

def build_icemage_talk_sheet() -> np.ndarray:
    f0 = quantize_crisp_320(SPRITES_DIR / "icemage_ex_portrait_raw.jpg", CROPS_1024["icemage"])

    def skip_ice_bangs(ref: np.ndarray, x: int, y: int) -> bool:
        if y <= 136:
            r, g, b = int(ref[y, x, 0]), int(ref[y, x, 1]), int(ref[y, x, 2])
            return r >= 185 and g >= 215 and b >= 235
        return False

    f1 = sculpt_human_eyelids(
        f0, True,
        left_box=(129, 135, 156, 149),
        right_box=(175, 136, 193, 149),
        cheek_y=154,
        lash_dark=(18, 34, 68),
        lash_soft=(52, 82, 128),
        crease_col=(196, 154, 142),
        skin_shad=(232, 194, 178),
        skip_fn=skip_ice_bangs,
    )
    f2 = sculpt_human_eyelids(
        f0, False,
        left_box=(129, 135, 156, 149),
        right_box=(175, 136, 193, 149),
        cheek_y=154,
        lash_dark=(18, 34, 68),
        lash_soft=(52, 82, 128),
        crease_col=(196, 154, 142),
        skin_shad=(232, 194, 178),
        skip_fn=skip_ice_bangs,
    )
    mouth_kw = dict(
        mx0=156, mx1=174, my_top=174,
        erase_y0=173, erase_y1=179, skin_ref_y=170,
        chin_box=(149, 179, 178, 188),
        lip_col=(128, 62, 88),
        cavity_col=(88, 26, 48),
        tongue_mid=(216, 94, 124),
        tongue_lit=(244, 142, 166),
        skin_shad=(224, 186, 172),
        sparkles=[(274, 92, 5, (186, 230, 253)), (164, 52, 4, (125, 211, 252))],
    )
    return pack_sheet([
        f0, f1, f2,
        sculpt_human_vowel_mouth(f0, "small", **mouth_kw),
        sculpt_human_vowel_mouth(f0, "mid", **mouth_kw),
        sculpt_human_vowel_mouth(f0, "wide", **mouth_kw),
    ])


# ==============================================================================
# 12. ANDROID (UNIT-07 — HOLO-VISOR CYBER BLINKS & HUMAN LIP VOWELS)
# ==============================================================================

def build_android_talk_sheet() -> np.ndarray:
    f0 = quantize_crisp_320(SPRITES_DIR / "android_ex_portrait_raw.jpg", CROPS_1024["android"])
    C_CYBER_LASH = (18, 86, 118)

    def is_visor_eye_feature(x: int, y: int) -> bool:
        r, g, b = int(f0[y, x, 0]), int(f0[y, x, 1]), int(f0[y, x, 2])
        # Inside cyan visor lens, iris/lashes have either magenta/purple tint (r > 95 and g < 185) or dark lash (g < 185 and b > 90)
        return g < 210 and b >= 95

    # F1: Seamless half-lid blink seen through translucent cyan holo-visor (0 rectangle!)
    f1 = f0.copy()
    for bx0, by0, bx1 in ((161, 97, 178), (190, 98, 202)):
        for y in range(by0, by0 + 5):
            for x in range(bx0, bx1 + 1):
                if is_visor_eye_feature(x, y):
                    glass_col = tuple(int(v) for v in f0[108, min(184, max(168, x)), :3])
                    draw_px(f1, x, y, C_CYBER_LASH if y == by0 + 4 else glass_col)

    # F2: Seamless full closed blink behind cyan holo-visor
    f2 = f0.copy()
    for bx0, by0, bx1, by1 in ((161, 97, 178, 107), (190, 98, 202, 107)):
        for y in range(by0, by1 + 1):
            for x in range(bx0, bx1 + 1):
                if is_visor_eye_feature(x, y):
                    glass_col = tuple(int(v) for v in f0[108, min(184, max(168, x)), :3])
                    draw_px(f2, x, y, glass_col)
        for x in range(bx0 + 2, bx1 - 1):
            draw_px(f2, x, by1 - 3, C_CYBER_LASH)

    mouth_kw = dict(
        mx0=176, mx1=191, my_top=132,
        erase_y0=131, erase_y1=137, skin_ref_y=129,
        chin_box=(169, 137, 193, 146),
        lip_col=(92, 24, 118),
        cavity_col=(68, 14, 78),
        tongue_mid=(214, 78, 146),
        tongue_lit=(244, 128, 182),
        skin_shad=(212, 176, 186),
        sparkles=[(162, 248, 5, (34, 211, 238)), (88, 198, 4, (244, 63, 94))],
    )
    return pack_sheet([
        f0, f1, f2,
        sculpt_human_vowel_mouth(f0, "small", **mouth_kw),
        sculpt_human_vowel_mouth(f0, "mid", **mouth_kw),
        sculpt_human_vowel_mouth(f0, "wide", **mouth_kw),
    ])


def _boost_masked_pixels(
    frame: np.ndarray,
    mask: np.ndarray,
    target_rgb: tuple[int, int, int],
    strength: float,
) -> None:
    """Blends pixels inside `mask` toward `target_rgb` by `strength` in [0, 1] without any box edges."""
    if strength <= 0.001 or not np.any(mask):
        return
    src = frame[mask, :3].astype(np.float32)
    tgt = np.array(target_rgb, dtype=np.float32)
    blended = np.clip(src * (1.0 - strength) + tgt * strength, 0, 255).astype(np.uint8)
    frame[mask, :3] = blended


def _draw_pixel_bolt(
    img: np.ndarray,
    pts: list[tuple[int, int]],
    outer_rgb: tuple[int, int, int],
    core_rgb: tuple[int, int, int] = (255, 255, 255),
) -> None:
    """Draws a crisp pixel-stepped lightning bolt polyline."""
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        steps = max(1, max(abs(x1 - x0), abs(y1 - y0)))
        for s in range(steps + 1):
            px = int(round(x0 + (x1 - x0) * (s / steps)))
            py = int(round(y0 + (y1 - y0) * (s / steps)))
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    if abs(dx) + abs(dy) == 1:
                        draw_px(img, px + dx, py + dy, outer_rgb)
            draw_px(img, px, py, core_rgb)


def _draw_pixel_petal(img: np.ndarray, cx: int, cy: int, col1: tuple[int, int, int], col2: tuple[int, int, int]) -> None:
    for dx, dy, c in ((0, 0, col1), (1, 0, col1), (0, 1, col2), (1, 1, col1), (2, 1, col2)):
        draw_px(img, cx + dx, cy + dy, c)


def _draw_pixel_flake(img: np.ndarray, cx: int, cy: int, outer: tuple[int, int, int]) -> None:
    for d in (-2, -1, 1, 2):
        draw_px(img, cx + d, cy, outer)
        draw_px(img, cx, cy + d, outer)
    for dx, dy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        draw_px(img, cx + dx, cy + dy, outer)
    draw_px(img, cx, cy, (255, 255, 255))


def apply_living_hero_motion(persona: str, sheet: np.ndarray) -> np.ndarray:
    """Adds genuine multi-part seam-free pixel motion across F0..F5 for all 12 champions
    (floating Cob drone, traveling weapon rune-waves, flaring elemental eyes, pulsing cores,
    sweeping holo-visor scanner, drifting sakura/snowflakes/embers/lightning — 0 box seams!).
    """
    yy, xx = np.mgrid[0:CELL, 0:CELL]
    f0_base = sheet[:, 0:CELL].copy()
    r0 = f0_base[:, :, 0].astype(np.int16)
    g0 = f0_base[:, :, 1].astype(np.int16)
    b0 = f0_base[:, :, 2].astype(np.int16)
    out_frames: list[np.ndarray] = [sheet[:, i * CELL : (i + 1) * CELL].copy() for i in range(FRAMES)]

    if persona == "nyx":
        # 1. Floating COB Cyber-Drone physically bobs up/down cleanly over isolated dark starry sky!
        cob_roi = (xx >= 224) & (xx <= 306) & (yy >= 104) & (yy <= 182)
        cob_mask = cob_roi & ((b0 >= 104) | ((r0 >= 112) & (b0 >= 100)))
        cob_dy_list = [0, -1, -2, 1, -2, -4]
        cob_lens = (xx >= 248) & (xx <= 278) & (yy >= 134) & (yy <= 162) & (b0 >= 150) & (g0 >= 130)
        hoodie_stars = (yy >= 190) & ((b0 >= 165) | ((r0 >= 190) & (b0 >= 150)))
        for idx, fr in enumerate(out_frames):
            dy = cob_dy_list[idx]
            if dy != 0:
                # Seamlessly restore dark night-sky background under vacated Cob pixels
                c_ys, c_xs = np.where(cob_mask)
                for py, px in zip(c_ys, c_xs):
                    ref_x = 220 if px < 265 else 309
                    fr[py, px, :3] = f0_base[py, ref_x, :3]
                for py, px in zip(c_ys, c_xs):
                    ny = py + dy
                    if 0 <= ny < CELL:
                        fr[ny, px, :3] = f0_base[py, px, :3]
            # Pulse Cob cyan eye core & twinkling orbital stars
            lens_boost = [0.0, 0.14, 0.08, 0.24, 0.38, 0.56][idx]
            if lens_boost > 0:
                shifted_lens = np.roll(cob_lens, dy, axis=0)
                _boost_masked_pixels(fr, shifted_lens, (225, 255, 255), lens_boost)
            # Twinkling hoodie nebula & sky stars (phase-shifted per frame)
            twinkle_band = hoodie_stars & (((xx + yy + idx * 17) % 29) < 7)
            _boost_masked_pixels(fr, twinkle_band, (255, 240, 255), 0.34 if idx >= 3 else 0.18)
            sp_pts = [(232, 114 + dy), (294, 122 + dy), (236, 174 + dy), (292, 170 + dy), (32, 56), (274, 48)]
            for s_i, (sx, sy) in enumerate(sp_pts):
                if (s_i + idx) % 2 == 0:
                    draw_star_sparkle(fr, sx, sy, 2 + (idx >= 4), (103, 232, 249) if s_i % 2 == 0 else (244, 114, 182))
            if idx >= 4:
                # Lively violet eye catchlights on mid/wide emphasis
                draw_px(fr, 152, 122, (255, 255, 255))
                draw_px(fr, 153, 122, (255, 255, 255))
                draw_px(fr, 196, 122, (255, 255, 255))

    elif persona == "warrior":
        # Traveling Dawn-Breaker cyan rune-energy wave up the greatsword + cathedral orbs + azure eye flare
        sword_cyan = ((b0 - r0) >= 36) & (g0 >= 130) & (xx >= 175)
        gems_cyan = ((b0 - r0) >= 36) & (g0 >= 130) & (xx >= 172) & (xx <= 212) & (((yy >= 92) & (yy <= 128)) | ((yy >= 218) & (yy <= 262)))
        wave_y = [295, 242, 194, 146, 98, 48]
        for idx, fr in enumerate(out_frames):
            wy = wave_y[idx]
            band = sword_cyan & (np.abs(yy - wy) <= 34)
            _boost_masked_pixels(fr, band, (240, 255, 255), 0.58 if idx >= 3 else 0.36)
            _boost_masked_pixels(fr, gems_cyan, (230, 255, 255), [0.0, 0.16, 0.10, 0.28, 0.44, 0.65][idx])
            if idx >= 3:
                eye_glow = (xx >= 150) & (xx <= 207) & (yy >= 138) & (yy <= 150) & ((b0 - r0) >= 36) & (g0 >= 130)
                _boost_masked_pixels(fr, eye_glow, (235, 255, 255), 0.16 if idx == 3 else (0.30 if idx == 4 else 0.48))
            orbs = [(36, 110 - idx * 5), (66, 200 - idx * 4), (242, 92 - idx * 3), (272, 162 - idx * 4)]
            for o_i, (ox, oy) in enumerate(orbs):
                if (o_i + idx) % 2 == 0:
                    draw_star_sparkle(fr, ox, oy, 2 + (idx == 5), (254, 240, 138) if o_i < 2 else (110, 234, 255))

    elif persona == "mage":
        # Blazing Sun-Staff orb + Hat sun + Chest solar core + flaring arcane eyes + rising embers
        sun_orb = (xx >= 14) & (xx <= 98) & (yy >= 156) & (yy <= 246) & (r0 >= 185) & (g0 >= 80)
        hat_chest_sun = (((xx >= 142) & (xx <= 186) & (yy >= 68) & (yy <= 110)) | ((xx >= 160) & (xx <= 208) & (yy >= 218) & (yy <= 266))) & (r0 >= 185) & (g0 >= 75)
        eye_mask = (xx >= 140) & (xx <= 208) & (yy >= 124) & (yy <= 143) & (r0 >= 95) & ((r0 - b0) >= 35)
        for idx, fr in enumerate(out_frames):
            pulse = [0.0, 0.16, 0.12, 0.30, 0.48, 0.68][idx]
            _boost_masked_pixels(fr, sun_orb, (255, 252, 210), pulse)
            _boost_masked_pixels(fr, hat_chest_sun, (255, 245, 180), pulse * 0.85)
            if idx >= 3:
                _boost_masked_pixels(fr, eye_mask, (255, 252, 224), 0.20 if idx == 3 else (0.42 if idx == 4 else 0.66))
                if idx == 5:
                    # Blazing golden eye flame-tips on wide shout
                    for ex, ey in ((146, 128), (145, 127), (147, 127), (202, 128), (203, 127)):
                        draw_px(fr, ex, ey, (255, 232, 118))
            # Rising flickering fire embers across background archway
            embers = [(42, 140 - idx * 8), (88, 128 - idx * 6), (256, 178 - idx * 9), (288, 146 - idx * 7), (274, 230 - idx * 6)]
            for e_i, (ex, ey) in enumerate(embers):
                draw_star_sparkle(fr, ex, ey, 2 if (e_i + idx) % 2 == 0 else 1, (253, 224, 71) if e_i % 2 == 0 else (249, 115, 22))
            if idx >= 3:
                draw_star_sparkle(fr, 58, 198, 3 + (idx - 3), (253, 224, 71))

    elif persona == "priestess":
        # Shimmering radiant angel wing feathers + pulsing golden sun-cross staff + angelic eye gleam
        wings_lit = ((xx <= 116) | (xx >= 232)) & (yy >= 120) & (r0 >= 210) & (g0 >= 175) & (b0 >= 110)
        cross_staff = (xx >= 236) & (yy >= 18) & (yy <= 198) & (r0 >= 200) & (g0 >= 150)
        for idx, fr in enumerate(out_frames):
            wing_band = wings_lit & (((xx + yy * 2 + idx * 36) % 90) < 30)
            _boost_masked_pixels(fr, wing_band, (255, 255, 240), 0.42 if idx >= 3 else 0.24)
            _boost_masked_pixels(fr, cross_staff, (255, 252, 220), [0.0, 0.18, 0.10, 0.30, 0.48, 0.66][idx])
            motes = [(44, 164 - idx * 6), (82, 212 - idx * 5), (274, 82 - idx * 4), (296, 134 - idx * 5), (242, 48 + idx * 3)]
            for m_i, (mx, my) in enumerate(motes):
                if (m_i + idx) % 2 == 0:
                    draw_star_sparkle(fr, mx, my, 2 + (idx == 5 and m_i == 2), (254, 240, 138))
            if idx >= 4:
                draw_px(fr, 164, 150, (255, 255, 255))
                draw_px(fr, 195, 150, (255, 255, 255))

    elif persona == "chronomancer":
        # Flowing cyan hourglass + sweeping clockface halo shimmer + pulsing Chrono-Glaive + cyan eye flare
        hg_cyan = (xx >= 142) & (xx <= 178) & (yy >= 224) & (yy <= 282) & (g0 >= 135) & (b0 >= 135) & (r0 <= 125)
        clock_ring = (yy >= 10) & (yy <= 196) & (g0 >= 120) & (b0 >= 115) & ((np.hypot(xx - 160, yy - 118) >= 64) & (np.hypot(xx - 160, yy - 118) <= 114))
        glaive_cyan = (xx >= 252) & (g0 >= 135) & (b0 >= 135) & (r0 <= 120)
        angles = np.arctan2(yy - 118, xx - 160)
        for idx, fr in enumerate(out_frames):
            _boost_masked_pixels(fr, hg_cyan, (230, 255, 255), [0.0, 0.18, 0.12, 0.34, 0.50, 0.70][idx])
            # Falling glowing sand grain inside chest hourglass
            sand_y = 242 + (idx * 5) % 22
            draw_px(fr, 160, sand_y, (255, 255, 255))
            draw_px(fr, 160, sand_y + 1, (165, 243, 252))
            # Rotating clockface luminous sweep (advancing 60 deg per cel!)
            tgt_ang = -np.pi + idx * (np.pi / 3.0)
            ang_diff = np.abs(np.arctan2(np.sin(angles - tgt_ang), np.cos(angles - tgt_ang)))
            _boost_masked_pixels(fr, clock_ring & (ang_diff < 0.72), (240, 255, 245), 0.54)
            _boost_masked_pixels(fr, glaive_cyan, (225, 255, 255), [0.0, 0.14, 0.10, 0.28, 0.44, 0.62][idx])
            if idx >= 3:
                # Strictly match saturated cyan iris pixels inside left/right eyes (0 nose-bridge skin!)
                eye_c = ((((xx >= 132) & (xx <= 149)) | ((xx >= 169) & (xx <= 186))) & (yy >= 145) & (yy <= 153) & (g0 >= 135) & (b0 >= 135) & ((b0 - r0) >= 30))
                _boost_masked_pixels(fr, eye_c, (235, 255, 255), 0.22 if idx == 3 else (0.40 if idx == 4 else 0.62))
            sx_clk = 160 + int(round(np.cos(tgt_ang) * 88))
            sy_clk = 118 + int(round(np.sin(tgt_ang) * 88))
            if sy_clk <= 156:
                draw_star_sparkle(fr, sx_clk, sy_clk, 3, (94, 234, 212))

    elif persona == "valkyrie":
        # Fiery Gungnir spearhead surge + flaming crimson-gold wing tips + crackling Bifrost lightning
        spear_fire = (xx >= 224) & (yy <= 136) & (r0 >= 185) & (g0 >= 75) & (b0 <= 115)
        wing_fire = ((xx <= 114) | (xx >= 216)) & (r0 >= 185) & (g0 >= 65) & (b0 <= 95)
        for idx, fr in enumerate(out_frames):
            _boost_masked_pixels(fr, spear_fire, (255, 252, 200), [0.0, 0.18, 0.12, 0.34, 0.52, 0.72][idx])
            w_band = wing_fire & (((yy + idx * 28) % 64) < 22)
            _boost_masked_pixels(fr, w_band, (255, 235, 130), 0.42)
            if idx >= 3:
                # Strictly match fiery amber/gold iris pixels (high r-b >= 92) inside left/right eye boxes (0 skin!)
                eye_v = ((((xx >= 152) & (xx <= 170)) | ((xx >= 191) & (xx <= 201))) & (yy >= 128) & (yy <= 137) & (r0 >= 165) & ((r0 - b0) >= 92))
                _boost_masked_pixels(fr, eye_v, (255, 252, 210), 0.22 if idx == 3 else (0.38 if idx == 4 else 0.58))
            # Crackling Bifrost lightning spark near spear/wings
            if idx in (1, 3, 4, 5):
                bx = 248 + (idx * 7) % 24
                by = 28 + (idx * 11) % 34
                _draw_pixel_bolt(fr, [(bx, by), (bx + 9, by + 7), (bx + 4, by + 16), (bx + 14, by + 23)], (251, 191, 36))
            draw_star_sparkle(fr, 44 + idx * 4, 152 - idx * 8, 2 + (idx == 5), (253, 224, 71))

    elif persona == "ronin":
        # Dynamic crackling cyan Raijin lightning arcs + drifting pink sakura petals + blazing cyan eyes
        blade_cyan = (xx >= 220) & (b0 >= 160) & (g0 >= 130)
        eye_r = (xx >= 180) & (xx <= 214) & (yy >= 112) & (yy <= 123) & (b0 >= 125) & (g0 >= 95)
        bolt_sets = [
            [(264, 58), (274, 72), (266, 86), (278, 102)],
            [(248, 86), (260, 98), (252, 114), (266, 128)],
            [(270, 122), (282, 136), (274, 152), (288, 166)],
            [(252, 64), (264, 78), (256, 94), (272, 110), (264, 126)],
            [(244, 104), (258, 118), (248, 136), (266, 152), (256, 170)],
            [(256, 48), (270, 66), (258, 84), (278, 104), (266, 126), (286, 146)],
        ]
        for idx, fr in enumerate(out_frames):
            _boost_masked_pixels(fr, blade_cyan, (235, 255, 255), [0.0, 0.16, 0.12, 0.32, 0.48, 0.68][idx])
            _draw_pixel_bolt(fr, bolt_sets[idx], (56, 189, 248))
            if idx >= 3:
                _boost_masked_pixels(fr, eye_r, (240, 255, 255), 0.22 if idx == 3 else (0.42 if idx == 4 else 0.70))
                if idx == 5:
                    for tx in range(213, 219):
                        draw_px(fr, tx, 118, (125, 211, 252) if tx > 215 else (255, 255, 255))
            # Drifting sakura petals advancing smoothly diagonally across sky
            petals = [(52, 68), (94, 142), (38, 214), (246, 38), (288, 220)]
            for p_i, (px, py) in enumerate(petals):
                nx = (px + idx * 9 + p_i * 5) % 306 + 6
                ny = (py + idx * 6) % 300 + 8
                _draw_pixel_petal(fr, nx, ny, (249, 168, 212), (244, 114, 182))

    elif persona == "archer":
        # Surging emerald Star-Bow & arrow energy + twinkling forest constellation stars + emerald eye gleam
        bow_em = (xx >= 210) & (g0 >= 145) & ((g0 - r0) >= 22)
        for idx, fr in enumerate(out_frames):
            _boost_masked_pixels(fr, bow_em, (235, 255, 240), [0.0, 0.18, 0.12, 0.34, 0.52, 0.72][idx])
            if idx >= 3:
                # Strictly match saturated emerald iris pixels inside left/right eyes (0 skin!)
                eye_a = ((((xx >= 149) & (xx <= 165)) | ((xx >= 180) & (xx <= 190))) & (yy >= 96) & (yy <= 104) & (g0 >= 140) & ((g0 - r0) >= 24))
                _boost_masked_pixels(fr, eye_a, (235, 255, 245), 0.22 if idx == 3 else (0.38 if idx == 4 else 0.58))
            stars = [(44, 52), (242, 44), (288, 128), (248, 232), (36, 224), (218, 84)]
            for s_i, (sx, sy) in enumerate(stars):
                if (s_i + idx) % 2 == 0:
                    draw_star_sparkle(fr, sx, sy, 2 + (idx >= 4 and s_i in (2, 3)), (110, 231, 183) if s_i % 2 == 0 else (254, 240, 138))

    elif persona == "reaper":
        # Flickering magenta scythe soul-flames + pulsing runes & soul-gems + flaring wraith eyes
        scythe_flame = (yy <= 122) & (r0 >= 145) & (b0 >= 140) & (g0 <= 125)
        gems_purple = (((xx >= 146) & (xx <= 168) & (yy >= 80) & (yy <= 108)) | ((xx >= 142) & (xx <= 174) & (yy >= 232) & (yy <= 284))) & (r0 >= 120) & (b0 >= 140)
        eye_rp = (xx >= 124) & (xx <= 191) & (yy >= 122) & (yy <= 141) & (r0 >= 90) & ((r0 + b0) >= 165)
        for idx, fr in enumerate(out_frames):
            f_band = scythe_flame & (((xx + idx * 24) % 58) < 24)
            _boost_masked_pixels(fr, f_band, (255, 225, 255), 0.56 if idx >= 3 else 0.34)
            _boost_masked_pixels(fr, gems_purple, (255, 230, 255), [0.0, 0.18, 0.12, 0.34, 0.52, 0.72][idx])
            if idx >= 3:
                _boost_masked_pixels(fr, eye_rp, (255, 245, 255), 0.22 if idx == 3 else (0.42 if idx == 4 else 0.68))
                if idx == 5:
                    for wx, wy in ((128, 127), (126, 126), (125, 124), (186, 127), (188, 126), (189, 124)):
                        draw_px(fr, wx, wy, (240, 171, 252))
            wisps = [(44, 152 - idx * 8), (274, 166 - idx * 8), (62, 62 - idx * 4), (254, 54 - idx * 4)]
            for w_i, (wx, wy) in enumerate(wisps):
                draw_star_sparkle(fr, wx, wy, 2 + (idx == 5), (232, 121, 249) if w_i % 2 == 0 else (192, 132, 252))

    elif persona == "titan":
        # Blazing emerald Mjolnir runes + throbbing volcanic magma chest core & lava cracks + molten eyes
        hammer_runes = (xx >= 140) & (xx <= 252) & (yy >= 8) & (yy <= 112) & (g0 >= 110) & ((g0 - r0) >= 22)
        magma_core = (xx >= 110) & (xx <= 218) & (yy >= 238) & (yy <= 318) & (r0 >= 175) & (g0 >= 65) & (b0 <= 62)
        bg_lava = ((xx <= 98) | (xx >= 228)) & (r0 >= 175) & (g0 >= 60) & (b0 <= 55)
        eye_ti = (xx >= 137) & (xx <= 181) & (yy >= 138) & (yy <= 146) & (r0 >= 135) & (g0 >= 52) & ((r0 - b0) >= 65)
        for idx, fr in enumerate(out_frames):
            _boost_masked_pixels(fr, hammer_runes, (220, 255, 235), [0.0, 0.22, 0.14, 0.40, 0.58, 0.78][idx])
            _boost_masked_pixels(fr, magma_core, (255, 250, 190), [0.0, 0.16, 0.10, 0.32, 0.50, 0.70][idx])
            _boost_masked_pixels(fr, bg_lava, (255, 232, 140), [0.0, 0.12, 0.08, 0.24, 0.36, 0.50][idx])
            if idx >= 3:
                _boost_masked_pixels(fr, eye_ti, (255, 252, 200), 0.22 if idx == 3 else (0.44 if idx == 4 else 0.72))
            sparks = [(48, 178 - idx * 9), (74, 134 - idx * 7), (268, 168 - idx * 9), (288, 118 - idx * 7), (166, 286 - idx * 5)]
            for s_i, (sx, sy) in enumerate(sparks):
                draw_star_sparkle(fr, sx, sy, 2 + (idx == 5 and s_i < 2), (52, 211, 153) if s_i == 1 else (253, 224, 71))

    elif persona == "icemage":
        # Sparkling diamond Ice-Spear & Ice Tiara crystal facet flashes + drifting pixel snowflakes + sapphire gleam
        ice_crystal = (((xx >= 218) & (yy <= 232)) | ((xx >= 92) & (xx <= 228) & (yy >= 8) & (yy <= 108))) & (b0 >= 200) & (g0 >= 175)
        for idx, fr in enumerate(out_frames):
            facet = ice_crystal & (((xx * 2 + yy + idx * 29) % 72) < 22)
            _boost_masked_pixels(fr, facet, (255, 255, 255), 0.56 if idx >= 3 else 0.34)
            if idx >= 3:
                # Strictly match saturated sapphire iris pixels inside left/right eyes (0 skin!)
                eye_i = ((((xx >= 132) & (xx <= 155)) | ((xx >= 176) & (xx <= 192))) & (yy >= 137) & (yy <= 149) & (b0 >= 175) & ((b0 - r0) >= 34))
                _boost_masked_pixels(fr, eye_i, (240, 255, 255), 0.20 if idx == 3 else (0.36 if idx == 4 else 0.54))
            flakes = [(42, 62), (78, 148), (242, 68), (294, 162), (248, 226)]
            for f_i, (fx, fy) in enumerate(flakes):
                nx = fx + ((idx * 3 + f_i * 5) % 10) - 5
                ny = fy + idx * 5
                _draw_pixel_flake(fr, nx, ny, (186, 230, 253))
            draw_star_sparkle(fr, 274, 88 + (idx % 3) * 8, 3 + (idx == 5), (186, 230, 253))

    elif persona == "android":
        # Animated sweeping cyan holo-visor scanner beam + pulsing chest reactor core & plasma blade + HUD ticks
        visor_mask = (xx >= 153) & (xx <= 214) & (yy >= 86) & (yy <= 117) & (g0 >= 160) & (b0 >= 180) & (r0 <= 160)
        core_glow = (xx >= 136) & (xx <= 232) & (yy >= 214) & (yy <= 308) & ((b0 >= 175) | (r0 >= 180))
        blade_glow = (yy >= 122) & (yy <= 246) & ((xx <= 110) | (xx >= 244)) & ((b0 >= 175) | ((r0 >= 175) & (b0 >= 150)))
        scan_xs = [162, 172, 182, 192, 200, 208]
        for idx, fr in enumerate(out_frames):
            sx_beam = scan_xs[idx]
            beam = visor_mask & (np.abs(xx - sx_beam) <= 3)
            _boost_masked_pixels(fr, beam, (255, 255, 255), 0.72)
            _boost_masked_pixels(fr, core_glow, (235, 255, 255) if idx % 2 == 0 else (255, 220, 255), [0.0, 0.20, 0.14, 0.36, 0.54, 0.72][idx])
            _boost_masked_pixels(fr, blade_glow, (240, 255, 255), [0.0, 0.16, 0.12, 0.32, 0.48, 0.68][idx])
            # Animated blinking HUD telemetry bars in dark upper-right cockpit backdrop
            for row_i in range(4):
                bar_len = 8 + ((idx * 7 + row_i * 11) % 24)
                by_hud = 96 + row_i * 7
                for bx_hud in range(256, 256 + bar_len):
                    draw_px(fr, bx_hud, by_hud, (56, 189, 248) if (row_i + idx) % 2 == 0 else (244, 114, 182))
            draw_star_sparkle(fr, 184, 260, 2 + (idx >= 4), (34, 211, 238))

    return pack_sheet(out_frames)


BUILDERS = {
    "nyx":          build_nyx_talk_sheet,
    "warrior":      build_warrior_talk_sheet,
    "mage":         build_mage_talk_sheet,
    "priestess":    build_priestess_talk_sheet,
    "chronomancer": build_chronomancer_talk_sheet,
    "valkyrie":     build_valkyrie_talk_sheet,
    "ronin":        build_ronin_talk_sheet,
    "archer":       build_archer_talk_sheet,
    "reaper":       build_reaper_talk_sheet,
    "titan":        build_titan_talk_sheet,
    "icemage":      build_icemage_talk_sheet,
    "android":      build_android_talk_sheet,
}

QA_FACE_ROIS: dict[str, tuple[int, int, int, int]] = {
    "nyx":          (128, 102, 220, 182),
    "warrior":      (136, 122, 228, 202),
    "mage":         (132, 112, 224, 192),
    "priestess":    (142, 132, 234, 212),
    "chronomancer": (114, 128, 206, 208),
    "valkyrie":     (134, 110, 226, 190),
    "ronin":        (158, 96, 250, 176),
    "archer":       (130, 80, 222, 160),
    "reaper":       (112, 110, 204, 190),
    "titan":        (114, 122, 206, 202),
    "icemage":      (118, 120, 210, 200),
    "android":      (142, 84, 234, 164),
}


VISION_CACHE_DIR = Path(os.environ.get("AVS_VISION_MASK_DIR", "/tmp/avs_vision_masks"))
ANIM_FRAMES = 8
# Smooth unified bottom-grounded breathing curve (`0px -> -2px -> 0px` over 8 frames):
# Entire upper torso, shoulders, rigid weapons, neck, head, helm/crown/ears/horns move together!
ANIM_HEAD_DYS = [0, -1, -2, -2, -2, -1, 0, 0]


def ensure_vision_masks() -> Path:
    """Runs Apple macOS Vision Neural Subject Lift (`VNGenerateForegroundInstanceMaskRequest`)
    once via Swift to produce razor-sharp 1024x1024 neural foreground masks for all 12 portraits.
    """
    VISION_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    needed = [p for p in BUILDERS if not (VISION_CACHE_DIR / f"{p}_vision_mask.png").exists()]
    if needed:
        swift_script = REPO_ROOT / "scripts" / "extract_vision_masks.swift"
        subprocess.run(
            ["swift", str(swift_script), str(SPRITES_DIR), str(VISION_CACHE_DIR)],
            check=True,
        )
    return VISION_CACHE_DIR


def load_vision_subject_mask(persona: str, rgb: np.ndarray, vision_dir: Path) -> tuple[np.ndarray, np.ndarray | None]:
    """Loads the Apple Vision neural subject mask for `persona`, cleanly restores thin weapon tips
    with ZERO detached floating chunks (`assert ncomp == 1`), preserves crisp 1px dark outline,
    and separates Nyx's truly floating Cob drone.
    """
    yy, xx = np.mgrid[0:CELL, 0:CELL]
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    lum = (r * 2 + g * 5 + b * 3) // 10

    msk_img = Image.open(vision_dir / f"{persona}_vision_mask.png").convert("L")
    crop = CROPS_1024[persona]
    if crop != (0, 0, 1024, 1024):
        msk_img = msk_img.crop(crop)
    msk_320 = np.array(msk_img.resize((CELL, CELL), Image.Resampling.BILINEAR), dtype=np.uint8)
    fg = msk_320 >= 120

    cob_mask = None
    if persona == "nyx":
        cob_roi = (xx >= 232) & (xx <= 294) & (yy >= 114) & (yy <= 172)
        cob_pix = cob_roi & ((b >= 108) | ((r >= 118) & (b >= 102)))
        cob_pix = ndimage.binary_fill_holes(ndimage.binary_closing(cob_pix, iterations=1))
        cob_mask = cob_pix
        fg = fg & (~cob_roi)
    elif persona == "chronomancer":
        # Remove the tiny XII-o'clock background clock-needle sticking out above his hair!
        clk_needle = (yy <= 58) & (xx >= 146) & (xx <= 174) & (b >= 112) & ((b - r) >= 18)
        fg = fg & (~clk_needle)
        # Restore 100% of the Chrono-Glaive blade (both cyan edge AND bronze spine down to y=198)
        # strictly OUTSIDE the giant clockface ring (`dist_clk > 107`) so ZERO clockface chunk floats!
        dist_clk = np.hypot(xx - 160, yy - 118)
        glaive_tip = (
            (xx >= 265)
            & (xx <= 319)
            & (yy >= 8)
            & (yy <= 198)
            & (dist_clk > 107.0)
            & (((b >= 82) | (g >= 92)) | ((r >= 76) & (g >= 56) & (b <= 96)))
            & (lum >= 38)
        )
        fg = fg | ndimage.binary_fill_holes(ndimage.binary_closing(glaive_tip, iterations=2))
    elif persona == "icemage":
        # Restore 100% of Lyra's Crystal Ice-Spear including ALL FOUR crystal prongs (`x=216..316, y=10..178`)
        # while excluding isolated background snowflakes (and single-component filter drops any strays!)
        bg_flake_excl = (
            ((xx >= 235) & (xx <= 268) & (yy >= 30) & (yy <= 68))
            | ((xx >= 245) & (xx <= 278) & (yy >= 164) & (yy <= 202))
            | ((xx >= 288) & (yy >= 134))
        )
        spear_zone = (xx >= 216) & (xx <= 316) & (yy >= 10) & (yy <= 178) & (~bg_flake_excl)
        spear_tip = spear_zone & (b >= 112) & (g >= 86) & ((b - r) >= 12)
        spear_tip = ndimage.binary_fill_holes(ndimage.binary_closing(spear_tip, iterations=2))
        # Preserve crisp 1px ice-blue crystal outline around all 4 prongs & spearhead
        spear_out = ndimage.binary_dilation(spear_tip, iterations=1) & (~spear_tip) & spear_zone & (b >= 58) & (lum <= 115)
        fg = fg | spear_tip | spear_out
    elif persona == "priestess":
        # Restore 100% of Seraphina's curved golden halo arch + sunburst crown spikes (0 stained-glass petals!)
        ell_p = ((xx - 168.0) / 43.0) ** 2 + ((yy - 87.0) / 23.0) ** 2
        halo_arch = (
            (ell_p >= 0.72) & (ell_p <= 1.25) & (yy >= 58) & (yy <= 86)
            & (xx >= 122) & (xx <= 212) & (r >= 165) & (g >= 132) & (b >= 80)
        )
        spikes = (
            (xx >= 130) & (xx <= 206) & (yy >= 48) & (yy <= 68)
            & (r >= 205) & (g >= 175) & (b >= 128)
        )
        fg = fg | ndimage.binary_closing(halo_arch | spikes, iterations=1)
    elif persona == "valkyrie":
        # Restore 100% of Freyja's right golden tiara headdress wing (`x=190..232, y=8..106`) down to the top tip!
        zone_v = (xx >= 190) & (xx <= 232) & (yy >= 8) & (yy <= 106)
        wing_r = zone_v & (r >= 92) & ((r - b) >= 22) & (r >= g - 12)
        wing_r = ndimage.binary_fill_holes(ndimage.binary_closing(wing_r, iterations=2))
        wing_out = ndimage.binary_dilation(wing_r, iterations=1) & zone_v & (lum <= 85)
        fg = fg | wing_r | wing_out
    elif persona == "archer":
        # Restore 100% of Sylvara's lower-left sweeping silver hair swirl + emerald shoulder cap (`y=150..282`)!
        zone_a = (xx >= 10) & (xx <= 104) & (yy >= 150) & (yy <= 282)
        hair_swirl = zone_a & (r >= 104) & (g >= 98) & ((g - r) <= 18) & (lum >= 96)
        pauldron = (xx >= 66) & (xx <= 106) & (yy >= 148) & (yy <= 202) & (g >= 80) & (b >= 58) & (lum >= 60)
        extra_a = ndimage.binary_fill_holes(ndimage.binary_closing(hair_swirl | pauldron, iterations=2))
        extra_out = ndimage.binary_dilation(extra_a, iterations=1) & zone_a & (lum <= 72)
        fg = fg | extra_a | extra_out
    elif persona == "reaper":
        # Attach connected violet/magenta Soul-Scythe flames while keeping crimson Blood-Eclipse moon intact in BG!
        is_red_moon = (r >= 132) & (g <= 80) & ((r - b) >= 34)
        zone_rp = (yy >= 0) & (yy <= 112) & (xx >= 6) & (xx <= 316) & (~is_red_moon)
        near_scythe = ndimage.binary_dilation(fg, iterations=15)
        flames = zone_rp & near_scythe & (b >= 82) & ((b - g) >= 28) & (r >= 78)
        flames = ndimage.binary_fill_holes(ndimage.binary_closing(flames, iterations=2))
        moon_gaps = is_red_moon & (yy >= 10) & (yy <= 128) & (xx >= 80) & (xx <= 246)
        fg = (fg | flames) & (~moon_gaps)

    # STRICT SINGLE-COMPONENT INVARIANT: keep strictly the single largest connected foreground body
    # (0 detached floating chunks anywhere on any of the 12 champions!)
    labeled, ncomp = ndimage.label(fg)
    if ncomp > 1:
        sizes = ndimage.sum(fg, labeled, range(1, ncomp + 1))
        main_lbl = int(np.argmax(sizes)) + 1
        fg = labeled == main_lbl

    inv = ~fg
    ilbl, incomp = ndimage.label(inv)
    border_lbls = (
        set(np.unique(ilbl[0, :]))
        | set(np.unique(ilbl[-1, :]))
        | set(np.unique(ilbl[:, 0]))
        | set(np.unique(ilbl[:, -1]))
    )
    if incomp > 0:
        isizes = ndimage.sum(inv, ilbl, range(1, incomp + 1))
        for idx_c, sz in enumerate(isizes, start=1):
            if idx_c not in border_lbls and sz <= 140:
                fg[ilbl == idx_c] = True

    dil1 = ndimage.binary_dilation(fg, iterations=1)
    fg = fg | (dil1 & (~fg) & (lum <= 52))
    # Final safety verify: strictly 1 connected component!
    labeled_fin, ncomp_fin = ndimage.label(fg)
    if ncomp_fin > 1:
        sizes_fin = ndimage.sum(fg, labeled_fin, range(1, ncomp_fin + 1))
        fg = labeled_fin == (int(np.argmax(sizes_fin)) + 1)
    _, ncomp_chk = ndimage.label(fg)
    assert ncomp_chk == 1, f"{persona}: expected strictly 1 connected component, got {ncomp_chk}"
    return fg, cob_mask


def build_seamless_stationary_bg(persona: str, rgb: np.ndarray, fg_mask: np.ndarray, cob_mask: np.ndarray | None = None) -> np.ndarray:
    """Builds a 100% smear-free stationary background via exact nearest true-BG lookup (`distance_transform_edt`),
    preserving 100% of untouched master background pixels and eliminating INPAINT_TELEA cone smears.
    """
    pad_px = 4 if persona in ("valkyrie", "android", "icemage", "chronomancer") else 2
    hole_exp = ndimage.binary_dilation(fg_mask, iterations=pad_px)
    yy_bg, xx_bg = np.mgrid[0:CELL, 0:CELL]
    if persona == "icemage":
        # Wipe out bright lower-left white fur shoulder glow rim so ZERO ghost streak stays behind Lyra's fur!
        fur_zone = fg_mask & (xx_bg <= 96) & (yy_bg >= 198)
        hole_exp = hole_exp | ndimage.binary_dilation(fur_zone, iterations=7)
    elif persona == "android":
        # Wipe out static painted plasma sparks clinging to Unit-07's upper-left Plasma Katana blade!
        katana_zone = fg_mask & (xx_bg <= 118) & (yy_bg <= 150)
        hole_exp = hole_exp | ndimage.binary_dilation(katana_zone, iterations=9)
    if cob_mask is not None:
        # Clean wider 9px halo removal strictly around floating Cob so zero stale cyan sky-glow remains beneath it
        hole_exp = hole_exp | ndimage.binary_dilation(cob_mask, iterations=9)
    valid_bg = ~hole_exp

    if not np.any(valid_bg):
        out = np.zeros((CELL, CELL, 4), dtype=np.uint8)
        out[:, :, :3] = rgb
        out[:, :, 3] = 255
        return out

    dist, indices = ndimage.distance_transform_edt(~valid_bg, return_indices=True)
    filled = rgb[indices[0], indices[1]].copy()

    smooth_fill = cv2.GaussianBlur(filled, (9, 9), 0)
    blend = np.clip((dist - 1.0) / 6.0, 0.0, 1.0)[:, :, None]
    out_rgb = filled.astype(np.float32) * (1.0 - blend) + smooth_fill.astype(np.float32) * blend
    shade = 1.0 - 0.35 * np.clip((dist - 6.0) / 18.0, 0.0, 1.0)[:, :, None]
    out_rgb = np.clip(out_rgb * shade, 0, 255).astype(np.uint8)
    out_rgb[valid_bg] = rgb[valid_bg]

    out = np.zeros((CELL, CELL, 4), dtype=np.uint8)
    out[:, :, :3] = out_rgb
    out[:, :, 3] = 255
    return out


def _apply_anim_frame_magic_shimmer(
    persona: str,
    warped: np.ndarray,
    frame_idx: int,
    face_box: tuple[int, int, int, int],
    hdy: int,
) -> None:
    """Bakes smooth 8-frame periodic pixel-exact luminous weapon, rune, gem, armor & hoodie shimmer
    directly onto the warped character cutout (ZERO geometry distortion, ZERO rubber weapon wiggle,
    and keeps Face ROI untouched for exact real-time F0..F5 lip-sync/blink stamping!).
    """
    alpha = warped[:, :, 3] > 128
    yy, xx = np.mgrid[0:CELL, 0:CELL]
    r = warped[:, :, 0].astype(np.int16)
    g = warped[:, :, 1].astype(np.int16)
    b = warped[:, :, 2].astype(np.int16)

    fx0, fy0, fx1, fy1 = face_box
    not_face = ~(
        (xx >= max(0, fx0 - 2))
        & (xx < min(CELL, fx1 + 2))
        & (yy >= max(0, fy0 + hdy - 2))
        & (yy < min(CELL, fy1 + hdy + 2))
    )
    ok = alpha & not_face

    phase = (frame_idx / ANIM_FRAMES) * 2.0 * np.pi
    pulse = 0.5 - 0.5 * np.cos(phase)  # smooth periodic 0 -> 1 -> 0 across 8 frames

    if persona == "nyx":
        hoodie_stars = ok & (yy >= 190) & ((b >= 158) | ((r >= 182) & (b >= 145)))
        twinkle = hoodie_stars & (((xx + yy + frame_idx * 13) % 24) < 8)
        _boost_masked_pixels(warped, twinkle, (255, 240, 255), 0.24 + pulse * 0.22)
    elif persona == "warrior":
        # Traveling cyan rune-wave gliding smoothly up razor-straight Dawn-Breaker blade + pulsing chest/crown gems
        sword_cyan = ok & ((b - r) >= 34) & (g >= 126) & (xx >= 175)
        wave_y = 290 - (frame_idx * 34)
        band = sword_cyan & (np.abs(yy - wave_y) <= 38)
        _boost_masked_pixels(warped, band, (240, 255, 255), 0.44)
        gems = ok & ((b - r) >= 34) & (g >= 126) & (xx >= 165) & (xx <= 215) & ((yy <= 125) | (yy >= 216))
        _boost_masked_pixels(warped, gems, (230, 255, 255), 0.12 + pulse * 0.36)
    elif persona == "mage":
        # Breathing golden solar flare on Sun-Staff orb, hat sun emblem, and chest solar amulet
        sun_orb = ok & (xx >= 14) & (xx <= 98) & (yy >= 152) & (yy <= 248) & (r >= 180) & (g >= 75)
        hat_chest = ok & (
            ((xx >= 140) & (xx <= 188) & (yy >= 64) & (yy <= 112))
            | ((xx >= 158) & (xx <= 210) & (yy >= 216) & (yy <= 268))
        ) & (r >= 180) & (g >= 72)
        _boost_masked_pixels(warped, sun_orb, (255, 252, 212), 0.14 + pulse * 0.42)
        _boost_masked_pixels(warped, hat_chest, (255, 246, 185), 0.10 + pulse * 0.34)
    elif persona == "priestess":
        # Soft celestial gold sheen sweeping gently across Seraphina's tiara, halo & gold armor trim
        gold_trim = ok & (r >= 200) & (g >= 165) & (b <= 155)
        band = gold_trim & (((xx + yy + frame_idx * 24) % 96) < 28)
        _boost_masked_pixels(warped, band, (255, 255, 232), 0.28)
    elif persona == "chronomancer":
        # Pulsing chest hourglass + traveling cyan rune-wave along rigid Chrono-Glaive blade
        hg_cyan = ok & (xx >= 140) & (xx <= 180) & (yy >= 220) & (yy <= 284) & (g >= 130) & (b >= 130) & (r <= 128)
        glaive_cyan = ok & (xx >= 254) & (g >= 125) & (b >= 125) & (r <= 128)
        _boost_masked_pixels(warped, hg_cyan, (230, 255, 255), 0.14 + pulse * 0.44)
        wy = 170 - (frame_idx * 20)
        _boost_masked_pixels(warped, glaive_cyan & (np.abs(yy - wy) <= 34), (235, 255, 255), 0.42)
    elif persona == "valkyrie":
        # Warm golden-amber sheen across winged tiara & breastplate trim
        gold_arm = ok & (r >= 195) & (g >= 135) & (b <= 110)
        band = gold_arm & (((xx + yy + frame_idx * 22) % 88) < 26)
        _boost_masked_pixels(warped, band, (255, 250, 205), 0.30)
    elif persona == "ronin":
        # Pulsing cyan thunder-chakra chest crest & gauntlets
        cyan_runes = ok & (b >= 138) & (g >= 115) & ((b - r) >= 24) & (yy >= 168)
        _boost_masked_pixels(warped, cyan_runes, (235, 255, 255), 0.14 + pulse * 0.44)
    elif persona == "archer":
        # Surging emerald starlight pulse flowing along rigid Star-Bow & arrowhead
        bow_em = ok & (xx >= 206) & (g >= 140) & ((g - r) >= 20)
        wy = 285 - (frame_idx * 34)
        _boost_masked_pixels(warped, bow_em & (np.abs(yy - wy) <= 44), (235, 255, 240), 0.46)
        _boost_masked_pixels(warped, bow_em, (220, 255, 235), 0.10 + pulse * 0.24)
    elif persona == "reaper":
        # Flickering magenta scythe soul-flames & pulsing chest/crown soul-gems
        scythe_flame = ok & (yy <= 122) & (r >= 142) & (b >= 135) & (g <= 125)
        gems_p = ok & (
            ((xx >= 144) & (xx <= 170) & (yy >= 76) & (yy <= 110))
            | ((xx >= 140) & (xx <= 176) & (yy >= 228) & (yy <= 286))
        ) & (r >= 115) & (b >= 135)
        f_band = scythe_flame & (((xx + frame_idx * 20) % 64) < 26)
        _boost_masked_pixels(warped, f_band, (255, 224, 255), 0.42)
        _boost_masked_pixels(warped, gems_p, (255, 232, 255), 0.14 + pulse * 0.44)
    elif persona == "titan":
        # Blazing emerald Mjolnir runes + throbbing volcanic chest magma core
        hammer_runes = ok & (xx >= 138) & (xx <= 254) & (yy >= 4) & (yy <= 116) & (g >= 106) & ((g - r) >= 20)
        magma_core = ok & (xx >= 108) & (xx <= 220) & (yy >= 234) & (yy <= 318) & (r >= 170) & (g >= 62) & (b <= 64)
        _boost_masked_pixels(warped, hammer_runes, (220, 255, 236), 0.18 + pulse * 0.50)
        _boost_masked_pixels(warped, magma_core, (255, 248, 188), 0.12 + pulse * 0.42)
    elif persona == "icemage":
        # Sparkling diamond crystal glint facets across rigid Ice-Spear & Ice Crown
        ice_crys = ok & (((xx >= 216) & (yy <= 236)) | ((xx >= 90) & (xx <= 230) & (yy >= 6) & (yy <= 112))) & (b >= 195) & (g >= 170)
        facet = ice_crys & (((xx * 2 + yy + frame_idx * 24) % 72) < 22)
        _boost_masked_pixels(warped, facet, (255, 255, 255), 0.44)
    elif persona == "android":
        # Pulsing cyber chest reactor core + surging plasma katana blade edge shimmer
        core_glow = ok & (xx >= 136) & (xx <= 232) & (yy >= 210) & (yy <= 308) & ((b >= 170) | (r >= 175))
        blade_glow = ok & (yy >= 118) & (yy <= 248) & ((xx <= 116) | (xx >= 238)) & ((b >= 170) | ((r >= 170) & (b >= 145)))
        _boost_masked_pixels(warped, core_glow, (235, 255, 255), 0.14 + pulse * 0.44)
        wx = (frame_idx * 40) % 320
        _boost_masked_pixels(warped, blade_glow & (np.abs(xx - wx) <= 44), (245, 255, 255), 0.46)


def build_v3_rig_weights(persona: str, f0_rgb: np.ndarray, fg_mask: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Unified V3 Hierarchical Pixel Rig Weights:
      - `wpn_w === 0` everywhere: ZERO weapon rubber-wiggle on any sword, spear, staff, bow, hammer, scythe, or katana!
      - `breath_w`: Bottom edge (`y=319`) grounded smoothly at `0.0`, ramping monotonically to `1.0` at shoulders
        and staying `1.0` across the ENTIRE upper body + rigid weapons + ENTIRE head/helm/crown/horns/cat-ears!
      - `hair_w`: Color- and anatomy-masked strictly to soft flowing hair/mane/beard strands (0 armor/gauntlet/fur/orb/quiver bleed!).
    """
    yy, xx = np.mgrid[0:CELL, 0:CELL].astype(np.float32)
    r = f0_rgb[:, :, 0].astype(np.int16)
    g = f0_rgb[:, :, 1].astype(np.int16)
    b = f0_rgb[:, :, 2].astype(np.int16)
    lum = (r * 2 + g * 5 + b * 3) // 10

    fx0, fy0, fx1, fy1 = QA_FACE_ROIS[persona]

    # 1. Unified bottom-grounded monotonic breathing (`0.0` at y=319 -> `1.0` across upper torso, weapons & entire head!)
    ramp_top = float(min(220, fy1 + 26))
    breath_w = np.clip((319.0 - yy) / max(48.0, 319.0 - ramp_top), 0.0, 1.0).astype(np.float32)
    breath_w = breath_w * breath_w * (3.0 - 2.0 * breath_w)

    head_mask = np.zeros((CELL, CELL), dtype=bool)
    hair_w = np.zeros((CELL, CELL), dtype=np.float32)

    if persona == "nyx":
        head_mask[18:182, 108:218] = True
        left_lock = (xx <= 132) & (yy >= 132) & (yy <= 212) & ((b >= 122) | (r >= 118))
        right_lock = (xx >= 200) & (xx <= 234) & (yy >= 128) & (yy <= 202) & ((b >= 122) | (r >= 118))
        hair_raw = np.where(left_lock | right_lock, np.clip((yy - 126.0) / 70.0, 0.0, 1.0), 0.0).astype(np.float32)
        hair_w = cv2.GaussianBlur(hair_raw, (9, 9), 0)
    elif persona == "warrior":
        head_mask[24:200, 122:226] = True
        mane = (xx <= 126) & (yy >= 82) & (yy <= 198) & (lum >= 122)
        mane_ramp = np.where(mane, np.clip((126.0 - xx) / 104.0, 0.0, 1.0), 0.0).astype(np.float32)
        hair_w = cv2.GaussianBlur(mane_ramp, (11, 11), 0)
    elif persona == "mage":
        head_mask[0:192, 42:298] = True
    elif persona == "priestess":
        head_mask[40:206, 118:228] = True
        left_hair = (xx <= 132) & (yy >= 162) & (yy <= 298) & (r >= 135) & (g >= 110)
        hair_ramp = np.where(left_hair, np.clip((132.0 - xx) / 96.0, 0.0, 1.0), 0.0).astype(np.float32)
        hair_w = cv2.GaussianBlur(hair_ramp, (11, 11), 0)
    elif persona == "chronomancer":
        head_mask[44:204, 108:218] = True
    elif persona == "valkyrie":
        head_mask[18:188, 110:228] = True
        rose_hair = (xx <= 134) & (yy >= 150) & (yy <= 296) & (r >= 118) & (b >= 78)
        hair_ramp = np.where(rose_hair, np.clip((134.0 - xx) / 108.0, 0.0, 1.0), 0.0).astype(np.float32)
        hair_w = cv2.GaussianBlur(hair_ramp, (11, 11), 0)
    elif persona == "ronin":
        head_mask[42:176, 146:248] = True
        # Strictly white sweeping samurai mane — exclude dark armor & bright lower-left armored gauntlet (`yy >= 205 & xx >= 82`)!
        gauntlet_excl = (yy >= 205) & (xx >= 82)
        mane = (xx <= 156) & (yy >= 44) & (yy <= 278) & (~gauntlet_excl) & (lum >= 122) & ((r + g + b) >= 355) & (r >= 98)
        mane_ramp = np.where(mane, np.clip((156.0 - xx) / 138.0, 0.0, 1.0), 0.0).astype(np.float32)
        hair_w = cv2.GaussianBlur(mane_ramp, (11, 11), 0)
    elif persona == "archer":
        head_mask[24:158, 118:222] = True
        # Strictly flowing left silver hair (including lower sweeping swirl y<=278, excluding quiver & green shoulder!)
        quiver_excl = (yy <= 152) & (xx <= 96)
        silver_hair = (xx <= 124) & (yy >= 118) & (yy <= 280) & (~quiver_excl) & (r >= 104) & ((g - r) <= 18) & (lum >= 100)
        hair_ramp = np.where(silver_hair, np.clip((124.0 - xx) / 98.0, 0.0, 1.0), 0.0).astype(np.float32)
        hair_w = cv2.GaussianBlur(hair_ramp, (11, 11), 0)
    elif persona == "reaper":
        head_mask[24:192, 92:228] = True
    elif persona == "titan":
        head_mask[56:196, 98:220] = True
        beard = (xx >= 126) & (xx <= 194) & (yy >= 202) & (yy <= 252) & (r >= 118) & ((r - b) >= 44)
        beard_ramp = np.where(beard, np.clip((yy - 198.0) / 48.0, 0.0, 1.0), 0.0).astype(np.float32)
        hair_w = cv2.GaussianBlur(beard_ramp, (9, 9), 0)
    elif persona == "icemage":
        head_mask[10:196, 100:222] = True
        # Strictly flowing ice-white hair ABOVE her solid fluffy fur shoulder collar (`yy <= 194 & xx <= 104`)!
        ice_hair = (xx <= 104) & (yy >= 110) & (yy <= 194) & (b >= 155) & (lum >= 112)
        hair_ramp = np.where(ice_hair, np.clip((104.0 - xx) / 80.0, 0.0, 1.0), 0.0).astype(np.float32)
        hair_w = cv2.GaussianBlur(hair_ramp, (11, 11), 0)
    elif persona == "android":
        head_mask[34:166, 114:234] = True
        # Strictly lower lavender bob tips strictly ABOVE her glowing cyan left shoulder orb (`yy <= 144`)!
        bob_tips = (xx >= 100) & (xx <= 140) & (yy >= 118) & (yy <= 144) & (b >= 120) & (r >= 110)
        hair_w = cv2.GaussianBlur(bob_tips.astype(np.float32), (9, 9), 0)

    head_soft = cv2.GaussianBlur(head_mask.astype(np.float32), (11, 11), 0)
    hair_w = np.clip(hair_w * np.clip(1.0 - head_soft, 0.0, 1.0), 0.0, 1.0)
    hair_w[max(0, fy0 - 6) : min(CELL, fy1 + 6), max(0, fx0 - 6) : min(CELL, fx1 + 6)] = 0.0
    breath_w = np.maximum(breath_w, head_soft)
    breath_w[max(0, fy0 - 6) : min(CELL, fy1 + 6), max(0, fx0 - 6) : min(CELL, fx1 + 6)] = 1.0

    fg_f = fg_mask.astype(np.float32)
    return breath_w * fg_f, hair_w * fg_f


def build_zero_cut_anim_sheet(persona: str, f0_rgb: np.ndarray, fg_mask: np.ndarray) -> np.ndarray:
    """Builds a silky 8-frame (`2560x320`) transparent RGBA living character loop using the V3
    Unified Hierarchical Rig strictly on the single-component Apple Vision foreground cutout:
      - ZERO weapon rubber-wiggle (`wpn_w = 0`), ZERO floating fragments (`ncomp == 1`), ZERO vertical knife-cuts!
      - Unified bottom-grounded breathing (`y=319` stays anchored at `0.0px`, whole upper body + rigid weapons +
        ENTIRE head/crown/helm/horns/ears breathe together by exact integer `ANIM_HEAD_DYS`)!
      - Smooth root-to-tip wind wave strictly on soft flowing hair/manes/beards + baked 8-frame weapon/core shimmer!
    """
    yy, xx = np.mgrid[0:CELL, 0:CELL].astype(np.float32)
    fx0, fy0, fx1, fy1 = QA_FACE_ROIS[persona]
    breath_w, hair_w = build_v3_rig_weights(persona, f0_rgb, fg_mask)

    char_rgba = np.zeros((CELL, CELL, 4), dtype=np.uint8)
    char_rgba[fg_mask, :3] = f0_rgb[fg_mask]
    char_rgba[fg_mask, 3] = 255

    hair_amp = (
        3.4 if persona == "ronin"
        else (2.8 if persona in ("warrior", "valkyrie", "priestess", "archer")
        else (2.2 if persona in ("icemage", "nyx") else 1.8))
    )

    frames = []
    for i in range(ANIM_FRAMES):
        phase = (i / ANIM_FRAMES) * 2.0 * np.pi
        hdy = float(ANIM_HEAD_DYS[i])
        wind_x = np.sin(phase - yy * 0.026)
        wind_y = np.cos(phase - xx * 0.024)

        dx = hair_w * (wind_x * hair_amp)
        dy = breath_w * hdy + hair_w * (wind_y * (hair_amp * 0.32))
        dx[fy0:fy1, fx0:fx1] = 0.0
        dy[fy0:fy1, fx0:fx1] = hdy

        warped = cv2.remap(
            char_rgba,
            (xx - dx).astype(np.float32),
            (yy - dy).astype(np.float32),
            interpolation=cv2.INTER_NEAREST,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(0, 0, 0, 0),
        )
        ihdy = ANIM_HEAD_DYS[i]
        warped[fy0 + ihdy : fy1 + ihdy, fx0:fx1] = char_rgba[fy0:fy1, fx0:fx1]
        alpha_bin = warped[:, :, 3] >= 128
        lbl_w, nw = ndimage.label(alpha_bin)
        if nw > 1:
            sz_w = ndimage.sum(alpha_bin, lbl_w, range(1, nw + 1))
            keep_w = lbl_w == (int(np.argmax(sz_w)) + 1)
            warped[~keep_w] = [0, 0, 0, 0]
            alpha_bin = keep_w
        warped[:, :, 3] = np.where(alpha_bin, 255, 0).astype(np.uint8)
        _apply_anim_frame_magic_shimmer(persona, warped, i, (fx0, fy0, fx1, fy1), ihdy)
        frames.append(warped)

    return np.concatenate(frames, axis=1)


def build_vision_layers_sheet(
    persona: str,
    f0_rgb: np.ndarray,
    fg_mask: np.ndarray,
    cob_mask: np.ndarray | None,
) -> np.ndarray:
    """Creates the 960x320 companion `<persona>_layers.png`:
      - Cell 0 (`0..320`):   100% clean non-smeared stationary portrait backdrop
      - Cell 1 (`320..640`): Empty transparent (ZERO vertical knife cuts or torn wing edges!)
      - Cell 2 (`640..960`): Nyx's isolated floating Cob drone (empty on all other 11!)
    """
    layers = np.zeros((CELL, CELL * 3, 4), dtype=np.uint8)
    layers[:, 0:CELL] = build_seamless_stationary_bg(persona, f0_rgb, fg_mask, cob_mask)
    if cob_mask is not None and np.any(cob_mask):
        cell2 = np.zeros((CELL, CELL, 4), dtype=np.uint8)
        cell2[cob_mask, :3] = f0_rgb[cob_mask]
        cell2[cob_mask, 3] = 255
        layers[:, CELL * 2 : CELL * 3] = cell2
    return layers


def render_all_qa_strips(built: dict[str, np.ndarray], layers_map: dict[str, np.ndarray], scratch_dir: Path) -> None:
    scratch_dir.mkdir(parents=True, exist_ok=True)
    labels = ["F0 IDLE", "F1 HALF-BLK", "F2 BLINK", "F3 SMALL", "F4 MID", "F5 WIDE"]
    zw, zh = 184, 160

    for batch_idx, keys in enumerate([
        ["mage", "priestess", "chronomancer", "valkyrie", "ronin"],
        ["archer", "reaper", "titan", "icemage", "android"],
    ], start=1):
        canvas = Image.new("RGBA", (zw * 6, (zh + 22) * len(keys) + 12), (12, 16, 28, 255))
        dr = ImageDraw.Draw(canvas)
        for r_idx, persona in enumerate(keys):
            sh = built[persona]
            bg = layers_map[persona][:, 0:CELL, :3]
            rx0, ry0, rx1, ry1 = QA_FACE_ROIS[persona]
            y_base = 8 + r_idx * (zh + 22)
            for c_idx, lbl in enumerate(labels):
                fg_c = sh[:, c_idx * CELL : (c_idx + 1) * CELL]
                comp = bg.copy()
                a = fg_c[:, :, 3] > 128
                comp[a] = fg_c[a, :3]
                cell_im = Image.fromarray(comp, "RGB").convert("RGBA")
                crop = cell_im.crop((rx0, ry0, rx1, ry1)).resize((zw, zh), Image.Resampling.NEAREST)
                x_base = c_idx * zw
                canvas.paste(crop, (x_base, y_base + 18))
                dr.rectangle([x_base, y_base + 18, x_base + zw - 1, y_base + 18 + zh - 1], outline=(56, 189, 248, 255))
                dr.text((x_base + 4, y_base + 2), f"{persona.upper()} {lbl}", fill=(253, 224, 71, 255))
        canvas.save(scratch_dir / f"all12_qa_batch{batch_idx}.png")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    vision_dir = ensure_vision_masks()
    built: dict[str, np.ndarray] = {}
    layers_map: dict[str, np.ndarray] = {}

    for persona, fn in BUILDERS.items():
        base_sheet = fn()
        f0_rgb = base_sheet[:, 0:CELL, :3].copy()
        fg_mask, cob_mask = load_vision_subject_mask(persona, f0_rgb, vision_dir)
        layers_sheet = build_vision_layers_sheet(persona, f0_rgb, fg_mask, cob_mask)
        anim_sheet = build_zero_cut_anim_sheet(persona, f0_rgb, fg_mask)

        sh = apply_living_hero_motion(persona, base_sheet)
        for f_idx in range(FRAMES):
            cell = sh[:, f_idx * CELL : (f_idx + 1) * CELL]
            cell[~fg_mask] = [0, 0, 0, 0]
            cell[fg_mask, 3] = 255

        out_p = OUT_DIR / f"{persona}_talk_sheet.png"
        Image.fromarray(sh, "RGBA").save(out_p, optimize=True)
        assert sh.shape == (320, 1920, 4), f"{persona} bad shape: {sh.shape}"
        for i in range(FRAMES):
            for j in range(i + 1, FRAMES):
                fi = sh[:, i * CELL : (i + 1) * CELL]
                fj = sh[:, j * CELL : (j + 1) * CELL]
                diff_px = int(np.count_nonzero(np.any(fi != fj, axis=2)))
                assert diff_px >= 12, f"{persona} F{i} vs F{j} too similar ({diff_px} px)"

        layers_p = OUT_DIR / f"{persona}_layers.png"
        Image.fromarray(layers_sheet, "RGBA").save(layers_p, optimize=True)
        assert layers_sheet.shape == (320, 960, 4), f"{persona} bad layers shape: {layers_sheet.shape}"

        anim_p = OUT_DIR / f"{persona}_anim_sheet.png"
        Image.fromarray(anim_sheet, "RGBA").save(anim_p, optimize=True)
        assert anim_sheet.shape == (320, 2560, 4), f"{persona} bad anim shape: {anim_sheet.shape}"

        kb = out_p.stat().st_size / 1024.0
        lkb = layers_p.stat().st_size / 1024.0
        akb = anim_p.stat().st_size / 1024.0
        print(f"[OK] {persona:12s}: talk={kb:5.1f}KB  layers={lkb:5.1f}KB  anim8={akb:5.1f}KB")
        built[persona] = sh
        layers_map[persona] = layers_sheet

    scratch_env = os.environ.get("AVS_SCRATCH_DIR")
    if scratch_env:
        render_all_qa_strips(built, layers_map, Path(scratch_env))
        print(f"[OK] Rendered all-12 QA strips in {scratch_env}")


if __name__ == "__main__":
    main()
