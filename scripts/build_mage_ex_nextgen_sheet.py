#!/usr/bin/env python3
"""
IGNIS SOL EX (`mage_ex`) — Next-Gen Wide-Canvas (`320x240` cell, `9600x2400` 30x10 sheet)
Classic Black-Mage / Solar Wizard Neo-Vision Overhaul + Pure High-Sorcery Spellcasting Pipeline.

Outputs:
  - `assets/sprites/mage_ex_sheet.png`    (9600x2400, 30 cols x 10 rows @ 320x240, 2x2 pixel blocks)
  - `assets/sprites/mage_ex_portrait.png` (128x128, 2x2 pixel blocks)
  - Untracked QA contact sheets in scratch directory (`--scratch-dir` or default brain scratch)

Invariants enforced:
  - Iconic Classic-Wizard look upgraded to Neo-Vision: pointed wide-brimmed crimson-gold Wizard Hat
    with blazing Sun Crest, pitch-black shadowed face, glowing molten-gold eyes, gold-runed Archmage
    stoles/robes, floating back Solar Astrolabe Halo, and Golden Crescent-Sun Archmage Staff (`0` spear blades!).
  - Pure Mage Spellcasting `Row 2` (`[[60,8],[68,7],[75,8],[83,7]]`, `0` melee sword/halberd slash crescents!):
      * `V0 (F03)`: `K2` forward staff-projection -> 3D foreshortened Golden Solar Rune Magic Circle + Solar Fireball muzzle flare (`x = 185..298`)
      * `V1 (F09)`: Sweeping Arcane Invocation -> twin concentric Helios Sun-Sigils + twin Solar Corona Bolt bursts (`x = 185..296`)
      * `V2 (F17)`: `K3` grand two-arm raised invocation -> radiant Astrolabe Eclipse Glyph & ground-to-sky Solar Prominence Column (`x = 190..304`)
      * `V3 (F25)`: `K4` levitating arcane-hover cast -> Colossal Blazing Sun-Crest Seal & Triple Meteoric Fire-Orb Array (`x = 192..308`)
      * Progressive `4x4` Bayer rune/ember dissipation on `F04..F05`, `F10..F11`, `F18..F19`, `F26..F27`
  - 100% 2x2 integer pixel blocks (authored at 160x120 logical, upscaled 2x NEAREST -> 320x240)
  - Anchor `(56, 115)` logical -> `(112, 230)` output (`208px` forward canvas reach!)
  - Binary alpha (`0` or `255`), `4px` output safety margin (`0/300` border clips)
  - `29/29` active transitions on all 10 rows
"""

import argparse
import math
import os
import sys
from collections import deque

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ex_sprite_clean_utils import clean_512_pose_holes_and_specks, seal_160_char_pinholes_and_leaks

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
TARGET_STAND_H = 88

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

# Classic Solar Wizard / Neo-Vision Archmage Palette
C_OUT = (18, 7, 10, 255)
C_VOID_FACE = (6, 4, 8, 255)
C_SHAFT_DARK = (54, 20, 18, 255)
C_SHAFT_WOOD = (92, 34, 24, 255)
C_ROBE_DARK = (42, 14, 18, 255)
C_ROBE_CRIMSON = (142, 28, 30, 255)
C_GLOVE_DARK = (26, 24, 32, 255)
C_GOLD_DARK = (146, 78, 18, 255)
C_GOLD_MID = (217, 138, 28, 255)
C_GOLD_LIGHT = (250, 204, 56, 255)
C_GOLD_SPEC = (255, 247, 194, 255)

# Solar Sorcery & Molten Eye Palette
C_FLAME_CORE = (255, 255, 255, 255)
C_FLAME_GOLD = (254, 240, 138, 255)
C_FLAME_AMBER = (251, 191, 36, 255)
C_FLAME_ORANGE = (251, 146, 60, 255)
C_FLAME_CRIMSON = (220, 38, 38, 255)
C_FLAME_DEEP = (127, 29, 29, 255)
C_OBSIDIAN_CRUST = (34, 14, 18, 255)
C_ECLIPSE_VOID = (18, 8, 28, 255)
C_ECLIPSE_VIOLET = (107, 33, 168, 255)
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

    bg_cand = ((luma >= 235.0) & (sat <= 0.11)) | (luma >= 248.0)

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

    fg = ~bg
    border_touch = np.zeros((h, w), dtype=bool)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        shifted = np.roll(np.roll(bg, dy, axis=0), dx, axis=1)
        border_touch |= fg & shifted
    fringe = border_touch & (luma >= 220.0) & (sat <= 0.16)
    fg = fg & (~fringe)
    fg = keep_largest_component(fg)

    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, :3] = arr.astype(np.uint8)
    rgba[:, :, 3] = np.where(fg, 255, 0)
    return Image.fromarray(rgba)


def apply_selout_and_quantize(rgba_im, palette_colors=48):
    arr = np.array(rgba_im)
    a = arr[:, :, 3] > 128
    if not a.any():
        return rgba_im

    rgb = arr[:, :, :3].copy()
    fg_im = Image.fromarray(rgb).quantize(
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
    soft_edge = edge & (luma > 92.0)
    q_rgb[soft_edge] = q_rgb[soft_edge] * 0.34 + np.array([18.0, 7.0, 10.0]) * 0.66

    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[:, :, :3] = np.clip(q_rgb, 0, 255).astype(np.uint8)
    out[:, :, 3] = np.where(a, 255, 0)
    return Image.fromarray(out)


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
    fg = fg & ~(edge & (luma >= 214.0) & (sat <= 0.18))

    clean = np.zeros_like(arr)
    clean[:, :, :3] = arr[:, :, :3]
    clean[:, :, 3] = np.where(fg, 255, 0)
    quant = apply_selout_and_quantize(Image.fromarray(clean), palette_colors=48)

    canvas = Image.new("RGBA", (LOG_W, LOG_H), (0, 0, 0, 0))
    ox = int(round(AX - x_ref_512 * scale))
    oy = int(round(AY - y_bot_512 * scale))
    canvas.alpha_composite(quant, (ox, oy))
    return canvas, ox, oy


# ==============================================================================
# 2. LOAD CLASSIC-WIZARD NEO-VISION BASE + 4 SPELLCASTING KEYPOSES
# ==============================================================================
def polygon_mask_512(poly):
    m = Image.new("L", (512, 512), 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    return np.array(m) > 127


def extract_part_512(src_arr, mask_bool, darken_rgb=1.0):
    ys, xs = np.where(mask_bool)
    if len(ys) == 0:
        return (Image.new("RGBA", (2, 2), (0, 0, 0, 0)), 0, 0)
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    crop = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
    sub = mask_bool[y0:y1, x0:x1]
    rgb = src_arr[y0:y1, x0:x1, :3].astype(np.float32) * darken_rgb
    crop[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    crop[:, :, 3] = np.where(sub, 255, 0)
    return (Image.fromarray(crop), x0, y0)


def rot_pt_2d(pt, piv, deg):
    rad = math.radians(deg)
    c, s = math.cos(rad), math.sin(rad)
    dx, dy = pt[0] - piv[0], pt[1] - piv[1]
    return (piv[0] + dx * c - dy * s, piv[1] + dx * s + dy * c)


def paste_rotated_part_512(
    canvas,
    part_tuple,
    src_piv,
    dst_piv,
    deg=0.0,
    squash_x=1.0,
    squash_y=1.0,
    wave_phase=None,
    wave_amp=0.0,
):
    crop_im, x0, y0 = part_tuple
    px, py = src_piv[0] - x0, src_piv[1] - y0

    if wave_phase is not None and abs(wave_amp) > 0.05:
        arr = np.array(crop_im)
        h, w = arr.shape[:2]
        pad = int(abs(wave_amp)) + 4
        out = np.zeros((h + pad * 2, w + pad * 2, 4), dtype=np.uint8)
        for y in range(h):
            vt = y / max(1.0, float(h - 1))
            dx_w = int(round(math.sin(wave_phase - vt * 3.0) * wave_amp * (vt ** 1.15)))
            out[pad + y, pad + dx_w : pad + dx_w + w] = arr[y]
        crop_im = Image.fromarray(out)
        px += pad
        py += pad

    if abs(squash_x - 1.0) > 0.01 or abs(squash_y - 1.0) > 0.01:
        w0, h0 = crop_im.size
        nw = max(2, int(round(w0 * squash_x)))
        nh = max(2, int(round(h0 * squash_y)))
        crop_im = crop_im.resize((nw, nh), Image.Resampling.BILINEAR)
        px *= squash_x
        py *= squash_y

    w, h = crop_im.size
    max_r = int(math.hypot(max(px, w - px), max(py, h - py))) + 6
    pad_s = max_r * 2
    pad_im = Image.new("RGBA", (pad_s, pad_s), (0, 0, 0, 0))
    pad_im.paste(crop_im, (max_r - int(round(px)), max_r - int(round(py))))
    rot_im = (
        pad_im.rotate(-deg, resample=Image.Resampling.BILINEAR, expand=False)
        if abs(deg) > 0.05
        else pad_im
    )
    canvas.alpha_composite(rot_im, (int(round(dst_piv[0])) - max_r, int(round(dst_piv[1])) - max_r))


def build_mage_walk_rig_512(base_arr, x_ref_stand, y_bot_stand, scale):
    """
    Extracts Ignis Sol EX's REAL painted 512x512 garments & gold-buckled boots from `base_arr`:
      - `upper_torso`: Classic pointed Wizard Hat, blazing Sun Crest, pitch-black face, upturned collar, pauldrons, gauntlets, & sun-belt
      - `back_cape`: REAL painted crimson-gold cape tapering down to `y_log ~ 108`
      - `l_robe_wing` & `r_robe_wing`: REAL painted ornate gold-trimmed crimson robe flanks (`y_log ~ 107..110` on outer edges) parted in an arched inverted-V opening (`0` horizontal chop!)
      - `central_stole`: REAL painted black-and-gold 8-Ray Sun-Emblem central stole with pointed diamond tip
      - `boot_near` / `boot_far`: REAL painted `+X` gold-buckled crimson-obsidian archmage boots!
    """
    alpha = base_arr[:, :, 3] > 128

    cape_poly = [(176, 286), (198, 322), (164, 428), (138, 460), (104, 460), (104, 368), (156, 294)]
    cape_m = keep_largest_component(alpha & polygon_mask_512(cape_poly))

    upper_poly = [
        (0, 0),
        (511, 0),
        (511, 362),
        (316, 358),
        (308, 322),
        (206, 322),
        (206, 366),
        (166, 366),
        (166, 292),
        (0, 292),
    ]
    upper_m = keep_largest_component(alpha & polygon_mask_512(upper_poly) & ~cape_m)

    # Left ornate crimson-gold robe flank + left vertical rune-stole with diagonal arched inverted-V inner opening
    l_robe_m = keep_largest_component(
        alpha
        & polygon_mask_512([(206, 316), (252, 316), (250, 356), (234, 404), (196, 448), (152, 438), (186, 362)])
    )
    l_robe_im, lx0, ly0 = extract_part_512(base_arr, l_robe_m, 1.0)
    dl = ImageDraw.Draw(l_robe_im)
    dl.line([(196 - lx0, 445 - ly0), (233 - lx0, 402 - ly0)], fill=(217, 138, 28, 255), width=5)
    dl.line([(198 - lx0, 446 - ly0), (235 - lx0, 403 - ly0)], fill=(10, 14, 28, 255), width=2)

    # Right ornate crimson-gold robe flank + right vertical rune-stole with diagonal arched inverted-V inner opening
    r_robe_m = keep_largest_component(
        alpha
        & polygon_mask_512([(298, 316), (318, 316), (344, 376), (358, 452), (324, 450), (312, 402), (300, 352)])
    )
    r_robe_im, rx0, ry0 = extract_part_512(base_arr, r_robe_m, 1.0)
    dr = ImageDraw.Draw(r_robe_im)
    dr.line([(325 - rx0, 448 - ry0), (312 - rx0, 402 - ry0)], fill=(217, 138, 28, 255), width=5)
    dr.line([(323 - rx0, 449 - ry0), (310 - rx0, 403 - ry0)], fill=(10, 14, 28, 255), width=2)

    stole_m = keep_largest_component(
        alpha & polygon_mask_512([(252, 318), (302, 318), (302, 406), (277, 448), (252, 406)])
    )

    boot_m = keep_largest_component(
        alpha & polygon_mask_512([(282, 446), (322, 446), (352, 468), (352, 490), (282, 490)])
    )

    return {
        "upper_torso": extract_part_512(base_arr, upper_m, 1.0),
        "back_cape": extract_part_512(base_arr, cape_m, 0.96),
        "l_robe": (l_robe_im, lx0, ly0),
        "r_robe": (r_robe_im, rx0, ry0),
        "central_stole": extract_part_512(base_arr, stole_m, 1.0),
        "boot_near": extract_part_512(base_arr, boot_m, 1.0),
        "boot_far": extract_part_512(base_arr, boot_m, 0.72),
        "x_ref": x_ref_stand,
        "y_bot": y_bot_stand,
        "scale": scale,
        "pivots": {
            "pelvis": (258.0, 316.0),
            "cape": (184.0, 304.0),
            "l_robe": (218.0, 318.0),
            "r_robe": (306.0, 318.0),
            "stole": (277.0, 320.0),
            "boot_ank": (299.0, 452.0),
        },
    }


def load_mage_poses():
    base_raw = Image.open(BASE_JPG).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
    base_seg = clean_512_pose_holes_and_specks(
        segment_white_bg(base_raw, pocket_seeds=()),
        max_hole_area=220,
        min_island_area=36,
    )
    base_arr = np.array(base_seg)

    ys, _ = np.where(base_arr[:, :, 3] > 0)
    y_top_stand, y_bot_stand = int(ys.min()), int(ys.max())
    stand_h_512 = max(1, y_bot_stand - y_top_stand)
    scale = TARGET_STAND_H / float(stand_h_512)
    x_ref_stand = 256

    stand_log, ox_s, oy_s = scale_pose_to_logical(base_seg, x_ref_stand, y_bot_stand, scale)
    walk_rig_512 = build_mage_walk_rig_512(base_arr, x_ref_stand, y_bot_stand, scale)

    def to_log(pt, ox, oy):
        return (ox + pt[0] * scale, oy + pt[1] * scale)

    poses = {
        "scale": scale,
        "STAND": {
            "sprite": stand_log,
            "walk_rig_512": walk_rig_512,
            "ox": ox_s,
            "oy": oy_s,
            "grip_512": (352.0, 336.0),
            "l_eye_512": (247.0, 187.0),
            "r_eye_512": (299.0, 191.0),
            "hat_sun_512": (286.0, 123.0),
            "chest_orb_512": (282.0, 252.0),
            "grip": to_log((352, 336), ox_s, oy_s),
            "offhand": to_log((194, 340), ox_s, oy_s),
            "l_eye": to_log((247, 187), ox_s, oy_s),
            "r_eye": to_log((299, 191), ox_s, oy_s),
            "hat_sun": to_log((286, 123), ox_s, oy_s),
            "chest_orb": to_log((282, 252), ox_s, oy_s),
            "halo_anchor": to_log((256, 224), ox_s, oy_s),
        },
    }

    kp_sheet = Image.open(KEYPOSES_JPG).convert("RGB")
    kw, kh = kp_sheet.size
    hw, hh = kw // 2, kh // 2

    quad_specs = {
        "K1_COIL": {
            "crop": (0, 0, hw, hh),
            "pockets": [],
            "x_ref": 258,
            "y_bot_override": None,
            "grip": (374, 252),
            "offhand": (272, 258),
            "l_eye": (259, 185),
            "r_eye": (299, 179),
            "hat_sun": (281, 121),
            "chest_orb": (275, 245),
            "halo_anchor": (256, 222),
        },
        "K2_CAST": {
            "crop": (hw, 0, kw, hh),
            "pockets": [],
            "x_ref": 258,
            "y_bot_override": None,
            "grip": (428, 214),
            "offhand": (218, 280),
            "l_eye": (260, 181),
            "r_eye": (294, 179),
            "hat_sun": (280, 124),
            "chest_orb": (276, 256),
            "halo_anchor": (254, 226),
        },
        "K3_INVOKE": {
            "crop": (0, hh, hw, kh),
            "pockets": [(325, 148), (191, 150)],
            "x_ref": 262,
            "y_bot_override": None,
            "grip": (400, 112),
            "offhand": (126, 102),
            "l_eye": (246, 198),
            "r_eye": (286, 202),
            "hat_sun": (276, 132),
            "chest_orb": (276, 266),
            "halo_anchor": (260, 224),
        },
        "K4_HOVER": {
            "crop": (hw, hh, kw, kh),
            "pockets": [],
            "x_ref": 266,
            "y_bot_override": 486,
            "grip": (368, 310),
            "offhand": (200, 306),
            "l_eye": (252, 188),
            "r_eye": (292, 196),
            "hat_sun": (284, 126),
            "chest_orb": (288, 254),
            "halo_anchor": (264, 226),
        },
    }

    for kname, spec in quad_specs.items():
        tile = kp_sheet.crop(spec["crop"]).resize((512, 512), Image.Resampling.LANCZOS)
        seg = clean_512_pose_holes_and_specks(
            segment_white_bg(tile, pocket_seeds=spec["pockets"]),
            max_hole_area=220,
            min_island_area=36,
        )
        s_arr = np.array(seg)
        k_ys, _ = np.where(s_arr[:, :, 3] > 0)
        y_bot = spec["y_bot_override"] if spec["y_bot_override"] is not None else int(k_ys.max())
        kp_log, kox, koy = scale_pose_to_logical(seg, spec["x_ref"], y_bot, scale)
        poses[kname] = {
            "sprite": kp_log,
            "grip": to_log(spec["grip"], kox, koy),
            "offhand": to_log(spec["offhand"], kox, koy),
            "l_eye": to_log(spec["l_eye"], kox, koy),
            "r_eye": to_log(spec["r_eye"], kox, koy),
            "hat_sun": to_log(spec["hat_sun"], kox, koy),
            "chest_orb": to_log(spec["chest_orb"], kox, koy),
            "halo_anchor": to_log(spec["halo_anchor"], kox, koy),
        }

    return poses


# ==============================================================================
# 3. PIXEL PRIMITIVES, SOLAR ASTROLABE HALO & GOLDEN CRESCENT-SUN ARCHMAGE STAFF
# ==============================================================================
def put_px(arr, x, y, col):
    if 2 <= x < LOG_W - 2 and 2 <= y < LOG_H - 2:
        arr[y, x] = col


def put_px_outline_bg(arr, x, y, col):
    if 2 <= x < LOG_W - 2 and 2 <= y < LOG_H - 2 and arr[y, x, 3] == 0:
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
                        put_px_outline_bg(arr, icx + dx, icy + dy, out_col)
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


def draw_pixel_star4(arr, cx, cy, arm=3, core_col=C_FLAME_CORE, ray_col=C_FLAME_GOLD, out_col=C_OUT):
    icx, icy = int(round(cx)), int(round(cy))
    if out_col is not None:
        for d in range(-arm - 1, arm + 2):
            put_px_outline_bg(arr, icx + d, icy, out_col)
            put_px_outline_bg(arr, icx, icy + d, out_col)
        for ox, oy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
            put_px_outline_bg(arr, icx + ox * 2, icy + oy, out_col)
            put_px_outline_bg(arr, icx + ox, icy + oy * 2, out_col)
    for d in range(-arm, arm + 1):
        put_px(arr, icx + d, icy, ray_col)
        put_px(arr, icx, icy + d, ray_col)
    for ox, oy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        put_px(arr, icx + ox, icy + oy, ray_col)
    put_px(arr, icx, icy, core_col)


def draw_solar_astrolabe_halo(arr, cx, cy, phase, radius=15.0, flare=0.0, eclipse=False):
    """Floating back Solar Astrolabe Halo behind Ignis Sol EX's shoulders."""
    ring_col = C_ECLIPSE_MAGENTA if eclipse else C_GOLD_MID
    spike_col = C_FLAME_GOLD if not eclipse else C_FLAME_CORE
    ember_col = C_ECLIPSE_VIOLET if eclipse else C_FLAME_CRIMSON

    rx = radius * (0.86 + 0.10 * flare)
    ry = radius * (1.0 + 0.08 * flare)
    steps = 56
    for i in range(steps):
        ang = (i / float(steps)) * math.tau
        px = int(round(cx + math.cos(ang) * rx))
        py = int(round(cy + math.sin(ang) * ry))
        if 3 <= px < LOG_W - 3 and 3 <= py < LOG_H - 4:
            for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                put_px_outline_bg(arr, px + ox, py + oy, C_OUT)
            arr[py, px] = C_GOLD_LIGHT if ((i + int(phase * 16)) % 5 == 0) else ring_col

    rot = phase * math.tau
    for k in range(8):
        ang = rot + k * (math.tau / 8.0)
        is_major = k % 2 == 0
        r0 = 0.88
        r1 = (1.26 + 0.14 * flare) if is_major else (1.12 + 0.06 * flare)
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
            0.90 if is_major else 0.60,
            spike_col if is_major else ember_col,
            out_col=C_OUT,
        )
        if is_major and flare > 0.28:
            put_px(arr, int(round(x1)), int(round(y1)), C_FLAME_CORE)


def draw_crescent_sun_staff(
    arr,
    grip_pos,
    angle_deg,
    butt_len=14.0,
    shaft_len=24.0,
    blaze=0.35,
    phase=0.0,
    stamp_glove=True,
    max_y=114,
):
    """
    Ornate Golden Crescent-Sun Archmage Staff (0 spear/halberd blades!):
      - Polished crimson-mahogany shaft with gold rune ferrules & solar pommel
      - Curved Golden Crescent-Moon Filigree Head cradling a blazing miniature Sun Orb
    Returns `(orb_cx, orb_cy)` for spell-circle registration.
    """
    rad = math.radians(angle_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    bx = grip_pos[0] - ux * butt_len
    by = grip_pos[1] - uy * butt_len
    if by > max_y:
        scale_b = max(0.15, (max_y - grip_pos[1]) / max(1.0, by - grip_pos[1]))
        bx = grip_pos[0] + (bx - grip_pos[0]) * scale_b
        by = max_y
    if by < 5:
        scale_b = max(0.15, (grip_pos[1] - 5.0) / max(1.0, grip_pos[1] - by))
        bx = grip_pos[0] + (bx - grip_pos[0]) * scale_b
        by = 5.0

    nx_p = grip_pos[0] + ux * shaft_len
    ny_p = clamp(grip_pos[1] + uy * shaft_len, 9.0, float(max_y - 6))

    # 1. Polished mahogany-gold shaft + royal sun pommel
    draw_thick_line(arr, bx, by, nx_p, ny_p, 1.15, C_SHAFT_DARK, out_col=C_OUT)
    draw_thick_line(arr, bx + ux * 1.5, by + uy * 1.5, nx_p - ux * 1.5, ny_p - uy * 1.5, 0.65, C_SHAFT_WOOD, out_col=None)
    for frac in (0.28, 0.58, 0.86):
        rx, ry = lerp(bx, nx_p, frac), lerp(by, ny_p, frac)
        put_px(arr, int(round(rx)), int(round(ry)), C_GOLD_LIGHT)
    draw_thick_line(arr, bx - ux * 0.8, by - uy * 0.8, bx + ux * 0.8, by + uy * 0.8, 1.55, C_GOLD_MID, out_col=C_OUT)
    put_px(arr, int(round(bx)), int(round(by)), C_FLAME_GOLD)

    # Re-stamp gloved hand clasp over shaft at grip_pos so fingers cleanly wrap the staff
    if stamp_glove:
        draw_thick_line(
            arr,
            grip_pos[0] - nx * 0.9,
            grip_pos[1] - ny * 0.9,
            grip_pos[0] + nx * 0.9,
            grip_pos[1] + ny * 0.9,
            1.5,
            C_GLOVE_DARK,
            out_col=C_OUT,
        )
        put_px(arr, int(round(grip_pos[0] - ux * 1.2)), int(round(grip_pos[1] - uy * 1.2)), C_GOLD_MID)

    # 2. Ornate Collar Lotus Ferrule at shaft neck
    draw_thick_line(
        arr,
        nx_p - nx * 2.2,
        ny_p - ny * 2.2,
        nx_p + nx * 2.2,
        ny_p + ny * 2.2,
        1.25,
        C_GOLD_MID,
        out_col=C_OUT,
    )
    put_px(arr, int(round(nx_p)), int(round(ny_p)), C_GOLD_SPEC)

    # 3. Curved Golden Crescent-Moon Head (C-shaped cradle opening forward/upward, ZERO spear point!)
    cres_r = 5.4
    cres_cx = clamp(nx_p + ux * (cres_r + 1.1), 8.0, float(LOG_W - 9))
    cres_cy = clamp(ny_p + uy * (cres_r + 1.1), 8.0, float(max_y - 6))

    arc_samples = 34
    # Crescent spans 245 degrees around the back/sides, leaving a 115-degree open cradle at the front (+ux,+uy / +nx)
    open_ang = math.atan2(uy + ny * 0.32, ux + nx * 0.32)
    a_start = open_ang + math.radians(58.0)
    a_end = open_ang + math.radians(302.0)

    # Selout pass for crescent
    for i in range(arc_samples + 1):
        u = i / float(arc_samples)
        ang = lerp(a_start, a_end, u)
        taper = math.sin(u * math.pi)
        thick = 0.75 + 1.05 * taper
        # Offset outer vs inner curve slightly for classic crescent silhouette
        px_f = cres_cx + math.cos(ang) * cres_r - math.cos(open_ang) * (0.55 * taper)
        py_f = cres_cy + math.sin(ang) * cres_r - math.sin(open_ang) * (0.55 * taper)
        ro = thick + 1.0
        ir = int(math.ceil(ro))
        icx, icy = int(round(px_f)), int(round(py_f))
        for dy in range(-ir, ir + 1):
            for dx in range(-ir, ir + 1):
                if dx * dx + dy * dy <= ro * ro + 0.2:
                    put_px_outline_bg(arr, icx + dx, icy + dy, C_OUT)

    # Gold fill pass for crescent
    for i in range(arc_samples + 1):
        u = i / float(arc_samples)
        ang = lerp(a_start, a_end, u)
        taper = math.sin(u * math.pi)
        thick = 0.65 + 0.95 * taper
        px_f = cres_cx + math.cos(ang) * cres_r - math.cos(open_ang) * (0.55 * taper)
        py_f = cres_cy + math.sin(ang) * cres_r - math.sin(open_ang) * (0.55 * taper)
        ir = int(math.ceil(thick))
        icx, icy = int(round(px_f)), int(round(py_f))
        for dy in range(-ir, ir + 1):
            for dx in range(-ir, ir + 1):
                d2 = dx * dx + dy * dy
                if d2 <= thick * thick + 0.2:
                    col = C_GOLD_SPEC if (d2 < 0.45 and 0.22 < u < 0.78) else (C_GOLD_LIGHT if dy <= 0 else C_GOLD_MID)
                    put_px(arr, icx + dx, icy + dy, col)

    # 4. Blazing Miniature Sun Orb cradled inside the Golden Crescent!
    orb_r = 2.3 + 0.85 * blaze
    ir_s = int(math.ceil(orb_r + 1.2))
    iocx, iocy = int(round(cres_cx + math.cos(open_ang) * 0.4)), int(round(cres_cy + math.sin(open_ang) * 0.4))
    for dy in range(-ir_s, ir_s + 1):
        for dx in range(-ir_s, ir_s + 1):
            d = math.hypot(dx, dy)
            if d <= orb_r + 0.95:
                if d > orb_r + 0.15:
                    put_px_outline_bg(arr, iocx + dx, iocy + dy, C_OUT)
                elif d < orb_r * 0.42:
                    put_px(arr, iocx + dx, iocy + dy, C_FLAME_CORE)
                elif d < orb_r * 0.76:
                    put_px(arr, iocx + dx, iocy + dy, C_FLAME_GOLD)
                else:
                    put_px(arr, iocx + dx, iocy + dy, C_FLAME_ORANGE if (dx + dy + int(phase * 12)) % 2 == 0 else C_FLAME_CRIMSON)

    # 4 miniature solar prominence flickers around the sun orb
    for k in range(4):
        ang_p = phase * math.tau + k * (math.pi * 0.5) + 0.4
        pr = orb_r + 1.1 + (0.7 if blaze > 0.6 else 0.0)
        sx = int(round(iocx + math.cos(ang_p) * pr))
        sy = int(round(iocy + math.sin(ang_p) * pr))
        put_px(arr, sx, sy, C_FLAME_GOLD if k % 2 == 0 else C_FLAME_ORANGE)

    return (float(iocx), float(iocy))


def stamp_molten_wizard_eyes_and_gems(arr, l_eye, r_eye, hat_sun, chest_orb, blaze=0.35, phase=0.0):
    """
    Guarantees Ignis Sol EX's pitch-black shadowed face + glowing molten-gold eyes,
    Wizard-Hat Sun Crest, and Collar Sun Gem stay razor-sharp in 160x120 logical space!
    """
    lx, ly = int(round(l_eye[0])), int(round(l_eye[1]))
    rx, ry = int(round(r_eye[0])), int(round(r_eye[1]))

    # Deepen pitch-black shadow directly around both eyes under the hat brim
    for ex_c, ey_c in ((lx, ly), (rx, ry)):
        for oy in range(-2, 3):
            for ox in range(-2, 3):
                px, py = ex_c + ox, ey_c + oy
                if 2 <= px < LOG_W - 2 and 2 <= py < LOG_H - 2 and arr[py, px, 3] > 0:
                    rgb = arr[py, px, :3]
                    luma = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]
                    if luma < 72.0:
                        arr[py, px] = C_VOID_FACE

    # Stamp crisp glowing molten-gold eyes (left eye 2px, right/forward eye 3px angled upward-fierce)
    core_eye = C_FLAME_CORE if blaze >= 0.80 else C_FLAME_GOLD
    put_px(arr, lx, ly, core_eye)
    put_px(arr, lx - 1, ly, C_FLAME_AMBER)

    put_px(arr, rx, ry, core_eye)
    put_px(arr, rx + 1, ry, C_FLAME_GOLD)
    put_px(arr, rx, ry + 1, C_FLAME_ORANGE)

    # Wizard Hat Sun Emblem glint
    hx, hy = int(round(hat_sun[0])), int(round(hat_sun[1]))
    put_px(arr, hx, hy, C_FLAME_CORE if blaze > 0.65 else C_FLAME_GOLD)
    put_px(arr, hx + 1, hy, C_GOLD_LIGHT)
    put_px(arr, hx, hy - 1, C_FLAME_ORANGE)

    # Collar Sun Brooch pulse
    cx_o, cy_o = int(round(chest_orb[0])), int(round(chest_orb[1]))
    put_px(arr, cx_o, cy_o, C_FLAME_CORE if (blaze > 0.5 or int(phase * 30) % 2 == 0) else C_FLAME_GOLD)
    put_px(arr, cx_o + 1, cy_o, C_FLAME_ORANGE)


# ==============================================================================
# 4. PURE HIGH-SORCERY SPELLCASTING FX (`0` MELEE SWORD / HALBERD SLASH CRESCENTS!)
# ==============================================================================
def draw_foreshortened_magic_circle(
    arr,
    cx,
    cy,
    rx,
    ry,
    phase=0.0,
    dissipate=0.0,
    eclipse=False,
    inscribed_points=8,
):
    """
    Crisp 16-bit FFBE / Octopath 3D-foreshortened vertical or ground Solar Rune Magic Circle.
    Uses `4x4` Bayer ordered dithering when `dissipate > 0` (`F04..F05`, etc.).
    """
    c_core = C_FLAME_CORE
    c_ring1 = C_FLAME_GOLD if not eclipse else (245, 208, 254, 255)
    c_ring2 = C_FLAME_ORANGE if not eclipse else C_ECLIPSE_MAGENTA
    c_rune = C_FLAME_CRIMSON if not eclipse else C_ECLIPSE_VIOLET

    # Outer & inner concentric ellipses
    for ring_idx, scale_r in enumerate((1.0, 0.68)):
        rrx = max(2.0, rx * scale_r)
        rry = max(2.0, ry * scale_r)
        steps = max(36, int((rrx + rry) * 2.6))
        for i in range(steps):
            ang = (i / float(steps)) * math.tau
            px = int(round(cx + math.cos(ang) * rrx))
            py = int(round(cy + math.sin(ang) * rry))
            if px < 3 or px >= LOG_W - 3 or py < 3 or py >= LOG_H - 3:
                continue
            if dissipate > 0.0 and BAYER4[py & 3, px & 3] < dissipate:
                continue
            for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                put_px_outline_bg(arr, px + ox, py + oy, C_OUT)
            is_rune_tick = (i + int(phase * 24)) % 4 == 0
            arr[py, px] = c_core if (ring_idx == 0 and is_rune_tick) else (c_ring1 if ring_idx == 0 else c_ring2)

    # Inscribed star-polygon geometry inside the magic circle
    verts = []
    rot = phase * math.tau
    for k in range(inscribed_points):
        ang = rot + k * (math.tau / float(inscribed_points))
        verts.append((cx + math.cos(ang) * rx * 0.92, cy + math.sin(ang) * ry * 0.92))
    step_skip = 3 if inscribed_points >= 8 else 2
    for k in range(inscribed_points):
        v0 = verts[k]
        v1 = verts[(k + step_skip) % inscribed_points]
        steps_l = max(4, int(math.hypot(v1[0] - v0[0], v1[1] - v0[1]) * 1.5))
        for s in range(steps_l + 1):
            t = s / float(steps_l)
            px = int(round(lerp(v0[0], v1[0], t)))
            py = int(round(lerp(v0[1], v1[1], t)))
            if 3 <= px < LOG_W - 3 and 3 <= py < LOG_H - 3:
                if dissipate > 0.0 and BAYER4[py & 3, px & 3] < dissipate + 0.12:
                    continue
                put_px(arr, px, py, c_ring2 if s % 2 == 0 else c_rune)

    # Cardinal 4-point star glints on the circle rim
    if dissipate < 0.45:
        for ang_c in (0.0, math.pi * 0.5, math.pi, math.pi * 1.5):
            gx = cx + math.cos(ang_c + rot * 0.5) * rx
            gy = cy + math.sin(ang_c + rot * 0.5) * ry
            draw_pixel_star4(arr, gx, gy, arm=2, core_col=c_core, ray_col=c_ring1, out_col=C_OUT)


def draw_solar_fireball_jet(arr, x_start, y_center, x_end, half_h=9.0, slope_y=0.0, dissipate=0.0, phase=0.0):
    """
    Horizontal erupting Solar Fireball / Corona Bolt burst (`x_320 = 185..298` -> `x_log = 92..149`).
    Pure high-sorcery projectile cone + blazing comet star-head (ZERO sword slash!).
    """
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
        # Bulges into a round blazing fireball head near u = 0.78..0.96, tapered tail at circle
        head_bulge = 1.32 * math.exp(-((u - 0.80) ** 2) / 0.035)
        wake_prof = math.sin(math.pi * clamp(u * 0.92 + 0.08, 0.0, 1.0)) * 0.72
        flame_tongue = 0.18 * math.sin(u * 26.0 - phase * math.tau * 3.0)
        hh = max(1.2, half_h * max(wake_prof + flame_tongue, head_bulge))
        ihh = int(math.ceil(hh)) + 1
        for dy in range(-ihh, ihh + 1):
            py = int(round(cy_loc + dy))
            if py < 4 or py >= LOG_H - 4:
                continue
            v = abs(dy) / max(0.8, hh)
            if v > 1.0:
                continue
            bayer = BAYER4[py & 3, px & 3]
            if dissipate > 0.0 and bayer < dissipate * (0.75 + 0.45 * v):
                continue
            if u < 0.16 and bayer > (u / 0.16) * 1.15:
                continue
            mask[py, px] = True
            if v < 0.30 or (0.72 <= u <= 0.90 and v < 0.46):
                col[py, px] = C_FLAME_CORE
            elif v < 0.58:
                col[py, px] = C_FLAME_GOLD
            elif v < 0.84:
                col[py, px] = C_FLAME_ORANGE
            else:
                col[py, px] = C_FLAME_CRIMSON

    for py in range(3, LOG_H - 3):
        for px in range(max(3, ix0 - 1), min(LOG_W - 3, ix1 + 2)):
            if mask[py, px]:
                arr[py, px] = col[py, px]
            elif arr[py, px, 3] == 0:
                for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if mask[py + oy, px + ox]:
                        arr[py, px] = C_OUT
                        break

    if dissipate < 0.40:
        hx = lerp(ix0, ix1, 0.84)
        hy = y_center + slope_y * 0.84
        draw_pixel_star4(arr, hx, hy, arm=4, core_col=C_FLAME_CORE, ray_col=C_FLAME_GOLD, out_col=C_OUT)


def draw_solar_prominence_column(arr, x_center, y_top=12, y_floor=114, half_w=13.5, dissipate=0.0, phase=0.0):
    """Ground-to-sky braided Solar Prominence Column + ground Helios Sanctum Seal (`V2 F17` & `SKILL`)."""
    # Foreshortened ground rune seal at column base
    draw_foreshortened_magic_circle(
        arr,
        cx=x_center,
        cy=y_floor - 3.0,
        rx=min(22.0, float(LOG_W - 6 - x_center)),
        ry=4.5,
        phase=phase,
        dissipate=dissipate * 0.8,
        inscribed_points=6,
    )

    icx = int(round(x_center))
    mask = np.zeros((LOG_H, LOG_W), dtype=bool)
    col = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)
    span_y = max(1.0, float(y_floor - y_top))

    for py in range(max(4, int(y_top)), min(LOG_H - 3, int(y_floor) + 1)):
        h_frac = (y_floor - py) / span_y
        base_flare = 1.30 if h_frac < 0.12 else (1.0 - 0.30 * h_frac)
        braid = 1.8 * math.sin(h_frac * 15.0 - phase * math.tau * 2.0)
        lw = max(2.0, half_w * base_flare + abs(braid) * 0.65)
        ilw = int(math.ceil(lw)) + 2
        for dx in range(-ilw, ilw + 1):
            px = icx + int(round(dx + braid * 0.35))
            if px < 4 or px >= LOG_W - 4:
                continue
            af = abs(dx) / max(0.9, lw)
            if af > 1.0:
                continue
            bayer = BAYER4[py & 3, px & 3]
            if dissipate > 0.0 and bayer < dissipate * (0.72 + 0.45 * af):
                continue
            if h_frac > 0.84 and bayer > (1.0 - h_frac) * 6.0:
                continue
            mask[py, px] = True
            if af < 0.28:
                col[py, px] = C_FLAME_CORE
            elif af < 0.56:
                col[py, px] = C_FLAME_GOLD
            elif af < 0.82:
                col[py, px] = C_FLAME_ORANGE
            else:
                col[py, px] = C_FLAME_CRIMSON

    for py in range(3, LOG_H - 3):
        for px in range(max(3, icx - 24), min(LOG_W - 3, icx + 25)):
            if mask[py, px]:
                arr[py, px] = col[py, px]
            elif arr[py, px, 3] == 0:
                for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if mask[py + oy, px + ox]:
                        arr[py, px] = C_OUT
                        break


def draw_meteoric_fire_orb_array(arr, centers_and_radii, dissipate=0.0, phase=0.0):
    """Sculpts crisp 16-bit molten-crust Meteoric Fire-Orbs (`V3 F25` & `ULTIMATE`)."""
    for idx, (cx, cy, rad) in enumerate(centers_and_radii):
        icx, icy = int(round(cx)), int(round(cy))
        ir = int(math.ceil(rad + 2.5))
        # Trailing flame tail to the left (-X)
        tail_len = int(round(rad * 2.4))
        for tx in range(1, tail_len + 1):
            u = tx / float(tail_len)
            th = max(1.0, rad * (1.0 - u * 0.82))
            ith = int(math.ceil(th))
            px = icx - tx
            if px < 4 or px >= LOG_W - 4:
                continue
            for dy in range(-ith, ith + 1):
                py = icy + dy
                if py < 4 or py >= LOG_H - 4:
                    continue
                bayer = BAYER4[py & 3, px & 3]
                if bayer < dissipate + u * 0.55:
                    continue
                af = abs(dy) / max(0.8, th)
                put_px(arr, px, py, C_FLAME_GOLD if af < 0.35 else (C_FLAME_ORANGE if af < 0.72 else C_FLAME_CRIMSON))

        # Spherical Voronoi-cracked meteor core
        for dy in range(-ir, ir + 1):
            for dx in range(-ir, ir + 1):
                px, py = icx + dx, icy + dy
                if px < 4 or px >= LOG_W - 4 or py < 4 or py >= LOG_H - 4:
                    continue
                d = math.hypot(dx, dy)
                if d > rad + 1.0:
                    continue
                if dissipate > 0.0 and BAYER4[py & 3, px & 3] < dissipate * 0.85:
                    continue
                if d > rad:
                    put_px_outline_bg(arr, px, py, C_OUT)
                elif d < rad * 0.38:
                    put_px(arr, px, py, C_FLAME_CORE)
                elif d < rad * 0.68:
                    put_px(arr, px, py, C_FLAME_GOLD)
                else:
                    is_crust = ((dx * 3 + dy * 5 + idx * 2) % 7) == 0
                    put_px(arr, px, py, C_OBSIDIAN_CRUST if is_crust else C_FLAME_CRIMSON)

        if dissipate < 0.35:
            draw_pixel_star4(arr, icx + rad * 0.35, icy - rad * 0.25, arm=2, core_col=C_FLAME_CORE, ray_col=C_FLAME_GOLD)


def draw_spell_cast_fx(arr, fx_spec, phase=0.0):
    """Dispatches pure high-sorcery casting FX onto `arr` (`0` melee sword crescents!)."""
    if fx_spec is None:
        return
    kind = fx_spec["kind"]
    diss = fx_spec.get("dissipate", 0.0)

    if kind == "v0_solar_circle_jet":
        # V0: 3D foreshortened vertical Golden Solar Rune Magic Circle + erupting Solar Fireball muzzle flare (x_320 = 185..298 -> x_log = 93..149)
        draw_foreshortened_magic_circle(
            arr, cx=102.0, cy=66.0, rx=9.5, ry=27.0, phase=phase, dissipate=diss, inscribed_points=8
        )
        draw_solar_fireball_jet(
            arr,
            x_start=102.0,
            y_center=66.0,
            x_end=fx_spec.get("x_end", 149.0),
            half_h=fx_spec.get("half_h", 9.5),
            slope_y=0.0,
            dissipate=diss,
            phase=phase,
        )

    elif kind == "v1_twin_helios_sigils":
        # V1: Twin concentric Helios Sun-Sigils + twin Solar Corona Bolt bursts (x_320 = 185..296 -> x_log = 93..148)
        x_end = fx_spec.get("x_end", 148.0)
        draw_foreshortened_magic_circle(
            arr, cx=100.0, cy=48.0, rx=7.5, ry=17.0, phase=phase, dissipate=diss, inscribed_points=6
        )
        draw_foreshortened_magic_circle(
            arr, cx=105.0, cy=82.0, rx=7.5, ry=17.0, phase=-phase, dissipate=diss, inscribed_points=6
        )
        draw_solar_fireball_jet(
            arr, x_start=101.0, y_center=48.0, x_end=x_end, half_h=6.5, slope_y=8.0, dissipate=diss, phase=phase
        )
        draw_solar_fireball_jet(
            arr, x_start=106.0, y_center=82.0, x_end=x_end - 2.0, half_h=6.5, slope_y=-8.0, dissipate=diss, phase=phase + 0.3
        )

    elif kind == "v2_eclipse_prominence":
        # V2: Radiant Astrolabe Eclipse Glyph + ground-to-sky Solar Prominence Column (x_320 = 190..304 -> x_log = 95..152)
        draw_foreshortened_magic_circle(
            arr, cx=108.0, cy=42.0, rx=13.0, ry=13.0, phase=phase, dissipate=diss, eclipse=True, inscribed_points=8
        )
        # Black-sun core inside overhead Eclipse Glyph
        if diss < 0.55:
            for dy in range(-4, 5):
                for dx in range(-4, 5):
                    if dx * dx + dy * dy <= 18:
                        put_px(arr, 108 + dx, 42 + dy, C_ECLIPSE_VOID if dx * dx + dy * dy <= 10 else C_FLAME_GOLD)
        draw_solar_prominence_column(
            arr,
            x_center=fx_spec.get("col_x", 136.0),
            y_top=fx_spec.get("y_top", 12),
            y_floor=114,
            half_w=fx_spec.get("half_w", 14.0),
            dissipate=diss,
            phase=phase,
        )

    elif kind == "v3_suncrest_meteor_array":
        # V3: Colossal Blazing Sun-Crest Seal & Triple Meteoric Fire-Orb Array (x_320 = 192..308 -> x_log = 96..154)
        draw_foreshortened_magic_circle(
            arr, cx=108.0, cy=62.0, rx=12.0, ry=35.0, phase=phase, dissipate=diss, inscribed_points=8
        )
        shift = fx_spec.get("orb_shift", 0.0)
        orbs = [
            (min(151.0, 134.0 + shift), 36.0, 6.2),
            (min(153.0, 146.0 + shift), 63.0, 7.2),
            (min(150.0, 132.0 + shift), 90.0, 6.0),
        ]
        draw_meteoric_fire_orb_array(arr, orbs, dissipate=diss, phase=phase)


# ==============================================================================
# 5. DYNAMIC WIZARD COMPOSITOR + CAPE / HAT EMBER SECONDARY MOTION
# ==============================================================================
def add_wizard_robe_and_ember_motion(arr, dx_body, dy_body, phase, blaze=0.35):
    """Adds subtle 30fps living solar rune motes & cape-hem breeze."""
    for k in range(3):
        ang = phase * math.tau + k * 2.1
        ex = int(round(AX + dx_body - 6 + math.sin(ang) * 11.0 + k * 4.0))
        ey = int(round(36 + dy_body - ((phase * 14.0 + k * 4.5) % 10.0)))
        if 4 <= ex < LOG_W - 4 and 4 <= ey < LOG_H - 4:
            put_px(arr, ex, ey, C_FLAME_CORE if (k == 0 and blaze > 0.55) else C_FLAME_GOLD)
            if blaze > 0.50:
                put_px(arr, ex, ey + 1, C_FLAME_ORANGE)


def enforce_safety_margin(arr):
    """Guarantees 0/300 border clips (`2px` logical = `4px` output safety margin) & binary alpha."""
    arr[:2, :, :] = 0
    arr[LOG_H - 2 :, :, :] = 0
    arr[:, :2, :] = 0
    arr[:, LOG_W - 2 :, :] = 0
    arr[:, :, 3] = np.where(arr[:, :, 3] >= 128, 255, 0)
    trans = arr[:, :, 3] == 0
    arr[trans, :3] = 0


def draw_filled_poly(arr, pts, fill_col, out_col=C_OUT, max_y=115):
    """Rasterizes a crisp integer-pixel polygon with 1px Selout outline onto `arr`."""
    mask_im = Image.new("L", (LOG_W, LOG_H), 0)
    ImageDraw.Draw(mask_im).polygon([(float(x), float(y)) for x, y in pts], fill=255)
    m = np.array(mask_im) > 127
    if max_y < LOG_H - 1:
        m[max_y + 1 :, :] = False
    m[:2, :] = False
    m[:, :2] = False
    m[:, LOG_W - 2 :] = False
    ys, xs = np.where(m)
    if len(ys) == 0:
        return
    if out_col is not None:
        y0, y1 = max(2, int(ys.min()) - 1), min(max_y, int(ys.max()) + 1)
        x0, x1 = max(2, int(xs.min()) - 1), min(LOG_W - 3, int(xs.max()) + 1)
        for py in range(y0, y1 + 1):
            for px in range(x0, x1 + 1):
                if not m[py, px] and arr[py, px, 3] == 0:
                    if (
                        (py > 0 and m[py - 1, px])
                        or (py + 1 < LOG_H and m[py + 1, px])
                        or (px > 0 and m[py, px - 1])
                        or (px + 1 < LOG_W and m[py, px + 1])
                    ):
                        arr[py, px] = out_col
    arr[m] = fill_col


def solve_2bone_ik_512(sh, target, l1, l2, bend_sign=-1.0):
    dx = target[0] - sh[0]
    dy = target[1] - sh[1]
    d = math.hypot(dx, dy)
    max_reach = l1 + l2 - 0.5
    if d > max_reach and d > 1e-4:
        dx *= max_reach / d
        dy *= max_reach / d
        target = (sh[0] + dx, sh[1] + dy)
        d = max_reach
    d = max(4.0, d)
    cos_a = clamp((l1 * l1 + d * d - l2 * l2) / (2.0 * l1 * d), -1.0, 1.0)
    ang_base = math.atan2(dy, dx)
    ang_off = math.acos(cos_a) * bend_sign
    el = (sh[0] + math.cos(ang_base + ang_off) * l1, sh[1] + math.sin(ang_base + ang_off) * l1)
    return el, target


def solve_mage_leg_gait_512(u, hip_x, hip_y=328.0, stride_512=66.0, lift_512=32.0):
    u = u % 1.0
    if u <= 0.50:
        st = u / 0.50
        ank_x = lerp(hip_x + stride_512, hip_x - stride_512, st)
        swing_lift = 0.0
        ank_y = 463.0
        boot_fwd_deg = lerp(8.0, -10.0, st)
    else:
        sw = (u - 0.50) / 0.50
        sw_ease = smoothstep(sw)
        ank_x = lerp(hip_x - stride_512, hip_x + stride_512, sw_ease)
        swing_lift = math.sin(sw * math.pi)
        ank_y = 463.0 - lift_512 * swing_lift
        boot_fwd_deg = -18.0 * swing_lift + 8.0 * (sw ** 2)

    knee, ank = solve_2bone_ik_512((hip_x, hip_y), (ank_x, ank_y), l1=70.0, l2=74.0, bend_sign=-1.0)
    return {
        "hip": (hip_x, hip_y),
        "knee": knee,
        "ank": ank,
        "boot_fwd_deg": boot_fwd_deg,
        "swing_lift": swing_lift,
    }


def draw_mage_breeches_and_boot_512(win_512, rig, leg, is_front=True):
    """
    Sculpts full-volume (`27..31px` @ 512 = `5.2..6.0` logical px wide) 3-tone cel-shaded Archmage
    breeches + flared crimson-gold boot cuff + Ignis Sol EX's REAL painted `+X` gold-buckled
    crimson-obsidian boot (`#0a0e1c` Selout, zero thin stick lines!).
    """
    d = ImageDraw.Draw(win_512)
    piv = rig["pivots"]
    hip = leg["hip"]
    knee = leg["knee"]
    ank = leg["ank"]

    c_sel = (10, 14, 28, 255)
    c_shd = (28, 20, 42, 255) if is_front else (18, 12, 26, 255)
    c_mid = (64, 46, 88, 255) if is_front else (36, 26, 52, 255)
    c_lit = (114, 86, 142, 255) if is_front else (62, 46, 84, 255)
    c_crim = (166, 34, 38, 255) if is_front else (98, 20, 24, 255)
    c_gold = (250, 204, 56, 255) if is_front else (186, 122, 28, 255)

    # Full-volume 3-tone cel-shaded thigh breeches (`30px` @ 512 = `5.8` logical px wide!)
    d.line([hip, knee], fill=c_sel, width=32)
    d.line([hip, knee], fill=c_shd, width=26)
    d.line([(hip[0] + 2, hip[1]), (knee[0] + 2, knee[1])], fill=c_mid, width=18)
    d.line([(hip[0] + 5, hip[1]), (knee[0] + 5, knee[1])], fill=c_lit, width=7)

    # Full-volume 3-tone cel-shaded calf breeches (`26px` @ 512 = `5.0` logical px wide!)
    d.line([knee, ank], fill=c_sel, width=28)
    d.line([knee, ank], fill=c_shd, width=22)
    d.line([(knee[0] + 2, knee[1]), (ank[0] + 2, ank[1])], fill=c_mid, width=15)
    d.line([(knee[0] + 4, knee[1]), (ank[0] + 4, ank[1])], fill=c_lit, width=6)

    # Sculpted crimson-gold knee-guard
    kx, ky = int(round(knee[0])), int(round(knee[1]))
    d.ellipse([kx - 14, ky - 12, kx + 15, ky + 12], outline=c_sel, fill=c_crim, width=3)
    d.arc([kx - 12, ky - 10, kx + 13, ky + 10], start=260, end=80, fill=c_gold, width=4)

    # Flared crimson-and-gold archmage boot cuff (`31px` @ 512 = `6.0` logical px wide!)
    ax_i, ay_i = int(round(ank[0])), int(round(ank[1]))
    cuff_poly = [
        (ax_i - 15, ay_i - 16),
        (ax_i + 16, ay_i - 15),
        (ax_i + 13, ay_i + 1),
        (ax_i - 12, ay_i + 1),
    ]
    d.polygon(cuff_poly, fill=c_crim, outline=c_sel)
    d.line([(ax_i - 14, ay_i - 14), (ax_i + 15, ay_i - 13)], fill=c_gold, width=5)

    # Paste Ignis Sol EX's REAL painted `+X` gold-buckled crimson-obsidian boot!
    bt_part = rig["boot_near"] if is_front else rig["boot_far"]
    paste_rotated_part_512(
        win_512,
        bt_part,
        piv["boot_ank"],
        ank,
        deg=(-leg["boot_fwd_deg"]),
        squash_x=0.88,
        squash_y=1.0,
    )


def render_mage_walk_body_log(pd, f_idx, dx_body, dy_body, phase):
    """
    Composes Ignis Sol EX's `Row 1 WALK` (`F00..F29`) in 512x512 from his REAL painted robes & boots:
      - Flowing crimson-gold robe flanks & cape tapering organically down to `y_log ~ 107..110` on outer edges
      - Arched inverted-V front opening (`0` flat horizontal guillotine cut across `y = 100`!)
      - Full-volume (`5.0..6.0` logical px wide) 3-tone cel-shaded archmage breeches, flared crimson-gold boot cuffs, & gold-buckled boots (`#0a0e1c` Selout)!
    """
    rig = pd["walk_rig_512"]
    piv = rig["pivots"]
    scale = rig["scale"]

    win_512 = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    d512 = ImageDraw.Draw(win_512)

    bob_512 = dy_body / scale
    u_l = (f_idx / 30.0) % 1.0
    u_r = (u_l + 0.5) % 1.0
    leg_l = solve_mage_leg_gait_512(u_l, 255.0, hip_y=328.0 + bob_512, stride_512=66.0, lift_512=30.0)
    leg_r = solve_mage_leg_gait_512(u_r, 261.0, hip_y=328.0 + bob_512, stride_512=66.0, lift_512=30.0)

    stride_open = abs(math.cos(phase * math.tau))
    sway = math.sin(phase * math.tau)
    s_wave = math.sin(phase * math.tau * 2.0 - 0.5) * 1.6

    # 1. Arched deep obsidian-crimson inner robe shadow behind upper thighs (`0` horizontal line!)
    arch_pts = []
    for i in range(13):
        ut = i / 12.0
        ax_p = lerp(208.0 - 10.0 * stride_open, 314.0 + 10.0 * stride_open, ut)
        arch_lift = math.sin(ut * math.pi)
        ay_p = lerp(402.0 + bob_512, 342.0 + bob_512, arch_lift ** 1.15)
        arch_pts.append((ax_p, ay_p))
    d512.polygon([(214.0, 316.0 + bob_512), (308.0, 316.0 + bob_512)] + list(reversed(arch_pts)), fill=(20, 10, 22, 255), outline=(10, 14, 28, 255))

    # 2. Flowing crimson-gold back cape & left ornate robe flank (`y_log ~ 107..110` on outer left edge!)
    cape_deg = lerp(-35.5, 3.0, stride_open) + s_wave
    paste_rotated_part_512(
        win_512,
        rig["back_cape"],
        piv["cape"],
        (188.0, 304.0 + bob_512),
        deg=cape_deg,
        squash_y=0.96,
        wave_phase=phase * math.tau * 2.0,
        wave_amp=3.6,
    )

    l_robe_deg = lerp(-27.0, 3.0, stride_open) + s_wave * 0.6
    paste_rotated_part_512(
        win_512,
        rig["l_robe"],
        piv["l_robe"],
        (218.0, 318.0 + bob_512),
        deg=l_robe_deg,
        squash_y=0.98,
        wave_phase=phase * math.tau * 2.0 + 0.4,
        wave_amp=3.0,
    )

    # 3. Full-volume 3-tone cel-shaded archmage breeches + flared cuffs + gold-buckled boots!
    if leg_l["swing_lift"] > leg_r["swing_lift"] + 0.05:
        draw_mage_breeches_and_boot_512(win_512, rig, leg_r, is_front=False)
        draw_mage_breeches_and_boot_512(win_512, rig, leg_l, is_front=True)
    else:
        draw_mage_breeches_and_boot_512(win_512, rig, leg_l, is_front=False)
        draw_mage_breeches_and_boot_512(win_512, rig, leg_r, is_front=True)

    # 4. Ornate gold-trimmed crimson right robe flank (`y_log ~ 107..110` on outer right edge!)
    r_robe_deg = lerp(26.5, -10.5, stride_open) - s_wave * 0.6
    paste_rotated_part_512(
        win_512,
        rig["r_robe"],
        piv["r_robe"],
        (306.0, 318.0 + bob_512),
        deg=r_robe_deg,
        squash_y=0.98,
        wave_phase=phase * math.tau * 2.0 + 1.1,
        wave_amp=3.0,
    )

    # 5. Real painted central 8-Ray Sun-Emblem obsidian stole with pointed diamond gold tip (`0` flat cut!)
    stole_deg = -2.0 + sway * 4.5
    paste_rotated_part_512(
        win_512,
        rig["central_stole"],
        piv["stole"],
        (277.0, 320.0 + bob_512),
        deg=stole_deg,
        squash_y=0.78,
        wave_phase=phase * math.tau * 2.0 + 0.7,
        wave_amp=2.6,
    )

    # 6. Classic pointed Wizard Hat, shadowed face, collar, pauldrons, gauntlets, & belt (`+3.2 deg` lean!)
    lean_deg = 3.2 + math.sin(phase * math.tau * 2.0) * 0.4
    pelvis_dst = (piv["pelvis"][0], piv["pelvis"][1] + bob_512)
    paste_rotated_part_512(
        win_512,
        rig["upper_torso"],
        piv["pelvis"],
        pelvis_dst,
        deg=lean_deg,
    )

    body_log, ox_w, oy_w = scale_pose_to_logical(
        win_512,
        rig["x_ref"] - dx_body / scale,
        rig["y_bot"],
        scale,
    )
    b_arr = np.array(body_log)
    b_arr[116:, :, :] = 0
    shift_y = 0

    # Reinforce crisp `#0a0e1c` Selout outline along lower breeches & boots (`y >= 84`)
    fg_b = b_arr[:, :, 3] > 128
    for py in range(84, 116):
        for px in range(3, LOG_W - 3):
            if fg_b[py, px]:
                if not (fg_b[py - 1, px] and fg_b[py + 1, px] and fg_b[py, px - 1] and fg_b[py, px + 1]):
                    rgb = b_arr[py, px, :3]
                    lum = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]
                    if lum < 135.0:
                        b_arr[py, px] = (10, 14, 28, 255)

    def map_lean_pt(pt512):
        rp = rot_pt_2d(pt512, piv["pelvis"], lean_deg)
        return (ox_w + rp[0] * scale, oy_w + (rp[1] + bob_512) * scale + shift_y)

    tracked = {
        "l_eye": map_lean_pt(pd["l_eye_512"]),
        "r_eye": map_lean_pt(pd["r_eye_512"]),
        "hat_sun": map_lean_pt(pd["hat_sun_512"]),
        "chest_orb": map_lean_pt(pd["chest_orb_512"]),
        "grip": map_lean_pt(pd["grip_512"]),
    }
    return Image.fromarray(b_arr), tracked


def compose_mage_frame(
    poses,
    pose_key="STAND",
    dx=0.0,
    dy=0.0,
    staff_deg=-72.0,
    grip_delta=(0.0, 0.0),
    butt_len=14.0,
    shaft_len=24.0,
    blaze=0.35,
    halo_flare=0.0,
    eclipse_halo=False,
    phase=0.0,
    fx_spec=None,
    ground_ring_rx=0.0,
    walk_frame_idx=None,
    offhand_orb=False,
):
    fx_behind = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)

    pd = poses[pose_key]
    body_im = pd["sprite"]

    halo_pt = (pd["halo_anchor"][0] + dx, pd["halo_anchor"][1] + dy)
    grip_pt = (pd["grip"][0] + dx + grip_delta[0], pd["grip"][1] + dy + grip_delta[1])
    off_pt = (pd["offhand"][0] + dx, pd["offhand"][1] + dy)
    l_eye = (pd["l_eye"][0] + dx, pd["l_eye"][1] + dy)
    r_eye = (pd["r_eye"][0] + dx, pd["r_eye"][1] + dy)
    hat_sun = (pd["hat_sun"][0] + dx, pd["hat_sun"][1] + dy)
    chest_orb = (pd["chest_orb"][0] + dx, pd["chest_orb"][1] + dy)

    # 1. Optional ground arcane ward ring (back half)
    if ground_ring_rx > 1.0:
        draw_foreshortened_magic_circle(
            fx_behind,
            cx=AX + dx + 2.0,
            cy=min(113.0, 108.0 + max(0.0, dy)),
            rx=ground_ring_rx,
            ry=4.8,
            phase=phase,
            eclipse=eclipse_halo,
            inscribed_points=6,
        )

    char_arr = np.zeros((LOG_H, LOG_W, 4), dtype=np.uint8)
    # 2. Floating Back Solar Astrolabe Halo behind Ignis Sol EX's shoulders
    draw_solar_astrolabe_halo(
        char_arr,
        cx=halo_pt[0] - 3.0,
        cy=halo_pt[1] - 2.0,
        phase=phase,
        radius=15.0,
        flare=halo_flare,
        eclipse=eclipse_halo,
    )

    # 3. Composite Wizard body sprite (full 512x512 articulated robe & boot crossover rig on WALK!)
    bx, by = int(round(dx)), int(round(dy))
    if walk_frame_idx is not None and pose_key == "STAND":
        walk_body_im, tracked = render_mage_walk_body_log(pd, walk_frame_idx, dx, by, phase)
        body_layer = Image.fromarray(char_arr)
        body_layer.alpha_composite(walk_body_im, (0, 0))
        char_arr = np.array(body_layer)
        l_eye = tracked["l_eye"]
        r_eye = tracked["r_eye"]
        hat_sun = tracked["hat_sun"]
        chest_orb = tracked["chest_orb"]
        grip_pt = (tracked["grip"][0] + grip_delta[0], tracked["grip"][1] + grip_delta[1])
    else:
        body_layer = Image.fromarray(char_arr)
        body_layer.alpha_composite(body_im, (bx, by))
        char_arr = np.array(body_layer)

    # 4. Crisp glowing molten-gold eyes under pitch-black hat brim + sun emblems
    stamp_molten_wizard_eyes_and_gems(char_arr, l_eye, r_eye, hat_sun, chest_orb, blaze=blaze, phase=phase)

    # 5. Ornate Golden Crescent-Sun Archmage Staff (`0` spear/halberd blades!)
    draw_crescent_sun_staff(
        char_arr,
        grip_pos=grip_pt,
        angle_deg=staff_deg,
        butt_len=butt_len,
        shaft_len=shaft_len,
        blaze=blaze,
        phase=phase,
        stamp_glove=True,
        max_y=114,
    )

    char_arr = seal_160_char_pinholes_and_leaks(
        char_arr,
        max_pinhole_lpx=8,
        min_detached_lpx=4,
        max_orphan_lpx=20,
        orphan_dist_lpx=4.0,
        bridge_max_lpx=48,
        bridge_gap_lpx=2.0,
    )
    arr = fx_behind
    c_mask = char_arr[:, :, 3] > 128
    arr[c_mask] = char_arr[c_mask]

    add_wizard_robe_and_ember_motion(arr, dx, dy, phase, blaze=blaze)

    # Optional offhand arcane sun-mote during grand two-hand invocations
    if offhand_orb:
        draw_pixel_star4(arr, off_pt[0], off_pt[1] - 3.0, arm=3, core_col=C_FLAME_CORE, ray_col=C_FLAME_GOLD, out_col=C_OUT)

    # 6. Pure High-Sorcery Spellcasting FX in front space (`x_320 = 185..308`)
    draw_spell_cast_fx(arr, fx_spec, phase=phase)

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
            compose_mage_frame(
                poses,
                pose_key="STAND",
                dx=0.0,
                dy=round(bob * 0.9),
                staff_deg=-73.0 + math.sin(ph * math.tau + 0.5) * 3.2,
                butt_len=13.0,
                shaft_len=25.0,
                blaze=0.38 + 0.14 * math.sin(ph * math.tau * 2.0),
                halo_flare=0.12 + 0.08 * math.sin(ph * math.tau),
                phase=ph,
            )
        )
    return frames


def build_row_1_walk(poses):
    """
    Row 1 WALK: True 30fps Human Bipedal Crossover Battle-Mage Stride!
      - Centered hip sockets around `AX = 56` (`0%` crab straddle, `0%` skating!)
      - `F00`: Left boot heel-strikes forward (`AX + 12`), Right boot toes-off behind (`AX - 12`) -> `footSpan320 >= 50px`
      - `F07`: Right swing knee bends & lifts boot `11px` off floor, crossing directly over planted Left leg at `AX` -> `footSpan320 <= 18px`
      - `F15`: Right boot heel-strikes forward (`AX + 12`), Left boot toes-off behind (`AX - 12`) -> `footSpan320 >= 50px`
      - `F22`: Left swing knee bends & lifts boot `11px` off floor, crossing directly over planted Right leg at `AX` -> `footSpan320 <= 18px`
      - `2px` double-step head/torso walk cadence + natural staff counter-sway + dynamic parting crimson-gold robe panels!
    """
    frames = []
    for f in range(30):
        ph = f / 30.0
        # Double-step walk bob: slightly lower at contact peaks (F00, F15), +2px lift at passing crossovers (F07, F22)
        bob = round(0.85 * math.cos(ph * math.tau * 2.0))
        c_step = math.cos(ph * math.tau)
        frames.append(
            compose_mage_frame(
                poses,
                pose_key="STAND",
                dx=round(math.sin(ph * math.tau) * 0.7),
                dy=bob,
                staff_deg=-67.0 - c_step * 6.5,
                grip_delta=(-c_step * 1.4, abs(c_step) * 0.5),
                butt_len=13.0,
                shaft_len=25.0,
                blaze=0.44 + 0.12 * math.sin(ph * math.tau * 2.0),
                halo_flare=0.18 + 0.08 * math.sin(ph * math.tau * 2.0),
                phase=ph,
                walk_frame_idx=f,
            )
        )
    return frames


def build_row_2_auto_attack(poses):
    """
    PURE MAGE SPELLCASTING Row 2 (`[[60,8],[68,7],[75,8],[83,7]]`, `0` melee slash crescents!):
      - V0 (F00..F07): K1 coil -> F03 K2 forward staff-projection conjuring 3D Golden Solar Rune Magic Circle + Solar Fireball flare!
      - V1 (F08..F14): Sweeping Arcane Invocation -> F09 twin concentric Helios Sun-Sigils + twin Solar Corona Bolt bursts!
      - V2 (F15..F22): K3 grand two-arm raised invocation -> F17 Astrolabe Eclipse Glyph & ground-to-sky Solar Prominence Column!
      - V3 (F23..F29): K4 levitating arcane-hover cast -> F25 Colossal Blazing Sun-Crest Seal & Triple Meteoric Fire-Orb Array!
    """
    frames = []
    for f in range(30):
        ph = f / 30.0
        # --- V0 (F00..F07): Solar Rune Magic Circle + Solar Fireball Muzzle Flare ---
        if f in (0, 1, 2):
            t = f / 2.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K1_COIL",
                    dx=lerp(-1.0, -3.5, t),
                    dy=0.0,
                    staff_deg=lerp(-66.0, -48.0, t),
                    butt_len=13.0,
                    shaft_len=24.0,
                    blaze=0.55 + 0.35 * t,
                    halo_flare=0.35 + 0.35 * t,
                    phase=ph,
                )
            )
        elif f == 3:
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K2_CAST",
                    dx=6.0,
                    dy=0.0,
                    staff_deg=-6.0,
                    butt_len=12.0,
                    shaft_len=22.0,
                    blaze=1.0,
                    halo_flare=0.95,
                    phase=ph,
                )
            )
        elif f in (4, 5):
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K2_CAST",
                    dx=6.5 if f == 4 else 5.0,
                    dy=0.0,
                    staff_deg=-4.0 if f == 4 else -10.0,
                    butt_len=12.0,
                    shaft_len=22.0,
                    blaze=0.88 if f == 4 else 0.70,
                    halo_flare=0.70 if f == 4 else 0.45,
                    phase=ph,
                )
            )
        elif f in (6, 7):
            t = f - 6
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K1_COIL",
                    dx=lerp(3.0, 0.5, t),
                    dy=0.0,
                    staff_deg=lerp(-28.0, -44.0, t),
                    butt_len=13.0,
                    shaft_len=23.5,
                    blaze=0.55,
                    halo_flare=0.35,
                    phase=ph,
                )
            )

        # --- V1 (F08..F14): Twin Concentric Helios Sun-Sigils + Twin Solar Corona Bolts ---
        elif f == 8:
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K1_COIL",
                    dx=-1.5,
                    dy=0.0,
                    staff_deg=-52.0,
                    butt_len=13.0,
                    shaft_len=24.0,
                    blaze=0.80,
                    halo_flare=0.60,
                    phase=ph,
                )
            )
        elif f == 9:
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K2_CAST",
                    dx=5.5,
                    dy=0.0,
                    staff_deg=-12.0,
                    butt_len=12.0,
                    shaft_len=22.0,
                    blaze=1.0,
                    halo_flare=1.0,
                    phase=ph,
                )
            )
        elif f in (10, 11):
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K2_CAST",
                    dx=5.5 if f == 10 else 4.0,
                    dy=0.0,
                    staff_deg=-15.0 if f == 10 else -24.0,
                    butt_len=12.0,
                    shaft_len=22.0,
                    blaze=0.85 if f == 10 else 0.65,
                    halo_flare=0.72 if f == 10 else 0.45,
                    phase=ph,
                )
            )
        elif f in (12, 13, 14):
            t = (f - 12) / 2.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K1_COIL",
                    dx=lerp(2.5, -2.0, t),
                    dy=0.0,
                    staff_deg=lerp(-34.0, -58.0, t),
                    butt_len=13.0,
                    shaft_len=24.0,
                    blaze=0.55 + 0.20 * t,
                    halo_flare=0.40 + 0.25 * t,
                    phase=ph,
                )
            )

        # --- V2 (F15..F22): K3 Grand Two-Arm Invocation -> Astrolabe Eclipse Glyph & Solar Prominence Column ---
        elif f in (15, 16):
            t = f - 15
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K1_COIL" if f == 15 else "K3_INVOKE",
                    dx=-1.0 + t * 2.0,
                    dy=0.0,
                    staff_deg=-50.0 if f == 15 else 18.0,
                    butt_len=9.0 if f == 16 else 13.0,
                    shaft_len=22.0,
                    blaze=0.82 + 0.12 * t,
                    halo_flare=0.78,
                    eclipse_halo=(f == 16),
                    phase=ph,
                    offhand_orb=(f == 16),
                )
            )
        elif f == 17:
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K3_INVOKE",
                    dx=3.0,
                    dy=0.0,
                    staff_deg=14.0,
                    butt_len=9.0,
                    shaft_len=22.0,
                    blaze=1.0,
                    halo_flare=1.0,
                    eclipse_halo=True,
                    phase=ph,
                    offhand_orb=True,
                )
            )
        elif f in (18, 19):
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K3_INVOKE",
                    dx=3.0 if f == 18 else 2.0,
                    dy=0.0,
                    staff_deg=16.0 if f == 18 else 20.0,
                    butt_len=9.0,
                    shaft_len=22.0,
                    blaze=0.88 if f == 18 else 0.68,
                    halo_flare=0.78 if f == 18 else 0.52,
                    eclipse_halo=(f == 18),
                    phase=ph,
                    offhand_orb=(f == 18),
                )
            )
        elif f in (20, 21, 22):
            t = (f - 20) / 2.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K1_COIL",
                    dx=lerp(1.5, -2.0, t),
                    dy=lerp(0.0, -2.0, t),
                    staff_deg=lerp(-36.0, -52.0, t),
                    butt_len=12.5,
                    shaft_len=23.5,
                    blaze=0.65 + 0.25 * t,
                    halo_flare=0.50 + 0.35 * t,
                    phase=ph,
                )
            )

        # --- V3 (F23..F29): K4 Levitating Arcane-Hover Cast -> Colossal Sun-Crest Seal & Triple Meteoric Fire-Orb Array ---
        elif f in (23, 24):
            t = f - 23
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K4_HOVER",
                    dx=-2.0 - t * 1.5,
                    dy=-6.0 - t * 2.5,
                    staff_deg=-34.0 + t * 6.0,
                    butt_len=12.0,
                    shaft_len=23.0,
                    blaze=0.95,
                    halo_flare=0.95,
                    phase=ph,
                    ground_ring_rx=18.0 + t * 4.0,
                )
            )
        elif f == 25:
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K4_HOVER",
                    dx=-3.0,
                    dy=-8.0,
                    staff_deg=-22.0,
                    butt_len=12.0,
                    shaft_len=24.0,
                    blaze=1.0,
                    halo_flare=1.0,
                    phase=ph,
                    ground_ring_rx=24.0,
                )
            )
        elif f in (26, 27):
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K4_HOVER",
                    dx=-3.0 if f == 26 else -2.0,
                    dy=-6.0 if f == 26 else -3.0,
                    staff_deg=-26.0 if f == 26 else -38.0,
                    butt_len=12.0,
                    shaft_len=23.5,
                    blaze=0.88 if f == 26 else 0.70,
                    halo_flare=0.82 if f == 26 else 0.55,
                    phase=ph,
                    ground_ring_rx=21.0 if f == 26 else 15.0,
                )
            )
        else:
            t = f - 28
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K1_COIL" if f == 28 else "STAND",
                    dx=lerp(-1.0, 0.0, t),
                    dy=0.0,
                    staff_deg=lerp(-54.0, -70.0, t),
                    butt_len=13.0,
                    shaft_len=24.5,
                    blaze=lerp(0.55, 0.40, t),
                    halo_flare=lerp(0.35, 0.16, t),
                    phase=ph,
                )
            )
    return frames


def build_row_3_skill(poses):
    """Row 3 SKILL (`SOLAR TRINITY CATACLYSM`): Grand K3 invocation -> Heliacal Rune Seal & Prominence Column."""
    frames = []
    for f in range(30):
        ph = f / 30.0
        if f < 8:
            t = f / 7.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K1_COIL" if f < 4 else "K3_INVOKE",
                    dx=lerp(-1.0, 2.5, t),
                    dy=0.0,
                    staff_deg=-52.0 if f < 4 else lerp(22.0, 14.0, (f - 4) / 3.0),
                    butt_len=9.0 if f >= 4 else 13.0,
                    shaft_len=22.5,
                    blaze=0.55 + 0.45 * t,
                    halo_flare=0.40 + 0.60 * t,
                    phase=ph,
                    offhand_orb=(f >= 4),
                    ground_ring_rx=14.0 + 10.0 * t,
                )
            )
        elif f <= 15:
            diss = max(0.0, (f - 9) / 7.5)
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K2_CAST" if f >= 10 else "K3_INVOKE",
                    dx=(4.0 + 0.35 * (f - 8)) if f < 10 else (4.5 - 0.18 * (f - 10)),
                    dy=0.0,
                    staff_deg=(16.0 - 2.0 * (f - 8)) if f < 10 else (-8.0 - 1.5 * (f - 10)),
                    butt_len=11.0,
                    shaft_len=22.5,
                    blaze=1.0 - 0.20 * diss,
                    halo_flare=1.0 - 0.25 * diss,
                    phase=ph,
                    ground_ring_rx=24.0 * (1.0 - 0.5 * diss),
                )
            )
        else:
            t = (f - 16) / 13.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K1_COIL" if f < 22 else "STAND",
                    dx=lerp(3.5, 0.0, t),
                    dy=0.0,
                    staff_deg=lerp(-26.0, -72.0, t),
                    butt_len=13.0,
                    shaft_len=24.5,
                    blaze=lerp(0.68, 0.38, t),
                    halo_flare=lerp(0.55, 0.14, t),
                    phase=ph,
                )
            )
    return frames


def build_row_4_ultimate(poses):
    """
    Row 4 ULTIMATE (`BLACK-SUN ECLIPSE SINGULARITY` & `CATACLYSM: GRAND HELIOS APOCALYPSE`):
    Ascendant K3_INVOKE -> Levitating K4_HOVER Eclipse Archmage -> Cataclysmic Staff Command!
    """
    frames = []
    for f in range(30):
        ph = f / 30.0
        if f < 7:
            t = f / 6.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K3_INVOKE",
                    dx=lerp(0.0, 2.0, t),
                    dy=lerp(0.0, -3.0, t),
                    staff_deg=lerp(22.0, 12.0, t),
                    butt_len=9.0,
                    shaft_len=22.0,
                    blaze=0.65 + 0.35 * t,
                    halo_flare=0.55 + 0.45 * t,
                    eclipse_halo=True,
                    phase=ph,
                    offhand_orb=True,
                    ground_ring_rx=16.0 + 10.0 * t,
                )
            )
        elif f < 18:
            t = (f - 7) / 10.0
            hover = -7.0 - math.sin(t * math.pi) * 3.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K4_HOVER",
                    dx=2.0,
                    dy=hover,
                    staff_deg=-34.0 + math.sin(t * math.tau * 2.0) * 7.0,
                    butt_len=12.0,
                    shaft_len=23.5,
                    blaze=1.0,
                    halo_flare=1.0,
                    eclipse_halo=(f % 2 == 0),
                    phase=ph,
                    offhand_orb=True,
                    ground_ring_rx=26.0 + 4.0 * math.sin(t * math.pi),
                )
            )
        elif f <= 21:
            diss = (f - 18) * 0.26
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K2_CAST",
                    dx=6.5 - 0.35 * (f - 18),
                    dy=0.0,
                    staff_deg=-4.0 - 2.5 * (f - 18),
                    butt_len=12.0,
                    shaft_len=22.5,
                    blaze=1.0 - 0.12 * (f - 18),
                    halo_flare=1.0 - 0.14 * (f - 18),
                    eclipse_halo=True,
                    phase=ph,
                    ground_ring_rx=28.0 * (1.0 - 0.3 * diss),
                )
            )
        else:
            t = (f - 22) / 7.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K1_COIL" if f < 26 else "STAND",
                    dx=lerp(5.0, 0.0, t),
                    dy=0.0,
                    staff_deg=lerp(-24.0, -72.0, t),
                    butt_len=13.0,
                    shaft_len=24.5,
                    blaze=lerp(0.90, 0.38, t),
                    halo_flare=lerp(0.85, 0.14, t),
                    eclipse_halo=(f < 25),
                    phase=ph,
                )
            )
    return frames


def build_row_5_death(poses):
    """
    Row 5 DEATH & HURT (`150..179`):
      - `F00..F05`: Upright `HURT` recoil stagger (`PixelForge.getFrameIndex` uses `150 + 0..5` for HURT!)
      - `F06..F21`: Dramatic kneeling -> falling collapse onto the sanctuary floor
      - `F22..F29`: Grounded horizontal prone rest (`height <= 96px` in `320x240`, `minX >= 24`, `maxX <= 298`,
        `0` standing recovery, `0` edge cuts!) beside his smoldering Golden Crescent-Sun Staff.
    """
    frames = []
    for f in range(30):
        ph = f / 30.0
        if f <= 5:
            t = f / 5.0
            recoil = math.sin(t * math.pi * 0.5)
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K1_COIL",
                    dx=-6.5 * recoil,
                    dy=1.0 * recoil,
                    staff_deg=-84.0 - 16.0 * recoil,
                    blaze=0.35 - 0.10 * recoil,
                    halo_flare=0.14 * (1.0 - 0.5 * recoil),
                    phase=ph,
                )
            )
        elif f <= 11:
            # Buckling knee-drop stagger before tipping horizontally
            t = (f - 6) / 5.0
            rot_deg = lerp(10.0, 34.0, smoothstep(t))
            base_im = poses["K1_COIL"]["sprite"].rotate(-rot_deg, resample=Image.Resampling.NEAREST, expand=True)
            b_arr = np.array(base_im)
            ys, xs = np.where(b_arr[:, :, 3] > 0)
            canvas = Image.new("RGBA", (LOG_W, LOG_H), (0, 0, 0, 0))
            if len(ys) > 0:
                min_x, max_x = int(xs.min()), int(xs.max())
                max_y = int(ys.max())
                ox = int(clamp(AX - 5 - (min_x + max_x) // 2, 14, LOG_W - b_arr.shape[1] - 14))
                oy = (AY - 1) - max_y
                canvas.alpha_composite(base_im, (ox, oy))
            arr = np.array(canvas)
            draw_crescent_sun_staff(
                arr,
                grip_pos=(AX + 4.0 - t * 2.0, lerp(86.0, 98.0, t)),
                angle_deg=lerp(-58.0, -24.0, t),
                butt_len=12.0,
                shaft_len=21.0,
                blaze=0.26 * (1.0 - 0.4 * t),
                phase=ph,
                stamp_glove=False,
                max_y=114,
            )
            for k in range(3):
                ex = int(round(AX - 8 + k * 8 + math.sin(f + k) * 2.0))
                ey = int(round(92 - ((f * 2 + k * 3) % 10)))
                put_px(arr, ex, ey, C_FLAME_GOLD if k % 2 == 0 else C_FLAME_ORANGE)
            enforce_safety_margin(arr)
            frames.append(arr)
        else:
            # F12..F21 falling collapse -> F22..F29 grounded horizontal prone rest (`height <= 84px` in 320x240!)
            t_fall = clamp((f - 12) / 10.0, 0.0, 1.0)
            st = smoothstep(t_fall)
            rot_deg = lerp(38.0, 88.0, st)
            base_im = poses["K1_COIL"]["sprite"].rotate(-rot_deg, resample=Image.Resampling.NEAREST, expand=True)
            v_drape = lerp(1.0, 0.78, st)
            rw, rh = base_im.size
            base_im = base_im.resize((rw, max(8, int(round(rh * v_drape)))), Image.Resampling.NEAREST)
            b_arr = np.array(base_im)
            ys, xs = np.where(b_arr[:, :, 3] > 0)
            canvas = Image.new("RGBA", (LOG_W, LOG_H), (0, 0, 0, 0))
            if len(ys) > 0:
                min_x, max_x = int(xs.min()), int(xs.max())
                max_y = int(ys.max())
                ox = int(clamp(AX + 8 - (min_x + max_x) // 2, 16 - min_x, 144 - max_x))
                oy = (AY - 1) - max_y
                canvas.alpha_composite(base_im, (ox, oy))
            arr = np.array(canvas)
            if f >= 22:
                arr[:72, :, :] = 0
            staff_y = lerp(103.0, 111.0, t_fall)
            draw_crescent_sun_staff(
                arr,
                grip_pos=(AX + 8.0, staff_y),
                angle_deg=lerp(-14.0, 1.5, t_fall),
                butt_len=11.0,
                shaft_len=20.0,
                blaze=0.18 + 0.05 * math.sin(ph * math.tau * 2.0),
                phase=ph,
                stamp_glove=False,
                max_y=114,
            )
            arr = seal_160_char_pinholes_and_leaks(
                arr, max_pinhole_lpx=8, min_detached_lpx=4, max_orphan_lpx=20, orphan_dist_lpx=4.0, bridge_max_lpx=48, bridge_gap_lpx=2.5
            )
            for k in range(4):
                ex = int(round(AX - 12 + k * 9 + math.sin(f * 0.8 + k * 1.7) * 2.0))
                ey = int(round(107 - ((f + k * 3) % 9)))
                col_e = C_FLAME_GOLD if (f + k) % 2 == 0 else C_FLAME_CRIMSON
                for ox, oy in ((0, 0), (1, 0), (0, -1), (1, -1)):
                    put_px(arr, ex + ox, ey + oy, col_e)
            enforce_safety_margin(arr)
            frames.append(arr)
    return frames


def build_row_6_dash(poses):
    """
    Row 6 DASH (`180..209`): Forward Arcane Flame-Blink!
    `F00..F05` solar warp coil -> `F06..F19` sleek forward Arcane Flame-Blink glide with blazing
    Crescent-Sun Staff & trailing solar warp sigils -> `F20..F29` poised arrival recovery (`0` melee smears!).
    """
    frames = []
    for f in range(30):
        ph = f / 30.0
        if f < 6:
            t = f / 5.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K1_COIL",
                    dx=lerp(-2.0, 2.0, t),
                    dy=0.0,
                    staff_deg=lerp(-68.0, -34.0, t),
                    blaze=0.62 + 0.30 * t,
                    halo_flare=0.45 + 0.45 * t,
                    phase=ph,
                    ground_ring_rx=14.0 + 10.0 * t,
                )
            )
        elif f <= 19:
            u = (f - 6) / 13.0
            surge = math.sin(u * math.pi)
            arr = compose_mage_frame(
                poses,
                pose_key="K4_HOVER",
                dx=lerp(3.0, 8.0, surge),
                dy=-2.0 - round(surge * 2.0),
                staff_deg=-22.0 + math.sin(u * math.tau) * 4.0,
                butt_len=12.0,
                shaft_len=23.0,
                blaze=0.96,
                halo_flare=0.95,
                phase=ph,
                ground_ring_rx=20.0 * (1.0 - 0.55 * u),
            )
            # Trailing Arcane Flame-Blink horizontal warp streaks & solar runes behind (-X)
            for k in range(4):
                wy = 54 + k * 14
                wx0 = int(round(18 + k * 4 + (f % 3) * 2))
                wx1 = int(round(36 + k * 3))
                draw_thick_line(
                    arr,
                    wx0,
                    wy,
                    wx1,
                    wy,
                    0.85 if k % 2 == 0 else 0.65,
                    C_FLAME_GOLD if k % 2 == 0 else C_FLAME_ORANGE,
                    out_col=C_OUT,
                )
            draw_pixel_star4(arr, 24 + (f % 4) * 2, 66 + (f % 3) * 3 - 3, arm=2, core_col=C_FLAME_CORE, ray_col=C_FLAME_GOLD)
            enforce_safety_margin(arr)
            frames.append(arr)
        else:
            t = (f - 20) / 9.0
            frames.append(
                compose_mage_frame(
                    poses,
                    pose_key="K1_COIL" if f < 25 else "STAND",
                    dx=lerp(4.0, 0.0, t),
                    dy=0.0,
                    staff_deg=lerp(-32.0, -72.0, t),
                    blaze=lerp(0.76, 0.38, t),
                    halo_flare=lerp(0.60, 0.14, t),
                    phase=ph,
                )
            )
    return frames


def build_row_7_crouch(poses):
    """Row 7 CROUCH / SOLAR FLAME WARD: Grounded tactical ward + orbiting Solar Rune Circle."""
    frames = []
    for f in range(30):
        ph = f / 30.0
        frames.append(
            compose_mage_frame(
                poses,
                pose_key="K1_COIL",
                dx=1.0,
                dy=1.0,
                staff_deg=-56.0 + math.sin(ph * math.tau) * 4.5,
                blaze=0.60 + 0.15 * math.sin(ph * math.tau * 2.0),
                halo_flare=0.40,
                phase=ph,
                ground_ring_rx=23.0 + math.sin(ph * math.tau) * 2.0,
            )
        )
    return frames


def build_row_8_jump_blink(poses):
    """Row 8 JUMP / ARCANE BLINK WARP: K4_HOVER airborne arc + Arcane Blink solar warp rings."""
    frames = []
    for f in range(30):
        ph = f / 30.0
        arc = math.sin(ph * math.pi)
        frames.append(
            compose_mage_frame(
                poses,
                pose_key="K4_HOVER" if 3 <= f <= 25 else "STAND",
                dx=arc * 3.0,
                dy=-arc * 9.0,
                staff_deg=-48.0 - arc * 18.0 + math.sin(ph * math.tau) * 5.0,
                butt_len=12.0,
                shaft_len=23.0,
                blaze=0.62 + 0.30 * arc,
                halo_flare=0.45 + 0.45 * arc,
                phase=ph,
                ground_ring_rx=18.0 * (1.0 - abs(ph - 0.25) * 3.0) if ph < 0.55 else 0.0,
            )
        )
    return frames


def build_row_9_victory(poses):
    """
    Row 9 VICTORY (`270..299`): Regal Sovereign Archmage Victory Flourish (`F00..F14`)
    & Triumphant Upright Sovereign Loop (`F15..F29`, `height >= 160px` on ALL 30 frames — NEVER collapsing!).
    """
    frames = []
    for f in range(30):
        if f < 15:
            # F00..F14: Grand skyward Golden Crescent-Sun Staff flourish & overhead Helios Crown Seal!
            u = f / 14.0
            ph = f / 30.0
            if f < 5:
                t = f / 4.0
                arr = compose_mage_frame(
                    poses,
                    pose_key="K1_COIL" if f < 2 else "K3_INVOKE",
                    dx=lerp(0.0, 2.0, t),
                    dy=0.0,
                    staff_deg=lerp(-64.0, 20.0, t),
                    butt_len=9.5,
                    shaft_len=22.5,
                    blaze=0.65 + 0.35 * t,
                    halo_flare=0.50 + 0.50 * t,
                    phase=ph,
                    offhand_orb=(f >= 2),
                    ground_ring_rx=16.0 + 6.0 * t,
                )
            else:
                t = (f - 5) / 9.0
                arr = compose_mage_frame(
                    poses,
                    pose_key="K3_INVOKE" if f < 12 else "STAND",
                    dx=lerp(2.0, 0.0, t),
                    dy=0.0,
                    staff_deg=lerp(16.0, -75.0, smoothstep(t)),
                    butt_len=10.5 if f < 12 else 13.0,
                    shaft_len=23.5 if f < 12 else 25.0,
                    blaze=1.0 - 0.15 * t,
                    halo_flare=1.0 - 0.20 * t,
                    phase=ph,
                    offhand_orb=(f < 12),
                    ground_ring_rx=22.0,
                )
            # Crown Victory Star-Glints above his pointed Wizard Hat during flourish
            ang_v = u * math.tau
            draw_pixel_star4(
                arr,
                AX + 2.0 + math.cos(ang_v) * 16.0,
                24.0 + math.sin(ang_v) * 3.0,
                arm=3 if 4 <= f <= 10 else 2,
                core_col=C_FLAME_CORE,
                ray_col=C_FLAME_GOLD,
                out_col=C_OUT,
            )
            enforce_safety_margin(arr)
            frames.append(arr)
        else:
            # F15..F29: Seamless 15-frame Triumphant Upright Archmage Loop (`height >= 174px >= 160px`)!
            loop_ph = (f - 15) / 15.0
            bob = round(math.sin(loop_ph * math.tau) * 0.9)
            arr = compose_mage_frame(
                poses,
                pose_key="STAND",
                dx=0.0,
                dy=bob,
                staff_deg=-76.0 + math.sin(loop_ph * math.tau) * 3.5,
                butt_len=13.0,
                shaft_len=25.5,
                blaze=0.82 + 0.16 * math.sin(loop_ph * math.tau * 2.0),
                halo_flare=0.78 + 0.18 * math.sin(loop_ph * math.tau),
                phase=loop_ph,
                offhand_orb=True,
                ground_ring_rx=22.0 + 1.5 * math.sin(loop_ph * math.tau),
            )
            # Orbiting twin sovereign solar crown glints
            for k in range(2):
                ga = loop_ph * math.tau + k * math.pi
                gx = AX + 1.0 + math.cos(ga) * 18.0
                gy = 30.0 + bob + math.sin(ga) * 4.0
                draw_pixel_star4(arr, gx, gy, arm=2, core_col=C_FLAME_CORE, ray_col=C_FLAME_GOLD, out_col=C_OUT)
            enforce_safety_margin(arr)
            frames.append(arr)
    return frames


# ==============================================================================
# 7. PORTRAIT BUILDER (128x128, 2x2 PIXEL BLOCKS) & SHEET ASSEMBLY / QA AUDIT
# ==============================================================================
def build_portrait(save_to_disk=False):
    raw = Image.open(PORTRAIT_JPG).convert("RGB")
    w, h = raw.size
    # Frame full pointed Wizard Hat tip + sun-emblem, wide gold-runed brim, glowing molten eyes & Crescent-Sun Staff!
    s = int(min(w, h) * 0.98)
    x0 = max(0, (w - s) // 2)
    y0 = 0
    crop = raw.crop((x0, y0, x0 + s, y0 + s)).resize((64, 64), Image.Resampling.BILINEAR)
    q64 = crop.quantize(colors=48, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGBA")
    arr = np.array(q64)

    # Boost glowing molten-gold eyes & Crescent-Sun core in 64x64 logical space so they gleam vividly
    rgb = arr[:, :, :3].astype(np.float32)
    warm_glow = (rgb[:, :, 0] > 238) & (rgb[:, :, 1] > 205) & (rgb[:, :, 2] < 135)
    arr[warm_glow] = C_FLAME_GOLD
    hot_core = (rgb[:, :, 0] > 248) & (rgb[:, :, 1] > 236) & (rgb[:, :, 2] > 145)
    arr[hot_core] = C_FLAME_CORE

    # Crisp 1px dark-gold Neo-Vision frame border in 64x64 logical -> 2px in 128x128
    arr[0, :] = C_OUT
    arr[63, :] = C_OUT
    arr[:, 0] = C_OUT
    arr[:, 63] = C_OUT
    arr[1, 1:63] = C_GOLD_DARK
    arr[62, 1:63] = C_GOLD_DARK
    arr[1:63, 1] = C_GOLD_DARK
    arr[1:63, 62] = C_GOLD_DARK

    out128 = Image.fromarray(arr, "RGBA").resize((128, 128), Image.Resampling.NEAREST)
    if save_to_disk:
        out128.save(OUT_PORTRAIT)
    return out128


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scratch-dir", default=DEFAULT_SCRATCH)
    parser.add_argument("--rebuild-portrait", action="store_true", help="Opt-in portrait rebuild (default False)")
    args = parser.parse_args()
    os.makedirs(args.scratch_dir, exist_ok=True)

    print("[mage_ex] Loading Classic-Wizard Neo-Vision base & 2x2 spellcasting keyposes...")
    poses = load_mage_poses()

    row_builders = [
        ("Row 0 IDLE", build_row_0_idle),
        ("Row 1 WALK", build_row_1_walk),
        ("Row 2 AUTO_ATTACK", build_row_2_auto_attack),
        ("Row 3 SKILL", build_row_3_skill),
        ("Row 4 ULTIMATE", build_row_4_ultimate),
        ("Row 5 DEATH", build_row_5_death),
        ("Row 6 DASH", build_row_6_dash),
        ("Row 7 CROUCH", build_row_7_crouch),
        ("Row 8 JUMP_BLINK", build_row_8_jump_blink),
        ("Row 9 VICTORY", build_row_9_victory),
    ]

    sheet = Image.new("RGBA", (CELL_W * COLS, CELL_H * ROWS), (0, 0, 0, 0))
    border_clips = 0
    all_rows_320 = []

    for r_idx, (r_name, builder) in enumerate(row_builders):
        log_frames = builder(poses)
        assert len(log_frames) == COLS, f"{r_name} produced {len(log_frames)} frames!"
        transitions = 0
        row_320 = []
        snap_reaches = {}
        walk_spans = []
        walk_tops = []
        death_prone_heights = []
        victory_heights = []

        for c_idx, farr in enumerate(log_frames):
            if c_idx > 0 and not np.array_equal(log_frames[c_idx - 1], farr):
                transitions += 1
            im_log = Image.fromarray(farr)
            im_320 = im_log.resize((CELL_W, CELL_H), Image.Resampling.NEAREST)
            a320 = np.array(im_320)[:, :, 3]
            if (
                a320[:4, :].any()
                or a320[-4:, :].any()
                or a320[:, :4].any()
                or a320[:, -4:].any()
            ):
                border_clips += 1

            ys_320, xs_320 = np.where(a320 > 0)
            h_320 = int(ys_320.max() - ys_320.min() + 1) if len(ys_320) else 0

            if r_idx == 1:
                walk_tops.append(int(ys_320.min()))
                band = a320[206:233, :]
                _, bxs = np.where(band > 0)
                span = int(bxs.max() - bxs.min()) if len(bxs) else 0
                walk_spans.append(span)
            elif r_idx == 2 and c_idx in (3, 9, 17, 25):
                snap_reaches[f"F{c_idx:02d}"] = int(xs_320.max())
            elif r_idx == 5 and c_idx >= 22:
                death_prone_heights.append((c_idx, h_320, int(xs_320.min()), int(xs_320.max())))
            elif r_idx == 9:
                victory_heights.append(h_320)

            sheet.paste(im_320, (c_idx * CELL_W, r_idx * CELL_H))
            row_320.append(im_320)

        all_rows_320.append(row_320)
        extra = ""
        if r_idx == 1:
            max_span, min_span = max(walk_spans), min(walk_spans)
            max_adj_top = max(abs(walk_tops[(i + 1) % 30] - walk_tops[i]) for i in range(30))
            extra = (
                f" | footSpan320 min={min_span} max={max_span} "
                f"(F00={walk_spans[0]}, F07={walk_spans[7]}, F15={walk_spans[15]}, F22={walk_spans[22]}) "
                f"| maxAdjTopDelta={max_adj_top}"
            )
            if max_span < 34 or min_span > int(max_span * 0.50):
                raise RuntimeError(f"Row 1 WALK crossover gate failed: min={min_span}, max={max_span}!")
            if max_adj_top > 4:
                raise RuntimeError(f"Row 1 WALK topY pop: maxAdjTopDelta={max_adj_top} > 4!")
        elif r_idx == 2:
            extra = f" | snap max_x={snap_reaches}"
            for fk, rx in snap_reaches.items():
                if rx > 262:
                    raise RuntimeError(f"Row 2 {fk} leaked forward FX: rx={rx} > 262!")
        elif r_idx == 5:
            max_prone_h = max(h for _, h, _, _ in death_prone_heights)
            min_px = min(x0 for _, _, x0, _ in death_prone_heights)
            max_px = max(x1 for _, _, _, x1 in death_prone_heights)
            extra = f" | F22..F29 prone maxH={max_prone_h}px x=[{min_px}..{max_px}]"
            if max_prone_h > 96 or min_px < 24 or max_px > 298:
                raise RuntimeError(f"Row 5 DEATH prone rest violation: {death_prone_heights}")
        elif r_idx == 9:
            min_vic_h = min(victory_heights)
            extra = f" | F00..F29 upright minH={min_vic_h}px"
            if min_vic_h < 160:
                raise RuntimeError(f"Row 9 VICTORY upright height violation: minH={min_vic_h} < 160!")

        print(f"  [{r_name}] transitions={transitions}/29{extra}")
        if transitions < 29:
            raise RuntimeError(f"{r_name} has static duplicate frames ({transitions}/29)!")

    if border_clips != 0:
        raise RuntimeError(f"Border clip violation: {border_clips}/300!")

    sheet.save(OUT_SHEET)
    print(f"[mage_ex] Saved {OUT_SHEET} ({sheet.size[0]}x{sheet.size[1]}), border_clips={border_clips}/300")
    if args.rebuild_portrait:
        port = build_portrait(save_to_disk=True)
        print(f"[mage_ex] Saved {OUT_PORTRAIT} ({port.size[0]}x{port.size[1]})")

    # Visual QA Contact Sheets in untracked scratch dir
    qa_rows = [
        (1, "debug_mage_ex_row1_walk.png"),
        (2, "debug_mage_ex_row2.png"),
        (5, "debug_mage_ex_row5_death.png"),
        (6, "debug_mage_ex_row6_dash.png"),
        (9, "debug_mage_ex_row9_victory.png"),
    ]
    for row_idx_qa, out_name in qa_rows:
        r_w, r_h = 6 * (CELL_W + 6) + 6, 5 * (CELL_H + 6) + 6
        dbg_r = Image.new("RGBA", (r_w, r_h), (26, 22, 32, 255))
        dr = ImageDraw.Draw(dbg_r)
        for idx, im320 in enumerate(all_rows_320[row_idx_qa]):
            gx = (idx % 6) * (CELL_W + 6) + 6
            gy = (idx // 6) * (CELL_H + 6) + 6
            bg = Image.new("RGBA", (CELL_W, CELL_H), (36, 32, 46, 255))
            bg_d = ImageDraw.Draw(bg)
            bg_d.line([(0, 230), (319, 230)], fill=(90, 70, 50, 255), width=1)
            bg_d.line([(112, 0), (112, 239)], fill=(70, 80, 110, 255), width=1)
            bg.alpha_composite(im320, (0, 0))
            dbg_r.paste(bg, (gx, gy))
            dr.text((gx + 6, gy + 4), f"F{idx:02d}", fill=(255, 235, 140, 255))
        dbg_r.save(os.path.join(args.scratch_dir, out_name))

    for c0, c1, tag in [(0, 15, "left_F00_F14"), (15, 30, "right_F15_F29")]:
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

    print(f"[mage_ex] Wrote QA contact sheets to {args.scratch_dir}")


if __name__ == "__main__":
    main()
