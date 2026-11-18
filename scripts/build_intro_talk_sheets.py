#!/opt/homebrew/bin/python3.11
"""
Build Real 6-Frame 320x320 (1920x320) Lossless HD-2D Talking Bust Sheets:
  - assets/sprites/intro_talk/nyx_talk_sheet.png     (for nyx_ex)
  - assets/sprites/intro_talk/warrior_talk_sheet.png (for warrior_ex & warrior)

Source masters (read-only, 100% untouched):
  - assets/sprites/nyx_ex_portrait_raw.jpg     (1024x1024)
  - assets/sprites/warrior_ex_portrait_raw.jpg (1024x1024)

Frame Spec (6 x 320x320 = 1920x320 RGBA lossless PNG):
  F0: Neutral Idle A (closed fang-smile on Nyx / stern closed lips on Aethelgard, open eyes)
  F1: Idle Breath / Sway B (1-2px hair/cat-ear/drone or white-mane/rune-blade sway + shoulder breath)
  F2: Full Eye-Blink (sculpted closed upper-eyelid + curved lash line matching hero skin/shadow palette)
  F3: Half-Open Syllable Speak (anatomical half-open mouth, upper teeth/fang hint, 1px chin drop)
  F4: Wide-Open Expressive Speak (anatomical wide-open mouth, shaded tongue/interior + fang, 2px chin drop, glow)
  F5: Peak Emphasis / Aura Surge (wide speaking mouth + peak eye star sparkle, drone/rune flare, rising embers)
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

    # Quantize with MEDIANCUT (no dither) at 96 colors so warm peach skin, golds, and nebula hues never shift yellow
    q_img = near320.quantize(colors=96, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    out = np.array(q_img, dtype=np.uint8)

    # Snap near-black outlines cleanly for razor-sharp ink lines
    r = src[:, :, 0].astype(np.int16)
    g = src[:, :, 1].astype(np.int16)
    b = src[:, :, 2].astype(np.int16)
    lum = (r * 2 + g * 5 + b * 3) // 10

    if is_warrior:
        # Preserve warm peach/tan skin tones inside Aethelgard's face & ear region so gold armor never yellows skin
        yy, xx = np.mgrid[0:CELL, 0:CELL]
        face_zone = (xx >= 124) & (xx <= 212) & (yy >= 118) & (yy <= 190)
        skin_like = face_zone & ((r - b) >= 28) & (r >= 135) & (g >= 88) & ((r - g) >= 18)
        # Quantize skin pixels into crisp 5-step Sovereign warm peach ramp
        out[skin_like & (lum >= 208)] = [250, 206, 174]
        out[skin_like & (lum >= 184) & (lum < 208)] = [238, 184, 146]
        out[skin_like & (lum >= 158) & (lum < 184)] = [220, 156, 118]
        out[skin_like & (lum >= 128) & (lum < 158)] = [190, 124, 88]
        out[skin_like & (lum < 128)] = [148, 86, 58]

        # Restore crisp 4-step blazing sky-cyan on eyes, brow diamond, chest core & Dawn-Breaker fuller
        cyan_mask = ((b - r) > 42) & (g > 145)
        out[cyan_mask & (lum >= 230)] = [228, 252, 255]
        out[cyan_mask & (lum >= 185) & (lum < 230)] = [110, 234, 255]
        out[cyan_mask & (lum >= 145) & (lum < 185)] = [42, 198, 248]
        out[cyan_mask & (lum < 145)] = [14, 132, 212]

    rgba = np.zeros((CELL, CELL, 4), dtype=np.uint8)
    rgba[:, :, :3] = out
    rgba[:, :, 3] = 255
    return rgba


def shift_patch(
    canvas: np.ndarray,
    src: np.ndarray,
    x0: int,
    y0: int,
    x1: int,
    y1: int,
    dx: int,
    dy: int,
    fg_pred=None,
) -> None:
    """Shifts pixels inside [x0:x1, y0:y1] by integer (dx, dy) cleanly without blur."""
    patch = src[y0:y1, x0:x1].copy()
    h, w = patch.shape[:2]
    if fg_pred is not None:
        mask = fg_pred(patch)
    else:
        mask = np.ones((h, w), dtype=bool)

    # Fill vacated edge pixels with local background neighbor from src so zero gaps appear
    tx0 = max(0, x0 + dx)
    ty0 = max(0, y0 + dy)
    tx1 = min(CELL, x1 + dx)
    ty1 = min(CELL, y1 + dy)

    sx0 = tx0 - (x0 + dx)
    sy0 = ty0 - (y0 + dy)
    sx1 = sx0 + (tx1 - tx0)
    sy1 = sy0 + (ty1 - ty0)

    sub_patch = patch[sy0:sy1, sx0:sx1]
    sub_mask = mask[sy0:sy1, sx0:sx1]
    dest = canvas[ty0:ty1, tx0:tx1]
    dest[sub_mask] = sub_patch[sub_mask]


def draw_px(img: np.ndarray, x: int, y: int, rgba: tuple[int, int, int, int] | tuple[int, int, int]) -> None:
    if 0 <= x < CELL and 0 <= y < CELL:
        if len(rgba) == 3:
            img[y, x, :3] = rgba
            img[y, x, 3] = 255
        else:
            img[y, x] = rgba


def draw_rect_px(img: np.ndarray, x0: int, y0: int, x1: int, y1: int, rgb: tuple[int, int, int]) -> None:
    xa, xb = max(0, x0), min(CELL, x1)
    ya, yb = max(0, y0), min(CELL, y1)
    if xb > xa and yb > ya:
        img[ya:yb, xa:xb, :3] = rgb
        img[ya:yb, xa:xb, 3] = 255


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
# 1. NYX TALKING BUST SHEET (6 x 320x320)
# ==============================================================================

def apply_nyx_sway_and_breath(base: np.ndarray, drone_dy: int = -2, ear_dx: int = 1, breath_dy: int = -1) -> np.ndarray:
    f = base.copy()

    # 1. Subtle hoodie shoulder + raised hand breathing
    if breath_dy != 0:
        def is_hoodie_or_hand(p: np.ndarray) -> np.ndarray:
            r = p[:, :, 0].astype(np.int16)
            g = p[:, :, 1].astype(np.int16)
            b = p[:, :, 2].astype(np.int16)
            # Exclude dark cosmic navy sky (r < 32, g < 42, b < 92 with low contrast)
            not_sky = ~((r < 32) & (g < 42) & (b < 90) & ((b - r) > 18))
            return not_sky

        shift_patch(f, base, 42, 184, 306, 320, 0, breath_dy, is_hoodie_or_hand)

    # 2. Ahoge & upper cat-ear tip sway (+ear_dx)
    if ear_dx != 0:
        def is_hair_ear(p: np.ndarray) -> np.ndarray:
            r = p[:, :, 0].astype(np.int16)
            g = p[:, :, 1].astype(np.int16)
            b = p[:, :, 2].astype(np.int16)
            # Hair lilac/white or dark outline around hair (exclude dark navy sky [11..28, 16..38, 44..82])
            is_sky = (r >= 8) & (r <= 34) & (g >= 12) & (g <= 44) & (b >= 38) & (b <= 92) & ((b - r) >= 20)
            return ~is_sky

        # Shift ahoge & cat-ear silhouettes cleanly, filling ONLY true outer sky-vacated fringe pixels!
        sky_col = np.array([11, 17, 46, 255], dtype=np.uint8)
        for (x0, y0, x1, y1) in [(146, 10, 190, 54), (100, 20, 152, 66), (188, 24, 238, 68)]:
            reg = base[y0:y1, x0:x1]
            m = is_hair_ear(reg)
            shifted_m = np.zeros_like(m)
            if ear_dx > 0:
                shifted_m[:, ear_dx:] = m[:, :-ear_dx]
            else:
                shifted_m[:, :ear_dx] = m[:, -ear_dx:]
            # Only fill vacated pixels whose left neighbor in `base` was sky (never cut interior hair!)
            left_nb = base[y0:y1, max(0, x0 - abs(ear_dx)) : max(0, x1 - abs(ear_dx))]
            nb_sky = ~is_hair_ear(left_nb)
            vacated = m & (~shifted_m) & nb_sky
            f[y0:y1, x0:x1][vacated] = sky_col
            shift_patch(f, base, x0, y0, x1, y1, ear_dx, 0, is_hair_ear)

        # Subtle lower hair-lock sway alongside cheeks/neck
        shift_patch(f, base, 114, 156, 146, 224, ear_dx, 0, is_hair_ear)

    # 3. Floating Cob cyber-drone hover (x=230..292, y=108..180)
    if drone_dy != 0:
        def is_drone(p: np.ndarray) -> np.ndarray:
            r = p[:, :, 0].astype(np.int16)
            g = p[:, :, 1].astype(np.int16)
            b = p[:, :, 2].astype(np.int16)
            is_sky = (r <= 38) & (g <= 48) & (b <= 96) & (g < 80)
            return ~is_sky

        bg_sample = base[108:180, 228:294].copy()
        dr_mask = is_drone(bg_sample)
        bg_fill = np.array([16, 24, 58, 255], dtype=np.uint8)
        f[108:180, 228:294][dr_mask] = bg_fill
        shift_patch(f, base, 228, 108, 294, 180, 0, drone_dy, is_drone)

    return f


def sculpt_nyx_blink(frame: np.ndarray, f0_ref: np.ndarray) -> np.ndarray:
    """Sculpts crisp closed anime eyelids + curved plum-black lash arcs on Nyx (zero box seam, zero iris leak)."""
    f = frame.copy()

    # Sample exact local skin & shadow colors directly from Nyx's own face on f0_ref!
    skin_main = tuple(int(v) for v in f0_ref[140, 165, :3])     # exact cheek peach
    skin_right = tuple(int(v) for v in f0_ref[138, 198, :3])    # exact foreshortened right-cheek peach
    skin_shad = (224, 168, 152)
    crease_col = (184, 122, 118)
    lash_dark = (22, 12, 34)
    lash_plum = (68, 30, 68)

    # Exact hair-bang overhang mask above y<=125 ONLY where lilac hair overlaps inner eye corners
    # (Nyx's left-eye inner bang tip is at x>=167, y<=123; right-eye inner bang is at x<=192, y<=123)
    def is_bang_overhang_left(x: int, y: int) -> bool:
        if x >= 168 and y <= 124:
            r, g, b = int(f0_ref[y, x, 0]), int(f0_ref[y, x, 1]), int(f0_ref[y, x, 2])
            return (b - g) >= 18 and b >= 175
        return False

    def is_bang_overhang_right(x: int, y: int) -> bool:
        if (x <= 191 or x >= 206) and y <= 125:
            r, g, b = int(f0_ref[y, x, 0]), int(f0_ref[y, x, 1]), int(f0_ref[y, x, 2])
            return (b - g) >= 18 and b >= 175
        return False

    # 1. Viewer-Left Eye socket (x=138..171, y=117..134)
    for y in range(117, 134):
        for x in range(138, 172):
            if is_bang_overhang_left(x, y):
                continue
            # Sample smooth vertical skin column from Nyx's forehead/cheek so zero box edge can ever exist
            base_col = skin_shad if (y <= 119 and 144 <= x <= 167) else skin_main
            if y == 119 and 148 <= x <= 164:
                base_col = crease_col
            # Only overwrite pixels that belonged to the open eye / dark lash / sclera / purple iris
            r, g, b = int(f[y, x, 0]), int(f[y, x, 1]), int(f[y, x, 2])
            not_cheek_skin = abs(r - skin_main[0]) + abs(g - skin_main[1]) + abs(b - skin_main[2]) > 18
            if not_cheek_skin or (143 <= x <= 170 and 118 <= y <= 133):
                if 138 <= x <= 142 and y >= 122:
                    continue  # keep outer hair/temple pixels intact
                draw_px(f, x, y, base_col)

    # Sculpt gentle curved closed lash arc on Left Eye (y=128..130)
    for x in range(141, 170):
        curve = 1 if 148 <= x <= 164 else 0
        ly = 128 + curve
        if not is_bang_overhang_left(x, ly):
            draw_px(f, x, ly, lash_dark)
            draw_px(f, x, ly + 1, lash_dark if 144 <= x <= 167 else lash_plum)
            if 146 <= x <= 166:
                draw_px(f, x, ly - 1, skin_shad)
    # Cute outer lash wing flick on left eye
    draw_px(f, 139, 127, lash_dark)
    draw_px(f, 140, 127, lash_dark)
    draw_px(f, 140, 128, lash_dark)

    # 2. Viewer-Right Eye socket (x=189..208, y=117..134)
    for y in range(117, 134):
        for x in range(190, 207):
            if is_bang_overhang_right(x, y):
                continue
            base_col = crease_col if (y == 119 and 193 <= x <= 203) else (
                skin_shad if (y <= 119 or x >= 205) else skin_right
            )
            draw_px(f, x, y, base_col)

    for x in range(190, 207):
        curve = 1 if 194 <= x <= 203 else 0
        ly = 128 + curve
        if not is_bang_overhang_right(x, ly):
            draw_px(f, x, ly, lash_dark)
            draw_px(f, x, ly + 1, lash_dark if 192 <= x <= 205 else lash_plum)
            if 193 <= x <= 204:
                draw_px(f, x, ly - 1, skin_shad)
    draw_px(f, 207, 127, lash_dark)

    return f


def sculpt_nyx_mouth(frame: np.ndarray, f0_ref: np.ndarray, mode: str) -> np.ndarray:
    """
    Sculpts anatomical pixel-art speaking mouth on Nyx at x=163..187, y=150..162
    with clean jaw-only chin drop (keeping cheek whisker stripes 100% untouched) and cute yaeba fang!
    """
    f = frame.copy()
    chin_drop = 1 if mode == "half" else 2

    # 1. Drop ONLY the lower chin tip (x=159..192, y=163..176) so left/right cheek whiskers stay untouched
    shift_patch(f, frame, 159, 163, 192, 176, 0, chin_drop)

    C_SKIN_SHAD = (224, 168, 152)
    C_LIP_OUT = (72, 28, 52)
    C_CAVITY = (96, 24, 54)
    C_TONGUE_MID = (218, 86, 122)
    C_TONGUE_LIT = (244, 134, 164)
    C_WHITE = (255, 250, 252)

    # Clear closed mouth & smile corners (x=159..193, y=149..162) using Nyx's exact vertical cheek skin column!
    for y in range(149, 162):
        for x in range(159, 194):
            # Sample clean skin from y=148 (just above smile, avoiding nose dot at x=188..191, y=141..145)
            ref_y = 148 if x <= 185 else 149
            ref_x = min(184, x)
            f[y, x, :3] = f0_ref[ref_y, ref_x, :3]

    if mode == "half":
        # Half-open cute anime syllable mouth: x=164..185, y=151..158 (7px tall)
        # Upper lip arch
        for x in range(165, 185):
            uy = 151 if 168 <= x <= 181 else 152
            draw_px(f, x, uy, C_LIP_OUT)
        # Corners
        draw_px(f, 164, 152, C_LIP_OUT)
        draw_px(f, 164, 153, C_LIP_OUT)
        draw_px(f, 185, 152, C_LIP_OUT)
        draw_px(f, 185, 153, C_LIP_OUT)

        # Oral interior + upper teeth hint + tongue
        for y in range(152, 158):
            for x in range(165, 185):
                if y == 152 and (x <= 167 or x >= 182):
                    continue
                if y == 152 and 169 <= x <= 180:
                    draw_px(f, x, y, C_WHITE)  # Upper teeth hint
                elif y in (153, 154):
                    draw_px(f, x, y, C_CAVITY)
                elif y in (155, 156):
                    if 167 <= x <= 183:
                        draw_px(f, x, y, C_TONGUE_LIT if (y == 156 and 171 <= x <= 179) else C_TONGUE_MID)
                    else:
                        draw_px(f, x, y, C_LIP_OUT)
                elif y == 157:
                    if 168 <= x <= 182:
                        draw_px(f, x, y, C_LIP_OUT)

        # Side lip walls
        for y in range(153, 157):
            draw_px(f, 165, y, C_LIP_OUT)
            draw_px(f, 184, y, C_LIP_OUT)

        # Signature cute corner yaeba fang at x=167..168, y=152..155!
        draw_px(f, 167, 152, C_WHITE)
        draw_px(f, 168, 152, C_WHITE)
        draw_px(f, 167, 153, C_WHITE)
        draw_px(f, 168, 153, C_WHITE)
        draw_px(f, 167, 154, C_WHITE)

        # Subtle lower-lip skin shadow
        for x in range(170, 181):
            draw_px(f, x, 158, C_SKIN_SHAD)

    else:
        # Wide-open cheerful anime D-mouth ('wide' / 'surge'): x=163..186, y=150..161 (11-12px tall)
        extra_w = 1 if mode == "surge" else 0
        lx = 164 - extra_w
        rx = 185 + extra_w

        # Upper lip arch (slight happy smile curve at corners!)
        draw_px(f, lx - 1, 150, C_LIP_OUT)
        draw_px(f, rx + 1, 150, C_LIP_OUT)
        for x in range(lx, rx + 1):
            uy = 150 if (lx + 2 <= x <= rx - 2) else 151
            draw_px(f, x, uy, C_LIP_OUT)

        # Interior fill with rounded D-bottom
        for y in range(151, 162):
            inset = 0
            if y == 159:
                inset = 1
            elif y == 160:
                inset = 3
            elif y == 161:
                inset = 6
            xa = lx + inset
            xb = rx - inset
            if y == 161:
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
                    draw_px(f, x, y, C_WHITE)  # Crisp upper teeth row
                elif y <= 155:
                    draw_px(f, x, y, C_CAVITY)
                else:
                    # Warm rounded anime tongue (y=156..160)
                    dist_c = abs(x - 175)
                    t_top = 156 + (1 if dist_c >= 6 else 0)
                    if y < t_top:
                        draw_px(f, x, y, C_CAVITY)
                    elif y >= 158 and dist_c <= 4:
                        draw_px(f, x, y, C_TONGUE_LIT)
                    else:
                        draw_px(f, x, y, C_TONGUE_MID)

        # Signature cute pointed yaeba fang on left corner (x=166..168, y=151..155)!
        draw_px(f, 166, 151, C_WHITE)
        draw_px(f, 167, 151, C_WHITE)
        draw_px(f, 168, 151, C_WHITE)
        draw_px(f, 166, 152, C_WHITE)
        draw_px(f, 167, 152, C_WHITE)
        draw_px(f, 168, 152, C_WHITE)
        draw_px(f, 167, 153, C_WHITE)
        draw_px(f, 168, 153, C_WHITE)
        draw_px(f, 167, 154, C_WHITE)

        # Lower lip shadow
        for x in range(170, 181):
            draw_px(f, x, 162, C_SKIN_SHAD)

    return f


def add_nyx_glow_and_surge(frame: np.ndarray, peak: bool = False) -> np.ndarray:
    f = frame.copy()

    # Brighten violet/pink lower iris & eye speculars
    draw_rect_px(f, 152, 121, 156, 125, (255, 255, 255))
    draw_rect_px(f, 194, 121, 197, 125, (255, 255, 255))
    # Extra lower iris neon magenta bounce
    for x in range(151, 161):
        draw_px(f, x, 130, (244, 114, 182))
    for x in range(193, 200):
        draw_px(f, x, 130, (244, 114, 182))

    # Brighten Cob cyber-drone cyan optical core (centered around x=260, y=147 after -1/-2px hover)
    dy = -2 if peak else -1
    dcx, dcy = 260, 148 + dy
    draw_star_sparkle(f, dcx + 3, dcy - 3, 2, (165, 243, 252))

    if peak:
        # Peak eye 4-point star glint!
        draw_star_sparkle(f, 153, 122, 3, (232, 121, 249))
        draw_star_sparkle(f, 195, 122, 2, (232, 121, 249))

        # Cyber-drone holographic pulse ring & sparkle stars
        ring_pts = [
            (231, 138), (230, 145), (231, 152),
            (289, 138), (290, 145), (289, 152),
            (248, 174), (260, 176), (272, 174),
        ]
        for rx, ry in ring_pts:
            draw_px(f, rx, ry, (34, 211, 238))
            draw_px(f, rx, ry + 1, (217, 70, 239))

        draw_star_sparkle(f, 263, 110, 4, (34, 211, 238))
        draw_star_sparkle(f, 234, 164, 4, (165, 243, 252))
        draw_star_sparkle(f, 283, 171, 4, (244, 114, 182))

        # Rising pixel cosmic embers around Nyx
        embers = [
            (66, 98, (34, 211, 238)),
            (82, 54, (244, 114, 182)),
            (52, 168, (192, 132, 252)),
            (246, 76, (34, 211, 238)),
            (296, 102, (244, 114, 182)),
            (302, 204, (34, 211, 238)),
            (74, 226, (34, 211, 238)),
        ]
        for ex, ey, col in embers:
            draw_star_sparkle(f, ex, ey, 2, col)

    return f


def add_nyx_ambient_stars(frame: np.ndarray, phase: int) -> np.ndarray:
    """Adds subtle multi-frame twinkling starlight & cosmic dust motion across all 6 frames."""
    f = frame.copy()
    star_sets = [
        [(30, 34, (34, 211, 238)), (298, 42, (244, 114, 182)), (44, 214, (192, 132, 252))],
        [(30, 33, (165, 243, 252)), (298, 40, (255, 255, 255)), (58, 128, (34, 211, 238))],
        [(46, 86, (244, 114, 182)), (286, 62, (34, 211, 238)), (36, 176, (165, 243, 252))],
        [(62, 108, (34, 211, 238)), (248, 86, (192, 132, 252)), (300, 148, (34, 211, 238))],
        [(64, 102, (165, 243, 252)), (248, 80, (244, 114, 182)), (300, 142, (165, 243, 252)), (78, 62, (34, 211, 238))],
        [(66, 94, (255, 255, 255)), (248, 72, (34, 211, 238)), (300, 134, (244, 114, 182)), (80, 52, (244, 114, 182))],
    ]
    for sx, sy, col in star_sets[phase % len(star_sets)]:
        draw_star_sparkle(f, sx, sy, 2, col)
    return f


def build_nyx_talk_sheet() -> np.ndarray:
    f0 = add_nyx_ambient_stars(quantize_crisp_320(SPRITES_DIR / "nyx_ex_portrait_raw.jpg", is_warrior=False), 0)
    f1 = add_nyx_ambient_stars(apply_nyx_sway_and_breath(f0, drone_dy=-4, ear_dx=2, breath_dy=-2), 1)
    f2_base = apply_nyx_sway_and_breath(f0, drone_dy=-2, ear_dx=1, breath_dy=-1)
    f2 = add_nyx_ambient_stars(sculpt_nyx_blink(f2_base, f0), 2)

    f3_base = apply_nyx_sway_and_breath(f0, drone_dy=-2, ear_dx=1, breath_dy=-1)
    f3 = add_nyx_ambient_stars(sculpt_nyx_mouth(f3_base, f0, mode="half"), 3)

    f4_base = apply_nyx_sway_and_breath(f0, drone_dy=-3, ear_dx=2, breath_dy=-2)
    f4 = add_nyx_ambient_stars(add_nyx_glow_and_surge(sculpt_nyx_mouth(f4_base, f0, mode="wide"), peak=False), 4)

    f5_base = apply_nyx_sway_and_breath(f0, drone_dy=-5, ear_dx=3, breath_dy=-2)
    f5 = add_nyx_ambient_stars(add_nyx_glow_and_surge(sculpt_nyx_mouth(f5_base, f0, mode="surge"), peak=True), 5)

    frames = [f0, f1, f2, f3, f4, f5]
    sheet = np.zeros((SHEET_H, SHEET_W, 4), dtype=np.uint8)
    for idx, fr in enumerate(frames):
        sheet[:, idx * CELL : (idx + 1) * CELL] = fr
    return sheet


# ==============================================================================
# 2. AETHELGARD (WARRIOR) TALKING BUST SHEET (6 x 320x320)
# ==============================================================================

def apply_warrior_sway_and_breath(base: np.ndarray, mane_dx: int = 2, breath_dy: int = -1) -> np.ndarray:
    f = base.copy()

    def is_not_dark_cathedral(p: np.ndarray) -> np.ndarray:
        r = p[:, :, 0].astype(np.int16)
        g = p[:, :, 1].astype(np.int16)
        b = p[:, :, 2].astype(np.int16)
        lum = (r * 2 + g * 5 + b * 3) // 10
        return ~((lum <= 28) & (r <= 24))

    # 1. Two-tier flowing white mane parallax wind-billow on left (zero interior seam!)
    if mane_dx != 0:
        bg_dark = np.array([2, 8, 24, 255], dtype=np.uint8)
        for (x0, y0, x1, y1, dx_cur) in [
            (6, 72, 124, 168, mane_dx),
            (4, 168, 108, 286, mane_dx + (1 if mane_dx > 0 else -1)),
        ]:
            reg = base[y0:y1, x0:x1]
            m = is_not_dark_cathedral(reg)
            shifted_m = np.zeros_like(m)
            if dx_cur > 0:
                shifted_m[:, dx_cur:] = m[:, :-dx_cur]
            else:
                shifted_m[:, :dx_cur] = m[:, -dx_cur:]
            vacated = m & (~shifted_m)
            f[y0:y1, x0:x1][vacated] = bg_dark
            shift_patch(f, base, x0, y0, x1, y1, dx_cur, 0, is_not_dark_cathedral)

    # 2. Pauldron + Dawn-Breaker greatsword breathing lift
    if breath_dy != 0:
        shift_patch(f, base, 34, 198, 318, 320, 0, breath_dy, is_not_dark_cathedral)
        shift_patch(f, base, 236, 10, 320, 198, 0, breath_dy, is_not_dark_cathedral)

    return f


def sculpt_warrior_blink(frame: np.ndarray, f0_ref: np.ndarray) -> np.ndarray:
    """Sculpts stern noble closed eyelids + dark lash lines on Aethelgard (zero cyan sclera leak, zero box seam)."""
    f = frame.copy()

    C_LASH = (14, 18, 36)
    C_LASH_SOFT = (46, 36, 48)
    C_CREASE = (148, 86, 58)
    C_SKIN_SHAD = (190, 124, 88)

    # 1. Viewer-Left Eye socket (x=149..176, y=137..150): sample vertical cheek skin column from y=153!
    for y in range(137, 151):
        for x in range(149, 176):
            cheek_col = tuple(int(v) for v in f0_ref[153, min(173, max(152, x)), :3])
            if y == 137:
                draw_px(f, x, y, C_CREASE if 154 <= x <= 171 else C_SKIN_SHAD)
            elif y <= 140:
                draw_px(f, x, y, C_SKIN_SHAD)
            else:
                draw_px(f, x, y, cheek_col)

    # Stern closed lash line on Left Eye resting cleanly at lower lid (y=145..147)
    for x in range(150, 175):
        ly = 145 if x <= 157 else 146
        draw_px(f, x, ly, C_LASH)
        draw_px(f, x, ly + 1, C_LASH if 153 <= x <= 172 else C_LASH_SOFT)
        draw_px(f, x, ly + 2, C_SKIN_SHAD)
    draw_px(f, 148, 144, C_LASH)
    draw_px(f, 149, 144, C_LASH)

    # 2. Viewer-Right Eye socket (x=190..207, y=138..150): sample vertical right-cheek skin column from y=153!
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
        ly = 146
        draw_px(f, x, ly, C_LASH)
        draw_px(f, x, ly + 1, C_LASH if 192 <= x <= 205 else C_LASH_SOFT)
        draw_px(f, x, ly + 2, C_SKIN_SHAD)

    return f


def sculpt_warrior_mouth(frame: np.ndarray, f0_ref: np.ndarray, mode: str) -> np.ndarray:
    """
    Sculpts commanding pixel-art speaking / battle-cry mouth on Aethelgard
    at x=171..193, y=168..179 with seamless local-skin matching & 1-2px jaw drop!
    """
    f = frame.copy()
    chin_drop = 1 if mode == "half" else 2

    # 1. Drop lower chin curve (x=166..196, y=177..188) by +chin_drop px
    shift_patch(f, frame, 166, 177, 196, 188, 0, chin_drop)

    C_SKIN_SHAD = (190, 124, 88)
    C_LIP_DARK = (58, 28, 22)
    C_CAVITY = (74, 22, 24)
    C_TONGUE = (176, 68, 62)
    C_TONGUE_LIT = (208, 96, 86)
    C_TEETH = (246, 244, 238)

    # Clear closed mouth line seamlessly using Aethelgard's exact horizontal skin gradient at y=167!
    for y in range(168, 177 + chin_drop):
        for x in range(170, 195):
            f[y, x, :3] = f0_ref[167, x, :3]

    if mode == "half":
        # Commanding half-open syllable mouth: x=172..192, y=169..175 (6-7px tall)
        for x in range(173, 192):
            draw_px(f, x, 169, C_LIP_DARK)
        draw_px(f, 172, 170, C_LIP_DARK)
        draw_px(f, 192, 170, C_LIP_DARK)

        for y in range(170, 175):
            draw_px(f, 172, y, C_LIP_DARK)
            draw_px(f, 192, y, C_LIP_DARK)
            for x in range(173, 192):
                if y == 170 and 175 <= x <= 190:
                    draw_px(f, x, y, C_TEETH)  # Crisp upper teeth glint
                elif y in (171, 172):
                    draw_px(f, x, y, C_CAVITY)
                elif y == 173:
                    draw_px(f, x, y, C_TONGUE if 175 <= x <= 189 else C_CAVITY)
                elif y == 174:
                    draw_px(f, x, y, C_LIP_DARK)

        for x in range(177, 189):
            draw_px(f, x, 176, C_SKIN_SHAD)
    else:
        # Heroic wide-open battle-cry / chant mouth: x=171..193, y=168..178 (11px tall)
        extra_h = 1 if mode == "surge" else 0
        bot_y = 177 + extra_h

        for x in range(172, 193):
            uy = 168 if 175 <= x <= 190 else 169
            draw_px(f, x, uy, C_LIP_DARK)

        for y in range(169, bot_y + 1):
            inset = 0
            if y == bot_y - 1:
                inset = 1
            elif y == bot_y:
                inset = 3
            xa = 171 + inset
            xb = 193 - inset

            if y == bot_y:
                for x in range(xa, xb + 1):
                    draw_px(f, x, y, C_LIP_DARK)
                continue

            draw_px(f, xa, y, C_LIP_DARK)
            draw_px(f, xb, y, C_LIP_DARK)
            for x in range(xa + 1, xb):
                if y in (169, 170) and 174 <= x <= 190:
                    if y == 169 or (175 <= x <= 189):
                        draw_px(f, x, y, C_TEETH)
                    else:
                        draw_px(f, x, y, C_CAVITY)
                elif y == bot_y - 1 and 175 <= x <= 189:
                    # Subtle lower teeth glint on battle-cry!
                    draw_px(f, x, y, (232, 228, 220))
                elif y <= 173:
                    draw_px(f, x, y, C_CAVITY)
                else:
                    draw_px(f, x, y, C_TONGUE_LIT if (178 <= x <= 186 and y >= 175) else C_TONGUE)

        for x in range(176, 189):
            draw_px(f, x, bot_y + 1, C_SKIN_SHAD)

    return f


def add_warrior_glow_and_surge(frame: np.ndarray, peak: bool = False) -> np.ndarray:
    f = frame.copy()

    # Brighten blazing cyan eyes + brow diamond (191, 111) + chest gem (191, 240)
    draw_rect_px(f, 160, 140, 167, 143, (236, 254, 255))
    draw_rect_px(f, 195, 140, 201, 143, (236, 254, 255))
    draw_star_sparkle(f, 191, 111, 4 if peak else 2, (110, 234, 255), (255, 255, 255))
    draw_star_sparkle(f, 191, 239, 5 if peak else 3, (110, 234, 255), (255, 255, 255))

    if peak:
        # Peak eye star glints!
        draw_star_sparkle(f, 162, 141, 3, (110, 234, 255))
        draw_star_sparkle(f, 197, 141, 2, (110, 234, 255))

        # Dawn-Breaker Greatsword Rune Flare along diagonal fuller!
        fuller_sparks = [
            (226, 222),
            (250, 184),
            (274, 144),
            (298, 104),
        ]
        for fx, fy in fuller_sparks:
            draw_star_sparkle(f, fx, fy, 4, (56, 208, 252), (255, 255, 255))

        # Rising Sovereign Gold & Sky-Cyan pixel embers in cathedral air
        embers = [
            (38, 72, (252, 226, 104)),
            (62, 124, (240, 178, 54)),
            (24, 188, (252, 226, 104)),
            (254, 58, (56, 208, 252)),
            (282, 258, (56, 208, 252)),
            (304, 214, (252, 226, 104)),
        ]
        for ex, ey, col in embers:
            draw_star_sparkle(f, ex, ey, 2, col)

    return f


def add_warrior_ambient_aura(frame: np.ndarray, phase: int) -> np.ndarray:
    """Adds subtle traveling fuller shimmer & rising cathedral gold/cyan embers across all 6 frames."""
    f = frame.copy()
    ember_sets = [
        [(46, 90, (252, 226, 104)), (258, 70, (56, 208, 252))],
        [(46, 84, (255, 251, 230)), (258, 64, (110, 234, 255)), (28, 152, (240, 178, 54))],
        [(48, 78, (240, 178, 54)), (260, 58, (56, 208, 252)), (296, 232, (56, 208, 252))],
        [(44, 104, (252, 226, 104)), (242, 196, (110, 234, 255)), (294, 224, (252, 226, 104))],
        [(42, 96, (255, 251, 230)), (256, 174, (255, 255, 255)), (296, 214, (110, 234, 255))],
        [(40, 88, (252, 226, 104)), (270, 150, (255, 255, 255)), (298, 204, (56, 208, 252))],
    ]
    for ex, ey, col in ember_sets[phase % len(ember_sets)]:
        draw_star_sparkle(f, ex, ey, 2, col)
    return f


def build_warrior_talk_sheet() -> np.ndarray:
    f0 = add_warrior_ambient_aura(quantize_crisp_320(SPRITES_DIR / "warrior_ex_portrait_raw.jpg", is_warrior=True), 0)
    f1 = add_warrior_ambient_aura(apply_warrior_sway_and_breath(f0, mane_dx=2, breath_dy=-2), 1)
    f2_base = apply_warrior_sway_and_breath(f0, mane_dx=1, breath_dy=-1)
    f2 = add_warrior_ambient_aura(sculpt_warrior_blink(f2_base, f0), 2)

    f3_base = apply_warrior_sway_and_breath(f0, mane_dx=1, breath_dy=-1)
    f3 = add_warrior_ambient_aura(sculpt_warrior_mouth(f3_base, f0, mode="half"), 3)

    f4_base = apply_warrior_sway_and_breath(f0, mane_dx=2, breath_dy=-2)
    f4 = add_warrior_ambient_aura(add_warrior_glow_and_surge(sculpt_warrior_mouth(f4_base, f0, mode="wide"), peak=False), 4)

    f5_base = apply_warrior_sway_and_breath(f0, mane_dx=3, breath_dy=-3)
    f5 = add_warrior_ambient_aura(add_warrior_glow_and_surge(sculpt_warrior_mouth(f5_base, f0, mode="surge"), peak=True), 5)

    frames = [f0, f1, f2, f3, f4, f5]
    sheet = np.zeros((SHEET_H, SHEET_W, 4), dtype=np.uint8)
    for idx, fr in enumerate(frames):
        sheet[:, idx * CELL : (idx + 1) * CELL] = fr
    return sheet


def render_qa_strips(nyx_sheet: np.ndarray, war_sheet: np.ndarray, scratch_dir: Path) -> None:
    scratch_dir.mkdir(parents=True, exist_ok=True)
    labels = [
        "F0 IDLE A",
        "F1 SWAY/BREATH",
        "F2 EYE-BLINK",
        "F3 HALF SPEAK",
        "F4 WIDE SPEAK",
        "F5 PEAK SURGE",
    ]

    # 1. Full 6-frame contact strip (stacked Nyx + Warrior)
    full = Image.new("RGBA", (SHEET_W, SHEET_H * 2 + 56), (8, 12, 24, 255))
    dr = ImageDraw.Draw(full)
    full.paste(Image.fromarray(nyx_sheet, "RGBA"), (0, 24))
    full.paste(Image.fromarray(war_sheet, "RGBA"), (0, 24 + SHEET_H + 28))
    for i, lbl in enumerate(labels):
        gx = i * CELL
        dr.rectangle([gx, 24, gx + CELL - 1, 24 + CELL - 1], outline=(217, 70, 239, 255))
        dr.text((gx + 8, 6), f"NYX {lbl}", fill=(253, 224, 71, 255))
        dr.rectangle([gx, 52 + CELL, gx + CELL - 1, 52 + CELL * 2 - 1], outline=(56, 208, 252, 255))
        dr.text((gx + 8, 32 + CELL), f"WARRIOR {lbl}", fill=(253, 224, 71, 255))
    full.save(scratch_dir / "talk_sheets_6frame_contact.png")

    # 2. 3x Zoomed Anatomical Eye & Mouth Inspection Strip!
    # Nyx face crop: (128, 104, 220, 182) -> 92x78 * 3 = 276x234
    # Warrior face crop: (140, 124, 224, 196) -> 84x72 * 3 = 252x216
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
    zoom_strip.save(scratch_dir / "talk_sheets_face_zoom_qa.png")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    nyx_sheet = build_nyx_talk_sheet()
    war_sheet = build_warrior_talk_sheet()

    nyx_out = OUT_DIR / "nyx_talk_sheet.png"
    war_out = OUT_DIR / "warrior_talk_sheet.png"

    Image.fromarray(nyx_sheet, "RGBA").save(nyx_out, optimize=True)
    Image.fromarray(war_sheet, "RGBA").save(war_out, optimize=True)

    # Quantitative distinct-frame verification
    for tag, sh, out_p in [("nyx", nyx_sheet, nyx_out), ("warrior", war_sheet, war_out)]:
        assert sh.shape == (320, 1920, 4), f"{tag} bad shape: {sh.shape}"
        for i in range(FRAMES):
            for j in range(i + 1, FRAMES):
                fi = sh[:, i * CELL : (i + 1) * CELL]
                fj = sh[:, j * CELL : (j + 1) * CELL]
                diff_px = int(np.count_nonzero(np.any(fi != fj, axis=2)))
                assert diff_px >= 40, f"{tag} F{i} vs F{j} too similar ({diff_px} px)"
        kb = out_p.stat().st_size / 1024.0
        print(f"[OK] Saved {out_p.relative_to(REPO_ROOT)} ({sh.shape[1]}x{sh.shape[0]}, {kb:.1f} KB)")

    scratch_env = os.environ.get("AVS_SCRATCH_DIR")
    if scratch_env:
        render_qa_strips(nyx_sheet, war_sheet, Path(scratch_env))
        print(f"[OK] Rendered QA contact & 3x face zoom strips in {scratch_env}")


if __name__ == "__main__":
    main()
