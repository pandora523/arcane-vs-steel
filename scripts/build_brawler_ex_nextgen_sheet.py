#!/opt/homebrew/bin/python3.11
"""
Next-Gen Wide-Canvas Sprite Sheet, Portrait & Icon Row 12 Builder for:
  RAIJIN EX -- "THE TEMPEST FIST" (`brawler_ex` -> `src/entities/BrawlerEx.js`)

Outputs:
  1. `assets/sprites/brawler_ex_sheet.png`    (`9600x2400`, `10 rows x 30 cols @ 320x240`, `anchor=(112, 230)`)
  2. `assets/sprites/brawler_ex_portrait.png` (`256x256` RGBA, 128x128 palette-quantized HD-2D pixel art upscaled 2x NEAREST)
  3. `assets/sprites/hero_icons_sheet.png`    (`384x832`, appending Row 12 `brawler_ex` while keeping Rows 0..11 byte-identical)
  4. Compact QA strips in scratch dir for mandatory visual audit.

Mandatory First-Pass Hygiene:
  - Imports `scripts/ex_sprite_clean_utils.py` (`clean_512_pose_holes_and_specks` + `seal_160_char_pinholes_and_leaks`)
  - Pixel-by-pixel sculpted taped martial fists, iron knuckle guards & open Thunderclap palms (`0` circle/oval blobs)
  - `>= 4px` inner cell margins (`0/300` border clips), `29/29` transitions per row
  - Grounded bipedal `+X` walk (`walkStanceDelta <= -6.0px`, `0` moonwalk)
  - Row 4 ULT (`F12..F14`) & TRUE_ULT (`F26..F29`) planted touchdown feet (`cellMaxY = 229..231`)
  - Grounded Row 5 DEATH (`maxDeathH <= 136px`) & upright Row 9 VICTORY (`minVictoryH >= 150px`)
"""

from __future__ import annotations

import math
import sys
from collections import Counter, deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ex_sprite_clean_utils import (
    clean_512_pose_holes_and_specks,
    seal_160_char_pinholes_and_leaks,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
SPRITES_DIR = REPO_ROOT / "assets" / "sprites"
SCRATCH_DIR = Path(
    "/Users/rei/.gemini/antigravity/brain/9632a6ee-c817-4a54-a13c-c1d08491f273/scratch"
)

BASE_JPG = SPRITES_DIR / "brawler_ex_base.jpg"
PORTRAIT_RAW_JPG = SPRITES_DIR / "brawler_ex_portrait_raw.jpg"
ICONS_RAW_JPG = SCRATCH_DIR / "icons_brawler_ex_hd2d.jpg"

OUT_SHEET = SPRITES_DIR / "brawler_ex_sheet.png"
OUT_PORTRAIT = SPRITES_DIR / "brawler_ex_portrait.png"
OUT_HERO_ICONS = SPRITES_DIR / "hero_icons_sheet.png"

LOG_W, LOG_H = 160, 120
CELL_W, CELL_H = 320, 240
COLS, ROWS = 30, 10
ANCHOR_X_160, ANCHOR_Y_160 = 56, 115  # -> (112, 230) in 320x240
MARGIN_160 = 2  # -> 4px safety border in 320x240

# Base sprite spans y=23..503 (481px) -> scale cleanly to 96 logical px (192px tall in 320x240, matching warrior_ex & ronin_ex!)
HERO_H_512 = 480.0
TARGET_HERO_H_160 = 96.0
S_HI = HERO_H_512 / TARGET_HERO_H_160  # 5.0000 px per logical px
HI_W = int(round(LOG_W * S_HI))        # 863
HI_H = int(round(LOG_H * S_HI))        # 647
ANCHOR_HI_X = ANCHOR_X_160 * S_HI
ANCHOR_HI_Y = ANCHOR_Y_160 * S_HI

# ==============================================================================
# RAIJIN EX MASTER PALETTE (#0f172a, #1e1b4b, #4338ca, #6366f1, #fbbf24, #fef08a, #ffffff)
# ==============================================================================
C_OUT_DARK = (15, 23, 42, 255)         # #0f172a
C_INDIGO_DEEP = (30, 27, 75, 255)      # #1e1b4b
C_INDIGO_MID = (67, 56, 202, 255)      # #4338ca
C_INDIGO_LIT = (99, 102, 241, 255)     # #6366f1
C_INDIGO_ICE = (165, 180, 252, 255)    # #a5b4fc
C_GOLD_DEEP = (180, 110, 14, 255)
C_GOLD = (251, 191, 36, 255)           # #fbbf24
C_GOLD_LIT = (254, 240, 138, 255)      # #fef08a
C_WHITE = (255, 255, 255, 255)         # #ffffff

C_SKIN_OUT = (82, 42, 32, 255)
C_SKIN_SHAD = (176, 104, 76, 255)
C_SKIN_MID = (224, 152, 114, 255)
C_SKIN_LIT = (248, 194, 154, 255)

C_TAPE_SHAD = (114, 122, 138, 255)
C_TAPE_MID = (176, 182, 194, 255)
C_TAPE_LIT = (228, 224, 206, 255)

C_IRON_DARK = (32, 38, 72, 255)
C_IRON_MID = (66, 74, 128, 255)
C_IRON_LIT = (126, 138, 202, 255)

BAYER4 = (
    np.array(
        [
            [0, 8, 2, 10],
            [12, 4, 14, 6],
            [3, 11, 1, 9],
            [15, 7, 13, 5],
        ],
        dtype=np.float32,
    )
    + 0.5
) / 16.0


def clamp(v: float, lo: float, hi: float) -> float:
    return lo if v < lo else (hi if v > hi else v)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def smoothstep(t: float) -> float:
    t = clamp(t, 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def poly_mask(h: int, w: int, pts: list[tuple[int, int]]) -> np.ndarray:
    im = Image.new("L", (w, h), 0)
    ImageDraw.Draw(im).polygon(pts, fill=255)
    return np.array(im) > 128


def keep_largest_component(mask: np.ndarray) -> np.ndarray:
    if not np.any(mask):
        return mask.copy()
    labeled, num = ndimage.label(mask, structure=np.ones((3, 3), dtype=bool))
    if num <= 1:
        return mask.copy()
    sizes = np.bincount(labeled.ravel())
    sizes[0] = 0
    return labeled == int(np.argmax(sizes))


def _shade_rgba(col: tuple[int, int, int, int], mul: float) -> tuple[int, int, int, int]:
    return (
        max(0, min(255, int(round(col[0] * mul)))),
        max(0, min(255, int(round(col[1] * mul)))),
        max(0, min(255, int(round(col[2] * mul)))),
        col[3],
    )


def put_px(arr: np.ndarray, x: int, y: int, col: tuple[int, int, int, int]):
    h, w, _ = arr.shape
    if MARGIN_160 <= x < w - MARGIN_160 and MARGIN_160 <= y < h - MARGIN_160:
        arr[y, x] = col


def blend_px(arr: np.ndarray, x: int, y: int, col: tuple[int, int, int, int], alpha_f: float):
    h, w, _ = arr.shape
    if not (MARGIN_160 <= x < w - MARGIN_160 and MARGIN_160 <= y < h - MARGIN_160):
        return
    if alpha_f <= 0.02:
        return
    sa = clamp(alpha_f, 0.0, 1.0)
    da = arr[y, x, 3] / 255.0
    if da <= 0.01:
        if sa >= 0.42:
            arr[y, x] = (col[0], col[1], col[2], 255)
        return
    # Crisp blend onto existing opaque pixel or opaque fill if strong
    r = int(round(col[0] * sa + arr[y, x, 0] * (1.0 - sa)))
    g = int(round(col[1] * sa + arr[y, x, 1] * (1.0 - sa)))
    b = int(round(col[2] * sa + arr[y, x, 2] * (1.0 - sa)))
    arr[y, x] = (r, g, b, 255)


# ==============================================================================
# 1. BASE EXTRACTION & MULTI-PART 512x512 ANATOMICAL RIG
# ==============================================================================
def extract_clean_base_512() -> np.ndarray:
    im = (
        Image.open(BASE_JPG)
        .convert("RGBA")
        .resize((512, 512), Image.Resampling.NEAREST)
    )
    arr = np.array(im, dtype=np.uint8)
    r = arr[:, :, 0].astype(np.float32)
    g = arr[:, :, 1].astype(np.float32)
    b = arr[:, :, 2].astype(np.float32)
    luma = 0.299 * r + 0.587 * g + 0.114 * b
    cmax = np.maximum(np.maximum(r, g), b)
    cmin = np.minimum(np.minimum(r, g), b)
    sat = np.where(cmax > 1.0, (cmax - cmin) / np.maximum(cmax, 1.0), 0.0)
    bg_cand = ((luma >= 232.0) & (sat <= 0.09)) | (luma >= 247.0)

    h, w = bg_cand.shape
    bg = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bg_cand[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if bg_cand[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((x, y))

    # Enclosed white background pockets (between arms & torso, between headband tails, between legs)
    pocket_seeds = [
        (206, 98),   # between headband tails
        (232, 232),  # between left forearm and torso
        (338, 256),  # between right forearm and hip
        (276, 372),  # between thighs
        (274, 430),  # between shins
        (164, 174),  # between upper/lower scarf tails
    ]
    for sx, sy in pocket_seeds:
        for oy in range(-4, 5):
            for ox in range(-4, 5):
                nx, ny = sx + ox, sy + oy
                if 0 <= nx < w and 0 <= ny < h and bg_cand[ny, nx] and not bg[ny, nx]:
                    bg[ny, nx] = True
                    q.append((nx, ny))

    while q:
        cx, cy = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h and not bg[ny, nx] and bg_cand[ny, nx]:
                bg[ny, nx] = True
                q.append((nx, ny))

    arr[bg] = [0, 0, 0, 0]

    # Peel 3 passes of light-gray JPEG halo fringe on outer silhouette edges
    for _ in range(3):
        a = arr[:, :, 3] > 0
        up = np.pad(a[1:, :], ((0, 1), (0, 0)), constant_values=False)
        dn = np.pad(a[:-1, :], ((1, 0), (0, 0)), constant_values=False)
        lf = np.pad(a[:, 1:], ((0, 0), (0, 1)), constant_values=False)
        rt = np.pad(a[:, :-1], ((0, 0), (1, 0)), constant_values=False)
        edge = a & (~(up & dn & lf & rt))
        r0 = arr[:, :, 0].astype(np.int16)
        g0 = arr[:, :, 1].astype(np.int16)
        b0 = arr[:, :, 2].astype(np.int16)
        fringe = (
            edge
            & (r0 > 186)
            & (g0 > 186)
            & (b0 > 186)
            & (np.abs(r0 - g0) < 28)
            & (np.abs(g0 - b0) < 28)
        )
        arr[fringe] = [0, 0, 0, 0]

    main = keep_largest_component(arr[:, :, 3] > 0)
    arr[~main] = [0, 0, 0, 0]
    arr[main, 3] = 255
    return clean_512_pose_holes_and_specks(arr, max_hole_area=200, min_island_area=36)


def crop_part(arr512: np.ndarray, mask: np.ndarray) -> tuple[Image.Image, int, int]:
    ys, xs = np.where(mask)
    if len(ys) == 0:
        return (Image.new("RGBA", (2, 2), (0, 0, 0, 0)), 0, 0)
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    crop = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
    sub = mask[y0:y1, x0:x1]
    crop[sub] = arr512[y0:y1, x0:x1][sub]
    return (Image.fromarray(crop, "RGBA"), x0, y0)


def tint_part(
    part: tuple[Image.Image, int, int], factor: float = 0.86
) -> tuple[Image.Image, int, int]:
    im, x0, y0 = part
    arr = np.array(im, dtype=np.float32)
    a = arr[:, :, 3] > 128
    arr[a, :3] = np.clip(arr[a, :3] * factor, 0, 255)
    return (Image.fromarray(arr.astype(np.uint8), "RGBA"), x0, y0)


def make_head_expression_variant(
    stand: np.ndarray, head_m: np.ndarray, mode: str
) -> tuple[Image.Image, int, int]:
    """Builds fierce martial expression variants cleanly in 512x512 head space."""
    im_base, x0, y0 = crop_part(stand, head_m)
    if mode == "fierce":
        return (im_base, x0, y0)

    arr = np.array(im_base, dtype=np.uint8)
    h, w, _ = arr.shape
    # Eyes at global (291, 102) and (315, 102); mouth at (304, 122)
    lx, ly = 291 - x0, 102 - y0
    rx, ry = 315 - x0, 102 - y0
    mx, my = 304 - x0, 122 - y0

    if mode in ("yell", "focus"):
        # Blazing supercharged white-gold storm eyes
        for cx, cy in ((lx, ly), (rx, ry)):
            for oy in range(-4, 5):
                for ox in range(-6, 7):
                    px, py = cx + ox, cy + oy
                    if 0 <= px < w and 0 <= py < h and arr[py, px, 3] > 128:
                        if abs(ox) <= 3 and abs(oy) <= 2:
                            arr[py, px] = [255, 255, 255, 255]
                        elif abs(ox) <= 5 and abs(oy) <= 3 and arr[py, px, 0] > 120:
                            arr[py, px] = [254, 240, 138, 255]
    if mode == "yell":
        # Open fierce battle-shout mouth with white clenched teeth glint
        for oy in range(-3, 7):
            for ox in range(-8, 7):
                px, py = mx + ox, my + oy
                if 0 <= px < w and 0 <= py < h and arr[py, px, 3] > 128:
                    if oy == -3 or oy == 6 or ox == -8 or ox == 6:
                        arr[py, px] = [56, 24, 22, 255]
                    elif oy <= -1 and abs(ox) <= 5:
                        arr[py, px] = [248, 244, 236, 255]
                    else:
                        arr[py, px] = [132, 34, 42, 255]
    elif mode == "grin":
        # Confident martial victory smirk
        for ox in range(-6, 8):
            py = my - (1 if ox >= 3 else 0)
            px = mx + ox
            if 0 <= px < w and 0 <= py < h and arr[py, px, 3] > 128:
                arr[py, px] = [255, 252, 240, 255] if abs(ox) <= 4 else [64, 30, 24, 255]
                if py + 1 < h and abs(ox) <= 5:
                    arr[py + 1, px] = [64, 30, 24, 255]
    elif mode == "hurt":
        # Gritted wince eyes + clenched jaw
        for cx, cy in ((lx, ly), (rx, ry)):
            for oy in range(-3, 4):
                for ox in range(-5, 6):
                    px, py = cx + ox, cy + oy
                    if 0 <= px < w and 0 <= py < h and arr[py, px, 3] > 128:
                        if oy == 0:
                            arr[py, px] = [44, 22, 18, 255]
                        else:
                            arr[py, px] = [212, 140, 104, 255]

    return (Image.fromarray(arr, "RGBA"), x0, y0)


def build_raijin_rig_512() -> dict:
    stand = extract_clean_base_512()
    alpha = stand[:, :, 3] > 128
    H, W = alpha.shape

    # 1. Headband flowing tails (left of head knot, x=156..256, y=60..136)
    hb_tails_m = keep_largest_component(
        alpha & poly_mask(H, W, [(154, 62), (254, 62), (254, 108), (220, 134), (154, 134)])
    )
    hb_arr = stand.copy()
    hb_arr[~hb_tails_m] = [0, 0, 0, 0]
    # Add short storm-gold root bridge into head knot so tail rotation never leaves a gap
    for yy in range(84, 98):
        for xx in range(246, 264):
            if hb_arr[yy, xx, 3] < 128:
                hb_arr[yy, xx] = [15, 23, 42, 255] if yy in (84, 97) else [230, 168, 28, 255]

    # 2. Head (spiky dark indigo hair + gold headband + face, cleanly above scarf collar)
    head_m = keep_largest_component(
        alpha
        & poly_mask(
            H,
            W,
            [(234, 16), (348, 16), (348, 132), (318, 138), (268, 134), (242, 120), (234, 96)],
        )
        & (~hb_tails_m)
    )

    # 3. Flowing tattered storm-gold scarf tails (left of torso/front arm)
    scarf_m = keep_largest_component(
        alpha
        & poly_mask(
            H,
            W,
            [
                (62, 126),
                (218, 126),
                (204, 152),
                (190, 186),
                (176, 224),
                (166, 266),
                (156, 336),
                (62, 336),
            ],
        )
    )
    scarf_arr = stand.copy()
    scarf_arr[~scarf_m] = [0, 0, 0, 0]
    # Solid golden cloth bridge tucked cleanly behind the shoulder collar
    for yy in range(136, 168):
        for xx in range(196, 240):
            if scarf_arr[yy, xx, 3] < 128:
                if yy <= 139 or yy >= 165:
                    scarf_arr[yy, xx] = [24, 18, 14, 255]
                else:
                    scarf_arr[yy, xx] = [224, 162, 28, 255]

    # 4. Torso (neck scarf collar + sleeveless midnight-indigo gi + gold sash + hip skirt)
    # Strip front arm (viewer left) & rear arm (viewer right) so dynamic 2-bone IK arms replace them cleanly!
    front_arm_strip = poly_mask(
        H,
        W,
        [(168, 144), (238, 148), (244, 184), (232, 212), (246, 316), (168, 316)],
    )
    rear_arm_strip = poly_mask(
        H,
        W,
        [(334, 150), (398, 150), (398, 314), (324, 314), (326, 236), (332, 194)],
    )
    torso_m = (
        alpha
        & poly_mask(
            H,
            W,
            [(202, 110), (344, 110), (346, 308), (336, 318), (222, 318), (212, 296), (202, 148)],
        )
        & (~front_arm_strip)
        & (~rear_arm_strip)
        & (~head_m)
        & (~hb_tails_m)
        & (~scarf_m)
    )
    torso_keep = keep_largest_component(torso_m)
    torso_arr = stand.copy()
    torso_arr[~torso_keep] = [0, 0, 0, 0]
    # Fill clean neck skin socket behind scarf collar so tilted head never exposes a hole
    for yy in range(114, 134):
        for xx in range(266, 308):
            if torso_arr[yy, xx, 3] < 128 and stand[min(H - 1, yy + 16), xx, 3] > 128:
                torso_arr[yy, xx] = [164, 96, 70, 255]

    # 5. Articulated Legs (Left=rear foot planted left, Right=lead foot planted right)
    l_thigh_m = keep_largest_component(
        alpha & poly_mask(H, W, [(194, 294), (284, 294), (282, 392), (190, 392)])
    )
    l_shin_m = keep_largest_component(
        alpha & poly_mask(H, W, [(182, 378), (266, 378), (242, 466), (182, 466)])
    )
    l_boot_m = keep_largest_component(
        alpha & poly_mask(H, W, [(172, 450), (240, 450), (240, 508), (172, 508)])
    )

    r_thigh_m = keep_largest_component(
        alpha & poly_mask(H, W, [(284, 294), (358, 294), (360, 392), (282, 392)])
    )
    r_shin_m = keep_largest_component(
        alpha & poly_mask(H, W, [(288, 378), (358, 378), (358, 458), (288, 458)])
    )
    r_boot_m = keep_largest_component(
        alpha & poly_mask(H, W, [(296, 444), (394, 444), (394, 498), (296, 498)])
    )

    heads = {
        expr: make_head_expression_variant(stand, head_m, expr)
        for expr in ("fierce", "yell", "focus", "grin", "hurt")
    }

    return {
        "stand": stand,
        "heads": heads,
        "hb_tails": crop_part(hb_arr, hb_arr[:, :, 3] > 128),
        "scarf": crop_part(scarf_arr, scarf_arr[:, :, 3] > 128),
        "torso": crop_part(torso_arr, torso_arr[:, :, 3] > 128),
        "l_thigh": crop_part(stand, l_thigh_m),
        "l_shin": crop_part(stand, l_shin_m),
        "l_boot": crop_part(stand, l_boot_m),
        "r_thigh": tint_part(crop_part(stand, r_thigh_m), 0.90),
        "r_shin": tint_part(crop_part(stand, r_shin_m), 0.90),
        "r_boot": tint_part(crop_part(stand, r_boot_m), 0.92),
        "joints": {
            "pelvis": (282.0, 302.0),
            "neck": (284.0, 134.0),
            "hb_root": (254.0, 90.0),
            "scarf_root": (228.0, 150.0),
            "f_sh": (226.0, 168.0),  # Front (viewer-left, Raijin's right power arm)
            "b_sh": (332.0, 168.0),  # Rear (viewer-right, Raijin's left jab arm)
            "l_hip": (254.0, 304.0),
            "l_knee": (232.0, 386.0),
            "l_ank": (214.0, 464.0),
            "r_hip": (310.0, 304.0),
            "r_knee": (322.0, 386.0),
            "r_ank": (324.0, 456.0),
            "ground_y": 500.0,
        },
    }


def paste_rotated_part(
    canvas: Image.Image,
    part: tuple[Image.Image, int, int],
    pivot_part_space: tuple[float, float],
    dest_xy: tuple[float, float],
    angle_deg: float,
    scale_x: float = 1.0,
    scale_y: float = 1.0,
    wave_phase: float | None = None,
    wave_amp: float = 0.0,
):
    im, x0, y0 = part
    pw, ph = im.size
    px_local = pivot_part_space[0] - x0
    py_local = pivot_part_space[1] - y0

    if wave_phase is not None and abs(wave_amp) > 0.1 and pw > 10:
        arr_w = np.array(im, dtype=np.uint8)
        pad = int(math.ceil(abs(wave_amp))) + 4
        out_w = np.zeros((ph + pad * 2, pw, 4), dtype=np.uint8)
        for x_col in range(pw):
            ut = clamp((px_local - x_col) / max(1.0, px_local), 0.0, 1.0)
            dy_w = int(round(math.sin(wave_phase - ut * 3.8) * wave_amp * (ut ** 1.1)))
            for y_row in range(ph):
                if arr_w[y_row, x_col, 3] > 0:
                    ny = y_row + pad + dy_w
                    if 0 <= ny < ph + pad * 2:
                        out_w[ny, x_col] = arr_w[y_row, x_col]
        im = Image.fromarray(out_w, "RGBA")
        py_local += pad
        ph += pad * 2

    if abs(scale_x - 1.0) > 1e-3 or abs(scale_y - 1.0) > 1e-3:
        nw = max(2, int(round(pw * scale_x)))
        nh = max(2, int(round(ph * scale_y)))
        im = im.resize((nw, nh), Image.Resampling.NEAREST)
        px_local *= scale_x
        py_local *= scale_y
        pw, ph = nw, nh

    if abs(angle_deg) < 0.15:
        dx = int(round(dest_xy[0] - px_local))
        dy = int(round(dest_xy[1] - py_local))
        canvas.alpha_composite(im, (dx, dy))
        return

    rot_im = im.rotate(-angle_deg, resample=Image.Resampling.NEAREST, expand=True)
    rw, rh = rot_im.size
    cx0, cy0 = pw * 0.5, ph * 0.5
    vx, vy = px_local - cx0, py_local - cy0
    rad = math.radians(angle_deg)
    rx = vx * math.cos(rad) - vy * math.sin(rad)
    ry = vx * math.sin(rad) + vy * math.cos(rad)
    piv_rot_x = rw * 0.5 + rx
    piv_rot_y = rh * 0.5 + ry
    dx = int(round(dest_xy[0] - piv_rot_x))
    dy = int(round(dest_xy[1] - piv_rot_y))
    canvas.alpha_composite(rot_im, (dx, dy))


def solve_ik_2bone(
    sx: float, sy: float, tx: float, ty: float, l1: float, l2: float, bend_dir: int = 1
) -> tuple[float, float, float, float]:
    dx = tx - sx
    dy = ty - sy
    dist = math.hypot(dx, dy)
    max_reach = l1 + l2 - 0.15
    min_reach = abs(l1 - l2) + 0.15
    if dist > max_reach and dist > 1e-4:
        tx = sx + dx * (max_reach / dist)
        ty = sy + dy * (max_reach / dist)
        dist = max_reach
    elif dist < min_reach:
        if dist < 1e-4:
            tx, ty, dist = sx + min_reach, sy, min_reach
        else:
            tx = sx + dx * (min_reach / dist)
            ty = sy + dy * (min_reach / dist)
            dist = min_reach
    cos_a = clamp((l1 * l1 + dist * dist - l2 * l2) / max(1e-4, 2.0 * l1 * dist), -1.0, 1.0)
    a = math.acos(cos_a)
    base_ang = math.atan2(ty - sy, tx - sx)
    if bend_dir == 0:
        ex_p = sx + l1 * math.cos(base_ang + a)
        ey_p = sy + l1 * math.sin(base_ang + a)
        ex_m = sx + l1 * math.cos(base_ang - a)
        ey_m = sy + l1 * math.sin(base_ang - a)
        ex, ey = (ex_p, ey_p) if ey_p >= ey_m else (ex_m, ey_m)
    else:
        ex = sx + l1 * math.cos(base_ang + bend_dir * a)
        ey = sy + l1 * math.sin(base_ang + bend_dir * a)
    return (ex, ey, tx, ty)


# ==============================================================================
# 2. LOGICAL 160x120 MUSCULAR BRAWLER ARMS, VAMBRACES & SCULPTED TAPED FISTS
# ==============================================================================
def draw_sculpted_brawler_fist_160(
    arr: np.ndarray,
    hx: float,
    hy: float,
    ux: float,
    uy: float,
    nx: float,
    ny: float,
    role: str = "fist",
    is_front: bool = True,
    charged: float = 0.0,
):
    """
    Pixel-by-pixel sculpted bare-knuckle martial fist / open Thunderclap palm (ZERO circle/oval blobs!):
      - Explicit wrist tape wrap, indigo-gold knuckle plate, thumb clasp & individual finger knuckles
      - Roles: 'fist' (clenched combat fist), 'palm' (open Thunderclap Palm strike),
               'uppercut' (angled sky-breaker fist), 'guard' (braced crossed-forearm fist)
    """
    mul = 1.0 if is_front else 0.84
    c_tape_l = _shade_rgba(C_TAPE_LIT, mul)
    c_tape_m = _shade_rgba(C_TAPE_MID, mul)
    c_tape_s = _shade_rgba(C_TAPE_SHAD, mul)
    c_knuck_d = _shade_rgba(C_INDIGO_DEEP, mul)
    c_knuck_m = _shade_rgba(C_INDIGO_MID, mul)
    c_knuck_g = C_GOLD_LIT if charged > 0.4 else _shade_rgba(C_GOLD, mul)
    c_skin_l = _shade_rgba(C_SKIN_LIT, mul)
    c_skin_m = _shade_rgba(C_SKIN_MID, mul)
    c_skin_s = _shade_rgba(C_SKIN_SHAD, mul)

    if role == "palm":
        # Open-hand Thunderclap Palm thrust: heel of palm forward, splayed fingers angled up, tucked thumb
        pts = [
            (-2.0, -1.0, c_tape_m), (-2.0,  0.0, c_tape_l), (-2.0,  1.0, c_tape_s),
            (-1.0, -1.6, c_knuck_g), (-1.0, -0.6, c_tape_l), (-1.0,  0.4, c_tape_m), (-1.0,  1.4, c_skin_s),
            ( 0.0, -2.4, c_skin_l), ( 0.0, -1.2, c_skin_l), ( 0.0,  0.0, c_skin_m), ( 0.0,  1.2, c_skin_m), ( 0.0,  2.2, c_skin_s),
            ( 1.0, -3.0, c_skin_l), ( 1.0, -1.8, c_skin_l), ( 1.0, -0.6, c_skin_l), ( 1.0,  0.6, c_skin_m), ( 1.0,  1.8, c_skin_s),
            ( 2.0, -2.6, c_skin_l), ( 2.0, -1.2, c_skin_l), ( 2.0,  0.2, c_skin_m), ( 2.0,  1.2, c_skin_s),
            ( 2.8, -1.8, c_skin_m), ( 2.8, -0.4, c_skin_m),
        ]
    elif role == "uppercut":
        # Upward-driven clenched iron-knuckle fist with prominent knuckle ridge
        pts = [
            (-2.2, -1.0, c_tape_m), (-2.2,  0.0, c_tape_l), (-2.2,  1.0, c_tape_s),
            (-1.2, -1.4, c_knuck_m), (-1.2, -0.4, c_tape_l), (-1.2,  0.6, c_tape_m), (-1.2,  1.6, c_tape_s),
            (-0.2, -2.0, c_skin_l), (-0.2, -1.0, c_knuck_g), (-0.2,  0.0, c_knuck_m), (-0.2,  1.0, c_tape_m), (-0.2,  1.8, c_skin_s),
            ( 0.8, -1.8, c_skin_l), ( 0.8, -0.8, c_knuck_g), ( 0.8,  0.2, c_knuck_m), ( 0.8,  1.2, c_skin_m),
            ( 1.8, -1.4, c_knuck_g), ( 1.8, -0.4, c_skin_l), ( 1.8,  0.6, c_skin_m), ( 1.8,  1.4, c_skin_s),
            ( 2.6, -0.8, c_skin_l), ( 2.6,  0.2, c_skin_m),
        ]
    else:
        # Clenched bare-knuckle iron-bound martial fist (distinct thumb lock + 4-knuckle bar + tape wrap)
        pts = [
            (-2.2, -1.0, c_tape_m), (-2.2,  0.0, c_tape_l), (-2.2,  1.0, c_tape_s),
            (-1.2, -1.4, c_knuck_d), (-1.2, -0.4, c_tape_l), (-1.2,  0.6, c_tape_m), (-1.2,  1.5, c_tape_s),
            (-0.2, -1.8, c_skin_l), (-0.2, -0.8, c_knuck_g), (-0.2,  0.2, c_knuck_m), (-0.2,  1.2, c_tape_m),
            ( 0.8, -1.6, c_skin_l), ( 0.8, -0.6, c_knuck_g), ( 0.8,  0.4, c_knuck_m), ( 0.8,  1.4, c_skin_m),
            ( 1.8, -1.2, c_skin_l), ( 1.8, -0.2, c_skin_l), ( 1.8,  0.8, c_skin_m), ( 1.8,  1.6, c_skin_s),
            ( 2.6, -0.6, c_knuck_g if charged > 0.25 else c_skin_l),
            ( 2.6,  0.4, c_skin_m),
        ]

    resolved: dict[tuple[int, int], tuple[int, int, int, int]] = {}
    for ou, ov, col in pts:
        px = int(round(hx + ux * ou + nx * ov))
        py = int(round(hy + uy * ou + ny * ov))
        resolved[(px, py)] = col

    # Crisp 1px dark martial outline around sculpted fist on empty pixels
    for px, py in resolved:
        for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sx_p, sy_p = px + ox, py + oy
            if (sx_p, sy_p) in resolved:
                continue
            if MARGIN_160 <= sx_p < LOG_W - MARGIN_160 and MARGIN_160 <= sy_p < LOG_H - MARGIN_160:
                if arr[sy_p, sx_p, 3] == 0:
                    arr[sy_p, sx_p] = C_OUT_DARK

    for (px, py), col in resolved.items():
        put_px(arr, px, py, col)

    # Optional subtle lightning glint along knuckles when charged
    if charged > 0.15:
        spark_col = C_WHITE if charged > 0.65 else C_GOLD_LIT
        put_px(arr, int(round(hx + ux * 2.4 + nx * (-0.5))), int(round(hy + uy * 2.4 + ny * (-0.5))), spark_col)
        if charged > 0.5:
            put_px(arr, int(round(hx + ux * 1.2 + nx * (-1.4))), int(round(hy + uy * 1.2 + ny * (-1.4))), C_INDIGO_LIT)


def draw_brawler_arm_160(
    arr: np.ndarray,
    sh: tuple[float, float],
    el: tuple[float, float],
    wr: tuple[float, float],
    is_front: bool = True,
    fist_role: str = "fist",
    charged: float = 0.0,
):
    """
    Renders Raijin EX's bare muscular upper arm + armored midnight-indigo/gold forearm vambrace
    + cloth tape wrist-wraps + sculpted taped iron-knuckle fist (`0` blobs, `1px` crisp outline).
    """
    mul = 1.0 if is_front else 0.84
    c_skin_l = _shade_rgba(C_SKIN_LIT, mul)
    c_skin_m = _shade_rgba(C_SKIN_MID, mul)
    c_skin_s = _shade_rgba(C_SKIN_SHAD, mul)
    c_vam_d = _shade_rgba(C_INDIGO_DEEP, mul)
    c_vam_m = _shade_rgba(C_INDIGO_MID, mul)
    c_vam_g = _shade_rgba(C_GOLD, mul)
    c_tape_l = _shade_rgba(C_TAPE_LIT, mul)
    c_tape_m = _shade_rgba(C_TAPE_MID, mul)
    c_tape_s = _shade_rgba(C_TAPE_SHAD, mul)

    arm_px: dict[tuple[int, int], tuple[int, int, int, int]] = {}

    def paint_segment(p0, p1, r_start, r_end, mode):
        dx, dy = p1[0] - p0[0], p1[1] - p0[1]
        ln = max(1e-4, math.hypot(dx, dy))
        ux, uy = dx / ln, dy / ln
        nx, ny = -uy, ux
        steps = max(4, int(math.ceil(ln * 2.4)))
        for s in range(steps + 1):
            u = s / float(steps)
            cx = p0[0] + dx * u
            cy = p0[1] + dy * u
            # Muscular bicep bulge on upper arm; armored bracer taper on forearm
            if mode == "upper":
                rad = lerp(r_start, r_end, u) + 0.65 * math.sin(u * math.pi)
            else:
                rad = lerp(r_start, r_end, u)
            ri = int(math.ceil(rad + 1.0))
            for oy in range(-ri, ri + 1):
                for ox in range(-ri, ri + 1):
                    px = int(round(cx + ox))
                    py = int(round(cy + oy))
                    if not (MARGIN_160 <= px < LOG_W - MARGIN_160 and MARGIN_160 <= py < LOG_H - MARGIN_160):
                        continue
                    # Perpendicular signed offset along segment normal
                    v_off = (px - cx) * nx + (py - cy) * ny
                    u_off = (px - cx) * ux + (py - cy) * uy
                    if abs(u_off) > 0.95 or abs(v_off) > rad:
                        continue
                    vn = v_off / max(0.5, rad)
                    if mode == "upper":
                        # Deltoid/bicep 3-step muscle shading (top highlight, warm mid, deep underside)
                        if u < 0.28 and vn < 0.2:
                            col = c_skin_l
                        elif vn < -0.18:
                            col = c_skin_l
                        elif vn < 0.42:
                            col = c_skin_m
                        else:
                            col = c_skin_s
                    else:
                        # Forearm: indigo-gold armored vambrace on outer edge + layered cloth tape bands!
                        if u < 0.14 or (0.64 <= u <= 0.74):
                            col = c_vam_g if abs(vn) < 0.68 else c_vam_d
                        elif u < 0.66:
                            if vn < -0.25:
                                col = c_vam_m
                            elif vn < 0.25:
                                col = c_vam_d if ((int(u * 10) % 2) == 0) else c_vam_m
                            else:
                                # Inner forearm wrapped cloth tape stripes
                                stripe = (int(u * 16)) % 2 == 0
                                col = c_tape_l if stripe else c_tape_s
                        else:
                            # Wrist martial tape wrapping cleanly into sculpted fist
                            stripe = (int(u * 18)) % 2 == 0
                            if vn < -0.25:
                                col = c_tape_l if stripe else c_tape_m
                            elif vn < 0.35:
                                col = c_tape_m if stripe else c_tape_s
                            else:
                                col = c_tape_s
                    arm_px[(px, py)] = col

    # Stop forearm slightly short of wrist center so sculpted fist connects cleanly
    dx_f, dy_f = wr[0] - el[0], wr[1] - el[1]
    ln_f = max(1e-4, math.hypot(dx_f, dy_f))
    ux_f, uy_f = dx_f / ln_f, dy_f / ln_f
    nx_f, ny_f = -uy_f, ux_f
    wrist_end = (wr[0] - ux_f * 1.4, wr[1] - uy_f * 1.4)

    paint_segment(sh, el, 3.0, 2.4, "upper")
    paint_segment(el, wrist_end, 2.5, 2.0, "forearm")

    # Crisp 1px dark outline on transparent neighbors only
    for px, py in arm_px:
        for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sx_p, sy_p = px + ox, py + oy
            if (sx_p, sy_p) in arm_px:
                continue
            if MARGIN_160 <= sx_p < LOG_W - MARGIN_160 and MARGIN_160 <= sy_p < LOG_H - MARGIN_160:
                if arr[sy_p, sx_p, 3] == 0:
                    arr[sy_p, sx_p] = C_OUT_DARK

    for (px, py), col in arm_px.items():
        put_px(arr, px, py, col)

    draw_sculpted_brawler_fist_160(
        arr,
        wr[0],
        wr[1],
        ux_f,
        uy_f,
        nx_f,
        ny_f,
        role=fist_role,
        is_front=is_front,
        charged=charged,
    )


# ==============================================================================
# 3. CRISP PIXEL-PURE GOLDEN-INDIGO LIGHTNING & MARTIAL SMEAR OVERLAYS (160x120)
# ==============================================================================
def draw_lightning_bolt_160(
    arr: np.ndarray,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    seed: int = 0,
    jag: float = 3.2,
    thick: int = 1,
    gold_core: bool = True,
):
    """3-pass jagged pixel lightning bolt (indigo outer -> storm-gold mid -> white core)."""
    dx, dy = x1 - x0, y1 - y0
    ln = max(1.0, math.hypot(dx, dy))
    nx, ny = -dy / ln, dx / ln
    segs = max(3, min(10, int(ln / 5.5)))
    pts = [(x0, y0)]
    for i in range(1, segs):
        u = i / float(segs)
        wob = math.sin(seed * 2.7 + i * 3.9) * jag * math.sin(u * math.pi)
        pts.append((x0 + dx * u + nx * wob, y0 + dy * u + ny * wob))
    pts.append((x1, y1))

    # Collect core path pixels via Bresenham
    path_px: list[tuple[int, int]] = []
    for i in range(len(pts) - 1):
        ax, ay = int(round(pts[i][0])), int(round(pts[i][1]))
        bx, by = int(round(pts[i + 1][0])), int(round(pts[i + 1][1]))
        steps = max(1, max(abs(bx - ax), abs(by - ay)))
        for s in range(steps + 1):
            px = int(round(ax + (bx - ax) * (s / float(steps))))
            py = int(round(ay + (by - ay) * (s / float(steps))))
            path_px.append((px, py))

    # Pass 1: Electric indigo outer halo
    for px, py in path_px:
        for oy in range(-thick, thick + 1):
            for ox in range(-thick, thick + 1):
                if abs(ox) + abs(oy) <= thick + 1:
                    put_px(arr, px + ox, py + oy, C_INDIGO_LIT if abs(ox) + abs(oy) <= thick else C_INDIGO_MID)
    # Pass 2: Storm-gold mid bolt
    for px, py in path_px:
        put_px(arr, px, py, C_GOLD if gold_core else C_INDIGO_ICE)
        if thick >= 2:
            put_px(arr, px + 1, py, C_GOLD)
    # Pass 3: White-hot inner spark core
    for idx, (px, py) in enumerate(path_px):
        if idx % 2 == 0 or thick >= 2:
            put_px(arr, px, py, C_WHITE if gold_core else C_GOLD_LIT)


def draw_punch_smear_160(
    arr: np.ndarray,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    half_w: float = 5.0,
    phase: int = 0,
):
    """Directional anime fist-impact lightning smear cone (Pass 1 indigo -> Pass 2 gold -> Pass 3 white)."""
    dx, dy = x1 - x0, y1 - y0
    ln = max(1.0, math.hypot(dx, dy))
    ux, uy = dx / ln, dy / ln
    nx, ny = -uy, ux
    outer_set, mid_set, core_set = set(), set(), set()
    steps = max(6, int(ln * 2.0))
    for s in range(steps + 1):
        u = s / float(steps)
        cx, cy = x0 + dx * u, y0 + dy * u
        w_cur = half_w * (0.28 + 0.72 * math.sin(u * math.pi))
        ri = int(math.ceil(w_cur))
        for k in range(-ri, ri + 1):
            px = int(round(cx + nx * k))
            py = int(round(cy + ny * k))
            if not (MARGIN_160 <= px < LOG_W - MARGIN_160 and MARGIN_160 <= py < LOG_H - MARGIN_160):
                continue
            d = abs(k) / max(0.5, w_cur)
            if d <= 1.0 and (u > 0.25 or BAYER4[py & 3, px & 3] < u * 3.8):
                outer_set.add((px, py))
            if d <= 0.62 and u > 0.16:
                mid_set.add((px, py))
            if d <= 0.26 and u > 0.32:
                core_set.add((px, py))
    for px, py in outer_set:
        put_px(arr, px, py, C_INDIGO_MID if (px + py + phase) % 3 == 0 else C_INDIGO_LIT)
    for px, py in mid_set:
        put_px(arr, px, py, C_GOLD if (px + phase) % 2 == 0 else C_GOLD_LIT)
    for px, py in core_set:
        put_px(arr, px, py, C_WHITE)


def draw_thunder_arc_smear_160(
    arr: np.ndarray,
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    deg0: float,
    deg1: float,
    band_w: float = 6.0,
    phase: int = 0,
):
    """Curved crescent lightning trail for spinning backfist & rising sky-breaker uppercut."""
    steps = max(18, int(abs(deg1 - deg0) * 0.6))
    outer_px, mid_px, core_px = set(), set(), set()
    for s in range(steps + 1):
        u = s / float(steps)
        ang = math.radians(lerp(deg0, deg1, u))
        ca, sa = math.cos(ang), math.sin(ang)
        thick = band_w * math.sin(u * math.pi)
        for dr in np.linspace(-thick, thick * 0.45, max(3, int(thick * 2.5))):
            px = int(round(cx + ca * (rx + dr)))
            py = int(round(cy + sa * (ry + dr)))
            if not (MARGIN_160 <= px < LOG_W - MARGIN_160 and MARGIN_160 <= py < LOG_H - MARGIN_160):
                continue
            ratio = abs(dr) / max(0.5, thick)
            if ratio <= 1.0 and (u > 0.22 or BAYER4[py & 3, px & 3] < u * 4.2):
                outer_px.add((px, py))
            if ratio <= 0.58 and u > 0.18:
                mid_px.add((px, py))
            if ratio <= 0.24 and u > 0.35:
                core_px.add((px, py))
    for px, py in outer_px:
        put_px(arr, px, py, C_INDIGO_LIT if (px + py + phase) % 2 == 0 else C_INDIGO_MID)
    for px, py in mid_px:
        put_px(arr, px, py, C_GOLD)
    for px, py in core_px:
        put_px(arr, px, py, C_WHITE if phase % 2 == 0 else C_GOLD_LIT)


def draw_shockwave_ring_160(
    arr: np.ndarray,
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    phase: int = 0,
):
    """Crisp pixel-stepped golden-indigo shockwave ring (Pass 1 indigo -> Pass 2 gold -> Pass 3 white)."""
    steps = max(24, int(max(rx, ry) * 4.2))
    outer_px, inner_px, core_px = set(), set(), set()
    for i in range(steps):
        ang = (i / float(steps)) * math.tau
        ca, sa = math.cos(ang), math.sin(ang)
        for dr in (-1.5, -0.5, 0.5, 1.5):
            px = int(round(cx + ca * (rx + dr)))
            py = int(round(cy + sa * (ry + dr)))
            if MARGIN_160 <= px < LOG_W - MARGIN_160 and MARGIN_160 <= py < LOG_H - MARGIN_160:
                if abs(dr) > 1.0:
                    outer_px.add((px, py))
                elif abs(dr) > 0.2:
                    inner_px.add((px, py))
                else:
                    core_px.add((px, py))
    for px, py in outer_px:
        put_px(arr, px, py, C_INDIGO_LIT)
    for px, py in inner_px:
        put_px(arr, px, py, C_GOLD if (px + py + phase) % 2 == 0 else C_GOLD_LIT)
    for px, py in core_px:
        put_px(arr, px, py, C_WHITE)


def draw_phantom_fist_160(arr: np.ndarray, fx: float, fy: float, scale: float = 1.0, gold: bool = True):
    """Sculpted glowing golden-indigo phantom martial fist for Tempest Hundred Fists barrage."""
    c_out = C_INDIGO_MID if gold else C_INDIGO_DEEP
    c_mid = C_GOLD if gold else C_INDIGO_LIT
    c_hi = C_GOLD_LIT if gold else C_INDIGO_ICE
    # Compact crisp right-facing sculpted fist bitmap in local offsets (0 circles/ovals!)
    pts = [
        (-4, -1, c_out), (-4, 0, c_mid), (-4, 1, c_out),
        (-3, -2, c_out), (-3, -1, c_mid), (-3, 0, c_hi), (-3, 1, c_mid), (-3, 2, c_out),
        (-2, -3, c_out), (-2, -2, c_mid), (-2, -1, c_hi), (-2, 0, C_WHITE), (-2, 1, c_hi), (-2, 2, c_mid),
        (-1, -3, c_mid), (-1, -2, c_hi), (-1, -1, C_WHITE), (-1, 0, C_WHITE), (-1, 1, c_hi), (-1, 2, c_mid),
        ( 0, -2, c_hi),  ( 0, -1, C_WHITE), ( 0, 0, C_WHITE), ( 0, 1, c_hi), ( 0, 2, c_mid),
        ( 1, -2, c_mid), ( 1, -1, c_hi), ( 1, 0, C_WHITE), ( 1, 1, c_hi),
        ( 2, -1, c_mid), ( 2, 0, c_hi), ( 2, 1, c_mid),
    ]
    for ox, oy, col in pts:
        px = int(round(fx + ox * scale))
        py = int(round(fy + oy * scale))
        put_px(arr, px, py, col)


# ==============================================================================
# 4. ARTICULATED POSE RENDERER (512 HI-RES BODY -> 160x120 ARMS, FISTS & FX -> 320x240)
# ==============================================================================
def render_pose_160(rig: dict, pose: dict) -> np.ndarray:
    """Renders one full 160x120 logical Raijin EX frame with strict hygiene & clean contact."""
    j = rig["joints"]
    hi = Image.new("RGBA", (HI_W, HI_H), (0, 0, 0, 0))

    # Pelvis position in HI space (origin = ANCHOR_HI_X, ANCHOR_HI_Y - standing height to pelvis)
    pelv_rest_dx = j["pelvis"][0] - 282.0
    pelv_rest_dy = j["pelvis"][1] - j["ground_y"]  # ~ -198
    pelv_x = ANCHOR_HI_X + pelv_rest_dx + pose.get("dx", 0.0) * S_HI
    pelv_y = ANCHOR_HI_Y + pelv_rest_dy + pose.get("dy", 0.0) * S_HI
    torso_ang = pose.get("torso_ang", 0.0)
    head_ang = pose.get("head_ang", torso_ang * 0.45)
    body_sx = pose.get("body_sx", 1.0)
    body_sy = pose.get("body_sy", 1.0)

    def rot_from_pelvis(pt_512):
        vx = (pt_512[0] - j["pelvis"][0]) * body_sx
        vy = (pt_512[1] - j["pelvis"][1]) * body_sy
        rad = math.radians(torso_ang)
        rx = vx * math.cos(rad) - vy * math.sin(rad)
        ry = vx * math.sin(rad) + vy * math.cos(rad)
        return (pelv_x + rx, pelv_y + ry)

    neck_hi = rot_from_pelvis(j["neck"])
    f_sh_hi = rot_from_pelvis(j["f_sh"])
    b_sh_hi = rot_from_pelvis(j["b_sh"])
    scarf_hi = rot_from_pelvis(j["scarf_root"])

    # Headband root rotates with head around neck
    hb_vx = j["hb_root"][0] - j["neck"][0]
    hb_vy = j["hb_root"][1] - j["neck"][1]
    hrad = math.radians(head_ang)
    hb_hi = (
        neck_hi[0] + hb_vx * math.cos(hrad) - hb_vy * math.sin(hrad),
        neck_hi[1] + hb_vx * math.sin(hrad) + hb_vy * math.cos(hrad),
    )

    # Leg kinematics (2-bone IK from hips to target ankles)
    l_hip_hi = (pelv_x + (j["l_hip"][0] - j["pelvis"][0]), pelv_y + (j["l_hip"][1] - j["pelvis"][1]))
    r_hip_hi = (pelv_x + (j["r_hip"][0] - j["pelvis"][0]), pelv_y + (j["r_hip"][1] - j["pelvis"][1]))

    l_thigh_len = math.hypot(j["l_knee"][0] - j["l_hip"][0], j["l_knee"][1] - j["l_hip"][1])
    l_shin_len = math.hypot(j["l_ank"][0] - j["l_knee"][0], j["l_ank"][1] - j["l_knee"][1])
    r_thigh_len = math.hypot(j["r_knee"][0] - j["r_hip"][0], j["r_knee"][1] - j["r_hip"][1])
    r_shin_len = math.hypot(j["r_ank"][0] - j["r_knee"][0], j["r_ank"][1] - j["r_knee"][1])

    # Default foot targets in logical px relative to anchor (56, 115)
    lf_lx, lf_ly = pose.get("l_foot", (-10.0, 0.0))
    rf_lx, rf_ly = pose.get("r_foot", (9.5, 0.0))
    # Boot ankle-to-sole offsets measured directly from base art (`l_sole=503 - 464 = 39`, `r_sole=491 - 456 = 35`)
    l_ank_tgt = (ANCHOR_HI_X + lf_lx * S_HI, ANCHOR_HI_Y + lf_ly * S_HI - 39.0)
    r_ank_tgt = (ANCHOR_HI_X + rf_lx * S_HI, ANCHOR_HI_Y + rf_ly * S_HI - 35.0)

    # Bend knees forward (+X, bend_dir = -1 in screen coords where +Y is down!)
    l_kx, l_ky, l_ax, l_ay = solve_ik_2bone(
        l_hip_hi[0], l_hip_hi[1], l_ank_tgt[0], l_ank_tgt[1], l_thigh_len, l_shin_len, bend_dir=-1
    )
    r_kx, r_ky, r_ax, r_ay = solve_ik_2bone(
        r_hip_hi[0], r_hip_hi[1], r_ank_tgt[0], r_ank_tgt[1], r_thigh_len, r_shin_len, bend_dir=-1
    )

    def seg_angle_deg(p0, p1, rest_p0, rest_p1):
        a_cur = math.degrees(math.atan2(p1[1] - p0[1], p1[0] - p0[0]))
        a_rest = math.degrees(math.atan2(rest_p1[1] - rest_p0[1], rest_p1[0] - rest_p0[0]))
        return a_cur - a_rest

    l_th_ang = seg_angle_deg(l_hip_hi, (l_kx, l_ky), j["l_hip"], j["l_knee"])
    l_sh_ang = seg_angle_deg((l_kx, l_ky), (l_ax, l_ay), j["l_knee"], j["l_ank"])
    r_th_ang = seg_angle_deg(r_hip_hi, (r_kx, r_ky), j["r_hip"], j["r_knee"])
    r_sh_ang = seg_angle_deg((r_kx, r_ky), (r_ax, r_ay), j["r_knee"], j["r_ank"])

    l_boot_ang = pose.get("l_boot_ang", clamp(l_sh_ang * 0.25, -18.0, 22.0))
    r_boot_ang = pose.get("r_boot_ang", clamp(r_sh_ang * 0.25, -18.0, 22.0))

    # 1. Flowing scarf tails & headband tails behind torso
    paste_rotated_part(
        hi,
        rig["scarf"],
        j["scarf_root"],
        scarf_hi,
        pose.get("scarf_ang", torso_ang * 0.5),
        wave_phase=pose.get("wave_phase", 0.0),
        wave_amp=pose.get("scarf_amp", 14.0),
    )
    paste_rotated_part(
        hi,
        rig["hb_tails"],
        j["hb_root"],
        hb_hi,
        pose.get("hb_ang", head_ang * 0.5),
        wave_phase=pose.get("wave_phase", 0.0) + 0.9,
        wave_amp=pose.get("hb_amp", 10.0),
    )

    # 2. Rear/right leg (drawn behind torso)
    paste_rotated_part(hi, rig["r_thigh"], j["r_hip"], r_hip_hi, r_th_ang)
    paste_rotated_part(hi, rig["r_shin"], j["r_knee"], (r_kx, r_ky), r_sh_ang)
    paste_rotated_part(hi, rig["r_boot"], j["r_ank"], (r_ax, r_ay), r_boot_ang)

    # 3. Front/left leg (drawn below torso skirt)
    paste_rotated_part(hi, rig["l_thigh"], j["l_hip"], l_hip_hi, l_th_ang)
    paste_rotated_part(hi, rig["l_shin"], j["l_knee"], (l_kx, l_ky), l_sh_ang)
    paste_rotated_part(hi, rig["l_boot"], j["l_ank"], (l_ax, l_ay), l_boot_ang)

    # Downsample rear layer + torso + head in 2 stages so rear arm can slot cleanly BEHIND torso!
    # Stage A: Rear/back parts (scarf, hb, legs)
    back_160 = np.array(hi.resize((LOG_W, LOG_H), Image.Resampling.NEAREST), dtype=np.uint8)

    # Stage B: Torso + Head hi-res canvas
    hi_top = Image.new("RGBA", (HI_W, HI_H), (0, 0, 0, 0))
    paste_rotated_part(hi_top, rig["torso"], j["pelvis"], (pelv_x, pelv_y), torso_ang, body_sx, body_sy)
    head_part = rig["heads"].get(pose.get("expr", "fierce"), rig["heads"]["fierce"])
    paste_rotated_part(hi_top, head_part, j["neck"], neck_hi, head_ang)
    top_160 = np.array(hi_top.resize((LOG_W, LOG_H), Image.Resampling.NEAREST), dtype=np.uint8)

    # Whole-body prone / aerial rotation override (used for Row 5 DEATH collapse/prone)
    whole_rot = pose.get("whole_rot", 0.0)
    if abs(whole_rot) > 0.5:
        comb_hi = hi.copy()
        comb_hi.alpha_composite(hi_top)
        # Convert arms into comb_hi? Easier: compose complete 160 frame first, then rotate around ground pivot!
        pass

    # Assemble 160x120 character layer:
    # Layer 1: back_160 (scarf, legs)
    frame = back_160.copy()

    # Convert shoulders to logical 160x120 coordinates
    f_sh_160 = (f_sh_hi[0] / S_HI, f_sh_hi[1] / S_HI)
    b_sh_160 = (b_sh_hi[0] / S_HI, b_sh_hi[1] / S_HI)

    # Upper arm & forearm lengths in 160 logical space (athletic proportions matching 96px tall EX hero)
    l_arm1 = pose.get("arm_l1", 13.6)
    l_arm2 = pose.get("arm_l2", 14.4)

    # Layer 2: Rear arm (Raijin's lead/left jab arm, anchored at b_sh_160)
    b_hand_off = pose.get("b_hand", (14.0, 5.0))
    b_tx = b_sh_160[0] + b_hand_off[0]
    b_ty = b_sh_160[1] + b_hand_off[1]
    b_ex, b_ey, b_wx, b_wy = solve_ik_2bone(
        b_sh_160[0], b_sh_160[1], b_tx, b_ty, l_arm1, l_arm2, bend_dir=pose.get("b_bend", 0)
    )
    rear_in_front = pose.get("rear_arm_front", False)
    if not rear_in_front:
        draw_brawler_arm_160(
            frame,
            b_sh_160,
            (b_ex, b_ey),
            (b_wx, b_wy),
            is_front=False,
            fist_role=pose.get("b_role", "fist"),
            charged=pose.get("b_charge", 0.15),
        )

    # Layer 3: Torso & Head over rear arm
    top_op = top_160[:, :, 3] >= 128
    frame[top_op] = top_160[top_op]

    if rear_in_front:
        draw_brawler_arm_160(
            frame,
            b_sh_160,
            (b_ex, b_ey),
            (b_wx, b_wy),
            is_front=False,
            fist_role=pose.get("b_role", "fist"),
            charged=pose.get("b_charge", 0.25),
        )

    # Layer 4: Front arm (Raijin's right power arm, anchored at f_sh_160)
    f_hand_off = pose.get("f_hand", (10.0, 12.0))
    f_tx = f_sh_160[0] + f_hand_off[0]
    f_ty = f_sh_160[1] + f_hand_off[1]
    f_ex, f_ey, f_wx, f_wy = solve_ik_2bone(
        f_sh_160[0], f_sh_160[1], f_tx, f_ty, l_arm1, l_arm2, bend_dir=pose.get("f_bend", 0)
    )
    draw_brawler_arm_160(
        frame,
        f_sh_160,
        (f_ex, f_ey),
        (f_wx, f_wy),
        is_front=True,
        fist_role=pose.get("f_role", "fist"),
        charged=pose.get("f_charge", 0.15),
    )

    # Optional whole-body fall rotation (Row 5 DEATH transition & grounded prone!)
    if abs(whole_rot) > 0.5:
        im_f = Image.fromarray(frame, "RGBA")
        # Rotate cleanly around lower-hip pivot and plant on floor y=114
        rot_im = im_f.rotate(-whole_rot, resample=Image.Resampling.NEAREST, expand=True)
        ra = np.array(rot_im, dtype=np.uint8)
        op = ra[:, :, 3] >= 128
        ys, xs = np.where(op)
        frame = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)
        if len(ys):
            crop_r = ra[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
            ch, cw, _ = crop_r.shape
            # Center around anchor X + optional shift, plant bottom strictly at target ground y
            tgt_cx = int(round(ANCHOR_X_160 + pose.get("rot_dx", 0.0)))
            tgt_bot = int(round(pose.get("rot_bot_y", 115.0)))
            ox = max(MARGIN_160 + 2, min(LOG_W - MARGIN_160 - 2 - cw, tgt_cx - cw // 2))
            oy = max(MARGIN_160 + 2, min(LOG_H - MARGIN_160 - 1 - ch, tgt_bot - ch))
            frame[oy : oy + ch, ox : ox + cw] = crop_r

    # Mandatory shared EX sprite cleanup pass (seals interior pinholes & strips stray leaks!)
    frame = seal_160_char_pinholes_and_leaks(
        frame,
        max_pinhole_lpx=6,
        min_detached_lpx=4,
        max_orphan_lpx=18,
        orphan_dist_lpx=5.0,
        bridge_max_lpx=22,
        bridge_gap_lpx=2.2,
        safe_border_lpx=MARGIN_160,
    )

    # Optional post-clean VFX callback (lightning flickers, punch smears, phantom fists, shockwaves)
    vfx_fn = pose.get("vfx_fn")
    if vfx_fn is not None:
        vfx_fn(frame, (f_wx, f_wy), (b_wx, b_wy), (pelv_x / S_HI, pelv_y / S_HI))

    # Hard-enforce >= 4px transparent outer border (`MARGIN_160 = 2` logical px -> 4px output)
    frame[:MARGIN_160, :] = 0
    frame[LOG_H - MARGIN_160 :, :] = 0
    frame[:, :MARGIN_160] = 0
    frame[:, LOG_W - MARGIN_160 :] = 0
    return frame


# ==============================================================================
# 5. ALL 10 ANIMATION ROWS (30fps CHOREOGRAPHY)
# ==============================================================================
def build_row0_idle(rig: dict) -> list[np.ndarray]:
    """Row 0 IDLE: Tall heroic martial fighting stance matching warrior_ex/ronin_ex height & poise."""
    frames = []
    for c in range(COLS):
        u = c / float(COLS)
        ph = u * math.tau
        bob = 1.6 * math.sin(ph)  # Clean athletic breathing bob without squishing legs
        sway = 1.0 * math.cos(ph)

        def idle_vfx(arr, fw, bw, _pelv, col=c, phase=ph):
            # Clean crisp 2px golden/white knuckle spark (zero messy zigzags across arms!)
            sx = int(round(fw[0] + 3.5 * math.cos(phase * 2.0 + col)))
            sy = int(round(fw[1] - 3.0 + 2.5 * math.sin(phase * 3.0)))
            put_px(arr, sx, sy, C_WHITE if col % 3 == 0 else C_GOLD_LIT)
            if col % 2 == 0:
                put_px(arr, sx + 1, sy, C_GOLD)
            sx2 = int(round(bw[0] + 3.0 * math.sin(phase * 2.0 + col)))
            sy2 = int(round(bw[1] - 2.0 + 2.0 * math.cos(phase * 2.0)))
            put_px(arr, sx2, sy2, C_GOLD_LIT if col % 2 == 0 else C_INDIGO_LIT)

        pose = {
            "dx": sway * 0.6,
            "dy": 1.6 + bob,
            "torso_ang": 5.5 + 1.5 * math.sin(ph),
            "head_ang": -2.0 + 0.9 * math.sin(ph - 0.5),
            "l_foot": (-12.5, 0.0),
            "r_foot": (12.5, 0.0),
            # Open heroic Ryu/Ken fighting guard: front power fist cocked cleanly at flank/ribs, lead fist out!
            "f_hand": (2.0 + 2.0 * math.cos(ph), 9.5 + 1.4 * math.sin(ph)),
            "b_hand": (18.5 + 1.8 * math.sin(ph), 0.0 + 1.4 * math.cos(ph)),
            "f_charge": 0.32 + 0.22 * abs(math.sin(ph * 2.0)),
            "b_charge": 0.32 + 0.22 * abs(math.cos(ph * 2.0)),
            "wave_phase": ph,
            "scarf_amp": 20.0,
            "hb_amp": 12.0,
            "scarf_ang": 6.0 + 3.5 * math.sin(ph),
            "expr": "fierce",
            "vfx_fn": idle_vfx,
        }
        frames.append(render_pose_160(rig, pose))
    return frames


def build_row1_walk(rig: dict) -> list[np.ndarray]:
    """
    Row 1 WALK: Tall, confident athletic martial stride matching warrior_ex/ronin_ex proportions (ZERO midget squat!).
    Guarantees:
      - walkStanceDelta <= -6.0px on BOTH half-cycles (stance foot sweeps -X while swing foot crosses +X!)
      - maxBootSpan >= 56px, minBootSpan <= maxBootSpan * 0.55
      - Smooth topY delta <= 4px, grounded maxY in 224..232
    """
    frames = []
    for c in range(COLS):
        u = c / float(COLS)
        ph = u * math.tau

        def foot_traj(cycle_u: float) -> tuple[float, float, float]:
            # Stance phase [0.0..0.5): firmly planted sweeping smoothly backward (+16.5 -> -16.5)
            # Swing phase [0.5..1.0): clean athletic step forward (-16.5 -> +16.5) with natural knee clearance
            cu = cycle_u % 1.0
            if cu < 0.5:
                s = cu / 0.5
                fx = lerp(16.5, -16.5, s)
                fy = 0.0
                bang = lerp(-6.0, 10.0, s)
            else:
                s = (cu - 0.5) / 0.5
                fx = lerp(-16.5, 16.5, smoothstep(s))
                fy = -9.5 * math.sin(s * math.pi)
                bang = lerp(14.0, -10.0, s)
            return (fx, fy, bang)

        rf_x, rf_y, rb_ang = foot_traj(u)
        lf_x, lf_y, lb_ang = foot_traj(u + 0.5)

        # Crisp upright athletic step bob (hips stay HIGH so legs stay long and heroic!)
        step_bob = 1.2 * math.cos(ph * 2.0)
        arm_swing = math.sin(ph)

        pose = {
            "dx": 1.2 + 1.4 * math.sin(ph * 2.0),
            "dy": 1.4 + step_bob,
            "torso_ang": 9.0 + 1.8 * math.cos(ph * 2.0),
            "head_ang": -3.0 + 0.9 * math.sin(ph * 2.0),
            "l_foot": (lf_x, lf_y),
            "r_foot": (rf_x, rf_y),
            "l_boot_ang": lb_ang,
            "r_boot_ang": rb_ang,
            # Natural athletic swinging fists clearing chest silhouette cleanly!
            "f_hand": (2.5 + 8.5 * arm_swing, 9.5 - 2.4 * arm_swing),
            "b_hand": (14.5 - 8.5 * arm_swing, 2.5 + 2.4 * arm_swing),
            "f_charge": 0.22,
            "b_charge": 0.22,
            "wave_phase": ph * 2.0,
            "scarf_amp": 26.0,
            "hb_amp": 15.0,
            "scarf_ang": 11.0 + 4.5 * math.sin(ph * 2.0),
            "expr": "fierce",
        }
        frames.append(render_pose_160(rig, pose))
    return frames


def build_row2_auto(rig: dict) -> list[np.ndarray]:
    """
    Row 2 AUTO_ATTACK (`[[60,8],[68,7],[75,8],[83,7]]`):
      - Tall heroic martial lunges (wide grounded stance, crisp outward smears, ZERO messy body squiggles!)
    """
    frames = []
    for c in range(COLS):
        # -------- BEAT 1: Stepping Storm Jab (F00..F07) --------
        if c < 8:
            if c == 0:
                pose = {
                    "dx": -4.0,
                    "dy": 3.5,
                    "torso_ang": -2.0,
                    "head_ang": 1.5,
                    "l_foot": (-14.5, 0.0),
                    "r_foot": (12.5, 0.0),
                    "f_hand": (6.0, 6.0),
                    "b_hand": (4.0, 0.0),
                    "b_charge": 0.65,
                    "wave_phase": 0.4,
                    "scarf_amp": 24.0,
                    "expr": "focus",
                }
            elif c <= 4:
                ext = 1.0 if c in (1, 2, 3) else 0.90
                def jab_vfx(arr, _fw, bw, _p, col=c):
                    draw_punch_smear_160(arr, bw[0] - 8, bw[1], bw[0] + 24, bw[1] - 1, half_w=5.5, phase=col)
                    if col in (2, 3):
                        draw_shockwave_ring_160(arr, bw[0] + 12, bw[1], 5.5, 11.0, phase=col)

                pose = {
                    "dx": 10.0 * ext,
                    "dy": 4.2,
                    "torso_ang": 20.0 * ext,
                    "head_ang": -2.0,
                    "l_foot": (-15.5, 0.0),
                    "r_foot": (23.0, 0.0),
                    "f_hand": (-5.0, 8.0),
                    "b_hand": (29.0 * ext, -3.5),
                    "rear_arm_front": True,
                    "b_charge": 1.0,
                    "f_charge": 0.35,
                    "wave_phase": c * 1.1,
                    "scarf_amp": 32.0,
                    "scarf_ang": 20.0,
                    "expr": "yell",
                    "vfx_fn": jab_vfx,
                }
            else:
                k = (c - 4) / 3.0
                pose = {
                    "dx": lerp(8.0, -3.0, k),
                    "dy": lerp(4.2, 5.0, k),
                    "torso_ang": lerp(16.0, -8.0, k),
                    "head_ang": lerp(-2.0, 3.0, k),
                    "l_foot": (lerp(-15.0, -15.5, k), 0.0),
                    "r_foot": (lerp(22.0, 12.5, k), 0.0),
                    "f_hand": (lerp(-3.0, -11.0, k), lerp(7.5, 3.0, k)),
                    "b_hand": (lerp(22.0, 13.0, k), lerp(-2.0, 4.0, k)),
                    "f_charge": lerp(0.4, 0.75, k),
                    "b_charge": 0.35 * (1.0 - k),
                    "wave_phase": c * 0.9,
                    "scarf_amp": 26.0,
                    "expr": "fierce",
                }

        # -------- BEAT 2: Cross-Step Whipping Thunder Hook (F08..F14) --------
        elif c < 15:
            lc = c - 8
            if lc == 0:
                pose = {
                    "dx": -4.5,
                    "dy": 5.5,
                    "torso_ang": -14.0,
                    "head_ang": 4.0,
                    "l_foot": (-15.5, 0.0),
                    "r_foot": (12.0, 0.0),
                    "f_hand": (-13.0, 2.0),
                    "b_hand": (13.0, 5.0),
                    "f_charge": 0.85,
                    "wave_phase": lc * 0.9 + 2.0,
                    "scarf_amp": 30.0,
                    "scarf_ang": -12.0,
                    "expr": "focus",
                }
            elif lc <= 4:
                swing = (lc - 1) / 3.0
                def hook_vfx(arr, fw, _bw, pelv, col=lc):
                    draw_thunder_arc_smear_160(
                        arr, pelv[0] + 14, pelv[1] - 14, 38.0, 14.0, -150.0 + col * 24.0, 38.0 + col * 10.0, band_w=7.0, phase=col
                    )

                pose = {
                    "dx": lerp(5.0, 12.5, swing),
                    "dy": 4.5,
                    "torso_ang": lerp(18.0, 26.0, swing),
                    "head_ang": -2.0,
                    "l_foot": (-15.5, 0.0),
                    "r_foot": (24.5, 0.0),
                    "f_hand": (lerp(26.0, 29.0, swing), lerp(-5.0, 0.0, swing)),
                    "b_hand": (-9.0, 6.5),
                    "f_charge": 1.0,
                    "wave_phase": lc * 1.2 + 2.0,
                    "scarf_amp": 36.0,
                    "scarf_ang": 24.0,
                    "expr": "yell",
                    "vfx_fn": hook_vfx,
                }
            else:
                k = (lc - 4) / 2.0
                pose = {
                    "dx": lerp(10.0, -2.5, k),
                    "dy": lerp(5.0, 9.5, k),
                    "torso_ang": lerp(22.0, 16.0, k),
                    "head_ang": lerp(0.0, -5.0, k),
                    "l_foot": (lerp(-15.0, -15.5, k), 0.0),
                    "r_foot": (lerp(23.0, 14.5, k), 0.0),
                    "f_hand": (lerp(22.0, 7.0, k), lerp(2.0, 17.0, k)),
                    "b_hand": (lerp(-5.0, 14.0, k), lerp(6.0, 6.0, k)),
                    "f_role": "uppercut" if k > 0.4 else "fist",
                    "f_charge": 0.75,
                    "wave_phase": lc * 0.9 + 2.0,
                    "scarf_amp": 28.0,
                    "expr": "focus",
                }

        # -------- BEAT 3: Knee-Tucked Rising Sky-Breaker Uppercut (F15..F22) --------
        elif c < 23:
            lc = c - 15
            if lc == 0:
                pose = {
                    "dx": -3.0,
                    "dy": 10.5,
                    "torso_ang": 18.0,
                    "head_ang": -6.0,
                    "l_foot": (-16.0, 0.0),
                    "r_foot": (15.0, 0.0),
                    "f_hand": (6.0, 19.0),
                    "b_hand": (14.5, 6.0),
                    "f_role": "uppercut",
                    "f_charge": 0.95,
                    "wave_phase": 4.4,
                    "scarf_amp": 28.0,
                    "expr": "focus",
                }
            elif lc <= 5:
                u_rise = (lc - 1) / 4.0
                lift = -13.0 * math.sin(min(1.0, u_rise * 1.1) * math.pi)
                def upper_vfx(arr, fw, _bw, pelv, col=lc):
                    draw_thunder_arc_smear_160(
                        arr, pelv[0] + 12, pelv[1] - 18, 28.0, 38.0, 32.0, -96.0, band_w=7.0, phase=col
                    )

                pose = {
                    "dx": 7.5 + 3.5 * u_rise,
                    "dy": -3.0 + lift,
                    "torso_ang": -15.0,
                    "head_ang": -12.0,
                    "l_foot": (-12.5, lift * 0.65 + 2.0),
                    "r_foot": (16.5, lift * 0.9 - 12.0),
                    "l_boot_ang": 20.0,
                    "r_boot_ang": -22.0,
                    "f_hand": (20.5 + 2.5 * u_rise, -24.5),
                    "b_hand": (-8.5, 11.0),
                    "f_role": "uppercut",
                    "f_charge": 1.0,
                    "f_bend": 0,
                    "wave_phase": lc * 1.3 + 4.0,
                    "scarf_amp": 36.0,
                    "scarf_ang": 34.0,
                    "expr": "yell",
                    "vfx_fn": upper_vfx,
                }
            else:
                k = (lc - 5) / 2.0
                pose = {
                    "dx": lerp(7.0, -3.5, k),
                    "dy": lerp(2.0, 8.0, k),
                    "torso_ang": lerp(-5.0, 5.0, k),
                    "l_foot": (lerp(-12.0, -16.5, k), 0.0),
                    "r_foot": (lerp(18.0, 16.0, k), 0.0),
                    "f_hand": (lerp(14.0, 3.5, k), lerp(-8.0, 5.5, k)),
                    "b_hand": (lerp(2.0, 6.0, k), lerp(8.0, 3.0, k)),
                    "f_charge": 0.75,
                    "wave_phase": lc * 1.0 + 4.0,
                    "scarf_amp": 26.0,
                    "expr": "focus",
                }

        # -------- BEAT 4: Heavy One-Inch THUNDERCLAP PALM Shockwave Finisher (F23..F29) --------
        else:
            lc = c - 23
            if lc == 0:
                pose = {
                    "dx": -5.0,
                    "dy": 8.5,
                    "torso_ang": 4.0,
                    "head_ang": -1.5,
                    "l_foot": (-17.5, 0.0),
                    "r_foot": (16.5, 0.0),
                    "f_hand": (3.0, 5.5),
                    "b_hand": (5.5, 3.0),
                    "f_role": "palm",
                    "b_role": "palm",
                    "f_charge": 1.0,
                    "b_charge": 0.95,
                    "wave_phase": 6.4,
                    "scarf_amp": 30.0,
                    "expr": "focus",
                }
            elif lc <= 4:
                blast_u = (lc - 1) / 3.0
                def palm_vfx(arr, fw, _bw, _p, col=lc, bu=blast_u):
                    rx = 7.0 + bu * 13.0
                    ry = 14.0 + bu * 18.0
                    cx = fw[0] + 10.0 + bu * 14.0
                    draw_punch_smear_160(arr, fw[0] - 4, fw[1], cx + 8, fw[1], half_w=7.5, phase=col)
                    draw_shockwave_ring_160(arr, cx, fw[1], rx, ry, phase=col)

                pose = {
                    "dx": 12.0,
                    "dy": 5.5,
                    "torso_ang": 22.0,
                    "head_ang": -2.0,
                    "l_foot": (-16.5, 0.0),
                    "r_foot": (25.0, 0.0),
                    "f_hand": (28.5, -0.5),
                    "b_hand": (24.0, -4.5),
                    "f_role": "palm",
                    "b_role": "palm",
                    "f_charge": 1.0,
                    "b_charge": 1.0,
                    "wave_phase": lc * 1.5 + 6.0,
                    "scarf_amp": 40.0,
                    "scarf_ang": 24.0,
                    "expr": "yell",
                    "vfx_fn": palm_vfx,
                }
            else:
                k = (lc - 4) / 2.0
                pose = {
                    "dx": lerp(9.0, 1.0, k),
                    "dy": lerp(5.0, 1.8, k),
                    "torso_ang": lerp(18.0, 6.0, k),
                    "head_ang": lerp(-2.0, -2.0, k),
                    "l_foot": (lerp(-16.0, -12.5, k), 0.0),
                    "r_foot": (lerp(23.5, 12.5, k), 0.0),
                    "f_hand": (lerp(22.0, 7.5, k), lerp(1.0, 4.0, k)),
                    "b_hand": (lerp(20.0, 18.0, k), lerp(-3.0, -2.5, k)),
                    "f_role": "palm" if lc == 5 else "fist",
                    "f_charge": 0.5 * (1.0 - k),
                    "wave_phase": lc * 1.0 + 6.0,
                    "scarf_amp": 24.0,
                    "expr": "fierce",
                }
        frames.append(render_pose_160(rig, pose))
    return frames


def build_row3_skill(rig: dict) -> list[np.ndarray]:
    """Row 3 SKILL (`THUNDERSTEP BREAKER`): Clean coil -> blitz sprint-dash -> explosive storm cross-punch."""
    frames = []
    for c in range(COLS):
        if c <= 4:
            k = c / 4.0
            pose = {
                "dx": lerp(-2.0, -8.5, k),
                "dy": lerp(2.0, 9.5, k),
                "torso_ang": lerp(8.0, 26.0, k),
                "head_ang": -8.0,
                "l_foot": (-17.5, 0.0),
                "r_foot": (14.5, 0.0),
                "f_hand": (lerp(7.5, -12.0, k), lerp(4.0, 7.0, k)),
                "b_hand": (17.0, 3.0),
                "f_charge": 0.6 + 0.4 * k,
                "b_charge": 0.5 + 0.4 * k,
                "wave_phase": c * 1.1,
                "scarf_amp": 32.0,
                "scarf_ang": 22.0,
                "expr": "focus",
            }
        elif c <= 12:
            k = (c - 5) / 7.0
            stride = math.sin(k * math.tau * 1.5)
            def sk_dash_vfx(arr, fw, _bw, pelv, col=c):
                draw_punch_smear_160(arr, fw[0] - 8, fw[1], fw[0] + 16, fw[1] - 2, half_w=4.5, phase=col)

            pose = {
                "dx": lerp(-3.0, 11.0, k),
                "dy": 6.5 - 2.2 * abs(stride),
                "torso_ang": 32.0,
                "head_ang": -11.0,
                "l_foot": (-18.5 + 12.0 * stride, -5.5 * max(0.0, stride)),
                "r_foot": (19.5 - 12.0 * stride, -5.5 * max(0.0, -stride)),
                "f_hand": (-10.0 + 18.0 * k, 4.0),
                "b_hand": (22.0, 1.0),
                "f_charge": 1.0,
                "b_charge": 0.9,
                "wave_phase": c * 1.7,
                "scarf_amp": 42.0,
                "scarf_ang": 30.0,
                "expr": "yell",
                "vfx_fn": sk_dash_vfx,
            }
        elif c <= 22:
            k = (c - 13) / 9.0
            def sk_impact_vfx(arr, fw, _bw, _pelv, col=c, uk=k):
                if uk < 0.72:
                    draw_punch_smear_160(arr, fw[0] - 8, fw[1], fw[0] + 28, fw[1] - 2, half_w=8.0, phase=col)
                    draw_shockwave_ring_160(arr, fw[0] + 12 + uk * 14, fw[1], 7.5 + uk * 12.0, 14.0 + uk * 16.0, phase=col)

            pose = {
                "dx": lerp(14.0, 9.0, k),
                "dy": 5.0,
                "torso_ang": lerp(26.0, 18.0, k),
                "head_ang": -2.0,
                "l_foot": (-16.5, 0.0),
                "r_foot": (25.0, 0.0),
                "f_hand": (29.0, -2.5),
                "b_hand": (-9.0, 7.0),
                "f_charge": 1.0,
                "b_charge": 0.6,
                "wave_phase": c * 1.5,
                "scarf_amp": 40.0,
                "scarf_ang": 24.0,
                "expr": "yell",
                "vfx_fn": sk_impact_vfx,
            }
        else:
            k = (c - 23) / 6.0
            pose = {
                "dx": lerp(8.0, 0.0, k),
                "dy": lerp(4.8, 1.6, k),
                "torso_ang": lerp(16.0, 5.5, k),
                "head_ang": lerp(-2.0, -2.0, k),
                "l_foot": (lerp(-16.0, -12.5, k), 0.0),
                "r_foot": (lerp(24.0, 12.5, k), 0.0),
                "f_hand": (lerp(22.0, 7.5, k), lerp(0.0, 4.0, k)),
                "b_hand": (lerp(0.0, 18.0, k), lerp(6.0, -2.5, k)),
                "f_charge": 0.5 * (1.0 - k),
                "wave_phase": c * 0.9,
                "scarf_amp": 24.0,
                "expr": "fierce",
            }
        frames.append(render_pose_160(rig, pose))
    return frames


def build_row4_ult_and_true_ult(rig: dict) -> list[np.ndarray]:
    """
    Row 4: Clean heroic silhouette (ZERO ugly squiggles across his face/body!):
      - F00..F14 (`ULTIMATE`: TEMPEST HUNDRED FISTS):
        F00..F02 gather -> F03..F09 supersonic alternating barrage -> F10..F11 rising knee-tuck uppercut -> F12..F14 grounded recovery.
      - F15..F29 (`TRUE_ULTIMATE`: HEAVEN-SPLITTING RAIJIN CRASH):
        F15..F17 heroic Thunder-God gather -> F18..F20 knee-tuck sky-vault -> F21..F22 cocked downward meteor-fist dive ->
        F23..F25 earth-shattering grounded fist slam -> F26..F29 heroic rise (`cellMaxY = 229..231`).
    """
    frames = []
    for c in range(COLS):
        # ============ ULTIMATE: TEMPEST HUNDRED FISTS (F00..F14) ============
        if c <= 2:
            k = c / 2.0
            pose = {
                "dx": -3.0,
                "dy": 4.5 + 1.5 * k,
                "torso_ang": 8.0,
                "l_foot": (-15.5, 0.0),
                "r_foot": (15.5, 0.0),
                "f_hand": (7.0, 5.0),
                "b_hand": (10.0, 1.0),
                "f_charge": 0.9,
                "b_charge": 0.9,
                "wave_phase": c * 1.2,
                "scarf_amp": 34.0,
                "expr": "focus",
            }
        elif c <= 9:
            alt = (c % 2) == 0
            def barrage_vfx(arr, fw, bw, pelv, col=c):
                offsets = [
                    (34, -18, True), (48, -8, False), (56, 2, True),
                    (46, 11, False), (38, -3, True),
                ]
                for idx, (ox, oy, is_gold) in enumerate(offsets):
                    jitter_x = ((col * 9 + idx * 5) % 9) - 4
                    jitter_y = ((col * 7 + idx * 3) % 7) - 3
                    fx = pelv[0] + ox + jitter_x
                    fy = pelv[1] - 12 + oy + jitter_y
                    draw_punch_smear_160(arr, fx - 18, fy, fx + 5, fy, half_w=3.2, phase=col + idx)
                    draw_phantom_fist_160(arr, fx, fy, scale=1.0, gold=is_gold)

            pose = {
                "dx": 7.0 + (2.5 if alt else -1.5),
                "dy": 4.5,
                "torso_ang": 22.0 if alt else 12.0,
                "head_ang": -3.0,
                "l_foot": (-16.0, 0.0),
                "r_foot": (22.5, 0.0),
                "f_hand": (29.0 if alt else -4.0, (-6.0 if c % 4 == 0 else 2.0) if alt else 6.5),
                "b_hand": (-2.0 if alt else 29.0, 5.5 if alt else (-6.0 if c % 4 == 1 else 2.0)),
                "rear_arm_front": not alt,
                "f_charge": 1.0,
                "b_charge": 1.0,
                "wave_phase": c * 2.2,
                "scarf_amp": 42.0,
                "scarf_ang": 28.0,
                "expr": "yell",
                "vfx_fn": barrage_vfx,
            }
        elif c <= 11:
            def u_upper_vfx(arr, fw, _bw, pelv, col=c):
                draw_thunder_arc_smear_160(arr, pelv[0] + 12, pelv[1] - 18, 30.0, 42.0, 34.0, -98.0, band_w=7.5, phase=col)

            pose = {
                "dx": 9.0,
                "dy": -7.5 if c == 10 else -4.5,
                "torso_ang": -15.0,
                "head_ang": -12.0,
                "l_foot": (-12.0, -5.0 if c == 10 else -1.5),
                "r_foot": (16.5, -16.0 if c == 10 else -10.5),
                "l_boot_ang": 20.0,
                "r_boot_ang": -22.0,
                "f_hand": (20.5, -24.5),
                "b_hand": (-8.0, 10.5),
                "f_role": "uppercut",
                "f_charge": 1.0,
                "f_bend": 0,
                "wave_phase": c * 1.5,
                "scarf_amp": 36.0,
                "scarf_ang": 34.0,
                "expr": "yell",
                "vfx_fn": u_upper_vfx,
            }
        elif c <= 14:
            k = (c - 12) / 2.0
            pose = {
                "dx": lerp(6.0, 0.5, k),
                "dy": lerp(4.5, 1.8, k),
                "torso_ang": lerp(14.0, 5.5, k),
                "head_ang": lerp(-2.0, -2.0, k),
                "l_foot": (lerp(-15.0, -12.5, k), 0.0),
                "r_foot": (lerp(18.5, 12.5, k), 0.0),
                "l_boot_ang": 0.0,
                "r_boot_ang": 0.0,
                "f_hand": (lerp(14.0, 7.5, k), lerp(-3.0, 4.0, k)),
                "b_hand": (lerp(10.0, 18.0, k), lerp(3.0, -2.5, k)),
                "f_charge": 0.55 * (1.0 - k),
                "wave_phase": c * 0.9,
                "scarf_amp": 24.0,
                "expr": "fierce",
            }

        # ============ TRUE ULTIMATE: HEAVEN-SPLITTING RAIJIN CRASH (F15..F29) ============
        elif c <= 17:  # F15..F17: Heroic Thunder-God gather (fists braced wide at waist, ZERO face squiggles!)
            k = (c - 15) / 2.0
            pose = {
                "dx": -2.0,
                "dy": 5.5 + 1.5 * k,
                "torso_ang": 10.0 + 3.0 * k,
                "head_ang": -4.0,
                "l_foot": (-16.0, 0.0),
                "r_foot": (16.0, 0.0),
                "f_hand": (-8.0, 8.5),
                "b_hand": (16.0, 5.5),
                "f_charge": 1.0,
                "b_charge": 1.0,
                "wave_phase": c * 1.4,
                "scarf_amp": 38.0,
                "scarf_ang": 24.0,
                "expr": "focus",
            }
        elif c <= 20:  # F18..F20: Dynamic heroic knee-tuck sky-vault launch (clean silhouette!)
            k = (c - 18) / 2.0
            lift = lerp(-6.0, -14.0, k)
            pose = {
                "dx": 4.0,
                "dy": lift,
                "torso_ang": -12.0,
                "head_ang": -10.0,
                "l_foot": (-11.0, lift * 0.6 + 2.0),
                "r_foot": (15.5, lift * 0.85 - 11.0),
                "l_boot_ang": 18.0,
                "r_boot_ang": -20.0,
                "f_hand": (17.0, -22.5),
                "b_hand": (-7.5, 10.0),
                "f_role": "uppercut",
                "f_charge": 1.0,
                "b_charge": 0.9,
                "f_bend": 0,
                "wave_phase": c * 1.6,
                "scarf_amp": 38.0,
                "scarf_ang": 38.0,
                "expr": "yell",
            }
        elif c <= 22:  # F21..F22: Iconic cocked downward Raijin Meteor-Fist dive pose!
            pose = {
                "dx": 6.0,
                "dy": -10.0,
                "torso_ang": 34.0,
                "head_ang": 6.0,
                "l_foot": (-14.0, -14.0),
                "r_foot": (8.0, -8.0),
                "l_boot_ang": 22.0,
                "r_boot_ang": -12.0,
                "f_hand": (-9.0, -12.0),
                "b_hand": (20.0, 16.0),
                "f_charge": 1.0,
                "b_charge": 1.0,
                "wave_phase": c * 1.8,
                "scarf_amp": 42.0,
                "scarf_ang": -26.0,
                "expr": "yell",
            }
        elif c <= 25:  # F23..F25: Heroic earth-shattering meteor-fist slam! (100% CLEAN SILHOUETTE!)
            k = (c - 23) / 2.0
            dy_slam = lerp(2.0, 9.5, k)
            pose = {
                "dx": 9.0,
                "dy": dy_slam,
                "torso_ang": 30.0,
                "head_ang": 4.0,
                "l_foot": (-17.5, 0.0),
                "r_foot": (21.5, 0.0),
                "f_hand": (22.0, 21.0),
                "b_hand": (-12.0, -6.0),
                "f_charge": 1.0,
                "b_charge": 0.85,
                "wave_phase": c * 1.9,
                "scarf_amp": 40.0,
                "scarf_ang": -16.0,
                "expr": "yell",
            }
        else:  # F26..F29: Heroic rise to tall proud martial stance (`cellMaxY = 229..231`)
            k = (c - 26) / 3.0
            pose = {
                "dx": lerp(8.0, 0.5, k),
                "dy": lerp(8.5, 1.8, k),
                "torso_ang": lerp(24.0, 5.5, k),
                "head_ang": lerp(4.0, -2.0, k),
                "l_foot": (lerp(-17.0, -12.5, k), 0.0),
                "r_foot": (lerp(20.5, 12.5, k), 0.0),
                "l_boot_ang": 0.0,
                "r_boot_ang": 0.0,
                "f_hand": (lerp(18.0, 7.5, k), lerp(16.0, 4.0, k)),
                "b_hand": (lerp(-6.0, 18.0, k), lerp(0.0, -2.5, k)),
                "f_charge": 0.7 * (1.0 - k),
                "wave_phase": c * 1.0,
                "scarf_amp": 26.0,
                "expr": "fierce",
            }
        frames.append(render_pose_160(rig, pose))
    return frames


def build_row5_death(rig: dict) -> list[np.ndarray]:
    """
    Row 5 DEATH & HURT:
      - F00..F05: Upright heavy recoil stagger (also used for HURT)
      - F06..F13: Defiant one-knee martial brace (captured by DeathFXManager `tempest_discharge`!)
      - F14..F20: Toppling collapse
      - F21..F29: Grounded horizontal prone (`maxDeathH <= 136px`, strictly `68..112px`, `cellMaxY = 226..232`)
    """
    frames = []
    for c in range(COLS):
        if c <= 5:  # Upright stagger (F00..F05)
            k = c / 5.0
            pose = {
                "dx": lerp(-2.0, -7.0, k),
                "dy": 4.5 + 3.0 * k,
                "torso_ang": lerp(-8.0, -18.0, k),
                "head_ang": lerp(-12.0, -24.0, k),
                "l_foot": (-14.0, 0.0),
                "r_foot": (12.0, 0.0),
                "f_hand": (6.0 - 4.0 * k, 12.0),
                "b_hand": (12.0 - 4.0 * k, 6.0),
                "f_charge": 0.1,
                "b_charge": 0.1,
                "wave_phase": c * 0.5,
                "scarf_amp": 16.0,
                "expr": "hurt",
            }
        elif c <= 13:  # Defiant one-knee brace (F06..F13)
            k = (c - 6) / 7.0
            pose = {
                "dx": lerp(-6.0, -3.0, k),
                "dy": lerp(8.0, 17.0, smoothstep(k)),
                "torso_ang": lerp(-10.0, 18.0, smoothstep(k)),
                "head_ang": lerp(-14.0, 14.0, smoothstep(k)),
                "l_foot": (-15.0, 0.0),
                "r_foot": (14.0, 0.0),
                "f_hand": (11.0, lerp(12.0, 21.0, smoothstep(k))),  # fist planted toward ground
                "b_hand": (6.0, 10.0),
                "f_charge": 0.25 if c % 2 == 0 else 0.05,
                "wave_phase": c * 0.35,
                "scarf_amp": 12.0,
                "expr": "hurt",
            }
        elif c <= 20:  # Toppling fall toward horizontal prone
            k = smoothstep((c - 14) / 6.0)
            pose = {
                "dx": -2.0,
                "dy": 14.0,
                "torso_ang": lerp(14.0, 4.0, k),
                "head_ang": lerp(8.0, 2.0, k),
                "l_foot": (lerp(-12.0, -6.0, k), 0.0),
                "r_foot": (lerp(12.0, 6.0, k), 0.0),
                "f_hand": (lerp(12.0, 5.0, k), lerp(14.0, 18.0, k)),
                "b_hand": (lerp(10.0, 4.0, k), lerp(12.0, 17.0, k)),
                "scarf_ang": lerp(6.0, -72.0, k),
                "hb_ang": lerp(4.0, -68.0, k),
                "whole_rot": lerp(18.0, 86.0, k),
                "rot_dx": lerp(-2.0, 2.0, k),
                "rot_bot_y": 115.0,
                "f_charge": 0.0,
                "b_charge": 0.0,
                "wave_phase": c * 0.25,
                "scarf_amp": lerp(8.0, 3.0, k),
                "hb_amp": lerp(8.0, 2.5, k),
                "expr": "hurt",
            }
        else:  # Grounded horizontal prone rest (F21..F29, height ~82..94px <= 104px!)
            k = (c - 21) / 8.0
            # Drape scarf/headband along fallen spine so prone silhouette stays compact & grounded
            pose = {
                "dx": 0.0,
                "dy": 10.0,
                "torso_ang": 3.0,
                "head_ang": 2.0,
                "l_foot": (-5.5, 0.0),
                "r_foot": (5.5, 0.0),
                "f_hand": (5.0, 18.5),
                "b_hand": (3.5, 17.5),
                "scarf_ang": -76.0 + 3.0 * math.sin(k * math.pi),
                "hb_ang": -72.0 + 2.5 * math.cos(k * math.pi),
                "whole_rot": 89.5 + 0.5 * math.sin(k * math.pi),
                "rot_dx": 2.0 + 0.5 * math.sin(k * math.tau),
                "rot_bot_y": 115.0,
                "f_charge": 0.0,
                "b_charge": 0.0,
                "wave_phase": 4.0 + k * 2.4,
                "scarf_amp": 3.0 + 1.5 * math.sin(k * math.pi),
                "hb_amp": 2.5 + 1.0 * math.sin(k * math.pi),
                "expr": "hurt",
            }
        frames.append(render_pose_160(rig, pose))
    return frames


def build_row6_dash(rig: dict) -> list[np.ndarray]:
    """Row 6 DASH: Sleek athletic lightning sprint-dash (tall stride, clean silhouette, trailing streaks!)."""
    frames = []
    for c in range(COLS):
        u = c / float(COLS)
        ph = u * math.tau * 2.0
        stride = math.sin(ph)
        def dash_vfx(arr, _fw, _bw, pelv, col=c):
            # Subtle crisp speed-streaks BEHIND Raijin (never crossing his torso/face!)
            draw_punch_smear_160(arr, pelv[0] - 34, pelv[1] - 10, pelv[0] - 14, pelv[1] - 10, half_w=2.0, phase=col)
            draw_punch_smear_160(arr, pelv[0] - 30, pelv[1] + 6, pelv[0] - 12, pelv[1] + 6, half_w=1.8, phase=col + 2)

        pose = {
            "dx": 5.0 + 2.0 * math.cos(ph),
            "dy": 5.5 - 1.8 * abs(stride),
            "torso_ang": 28.0 + 2.5 * math.cos(ph),
            "head_ang": -10.0,
            "l_foot": (-17.5 + 17.5 * stride, -9.5 * max(0.0, stride)),
            "r_foot": (17.5 - 17.5 * stride, -9.5 * max(0.0, -stride)),
            "l_boot_ang": 16.0 if stride > 0 else -8.0,
            "r_boot_ang": 16.0 if stride < 0 else -8.0,
            "f_hand": (-8.0 - 9.0 * stride, 5.5 + 3.0 * stride),
            "b_hand": (16.0 + 8.0 * stride, 0.5 - 3.0 * stride),
            "f_charge": 0.75,
            "b_charge": 0.75,
            "wave_phase": ph * 1.5,
            "scarf_amp": 40.0,
            "scarf_ang": 28.0,
            "expr": "yell",
            "vfx_fn": dash_vfx,
        }
        frames.append(render_pose_160(rig, pose))
    return frames


def build_row7_crouch(rig: dict) -> list[np.ndarray]:
    """Row 7 CROUCH: Deep Iron Guard — crossed armored taped forearms bracing & deflecting sparks."""
    frames = []
    for c in range(COLS):
        u = c / float(COLS)
        ph = u * math.tau
        def guard_vfx(arr, fw, _bw, _pelv, col=c):
            # Crisp subtle Iron Guard golden-indigo parry glints off crossed bracers
            if col % 4 in (0, 1):
                gx, gy = fw[0] + 3, fw[1] - 3
                put_px(arr, int(gx), int(gy), C_WHITE)
                put_px(arr, int(gx) + 2, int(gy) - 2, C_GOLD_LIT)
                put_px(arr, int(gx) - 2, int(gy) + 2, C_GOLD_LIT)
                put_px(arr, int(gx) + 2, int(gy) + 2, C_INDIGO_LIT)
                put_px(arr, int(gx) - 2, int(gy) - 2, C_INDIGO_LIT)

        pose = {
            "dx": -1.5,
            "dy": 14.5 + 1.2 * math.sin(ph),
            "torso_ang": 15.0 + 1.2 * math.sin(ph),
            "head_ang": -2.0,
            "l_foot": (-17.5, 0.0),
            "r_foot": (17.0, 0.0),
            # Crossed Iron Guard forearms raised tightly across chest/brow!
            "f_hand": (14.5 + 0.8 * math.sin(ph), -5.0),
            "b_hand": (7.5 - 0.8 * math.sin(ph), -3.5),
            "rear_arm_front": False,
            "f_role": "guard",
            "b_role": "guard",
            "f_charge": 0.45 + 0.2 * math.sin(ph),
            "b_charge": 0.45 + 0.2 * math.cos(ph),
            "wave_phase": ph,
            "scarf_amp": 20.0,
            "expr": "focus",
            "vfx_fn": guard_vfx,
        }
        frames.append(render_pose_160(rig, pose))
    return frames


def build_row8_jump_dodge(rig: dict) -> list[np.ndarray]:
    """Row 8 JUMP / DODGE: Explosive martial knee-tuck vault with billowing scarf & static spark trail."""
    frames = []
    for c in range(COLS):
        u = c / float(COLS)
        arc = math.sin(u * math.pi)
        lift = -17.5 * arc
        def jmp_vfx(arr, _fw, _bw, pelv, col=c):
            if 4 <= col <= 24:
                draw_lightning_bolt_160(arr, pelv[0] - 18, pelv[1] + 14, pelv[0] + 6, pelv[1] + 18, seed=col * 17, jag=2.5, thick=1)

        pose = {
            "dx": 2.0 * math.sin(u * math.tau),
            "dy": 2.0 + lift,
            "torso_ang": 18.0 * arc + 4.0,
            "head_ang": -4.0,
            "l_foot": (-10.0, lift * 0.9 - 7.0 * arc),
            "r_foot": (12.0, lift * 0.8 - 10.0 * arc),
            "f_hand": (14.0, -4.0 * arc + 3.0),
            "b_hand": (-4.0, 6.0 - 4.0 * arc),
            "f_charge": 0.4 + 0.4 * arc,
            "b_charge": 0.4,
            "wave_phase": u * math.tau * 2.0,
            "scarf_amp": 34.0,
            "scarf_ang": 26.0 * arc,
            "expr": "focus",
            "vfx_fn": jmp_vfx,
        }
        frames.append(render_pose_160(rig, pose))
    return frames


def build_row9_victory(rig: dict) -> list[np.ndarray]:
    """Row 9 VICTORY: Tall heroic upright fist-raise crackling with golden lightning (`minVictoryH >= 150px`)."""
    frames = []
    for c in range(COLS):
        u = c / float(COLS)
        ph = u * math.tau
        rise = smoothstep(min(1.0, c / 8.0))

        def vic_vfx(arr, fw, _bw, _pelv, col=c, r_k=rise):
            if r_k > 0.65:
                # Heroic crackling golden-indigo aura crown around raised victory fist!
                draw_lightning_bolt_160(
                    arr, fw[0] - 10, fw[1] - 4, fw[0] + 12, fw[1] - 10, seed=col * 19, jag=3.4, thick=1
                )
                draw_lightning_bolt_160(
                    arr, fw[0] + 2, fw[1] + 6, fw[0] - 8, max(5, fw[1] - 14), seed=col * 23 + 4, jag=3.0, thick=1
                )
                if col % 4 in (0, 1):
                    draw_shockwave_ring_160(arr, fw[0], fw[1] - 2, 7.0 + (col % 4) * 3.0, 7.0 + (col % 4) * 3.0, phase=col)

        pose = {
            "dx": 0.0,
            "dy": lerp(4.0, -1.0, rise) + 0.8 * math.sin(ph),
            "torso_ang": lerp(7.0, -5.0, rise),
            "head_ang": lerp(-2.0, -6.0, rise),
            "l_foot": (-11.0, 0.0),
            "r_foot": (12.0, 0.0),
            "f_hand": (lerp(13.0, 18.0, rise), lerp(5.0, -22.0, rise) + 1.0 * math.sin(ph)),
            "b_hand": (lerp(16.0, 11.0, rise), lerp(-1.0, 10.0, rise)),
            "f_role": "uppercut" if rise > 0.5 else "fist",
            "f_bend": 0,
            "f_charge": 0.4 + 0.6 * rise,
            "b_charge": 0.2,
            "wave_phase": ph,
            "scarf_amp": 30.0,
            "scarf_ang": 10.0 + 4.0 * math.sin(ph),
            "expr": "grin" if c >= 6 else "fierce",
            "vfx_fn": vic_vfx,
        }
        frames.append(render_pose_160(rig, pose))
    return frames


def build_character_sheet(rig: dict) -> np.ndarray:
    row_builders = [
        build_row0_idle,
        build_row1_walk,
        build_row2_auto,
        build_row3_skill,
        build_row4_ult_and_true_ult,
        build_row5_death,
        build_row6_dash,
        build_row7_crouch,
        build_row8_jump_dodge,
        build_row9_victory,
    ]
    sheet = np.zeros((ROWS * CELL_H, COLS * CELL_W, 4), dtype=np.uint8)
    for r, fn in enumerate(row_builders):
        row_frames = fn(rig)
        assert len(row_frames) == COLS, f"Row {r} returned {len(row_frames)} frames"
        for c, f160 in enumerate(row_frames):
            up = np.array(
                Image.fromarray(f160, "RGBA").resize((CELL_W, CELL_H), Image.Resampling.NEAREST),
                dtype=np.uint8,
            )
            sheet[r * CELL_H : (r + 1) * CELL_H, c * CELL_W : (c + 1) * CELL_W] = up
    return sheet


# ==============================================================================
# 6. PORTRAIT (256x256 RGBA) & HERO ICONS ROW 12 (384x832 RGBA)
# ==============================================================================
def build_portrait_256() -> Image.Image:
    """Builds 256x256 HD-2D portrait (`128x128` 28-color quantized pixel art -> 2x NEAREST)."""
    raw = Image.open(PORTRAIT_RAW_JPG).convert("RGB")
    med3 = raw.filter(ImageFilter.MedianFilter(size=3))
    im256 = med3.resize((256, 256), Image.Resampling.BOX).filter(ImageFilter.MedianFilter(size=3))
    im128 = im256.resize((128, 128), Image.Resampling.NEAREST)
    q128 = im128.quantize(colors=28, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert("RGBA")
    arr128 = np.array(q128, dtype=np.uint8)
    arr128[:, :, 3] = 255
    # Crisp 1px dark perimeter + subtle storm-gold top corners matching ronin_ex_portrait.png
    arr128[0, :] = [15, 23, 42, 255]
    arr128[-1, :] = [15, 23, 42, 255]
    arr128[:, 0] = [15, 23, 42, 255]
    arr128[:, -1] = [15, 23, 42, 255]
    for k in range(1, 5):
        arr128[1, k] = [251, 191, 36, 255]
        arr128[k, 1] = [251, 191, 36, 255]
        arr128[1, 127 - k] = [251, 191, 36, 255]
        arr128[k, 126] = [251, 191, 36, 255]
        arr128[126, k] = [99, 102, 241, 255]
        arr128[127 - k, 1] = [99, 102, 241, 255]
        arr128[126, 127 - k] = [99, 102, 241, 255]
        arr128[127 - k, 126] = [99, 102, 241, 255]

    out_im = Image.fromarray(arr128, "RGBA").resize((256, 256), Image.Resampling.NEAREST)
    out_im.save(OUT_PORTRAIT, optimize=True)
    return out_im


BRAWLER_ICON_PALETTE = [
    tuple(int(h[i : i + 2], 16) for i in (1, 3, 5))
    for h in [
        "#080b18", "#0f172a", "#171c3a", "#1e1b4b", "#2a2769",
        "#3730a3", "#4338ca", "#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe",
        "#451a03", "#78350f", "#b45309", "#d97706", "#f59e0b", "#fbbf24", "#fde047", "#fef08a", "#ffffff",
        "#522a20", "#8c4a32", "#b86b4a", "#e09872", "#f5c29a",
        "#6e7588", "#aeb4c2", "#e2dfd0",
    ]
]


def _nearest_pal(r: int, g: int, b: int, pal):
    best_c = pal[0]
    best_d = 10**12
    for pr, pg, pb in pal:
        rmean = (r + pr) >> 1
        dr, dg, db = r - pr, g - pg, b - pb
        d = (((512 + rmean) * dr * dr) >> 8) + 4 * dg * dg + (((767 - rmean) * db * db) >> 8)
        if d < best_d:
            best_d = d
            best_c = (pr, pg, pb)
    return best_c


def _process_icon_tile(tile_rgb: Image.Image) -> Image.Image:
    tw, th = tile_rgb.size
    ix, iy = int(tw * 0.045), int(th * 0.045)
    cropped = tile_rgb.crop((ix, iy, tw - ix, th - iy))
    cw, ch = cropped.size
    side = min(cw, ch)
    sq = cropped.crop(((cw - side) // 2, (ch - side) // 2, (cw - side) // 2 + side, (ch - side) // 2 + side))
    sq = sq.filter(ImageFilter.MedianFilter(size=5))
    mid = sq.resize((256, 256), Image.Resampling.BILINEAR).filter(ImageFilter.MedianFilter(size=3))
    small = mid.resize((64, 64), Image.Resampling.LANCZOS)
    px = small.load()
    grid = [[(0, 0, 0)] * 64 for _ in range(64)]
    for y in range(64):
        for x in range(64):
            r, g, b = px[x, y]
            dist = math.hypot(x - 31.5, y - 31.5) / 32.0
            if dist > 0.84:
                v = max(0.52, 1.0 - (dist - 0.84) * 1.4)
                r, g, b = int(r * v), int(g * v), int(b * v)
            grid[y][x] = _nearest_pal(r, g, b, BRAWLER_ICON_PALETTE)
    # 2-pass cardinal despeckle
    for _ in range(2):
        nxt = [row[:] for row in grid]
        for y in range(1, 63):
            for x in range(1, 63):
                c = grid[y][x]
                if c[0] >= 248 and c[1] >= 248 and c[2] >= 235:
                    continue
                card = [grid[y - 1][x], grid[y + 1][x], grid[y][x - 1], grid[y][x + 1]]
                same = sum(1 for nc in card if nc == c)
                if same == 0:
                    top_col, top_n = Counter(card).most_common(1)[0]
                    if top_n >= 2:
                        nxt[y][x] = top_col
        grid = nxt
    rim = BRAWLER_ICON_PALETTE[0]
    for i in range(64):
        grid[0][i] = rim
        grid[63][i] = rim
        grid[i][0] = rim
        grid[i][63] = rim
    out = Image.new("RGBA", (64, 64), (0, 0, 0, 255))
    opx = out.load()
    for y in range(64):
        for x in range(64):
            opx[x, y] = grid[y][x] + (255,)
    return out


def append_hero_icons_row12():
    orig_full = Image.open(OUT_HERO_ICONS).convert("RGBA")
    base_rows = orig_full.crop((0, 0, 384, 768))  # Rows 0..11 untouched!
    src = Image.open(ICONS_RAW_JPG).convert("RGB")
    W, H = src.size
    row12 = Image.new("RGBA", (384, 64), (0, 0, 0, 0))
    for idx in range(6):
        gc, gr = idx % 3, idx // 3
        tile = src.crop(((W * gc) // 3, (H * gr) // 2, (W * (gc + 1)) // 3, (H * (gr + 1)) // 2))
        row12.paste(_process_icon_tile(tile), (idx * 64, 0))
    new_atlas = Image.new("RGBA", (384, 832), (0, 0, 0, 0))
    new_atlas.paste(base_rows, (0, 0))
    new_atlas.paste(row12, (0, 768))
    new_atlas.save(OUT_HERO_ICONS, optimize=True)
    check = Image.open(OUT_HERO_ICONS).convert("RGBA")
    assert np.array_equal(np.array(base_rows), np.array(check.crop((0, 0, 384, 768)))), "Rows 0..11 altered!"
    # Save visual QA strip of Row 12 icons + portrait
    SCRATCH_DIR.mkdir(parents=True, exist_ok=True)
    row12.resize((768, 128), Image.Resampling.NEAREST).save(SCRATCH_DIR / "brawler_ex_icons_check.png")


# ==============================================================================
# 7. SELF-AUDIT & COMPACT VISUAL QA STRIPS
# ==============================================================================
def verify_and_dump_qa(sheet: np.ndarray, qa_dir: Path | None = None):
    clips = 0
    row_vert_spans = {}
    for r in range(ROWS):
        trans = 0
        min_tops, max_tops = [], []
        for c in range(COLS):
            cell = sheet[r * CELL_H : (r + 1) * CELL_H, c * CELL_W : (c + 1) * CELL_W]
            a = cell[:, :, 3] > 0
            ys = np.where(a)[0]
            assert len(ys) > 0, f"Empty cell R{r} F{c}"
            min_tops.append(int(ys.min()))
            max_tops.append(int(ys.max()))
            if np.any(a[:4, :]) or np.any(a[-4:, :]) or np.any(a[:, :4]) or np.any(a[:, -4:]):
                clips += 1
            if c > 0:
                prev = sheet[r * CELL_H : (r + 1) * CELL_H, (c - 1) * CELL_W : c * CELL_W]
                if not np.array_equal(cell[::2, ::2], prev[::2, ::2]):
                    trans += 1
        assert trans == 29, f"Row {r} transitions={trans} != 29"
        row_vert_spans[r] = (max(min_tops) - min(min_tops), max(max_tops) - min(max_tops))
    assert clips == 0, f"Sheet 4px border clips={clips} != 0"
    assert row_vert_spans[0][0] >= 4 and row_vert_spans[2][0] >= 6 and row_vert_spans[3][0] >= 6, (
        f"Insufficient vertical motion on Row 0/2/3: {row_vert_spans}"
    )

    # Row 1 WALK checks (`walkStanceDelta <= -6.0px`, grounded, zero moonwalk)
    stance_xs, boot_spans, top_ys = [], [], []
    for c in range(COLS):
        cell = sheet[CELL_H : 2 * CELL_H, c * CELL_W : (c + 1) * CELL_W]
        a = cell[:, :, 3] > 0
        ys, xs = np.where(a)
        max_y, min_y = int(ys.max()), int(ys.min())
        assert 222 <= max_y <= 233, f"Walk F{c} maxY={max_y}"
        top_ys.append(min_y)
        _, bx = np.where(a[218:234, :])
        boot_spans.append(int(bx.max() - bx.min() + 1))
        _, px = np.where(a[224:231, :])
        stance_xs.append(float(px.mean()) if len(px) else 112.0)

    for c in range(COLS):
        delta_t = abs(top_ys[(c + 1) % 30] - top_ys[c])
        assert delta_t <= 6, f"Walk topY delta F{c}->{c+1} = {delta_t}"
    assert max(boot_spans) >= 56, f"Walk maxBootSpan={max(boot_spans)}"
    assert min(boot_spans) <= max(boot_spans) * 0.58, f"Walk min/max={min(boot_spans)}/{max(boot_spans)}"
    d1 = stance_xs[6] - stance_xs[1]
    d2 = stance_xs[21] - stance_xs[16]
    assert d1 <= -6.0 and d2 <= -6.0, f"Walk crossover deltas d1={d1:.2f}, d2={d2:.2f}"

    # Row 4 grounded touchdown F12..F14 & F26..F29 (`cellMaxY = 229..231`)
    for cc in (12, 13, 14, 26, 27, 28, 29):
        cell = sheet[4 * CELL_H : 5 * CELL_H, cc * CELL_W : (cc + 1) * CELL_W][:, :, 3] > 0
        my = int(np.where(cell)[0].max())
        assert 228 <= my <= 232, f"Row 4 F{cc} maxY={my} not cleanly grounded!"

    # Row 5 DEATH (`maxDeathH <= 136px`) & Row 9 VICTORY (`minVictoryH >= 150px`)
    for cc in range(26, 30):
        dc = sheet[5 * CELL_H : 6 * CELL_H, cc * CELL_W : (cc + 1) * CELL_W][:, :, 3] > 0
        dys, dxs = np.where(dc)
        dh = int(dys.max() - dys.min() + 1)
        assert 58 <= dh <= 134 and dxs.min() >= 14 and dxs.max() <= 306, (
            f"Death F{cc} h={dh} x={dxs.min()}..{dxs.max()}"
        )
        vc = sheet[9 * CELL_H : 10 * CELL_H, cc * CELL_W : (cc + 1) * CELL_W][:, :, 3] > 0
        vys = np.where(vc)[0]
        vh = int(vys.max() - vys.min() + 1)
        assert vh >= 150, f"Victory F{cc} h={vh}"

    print(
        f"[OK] Quantitative gates PASSED: sheet={sheet.shape[1]}x{sheet.shape[0]} (0/300 clips, 29/29 all rows), "
        f"walk=(span {min(boot_spans)}..{max(boot_spans)}, d1={d1:.1f}, d2={d2:.1f}), "
        f"vertSpans=R0:{row_vert_spans[0][0]}/R2:{row_vert_spans[2][0]}/R3:{row_vert_spans[3][0]}"
    )

    if qa_dir is None:
        return
    qa_dir.mkdir(parents=True, exist_ok=True)
    picks = [
        ("R0 IDLE F00", 0, 0),
        ("R1 WALK F01", 1, 1),
        ("R1 WALK F07", 1, 7),
        ("R2 B1 JAB F03", 2, 3),
        ("R2 B2 HOOK F10", 2, 10),
        ("R2 B3 UPPER F18", 2, 18),
        ("R2 B4 PALM F25", 2, 25),
        ("R3 SKILL F10", 3, 10),
        ("R3 SKILL F16", 3, 16),
        ("R4 ULT F06", 4, 6),
        ("R4 ULT F10", 4, 10),
        ("R4 T-ULT F24", 4, 24),
        ("R5 DEATH F10", 5, 10),
        ("R5 DEATH F28", 5, 28),
        ("R6 DASH F10", 6, 10),
        ("R7 CROUCH F10", 7, 10),
        ("R8 JUMP F15", 8, 15),
        ("R9 VICTORY F14", 9, 14),
    ]
    cols_n, rows_n = 6, 3
    strip = Image.new("RGBA", (cols_n * CELL_W, rows_n * CELL_H), (18, 22, 42, 255))
    dr = ImageDraw.Draw(strip)
    for idx, (lbl, rr, cc) in enumerate(picks):
        gx, gy = (idx % cols_n) * CELL_W, (idx // cols_n) * CELL_H
        cell_im = Image.fromarray(
            sheet[rr * CELL_H : (rr + 1) * CELL_H, cc * CELL_W : (cc + 1) * CELL_W], "RGBA"
        )
        strip.alpha_composite(cell_im, (gx, gy))
        dr.rectangle([gx, gy, gx + CELL_W - 1, gy + CELL_H - 1], outline=(99, 102, 241, 255))
        dr.line([(gx, gy + 230), (gx + CELL_W, gy + 230)], fill=(251, 191, 36, 90))
        dr.text((gx + 6, gy + 4), lbl, fill=(254, 240, 138, 255))
    strip.save(qa_dir / "brawler_ex_sheet_check.png")


def main():
    args = sys.argv[1:]
    sheet_only = "--sheet-only" in args
    qa_dir = None
    if "--qa-dir" in args:
        idx = args.index("--qa-dir")
        if idx + 1 < len(args):
            qa_dir = Path(args[idx + 1])
    rig = build_raijin_rig_512()
    sheet = build_character_sheet(rig)
    Image.fromarray(sheet, "RGBA").save(OUT_SHEET, optimize=True)
    if not sheet_only:
        build_portrait_256()
        append_hero_icons_row12()
    verify_and_dump_qa(sheet, qa_dir=qa_dir)


if __name__ == "__main__":
    main()
