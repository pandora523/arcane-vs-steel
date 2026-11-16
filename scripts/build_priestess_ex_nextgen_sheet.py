#!/usr/bin/env python3
"""
SERAPHINA EX (`priestess_ex`) — Next-Gen Wide-Canvas (`320x240` cell, `9600x2400` 30x10 sheet)
FFBE / Last Cloudia Multi-Keypose + 4-Band Stained-Glass Serrated Light-Crescent Smear Pipeline.

Outputs:
  - `assets/sprites/priestess_ex_sheet.png`    (9600x2400, 30 cols x 10 rows @ 320x240, 2x2 pixel blocks)
  - `assets/sprites/priestess_ex_portrait.png` (128x128, 2x2 pixel blocks)
  - Untracked QA contact sheets in scratch directory (`--scratch-dir`)

Invariants enforced:
  - 100% 2x2 integer pixel blocks (authored at 160x120 logical, upscaled 2x NEAREST -> 320x240)
  - Anchor `(56, 115)` logical -> `(112, 230)` output (`208px` forward canvas reach!)
  - STRICTLY GROUNDED Row 2 AUTO_ATTACK (`foot_y = 115 -> y_320 = 230`, `0px` float across `V0..V3`!)
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
C_SKIN_SHADOW = (204, 152, 128, 255)
C_SKIN_LIGHT = (246, 204, 178, 255)

# 4-Band Stained-Glass Serrated Light-Crescent Smear Palette
# (#ffffff -> #fef08a -> #fde68a / #fbbf24 -> #fb7185 celestial-rose)
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
    """
    Pure #FFFFFF background has sat <= 0.045 & luma >= 244, whereas Seraphina EX's
    champagne hair & ivory-gold armor have warm cream tint (sat >= 0.07).
    """
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

    # Strip open front arm & rear hand cleanly while preserving flowing blonde hair
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

        # Measure true bottom-most foreground pixel after stripping so grounded alignment is 0px exact!
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
# 3. CATHEDRAL STOLE RIBBONS, SUNBURST SCEPTER-LANCE & 2-BONE IK ARMS
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


def draw_priestess_arm(arr, sh, grip, is_front=True, bend_sign=1.0):
    el, hand = solve_2bone_ik(sh, grip, l1=8.3, l2=8.3, bend_sign=bend_sign)
    sleeve_upper = C_NAVY_MID if is_front else C_NAVY_DARK
    bracer = C_IVORY_LIGHT if is_front else C_IVORY_MID
    cuff = C_GOLD_LIGHT if is_front else C_GOLD_MID
    skin = C_SKIN_LIGHT if is_front else C_SKIN_SHADOW

    draw_thick_line(arr, sh[0] - 0.8, sh[1] - 0.6, sh[0] + 1.0, sh[1] + 0.5, 2.0, bracer, out_col=C_OUT)
    put_px(arr, int(round(sh[0])), int(round(sh[1] - 1)), cuff)
    draw_thick_line(arr, sh[0], sh[1], el[0], el[1], 1.65, sleeve_upper, out_col=C_OUT)
    draw_thick_line(arr, el[0], el[1], hand[0], hand[1], 1.55, bracer, out_col=C_OUT)
    mx, my = lerp(el[0], hand[0], 0.58), lerp(el[1], hand[1], 0.58)
    draw_thick_line(arr, mx - 0.4, my - 0.4, mx + 0.4, my + 0.4, 1.35, cuff, out_col=None)
    draw_thick_line(arr, hand[0] - 0.4, hand[1] - 0.3, hand[0] + 0.5, hand[1] + 0.3, 1.4, skin, out_col=C_OUT)
    return hand


def draw_sanctum_stole_and_halo(arr, cx, cy, phase, flare=0.0):
    """Flowing ivory-gold & celestial-rose sanctum stole ribbons + rotating sunburst back-ring."""
    # Subtle rotating cathedral rose-sunburst ring behind shoulders
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
        )

    # Flowing ivory-gold sanctum ribbon trailing left
    pts = []
    for i in range(6):
        t = i / 5.0
        rx_p = cx - 8.0 - t * 17.0
        ry_p = cy + 6.0 + t * 14.0 + math.sin(phase * math.tau - t * 3.2) * (1.8 + 1.5 * t)
        pts.append((rx_p, ry_p))
    for i in range(len(pts) - 1):
        col = C_IVORY_LIGHT if i < 3 else C_LIGHT_ROSE
        draw_thick_line(arr, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 1.25 - i * 0.12, col, out_col=C_OUT)
    put_px(arr, int(round(pts[-1][0])), int(round(pts[-1][1])), C_GOLD_LIGHT)


def draw_sunburst_scepter_lance(arr, grip_pos, angle_deg, length_scale=1.0, radiance=0.35, max_y=113):
    """
    Ornate Sunburst Cathedral Scepter-Lance (`55` logical px = `110px` output reach!):
      - Ivory-gold cathedral shaft + royal pommel
      - Winged Sunburst Cathedral Crossguard + Sapphire/Rose Core
      - Gleaming White-Diamond & Sun-Gold Spear-Lance Blade
    """
    rad = math.radians(angle_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    butt_len = 15.0 * length_scale
    neck_dist = 28.0 * length_scale
    tip_dist = 55.0 * length_scale

    bx, by = grip_pos[0] - ux * butt_len, grip_pos[1] - uy * butt_len
    nx_p, ny_p = grip_pos[0] + ux * neck_dist, grip_pos[1] + uy * neck_dist
    tx, ty = grip_pos[0] + ux * tip_dist, grip_pos[1] + uy * tip_dist

    # Clamp butt/tip slightly above floor if steep so scepter never clips below ground plane
    if by > max_y:
        scale_b = max(0.2, (max_y - grip_pos[1]) / max(1.0, by - grip_pos[1]))
        bx = grip_pos[0] + (bx - grip_pos[0]) * scale_b
        by = max_y

    # 1. Ivory-gold shaft & royal sunburst pommel
    draw_thick_line(arr, bx, by, nx_p, ny_p, 1.2, C_GOLD_DARK, out_col=C_OUT)
    draw_thick_line(arr, bx + ux * 2.0, by + uy * 2.0, nx_p - ux * 2.0, ny_p - uy * 2.0, 0.75, C_IVORY_LIGHT, out_col=None)
    draw_thick_line(arr, bx - ux * 1.2, by - uy * 1.2, bx + ux * 1.0, by + uy * 1.0, 1.8, C_GOLD_LIGHT, out_col=C_OUT)

    # 2. Ornate Winged Sunburst Cathedral Crossguard + Sapphire Gem
    wing_span = 6.6 * length_scale
    for sign in (-1.0, 1.0):
        wx0 = nx_p - ux * 1.5 + nx * sign * 2.0
        wy0 = ny_p - uy * 1.5 + ny * sign * 2.0
        wx1 = nx_p + ux * 3.0 + nx * sign * wing_span
        wy1 = ny_p + uy * 3.0 + ny * sign * wing_span
        wx2 = nx_p + ux * 7.5 + nx * sign * (wing_span * 0.48)
        wy2 = ny_p + uy * 7.5 + ny * sign * (wing_span * 0.48)
        draw_thick_line(arr, wx0, wy0, wx1, wy1, 1.25, C_GOLD_MID, out_col=C_OUT)
        draw_thick_line(arr, wx1, wy1, wx2, wy2, 1.05, C_LIGHT_SUNGOLD, out_col=C_OUT)
    cx_orb, cy_orb = nx_p + ux * 2.2, ny_p + uy * 2.2
    draw_thick_line(arr, cx_orb - 0.5, cy_orb, cx_orb + 0.5, cy_orb, 2.3, C_LIGHT_ROSE, out_col=C_OUT)
    put_px(arr, int(round(cx_orb)), int(round(cy_orb)), C_SAPPHIRE)
    put_px(arr, int(round(cx_orb + ux)), int(round(cy_orb + uy)), C_LIGHT_CORE)

    # 3. Gleaming Sunburst Cathedral Spear-Lance Head (`27` logical px = `54px` output!)
    blade_start_x = nx_p + ux * 3.5
    blade_start_y = ny_p + uy * 3.5
    b_len = max(6.0, tip_dist - neck_dist - 3.5)
    steps = max(14, int(b_len * 2.4))

    for i in range(steps + 1):
        t = i / float(steps)
        cx = blade_start_x + ux * b_len * t
        cy = blade_start_y + uy * b_len * t
        if cy > max_y:
            continue
        half_w = (3.1 + 0.8 * radiance) * math.sin(math.pi * clamp(t * 0.78 + 0.16, 0.0, 1.0)) * (1.0 - 0.62 * (t**1.5))
        hw_out = max(0.8, half_w) + 1.0
        span = int(math.ceil(hw_out)) + 1
        for s in range(-span, span + 1):
            if abs(s) <= hw_out:
                px = int(round(cx + nx * s))
                py = int(round(cy + ny * s))
                if 2 <= px < LOG_W - 2 and 2 <= py <= max_y and arr[py, px, 3] == 0:
                    arr[py, px] = C_OUT

    for i in range(steps + 1):
        t = i / float(steps)
        cx = blade_start_x + ux * b_len * t
        cy = blade_start_y + uy * b_len * t
        if cy > max_y:
            continue
        half_w = max(0.65, (3.0 + 0.8 * radiance) * math.sin(math.pi * clamp(t * 0.78 + 0.16, 0.0, 1.0)) * (1.0 - 0.62 * (t**1.5)))
        span = int(math.ceil(half_w)) + 1
        for s in range(-span, span + 1):
            af = abs(s) / max(0.55, half_w)
            if af > 1.0:
                continue
            px = int(round(cx + nx * s))
            py = int(round(cy + ny * s))
            if py > max_y:
                continue
            if af < 0.34 or t > 0.86:
                col = C_LIGHT_CORE
            elif af < 0.66:
                col = C_LIGHT_SUNGOLD
            elif s < 0:
                col = C_LIGHT_CHAMPAGNE
            else:
                col = C_LIGHT_ROSE
            put_px(arr, px, py, col)

    return (tx, ty)


# ==============================================================================
# 4. 4-BAND STAINED-GLASS SERRATED LIGHT-CRESCENT, VORTEX & STAR-PILLAR SMEARS
# ==============================================================================
def draw_stained_glass_smear(arr, center, deg_start, deg_end, r_outer, thickness, sparks=14, max_y=115):
    cx, cy = center
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
    y1 = min(min(LOG_H - 3, max_y), int(cy + r_outer + 5))

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
                0.55 * math.sin(u * 38.0)
                + 0.35 * math.sin(u * 79.0 + 0.9)
                + 0.25 * math.cos(u * 121.0)
            )
            local_thick = thickness * (0.28 + 0.84 * taper) + (2.5 if saw > 0.34 else 0.0) * (1.0 - u * 0.5)
            r_in = r_outer - local_thick
            if r < r_in or r > r_outer:
                continue

            v = (r_outer - r) / max(1.0, local_thick)
            bayer = BAYER4[py & 3, px & 3]
            if u < 0.22 and bayer > (u / 0.22) * 1.18:
                continue
            if 0.30 < v < 0.68 and u < 0.72 and math.sin(u * 54.0 + r * 0.44) > 0.74:
                continue

            smear_mask[py, px] = True
            if v < 0.30 and u > 0.16:
                smear_col[py, px] = C_LIGHT_CORE
            elif v < 0.58 and u > 0.08:
                smear_col[py, px] = C_LIGHT_SUNGOLD
            elif v < 0.82:
                smear_col[py, px] = C_LIGHT_CHAMPAGNE
            else:
                smear_col[py, px] = C_LIGHT_ROSE

    for py in range(max(2, y0 - 1), min(min(LOG_H - 2, max_y + 1), y1 + 2)):
        for px in range(max(2, x0 - 1), min(LOG_W - 2, x1 + 2)):
            if smear_mask[py, px]:
                arr[py, px] = smear_col[py, px]
            else:
                for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nxp, nyp = px + ox, py + oy
                    if 0 <= nxp < LOG_W and 0 <= nyp < LOG_H and smear_mask[nyp, nxp]:
                        if arr[py, px, 3] == 0 and py <= max_y:
                            arr[py, px] = C_OUT
                        break

    for i in range(sparks):
        su = 0.16 + 0.80 * (i / max(1, sparks - 1))
        ang = a0 + span * ((1.0 - su) if reverse_dir else su)
        rr = r_outer + 2.2 + (i % 3) * 2.0
        sx = int(round(cx + math.cos(ang) * rr))
        sy = int(round(cy + math.sin(ang) * rr))
        if sy <= max_y:
            put_px(arr, sx, sy, C_LIGHT_CORE if i % 2 == 0 else C_LIGHT_SUNGOLD)
            if sy - 1 >= 2:
                put_px(arr, sx, sy - 1, C_LIGHT_ROSE if i % 3 == 0 else C_LIGHT_SUNGOLD)


def draw_cathedral_vortex_ring(arr, center, rx, ry, thickness=9.5, half="front"):
    cx, cy = center
    y0 = max(2, int(cy - ry - thickness - 3))
    y1 = min(115, int(cy + ry + thickness + 3))
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
            petal = 0.07 * math.cos(ang * 12.0)
            if nr > 1.06 + petal or nr < 1.0 - (thickness / max(12.0, rx)) * 1.65:
                continue
            v = (1.06 + petal - nr) / max(0.08, (thickness / max(12.0, rx)) * 1.65 + 0.06)
            bayer = BAYER4[py & 3, px & 3]
            if v > 0.86 and bayer > 0.55:
                continue
            mask[py, px] = True
            if v < 0.30:
                col[py, px] = C_LIGHT_CORE
            elif v < 0.58:
                col[py, px] = C_LIGHT_SUNGOLD
            elif v < 0.82:
                col[py, px] = C_LIGHT_CHAMPAGNE
            else:
                col[py, px] = C_LIGHT_ROSE

    for py in range(y0, y1 + 1):
        for px in range(x0, x1 + 1):
            if mask[py, px]:
                arr[py, px] = col[py, px]
            elif arr[py, px, 3] == 0:
                for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if 0 <= px + ox < LOG_W and 0 <= py + oy < LOG_H and mask[py + oy, px + ox]:
                        arr[py, px] = C_OUT
                        break


def draw_radiant_star_pillar(arr, x_center, y_floor=115, width=13.5, intensity=1.0):
    """Vertical Cathedral Sanctum Star-Pillar (`V3 F25` & `DIVINE SANCTUARY`)."""
    icx = int(round(x_center))
    hw = max(3, int(round(width * intensity)))
    y_top = max(4, int(round(8 + (1.0 - intensity) * 42)))
    for py in range(y_top, min(LOG_H - 3, y_floor + 1)):
        h_frac = (y_floor - py) / max(1.0, float(y_floor - y_top))
        flare_base = 1.32 if py > y_floor - 8 else (1.0 - 0.22 * h_frac)
        local_hw = max(2.0, hw * flare_base + 1.0 * math.cos(py * 0.45))
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
            if h_frac > 0.85 and BAYER4[py & 3, px & 3] > (1.0 - h_frac) * 5.8:
                continue
            if af < 0.30:
                arr[py, px] = C_LIGHT_CORE
            elif af < 0.58:
                arr[py, px] = C_LIGHT_SUNGOLD
            elif af < 0.82:
                arr[py, px] = C_LIGHT_CHAMPAGNE
            else:
                arr[py, px] = C_LIGHT_ROSE


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
    aim_deg=-32.0,
    grip_offset=(4.5, -1.5),
    two_handed=True,
    offhand_target=None,
    radiance=0.35,
    halo_flare=0.0,
    phase=0.0,
    smear_spec=None,
    vortex_spec=None,
    pillar_spec=None,
    walk_stride=0.0,
):
    if lock_grounded:
        # Enforce 0px float! Never allow K4_LEAP or vertical float when lock_grounded=True!
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

    # Verify exact boot sole alignment at AY=115 when lock_grounded=True
    b_alpha = np.array(body_im)[:, :, 3] > 0
    bys, _ = np.where(b_alpha)
    cur_bot = int(bys.max()) if len(bys) else AY
    eff_dy = (AY - cur_bot) if lock_grounded else int(round(dy))

    sh_f = (sh_f_base[0] + dx, sh_f_base[1] + eff_dy)
    sh_b = (sh_b_base[0] + dx, sh_b_base[1] + eff_dy)
    gem = (gem_base[0] + dx, gem_base[1] + eff_dy)

    if vortex_spec is not None:
        draw_cathedral_vortex_ring(
            arr,
            vortex_spec["center"],
            vortex_spec["rx"],
            vortex_spec["ry"],
            thickness=vortex_spec.get("thickness", 9.5),
            half="back",
        )

    draw_sanctum_stole_and_halo(arr, cx=gem[0] - 4.0, cy=gem[1] + 2.0, phase=phase, flare=halo_flare)

    grip_main = (sh_f[0] + grip_offset[0], sh_f[1] + grip_offset[1])
    rad = math.radians(aim_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    grip_rear = (grip_main[0] - ux * 7.5, grip_main[1] - uy * 7.5)

    if two_handed:
        draw_priestess_arm(arr, sh_b, grip_rear, is_front=False, bend_sign=1.0)
    elif offhand_target is not None:
        oh = draw_priestess_arm(arr, sh_b, offhand_target, is_front=False, bend_sign=1.0)
        if radiance > 0.45:
            draw_thick_line(arr, oh[0] - 0.5, oh[1], oh[0] + 0.5, oh[1], 2.0, C_LIGHT_SUNGOLD, out_col=C_OUT)
            put_px(arr, int(round(oh[0])), int(round(oh[1])), C_LIGHT_CORE)

    max_weapon_y = 114 if lock_grounded else 117
    weapon_behind = (-175.0 <= aim_deg <= -118.0)
    if weapon_behind:
        draw_sunburst_scepter_lance(arr, grip_main, aim_deg, radiance=radiance, max_y=max_weapon_y)

    body_layer = Image.fromarray(arr, "RGBA")
    bx = int(round(dx))
    if abs(walk_stride) > 0.05 and pose_key == "STAND":
        b_arr = np.array(body_im)
        sheared = np.zeros_like(b_arr)
        for yy in range(LOG_H):
            if yy >= 78:
                t_leg = (yy - 78) / 37.0
                for xx in range(LOG_W):
                    side = 1.0 if xx >= AX else -1.0
                    sx = clamp(int(round(xx - side * walk_stride * t_leg * 3.0)), 0, LOG_W - 1)
                    sheared[yy, xx] = b_arr[yy, sx]
            else:
                sheared[yy] = b_arr[yy]
        body_layer.alpha_composite(Image.fromarray(sheared, "RGBA"), (bx, eff_dy))
    else:
        body_layer.alpha_composite(body_im, (bx, eff_dy))
    arr = np.array(body_layer)

    # Shimmering sapphire collar gem & floating crown star motes
    gx_i, gy_i = int(round(gem[0])), int(round(gem[1]))
    put_px(arr, gx_i, gy_i, C_LIGHT_CORE if (int(phase * 30) % 3 == 0) else C_SAPPHIRE)
    for k in range(2):
        ang = phase * math.tau + k * math.pi
        mx = int(round(AX + dx + math.cos(ang) * 9.0))
        my = int(round(32 + eff_dy + math.sin(ang) * 2.0))
        put_px(arr, mx, my, C_LIGHT_SUNGOLD if k == 0 else C_LIGHT_ROSE)

    if not weapon_behind:
        draw_sunburst_scepter_lance(arr, grip_main, aim_deg, radiance=radiance, max_y=max_weapon_y)
    draw_priestess_arm(arr, sh_f, grip_main, is_front=True, bend_sign=1.0)

    if pillar_spec is not None:
        draw_radiant_star_pillar(
            arr,
            x_center=pillar_spec["x"],
            y_floor=pillar_spec.get("y_floor", 115),
            width=pillar_spec.get("width", 13.5),
            intensity=pillar_spec.get("intensity", 1.0),
        )
    if vortex_spec is not None:
        draw_cathedral_vortex_ring(
            arr,
            vortex_spec["center"],
            vortex_spec["rx"],
            vortex_spec["ry"],
            thickness=vortex_spec.get("thickness", 9.5),
            half="front",
        )
    if smear_spec is not None:
        draw_stained_glass_smear(
            arr,
            center=smear_spec["center"],
            deg_start=smear_spec["deg_start"],
            deg_end=smear_spec["deg_end"],
            r_outer=smear_spec["r_outer"],
            thickness=smear_spec["thickness"],
            sparks=smear_spec.get("sparks", 14),
            max_y=115 if lock_grounded else 117,
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
        frames.append(
            compose_priestess_frame(
                poses,
                pose_key="STAND",
                dx=0.0,
                dy=round(bob * 0.8),
                aim_deg=-46.0 + math.sin(ph * math.tau + 0.4) * 3.0,
                grip_offset=(4.5, -1.5 + 0.5 * bob),
                radiance=0.35 + 0.12 * math.sin(ph * math.tau * 2.0),
                halo_flare=0.14 + 0.08 * math.sin(ph * math.tau),
                phase=ph,
            )
        )
    return frames


def build_row_1_walk(poses):
    frames = []
    for f in range(30):
        ph = f / 30.0
        stride = math.sin(ph * math.tau * 2.0)
        bob = -abs(math.cos(ph * math.tau * 2.0)) * 1.4
        frames.append(
            compose_priestess_frame(
                poses,
                pose_key="K2_LUNGE" if abs(stride) > 0.84 else "STAND",
                dx=1.5 + stride * 1.4,
                dy=round(bob),
                aim_deg=-28.0 + stride * 8.0,
                grip_offset=(5.0, -1.0),
                radiance=0.40,
                halo_flare=0.18,
                phase=ph,
                walk_stride=stride,
            )
        )
    return frames


def build_row_2_auto_attack(poses):
    """
    STRICTLY GROUNDED Row 2 AUTO_ATTACK (`lock_grounded=True`, `foot_y = 115 -> y_320 = 230`, `0px` float!):
      - V0 (F00..F07): Grounded Flash-Step coil -> F03 wide sanctum sweep stained-glass smear!
      - V1 (F08..F14): Grounded low guard -> F09 rising benediction arc stained-glass smear!
      - V2 (F15..F22): Grounded spin torque -> F17 2.5D cathedral rose-halo vortex smear!
      - V3 (F23..F29): Grounded deep split-lunge -> F25 radiant star-pillar + sanctum judgment smear!
    """
    frames = []
    for f in range(30):
        ph = f / 30.0
        # --- V0 (F00..F07): Grounded Wide Sanctum Sweep ---
        if f in (0, 1, 2):
            t = f / 2.0
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K1_COIL",
                    dx=lerp(-2.0, -4.5, t),
                    lock_grounded=True,
                    aim_deg=lerp(-108.0, -144.0, t),
                    grip_offset=(-1.5, -5.5),
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
                    dx=12.0,
                    lock_grounded=True,
                    aim_deg=44.0,
                    grip_offset=(8.5, 1.5),
                    radiance=1.0,
                    halo_flare=0.95,
                    phase=ph,
                    smear_spec={
                        "center": (AX + 26.0, 66.0),
                        "deg_start": -132.0,
                        "deg_end": 58.0,
                        "r_outer": 62.0,
                        "thickness": 21.0,
                        "sparks": 16,
                    },
                )
            )
        elif f == 4:
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=13.0,
                    lock_grounded=True,
                    aim_deg=52.0,
                    grip_offset=(8.5, 2.0),
                    radiance=0.85,
                    halo_flare=0.65,
                    phase=ph,
                    smear_spec={
                        "center": (AX + 26.0, 66.0),
                        "deg_start": -16.0,
                        "deg_end": 62.0,
                        "r_outer": 58.0,
                        "thickness": 10.5,
                        "sparks": 8,
                    },
                )
            )
        elif f in (5, 6, 7):
            t = (f - 5) / 2.0
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=lerp(11.0, 7.0, t),
                    lock_grounded=True,
                    aim_deg=lerp(54.0, 64.0, t),
                    grip_offset=(7.5, 2.5),
                    radiance=0.55,
                    halo_flare=0.35,
                    phase=ph,
                )
            )

        # --- V1 (F08..F14): Grounded Rising Benediction Arc ---
        elif f == 8:
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=5.5,
                    lock_grounded=True,
                    aim_deg=68.0,
                    grip_offset=(6.5, 3.0),
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
                    dx=10.0,
                    lock_grounded=True,
                    aim_deg=-84.0,
                    grip_offset=(7.0, -8.5),
                    radiance=1.0,
                    halo_flare=1.0,
                    phase=ph,
                    smear_spec={
                        "center": (AX + 24.0, 64.0),
                        "deg_start": 68.0,
                        "deg_end": -98.0,
                        "r_outer": 60.0,
                        "thickness": 21.0,
                        "sparks": 16,
                    },
                )
            )
        elif f == 10:
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K3_RISE",
                    dx=10.5,
                    lock_grounded=True,
                    aim_deg=-94.0,
                    grip_offset=(6.5, -9.5),
                    radiance=0.85,
                    halo_flare=0.70,
                    phase=ph,
                    smear_spec={
                        "center": (AX + 24.0, 62.0),
                        "deg_start": -18.0,
                        "deg_end": -104.0,
                        "r_outer": 56.0,
                        "thickness": 10.0,
                        "sparks": 8,
                    },
                )
            )
        elif f in (11, 12, 13, 14):
            t = (f - 11) / 3.0
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K3_RISE" if f <= 12 else "K1_COIL",
                    dx=lerp(9.0, -3.0, t),
                    lock_grounded=True,
                    aim_deg=lerp(-96.0, -154.0, t),
                    grip_offset=(lerp(5.5, -2.5, t), lerp(-8.5, -4.0, t)),
                    radiance=0.55 + 0.20 * t,
                    halo_flare=0.40 + 0.25 * t,
                    phase=ph,
                )
            )

        # --- V2 (F15..F22): Grounded 2.5D Cathedral Rose-Halo Vortex ---
        elif f in (15, 16):
            t = f - 15
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K1_COIL",
                    dx=-4.5 - t * 1.5,
                    lock_grounded=True,
                    aim_deg=-160.0 - t * 8.0,
                    grip_offset=(-3.0, -3.0),
                    radiance=0.80 + 0.15 * t,
                    halo_flare=0.75,
                    phase=ph,
                )
            )
        elif f == 17:
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=11.0,
                    lock_grounded=True,
                    aim_deg=4.0,
                    grip_offset=(9.5, -1.0),
                    radiance=1.0,
                    halo_flare=1.0,
                    phase=ph,
                    vortex_spec={
                        "center": (AX + 22.0, 74.0),
                        "rx": 64.0,
                        "ry": 18.0,
                        "thickness": 12.5,
                    },
                )
            )
        elif f == 18:
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=12.0,
                    lock_grounded=True,
                    aim_deg=16.0,
                    grip_offset=(9.0, 0.0),
                    radiance=0.85,
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
            t = (f - 19) / 3.0
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K2_LUNGE" if f <= 20 else "K3_RISE",
                    dx=lerp(10.0, 2.0, t),
                    lock_grounded=True,
                    aim_deg=lerp(20.0, -112.0, t),
                    grip_offset=(lerp(8.0, 1.0, t), lerp(0.5, -7.5, t)),
                    radiance=0.60 + 0.30 * t,
                    halo_flare=0.45 + 0.40 * t,
                    phase=ph,
                )
            )

        # --- V3 (F23..F29): Grounded Flash-Step Invocation -> Radiant Star-Pillar Judgment ---
        elif f in (23, 24):
            t = f - 23
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K3_RISE",
                    dx=3.0 + t * 2.5,
                    lock_grounded=True,
                    aim_deg=-124.0 - t * 14.0,
                    grip_offset=(0.5, -9.0),
                    radiance=1.0,
                    halo_flare=1.0,
                    phase=ph,
                )
            )
        elif f == 25:
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=14.0,
                    lock_grounded=True,
                    aim_deg=26.0,
                    grip_offset=(9.5, 1.0),
                    radiance=1.0,
                    halo_flare=1.0,
                    phase=ph,
                    pillar_spec={"x": AX + 68.0, "y_floor": 115, "width": 14.5, "intensity": 1.0},
                    smear_spec={
                        "center": (AX + 28.0, 64.0),
                        "deg_start": -138.0,
                        "deg_end": 42.0,
                        "r_outer": 64.0,
                        "thickness": 23.0,
                        "sparks": 18,
                    },
                )
            )
        elif f == 26:
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=14.0,
                    lock_grounded=True,
                    aim_deg=32.0,
                    grip_offset=(9.0, 1.5),
                    radiance=0.90,
                    halo_flare=0.80,
                    phase=ph,
                    pillar_spec={"x": AX + 68.0, "y_floor": 115, "width": 11.5, "intensity": 0.72},
                )
            )
        else:
            t = (f - 27) / 2.0
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K2_LUNGE" if f == 27 else "STAND",
                    dx=lerp(11.0, 1.5, t),
                    lock_grounded=True,
                    aim_deg=lerp(28.0, -40.0, t),
                    grip_offset=(lerp(8.0, 4.5, t), lerp(1.0, -1.5, t)),
                    radiance=lerp(0.75, 0.35, t),
                    halo_flare=lerp(0.55, 0.15, t),
                    phase=ph,
                )
            )
    return frames


def build_row_3_skill(poses):
    """Row 3 SKILL (`DIVINE SANCTUARY`): Grounded K3_RISE invocation -> sanctum spire benediction."""
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
                    aim_deg=lerp(-52.0, -90.0, t),
                    grip_offset=(4.5, lerp(-2.0, -9.5, t)),
                    two_handed=False,
                    offhand_target=(AX - 12.0, lerp(72.0, 54.0, t)),
                    radiance=0.55 + 0.45 * t,
                    halo_flare=0.40 + 0.60 * t,
                    phase=ph,
                )
            )
        elif f == 8:
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K3_RISE",
                    dx=4.0,
                    lock_grounded=True,
                    aim_deg=-88.0,
                    grip_offset=(5.0, -10.0),
                    radiance=1.0,
                    halo_flare=1.0,
                    phase=ph,
                    pillar_spec={"x": AX + 58.0, "y_floor": 115, "width": 13.5, "intensity": 1.0},
                    vortex_spec={"center": (AX + 4.0, 110.0), "rx": 34.0, "ry": 7.0, "thickness": 6.5},
                )
            )
        elif f < 21:
            t = (f - 9) / 11.0
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K3_RISE",
                    dx=4.0 - t * 2.0,
                    lock_grounded=True,
                    aim_deg=-88.0 + math.sin(t * math.pi * 2.0) * 4.0,
                    grip_offset=(5.0, -9.5),
                    radiance=0.95 - 0.25 * t,
                    halo_flare=0.85 - 0.30 * t,
                    phase=ph,
                    pillar_spec=(
                        {"x": AX + 58.0, "y_floor": 115, "width": 11.0, "intensity": 1.0 - t * 0.75}
                        if f <= 15
                        else None
                    ),
                )
            )
        else:
            t = (f - 21) / 8.0
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="STAND",
                    dx=lerp(2.0, 0.0, t),
                    lock_grounded=True,
                    aim_deg=lerp(-84.0, -44.0, t),
                    grip_offset=(4.5, lerp(-8.0, -1.5, t)),
                    radiance=lerp(0.65, 0.35, t),
                    halo_flare=lerp(0.50, 0.15, t),
                    phase=ph,
                )
            )
    return frames


def build_row_4_ultimate(poses):
    """
    Row 4 ULTIMATE (`SERAPHIC CATHEDRAL` & `FINAL GRACE` horizontal beam stance):
    Ascends via `K4_LEAP` (`F04..F16`), then aims Scepter-Lance straight forward (`0 deg`) for `FINAL GRACE`!
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
                    aim_deg=lerp(-50.0, -88.0, t),
                    grip_offset=(4.5, lerp(-2.5, -10.0, t)),
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
                    aim_deg=-86.0 + t * 24.0,
                    grip_offset=(4.5, -8.5),
                    two_handed=False,
                    offhand_target=(AX - 10.0, 62.0 + hover),
                    radiance=1.0,
                    halo_flare=1.0,
                    phase=ph,
                )
            )
        elif f == 17:
            # Horizontal Scepter-Lance purifying beam command snap!
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=12.0,
                    dy=0.0,
                    aim_deg=0.0,
                    grip_offset=(10.0, -2.0),
                    radiance=1.0,
                    halo_flare=1.0,
                    phase=ph,
                    smear_spec={
                        "center": (AX + 26.0, 64.0),
                        "deg_start": -108.0,
                        "deg_end": 28.0,
                        "r_outer": 63.0,
                        "thickness": 22.0,
                        "sparks": 18,
                    },
                )
            )
        elif f < 25:
            # Sustained horizontal `0 deg` Final Grace beam posture!
            t = (f - 18) / 6.0
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=12.0,
                    dy=0.0,
                    aim_deg=0.0 + math.sin(t * math.tau) * 1.5,
                    grip_offset=(10.0, -2.0),
                    radiance=1.0,
                    halo_flare=0.95,
                    phase=ph,
                )
            )
        else:
            t = (f - 25) / 4.0
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="STAND",
                    dx=lerp(10.0, 0.0, t),
                    dy=0.0,
                    aim_deg=lerp(0.0, -44.0, t),
                    grip_offset=(lerp(9.0, 4.5, t), -1.5),
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
                    aim_deg=-114.0 - 16.0 * recoil,
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
                    aim_deg=-126.0 + t * 30.0,
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
                    aim_deg=lerp(-92.0, -44.0, t),
                    grip_offset=(4.5, -1.5),
                    radiance=0.35,
                    phase=ph,
                )
            )
    return frames


def build_row_6_block_parry(poses):
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
                )
            )
        elif f == 12:
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K2_LUNGE",
                    dx=11.0,
                    lock_grounded=True,
                    aim_deg=22.0,
                    grip_offset=(9.0, 0.5),
                    radiance=1.0,
                    halo_flare=1.0,
                    phase=ph,
                    smear_spec={
                        "center": (AX + 24.0, 66.0),
                        "deg_start": -108.0,
                        "deg_end": 44.0,
                        "r_outer": 60.0,
                        "thickness": 20.0,
                        "sparks": 14,
                    },
                )
            )
        else:
            t = (f - 13) / 16.0
            frames.append(
                compose_priestess_frame(
                    poses,
                    pose_key="K2_LUNGE" if f < 20 else "STAND",
                    dx=lerp(11.0, 0.0, t),
                    lock_grounded=True,
                    aim_deg=lerp(26.0, -44.0, t),
                    grip_offset=(lerp(8.5, 4.5, t), -1.5),
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
                aim_deg=-20.0 + math.sin(ph * math.tau) * 4.5,
                grip_offset=(6.5, 0.5),
                radiance=0.55 + 0.15 * math.sin(ph * math.tau * 2.0),
                halo_flare=0.35,
                phase=ph,
                vortex_spec={
                    "center": (AX + 4.0, 98.0),
                    "rx": 24.0 + math.sin(ph * math.tau) * 2.0,
                    "ry": 5.5,
                    "thickness": 4.0,
                },
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
                aim_deg=-52.0 - arc * 34.0 + math.sin(ph * math.tau) * 5.0,
                grip_offset=(4.5, -3.0 - arc * 3.0),
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
                    aim_deg=lerp(-106.0, -152.0, t),
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
            draw_sunburst_scepter_lance(
                arr,
                (AX + 8.0, 110.0),
                angle_deg=lerp(-10.0, 3.0, t),
                length_scale=0.92,
                radiance=0.20 + 0.08 * math.sin(ph * math.tau * 3.0),
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
# 7. PORTRAIT BUILDER & SHEET ASSEMBLY / GROUNDED QA AUDIT
# ==============================================================================
def build_portrait():
    raw = Image.open(PORTRAIT_JPG).convert("RGB")
    w, h = raw.size
    s = int(min(w, h) * 0.88)
    x0 = (w - s) // 2
    y0 = max(0, int((h - s) * 0.26))
    crop = raw.crop((x0, y0, x0 + s, y0 + s)).resize((64, 64), Image.Resampling.BILINEAR)
    q64 = crop.quantize(colors=42, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGBA")
    arr = np.array(q64)
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
        for c_idx, farr in enumerate(log_frames):
            if c_idx > 0 and not np.array_equal(log_frames[c_idx - 1], farr):
                transitions += 1
            if r_idx == 2:
                # Verify grounded foot_y = 115 -> y_320 = 230..231!
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
            sheet.paste(im_320, (c_idx * CELL_W, r_idx * CELL_H))
            row_320.append(im_320)
        all_rows_320.append(row_320)
        extra = f" | grounded bot_y_log min={min(r2_bot_ys)} max={max(r2_bot_ys)}" if r_idx == 2 else ""
        print(f"  [{r_name}] transitions={transitions}/29{extra}")
        if transitions < 29:
            raise RuntimeError(f"{r_name} has static duplicate frames ({transitions}/29)!")
        if r_idx == 2 and (min(r2_bot_ys) != 115 or max(r2_bot_ys) != 115):
            raise RuntimeError(f"Row 2 grounded foot_y violation: {r2_bot_ys}")

    if border_clips != 0:
        raise RuntimeError(f"Border clip violation: {border_clips}/300!")

    sheet.save(OUT_SHEET)
    port = build_portrait()
    print(f"[priestess_ex] Saved {OUT_SHEET} ({sheet.size[0]}x{sheet.size[1]}), border_clips={border_clips}/300")
    print(f"[priestess_ex] Saved {OUT_PORTRAIT} ({port.size[0]}x{port.size[1]})")

    # Visual QA Contact Sheets in scratch dir
    r2_w, r2_h = 6 * (CELL_W + 6) + 6, 5 * (CELL_H + 6) + 6
    dbg_r2 = Image.new("RGBA", (r2_w, r2_h), (24, 22, 36, 255))
    dr = ImageDraw.Draw(dbg_r2)
    for idx, im320 in enumerate(all_rows_320[2]):
        gx = (idx % 6) * (CELL_W + 6) + 6
        gy = (idx // 6) * (CELL_H + 6) + 6
        bg = Image.new("RGBA", (CELL_W, CELL_H), (34, 32, 48, 255))
        bg_d = ImageDraw.Draw(bg)
        bg_d.line([(0, 230), (319, 230)], fill=(120, 96, 52, 255), width=1)
        bg_d.line([(112, 0), (112, 239)], fill=(70, 86, 120, 255), width=1)
        bg.alpha_composite(im320, (0, 0))
        dbg_r2.paste(bg, (gx, gy))
        dr.text((gx + 6, gy + 4), f"F{idx:02d}", fill=(255, 235, 160, 255))
    dbg_r2.save(os.path.join(args.scratch_dir, "debug_priestess_ex_row2.png"))

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
