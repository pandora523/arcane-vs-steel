#!/usr/bin/env python3
"""
IGNIS SOL EX (`mage_ex`) — Next-Gen Wide-Canvas (`320x240` cell, `9600x2400` 30x10 sheet)
FFBE / Last Cloudia Multi-Keypose + 4-Band Serrated Solar-Flame Smear Pipeline.

Outputs:
  - `assets/sprites/mage_ex_sheet.png`    (9600x2400, 30 cols x 10 rows @ 320x240, 2x2 pixel blocks)
  - `assets/sprites/mage_ex_portrait.png` (128x128, 2x2 pixel blocks)
  - Untracked QA contact sheets in scratch directory (`--scratch-dir` or default brain scratch)

Invariants enforced:
  - 100% 2x2 integer pixel blocks (authored at 160x120 logical, upscaled 2x NEAREST -> 320x240)
  - Anchor `(56, 115)` logical -> `(112, 230)` output (`208px` forward canvas reach!)
  - Binary alpha (`0` or `255`), `4px` output safety margin (`0/300` border clips)
  - `29/29` active transitions on all 10 rows
"""

import argparse
import math
import os
from collections import deque

import numpy as np
from PIL import Image, ImageDraw

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE_JPG = os.path.join(REPO_ROOT, "assets", "sprites", "mage_ex_base.jpg")
KEYPOSES_JPG = os.path.join(REPO_ROOT, "assets", "sprites", "mage_ex_keyposes_ref.jpg")
PORTRAIT_JPG = os.path.join(REPO_ROOT, "assets", "sprites", "mage_ex_portrait_raw.jpg")

OUT_SHEET = os.path.join(REPO_ROOT, "assets", "sprites", "mage_ex_sheet.png")
OUT_PORTRAIT = os.path.join(REPO_ROOT, "assets", "sprites", "mage_ex_portrait.png")

DEFAULT_SCRATCH = "/Users/rei/.gemini/antigravity/brain/5416474b-0e5f-4471-85c8-b7a88055e218/scratch"

LOG_W, LOG_H = 160, 120
CELL_W, CELL_H = 320, 240
COLS, ROWS = 30, 10
AX, AY = 56, 115  # -> (112, 230) in 320x240 output
TARGET_STAND_H = 87

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
    / 16.0
)

# Helios Spell-Blade Armor, Flame-Crown, and Solar Astrolabe Palette
C_OUT = (20, 8, 10, 255)
C_COAT_DARK = (38, 14, 18, 255)
C_COAT_MID = (68, 20, 26, 255)
C_COAT_CRIMSON = (136, 28, 30, 255)
C_COAT_BRIGHT = (185, 38, 34, 255)
C_GOLD_DARK = (146, 78, 18, 255)
C_GOLD_MID = (217, 138, 28, 255)
C_GOLD_LIGHT = (250, 204, 56, 255)
C_GOLD_SPEC = (255, 247, 194, 255)
C_SKIN_SHADOW = (188, 126, 94, 255)
C_SKIN_LIGHT = (238, 182, 142, 255)

# 4-Band Solar-Flame Serrated Smear & Blade Palette (#ffffff -> #fef08a -> #fb923c -> #dc2626)
C_FLAME_CORE = (255, 255, 255, 255)
C_FLAME_GOLD = (254, 240, 138, 255)
C_FLAME_ORANGE = (251, 146, 60, 255)
C_FLAME_CRIMSON = (220, 38, 38, 255)
C_FLAME_DEEP = (127, 29, 29, 255)
C_ECLIPSE_VIOLET = (88, 28, 135, 255)
C_ECLIPSE_MAGENTA = (192, 38, 211, 255)


def clamp(v, lo, hi):
    return lo if v < lo else (hi if v > hi else v)


def lerp(a, b, t):
    return a + (b - a) * t


def smoothstep(t):
    t = clamp(t, 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


# ==============================================================================
# 1. CLEAN WHITE-BG SEGMENTATION & CEL QUANTIZATION
# ==============================================================================
def keep_largest_component(mask, min_keep_area=0):
    h, w = mask.shape
    vis = np.zeros((h, w), dtype=bool)
    comps = []
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not vis[y, x]:
                q = deque([(x, y)])
                vis[y, x] = True
                pts = []
                while q:
                    cx, cy = q.popleft()
                    pts.append((cx, cy))
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and not vis[ny, nx] and mask[ny, nx]:
                            vis[ny, nx] = True
                            q.append((nx, ny))
                comps.append(pts)
    if not comps:
        return mask
    comps.sort(key=len, reverse=True)
    out = np.zeros((h, w), dtype=bool)
    for idx, pts in enumerate(comps):
        if idx == 0 or (min_keep_area > 0 and len(pts) >= min_keep_area):
            for px, py in pts:
                out[py, px] = True
    return out


def segment_white_bg(im_rgb, pocket_seeds=()):
    arr = np.array(im_rgb.convert("RGB"), dtype=np.float32)
    h, w, _ = arr.shape
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    luma = 0.299 * r + 0.587 * g + 0.114 * b
    cmax = np.maximum(np.maximum(r, g), b)
    cmin = np.minimum(np.minimum(r, g), b)
    sat = np.where(cmax > 1.0, (cmax - cmin) / np.maximum(cmax, 1.0), 0.0)

    bg_cand = ((luma >= 236.0) & (sat <= 0.10)) | (luma >= 249.0)

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

    for sx, sy in pocket_seeds:
        if 0 <= sx < w and 0 <= sy < h and bg_cand[sy, sx] and not bg[sy, sx]:
            bg[sy, sx] = True
            q.append((sx, sy))

    while q:
        cx, cy = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h and not bg[ny, nx] and bg_cand[ny, nx]:
                bg[ny, nx] = True
                q.append((nx, ny))

    fg = ~bg
    # Defringe 1px bright neutral border halos
    border_touch = np.zeros((h, w), dtype=bool)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        shifted = np.roll(np.roll(bg, dy, axis=0), dx, axis=1)
        border_touch |= fg & shifted
    fringe = border_touch & (luma >= 224.0) & (sat <= 0.14)
    fg = fg & (~fringe)
    fg = keep_largest_component(fg)

    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, :3] = arr.astype(np.uint8)
    rgba[:, :, 3] = np.where(fg, 255, 0)
    return Image.fromarray(rgba, "RGBA")


def polygon_mask(size_wh, poly):
    m = Image.new("L", size_wh, 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    return np.array(m) > 127


def apply_selout_and_quantize(rgba_im, palette_colors=44):
    arr = np.array(rgba_im)
    a = arr[:, :, 3] > 128
    if not a.any():
        return rgba_im

    rgb = arr[:, :, :3].copy()
    fg_im = Image.fromarray(rgb, "RGB").quantize(
        colors=palette_colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE
    ).convert("RGB")
    q_rgb = np.array(fg_im, dtype=np.float32)

    h, w = a.shape
    edge = np.zeros((h, w), dtype=bool)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nb = np.zeros((h, w), dtype=bool)
        x0, x1 = max(0, dx), min(w, w + dx)
        y0, y1 = max(0, dy), min(h, h + dy)
        nb[y0:y1, x0:x1] = a[y0 - dy : y1 - dy, x0 - dx : x1 - dx]
        edge |= a & (~nb)

    luma = 0.299 * q_rgb[:, :, 0] + 0.587 * q_rgb[:, :, 1] + 0.114 * q_rgb[:, :, 2]
    soft_edge = edge & (luma > 96.0)
    q_rgb[soft_edge] = q_rgb[soft_edge] * 0.36 + np.array([22.0, 8.0, 10.0]) * 0.64

    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[:, :, :3] = np.clip(q_rgb, 0, 255).astype(np.uint8)
    out[:, :, 3] = np.where(a, 255, 0)
    return Image.fromarray(out, "RGBA")


def scale_pose_to_logical(rgba_512, x_ref_512, y_bot_512, scale):
    w5, h5 = rgba_512.size
    nw = max(1, int(round(w5 * scale)))
    nh = max(1, int(round(h5 * scale)))
    scaled = rgba_512.resize((nw, nh), Image.Resampling.BILINEAR)
    arr = np.array(scaled)
    fg = arr[:, :, 3] >= 132
    fg = keep_largest_component(fg)

    rgb = arr[:, :, :3].astype(np.float32)
    luma = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    cmax = rgb.max(axis=2)
    cmin = rgb.min(axis=2)
    sat = np.where(cmax > 1.0, (cmax - cmin) / np.maximum(cmax, 1.0), 0.0)

    h, w = fg.shape
    edge = np.zeros((h, w), dtype=bool)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nb = np.zeros((h, w), dtype=bool)
        x0, x1 = max(0, dx), min(w, w + dx)
        y0, y1 = max(0, dy), min(h, h + dy)
        nb[y0:y1, x0:x1] = fg[y0 - dy : y1 - dy, x0 - dx : x1 - dx]
        edge |= fg & (~nb)
    fg = fg & ~(edge & (luma >= 218.0) & (sat <= 0.16))

    clean = np.zeros_like(arr)
    clean[:, :, :3] = arr[:, :, :3]
    clean[:, :, 3] = np.where(fg, 255, 0)
    quant = apply_selout_and_quantize(Image.fromarray(clean, "RGBA"), palette_colors=44)

    canvas = Image.new("RGBA", (LOG_W, LOG_H), (0, 0, 0, 0))
    ox = int(round(AX - x_ref_512 * scale))
    oy = int(round(AY - y_bot_512 * scale))
    canvas.alpha_composite(quant, (ox, oy))
    return canvas, ox, oy


# ==============================================================================
# 2. LOAD BASE + 4 ACTION KEYPOSES & ANATOMICAL RIG
# ==============================================================================
def load_mage_poses():
    base_raw = Image.open(BASE_JPG).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
    base_seg = segment_white_bg(base_raw, pocket_seeds=())
    base_arr = np.array(base_seg)

    ys, _ = np.where(base_arr[:, :, 3] > 0)
    y_top_stand, y_bot_stand = int(ys.min()), int(ys.max())
    stand_h_512 = max(1, y_bot_stand - y_top_stand)
    scale = TARGET_STAND_H / float(stand_h_512)
    x_ref_stand = 256

    # Strip both empty arms from standing base so IK gauntlets clasp the 2H Sun-Glaive cleanly
    front_arm_poly = polygon_mask((512, 512), [(306, 186), (414, 186), (414, 274), (308, 270), (302, 224)])
    back_arm_poly = polygon_mask((512, 512), [(148, 192), (214, 192), (222, 236), (216, 272), (148, 272)])
    armless_512 = base_arr.copy()
    armless_512[front_arm_poly | back_arm_poly, 3] = 0
    fg_armless = keep_largest_component(armless_512[:, :, 3] > 0)
    armless_512[:, :, 3] = np.where(fg_armless, 255, 0)

    stand_full_log, ox_s, oy_s = scale_pose_to_logical(base_seg, x_ref_stand, y_bot_stand, scale)
    stand_armless_log, _, _ = scale_pose_to_logical(
        Image.fromarray(armless_512, "RGBA"), x_ref_stand, y_bot_stand, scale
    )

    def to_log(pt):
        return (ox_s + pt[0] * scale, oy_s + pt[1] * scale)

    stand_joints = {
        "sh_front": to_log((302, 194)),
        "sh_back": to_log((218, 192)),
        "head": to_log((266, 118)),
        "chest_orb": to_log((268, 208)),
        "waist": to_log((266, 278)),
        "hip_front": to_log((292, 304)),
        "hip_back": to_log((238, 304)),
    }

    kp_sheet = Image.open(KEYPOSES_JPG).convert("RGB")
    kw, kh = kp_sheet.size
    hw, hh = kw // 2, kh // 2
    quad_Specs = {
        "K1_COIL": {
            "crop": (0, 0, hw, hh),
            "pockets": [(286, 357)],
            "strip_polys": [
                [(140, 112), (226, 112), (232, 206), (140, 206)],
                [(312, 200), (420, 200), (420, 278), (312, 278)],
            ],
            "x_ref": 264,
            "y_bot": 496,
            "sh_front": (306, 208),
            "sh_back": (232, 184),
            "chest_orb": (278, 224),
        },
        "K2_LUNGE": {
            "crop": (hw, 0, kw, hh),
            "pockets": [],
            "strip_polys": [
                [(134, 210), (222, 210), (226, 294), (134, 294)],
                [(312, 224), (478, 224), (478, 296), (312, 296)],
            ],
            "x_ref": 250,
            "y_bot": 511,
            "sh_front": (308, 246),
            "sh_back": (224, 228),
            "chest_orb": (274, 260),
        },
        "K3_RISE": {
            "crop": (0, hh, hw, kh),
            "pockets": [],
            "strip_polys": [
                [(126, 188), (206, 188), (210, 278), (126, 278)],
                [(342, 48), (440, 48), (440, 206), (316, 206), (316, 152), (342, 132)],
            ],
            "x_ref": 258,
            "y_bot": 501,
            "sh_front": (312, 186),
            "sh_back": (214, 194),
            "chest_orb": (272, 206),
        },
        "K4_LEAP": {
            "crop": (hw, hh, kw, kh),
            "pockets": [(297, 315), (221, 188)],
            "strip_polys": [
                [(152, 162), (228, 162), (232, 248), (152, 248)],
                [(318, 186), (390, 186), (390, 260), (318, 260)],
            ],
            "x_ref": 264,
            "y_bot": 465,
            "sh_front": (312, 190),
            "sh_back": (228, 174),
            "chest_orb": (284, 202),
        },
    }

    keyposes = {}
    for kname, spec in quad_Specs.items():
        tile = kp_sheet.crop(spec["crop"]).resize((512, 512), Image.Resampling.LANCZOS)
        seg = segment_white_bg(tile, pocket_seeds=spec["pockets"])
        t_arr = np.array(seg)
        for poly in spec["strip_polys"]:
            pm = polygon_mask((512, 512), poly)
            t_arr[pm, 3] = 0
        t_fg = keep_largest_component(t_arr[:, :, 3] > 0)
        t_arr[:, :, 3] = np.where(t_fg, 255, 0)

        kp_log, kox, koy = scale_pose_to_logical(
            Image.fromarray(t_arr, "RGBA"), spec["x_ref"], spec["y_bot"], scale
        )
        keyposes[kname] = {
            "armless": kp_log,
            "sh_front": (kox + spec["sh_front"][0] * scale, koy + spec["sh_front"][1] * scale),
            "sh_back": (kox + spec["sh_back"][0] * scale, koy + spec["sh_back"][1] * scale),
            "chest_orb": (kox + spec["chest_orb"][0] * scale, koy + spec["chest_orb"][1] * scale),
        }

    return {
        "scale": scale,
        "stand_full": stand_full_log,
        "stand_armless": stand_armless_log,
        "stand_joints": stand_joints,
        "keyposes": keyposes,
    }


# ==============================================================================
# 3. PIXEL-ART PRIMITIVES, SOLAR ASTROLABE HALO, 2H SUN-GLAIVE & 2-BONE IK
# ==============================================================================
def put_px(arr, x, y, col):
    if 2 <= x < LOG_W - 2 and 2 <= y < LOG_H - 2:
        arr[y, x] = col


def draw_thick_line(arr, x0, y0, x1, y1, r, col, out_col=None):
    steps = max(2, int(math.hypot(x1 - x0, y1 - y0) * 2.2) + 1)
    if out_col is not None:
        ro = r + 1.0
        ir_o = int(math.ceil(ro))
        for i in range(steps + 1):
            t = i / float(steps)
            cx = x0 + (x1 - x0) * t
            cy = y0 + (y1 - y0) * t
            icx, icy = int(round(cx)), int(round(cy))
            for dy in range(-ir_o, ir_o + 1):
                for dx in range(-ir_o, ir_o + 1):
                    if dx * dx + dy * dy <= ro * ro + 0.25:
                        px, py = icx + dx, icy + dy
                        if 2 <= px < LOG_W - 2 and 2 <= py < LOG_H - 2 and arr[py, px, 3] == 0:
                            arr[py, px] = out_col
    ir = int(math.ceil(r))
    for i in range(steps + 1):
        t = i / float(steps)
        cx = x0 + (x1 - x0) * t
        cy = y0 + (y1 - y0) * t
        icx, icy = int(round(cx)), int(round(cy))
        for dy in range(-ir, ir + 1):
            for dx in range(-ir, ir + 1):
                if dx * dx + dy * dy <= r * r + 0.2:
                    put_px(arr, icx + dx, icy + dy, col)


def solve_2bone_ik(sh, target, l1=8.5, l2=8.5, bend_sign=1.0):
    dx = target[0] - sh[0]
    dy = target[1] - sh[1]
    d = math.hypot(dx, dy)
    max_reach = l1 + l2 - 0.35
    if d > max_reach and d > 1e-4:
        dx *= max_reach / d
        dy *= max_reach / d
        target = (sh[0] + dx, sh[1] + dy)
        d = max_reach
    d = max(1.2, d)
    cos_a = clamp((l1 * l1 + d * d - l2 * l2) / (2.0 * l1 * d), -1.0, 1.0)
    ang_base = math.atan2(dy, dx)
    ang_off = math.acos(cos_a) * bend_sign
    el = (sh[0] + math.cos(ang_base + ang_off) * l1, sh[1] + math.sin(ang_base + ang_off) * l1)
    return el, target


def draw_mage_arm(arr, sh, grip, is_front=True, bend_sign=1.0):
    el, hand = solve_2bone_ik(sh, grip, l1=8.6, l2=8.6, bend_sign=bend_sign)
    sleeve = C_COAT_MID if is_front else C_COAT_DARK
    cuff = C_GOLD_LIGHT if is_front else C_GOLD_MID
    glove = C_SKIN_LIGHT if is_front else C_SKIN_SHADOW
    # Pauldron cap
    draw_thick_line(arr, sh[0] - 1.0, sh[1] - 0.8, sh[0] + 1.4, sh[1] + 0.6, 2.2, C_COAT_CRIMSON, out_col=C_OUT)
    put_px(arr, int(round(sh[0])), int(round(sh[1] - 1)), cuff)
    # Upper sleeve + armored forearm bracer
    draw_thick_line(arr, sh[0], sh[1], el[0], el[1], 1.9, sleeve, out_col=C_OUT)
    draw_thick_line(arr, el[0], el[1], hand[0], hand[1], 1.65, C_COAT_CRIMSON if is_front else sleeve, out_col=C_OUT)
    # Gold rune cuff
    mx, my = lerp(el[0], hand[0], 0.58), lerp(el[1], hand[1], 0.58)
    draw_thick_line(arr, mx - 0.5, my - 0.5, mx + 0.5, my + 0.5, 1.45, cuff, out_col=None)
    # Clenched spell-blade grip hand
    draw_thick_line(arr, hand[0] - 0.5, hand[1] - 0.3, hand[0] + 0.6, hand[1] + 0.3, 1.5, glove, out_col=C_OUT)
    return hand


def draw_solar_astrolabe_halo(arr, cx, cy, phase, radius=16.5, flare=0.0, eclipse=False):
    """Floating back Solar Astrolabe Halo behind Ignis Sol EX's shoulders."""
    ring_col = C_ECLIPSE_MAGENTA if eclipse else C_GOLD_MID
    spike_col = C_FLAME_GOLD if not eclipse else C_FLAME_CORE
    ember_col = C_ECLIPSE_VIOLET if eclipse else C_FLAME_CRIMSON

    # Crisp pixel-art astrolabe ring (foreshortened slightly in X for 3/4 right-facing depth)
    rx = radius * (0.86 + 0.12 * flare)
    ry = radius * (1.0 + 0.10 * flare)
    steps = 56
    for i in range(steps):
        ang = (i / float(steps)) * math.tau
        px = int(round(cx + math.cos(ang) * rx))
        py = int(round(cy + math.sin(ang) * ry))
        if 3 <= px < LOG_W - 3 and 3 <= py < LOG_H - 4:
            for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if arr[py + oy, px + ox, 3] == 0:
                    arr[py + oy, px + ox] = C_OUT
            arr[py, px] = C_GOLD_LIGHT if ((i + int(phase * 16)) % 5 == 0) else ring_col

    # 8 rotating solar compass needles
    rot = phase * math.tau
    for k in range(8):
        ang = rot + k * (math.tau / 8.0)
        is_major = (k % 2 == 0)
        r0 = 0.88
        r1 = (1.30 + 0.16 * flare) if is_major else (1.14 + 0.08 * flare)
        x0 = cx + math.cos(ang) * rx * r0
        y0 = cy + math.sin(ang) * ry * r0
        x1 = cx + math.cos(ang) * rx * r1
        y1 = cy + math.sin(ang) * ry * r1
        draw_thick_line(
            arr,
            x0,
            y0,
            x1,
            y1,
            0.95 if is_major else 0.65,
            spike_col if is_major else ember_col,
            out_col=C_OUT,
        )
        if is_major and flare > 0.25:
            put_px(arr, int(round(x1)), int(round(y1)), C_FLAME_CORE)


def draw_helios_sunglaive(arr, grip_pos, angle_deg, length_scale=1.0, blaze=0.35, phase=0.0):
    """
    2H Helios Sun-Glaive Staff:
      - Ornate obsidian-crimson & gold rune shaft
      - Golden Solar Astrolabe Crescent Head + blazing Solar Core
      - White-gold/solar-crimson Flame-Blade spearhead (`54..58` logical px total reach!)
    """
    rad = math.radians(angle_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    butt_len = 15.0 * length_scale
    neck_dist = 27.0 * length_scale
    tip_dist = 53.0 * length_scale

    bx, by = grip_pos[0] - ux * butt_len, grip_pos[1] - uy * butt_len
    nx_p, ny_p = grip_pos[0] + ux * neck_dist, grip_pos[1] + uy * neck_dist
    tx, ty = grip_pos[0] + ux * tip_dist, grip_pos[1] + uy * tip_dist

    # 1. Counterweight solar pommel & rune shaft
    draw_thick_line(arr, bx, by, nx_p, ny_p, 1.25, C_COAT_DARK, out_col=C_OUT)
    for frac in (0.25, 0.55, 0.82):
        rx = lerp(bx, nx_p, frac)
        ry = lerp(by, ny_p, frac)
        put_px(arr, int(round(rx)), int(round(ry)), C_GOLD_LIGHT)
    draw_thick_line(arr, bx - ux * 1.6, by - uy * 1.6, bx + ux * 1.0, by + uy * 1.0, 1.8, C_GOLD_MID, out_col=C_OUT)
    put_px(arr, int(round(bx)), int(round(by)), C_FLAME_GOLD)

    # 2. Ornate Golden Solar Astrolabe Head at shaft neck
    wing_span = 6.2 * length_scale
    for sign in (-1.0, 1.0):
        wx0 = nx_p - ux * 2.0 + nx * sign * 2.2
        wy0 = ny_p - uy * 2.0 + ny * sign * 2.2
        wx1 = nx_p + ux * 3.5 + nx * sign * wing_span
        wy1 = ny_p + uy * 3.5 + ny * sign * wing_span
        wx2 = nx_p + ux * 8.0 + nx * sign * (wing_span * 0.55)
        wy2 = ny_p + uy * 8.0 + ny * sign * (wing_span * 0.55)
        draw_thick_line(arr, wx0, wy0, wx1, wy1, 1.2, C_GOLD_MID, out_col=C_OUT)
        draw_thick_line(arr, wx1, wy1, wx2, wy2, 1.0, C_GOLD_LIGHT, out_col=C_OUT)
    # Astrolabe center sun-orb
    cx_orb, cy_orb = nx_p + ux * 2.5, ny_p + uy * 2.5
    draw_thick_line(arr, cx_orb - 0.5, cy_orb, cx_orb + 0.5, cy_orb, 2.4, C_FLAME_CRIMSON, out_col=C_OUT)
    draw_thick_line(arr, cx_orb - 0.3, cy_orb, cx_orb + 0.3, cy_orb, 1.4, C_FLAME_GOLD, out_col=None)
    put_px(arr, int(round(cx_orb)), int(round(cy_orb)), C_FLAME_CORE)

    # 3. Blazing Helios Solar Flame-Blade (`nx_p -> tx`, 26 logical px = 52px output!)
    blade_start_x = nx_p + ux * 3.5
    blade_start_y = ny_p + uy * 3.5
    b_len = max(6.0, tip_dist - neck_dist - 3.5)
    steps = max(14, int(b_len * 2.4))

    # Selout pass
    for i in range(steps + 1):
        t = i / float(steps)
        cx = blade_start_x + ux * b_len * t
        cy = blade_start_y + uy * b_len * t
        half_w = (3.4 + 1.1 * blaze) * math.sin(math.pi * clamp(t * 0.82 + 0.14, 0.0, 1.0)) * (1.0 - 0.58 * (t**1.6))
        half_w = max(0.8, half_w)
        # Serrated flame ripple along outer edge
        rip = 0.7 * math.sin(t * 16.0 - phase * math.tau * 2.0) * (1.0 - t)
        hw_out = half_w + 1.0 + max(0.0, rip)
        span = int(math.ceil(hw_out)) + 1
        for s in range(-span, span + 1):
            if abs(s) <= hw_out:
                px = int(round(cx + nx * s))
                py = int(round(cy + ny * s))
                if 2 <= px < LOG_W - 2 and 2 <= py < LOG_H - 2 and arr[py, px, 3] == 0:
                    arr[py, px] = C_OUT

    # Multi-band solar plasma blade fill
    for i in range(steps + 1):
        t = i / float(steps)
        cx = blade_start_x + ux * b_len * t
        cy = blade_start_y + uy * b_len * t
        rip = 0.65 * math.sin(t * 16.0 - phase * math.tau * 2.0) * (1.0 - t)
        half_w = max(0.65, (3.3 + 1.0 * blaze) * math.sin(math.pi * clamp(t * 0.82 + 0.14, 0.0, 1.0)) * (1.0 - 0.60 * (t**1.6)) + rip * 0.5)
        span = int(math.ceil(half_w)) + 1
        for s in range(-span, span + 1):
            af = abs(s) / max(0.55, half_w)
            if af > 1.0:
                continue
            px = int(round(cx + nx * s))
            py = int(round(cy + ny * s))
            if af < 0.30 or t > 0.88:
                col = C_FLAME_CORE
            elif af < 0.62:
                col = C_FLAME_GOLD
            elif af < 0.86:
                col = C_FLAME_ORANGE
            else:
                col = C_FLAME_CRIMSON
            put_px(arr, px, py, col)

    # Trailing flame embers off the Sun-Glaive blade
    if blaze > 0.15:
        for k in range(4):
            ft = 0.25 + 0.20 * k
            ang_e = phase * math.tau + k * 1.9
            ex = int(round(blade_start_x + ux * b_len * ft + nx * (4.2 * math.sin(ang_e))))
            ey = int(round(blade_start_y + uy * b_len * ft - 1.8 - abs(math.cos(ang_e)) * 2.2))
            put_px(arr, ex, ey, C_FLAME_GOLD if k % 2 == 0 else C_FLAME_ORANGE)

    return (tx, ty)


# ==============================================================================
# 4. 4-BAND SERRATED SOLAR-FLAME CRESCENT, VORTEX & METEOR PILLAR SMEARS
# ==============================================================================
def draw_serrated_solar_smear(
    arr,
    center,
    deg_start,
    deg_end,
    r_outer,
    thickness,
    eclipse=False,
    sparks=12,
):
    cx, cy = center
    c_core = C_FLAME_CORE
    c_mid1 = C_FLAME_GOLD if not eclipse else (245, 208, 254, 255)
    c_mid2 = C_FLAME_ORANGE if not eclipse else C_ECLIPSE_MAGENTA
    c_tail = C_FLAME_CRIMSON if not eclipse else C_ECLIPSE_VIOLET

    a0 = math.radians(deg_start)
    a1 = math.radians(deg_end)
    if a1 < a0:
        a0, a1 = a1, a0
        reverse_dir = True
    else:
        reverse_dir = False
    span = max(0.05, a1 - a0)

    x0 = max(2, int(cx - r_outer - 5))
    x1 = min(LOG_W - 3, int(cx + r_outer + 5))
    y0 = max(2, int(cy - r_outer - 5))
    y1 = min(LOG_H - 3, int(cy + r_outer + 5))

    smear_mask = np.zeros((LOG_H, LOG_W), dtype=bool)
    smear_col = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)

    for py in range(y0, y1 + 1):
        dy = py - cy
        for px in range(x0, x1 + 1):
            dx = px - cx
            r = math.hypot(dx, dy)
            if r > r_outer + 1.5 or r < max(3.0, r_outer - thickness - 7.0):
                continue
            ang = math.atan2(dy, dx)
            while ang < a0 - math.pi:
                ang += math.tau
            while ang > a0 + math.tau:
                ang -= math.tau
            if ang < a0 or ang > a1:
                continue

            u_raw = (ang - a0) / span
            u = (1.0 - u_raw) if reverse_dir else u_raw

            taper = math.sin(math.pi * clamp(u ** 0.72, 0.0, 1.0)) ** 0.56
            saw = (
                0.55 * math.sin(u * 40.0)
                + 0.35 * math.sin(u * 83.0 + 1.1)
                + 0.25 * math.cos(u * 129.0)
            )
            local_thick = thickness * (0.28 + 0.84 * taper) + (2.6 if saw > 0.34 else 0.0) * (1.0 - u * 0.5)
            r_in = r_outer - local_thick
            if r < r_in or r > r_outer:
                continue

            v = (r_outer - r) / max(1.0, local_thick)
            bayer = BAYER4[py & 3, px & 3]
            if u < 0.22 and bayer > (u / 0.22) * 1.18:
                continue

            # Carve blazing inner flame-rip streaks
            if 0.28 < v < 0.70 and u < 0.74 and math.sin(u * 58.0 + r * 0.48) > 0.72:
                continue

            smear_mask[py, px] = True
            if v < 0.28 and u > 0.18:
                smear_col[py, px] = c_core
            elif v < 0.56 and u > 0.10:
                smear_col[py, px] = c_mid1
            elif v < 0.82:
                smear_col[py, px] = c_mid2
            else:
                smear_col[py, px] = c_tail

    for py in range(max(2, y0 - 1), min(LOG_H - 2, y1 + 2)):
        for px in range(max(2, x0 - 1), min(LOG_W - 2, x1 + 2)):
            if smear_mask[py, px]:
                arr[py, px] = smear_col[py, px]
            else:
                for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nxp, nyp = px + ox, py + oy
                    if 0 <= nxp < LOG_W and 0 <= nyp < LOG_H and smear_mask[nyp, nxp]:
                        if arr[py, px, 3] == 0:
                            arr[py, px] = C_OUT
                        break

    for i in range(sparks):
        su = 0.14 + 0.82 * (i / max(1, sparks - 1))
        ang = a0 + span * ((1.0 - su) if reverse_dir else su)
        rr = r_outer + 2.0 + (i % 3) * 2.2
        sx = int(round(cx + math.cos(ang) * rr))
        sy = int(round(cy + math.sin(ang) * rr))
        put_px(arr, sx, sy, c_core if i % 2 == 0 else c_mid1)
        put_px(arr, sx - 1, sy, c_mid2)


def draw_solar_vortex_ring(arr, center, rx, ry, thickness=9.5, half="front"):
    cx, cy = center
    y0 = max(2, int(cy - ry - thickness - 3))
    y1 = min(LOG_H - 3, int(cy + ry + thickness + 3))
    x0 = max(2, int(cx - rx - thickness - 3))
    x1 = min(LOG_W - 3, int(cx + rx + thickness + 3))

    mask = np.zeros((LOG_H, LOG_W), dtype=bool)
    col = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)

    for py in range(y0, y1 + 1):
        dy = py - cy
        if half == "back" and dy > 1:
            continue
        if half == "front" and dy < -1:
            continue
        for px in range(x0, x1 + 1):
            dx = px - cx
            nr = math.hypot(dx / max(1.0, rx), dy / max(1.0, ry))
            ang = math.atan2(dy, dx)
            rip = 0.08 * math.sin(ang * 14.0)
            if nr > 1.06 + rip or nr < 1.0 - (thickness / max(12.0, rx)) * 1.65:
                continue
            v = (1.06 + rip - nr) / max(0.08, (thickness / max(12.0, rx)) * 1.65 + 0.06)
            bayer = BAYER4[py & 3, px & 3]
            if v > 0.86 and bayer > 0.55:
                continue
            mask[py, px] = True
            if v < 0.28:
                col[py, px] = C_FLAME_CORE
            elif v < 0.56:
                col[py, px] = C_FLAME_GOLD
            elif v < 0.82:
                col[py, px] = C_FLAME_ORANGE
            else:
                col[py, px] = C_FLAME_CRIMSON

    for py in range(y0, y1 + 1):
        for px in range(x0, x1 + 1):
            if mask[py, px]:
                arr[py, px] = col[py, px]
            elif arr[py, px, 3] == 0:
                for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if 0 <= px + ox < LOG_W and 0 <= py + oy < LOG_H and mask[py + oy, px + ox]:
                        arr[py, px] = C_OUT
                        break


def draw_solar_pillar_eruption(arr, x_center, y_floor=115, width=14.0, intensity=1.0):
    """Vertical Helios Solar Pillar erupting at impact point (`V3 F25` & `SKILL`)."""
    icx = int(round(x_center))
    hw = max(3, int(round(width * intensity)))
    y_top = max(4, int(round(10 + (1.0 - intensity) * 44)))
    for py in range(y_top, min(LOG_H - 3, y_floor + 1)):
        h_frac = (y_floor - py) / max(1.0, float(y_floor - y_top))
        flare_base = 1.35 if py > y_floor - 9 else (1.0 - 0.28 * h_frac)
        local_hw = max(2.0, hw * flare_base + 1.4 * math.sin(py * 0.52))
        ihw = int(math.ceil(local_hw)) + 1
        for dx in range(-ihw, ihw + 1):
            px = icx + dx
            if px < 3 or px >= LOG_W - 3:
                continue
            af = abs(dx) / max(1.0, local_hw)
            if af > 1.08:
                continue
            if af > 0.94:
                if arr[py, px, 3] == 0:
                    arr[py, px] = C_OUT
                continue
            if h_frac > 0.84 and BAYER4[py & 3, px & 3] > (1.0 - h_frac) * 5.8:
                continue
            if af < 0.28:
                arr[py, px] = C_FLAME_CORE
            elif af < 0.56:
                arr[py, px] = C_FLAME_GOLD
            elif af < 0.80:
                arr[py, px] = C_FLAME_ORANGE
            else:
                arr[py, px] = C_FLAME_CRIMSON


# ==============================================================================
# 5. DYNAMIC POSE COMPOSITOR + COAT / CROWN EMBER SECONDARY MOTION
# ==============================================================================
def add_coat_and_crown_motion(arr, dx_body, dy_body, phase, blaze=0.25):
    """Adds subtle 30fps living flame sparks above crown & dynamic coat-hem ripple."""
    # Rising solar crown embers
    for k in range(3):
        ang = phase * math.tau + k * 2.1
        ex = int(round(AX + dx_body - 2 + math.sin(ang) * 7.0 + k * 2.5))
        ey = int(round(30 + dy_body - ((phase * 14.0 + k * 4.5) % 9.0)))
        if 3 <= ex < LOG_W - 3 and 3 <= ey < LOG_H - 4:
            put_px(arr, ex, ey, C_FLAME_CORE if (k == 0 and blaze > 0.5) else C_FLAME_GOLD)
            if blaze > 0.45:
                put_px(arr, ex, ey + 1, C_FLAME_ORANGE)

    # Dynamic obsidian-crimson battle-coat tail flutter on screen-left (`x = 22..50, y = 78..108`)
    wave = math.sin(phase * math.tau)
    tip_x = int(round(AX + dx_body - 28 + wave * 2.0))
    tip_y = int(round(98 + dy_body + math.cos(phase * math.tau) * 1.5))
    draw_thick_line(arr, tip_x + 4, tip_y - 4, tip_x, tip_y, 1.3, C_COAT_CRIMSON, out_col=C_OUT)
    put_px(arr, tip_x + 1, tip_y - 1, C_GOLD_LIGHT)


def enforce_safety_margin(arr):
    """Guarantees 0/300 border clips (`2px` logical = `4px` output safety margin) & binary alpha."""
    arr[:2, :, :] = 0
    arr[LOG_H - 2 :, :, :] = 0
    arr[:, :2, :] = 0
    arr[:, LOG_W - 2 :, :] = 0
    arr[:, :, 3] = np.where(arr[:, :, 3] >= 128, 255, 0)
    trans = arr[:, :, 3] == 0
    arr[trans, :3] = 0


def compose_mage_frame(
    poses,
    pose_key="STAND",
    dx=0.0,
    dy=0.0,
    aim_deg=-32.0,
    grip_offset=(4.0, -2.0),
    two_handed=True,
    offhand_target=None,
    blaze=0.35,
    halo_flare=0.0,
    eclipse_halo=False,
    phase=0.0,
    smear_spec=None,
    vortex_spec=None,
    pillar_spec=None,
    blink_rings=0.0,
    walk_stride=0.0,
):
    canvas = Image.new("RGBA", (LOG_W, LOG_H), (0, 0, 0, 0))
    arr = np.array(canvas)

    if pose_key == "STAND":
        body_im = poses["stand_armless"]
        sh_f_base = poses["stand_joints"]["sh_front"]
        sh_b_base = poses["stand_joints"]["sh_back"]
        orb_base = poses["stand_joints"]["chest_orb"]
    else:
        kp = poses["keyposes"][pose_key]
        body_im = kp["armless"]
        sh_f_base = kp["sh_front"]
        sh_b_base = kp["sh_back"]
        orb_base = kp["chest_orb"]

    sh_f = (sh_f_base[0] + dx, sh_f_base[1] + dy)
    sh_b = (sh_b_base[0] + dx, sh_b_base[1] + dy)
    orb = (orb_base[0] + dx, orb_base[1] + dy)

    # 1. Back half of 2.5D vortex ring if active
    if vortex_spec is not None:
        draw_solar_vortex_ring(
            arr,
            vortex_spec["center"],
            vortex_spec["rx"],
            vortex_spec["ry"],
            thickness=vortex_spec.get("thickness", 9.5),
            half="back",
        )

    # 2. Floating Back Solar Astrolabe Halo behind Ignis Sol EX's shoulders
    draw_solar_astrolabe_halo(
        arr,
        cx=orb[0] - 4.0,
        cy=orb[1] - 4.0,
        phase=phase,
        radius=15.5,
        flare=halo_flare,
        eclipse=eclipse_halo,
    )

    # 3. Compute 2H Sun-Glaive grip positions
    grip_main = (sh_f[0] + grip_offset[0], sh_f[1] + grip_offset[1])
    rad = math.radians(aim_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    grip_rear = (grip_main[0] - ux * 7.5, grip_main[1] - uy * 7.5)

    # Rear IK arm behind torso
    if two_handed:
        draw_mage_arm(arr, sh_b, grip_rear, is_front=False, bend_sign=1.0)
    elif offhand_target is not None:
        oh = draw_mage_arm(arr, sh_b, offhand_target, is_front=False, bend_sign=1.0)
        # Small spell-orb in offhand when casting one-handed
        if blaze > 0.45:
            draw_thick_line(arr, oh[0] - 0.5, oh[1], oh[0] + 0.5, oh[1], 2.2, C_FLAME_ORANGE, out_col=C_OUT)
            put_px(arr, int(round(oh[0])), int(round(oh[1])), C_FLAME_CORE)

    # If weapon aims steeply behind body, render weapon behind body
    weapon_behind = (-175.0 <= aim_deg <= -118.0)
    if weapon_behind:
        draw_helios_sunglaive(arr, grip_main, aim_deg, blaze=blaze, phase=phase)

    # 4. Composite body sprite (with subtle walk leg-shear if walking)
    body_layer = Image.fromarray(arr, "RGBA")
    bx = int(round(dx))
    by = int(round(dy))
    if abs(walk_stride) > 0.05 and pose_key == "STAND":
        # Subtle lower-body stride shear below waist y=78 so 30fps walk has crisp boot alternation
        b_arr = np.array(body_im)
        sheared = np.zeros_like(b_arr)
        for yy in range(LOG_H):
            shift = 0
            if yy >= 78:
                t_leg = (yy - 78) / 37.0
                # Left half vs right half of legs oppose slightly
                for xx in range(LOG_W):
                    side = 1.0 if xx >= AX else -1.0
                    sx = clamp(int(round(xx - side * walk_stride * t_leg * 3.2)), 0, LOG_W - 1)
                    sheared[yy, xx] = b_arr[yy, sx]
            else:
                sheared[yy] = b_arr[yy]
        body_layer.alpha_composite(Image.fromarray(sheared, "RGBA"), (bx, by))
    else:
        body_layer.alpha_composite(body_im, (bx, by))
    arr = np.array(body_layer)

    # Pulse the chest Solar Core orb at 30fps
    ox_i, oy_i = int(round(orb[0])), int(round(orb[1]))
    put_px(arr, ox_i, oy_i, C_FLAME_CORE)
    if blaze > 0.4 or (int(phase * 30) % 2 == 0):
        put_px(arr, ox_i + 1, oy_i, C_FLAME_GOLD)
        put_px(arr, ox_i, oy_i - 1, C_FLAME_GOLD)

    add_coat_and_crown_motion(arr, dx, dy, phase, blaze=blaze)

    # 5. Weapon in front of body (standard) + front IK arm clasping shaft
    if not weapon_behind:
        draw_helios_sunglaive(arr, grip_main, aim_deg, blaze=blaze, phase=phase)
    draw_mage_arm(arr, sh_f, grip_main, is_front=True, bend_sign=1.0)

    # 6. Front smears / pillars / Arcane Blink rings
    if pillar_spec is not None:
        draw_solar_pillar_eruption(
            arr,
            x_center=pillar_spec["x"],
            y_floor=pillar_spec.get("y_floor", 115),
            width=pillar_spec.get("width", 14.0),
            intensity=pillar_spec.get("intensity", 1.0),
        )
    if vortex_spec is not None:
        draw_solar_vortex_ring(
            arr,
            vortex_spec["center"],
            vortex_spec["rx"],
            vortex_spec["ry"],
            thickness=vortex_spec.get("thickness", 9.5),
            half="front",
        )
    if smear_spec is not None:
        draw_serrated_solar_smear(
            arr,
            center=smear_spec["center"],
            deg_start=smear_spec["deg_start"],
            deg_end=smear_spec["deg_end"],
            r_outer=smear_spec["r_outer"],
            thickness=smear_spec["thickness"],
            eclipse=smear_spec.get("eclipse", False),
            sparks=smear_spec.get("sparks", 12),
        )
    if blink_rings > 0.05:
        for ry_off in (-26, -12, 2):
            draw_solar_vortex_ring(
                arr,
                (AX + dx, 84 + dy + ry_off),
                rx=18.0 * blink_rings,
                ry=4.2 * blink_rings,
                thickness=3.5,
                half="front",
            )

    enforce_safety_margin(arr)
    return arr


# ==============================================================================
# 6. BUILD ALL 10 ROWS x 30 FRAMES (30FPS)
# ==============================================================================
def build_row_0_idle(poses):
    frames = []
    for f in range(30):
        ph = f / 30.0
        bob = math.sin(ph * math.tau)
        dy = round(bob * 1.0)
        aim = -42.0 + math.sin(ph * math.tau + 0.5) * 3.5
        frames.append(
            compose_mage_frame(
                poses,
                pose_key="STAND",
                dx=0.0,
                dy=dy,
                aim_deg=aim,
                grip_offset=(4.5, -1.5 + 0.6 * bob),
                blaze=0.35 + 0.12 * math.sin(ph * math.tau * 2.0),
                halo_flare=0.12 + 0.08 * math.sin(ph * math.tau),
                phase=ph,
            )
        )
    return frames


def build_row_1_walk(poses):
    frames = []
    for f in range(30):
        ph = f / 30.0
        stride = math.sin(ph * math.tau * 2.0)
        bob = -abs(math.cos(ph * math.tau * 2.0)) * 1.6
        use_lunge = abs(stride) > 0.82
        frames.append(
            compose_mage_frame(
                poses,
                pose_key="K2_LUNGE" if use_lunge else "STAND",
                dx=2.0 + stride * 1.5,
                dy=round(bob),
                aim_deg=-26.0 + stride * 9.0,
                grip_offset=(5.0, -1.0),
                blaze=0.40,
                halo_flare=0.18,
                phase=ph,
                walk_stride=stride,
            )
        )
    return frames


def build_row_2_auto_attack(poses):
    """
    Row 2 AUTO_ATTACK (`[[60,8],[68,7],[75,8],[83,7]]`):
      - V0 (F00..F07): High Helios coil -> F03 1-frame snap downward solar-flame serrated crescent smear!
      - V1 (F08..F14): Low guard -> F09 instant reverse rising Phoenix uppercut flame-smear!
      - V2 (F15..F22): Horizontal torque -> F17 2.5D foreshortened 360 solar-ring vortex smear!
      - V3 (F23..F29): K4_LEAP airborne Helios hop-slam (F23..F24) -> F25 meteoric flame-pillar slam smear!
    """
    frames = []
    for f in range(30):
        ph = f / 30.0
        # --- V0 (F00..F07): Downward Helios Solar-Flame Slash + Fireball Launch ---
        if f in (0, 1, 2):
            t = f / 2.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K1_COIL",
                    dx=lerp(-2.0, -5.0, t),
                    dy=lerp(0.0, -1.0, t),
                    aim_deg=lerp(-112.0, -148.0, t),
                    grip_offset=(-2.0, -6.5),
                    blaze=0.55 + 0.35 * t,
                    halo_flare=0.35 + 0.35 * t,
                    phase=ph,
                )
            )
        elif f == 3:
            # 1-FRAME SNAP! Massive 210-deg downward solar-flame serrated crescent smear
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=12.0,
                    dy=0.0,
                    aim_deg=52.0,
                    grip_offset=(8.5, 2.0),
                    blaze=1.0,
                    halo_flare=0.95,
                    phase=ph,
                    smear_spec={
                        "center": (AX + 26.0, 68.0),
                        "deg_start": -132.0,
                        "deg_end": 68.0,
                        "r_outer": 62.0,
                        "thickness": 22.0,
                        "sparks": 16,
                    },
                )
            )
        elif f == 4:
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=13.0,
                    dy=0.0,
                    aim_deg=64.0,
                    grip_offset=(8.5, 3.0),
                    blaze=0.85,
                    halo_flare=0.65,
                    phase=ph,
                    smear_spec={
                        "center": (AX + 26.0, 69.0),
                        "deg_start": -18.0,
                        "deg_end": 72.0,
                        "r_outer": 58.0,
                        "thickness": 11.0,
                        "sparks": 8,
                    },
                )
            )
        elif f in (5, 6, 7):
            # Hold low follow-through directly into V1 reverse Phoenix coil (ZERO idle reset!)
            t = (f - 5) / 2.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=lerp(11.0, 7.0, t),
                    dy=lerp(0.0, 1.0, t),
                    aim_deg=lerp(66.0, 76.0, t),
                    grip_offset=(7.5, 3.5),
                    blaze=0.55,
                    halo_flare=0.35,
                    phase=ph,
                )
            )

        # --- V1 (F08..F14): Instant Reverse Rising Phoenix Uppercut Flame-Smear ---
        elif f == 8:
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=5.0,
                    dy=2.0,
                    aim_deg=82.0,
                    grip_offset=(6.0, 5.0),
                    blaze=0.80,
                    halo_flare=0.55,
                    phase=ph,
                )
            )
        elif f == 9:
            # 1-FRAME RISING PHOENIX SNAP!
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K3_RISE",
                    dx=10.0,
                    dy=-1.0,
                    aim_deg=-84.0,
                    grip_offset=(7.0, -9.0),
                    blaze=1.0,
                    halo_flare=1.0,
                    phase=ph,
                    smear_spec={
                        "center": (AX + 24.0, 66.0),
                        "deg_start": 82.0,
                        "deg_end": -96.0,
                        "r_outer": 60.0,
                        "thickness": 21.0,
                        "sparks": 16,
                    },
                )
            )
        elif f == 10:
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K3_RISE",
                    dx=11.0,
                    dy=-1.0,
                    aim_deg=-94.0,
                    grip_offset=(6.5, -10.0),
                    blaze=0.85,
                    halo_flare=0.70,
                    phase=ph,
                    smear_spec={
                        "center": (AX + 24.0, 64.0),
                        "deg_start": -18.0,
                        "deg_end": -102.0,
                        "r_outer": 56.0,
                        "thickness": 10.0,
                        "sparks": 8,
                    },
                )
            )
        elif f in (11, 12, 13, 14):
            # Transition high Phoenix lock into horizontal K1_COIL vortex torque
            t = (f - 11) / 3.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K3_RISE" if f <= 12 else "K1_COIL",
                    dx=lerp(9.0, -3.0, t),
                    dy=0.0,
                    aim_deg=lerp(-98.0, -156.0, t),
                    grip_offset=(lerp(5.0, -2.5, t), lerp(-9.0, -4.0, t)),
                    blaze=0.55 + 0.20 * t,
                    halo_flare=0.40 + 0.25 * t,
                    phase=ph,
                )
            )

        # --- V2 (F15..F22): 2.5D Foreshortened 360 Solar-Ring Vortex Smear ---
        elif f in (15, 16):
            t = f - 15
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K1_COIL",
                    dx=-5.0 - t * 1.5,
                    dy=0.0,
                    aim_deg=-162.0 - t * 8.0,
                    grip_offset=(-3.5, -3.0),
                    blaze=0.80 + 0.15 * t,
                    halo_flare=0.75,
                    phase=ph,
                )
            )
        elif f == 17:
            # 1-FRAME 360 SOLAR-RING VORTEX SNAP!
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=11.0,
                    dy=0.0,
                    aim_deg=6.0,
                    grip_offset=(9.5, -1.0),
                    blaze=1.0,
                    halo_flare=1.0,
                    phase=ph,
                    vortex_spec={
                        "center": (AX + 22.0, 74.0),
                        "rx": 64.0,
                        "ry": 18.0,
                        "thickness": 13.0,
                    },
                )
            )
        elif f == 18:
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=12.0,
                    dy=0.0,
                    aim_deg=18.0,
                    grip_offset=(9.0, 0.5),
                    blaze=0.85,
                    halo_flare=0.70,
                    phase=ph,
                    vortex_spec={
                        "center": (AX + 24.0, 74.0),
                        "rx": 60.0,
                        "ry": 15.0,
                        "thickness": 7.0,
                    },
                )
            )
        elif f in (19, 20, 21, 22):
            # Coil into explosive crouch before airborne V3 Helios Hop-Slam!
            t = (f - 19) / 3.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K2_LUNGE" if f <= 20 else "K1_COIL",
                    dx=lerp(10.0, 1.0, t),
                    dy=lerp(0.0, 3.0, math.sin(t * math.pi)),
                    aim_deg=lerp(24.0, -118.0, t),
                    grip_offset=(lerp(7.5, -1.0, t), lerp(1.0, -6.0, t)),
                    blaze=0.60 + 0.30 * t,
                    halo_flare=0.45 + 0.40 * t,
                    phase=ph,
                )
            )

        # --- V3 (F23..F29): Airborne Helios Hop-Slam -> Meteoric Flame-Pillar Finisher ---
        elif f in (23, 24):
            t = f - 23
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K4_LEAP",
                    dx=5.0 + t * 3.0,
                    dy=-11.0 - t * 3.0,
                    aim_deg=-132.0 - t * 14.0,
                    grip_offset=(0.0, -8.0),
                    blaze=1.0,
                    halo_flare=1.0,
                    phase=ph,
                )
            )
        elif f == 25:
            # 1-FRAME METEORIC FLAME-PILLAR SLAM SNAP (Grounded at y_bot = 115!)
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=14.0,
                    dy=0.0,
                    aim_deg=34.0,
                    grip_offset=(9.5, 2.5),
                    blaze=1.0,
                    halo_flare=1.0,
                    phase=ph,
                    pillar_spec={"x": AX + 68.0, "y_floor": 115, "width": 15.0, "intensity": 1.0},
                    smear_spec={
                        "center": (AX + 28.0, 66.0),
                        "deg_start": -142.0,
                        "deg_end": 44.0,
                        "r_outer": 64.0,
                        "thickness": 24.0,
                        "sparks": 18,
                    },
                )
            )
        elif f == 26:
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=14.0,
                    dy=0.0,
                    aim_deg=42.0,
                    grip_offset=(9.0, 3.5),
                    blaze=0.90,
                    halo_flare=0.80,
                    phase=ph,
                    pillar_spec={"x": AX + 68.0, "y_floor": 115, "width": 12.0, "intensity": 0.72},
                )
            )
        else:
            # F27..F29: Crisp grounded recovery back toward battle stance
            t = (f - 27) / 2.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K2_LUNGE" if f == 27 else "STAND",
                    dx=lerp(11.0, 2.0, t),
                    dy=0.0,
                    aim_deg=lerp(36.0, -34.0, t),
                    grip_offset=(lerp(8.0, 5.0, t), lerp(2.5, -1.5, t)),
                    blaze=lerp(0.75, 0.40, t),
                    halo_flare=lerp(0.55, 0.18, t),
                    phase=ph,
                )
            )
    return frames


def build_row_3_skill(poses):
    """Row 3 SKILL (`TRIPLE SOLAR PILLAR`): Skyward invocation -> sweeping Sun-Glaive command eruption."""
    frames = []
    for f in range(30):
        ph = f / 30.0
        if f < 8:
            t = f / 7.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K1_COIL" if f < 4 else "K3_RISE",
                    dx=lerp(-2.0, 3.0, t),
                    dy=0.0,
                    aim_deg=lerp(-55.0, -92.0, t),
                    grip_offset=(4.0, lerp(-2.0, -10.0, t)),
                    two_handed=False,
                    offhand_target=(AX - 12.0, lerp(72.0, 56.0, t)),
                    blaze=0.55 + 0.45 * t,
                    halo_flare=0.40 + 0.60 * t,
                    phase=ph,
                )
            )
        elif f == 8:
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=11.0,
                    dy=0.0,
                    aim_deg=12.0,
                    grip_offset=(9.0, -1.0),
                    blaze=1.0,
                    halo_flare=1.0,
                    phase=ph,
                    pillar_spec={"x": AX + 64.0, "y_floor": 115, "width": 14.0, "intensity": 1.0},
                    smear_spec={
                        "center": (AX + 24.0, 68.0),
                        "deg_start": -96.0,
                        "deg_end": 28.0,
                        "r_outer": 60.0,
                        "thickness": 18.0,
                        "sparks": 14,
                    },
                )
            )
        elif f < 20:
            t = (f - 9) / 10.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=11.0 - t * 2.0,
                    dy=0.0,
                    aim_deg=14.0 + math.sin(t * math.pi * 2.0) * 5.0,
                    grip_offset=(8.5, -0.5),
                    blaze=0.95 - 0.25 * t,
                    halo_flare=0.85 - 0.30 * t,
                    phase=ph,
                    pillar_spec=(
                        {"x": AX + 64.0, "y_floor": 115, "width": 11.0, "intensity": 1.0 - t * 0.75}
                        if f <= 14
                        else None
                    ),
                )
            )
        else:
            t = (f - 20) / 9.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="STAND",
                    dx=lerp(8.0, 0.0, t),
                    dy=0.0,
                    aim_deg=lerp(10.0, -40.0, t),
                    grip_offset=(lerp(8.0, 4.5, t), -1.5),
                    blaze=lerp(0.65, 0.35, t),
                    halo_flare=lerp(0.50, 0.15, t),
                    phase=ph,
                )
            )
    return frames


def build_row_4_ultimate(poses):
    """
    Row 4 ULTIMATE (`BLACK-SUN SUPERNOVA` & `CATACLYSM: LAYWASTE OF INFERNO`):
    Ascendant K3_RISE -> levitating K4_LEAP Eclipse Archmage -> F18 Cataclysmic Command Slash!
    """
    frames = []
    for f in range(30):
        ph = f / 30.0
        if f < 7:
            t = f / 6.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K3_RISE",
                    dx=lerp(0.0, 2.0, t),
                    dy=lerp(0.0, -4.0, t),
                    aim_deg=lerp(-48.0, -90.0, t),
                    grip_offset=(4.0, lerp(-3.0, -11.0, t)),
                    blaze=0.65 + 0.35 * t,
                    halo_flare=0.50 + 0.50 * t,
                    eclipse_halo=True,
                    phase=ph,
                )
            )
        elif f < 18:
            t = (f - 7) / 10.0
            hover = -8.0 - math.sin(t * math.pi) * 4.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K4_LEAP",
                    dx=3.0,
                    dy=hover,
                    aim_deg=-92.0 + math.sin(t * math.tau * 2.0) * 8.0,
                    grip_offset=(3.0, -10.5),
                    two_handed=False,
                    offhand_target=(AX + 18.0, 62.0 + hover),
                    blaze=1.0,
                    halo_flare=1.0,
                    eclipse_halo=(f % 2 == 0),
                    phase=ph,
                    vortex_spec={
                        "center": (AX + 4.0, 108.0),
                        "rx": 26.0 + 6.0 * math.sin(t * math.pi),
                        "ry": 6.0,
                        "thickness": 5.0,
                    },
                )
            )
        elif f == 18:
            # Cataclysmic Heavensfall Command Slash!
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=13.0,
                    dy=0.0,
                    aim_deg=32.0,
                    grip_offset=(9.5, 2.0),
                    blaze=1.0,
                    halo_flare=1.0,
                    eclipse_halo=True,
                    phase=ph,
                    smear_spec={
                        "center": (AX + 26.0, 66.0),
                        "deg_start": -132.0,
                        "deg_end": 54.0,
                        "r_outer": 65.0,
                        "thickness": 24.0,
                        "eclipse": True,
                        "sparks": 18,
                    },
                )
            )
        else:
            t = (f - 19) / 10.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K2_LUNGE" if f < 25 else "STAND",
                    dx=lerp(12.0, 0.0, t),
                    dy=0.0,
                    aim_deg=lerp(36.0, -40.0, t),
                    grip_offset=(lerp(9.0, 4.5, t), lerp(2.0, -1.5, t)),
                    blaze=lerp(0.95, 0.40, t),
                    halo_flare=lerp(0.90, 0.15, t),
                    eclipse_halo=(f < 23),
                    phase=ph,
                )
            )
    return frames


def build_row_5_hit(poses):
    frames = []
    for f in range(30):
        ph = f / 30.0
        if f < 7:
            t = f / 6.0
            recoil = math.sin(t * math.pi * 0.5)
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K1_COIL",
                    dx=-7.0 * recoil,
                    dy=1.0 * recoil,
                    aim_deg=-118.0 - 18.0 * recoil,
                    grip_offset=(-2.0, -3.0),
                    blaze=0.30,
                    halo_flare=0.10,
                    phase=ph,
                )
            )
        elif f < 18:
            t = (f - 7) / 10.0
            shk = math.sin(f * 2.4) * (1.0 - t) * 1.5
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K1_COIL",
                    dx=-7.0 + t * 3.0 + shk,
                    dy=1.0,
                    aim_deg=-130.0 + t * 30.0,
                    grip_offset=(-1.0, -2.5),
                    blaze=0.35,
                    phase=ph,
                )
            )
        else:
            t = (f - 18) / 11.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="STAND",
                    dx=lerp(-4.0, 0.0, t),
                    dy=0.0,
                    aim_deg=lerp(-95.0, -42.0, t),
                    grip_offset=(4.5, -1.5),
                    blaze=0.35,
                    phase=ph,
                )
            )
    return frames


def build_row_6_block_parry(poses):
    """Row 6 BLOCK (`F00..F11`) & PARRY COUNTER (`F12..F29`)."""
    frames = []
    for f in range(30):
        ph = f / 30.0
        if f < 12:
            # Spinning vertical Sun-Glaive solar ward
            wob = math.sin((f / 12.0) * math.tau * 2.0) * 4.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="STAND",
                    dx=-2.0,
                    dy=1.0,
                    aim_deg=-78.0 + wob,
                    grip_offset=(8.5, -3.5),
                    blaze=0.65,
                    halo_flare=0.45,
                    phase=ph,
                )
            )
        elif f == 12:
            # Parry counter solar slash snap!
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=11.0,
                    dy=0.0,
                    aim_deg=26.0,
                    grip_offset=(9.0, 1.0),
                    blaze=1.0,
                    halo_flare=1.0,
                    phase=ph,
                    smear_spec={
                        "center": (AX + 24.0, 68.0),
                        "deg_start": -110.0,
                        "deg_end": 46.0,
                        "r_outer": 60.0,
                        "thickness": 20.0,
                        "sparks": 14,
                    },
                )
            )
        else:
            t = (f - 13) / 16.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K2_LUNGE" if f < 20 else "STAND",
                    dx=lerp(11.0, 0.0, t),
                    dy=0.0,
                    aim_deg=lerp(32.0, -42.0, t),
                    grip_offset=(lerp(8.5, 4.5, t), -1.0),
                    blaze=lerp(0.85, 0.35, t),
                    halo_flare=lerp(0.65, 0.15, t),
                    phase=ph,
                )
            )
    return frames


def build_row_7_crouch(poses):
    """Row 7 CROUCH / FLAME WARD: Grounded tactical crouch + orbiting Flame Ward rings."""
    frames = []
    for f in range(30):
        ph = f / 30.0
        bob = math.sin(ph * math.tau * 2.0) * 0.8
        frames.append(
            compose_mage_frame(
                poses,
                pose_key="K2_LUNGE",
                dx=2.0,
                dy=2.0 + round(bob),
                aim_deg=-18.0 + math.sin(ph * math.tau) * 5.0,
                grip_offset=(6.5, 1.0),
                blaze=0.55 + 0.15 * math.sin(ph * math.tau * 2.0),
                halo_flare=0.35,
                phase=ph,
                vortex_spec={
                    "center": (AX + 4.0, 96.0),
                    "rx": 24.0 + math.sin(ph * math.tau) * 2.0,
                    "ry": 5.5,
                    "thickness": 4.2,
                },
            )
        )
    return frames


def build_row_8_jump_blink(poses):
    """Row 8 JUMP / ARCANE BLINK WARP: K4_LEAP airborne arc + Arcane Blink solar warp rings."""
    frames = []
    for f in range(30):
        ph = f / 30.0
        arc = math.sin(ph * math.pi)
        blink = 1.0 - abs(ph - 0.25) * 4.0 if ph < 0.5 else 0.0
        frames.append(
            compose_mage_frame(
                poses,
                pose_key="K4_LEAP" if 3 <= f <= 25 else "STAND",
                dx=arc * 4.0,
                dy=-arc * 12.0,
                aim_deg=-52.0 - arc * 36.0 + math.sin(ph * math.tau) * 6.0,
                grip_offset=(4.5, -3.0 - arc * 3.0),
                blaze=0.60 + 0.30 * arc,
                halo_flare=0.45 + 0.45 * arc,
                phase=ph,
                blink_rings=max(0.0, blink),
            )
        )
    return frames


def build_row_9_death(poses):
    """Row 9 DEATH: Dramatic stagger -> fallen collapse -> smoldering Helios Sun-Glaive & drifting embers."""
    frames = []
    for f in range(30):
        ph = f / 30.0
        if f < 10:
            t = f / 9.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K1_COIL",
                    dx=-8.0 * t,
                    dy=4.0 * t,
                    aim_deg=lerp(-110.0, -155.0, t),
                    grip_offset=(-2.0, 1.0),
                    blaze=0.35 * (1.0 - t),
                    halo_flare=0.15 * (1.0 - t),
                    phase=ph,
                )
            )
        else:
            # Rotate fallen body progressively toward horizontal ground rest at AY=115
            t = clamp((f - 10) / 11.0, 0.0, 1.0)
            rot_deg = lerp(22.0, 84.0, smoothstep(t))
            base_im = poses["stand_full"].rotate(-rot_deg, resample=Image.Resampling.NEAREST, expand=True)
            b_arr = np.array(base_im)
            ys, xs = np.where(b_arr[:, :, 3] > 0)
            canvas = Image.new("RGBA", (LOG_W, LOG_H), (0, 0, 0, 0))
            if len(ys) > 0:
                min_x, max_x = int(xs.min()), int(xs.max())
                max_y = int(ys.max())
                ox = clamp(AX - (min_x + max_x) // 2, 4, LOG_W - b_arr.shape[1] - 4)
                oy = (AY - 2) - max_y
                canvas.alpha_composite(base_im, (ox, oy))
            arr = np.array(canvas)
            # Planted/fallen Helios Sun-Glaive resting beside Ignis Sol EX + flickering dying embers (`29/29` transitions!)
            draw_helios_sunglaive(
                arr,
                (AX + 8.0, 110.0),
                angle_deg=lerp(-12.0, 4.0, t),
                length_scale=0.92,
                blaze=0.18 + 0.08 * math.sin(ph * math.tau * 3.0),
                phase=ph,
            )
            for k in range(5):
                ex = int(round(AX - 16 + k * 9 + math.sin(f * 0.9 + k) * 2.5))
                ey = int(round(108 - ((f * 2 + k * 5) % 18)))
                put_px(arr, ex, ey, C_FLAME_GOLD if (f + k) % 2 == 0 else C_FLAME_CRIMSON)
            enforce_safety_margin(arr)
            frames.append(arr)
    return frames


# ==============================================================================
# 7. PORTRAIT BUILDER (128x128, 2x2 PIXEL BLOCKS) & SHEET ASSEMBLY / QA AUDIT
# ==============================================================================
def build_portrait():
    raw = Image.open(PORTRAIT_JPG).convert("RGB")
    w, h = raw.size
    # Crop centered close-up on face, crown, chest orb & Sun-Glaive
    s = int(min(w, h) * 0.88)
    x0 = (w - s) // 2
    y0 = max(0, int((h - s) * 0.30))
    crop = raw.crop((x0, y0, x0 + s, y0 + s)).resize((64, 64), Image.Resampling.BILINEAR)
    q64 = crop.quantize(colors=40, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGBA")
    arr = np.array(q64)
    # Crisp 1px dark-gold frame border in 64x64 logical -> 2px in 128x128
    arr[0, :] = C_OUT
    arr[63, :] = C_OUT
    arr[:, 0] = C_OUT
    arr[:, 63] = C_OUT
    arr[1, 1:63] = C_GOLD_DARK
    arr[62, 1:63] = C_GOLD_DARK
    arr[1:63, 1] = C_GOLD_DARK
    arr[1:63, 62] = C_GOLD_DARK
    out128 = Image.fromarray(arr, "RGBA").resize((128, 128), Image.Resampling.NEAREST)
    out128.save(OUT_PORTRAIT)
    return out128


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scratch-dir", default=DEFAULT_SCRATCH)
    args = parser.parse_args()
    os.makedirs(args.scratch_dir, exist_ok=True)

    print("[mage_ex] Loading base & 2x2 action keyposes...")
    poses = load_mage_poses()

    row_builders = [
        ("Row 0 IDLE", build_row_0_idle),
        ("Row 1 WALK", build_row_1_walk),
        ("Row 2 AUTO_ATTACK", build_row_2_auto_attack),
        ("Row 3 SKILL", build_row_3_skill),
        ("Row 4 ULTIMATE", build_row_4_ultimate),
        ("Row 5 HIT", build_row_5_hit),
        ("Row 6 BLOCK_PARRY", build_row_6_block_parry),
        ("Row 7 CROUCH", build_row_7_crouch),
        ("Row 8 JUMP_BLINK", build_row_8_jump_blink),
        ("Row 9 DEATH", build_row_9_death),
    ]

    sheet = Image.new("RGBA", (CELL_W * COLS, CELL_H * ROWS), (0, 0, 0, 0))
    border_clips = 0
    all_rows_320 = []

    for r_idx, (r_name, builder) in enumerate(row_builders):
        log_frames = builder(poses)
        assert len(log_frames) == COLS, f"{r_name} produced {len(log_frames)} frames!"
        transitions = 0
        row_320 = []
        for c_idx, farr in enumerate(log_frames):
            if c_idx > 0 and not np.array_equal(log_frames[c_idx - 1], farr):
                transitions += 1
            im_log = Image.fromarray(farr, "RGBA")
            im_320 = im_log.resize((CELL_W, CELL_H), Image.Resampling.NEAREST)
            a320 = np.array(im_320)[:, :, 3]
            if (
                a320[0, :].any()
                or a320[-1, :].any()
                or a320[:, 0].any()
                or a320[:, -1].any()
            ):
                border_clips += 1
            sheet.paste(im_320, (c_idx * CELL_W, r_idx * CELL_H))
            row_320.append(im_320)
        all_rows_320.append(row_320)
        print(f"  [{r_name}] transitions={transitions}/29")
        if transitions < 29:
            raise RuntimeError(f"{r_name} has static duplicate frames ({transitions}/29)!")

    if border_clips != 0:
        raise RuntimeError(f"Border clip violation: {border_clips}/300!")

    sheet.save(OUT_SHEET)
    port = build_portrait()
    print(f"[mage_ex] Saved {OUT_SHEET} ({sheet.size[0]}x{sheet.size[1]}), border_clips={border_clips}/300")
    print(f"[mage_ex] Saved {OUT_PORTRAIT} ({port.size[0]}x{port.size[1]})")

    # Save Visual QA Contact Sheets in untracked scratch dir!
    # 1. Row 2 AUTO_ATTACK 6x5 zoomed contact sheet on dark-slate + mid-gray check
    r2_w, r2_h = 6 * (CELL_W + 6) + 6, 5 * (CELL_H + 6) + 6
    dbg_r2 = Image.new("RGBA", (r2_w, r2_h), (26, 22, 32, 255))
    dr = ImageDraw.Draw(dbg_r2)
    for idx, im320 in enumerate(all_rows_320[2]):
        gx = (idx % 6) * (CELL_W + 6) + 6
        gy = (idx // 6) * (CELL_H + 6) + 6
        # Checkerboard background to expose any white halo immediately!
        bg = Image.new("RGBA", (CELL_W, CELL_H), (36, 32, 46, 255))
        bg_d = ImageDraw.Draw(bg)
        bg_d.line([(0, 230), (319, 230)], fill=(90, 70, 50, 255), width=1)
        bg_d.line([(112, 0), (112, 239)], fill=(70, 80, 110, 255), width=1)
        bg.alpha_composite(im320, (0, 0))
        dbg_r2.paste(bg, (gx, gy))
        dr.text((gx + 6, gy + 4), f"F{idx:02d}", fill=(255, 235, 140, 255))
    dbg_r2.save(os.path.join(args.scratch_dir, "debug_mage_ex_row2.png"))

    # 2. All 10 rows split left (F00..F14) and right (F15..F29) at half-size (160x120)
    for half_idx, (c0, c1, tag) in enumerate([(0, 15, "left_F00_F14"), (15, 30, "right_F15_F29")]):
        gw = 15 * (LOG_W + 3) + 3
        gh = 10 * (LOG_H + 3) + 3
        grid = Image.new("RGBA", (gw, gh), (22, 20, 28, 255))
        for r_i in range(10):
            for c_i in range(c0, c1):
                cell = all_rows_320[r_i][c_i].resize((LOG_W, LOG_H), Image.Resampling.NEAREST)
                px = (c_i - c0) * (LOG_W + 3) + 3
                py = r_i * (LOG_H + 3) + 3
                bg = Image.new("RGBA", (LOG_W, LOG_H), (34, 30, 44, 255))
                bg.alpha_composite(cell, (0, 0))
                grid.paste(bg, (px, py))
        grid.save(os.path.join(args.scratch_dir, f"debug_mage_ex_10rows_{tag}.png"))

    port.save(os.path.join(args.scratch_dir, "debug_mage_ex_portrait.png"))
    print(f"[mage_ex] Wrote QA contact sheets to {args.scratch_dir}")


if __name__ == "__main__":
    main()
