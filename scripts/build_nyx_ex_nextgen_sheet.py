#!/opt/homebrew/bin/python3.11
"""
Next-Gen Wide-Canvas Sprite Sheet, VFX Sheet, Portrait & Row 11 Icon Atlas Builder for:
  NYX EX -- Nebula AI Assistant Created by Cob (nyx_ex)

Outputs:
  - assets/sprites/nyx_ex_sheet.png     (9600x2400 RGBA PNG, 30x10 @ 320x240, anchor=(112, 230))
  - assets/sprites/nyx_ex_vfx.png       (6240x1664 RGBA PNG, 30x8  @ 208x208)
  - assets/sprites/nyx_ex_portrait.png  (128x128   RGBA PNG)
  - assets/sprites/hero_icons_sheet.png (384x768   RGBA PNG, preserves Rows 0..10 100% byte-identical, adds Row 11)
  - Compact QA strips in artifact scratch dir for visual inspection.
"""

from __future__ import annotations

import math
import os
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ex_sprite_clean_utils import (
    clean_512_pose_holes_and_specks,
    filter_mask_min_area,
    seal_160_char_pinholes_and_leaks,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
SPRITES_DIR = REPO_ROOT / "assets" / "sprites"
SCRATCH_DIR = Path(
    "/Users/rei/.gemini/antigravity/brain/239311b7-74c9-4bb0-b057-16821639c080/scratch"
)

BASE_JPG = SPRITES_DIR / "nyx_ex_base.jpg"
PORTRAIT_RAW_JPG = SPRITES_DIR / "nyx_ex_portrait_raw.jpg"

OUT_SHEET = SPRITES_DIR / "nyx_ex_sheet.png"
OUT_VFX = SPRITES_DIR / "nyx_ex_vfx.png"
OUT_PORTRAIT = SPRITES_DIR / "nyx_ex_portrait.png"
OUT_HERO_ICONS = SPRITES_DIR / "hero_icons_sheet.png"

LOG_W, LOG_H = 160, 120
CELL_W, CELL_H = 320, 240
COLS, ROWS = 30, 10
ANCHOR_X_160, ANCHOR_Y_160 = 56, 115  # -> (112, 230) in 320x240
MARGIN_160 = 2  # -> 4px safety border in 320x240

# Base sprite spans y=25..506 (481px) -> scale cleanly to 88 logical px (176px output)
HERO_H_512 = 480.0
TARGET_HERO_H_160 = 88.0
S_HI = HERO_H_512 / TARGET_HERO_H_160  # 5.4545 px per logical px
HI_W = int(round(LOG_W * S_HI))        # 873
HI_H = int(round(LOG_H * S_HI))        # 655
ANCHOR_HI_X = ANCHOR_X_160 * S_HI
ANCHOR_HI_Y = ANCHOR_Y_160 * S_HI

VFX_LOG = 104
VFX_CELL = 208
VFX_ROWS = 8
VFX_COLS = 30

# ==============================================================================
# NYX MASTER PALETTE & COSMIC COLORS
# ==============================================================================
C_OUT_DARK = (14, 10, 26, 255)
C_OUT_HAIR = (58, 34, 88, 255)
C_HAIR_SHAD = (139, 98, 168, 255)
C_HAIR_MID = (196, 154, 224, 255)
C_HAIR_LIGHT = (223, 198, 240, 255)
C_HAIR_WHITE = (248, 240, 255, 255)

C_SKIN_OUT = (64, 34, 62, 255)
C_SKIN_SHAD = (198, 134, 124, 255)
C_SKIN_MID = (240, 193, 187, 255)
C_SKIN_LIGHT = (255, 219, 206, 255)

C_NAVY_DARK = (15, 16, 41, 255)       # #0f1029
C_NAVY_MID = (28, 30, 72, 255)
C_HOODIE_BLUE = (40, 58, 104, 255)
C_CYAN = (34, 211, 238, 255)          # #22d3ee
C_CYAN_LIGHT = (165, 243, 252, 255)   # #a5f3fc
C_MAGENTA = (217, 70, 239, 255)       # #d946ef
C_PINK = (244, 114, 182, 255)         # #f472b6
C_VIOLET = (168, 85, 247, 255)        # #a855f7
C_LILAC = (192, 132, 252, 255)        # #c084fc
C_GOLD = (253, 224, 71, 255)          # #fde047
C_AMBER = (245, 158, 11, 255)         # #f59e0b
C_WHITE = (255, 255, 255, 255)
C_BLACK = (8, 8, 16, 255)
C_CUFF_DARK = (24, 20, 48, 255)
C_CUFF_RIB = (54, 48, 94, 255)
C_STOCKING = (54, 40, 58, 255)
C_BOOT_DARK = (18, 16, 28, 255)
C_BOOT_MID = (42, 38, 56, 255)

MASTER_PALETTE_NYX = np.array(
    [
        [14, 10, 26],     # 0: Deep cosmic ink Selout
        [58, 34, 88],     # 1: Lilac hair outline
        [139, 98, 168],   # 2: Hair shadow
        [196, 154, 224],  # 3: Hair mid
        [223, 198, 240],  # 4: Hair highlight
        [248, 240, 255],  # 5: Ear fluff / tail white tip
        [198, 134, 124],  # 6: Skin shadow
        [240, 193, 187],  # 7: Skin mid
        [255, 219, 206],  # 8: Skin light
        [232, 118, 42],   # 9: Cheek whisker orange
        [15, 16, 41],     # 10: Deep space hoodie navy
        [28, 30, 72],     # 11: Mid space navy
        [46, 54, 104],    # 12: Cuff / nebula blue
        [124, 58, 237],   # 13: Vivid violet
        [168, 85, 247],   # 14: Amethyst glow
        [192, 132, 252],  # 15: Lilac glow
        [217, 70, 239],   # 16: Cosmic magenta
        [244, 114, 182],  # 17: Nebula pink
        [14, 116, 144],   # 18: Deep cyber cyan
        [34, 211, 238],   # 19: Electric cyan
        [165, 243, 252],  # 20: Pale cyan starlight
        [255, 255, 255],  # 21: Pure white star
        [54, 40, 58],     # 22: Sheer stocking charcoal
        [36, 28, 42],     # 23: Stocking shadow / garter
        [18, 16, 28],     # 24: Shorts / boot dark
        [42, 38, 56],     # 25: Boot highlight
    ],
    dtype=np.int32,
)

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


# ==============================================================================
# 1. BASE EXTRACTION & 512x512 ANATOMICAL PART RIG
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
    q = deque()
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

    # Enclosed white pockets between tail/sleeve/legs
    pocket_seeds = [
        (206, 326),
        (206, 344),
        (266, 360),
        (266, 420),
        (266, 480),
        (328, 286),
        (216, 294),
    ]
    for sx, sy in pocket_seeds:
        for oy in range(-3, 4):
            for ox in range(-3, 4):
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

    # 3-pass anti-halo edge strip
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
            & (r0 > 188)
            & (g0 > 188)
            & (b0 > 188)
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


def darken_part(
    part: tuple[Image.Image, int, int], factor: float = 0.84
) -> tuple[Image.Image, int, int]:
    im, x0, y0 = part
    arr = np.array(im, dtype=np.float32)
    a = arr[:, :, 3] > 128
    arr[a, :3] = np.clip(arr[a, :3] * factor, 0, 255)
    return (Image.fromarray(arr.astype(np.uint8), "RGBA"), x0, y0)


def build_nyx_rig_512() -> dict:
    stand = extract_clean_base_512()
    alpha = stand[:, :, 3] > 128
    H, W = alpha.shape

    # Separate clean 512x512 anatomical components with neutralized hanging sleeves/hands
    head_m = keep_largest_component(
        alpha & poly_mask(H, W, [(208, 20), (344, 20), (344, 152), (314, 158), (242, 158), (208, 140)])
    )
    tail_m = keep_largest_component(
        alpha
        & poly_mask(
            H,
            W,
            [
                (118, 178),
                (186, 178),
                (192, 274),
                (238, 286),
                (236, 336),
                (204, 376),
                (118, 376),
            ],
        )
    )
    # Strip hanging arms/hands from torso so 2-bone IK galaxy sleeves replace them cleanly
    arm_strip_l = poly_mask(H, W, [(164, 180), (222, 182), (218, 308), (164, 308)])
    arm_strip_r = poly_mask(H, W, [(318, 182), (376, 182), (376, 306), (322, 306)])
    torso_base_m = (
        alpha
        & poly_mask(
            H,
            W,
            [
                (212, 134),
                (322, 134),
                (334, 294),
                (322, 308),
                (224, 308),
                (210, 294),
            ],
        )
        & (~arm_strip_l)
        & (~arm_strip_r)
        & (~head_m)
    )
    # Extend turtleneck/chest slightly upward under chin so head rotation never reveals gaps
    torso_arr = stand.copy()
    torso_keep = keep_largest_component(torso_base_m)
    torso_arr[~torso_keep] = [0, 0, 0, 0]
    for yy in range(132, 156):
        for xx in range(252, 296):
            if torso_arr[yy, xx, 3] < 128 and stand[yy + 18, xx, 3] > 128:
                torso_arr[yy, xx] = [18, 16, 28, 255]

    # Extend tail root slightly rightwards so tail pivots smoothly behind hoodie hem
    tail_arr = stand.copy()
    tail_arr[~tail_m] = [0, 0, 0, 0]
    for xx in range(220, 256):
        for yy in range(292, 334):
            if tail_arr[yy, xx, 3] < 128 and 300 <= yy <= 326:
                if yy <= 303 or yy >= 323:
                    tail_arr[yy, xx] = [58, 34, 88, 255]
                else:
                    tail_arr[yy, xx] = [196, 154, 224, 255]

    # Back leg (left on screen: x=212..262) & Front leg (right on screen: x=276..348)
    l_thigh_m = keep_largest_component(
        alpha & poly_mask(H, W, [(222, 296), (266, 296), (262, 392), (216, 392)])
    )
    l_shin_m = keep_largest_component(
        alpha & poly_mask(H, W, [(216, 382), (260, 382), (256, 462), (214, 462)])
    )
    l_boot_m = keep_largest_component(
        alpha & poly_mask(H, W, [(210, 452), (262, 452), (262, 510), (210, 510)])
    )

    r_thigh_m = keep_largest_component(
        alpha & poly_mask(H, W, [(274, 296), (326, 296), (324, 392), (274, 392)])
    )
    r_shin_m = keep_largest_component(
        alpha & poly_mask(H, W, [(278, 382), (324, 382), (324, 458), (278, 458)])
    )
    r_boot_m = keep_largest_component(
        alpha & poly_mask(H, W, [(280, 448), (348, 448), (348, 502), (280, 502)])
    )

    # Sample galaxy patch (for 2-bone IK galaxy hoodie sleeves!)
    galaxy_swatch = stand[174:266, 228:316].copy()

    return {
        "stand": stand,
        "head": crop_part(stand, head_m),
        "torso": crop_part(torso_arr, torso_arr[:, :, 3] > 128),
        "tail": crop_part(tail_arr, tail_arr[:, :, 3] > 128),
        "l_thigh": crop_part(stand, l_thigh_m),
        "l_shin": crop_part(stand, l_shin_m),
        "l_boot": crop_part(stand, l_boot_m),
        "r_thigh": crop_part(stand, r_thigh_m),
        "r_shin": crop_part(stand, r_shin_m),
        "r_boot": crop_part(stand, r_boot_m),
        "galaxy_swatch": galaxy_swatch,
        "joints": {
            "pelvis": (268.0, 296.0),
            "neck": (272.0, 146.0),
            "tail_root": (244.0, 310.0),
            "l_sh": (222.0, 168.0),
            "r_sh": (310.0, 168.0),
            "l_hip": (244.0, 304.0),
            "l_knee": (236.0, 386.0),
            "l_ank": (234.0, 456.0),
            "r_hip": (294.0, 304.0),
            "r_knee": (296.0, 386.0),
            "r_ank": (302.0, 452.0),
            "ground_y": 502.0,
        },
    }


def paste_rotated_part(
    canvas: Image.Image,
    part: tuple[Image.Image, int, int],
    pivot_part_space: tuple[float, float],
    dest_xy: tuple[float, float],
    angle_deg: float,
    scale: float = 1.0,
):
    im, x0, y0 = part
    pw, ph = im.size
    px_local = pivot_part_space[0] - x0
    py_local = pivot_part_space[1] - y0

    if abs(scale - 1.0) > 1e-3:
        nw = max(2, int(round(pw * scale)))
        nh = max(2, int(round(ph * scale)))
        im = im.resize((nw, nh), Image.Resampling.NEAREST)
        px_local *= scale
        py_local *= scale
        pw, ph = nw, nh

    if abs(angle_deg) < 0.15:
        dx = int(round(dest_xy[0] - px_local))
        dy = int(round(dest_xy[1] - py_local))
        canvas.alpha_composite(im, (dx, dy))
        return

    # Rotate around center, then compute exact offset of pivot_part_space
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
    ex = sx + l1 * math.cos(base_ang + bend_dir * a)
    ey = sy + l1 * math.sin(base_ang + bend_dir * a)
    return (ex, ey, tx, ty)


# ==============================================================================
# 2. LOGICAL 160x120 PIXEL HELPERS (GALAXY SLEEVES, SCULPTED HANDS, NEKO ORB)
# ==============================================================================
def put_px(arr: np.ndarray, x: int, y: int, col: tuple[int, int, int, int]):
    h, w, _ = arr.shape
    if MARGIN_160 <= x < w - MARGIN_160 and MARGIN_160 <= y < h - MARGIN_160:
        arr[y, x] = col


def draw_disc_160(arr: np.ndarray, cx: float, cy: float, r: float, col: tuple[int, int, int, int]):
    h, w, _ = arr.shape
    ir = int(math.ceil(r))
    icx, icy = int(round(cx)), int(round(cy))
    r2 = r * r + 0.15
    for dy in range(-ir, ir + 1):
        for dx in range(-ir, ir + 1):
            if dx * dx + dy * dy <= r2:
                px, py = icx + dx, icy + dy
                if MARGIN_160 <= px < w - MARGIN_160 and MARGIN_160 <= py < h - MARGIN_160:
                    arr[py, px] = col


def draw_capsule_160(
    arr: np.ndarray,
    x0: float,
    y0: float,
    x1: float,
    y1: float,
    r: float,
    col_fn,
):
    steps = max(4, int(math.ceil(math.hypot(x1 - x0, y1 - y0) * 2.2)))
    for s in range(steps + 1):
        u = s / steps
        px = lerp(x0, x1, u)
        py = lerp(y0, y1, u)
        draw_disc_160(arr, px, py, r, col_fn(px, py, u))


def draw_galaxy_sleeve_arm_160(
    arr: np.ndarray,
    sh: tuple[float, float],
    el: tuple[float, float],
    wr: tuple[float, float],
    phase: int = 0,
    paw_tuck: bool = False,
):
    """Draws baggy cosmic galaxy hoodie sleeve + ribbed cuff in crisp 160x120 logical pixels."""
    def galaxy_color(px: float, py: float, u: float) -> tuple[int, int, int, int]:
        ix, iy = int(round(px)), int(round(py))
        h_val = ((ix * 73 + iy * 139 + phase * 7) & 31)
        if h_val == 3 or h_val == 19:
            return C_WHITE
        if h_val in (5, 6, 17):
            return C_CYAN
        if h_val in (9, 10, 23):
            return C_MAGENTA
        if h_val in (12, 27):
            return C_VIOLET
        return C_NAVY_MID if (ix + iy) % 3 == 0 else C_NAVY_DARK

    # Dark outer outline pass first
    draw_capsule_160(arr, sh[0], sh[1], el[0], el[1], 3.1, lambda *_: C_OUT_DARK)
    draw_capsule_160(arr, el[0], el[1], wr[0], wr[1], 3.3, lambda *_: C_OUT_DARK)
    # Cosmic galaxy sleeve fill
    draw_capsule_160(arr, sh[0], sh[1], el[0], el[1], 2.15, galaxy_color)
    draw_capsule_160(arr, el[0], el[1], wr[0], wr[1], 2.35, galaxy_color)

    # Ribbed cuff near wrist
    dx, dy = wr[0] - el[0], wr[1] - el[1]
    ln = max(1e-4, math.hypot(dx, dy))
    ux, uy = dx / ln, dy / ln
    nx, ny = -uy, ux
    cuff_cx = wr[0] - ux * (0.4 if paw_tuck else 1.2)
    cuff_cy = wr[1] - uy * (0.4 if paw_tuck else 1.2)
    for k in range(-2, 3):
        cx = int(round(cuff_cx + nx * k))
        cy = int(round(cuff_cy + ny * k))
        put_px(arr, cx, cy, C_CUFF_RIB if k % 2 == 0 else C_CUFF_DARK)
        if paw_tuck:
            put_px(arr, int(round(cx + ux)), int(round(cy + uy)), C_CUFF_DARK)


def draw_sculpted_nyx_hand_160(
    arr: np.ndarray,
    wrist: tuple[float, float],
    elbow: tuple[float, float],
    pose: str = "finger_tap",
):
    """
    Pixel-by-pixel sculpted 3-finger + thumb hand (0 circle/disc/3x3 blobs!).
    Poses: 'finger_tap', 'open_swipe', 'paw_boop', 'enter_press', 'relaxed'
    """
    dx = wrist[0] - elbow[0]
    dy = wrist[1] - elbow[1]
    ln = max(1e-4, math.hypot(dx, dy))
    ux, uy = dx / ln, dy / ln
    nx, ny = -uy, ux

    wx, wy = int(round(wrist[0])), int(round(wrist[1]))
    if pose == "paw_boop":
        # Cute Pose-B oversized sleeve-paw fold with tiny peeking pink fingers
        px = int(round(wx + ux * 1.5))
        py = int(round(wy + uy * 1.5))
        put_px(arr, px, py, C_SKIN_MID)
        put_px(arr, px + 1, py, C_SKIN_LIGHT)
        put_px(arr, px, py + 1, C_SKIN_SHAD)
        return

    # Sculpt palm + thumb + articulated fingers oriented along (ux, uy)
    palm_pts = [
        (0, 0),
        (ux * 1.2, uy * 1.2),
        (ux * 1.2 + nx * 1.0, uy * 1.2 + ny * 1.0),
        (ux * 1.2 - nx * 1.0, uy * 1.2 - ny * 1.0),
    ]
    for ox, oy in palm_pts:
        px, py = int(round(wx + ox)), int(round(wy + oy))
        put_px(arr, px, py, C_SKIN_MID)

    # Thumb
    tx, ty = int(round(wx + ux * 1.3 - nx * 1.7)), int(round(wy + uy * 1.3 - ny * 1.7))
    put_px(arr, tx, ty, C_SKIN_LIGHT)
    put_px(arr, int(round(tx - ux * 0.4 - nx * 0.4)), int(round(ty - uy * 0.4 - ny * 0.4)), C_SKIN_OUT)

    if pose == "finger_tap":
        # Extended index finger pointing forward, middle/ring fingers curled
        for step in (2.1, 3.1, 4.0):
            fx = int(round(wx + ux * step - nx * 0.5))
            fy = int(round(wy + uy * step - ny * 0.5))
            put_px(arr, fx, fy, C_SKIN_LIGHT if step >= 3.0 else C_SKIN_MID)
        put_px(arr, int(round(wx + ux * 2.2 + nx * 0.8)), int(round(wy + uy * 2.2 + ny * 0.8)), C_SKIN_SHAD)
        put_px(arr, int(round(wx + ux * 2.1 + nx * 1.5)), int(round(wy + uy * 2.1 + ny * 1.5)), C_SKIN_SHAD)
    elif pose == "enter_press":
        # Extended palm/knuckles pressing downward onto floating [ENTER] key
        for f_off in (-0.8, 0.2, 1.2):
            for step in (2.0, 3.0):
                fx = int(round(wx + ux * step + nx * f_off))
                fy = int(round(wy + uy * step + ny * f_off))
                put_px(arr, fx, fy, C_SKIN_LIGHT if step > 2.4 else C_SKIN_MID)
    else:
        # 'open_swipe' / 'relaxed': 3 splayed fingers
        for f_off, reach in ((-0.9, 3.2), (0.1, 3.6), (1.1, 2.8)):
            for step in (2.0, reach):
                fx = int(round(wx + ux * step + nx * f_off))
                fy = int(round(wy + uy * step + ny * f_off))
                put_px(arr, fx, fy, C_SKIN_LIGHT if step > 2.4 else C_SKIN_MID)


def draw_neko_ai_orb_160(
    arr: np.ndarray,
    cx: float,
    cy: float,
    phase: int = 0,
    eye_mode: str = "happy",
    scale: float = 1.0,
):
    """Draws Nyx's floating pixel Cosmic Neko-AI Orb companion cleanly (max x well <= 95 -> 190 in 320px)."""
    ox, oy = int(round(cx)), int(round(cy))
    r = max(4, int(round(4.6 * scale)))
    # Pixel cat ears on orb
    for side in (-1, 1):
        ex = ox + side * (r - 1)
        ey = oy - r - 1
        put_px(arr, ex, ey - 1, C_CYAN)
        put_px(arr, ex, ey, C_MAGENTA)
        put_px(arr, ex - side, ey, C_OUT_DARK)
        put_px(arr, ex + side, ey, C_OUT_DARK)
    # Dark outer rim + glowing cyan ring + deep core
    draw_disc_160(arr, ox, oy, r + 0.8, C_OUT_DARK)
    draw_disc_160(arr, ox, oy, r - 0.1, C_CYAN if phase % 2 == 0 else C_MAGENTA)
    draw_disc_160(arr, ox, oy, r - 1.3, C_NAVY_DARK)
    # Glowing eye / status LED inside orb
    if eye_mode == "laser":
        put_px(arr, ox, oy, C_WHITE)
        put_px(arr, ox + 1, oy, C_CYAN_LIGHT)
        put_px(arr, ox - 1, oy, C_MAGENTA)
    elif eye_mode == "sleep":
        put_px(arr, ox - 1, oy, C_LILAC)
        put_px(arr, ox, oy, C_LILAC)
        put_px(arr, ox + 1, oy, C_LILAC)
    else:
        put_px(arr, ox, oy, C_WHITE)
        put_px(arr, ox - 1, oy - 1, C_CYAN_LIGHT)
        put_px(arr, ox + 1, oy + 1, C_MAGENTA)


def draw_mini_holo_prompt_160(
    arr: np.ndarray, cx: int, cy: int, kind: str = "panel", phase: int = 0
):
    """Small close-to-hand holographic prompt panel / [ENTER] key strictly x <= 116 (232 in 320px)."""
    cx = min(cx, 114)
    if kind == "enter":
        # Glowing cyan/magenta [ENTER] keycap near her finger
        for y in range(cy - 3, cy + 4):
            for x in range(cx - 5, cx + 6):
                on_edge = y in (cy - 3, cy + 3) or x in (cx - 5, cx + 5)
                put_px(arr, x, y, C_CYAN if on_edge else C_NAVY_DARK)
        for x in range(cx - 3, cx + 4):
            put_px(arr, x, cy, C_WHITE if x % 2 == 0 else C_GOLD)
    elif kind == "panel":
        for y in range(cy - 5, cy + 5):
            for x in range(cx - 4, cx + 5):
                on_edge = y in (cy - 5, cy + 4) or x in (cx - 4, cx + 4)
                put_px(arr, x, y, C_MAGENTA if on_edge else C_NAVY_MID)
        put_px(arr, cx - 2, cy - 2, C_CYAN_LIGHT)
        put_px(arr, cx, cy - 2, C_CYAN_LIGHT)
        put_px(arr, cx + 2, cy, C_WHITE)
        put_px(arr, cx - 1, cy + 2, C_PINK)


def render_pose_512_to_160(
    rig: dict,
    *,
    dx_160: float = 0.0,
    dy_160: float = 0.0,
    torso_deg: float = 0.0,
    head_deg: float = 0.0,
    tail_deg: float = 0.0,
    l_thigh_deg: float = 0.0,
    l_shin_deg: float = 0.0,
    l_boot_deg: float = 0.0,
    r_thigh_deg: float = 0.0,
    r_shin_deg: float = 0.0,
    r_boot_deg: float = 0.0,
    l_hand_160: tuple[float, float] | None = None,
    r_hand_160: tuple[float, float] | None = None,
    l_pose: str = "relaxed",
    r_pose: str = "open_swipe",
    paw_tuck: bool = False,
    orb_offset_160: tuple[float, float] = (-21.0, -56.0),
    orb_eye: str = "happy",
    mini_prompt: tuple[str, int, int] | None = None,
    crouch_drop_512: float = 0.0,
    prone_deg: float | None = None,
    phase: int = 0,
    lock_ground: bool = True,
) -> np.ndarray:
    """Assembles articulated 512x512 pose, downsamples cleanly to 160x120, adds IK galaxy sleeves/hands/orb."""
    j = rig["joints"]
    hi = Image.new("RGBA", (HI_W, HI_H), (0, 0, 0, 0))

    # Map rig anchor (268, 502) -> (ANCHOR_HI_X + dx, ANCHOR_HI_Y + dy)
    ax = ANCHOR_HI_X + dx_160 * S_HI
    ay = ANCHOR_HI_Y + dy_160 * S_HI
    pelvis_dest = (ax, ay - (j["ground_y"] - j["pelvis"][1] - crouch_drop_512) * S_HI / S_HI)

    pelvis_x = ax
    pelvis_y = ay - (j["ground_y"] - j["pelvis"][1] - crouch_drop_512)

    # Rotate torso offset around pelvis
    rad_t = math.radians(torso_deg)
    def rot_torso(pt: tuple[float, float]) -> tuple[float, float]:
        vx = pt[0] - j["pelvis"][0]
        vy = pt[1] - j["pelvis"][1]
        return (
            pelvis_x + vx * math.cos(rad_t) - vy * math.sin(rad_t),
            pelvis_y + vx * math.sin(rad_t) + vy * math.cos(rad_t),
        )

    def place_leg(side: str, th_deg: float, sh_deg: float, bt_deg: float):
        hip_r = j[f"{side}_hip"]
        kn_r = j[f"{side}_knee"]
        an_r = j[f"{side}_ank"]
        hip_d = rot_torso(hip_r)
        rt = math.radians(th_deg)
        rs = math.radians(sh_deg)
        v_hk = (kn_r[0] - hip_r[0], kn_r[1] - hip_r[1])
        kn_d = (
            hip_d[0] + v_hk[0] * math.cos(rt) - v_hk[1] * math.sin(rt),
            hip_d[1] + v_hk[0] * math.sin(rt) + v_hk[1] * math.cos(rt),
        )
        v_ka = (an_r[0] - kn_r[0], an_r[1] - kn_r[1])
        an_d = (
            kn_d[0] + v_ka[0] * math.cos(rs) - v_ka[1] * math.sin(rs),
            kn_d[1] + v_ka[0] * math.sin(rs) + v_ka[1] * math.cos(rs),
        )
        # Keep stocking joint seamless at knee
        paste_rotated_part(hi, rig[f"{side}_thigh"], hip_r, hip_d, th_deg)
        paste_rotated_part(hi, rig[f"{side}_shin"], kn_r, kn_d, sh_deg)
        paste_rotated_part(hi, rig[f"{side}_boot"], an_r, an_d, bt_deg)
        return an_d

    # 1. Tail behind torso
    tail_d = rot_torso(j["tail_root"])
    paste_rotated_part(hi, rig["tail"], j["tail_root"], tail_d, tail_deg)

    # 2. Back leg, then Front leg
    l_an = place_leg("l", l_thigh_deg, l_shin_deg, l_boot_deg)
    r_an = place_leg("r", r_thigh_deg, r_shin_deg, r_boot_deg)

    # 3. Torso + Head
    paste_rotated_part(hi, rig["torso"], j["pelvis"], (pelvis_x, pelvis_y), torso_deg)
    neck_d = rot_torso(j["neck"])
    paste_rotated_part(hi, rig["head"], j["neck"], neck_d, head_deg)

    # Optionally normalize foot landing cleanly to ANCHOR_HI_Y
    if lock_ground and prone_deg is None:
        arr_hi = np.array(hi)
        ys_hi = np.where(arr_hi[:, :, 3] > 128)[0]
        if len(ys_hi) > 0:
            shift_y = int(round(ANCHOR_HI_Y - float(ys_hi.max())))
            if abs(shift_y) > 0:
                hi_shift = Image.new("RGBA", (HI_W, HI_H), (0, 0, 0, 0))
                hi_shift.alpha_composite(hi, (0, shift_y))
                hi = hi_shift
                pelvis_y += shift_y

    if prone_deg is not None:
        # Rotate whole standing/kneeling figure into flat horizontal prone corpse on floor
        rot_hi = hi.rotate(-prone_deg, resample=Image.Resampling.NEAREST, expand=True)
        rw, rh = rot_hi.size
        r_arr = np.array(rot_hi)
        ry, rx = np.where(r_arr[:, :, 3] > 128)
        hi_flat = Image.new("RGBA", (HI_W, HI_H), (0, 0, 0, 0))
        if len(ry) > 0:
            cx_body = (rx.min() + rx.max()) * 0.5
            bot_body = ry.max()
            # Keep prone body centered around x=ANCHOR_HI_X and touching ANCHOR_HI_Y
            ox = int(round(ANCHOR_HI_X - cx_body + 10.0))
            oy = int(round(ANCHOR_HI_Y - bot_body - 2.0))
            hi_flat.alpha_composite(rot_hi, (ox, oy))
        hi = hi_flat

    # Downsample 512-space -> 160x120 crisp nearest-neighbor with anti-pinhole filter
    a_box = np.array(hi.getchannel("A").resize((LOG_W, LOG_H), Image.Resampling.BOX))
    solid = a_box >= 86
    near = np.array(hi.resize((LOG_W, LOG_H), Image.Resampling.NEAREST))
    out160 = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)
    direct = solid & (near[:, :, 3] >= 128)
    out160[direct, :3] = near[direct, :3]
    out160[direct, 3] = 255
    need = solid & (~direct)
    if np.any(need):
        src = np.array(hi)
        for _ in range(3):
            sa = src[:, :, 3] >= 128
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                sh = np.roll(src, shift=(dy, dx), axis=(0, 1))
                take = (~sa) & (sh[:, :, 3] >= 128)
                src[take] = sh[take]
        dil = np.array(Image.fromarray(src, "RGBA").resize((LOG_W, LOG_H), Image.Resampling.NEAREST))
        out160[need, :3] = dil[need, :3]
        out160[need, 3] = 255

    # Skip arm/orb overlay on prone corpse frames (just add powered-down orb beside head)
    if prone_deg is not None:
        ys_p, xs_p = np.where(out160[:, :, 3] >= 128)
        if len(xs_p) > 0:
            orb_x = int(clamp(float(xs_p.min()) + 10.0, 14.0, 140.0))
            orb_y = int(clamp(float(ys_p.max()) - 5.0, 20.0, 109.0))
            draw_neko_ai_orb_160(out160, orb_x, orb_y, phase=phase, eye_mode="sleep", scale=0.88)
        out160[:MARGIN_160, :] = 0
        out160[LOG_H - MARGIN_160 :, :] = 0
        out160[:, :MARGIN_160] = 0
        out160[:, LOG_W - MARGIN_160 :] = 0
        return seal_160_char_pinholes_and_leaks(
            out160,
            max_pinhole_lpx=6,
            min_detached_lpx=4,
            max_orphan_lpx=18,
            bridge_max_lpx=64,
            bridge_gap_lpx=3.0,
            safe_border_lpx=MARGIN_160,
        )

    # 4. Articulated 2-Bone IK Cosmic Galaxy Sleeves + Sculpted Hands (Back arm -> Front arm)
    l_sh_hi = rot_torso(j["l_sh"])
    r_sh_hi = rot_torso(j["r_sh"])
    l_sh_160 = (l_sh_hi[0] / S_HI, l_sh_hi[1] / S_HI)
    r_sh_160 = (r_sh_hi[0] / S_HI, r_sh_hi[1] / S_HI)

    if l_hand_160 is None:
        l_hand_160 = (l_sh_160[0] - 5.0, l_sh_160[1] + 19.0)
    if r_hand_160 is None:
        r_hand_160 = (r_sh_160[0] + 6.5, r_sh_160[1] + 18.0)

    # Draw Back arm (`l`), then Front arm (`r`)
    lex, ley, lwx, lwy = solve_ik_2bone(
        l_sh_160[0], l_sh_160[1], l_hand_160[0], l_hand_160[1], 11.2, 10.6, bend_dir=-1
    )
    draw_galaxy_sleeve_arm_160(out160, l_sh_160, (lex, ley), (lwx, lwy), phase=phase, paw_tuck=paw_tuck)
    draw_sculpted_nyx_hand_160(out160, (lwx, lwy), (lex, ley), pose=l_pose)

    rex, rey, rwx, rwy = solve_ik_2bone(
        r_sh_160[0], r_sh_160[1], r_hand_160[0], r_hand_160[1], 11.2, 10.6, bend_dir=1
    )
    draw_galaxy_sleeve_arm_160(out160, r_sh_160, (rex, rey), (rwx, rwy), phase=phase + 3, paw_tuck=paw_tuck)
    draw_sculpted_nyx_hand_160(out160, (rwx, rwy), (rex, rey), pose=r_pose)

    # 5. Hovering Cosmic Neko-AI Orb near Nyx's shoulder (strictly x_160 <= 92 -> x_320 <= 184)
    cur_ax = ANCHOR_X_160 + dx_160
    cur_ay = ANCHOR_Y_160 + dy_160
    orb_x = clamp(cur_ax + orb_offset_160[0], 14.0, 92.0)
    orb_y = clamp(cur_ay + orb_offset_160[1], 14.0, 98.0)
    draw_neko_ai_orb_160(out160, orb_x, orb_y, phase=phase, eye_mode=orb_eye)

    # 6. Close-to-hand mini holo prompt / [ENTER] key (strictly x_160 <= 116 -> x_320 <= 232)
    if mini_prompt is not None:
        mp_kind, mx_off, my_off = mini_prompt
        draw_mini_holo_prompt_160(
            out160,
            int(clamp(rwx + mx_off, 24, 114)),
            int(clamp(rwy + my_off, 12, 108)),
            kind=mp_kind,
            phase=phase,
        )

    # Enforce strict 2 logical px (4px output) safe border
    out160[:MARGIN_160, :] = 0
    out160[LOG_H - MARGIN_160 :, :] = 0
    out160[:, :MARGIN_160] = 0
    out160[:, LOG_W - MARGIN_160 :] = 0

    # Keep floating Neko-AI Orb & mini close holo prompt preserved while sealing body pinholes
    preserve = np.zeros((LOG_H, LOG_W), dtype=bool)
    ox_i, oy_i = int(round(orb_x)), int(round(orb_y))
    preserve[max(0, oy_i - 10) : min(LOG_H, oy_i + 10), max(0, ox_i - 10) : min(LOG_W, ox_i + 10)] = True
    if mini_prompt is not None:
        mpx = int(clamp(rwx + mini_prompt[1], 24, 114))
        mpy = int(clamp(rwy + mini_prompt[2], 12, 108))
        preserve[max(0, mpy - 8) : min(LOG_H, mpy + 8), max(0, mpx - 8) : min(LOG_W, mpx + 8)] = True

    return seal_160_char_pinholes_and_leaks(
        out160,
        max_pinhole_lpx=6,
        min_detached_lpx=4,
        max_orphan_lpx=18,
        orphan_dist_lpx=5.0,
        bridge_max_lpx=52,
        bridge_gap_lpx=2.5,
        preserve_mask=preserve,
        safe_border_lpx=MARGIN_160,
    )


# ==============================================================================
# 3. 10-ROW x 30-COL CHOREOGRAPHY BUILDER
# ==============================================================================
def build_character_sheet(rig: dict) -> np.ndarray:
    sheet = np.zeros((ROWS * CELL_H, COLS * CELL_W, 4), dtype=np.uint8)

    def put_cell(row: int, col: int, frame_160: np.ndarray):
        # Guarantee every adjacent cell differs even if pose settles smoothly
        out = frame_160.copy()
        up2 = np.array(
            Image.fromarray(out, "RGBA").resize((CELL_W, CELL_H), Image.Resampling.NEAREST),
            dtype=np.uint8,
        )
        y0, x0 = row * CELL_H, col * CELL_W
        sheet[y0 : y0 + CELL_H, x0 : x0 + CELL_W] = up2

    # ROW 0: IDLE (F00..F29)
    for c in range(COLS):
        t = (c / COLS) * math.tau
        bob = 0.7 * math.sin(t)
        head_d = 1.6 * math.sin(t + 0.4)
        tail_d = 7.5 * math.sin(t)
        orb_y = -58.0 + 2.4 * math.sin(t + 0.8)
        f = render_pose_512_to_160(
            rig,
            dx_160=0.0,
            dy_160=bob,
            torso_deg=0.8 * math.sin(t),
            head_deg=head_d,
            tail_deg=tail_d,
            l_thigh_deg=-2.0,
            l_shin_deg=2.0,
            r_thigh_deg=3.0,
            r_shin_deg=-1.0,
            l_hand_160=(46.0, 74.0 + 0.8 * math.sin(t)),
            r_hand_160=(71.0, 72.0 - 0.8 * math.sin(t)),
            l_pose="relaxed",
            r_pose="open_swipe",
            orb_offset_160=(-21.0 + 1.0 * math.cos(t), orb_y),
            phase=c,
        )
        put_cell(0, c, f)

    # ROW 1: WALK (F00..F29) — Harmonic 30-frame bipedal +X forward crossover
    for c in range(COLS):
        phi = ((c - 1.0) / COLS) * math.tau
        c_p = math.cos(phi)
        s_p = math.sin(phi)
        # r_leg: front planted at c=1 (phi=0), crossover under torso at c=6 (phi=pi/3), trailing at c=16
        r_th = -26.0 * c_p + 16.0 * s_p + 2.0
        l_th = 26.0 * c_p - 16.0 * s_p - 4.0
        lift_bias = math.cos(phi - 0.45)
        l_sh = l_th + 13.5 + 11.5 * lift_bias
        r_sh = r_th + 13.5 - 11.5 * lift_bias

        bounce = -1.6 * abs(math.sin(((c % 15) / 15.0) * math.pi))
        arm_sw = 7.5 * c_p
        f = render_pose_512_to_160(
            rig,
            dx_160=0.0,
            dy_160=bounce,
            torso_deg=4.5,
            head_deg=2.0 + 1.5 * s_p,
            tail_deg=-8.0 + 6.5 * math.sin(phi * 2.0),
            l_thigh_deg=l_th,
            l_shin_deg=l_sh,
            l_boot_deg=clamp((l_sh - l_th) * 0.4, -8.0, 14.0),
            r_thigh_deg=r_th,
            r_shin_deg=r_sh,
            r_boot_deg=clamp((r_sh - r_th) * 0.4, -8.0, 14.0),
            l_hand_160=(46.0 + arm_sw, 73.0 + abs(arm_sw) * 0.15),
            r_hand_160=(70.0 - arm_sw, 72.0 + abs(arm_sw) * 0.15),
            l_pose="relaxed",
            r_pose="relaxed",
            orb_offset_160=(-21.0, -56.0 + bounce * 0.8),
            phase=c,
            lock_ground=True,
        )
        put_cell(1, c, f)

    # ROW 2: AUTO_ATTACK (4-Beat Holo-Prompt Quartet: [60,8], [68,7], [75,8], [83,7])
    # Pure ranged caster constraint: maxCellX <= 262 (x_160 <= 131), 0 detached >=16px at x >= 230!
    for c in range(COLS):
        if c < 8:
            # Beat 1 (F00..F07, snap F03): Quick finger-tap on close holo-prompt panel
            u = c / 7.0
            snap = smoothstep(min(1.0, c / 3.0)) * (1.0 - max(0.0, (c - 3.0) / 4.0) * 0.45)
            f = render_pose_512_to_160(
                rig,
                torso_deg=4.0 * snap,
                head_deg=2.0,
                tail_deg=8.0 * snap,
                l_thigh_deg=-4.0,
                r_thigh_deg=6.0,
                l_hand_160=(48.0, 68.0),
                r_hand_160=(74.0 + 9.0 * snap, 63.0 - 3.0 * snap),
                l_pose="relaxed",
                r_pose="finger_tap",
                orb_offset_160=(-17.0, -58.0 - 2.0 * snap),
                orb_eye="happy",
                mini_prompt=("panel", 4, -2) if 1 <= c <= 5 else None,
                phase=c,
            )
        elif c < 15:
            # Beat 2 (F08..F14, snap F09): Baggy galaxy-sleeve forward swipe flinging Holo-Window
            lc = c - 8
            snap = math.sin(min(1.0, lc / 2.0) * math.pi * 0.5) if lc <= 1 else max(0.0, 1.0 - (lc - 1) / 5.0)
            f = render_pose_512_to_160(
                rig,
                dx_160=2.5 * snap,
                torso_deg=7.5 * snap,
                head_deg=3.5 * snap,
                tail_deg=-10.0 * snap,
                l_thigh_deg=-8.0 * snap,
                r_thigh_deg=11.0 * snap,
                l_hand_160=(44.0, 67.0),
                r_hand_160=(76.0 + 11.0 * snap, 60.0 - 4.0 * snap),
                l_pose="relaxed",
                r_pose="open_swipe",
                orb_offset_160=(-15.0 + 2.0 * snap, -58.0),
                mini_prompt=("panel", 5, 0) if lc in (1, 2) else None,
                phase=c,
            )
        elif c < 23:
            # Beat 3 (F15..F22, snap F17): Cute Pose-B double sleeve-paw boop -> remote pop-up
            lc = c - 15
            hop = smoothstep(min(1.0, lc / 2.0)) * (1.0 - max(0.0, (lc - 3.0) / 4.0))
            f = render_pose_512_to_160(
                rig,
                dx_160=1.5 * hop,
                dy_160=-2.0 * hop,
                torso_deg=-4.5 * hop,
                head_deg=-5.0 * hop,
                tail_deg=16.0 * hop,
                l_thigh_deg=-10.0 * hop,
                l_shin_deg=18.0 * hop,
                r_thigh_deg=8.0 * hop,
                r_shin_deg=14.0 * hop,
                l_hand_160=(59.0 + 4.0 * hop, 64.0 - 4.0 * hop),
                r_hand_160=(69.0 + 5.0 * hop, 63.0 - 5.0 * hop),
                l_pose="paw_boop",
                r_pose="paw_boop",
                paw_tuck=True,
                orb_offset_160=(-18.0, -61.0 - 2.0 * hop),
                orb_eye="happy",
                phase=c,
            )
        else:
            # Beat 4 (F23..F29, snap F25): Backstep hop + hits glowing [ENTER] key -> Neko Orb Nebula Laser
            lc = c - 23
            snap = 1.0 if lc in (2, 3) else max(0.0, 1.0 - abs(lc - 2.5) / 3.5)
            f = render_pose_512_to_160(
                rig,
                dx_160=-3.0 * snap,
                torso_deg=5.0 * snap,
                head_deg=2.0,
                tail_deg=-12.0 * snap,
                l_thigh_deg=-10.0 * snap,
                r_thigh_deg=12.0 * snap,
                l_hand_160=(49.0, 68.0),
                r_hand_160=(74.0 + 7.0 * snap, 68.0 + 3.0 * snap),
                l_pose="relaxed",
                r_pose="enter_press",
                orb_offset_160=(-8.0 + 16.0 * snap, -58.0),
                orb_eye="laser" if lc in (2, 3, 4) else "happy",
                mini_prompt=("enter", 3, 4) if 1 <= lc <= 4 else None,
                phase=c,
            )
        put_cell(2, c, f)

    # ROW 3: SKILL (404 POP-UP CASCADE & COB CREATOR SEAL STAMP, F00..F29)
    # Keep maxX <= 262 (caster-only sheet!)
    for c in range(COLS):
        u = c / 29.0
        env = math.sin(u * math.pi)
        lift = -3.0 * smoothstep(min(1.0, c / 8.0)) * (1.0 - max(0.0, (c - 22.0) / 7.0))
        stamp = c >= 14 and c <= 24
        f = render_pose_512_to_160(
            rig,
            dx_160=2.0 * env,
            dy_160=lift,
            torso_deg=-4.0 if c < 12 else (6.5 if stamp else 1.5),
            head_deg=-3.0 if c < 12 else 2.5,
            tail_deg=14.0 * math.sin(u * math.tau),
            l_thigh_deg=-5.0 * env,
            r_thigh_deg=7.0 * env,
            l_hand_160=(48.0, 62.0 - 6.0 * env),
            r_hand_160=(76.0 + 8.0 * env, 56.0 + (8.0 if stamp else -4.0 * env)),
            l_pose="open_swipe",
            r_pose="enter_press" if stamp else "finger_tap",
            orb_offset_160=(-15.0 + 10.0 * env, -62.0),
            orb_eye="laser" if stamp else "happy",
            mini_prompt=("panel", 4, -1) if 4 <= c <= 12 else (("enter", 3, 4) if 15 <= c <= 22 else None),
            phase=c,
        )
        put_cell(3, c, f)

    # ROW 4: ULTIMATE (F00..F14: COB-OS STARLIGHT OVERCLOCK) & TRUE_ULTIMATE (F15..F29: GENESIS PROMPT: POWERED BY COB)
    # Critical invariants: F12..F14 & F26..F29 cleanly planted at botY=230..231 with wide A-stance!
    for c in range(COLS):
        if c < 15:
            # Overdrive F00..F14
            if c <= 10:
                lu = c / 10.0
                fl = -6.0 * math.sin(lu * math.pi)
                arm_raise = math.sin(lu * math.pi)
                f = render_pose_512_to_160(
                    rig,
                    dy_160=fl,
                    torso_deg=-5.0 * arm_raise,
                    head_deg=-4.0 * arm_raise,
                    tail_deg=18.0 * math.sin(lu * math.tau),
                    l_thigh_deg=-9.0 * arm_raise,
                    l_shin_deg=12.0 * arm_raise,
                    r_thigh_deg=9.0 * arm_raise,
                    r_shin_deg=10.0 * arm_raise,
                    l_hand_160=(43.0 - 4.0 * arm_raise, 56.0 - 8.0 * arm_raise),
                    r_hand_160=(75.0 + 5.0 * arm_raise, 55.0 - 8.0 * arm_raise),
                    l_pose="open_swipe",
                    r_pose="open_swipe",
                    orb_offset_160=(-17.0, -64.0 + fl),
                    orb_eye="laser",
                    phase=c,
                    lock_ground=False,
                )
            else:
                # F11..F14 grounded wide landing & settle
                lu = (c - 11) / 3.0
                f = render_pose_512_to_160(
                    rig,
                    torso_deg=3.0 * (1.0 - lu),
                    head_deg=1.5 * (1.0 - lu),
                    tail_deg=4.0 * (1.0 - lu),
                    l_thigh_deg=-10.0 + 4.0 * lu,
                    l_shin_deg=-6.0 + 3.0 * lu,
                    r_thigh_deg=11.0 - 4.0 * lu,
                    r_shin_deg=7.0 - 3.0 * lu,
                    l_hand_160=(46.0, 70.0 + 2.0 * lu),
                    r_hand_160=(72.0, 69.0 + 2.0 * lu),
                    l_pose="open_swipe",
                    r_pose="open_swipe",
                    orb_offset_160=(-20.0, -58.0),
                    orb_eye="happy",
                    phase=c,
                    lock_ground=True,
                )
        else:
            # TRUE_ULTIMATE F15..F29
            lc = c - 15
            if lc <= 9:
                # F15..F24 cosmic charge channel (floating slightly then firing at F25)
                cu = lc / 9.0
                fl = -5.5 * smoothstep(min(1.0, lc / 4.0))
                f = render_pose_512_to_160(
                    rig,
                    dy_160=fl,
                    torso_deg=-6.5 * cu,
                    head_deg=-4.5 * cu,
                    tail_deg=14.0 * math.sin(cu * math.tau),
                    l_thigh_deg=-8.0 * cu,
                    r_thigh_deg=10.0 * cu,
                    l_hand_160=(44.0, 58.0 - 8.0 * cu),
                    r_hand_160=(76.0 + 4.0 * cu, 56.0 - 6.0 * cu),
                    l_pose="open_swipe",
                    r_pose="finger_tap",
                    orb_offset_160=(-10.0 + 20.0 * cu, -62.0 + fl),
                    orb_eye="laser",
                    phase=c,
                    lock_ground=False,
                )
            elif lc == 10:
                # F25 full-extension Supernova Command!
                f = render_pose_512_to_160(
                    rig,
                    dy_160=-2.0,
                    torso_deg=8.0,
                    head_deg=3.0,
                    tail_deg=-16.0,
                    l_thigh_deg=-12.0,
                    r_thigh_deg=14.0,
                    l_hand_160=(44.0, 68.0),
                    r_hand_160=(82.0, 61.0),
                    l_pose="open_swipe",
                    r_pose="enter_press",
                    orb_offset_160=(16.0, -58.0),
                    orb_eye="laser",
                    phase=c,
                    lock_ground=True,
                )
            else:
                # F26..F29 clean grounded A-stance recovery
                ru = (lc - 11) / 3.0
                f = render_pose_512_to_160(
                    rig,
                    torso_deg=4.0 * (1.0 - ru),
                    head_deg=2.0 * (1.0 - ru),
                    tail_deg=5.0 * (1.0 - ru),
                    l_thigh_deg=-12.0 + 4.0 * ru,
                    l_shin_deg=-8.0 + 3.0 * ru,
                    r_thigh_deg=13.0 - 4.0 * ru,
                    r_shin_deg=8.0 - 3.0 * ru,
                    l_hand_160=(46.0, 71.0 + 2.0 * ru),
                    r_hand_160=(73.0, 69.0 + 3.0 * ru),
                    l_pose="relaxed",
                    r_pose="open_swipe",
                    orb_offset_160=(-20.0, -58.0),
                    orb_eye="happy",
                    phase=c,
                    lock_ground=True,
                )
        put_cell(4, c, f)

    # ROW 5: HURT & DEATH (F00..F06 hurt recoil, F07..F17 drop onto knees, F18..F29 flat prone floor collapse!)
    for c in range(COLS):
        if c < 7:
            ru = c / 6.0
            f = render_pose_512_to_160(
                rig,
                dx_160=-2.5 * math.sin(ru * math.pi),
                torso_deg=-12.0 * math.sin(ru * math.pi),
                head_deg=-10.0 * math.sin(ru * math.pi),
                tail_deg=-16.0,
                l_thigh_deg=-6.0,
                r_thigh_deg=10.0,
                l_hand_160=(44.0, 67.0),
                r_hand_160=(69.0, 66.0),
                l_pose="open_swipe",
                r_pose="open_swipe",
                orb_offset_160=(-22.0, -55.0),
                orb_eye="sleep",
                phase=c,
            )
        elif c < 18:
            ku = (c - 7) / 10.0
            drop = 110.0 * ku
            f = render_pose_512_to_160(
                rig,
                dx_160=-2.0 * ku,
                torso_deg=-14.0 - 20.0 * ku,
                head_deg=-12.0 - 15.0 * ku,
                tail_deg=-20.0,
                l_thigh_deg=-26.0 * ku,
                l_shin_deg=56.0 * ku,
                r_thigh_deg=-18.0 * ku,
                r_shin_deg=60.0 * ku,
                crouch_drop_512=drop,
                l_hand_160=(46.0, 76.0 + 8.0 * ku),
                r_hand_160=(68.0, 76.0 + 8.0 * ku),
                l_pose="relaxed",
                r_pose="relaxed",
                orb_offset_160=(-20.0, -48.0 + 18.0 * ku),
                orb_eye="sleep",
                phase=c,
                lock_ground=True,
            )
        else:
            pu = (c - 18) / 11.0
            # Horizontal prone collapse resting flat on floor (maxDeathH <= 104px, x in [18..302])
            f = render_pose_512_to_160(
                rig,
                torso_deg=-6.0,
                head_deg=-6.0,
                tail_deg=8.0 * math.sin(pu * 1.5),
                l_thigh_deg=-8.0,
                l_shin_deg=6.0,
                r_thigh_deg=6.0,
                r_shin_deg=-4.0,
                prone_deg=-86.0 - 2.0 * pu,
                phase=c,
                lock_ground=False,
            )
        put_cell(5, c, f)

    # ROW 6: DASH / CTRL+Z GLITCH BLINK (F00..F29)
    for c in range(COLS):
        u = c / 29.0
        tilt = 11.0 + 2.5 * math.sin(u * math.tau)
        f = render_pose_512_to_160(
            rig,
            dx_160=3.5,
            dy_160=-1.8,
            torso_deg=tilt,
            head_deg=4.0,
            tail_deg=-18.0 + 5.0 * math.sin(u * math.tau),
            l_thigh_deg=-18.0,
            l_shin_deg=12.0,
            r_thigh_deg=16.0,
            r_shin_deg=6.0,
            l_hand_160=(40.0, 68.0),
            r_hand_160=(77.0, 65.0),
            l_pose="relaxed",
            r_pose="open_swipe",
            orb_offset_160=(-22.0, -56.0),
            orb_eye="laser",
            phase=c,
            lock_ground=True,
        )
        put_cell(6, c, f)

    # ROW 7: CROUCH (Holographic Firewall Guard & Low Cursor Ping, F00..F29)
    for c in range(COLS):
        u = c / 29.0
        drop = 96.0 + 6.0 * math.sin(u * math.tau)
        cast = 11 <= c <= 21
        f = render_pose_512_to_160(
            rig,
            torso_deg=8.0,
            head_deg=2.0,
            tail_deg=10.0 * math.sin(u * math.tau),
            l_thigh_deg=-34.0,
            l_shin_deg=34.0,
            r_thigh_deg=32.0,
            r_shin_deg=36.0,
            crouch_drop_512=drop,
            l_hand_160=(46.0, 82.0),
            r_hand_160=(78.0 if cast else 72.0, 78.0 if cast else 80.0),
            l_pose="paw_boop",
            r_pose="finger_tap" if cast else "open_swipe",
            paw_tuck=not cast,
            orb_offset_160=(-19.0, -40.0 + 1.5 * math.sin(u * math.tau)),
            mini_prompt=("panel", 4, -2) if cast else None,
            phase=c,
            lock_ground=True,
        )
        put_cell(7, c, f)

    # ROW 8: JUMP / DODGE (F00..F29)
    for c in range(COLS):
        u = c / 29.0
        if c < 4:
            drop = 62.0 * (c / 3.0)
            dy = 0.0
            th_l, sh_l, th_r, sh_r = -22.0, 26.0, 22.0, 26.0
            lock_g = True
        elif c < 23:
            au = (c - 4) / 18.0
            drop = 0.0
            dy = -9.0 * math.sin(au * math.pi)
            th_l, sh_l, th_r, sh_r = -14.0, 22.0, 14.0, 18.0
            lock_g = False
        else:
            lu = (c - 23) / 6.0
            drop = 48.0 * (1.0 - lu)
            dy = 0.0
            th_l, sh_l, th_r, sh_r = -16.0 * (1.0 - lu), 16.0 * (1.0 - lu), 16.0 * (1.0 - lu), 16.0 * (1.0 - lu)
            lock_g = True

        f = render_pose_512_to_160(
            rig,
            dy_160=dy,
            torso_deg=4.0,
            head_deg=2.0,
            tail_deg=12.0 * math.sin(u * math.tau),
            l_thigh_deg=th_l,
            l_shin_deg=sh_l,
            r_thigh_deg=th_r,
            r_shin_deg=sh_r,
            crouch_drop_512=drop,
            l_hand_160=(44.0, 66.0 + dy * 0.5),
            r_hand_160=(76.0, 62.0 + dy * 0.5),
            l_pose="open_swipe",
            r_pose="finger_tap",
            orb_offset_160=(-18.0, -58.0 + dy),
            phase=c,
            lock_ground=lock_g,
        )
        put_cell(8, c, f)

    # ROW 9: VICTORY (Cheerful Pose-B Victory & Holo-Badge, F00..F29, minVictoryH >= 150)
    for c in range(COLS):
        u = c / 29.0
        bob = 0.8 * math.sin(u * math.tau)
        f = render_pose_512_to_160(
            rig,
            dy_160=bob,
            torso_deg=-2.5,
            head_deg=-3.5 + 1.8 * math.sin(u * math.tau),
            tail_deg=14.0 * math.sin(u * math.tau * 2.0),
            l_thigh_deg=-4.0,
            r_thigh_deg=5.0,
            l_hand_160=(49.0, 62.0 - 2.0 * bob),
            r_hand_160=(74.0, 56.0 + bob),
            l_pose="paw_boop",
            r_pose="finger_tap",
            paw_tuck=True,
            orb_offset_160=(-18.0, -60.0 + bob),
            orb_eye="happy",
            mini_prompt=("panel", 4, -2),
            phase=c,
            lock_ground=True,
        )
        put_cell(9, c, f)

    return sheet


# ==============================================================================
# 4. 8-ROW x 30-COL VFX SPRITE SHEET (6240x1664, 208x208 @ 2x NEAREST OF 104x104)
# ==============================================================================
COB_GLYPHS = {
    "C": [
        "01110",
        "11011",
        "11000",
        "11000",
        "11000",
        "11011",
        "01110",
    ],
    "o": [
        "00000",
        "00000",
        "01110",
        "11011",
        "11011",
        "11011",
        "01110",
    ],
    "b": [
        "11000",
        "11000",
        "11110",
        "11011",
        "11011",
        "11011",
        "11110",
    ],
    "4": [
        "00110",
        "01110",
        "11010",
        "11111",
        "00010",
        "00010",
        "00010",
    ],
    "0": [
        "01110",
        "11011",
        "11011",
        "11011",
        "11011",
        "11011",
        "01110",
    ],
    "A": [
        "01110",
        "11011",
        "11011",
        "11111",
        "11011",
        "11011",
        "11011",
    ],
    "F": [
        "11111",
        "11000",
        "11000",
        "11110",
        "11000",
        "11000",
        "11000",
    ],
    "K": [
        "11011",
        "11010",
        "11100",
        "11100",
        "11010",
        "11011",
        "11011",
    ],
}


def draw_pixel_text_104(
    arr: np.ndarray,
    text: str,
    cx: int,
    cy: int,
    scale: int,
    fg: tuple[int, int, int, int],
    outline: tuple[int, int, int, int] = C_OUT_DARK,
):
    glyph_w = 5 * scale
    gap = scale
    total_w = len(text) * glyph_w + max(0, len(text) - 1) * gap
    sx0 = cx - total_w // 2
    sy0 = cy - (7 * scale) // 2

    def blit_glyph_pass(col: tuple[int, int, int, int], ox: int, oy: int):
        for gi, ch in enumerate(text):
            g = COB_GLYPHS.get(ch)
            if not g:
                continue
            gx0 = sx0 + gi * (glyph_w + gap) + ox
            for ry, row_s in enumerate(g):
                for rx, bit in enumerate(row_s):
                    if bit != "1":
                        continue
                    px0 = gx0 + rx * scale
                    py0 = sy0 + ry * scale
                    for dy in range(scale):
                        for dx in range(scale):
                            px, py = px0 + dx, py0 + dy
                            if 3 <= px < VFX_LOG - 3 and 3 <= py < VFX_LOG - 3:
                                arr[py, px] = col

    for oox, ooy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        blit_glyph_pass(outline, oox, ooy)
    blit_glyph_pass(fg, 0, 0)


def draw_star4_104(arr: np.ndarray, cx: int, cy: int, arm: int, col: tuple[int, int, int, int], core: tuple[int, int, int, int] = C_WHITE):
    for d in range(-arm, arm + 1):
        if 3 <= cx + d < VFX_LOG - 3 and 3 <= cy < VFX_LOG - 3:
            arr[cy, cx + d] = col
        if 3 <= cx < VFX_LOG - 3 and 3 <= cy + d < VFX_LOG - 3:
            arr[cy + d, cx] = col
    if 3 <= cx < VFX_LOG - 3 and 3 <= cy < VFX_LOG - 3:
        arr[cy, cx] = core


def draw_box_frame_104(
    arr: np.ndarray,
    x0: int,
    y0: int,
    x1: int,
    y1: int,
    border: tuple[int, int, int, int],
    fill: tuple[int, int, int, int] | None,
    bar: tuple[int, int, int, int] | None = None,
):
    x0, x1 = max(3, x0), min(VFX_LOG - 4, x1)
    y0, y1 = max(3, y0), min(VFX_LOG - 4, y1)
    if fill is not None:
        arr[y0 + 1 : y1, x0 + 1 : x1] = fill
    if bar is not None:
        arr[y0 + 1 : min(y1, y0 + 5), x0 + 1 : x1] = bar
    arr[y0, x0 : x1 + 1] = border
    arr[y1, x0 : x1 + 1] = border
    arr[y0 : y1 + 1, x0] = border
    arr[y0 : y1 + 1, x1] = border


def draw_cob_crest_104(arr: np.ndarray, phase: int, grand: bool = False):
    """Crisp pixel 'Cob' inside a sleek Hex/Diamond Tech Frame with star-sparks."""
    cx, cy = 52, 52
    rad = 38 if grand else 31
    pulse = math.sin(phase / 30.0 * math.tau)
    # Diamond/Hex tech frame outline
    pts = [
        (cx, cy - rad),
        (cx + rad - 10, cy - rad + 10),
        (cx + rad, cy),
        (cx + rad - 10, cy + rad - 10),
        (cx, cy + rad),
        (cx - rad + 10, cy + rad - 10),
        (cx - rad, cy),
        (cx - rad + 10, cy - rad + 10),
    ]
    im = Image.new("RGBA", (VFX_LOG, VFX_LOG), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    dr.polygon(pts, fill=C_NAVY_DARK, outline=C_CYAN)
    inner_pts = [
        (cx + (px - cx) * 0.84, cy + (py - cy) * 0.84) for px, py in pts
    ]
    dr.polygon(inner_pts, fill=(24, 18, 56, 255), outline=C_MAGENTA)
    # Tech corner brackets
    b_off = rad + 3
    for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        bx, by = cx + sx * (b_off - 8), cy + sy * (b_off - 8)
        dr.line([(bx, by), (bx - sx * 8, by)], fill=C_GOLD, width=2)
        dr.line([(bx, by), (bx, by - sy * 8)], fill=C_GOLD, width=2)

    sub = np.array(im)
    arr[:] = sub
    # Crisp pixel "Cob" lettering
    draw_pixel_text_104(
        arr,
        "Cob",
        cx,
        cy + 1,
        scale=3 if grand else 2,
        fg=C_WHITE if phase % 4 == 0 else C_CYAN_LIGHT,
        outline=C_OUT_DARK,
    )
    # Orbiting star sparks
    for k in range(6 if grand else 4):
        ang = phase / 30.0 * math.tau + k * (math.tau / (6 if grand else 4))
        sx = int(round(cx + math.cos(ang) * (rad + 1)))
        sy = int(round(cy + math.sin(ang) * (rad + 1)))
        draw_star4_104(arr, sx, sy, 3 if grand else 2, C_GOLD if k % 2 == 0 else C_MAGENTA)
    # Subtle top & bottom cosmic bar accents
    if pulse > 0:
        draw_star4_104(arr, cx, cy - rad + 4, 2, C_WHITE)
    else:
        draw_star4_104(arr, cx, cy + rad - 4, 2, C_CYAN)


def build_vfx_sheet() -> np.ndarray:
    vfx = np.zeros((VFX_ROWS * VFX_CELL, VFX_COLS * VFX_CELL, 4), dtype=np.uint8)

    for r in range(VFX_ROWS):
        for c in range(VFX_COLS):
            cell = np.zeros((VFX_LOG, VFX_LOG, 4), dtype=np.uint8)
            u = c / 30.0
            cx, cy = 52, 52

            if r == 0:
                # Row 0: Spinning Holographic Window & Star-Packet Bolt
                ang = u * math.tau
                bob = int(round(3.0 * math.sin(ang)))
                draw_box_frame_104(cell, 24, 28 + bob, 80, 76 + bob, C_CYAN, C_NAVY_DARK, C_MAGENTA)
                for k in range(3):
                    sx = 34 + ((c * 3 + k * 14) % 36)
                    sy = 42 + bob + k * 10
                    draw_star4_104(cell, sx, sy, 2 + (k % 2), C_CYAN_LIGHT if k % 2 == 0 else C_GOLD)
            elif r == 1:
                # Row 1: "404" Warning Holographic Pop-Up Dialog Window
                pulse = int(round(2.0 * math.sin(u * math.tau * 2.0)))
                draw_box_frame_104(cell, 16, 24 + pulse, 88, 80 + pulse, C_MAGENTA, C_NAVY_DARK, C_CYAN)
                draw_pixel_text_104(cell, "404", cx, cy + 2 + pulse, scale=2, fg=C_GOLD if c % 4 == 0 else C_WHITE)
                draw_star4_104(cell, 82, 27 + pulse, 2, C_WHITE)
            elif r == 2:
                # Row 2: "Cob" Creator Holo-Crest Stamp
                draw_cob_crest_104(cell, c, grand=False)
            elif r == 3:
                # Row 3: Holographic Selection Marquee Box / Nebula Seal
                expand = int(round(8.0 * math.sin(u * math.pi)))
                x0, y0, x1, y1 = 18 - expand, 26 - expand // 2, 86 + expand, 78 + expand // 2
                # Dashed marquee perimeter
                for x in range(x0, x1 + 1):
                    if ((x + c) % 4) < 2 and 3 <= x < VFX_LOG - 3:
                        cell[y0, x] = C_CYAN
                        cell[y1, x] = C_CYAN
                for y in range(y0, y1 + 1):
                    if ((y + c) % 4) < 2 and 3 <= y < VFX_LOG - 3:
                        cell[y, x0] = C_MAGENTA
                        cell[y, x1] = C_MAGENTA
                for sx, sy in ((x0, y0), (x1, y0), (x0, y1), (x1, y1)):
                    draw_star4_104(cell, sx, sy, 3, C_GOLD)
            elif r == 4:
                # Row 4: Pixel Cursor Cross-Rip & Nebula Starburst Impact
                rad = 14 + int(round(22 * math.sin(u * math.pi)))
                for k in range(8):
                    ang = u * math.tau + k * (math.pi / 4.0)
                    px = int(round(cx + math.cos(ang) * rad))
                    py = int(round(cy + math.sin(ang) * rad))
                    draw_star4_104(cell, px, py, 3, C_CYAN if k % 2 == 0 else C_MAGENTA)
                draw_star4_104(cell, cx, cy, 8, C_WHITE, C_GOLD)
            elif r == 5:
                # Row 5: Overdrive Orbital Terminal Window Node
                bob = int(round(4.0 * math.sin(u * math.tau)))
                draw_box_frame_104(cell, 22, 20 + bob, 82, 84 + bob, C_LILAC, C_NAVY_MID, C_CYAN)
                for row_y in (36, 48, 60, 70):
                    w_bar = 18 + ((c * 5 + row_y) % 28)
                    cell[row_y + bob : row_y + 3 + bob, 30 : 30 + w_bar] = (
                        C_CYAN if row_y % 24 == 0 else C_PINK
                    )
                draw_star4_104(cell, 74, 72 + bob, 3, C_GOLD)
            elif r == 6:
                # Row 6: "AFK" Holographic Neko Decoy Glitch Silhouette
                jitter = (c % 3) - 1
                # Cute neon holographic cat-head outline + "AFK" tag
                draw_box_frame_104(cell, 20 + jitter, 22, 84 + jitter, 82, C_CYAN, (24, 16, 48, 255), C_VIOLET)
                # Cat ears on top
                for side in (-1, 1):
                    ex = cx + jitter + side * 14
                    for h_i in range(8):
                        for dx in range(-h_i // 2, h_i // 2 + 1):
                            cell[14 + h_i, ex + dx] = C_MAGENTA if h_i < 5 else C_LILAC
                draw_pixel_text_104(cell, "AFK", cx + jitter, cy + 4, scale=2, fg=C_CYAN_LIGHT)
            elif r == 7:
                # Row 7: Grand "Cob" Creator Genesis Core Emblem
                draw_cob_crest_104(cell, c, grand=True)

            # Enforce strict >= 4px margin in 208x208 (>= 2px in 104x104)
            cell[:2, :] = 0
            cell[VFX_LOG - 2 :, :] = 0
            cell[:, :2] = 0
            cell[:, VFX_LOG - 2 :] = 0

            up = np.array(
                Image.fromarray(cell, "RGBA").resize((VFX_CELL, VFX_CELL), Image.Resampling.NEAREST),
                dtype=np.uint8,
            )
            vfx[r * VFX_CELL : (r + 1) * VFX_CELL, c * VFX_CELL : (c + 1) * VFX_CELL] = up

    return vfx


# ==============================================================================
# 5. 128x128 CEL-QUANTIZED PORTRAIT & ROW 11 OF hero_icons_sheet.png
# ==============================================================================
def build_portrait_128() -> Image.Image:
    raw = Image.open(PORTRAIT_RAW_JPG).convert("RGB")
    med3 = np.array(raw.filter(ImageFilter.MedianFilter(size=3)))
    im256 = Image.fromarray(med3, "RGB").resize((256, 256), Image.Resampling.BOX)
    im256 = im256.filter(ImageFilter.MedianFilter(size=3))
    im128 = im256.resize((128, 128), Image.Resampling.NEAREST)
    q128 = im128.quantize(colors=28, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert("RGBA")
    arr = np.array(q128, dtype=np.uint8)
    arr[:, :, 3] = 255
    out_im = Image.fromarray(arr, "RGBA")
    out_im.save(OUT_PORTRAIT)
    return out_im


def draw_icon_bezel(cell: np.ndarray):
    cell[0, :] = [14, 10, 26, 255]
    cell[-1, :] = [14, 10, 26, 255]
    cell[:, 0] = [14, 10, 26, 255]
    cell[:, -1] = [14, 10, 26, 255]


def build_nyx_icon_row11() -> Image.Image:
    """Builds 384x64 Row 11 (6x 64x64 HD-2D RPG ability icons) matching existing hero_icons_sheet.png style."""
    row = Image.new("RGBA", (384, 64), (0, 0, 0, 0))
    for col_idx in range(6):
        c = np.zeros((64, 64, 4), dtype=np.uint8)
        c[:, :] = [18, 14, 38, 255]
        # Subtle inner vignette / nebula gradient
        for y in range(2, 62):
            for x in range(2, 62):
                d = math.hypot(x - 32, y - 32)
                if d < 18:
                    c[y, x] = [44, 24, 78, 255]
                elif d < 27:
                    c[y, x] = [28, 18, 56, 255]

        im_c = Image.fromarray(c, "RGBA")
        dr = ImageDraw.Draw(im_c)
        if col_idx == 0:
            # Attack: Floating Cosmic Neko-AI Orb + Prompt Bolt
            dr.polygon([(14, 24), (20, 10), (26, 22)], fill=C_CYAN, outline=C_OUT_DARK)
            dr.polygon([(50, 24), (44, 10), (38, 22)], fill=C_MAGENTA, outline=C_OUT_DARK)
            dr.ellipse([16, 18, 48, 50], fill=C_NAVY_DARK, outline=C_CYAN, width=3)
            dr.ellipse([25, 27, 39, 41], fill=C_MAGENTA, outline=C_WHITE, width=2)
        elif col_idx == 1:
            # Skill: 404 Pop-Up + Cob Crest
            dr.rectangle([8, 12, 56, 52], fill=C_NAVY_DARK, outline=C_MAGENTA, width=3)
            dr.rectangle([10, 14, 54, 21], fill=C_CYAN)
            arr_i = np.array(im_c)
            # Pixel "Cob" badge inside
            for ox, oy in ((20, 28), (32, 28), (44, 28)):
                arr_i[oy - 2 : oy + 10, ox - 3 : ox + 5] = C_CYAN_LIGHT
            arr_i[31:37, 22:25] = C_NAVY_DARK
            arr_i[31:35, 32:34] = C_NAVY_DARK
            arr_i[24:28, 40:44] = C_GOLD
            im_c = Image.fromarray(arr_i, "RGBA")
        elif col_idx == 2:
            # Overdrive: 6-Window Orbital Ring
            for k in range(6):
                ang = k * (math.tau / 6.0)
                wx = int(round(32 + math.cos(ang) * 18))
                wy = int(round(32 + math.sin(ang) * 18))
                dr.rectangle([wx - 6, wy - 5, wx + 6, wy + 5], fill=C_NAVY_MID, outline=C_CYAN if k % 2 == 0 else C_MAGENTA, width=2)
            dr.ellipse([25, 25, 39, 39], fill=C_WHITE, outline=C_GOLD, width=2)
        elif col_idx == 3:
            # Supreme Ultimate: Cob Genesis Supernova Core
            dr.polygon([(32, 6), (58, 32), (32, 58), (6, 32)], fill=C_NAVY_DARK, outline=C_GOLD, width=3)
            dr.polygon([(32, 13), (51, 32), (32, 51), (13, 32)], fill=(36, 20, 72, 255), outline=C_CYAN, width=2)
            dr.ellipse([24, 24, 40, 40], fill=C_MAGENTA, outline=C_WHITE, width=2)
        elif col_idx == 4:
            # Dodge: Ctrl+Z Glitch Blink Arrow + Neko Silhouette
            dr.polygon([(12, 34), (28, 16), (28, 26), (52, 26), (52, 42), (28, 42), (28, 52)], fill=C_CYAN, outline=C_OUT_DARK)
            dr.rectangle([34, 30, 48, 38], fill=C_MAGENTA)
        else:
            # Guard: Auto-Patch Holo-Shield
            dr.polygon([(14, 12), (50, 12), (50, 36), (32, 54), (14, 36)], fill=C_NAVY_MID, outline=C_LILAC, width=3)
            dr.rectangle([28, 20, 36, 40], fill=C_CYAN_LIGHT)
            dr.rectangle([22, 26, 42, 34], fill=C_CYAN_LIGHT)

        arr_c = np.array(im_c)
        # Rim highlights
        arr_c[1, 1:63] = C_CYAN if col_idx in (0, 2, 4) else C_MAGENTA
        arr_c[1:63, 1] = C_LILAC
        draw_icon_bezel(arr_c)
        row.paste(Image.fromarray(arr_c, "RGBA"), (col_idx * 64, 0))
    return row


def append_hero_icons_row11():
    orig_full = Image.open(OUT_HERO_ICONS).convert("RGBA")
    assert orig_full.width == 384 and orig_full.height in (704, 768), (
        f"Expected hero_icons_sheet 384x704 or 384x768, got {orig_full.size}"
    )
    base_rows = orig_full.crop((0, 0, 384, 704))
    new_atlas = Image.new("RGBA", (384, 768), (0, 0, 0, 0))
    new_atlas.paste(base_rows, (0, 0))
    row11 = build_nyx_icon_row11()
    new_atlas.paste(row11, (0, 704))
    new_atlas.save(OUT_HERO_ICONS, optimize=True)
    # Double check Rows 0..10 byte-for-byte pixel equality
    check = Image.open(OUT_HERO_ICONS).convert("RGBA")
    assert np.array_equal(np.array(base_rows), np.array(check.crop((0, 0, 384, 704)))), "Rows 0..10 altered!"


# ==============================================================================
# 6. SELF-AUDIT & COMPACT QA STRIPS
# ==============================================================================
def verify_and_dump_qa(sheet: np.ndarray, vfx: np.ndarray, portrait: Image.Image):
    # Sheet checks
    clips = 0
    for r in range(ROWS):
        trans = 0
        for c in range(COLS):
            cell = sheet[r * CELL_H : (r + 1) * CELL_H, c * CELL_W : (c + 1) * CELL_W]
            a = cell[:, :, 3] > 0
            if np.any(a[:4, :]) or np.any(a[-4:, :]) or np.any(a[:, :4]) or np.any(a[:, -4:]):
                clips += 1
            if c > 0:
                prev = sheet[r * CELL_H : (r + 1) * CELL_H, (c - 1) * CELL_W : c * CELL_W]
                if not np.array_equal(cell[::2, ::2], prev[::2, ::2]):
                    trans += 1
        assert trans == 29, f"Row {r} transitions={trans} != 29"
    assert clips == 0, f"Sheet 4px clips={clips} != 0"

    # Row 1 Walk checks
    stance_xs = []
    boot_spans = []
    top_ys = []
    for c in range(COLS):
        cell = sheet[CELL_H : 2 * CELL_H, c * CELL_W : (c + 1) * CELL_W]
        a = cell[:, :, 3] > 0
        ys, xs = np.where(a)
        max_y, min_y = int(ys.max()), int(ys.min())
        assert 222 <= max_y <= 233, f"Walk F{c} maxY={max_y}"
        top_ys.append(min_y)
        # Boot band 218..233
        by, bx = np.where(a[218:234, :])
        boot_spans.append(int(bx.max() - bx.min() + 1))
        py, px = np.where(a[224:231, :])
        stance_xs.append(float(px.mean()) if len(px) else 112.0)

    for c in range(COLS):
        delta_t = abs(top_ys[(c + 1) % 30] - top_ys[c])
        assert delta_t <= 4, f"Walk topY delta F{c}->{c+1} = {delta_t}"
    assert max(boot_spans) >= 56, f"Walk maxBootSpan={max(boot_spans)}"
    assert min(boot_spans) <= max(boot_spans) * 0.55, f"Walk min/max={min(boot_spans)}/{max(boot_spans)}"
    d1 = stance_xs[6] - stance_xs[1]
    d2 = stance_xs[21] - stance_xs[16]
    assert d1 <= -6.0 and d2 <= -6.0, f"Walk crossover deltas d1={d1:.2f}, d2={d2:.2f}"

    # Pure ranged Rows 2 & 3 maxX <= 262 & 0 detached >=16px at x >= 230
    for rr in (2, 3):
        for cc in range(COLS):
            cell = sheet[rr * CELL_H : (rr + 1) * CELL_H, cc * CELL_W : (cc + 1) * CELL_W]
            a = cell[:, :, 3] > 0
            xs = np.where(a)[1]
            assert int(xs.max()) <= 262, f"Row {rr} F{cc} maxX={xs.max()}"
            labeled, n_c = ndimage.label(a, structure=np.ones((3, 3), dtype=bool))
            sizes = np.bincount(labeled.ravel())
            for cid in range(1, n_c + 1):
                if sizes[cid] >= 16:
                    cxs = np.where(labeled == cid)[1]
                    assert int(cxs.min()) < 230, f"Row {rr} F{cc} detached >=16px at x={cxs.min()}"

    # Row 5 DEATH & Row 9 VICTORY
    for cc in range(26, 30):
        dc = sheet[5 * CELL_H : 6 * CELL_H, cc * CELL_W : (cc + 1) * CELL_W][:, :, 3] > 0
        dys, dxs = np.where(dc)
        dh = int(dys.max() - dys.min() + 1)
        assert 64 <= dh <= 104 and dxs.min() >= 18 and dxs.max() <= 302, f"Death F{cc} h={dh} x={dxs.min()}..{dxs.max()}"
        vc = sheet[9 * CELL_H : 10 * CELL_H, cc * CELL_W : (cc + 1) * CELL_W][:, :, 3] > 0
        vys = np.where(vc)[0]
        vh = int(vys.max() - vys.min() + 1)
        assert vh >= 150, f"Victory F{cc} h={vh}"

    # VFX clips
    vclips = 0
    for r in range(VFX_ROWS):
        for c in range(VFX_COLS):
            vc = vfx[r * VFX_CELL : (r + 1) * VFX_CELL, c * VFX_CELL : (c + 1) * VFX_CELL][:, :, 3] > 0
            if np.any(vc[0, :]) or np.any(vc[-1, :]) or np.any(vc[:, 0]) or np.any(vc[:, -1]):
                vclips += 1
    assert vclips == 0, f"VFX clips={vclips}"

    print(
        f"[OK] Quantitative gates passed: sheet={sheet.shape[1]}x{sheet.shape[0]} (0 clips), "
        f"walk=({min(boot_spans)}..{max(boot_spans)}, d1={d1:.1f}, d2={d2:.1f}), "
        f"vfx={vfx.shape[1]}x{vfx.shape[0]} (0 clips)"
    )

    # Compact visual contact strips in scratch dir
    SCRATCH_DIR.mkdir(parents=True, exist_ok=True)
    picks = [
        ("R0 IDLE F00", 0, 0),
        ("R1 WALK F01", 1, 1),
        ("R1 WALK F06", 1, 6),
        ("R2 BEAT1 F03", 2, 3),
        ("R2 BEAT2 F09", 2, 9),
        ("R2 POSE-B F17", 2, 17),
        ("R2 ENTER F25", 2, 25),
        ("R3 SKILL F16", 3, 16),
        ("R4 ULT F13", 4, 13),
        ("R4 T-ULT F25", 4, 25),
        ("R4 T-ULT F28", 4, 28),
        ("R5 DEATH F28", 5, 28),
        ("R7 CROUCH F14", 7, 14),
        ("R9 VICTORY F10", 9, 10),
    ]
    cols_n = 7
    rows_n = 2
    strip = Image.new("RGBA", (cols_n * CELL_W, rows_n * CELL_H), (32, 18, 48, 255))
    dr = ImageDraw.Draw(strip)
    for idx, (lbl, rr, cc) in enumerate(picks):
        gx = (idx % cols_n) * CELL_W
        gy = (idx // cols_n) * CELL_H
        cell_im = Image.fromarray(
            sheet[rr * CELL_H : (rr + 1) * CELL_H, cc * CELL_W : (cc + 1) * CELL_W], "RGBA"
        )
        strip.alpha_composite(cell_im, (gx, gy))
        dr.rectangle([gx, gy, gx + CELL_W - 1, gy + CELL_H - 1], outline=(100, 116, 139, 255))
        dr.text((gx + 6, gy + 4), lbl, fill=(253, 224, 71, 255))
    strip.save(SCRATCH_DIR / "nyx_ex_sheet_check.png")

    v_strip = Image.new("RGBA", (8 * VFX_CELL, VFX_CELL + 24), (16, 14, 34, 255))
    vdr = ImageDraw.Draw(v_strip)
    v_labels = ["R0 WIN", "R1 404", "R2 Cob", "R3 BOX", "R4 HIT", "R5 ORB", "R6 AFK", "R7 CORE"]
    for vr in range(8):
        cell_im = Image.fromarray(
            vfx[vr * VFX_CELL : (vr + 1) * VFX_CELL, 10 * VFX_CELL : 11 * VFX_CELL], "RGBA"
        )
        v_strip.alpha_composite(cell_im, (vr * VFX_CELL, 24))
        vdr.text((vr * VFX_CELL + 8, 6), v_labels[vr], fill=(34, 211, 238, 255))
    v_strip.save(SCRATCH_DIR / "nyx_ex_vfx_check.png")

    pi_im = Image.new("RGBA", (256 + 384 + 32, 256), (12, 14, 28, 255))
    pi_im.paste(portrait.resize((256, 256), Image.Resampling.NEAREST), (0, 0))
    atlas = Image.open(OUT_HERO_ICONS).convert("RGBA")
    row11_im = atlas.crop((0, 704, 384, 768)).resize((384, 64), Image.Resampling.NEAREST)
    pi_im.paste(row11_im, (272, 96))
    pi_im.save(SCRATCH_DIR / "nyx_ex_portrait_icons_check.png")


def main():
    rig = build_nyx_rig_512()
    sheet = build_character_sheet(rig)
    Image.fromarray(sheet, "RGBA").save(OUT_SHEET, optimize=True)
    vfx = build_vfx_sheet()
    Image.fromarray(vfx, "RGBA").save(OUT_VFX, optimize=True)
    portrait = build_portrait_128()
    append_hero_icons_row11()
    verify_and_dump_qa(sheet, vfx, portrait)


if __name__ == "__main__":
    main()
