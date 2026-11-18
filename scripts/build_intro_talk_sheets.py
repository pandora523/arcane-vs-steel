#!/opt/homebrew/bin/python3.11
"""
Build Natural 6-Frame 320x320 (1920x320) Lossless Anime Lip-Sync & Blink Bust Sheets:
  - assets/sprites/intro_talk/nyx_talk_sheet.png     (for nyx_ex)
  - assets/sprites/intro_talk/warrior_talk_sheet.png (for warrior_ex & warrior)

Design Principle (Zero Forced Body/Ear Chopping — Pure Hand-Sculpted Anime Cel Expression):
  Keep 100% of head, hair, cat-ears, mane, shoulders, and weapon silhouettes rock-solid
  (zero rectangular shift_patch jiggling!), animating ONLY genuine anime facial cel states
  and gentle background starlight/rune twinkle:
    F0: Calm Neutral Closed Mouth (open eyes, cute closed fang-smile on Nyx / stern closed lips on Aethelgard)
    F1: Half-Blink Cushion Lid (50% lowered upper eyelids + lashes for buttery F0->F1->F2->F1->F0 blinks!)
    F2: Full Closed Eye-Blink (seamless local-skin closed eyelids + curved lashes, 0 iris leak)
    F3: Small / Soft Syllable Mouth ('m/s/i/e' subtle 4-5px speech part, 0px chin jump)
    F4: Medium Vowel Mouth ('o/u/eh' natural 7-8px mid-open speech, 1px jaw drop, upper teeth/fang)
    F5: Wide Accented Vowel Mouth ('a!' expressive 11-12px speech, 2px jaw drop, shaded tongue/fang + glint)
"""

from __future__ import annotations

import os
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

REPO_ROOT = Path(__file__).resolve().parents[1]
SPRITES_DIR = REPO_ROOT / "assets" / "sprites"
OUT_DIR = SPRITES_DIR / "intro_talk"

CELL = 320
FRAMES = 6
SHEET_W = CELL * FRAMES  # 1920
SHEET_H = CELL           # 320


def quantize_crisp_320(raw_jpg_path: Path, is_warrior: bool = False) -> np.ndarray:
    """Downsamples 1024x1024 pixel-art master to crisp 320x320 RGBA with zero blur & faithful skin/glow ramps."""
    raw = Image.open(raw_jpg_path).convert("RGB")
    med = raw.filter(ImageFilter.MedianFilter(size=3))
    near320 = med.resize((CELL, CELL), Image.Resampling.NEAREST)
    src = np.array(near320, dtype=np.uint8)

    q_img = near320.quantize(colors=96, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    out = np.array(q_img, dtype=np.uint8)

    r = src[:, :, 0].astype(np.int16)
    g = src[:, :, 1].astype(np.int16)
    b = src[:, :, 2].astype(np.int16)
    lum = (r * 2 + g * 5 + b * 3) // 10

    if is_warrior:
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


# ==============================================================================
# 1. NYX 6-FRAME ANIME LIP-SYNC & CUSHIONED BLINK SHEET
# ==============================================================================

def sculpt_nyx_eyelids(f0_ref: np.ndarray, half_open: bool = False) -> np.ndarray:
    """
    Sculpts either:
      - half_open=True  (F1): 50% lowered upper eyelid + thick upper lash over lower violet iris!
      - half_open=False (F2): 100% closed anime eyelid + gentle curved lash arc!
    """
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
        # F1 Half-Blink Cushion: lower upper eyelid down to y=124, thick lash at y=124..126,
        # keeping lower violet iris & pink bounce (y=127..133) visible beneath!
        for y in range(117, 125):
            for x in range(141, 171):
                if is_bang_left(x, y):
                    continue
                if x <= 142 and y >= 122:
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

        # Right eye half-blink
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

    # F2 Full Closed Blink
    for y in range(117, 134):
        for x in range(138, 172):
            if is_bang_left(x, y):
                continue
            if 138 <= x <= 142 and y >= 122:
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
    """
    3 distinct natural anime vowel mouth shapes:
      - 'small' (F3): 4-5px subtle soft consonant/syllable part ('m/s/i/e'), 0px chin jump
      - 'mid'   (F4): 7-8px rounded medium vowel ('o/u/eh'), 1px chin drop + yaeba fang
      - 'wide'  (F5): 11px expressive accented vowel ('a!'), 2px chin drop + shaded tongue + fang
    """
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

    # Seamlessly erase closed mouth using Nyx's own cheek skin column
    for y in range(149, 163):
        for x in range(159, 194):
            ref_y = 148 if x <= 185 else 149
            ref_x = min(184, x)
            f[y, x, :3] = f0_ref[ref_y, ref_x, :3]

    if vowel == "small":
        # F3: Gentle 5px soft syllable opening (x=166..183, y=152..156)
        for x in range(167, 183):
            draw_px(f, x, 152, C_LIP_OUT)
        draw_px(f, 165, 152, C_LIP_OUT)
        draw_px(f, 166, 152, C_LIP_OUT)
        draw_px(f, 183, 152, C_LIP_OUT)
        draw_px(f, 184, 152, C_LIP_OUT)

        for x in range(167, 183):
            draw_px(f, x, 153, C_WHITE if 170 <= x <= 179 else C_CAVITY)
            draw_px(f, x, 154, C_TONGUE_MID if 169 <= x <= 180 else C_CAVITY)
        draw_px(f, 166, 153, C_LIP_OUT)
        draw_px(f, 183, 153, C_LIP_OUT)
        draw_px(f, 166, 154, C_LIP_OUT)
        draw_px(f, 183, 154, C_LIP_OUT)
        for x in range(168, 182):
            draw_px(f, x, 155, C_LIP_OUT)
        # Cute tiny corner yaeba fang peek
        draw_px(f, 167, 153, C_WHITE)
        draw_px(f, 168, 153, C_WHITE)
        draw_px(f, 167, 154, C_WHITE)
        for x in range(171, 179):
            draw_px(f, x, 156, C_SKIN_SHAD)

    elif vowel == "mid":
        # F4: Medium 8px rounded vowel opening (x=165..184, y=151..158)
        for x in range(166, 184):
            uy = 151 if 168 <= x <= 181 else 152
            draw_px(f, x, uy, C_LIP_OUT)
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

        # Yaeba fang
        draw_px(f, 167, 152, C_WHITE)
        draw_px(f, 168, 152, C_WHITE)
        draw_px(f, 167, 153, C_WHITE)
        draw_px(f, 168, 153, C_WHITE)
        draw_px(f, 167, 154, C_WHITE)
        for x in range(170, 180):
            draw_px(f, x, 158, C_SKIN_SHAD)

    else:
        # F5: Expressive 11px accented vowel ('a!') D-mouth (x=164..185, y=150..160)
        lx, rx = 164, 185
        draw_px(f, lx - 1, 150, C_LIP_OUT)
        draw_px(f, rx + 1, 150, C_LIP_OUT)
        for x in range(lx, rx + 1):
            uy = 150 if (lx + 2 <= x <= rx - 2) else 151
            draw_px(f, x, uy, C_LIP_OUT)

        for y in range(151, 161):
            inset = 0
            if y == 158:
                inset = 1
            elif y == 159:
                inset = 3
            elif y == 160:
                inset = 5
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

        # Signature cute pointed yaeba fang
        draw_px(f, 166, 151, C_WHITE)
        draw_px(f, 167, 151, C_WHITE)
        draw_px(f, 168, 151, C_WHITE)
        draw_px(f, 166, 152, C_WHITE)
        draw_px(f, 167, 152, C_WHITE)
        draw_px(f, 168, 152, C_WHITE)
        draw_px(f, 167, 153, C_WHITE)
        draw_px(f, 167, 154, C_WHITE)
        for x in range(170, 180):
            draw_px(f, x, 161, C_SKIN_SHAD)

        # Subtle lively iris & Cob-drone optical core gleam on wide accented vowel (zero body/ear chop!)
        for x in range(152, 156):
            for y in range(121, 125):
                draw_px(f, x, y, (255, 255, 255))
        draw_star_sparkle(f, 263, 144, 2, (165, 243, 252))
        draw_star_sparkle(f, 263, 114, 3, (34, 211, 238))

    return f


def build_nyx_talk_sheet() -> np.ndarray:
    f0 = quantize_crisp_320(SPRITES_DIR / "nyx_ex_portrait_raw.jpg", is_warrior=False)
    f1 = sculpt_nyx_eyelids(f0, half_open=True)
    f2 = sculpt_nyx_eyelids(f0, half_open=False)
    f3 = sculpt_nyx_mouth_vowel(f0, "small")
    f4 = sculpt_nyx_mouth_vowel(f0, "mid")
    f5 = sculpt_nyx_mouth_vowel(f0, "wide")

    frames = [f0, f1, f2, f3, f4, f5]
    sheet = np.zeros((SHEET_H, SHEET_W, 4), dtype=np.uint8)
    for idx, fr in enumerate(frames):
        sheet[:, idx * CELL : (idx + 1) * CELL] = fr
    return sheet


# ==============================================================================
# 2. AETHELGARD (WARRIOR) 6-FRAME ANIME LIP-SYNC & CUSHIONED BLINK SHEET
# ==============================================================================

def sculpt_warrior_eyelids(f0_ref: np.ndarray, half_open: bool = False) -> np.ndarray:
    f = f0_ref.copy()
    C_LASH = (14, 18, 36)
    C_LASH_SOFT = (46, 36, 48)
    C_CREASE = (148, 86, 58)
    C_SKIN_SHAD = (190, 124, 88)

    if half_open:
        # F1 Half-Blink Cushion: stern narrowed upper lid at y=141..142, lower cyan eye slit visible at y=143..146!
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

    # F2 Full Closed Blink
    for y in range(137, 151):
        for x in range(149, 176):
            cheek_col = tuple(int(v) for v in f0_ref[153, min(173, max(152, x)), :3])
            if y == 137:
                draw_px(f, x, y, C_CREASE if 154 <= x <= 171 else C_SKIN_SHAD)
            elif y <= 140:
                draw_px(f, x, y, C_SKIN_SHAD)
            else:
                draw_px(f, x, y, cheek_col)

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
            if y == 138:
                draw_px(f, x, y, C_CREASE)
            elif y <= 140:
                draw_px(f, x, y, C_SKIN_SHAD)
            else:
                draw_px(f, x, y, cheek_r)

    for x in range(191, 207):
        draw_px(f, x, 146, C_LASH)
        draw_px(f, x, 147, C_LASH if 192 <= x <= 205 else C_LASH_SOFT)
        draw_px(f, x, 148, C_SKIN_SHAD)
    return f


def sculpt_warrior_mouth_vowel(f0_ref: np.ndarray, vowel: str) -> np.ndarray:
    """
    3 distinct natural vowel mouth shapes for Aethelgard:
      - 'small' (F3): 4px subtle stern consonant/syllable part, 0px chin jump
      - 'mid'   (F4): 7px commanding mid-open vowel, 1px jaw drop + upper teeth
      - 'wide'  (F5): 10px expressive accented vowel/shout, 2px jaw drop + teeth + tongue + gem gleam
    """
    f = f0_ref.copy()
    chin_drop = 0 if vowel == "small" else (1 if vowel == "mid" else 2)
    if chin_drop > 0:
        shift_chin_only(f, f0_ref, 166, 177, 196, 188, chin_drop)

    C_SKIN_SHAD = (190, 124, 88)
    C_LIP_DARK = (58, 28, 22)
    C_CAVITY = (74, 22, 24)
    C_TONGUE = (176, 68, 62)
    C_TONGUE_LIT = (208, 96, 86)
    C_TEETH = (246, 244, 238)

    for y in range(168, 177 + chin_drop):
        for x in range(170, 195):
            f[y, x, :3] = f0_ref[167, x, :3]

    if vowel == "small":
        # F3: Subtle 4px stern syllable part (x=173..191, y=169..173)
        for x in range(173, 191):
            draw_px(f, x, 169, C_LIP_DARK)
            draw_px(f, x, 170, C_TEETH if 176 <= x <= 188 else C_CAVITY)
            draw_px(f, x, 171, C_CAVITY)
            draw_px(f, x, 172, C_LIP_DARK if 175 <= x <= 189 else f0_ref[167, x, :3])
        draw_px(f, 172, 170, C_LIP_DARK)
        draw_px(f, 172, 171, C_LIP_DARK)
        draw_px(f, 191, 170, C_LIP_DARK)
        draw_px(f, 191, 171, C_LIP_DARK)
        for x in range(178, 187):
            draw_px(f, x, 174, C_SKIN_SHAD)

    elif vowel == "mid":
        # F4: Commanding 7px mid-open speech (x=172..192, y=169..175)
        for x in range(173, 192):
            draw_px(f, x, 169, C_LIP_DARK)
        for y in range(170, 175):
            draw_px(f, 172, y, C_LIP_DARK)
            draw_px(f, 192, y, C_LIP_DARK)
            for x in range(173, 192):
                if y == 170 and 175 <= x <= 190:
                    draw_px(f, x, y, C_TEETH)
                elif y in (171, 172):
                    draw_px(f, x, y, C_CAVITY)
                elif y == 173:
                    draw_px(f, x, y, C_TONGUE if 175 <= x <= 189 else C_CAVITY)
                elif y == 174:
                    draw_px(f, x, y, C_LIP_DARK)
        for x in range(177, 189):
            draw_px(f, x, 176, C_SKIN_SHAD)

    else:
        # F5: Bold 10px accented vowel / battle-cry (x=171..193, y=168..177)
        bot_y = 177
        for x in range(172, 193):
            uy = 168 if 175 <= x <= 190 else 169
            draw_px(f, x, uy, C_LIP_DARK)
        for y in range(169, bot_y + 1):
            inset = 1 if y == bot_y - 1 else (3 if y == bot_y else 0)
            xa, xb = 171 + inset, 193 - inset
            if y == bot_y:
                for x in range(xa, xb + 1):
                    draw_px(f, x, y, C_LIP_DARK)
                continue
            draw_px(f, xa, y, C_LIP_DARK)
            draw_px(f, xb, y, C_LIP_DARK)
            for x in range(xa + 1, xb):
                if y == 169 and 174 <= x <= 190:
                    draw_px(f, x, y, C_TEETH)
                elif y == bot_y - 1 and 175 <= x <= 189:
                    draw_px(f, x, y, (232, 228, 220))
                elif y <= 172:
                    draw_px(f, x, y, C_CAVITY)
                else:
                    draw_px(f, x, y, C_TONGUE_LIT if (178 <= x <= 186 and y >= 174) else C_TONGUE)
        for x in range(176, 189):
            draw_px(f, x, bot_y + 1, C_SKIN_SHAD)

        # Subtle brow-diamond & chest-gem gleam on accented peak vowel (zero body/sword chop!)
        draw_star_sparkle(f, 191, 111, 3, (110, 234, 255))
        draw_star_sparkle(f, 191, 239, 4, (110, 234, 255))

    return f


def build_warrior_talk_sheet() -> np.ndarray:
    f0 = quantize_crisp_320(SPRITES_DIR / "warrior_ex_portrait_raw.jpg", is_warrior=True)
    f1 = sculpt_warrior_eyelids(f0, half_open=True)
    f2 = sculpt_warrior_eyelids(f0, half_open=False)
    f3 = sculpt_warrior_mouth_vowel(f0, "small")
    f4 = sculpt_warrior_mouth_vowel(f0, "mid")
    f5 = sculpt_warrior_mouth_vowel(f0, "wide")

    frames = [f0, f1, f2, f3, f4, f5]
    sheet = np.zeros((SHEET_H, SHEET_W, 4), dtype=np.uint8)
    for idx, fr in enumerate(frames):
        sheet[:, idx * CELL : (idx + 1) * CELL] = fr
    return sheet


def render_qa_strips(nyx_sheet: np.ndarray, war_sheet: np.ndarray, scratch_dir: Path) -> None:
    scratch_dir.mkdir(parents=True, exist_ok=True)
    labels = [
        "F0 CLOSED",
        "F1 HALF-BLINK",
        "F2 FULL-BLINK",
        "F3 SMALL VOWEL",
        "F4 MID VOWEL",
        "F5 WIDE VOWEL",
    ]

    zw, zh = 276, 240
    zoom_strip = Image.new("RGBA", (zw * 6, zh * 2 + 56), (12, 16, 30, 255))
    zdr = ImageDraw.Draw(zoom_strip)
    for i, lbl in enumerate(labels):
        nc = Image.fromarray(nyx_sheet[:, i * CELL : (i + 1) * CELL], "RGBA").crop((128, 102, 220, 182))
        nz = nc.resize((zw, zh), Image.Resampling.NEAREST)
        zoom_strip.paste(nz, (i * zw, 24))
        zdr.rectangle([i * zw, 24, (i + 1) * zw - 1, 24 + zh - 1], outline=(217, 70, 239, 255))
        zdr.text((i * zw + 6, 6), f"NYX {lbl}", fill=(253, 224, 71, 255))

        wc = Image.fromarray(war_sheet[:, i * CELL : (i + 1) * CELL], "RGBA").crop((136, 122, 228, 202))
        wz = wc.resize((zw, zh), Image.Resampling.NEAREST)
        zoom_strip.paste(wz, (i * zw, 52 + zh))
        zdr.rectangle([i * zw, 52 + zh, (i + 1) * zw - 1, 52 + zh * 2 - 1], outline=(56, 208, 252, 255))
        zdr.text((i * zw + 6, 32 + zh), f"WAR {lbl}", fill=(56, 208, 252, 255))
    zoom_strip.save(scratch_dir / "talk_sheets_v151_face_zoom.png")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    nyx_sheet = build_nyx_talk_sheet()
    war_sheet = build_warrior_talk_sheet()

    nyx_out = OUT_DIR / "nyx_talk_sheet.png"
    war_out = OUT_DIR / "warrior_talk_sheet.png"

    Image.fromarray(nyx_sheet, "RGBA").save(nyx_out, optimize=True)
    Image.fromarray(war_sheet, "RGBA").save(war_out, optimize=True)

    for tag, sh, out_p in [("nyx", nyx_sheet, nyx_out), ("warrior", war_sheet, war_out)]:
        assert sh.shape == (320, 1920, 4), f"{tag} bad shape: {sh.shape}"
        for i in range(FRAMES):
            for j in range(i + 1, FRAMES):
                fi = sh[:, i * CELL : (i + 1) * CELL]
                fj = sh[:, j * CELL : (j + 1) * CELL]
                diff_px = int(np.count_nonzero(np.any(fi != fj, axis=2)))
                assert diff_px >= 25, f"{tag} F{i} vs F{j} too similar ({diff_px} px)"
        kb = out_p.stat().st_size / 1024.0
        print(f"[OK] Saved {out_p.relative_to(REPO_ROOT)} ({sh.shape[1]}x{sh.shape[0]}, {kb:.1f} KB)")

    scratch_env = os.environ.get("AVS_SCRATCH_DIR")
    if scratch_env:
        render_qa_strips(nyx_sheet, war_sheet, Path(scratch_env))
        print(f"[OK] Rendered v151 3x face zoom strip in {scratch_env}")


if __name__ == "__main__":
    main()
