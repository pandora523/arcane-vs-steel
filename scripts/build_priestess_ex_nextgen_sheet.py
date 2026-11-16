#!/usr/bin/env python3
"""
SERAPHINA EX (`priestess_ex`) — Next-Gen Wide-Canvas (`320x240` cell, `9600x2400` 30x10 sheet)
Pure High-Priestess Cathedral Scepter / Holy Crozier + Stained-Glass Sorcery Pipeline.

Outputs:
  - `assets/sprites/priestess_ex_sheet.png`    (9600x2400, 30 cols x 10 rows @ 320x240, 2x2 pixel blocks)
  - `assets/sprites/priestess_ex_portrait.png` (128x128, 2x2 pixel blocks, Seraphic portrait with 0 spear-tip!)
  - Untracked QA contact sheets in scratch directory (`--scratch-dir`)

Invariants enforced:
  - Ornate Sunburst Cathedral Scepter / Holy Crozier (`0` melee spear point anywhere!)
  - STRICTLY GROUNDED Row 2 AUTO_ATTACK (`foot_y = 115 -> y_320 = 230`, `0px` float across `V0..V3`!)
  - Pure Stained-Glass High-Priestess Casting `Row 2` (`0` melee scythe/halberd slash crescents!):
      * `V0 (F03)`: Radiant Stained-Glass Rose-Window Magic Circle + Sanctum Light-Ray Burst (`x = 185..300`)
      * `V1 (F09)`: Twin Golden Benediction Halos & Twin Converging Sacred Light-Prisms (`x = 186..298`)
      * `V2 (F17)`: Choir Light-Prism Seals & Consecrated Rose-Cathedral Pillar (`x = 188..304`)
      * `V3 (F25)`: Purifying Star-Sanctuary Array & Triple Sanctum Prism Orbs (`x = 190..305`)
      * Progressive `4x4` Bayer dissipation on `F04..F05`, `F10..F11`, `F18..F19`, `F26..F27`
  - 100% 2x2 integer pixel blocks, binary alpha (`0` or `255`), `4px` margin (`0/300` border clips), `29/29` transitions
"""

import argparse
import math
import os
from collections import deque

import numpy as np
from PIL import Image, ImageDraw

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE_JPG = os.path.join(REPO_ROOT, "assets", "sprites", "priestess_ex_base.jpg")
KEYPOSES_JPG = os.path.join(REPO_ROOT, "assets", "sprites", "priestess_ex_keyposes_ref.jpg")
PORTRAIT_JPG = os.path.join(REPO_ROOT, "assets", "sprites", "priestess_ex_portrait_raw.jpg")

OUT_SHEET = os.path.join(REPO_ROOT, "assets", "sprites", "priestess_ex_sheet.png")
OUT_PORTRAIT = os.path.join(REPO_ROOT, "assets", "sprites", "priestess_ex_portrait.png")

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

# Seraphic Sovereign Ivory-Gold, Sapphire, and Stained-Glass Rose Palette
C_OUT = (26, 16, 38, 255)
C_IVORY_SHADE = (196, 178, 164, 255)
C_IVORY_MID = (232, 220, 204, 255)
C_IVORY_LIGHT = (250, 244, 232, 255)
C_NAVY_DARK = (32, 38, 68, 255)
C_NAVY_MID = (54, 66, 108, 255)
C_GOLD_DARK = (152, 98, 28, 255)
C_GOLD_MID = (218, 158, 42, 255)
C_GOLD_LIGHT = (252, 214, 78, 255)
C_SAPPHIRE = (56, 189, 248, 255)
C_EMERALD_GLASS = (52, 211, 153, 255)
C_SKIN_SHADOW = (204, 152, 128, 255)
C_SKIN_LIGHT = (246, 204, 178, 255)

# Stained-Glass Sacred Sorcery Palette
C_LIGHT_CORE = (255, 255, 255, 255)
C_LIGHT_SUNGOLD = (254, 240, 138, 255)
C_LIGHT_CHAMPAGNE = (251, 191, 36, 255)
C_LIGHT_ROSE = (251, 113, 133, 255)
C_LIGHT_RUBY = (190, 18, 60, 255)


def clamp(v, lo, hi):
    return lo if v < lo else (hi if v > hi else v)


def lerp(a, b, t):
    return a + (b - a) * t


def smoothstep(t):
    t = clamp(t, 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


# ==============================================================================
# 1. SURGICAL WHITE-BG SEGMENTATION FOR IVORY-GOLD ARMOR & CROWN HALO
# ==============================================================================
def keep_largest_component(mask):
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
    for px, py in comps[0]:
        out[py, px] = True
    return out


def segment_ivory_safe_white_bg(im_rgb, pocket_seeds=()):
    arr = np.array(im_rgb.convert("RGB"), dtype=np.float32)
    h, w, _ = arr.shape
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    luma = 0.299 * r + 0.587 * g + 0.114 * b
    cmax = np.maximum(np.maximum(r, g), b)
    cmin = np.minimum(np.minimum(r, g), b)
    sat = np.where(cmax > 1.0, (cmax - cmin) / np.maximum(cmax, 1.0), 0.0)

    bg_cand = ((luma >= 243.0) & (sat <= 0.052)) | (luma >= 252.5)

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
        for oy in range(-2, 3):
            for ox in range(-2, 3):
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

    fg = ~bg
    border_touch = np.zeros((h, w), dtype=bool)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        shifted = np.roll(np.roll(bg, dy, axis=0), dx, axis=1)
        border_touch |= fg & shifted
    fringe = border_touch & (luma >= 232.0) & (sat <= 0.085)
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
    soft_edge = edge & (luma > 102.0)
    q_rgb[soft_edge] = q_rgb[soft_edge] * 0.35 + np.array([28.0, 18.0, 42.0]) * 0.65

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
    fg = fg & ~(edge & (luma >= 228.0) & (sat <= 0.10))

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
# 2. LOAD BASE + 4 ACTION KEYPOSES
# ==============================================================================
def load_priestess_poses():
    base_raw = Image.open(BASE_JPG).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
    base_pockets = [(256, 56), (244, 58), (270, 58), (168, 127), (161, 208), (183, 207)]
    base_seg = segment_ivory_safe_white_bg(base_raw, pocket_seeds=base_pockets)
    base_arr = np.array(base_seg)

    ys, _ = np.where(base_arr[:, :, 3] > 0)
    y_top_stand, y_bot_stand = int(ys.min()), int(ys.max())
    stand_h_512 = max(1, y_bot_stand - y_top_stand)
    scale = TARGET_STAND_H / float(stand_h_512)
    x_ref_stand = 260

    front_arm_poly = polygon_mask((512, 512), [(304, 142), (426, 136), (426, 210), (304, 206)])
    back_hand_poly = polygon_mask((512, 512), [(134, 200), (192, 204), (198, 234), (134, 234)])
    armless_512 = base_arr.copy()
    armless_512[front_arm_poly | back_hand_poly, 3] = 0
    fg_armless = keep_largest_component(armless_512[:, :, 3] > 0)
    armless_512[:, :, 3] = np.where(fg_armless, 255, 0)

    stand_full_log, ox_s, oy_s = scale_pose_to_logical(base_seg, x_ref_stand, y_bot_stand, scale)
    stand_armless_log, _, _ = scale_pose_to_logical(
        Image.fromarray(armless_512, "RGBA"), x_ref_stand, y_bot_stand, scale
    )

    def to_log(pt):
        return (ox_s + pt[0] * scale, oy_s + pt[1] * scale)

    stand_joints = {
        "sh_front": to_log((298, 166)),
        "sh_back": to_log((228, 168)),
        "gem": to_log((266, 166)),
        "halo": to_log((256, 56)),
    }

    kp_sheet = Image.open(KEYPOSES_JPG).convert("RGB")
    kw, kh = kp_sheet.size
    hw, hh = kw // 2, kh // 2
    quad_specs = {
        "K1_COIL": {
            "crop": (0, 0, hw, hh),
            "pockets": [(269, 63), (254, 63), (284, 63), (179, 134), (171, 213), (194, 213)],
            "strip_polys": [
                [(128, 202), (226, 206), (226, 268), (128, 268)],
                [(314, 152), (368, 112), (456, 112), (456, 242), (314, 216)],
            ],
            "x_ref": 270,
            "y_bot": 502,
            "sh_front": (308, 174),
            "sh_back": (234, 174),
            "gem": (278, 174),
        },
        "K2_LUNGE": {
            "crop": (hw, 0, kw, hh),
            "pockets": [(293, 108), (280, 108), (306, 108), (189, 163), (196, 241)],
            "strip_polys": [
                [(186, 232), (242, 232), (242, 274), (186, 274)],
                [(330, 196), (476, 166), (476, 288), (330, 258)],
            ],
            "x_ref": 268,
            "y_bot": 490,
            "sh_front": (322, 214),
            "sh_back": (252, 208),
            "gem": (294, 212),
        },
        "K3_RISE": {
            "crop": (0, hh, hw, kh),
            "pockets": [(258, 56), (244, 58), (272, 58)],
            "strip_polys": [
                [(96, 0), (188, 0), (188, 108), (214, 134), (186, 148), (96, 140)],
                [(304, 0), (444, 0), (444, 204), (304, 204)],
            ],
            "x_ref": 264,
            "y_bot": 501,
            "sh_front": (300, 172),
            "sh_back": (226, 172),
            "gem": (268, 170),
        },
        "K4_LEAP": {
            "crop": (hw, hh, kw, kh),
            "pockets": [(266, 39), (252, 40), (280, 40), (237, 398), (170, 111), (141, 161)],
            "strip_polys": [
                [(298, 154), (346, 154), (346, 230), (298, 230)],
            ],
            "x_ref": 266,
            "y_bot": 474,
            "sh_front": (296, 154),
            "sh_back": (238, 154),
            "gem": (274, 150),
        },
    }

    keyposes = {}
    for kname, spec in quad_specs.items():
        tile = kp_sheet.crop(spec["crop"]).resize((512, 512), Image.Resampling.LANCZOS)
        seg = segment_ivory_safe_white_bg(tile, pocket_seeds=spec["pockets"])
        t_arr = np.array(seg)
        for poly in spec["strip_polys"]:
            pm = polygon_mask((512, 512), poly)
            t_arr[pm, 3] = 0
        t_fg = keep_largest_component(t_arr[:, :, 3] > 0)
        t_arr[:, :, 3] = np.where(t_fg, 255, 0)

        k_ys, _ = np.where(t_fg)
        true_y_bot = int(k_ys.max()) if len(k_ys) else spec["y_bot"]

        kp_log, kox, koy = scale_pose_to_logical(
            Image.fromarray(t_arr, "RGBA"), spec["x_ref"], true_y_bot, scale
        )
        keyposes[kname] = {
            "armless": kp_log,
            "sh_front": (kox + spec["sh_front"][0] * scale, koy + spec["sh_front"][1] * scale),
            "sh_back": (kox + spec["sh_back"][0] * scale, koy + spec["sh_back"][1] * scale),
            "gem": (kox + spec["gem"][0] * scale, koy + spec["gem"][1] * scale),
        }

    return {
        "scale": scale,
        "stand_full": stand_full_log,
        "stand_armless": stand_armless_log,
        "stand_joints": stand_joints,
        "keyposes": keyposes,
    }


# ==============================================================================
# 3. CATHEDRAL STOLE RIBBONS, PURE SUNBURST CATHEDRAL SCEPTER (`0` SPEAR!) & IK
# ==============================================================================
def put_px(arr, x, y, col):
    if 2 <= x < LOG_W - 2 and 2 <= y < LOG_H - 2:
        arr[y, x] = col


def put_px_outline_bg(arr, x, y, col, max_y=117):
    if 2 <= x < LOG_W - 2 and 2 <= y <= min(LOG_H - 3, max_y) and arr[y, x, 3] == 0:
        arr[y, x] = col


def draw_thick_line(arr, x0, y0, x1, y1, r, col, out_col=None, max_y=117):
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
                        put_px_outline_bg(arr, icx + dx, icy + dy, out_col, max_y=max_y)
    ir = int(math.ceil(r))
    for i in range(steps + 1):
        t = i / float(steps)
        cx = x0 + (x1 - x0) * t
        cy = y0 + (y1 - y0) * t
        icx, icy = int(round(cx)), int(round(cy))
        for dy in range(-ir, ir + 1):
            for dx in range(-ir, ir + 1):
                if dx * dx + dy * dy <= r * r + 0.2 and icy + dy <= max_y:
                    put_px(arr, icx + dx, icy + dy, col)


def draw_pixel_star4(arr, cx, cy, arm=3, core_col=C_LIGHT_CORE, ray_col=C_LIGHT_SUNGOLD, max_y=115):
    icx, icy = int(round(cx)), int(round(cy))
    for d in range(-arm - 1, arm + 2):
        put_px_outline_bg(arr, icx + d, icy, C_OUT, max_y=max_y)
        put_px_outline_bg(arr, icx, icy + d, C_OUT, max_y=max_y)
    for d in range(-arm, arm + 1):
        if icy <= max_y:
            put_px(arr, icx + d, icy, ray_col)
        if icy + d <= max_y:
            put_px(arr, icx, icy + d, ray_col)
    for ox, oy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        if icy + oy <= max_y:
            put_px(arr, icx + ox, icy + oy, ray_col)
    if icy <= max_y:
        put_px(arr, icx, icy, core_col)


def solve_2bone_ik(sh, target, l1=8.2, l2=8.2, bend_sign=1.0):
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


def draw_priestess_arm(arr, sh, grip, is_front=True, bend_sign=1.0, max_y=114):
    el, hand = solve_2bone_ik(sh, grip, l1=8.3, l2=8.3, bend_sign=bend_sign)
    sleeve_upper = C_NAVY_MID if is_front else C_NAVY_DARK
    bracer = C_IVORY_LIGHT if is_front else C_IVORY_MID
    cuff = C_GOLD_LIGHT if is_front else C_GOLD_MID
    skin = C_SKIN_LIGHT if is_front else C_SKIN_SHADOW

    draw_thick_line(arr, sh[0] - 0.8, sh[1] - 0.6, sh[0] + 1.0, sh[1] + 0.5, 2.0, bracer, out_col=C_OUT, max_y=max_y)
    put_px(arr, int(round(sh[0])), int(round(sh[1] - 1)), cuff)
    draw_thick_line(arr, sh[0], sh[1], el[0], el[1], 1.65, sleeve_upper, out_col=C_OUT, max_y=max_y)
    draw_thick_line(arr, el[0], el[1], hand[0], hand[1], 1.55, bracer, out_col=C_OUT, max_y=max_y)
    mx, my = lerp(el[0], hand[0], 0.58), lerp(el[1], hand[1], 0.58)
    draw_thick_line(arr, mx - 0.4, my - 0.4, mx + 0.4, my + 0.4, 1.35, cuff, out_col=None, max_y=max_y)
    draw_thick_line(arr, hand[0] - 0.4, hand[1] - 0.3, hand[0] + 0.5, hand[1] + 0.3, 1.4, skin, out_col=C_OUT, max_y=max_y)
    return hand


def draw_sanctum_stole_and_halo(arr, cx, cy, phase, flare=0.0, max_y=114):
    rx = 13.5 * (0.9 + 0.12 * flare)
    ry = 14.5 * (0.9 + 0.12 * flare)
    for k in range(8):
        ang = phase * math.tau + k * (math.tau / 8.0)
        r0 = 0.86
        r1 = (1.24 + 0.16 * flare) if k % 2 == 0 else 1.08
        x0, y0 = cx + math.cos(ang) * rx * r0, cy + math.sin(ang) * ry * r0
        x1, y1 = cx + math.cos(ang) * rx * r1, cy + math.sin(ang) * ry * r1
        draw_thick_line(
            arr,
            x0,
            y0,
            x1,
            y1,
            0.85 if k % 2 == 0 else 0.6,
            C_LIGHT_SUNGOLD if k % 2 == 0 else C_LIGHT_ROSE,
            out_col=C_OUT,
            max_y=max_y,
        )

    pts = []
    for i in range(6):
        t = i / 5.0
        rx_p = cx - 8.0 - t * 17.0
        ry_p = min(float(max_y - 2), cy + 6.0 + t * 14.0 + math.sin(phase * math.tau - t * 3.2) * (1.8 + 1.5 * t))
        pts.append((rx_p, ry_p))
    for i in range(len(pts) - 1):
        col = C_IVORY_LIGHT if i < 3 else C_LIGHT_ROSE
        draw_thick_line(arr, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 1.25 - i * 0.12, col, out_col=C_OUT, max_y=max_y)
    put_px(arr, int(round(pts[-1][0])), int(round(pts[-1][1])), C_GOLD_LIGHT)


def draw_sunburst_cathedral_scepter(arr, grip_pos, angle_deg, length_scale=1.0, radiance=0.35, max_y=113):
    """
    Pure Ornate Sunburst Cathedral Scepter / Holy Crozier (`0` melee spear point!):
      - Ivory-gold cathedral shaft + royal pommel
      - Winged Stained-Glass Sunburst Halo-Wreath cradling a 4-arm Sapphire & Rose Cathedral Cross
      - Crowned with a compact rounded royal finial orb (zero spearhead!)
    """
    rad = math.radians(angle_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    butt_len = 14.0 * length_scale
    neck_dist = 24.0 * length_scale

    bx, by = grip_pos[0] - ux * butt_len, grip_pos[1] - uy * butt_len
    if by > max_y:
        scale_b = max(0.2, (max_y - grip_pos[1]) / max(1.0, by - grip_pos[1]))
        bx = grip_pos[0] + (bx - grip_pos[0]) * scale_b
        by = max_y
    if by < 5:
        scale_b = max(0.2, (grip_pos[1] - 5.0) / max(1.0, grip_pos[1] - by))
        bx = grip_pos[0] + (bx - grip_pos[0]) * scale_b
        by = 5.0

    nx_p = clamp(grip_pos[0] + ux * neck_dist, 8.0, float(LOG_W - 12))
    ny_p = clamp(grip_pos[1] + uy * neck_dist, 9.0, float(max_y - 7))

    # 1. Ivory-gold shaft & royal sunburst pommel
    draw_thick_line(arr, bx, by, nx_p, ny_p, 1.15, C_GOLD_DARK, out_col=C_OUT, max_y=max_y)
    draw_thick_line(arr, bx + ux * 2.0, by + uy * 2.0, nx_p - ux * 1.5, ny_p - uy * 1.5, 0.70, C_IVORY_LIGHT, out_col=None, max_y=max_y)
    draw_thick_line(arr, bx - ux * 0.8, by - uy * 0.8, bx + ux * 0.8, by + uy * 0.8, 1.65, C_GOLD_LIGHT, out_col=C_OUT, max_y=max_y)

    # 2. Ornate Winged Side-Scrolls flanking the Crozier neck
    wing_span = 5.6 * length_scale
    for sign in (-1.0, 1.0):
        wx0 = nx_p - ux * 1.0 + nx * sign * 1.8
        wy0 = ny_p - uy * 1.0 + ny * sign * 1.8
        wx1 = nx_p + ux * 2.5 + nx * sign * wing_span
        wy1 = ny_p + uy * 2.5 + ny * sign * wing_span
        draw_thick_line(arr, wx0, wy0, wx1, wy1, 1.15, C_GOLD_MID, out_col=C_OUT, max_y=max_y)
        put_px(arr, int(round(wx1)), min(max_y, int(round(wy1))), C_LIGHT_SUNGOLD)

    # 3. Circular Stained-Glass Sunburst Halo-Wreath + 4-Arm Cathedral Cross (`0` spear blade!)
    head_r = 5.0 * length_scale
    hcx = clamp(nx_p + ux * (head_r + 0.8), 8.0, float(LOG_W - 9))
    hcy = clamp(ny_p + uy * (head_r + 0.8), 8.0, float(max_y - 6))

    # Stained-glass rose/sapphire quadrants inside wreath
    ir = int(math.ceil(head_r + 1.2))
    ihcx, ihcy = int(round(hcx)), int(round(hcy))
    for dy in range(-ir, ir + 1):
        for dx in range(-ir, ir + 1):
            py = ihcy + dy
            px = ihcx + dx
            if py > max_y or py < 3 or px < 3 or px >= LOG_W - 3:
                continue
            d = math.hypot(dx, dy)
            if head_r - 0.85 <= d <= head_r + 0.85:
                for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    put_px_outline_bg(arr, px + ox, py + oy, C_OUT, max_y=max_y)
                put_px(arr, px, py, C_GOLD_LIGHT if (dx + dy) % 2 == 0 else C_GOLD_MID)
            elif d < head_r - 0.85 and radiance > 0.45:
                if (dx * dy) != 0 and (abs(dx) + abs(dy)) <= 4:
                    put_px(arr, px, py, C_LIGHT_ROSE if (dx * dy > 0) else C_SAPPHIRE)

    # 4-arm Golden Cathedral Cross inside wreath + compact rounded finial bead on top
    cross_arm = head_r + 1.4
    draw_thick_line(
        arr,
        hcx - ux * cross_arm,
        hcy - uy * cross_arm,
        hcx + ux * (cross_arm + 0.8),
        hcy + uy * (cross_arm + 0.8),
        1.05,
        C_LIGHT_SUNGOLD,
        out_col=C_OUT,
        max_y=max_y,
    )
    draw_thick_line(
        arr,
        hcx - nx * cross_arm,
        hcy - ny * cross_arm,
        hcx + nx * cross_arm,
        hcy + ny * cross_arm,
        1.05,
        C_LIGHT_SUNGOLD,
        out_col=C_OUT,
        max_y=max_y,
    )
    # Center sapphire + white diamond star
    put_px(arr, ihcx, min(max_y, ihcy), C_LIGHT_CORE)
    for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        if ihcy + oy <= max_y:
            put_px(arr, ihcx + ox, ihcy + oy, C_SAPPHIRE if radiance < 0.75 else C_LIGHT_SUNGOLD)

    return (hcx, hcy)


# ==============================================================================
# 4. PURE STAINED-GLASS HIGH-PRIESTESS SPELLCASTING FX (`0` MELEE SLASH SMEARS!)
# ==============================================================================
def draw_rose_window_magic_circle(arr, cx, cy, rx, ry, phase=0.0, dissipate=0.0, max_y=114):
    """Foreshortened Stained-Glass Cathedral Rose-Window Magic Circle."""
    # Stained-glass petal interior (Bayer dithered so it shimmers translucently like cathedral glass!)
    ix0 = max(4, int(round(cx - rx - 2)))
    ix1 = min(LOG_W - 5, int(round(cx + rx + 2)))
    iy0 = max(4, int(round(cy - ry - 2)))
    iy1 = min(max_y, int(round(cy + ry + 2)))

    for py in range(iy0, iy1 + 1):
        dy = (py - cy) / max(1.0, ry)
        for px in range(ix0, ix1 + 1):
            dx = (px - cx) / max(1.0, rx)
            nr = math.hypot(dx, dy)
            if nr > 0.92:
                continue
            bayer = BAYER4[py & 3, px & 3]
            if bayer > (0.48 - 0.35 * dissipate):
                continue
            ang = math.atan2(dy, dx) + phase * math.tau
            sector = int(((ang % math.tau) / math.tau) * 8.0)
            if nr < 0.32:
                put_px(arr, px, py, C_LIGHT_CORE)
            elif sector % 3 == 0:
                put_px(arr, px, py, C_LIGHT_ROSE)
            elif sector % 3 == 1:
                put_px(arr, px, py, C_SAPPHIRE)
            else:
                put_px(arr, px, py, C_LIGHT_SUNGOLD)

    # Concentric gold gothic tracery rings
    for ring_idx, scale_r in enumerate((1.0, 0.62)):
        rrx = max(2.0, rx * scale_r)
        rry = max(2.0, ry * scale_r)
        steps = max(36, int((rrx + rry) * 2.6))
        for i in range(steps):
            ang = (i / float(steps)) * math.tau
            px = int(round(cx + math.cos(ang) * rrx))
            py = int(round(cy + math.sin(ang) * rry))
            if px < 4 or px >= LOG_W - 4 or py < 4 or py > max_y:
                continue
            if dissipate > 0.0 and BAYER4[py & 3, px & 3] < dissipate:
                continue
            for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                put_px_outline_bg(arr, px + ox, py + oy, C_OUT, max_y=max_y)
            arr[py, px] = C_LIGHT_CORE if ((i + int(phase * 24)) % 5 == 0 and ring_idx == 0) else C_LIGHT_SUNGOLD

    # 8-spoke cathedral rose mullions
    for k in range(8):
        ang = phase * math.tau + k * (math.tau / 8.0)
        x1 = cx + math.cos(ang) * rx
        y1 = cy + math.sin(ang) * ry
        steps_s = max(3, int(max(rx, ry) * 0.9))
        for s in range(steps_s + 1):
            t = s / float(steps_s)
            px = int(round(lerp(cx, x1, t)))
            py = int(round(lerp(cy, y1, t)))
            if 4 <= px < LOG_W - 4 and 4 <= py <= max_y:
                if dissipate > 0.0 and BAYER4[py & 3, px & 3] < dissipate + 0.1:
                    continue
                put_px(arr, px, py, C_GOLD_LIGHT)

    if dissipate < 0.45:
        for ang_c in (0.0, math.pi * 0.5, math.pi, math.pi * 1.5):
            draw_pixel_star4(
                arr,
                cx + math.cos(ang_c) * rx,
                cy + math.sin(ang_c) * ry,
                arm=2,
                core_col=C_LIGHT_CORE,
                ray_col=C_LIGHT_SUNGOLD,
                max_y=max_y,
            )


def draw_sanctum_light_ray(arr, x_start, y_center, x_end, half_h=7.5, slope_y=0.0, dissipate=0.0, max_y=114):
    """Purifying Stained-Glass Cathedral Light-Ray & Star-Prism Lance (`0` melee sword arcs!)."""
    ix0 = max(4, int(round(x_start)))
    ix1 = min(LOG_W - 5, int(round(x_end)))
    if ix1 <= ix0 + 2:
        return
    span = float(ix1 - ix0)
    mask = np.zeros((LOG_H, LOG_W), dtype=bool)
    col = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)

    for px in range(ix0, ix1 + 1):
        u = (px - ix0) / span
        cy_loc = y_center + slope_y * u
        diamond_head = 1.35 * max(0.0, 1.0 - abs(u - 0.82) / 0.18)
        beam_prof = math.sin(math.pi * clamp(u * 0.95 + 0.05, 0.0, 1.0)) * 0.66
        hh = max(1.0, half_h * max(beam_prof, diamond_head))
        ihh = int(math.ceil(hh)) + 1
        for dy in range(-ihh, ihh + 1):
            py = int(round(cy_loc + dy))
            if py < 4 or py > max_y:
                continue
            v = abs(dy) / max(0.8, hh)
            if v > 1.0:
                continue
            bayer = BAYER4[py & 3, px & 3]
            if dissipate > 0.0 and bayer < dissipate * (0.75 + 0.45 * v):
                continue
            mask[py, px] = True
            if v < 0.34:
                col[py, px] = C_LIGHT_CORE
            elif v < 0.64:
                col[py, px] = C_LIGHT_SUNGOLD
            elif dy < 0:
                col[py, px] = C_SAPPHIRE if (px % 3 == 0) else C_LIGHT_CHAMPAGNE
            else:
                col[py, px] = C_LIGHT_ROSE

    for py in range(3, min(LOG_H - 3, max_y + 1)):
        for px in range(max(3, ix0 - 1), min(LOG_W - 3, ix1 + 2)):
            if mask[py, px]:
                arr[py, px] = col[py, px]
            elif arr[py, px, 3] == 0:
                for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if py + oy < LOG_H and mask[py + oy, px + ox]:
                        arr[py, px] = C_OUT
                        break

    if dissipate < 0.40:
        hx = lerp(ix0, ix1, 0.84)
        hy = y_center + slope_y * 0.84
        draw_pixel_star4(arr, hx, hy, arm=4, core_col=C_LIGHT_CORE, ray_col=C_LIGHT_SUNGOLD, max_y=max_y)


def draw_radiant_star_pillar(arr, x_center, y_top=12, y_floor=114, width=13.0, dissipate=0.0):
    """Vertical Stained-Glass Cathedral Sanctum Pillar (`V2 F17`, `V3 F25`, `SKILL`)."""
    icx = int(round(x_center))
    mask = np.zeros((LOG_H, LOG_W), dtype=bool)
    col = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)
    span_y = max(1.0, float(y_floor - y_top))

    for py in range(max(4, int(y_top)), min(LOG_H - 3, int(y_floor) + 1)):
        h_frac = (y_floor - py) / span_y
        flare_base = 1.28 if h_frac < 0.10 else (1.0 - 0.24 * h_frac)
        local_hw = max(2.0, width * flare_base + 0.9 * math.cos(py * 0.45))
        ihw = int(math.ceil(local_hw)) + 1
        for dx in range(-ihw, ihw + 1):
            px = icx + dx
            if px < 4 or px >= LOG_W - 4:
                continue
            af = abs(dx) / max(1.0, local_hw)
            if af > 1.0:
                continue
            bayer = BAYER4[py & 3, px & 3]
            if dissipate > 0.0 and bayer < dissipate * (0.74 + 0.42 * af):
                continue
            if h_frac > 0.85 and bayer > (1.0 - h_frac) * 5.8:
                continue
            mask[py, px] = True
            if af < 0.32:
                col[py, px] = C_LIGHT_CORE
            elif af < 0.60:
                col[py, px] = C_LIGHT_SUNGOLD
            elif af < 0.82:
                col[py, px] = C_SAPPHIRE if ((py // 3) % 2 == 0 and dx < 0) else C_LIGHT_CHAMPAGNE
            else:
                col[py, px] = C_LIGHT_ROSE

    for py in range(3, min(LOG_H - 3, int(y_floor) + 1)):
        for px in range(max(3, icx - 22), min(LOG_W - 3, icx + 23)):
            if mask[py, px]:
                arr[py, px] = col[py, px]
            elif arr[py, px, 3] == 0:
                for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if py + oy < LOG_H and mask[py + oy, px + ox]:
                        arr[py, px] = C_OUT
                        break


def draw_sanctum_prism_orbs(arr, orbs, dissipate=0.0, max_y=114):
    """Faceted Stained-Glass Star-Prism Orbs (`V3 F25` Star-Sanctuary Array)."""
    for cx, cy, rad in orbs:
        icx, icy = int(round(cx)), int(round(cy))
        ir = int(math.ceil(rad + 1.5))
        for dy in range(-ir, ir + 1):
            py = icy + dy
            if py < 4 or py > max_y:
                continue
            for dx in range(-ir, ir + 1):
                px = icx + dx
                if px < 4 or px >= LOG_W - 4:
                    continue
                # Diamond L1 + circular L2 hybrid facet
                d = 0.65 * (abs(dx) + abs(dy)) + 0.35 * math.hypot(dx, dy)
                if d > rad + 1.0:
                    continue
                if dissipate > 0.0 and BAYER4[py & 3, px & 3] < dissipate * 0.85:
                    continue
                if d > rad:
                    put_px_outline_bg(arr, px, py, C_OUT, max_y=max_y)
                elif d < rad * 0.36:
                    put_px(arr, px, py, C_LIGHT_CORE)
                elif d < rad * 0.68:
                    put_px(arr, px, py, C_LIGHT_SUNGOLD)
                else:
                    put_px(arr, px, py, C_SAPPHIRE if (dx + dy) % 2 == 0 else C_LIGHT_ROSE)
        if dissipate < 0.38:
            draw_pixel_star4(arr, icx, icy, arm=int(rad) + 1, core_col=C_LIGHT_CORE, ray_col=C_LIGHT_SUNGOLD, max_y=max_y)


def draw_priestess_cast_fx(arr, fx_spec, phase=0.0, max_y=114):
    if fx_spec is None:
        return
    kind = fx_spec["kind"]
    diss = fx_spec.get("dissipate", 0.0)

    if kind == "v0_rose_window_ray":
        draw_rose_window_magic_circle(arr, cx=102.0, cy=64.0, rx=9.5, ry=26.0, phase=phase, dissipate=diss, max_y=max_y)
        draw_sanctum_light_ray(
            arr,
            x_start=102.0,
            y_center=64.0,
            x_end=fx_spec.get("x_end", 149.0),
            half_h=fx_spec.get("half_h", 8.0),
            slope_y=0.0,
            dissipate=diss,
            max_y=max_y,
        )

    elif kind == "v1_twin_benediction_halos":
        x_end = fx_spec.get("x_end", 149.0)
        draw_rose_window_magic_circle(arr, cx=100.0, cy=46.0, rx=7.5, ry=16.5, phase=phase, dissipate=diss, max_y=max_y)
        draw_rose_window_magic_circle(arr, cx=105.0, cy=82.0, rx=7.5, ry=16.5, phase=-phase, dissipate=diss, max_y=max_y)
        draw_sanctum_light_ray(arr, x_start=101.0, y_center=46.0, x_end=x_end, half_h=5.8, slope_y=9.0, dissipate=diss, max_y=max_y)
        draw_sanctum_light_ray(arr, x_start=106.0, y_center=82.0, x_end=x_end - 2.0, half_h=5.8, slope_y=-9.0, dissipate=diss, max_y=max_y)

    elif kind == "v2_choir_prism_pillar":
        draw_rose_window_magic_circle(arr, cx=108.0, cy=42.0, rx=12.5, ry=12.5, phase=phase, dissipate=diss, max_y=max_y)
        draw_rose_window_magic_circle(arr, cx=135.0, cy=max_y - 4.0, rx=18.0, ry=4.2, phase=-phase, dissipate=diss * 0.8, max_y=max_y)
        draw_radiant_star_pillar(
            arr,
            x_center=fx_spec.get("col_x", 135.0),
            y_top=fx_spec.get("y_top", 12),
            y_floor=max_y,
            width=fx_spec.get("width", 13.0),
            dissipate=diss,
        )

    elif kind == "v3_star_sanctuary_array":
        draw_rose_window_magic_circle(arr, cx=108.0, cy=62.0, rx=11.5, ry=34.0, phase=phase, dissipate=diss, max_y=max_y)
        shift = fx_spec.get("orb_shift", 0.0)
        orbs = [
            (min(150.0, 134.0 + shift), 36.0, 5.2),
            (min(152.0, 146.0 + shift), 62.0, 6.2),
            (min(150.0, 134.0 + shift), 88.0, 5.2),
        ]
        draw_sanctum_prism_orbs(arr, orbs, dissipate=diss, max_y=max_y)


# ==============================================================================
# 5. POSE COMPOSITOR (WITH HARD GROUNDED `y=115` LOCK FOR ROW 2!)
# ==============================================================================
def enforce_safety_margin(arr):
    arr[:2, :, :] = 0
    arr[LOG_H - 2 :, :, :] = 0
    arr[:, :2, :] = 0
    arr[:, LOG_W - 2 :, :] = 0
    arr[:, :, 3] = np.where(arr[:, :, 3] >= 128, 255, 0)
    trans = arr[:, :, 3] == 0
    arr[trans, :3] = 0


def compose_priestess_frame(
    poses,
    pose_key="STAND",
    dx=0.0,
    dy=0.0,
    lock_grounded=False,
    aim_deg=-36.0,
    grip_offset=(4.5, -1.5),
    two_handed=True,
    offhand_target=None,
    radiance=0.35,
    halo_flare=0.0,
    phase=0.0,
    fx_spec=None,
    ground_seal_rx=0.0,
    walk_stride=0.0,
):
    if lock_grounded:
        assert pose_key != "K4_LEAP", "K4_LEAP is forbidden when lock_grounded=True!"
        dy = 0.0

    canvas = Image.new("RGBA", (LOG_W, LOG_H), (0, 0, 0, 0))
    arr = np.array(canvas)

    if pose_key == "STAND":
        body_im = poses["stand_armless"]
        sh_f_base = poses["stand_joints"]["sh_front"]
        sh_b_base = poses["stand_joints"]["sh_back"]
        gem_base = poses["stand_joints"]["gem"]
    else:
        kp = poses["keyposes"][pose_key]
        body_im = kp["armless"]
        sh_f_base = kp["sh_front"]
        sh_b_base = kp["sh_back"]
        gem_base = kp["gem"]

    b_alpha = np.array(body_im)[:, :, 3] > 0
    bys, _ = np.where(b_alpha)
    cur_bot = int(bys.max()) if len(bys) else AY
    eff_dy = (AY - cur_bot) if lock_grounded else int(round(dy))

    sh_f = (sh_f_base[0] + dx, sh_f_base[1] + eff_dy)
    sh_b = (sh_b_base[0] + dx, sh_b_base[1] + eff_dy)
    gem = (gem_base[0] + dx, gem_base[1] + eff_dy)

    max_fx_y = 114 if lock_grounded else 116

    if ground_seal_rx > 1.0:
        draw_rose_window_magic_circle(
            arr,
            cx=AX + dx + 2.0,
            cy=min(float(max_fx_y - 3), 108.0 + max(0.0, eff_dy)),
            rx=ground_seal_rx,
            ry=4.5,
            phase=phase,
            max_y=max_fx_y,
        )

    draw_sanctum_stole_and_halo(arr, cx=gem[0] - 4.0, cy=gem[1] + 2.0, phase=phase, flare=halo_flare, max_y=max_fx_y)

    grip_main = (sh_f[0] + grip_offset[0], sh_f[1] + grip_offset[1])
    rad = math.radians(aim_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    grip_rear = (grip_main[0] - ux * 7.5, grip_main[1] - uy * 7.5)

    if two_handed:
        draw_priestess_arm(arr, sh_b, grip_rear, is_front=False, bend_sign=1.0, max_y=max_fx_y)
    elif offhand_target is not None:
        oh = draw_priestess_arm(arr, sh_b, offhand_target, is_front=False, bend_sign=1.0, max_y=max_fx_y)
        if radiance > 0.45:
            draw_pixel_star4(arr, oh[0], oh[1] - 1.5, arm=2, core_col=C_LIGHT_CORE, ray_col=C_LIGHT_SUNGOLD, max_y=max_fx_y)

    weapon_behind = (-175.0 <= aim_deg <= -118.0)
    if weapon_behind:
        draw_sunburst_cathedral_scepter(arr, grip_main, aim_deg, radiance=radiance, max_y=max_fx_y)

    body_layer = Image.fromarray(arr, "RGBA")
    bx = int(round(dx))
    if abs(walk_stride) > 0.01 and pose_key == "STAND":
        # Sanctum Procession Glide: keep central white-gold tabard (46 <= xx <= 63) 100% unified & intact!
        b_arr = np.array(body_im)
        glided = np.zeros_like(b_arr)
        for yy in range(LOG_H):
            if 84 <= yy <= 102:
                # Subtle outer gown-wing breeze only on outer edges (xx <= 43 or xx >= 68)
                t_hem = (yy - 84) / 18.0
                wing_w = int(round(math.sin(phase * math.tau * 2.0 - t_hem * 1.5) * 1.0 * t_hem))
                for xx in range(LOG_W):
                    if xx <= 43 or xx >= 68:
                        sx = clamp(xx - wing_w, 0, LOG_W - 1)
                        glided[yy, xx] = b_arr[yy, sx]
                    else:
                        glided[yy, xx] = b_arr[yy, xx]
            elif yy > 102:
                # Clean +-3px output alternating boot glide strictly on outer boots (central tabard 46..63 untouched!)
                t_boot = (yy - 102) / 13.0
                for xx in range(LOG_W):
                    if xx < 46:
                        b_shift = int(round(-walk_stride * 1.4 * t_boot))
                    elif xx > 63:
                        b_shift = int(round(walk_stride * 1.4 * t_boot))
                    else:
                        b_shift = 0
                    sx = clamp(xx - b_shift, 0, LOG_W - 1)
                    glided[yy, xx] = b_arr[yy, sx]
            else:
                glided[yy] = b_arr[yy]
        body_layer.alpha_composite(Image.fromarray(glided, "RGBA"), (bx, eff_dy))
        arr_tmp = np.array(body_layer)
        for k in range(2):
            ang_w = phase * math.tau + k * math.pi
            wx = int(round(AX + bx + math.cos(ang_w) * 11.0))
            wy = min(114, int(round(113 + math.sin(ang_w) * 1.0)))
            put_px(arr_tmp, wx, wy, C_LIGHT_SUNGOLD if k == 0 else C_LIGHT_ROSE)
        body_layer = Image.fromarray(arr_tmp, "RGBA")
    else:
        body_layer.alpha_composite(body_im, (bx, eff_dy))
    arr = np.array(body_layer)

    gx_i, gy_i = int(round(gem[0])), int(round(gem[1]))
    put_px(arr, gx_i, gy_i, C_LIGHT_CORE if (int(phase * 30) % 3 == 0) else C_SAPPHIRE)
    for k in range(2):
        ang = phase * math.tau + k * math.pi
        mx = int(round(AX + dx + math.cos(ang) * 9.0))
        my = int(round(32 + eff_dy + math.sin(ang) * 2.0))
        put_px(arr, mx, my, C_LIGHT_SUNGOLD if k == 0 else C_LIGHT_ROSE)

    if not weapon_behind:
        draw_sunburst_cathedral_scepter(arr, grip_main, aim_deg, radiance=radiance, max_y=max_fx_y)
    draw_priestess_arm(arr, sh_f, grip_main, is_front=True, bend_sign=1.0, max_y=max_fx_y)

    draw_priestess_cast_fx(arr, fx_spec, phase=phase, max_y=max_fx_y)

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
        frames.append(
            compose_priestess_frame(
                poses,
                pose_key="STAND",
                dx=0.0,
                dy=round(bob * 0.8),
                aim_deg=-52.0 + math.sin(ph * math.tau + 0.4) * 3.0,
                grip_offset=(4.5, -1.5 + 0.5 * bob),
                radiance=0.35 + 0.12 * math.sin(ph * math.tau * 2.0),
                halo_flare=0.14 + 0.08 * math.sin(ph * math.tau),
                phase=ph,
            )
        )
    return frames


def build_row_1_walk(poses):
    """
    Row 1 WALK: Regal Sanctum Procession Glide!
    Strictly `STAND` across all 30 frames (`0` mid-walk K2_LUNGE body swaps!), continuous `-50 +- 3.5 deg` scepter carry,
    unified white-gold tabard & gown silhouette (`0` center-skirt scissoring), `1px` smooth glide bob, and `+-3px` boot glide.
    """
    frames = []
    for f in range(30):
        ph = f / 30.0
        stride = math.sin(ph * math.tau * 2.0)
        if abs(stride) < 0.04:
            stride = 0.04 if stride >= 0 else -0.04
        bob = -0.5 + math.sin(ph * math.tau) * 0.55
        frames.append(
            compose_priestess_frame(
                poses,
                pose_key="STAND",
                dx=round(math.sin(ph * math.tau) * 0.5),
                dy=round(bob),
                aim_deg=-50.0 + math.sin(ph * math.tau + 0.4) * 3.5,
                grip_offset=(4.5, -1.5 + 0.4 * math.sin(ph * math.tau)),
                radiance=0.40 + 0.10 * math.sin(ph * math.tau * 2.0),
                halo_flare=0.16 + 0.06 * math.sin(ph * math.tau),
                phase=ph,
                walk_stride=stride,
            )
        )
    return frames


def build_row_2_auto_attack(poses):
    """
    STRICTLY GROUNDED Row 2 AUTO_ATTACK (`lock_grounded=True`, `foot_y = 115 -> y_320 = 230`, `0px` float, `0` melee smears!):
      - V0 (F03): Radiant Stained-Glass Rose-Window Magic Circle + Sanctum Light-Ray Burst!
      - V1 (F09): Twin Golden Benediction Halos & Twin Converging Sacred Light-Prisms!
      - V2 (F17): Choir Light-Prism Seals & Consecrated Rose-Cathedral Pillar!
      - V3 (F25): Purifying Star-Sanctuary Array & Triple Sanctum Prism Orbs!
    """
    frames = []
    for f in range(30):
        ph = f / 30.0
        # --- V0 (F00..F07): Rose-Window Magic Circle + Sanctum Light-Ray ---
        if f in (0, 1, 2):
            t = f / 2.0
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K1_COIL",
                    dx=lerp(-1.5, -3.5, t),
                    lock_grounded=True,
                    aim_deg=lerp(-62.0, -42.0, t),
                    grip_offset=(3.5, -3.5),
                    radiance=0.55 + 0.35 * t,
                    halo_flare=0.35 + 0.35 * t,
                    phase=ph,
                )
            )
        elif f == 3:
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=6.5,
                    lock_grounded=True,
                    aim_deg=-6.0,
                    grip_offset=(8.5, -1.5),
                    radiance=1.0,
                    halo_flare=0.95,
                    phase=ph,
                    fx_spec={"kind": "v0_rose_window_ray", "x_end": 149.0, "half_h": 8.0, "dissipate": 0.0},
                )
            )
        elif f in (4, 5):
            diss = 0.28 if f == 4 else 0.58
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=6.5 if f == 4 else 5.0,
                    lock_grounded=True,
                    aim_deg=-4.0 if f == 4 else -12.0,
                    grip_offset=(8.5, -1.5),
                    radiance=0.86 if f == 4 else 0.68,
                    halo_flare=0.70 if f == 4 else 0.45,
                    phase=ph,
                    fx_spec={
                        "kind": "v0_rose_window_ray",
                        "x_end": 146.0 if f == 4 else 140.0,
                        "half_h": 6.5 if f == 4 else 5.0,
                        "dissipate": diss,
                    },
                )
            )
        elif f in (6, 7):
            t = f - 6
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K1_COIL",
                    dx=lerp(3.5, 1.0, t),
                    lock_grounded=True,
                    aim_deg=lerp(-24.0, -44.0, t),
                    grip_offset=(5.5, -2.5),
                    radiance=0.55,
                    halo_flare=0.35,
                    phase=ph,
                )
            )

        # --- V1 (F08..F14): Twin Golden Benediction Halos & Sacred Light-Prisms ---
        elif f == 8:
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K1_COIL",
                    dx=-1.0,
                    lock_grounded=True,
                    aim_deg=-52.0,
                    grip_offset=(4.5, -3.5),
                    radiance=0.80,
                    halo_flare=0.55,
                    phase=ph,
                )
            )
        elif f == 9:
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K3_RISE",
                    dx=5.5,
                    lock_grounded=True,
                    aim_deg=-14.0,
                    grip_offset=(7.5, -3.0),
                    two_handed=False,
                    offhand_target=(AX - 8.0, 56.0),
                    radiance=1.0,
                    halo_flare=1.0,
                    phase=ph,
                    fx_spec={"kind": "v1_twin_benediction_halos", "x_end": 149.0, "dissipate": 0.0},
                )
            )
        elif f in (10, 11):
            diss = 0.28 if f == 10 else 0.58
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K3_RISE",
                    dx=5.5 if f == 10 else 4.0,
                    lock_grounded=True,
                    aim_deg=-18.0 if f == 10 else -28.0,
                    grip_offset=(7.0, -3.5),
                    two_handed=False,
                    offhand_target=(AX - 8.0, 58.0),
                    radiance=0.85 if f == 10 else 0.65,
                    halo_flare=0.72 if f == 10 else 0.45,
                    phase=ph,
                    fx_spec={
                        "kind": "v1_twin_benediction_halos",
                        "x_end": 146.0 if f == 10 else 139.0,
                        "dissipate": diss,
                    },
                )
            )
        elif f in (12, 13, 14):
            t = (f - 12) / 2.0
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K1_COIL",
                    dx=lerp(2.5, -1.5, t),
                    lock_grounded=True,
                    aim_deg=lerp(-36.0, -58.0, t),
                    grip_offset=(5.0, -3.0),
                    radiance=0.55 + 0.20 * t,
                    halo_flare=0.40 + 0.25 * t,
                    phase=ph,
                )
            )

        # --- V2 (F15..F22): Choir Light-Prism Seals & Consecrated Rose-Cathedral Pillar ---
        elif f in (15, 16):
            t = f - 15
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K1_COIL" if f == 15 else "K3_RISE",
                    dx=-1.0 + t * 2.5,
                    lock_grounded=True,
                    aim_deg=-64.0 - t * 14.0,
                    grip_offset=(5.0, -5.0 - t * 2.0),
                    two_handed=(f == 15),
                    offhand_target=(AX - 10.0, 54.0),
                    radiance=0.80 + 0.15 * t,
                    halo_flare=0.75,
                    phase=ph,
                )
            )
        elif f == 17:
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K3_RISE",
                    dx=4.5,
                    lock_grounded=True,
                    aim_deg=-72.0,
                    grip_offset=(6.0, -7.5),
                    two_handed=False,
                    offhand_target=(AX - 10.0, 52.0),
                    radiance=1.0,
                    halo_flare=1.0,
                    phase=ph,
                    fx_spec={"kind": "v2_choir_prism_pillar", "col_x": 135.0, "y_top": 12, "width": 13.5, "dissipate": 0.0},
                )
            )
        elif f in (18, 19):
            diss = 0.28 if f == 18 else 0.58
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K3_RISE",
                    dx=4.5 if f == 18 else 3.0,
                    lock_grounded=True,
                    aim_deg=-68.0 if f == 18 else -58.0,
                    grip_offset=(6.0, -6.5),
                    two_handed=False,
                    offhand_target=(AX - 9.0, 55.0),
                    radiance=0.86 if f == 18 else 0.68,
                    halo_flare=0.75 if f == 18 else 0.50,
                    phase=ph,
                    fx_spec={
                        "kind": "v2_choir_prism_pillar",
                        "col_x": 135.0,
                        "y_top": 16 if f == 18 else 24,
                        "width": 11.5 if f == 18 else 9.0,
                        "dissipate": diss,
                    },
                )
            )
        elif f in (20, 21, 22):
            t = (f - 20) / 2.0
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K1_COIL",
                    dx=lerp(2.0, -2.0, t),
                    lock_grounded=True,
                    aim_deg=lerp(-46.0, -62.0, t),
                    grip_offset=(4.5, -3.5),
                    radiance=0.62 + 0.28 * t,
                    halo_flare=0.45 + 0.40 * t,
                    phase=ph,
                )
            )

        # --- V3 (F23..F29): Grounded Purifying Star-Sanctuary Array & Triple Sanctum Prism Orbs ---
        elif f in (23, 24):
            t = f - 23
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K3_RISE",
                    dx=-1.5 - t * 1.0,
                    lock_grounded=True,
                    aim_deg=-66.0 + t * 18.0,
                    grip_offset=(5.5, -5.0 + t * 1.5),
                    two_handed=False,
                    offhand_target=(AX - 10.0, 54.0),
                    radiance=0.95,
                    halo_flare=0.95,
                    phase=ph,
                    ground_seal_rx=18.0 + t * 4.0,
                )
            )
        elif f == 25:
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=-2.0,
                    lock_grounded=True,
                    aim_deg=-4.0,
                    grip_offset=(9.0, -2.0),
                    radiance=1.0,
                    halo_flare=1.0,
                    phase=ph,
                    ground_seal_rx=24.0,
                    fx_spec={"kind": "v3_star_sanctuary_array", "orb_shift": 0.0, "dissipate": 0.0},
                )
            )
        elif f in (26, 27):
            diss = 0.28 if f == 26 else 0.58
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=-2.0 if f == 26 else -1.0,
                    lock_grounded=True,
                    aim_deg=-8.0 if f == 26 else -18.0,
                    grip_offset=(8.5, -2.0),
                    radiance=0.88 if f == 26 else 0.70,
                    halo_flare=0.80 if f == 26 else 0.55,
                    phase=ph,
                    ground_seal_rx=20.0 if f == 26 else 14.0,
                    fx_spec={
                        "kind": "v3_star_sanctuary_array",
                        "orb_shift": 2.0 if f == 26 else 4.0,
                        "dissipate": diss,
                    },
                )
            )
        else:
            t = f - 28
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K1_COIL" if f == 28 else "STAND",
                    dx=lerp(-0.5, 0.0, t),
                    lock_grounded=True,
                    aim_deg=lerp(-34.0, -50.0, t),
                    grip_offset=(4.5, -1.5),
                    radiance=lerp(0.55, 0.35, t),
                    halo_flare=lerp(0.35, 0.15, t),
                    phase=ph,
                )
            )
    return frames


def build_row_3_skill(poses):
    """Row 3 SKILL (`STAINED-GLASS BENEDICTION`): Grounded K3_RISE invocation -> Rose-Cathedral Pillar."""
    frames = []
    for f in range(30):
        ph = f / 30.0
        if f < 8:
            t = f / 7.0
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K1_COIL" if f < 3 else "K3_RISE",
                    dx=lerp(0.0, 2.5, t),
                    lock_grounded=True,
                    aim_deg=lerp(-52.0, -82.0, t),
                    grip_offset=(4.5, lerp(-2.0, -8.0, t)),
                    two_handed=False,
                    offhand_target=(AX - 12.0, lerp(72.0, 54.0, t)),
                    radiance=0.55 + 0.45 * t,
                    halo_flare=0.40 + 0.60 * t,
                    phase=ph,
                    ground_seal_rx=14.0 + 10.0 * t,
                )
            )
        elif f <= 15:
            diss = max(0.0, (f - 9) / 7.5)
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K3_RISE",
                    dx=3.5,
                    lock_grounded=True,
                    aim_deg=-80.0,
                    grip_offset=(5.0, -8.5),
                    two_handed=False,
                    offhand_target=(AX - 11.0, 54.0),
                    radiance=1.0 - 0.22 * diss,
                    halo_flare=1.0 - 0.25 * diss,
                    phase=ph,
                    ground_seal_rx=25.0 * (1.0 - 0.45 * diss),
                    fx_spec={
                        "kind": "v2_choir_prism_pillar",
                        "col_x": 132.0,
                        "y_top": 12 + int(diss * 18),
                        "width": 13.0 * (1.0 - 0.35 * diss),
                        "dissipate": diss,
                    },
                )
            )
        else:
            t = (f - 16) / 13.0
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="STAND",
                    dx=lerp(2.5, 0.0, t),
                    lock_grounded=True,
                    aim_deg=lerp(-74.0, -50.0, t),
                    grip_offset=(4.5, lerp(-6.0, -1.5, t)),
                    radiance=lerp(0.65, 0.35, t),
                    halo_flare=lerp(0.50, 0.15, t),
                    phase=ph,
                )
            )
    return frames


def build_row_4_ultimate(poses):
    """
    Row 4 ULTIMATE (`SERAPHIC ORGAN OF LIGHT` & `FINAL GRACE: GENESIS LUMEN` horizontal beam stance):
    Ascends via `K4_LEAP` (`F05..F16`), then aims Cathedral Scepter straight forward (`0 deg`) with Rose-Window Seal!
    """
    frames = []
    for f in range(30):
        ph = f / 30.0
        if f < 5:
            t = f / 4.0
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K3_RISE",
                    dx=lerp(0.0, 2.0, t),
                    dy=lerp(0.0, -4.0, t),
                    aim_deg=lerp(-50.0, -84.0, t),
                    grip_offset=(4.5, lerp(-2.5, -8.5, t)),
                    radiance=0.65 + 0.35 * t,
                    halo_flare=0.50 + 0.50 * t,
                    phase=ph,
                )
            )
        elif f < 17:
            t = (f - 5) / 11.0
            hover = -8.0 - math.sin(t * math.pi) * 4.0
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K4_LEAP",
                    dx=2.0,
                    dy=hover,
                    aim_deg=-82.0 + t * 24.0,
                    grip_offset=(4.5, -7.5),
                    two_handed=False,
                    offhand_target=(AX - 10.0, 62.0 + hover),
                    radiance=1.0,
                    halo_flare=1.0,
                    phase=ph,
                )
            )
        elif f <= 24:
            diss = min(0.7, max(0.0, (f - 18) * 0.12))
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=9.0,
                    dy=0.0,
                    aim_deg=0.0,
                    grip_offset=(9.5, -2.0),
                    radiance=1.0,
                    halo_flare=1.0,
                    phase=ph,
                    fx_spec={"kind": "v0_rose_window_ray", "x_end": 150.0, "half_h": 9.0, "dissipate": diss} if f <= 20 else None,
                )
            )
        else:
            t = (f - 25) / 4.0
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="STAND",
                    dx=lerp(8.0, 0.0, t),
                    dy=0.0,
                    aim_deg=lerp(0.0, -50.0, t),
                    grip_offset=(lerp(8.5, 4.5, t), -1.5),
                    radiance=lerp(0.85, 0.35, t),
                    halo_flare=lerp(0.75, 0.15, t),
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
                compose_priestess_frame(
                    poses,
                    pose_key="K1_COIL",
                    dx=-6.5 * recoil,
                    lock_grounded=True,
                    aim_deg=-106.0 - 16.0 * recoil,
                    grip_offset=(-1.5, -3.0),
                    radiance=0.30,
                    phase=ph,
                )
            )
        elif f < 18:
            t = (f - 7) / 10.0
            shk = math.sin(f * 2.4) * (1.0 - t) * 1.4
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K1_COIL",
                    dx=-6.5 + t * 3.0 + shk,
                    lock_grounded=True,
                    aim_deg=-118.0 + t * 28.0,
                    grip_offset=(-1.0, -2.5),
                    radiance=0.35,
                    phase=ph,
                )
            )
        else:
            t = (f - 18) / 11.0
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="STAND",
                    dx=lerp(-3.5, 0.0, t),
                    lock_grounded=True,
                    aim_deg=lerp(-88.0, -50.0, t),
                    grip_offset=(4.5, -1.5),
                    radiance=0.35,
                    phase=ph,
                )
            )
    return frames


def build_row_6_block_parry(poses):
    """Row 6 BENEDICTION WARD & SANCTUM RAY COUNTER (`0` melee slash smears!)."""
    frames = []
    for f in range(30):
        ph = f / 30.0
        if f < 12:
            wob = math.sin((f / 12.0) * math.tau * 2.0) * 3.5
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="STAND",
                    dx=-1.5,
                    lock_grounded=True,
                    aim_deg=-80.0 + wob,
                    grip_offset=(8.0, -3.5),
                    radiance=0.65,
                    halo_flare=0.45,
                    phase=ph,
                    ground_seal_rx=20.0,
                )
            )
        elif f <= 15:
            diss = (f - 12) * 0.28
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=6.5,
                    lock_grounded=True,
                    aim_deg=-6.0,
                    grip_offset=(8.5, -1.5),
                    radiance=1.0,
                    halo_flare=1.0,
                    phase=ph,
                    fx_spec={"kind": "v0_rose_window_ray", "x_end": 146.0, "half_h": 7.5, "dissipate": diss},
                )
            )
        else:
            t = (f - 16) / 13.0
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K2_LUNGE" if f < 21 else "STAND",
                    dx=lerp(5.5, 0.0, t),
                    lock_grounded=True,
                    aim_deg=lerp(-12.0, -50.0, t),
                    grip_offset=(lerp(8.0, 4.5, t), -1.5),
                    radiance=lerp(0.85, 0.35, t),
                    halo_flare=lerp(0.65, 0.15, t),
                    phase=ph,
                )
            )
    return frames


def build_row_7_crouch(poses):
    frames = []
    for f in range(30):
        ph = f / 30.0
        frames.append(
            compose_priestess_frame(
                poses,
                pose_key="K2_LUNGE",
                dx=2.0,
                lock_grounded=True,
                aim_deg=-24.0 + math.sin(ph * math.tau) * 4.5,
                grip_offset=(6.5, -0.5),
                radiance=0.55 + 0.15 * math.sin(ph * math.tau * 2.0),
                halo_flare=0.35,
                phase=ph,
                ground_seal_rx=22.0 + math.sin(ph * math.tau) * 2.0,
            )
        )
    return frames


def build_row_8_jump_vault(poses):
    """Row 8 JUMP / ANGELIC WING VAULT (`K4_LEAP` graceful hover arc)."""
    frames = []
    for f in range(30):
        ph = f / 30.0
        arc = math.sin(ph * math.pi)
        frames.append(
            compose_priestess_frame(
                poses,
                pose_key="K4_LEAP" if 3 <= f <= 25 else "STAND",
                dx=arc * 3.5,
                dy=-arc * 12.0,
                aim_deg=-52.0 - arc * 28.0 + math.sin(ph * math.tau) * 5.0,
                grip_offset=(4.5, -3.0 - arc * 2.5),
                radiance=0.60 + 0.30 * arc,
                halo_flare=0.45 + 0.45 * arc,
                phase=ph,
            )
        )
    return frames


def build_row_9_death(poses):
    frames = []
    for f in range(30):
        ph = f / 30.0
        if f < 10:
            t = f / 9.0
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K1_COIL",
                    dx=-7.0 * t,
                    dy=3.0 * t,
                    aim_deg=lerp(-96.0, -142.0, t),
                    grip_offset=(-1.5, 1.0),
                    radiance=0.35 * (1.0 - t),
                    halo_flare=0.15 * (1.0 - t),
                    phase=ph,
                )
            )
        else:
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
            draw_sunburst_cathedral_scepter(
                arr,
                (AX + 6.0, 109.0),
                angle_deg=lerp(-8.0, 2.0, t),
                length_scale=0.92,
                radiance=0.22 + 0.08 * math.sin(ph * math.tau * 3.0),
                max_y=114,
            )
            for k in range(5):
                ex = int(round(AX - 16 + k * 9 + math.sin(f * 0.9 + k) * 2.5))
                ey = int(round(108 - ((f * 2 + k * 5) % 18)))
                put_px(arr, ex, ey, C_LIGHT_SUNGOLD if (f + k) % 2 == 0 else C_LIGHT_ROSE)
            enforce_safety_margin(arr)
            frames.append(arr)
    return frames


# ==============================================================================
# 7. PORTRAIT BUILDER (`0` SPEAR-TIP!) & SHEET ASSEMBLY / GROUNDED QA AUDIT
# ==============================================================================
def build_portrait():
    raw = Image.open(PORTRAIT_JPG).convert("RGB")
    w, h = raw.size
    # Cleanly remove ONLY the spear-blade triangle rising above the Sunburst Cross in the top-right (`x=812..948, y=58..236`),
    # replacing it with cathedral sanctuary dark shadow + a rounded royal cathedral finial orb!
    raw_arr = np.array(raw)
    spear_poly = polygon_mask((w, h), [(812, 236), (885, 52), (955, 62), (945, 224), (888, 240)])
    # Sample dark cathedral column color from (805, 110)
    bg_col = raw_arr[110, 805].copy()
    raw_arr[spear_poly] = bg_col
    raw_clean = Image.fromarray(raw_arr, "RGB")

    s = int(min(w, h) * 0.88)
    x0 = (w - s) // 2
    y0 = max(0, int((h - s) * 0.26))
    crop = raw_clean.crop((x0, y0, x0 + s, y0 + s)).resize((64, 64), Image.Resampling.BILINEAR)
    q64 = crop.quantize(colors=42, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGBA")
    arr = np.array(q64)

    # Stamp a tiny royal golden cathedral finial bead right atop the Sunburst Cross (`x_64=56, y_64=14`)
    arr[14, 56] = C_LIGHT_CORE
    arr[13, 56] = C_GOLD_MID
    arr[14, 55] = C_GOLD_MID
    arr[14, 57] = C_GOLD_MID

    arr[0, :] = C_OUT
    arr[63, :] = C_OUT
    arr[:, 0] = C_OUT
    arr[:, 63] = C_OUT
    arr[1, 1:63] = C_GOLD_MID
    arr[62, 1:63] = C_GOLD_MID
    arr[1:63, 1] = C_GOLD_MID
    arr[1:63, 62] = C_GOLD_MID
    out128 = Image.fromarray(arr, "RGBA").resize((128, 128), Image.Resampling.NEAREST)
    out128.save(OUT_PORTRAIT)
    return out128


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scratch-dir", default=DEFAULT_SCRATCH)
    args = parser.parse_args()
    os.makedirs(args.scratch_dir, exist_ok=True)

    print("[priestess_ex] Loading base & 2x2 action keyposes...")
    poses = load_priestess_poses()

    row_builders = [
        ("Row 0 IDLE", build_row_0_idle),
        ("Row 1 WALK", build_row_1_walk),
        ("Row 2 AUTO_ATTACK", build_row_2_auto_attack),
        ("Row 3 SKILL", build_row_3_skill),
        ("Row 4 ULTIMATE", build_row_4_ultimate),
        ("Row 5 HIT", build_row_5_hit),
        ("Row 6 BLOCK_PARRY", build_row_6_block_parry),
        ("Row 7 CROUCH", build_row_7_crouch),
        ("Row 8 JUMP_VAULT", build_row_8_jump_vault),
        ("Row 9 DEATH", build_row_9_death),
    ]

    sheet = Image.new("RGBA", (CELL_W * COLS, CELL_H * ROWS), (0, 0, 0, 0))
    border_clips = 0
    all_rows_320 = []

    for r_idx, (r_name, builder) in enumerate(row_builders):
        log_frames = builder(poses)
        assert len(log_frames) == COLS
        transitions = 0
        row_320 = []
        r2_bot_ys = []
        snap_reaches = {}
        for c_idx, farr in enumerate(log_frames):
            if c_idx > 0 and not np.array_equal(log_frames[c_idx - 1], farr):
                transitions += 1
            if r_idx == 2:
                ys_f, _ = np.where(farr[:, :, 3] > 0)
                r2_bot_ys.append(int(ys_f.max()))
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
            if r_idx == 2 and c_idx in (3, 9, 17, 25):
                _, xs_320 = np.where(a320 > 0)
                snap_reaches[f"F{c_idx:02d}"] = int(xs_320.max())
            sheet.paste(im_320, (c_idx * CELL_W, r_idx * CELL_H))
            row_320.append(im_320)
        all_rows_320.append(row_320)
        extra = (
            f" | grounded bot_y_log min={min(r2_bot_ys)} max={max(r2_bot_ys)} | snap max_x={snap_reaches}"
            if r_idx == 2
            else ""
        )
        print(f"  [{r_name}] transitions={transitions}/29{extra}")
        if transitions < 29:
            raise RuntimeError(f"{r_name} has static duplicate frames ({transitions}/29)!")
        if r_idx == 2 and (min(r2_bot_ys) != 115 or max(r2_bot_ys) != 115):
            raise RuntimeError(f"Row 2 grounded foot_y violation: {r2_bot_ys}")
        if r_idx == 2:
            for fk, rx in snap_reaches.items():
                if rx <= 200:
                    raise RuntimeError(f"Row 2 {fk} forward cast reach {rx} <= 200!")

    if border_clips != 0:
        raise RuntimeError(f"Border clip violation: {border_clips}/300!")

    sheet.save(OUT_SHEET)
    port = build_portrait()
    print(f"[priestess_ex] Saved {OUT_SHEET} ({sheet.size[0]}x{sheet.size[1]}), border_clips={border_clips}/300")
    print(f"[priestess_ex] Saved {OUT_PORTRAIT} ({port.size[0]}x{port.size[1]})")

    # Visual QA Contact Sheets in scratch dir
    for row_idx_qa, out_name in [(1, "debug_priestess_ex_row1_walk.png"), (2, "debug_priestess_ex_row2.png")]:
        r_w, r_h = 6 * (CELL_W + 6) + 6, 5 * (CELL_H + 6) + 6
        dbg_r = Image.new("RGBA", (r_w, r_h), (24, 22, 36, 255))
        dr = ImageDraw.Draw(dbg_r)
        for idx, im320 in enumerate(all_rows_320[row_idx_qa]):
            gx = (idx % 6) * (CELL_W + 6) + 6
            gy = (idx // 6) * (CELL_H + 6) + 6
            bg = Image.new("RGBA", (CELL_W, CELL_H), (34, 32, 48, 255))
            bg_d = ImageDraw.Draw(bg)
            bg_d.line([(0, 230), (319, 230)], fill=(120, 96, 52, 255), width=1)
            bg_d.line([(112, 0), (112, 239)], fill=(70, 86, 120, 255), width=1)
            bg.alpha_composite(im320, (0, 0))
            dbg_r.paste(bg, (gx, gy))
            dr.text((gx + 6, gy + 4), f"F{idx:02d}", fill=(255, 235, 160, 255))
        dbg_r.save(os.path.join(args.scratch_dir, out_name))

    for c0, c1, tag in [(0, 15, "left_F00_F14"), (15, 30, "right_F15_F29")]:
        gw = 15 * (LOG_W + 3) + 3
        gh = 10 * (LOG_H + 3) + 3
        grid = Image.new("RGBA", (gw, gh), (22, 20, 30, 255))
        for r_i in range(10):
            for c_i in range(c0, c1):
                cell = all_rows_320[r_i][c_i].resize((LOG_W, LOG_H), Image.Resampling.NEAREST)
                px = (c_i - c0) * (LOG_W + 3) + 3
                py = r_i * (LOG_H + 3) + 3
                bg = Image.new("RGBA", (LOG_W, LOG_H), (34, 32, 48, 255))
                bg.alpha_composite(cell, (0, 0))
                grid.paste(bg, (px, py))
        grid.save(os.path.join(args.scratch_dir, f"debug_priestess_ex_10rows_{tag}.png"))

    port.save(os.path.join(args.scratch_dir, "debug_priestess_ex_portrait.png"))
    print(f"[priestess_ex] Wrote QA contact sheets to {args.scratch_dir}")


if __name__ == "__main__":
    main()
