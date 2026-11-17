#!/opt/homebrew/bin/python3.11
"""
Overhauled Next-Gen Wide-Canvas Sprite Sheet & Radiant Neon VFX Sheet Builder for:
  NYX EX -- Nebula AI Assistant Created by Cob (nyx_ex)

Upgrades (?v=30fps127):
  - Replaces straight tube-stripes & dot hands with billowing oversized bell/lantern galaxy hoodie
    sleeves (coherent nebula swirl, gravity drape, dark ribbed cuff, 1px selout) + pixel-sculpted
    anatomical 3-finger + thumb hands ('relaxed_open', 'finger_tap', 'open_cast', 'enter_press', 'paw_boop').
  - Fixes `lock_ground` ordering bug (ground-normalize first, THEN apply dy_160 bounce/hop!) so
    full-body bobs, walk strides, Pose-B knee-tuck hops, Skill leaps & Victory bounces visibly animate.
  - Multi-part expressive 512x512 rig: independent perking cat ears, sinuous S-wave tail deformation,
    squash-stretch torso, facial expressions ('smile', 'happy_fang', 'focused_glow', 'blink', 'wink'),
    depth-shaded back leg/sleeve, and unbaked orb on combat rows (animated live by NyxEx.js).
  - Rebuilds `nyx_ex_vfx.png` (6240x1664, 8x30 @ 208x208) with Bayer-stippled translucent neon glass,
    radial glow halos, Row 4 spinning Nebula Plasma Pillar/Beam segment, & Row 7 Cob Genesis Astrolabe Core.
"""

from __future__ import annotations

import math
import sys
from collections import deque
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
C_HAIR_MID = (196, 154, 224, 255)
C_HAIR_LIGHT = (223, 198, 240, 255)

C_SKIN_OUT = (72, 36, 66, 255)
C_SKIN_SHAD = (204, 140, 130, 255)
C_SKIN_MID = (242, 196, 188, 255)
C_SKIN_LIGHT = (255, 224, 212, 255)

C_NAVY_DEEP = (11, 12, 32, 255)
C_NAVY_DARK = (16, 18, 46, 255)
C_NAVY_MID = (30, 34, 82, 255)
C_HOODIE_BLUE = (42, 64, 122, 255)
C_CYAN_DEEP = (14, 116, 144, 255)
C_CYAN = (34, 211, 238, 255)          # #22d3ee
C_CYAN_LIGHT = (165, 243, 252, 255)   # #a5f3fc
C_MAGENTA = (217, 70, 239, 255)       # #d946ef
C_PINK = (244, 114, 182, 255)         # #f472b6
C_VIOLET = (147, 51, 234, 255)
C_LILAC = (192, 132, 252, 255)        # #c084fc
C_GOLD = (253, 224, 71, 255)          # #fde047
C_AMBER = (245, 158, 11, 255)         # #f59e0b
C_WHITE = (255, 255, 255, 255)
C_CUFF_DARK = (20, 22, 54, 255)
C_CUFF_RIB = (58, 66, 118, 255)

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


def tint_part(
    part: tuple[Image.Image, int, int], factor: float = 0.85
) -> tuple[Image.Image, int, int]:
    im, x0, y0 = part
    arr = np.array(im, dtype=np.float32)
    a = arr[:, :, 3] > 128
    arr[a, :3] = np.clip(arr[a, :3] * factor, 0, 255)
    return (Image.fromarray(arr.astype(np.uint8), "RGBA"), x0, y0)


def make_head_expression_variant(
    stand: np.ndarray, head_m: np.ndarray, mode: str
) -> tuple[Image.Image, int, int]:
    """Builds expressive facial variant in 512x512 head space so expressions track head rotation cleanly."""
    im_base, x0, y0 = crop_part(stand, head_m)
    if mode == "smile":
        return (im_base, x0, y0)

    arr = np.array(im_base, dtype=np.uint8)
    # Transform global 512 eye/mouth coordinates into head crop coords:
    # L_eye=(273, 101), R_eye=(305, 100), Mouth=(291, 122)
    lx, ly = 273 - x0, 101 - y0
    rx, ry = 305 - x0, 100 - y0
    mx, my = 291 - x0, 122 - y0
    h, w, _ = arr.shape
    skin_warm = np.array([250, 206, 196, 255], dtype=np.uint8)
    lash = np.array([48, 26, 74, 255], dtype=np.uint8)

    def paint_blink_eye(cx: int, cy: int, happy_arc: bool = False):
        for oy in range(-6, 7):
            for ox in range(-8, 9):
                px, py = cx + ox, cy + oy
                if 0 <= px < w and 0 <= py < h and arr[py, px, 3] > 128:
                    # Only replace iris/dark eye pixels (preserve lilac hair bangs)
                    r0, g0, b0 = int(arr[py, px, 0]), int(arr[py, px, 1]), int(arr[py, px, 2])
                    is_bang_hair = (b0 > 180 and r0 > 165 and g0 > 125) and ox < -4
                    if not is_bang_hair and (oy * oy) / 36.0 + (ox * ox) / 64.0 <= 1.0:
                        arr[py, px] = skin_warm
        # Draw crisp pixel curve (`^` happy arc or `-` closed eyelid lash)
        for ox in range(-6, 7):
            curve_y = cy - (2 if happy_arc and abs(ox) <= 3 else 0) + (2 if not happy_arc and abs(ox) <= 4 else 0)
            for dy in (0, 1):
                px, py = cx + ox, curve_y + dy
                if 0 <= px < w and 0 <= py < h and arr[py, px, 3] > 128:
                    arr[py, px] = lash

    if mode == "blink":
        paint_blink_eye(lx, ly, happy_arc=False)
        paint_blink_eye(rx, ry, happy_arc=False)
    elif mode == "wink":
        paint_blink_eye(rx, ry, happy_arc=True)
        # Brighten left eye + open happy fang mouth
        for oy in range(-3, 4):
            for ox in range(-3, 4):
                px, py = lx + ox, ly + oy
                if 0 <= px < w and 0 <= py < h and arr[py, px, 3] > 128:
                    if ox in (1, 2) and oy in (-2, -1):
                        arr[py, px] = [255, 255, 255, 255]
    elif mode == "happy_fang":
        paint_blink_eye(lx, ly, happy_arc=True)
        paint_blink_eye(rx, ry, happy_arc=True)
        # Cheerful open laughing mouth with pink interior + tiny white fang!
        for oy in range(-2, 6):
            for ox in range(-6, 6):
                px, py = mx + ox, my + oy
                if 0 <= px < w and 0 <= py < h and arr[py, px, 3] > 128:
                    if oy <= -1:
                        arr[py, px] = [74, 34, 62, 255]
                    elif oy <= 3 and abs(ox) <= 4:
                        arr[py, px] = [244, 128, 152, 255]
                    elif abs(ox) <= 4:
                        arr[py, px] = [165, 68, 86, 255]
        # Cute pixel fang
        if 0 <= mx - 3 < w and 0 <= my < h:
            arr[my, mx - 3] = [255, 255, 255, 255]
            arr[my + 1, mx - 3] = [255, 255, 255, 255]
    elif mode == "focused_glow":
        # Luminous electric cyan + cosmic magenta irises with fierce white cores!
        for idx, (cx, cy) in enumerate(((lx, ly), (rx, ry))):
            iris_col = np.array([34, 211, 238, 255] if idx == 0 else [217, 70, 239, 255], dtype=np.uint8)
            for oy in range(-6, 7):
                for ox in range(-6, 7):
                    px, py = cx + ox, cy + oy
                    if 0 <= px < w and 0 <= py < h and arr[py, px, 3] > 128:
                        r0, g0, b0 = int(arr[py, px, 0]), int(arr[py, px, 1]), int(arr[py, px, 2])
                        if g0 < 155 and b0 > r0 - 15:
                            if abs(ox) <= 2 and abs(oy) <= 2:
                                arr[py, px] = [255, 255, 255, 255]
                            else:
                                arr[py, px] = iris_col

    return (Image.fromarray(arr, "RGBA"), x0, y0)


def build_nyx_rig_512() -> dict:
    stand = extract_clean_base_512()
    alpha = stand[:, :, 3] > 128
    H, W = alpha.shape

    # Separate Left & Right cat ears so they can twitch/perk dynamically!
    l_ear_m = keep_largest_component(alpha & poly_mask(H, W, [(236, 26), (274, 26), (274, 68), (234, 68)]))
    r_ear_m = keep_largest_component(alpha & poly_mask(H, W, [(296, 30), (334, 30), (334, 68), (296, 68)]))
    head_base_m = keep_largest_component(
        alpha & poly_mask(H, W, [(208, 20), (344, 20), (344, 152), (314, 158), (242, 158), (208, 140)])
        & (~l_ear_m)
        & (~r_ear_m)
    )
    # Paint lilac hair underlay behind ear sockets so ear rotation never shows a skull gap
    head_stand = stand.copy()
    for yy in range(52, 72):
        for xx in list(range(244, 272)) + list(range(298, 326)):
            if not head_base_m[yy, xx] and alpha[min(H - 1, yy + 10), xx]:
                head_stand[yy, xx] = [196, 154, 224, 255]
                head_base_m[yy, xx] = True

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

    # Strip hanging arms/hands from torso so billowing IK bell galaxy sleeves replace them cleanly
    arm_strip_l = poly_mask(H, W, [(164, 178), (222, 180), (218, 312), (164, 312)])
    arm_strip_r = poly_mask(H, W, [(316, 180), (376, 180), (376, 310), (320, 310)])
    torso_base_m = (
        alpha
        & poly_mask(
            H,
            W,
            [
                (212, 134),
                (322, 134),
                (334, 296),
                (322, 310),
                (224, 310),
                (210, 296),
            ],
        )
        & (~arm_strip_l)
        & (~arm_strip_r)
        & (~poly_mask(H, W, [(208, 20), (344, 20), (344, 148), (208, 148)]))
    )
    torso_arr = stand.copy()
    torso_keep = keep_largest_component(torso_base_m)
    torso_arr[~torso_keep] = [0, 0, 0, 0]
    for yy in range(132, 156):
        for xx in range(252, 296):
            if torso_arr[yy, xx, 3] < 128 and stand[yy + 18, xx, 3] > 128:
                torso_arr[yy, xx] = [18, 16, 28, 255]

    tail_arr = stand.copy()
    tail_arr[~tail_m] = [0, 0, 0, 0]
    for xx in range(220, 256):
        for yy in range(292, 334):
            if tail_arr[yy, xx, 3] < 128 and 300 <= yy <= 326:
                if yy <= 303 or yy >= 323:
                    tail_arr[yy, xx] = [58, 34, 88, 255]
                else:
                    tail_arr[yy, xx] = [196, 154, 224, 255]

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

    heads = {
        expr: make_head_expression_variant(head_stand, head_base_m, expr)
        for expr in ("smile", "blink", "wink", "happy_fang", "focused_glow")
    }

    return {
        "stand": stand,
        "heads": heads,
        "l_ear": crop_part(stand, l_ear_m),
        "r_ear": crop_part(stand, r_ear_m),
        "torso": crop_part(torso_arr, torso_arr[:, :, 3] > 128),
        "tail": crop_part(tail_arr, tail_arr[:, :, 3] > 128),
        "l_thigh": tint_part(crop_part(stand, l_thigh_m), 0.86),
        "l_shin": tint_part(crop_part(stand, l_shin_m), 0.86),
        "l_boot": tint_part(crop_part(stand, l_boot_m), 0.88),
        "r_thigh": crop_part(stand, r_thigh_m),
        "r_shin": crop_part(stand, r_shin_m),
        "r_boot": crop_part(stand, r_boot_m),
        "joints": {
            "pelvis": (268.0, 296.0),
            "neck": (272.0, 146.0),
            "l_ear_root": (258.0, 62.0),
            "r_ear_root": (312.0, 62.0),
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
    scale_x: float = 1.0,
    scale_y: float = 1.0,
    wave_phase: float | None = None,
    wave_amp: float = 0.0,
):
    im, x0, y0 = part
    pw, ph = im.size
    px_local = pivot_part_space[0] - x0
    py_local = pivot_part_space[1] - y0

    # Optional sinuous horizontal wave deform anchored at rightmost root (for fluffy S-curve tail!)
    if wave_phase is not None and abs(wave_amp) > 0.1 and pw > 12:
        arr_w = np.array(im, dtype=np.uint8)
        pad = int(math.ceil(abs(wave_amp))) + 4
        out_w = np.zeros((ph + pad * 2, pw, 4), dtype=np.uint8)
        for x_col in range(pw):
            ut = clamp((px_local - x_col) / max(1.0, px_local), 0.0, 1.0)
            dy_w = int(round(math.sin(wave_phase - ut * 3.4) * wave_amp * (ut ** 1.15)))
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
    ex = sx + l1 * math.cos(base_ang + bend_dir * a)
    ey = sy + l1 * math.sin(base_ang + bend_dir * a)
    return (ex, ey, tx, ty)


# ==============================================================================
# 2. LOGICAL 160x120 BILLOWING GALAXY BELL SLEEVES & SCULPTED HANDS
# ==============================================================================
def put_px(arr: np.ndarray, x: int, y: int, col: tuple[int, int, int, int]):
    h, w, _ = arr.shape
    if MARGIN_160 <= x < w - MARGIN_160 and MARGIN_160 <= y < h - MARGIN_160:
        arr[y, x] = col


def _shade_rgba(col: tuple[int, int, int, int], mul: float) -> tuple[int, int, int, int]:
    return (
        max(0, min(255, int(round(col[0] * mul)))),
        max(0, min(255, int(round(col[1] * mul)))),
        max(0, min(255, int(round(col[2] * mul)))),
        col[3],
    )


def draw_galaxy_sleeve_arm_160(
    arr: np.ndarray,
    sh: tuple[float, float],
    el: tuple[float, float],
    wr: tuple[float, float],
    phase: int = 0,
    is_front: bool = True,
    paw_tuck: bool = False,
) -> tuple[float, float]:
    """
    Renders billowing oversized cosmic galaxy bell/lantern sleeves matching Nyx's reference sheet:
      - Smooth sleeve-local cosmic nebula swirls (cyan cloud on upper arm, magenta/violet bloom on bell puff)
      - Natural gravity drape sag along mid-forearm + plush gather into dark ribbed cuff
      - Clean 1px C_OUT_DARK outer silhouette contour on empty background only (no stripes, no torso clobber!)
    Returns adjusted wrist `(wx, wy)` where sculpted bare hand begins.
    """
    dx_f, dy_f = wr[0] - el[0], wr[1] - el[1]
    ln_f = max(1e-4, math.hypot(dx_f, dy_f))
    ux, uy = dx_f / ln_f, dy_f / ln_f
    # Stop sleeve cuff cleanly back from hand target so the sculpted hand emerges gracefully (`paw_tuck` stays tucked!)
    setback = 0.2 if paw_tuck else min(3.4, ln_f * 0.30)
    cuff_end = (wr[0] - ux * setback, wr[1] - uy * setback)

    sleeve_px: dict[tuple[int, int], tuple[int, int, int, int]] = {}
    shade_mul = 1.0 if is_front else 0.82
    star_shift = 0.08 * math.sin(phase * 0.42)

    def sample_nebula_color(u_arm: float, v_norm: float, is_cuff: bool) -> tuple[int, int, int, int]:
        if is_cuff:
            # Ribbed knitted darknavy cuff with subtle highlight stitch on upper face
            return _shade_rgba(C_CUFF_RIB if v_norm < 0.05 else C_CUFF_DARK, shade_mul)
        if v_norm > 0.62:
            return _shade_rgba(C_NAVY_DEEP, shade_mul)
        # Two rich smooth nebula clouds matching the hoodie torso swatch (no diagonal stripe noise!)
        c_cyan = math.exp(-((u_arm - 0.34 - star_shift * 0.2) ** 2) / 0.025 - ((v_norm + 0.12) ** 2) / 0.34)
        c_mag = math.exp(-((u_arm - 0.68 + star_shift * 0.2) ** 2) / 0.032 - ((v_norm - 0.05) ** 2) / 0.36)
        if c_cyan > 0.78:
            col = C_CYAN_LIGHT if (abs(u_arm - 0.34) < 0.05 and abs(v_norm + 0.12) < 0.18) else C_CYAN
        elif c_cyan > 0.44:
            col = C_HOODIE_BLUE
        elif c_mag > 0.76:
            col = C_PINK if (abs(u_arm - 0.69) < 0.05 and abs(v_norm) < 0.16) else C_MAGENTA
        elif c_mag > 0.42:
            col = C_VIOLET
        elif v_norm < -0.45:
            col = C_NAVY_MID
        else:
            col = C_NAVY_DARK
        return _shade_rgba(col, shade_mul)

    def raster_segment(p0: tuple[float, float], p1: tuple[float, float], r0: float, r1: float, u_off: float, u_span: float, allow_bell: bool):
        sdx, sdy = p1[0] - p0[0], p1[1] - p0[1]
        slen = max(0.5, math.hypot(sdx, sdy))
        nx_s, ny_s = -sdy / slen, sdx / slen
        if ny_s > 0:
            nx_s, ny_s = -nx_s, -ny_s  # ensure -perp is upper highlight side, +perp is lower drape side
        steps = max(8, int(math.ceil(slen * 3.0)))
        for s in range(steps + 1):
            t = s / steps
            u_arm = u_off + t * u_span
            sag_y = (0.75 * math.sin(t * math.pi)) if allow_bell else 0.0
            cx = lerp(p0[0], p1[0], t)
            cy = lerp(p0[1], p1[1], t) + sag_y
            # Classic bell lantern profile swells warmly around t=0.58 then gathers into ribbed cuff
            bell = (1.15 * math.sin(t * math.pi) ** 1.1) if allow_bell else 0.0
            rad = lerp(r0, r1, t) + bell
            is_cuff = allow_bell and t >= 0.80
            if is_cuff:
                rad = lerp(r1, 2.05 if paw_tuck else 1.85, (t - 0.80) / 0.20)
            ir = int(math.ceil(rad))
            for dv in range(-ir, ir + 1):
                if abs(dv) > rad + 0.15:
                    continue
                v_norm = clamp(dv / max(1.0, rad), -1.0, 1.0)
                px = int(round(cx - nx_s * dv))
                py = int(round(cy - ny_s * dv))
                if MARGIN_160 <= px < LOG_W - MARGIN_160 and MARGIN_160 <= py < LOG_H - MARGIN_160:
                    sleeve_px[(px, py)] = sample_nebula_color(u_arm, v_norm, is_cuff)

    # Upper arm & baggy bell forearm
    raster_segment(sh, el, 2.05, 2.85, 0.0, 0.45, allow_bell=False)
    raster_segment(el, cuff_end, 2.85, 2.85, 0.45, 0.55, allow_bell=True)

    # Sprinkle 2 crisp single-pixel starlight glints stably inside upper sleeve & bell center
    for st_pos in (lerp(sh[0], el[0], 0.55), lerp(sh[1], el[1], 0.55)), (lerp(el[0], cuff_end[0], 0.48), lerp(el[1], cuff_end[1], 0.48)):
        sx_i, sy_i = int(round(st_pos[0])), int(round(st_pos[1]))
        if (sx_i, sy_i) in sleeve_px:
            sleeve_px[(sx_i, sy_i)] = C_WHITE if is_front else C_CYAN_LIGHT

    # Selective 1px dark outer selout contour ONLY on empty transparent background pixels!
    sl_keys = set(sleeve_px.keys())
    for sx_p, sy_p in sl_keys:
        for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx_p, ny_p = sx_p + ox, sy_p + oy
            if (nx_p, ny_p) in sl_keys:
                continue
            if MARGIN_160 <= nx_p < LOG_W - MARGIN_160 and MARGIN_160 <= ny_p < LOG_H - MARGIN_160:
                if arr[ny_p, nx_p, 3] == 0:
                    put_px(arr, nx_p, ny_p, C_OUT_DARK)

    for (sx_p, sy_p), col in sleeve_px.items():
        put_px(arr, sx_p, sy_p, col)

    return cuff_end


def draw_sculpted_nyx_hand_160(
    arr: np.ndarray,
    wrist: tuple[float, float],
    elbow: tuple[float, float],
    pose: str = "relaxed_open",
    is_front: bool = True,
    tap_spark: bool = False,
):
    """
    Pixel-by-pixel sculpted 3-finger + upper thumb hand (ZERO oval/disc/3x3 blobs!).
    Uses forearm axis (ux, uy) and anatomically upper normal (nx, ny <= 0 for thumb!).
    Poses: 'relaxed_open', 'finger_tap', 'open_cast', 'enter_press', 'paw_boop'
    """
    dx = wrist[0] - elbow[0]
    dy = wrist[1] - elbow[1]
    ln = max(1e-4, math.hypot(dx, dy))
    ux, uy = dx / ln, dy / ln
    # Anatomically orient normal so (nx, ny) points UPWARD (-v = thumb side, +v = lower pinkie side)
    nx, ny = -uy, ux
    if ny > 0:
        nx, ny = -nx, -ny

    mul = 1.0 if is_front else 0.86
    c_l = _shade_rgba(C_SKIN_LIGHT, mul)
    c_m = _shade_rgba(C_SKIN_MID, mul)
    c_s = _shade_rgba(C_SKIN_SHAD, mul)

    if pose == "paw_boop":
        # Authentic Pose-B puffy dark cuff fold with 5 cute curled peach fingertips peeking out
        px0 = wrist[0] + ux * 1.4
        py0 = wrist[1] + uy * 1.4
        offsets = [
            (0.0, -0.6, c_l),
            (0.9, -0.6, c_l),
            (0.0, 0.4, c_m),
            (1.0, 0.4, c_m),
            (0.5, 1.3, c_s),
        ]
    elif pose == "finger_tap":
        # Clear emerging wrist + palm + raised thumb + crisp long pointing index finger + curled fingers
        px0, py0 = wrist[0] + ux * 0.6, wrist[1] + uy * 0.6
        offsets = [
            (0.0, -0.5, c_m),
            (0.0, 0.5, c_m),
            (0.9, -0.6, c_l),
            (0.9, 0.4, c_m),
            (1.7, -0.2, c_l),
            (1.7, 0.7, c_s),
            # Clearly separated raised upper thumb
            (1.0, -1.7, c_l),
            (1.7, -2.2, c_l),
            # Long crisp pointing index finger!
            (2.6, -0.8, c_l),
            (3.6, -0.9, c_l),
            (4.6, -0.9, c_l),
            # Softly curled lower fingers
            (2.6, 0.5, c_m),
            (2.5, 1.4, c_s),
        ]
    elif pose == "open_cast":
        # Expressive magic-casting open splayed anime hand clearly separated from cuff
        px0, py0 = wrist[0] + ux * 0.6, wrist[1] + uy * 0.6
        offsets = [
            (0.0, -0.4, c_m),
            (0.0, 0.6, c_m),
            (0.9, -0.5, c_l),
            (0.9, 0.5, c_m),
            (1.8, 0.0, c_l),
            # Splayed upper thumb
            (0.8, -1.8, c_l),
            (1.6, -2.6, c_l),
            # Index finger ray
            (2.6, -1.3, c_l),
            (3.8, -1.6, c_l),
            # Longest middle finger ray
            (2.9, -0.1, c_l),
            (4.2, -0.1, c_l),
            # Ring / pinky ray
            (2.5, 1.0, c_m),
            (3.6, 1.4, c_s),
        ]
    elif pose == "enter_press":
        # Flat extended palm & knuckles pressing clearly onto floating [ENTER] keycap
        px0, py0 = wrist[0] + ux * 0.6, wrist[1] + uy * 0.6
        offsets = [
            (0.0, -0.5, c_m),
            (0.0, 0.5, c_m),
            (0.9, -0.5, c_l),
            (0.9, 0.6, c_s),
            (1.8, -0.2, c_l),
            (1.8, 0.7, c_s),
            (1.4, -1.7, c_l),
            (2.7, -0.4, c_l),
            (3.8, -0.1, c_l),
            (2.8, 0.8, c_s),
            (3.7, 1.0, c_s),
        ]
    else:
        # 'relaxed_open': graceful open bare hand matching nyx_ex_base.jpg
        px0, py0 = wrist[0] + ux * 0.6, wrist[1] + uy * 0.6
        offsets = [
            (0.0, -0.4, c_m),
            (0.0, 0.5, c_m),
            (0.9, -0.5, c_l),
            (0.9, 0.5, c_m),
            (1.8, 0.0, c_l),
            # Clear thumb separated above palm
            (0.9, -1.6, c_l),
            (1.6, -2.2, c_l),
            # 3 tapered fingers fanning naturally
            (2.7, -0.8, c_l),
            (3.8, -0.9, c_l),
            (2.8, 0.2, c_m),
            (3.9, 0.4, c_s),
            (2.3, 1.1, c_s),
        ]

    skin_pts: dict[tuple[int, int], tuple[int, int, int, int]] = {}
    for ou, ov, col in offsets:
        sx = int(round(px0 + ux * ou + nx * ov))
        sy = int(round(py0 + uy * ou + ny * ov))
        if MARGIN_160 <= sx < LOG_W - MARGIN_160 and MARGIN_160 <= sy < LOG_H - MARGIN_160:
            skin_pts[(sx, sy)] = col

    # Selective 1px skin contour strictly on transparent pixels so thin fingers stay crisp
    skin_keys = set(skin_pts.keys())
    for sx_p, sy_p in skin_keys:
        for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx_p, ny_p = sx_p + ox, sy_p + oy
            if (nx_p, ny_p) in skin_keys:
                continue
            if MARGIN_160 <= nx_p < LOG_W - MARGIN_160 and MARGIN_160 <= ny_p < LOG_H - MARGIN_160:
                if arr[ny_p, nx_p, 3] == 0:
                    put_px(arr, nx_p, ny_p, C_SKIN_OUT)

    for (sx_p, sy_p), col in skin_pts.items():
        put_px(arr, sx_p, sy_p, col)

    if tap_spark and pose in ("finger_tap", "open_cast"):
        tip_x = int(round(px0 + ux * 5.0))
        tip_y = int(round(py0 + uy * 5.0))
        put_px(arr, tip_x, tip_y, C_WHITE)
        put_px(arr, tip_x + 1, tip_y, C_CYAN_LIGHT)
        put_px(arr, tip_x, tip_y - 1, C_CYAN)


def draw_neko_ai_orb_160(
    arr: np.ndarray,
    cx: float,
    cy: float,
    phase: int = 0,
    eye_mode: str = "sleep",
    scale: float = 0.88,
):
    """Draws powered-down Cosmic Neko-AI Orb beside Nyx ONLY on DEATH corpse frames (combat rows animate orb live in NyxEx.js!)."""
    ox, oy = int(round(cx)), int(round(cy))
    r = max(4, int(round(4.6 * scale)))
    for side in (-1, 1):
        ex = ox + side * (r - 1)
        ey = oy - r - 1
        put_px(arr, ex, ey, C_OUT_DARK)
        put_px(arr, ex - side, ey + 1, C_CYAN_DEEP)
    for dy in range(-r - 1, r + 2):
        for dx in range(-r - 1, r + 2):
            d = math.hypot(dx, dy)
            if d <= r + 0.7:
                put_px(arr, ox + dx, oy + dy, C_OUT_DARK if d > r - 0.1 else (C_NAVY_MID if d > r - 1.3 else C_NAVY_DARK))
    put_px(arr, ox - 1, oy, C_LILAC)
    put_px(arr, ox, oy, C_LILAC)
    put_px(arr, ox + 1, oy, C_LILAC)


def draw_mini_holo_prompt_160(
    arr: np.ndarray, cx: int, cy: int, kind: str = "panel", phase: int = 0
):
    """Compact glowing close-to-hand holographic UI key/panel strictly x_160 <= 112 (224 in 320px <= 262!)."""
    cx = min(cx, 111)
    cy = int(clamp(cy, 10, 106))
    if kind == "enter":
        # Luminous pulsing [ENTER] keycap near fingertip
        for y in range(cy - 3, cy + 4):
            for x in range(cx - 5, cx + 6):
                on_edge = y in (cy - 3, cy + 3) or x in (cx - 5, cx + 5)
                if on_edge:
                    put_px(arr, x, y, C_CYAN if phase % 2 == 0 else C_CYAN_LIGHT)
                else:
                    put_px(arr, x, y, C_HOODIE_BLUE if (x + y) % 2 == 0 else C_NAVY_DARK)
        for x in range(cx - 3, cx + 4):
            put_px(arr, x, cy, C_WHITE if x % 2 == 0 else C_GOLD)
    elif kind == "panel":
        for y in range(cy - 5, cy + 5):
            for x in range(cx - 4, cx + 5):
                on_edge = y in (cy - 5, cy + 4) or x in (cx - 4, cx + 4)
                if on_edge:
                    put_px(arr, x, y, C_MAGENTA if (x + y) % 2 == 0 else C_CYAN)
                elif y == cy - 4:
                    put_px(arr, x, y, C_CYAN)
                else:
                    put_px(arr, x, y, C_NAVY_MID if (x + y) % 3 == 0 else C_NAVY_DARK)
        put_px(arr, cx - 2, cy - 1, C_WHITE)
        put_px(arr, cx, cy - 1, C_CYAN_LIGHT)
        put_px(arr, cx + 2, cy + 1, C_GOLD)
        put_px(arr, cx - 1, cy + 2, C_PINK)


def render_pose_512_to_160(
    rig: dict,
    *,
    dx_160: float = 0.0,
    dy_160: float = 0.0,
    torso_deg: float = 0.0,
    torso_sx: float = 1.0,
    torso_sy: float = 1.0,
    head_deg: float = 0.0,
    expr: str = "smile",
    l_ear_deg: float = 0.0,
    r_ear_deg: float = 0.0,
    tail_deg: float = 0.0,
    tail_wave_phase: float | None = None,
    tail_wave_amp: float = 0.0,
    l_thigh_deg: float = 0.0,
    l_shin_deg: float = 0.0,
    l_boot_deg: float = 0.0,
    r_thigh_deg: float = 0.0,
    r_shin_deg: float = 0.0,
    r_boot_deg: float = 0.0,
    l_hand_160: tuple[float, float] | None = None,
    r_hand_160: tuple[float, float] | None = None,
    l_pose: str = "relaxed_open",
    r_pose: str = "relaxed_open",
    paw_tuck: bool = False,
    tap_spark: bool = False,
    mini_prompt: tuple[str, int, int] | None = None,
    crouch_drop_512: float = 0.0,
    prone_deg: float | None = None,
    phase: int = 0,
    lock_ground: bool = True,
) -> np.ndarray:
    """
    Assembles multi-part 512x512 rig -> clean 160x120 downsample -> IK billowing bell galaxy sleeves + sculpted hands.
    CRITICAL FIX: When `lock_ground=True`, normalize feet to `ANCHOR_HI_Y` FIRST, and THEN apply `dy_160 * S_HI`
    so bobs, walk bounces, Pose-B hops, and leaps actually translate cleanly vertically!
    """
    j = rig["joints"]
    hi = Image.new("RGBA", (HI_W, HI_H), (0, 0, 0, 0))

    # Build figure centered at baseline ANCHOR_HI_Y first (dy applied cleanly afterwards!)
    ax = ANCHOR_HI_X + dx_160 * S_HI
    ay = ANCHOR_HI_Y

    pelvis_x = ax
    pelvis_y = ay - (j["ground_y"] - j["pelvis"][1] - crouch_drop_512)

    rad_t = math.radians(torso_deg)

    def rot_torso(pt: tuple[float, float]) -> tuple[float, float]:
        vx = (pt[0] - j["pelvis"][0]) * torso_sx
        vy = (pt[1] - j["pelvis"][1]) * torso_sy
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
        paste_rotated_part(hi, rig[f"{side}_thigh"], hip_r, hip_d, th_deg)
        paste_rotated_part(hi, rig[f"{side}_shin"], kn_r, kn_d, sh_deg)
        paste_rotated_part(hi, rig[f"{side}_boot"], an_r, an_d, bt_deg)

    # 1. Flowing sinuous S-wave tail behind torso
    tail_d = rot_torso(j["tail_root"])
    paste_rotated_part(
        hi,
        rig["tail"],
        j["tail_root"],
        tail_d,
        tail_deg,
        wave_phase=tail_wave_phase,
        wave_amp=tail_wave_amp,
    )

    # 2. Legs (depth-shaded back leg `l`, then front leg `r`)
    place_leg("l", l_thigh_deg, l_shin_deg, l_boot_deg)
    place_leg("r", r_thigh_deg, r_shin_deg, r_boot_deg)

    # 3. Squash-stretch Hoodie Torso + Expressive Head + Independent Perking Ears
    paste_rotated_part(
        hi, rig["torso"], j["pelvis"], (pelvis_x, pelvis_y), torso_deg, scale_x=torso_sx, scale_y=torso_sy
    )
    neck_d = rot_torso(j["neck"])
    head_part = rig["heads"].get(expr, rig["heads"]["smile"])

    rad_h = math.radians(head_deg)

    def rot_head_pt(pt: tuple[float, float]) -> tuple[float, float]:
        vx = pt[0] - j["neck"][0]
        vy = pt[1] - j["neck"][1]
        return (
            neck_d[0] + vx * math.cos(rad_h) - vy * math.sin(rad_h),
            neck_d[1] + vx * math.sin(rad_h) + vy * math.cos(rad_h),
        )

    paste_rotated_part(hi, rig["l_ear"], j["l_ear_root"], rot_head_pt(j["l_ear_root"]), head_deg + l_ear_deg)
    paste_rotated_part(hi, rig["r_ear"], j["r_ear_root"], rot_head_pt(j["r_ear_root"]), head_deg + r_ear_deg)
    paste_rotated_part(hi, head_part, j["neck"], neck_d, head_deg)

    # Compute exact vertical shift: normalize standing feet onto ANCHOR_HI_Y first, THEN add dy_160 bounce/hop!
    total_shift_y = int(round(dy_160 * S_HI))
    arr_hi = np.array(hi)
    ys_hi = np.where(arr_hi[:, :, 3] > 128)[0]
    if len(ys_hi) > 0:
        if lock_ground and prone_deg is None:
            norm_shift = int(round(ANCHOR_HI_Y - float(ys_hi.max())))
            total_shift_y = norm_shift + int(round(dy_160 * S_HI))
        # Safety clamp so shifted pose never violates 4px cell border
        min_safe_y = int((MARGIN_160 + 2) * S_HI)
        max_safe_y = int((LOG_H - MARGIN_160 - 1) * S_HI)
        if int(ys_hi.min()) + total_shift_y < min_safe_y:
            total_shift_y = min_safe_y - int(ys_hi.min())
        if int(ys_hi.max()) + total_shift_y > max_safe_y:
            total_shift_y = max_safe_y - int(ys_hi.max())

    if abs(total_shift_y) > 0 and prone_deg is None:
        hi_shift = Image.new("RGBA", (HI_W, HI_H), (0, 0, 0, 0))
        hi_shift.alpha_composite(hi, (0, total_shift_y))
        hi = hi_shift
        pelvis_y += total_shift_y

    if prone_deg is not None:
        rot_hi = hi.rotate(-prone_deg, resample=Image.Resampling.NEAREST, expand=True)
        r_arr = np.array(rot_hi)
        ry, rx = np.where(r_arr[:, :, 3] > 128)
        hi_flat = Image.new("RGBA", (HI_W, HI_H), (0, 0, 0, 0))
        if len(ry) > 0:
            cx_body = (rx.min() + rx.max()) * 0.5
            bot_body = ry.max()
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

    # Prone DEATH corpse: add powered-down sleeping Neko-AI Orb beside head & return early
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

    # 4. Articulated 2-Bone IK Billowing Galaxy Bell Sleeves + Sculpted Hands (Back arm `l`, then Front arm `r`)
    l_sh_hi = rot_torso(j["l_sh"])
    r_sh_hi = rot_torso(j["r_sh"])
    l_sh_160 = (l_sh_hi[0] / S_HI, l_sh_hi[1] / S_HI)
    r_sh_160 = (r_sh_hi[0] / S_HI, r_sh_hi[1] / S_HI)

    base_pelvis_y_160 = (ANCHOR_HI_Y - (j["ground_y"] - j["pelvis"][1] - crouch_drop_512)) / S_HI
    actual_pelvis_shift_160 = pelvis_y / S_HI - base_pelvis_y_160

    if l_hand_160 is None:
        l_hand_160 = (l_sh_160[0] - 5.5, l_sh_160[1] + 18.0)
    else:
        l_hand_160 = (l_hand_160[0], l_hand_160[1] + actual_pelvis_shift_160)
    if r_hand_160 is None:
        r_hand_160 = (r_sh_160[0] + 6.5, r_sh_160[1] + 17.5)
    else:
        r_hand_160 = (r_hand_160[0], r_hand_160[1] + actual_pelvis_shift_160)

    lex, ley, lwx, lwy = solve_ik_2bone(
        l_sh_160[0], l_sh_160[1], l_hand_160[0], l_hand_160[1], 10.6, 10.2, bend_dir=-1
    )
    l_cuff = draw_galaxy_sleeve_arm_160(
        out160, l_sh_160, (lex, ley), (lwx, lwy), phase=phase, is_front=False, paw_tuck=paw_tuck
    )
    draw_sculpted_nyx_hand_160(
        out160, l_cuff, (lex, ley), pose=l_pose, is_front=False, tap_spark=False
    )

    rex, rey, rwx, rwy = solve_ik_2bone(
        r_sh_160[0], r_sh_160[1], r_hand_160[0], r_hand_160[1], 10.6, 10.2, bend_dir=1
    )
    r_cuff = draw_galaxy_sleeve_arm_160(
        out160, r_sh_160, (rex, rey), (rwx, rwy), phase=phase + 3, is_front=True, paw_tuck=paw_tuck
    )
    draw_sculpted_nyx_hand_160(
        out160, r_cuff, (rex, rey), pose=r_pose, is_front=True, tap_spark=tap_spark
    )

    # 5. Close-to-hand mini holo prompt / [ENTER] key strictly x_160 <= 112 (224 in 320px!)
    if mini_prompt is not None:
        mp_kind, mx_off, my_off = mini_prompt
        draw_mini_holo_prompt_160(
            out160,
            int(clamp(rwx + mx_off, 24, 111)),
            int(clamp(rwy + my_off, 10, 106)),
            kind=mp_kind,
            phase=phase,
        )

    out160[:MARGIN_160, :] = 0
    out160[LOG_H - MARGIN_160 :, :] = 0
    out160[:, :MARGIN_160] = 0
    out160[:, LOG_W - MARGIN_160 :] = 0

    preserve = np.zeros((LOG_H, LOG_W), dtype=bool)
    if mini_prompt is not None:
        mpx = int(clamp(rwx + mini_prompt[1], 24, 111))
        mpy = int(clamp(rwy + mini_prompt[2], 10, 106))
        preserve[max(0, mpy - 8) : min(LOG_H, mpy + 8), max(0, mpx - 8) : min(LOG_W, mpx + 8)] = True

    return seal_160_char_pinholes_and_leaks(
        out160,
        max_pinhole_lpx=6,
        min_detached_lpx=4,
        max_orphan_lpx=18,
        orphan_dist_lpx=5.0,
        bridge_max_lpx=56,
        bridge_gap_lpx=2.5,
        preserve_mask=preserve,
        safe_border_lpx=MARGIN_160,
    )


# ==============================================================================
# 3. FULL-BODY LIVELY 10-ROW x 30-COL CHOREOGRAPHY
# ==============================================================================
def build_character_sheet(rig: dict) -> np.ndarray:
    sheet = np.zeros((ROWS * CELL_H, COLS * CELL_W, 4), dtype=np.uint8)

    def put_cell(row: int, col: int, frame_160: np.ndarray):
        up2 = np.array(
            Image.fromarray(frame_160, "RGBA").resize((CELL_W, CELL_H), Image.Resampling.NEAREST),
            dtype=np.uint8,
        )
        y0, x0 = row * CELL_H, col * CELL_W
        sheet[y0 : y0 + CELL_H, x0 : x0 + CELL_W] = up2

    # ROW 0: IDLE (F00..F29) — Expressive double-beat idol-caster bounce, swaying bell-sleeves,
    #        cat ear twitches (F07..F10, F21..F24), blink (F14..F15), & sinuous S-wave tail!
    for c in range(COLS):
        t = (c / COLS) * math.tau
        bounce = -1.6 * abs(math.sin(t))
        knee_flex = 6.0 * (1.0 - math.cos(t * 2.0)) * 0.5
        sway = math.sin(t)
        ear_l_t = -12.0 * math.sin(((c - 7) / 3.0) * math.pi) if 7 <= c <= 10 else 0.0
        ear_r_t = 12.0 * math.sin(((c - 21) / 3.0) * math.pi) if 21 <= c <= 24 else 0.0
        expr = "blink" if c in (14, 15) else ("wink" if 22 <= c <= 24 else "smile")
        f = render_pose_512_to_160(
            rig,
            dx_160=1.2 * sway,
            dy_160=bounce,
            torso_deg=3.5 * sway + 1.5,
            torso_sy=1.0 - 0.015 * math.sin(t * 2.0),
            head_deg=-3.2 * sway + 2.0 * math.cos(t),
            expr=expr,
            l_ear_deg=ear_l_t - 3.0 * sway,
            r_ear_deg=ear_r_t + 3.0 * sway,
            tail_deg=-6.0 + 16.0 * math.sin(t - 0.4),
            tail_wave_phase=t * 2.0,
            tail_wave_amp=13.0,
            l_thigh_deg=-5.0 - knee_flex,
            l_shin_deg=knee_flex * 1.4,
            r_thigh_deg=6.0 + knee_flex * 0.8,
            r_shin_deg=-knee_flex * 1.2,
            l_hand_160=(43.0 + 3.0 * sway, 68.0 - 3.5 * math.sin(t)),
            r_hand_160=(74.0 + 3.5 * math.cos(t), 63.0 + 4.0 * sway),
            l_pose="relaxed_open",
            r_pose="open_cast" if c % 15 < 8 else "relaxed_open",
            phase=c,
            lock_ground=True,
        )
        put_cell(0, c, f)

    # ROW 1: WALK (F00..F29) — Energetic agile prance (+X crossover d1<=-14, d2<=-12, smooth topY delta <=4)
    for c in range(COLS):
        phi = ((c - 1.0) / COLS) * math.tau
        c_p = math.cos(phi)
        s_p = math.sin(phi)
        r_th = -26.0 * c_p + 16.0 * s_p + 2.0
        l_th = 26.0 * c_p - 16.0 * s_p - 4.0
        lift_bias = math.cos(phi - 0.45)
        l_sh = l_th + 13.5 + 11.5 * lift_bias
        r_sh = r_th + 13.5 - 11.5 * lift_bias

        bounce = -1.5 * abs(math.sin(((c % 15) / 15.0) * math.pi))
        arm_sw = 11.0 * c_p
        f = render_pose_512_to_160(
            rig,
            dx_160=0.0,
            dy_160=bounce,
            torso_deg=7.5 + 1.5 * math.sin(phi * 2.0),
            head_deg=2.5 + 2.2 * s_p,
            expr="smile",
            l_ear_deg=-4.0 * s_p,
            r_ear_deg=4.0 * s_p,
            tail_deg=-12.0 + 12.0 * math.sin(phi * 2.0),
            tail_wave_phase=phi * 2.0,
            tail_wave_amp=12.0,
            l_thigh_deg=l_th,
            l_shin_deg=l_sh,
            l_boot_deg=clamp((l_sh - l_th) * 0.4, -8.0, 14.0),
            r_thigh_deg=r_th,
            r_shin_deg=r_sh,
            r_boot_deg=clamp((r_sh - r_th) * 0.4, -8.0, 14.0),
            l_hand_160=(45.0 + arm_sw, 72.0 - abs(arm_sw) * 0.28),
            r_hand_160=(71.0 - arm_sw, 71.0 - abs(arm_sw) * 0.28),
            l_pose="relaxed_open",
            r_pose="relaxed_open",
            phase=c,
            lock_ground=True,
        )
        put_cell(1, c, f)

    # ROW 2: AUTO_ATTACK (4-Beat Holo-Prompt Quartet: [60,8], [68,7], [75,8], [83,7])
    # Pure ranged caster constraint: maxCellX <= 262 (x_160 <= 131), 0 detached >=16px at x >= 230!
    for c in range(COLS):
        if c < 8:
            # Beat 1 (F00..F07, snap F03): Forward caster lunge + swift fingertip holographic tap!
            u = c / 7.0
            snap = smoothstep(min(1.0, c / 3.0)) * (1.0 - max(0.0, (c - 3.0) / 4.0) * 0.45)
            f = render_pose_512_to_160(
                rig,
                dx_160=3.5 * snap,
                dy_160=-2.0 * math.sin(u * math.pi),
                torso_deg=11.0 * snap - 3.0 * (1.0 - snap),
                head_deg=4.0 * snap,
                expr="focused_glow" if c in (2, 3, 4) else "smile",
                l_ear_deg=-8.0 * snap,
                r_ear_deg=8.0 * snap,
                tail_deg=-16.0 + 24.0 * snap,
                tail_wave_phase=u * math.tau,
                tail_wave_amp=14.0,
                l_thigh_deg=-12.0 * snap,
                l_shin_deg=14.0 * snap,
                r_thigh_deg=14.0 * snap,
                r_shin_deg=-8.0 * snap,
                l_hand_160=(38.0 - 4.0 * snap, 64.0 - 3.0 * snap),
                r_hand_160=(73.0 + 12.0 * snap, 61.0 - 6.0 * snap),
                l_pose="open_cast",
                r_pose="finger_tap",
                tap_spark=c in (2, 3, 4),
                mini_prompt=("panel", 9, -2) if 1 <= c <= 5 else None,
                phase=c,
            )
        elif c < 15:
            # Beat 2 (F08..F14, snap F09): Coil back (-7 deg) -> Explosive baggy bell-sleeve swipe (+13 deg)!
            lc = c - 8
            u = lc / 6.0
            coil = max(0.0, 1.0 - lc / 1.5)
            snap = smoothstep(clamp((lc - 0.3) / 1.7, 0.0, 1.0)) * (1.0 - max(0.0, (lc - 2.5) / 4.0) * 0.45)
            f = render_pose_512_to_160(
                rig,
                dx_160=-2.5 * coil + 4.5 * snap,
                dy_160=-2.5 * math.sin(u * math.pi),
                torso_deg=-8.0 * coil + 13.5 * snap,
                head_deg=5.0 * snap - 4.0 * coil,
                expr="happy_fang" if lc in (1, 2, 3) else "smile",
                tail_deg=14.0 * coil - 18.0 * snap,
                tail_wave_phase=u * math.tau * 1.3,
                tail_wave_amp=16.0,
                l_thigh_deg=-14.0 * snap,
                l_shin_deg=18.0 * snap,
                r_thigh_deg=16.0 * snap,
                r_shin_deg=-6.0 * snap,
                l_hand_160=(42.0 - 5.0 * snap, 66.0 + 4.0 * snap),
                r_hand_160=(60.0 + 26.0 * snap, 68.0 - 14.0 * snap),
                l_pose="relaxed_open",
                r_pose="open_cast",
                tap_spark=lc in (1, 2, 3),
                mini_prompt=("panel", 9, -2) if lc in (1, 2) else None,
                phase=c,
            )
        elif c < 23:
            # Beat 3 (F15..F22, snap F17): Authentic POSE-B buoyant knee-tuck hop + double paw cuffs!
            lc = c - 15
            u = lc / 7.0
            hop = math.sin(clamp(u, 0.0, 1.0) * math.pi)
            f = render_pose_512_to_160(
                rig,
                dx_160=2.0 * hop,
                dy_160=-5.2 * hop,
                torso_deg=-8.0 * hop,
                head_deg=-7.0 * hop,
                expr="happy_fang",
                l_ear_deg=-10.0 * hop,
                r_ear_deg=10.0 * hop,
                tail_deg=24.0 * hop,
                tail_wave_phase=u * math.tau * 1.4,
                tail_wave_amp=18.0,
                l_thigh_deg=-26.0 * hop,
                l_shin_deg=34.0 * hop,
                l_boot_deg=18.0 * hop,
                r_thigh_deg=-12.0 * hop,
                r_shin_deg=30.0 * hop,
                r_boot_deg=16.0 * hop,
                l_hand_160=(56.0 + 5.0 * hop, 63.0 - 6.0 * hop),
                r_hand_160=(69.0 + 7.0 * hop, 60.0 - 7.0 * hop),
                l_pose="paw_boop",
                r_pose="paw_boop",
                paw_tuck=True,
                phase=c,
                lock_ground=True,
            )
        else:
            # Beat 4 (F23..F29, snap F25): Backstep hop -> Fierce forward [ENTER] command slam!
            lc = c - 23
            u = lc / 6.0
            snap = math.sin(clamp(u, 0.0, 1.0) * math.pi)
            slam = 1.0 if lc in (2, 3) else max(0.0, 1.0 - abs(lc - 2.5) / 3.0)
            f = render_pose_512_to_160(
                rig,
                dx_160=-4.0 * snap,
                dy_160=-4.2 * math.sin(min(1.0, u * 1.3) * math.pi),
                torso_deg=-6.0 if lc <= 1 else 12.0 * slam,
                head_deg=4.0 * slam,
                expr="focused_glow",
                l_ear_deg=-9.0 * slam,
                r_ear_deg=9.0 * slam,
                tail_deg=-20.0 * slam,
                tail_wave_phase=u * math.tau * 1.5,
                tail_wave_amp=15.0,
                l_thigh_deg=-16.0 * slam,
                l_shin_deg=20.0 * slam,
                r_thigh_deg=16.0 * slam,
                l_hand_160=(42.0 - 4.0 * slam, 62.0 - 4.0 * slam),
                r_hand_160=(74.0 + 10.0 * slam, 56.0 + 13.0 * slam),
                l_pose="open_cast",
                r_pose="enter_press",
                mini_prompt=("enter", 6, 5) if 1 <= lc <= 4 else None,
                phase=c,
                lock_ground=True,
            )
        put_cell(2, c, f)

    # ROW 3: SKILL (404 POP-UP CASCADE & COB CREATOR SEAL STAMP, F00..F29, maxX <= 262!)
    # Buoyant conductor leap (F00..F11) -> dynamic Creator Seal slam (F12..F22) -> cushioned A-landing (F23..F29)!
    for c in range(COLS):
        u = c / 29.0
        env = math.sin(u * math.pi)
        lift = -6.0 * math.sin(min(1.0, u * 1.25) * math.pi)
        stamp = 12 <= c <= 23
        stamp_u = smoothstep((c - 12) / 6.0) if stamp else 0.0
        f = render_pose_512_to_160(
            rig,
            dx_160=-2.0 if c < 10 else 3.5 * env,
            dy_160=lift,
            torso_deg=-10.0 * (1.0 - smoothstep(c / 11.0)) if c < 12 else (11.5 * math.sin(min(1.0, (c - 12) / 10.0) * math.pi)),
            head_deg=-6.0 if c < 11 else 4.0 * env,
            expr="focused_glow",
            l_ear_deg=-10.0 * env,
            r_ear_deg=10.0 * env,
            tail_deg=22.0 * math.sin(u * math.tau),
            tail_wave_phase=u * math.tau * 2.0,
            tail_wave_amp=17.0,
            l_thigh_deg=-16.0 * env,
            l_shin_deg=24.0 * env,
            r_thigh_deg=14.0 * env,
            r_shin_deg=16.0 * env,
            l_hand_160=(42.0 - 5.0 * env, 54.0 - 8.0 * env),
            r_hand_160=(76.0 + 10.0 * env, 50.0 + (18.0 * stamp_u if stamp else -8.0 * env)),
            l_pose="open_cast",
            r_pose="enter_press" if stamp else "open_cast",
            tap_spark=6 <= c <= 21,
            mini_prompt=("panel", 9, -2) if 4 <= c <= 11 else (("enter", 6, 5) if 14 <= c <= 22 else None),
            phase=c,
            lock_ground=c >= 23,
        )
        put_cell(3, c, f)

    # ROW 4: ULTIMATE (F00..F14: COB-OS STARLIGHT OVERCLOCK) & TRUE_ULTIMATE (F15..F29: GENESIS PROMPT)
    # Critical invariants: F11..F14 & F26..F29 cleanly planted at botY=229..231 with wide A-stance!
    for c in range(COLS):
        if c < 15:
            if c <= 10:
                lu = c / 10.0
                fl = -7.5 * math.sin(lu * math.pi)
                arm_raise = math.sin(lu * math.pi)
                f = render_pose_512_to_160(
                    rig,
                    dy_160=fl,
                    torso_deg=-9.0 * arm_raise,
                    head_deg=-7.0 * arm_raise,
                    expr="focused_glow",
                    l_ear_deg=-12.0 * arm_raise,
                    r_ear_deg=12.0 * arm_raise,
                    tail_deg=24.0 * math.sin(lu * math.tau),
                    tail_wave_phase=lu * math.tau * 2.2,
                    tail_wave_amp=18.0,
                    l_thigh_deg=-18.0 * arm_raise,
                    l_shin_deg=32.0 * arm_raise,
                    l_boot_deg=16.0 * arm_raise,
                    r_thigh_deg=10.0 * arm_raise,
                    r_shin_deg=20.0 * arm_raise,
                    l_hand_160=(38.0 - 6.0 * arm_raise, 52.0 - 10.0 * arm_raise),
                    r_hand_160=(77.0 + 8.0 * arm_raise, 50.0 - 10.0 * arm_raise),
                    l_pose="open_cast",
                    r_pose="open_cast",
                    tap_spark=True,
                    phase=c,
                    lock_ground=False,
                )
            else:
                lu = (c - 11) / 3.0
                f = render_pose_512_to_160(
                    rig,
                    torso_deg=4.0 * (1.0 - lu),
                    head_deg=2.0 * (1.0 - lu),
                    expr="focused_glow" if c <= 12 else "smile",
                    tail_deg=6.0 * (1.0 - lu),
                    tail_wave_phase=lu * 2.5,
                    tail_wave_amp=10.0,
                    l_thigh_deg=-12.0 + 4.0 * lu,
                    l_shin_deg=-6.0 + 3.0 * lu,
                    r_thigh_deg=12.0 - 4.0 * lu,
                    r_shin_deg=7.0 - 3.0 * lu,
                    l_hand_160=(44.0, 68.0 + 3.0 * lu),
                    r_hand_160=(73.0, 66.0 + 4.0 * lu),
                    l_pose="open_cast",
                    r_pose="relaxed_open",
                    phase=c,
                    lock_ground=True,
                )
        else:
            lc = c - 15
            if lc <= 9:
                # F15..F24: 2-stage Astral Ascension (heart gather -> sovereign cross-spread!)
                cu = lc / 9.0
                fl = -8.0 * smoothstep(min(1.0, lc / 3.5))
                gather = max(0.0, 1.0 - lc / 4.0)
                spread = smoothstep(clamp((lc - 3.0) / 5.0, 0.0, 1.0))
                f = render_pose_512_to_160(
                    rig,
                    dy_160=fl,
                    torso_deg=4.0 * gather - 10.0 * spread,
                    head_deg=3.0 * gather - 7.0 * spread,
                    expr="focused_glow",
                    l_ear_deg=-12.0 * spread,
                    r_ear_deg=12.0 * spread,
                    tail_deg=26.0 * math.sin(cu * math.tau * 1.4),
                    tail_wave_phase=cu * math.tau * 2.5,
                    tail_wave_amp=19.0,
                    l_thigh_deg=-20.0 * spread - 8.0 * gather,
                    l_shin_deg=34.0 * spread + 14.0 * gather,
                    r_thigh_deg=12.0 * spread,
                    r_shin_deg=18.0 * spread,
                    l_hand_160=(50.0 * gather + 34.0 * spread, 60.0 * gather + 44.0 * spread),
                    r_hand_160=(62.0 * gather + 80.0 * spread, 60.0 * gather + 42.0 * spread),
                    l_pose="open_cast",
                    r_pose="open_cast",
                    tap_spark=True,
                    phase=c,
                    lock_ground=False,
                )
            elif lc == 10:
                # F25: Explosive full-extension Supernova Command Strike!
                f = render_pose_512_to_160(
                    rig,
                    dx_160=4.0,
                    dy_160=-2.0,
                    torso_deg=13.0,
                    head_deg=5.0,
                    expr="focused_glow",
                    l_ear_deg=-10.0,
                    r_ear_deg=10.0,
                    tail_deg=-22.0,
                    tail_wave_phase=3.2,
                    tail_wave_amp=18.0,
                    l_thigh_deg=-16.0,
                    l_shin_deg=16.0,
                    r_thigh_deg=18.0,
                    l_hand_160=(38.0, 62.0),
                    r_hand_160=(85.0, 56.0),
                    l_pose="open_cast",
                    r_pose="open_cast",
                    tap_spark=True,
                    phase=c,
                    lock_ground=True,
                )
            else:
                # F26..F29: Clean grounded A-stance recovery
                ru = (lc - 11) / 3.0
                f = render_pose_512_to_160(
                    rig,
                    torso_deg=5.0 * (1.0 - ru),
                    head_deg=2.5 * (1.0 - ru),
                    expr="smile",
                    tail_deg=6.0 * (1.0 - ru),
                    tail_wave_phase=ru * 2.0,
                    tail_wave_amp=10.0,
                    l_thigh_deg=-12.0 + 4.0 * ru,
                    l_shin_deg=-8.0 + 3.0 * ru,
                    r_thigh_deg=13.0 - 4.0 * ru,
                    r_shin_deg=8.0 - 3.0 * ru,
                    l_hand_160=(45.0, 69.0 + 3.0 * ru),
                    r_hand_160=(74.0, 67.0 + 4.0 * ru),
                    l_pose="relaxed_open",
                    r_pose="relaxed_open",
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
                dx_160=-3.0 * math.sin(ru * math.pi),
                dy_160=-1.5 * math.sin(ru * math.pi),
                torso_deg=-14.0 * math.sin(ru * math.pi),
                head_deg=-12.0 * math.sin(ru * math.pi),
                expr="blink",
                tail_deg=-18.0,
                tail_wave_phase=ru * 3.0,
                tail_wave_amp=12.0,
                l_thigh_deg=-8.0,
                r_thigh_deg=12.0,
                l_hand_160=(42.0, 65.0),
                r_hand_160=(69.0, 63.0),
                l_pose="open_cast",
                r_pose="open_cast",
                phase=c,
                lock_ground=True,
            )
        elif c < 18:
            ku = (c - 7) / 10.0
            drop = 110.0 * ku
            f = render_pose_512_to_160(
                rig,
                dx_160=-2.0 * ku,
                torso_deg=-14.0 - 20.0 * ku,
                head_deg=-12.0 - 15.0 * ku,
                expr="blink",
                tail_deg=-20.0,
                l_thigh_deg=-26.0 * ku,
                l_shin_deg=56.0 * ku,
                r_thigh_deg=-18.0 * ku,
                r_shin_deg=60.0 * ku,
                crouch_drop_512=drop,
                l_hand_160=(46.0, 76.0 + 8.0 * ku),
                r_hand_160=(68.0, 76.0 + 8.0 * ku),
                l_pose="relaxed_open",
                r_pose="relaxed_open",
                phase=c,
                lock_ground=True,
            )
        else:
            pu = (c - 18) / 11.0
            f = render_pose_512_to_160(
                rig,
                torso_deg=-6.0,
                head_deg=-6.0,
                expr="blink",
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

    # ROW 6: DASH / CTRL+Z GLITCH BLINK (Sleek aerodynamic hover-glide with swept sleeves & S-tail)
    for c in range(COLS):
        u = c / 29.0
        tilt = 16.0 + 2.5 * math.sin(u * math.tau)
        f = render_pose_512_to_160(
            rig,
            dx_160=4.0,
            dy_160=-2.6 + 0.8 * math.sin(u * math.tau),
            torso_deg=tilt,
            head_deg=6.0,
            expr="focused_glow",
            l_ear_deg=-12.0,
            r_ear_deg=12.0,
            tail_deg=-24.0 + 6.0 * math.sin(u * math.tau),
            tail_wave_phase=u * math.tau * 2.0,
            tail_wave_amp=14.0,
            l_thigh_deg=-22.0,
            l_shin_deg=18.0,
            r_thigh_deg=18.0,
            r_shin_deg=10.0,
            l_hand_160=(34.0, 62.0),
            r_hand_160=(78.0, 60.0),
            l_pose="open_cast",
            r_pose="open_cast",
            tap_spark=True,
            phase=c,
            lock_ground=True,
        )
        put_cell(6, c, f)

    # ROW 7: CROUCH (Athletic low Firewall Guard & Cursor Counter, F00..F29)
    for c in range(COLS):
        u = c / 29.0
        drop = 96.0 + 6.0 * math.sin(u * math.tau)
        cast = 10 <= c <= 22
        f = render_pose_512_to_160(
            rig,
            torso_deg=10.0,
            head_deg=2.5,
            expr="focused_glow" if cast else "smile",
            tail_deg=12.0 * math.sin(u * math.tau),
            tail_wave_phase=u * math.tau,
            tail_wave_amp=12.0,
            l_thigh_deg=-34.0,
            l_shin_deg=34.0,
            r_thigh_deg=32.0,
            r_shin_deg=36.0,
            crouch_drop_512=drop,
            l_hand_160=(48.0, 80.0),
            r_hand_160=(79.0 if cast else 73.0, 74.0 if cast else 78.0),
            l_pose="paw_boop",
            r_pose="finger_tap" if cast else "open_cast",
            tap_spark=cast,
            paw_tuck=not cast,
            mini_prompt=("panel", 4, -2) if cast else None,
            phase=c,
            lock_ground=True,
        )
        put_cell(7, c, f)

    # ROW 8: JUMP / DODGE (Crisp anticipation squat -> dynamic airborne tuck -> cushioned landing)
    for c in range(COLS):
        u = c / 29.0
        if c < 4:
            drop = 68.0 * (c / 3.0)
            dy = 0.0
            th_l, sh_l, th_r, sh_r = -24.0, 28.0, 22.0, 26.0
            lock_g = True
            expr_j = "smile"
        elif c < 23:
            au = (c - 4) / 18.0
            drop = 0.0
            dy = -9.0 * math.sin(au * math.pi)
            th_l, sh_l, th_r, sh_r = -22.0, 34.0, 14.0, 26.0
            lock_g = False
            expr_j = "happy_fang"
        else:
            lu = (c - 23) / 6.0
            drop = 52.0 * (1.0 - lu)
            dy = 0.0
            th_l, sh_l, th_r, sh_r = -16.0 * (1.0 - lu), 16.0 * (1.0 - lu), 16.0 * (1.0 - lu), 16.0 * (1.0 - lu)
            lock_g = True
            expr_j = "smile"

        f = render_pose_512_to_160(
            rig,
            dy_160=dy,
            torso_deg=6.0,
            head_deg=-3.0 if c < 23 else 2.0,
            expr=expr_j,
            l_ear_deg=-8.0,
            r_ear_deg=8.0,
            tail_deg=18.0 * math.sin(u * math.tau),
            tail_wave_phase=u * math.tau * 2.0,
            tail_wave_amp=15.0,
            l_thigh_deg=th_l,
            l_shin_deg=sh_l,
            r_thigh_deg=th_r,
            r_shin_deg=sh_r,
            crouch_drop_512=drop,
            l_hand_160=(40.0, 58.0 + dy * 0.4),
            r_hand_160=(77.0, 56.0 + dy * 0.4),
            l_pose="open_cast",
            r_pose="open_cast",
            phase=c,
            lock_ground=lock_g,
        )
        put_cell(8, c, f)

    # ROW 9: VICTORY (Bouncy Pose-B Happy Fang Celebration, Waving Holo Hand & Happy Wagging Tail, minVictoryH >= 150)
    for c in range(COLS):
        u = c / 29.0
        hop = -3.4 * abs(math.sin(u * math.tau))
        wave = math.sin(u * math.tau * 2.0)
        f = render_pose_512_to_160(
            rig,
            dy_160=hop,
            torso_deg=-4.5 + 3.0 * wave,
            head_deg=-5.0 + 3.0 * wave,
            expr="happy_fang" if c % 20 < 10 else "wink",
            l_ear_deg=-10.0 * abs(wave),
            r_ear_deg=10.0 * abs(wave),
            tail_deg=20.0 * wave,
            tail_wave_phase=u * math.tau * 2.5,
            tail_wave_amp=18.0,
            l_thigh_deg=-6.0,
            r_thigh_deg=8.0,
            l_hand_160=(49.0, 62.0 - 3.0 * abs(wave)),
            r_hand_160=(76.0 + 4.0 * wave, 52.0 - 5.0 * abs(wave)),
            l_pose="paw_boop",
            r_pose="open_cast",
            tap_spark=True,
            paw_tuck=False,
            mini_prompt=("panel", 4, -2),
            phase=c,
            lock_ground=True,
        )
        put_cell(9, c, f)

    return sheet


# ==============================================================================
# 4. RADIANT TRANSLUCENT NEON VFX SPRITE SHEET (6240x1664, 8x30 @ 208x208)
# ==============================================================================
COB_GLYPHS = {
    "C": ["01110", "11011", "11000", "11000", "11000", "11011", "01110"],
    "o": ["00000", "00000", "01110", "11011", "11011", "11011", "01110"],
    "b": ["11000", "11000", "11110", "11011", "11011", "11011", "11110"],
    "4": ["00110", "01110", "11010", "11111", "00010", "00010", "00010"],
    "0": ["01110", "11011", "11011", "11011", "11011", "11011", "01110"],
    "A": ["01110", "11011", "11011", "11111", "11011", "11011", "11011"],
    "F": ["11111", "11000", "11000", "11110", "11000", "11000", "11000"],
    "K": ["11011", "11010", "11100", "11100", "11010", "11011", "11011"],
}


def put_vfx_px(arr: np.ndarray, x: int, y: int, col: tuple[int, int, int, int]):
    if 3 <= x < VFX_LOG - 3 and 3 <= y < VFX_LOG - 3:
        # Soft alpha-over blend onto 104x104 canvas for luminous layered glow
        a = col[3] / 255.0
        if a >= 0.99:
            arr[y, x] = col
        elif a > 0.01:
            dst = arr[y, x]
            da = dst[3] / 255.0
            out_a = a + da * (1.0 - a)
            if out_a > 1e-4:
                arr[y, x, 0] = int(round((col[0] * a + dst[0] * da * (1.0 - a)) / out_a))
                arr[y, x, 1] = int(round((col[1] * a + dst[1] * da * (1.0 - a)) / out_a))
                arr[y, x, 2] = int(round((col[2] * a + dst[2] * da * (1.0 - a)) / out_a))
                arr[y, x, 3] = min(255, int(round(out_a * 255)))


def add_vfx_radial_aura(arr: np.ndarray, cx: float, cy: float, r: float, col: tuple[int, int, int], max_a: int = 115):
    yy, xx = np.mgrid[0:VFX_LOG, 0:VFX_LOG]
    dist = np.hypot(xx - cx, yy - cy)
    norm = np.clip(1.0 - dist / max(1.0, r), 0.0, 1.0)
    # 4x4 Bayer crisp pixel-stepped falloff (no blurry bilinear gradients!)
    bayer = BAYER4[yy & 3, xx & 3]
    mask = (norm ** 1.45) > bayer * 0.85
    mask &= (xx >= 3) & (xx < VFX_LOG - 3) & (yy >= 3) & (yy < VFX_LOG - 3)
    ys, xs = np.where(mask)
    for y, x in zip(ys, xs):
        aa = int(clamp(norm[y, x] * max_a, 24, max_a))
        put_vfx_px(arr, int(x), int(y), (col[0], col[1], col[2], aa))


def draw_pixel_text_104(
    arr: np.ndarray,
    text: str,
    cx: int,
    cy: int,
    scale: int,
    fg: tuple[int, int, int, int],
    outline: tuple[int, int, int, int] = (24, 14, 58, 255),
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
                            put_vfx_px(arr, px0 + dx, py0 + dy, col)

    for oox, ooy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        blit_glyph_pass(outline, oox, ooy)
    blit_glyph_pass(fg, 0, 0)


def draw_star4_104(
    arr: np.ndarray,
    cx: int,
    cy: int,
    arm: int,
    col: tuple[int, int, int, int],
    core: tuple[int, int, int, int] = C_WHITE,
):
    for d in range(-arm, arm + 1):
        put_vfx_px(arr, cx + d, cy, col)
        put_vfx_px(arr, cx, cy + d, col)
    if arm >= 4:
        for d in range(-arm // 2, arm // 2 + 1):
            put_vfx_px(arr, cx + d, cy + d, col)
            put_vfx_px(arr, cx + d, cy - d, col)
    put_vfx_px(arr, cx, cy, core)


def draw_neon_glass_window_104(
    arr: np.ndarray,
    x0: int,
    y0: int,
    x1: int,
    y1: int,
    border: tuple[int, int, int, int],
    bar: tuple[int, int, int, int],
    phase: int = 0,
):
    """Translucent Bayer-stippled neon hologram glass panel with luminous rim (0 flat black boxes!)."""
    x0, x1 = max(4, x0), min(VFX_LOG - 5, x1)
    y0, y1 = max(4, y0), min(VFX_LOG - 5, y1)
    # Soft outer halo border
    halo_col = (border[0], border[1], border[2], 95)
    for x in range(x0 - 1, x1 + 2):
        put_vfx_px(arr, x, y0 - 1, halo_col)
        put_vfx_px(arr, x, y1 + 1, halo_col)
    for y in range(y0, y1 + 1):
        put_vfx_px(arr, x0 - 1, y, halo_col)
        put_vfx_px(arr, x1 + 1, y, halo_col)

    # Bayer-dithered translucent scanline interior
    for y in range(y0 + 1, y1):
        scan_hit = ((y + phase) % 3) == 0
        for x in range(x0 + 1, x1):
            if y <= y0 + 5:
                put_vfx_px(arr, x, y, (bar[0], bar[1], bar[2], 210))
            else:
                if (x + y + phase) % 2 == 0 or scan_hit:
                    put_vfx_px(arr, x, y, (34, 24, 78, 138 if scan_hit else 96))

    # Crisp 1px bright border + glowing white corners
    for x in range(x0, x1 + 1):
        put_vfx_px(arr, x, y0, border)
        put_vfx_px(arr, x, y1, border)
    for y in range(y0, y1 + 1):
        put_vfx_px(arr, x0, y, border)
        put_vfx_px(arr, x1, y, border)
    for cx_b, cy_b in ((x0, y0), (x1, y0), (x0, y1), (x1, y1)):
        put_vfx_px(arr, cx_b, cy_b, C_WHITE)


def draw_pixel_ring_104(
    arr: np.ndarray,
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    col: tuple[int, int, int, int],
    rot_phase: float = 0.0,
    dash: bool = False,
):
    steps = max(48, int(round(max(rx, ry) * 5.0)))
    for i in range(steps):
        if dash and ((i + int(rot_phase * 20)) % 6) >= 4:
            continue
        ang = (i / steps) * math.tau + rot_phase
        px = int(round(cx + math.cos(ang) * rx))
        py = int(round(cy + math.sin(ang) * ry))
        put_vfx_px(arr, px, py, col)


def draw_cob_crest_104(arr: np.ndarray, phase: int, grand: bool = False):
    """Radiant rotating Astrolabe + Nebula Aura + crystal-clear pixel 'Cob' Creator Seal."""
    cx, cy = 52, 52
    u = phase / 30.0
    ang = u * math.tau
    rad = 41 if grand else 34

    # 1. Soft Bayer cosmic radial glow behind emblem
    add_vfx_radial_aura(arr, cx, cy, rad + 6, (34, 211, 238) if grand else (192, 132, 252), 130 if grand else 108)
    add_vfx_radial_aura(arr, cx, cy, rad * 0.65, (217, 70, 239), 115)

    # 2. Counter-rotating octagram / astrolabe magic rings (visible live motion every frame!)
    for ring_idx, (r_cur, spd, col) in enumerate(
        (
            (rad, 1.0, C_CYAN),
            (rad * 0.84, -1.5, C_MAGENTA),
            (rad * 0.70, 2.0, C_GOLD if grand else C_CYAN_LIGHT),
        )
    ):
        draw_pixel_ring_104(arr, cx, cy, r_cur, r_cur, col, rot_phase=ang * spd, dash=(ring_idx == 1))
        verts = []
        pts_n = 8 if grand else 6
        for k in range(pts_n):
            a_v = ang * spd + k * (math.tau / pts_n)
            verts.append((cx + math.cos(a_v) * r_cur, cy + math.sin(a_v) * r_cur))
        for k in range(pts_n):
            v0 = verts[k]
            v1 = verts[(k + (3 if pts_n == 8 else 2)) % pts_n]
            steps = 28
            for s in range(steps + 1):
                uu = s / steps
                put_vfx_px(arr, int(round(lerp(v0[0], v1[0], uu))), int(round(lerp(v0[1], v1[1], uu))), (col[0], col[1], col[2], 215))

    # 3. 12 Solar-Astrolabe Crown Rays pulsing outward on Grand Genesis Core
    if grand:
        for k in range(12):
            a_r = ang + k * (math.tau / 12.0)
            for rr in range(28, 46):
                col_r = C_WHITE if rr > 42 else (C_GOLD if k % 2 == 0 else C_CYAN_LIGHT)
                if rr % 2 == 0 or rr > 36:
                    put_vfx_px(arr, int(round(cx + math.cos(a_r) * rr)), int(round(cy + math.sin(a_r) * rr)), col_r)

    # 4. Crisp pixel "Cob" badge at exact center
    fg_col = C_WHITE if phase % 5 == 0 else (C_GOLD if (grand and phase % 3 == 0) else C_CYAN_LIGHT)
    draw_pixel_text_104(
        arr,
        "Cob",
        cx,
        cy + 1,
        scale=3 if grand else 2,
        fg=fg_col,
        outline=(20, 10, 48, 255),
    )

    # 5. Orbiting corner brackets & 4-point star-sparks
    for k in range(8 if grand else 6):
        a_s = -ang * 1.5 + k * (math.tau / (8 if grand else 6))
        sx = int(round(cx + math.cos(a_s) * (rad + 2)))
        sy = int(round(cy + math.sin(a_s) * (rad + 2)))
        draw_star4_104(arr, sx, sy, 3 if k % 2 == 0 else 2, C_GOLD if k % 2 == 0 else C_WHITE)


def build_vfx_sheet() -> np.ndarray:
    vfx = np.zeros((VFX_ROWS * VFX_CELL, VFX_COLS * VFX_CELL, 4), dtype=np.uint8)

    for r in range(VFX_ROWS):
        for c in range(VFX_COLS):
            cell = np.zeros((VFX_LOG, VFX_LOG, 4), dtype=np.uint8)
            u = c / 30.0
            cx, cy = 52, 52

            if r == 0:
                # Row 0: 3D-Spinning Neon Star-Prism Window & Starburst Trail
                spin_w = max(8, int(round(26.0 * (0.35 + 0.65 * abs(math.cos(u * math.tau))))))
                bob = int(round(3.5 * math.sin(u * math.tau * 2.0)))
                add_vfx_radial_aura(cell, cx, cy + bob, 36, (34, 211, 238), 115)
                draw_neon_glass_window_104(
                    cell, cx - spin_w, cy - 22 + bob, cx + spin_w, cy + 22 + bob, C_CYAN, C_MAGENTA, phase=c
                )
                draw_star4_104(cell, cx, cy + 2 + bob, 7, C_WHITE, C_GOLD)
                for k in range(3):
                    a_s = u * math.tau + k * 2.1
                    draw_star4_104(cell, int(cx + math.cos(a_s) * 18), int(cy + bob + math.sin(a_s) * 14), 2, C_CYAN_LIGHT)
            elif r == 1:
                # Row 1: Translucent Neon "404" Hologram Alert Window with Glitch Pulse
                pulse = int(round(2.5 * math.sin(u * math.tau * 2.0)))
                glitch = ((c % 7) - 3) if c % 5 == 0 else 0
                add_vfx_radial_aura(cell, cx, cy + pulse, 44, (217, 70, 239), 110)
                draw_neon_glass_window_104(
                    cell, 14 + glitch, 22 + pulse, 90 + glitch, 82 + pulse, C_MAGENTA, C_CYAN, phase=c
                )
                draw_pixel_text_104(cell, "404", cx + glitch, cy + 3 + pulse, scale=2, fg=C_GOLD if c % 3 == 0 else C_WHITE)
                draw_star4_104(cell, 84, 26 + pulse, 3, C_CYAN_LIGHT)
                draw_star4_104(cell, 20, 78 + pulse, 2, C_GOLD)
            elif r == 2:
                # Row 2: Rotating "Cob" Creator Astrolabe Seal
                draw_cob_crest_104(cell, c, grand=False)
            elif r == 3:
                # Row 3: 2.5D Perspective Cosmic Floor Mandala & Dashed Marquee Ring
                add_vfx_radial_aura(cell, cx, cy, 46, (168, 85, 247), 115)
                ang = u * math.tau
                draw_pixel_ring_104(cell, cx, cy, 42, 42, C_CYAN, rot_phase=ang, dash=True)
                draw_pixel_ring_104(cell, cx, cy, 34, 34, C_MAGENTA, rot_phase=-ang * 1.5, dash=False)
                draw_pixel_ring_104(cell, cx, cy, 24, 24, C_GOLD, rot_phase=ang * 2.0, dash=True)
                for k in range(6):
                    a_s = ang + k * (math.tau / 6.0)
                    draw_star4_104(cell, int(cx + math.cos(a_s) * 38), int(cy + math.sin(a_s) * 38), 3, C_WHITE if k % 2 == 0 else C_GOLD)
                draw_star4_104(cell, cx, cy, 9, C_CYAN_LIGHT, C_WHITE)
            elif r == 4:
                # Row 4: Luminous Spindle-Tapered Nebula Plasma Pillar & Supernova Ray Segment!
                # Taper cleanly toward top & bottom (y=4..100) so single pillars erupt high AND segments chain cleanly
                add_vfx_radial_aura(cell, cx, cy, 46, (34, 211, 238), 118)
                for y in range(6, 98):
                    yv = (y - 6) / 92.0
                    taper = math.sin(yv * math.pi)
                    hw = 3.0 + 18.0 * (taper ** 0.72) + 2.5 * math.sin(yv * 14.0 - u * math.tau * 2.0)
                    for dx in range(-int(hw), int(hw) + 1):
                        nx = abs(dx) / max(1.0, hw)
                        if nx < 0.28:
                            col = C_WHITE
                        elif nx < 0.56:
                            col = C_CYAN_LIGHT if ((y + c) % 4 != 0) else C_GOLD
                        elif nx < 0.80:
                            col = C_MAGENTA if (y % 6 < 3) else C_CYAN
                        else:
                            col = (168, 85, 247, 165)
                        put_vfx_px(cell, cx + dx, y, col)
                # Spiraling double-helix energy beads ascending the pillar
                for k in range(8):
                    yk = int(round(12 + ((k / 8.0 - u) % 1.0) * 78))
                    xk = cx + int(round(math.sin(yk * 0.14 + u * math.tau) * 18))
                    draw_star4_104(cell, xk, yk, 3, C_GOLD if k % 2 == 0 else C_WHITE)
            elif r == 5:
                # Row 5: Animated Cyber-Neko Orbital Terminal Drone (spinning holographic waveform)
                bob = int(round(4.0 * math.sin(u * math.tau)))
                add_vfx_radial_aura(cell, cx, cy + bob, 40, (192, 132, 252), 115)
                # Tiny neon neko-ears atop drone window!
                for side in (-1, 1):
                    ex = cx + side * 18
                    for hi in range(7):
                        for ddx in range(-hi // 2, hi // 2 + 1):
                            put_vfx_px(cell, ex + ddx, 14 + bob + hi, C_CYAN if side < 0 else C_MAGENTA)
                draw_neon_glass_window_104(
                    cell, 20, 21 + bob, 84, 83 + bob, C_LILAC if c % 2 == 0 else C_CYAN, C_CYAN, phase=c
                )
                for row_y in (34, 46, 58, 68):
                    w_bar = 18 + int(round(16 * (0.5 + 0.5 * math.sin(u * math.tau * 2.0 + row_y))))
                    bcol = C_GOLD if row_y == 46 else (C_CYAN_LIGHT if row_y % 24 == 0 else C_PINK)
                    for xx in range(28, min(78, 28 + w_bar)):
                        put_vfx_px(cell, xx, row_y + bob, bcol)
                        put_vfx_px(cell, xx, row_y + 1 + bob, bcol)
                draw_star4_104(cell, 74, 72 + bob, 4, C_GOLD, C_WHITE)
            elif r == 6:
                # Row 6: Glowing "AFK" Holographic Neko Decoy
                jitter = ((c % 3) - 1) if c % 2 == 0 else 0
                add_vfx_radial_aura(cell, cx + jitter, cy, 42, (34, 211, 238), 115)
                draw_neon_glass_window_104(
                    cell, 20 + jitter, 24, 84 + jitter, 82, C_CYAN, C_VIOLET, phase=c
                )
                for side in (-1, 1):
                    ex = cx + jitter + side * 15
                    for h_i in range(9):
                        for ddx in range(-h_i // 2, h_i // 2 + 1):
                            put_vfx_px(cell, ex + ddx, 14 + h_i, C_MAGENTA if h_i < 6 else C_CYAN_LIGHT)
                draw_pixel_text_104(cell, "AFK", cx + jitter, cy + 4, scale=2, fg=C_CYAN_LIGHT if c % 3 else C_WHITE)
            elif r == 7:
                # Row 7: Colossal Grand "Cob" Creator Genesis Solar-Astrolabe Core
                draw_cob_crest_104(cell, c, grand=True)

            # Enforce strict >= 4px transparent margin on 208x208 cell (>= 2px in 104x104)
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
# 5. PORTRAIT & HERO ICONS ROW 11 (UNCHANGED SAFE OUTPUTS)
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
    row = Image.new("RGBA", (384, 64), (0, 0, 0, 0))
    for col_idx in range(6):
        c = np.zeros((64, 64, 4), dtype=np.uint8)
        c[:, :] = [18, 14, 38, 255]
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
            dr.polygon([(14, 24), (20, 10), (26, 22)], fill=C_CYAN, outline=C_OUT_DARK)
            dr.polygon([(50, 24), (44, 10), (38, 22)], fill=C_MAGENTA, outline=C_OUT_DARK)
            dr.ellipse([16, 18, 48, 50], fill=C_NAVY_DARK, outline=C_CYAN, width=3)
            dr.ellipse([25, 27, 39, 41], fill=C_MAGENTA, outline=C_WHITE, width=2)
        elif col_idx == 1:
            dr.rectangle([8, 12, 56, 52], fill=C_NAVY_DARK, outline=C_MAGENTA, width=3)
            dr.rectangle([10, 14, 54, 21], fill=C_CYAN)
            arr_i = np.array(im_c)
            for ox, oy in ((20, 28), (32, 28), (44, 28)):
                arr_i[oy - 2 : oy + 10, ox - 3 : ox + 5] = C_CYAN_LIGHT
            arr_i[31:37, 22:25] = C_NAVY_DARK
            arr_i[31:35, 32:34] = C_NAVY_DARK
            arr_i[24:28, 40:44] = C_GOLD
            im_c = Image.fromarray(arr_i, "RGBA")
        elif col_idx == 2:
            for k in range(6):
                ang = k * (math.tau / 6.0)
                wx = int(round(32 + math.cos(ang) * 18))
                wy = int(round(32 + math.sin(ang) * 18))
                dr.rectangle([wx - 6, wy - 5, wx + 6, wy + 5], fill=C_NAVY_MID, outline=C_CYAN if k % 2 == 0 else C_MAGENTA, width=2)
            dr.ellipse([25, 25, 39, 39], fill=C_WHITE, outline=C_GOLD, width=2)
        elif col_idx == 3:
            dr.polygon([(32, 6), (58, 32), (32, 58), (6, 32)], fill=C_NAVY_DARK, outline=C_GOLD, width=3)
            dr.polygon([(32, 13), (51, 32), (32, 51), (13, 32)], fill=(36, 20, 72, 255), outline=C_CYAN, width=2)
            dr.ellipse([24, 24, 40, 40], fill=C_MAGENTA, outline=C_WHITE, width=2)
        elif col_idx == 4:
            dr.polygon([(12, 34), (28, 16), (28, 26), (52, 26), (52, 42), (28, 42), (28, 52)], fill=C_CYAN, outline=C_OUT_DARK)
            dr.rectangle([34, 30, 48, 38], fill=C_MAGENTA)
        else:
            dr.polygon([(14, 12), (50, 12), (50, 36), (32, 54), (14, 36)], fill=C_NAVY_MID, outline=C_LILAC, width=3)
            dr.rectangle([28, 20, 36, 40], fill=C_CYAN_LIGHT)
            dr.rectangle([22, 26, 42, 34], fill=C_CYAN_LIGHT)
        arr_c = np.array(im_c)
        arr_c[1, 1:63] = C_CYAN if col_idx in (0, 2, 4) else C_MAGENTA
        arr_c[1:63, 1] = C_LILAC
        draw_icon_bezel(arr_c)
        row.paste(Image.fromarray(arr_c, "RGBA"), (col_idx * 64, 0))
    return row


def append_hero_icons_row11():
    orig_full = Image.open(OUT_HERO_ICONS).convert("RGBA")
    base_rows = orig_full.crop((0, 0, 384, 704))
    new_atlas = Image.new("RGBA", (384, 768), (0, 0, 0, 0))
    new_atlas.paste(base_rows, (0, 0))
    new_atlas.paste(build_nyx_icon_row11(), (0, 704))
    new_atlas.save(OUT_HERO_ICONS, optimize=True)
    check = Image.open(OUT_HERO_ICONS).convert("RGBA")
    assert np.array_equal(np.array(base_rows), np.array(check.crop((0, 0, 384, 704)))), "Rows 0..10 altered!"


# ==============================================================================
# 6. SELF-AUDIT & COMPACT QA STRIPS
# ==============================================================================
def verify_and_dump_qa(sheet: np.ndarray, vfx: np.ndarray):
    clips = 0
    row_vert_spans = {}
    for r in range(ROWS):
        trans = 0
        min_tops, max_tops = [], []
        for c in range(COLS):
            cell = sheet[r * CELL_H : (r + 1) * CELL_H, c * CELL_W : (c + 1) * CELL_W]
            a = cell[:, :, 3] > 0
            ys = np.where(a)[0]
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
    assert clips == 0, f"Sheet 4px clips={clips} != 0"
    assert row_vert_spans[0][0] >= 4 and row_vert_spans[2][0] >= 6 and row_vert_spans[3][0] >= 6, (
        f"Expected visible vertical motion on Row 0/2/3, got {row_vert_spans}"
    )

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
        assert delta_t <= 4, f"Walk topY delta F{c}->{c+1} = {delta_t}"
    assert max(boot_spans) >= 56, f"Walk maxBootSpan={max(boot_spans)}"
    assert min(boot_spans) <= max(boot_spans) * 0.55, f"Walk min/max={min(boot_spans)}/{max(boot_spans)}"
    d1 = stance_xs[6] - stance_xs[1]
    d2 = stance_xs[21] - stance_xs[16]
    assert d1 <= -6.0 and d2 <= -6.0, f"Walk crossover deltas d1={d1:.2f}, d2={d2:.2f}"

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

    # Row 4 grounded recovery F12..F14 & F26..F29
    for cc in (12, 13, 14, 26, 27, 28, 29):
        cell = sheet[4 * CELL_H : 5 * CELL_H, cc * CELL_W : (cc + 1) * CELL_W][:, :, 3] > 0
        assert 228 <= int(np.where(cell)[0].max()) <= 232, f"Row 4 F{cc} not grounded!"

    for cc in range(26, 30):
        dc = sheet[5 * CELL_H : 6 * CELL_H, cc * CELL_W : (cc + 1) * CELL_W][:, :, 3] > 0
        dys, dxs = np.where(dc)
        dh = int(dys.max() - dys.min() + 1)
        assert 64 <= dh <= 104 and dxs.min() >= 18 and dxs.max() <= 302, f"Death F{cc} h={dh} x={dxs.min()}..{dxs.max()}"
        vc = sheet[9 * CELL_H : 10 * CELL_H, cc * CELL_W : (cc + 1) * CELL_W][:, :, 3] > 0
        vys = np.where(vc)[0]
        vh = int(vys.max() - vys.min() + 1)
        assert vh >= 150, f"Victory F{cc} h={vh}"

    vclips = 0
    for r in range(VFX_ROWS):
        vtrans = 0
        for c in range(VFX_COLS):
            vc = vfx[r * VFX_CELL : (r + 1) * VFX_CELL, c * VFX_CELL : (c + 1) * VFX_CELL]
            va = vc[:, :, 3] > 0
            if np.any(va[:4, :]) or np.any(va[-4:, :]) or np.any(va[:, :4]) or np.any(va[:, -4:]):
                vclips += 1
            if c > 0:
                vp = vfx[r * VFX_CELL : (r + 1) * VFX_CELL, (c - 1) * VFX_CELL : c * VFX_CELL]
                if not np.array_equal(vc[::2, ::2], vp[::2, ::2]):
                    vtrans += 1
        assert vtrans == 29, f"VFX Row {r} transitions={vtrans} != 29"
    assert vclips == 0, f"VFX 4px clips={vclips}"

    print(
        f"[OK] Quantitative gates passed: sheet={sheet.shape[1]}x{sheet.shape[0]} (0 clips), "
        f"vertSpans={row_vert_spans[0]}/{row_vert_spans[2]}/{row_vert_spans[3]}, "
        f"walk=({min(boot_spans)}..{max(boot_spans)}, d1={d1:.1f}, d2={d2:.1f}), "
        f"vfx={vfx.shape[1]}x{vfx.shape[0]} (0 4px clips, 29/29 all rows)"
    )

    SCRATCH_DIR.mkdir(parents=True, exist_ok=True)
    picks = [
        ("R0 IDLE F00", 0, 0),
        ("R0 IDLE F07", 0, 7),
        ("R1 WALK F01", 1, 1),
        ("R2 BEAT1 F03", 2, 3),
        ("R2 BEAT2 F09", 2, 9),
        ("R2 POSE-B F18", 2, 18),
        ("R2 ENTER F25", 2, 25),
        ("R3 SKILL F08", 3, 8),
        ("R3 SKILL F16", 3, 16),
        ("R4 ULT F05", 4, 5),
        ("R4 ULT F13", 4, 13),
        ("R4 T-ULT F25", 4, 25),
        ("R5 DEATH F28", 5, 28),
        ("R9 VICTORY F08", 9, 8),
    ]
    cols_n, rows_n = 7, 2
    strip = Image.new("RGBA", (cols_n * CELL_W, rows_n * CELL_H), (32, 18, 48, 255))
    dr = ImageDraw.Draw(strip)
    for idx, (lbl, rr, cc) in enumerate(picks):
        gx, gy = (idx % cols_n) * CELL_W, (idx // cols_n) * CELL_H
        cell_im = Image.fromarray(
            sheet[rr * CELL_H : (rr + 1) * CELL_H, cc * CELL_W : (cc + 1) * CELL_W], "RGBA"
        )
        strip.alpha_composite(cell_im, (gx, gy))
        dr.rectangle([gx, gy, gx + CELL_W - 1, gy + CELL_H - 1], outline=(100, 116, 139, 255))
        dr.text((gx + 6, gy + 4), lbl, fill=(253, 224, 71, 255))
    strip.save(SCRATCH_DIR / "nyx_ex_sheet_check.png")

    v_strip = Image.new("RGBA", (8 * VFX_CELL, VFX_CELL + 24), (16, 14, 34, 255))
    vdr = ImageDraw.Draw(v_strip)
    v_labels = ["R0 PRISM", "R1 404", "R2 Cob", "R3 SEAL", "R4 PILLAR", "R5 ORB", "R6 AFK", "R7 CORE"]
    for vr in range(8):
        cell_im = Image.fromarray(
            vfx[vr * VFX_CELL : (vr + 1) * VFX_CELL, 10 * VFX_CELL : 11 * VFX_CELL], "RGBA"
        )
        v_strip.alpha_composite(cell_im, (vr * VFX_CELL, 24))
        vdr.text((vr * VFX_CELL + 8, 6), v_labels[vr], fill=(34, 211, 238, 255))
    v_strip.save(SCRATCH_DIR / "nyx_ex_vfx_check.png")


def main():
    rig = build_nyx_rig_512()
    sheet = build_character_sheet(rig)
    Image.fromarray(sheet, "RGBA").save(OUT_SHEET, optimize=True)
    vfx = build_vfx_sheet()
    Image.fromarray(vfx, "RGBA").save(OUT_VFX, optimize=True)
    build_portrait_128()
    append_hero_icons_row11()
    verify_and_dump_qa(sheet, vfx)


if __name__ == "__main__":
    main()
