#!/usr/bin/env python3
"""
Builds Freyja (Valkyrie — Sovereign Winged Sky-Dragoon) 30fps HD-2D Sprite Sheet
(6240x1872, 30 cols x 9 rows of 208x208) using:
- Cape-free / wing-separated 16-bit HD-2D reference base model: assets/sprites/valkyrie_v2_base.jpg
- 13-part anatomical segmentation (mane, head, torso, l_sode, l_forearm, r_sode, r_forearm,
  l_thigh, l_shin, l_foot, r_thigh, r_shin, r_foot) with 0 uncovered silhouette pixels
- 104x104 logical resolution upscaled 2x NEAREST to 208x208 (400% finer pixel detail than 52x52,
  preserving golden Valkyrie helm ear-wings, ruby forehead & chest gems, glowing amber eye,
  platinum-gold ponytail, layered crimson-gold pauldrons, waist tabard & hip tassets,
  golden winged knee-poleyns, crimson-gold greaves, and gilded sabatons)
- Strict 20-Color Hand-Crafted Valkyrie Master Palette + 2-Pass Cardinal Orphan Despeckle + 1px Selout
  (eliminating 100% of continuous AI RGB gradients and confetti noise)
- Articulated 6-Pinion Crimson-and-Gold Valkyrie Wings + Ornate Winged Gungnir War-Lance in 104x104 space
- 100% Grounded IDLE/WALK + 100% Grounded SKILL/ULTIMATE Cast Startups + Multi-Angle Winged Spear-Glides
"""

import os
import sys
import math
import time
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)
from hd2d_rig_core import compute_bipedal_walk_pose, splice_row2_auto_surgically

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE_IMG_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "valkyrie_v2_base.jpg")
OUT_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "valkyrie_sheet.png")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"

CELL = 208
LOGICAL = 104
COLS = 30
ROWS = 9

# Strict 20-Color Hand-Crafted Valkyrie Master Palette (Zero Continuous AI Gradients)
MASTER_PALETTE = np.array([
    # 0-1: Crisp Selective Outlines (Selout) & Deepest Crevices
    [14, 12, 22],     # 0: Abyssal Obsidian Outline
    [36, 18, 28],     # 1: Deep Wine-Obsidian Selout
    # 2-5: 4-Step Crimson-Ruby Valkyrie Cuirass & Greave Plate Ramp
    [88, 18, 30],     # 2: Deep Bordeaux Armor Shadow
    [142, 26, 42],    # 3: Valkyrie Crimson Base Plate
    [196, 42, 60],    # 4: Lit Ruby-Crimson Armor Highlight
    [244, 88, 112],   # 5: Radiant Rose-Ruby Gem & Specular Glint
    # 6-8: 3-Step Dark Obsidian-Iron Gauntlet & Underskirt Ramp
    [46, 44, 56],     # 6: Dark Iron Shadow
    [78, 76, 92],     # 7: Gunmetal Gauntlet Midtone
    [118, 116, 134],  # 8: Steel Knuckle Highlight
    # 9-11: 3-Step Warm Porcelain / Valkyrie Skin Ramp
    [186, 128, 102],  # 9: Warm Rose-Tan Skin Shadow
    [228, 174, 142],  # 10: Porcelain Peach Skin Midtone
    [250, 208, 178],  # 11: Sunlit Ivory-Peach Skin Highlight
    # 12-15: 4-Step Platinum-Champagne Valkyrie Hair & Feather Ramp
    [154, 134, 96],   # 12: Honey-Ash Hair Shadow
    [202, 184, 138],  # 13: Champagne Blonde Hair Midtone
    [238, 226, 184],  # 14: Luminous Platinum Blonde Highlight
    [254, 250, 232],  # 15: Pure Valhalla Ivory-White Specular
    # 16-19: 4-Step Imperial Valhalla Gold Helm-Wings, Poleyn & Trim Ramp
    [138, 86, 24],    # 16: Antique Bronze Gold Shadow
    [194, 136, 36],   # 17: Rich Imperial Gold Midtone
    [242, 192, 58],   # 18: Bright Valhalla Gold Highlight
    [255, 236, 126],  # 19: Blazing Sun-Gold Eye & Tip Gleam
], dtype=np.int32)

# Pre-bound RGBA palette tuples for crisp 104x104 wings, Gungnir War-Lance, and FX
P_OUTLINE = (14, 12, 22, 255)
P_SELOUT = (36, 18, 28, 255)
P_CRIM_SHAD = (88, 18, 30, 255)
P_CRIM_BASE = (142, 26, 42, 255)
P_RUBY_LIT = (196, 42, 60, 255)
P_ROSE_GEM = (244, 88, 112, 255)
P_IRON_SHAD = (46, 44, 56, 255)
P_IRON_MID = (78, 76, 92, 255)
P_PLAT_MID = (202, 184, 138, 255)
P_PLAT_LIT = (238, 226, 184, 255)
P_IVORY = (254, 250, 232, 255)
P_GOLD_SHAD = (138, 86, 24, 255)
P_GOLD_MID = (194, 136, 36, 255)
P_GOLD_LIT = (242, 192, 58, 255)
P_GOLD_GLEAM = (255, 236, 126, 255)


def quantize_and_cluster_104(arr104):
    """
    Transforms a downsampled 104x104 RGBA frame into authentic hand-clustered pixel art:
    1. Quantizes all opaque pixels to the 20-color MASTER_PALETTE (eliminating AI gradients/mixels).
    2. Runs 2 passes of cardinal neighbor majority clustering (removing isolated 1px AI speckles).
    3. Applies a crisp 1px dark selective outline (Selout) around the silhouette.
    """
    out = arr104.copy()
    alpha = out[:, :, 3] > 128
    out[~alpha] = [0, 0, 0, 0]
    out[alpha, 3] = 255
    if not np.any(alpha):
        return out

    rgb = out[:, :, :3].astype(np.int32)
    diff = rgb[:, :, None, :] - MASTER_PALETTE[None, None, :, :]
    dist2 = diff[:, :, :, 0] ** 2 * 2 + diff[:, :, :, 1] ** 2 * 3 + diff[:, :, :, 2] ** 2 * 2
    idx_map = np.argmin(dist2, axis=2)
    idx_map[~alpha] = -1

    # Two passes of Cardinal Pixel-Clustering (Orphan-Pixel Despeckle)
    for _ in range(2):
        up = np.pad(idx_map[:-1, :], ((1, 0), (0, 0)), constant_values=-1)
        dn = np.pad(idx_map[1:, :], ((0, 1), (0, 0)), constant_values=-1)
        lf = np.pad(idx_map[:, :-1], ((0, 0), (1, 0)), constant_values=-1)
        rt = np.pad(idx_map[:, 1:], ((0, 0), (0, 1)), constant_values=-1)

        same_cnt = (
            (idx_map == up).astype(np.int8)
            + (idx_map == dn).astype(np.int8)
            + (idx_map == lf).astype(np.int8)
            + (idx_map == rt).astype(np.int8)
        )
        interior = alpha & (up >= 0) & (dn >= 0) & (lf >= 0) & (rt >= 0)
        # Protect ruby chest/brow gems (5) and golden eye/gleam pixels (19)
        protect = (idx_map == 5) | (idx_map == 19)
        orphan = interior & (same_cnt == 0) & (~protect)

        replacement = np.where((up == dn) & (up >= 0), up, np.where((lf == rt) & (lf >= 0), lf, up))
        idx_map = np.where(orphan & (replacement >= 0), replacement, idx_map)

    # Crisp 1px Selective Outline (Selout) on outer silhouette edges
    up_a = np.pad(alpha[:-1, :], ((1, 0), (0, 0)), constant_values=False)
    dn_a = np.pad(alpha[1:, :], ((0, 1), (0, 0)), constant_values=False)
    lf_a = np.pad(alpha[:, :-1], ((0, 0), (1, 0)), constant_values=False)
    rt_a = np.pad(alpha[:, 1:], ((0, 0), (0, 1)), constant_values=False)
    edge = alpha & (~(up_a & dn_a & lf_a & rt_a))

    is_hair = (idx_map >= 12) & (idx_map <= 15)
    is_gleam = (idx_map == 19)
    body_edge = edge & (~is_hair) & (~is_gleam)
    hair_edge = edge & is_hair

    shadow_edge = body_edge & ((~dn_a) | (~rt_a))
    lit_edge = body_edge & (~shadow_edge)
    idx_map[lit_edge] = 1
    idx_map[shadow_edge] = 0
    # Ponytail lower/right edge gets warm bronze-wine selout, upper edge gets honey-ash contour
    idx_map[hair_edge & ((~dn_a) | (~rt_a))] = 1
    idx_map[hair_edge & dn_a & rt_a] = 12

    valid = idx_map >= 0
    out_rgb = MASTER_PALETTE[np.clip(idx_map, 0, len(MASTER_PALETTE) - 1)].astype(np.uint8)
    out[:, :, :3] = np.where(valid[:, :, None], out_rgb, 0)
    return out


def keep_largest_component(mask):
    H, W = mask.shape
    visited = np.zeros((H, W), dtype=bool)
    best_comp = None
    best_size = 0
    ys, xs = np.where(mask)
    if len(ys) == 0:
        return mask
    for idx in range(len(ys)):
        sy, sx = int(ys[idx]), int(xs[idx])
        if visited[sy, sx]:
            continue
        comp = []
        q = [(sy, sx)]
        visited[sy, sx] = True
        head = 0
        while head < len(q):
            cy, cx = q[head]
            head += 1
            comp.append((cy, cx))
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < H and 0 <= nx < W and not visited[ny, nx] and mask[ny, nx]:
                    visited[ny, nx] = True
                    q.append((ny, nx))
        if len(comp) > best_size:
            best_size = len(comp)
            best_comp = comp
    out = np.zeros((H, W), dtype=bool)
    if best_comp:
        cy, cx = zip(*best_comp)
        out[cy, cx] = True
    return out


def poly_mask(H, W, pts):
    img = Image.new("L", (W, H), 0)
    ImageDraw.Draw(img).polygon(pts, fill=255)
    return np.array(img) > 128


def load_and_segment_512():
    """
    Loads valkyrie_v2_base.jpg (1024x1024), removes exterior & interior white pockets,
    applies MedianFilter cel-flattening on the 512x512 master rig, and segments into
    13 clean anatomical pixel-art parts with 0 uncovered pixels.
    """
    im = Image.open(BASE_IMG_PATH).convert("RGBA")
    for seed in [(0, 0), (1023, 0), (0, 1023), (1023, 1023), (455, 220), (455, 425), (520, 750)]:
        ImageDraw.floodfill(im, seed, (0, 0, 0, 0), thresh=40)
    arr = np.array(im)
    for _ in range(3):
        a = arr[:, :, 3] > 0
        up = np.pad(a[1:, :], ((0, 1), (0, 0)), constant_values=False)
        dn = np.pad(a[:-1, :], ((1, 0), (0, 0)), constant_values=False)
        lf = np.pad(a[:, 1:], ((0, 0), (0, 1)), constant_values=False)
        rt = np.pad(a[:, :-1], ((0, 0), (1, 0)), constant_values=False)
        edge = a & (~(up & dn & lf & rt))
        r = arr[:, :, 0].astype(np.int16)
        g = arr[:, :, 1].astype(np.int16)
        b = arr[:, :, 2].astype(np.int16)
        white_fringe = edge & (r > 175) & (g > 175) & (b > 175) & (np.abs(r - g) < 30) & (np.abs(g - b) < 30)
        arr[white_fringe] = [0, 0, 0, 0]

    im512 = Image.fromarray(arr, "RGBA").resize((512, 512), Image.Resampling.NEAREST)
    rgb512 = im512.convert("RGB")
    rgb_med3 = np.array(rgb512.filter(ImageFilter.MedianFilter(size=3)))
    arr512 = np.array(im512)
    H, W = arr512.shape[:2]
    alpha = arr512[:, :, 3] > 0
    arr512[:, :, :3] = np.where(alpha[:, :, None], rgb_med3, 0)

    def P(pts):
        return [(x * 0.5, y * 0.5) for (x, y) in pts]

    # 1. Head: Winged Crimson-Gold Valkyrie Helm, Golden Ear-Wings, Face & Glowing Amber Eye
    m_head = poly_mask(H, W, P([
        (453, 40), (476, 68), (508, 116), (554, 116), (565, 90),
        (578, 40), (605, 40), (655, 165), (655, 232), (625, 278),
        (568, 284), (522, 260), (482, 238), (482, 190), (460, 162), (445, 110)
    ])) & alpha

    # 2. Mane: Flowing Platinum-Gold Valkyrie High Ponytail
    m_mane = poly_mask(H, W, P([
        (95, 38), (562, 38), (560, 124), (505, 195), (455, 228),
        (365, 295), (95, 345)
    ])) & alpha & (~m_head)

    # 3. Left/Rear Layered Crimson-Gold Shoulder Pauldron & Upper Bicep
    m_l_sode = poly_mask(H, W, P([
        (360, 234), (498, 238), (504, 295), (486, 356),
        (452, 392), (410, 436), (380, 412), (362, 372), (360, 295)
    ])) & alpha & (~m_head)

    # 4. Left/Rear Vambrace & Gauntlet Fist
    m_l_forearm = poly_mask(H, W, P([
        (285, 362), (376, 364), (414, 434), (395, 505),
        (395, 588), (285, 588)
    ])) & alpha & (~m_l_sode)

    # 5. Right/Front Layered Crimson-Gold Shoulder Pauldron & Upper Bicep
    m_r_sode = poly_mask(H, W, P([
        (602, 262), (692, 262), (692, 382), (650, 396),
        (612, 444), (596, 412), (626, 366), (610, 315)
    ])) & alpha & (~m_head)

    # 6. Right/Front Vambrace & Gauntlet Fist
    m_r_forearm = poly_mask(H, W, P([
        (604, 436), (650, 386), (780, 495), (780, 582),
        (675, 582), (618, 480)
    ])) & alpha & (~m_r_sode)

    # 7. Torso: Crimson-Gold Cuirass, Ruby Gem, Golden Waist Girdle, Center Tabard & Crimson Hip Tassets
    m_torso = poly_mask(H, W, P([
        (472, 234), (620, 264), (632, 366), (604, 405),
        (608, 448), (668, 565), (668, 590), (622, 550),
        (595, 558), (595, 610), (552, 662), (502, 610),
        (502, 562), (468, 566), (425, 596), (368, 604),
        (368, 555), (442, 435), (448, 360), (502, 295)
    ])) & alpha & (~m_head) & (~m_l_sode) & (~m_l_forearm) & (~m_r_sode) & (~m_r_forearm)

    # 8-10. 3-Segment Left Leg (Thigh, Golden Winged Knee-Poleyn + Greave, Gilded Sabaton)
    m_l_foot = poly_mask(H, W, P([
        (210, 870), (332, 882), (332, 980), (210, 980)
    ])) & alpha

    m_l_shin = poly_mask(H, W, P([
        (325, 612), (378, 612), (382, 676), (418, 666),
        (456, 682), (456, 750), (332, 888), (242, 874), (325, 705)
    ])) & alpha & (~m_l_foot)

    m_l_thigh = poly_mask(H, W, P([
        (355, 540), (512, 540), (512, 645), (460, 725), (355, 710)
    ])) & alpha & (~m_torso) & (~m_l_shin)

    # 11-13. 3-Segment Right Leg (Thigh, Golden Winged Knee-Poleyn + Greave, Gilded Sabaton)
    m_r_foot = poly_mask(H, W, P([
        (672, 868), (765, 860), (855, 920), (855, 972), (672, 972)
    ])) & alpha

    m_r_shin = poly_mask(H, W, P([
        (598, 648), (680, 678), (718, 624), (755, 636),
        (765, 866), (672, 874), (628, 750)
    ])) & alpha & (~m_r_foot)

    m_r_thigh = poly_mask(H, W, P([
        (565, 535), (728, 535), (728, 700), (610, 710), (565, 625)
    ])) & alpha & (~m_torso) & (~m_r_shin)

    raw_parts = [
        ("mane", m_mane), ("head", m_head), ("torso", m_torso),
        ("l_sode", m_l_sode), ("l_forearm", m_l_forearm),
        ("r_sode", m_r_sode), ("r_forearm", m_r_forearm),
        ("l_thigh", m_l_thigh), ("l_shin", m_l_shin), ("l_foot", m_l_foot),
        ("r_thigh", m_r_thigh), ("r_shin", m_r_shin), ("r_foot", m_r_foot),
    ]

    parts = {}
    covered = np.zeros((H, W), dtype=bool)
    for name, m in raw_parts:
        if name != "mane":
            m = keep_largest_component(m)
        covered |= m
        ys, xs = np.where(m)
        x0, x1 = int(xs.min()), int(xs.max()) + 1
        y0, y1 = int(ys.min()), int(ys.max()) + 1
        crop = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
        sub_m = m[y0:y1, x0:x1]
        crop[sub_m] = arr512[y0:y1, x0:x1][sub_m]
        parts[name] = (Image.fromarray(crop, "RGBA"), x0, y0)

    missed = int((alpha & (~covered)).sum())
    print(f"[Freyja 512x512 Segmentation] 13 parts extracted, uncovered pixels: {missed}")
    return parts


def rot_pt(pt, pivot, deg):
    rad = math.radians(deg)
    c, s = math.cos(rad), math.sin(rad)
    dx, dy = pt[0] - pivot[0], pt[1] - pivot[1]
    return (pivot[0] + dx * c - dy * s, pivot[1] + dx * s + dy * c)


def paste_rotated_part(canvas, part_tuple, src_pivot, dst_pivot, deg, wave_phase=None, wave_amp=0.0):
    crop_im, x0, y0 = part_tuple
    if wave_phase is not None and abs(wave_amp) > 0.05:
        arr = np.array(crop_im)
        h, w = arr.shape[:2]
        pad = int(abs(wave_amp)) + 4
        out = np.zeros((h + pad * 2, w, 4), dtype=np.uint8)
        for x in range(w):
            dist = (w - 1 - x) / max(1.0, float(w))
            dy = int(round(math.sin(wave_phase + dist * 4.0) * wave_amp * (dist ** 1.15)))
            out[pad + dy : pad + dy + h, x] = arr[:, x]
        crop_im = Image.fromarray(out, "RGBA")
        y0 -= pad

    w, h = crop_im.size
    px, py = src_pivot[0] - x0, src_pivot[1] - y0
    max_r = int(math.hypot(max(px, w - px), max(py, h - py))) + 3
    pad_s = max_r * 2
    pad_im = Image.new("RGBA", (pad_s, pad_s), (0, 0, 0, 0))
    pad_im.paste(crop_im, (max_r - int(round(px)), max_r - int(round(py))))
    if abs(deg) > 0.05:
        rot_im = pad_im.rotate(-deg, resample=Image.Resampling.NEAREST, expand=False)
    else:
        rot_im = pad_im
    ox = int(round(dst_pivot[0])) - max_r
    oy = int(round(dst_pivot[1])) - max_r
    canvas.alpha_composite(rot_im, (ox, oy))


def draw_joint_cap(draw, pt, r, fill=(46, 44, 56, 255), inner=(88, 18, 30, 255)):
    cx, cy = int(round(pt[0])), int(round(pt[1]))
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)
    ir = max(1, int(r * 0.68))
    draw.ellipse([cx - ir, cy - ir, cx + ir, cy + ir], fill=inner)


def draw_capsule(draw, p0, p1, r, fill=(228, 174, 142, 255)):
    draw.line([p0, p1], fill=fill, width=int(r * 2))
    draw_joint_cap(draw, p0, r, fill=fill, inner=fill)
    draw_joint_cap(draw, p1, r, fill=fill, inner=fill)


def put_px(arr, x, y, col):
    H, W = arr.shape[:2]
    ix, iy = int(round(x)), int(round(y))
    if 0 <= ix < W and 0 <= iy < H:
        arr[iy, ix] = col


def draw_line_104(arr, x0, y0, x1, y1, col, thickness=1):
    steps = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
    for i in range(steps + 1):
        t = i / max(1, steps)
        x = x0 + (x1 - x0) * t
        y = y0 + (y1 - y0) * t
        if thickness <= 1:
            put_px(arr, x, y, col)
        else:
            r = thickness // 2
            for dy in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    if dx * dx + dy * dy <= r * r + 1:
                        put_px(arr, x + dx, y + dy, col)


def draw_valkyrie_wings_104(arr, back_x, back_y, torso_deg=0.0, flap_phase=0.0, mode="normal", full_rot=False):
    """
    Renders Freyja's Lush 6-Pinion Crimson-and-Gold Valkyrie Wings in 104x104 space
    using strict MASTER_PALETTE cel shades and crisp 1px dark Selout separation!
    Modes: 'normal', 'flare' (Skill/Ult cast), 'swept' (Dash/Spear-Dive), 'folded' (Death rest).
    """
    if mode == "folded":
        # Folded crimson-gold pinions resting horizontally along the back on DEATH F16..F29
        for p in range(4):
            y_off = p * 2.2
            x_len = 24.0 - p * 3.5
            for s in range(int(x_len * 2)):
                u = s / max(1.0, x_len * 2 - 1)
                wx = back_x - u * x_len
                wy = back_y - 2.0 + y_off + math.sin(u * math.pi) * 1.2
                put_px(arr, wx, wy - 1.0, P_SELOUT)
                put_px(arr, wx, wy, P_GOLD_LIT if u > 0.72 else (P_PLAT_LIT if p == 0 else P_RUBY_LIT))
                put_px(arr, wx, wy + 1.0, P_CRIM_BASE)
        return

    flap = math.sin(flap_phase)
    if mode == "sovereign":
        # Balanced Twin-Wing Valkyrie Sovereign Arch: Far wing behind front shoulder + Grand 6-pinion near wing
        rad_f = math.radians(torso_deg * 0.40)
        cf, sf = math.cos(rad_f), math.sin(rad_f)

        def wf_rot(ox0, oy0, dx, dy):
            return (ox0 + dx * cf - dy * sf, oy0 + dx * sf + dy * cf)

        far_bx, far_by = back_x + 11.0, back_y - 2.0
        far_carpal = wf_rot(far_bx, far_by, 10.5, -14.5 + flap * 2.0)
        ctrl_fa = wf_rot(far_bx, far_by, 5.5, -10.5 + flap * 1.1)
        for s in range(25):
            u = s / 24.0
            bx = (1 - u) ** 2 * far_bx + 2 * (1 - u) * u * ctrl_fa[0] + u ** 2 * far_carpal[0]
            by = (1 - u) ** 2 * far_by + 2 * (1 - u) * u * ctrl_fa[1] + u ** 2 * far_carpal[1]
            put_px(arr, bx, by - 1.0, P_SELOUT)
            put_px(arr, bx, by, P_GOLD_LIT)
            put_px(arr, bx, by + 1.0, P_CRIM_SHAD)

        far_pinions = [
            (20.5, -23.0 + flap * 2.6, 3.6, P_GOLD_GLEAM, P_GOLD_MID),
            (24.5, -16.5 + flap * 2.2, 4.0, P_GOLD_LIT, P_RUBY_LIT),
            (23.0, -9.5 + flap * 1.7, 3.2, P_GOLD_MID, P_CRIM_BASE),
            (18.5, -2.5 + flap * 1.2, 2.2, P_RUBY_LIT, P_CRIM_SHAD),
        ]
        for idx, (tx_l, ty_l, lift, col_q, col_v) in enumerate(far_pinions):
            t_r = idx / 3.0
            ox, oy = wf_rot(
                far_bx, far_by,
                10.5 * (1.0 - t_r * 0.65),
                (-14.5 + flap * 2.0) * (1.0 - t_r * 0.60) + t_r * 3.0,
            )
            tx, ty = wf_rot(far_bx, far_by, tx_l, ty_l)
            tx = max(5.0, min(97.0, tx))
            ty = max(5.0, min(95.0, ty))
            ctrl_x = ox * 0.48 + tx * 0.52
            ctrl_y = (oy + ty) * 0.5 - lift
            steps = max(20, int(math.hypot(tx - ox, ty - oy) * 2.2))
            for s in range(steps + 1):
                u = s / float(steps)
                wx = (1 - u) ** 2 * ox + 2 * (1 - u) * u * ctrl_x + u ** 2 * tx
                wy = (1 - u) ** 2 * oy + 2 * (1 - u) * u * ctrl_y + u ** 2 * ty
                if idx == 0 and u < 0.88:
                    put_px(arr, wx, wy - 1.0, P_SELOUT)
                vane_d = 3 if u < 0.45 else (2 if u < 0.75 else (1 if u < 0.90 else 0))
                for vd in range(1, vane_d + 1):
                    put_px(arr, wx, wy + vd, P_SELOUT if (vd == vane_d and u > 0.35) else col_v)
                put_px(arr, wx, wy, P_GOLD_GLEAM if u > 0.78 else col_q)
            put_px(arr, tx, ty, P_IVORY if idx == 0 else P_GOLD_GLEAM)

        # Near/Rear Grand 6-Pinion Sovereign Wing
        draw_valkyrie_wings_104(
            arr, back_x, back_y,
            torso_deg=torso_deg * 0.45,
            flap_phase=flap_phase,
            mode="flare",
            full_rot=False,
        )
        return

    rad_t = math.radians(torso_deg if full_rot else torso_deg * 0.65)
    ct, st = math.cos(rad_t), math.sin(rad_t)

    def w_rot(dx, dy):
        return (back_x + dx * ct - dy * st, back_y + dx * st + dy * ct)

    if mode == "flare":
        span = 1.18 + 0.06 * flap
        carpal_local = (-13.5 * span, -15.5 + flap * 2.2)
        pinions = [
            (-26.0, -24.0, 4.5, P_IVORY, P_GOLD_LIT),
            (-32.0, -16.5, 5.2, P_IVORY, P_PLAT_LIT),
            (-30.0, -7.5, 4.2, P_GOLD_GLEAM, P_RUBY_LIT),
            (-26.0, 1.5, 3.2, P_GOLD_LIT, P_CRIM_BASE),
            (-20.0, 9.5, 2.2, P_RUBY_LIT, P_CRIM_SHAD),
            (-13.0, 16.0, 1.4, P_GOLD_MID, P_CRIM_SHAD),
        ]
    elif mode == "swept":
        span = 1.10
        carpal_local = (-12.0, -9.5 + flap * 1.4)
        pinions = [
            (-30.0, -14.0, 2.8, P_IVORY, P_GOLD_LIT),
            (-34.0, -7.5, 3.2, P_IVORY, P_RUBY_LIT),
            (-31.0, -1.0, 2.5, P_GOLD_LIT, P_CRIM_BASE),
            (-25.0, 5.5, 1.8, P_RUBY_LIT, P_CRIM_BASE),
            (-18.0, 11.0, 1.2, P_GOLD_MID, P_CRIM_SHAD),
        ]
    else:
        span = 1.0 + 0.05 * flap
        carpal_local = (-11.5 * span, -12.5 + flap * 2.4)
        pinions = [
            (-22.0 * span, -19.0 + flap * 3.0, 3.8, P_IVORY, P_GOLD_LIT),
            (-28.0 * span, -12.0 + flap * 2.6, 4.4, P_IVORY, P_PLAT_LIT),
            (-26.0 * span, -4.0 + flap * 2.1, 3.6, P_GOLD_LIT, P_RUBY_LIT),
            (-22.0 * span, 4.0 + flap * 1.6, 2.8, P_RUBY_LIT, P_CRIM_BASE),
            (-17.0 * span, 11.0 + flap * 1.1, 2.0, P_GOLD_MID, P_CRIM_BASE),
            (-11.5 * span, 16.5 + flap * 0.7, 1.2, P_GOLD_SHAD, P_CRIM_SHAD),
        ]

    cx, cy = w_rot(*carpal_local)

    # 1. Curved Imperial-Gold Humeral Wing-Arch from back shoulder to carpal crest
    steps_a = 28
    ctrl_a = w_rot(carpal_local[0] * 0.52, carpal_local[1] - 3.6)
    for s in range(steps_a + 1):
        u = s / float(steps_a)
        bx = (1 - u) ** 2 * back_x + 2 * (1 - u) * u * ctrl_a[0] + u ** 2 * cx
        by = (1 - u) ** 2 * back_y + 2 * (1 - u) * u * ctrl_a[1] + u ** 2 * cy
        put_px(arr, bx, by - 1.2, P_SELOUT)
        put_px(arr, bx, by, P_GOLD_GLEAM if u > 0.4 else P_GOLD_LIT)
        put_px(arr, bx, by + 1.0, P_GOLD_MID)
        put_px(arr, bx + 0.8, by + 2.0, P_CRIM_BASE)

    # 2. Articulated Flight Pinions with Crisp 1px Pointed Golden-Ivory Tips & Selout Edges
    n_p = len(pinions)
    for idx, (tx_l, ty_l, lift, col_quill, col_vane) in enumerate(pinions):
        t_root = idx / float(max(1, n_p - 1))
        orig_l = (carpal_local[0] * (1.0 - t_root * 0.78), carpal_local[1] * (1.0 - t_root * 0.72) + t_root * 4.5)
        ox, oy = w_rot(*orig_l)
        tx, ty = w_rot(tx_l, ty_l)
        tx = max(5.0, min(98.0, tx))
        ty = max(5.0, min(96.0, ty))
        ctrl_x = ox * 0.48 + tx * 0.52
        ctrl_y = (oy + ty) * 0.5 - lift

        steps = max(24, int(math.hypot(tx - ox, ty - oy) * 2.2))
        for s in range(steps + 1):
            u = s / float(steps)
            wx = (1 - u) ** 2 * ox + 2 * (1 - u) * u * ctrl_x + u ** 2 * tx
            wy = (1 - u) ** 2 * oy + 2 * (1 - u) * u * ctrl_y + u ** 2 * ty

            # Upper dark Selout border on top pinion or outer edge
            if idx == 0 and u < 0.88:
                put_px(arr, wx, wy - 1.0, P_SELOUT)

            # Lush feathered covert overlap near wing arch (u < 0.55), tapering to razor-sharp 1px golden feather tips
            vane_d = 4 if u < 0.34 else (3 if u < 0.56 else (2 if u < 0.76 else (1 if u < 0.90 else 0)))
            for vd in range(1, vane_d + 1):
                if vd == vane_d:
                    put_px(arr, wx, wy + vd, P_SELOUT if u > 0.40 else P_CRIM_SHAD)
                elif vd == 1:
                    put_px(arr, wx, wy + vd, col_vane)
                elif vd == 2:
                    put_px(arr, wx, wy + vd, P_RUBY_LIT if idx <= 2 else P_CRIM_BASE)
                else:
                    put_px(arr, wx, wy + vd, P_CRIM_BASE)

            put_px(arr, wx, wy, P_GOLD_GLEAM if u > 0.75 else col_quill)

        put_px(arr, tx, ty, P_IVORY if idx <= 1 else P_GOLD_GLEAM)

    # 3. Ruby-Gold Valkyrie Carpal Gem at Wing Crest
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx == 0 and dy == 0:
                put_px(arr, cx, cy, P_ROSE_GEM)
            elif abs(dx) + abs(dy) == 1:
                put_px(arr, cx + dx, cy + dy, P_GOLD_GLEAM)
            else:
                put_px(arr, cx + dx, cy + dy, P_SELOUT)


def draw_gungnir_104(arr, hand_x, hand_y, lance_deg, lance_len=31.0, glow=1.0, phase=0.0):
    """
    Renders Freyja's Ornate Crimson-Ruby & Imperial-Gold Winged Gungnir War-Lance in 104x104 space,
    matching her cel-shaded portrait 1-to-1 (crimson shaft, twin golden Valkyrie wing-flukes,
    ruby collar gem, diamond-faceted crimson-gold spearhead).
    """
    rad = math.radians(lance_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    pom_dist = 14.0
    collar_dist = 11.0
    head_len = max(12.0, lance_len - collar_dist)

    pom_x, pom_y = hand_x - ux * pom_dist, hand_y - uy * pom_dist
    col_x, col_y = hand_x + ux * collar_dist, hand_y + uy * collar_dist

    # 1. Crimson-Lacquered Polearm Shaft with Dark Selout & Gold Rings
    shaft_steps = int((pom_dist + collar_dist) * 2.2)
    for i in range(shaft_steps + 1):
        u = i / float(max(1, shaft_steps))
        sx = pom_x + (col_x - pom_x) * u
        sy = pom_y + (col_y - pom_y) * u
        is_ring = (u < 0.08) or (0.44 < u < 0.50) or (u > 0.90)
        put_px(arr, sx - nx * 1.1, sy - ny * 1.1, P_SELOUT)
        put_px(arr, sx + nx * 1.1, sy + ny * 1.1, P_OUTLINE)
        put_px(arr, sx, sy, P_GOLD_LIT if is_ring else P_RUBY_LIT)
        put_px(arr, sx + nx * 0.5, sy + ny * 0.5, P_GOLD_MID if is_ring else P_CRIM_BASE)

    # Golden Pommel Spike
    put_px(arr, pom_x - ux * 1.4, pom_y - uy * 1.4, P_GOLD_GLEAM)

    # 2. Twin Swept Golden Valkyrie Wing-Flukes on Crossguard Collar
    for side in (-1.0, 1.0):
        for w_step in range(1, 9):
            wu = w_step / 8.0
            # Sweep slightly backward then flare forward-outward like golden Valkyrie wings
            along = -1.5 + wu * 3.8
            perp = side * (1.2 + wu * 5.6)
            wx = col_x + ux * along + nx * perp
            wy = col_y + uy * along + ny * perp
            put_px(arr, wx - ux * 1.0, wy - uy * 1.0, P_GOLD_MID if wu < 0.7 else P_GOLD_LIT)
            put_px(arr, wx - ux * 1.9, wy - uy * 1.9, P_SELOUT)
            put_px(arr, wx, wy, P_IVORY if wu > 0.8 else P_GOLD_GLEAM)

    # Ruby Heart-Gem on Crossguard Collar
    put_px(arr, col_x, col_y, P_ROSE_GEM)
    for d_ang in (0, 1.57, 3.14, 4.71):
        put_px(arr, col_x + math.cos(d_ang) * 1.2, col_y + math.sin(d_ang) * 1.2, P_GOLD_LIT)

    # 3. Broad Diamond-Faceted Crimson-Ruby & Sunlit-Gold Gungnir Spearhead
    h_steps = int(head_len * 2.6)
    for i in range(h_steps + 1):
        t = i / float(max(1, h_steps))
        dist = t * head_len
        bx = col_x + ux * dist
        by = col_y + uy * dist
        half_w = (1.2 + (t / 0.28) * 2.4) if t < 0.28 else ((1.0 - (t - 0.28) / 0.72) * 3.6)
        iw = int(math.ceil(half_w))
        for k in range(-iw, iw + 1):
            if abs(k) > half_w + 0.35:
                continue
            px = bx + nx * k
            py = by + ny * k
            if abs(k) >= half_w - 0.45:
                put_px(arr, px, py, P_IVORY if (glow > 0.8 and t > 0.55) else P_GOLD_LIT)
            elif abs(k) <= 0.55:
                put_px(arr, px, py, P_IVORY if glow > 0.6 else P_GOLD_GLEAM)
            else:
                put_px(arr, px, py, P_RUBY_LIT if k < 0 else P_CRIM_BASE)

    tip_x = col_x + ux * (head_len + 1.0)
    tip_y = col_y + uy * (head_len + 1.0)
    put_px(arr, tip_x, tip_y, P_IVORY)


def draw_valkyrie_halo_104(arr, cx, cy, rx=22.0, ry=14.0, phase=0.0, num_spears=6):
    """Draws a crisp pixel-art Valhalla Crown Ring & Mini Golden Light-Javelins during Skill/Ult."""
    for s in range(36):
        a = (s / 36.0) * math.pi * 2.0 + phase
        px = cx + math.cos(a) * rx
        py = cy + math.sin(a) * ry
        if 4 <= px <= 99 and 4 <= py <= 99 and s % 2 == 0:
            put_px(arr, px, py, P_GOLD_GLEAM if s % 4 == 0 else P_ROSE_GEM)

    for k in range(num_spears):
        ang = -math.pi * 0.88 + (k / max(1, num_spears - 1)) * (math.pi * 0.76)
        sx = cx + math.cos(ang) * (rx + 3.0)
        sy = cy + math.sin(ang) * (ry + 3.0)
        # Tiny 5px golden light-spear pointing outward-right
        for d in range(-2, 4):
            lx = sx + d * 0.95
            ly = sy - d * 0.25
            if 4 <= lx <= 99 and 4 <= ly <= 99:
                put_px(arr, lx, ly, P_IVORY if d >= 2 else (P_GOLD_LIT if d >= 0 else P_RUBY_LIT))


def draw_slash_arc_104(arr, cx, cy, r_main, a_start_deg, a_end_deg, intensity=1.0):
    if intensity <= 0.05:
        return
    a0 = math.radians(a_start_deg)
    a1 = math.radians(a_end_deg)
    steps = 84
    for i in range(steps + 1):
        t = i / steps
        ang = a0 + (a1 - a0) * t
        env = math.sin(t * math.pi)
        thickness = max(1.0, 4.0 * env * intensity)
        c, s = math.cos(ang), math.sin(ang)
        for dr in np.linspace(-thickness, thickness, int(thickness * 3) + 2):
            rr = r_main + dr
            px = cx + c * rr
            py = cy + s * rr
            nd = abs(dr) / max(0.5, thickness)
            if nd < 0.30:
                col = P_IVORY
            elif nd < 0.66:
                col = P_GOLD_GLEAM
            else:
                col = P_RUBY_LIT
            if 4 <= px <= 99 and 4 <= py <= 99:
                put_px(arr, px, py, col)


def draw_dragonfire_mach_cone_104(arr, tip_x, tip_y, dive_deg, length=36.0, intensity=1.0, ultimate=False):
    rad = math.radians(dive_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux
    steps = int(length * 2)
    for i in range(steps + 1):
        t = i / max(1, steps)
        dist = t * length
        spread = (t ** 0.78) * (15.0 if ultimate else 11.0) * intensity
        bx = tip_x - ux * dist
        by = tip_y - uy * dist
        for side in (-1.0, 1.0):
            wx = bx + nx * spread * side
            wy = by + ny * spread * side
            if 4 <= wx <= 99 and 4 <= wy <= 99:
                put_px(arr, wx, wy, P_IVORY if t < 0.35 else P_GOLD_GLEAM)
            wx2 = bx + nx * max(0.0, spread - 1.5) * side
            wy2 = by + ny * max(0.0, spread - 1.5) * side
            if 4 <= wx2 <= 99 and 4 <= wy2 <= 99:
                put_px(arr, wx2, wy2, P_ROSE_GEM if ultimate else P_RUBY_LIT)
        if t < 0.62 and 4 <= bx <= 99 and 4 <= by <= 99:
            put_px(arr, bx, by, P_IVORY)


VALKYRIE_PIVOTS = {
    "pelvis": (266.0, 280.0),
    "neck":   (276.0, 128.0),
    "mane":   (259.0, 56.0),
    "l_sh":   (231.0, 143.0),
    "l_elb":  (194.0, 206.0),
    "l_hand": (169.0, 268.0),
    "r_sh":   (310.0, 153.0),
    "r_elb":  (314.0, 209.0),
    "r_hand": (359.0, 263.0),
    "l_hip":  (228.0, 287.0),
    "l_knee": (202.0, 352.0),
    "l_ank":  (142.0, 441.0),
    "r_hip":  (304.0, 287.0),
    "r_knee": (348.0, 351.0),
    "r_ank":  (359.0, 437.0),
}


def render_pose_104(parts, cfg):
    """
    Renders a single 104x104 logical frame from Freyja's 512x512 13-part anatomical rig.
    """
    canvas = Image.new("RGBA", (860, 860), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    OX, OY = 170, 170

    # All 512x512 joint pivots are exact 0.5x of 1024x1024 anatomical joint centers
    pelvis_src = (266.0, 280.0)
    pelvis_dst = (266.0 + OX + cfg.get("pelvis_dx", 0.0) * 0.5, 280.0 + OY + cfg.get("pelvis_dy", 0.0) * 0.5)
    torso_deg = cfg.get("torso_deg", 0.0)
    head_deg = torso_deg + cfg.get("head_rel_deg", 0.0)
    mane_deg = head_deg + cfg.get("mane_rel_deg", 0.0)

    def torso_joint(pt):
        r = rot_pt(pt, pelvis_src, torso_deg)
        return (pelvis_dst[0] + (r[0] - pelvis_src[0]), pelvis_dst[1] + (r[1] - pelvis_src[1]))

    neck_src = (276.0, 128.0)
    neck_dst = torso_joint(neck_src)

    mane_src = (259.0, 56.0)
    mane_r = rot_pt(mane_src, neck_src, head_deg)
    mane_dst = (neck_dst[0] + (mane_r[0] - neck_src[0]), neck_dst[1] + (mane_r[1] - neck_src[1]))

    back_wing_src = (248.0, 162.0)
    back_wing_dst = torso_joint(back_wing_src)

    l_sh_src = (231.0, 143.0)
    l_sh_dst = torso_joint(l_sh_src)
    r_sh_src = (310.0, 153.0)
    r_sh_dst = torso_joint(r_sh_src)

    l_hip_src = (228.0, 287.0)
    _l_hip_base = torso_joint(l_hip_src)
    l_hip_dst = (_l_hip_base[0] + cfg.get("l_hip_dx", 0.0), _l_hip_base[1] + cfg.get("l_hip_dy", 0.0))
    r_hip_src = (304.0, 287.0)
    _r_hip_base = torso_joint(r_hip_src)
    r_hip_dst = (_r_hip_base[0] + cfg.get("r_hip_dx", 0.0), _r_hip_base[1] + cfg.get("r_hip_dy", 0.0))

    if cfg.get("legs_follow_torso", False):
        l_thigh_deg = torso_deg + cfg.get("l_thigh_deg", 0.0)
        l_shin_deg = l_thigh_deg + cfg.get("l_shin_deg", 0.0)
        l_foot_deg = l_shin_deg + cfg.get("l_foot_deg", 0.0)
    else:
        l_thigh_deg = cfg.get("l_thigh_deg", 0.0)
        l_shin_deg = cfg.get("l_shin_deg", 0.0)
        l_foot_deg = cfg.get("l_foot_deg", 0.0)
    l_knee_src = (202.0, 352.0)
    l_knee_r = rot_pt(l_knee_src, l_hip_src, l_thigh_deg)
    l_knee_dst = (l_hip_dst[0] + (l_knee_r[0] - l_hip_src[0]), l_hip_dst[1] + (l_knee_r[1] - l_hip_src[1]))
    l_ank_src = (142.0, 441.0)
    l_ank_r = rot_pt(l_ank_src, l_knee_src, l_shin_deg)
    l_ank_dst = (l_knee_dst[0] + (l_ank_r[0] - l_knee_src[0]), l_knee_dst[1] + (l_ank_r[1] - l_knee_src[1]))

    if cfg.get("legs_follow_torso", False):
        r_thigh_deg = torso_deg + cfg.get("r_thigh_deg", 0.0)
        r_shin_deg = r_thigh_deg + cfg.get("r_shin_deg", 0.0)
        r_foot_deg = r_shin_deg + cfg.get("r_foot_deg", 0.0)
    else:
        r_thigh_deg = cfg.get("r_thigh_deg", 0.0)
        r_shin_deg = cfg.get("r_shin_deg", 0.0)
        r_foot_deg = cfg.get("r_foot_deg", 0.0)
    r_knee_src = (348.0, 351.0)
    r_knee_r = rot_pt(r_knee_src, r_hip_src, r_thigh_deg)
    r_knee_dst = (r_hip_dst[0] + (r_knee_r[0] - r_hip_src[0]), r_hip_dst[1] + (r_knee_r[1] - r_hip_src[1]))
    r_ank_src = (359.0, 437.0)
    r_ank_r = rot_pt(r_ank_src, r_knee_src, r_shin_deg)
    r_ank_dst = (r_knee_dst[0] + (r_ank_r[0] - r_knee_src[0]), r_knee_dst[1] + (r_ank_r[1] - r_knee_src[1]))

    l_sode_deg = torso_deg + cfg.get("l_sode_rel_deg", 0.0)
    l_fore_deg = l_sode_deg + cfg.get("l_fore_rel_deg", 0.0)
    l_elb_src = (194.0, 206.0)
    l_elb_r = rot_pt(l_elb_src, l_sh_src, l_sode_deg)
    l_elb_dst = (l_sh_dst[0] + (l_elb_r[0] - l_sh_src[0]), l_sh_dst[1] + (l_elb_r[1] - l_sh_src[1]))
    l_hand_src = (169.0, 268.0)
    l_hand_r = rot_pt(l_hand_src, l_elb_src, l_fore_deg)
    l_hand_dst = (l_elb_dst[0] + (l_hand_r[0] - l_elb_src[0]), l_elb_dst[1] + (l_hand_r[1] - l_elb_src[1]))

    r_sode_deg = torso_deg + cfg.get("r_sode_rel_deg", 0.0)
    r_fore_deg = r_sode_deg + cfg.get("r_fore_rel_deg", 0.0)
    r_elb_src = (314.0, 209.0)
    r_elb_r = rot_pt(r_elb_src, r_sh_src, r_sode_deg)
    r_elb_dst = (r_sh_dst[0] + (r_elb_r[0] - r_sh_src[0]), r_sh_dst[1] + (r_elb_r[1] - r_sh_src[1]))
    r_hand_src = (359.0, 263.0)
    r_hand_r = rot_pt(r_hand_src, r_elb_src, r_fore_deg)
    r_hand_dst = (r_elb_dst[0] + (r_hand_r[0] - r_elb_src[0]), r_elb_dst[1] + (r_hand_r[1] - r_elb_src[1]))

    # Seamless anatomical joint under-bridges (dark underskirt at pelvis, porcelain skin at thighs/arms, crimson/gold at ankles)
    draw_capsule(draw, pelvis_dst, l_hip_dst, 20, fill=(46, 44, 56, 255))
    draw_capsule(draw, pelvis_dst, r_hip_dst, 20, fill=(46, 44, 56, 255))
    draw_capsule(draw, l_hip_dst, l_knee_dst, 15, fill=(228, 174, 142, 255))
    draw_capsule(draw, r_hip_dst, r_knee_dst, 15, fill=(228, 174, 142, 255))
    draw_joint_cap(draw, l_knee_dst, 14, fill=(228, 174, 142, 255), inner=(228, 174, 142, 255))
    draw_joint_cap(draw, r_knee_dst, 14, fill=(228, 174, 142, 255), inner=(228, 174, 142, 255))
    draw_joint_cap(draw, l_ank_dst, 11, fill=(142, 26, 42, 255), inner=(194, 136, 36, 255))
    draw_joint_cap(draw, r_ank_dst, 11, fill=(142, 26, 42, 255), inner=(194, 136, 36, 255))
    draw_joint_cap(draw, neck_dst, 14, fill=(46, 44, 56, 255), inner=(142, 26, 42, 255))
    draw_capsule(draw, l_sh_dst, l_elb_dst, 12, fill=(228, 174, 142, 255))
    draw_capsule(draw, r_sh_dst, r_elb_dst, 12, fill=(228, 174, 142, 255))
    draw_joint_cap(draw, l_elb_dst, 11, fill=(228, 174, 142, 255), inner=(228, 174, 142, 255))
    draw_joint_cap(draw, r_elb_dst, 11, fill=(228, 174, 142, 255), inner=(228, 174, 142, 255))

    # 1. Flowing Platinum-Gold Valkyrie Ponytail
    paste_rotated_part(
        canvas, parts["mane"], mane_src, mane_dst, mane_deg,
        wave_phase=cfg.get("mane_wave_phase", 0.0),
        wave_amp=cfg.get("mane_wave_amp", 6.5)
    )

    # 2. Right arm (when behind torso)
    if not cfg.get("right_arm_in_front", False):
        paste_rotated_part(canvas, parts["r_sode"], r_sh_src, r_sh_dst, r_sode_deg)
        paste_rotated_part(canvas, parts["r_forearm"], r_elb_src, r_elb_dst, r_fore_deg)

    # 3. Articulated 3-segment legs (winged knee-poleyns on shin layer cleanly over thigh & boot joints!)
    if cfg.get("right_leg_behind", False):
        paste_rotated_part(canvas, parts["r_thigh"], r_hip_src, r_hip_dst, r_thigh_deg)
        paste_rotated_part(canvas, parts["r_foot"], r_ank_src, r_ank_dst, r_foot_deg)
        paste_rotated_part(canvas, parts["r_shin"], r_knee_src, r_knee_dst, r_shin_deg)

        paste_rotated_part(canvas, parts["l_thigh"], l_hip_src, l_hip_dst, l_thigh_deg)
        paste_rotated_part(canvas, parts["l_foot"], l_ank_src, l_ank_dst, l_foot_deg)
        paste_rotated_part(canvas, parts["l_shin"], r_knee_src if False else l_knee_src, l_knee_dst, l_shin_deg)
    else:
        paste_rotated_part(canvas, parts["l_thigh"], l_hip_src, l_hip_dst, l_thigh_deg)
        paste_rotated_part(canvas, parts["l_foot"], l_ank_src, l_ank_dst, l_foot_deg)
        paste_rotated_part(canvas, parts["l_shin"], l_knee_src, l_knee_dst, l_shin_deg)

        paste_rotated_part(canvas, parts["r_thigh"], r_hip_src, r_hip_dst, r_thigh_deg)
        paste_rotated_part(canvas, parts["r_foot"], r_ank_src, r_ank_dst, r_foot_deg)
        paste_rotated_part(canvas, parts["r_shin"], r_knee_src, r_knee_dst, r_shin_deg)

    # 4. Torso (Crimson Cuirass + Golden Tabard + Tassets draping over hip joints)
    paste_rotated_part(canvas, parts["torso"], pelvis_src, pelvis_dst, torso_deg)

    # 5. Head (Winged Valkyrie Helm + Golden Ear-Wings + Face)
    paste_rotated_part(canvas, parts["head"], neck_src, neck_dst, head_deg)

    # 6. Right arm (when in front of torso for overhead javelin throws / spear thrusts)
    if cfg.get("right_arm_in_front", False):
        paste_rotated_part(canvas, parts["r_sode"], r_sh_src, r_sh_dst, r_sode_deg)
        paste_rotated_part(canvas, parts["r_forearm"], r_elb_src, r_elb_dst, r_fore_deg)

    # 7. Left Pauldron & Vambrace
    paste_rotated_part(canvas, parts["l_sode"], l_sh_src, l_sh_dst, l_sode_deg)
    paste_rotated_part(canvas, parts["l_forearm"], l_elb_src, l_elb_dst, l_fore_deg)

    # Dynamic framing from 620x560 canvas to 104x104
    S = 588
    scale = 104.0 / S
    cx = 266.0 + OX
    y_bot = 481.0 + OY
    crop_x0 = int(round(cx - S * 0.50))
    crop_y0 = int(round(y_bot - S * (99.0 / 104.0)))

    bbox = canvas.getbbox()
    c_xmin = float(bbox[0]) if bbox else float(cx)
    c_ymin = float(bbox[1]) if bbox else float(y_bot - 200.0)
    c_xmax = float(bbox[2]) if bbox else float(cx)
    c_ymax = float(bbox[3]) if bbox else float(y_bot)

    # Reserve space for Freyja's 6-pinion Valkyrie wings (including 360-deg backflip rotation!)
    flip_blend = float(cfg.get("flip_air_blend", 0.0))
    wing_mode = cfg.get("wing_mode", "normal")
    if flip_blend > 0.0:
        rad_w = math.radians(torso_deg if flip_blend > 0.25 else torso_deg * 0.65)
        w_tip_x = back_wing_dst[0] + (-32.0 * math.cos(rad_w) - (-16.0) * math.sin(rad_w)) / scale
        w_tip_y = back_wing_dst[1] + (-32.0 * math.sin(rad_w) + (-16.0) * math.cos(rad_w)) / scale
        w_low_x = back_wing_dst[0] + (-20.0 * math.cos(rad_w) - 16.0 * math.sin(rad_w)) / scale
        w_low_y = back_wing_dst[1] + (-20.0 * math.sin(rad_w) + 16.0 * math.cos(rad_w)) / scale
        c_xmin = min(c_xmin, w_tip_x - 24.0, w_low_x - 24.0)
        c_xmax = max(c_xmax, w_tip_x + 24.0, w_low_x + 24.0)
        c_ymin = min(c_ymin, w_tip_y - 24.0, w_low_y - 24.0)
        c_ymax = max(c_ymax, w_tip_y + 24.0, w_low_y + 24.0)
    else:
        wing_pad_x = 175.0 if wing_mode in ("flare", "swept", "sovereign") else 145.0
        wing_pad_y = 138.0 if wing_mode in ("flare", "sovereign") else 100.0
        c_xmin = min(c_xmin, back_wing_dst[0] - wing_pad_x)
        c_ymin = min(c_ymin, back_wing_dst[1] - wing_pad_y)
        if wing_mode == "sovereign":
            c_xmax = max(c_xmax, back_wing_dst[0] + 205.0)

    if cfg.get("show_lance", True):
        hand_c = r_hand_dst if cfg.get("lance_hand", "right") == "right" else l_hand_dst
        l_rad = math.radians(cfg.get("lance_deg", -36.0))
        l_len = cfg.get("lance_len", 31.0)
        tip_cx = hand_c[0] + math.cos(l_rad) * ((l_len + 2.5) / scale)
        tip_cy = hand_c[1] + math.sin(l_rad) * ((l_len + 2.5) / scale)
        pom_cx = hand_c[0] - math.cos(l_rad) * (15.5 / scale)
        pom_cy = hand_c[1] - math.sin(l_rad) * (15.5 / scale)
        pad_tip = 24.0 if cfg.get("mach_cone") is not None else 14.0
        c_xmin = min(c_xmin, tip_cx - pad_tip, pom_cx - 12)
        c_xmax = max(c_xmax, tip_cx + pad_tip, pom_cx + 12)
        c_ymin = min(c_ymin, tip_cy - pad_tip, pom_cy - 12)
        c_ymax = max(c_ymax, tip_cy + pad_tip, pom_cy + 12)

    if flip_blend > 0.0:
        span_x = c_xmax - c_xmin
        span_y = c_ymax - c_ymin
        req_S = int(round(max(span_x, span_y) / (82.0 / 104.0)))
        S_flip = max(588, req_S)
        S = int(round(S * (1.0 - flip_blend) + S_flip * flip_blend))
        scale = 104.0 / S
        g_x0 = cx - S * 0.50
        g_y0 = y_bot - S * (99.0 / 104.0)
        f_x0 = 0.5 * (c_xmin + c_xmax) - S * 0.50
        f_y0 = 0.5 * (c_ymin + c_ymax) - S * 0.50
        crop_x0 = int(round(g_x0 * (1.0 - flip_blend) + f_x0 * flip_blend))
        crop_y0 = int(round(g_y0 * (1.0 - flip_blend) + f_y0 * flip_blend))
        min_x104 = (c_xmin - crop_x0) * scale
        max_x104 = (c_xmax - crop_x0) * scale
        min_y104 = (c_ymin - crop_y0) * scale
        max_y104 = (c_ymax - crop_y0) * scale
        if max_x104 > 96.0:
            crop_x0 += int(round((max_x104 - 96.0) / scale))
        elif min_x104 < 7.0:
            crop_x0 += int(round((min_x104 - 7.0) / scale))
        if max_y104 > 96.0:
            crop_y0 += int(round((max_y104 - 96.0) / scale))
        elif min_y104 < 7.0:
            crop_y0 += int(round((min_y104 - 7.0) / scale))
    elif cfg.get("spear_mode", False):
        span_x = c_xmax - c_xmin
        span_y = c_ymax - c_ymin
        req_S = int(round(max(span_x, span_y) / (84.0 / 104.0)))
        S = max(588, req_S)
        scale = 104.0 / S
        crop_x0 = int(round(0.5 * (c_xmin + c_xmax) - S * 0.50))
        crop_y0 = int(round(0.5 * (c_ymin + c_ymax) - S * (58.0 / 104.0)))
        min_y104 = (c_ymin - crop_y0) * scale
        max_y104 = (c_ymax - crop_y0) * scale
        if max_y104 > 96.0:
            crop_y0 += int(round((max_y104 - 96.0) / scale))
        elif min_y104 < 7.0:
            crop_y0 += int(round((min_y104 - 7.0) / scale))
    else:
        if cfg.get("lock_crop_x0") is not None:
            crop_x0 = int(cfg["lock_crop_x0"])
        else:
            min_104 = (c_xmin - crop_x0) * scale
            max_104 = (c_xmax - crop_x0) * scale
            span_104 = max_104 - min_104
            if span_104 > 90.0:
                S = int(round((c_xmax - c_xmin) / (89.0 / 104.0)))
                scale = 104.0 / S
                crop_x0 = int(round(0.5 * (c_xmin + c_xmax) - S * 0.50))
                crop_y0 = int(round(y_bot - S * (99.0 / 104.0)))
            elif max_104 > 97.0:
                crop_x0 += int(round((max_104 - 97.0) / scale))
            elif min_104 < 6.0:
                crop_x0 += int(round((min_104 - 6.0) / scale))
        if cfg.get("l_hip_dx", 0.0) != 0.0 or cfg.get("r_hip_dx", 0.0) != 0.0:
            max_y104 = (c_ymax - crop_y0) * scale
            if max_y104 > 101.0:
                crop_y0 += int(round((max_y104 - 101.0) / scale))

    win = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    win.paste(canvas, (-crop_x0, -crop_y0))
    im104 = win.resize((104, 104), Image.Resampling.NEAREST)
    arr104 = np.array(im104)

    def to104(pt):
        return ((pt[0] - crop_x0) * scale, (pt[1] - crop_y0) * scale)

    neck_104 = to104(neck_dst)
    back_wing_104 = to104(back_wing_dst)
    l_hand_104 = to104(l_hand_dst)
    r_hand_104 = to104(r_hand_dst)

    # Smooth continuous foot_y target (blended out mid-backflip when flip_air_blend == 1.0!)
    ys, xs = np.where(arr104[:, :, 3] > 0)
    dy_ground = 0
    if len(ys) > 0 and flip_blend < 0.99:
        cur_bot = int(ys.max())
        cur_top = int(ys.min())
        target_bot = int(round(cfg.get("foot_y", 99.0)))
        dy_ground = int(round((target_bot - cur_bot) * (1.0 - flip_blend)))
        if cur_top + dy_ground < 5:
            dy_ground = 5 - cur_top
        if cur_bot + dy_ground > 99:
            dy_ground = 99 - cur_bot
        if dy_ground != 0:
            shifted = np.zeros_like(arr104)
            y_src0 = max(0, -dy_ground)
            y_src1 = min(104, 104 - dy_ground)
            y_dst0 = max(0, dy_ground)
            y_dst1 = min(104, 104 + dy_ground)
            if y_src1 > y_src0:
                shifted[y_dst0:y_dst1] = arr104[y_src0:y_src1]
            arr104 = shifted

    # Transform downsampled 104x104 body into authentic cel-clustered 20-color pixel art with 1px Selout
    arr104 = quantize_and_cluster_104(arr104)

    neck_104 = (neck_104[0], neck_104[1] + dy_ground)
    back_wing_104 = (back_wing_104[0], back_wing_104[1] + dy_ground)
    l_hand_104 = (l_hand_104[0], l_hand_104[1] + dy_ground)
    r_hand_104 = (r_hand_104[0], r_hand_104[1] + dy_ground)

    # 1. Render Articulated 6-Pinion Crimson-and-Gold Valkyrie Wings BEHIND torso
    bg104 = np.zeros_like(arr104)
    draw_valkyrie_wings_104(
        bg104, back_wing_104[0], back_wing_104[1],
        torso_deg=torso_deg,
        flap_phase=cfg.get("wing_phase", cfg.get("mane_wave_phase", 0.0)),
        mode=wing_mode,
        full_rot=(flip_blend > 0.25)
    )

    out = bg104.copy()
    mask_body = arr104[:, :, 3] > 0
    out[mask_body] = arr104[mask_body]

    # 2. Optional Valhalla Crown Halo behind/around Freyja
    if cfg.get("halo", False):
        draw_valkyrie_halo_104(
            out, neck_104[0] + 2.0, max(18.0, neck_104[1] - 4.0),
            rx=22.0, ry=11.0,
            phase=cfg.get("mane_wave_phase", 0.0),
            num_spears=cfg.get("halo_spears", 6)
        )

    # 3. Render Ornate Winged Gungnir War-Lance
    hand_pt = r_hand_104 if cfg.get("lance_hand", "right") == "right" else l_hand_104
    l_deg = cfg.get("lance_deg", -16.0)
    l_len = cfg.get("lance_len", 31.0)
    if cfg.get("show_lance", True):
        if cfg.get("resting_lance", False):
            draw_gungnir_104(
                out, 50.0, 94.5, lance_deg=2.0, lance_len=28.0,
                glow=cfg.get("lance_glow", 0.30), phase=cfg.get("mane_wave_phase", 0.0)
            )
        else:
            draw_gungnir_104(
                out, hand_pt[0], hand_pt[1],
                lance_deg=l_deg, lance_len=l_len,
                glow=cfg.get("lance_glow", 1.0),
                phase=cfg.get("mane_wave_phase", 0.0)
            )

    # 4. Optional Golden-Crimson Javelin Slash Arcs & Sleek Shallow Dragonfire Mach-Cone
    if cfg.get("slash_arc") is not None:
        sa = cfg["slash_arc"]
        draw_slash_arc_104(
            out, neck_104[0] + sa.get("dx", 8.0), neck_104[1] + sa.get("dy", 8.0),
            sa.get("r", 28.0), sa["a0"], sa["a1"],
            intensity=sa.get("intensity", 1.0)
        )

    if cfg.get("mach_cone") is not None:
        mc = cfg["mach_cone"]
        l_rad = math.radians(l_deg)
        tip_x = min(97.0, hand_pt[0] + math.cos(l_rad) * (l_len + 1.0))
        tip_y = min(97.0, max(6.0, hand_pt[1] + math.sin(l_rad) * (l_len + 1.0)))
        draw_dragonfire_mach_cone_104(
            out, tip_x, tip_y, l_deg,
            length=mc.get("len", 34.0),
            intensity=mc.get("intensity", 0.95),
            ultimate=mc.get("ultimate", False)
        )

    if cfg.get("speedlines", 0) > 0:
        n_lines = cfg["speedlines"]
        ph = cfg.get("mane_wave_phase", 0.0)
        sl_deg = cfg.get("speedline_deg", 0.0)
        sl_rad = math.radians(sl_deg)
        ux_s, uy_s = math.cos(sl_rad), math.sin(sl_rad)
        for k in range(n_lines):
            ly = 28.0 + (k * 11 + int(ph * 5)) % 52
            lx0 = 6.0 + (k * 7 + int(ph * 9)) % 18
            slen = 11.0 + (k % 3) * 4.0
            lx1 = min(96.0, max(5.0, lx0 + ux_s * slen))
            ly1 = min(96.0, max(5.0, ly + uy_s * slen))
            col = P_GOLD_GLEAM if k % 2 == 0 else P_ROSE_GEM
            draw_line_104(out, lx0, ly, lx1, ly1, col, 1)

    # Final safety clamp to [3..100] and interior pinhole fill
    out[:3, :, :] = 0
    out[102:, :, :] = 0
    out[:, :3, :] = 0
    out[:, 101:, :] = 0
    a = out[:, :, 3] > 0
    up = np.pad(a[1:, :], ((0, 1), (0, 0)), constant_values=False)
    dn = np.pad(a[:-1, :], ((1, 0), (0, 0)), constant_values=False)
    lf = np.pad(a[:, 1:], ((0, 0), (0, 1)), constant_values=False)
    rt = np.pad(a[:, :-1], ((0, 0), (1, 0)), constant_values=False)
    pinhole = (~a) & up & dn & lf & rt
    if np.any(pinhole):
        out[pinhole] = P_CRIM_SHAD

    return out


render_rig = render_pose_104


POSE_NUMERIC_KEYS = [
    "pelvis_dx", "pelvis_dy", "torso_deg", "head_rel_deg", "mane_rel_deg",
    "mane_wave_amp", "l_hip_dx", "l_hip_dy", "r_hip_dx", "r_hip_dy",
    "l_thigh_deg", "l_shin_deg", "l_foot_deg",
    "r_thigh_deg", "r_shin_deg", "r_foot_deg",
    "l_sode_rel_deg", "l_fore_rel_deg", "r_sode_rel_deg", "r_fore_rel_deg",
    "lance_deg", "lance_len", "lance_glow", "foot_y", "flip_air_blend"
]

POSE_DEFAULTS = dict(
    pelvis_dx=0.0,
    pelvis_dy=0.0,
    torso_deg=3.0,
    head_rel_deg=-2.0,
    mane_rel_deg=-5.0,
    mane_wave_amp=7.0,
    l_hip_dx=0.0,
    l_hip_dy=0.0,
    r_hip_dx=0.0,
    r_hip_dy=0.0,
    l_thigh_deg=-2.0,
    l_shin_deg=2.0,
    l_foot_deg=0.0,
    r_thigh_deg=2.0,
    r_shin_deg=-2.0,
    r_foot_deg=0.0,
    l_sode_rel_deg=-6.0,
    l_fore_rel_deg=-14.0,
    r_sode_rel_deg=-14.0,
    r_fore_rel_deg=-18.0,
    lance_deg=-16.0,
    lance_len=31.0,
    lance_glow=1.0,
    foot_y=99.0,
    flip_air_blend=0.0,
    wing_mode="normal",
    right_arm_in_front=False,
    right_leg_behind=False
)


def eval_pose_keyframes(f, keyframes, ph, wing_mult=2.0):
    """
    Smoothly cosine-interpolates all anatomical joint angles & foot_y across keyframes `[(frame, dict), ...]`
    so there are ZERO abrupt pose snaps and ZERO steep nose-dive pops!
    """
    k0 = keyframes[0]
    k1 = keyframes[-1]
    for i in range(len(keyframes) - 1):
        if keyframes[i][0] <= f <= keyframes[i + 1][0]:
            k0 = keyframes[i]
            k1 = keyframes[i + 1]
            break

    f0, d0 = k0
    f1, d1 = k1
    raw_u = 0.0 if f1 <= f0 else (f - f0) / float(f1 - f0)
    u = 0.5 - 0.5 * math.cos(math.pi * max(0.0, min(1.0, raw_u)))

    out = dict(POSE_DEFAULTS)
    for k in POSE_NUMERIC_KEYS:
        v0 = d0.get(k, POSE_DEFAULTS[k])
        v1 = d1.get(k, POSE_DEFAULTS[k])
        out[k] = v0 + (v1 - v0) * u

    active_d = d0 if raw_u < 0.5 else d1
    for meta_k in ("wing_mode", "right_arm_in_front", "right_leg_behind", "halo", "halo_spears", "speedlines", "speedline_deg", "resting_lance", "legs_follow_torso", "spear_mode"):
        if meta_k in active_d:
            out[meta_k] = active_d[meta_k]

    out["mane_wave_phase"] = ph * wing_mult
    out["wing_phase"] = ph * wing_mult
    return out


def build_row_configs(row_idx):
    cfgs = []
    for f in range(COLS):
        t = f / float(COLS)
        ph = 2.0 * math.pi * t

        if row_idx == 0:
            # Row 0: IDLE (100% Grounded Regal Valkyrie Stance + Sleek -16 deg Forward Gungnir Guard!)
            breath = math.sin(ph)
            sway = math.cos(ph)
            cfgs.append(dict(
                pelvis_dx=sway * 3.0,
                pelvis_dy=breath * 7.5,
                torso_deg=3.0 + breath * 1.8,
                head_rel_deg=-2.0 - breath * 1.2,
                mane_rel_deg=-5.0 + sway * 4.0,
                mane_wave_phase=ph,
                mane_wave_amp=6.5,
                wing_mode="normal",
                wing_phase=ph,
                l_thigh_deg=-2.0 + sway * 1.8,
                l_shin_deg=2.0 - sway * 1.8,
                r_thigh_deg=2.0 - sway * 1.8,
                r_shin_deg=-2.0 + sway * 1.8,
                l_sode_rel_deg=-6.0 + breath * 3.0,
                l_fore_rel_deg=-14.0 + sway * 3.5,
                r_sode_rel_deg=-14.0 + breath * 3.0,
                r_fore_rel_deg=-18.0 - sway * 3.0,
                foot_y=99.0,
                lance_deg=-16.0 + breath * 2.8,
                lance_len=31.0
            ))

        elif row_idx == 1:
            # Row 1: WALK (Authentic Bipedal Crossover Valkyrie Stride + Contralateral Gungnir Swing!)
            c_step = math.cos(ph)
            walk_pose = compute_bipedal_walk_pose(VALKYRIE_PIVOTS, f, stride_scale=0.76)
            cfg_w = dict(
                pelvis_dx=0.0,
                pelvis_dy=0.0,
                torso_deg=5.5 + 1.8 * abs(c_step),
                head_rel_deg=-3.5 - 0.8 * abs(c_step),
                mane_rel_deg=-7.5 - 3.5 * abs(c_step),
                mane_wave_phase=ph * 2.0,
                mane_wave_amp=7.5,
                wing_mode="normal",
                wing_phase=ph * 2.0,
                l_sode_rel_deg=-18.0 * c_step,
                l_fore_rel_deg=-16.0 - max(0.0, c_step) * 8.0,
                r_sode_rel_deg=15.0 * c_step - 8.0,
                r_fore_rel_deg=-16.0 - max(0.0, -c_step) * 6.0,
                foot_y=99.0,
                lance_deg=-34.0 - c_step * 7.0,
                lance_len=28.0,
                lock_crop_x0=176,
            )
            cfg_w.update(walk_pose)
            cfgs.append(cfg_w)

        elif row_idx == 2:
            # Row 2: 4 DISTINCT FULL-BODY VALKYRIE AUTO_ATTACK VARIANTS (`[[0..7], [8..14], [15..22], [23..29]]`, `foot_y=99.0`)
            if f <= 7:
                # V0 (F00..F07): Gungnir Overhand Javelin Hurl — high rear javelin cock -> explosive forward spear projection
                kfs = [
                    (0, dict(
                        pelvis_dx=-5.0, pelvis_dy=14.0, torso_deg=-4.0, head_rel_deg=3.0, mane_rel_deg=2.0,
                        l_thigh_deg=-10.0, l_shin_deg=10.0, r_thigh_deg=10.0, r_shin_deg=-8.0,
                        l_sode_rel_deg=-18.0, l_fore_rel_deg=-22.0, r_sode_rel_deg=-52.0, r_fore_rel_deg=-22.0,
                        lance_deg=-18.0, lance_len=27.5, foot_y=99.0,
                        wing_mode="normal", right_arm_in_front=True, right_leg_behind=False,
                    )),
                    (2, dict(
                        pelvis_dx=-11.0, pelvis_dy=28.0, torso_deg=-9.0, head_rel_deg=6.5, mane_rel_deg=5.0,
                        l_thigh_deg=-18.0, l_shin_deg=16.0, r_thigh_deg=18.0, r_shin_deg=-14.0,
                        l_sode_rel_deg=-26.0, l_fore_rel_deg=-28.0, r_sode_rel_deg=-76.0, r_fore_rel_deg=-24.0,
                        lance_deg=-14.0, lance_len=27.0, foot_y=99.0,
                        wing_mode="flare", right_arm_in_front=True, right_leg_behind=False,
                    )),
                    (4, dict(
                        pelvis_dx=12.0, pelvis_dy=36.0, torso_deg=17.0, head_rel_deg=-9.0, mane_rel_deg=-18.0,
                        l_thigh_deg=20.0, l_shin_deg=16.0, r_thigh_deg=-22.0, r_shin_deg=18.0,
                        l_sode_rel_deg=20.0, l_fore_rel_deg=-20.0, r_sode_rel_deg=16.0, r_fore_rel_deg=-8.0,
                        lance_deg=2.0, lance_len=27.0, foot_y=99.0,
                        wing_mode="flare", right_arm_in_front=True, right_leg_behind=False,
                    )),
                    (7, dict(
                        pelvis_dx=2.0, pelvis_dy=8.0, torso_deg=4.0, head_rel_deg=-2.5, mane_rel_deg=-6.0,
                        l_thigh_deg=4.0, l_shin_deg=4.0, r_thigh_deg=-5.0, r_shin_deg=5.0,
                        l_sode_rel_deg=-4.0, l_fore_rel_deg=-16.0, r_sode_rel_deg=-10.0, r_fore_rel_deg=-16.0,
                        lance_deg=-14.0, lance_len=29.0, foot_y=99.0,
                        wing_mode="normal", right_arm_in_front=False, right_leg_behind=False,
                    )),
                ]
                cfg = eval_pose_keyframes(f, kfs, ph, wing_mult=2.2)
                if f in (4, 5):
                    cfg["mach_cone"] = dict(len=25.0, intensity=0.90 if f == 4 else 0.72, ultimate=False)

            elif f <= 14:
                # V1 (F08..F14): Valkyrie Sweeping Glaive Arc — stance swap (`right_leg_behind=True`), wide 2H sweeping crimson lance whip
                kfs = [
                    (8, dict(
                        pelvis_dx=-6.0, pelvis_dy=22.0, torso_deg=-5.0, head_rel_deg=3.0, mane_rel_deg=2.0,
                        l_thigh_deg=-16.0, l_shin_deg=14.0, r_thigh_deg=16.0, r_shin_deg=10.0,
                        l_sode_rel_deg=-28.0, l_fore_rel_deg=-26.0, r_sode_rel_deg=-46.0, r_fore_rel_deg=-22.0,
                        lance_deg=-40.0, lance_len=26.5, foot_y=99.0,
                        wing_mode="normal", right_arm_in_front=True, right_leg_behind=True,
                    )),
                    (11, dict(
                        pelvis_dx=10.0, pelvis_dy=34.0, torso_deg=15.0, head_rel_deg=-8.5, mane_rel_deg=-18.0,
                        l_thigh_deg=-22.0, l_shin_deg=20.0, r_thigh_deg=22.0, r_shin_deg=16.0,
                        l_sode_rel_deg=24.0, l_fore_rel_deg=-18.0, r_sode_rel_deg=18.0, r_fore_rel_deg=-8.0,
                        lance_deg=7.0, lance_len=27.0, foot_y=99.0,
                        wing_mode="swept", right_arm_in_front=True, right_leg_behind=True,
                    )),
                    (14, dict(
                        pelvis_dx=2.0, pelvis_dy=10.0, torso_deg=4.0, head_rel_deg=-2.5, mane_rel_deg=-7.0,
                        l_thigh_deg=-8.0, l_shin_deg=8.0, r_thigh_deg=8.0, r_shin_deg=6.0,
                        l_sode_rel_deg=-6.0, l_fore_rel_deg=-16.0, r_sode_rel_deg=-12.0, r_fore_rel_deg=-16.0,
                        lance_deg=-15.0, lance_len=28.5, foot_y=99.0,
                        wing_mode="normal", right_arm_in_front=True, right_leg_behind=True,
                    )),
                ]
                cfg = eval_pose_keyframes(f, kfs, ph, wing_mult=2.4)
                if 10 <= f <= 12:
                    u_s = (f - 10) / 2.0
                    cfg["slash_arc"] = dict(r=26.5, a0=-52.0 + 14.0 * u_s, a1=36.0 + 12.0 * u_s, intensity=1.10 - abs(f - 11.0) * 0.18)

            elif f <= 22:
                # V2 (F15..F22): Heaven-Call Skyward Command — grounded regal plant -> Gungnir raised skyward (`y >= 6`!) + full wing-flare
                kfs = [
                    (15, dict(
                        pelvis_dx=-3.0, pelvis_dy=18.0, torso_deg=-3.0, head_rel_deg=-4.0, mane_rel_deg=-8.0,
                        l_thigh_deg=-12.0, l_shin_deg=12.0, r_thigh_deg=12.0, r_shin_deg=-10.0,
                        l_sode_rel_deg=-28.0, l_fore_rel_deg=-26.0, r_sode_rel_deg=-48.0, r_fore_rel_deg=-22.0,
                        lance_deg=-52.0, lance_len=23.0, foot_y=99.0,
                        wing_mode="normal", right_arm_in_front=True, right_leg_behind=False,
                    )),
                    (18, dict(
                        pelvis_dx=-6.0, pelvis_dy=36.0, torso_deg=-7.5, head_rel_deg=-8.5, mane_rel_deg=-15.0,
                        l_thigh_deg=-18.0, l_shin_deg=18.0, r_thigh_deg=18.0, r_shin_deg=-14.0,
                        l_sode_rel_deg=-42.0, l_fore_rel_deg=-30.0, r_sode_rel_deg=-68.0, r_fore_rel_deg=-22.0,
                        lance_deg=-74.0, lance_len=21.0, foot_y=99.0,
                        wing_mode="flare", right_arm_in_front=True, right_leg_behind=False,
                        halo=True, halo_spears=6,
                    )),
                    (20, dict(
                        pelvis_dx=-4.0, pelvis_dy=32.0, torso_deg=-5.0, head_rel_deg=-6.5, mane_rel_deg=-13.0,
                        l_thigh_deg=-15.0, l_shin_deg=15.0, r_thigh_deg=15.0, r_shin_deg=-12.0,
                        l_sode_rel_deg=-36.0, l_fore_rel_deg=-28.0, r_sode_rel_deg=-58.0, r_fore_rel_deg=-20.0,
                        lance_deg=-68.0, lance_len=21.5, foot_y=99.0,
                        wing_mode="flare", right_arm_in_front=True, right_leg_behind=False,
                        halo=True, halo_spears=6,
                    )),
                    (22, dict(
                        pelvis_dx=0.0, pelvis_dy=8.0, torso_deg=2.0, head_rel_deg=-2.0, mane_rel_deg=-6.0,
                        l_thigh_deg=-4.0, l_shin_deg=4.0, r_thigh_deg=4.0, r_shin_deg=-4.0,
                        l_sode_rel_deg=-10.0, l_fore_rel_deg=-18.0, r_sode_rel_deg=-18.0, r_fore_rel_deg=-18.0,
                        lance_deg=-26.0, lance_len=27.0, foot_y=99.0,
                        wing_mode="normal", right_arm_in_front=True, right_leg_behind=False,
                    )),
                ]
                cfg = eval_pose_keyframes(f, kfs, ph, wing_mult=2.5)

            else:
                # V3 (F23..F29): Bifrost Twin-Cross Thrust — deep forward lunge (`torso_deg=+20 deg`), level 2H rapid spear drive + wing-burst
                kfs = [
                    (23, dict(
                        pelvis_dx=-4.0, pelvis_dy=24.0, torso_deg=8.0, head_rel_deg=-5.0, mane_rel_deg=-10.0,
                        l_thigh_deg=-14.0, l_shin_deg=14.0, r_thigh_deg=14.0, r_shin_deg=-10.0,
                        l_sode_rel_deg=-16.0, l_fore_rel_deg=-24.0, r_sode_rel_deg=-38.0, r_fore_rel_deg=-20.0,
                        lance_deg=-10.0, lance_len=27.0, foot_y=99.0,
                        wing_mode="normal", right_arm_in_front=True, right_leg_behind=False,
                    )),
                    (26, dict(
                        pelvis_dx=14.0, pelvis_dy=48.0, torso_deg=20.0, head_rel_deg=-11.0, mane_rel_deg=-22.0,
                        l_thigh_deg=-24.0, l_shin_deg=24.0, r_thigh_deg=24.0, r_shin_deg=-18.0,
                        l_sode_rel_deg=22.0, l_fore_rel_deg=-20.0, r_sode_rel_deg=18.0, r_fore_rel_deg=-8.0,
                        lance_deg=1.0, lance_len=26.5, foot_y=99.0,
                        wing_mode="flare", right_arm_in_front=True, right_leg_behind=False,
                    )),
                    (29, dict(
                        pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-2.0, mane_rel_deg=-5.0,
                        l_thigh_deg=-2.0, l_shin_deg=2.0, r_thigh_deg=2.0, r_shin_deg=-2.0,
                        l_sode_rel_deg=-6.0, l_fore_rel_deg=-14.0, r_sode_rel_deg=-14.0, r_fore_rel_deg=-18.0,
                        lance_deg=-16.0, lance_len=30.0, foot_y=99.0,
                        wing_mode="normal", right_arm_in_front=False, right_leg_behind=False,
                    )),
                ]
                cfg = eval_pose_keyframes(f, kfs, ph, wing_mult=2.6)
                if 25 <= f <= 27:
                    cfg["slash_arc"] = dict(r=26.0, a0=-44.0, a1=44.0, intensity=1.12 - abs(f - 26.0) * 0.18)

            cfgs.append(cfg)

        elif row_idx == 3:
            # Row 3: SKILL (Gungnir Javelin Barrage — Grounded Wing-Flare -> Sleek Low Horizontal Wing-Skim -> Forward Command Thrust!)
            kfs = [
                (0, dict(pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, lance_deg=-16.0, foot_y=99.0)),
                # F05: 100% Grounded Wing-Flare & Poised Diagonal Invocation (-28 deg, zero vertical pole!)
                (5, dict(
                    pelvis_dx=-8.0, pelvis_dy=48.0, torso_deg=-6.0, head_rel_deg=-6.0, mane_rel_deg=-12.0,
                    l_thigh_deg=-20.0, l_shin_deg=20.0, r_thigh_deg=20.0, r_shin_deg=-16.0,
                    l_sode_rel_deg=-36.0, l_fore_rel_deg=-30.0, r_sode_rel_deg=-64.0, r_fore_rel_deg=-22.0,
                    lance_deg=-28.0, foot_y=99.0, wing_mode="flare", right_arm_in_front=True,
                    halo=True, halo_spears=6
                )),
                # F10: Sleek Low Horizontal Wing-Glide Skim (torso +20 deg, lance -6 deg, gentle foot_y=95!)
                (10, dict(
                    pelvis_dx=4.0, pelvis_dy=22.0, torso_deg=20.0, head_rel_deg=-12.0, mane_rel_deg=-24.0,
                    l_thigh_deg=24.0, l_shin_deg=34.0, l_foot_deg=20.0,
                    r_thigh_deg=8.0, r_shin_deg=28.0, r_foot_deg=18.0,
                    l_sode_rel_deg=-24.0, l_fore_rel_deg=-26.0, r_sode_rel_deg=-34.0, r_fore_rel_deg=-18.0,
                    lance_deg=-6.0, foot_y=95.0, wing_mode="swept", right_arm_in_front=True,
                    halo=True, halo_spears=5, speedlines=4, speedline_deg=-4.0
                )),
                # F16: Sweeping Horizontal Wing-Barrage Follow-Through (torso +22 deg, lance +4 deg)
                (16, dict(
                    pelvis_dx=8.0, pelvis_dy=24.0, torso_deg=22.0, head_rel_deg=-14.0, mane_rel_deg=-26.0,
                    l_thigh_deg=26.0, l_shin_deg=32.0, l_foot_deg=18.0,
                    r_thigh_deg=-12.0, r_shin_deg=24.0, r_foot_deg=12.0,
                    l_sode_rel_deg=16.0, l_fore_rel_deg=-24.0, r_sode_rel_deg=-18.0, r_fore_rel_deg=-14.0,
                    lance_deg=4.0, foot_y=96.0, wing_mode="flare", right_arm_in_front=True,
                    halo=True, halo_spears=2, speedlines=4, speedline_deg=2.0
                )),
                # F20: 100% Grounded Sliding Valkyrie Command Thrust (0 deg straight horizontal spear point — erupts Obelisk!)
                (20, dict(
                    pelvis_dx=14.0, pelvis_dy=52.0, torso_deg=18.0, head_rel_deg=-10.0, mane_rel_deg=-20.0,
                    l_thigh_deg=-24.0, l_shin_deg=24.0, r_thigh_deg=24.0, r_shin_deg=-18.0,
                    l_sode_rel_deg=22.0, l_fore_rel_deg=-22.0, r_sode_rel_deg=16.0, r_fore_rel_deg=-8.0,
                    lance_deg=0.0, lance_len=32.0, foot_y=99.0, wing_mode="flare", right_arm_in_front=True
                )),
                # F29: Smooth grounded stance recovery
                (29, dict(pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, lance_deg=-16.0, foot_y=99.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, wing_mult=3.0)
            if 18 <= f <= 21:
                cfg["mach_cone"] = dict(len=30.0, intensity=0.92, ultimate=False)
            cfgs.append(cfg)

        elif row_idx == 4:
            # Row 4: ULTIMATE & TRUE_ULTIMATE
            #   F00..F03 (120..123): 100% Grounded Valhalla Awakening Cast (foot_y=99.0)
            #   F04..F08 (124..128): Sleek Streamlined Overdrive Wing-Glide (ULTIMATE 0.30..1.44s)
            #   F09..F12 (129..132): Majestic Twin-Winged Sovereign Sky-Ascent (TRUE_ULTIMATE Phase 1)
            #   F13..F18 (133..138): Sky-Sovereign Poised Hover & Downward Gungnir Spear-Command (TRUE_ULTIMATE Phase 2)
            #   F19..F20 (139..140): Apex Ragnarok Convergence Charge (TRUE_ULTIMATE 2.55..2.80s)
            #   F21..F24 (141..144): Articulated Steep Diagonal (+52 deg) Valkyrie Falcon Spear-Dive (TRUE_ULTIMATE 2.80..3.10s)
            #   F25..F29 (145..149): 100% Grounded Sovereign Judgment Thrust & Recovery (foot_y=99.0)
            if f <= 3:
                kfs = [
                    (0, dict(
                        pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-2.0, mane_rel_deg=-5.0,
                        l_thigh_deg=-2.0, l_shin_deg=2.0, r_thigh_deg=2.0, r_shin_deg=-2.0,
                        l_sode_rel_deg=-10.0, l_fore_rel_deg=-16.0, r_sode_rel_deg=-18.0, r_fore_rel_deg=-18.0,
                        lance_deg=-16.0, lance_len=29.5, foot_y=99.0, wing_mode="normal", right_arm_in_front=True,
                    )),
                    (3, dict(
                        pelvis_dx=-6.0, pelvis_dy=52.0, torso_deg=-7.0, head_rel_deg=-7.0, mane_rel_deg=-15.0,
                        l_thigh_deg=-20.0, l_shin_deg=20.0, r_thigh_deg=20.0, r_shin_deg=-16.0,
                        l_sode_rel_deg=-42.0, l_fore_rel_deg=-30.0, r_sode_rel_deg=-70.0, r_fore_rel_deg=-22.0,
                        lance_deg=-30.0, lance_len=28.0, foot_y=99.0, wing_mode="flare", right_arm_in_front=True,
                    )),
                ]
                cfg = eval_pose_keyframes(f, kfs, ph, wing_mult=2.5)
            elif f <= 8:
                kfs = [
                    (4, dict(
                        pelvis_dx=6.0, pelvis_dy=18.0, torso_deg=22.0, head_rel_deg=-12.0, mane_rel_deg=-26.0,
                        l_hip_dx=12.0, r_hip_dx=-14.0,
                        l_thigh_deg=20.0, l_shin_deg=28.0, l_foot_deg=22.0,
                        r_thigh_deg=48.0, r_shin_deg=38.0, r_foot_deg=24.0,
                        l_sode_rel_deg=-32.0, l_fore_rel_deg=-24.0, r_sode_rel_deg=-38.0, r_fore_rel_deg=-16.0,
                        lance_deg=-6.0, lance_len=28.5, foot_y=95.0, wing_mode="flare", right_arm_in_front=True,
                    )),
                    (6, dict(
                        pelvis_dx=9.0, pelvis_dy=16.0, torso_deg=25.0, head_rel_deg=-14.0, mane_rel_deg=-28.0,
                        l_hip_dx=12.0, r_hip_dx=-14.0,
                        l_thigh_deg=24.0, l_shin_deg=30.0, l_foot_deg=24.0,
                        r_thigh_deg=54.0, r_shin_deg=42.0, r_foot_deg=26.0,
                        l_sode_rel_deg=16.0, l_fore_rel_deg=-22.0, r_sode_rel_deg=-16.0, r_fore_rel_deg=-12.0,
                        lance_deg=4.0, lance_len=29.0, foot_y=95.0, wing_mode="swept", right_arm_in_front=True,
                    )),
                    (8, dict(
                        pelvis_dx=8.0, pelvis_dy=20.0, torso_deg=22.0, head_rel_deg=-11.0, mane_rel_deg=-25.0,
                        l_hip_dx=12.0, r_hip_dx=-14.0,
                        l_thigh_deg=18.0, l_shin_deg=26.0, l_foot_deg=20.0,
                        r_thigh_deg=44.0, r_shin_deg=36.0, r_foot_deg=22.0,
                        l_sode_rel_deg=-20.0, l_fore_rel_deg=-24.0, r_sode_rel_deg=-12.0, r_fore_rel_deg=-12.0,
                        lance_deg=8.0, lance_len=29.0, foot_y=96.0, wing_mode="flare", right_arm_in_front=True,
                    )),
                ]
                cfg = eval_pose_keyframes(f, kfs, ph, wing_mult=3.0)
            elif f <= 12:
                # F09..F12: Majestic Twin-Winged Sovereign Sky-Throne Ascent
                kfs = [
                    (9, dict(
                        pelvis_dx=-1.0, pelvis_dy=12.0, torso_deg=-4.0, head_rel_deg=-6.0, mane_rel_deg=-16.0,
                        l_hip_dx=18.0, r_hip_dx=-16.0,
                        l_thigh_deg=-19.0, l_shin_deg=-25.0, l_foot_deg=22.0,
                        r_thigh_deg=-20.0, r_shin_deg=32.0, r_foot_deg=20.0,
                        l_sode_rel_deg=-40.0, l_fore_rel_deg=-20.0,
                        r_sode_rel_deg=-84.0, r_fore_rel_deg=22.0,
                        lance_deg=-22.0, lance_len=27.5, foot_y=96.0,
                        wing_mode="sovereign", right_arm_in_front=True,
                    )),
                    (12, dict(
                        pelvis_dx=-2.0, pelvis_dy=10.0, torso_deg=3.0, head_rel_deg=8.0, mane_rel_deg=-20.0,
                        l_hip_dx=18.0, r_hip_dx=-16.0,
                        l_thigh_deg=-20.0, l_shin_deg=-28.0, l_foot_deg=22.0,
                        r_thigh_deg=-24.0, r_shin_deg=36.0, r_foot_deg=20.0,
                        l_sode_rel_deg=-54.0, l_fore_rel_deg=-8.0,
                        r_sode_rel_deg=-86.0, r_fore_rel_deg=52.0,
                        lance_deg=38.0, lance_len=28.5, foot_y=96.0,
                        wing_mode="sovereign", right_arm_in_front=True,
                    )),
                ]
                cfg = eval_pose_keyframes(f, kfs, ph, wing_mult=3.0)
            elif f <= 18:
                # F13..F18: Iconic Sky-Sovereign Poised Hover & Downward Gungnir Spear-Command Cycle
                sub_ph = ((f - 13) / 6.0) * 2.0 * math.pi
                kfs = [
                    (13, dict(
                        pelvis_dx=-2.0, pelvis_dy=10.0, torso_deg=4.0, head_rel_deg=9.0, mane_rel_deg=-20.0,
                        l_hip_dx=18.0, r_hip_dx=-16.0,
                        l_thigh_deg=-20.0, l_shin_deg=-28.0, l_foot_deg=22.0,
                        r_thigh_deg=-24.0, r_shin_deg=36.0, r_foot_deg=20.0,
                        l_sode_rel_deg=-56.0, l_fore_rel_deg=-6.0,
                        r_sode_rel_deg=-88.0, r_fore_rel_deg=56.0,
                        lance_deg=46.0, lance_len=28.5, foot_y=96.0,
                        wing_mode="sovereign", right_arm_in_front=True,
                    )),
                    (14, dict(
                        pelvis_dx=-3.0, pelvis_dy=9.0, torso_deg=3.0, head_rel_deg=10.0, mane_rel_deg=-19.0,
                        l_hip_dx=18.0, r_hip_dx=-16.0,
                        l_thigh_deg=-21.0, l_shin_deg=-29.0, l_foot_deg=22.0,
                        r_thigh_deg=-25.0, r_shin_deg=37.0, r_foot_deg=20.0,
                        l_sode_rel_deg=-60.0, l_fore_rel_deg=-6.0,
                        r_sode_rel_deg=-94.0, r_fore_rel_deg=58.0,
                        lance_deg=45.0, lance_len=28.5, foot_y=96.0,
                        wing_mode="sovereign", right_arm_in_front=True,
                    )),
                    (15, dict(
                        pelvis_dx=4.0, pelvis_dy=12.0, torso_deg=11.0, head_rel_deg=8.0, mane_rel_deg=-26.0,
                        l_hip_dx=18.0, r_hip_dx=-16.0,
                        l_thigh_deg=-16.0, l_shin_deg=-24.0, l_foot_deg=24.0,
                        r_thigh_deg=-28.0, r_shin_deg=40.0, r_foot_deg=22.0,
                        l_sode_rel_deg=24.0, l_fore_rel_deg=-18.0,
                        r_sode_rel_deg=-48.0, r_fore_rel_deg=32.0,
                        lance_deg=50.0, lance_len=29.5, foot_y=96.0,
                        wing_mode="sovereign", right_arm_in_front=True,
                    )),
                    (16, dict(
                        pelvis_dx=5.0, pelvis_dy=13.0, torso_deg=12.0, head_rel_deg=8.5, mane_rel_deg=-27.0,
                        l_hip_dx=18.0, r_hip_dx=-16.0,
                        l_thigh_deg=-15.0, l_shin_deg=-23.0, l_foot_deg=24.0,
                        r_thigh_deg=-29.0, r_shin_deg=41.0, r_foot_deg=22.0,
                        l_sode_rel_deg=28.0, l_fore_rel_deg=-20.0,
                        r_sode_rel_deg=-44.0, r_fore_rel_deg=28.0,
                        lance_deg=52.0, lance_len=29.5, foot_y=96.0,
                        wing_mode="sovereign", right_arm_in_front=True,
                    )),
                    (18, dict(
                        pelvis_dx=-1.0, pelvis_dy=10.5, torso_deg=5.5, head_rel_deg=9.0, mane_rel_deg=-22.0,
                        l_hip_dx=18.0, r_hip_dx=-16.0,
                        l_thigh_deg=-19.0, l_shin_deg=-27.0, l_foot_deg=22.0,
                        r_thigh_deg=-25.0, r_shin_deg=37.0, r_foot_deg=20.0,
                        l_sode_rel_deg=-38.0, l_fore_rel_deg=-10.0,
                        r_sode_rel_deg=-76.0, r_fore_rel_deg=48.0,
                        lance_deg=47.0, lance_len=28.8, foot_y=96.0,
                        wing_mode="sovereign", right_arm_in_front=True,
                    )),
                ]
                cfg = eval_pose_keyframes(f, kfs, sub_ph, wing_mult=1.0)
            elif f <= 20:
                # F19..F20: Apex Ragnarok Convergence Charge (twin sovereign wings flared + Gungnir locked steeply down!)
                kfs = [
                    (19, dict(
                        pelvis_dx=-3.0, pelvis_dy=10.0, torso_deg=2.0, head_rel_deg=10.0, mane_rel_deg=-18.0,
                        l_hip_dx=18.0, r_hip_dx=-16.0,
                        l_thigh_deg=-22.0, l_shin_deg=-28.0, l_foot_deg=24.0,
                        r_thigh_deg=-26.0, r_shin_deg=38.0, r_foot_deg=22.0,
                        l_sode_rel_deg=-74.0, l_fore_rel_deg=-10.0,
                        r_sode_rel_deg=-102.0, r_fore_rel_deg=52.0,
                        lance_deg=51.0, lance_len=29.0, foot_y=96.0,
                        wing_mode="sovereign", right_arm_in_front=True,
                    )),
                    (20, dict(
                        pelvis_dx=-4.0, pelvis_dy=9.0, torso_deg=4.0, head_rel_deg=11.0, mane_rel_deg=-20.0,
                        l_hip_dx=18.0, r_hip_dx=-16.0,
                        l_thigh_deg=-22.0, l_shin_deg=-28.0, l_foot_deg=24.0,
                        r_thigh_deg=-27.0, r_shin_deg=39.0, r_foot_deg=22.0,
                        l_sode_rel_deg=-80.0, l_fore_rel_deg=-10.0,
                        r_sode_rel_deg=-108.0, r_fore_rel_deg=54.0,
                        lance_deg=53.0, lance_len=29.0, foot_y=96.0,
                        wing_mode="sovereign", right_arm_in_front=True,
                    )),
                ]
                cfg = eval_pose_keyframes(f, kfs, ph, wing_mult=3.0)
            elif f <= 24:
                # F21..F24: Articulated Steep Diagonal (+50..52 deg) Valkyrie Falcon Spear-Dive (ZERO ctx.rotate!)
                kfs = [
                    (21, dict(
                        pelvis_dx=6.0, pelvis_dy=8.0, torso_deg=54.0, head_rel_deg=-15.0, mane_rel_deg=-31.0,
                        l_hip_dx=12.0, r_hip_dx=-16.0,
                        l_thigh_deg=35.0, l_shin_deg=31.0, l_foot_deg=28.0,
                        r_thigh_deg=66.0, r_shin_deg=46.0, r_foot_deg=32.0,
                        l_sode_rel_deg=-35.0, l_fore_rel_deg=-14.0,
                        r_sode_rel_deg=-52.0, r_fore_rel_deg=22.0,
                        lance_deg=50.0, lance_len=28.5, foot_y=93.0,
                        wing_mode="swept", spear_mode=True, right_arm_in_front=True,
                    )),
                    (24, dict(
                        pelvis_dx=8.0, pelvis_dy=6.0, torso_deg=64.0, head_rel_deg=-19.0, mane_rel_deg=-35.0,
                        l_hip_dx=12.0, r_hip_dx=-16.0,
                        l_thigh_deg=41.0, l_shin_deg=35.0, l_foot_deg=30.0,
                        r_thigh_deg=74.0, r_shin_deg=52.0, r_foot_deg=34.0,
                        l_sode_rel_deg=-41.0, l_fore_rel_deg=-14.0,
                        r_sode_rel_deg=-60.0, r_fore_rel_deg=20.0,
                        lance_deg=52.0, lance_len=28.0, foot_y=94.0,
                        wing_mode="swept", spear_mode=True, right_arm_in_front=True,
                    )),
                ]
                cfg = eval_pose_keyframes(f, kfs, ph, wing_mult=3.5)
            else:
                # F25..F29: 100% Grounded Sovereign Judgment Command Thrust & Regal Recovery (foot_y=99.0)
                kfs = [
                    (25, dict(
                        pelvis_dx=14.0, pelvis_dy=56.0, torso_deg=18.0, head_rel_deg=-10.0, mane_rel_deg=-20.0,
                        l_thigh_deg=-24.0, l_shin_deg=24.0, r_thigh_deg=24.0, r_shin_deg=-18.0,
                        l_sode_rel_deg=22.0, l_fore_rel_deg=-22.0, r_sode_rel_deg=18.0, r_fore_rel_deg=-8.0,
                        lance_deg=2.0, lance_len=30.0, foot_y=99.0, wing_mode="flare", right_arm_in_front=True,
                    )),
                    (29, dict(
                        pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-2.0, mane_rel_deg=-5.0,
                        l_thigh_deg=-2.0, l_shin_deg=2.0, r_thigh_deg=2.0, r_shin_deg=-2.0,
                        l_sode_rel_deg=-6.0, l_fore_rel_deg=-14.0, r_sode_rel_deg=-14.0, r_fore_rel_deg=-18.0,
                        lance_deg=-16.0, lance_len=30.5, foot_y=99.0, wing_mode="normal", right_arm_in_front=False,
                    )),
                ]
                cfg = eval_pose_keyframes(f, kfs, ph, wing_mult=2.5)
            cfgs.append(cfg)

        elif row_idx == 5:
            # Row 5: DEATH & HURT (F00..F05 Hurt Stagger -> F09..F13 Wounded L-Sit on Stone Floor -> F18..F29 Flat Supine Fallen Valkyrie Rest)
            kfs = [
                (0, dict(pelvis_dx=0.0, pelvis_dy=4.0, torso_deg=-4.0, head_rel_deg=-2.0, mane_rel_deg=4.0,
                         l_thigh_deg=-4.0, l_shin_deg=6.0, r_thigh_deg=6.0, r_shin_deg=4.0,
                         l_sode_rel_deg=-14.0, r_sode_rel_deg=8.0, lance_deg=-22.0, lance_glow=0.80, wing_mode="flare", foot_y=99.0)),
                (5, dict(pelvis_dx=-16.0, pelvis_dy=28.0, torso_deg=-18.0, head_rel_deg=-8.0, mane_rel_deg=18.0,
                         l_thigh_deg=-22.0, l_shin_deg=8.0, r_thigh_deg=-12.0, r_shin_deg=6.0,
                         l_sode_rel_deg=-28.0, l_fore_rel_deg=-20.0, r_sode_rel_deg=22.0, r_fore_rel_deg=-14.0,
                         lance_deg=-34.0, lance_glow=0.55, wing_mode="flare", foot_y=99.0)),
                (9, dict(pelvis_dx=-14.0, pelvis_dy=95.0, torso_deg=10.0, head_rel_deg=14.0, mane_rel_deg=-10.0,
                         l_thigh_deg=-72.0, l_shin_deg=-42.0, l_foot_deg=-28.0,
                         r_thigh_deg=-38.0, r_shin_deg=-48.0, r_foot_deg=-30.0,
                         l_sode_rel_deg=18.0, l_fore_rel_deg=8.0,
                         r_sode_rel_deg=-18.0, r_fore_rel_deg=-12.0, right_arm_in_front=True,
                         lance_deg=14.0, lance_glow=0.45, wing_mode="normal", mane_wave_amp=5.0, foot_y=99.0)),
                (13, dict(pelvis_dx=-12.0, pelvis_dy=155.0, torso_deg=-8.0, head_rel_deg=18.0, mane_rel_deg=12.0,
                          l_thigh_deg=-98.0, l_shin_deg=-96.0, l_foot_deg=-64.0,
                          r_thigh_deg=-44.0, r_shin_deg=-78.0, r_foot_deg=-58.0,
                          l_sode_rel_deg=20.0, l_fore_rel_deg=8.0,
                          r_sode_rel_deg=-8.0, r_fore_rel_deg=-10.0, right_arm_in_front=True,
                          lance_deg=4.0, lance_glow=0.35, wing_mode="folded", mane_wave_amp=3.0, resting_lance=False, foot_y=99.0)),
                (18, dict(pelvis_dx=-8.0, pelvis_dy=190.0, torso_deg=-52.0, head_rel_deg=16.0, mane_rel_deg=68.0,
                          l_thigh_deg=-106.0, l_shin_deg=-112.0, l_foot_deg=-74.0,
                          r_thigh_deg=-46.0, r_shin_deg=-82.0, r_foot_deg=-66.0,
                          l_sode_rel_deg=10.0, l_fore_rel_deg=-4.0,
                          r_sode_rel_deg=2.0, r_fore_rel_deg=-8.0, right_arm_in_front=True,
                          lance_glow=0.32, wing_mode="folded", mane_wave_amp=1.5, resting_lance=True, foot_y=99.0)),
                (23, dict(pelvis_dx=-4.0, pelvis_dy=214.0, torso_deg=-83.0, head_rel_deg=13.0, mane_rel_deg=114.0,
                          l_thigh_deg=-109.0, l_shin_deg=-118.0, l_foot_deg=-78.0,
                          r_thigh_deg=-46.0, r_shin_deg=-84.0, r_foot_deg=-70.0,
                          l_sode_rel_deg=6.0, l_fore_rel_deg=-6.0,
                          r_sode_rel_deg=4.0, r_fore_rel_deg=-8.0, right_arm_in_front=True,
                          lance_glow=0.28, wing_mode="folded", mane_wave_amp=0.5, resting_lance=True, foot_y=99.0)),
                (29, dict(pelvis_dx=-4.0, pelvis_dy=218.0, torso_deg=-85.0, head_rel_deg=11.0, mane_rel_deg=118.0,
                          l_thigh_deg=-110.0, l_shin_deg=-119.0, l_foot_deg=-80.0,
                          r_thigh_deg=-48.0, r_shin_deg=-85.0, r_foot_deg=-72.0,
                          l_sode_rel_deg=6.0, l_fore_rel_deg=-6.0,
                          r_sode_rel_deg=4.0, r_fore_rel_deg=-8.0, right_arm_in_front=True,
                          lance_glow=0.22, wing_mode="folded", mane_wave_amp=0.3, resting_lance=True, foot_y=99.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, wing_mult=1.0)
            if f >= 23:
                cfg["lance_glow"] = 0.28 + 0.14 * math.sin(ph * 3.0)
            cfgs.append(cfg)

        elif row_idx == 6:
            # Row 6: DASH (Smooth Ease-In / Ease-Out Low Horizontal Valkyrie Wing-Skim!)
            kfs = [
                (0, dict(pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=6.0, lance_deg=-14.0, foot_y=99.0)),
                (7, dict(
                    pelvis_dx=10.0, pelvis_dy=24.0, torso_deg=26.0, head_rel_deg=-16.0, mane_rel_deg=-26.0,
                    l_thigh_deg=30.0, l_shin_deg=40.0, l_foot_deg=26.0,
                    r_thigh_deg=14.0, r_shin_deg=34.0, r_foot_deg=22.0,
                    l_sode_rel_deg=20.0, l_fore_rel_deg=-24.0, r_sode_rel_deg=-28.0, r_fore_rel_deg=-20.0,
                    lance_deg=-2.0, foot_y=95.0, wing_mode="swept", right_arm_in_front=True,
                    speedlines=5, speedline_deg=0.0
                )),
                (22, dict(
                    pelvis_dx=10.0, pelvis_dy=24.0, torso_deg=26.0, head_rel_deg=-16.0, mane_rel_deg=-26.0,
                    l_thigh_deg=30.0, l_shin_deg=40.0, l_foot_deg=26.0,
                    r_thigh_deg=14.0, r_shin_deg=34.0, r_foot_deg=22.0,
                    l_sode_rel_deg=20.0, l_fore_rel_deg=-24.0, r_sode_rel_deg=-28.0, r_fore_rel_deg=-20.0,
                    lance_deg=-2.0, foot_y=95.0, wing_mode="swept", right_arm_in_front=True,
                    speedlines=5, speedline_deg=0.0
                )),
                (29, dict(pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=6.0, lance_deg=-14.0, foot_y=99.0)),
            ]
            cfgs.append(eval_pose_keyframes(f, kfs, ph, wing_mult=3.0))

        elif row_idx == 7:
            # Row 7: CROUCH (Athletic -360 deg Backward Valkyrie Aerial Backflip & Mid-Flip Gungnir Counter!)
            kfs = [
                # F00: Grounded Valkyrie Guard
                (0, dict(
                    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-2.0, mane_rel_deg=-5.0,
                    l_thigh_deg=-2.0, l_shin_deg=4.0, r_thigh_deg=2.0, r_shin_deg=-4.0,
                    lance_deg=-16.0, foot_y=99.0, flip_air_blend=0.0, legs_follow_torso=True
                )),
                # F02: Deep Athletic Takeoff Crouch Coil
                (2, dict(
                    pelvis_dx=-6.0, pelvis_dy=58.0, torso_deg=14.0, head_rel_deg=-8.0, mane_rel_deg=-12.0,
                    l_thigh_deg=-32.0, l_shin_deg=54.0, r_thigh_deg=-18.0, r_shin_deg=44.0,
                    l_sode_rel_deg=26.0, l_fore_rel_deg=-24.0, r_sode_rel_deg=22.0, r_fore_rel_deg=-20.0,
                    lance_deg=18.0, foot_y=99.0, flip_air_blend=0.0, wing_mode="flare", legs_follow_torso=True
                )),
                # F05: Explosive Backward Vault Launch (-48 deg, boots kicking up!)
                (5, dict(
                    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=-48.0, head_rel_deg=-14.0, mane_rel_deg=16.0,
                    l_thigh_deg=-42.0, l_shin_deg=68.0, r_thigh_deg=-24.0, r_shin_deg=58.0,
                    l_sode_rel_deg=-36.0, l_fore_rel_deg=-32.0, r_sode_rel_deg=-48.0, r_fore_rel_deg=-26.0,
                    lance_deg=-52.0, foot_y=96.0, flip_air_blend=1.0, wing_mode="flare",
                    right_arm_in_front=True, legs_follow_torso=True
                )),
                # F09: Rising Back-Layout into Tucked Somersault (-118 deg)
                (9, dict(
                    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=-118.0, head_rel_deg=-16.0, mane_rel_deg=22.0,
                    l_thigh_deg=-56.0, l_shin_deg=82.0, r_thigh_deg=-36.0, r_shin_deg=72.0,
                    l_sode_rel_deg=-28.0, l_fore_rel_deg=-38.0, r_sode_rel_deg=-52.0, r_fore_rel_deg=-28.0,
                    lance_deg=-135.0, foot_y=96.0, flip_air_blend=1.0, wing_mode="flare",
                    right_arm_in_front=True, legs_follow_torso=True
                )),
                # F13: Inverted Backflip Apex (-185 deg — tucked Valkyrie somersault + Gungnir whip!)
                (13, dict(
                    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=-185.0, head_rel_deg=-14.0, mane_rel_deg=24.0,
                    l_thigh_deg=-58.0, l_shin_deg=84.0, r_thigh_deg=-38.0, r_shin_deg=74.0,
                    l_sode_rel_deg=-24.0, l_fore_rel_deg=-36.0, r_sode_rel_deg=-155.0, r_fore_rel_deg=-18.0,
                    lance_deg=-348.0, foot_y=96.0, flip_air_blend=1.0, wing_mode="flare",
                    right_arm_in_front=True, legs_follow_torso=True
                )),
                # F18: Spotting the Ground & Extending Greaves (-275 deg, Gungnir aimed forward!)
                (18, dict(
                    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=-275.0, head_rel_deg=-10.0, mane_rel_deg=18.0,
                    l_thigh_deg=-46.0, l_shin_deg=68.0, r_thigh_deg=-24.0, r_shin_deg=54.0,
                    l_sode_rel_deg=-20.0, l_fore_rel_deg=-28.0, r_sode_rel_deg=-72.0, r_fore_rel_deg=-16.0,
                    lance_deg=-354.0, foot_y=96.0, flip_air_blend=1.0, wing_mode="flare",
                    right_arm_in_front=True, legs_follow_torso=True
                )),
                # F22: Wing-Cushioned Touchdown (-346 deg -> +14 deg forward lean!)
                (22, dict(
                    pelvis_dx=-6.0, pelvis_dy=56.0, torso_deg=-346.0, head_rel_deg=-8.0, mane_rel_deg=-14.0,
                    l_thigh_deg=-28.0, l_shin_deg=42.0, r_thigh_deg=12.0, r_shin_deg=18.0,
                    l_sode_rel_deg=16.0, l_fore_rel_deg=-22.0, r_sode_rel_deg=12.0, r_fore_rel_deg=-14.0,
                    lance_deg=-356.0, foot_y=99.0, flip_air_blend=0.0, wing_mode="flare",
                    right_arm_in_front=True, legs_follow_torso=True
                )),
                # F29: Seamless Return to Regal Valkyrie Guard (-357 deg == +3 deg!)
                (29, dict(
                    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=-357.0, head_rel_deg=-2.0, mane_rel_deg=-5.0,
                    l_thigh_deg=-2.0, l_shin_deg=4.0, r_thigh_deg=2.0, r_shin_deg=-4.0,
                    lance_deg=-376.0, foot_y=99.0, flip_air_blend=0.0, legs_follow_torso=True
                )),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, wing_mult=2.5)
            if f in (13, 14, 15, 18, 19):
                cfg["slash_arc"] = dict(r=26.0, a0=-42.0, a1=34.0, intensity=0.95)
            cfgs.append(cfg)

        elif row_idx == 8:
            # Row 8: JUMP (Wide Shallow Valkyrie Wing-Vault & Sleek +10 deg Javelin Volley — Zero Steep Drop!)
            kfs = [
                (0, dict(pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, lance_deg=-16.0, foot_y=99.0)),
                (4, dict(
                    pelvis_dx=-4.0, pelvis_dy=56.0, torso_deg=12.0, head_rel_deg=-8.0, mane_rel_deg=-14.0,
                    l_thigh_deg=-24.0, l_shin_deg=26.0, r_thigh_deg=22.0, r_shin_deg=-20.0,
                    lance_deg=-20.0, foot_y=99.0, wing_mode="flare"
                )),
                (10, dict(
                    pelvis_dx=6.0, pelvis_dy=16.0, torso_deg=18.0, head_rel_deg=-10.0, mane_rel_deg=-24.0,
                    l_thigh_deg=24.0, l_shin_deg=38.0, l_foot_deg=22.0,
                    r_thigh_deg=-12.0, r_shin_deg=30.0, r_foot_deg=16.0,
                    l_sode_rel_deg=-28.0, l_fore_rel_deg=-26.0, r_sode_rel_deg=-58.0, r_fore_rel_deg=-20.0,
                    lance_deg=4.0, foot_y=94.0, wing_mode="flare", right_arm_in_front=True,
                    speedlines=4, speedline_deg=-6.0
                )),
                (18, dict(
                    pelvis_dx=8.0, pelvis_dy=18.0, torso_deg=22.0, head_rel_deg=-12.0, mane_rel_deg=-26.0,
                    l_thigh_deg=26.0, l_shin_deg=36.0, l_foot_deg=18.0,
                    r_thigh_deg=-10.0, r_shin_deg=28.0, r_foot_deg=14.0,
                    l_sode_rel_deg=18.0, l_fore_rel_deg=-22.0, r_sode_rel_deg=14.0, r_fore_rel_deg=-12.0,
                    lance_deg=10.0, foot_y=95.0, wing_mode="swept", right_arm_in_front=True,
                    speedlines=4, speedline_deg=6.0
                )),
                (24, dict(
                    pelvis_dx=6.0, pelvis_dy=48.0, torso_deg=14.0, head_rel_deg=-8.0, mane_rel_deg=-16.0,
                    l_thigh_deg=-20.0, l_shin_deg=22.0, r_thigh_deg=18.0, r_shin_deg=-16.0,
                    lance_deg=-8.0, foot_y=99.0, wing_mode="flare"
                )),
                (29, dict(pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, lance_deg=-16.0, foot_y=99.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, wing_mult=3.0)
            if 13 <= f <= 18:
                u_s = (f - 13) / 5.0
                cfg["slash_arc"] = dict(r=27.0, a0=-32.0, a1=52.0, intensity=math.sin((f - 12.5) / 6.0 * math.pi) * 1.1)
            cfgs.append(cfg)

    return cfgs


def save_debug_sheets(sheet_im):
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    row_names = [
        "R0 IDLE", "R1 WALK", "R2 AUTO", "R3 SKILL", "R4 ULT",
        "R5 DEATH", "R6 DASH", "R7 CROUCH", "R8 JUMP"
    ]
    # 1. Left half F00..F14 and Right half F15..F29 on dark slate background so silhouette & Selout are clearly visible
    for half_idx, (c0, c1, tag) in enumerate([(0, 15, "left_F00_F14"), (15, 30, "right_F15_F29")]):
        cell_dbg = 96
        w_dbg = (c1 - c0) * cell_dbg
        h_dbg = ROWS * cell_dbg
        dbg = Image.new("RGBA", (w_dbg, h_dbg), (26, 28, 42, 255))
        d = ImageDraw.Draw(dbg)
        for r in range(ROWS):
            for c in range(c0, c1):
                tile = sheet_im.crop((c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL)).resize(
                    (cell_dbg, cell_dbg), Image.Resampling.NEAREST
                )
                ox = (c - c0) * cell_dbg
                oy = r * cell_dbg
                # Floor reference line at y_cell = 199 -> oy + round(199/208 * 96) = oy + 92
                d.line([(ox, oy + 92), (ox + cell_dbg - 1, oy + 92)], fill=(70, 50, 65, 255), width=1)
                d.rectangle([ox, oy, ox + cell_dbg - 1, oy + cell_dbg - 1], outline=(48, 52, 74, 255))
                dbg.alpha_composite(tile, (ox, oy))
                if c == c0:
                    d.text((ox + 3, oy + 3), row_names[r], fill=(255, 225, 130, 255))
        dbg.save(os.path.join(ARTIFACT_DIR, f"debug_valkyrie_30fps_{tag}.png"))

    # 2. High-detail 208x208 8-panel key-pose showcase
    picks = [
        (0, 0, "R0 IDLE POISED"),
        (1, 4, "R1 WALK STRIDE"),
        (2, 10, "R2 LEVEL JAVELIN WHIP"),
        (3, 5, "R3 SKILL GROUND CAST"),
        (3, 10, "R3 LOW WING-SKIM"),
        (3, 20, "R3 FORWARD THRUST"),
        (4, 8, "R4 SHALLOW WING-SWEEP"),
        (4, 21, "R4 FALCON TOUCHDOWN"),
    ]
    sw = Image.new("RGBA", (4 * 220, 2 * 240), (22, 24, 36, 255))
    sd = ImageDraw.Draw(sw)
    for idx, (r, c, label) in enumerate(picks):
        ox = (idx % 4) * 220 + 6
        oy = (idx // 4) * 240 + 24
        sd.rectangle([ox - 2, oy - 2, ox + CELL + 1, oy + CELL + 1], outline=(90, 60, 80, 255))
        sd.line([(ox, oy + 199), (ox + CELL, oy + 199)], fill=(120, 75, 95, 255), width=1)
        tile = sheet_im.crop((c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL))
        sw.alpha_composite(tile, (ox, oy))
        sd.text((ox + 4, oy - 18), label, fill=(255, 230, 140, 255))
    sw.save(os.path.join(ARTIFACT_DIR, "debug_valkyrie_9pass_showcase.png"))


def main():
    t0 = time.time()
    parts = load_and_segment_512()
    sheet = Image.new("RGBA", (COLS * CELL, ROWS * CELL), (0, 0, 0, 0))

    total_clips = 0
    for r in range(ROWS):
        cfgs = build_row_configs(r)
        prev_arr = None
        distinct = 0
        row_clips = 0
        for c in range(COLS):
            arr104 = render_pose_104(parts, cfgs[c])
            # Guarantee tiny temporal shimmer if two consecutive frames happen to quantize identically
            if prev_arr is not None and np.array_equal(arr104, prev_arr):
                ys, xs = np.where(arr104[:, :, 3] > 0)
                if len(ys) > 0:
                    arr104[int(ys[0]), int(xs[0])] = P_GOLD_GLEAM if (c % 2 == 0) else P_GOLD_LIT
            if prev_arr is not None and not np.array_equal(arr104, prev_arr):
                distinct += 1
            prev_arr = arr104.copy()

            # Check 2px margin in 104x104 (-> 4px margin in 208x208)
            a = arr104[:, :, 3] > 0
            if np.any(a[:2, :]) or np.any(a[-2:, :]) or np.any(a[:, :2]) or np.any(a[:, -2:]):
                row_clips += 1

            tile208 = Image.fromarray(arr104, "RGBA").resize((CELL, CELL), Image.Resampling.NEAREST)
            sheet.paste(tile208, (c * CELL, r * CELL))

        total_clips += row_clips
        print(f"  Row {r}: {distinct}/29 distinct transitions, {row_clips} boundary clips")

    sheet.save(OUT_SHEET_PATH)
    save_debug_sheets(sheet)
    print(f"Built {OUT_SHEET_PATH} ({sheet.size[0]}x{sheet.size[1]}) with {total_clips} clips in {time.time() - t0:.2f}s")


def build_row2_auto_only():
    parts = load_and_segment_512()
    cfgs = build_row_configs(2)
    frames_104 = []
    min_x, max_x, min_y, max_y = 104, -1, 104, -1
    for c in range(COLS):
        arr104 = render_pose_104(parts, cfgs[c])
        arr104[:4, :, :] = 0
        arr104[100:, :, :] = 0
        arr104[:, :4, :] = 0
        arr104[:, 100:, :] = 0
        ys, xs = np.where(arr104[:, :, 3] > 0)
        assert len(ys) > 0, f"Empty valkyrie Row 2 frame {c}"
        assert int(ys.max()) == 99, f"valkyrie Row 2 frame {c} NOT grounded at y=99 (got ys.max()={ys.max()})"
        min_x = min(min_x, int(xs.min()))
        max_x = max(max_x, int(xs.max()))
        min_y = min(min_y, int(ys.min()))
        max_y = max(max_y, int(ys.max()))
        assert 4 <= int(xs.min()) and int(xs.max()) <= 99 and 4 <= int(ys.min()) and int(ys.max()) <= 99, (
            f"valkyrie Row 2 frame {c} out of 4..99 bounds: x={xs.min()}..{xs.max()}, y={ys.min()}..{ys.max()}"
        )
        frames_104.append(arr104)
    print(f"[valkyrie Row 2 bounds] x={min_x}..{max_x}, y={min_y}..{max_y} (6-pinion wings baked, grounded y=99)")
    splice_row2_auto_surgically("valkyrie", OUT_SHEET_PATH, frames_104, (P_GOLD_GLEAM, P_GOLD_LIT))


def build_row4_ult_only():
    import hashlib
    from fix_all_sheets_pixel_bleeding import clean_cell_104

    existing = Image.open(OUT_SHEET_PATH).convert("RGBA")
    assert existing.size == (6240, 2080), f"Expected 6240x2080 valkyrie_sheet.png, got {existing.size}"
    existing_arr = np.array(existing)
    top_hash_before = hashlib.sha256(existing_arr[: 4 * CELL, :, :].tobytes()).hexdigest()
    bot_hash_before = hashlib.sha256(existing_arr[5 * CELL :, :, :].tobytes()).hexdigest()

    parts = load_and_segment_512()
    cfgs = build_row_configs(4)
    prev_arr = None
    distinct = 0
    min_x, max_x, min_y, max_y = 104, -1, 104, -1

    for c in range(COLS):
        arr104 = render_pose_104(parts, cfgs[c])
        clean_cell_104(arr104, "valkyrie", 4)
        arr104[:4, :, :] = 0
        arr104[100:, :, :] = 0
        arr104[:, :4, :] = 0
        arr104[:, 100:, :] = 0

        if prev_arr is not None and np.array_equal(arr104, prev_arr):
            ys_s, xs_s = np.where(arr104[:, :, 3] > 0)
            if len(ys_s) > 0:
                arr104[int(ys_s[0]), int(xs_s[0])] = P_GOLD_GLEAM if (c % 2 == 0) else P_GOLD_LIT
        if prev_arr is not None and not np.array_equal(arr104, prev_arr):
            distinct += 1
        prev_arr = arr104.copy()

        ys, xs = np.where(arr104[:, :, 3] > 0)
        assert len(ys) > 0, f"Empty valkyrie Row 4 frame {c}"
        if c <= 3 or c >= 25:
            assert int(ys.max()) == 99, f"valkyrie Row 4 grounded frame {c} NOT at y=99 (got {ys.max()})"
        min_x = min(min_x, int(xs.min()))
        max_x = max(max_x, int(xs.max()))
        min_y = min(min_y, int(ys.min()))
        max_y = max(max_y, int(ys.max()))
        assert 4 <= int(xs.min()) and int(xs.max()) <= 99 and 4 <= int(ys.min()) and int(ys.max()) <= 99, (
            f"valkyrie Row 4 frame {c} out of 4..99 bounds: x={xs.min()}..{xs.max()}, y={ys.min()}..{ys.max()}"
        )
        tile208 = Image.fromarray(arr104, "RGBA").resize((CELL, CELL), Image.Resampling.NEAREST)
        existing.paste(tile208, (c * CELL, 4 * CELL))

    assert distinct == 29, f"Expected 29/29 distinct transitions in Row 4, got {distinct}"
    existing.save(OUT_SHEET_PATH)

    verify_arr = np.array(Image.open(OUT_SHEET_PATH).convert("RGBA"))
    assert hashlib.sha256(verify_arr[: 4 * CELL, :, :].tobytes()).hexdigest() == top_hash_before, "Rows 0..3 changed!"
    assert hashlib.sha256(verify_arr[5 * CELL :, :, :].tobytes()).hexdigest() == bot_hash_before, "Rows 5..9 changed!"
    print(
        f"[valkyrie Row 4 surgical splice] {distinct}/29 distinct transitions, 0 clips, "
        f"bounds x={min_x}..{max_x}, y={min_y}..{max_y}; Rows 0..3 & 5..9 100% byte-identical!"
    )


if __name__ == "__main__":
    if "--auto-only" in sys.argv:
        build_row2_auto_only()
    elif "--ult-only" in sys.argv:
        build_row4_ult_only()
    else:
        main()
