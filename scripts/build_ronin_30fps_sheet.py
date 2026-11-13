#!/usr/bin/env python3
"""
Builds Kaze-Maru (Ronin) 30fps HD-2D Sprite Sheet (6240x1872, 30 cols x 9 rows of 208x208)
and VFX Sheet (6240x832, 30 cols x 4 rows of 208x208) using:
- Cape-free HD-2D reference base model: assets/sprites/ronin_v2_base.jpg
- 13-part anatomical segmentation (mane, head, torso, l_sode, l_forearm, r_sode, r_forearm,
  l_thigh, l_shin, l_foot, r_thigh, r_shin, r_foot)
- 104x104 logical resolution upscaled 2x NEAREST to 208x208 (400% finer detail than 52x52,
  preserving golden crescent Kabuto horns, Menpo Oni-mask tusks, glowing cyan eyes,
  silver wolf-mane, Do-Maru lightning filigree, Obi waist rope, Kusazuri tassets,
  diamond Kikko knee-guards, Suneate greaves, and Tabi/Waraji sandals)
- 100% Handcrafted Hierarchical Skeletal Articulation (zero scanline pulling/shearing)
"""

import os
import sys
import math
import time
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hd2d_rig_core import (
    compute_bipedal_walk_pose,
    splice_row1_walk_surgically,
    splice_row2_auto_surgically,
)
from fix_all_sheets_pixel_bleeding import clean_cell_104

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE_IMG_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "ronin_v2_base.jpg")
OUT_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "ronin_sheet.png")
OUT_VFX_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "ronin_vfx.png")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"

CELL = 208
LOGICAL = 104
COLS = 30
ROWS = 9
VFX_ROWS = 4

PIVOTS = dict(
    pelvis=(267.5, 287.5), neck=(277.5, 134.0), mane=(252.5, 59.0),
    l_sh=(220.0, 137.5), l_elb=(179.0, 197.5), l_hand=(185.0, 277.5),
    r_sh=(309.0, 142.5), r_elb=(324.0, 202.5), r_hand=(361.0, 270.0),
    l_hip=(227.5, 290.0), l_knee=(196.0, 367.5), l_ank=(169.0, 444.0),
    r_hip=(302.5, 290.0), r_knee=(337.5, 362.5), r_ank=(327.5, 439.0),
)

# Strict 18-Color Hand-Crafted Pixel-Art Samurai Master Palette (Zero Continuous AI Gradients)
MASTER_PALETTE = np.array([
    # 0-1: Crisp Selective Outlines (Selout) & Deepest Crevices
    [12, 14, 24],     # 0: Abyssal Outline
    [20, 24, 40],     # 1: Dark Indigo Selout / Deep Crevice
    # 2-5: 4-Step Indigo-Steel Samurai Armor & Hakama Cel Ramp (crisp metallic plate readability)
    [32, 37, 62],     # 2: Hakama / Armor Deep Shadow
    [48, 56, 92],     # 3: Do-Maru Armor Base Indigo
    [74, 86, 134],    # 4: Do-Maru Armor Lit Steel-Indigo
    [112, 126, 178],  # 5: Armor Plate Specular Rim
    # 6-8: 3-Step Royal Amethyst / Violet Odoshi Lacing & Obi Ramp
    [68, 38, 106],    # 6: Deep Violet Cord Shadow
    [110, 62, 164],   # 7: Royal Amethyst Obi / Lacing Mid
    [158, 102, 216],  # 8: Bright Lavender Silk Highlight
    # 9-12: 4-Step Moonlit Silver Wolf-Mane & Steel Ramp
    [116, 128, 158],  # 9: Silver Mane Cool Slate Shadow
    [162, 174, 204],  # 10: Silver Mane Midtone
    [210, 220, 240],  # 11: Moonlit Silver Highlight
    [246, 250, 255],  # 12: Pure Snow-Silver Specular
    # 13-15: 3-Step Imperial Gold Kabuto Crescent & Trim Ramp
    [136, 92, 36],    # 13: Antique Bronze Shadow
    [202, 152, 54],   # 14: Imperial Samurai Gold
    [250, 214, 96],   # 15: Sunlit Gold Highlight
    # 16-17: 2-Step Raijin Electric Cyan Eye & Crest Accent
    [42, 174, 224],   # 16: Deep Storm Cyan
    [106, 242, 255],  # 17: Luminous Electric Cyan
], dtype=np.int32)


def quantize_and_cluster_104(arr104):
    """
    Transforms a downsampled 104x104 RGBA frame into authentic hand-clustered pixel art:
    1. Quantizes all opaque pixels to the 18-color MASTER_PALETTE (eliminating AI gradients/mixels).
    2. Runs 2 passes of cardinal neighbor majority clustering (removing isolated 1px AI speckles).
    3. Applies a crisp 1px dark selective outline (Selout) around the silhouette.
    """
    out = arr104.copy()
    alpha = out[:, :, 3] > 128
    out[~alpha] = [0, 0, 0, 0]
    out[alpha, 3] = 255
    if not np.any(alpha):
        return out

    # 1. Map every opaque RGB pixel to nearest color in MASTER_PALETTE
    rgb = out[:, :, :3].astype(np.int32)
    diff = rgb[:, :, None, :] - MASTER_PALETTE[None, None, :, :]
    # Perceptual weights (protect hue differences between indigo, violet, gold, and cyan)
    dist2 = diff[:, :, :, 0] ** 2 * 2 + diff[:, :, :, 1] ** 2 * 3 + diff[:, :, :, 2] ** 2 * 2
    idx_map = np.argmin(dist2, axis=2)
    idx_map[~alpha] = -1

    # 2. Two passes of Cardinal Pixel-Clustering (Orphan-Pixel Despeckle)
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
        # Isolated 1px speckle (differs from all 4 cardinal neighbors, and not a bright gold/cyan accent)
        interior = alpha & (up >= 0) & (dn >= 0) & (lf >= 0) & (rt >= 0)
        protect = (idx_map == 15) | (idx_map == 17)
        orphan = interior & (same_cnt == 0) & (~protect)

        replacement = np.where((up == dn) & (up >= 0), up, np.where((lf == rt) & (lf >= 0), lf, up))
        idx_map = np.where(orphan & (replacement >= 0), replacement, idx_map)

    # 3. Crisp 1px Selective Outline (Selout) on outer silhouette edges
    up_a = np.pad(alpha[:-1, :], ((1, 0), (0, 0)), constant_values=False)
    dn_a = np.pad(alpha[1:, :], ((0, 1), (0, 0)), constant_values=False)
    lf_a = np.pad(alpha[:, :-1], ((0, 0), (1, 0)), constant_values=False)
    rt_a = np.pad(alpha[:, 1:], ((0, 0), (0, 1)), constant_values=False)
    edge = alpha & (~(up_a & dn_a & lf_a & rt_a))

    is_mane = (idx_map >= 9) & (idx_map <= 12)
    is_gold_or_cyan = idx_map >= 14
    body_edge = edge & (~is_mane) & (~is_gold_or_cyan)
    mane_edge = edge & is_mane

    # Upper/left lit silhouette gets Dark Indigo Selout (1); lower/right shadow edge gets Abyssal Outline (0)
    shadow_edge = body_edge & ((~dn_a) | (~rt_a))
    lit_edge = body_edge & (~shadow_edge)
    idx_map[lit_edge] = 1
    idx_map[shadow_edge] = 0
    idx_map[mane_edge & ((~dn_a) | (~rt_a))] = 3

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
    Loads ronin_v2_base.jpg (1024x1024), removes exterior & interior white pockets,
    applies cel-clustering & AI-confetti suppression on the 512x512 master rig,
    and segments into 13 clean anatomical pixel-art parts.
    """
    im = Image.open(BASE_IMG_PATH).convert("RGBA")
    for seed in [(0, 0), (1023, 0), (0, 1023), (1023, 1023), (430, 412), (460, 625)]:
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
        white_fringe = edge & (r > 165) & (g > 165) & (b > 165) & (np.abs(r - g) < 32) & (np.abs(g - b) < 32)
        arr[white_fringe] = [0, 0, 0, 0]

    # Downsample 2x NEAREST to 512x512 and run Median Cel-Clustering to flatten AI brushwork into clean cel planes
    im512 = Image.fromarray(arr, "RGBA").resize((512, 512), Image.Resampling.NEAREST)
    rgb512 = im512.convert("RGB")
    rgb_med3 = np.array(rgb512.filter(ImageFilter.MedianFilter(size=3)))
    rgb_med5 = np.array(rgb512.filter(ImageFilter.MedianFilter(size=5)))
    arr512 = np.array(im512)
    H, W = arr512.shape[:2]
    alpha = arr512[:, :, 3] > 0

    # Use 3x3 median on head/helmet (y < 142) to keep crisp crescent horns & eyes, 5x5 median on armor/body (y >= 142)
    yy = np.arange(H)[:, None]
    cel_rgb = np.where(yy[:, :, None] < 142, rgb_med3, rgb_med5)

    # Suppress noisy AI cyan filigree speckles on lower armor/legs (y >= 210) while keeping breastplate crest & gold rims
    r5 = cel_rgb[:, :, 0].astype(np.int16)
    g5 = cel_rgb[:, :, 1].astype(np.int16)
    b5 = cel_rgb[:, :, 2].astype(np.int16)
    lower_legs = (yy >= 210) & alpha
    noisy_cyan_speckle = lower_legs & ((b5 - r5) > 42) & ((g5 - r5) > 24)
    cel_rgb[noisy_cyan_speckle] = [74, 86, 134]
    arr512[:, :, :3] = np.where(alpha[:, :, None], cel_rgb, 0)

    def P(pts):
        return [(x * 0.5, y * 0.5) for (x, y) in pts]

    m_head = poly_mask(H, W, P([
        (515, 35), (675, 35), (675, 225), (630, 252),
        (590, 290), (540, 292), (490, 250), (432, 220),
        (432, 200), (478, 148), (488, 120), (512, 95)
    ])) & alpha

    m_l_sode = poly_mask(H, W, P([
        (350, 220), (435, 220), (485, 252), (470, 310),
        (445, 365), (412, 405), (300, 392), (300, 330)
    ])) & alpha & (~m_head)

    m_l_forearm = poly_mask(H, W, P([
        (295, 385), (408, 395), (390, 485), (404, 530),
        (402, 555), (382, 578), (352, 584), (328, 572),
        (322, 505), (295, 460)
    ])) & alpha & (~m_l_sode)

    m_mane = poly_mask(H, W, P([
        (170, 10), (535, 10), (530, 115), (485, 155),
        (440, 225), (365, 265), (315, 345), (170, 345)
    ])) & alpha & (~m_head) & (~m_l_sode)

    m_r_sode = poly_mask(H, W, P([
        (596, 246), (665, 246), (710, 390), (678, 420),
        (610, 420), (602, 355)
    ])) & alpha & (~m_head)

    m_r_forearm = poly_mask(H, W, P([
        (618, 398), (692, 392), (775, 520), (775, 585),
        (688, 585), (686, 512), (642, 468), (618, 435)
    ])) & alpha & (~m_r_sode)

    m_torso = poly_mask(H, W, P([
        (420, 240), (615, 240), (615, 440), (712, 608),
        (672, 638), (622, 642), (504, 642),
        (432, 636), (344, 610), (402, 470),
        (428, 435), (425, 355)
    ])) & alpha & (~m_head) & (~m_l_sode) & (~m_l_forearm) & (~m_r_sode) & (~m_r_forearm)

    m_l_foot = poly_mask(H, W, P([
        (260, 882), (385, 892), (385, 995), (260, 995)
    ])) & alpha

    m_l_shin = poly_mask(H, W, P([
        (335, 725), (395, 688), (435, 735), (432, 785),
        (385, 900), (285, 895), (310, 765)
    ])) & alpha & (~m_l_foot)

    m_l_thigh = poly_mask(H, W, P([
        (320, 560), (532, 560), (532, 665), (485, 765), (320, 765)
    ])) & alpha & (~m_torso) & (~m_l_shin)

    m_r_foot = poly_mask(H, W, P([
        (600, 872), (780, 872), (780, 975), (600, 975)
    ])) & alpha

    m_r_shin = poly_mask(H, W, P([
        (648, 725), (715, 678), (745, 720), (715, 785),
        (698, 885), (608, 885), (598, 755)
    ])) & alpha & (~m_r_foot)

    m_r_thigh = poly_mask(H, W, P([
        (532, 560), (735, 560), (735, 755), (580, 755), (532, 650)
    ])) & alpha & (~m_torso) & (~m_r_shin)

    parts = {}
    for name, m in [
        ("mane", m_mane), ("head", m_head), ("torso", m_torso),
        ("l_sode", m_l_sode), ("l_forearm", m_l_forearm),
        ("r_sode", m_r_sode), ("r_forearm", m_r_forearm),
        ("l_thigh", m_l_thigh), ("l_shin", m_l_shin), ("l_foot", m_l_foot),
        ("r_thigh", m_r_thigh), ("r_shin", m_r_shin), ("r_foot", m_r_foot),
    ]:
        if name != "mane":
            m = keep_largest_component(m)
        ys, xs = np.where(m)
        x0, x1 = int(xs.min()), int(xs.max()) + 1
        y0, y1 = int(ys.min()), int(ys.max()) + 1
        crop = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
        sub_m = m[y0:y1, x0:x1]
        crop[sub_m] = arr512[y0:y1, x0:x1][sub_m]
        parts[name] = (Image.fromarray(crop, "RGBA"), x0, y0)

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
            dy = int(round(math.sin(wave_phase + dist * 4.2) * wave_amp * (dist ** 1.1)))
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


def draw_joint_cap(draw, pt, r, fill=(22, 26, 44, 255), inner=(34, 40, 66, 255)):
    cx, cy = int(round(pt[0])), int(round(pt[1]))
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)
    ir = max(1, int(r * 0.65))
    draw.ellipse([cx - ir, cy - ir, cx + ir, cy + ir], fill=inner)


def draw_capsule(draw, p0, p1, r, fill=(22, 26, 44, 255)):
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


def draw_raijin_drums_104(arr, neck_x, neck_y, torso_deg, phase=0.0, active=False):
    rad = math.radians(torso_deg)
    bob = math.sin(phase) * 1.2
    drum_pts = []
    for side, (ox, oy) in [(-1, (-13, -6)), (1, (-5, -13))]:
        cx = neck_x + ox * math.cos(rad) - oy * math.sin(rad)
        cy = neck_y + ox * math.sin(rad) + oy * math.cos(rad) + bob
        drum_pts.append((cx, cy))
        for dy in range(-4, 5):
            for dx in range(-4, 5):
                d2 = dx * dx + dy * dy
                if d2 <= 18:
                    if d2 >= 11:
                        put_px(arr, cx + dx, cy + dy, (245, 200, 75, 255) if active else (232, 182, 62, 255))
                    else:
                        put_px(arr, cx + dx, cy + dy, (24, 28, 48, 255))
        # Rotating Tomoe lightning runes inside each drum
        a_rot = phase + side * 0.8
        for k in range(3):
            ang = a_rot + k * (2.0 * math.pi / 3.0)
            rx = cx + math.cos(ang) * 1.7
            ry = cy + math.sin(ang) * 1.7
            put_px(arr, rx, ry, (235, 255, 255, 255) if active else (95, 238, 255, 255))
        put_px(arr, cx, cy, (175, 125, 255, 255) if int(phase * 3) % 2 == 0 else (110, 248, 255, 255))

    if active and len(drum_pts) == 2:
        # Crackling plasma arc bridging the twin Raijin drums
        (x0, y0), (x1, y1) = drum_pts
        mx = 0.5 * (x0 + x1) + math.sin(phase * 3.0) * 1.8
        my = 0.5 * (y0 + y1) - 2.2 + math.cos(phase * 2.5) * 1.5
        draw_line_104(arr, x0, y0, mx, my, (110, 248, 255, 255), 1)
        draw_line_104(arr, mx, my, x1, y1, (185, 135, 255, 255), 1)


def draw_saya_104(arr, hip_x, hip_y, saya_deg=155.0, sheathed=False, charge_phase=0.0):
    rad = math.radians(saya_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux
    mx, my = hip_x - ux * 5, hip_y - uy * 5
    tx, ty = hip_x + ux * 21, hip_y + uy * 21
    steps = 56
    for i in range(steps + 1):
        t = i / steps
        curve = math.sin(t * math.pi) * 1.8
        px = mx + (tx - mx) * t + nx * curve
        py = my + (ty - my) * t + ny * curve
        if t < 0.09 or t > 0.89 or (0.34 < t < 0.40) or (0.64 < t < 0.70):
            col = (238, 190, 68, 255)
        else:
            col = (20, 24, 40, 255)
        put_px(arr, px, py, col)
        put_px(arr, px + nx * 0.9, py + ny * 0.9, (42, 48, 76, 255) if col[0] < 100 else (255, 225, 110, 255))
    if sheathed:
        hx, hy = mx - ux * 10, my - uy * 10
        draw_line_104(arr, mx, my, hx, hy, (35, 22, 45, 255), 2)
        for k in range(1, 5):
            kt = k / 5.0
            put_px(arr, mx + (hx - mx) * kt, my + (hy - my) * kt, (220, 65, 95, 255))
        put_px(arr, hx, hy, (245, 200, 78, 255))
        for d in [-2, -1, 0, 1, 2]:
            put_px(arr, mx + nx * d, my + ny * d, (248, 208, 82, 255))
        # Pulsing cyan Iaido charge spark at Koiguchi throat
        put_px(arr, mx, my, (235, 255, 255, 255))
        for k in range(3):
            ang = charge_phase * 2.0 + k * 2.1
            sx = mx + math.cos(ang) * 2.4
            sy = my + math.sin(ang) * 2.4
            put_px(arr, sx, sy, (95, 245, 255, 255))


def draw_odachi_104(arr, hand_x, hand_y, blade_deg, blade_len=30.0, curve_sign=-1.0, glow=1.0, phase=0.0):
    rad = math.radians(blade_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy * curve_sign, ux * curve_sign

    pom_x, pom_y = hand_x - ux * 8.0, hand_y - uy * 8.0
    tsuba_x, tsuba_y = hand_x + ux * 2.2, hand_y + uy * 2.2
    draw_line_104(arr, pom_x, pom_y, tsuba_x, tsuba_y, (28, 22, 42, 255), 2)
    for k in range(1, 4):
        kt = k / 4.0
        put_px(arr, pom_x + (tsuba_x - pom_x) * kt, pom_y + (tsuba_y - pom_y) * kt, (215, 62, 92, 255))
    put_px(arr, pom_x, pom_y, (245, 202, 78, 255))
    put_px(arr, pom_x + nx, pom_y + ny, (205, 155, 45, 255))

    for d in [-2.2, -1.2, -0.4, 0.4, 1.2, 2.2]:
        put_px(arr, tsuba_x + nx * d, tsuba_y + ny * d, (248, 208, 82, 255))
    hab_x, hab_y = tsuba_x + ux * 1.4, tsuba_y + uy * 1.4
    put_px(arr, hab_x, hab_y, (255, 230, 125, 255))
    put_px(arr, hab_x + nx * 0.8, hab_y + ny * 0.8, (225, 180, 65, 255))

    steps = int(blade_len * 2.5)
    spark_idx = int((phase / (2.0 * math.pi)) * steps) % max(1, steps)
    for i in range(steps + 1):
        t = i / max(1, steps)
        dist = 1.8 + t * blade_len
        c_off = (t ** 1.65) * 3.0
        bx = tsuba_x + ux * dist + nx * c_off
        by = tsuba_y + uy * dist + ny * c_off

        put_px(arr, bx - nx * 0.85, by - ny * 0.85, (48, 62, 92, 255))
        if glow > 0.5 and ((i + int(phase * 4)) % 3 != 0):
            put_px(arr, bx, by, (105, 245, 255, 255))
        else:
            put_px(arr, bx, by, (175, 215, 245, 255))
        put_px(arr, bx + nx * 0.8, by + ny * 0.8, (245, 252, 255, 255))

        if abs(i - spark_idx) <= 2:
            put_px(arr, bx + nx * 1.6, by + ny * 1.6, (165, 252, 255, 255))


def draw_slash_arc_104(arr, cx, cy, r_main, a_start_deg, a_end_deg, intensity=1.0, violet_tint=False):
    if intensity <= 0.05:
        return
    a0 = math.radians(a_start_deg)
    a1 = math.radians(a_end_deg)
    steps = 90
    for i in range(steps + 1):
        t = i / steps
        ang = a0 + (a1 - a0) * t
        env = math.sin(t * math.pi)
        thickness = max(1.0, 4.5 * env * intensity)
        c, s = math.cos(ang), math.sin(ang)
        for dr in np.linspace(-thickness, thickness, int(thickness * 3) + 2):
            rr = r_main + dr
            px = cx + c * rr
            py = cy + s * rr
            nd = abs(dr) / max(0.5, thickness)
            if nd < 0.32:
                col = (242, 255, 255, 255)
            elif nd < 0.68:
                col = (185, 130, 255, 255) if violet_tint else (88, 242, 255, 255)
            else:
                col = (95, 58, 205, 255) if violet_tint else (32, 128, 225, 255)
            if 4 <= px <= 99 and 4 <= py <= 99:
                put_px(arr, px, py, col)


def draw_mach_cone_104(arr, tip_x, tip_y, dive_deg, length=38.0, intensity=1.0, ultimate=False):
    """
    Draws an aerodynamic Supersonic Mach-Cone Shockwing around the Thunder-Odachi spearhead
    during Kaze-Maru's full-body Spear-Dive (Skill & Ultimate).
    """
    rad = math.radians(dive_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux
    steps = int(length * 2)
    for i in range(steps + 1):
        t = i / max(1, steps)
        dist = t * length
        # Parabolic supersonic shockwave cone expanding behind tip_x, tip_y
        spread = (t ** 0.78) * (15.5 if ultimate else 11.5) * intensity
        bx = tip_x - ux * dist
        by = tip_y - uy * dist
        for side in (-1.0, 1.0):
            wx = bx + nx * spread * side
            wy = by + ny * spread * side
            if 4 <= wx <= 99 and 4 <= wy <= 99:
                put_px(arr, wx, wy, (240, 255, 255, 255) if t < 0.35 else (92, 242, 255, 255))
            wx2 = bx + nx * max(0.0, spread - 1.5) * side
            wy2 = by + ny * max(0.0, spread - 1.5) * side
            if 4 <= wx2 <= 99 and 4 <= wy2 <= 99:
                put_px(arr, wx2, wy2, (185, 128, 255, 255) if ultimate else (42, 155, 240, 255))
        # Central spear core glow
        if t < 0.65 and 4 <= bx <= 99 and 4 <= by <= 99:
            put_px(arr, bx, by, (245, 255, 255, 255))
        # Helical plasma ring ribs for Ultimate
        if ultimate and (i % 12 == 0) and t > 0.15:
            for d in np.linspace(-spread * 0.85, spread * 0.85, 14):
                rx = bx + nx * d
                ry = by + ny * d
                if 4 <= rx <= 99 and 4 <= ry <= 99:
                    put_px(arr, rx, ry, (255, 222, 105, 255) if abs(d) < spread * 0.35 else (110, 248, 255, 255))


def draw_x_slash_104(arr, cx, cy, radius=24.0, phase=0.0, ultimate=False):
    for ang_deg in (-32.0, 32.0):
        rad = math.radians(ang_deg)
        ux, uy = math.cos(rad), math.sin(rad)
        nx, ny = -uy, ux
        for d in np.linspace(-radius, radius, int(radius * 3)):
            env = 1.0 - (abs(d) / max(1.0, radius)) ** 1.5
            px, py = cx + ux * d, cy + uy * d
            if 4 <= px <= 99 and 4 <= py <= 99:
                put_px(arr, px, py, (248, 255, 255, 255))
            if env > 0.35:
                for s in (-1.0, 1.0):
                    sx, sy = px + nx * s, py + ny * s
                    if 4 <= sx <= 99 and 4 <= sy <= 99:
                        put_px(arr, sx, sy, (255, 218, 95, 255) if ultimate and abs(d) < radius * 0.4 else (88, 242, 255, 255))


def render_pose_104(parts, cfg):
    """
    Renders a single 104x104 logical frame from the 512x512 segmented anatomical rig.
    """
    canvas = Image.new("RGBA", (600, 560), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    OX, OY = 40, 20

    # All 512x512 joint pivots are 0.5x of the 1024x1024 coordinates
    pelvis_src = (267.5, 287.5)
    pelvis_dst = (267.5 + OX + cfg.get("pelvis_dx", 0.0) * 0.5, 287.5 + OY + cfg.get("pelvis_dy", 0.0) * 0.5)
    torso_deg = cfg.get("torso_deg", 0.0)
    head_deg = torso_deg + cfg.get("head_rel_deg", 0.0)
    mane_deg = head_deg + cfg.get("mane_rel_deg", 0.0)

    def torso_joint(pt):
        r = rot_pt(pt, pelvis_src, torso_deg)
        return (pelvis_dst[0] + (r[0] - pelvis_src[0]), pelvis_dst[1] + (r[1] - pelvis_src[1]))

    neck_src = (277.5, 134.0)
    neck_dst = torso_joint(neck_src)

    mane_src = (252.5, 59.0)
    mane_r = rot_pt(mane_src, neck_src, head_deg)
    mane_dst = (neck_dst[0] + (mane_r[0] - neck_src[0]), neck_dst[1] + (mane_r[1] - neck_src[1]))

    l_sh_src = (220.0, 137.5)
    l_sh_dst = torso_joint(l_sh_src)
    r_sh_src = (309.0, 142.5)
    r_sh_dst = torso_joint(r_sh_src)

    l_hip_src = PIVOTS["l_hip"]
    l_hip_base = torso_joint(l_hip_src)
    l_hip_dst = (
        l_hip_base[0] + cfg.get("l_hip_dx", 0.0),
        l_hip_base[1] + cfg.get("l_hip_dy", 0.0),
    )
    r_hip_src = PIVOTS["r_hip"]
    r_hip_base = torso_joint(r_hip_src)
    r_hip_dst = (
        r_hip_base[0] + cfg.get("r_hip_dx", 0.0),
        r_hip_base[1] + cfg.get("r_hip_dy", 0.0),
    )

    l_thigh_deg = cfg.get("l_thigh_deg", 0.0)
    l_shin_deg = cfg.get("l_shin_deg", 0.0)
    l_foot_deg = cfg.get("l_foot_deg", 0.0)
    l_knee_src = (196.0, 367.5)
    l_knee_r = rot_pt(l_knee_src, l_hip_src, l_thigh_deg)
    l_knee_dst = (l_hip_dst[0] + (l_knee_r[0] - l_hip_src[0]), l_hip_dst[1] + (l_knee_r[1] - l_hip_src[1]))
    l_ank_src = (169.0, 444.0)
    l_ank_r = rot_pt(l_ank_src, l_knee_src, l_shin_deg)
    l_ank_dst = (l_knee_dst[0] + (l_ank_r[0] - l_knee_src[0]), l_knee_dst[1] + (l_ank_r[1] - l_knee_src[1]))

    r_thigh_deg = cfg.get("r_thigh_deg", 0.0)
    r_shin_deg = cfg.get("r_shin_deg", 0.0)
    r_foot_deg = cfg.get("r_foot_deg", 0.0)
    r_hip_dst = (r_hip_dst[0], r_hip_dst[1] + 5.0)
    r_knee_src = (337.5, 362.5)
    r_knee_r = rot_pt(r_knee_src, r_hip_src, r_thigh_deg)
    r_knee_dst = (r_hip_dst[0] + (r_knee_r[0] - r_hip_src[0]), r_hip_dst[1] + (r_knee_r[1] - r_hip_src[1]) + 4.0)
    r_ank_src = (327.5, 439.0)
    r_ank_r = rot_pt(r_ank_src, r_knee_src, r_shin_deg)
    r_ank_dst = (r_knee_dst[0] + (r_ank_r[0] - r_knee_src[0]), r_knee_dst[1] + (r_ank_r[1] - r_knee_src[1]) + 3.5)

    l_sode_deg = torso_deg + cfg.get("l_sode_rel_deg", 0.0)
    l_fore_deg = l_sode_deg + cfg.get("l_fore_rel_deg", 0.0)
    l_elb_src = (179.0, 197.5)
    l_elb_r = rot_pt(l_elb_src, l_sh_src, l_sode_deg)
    l_elb_dst = (l_sh_dst[0] + (l_elb_r[0] - l_sh_src[0]), l_sh_dst[1] + (l_elb_r[1] - l_sh_src[1]))
    l_hand_src = (185.0, 277.5)
    l_hand_r = rot_pt(l_hand_src, l_elb_src, l_fore_deg)
    l_hand_dst = (l_elb_dst[0] + (l_hand_r[0] - l_elb_src[0]), l_elb_dst[1] + (l_hand_r[1] - l_elb_src[1]))

    r_sode_deg = torso_deg + cfg.get("r_sode_rel_deg", 0.0)
    r_fore_deg = r_sode_deg + cfg.get("r_fore_rel_deg", 0.0)
    r_elb_src = (324.0, 202.5)
    r_elb_r = rot_pt(r_elb_src, r_sh_src, r_sode_deg)
    r_elb_dst = (r_sh_dst[0] + (r_elb_r[0] - r_sh_src[0]), r_sh_dst[1] + (r_elb_r[1] - r_sh_src[1]))
    r_hand_src = (361.0, 270.0)
    r_hand_r = rot_pt(r_hand_src, r_elb_src, r_fore_deg)
    r_hand_dst = (r_elb_dst[0] + (r_hand_r[0] - r_elb_src[0]), r_elb_dst[1] + (r_hand_r[1] - r_elb_src[1]))

    # Dark-navy samurai cloth under-bridges at all joints
    draw_capsule(draw, pelvis_dst, l_hip_dst, 26)
    draw_capsule(draw, pelvis_dst, r_hip_dst, 26)
    draw_capsule(draw, l_hip_dst, l_knee_dst, 21)
    draw_capsule(draw, r_hip_dst, r_knee_dst, 21)
    draw_joint_cap(draw, l_ank_dst, 13)
    draw_joint_cap(draw, r_ank_dst, 13)
    draw_joint_cap(draw, neck_dst, 17)
    draw_capsule(draw, l_sh_dst, l_elb_dst, 16)
    draw_capsule(draw, r_sh_dst, r_elb_dst, 15)

    # 1. Silver wolf-mane ponytail with organic wind wave
    paste_rotated_part(
        canvas, parts["mane"], mane_src, mane_dst, mane_deg,
        wave_phase=cfg.get("mane_wave_phase", 0.0),
        wave_amp=cfg.get("mane_wave_amp", 7.0)
    )

    # 2. Right arm (if behind torso)
    if not cfg.get("right_arm_in_front", False):
        paste_rotated_part(canvas, parts["r_sode"], r_sh_src, r_sh_dst, r_sode_deg)
        paste_rotated_part(canvas, parts["r_forearm"], r_elb_src, r_elb_dst, r_fore_deg)

    # 3. Articulated 3-segment legs
    if cfg.get("right_leg_behind", False):
        paste_rotated_part(canvas, parts["r_thigh"], r_hip_src, r_hip_dst, r_thigh_deg)
        paste_rotated_part(canvas, parts["r_foot"], r_ank_src, r_ank_dst, r_foot_deg)
        paste_rotated_part(canvas, parts["r_shin"], r_knee_src, r_knee_dst, r_shin_deg)

        paste_rotated_part(canvas, parts["l_thigh"], l_hip_src, l_hip_dst, l_thigh_deg)
        paste_rotated_part(canvas, parts["l_foot"], l_ank_src, l_ank_dst, l_foot_deg)
        paste_rotated_part(canvas, parts["l_shin"], l_knee_src, l_knee_dst, l_shin_deg)
    else:
        paste_rotated_part(canvas, parts["l_thigh"], l_hip_src, l_hip_dst, l_thigh_deg)
        paste_rotated_part(canvas, parts["l_foot"], l_ank_src, l_ank_dst, l_foot_deg)
        paste_rotated_part(canvas, parts["l_shin"], l_knee_src, l_knee_dst, l_shin_deg)

        paste_rotated_part(canvas, parts["r_thigh"], r_hip_src, r_hip_dst, r_thigh_deg)
        paste_rotated_part(canvas, parts["r_foot"], r_ank_src, r_ank_dst, r_foot_deg)
        paste_rotated_part(canvas, parts["r_shin"], r_knee_src, r_knee_dst, r_shin_deg)

    # 4. Torso (Do-Maru + Obi + Kusazuri tassets draping over hip joints)
    paste_rotated_part(canvas, parts["torso"], pelvis_src, pelvis_dst, torso_deg)

    # 5. Head (Crescent Kabuto + Menpo Oni mask)
    paste_rotated_part(canvas, parts["head"], neck_src, neck_dst, head_deg)

    # 6. Right arm (if in front of torso)
    if cfg.get("right_arm_in_front", False):
        paste_rotated_part(canvas, parts["r_sode"], r_sh_src, r_sh_dst, r_sode_deg)
        paste_rotated_part(canvas, parts["r_forearm"], r_elb_src, r_elb_dst, r_fore_deg)

    # 7. Left Sode & Forearm
    paste_rotated_part(canvas, parts["l_sode"], l_sh_src, l_sh_dst, l_sode_deg)
    paste_rotated_part(canvas, parts["l_forearm"], l_elb_src, l_elb_dst, l_fore_deg)

    # Dynamic framing from 600x560 canvas to 104x104
    S = 592
    scale = 104.0 / S
    cx = 267.5 + OX
    y_bot = 494.0 + OY
    crop_x0 = int(round(cx - S * 0.50))
    crop_y0 = int(round(y_bot - S * (99.0 / 104.0)))

    bbox = canvas.getbbox()
    c_xmin = float(bbox[0]) if bbox else float(cx)
    c_ymin = float(bbox[1]) if bbox else float(y_bot - 200.0)
    c_xmax = float(bbox[2]) if bbox else float(cx)
    c_ymax = float(bbox[3]) if bbox else float(y_bot)
    saya_rad = math.radians(cfg.get("saya_deg", 152.0 + torso_deg * 0.5))
    saya_tip_cx = l_hip_base[0] + math.cos(saya_rad) * (20.0 / scale)
    saya_tip_cy = l_hip_base[1] + math.sin(saya_rad) * (20.0 / scale)
    c_xmin = min(c_xmin, saya_tip_cx - 12)
    c_xmax = max(c_xmax, saya_tip_cx + 12)
    c_ymin = min(c_ymin, saya_tip_cy - 12)
    c_ymax = max(c_ymax, saya_tip_cy + 12)
    if not cfg.get("sheathed", False):
        hand_c = r_hand_dst if cfg.get("sword_hand", "right") == "right" else l_hand_dst
        b_rad = math.radians(cfg.get("odachi_deg", -28.0))
        b_len = cfg.get("odachi_len", 30.0)
        tip_cx = hand_c[0] + math.cos(b_rad) * ((3.5 + b_len) / scale)
        tip_cy = hand_c[1] + math.sin(b_rad) * ((3.5 + b_len) / scale)
        pom_cx = hand_c[0] - math.cos(b_rad) * (8.5 / scale)
        pom_cy = hand_c[1] - math.sin(b_rad) * (8.5 / scale)
        pad_tip = 26.0 if cfg.get("mach_cone") is not None else 16.0
        c_xmin = min(c_xmin, tip_cx - pad_tip, pom_cx - 12)
        c_xmax = max(c_xmax, tip_cx + pad_tip, pom_cx + 12)
        c_ymin = min(c_ymin, tip_cy - pad_tip, pom_cy - 12)
        c_ymax = max(c_ymax, tip_cy + pad_tip, pom_cy + 12)

    if cfg.get("spear_mode", False):
        span_x = c_xmax - c_xmin
        span_y = c_ymax - c_ymin
        req_S = int(round(max(span_x, span_y) / (84.0 / 104.0)))
        S = max(592, req_S)
        scale = 104.0 / S
        crop_x0 = int(round(0.5 * (c_xmin + c_xmax) - S * 0.50))
        crop_y0 = int(round(0.5 * (c_ymin + c_ymax) - S * (60.0 / 104.0)))
        min_y104 = (c_ymin - crop_y0) * scale
        max_y104 = (c_ymax - crop_y0) * scale
        if max_y104 > 96.0:
            crop_y0 += int(round((max_y104 - 96.0) / scale))
        elif min_y104 < 7.0:
            crop_y0 += int(round((min_y104 - 7.0) / scale))
    elif cfg.get("fixed_crop_x", False):
        # Lock S=592 and crop_x0 so forward sword lunges extend genuinely toward +X without shrinking or recoiling Ronin's body!
        min_y104 = (c_ymin - crop_y0) * scale
        if min_y104 < 6.0:
            crop_y0 += int(round((min_y104 - 6.0) / scale))
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

    win = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    win.paste(canvas, (-crop_x0, -crop_y0))
    im104 = win.resize((104, 104), Image.Resampling.NEAREST)
    arr104 = np.array(im104)

    def to104(pt):
        return ((pt[0] - crop_x0) * scale, (pt[1] - crop_y0) * scale)

    neck_104 = to104(neck_dst)
    l_hip_104 = to104(l_hip_base)
    l_hand_104 = to104(l_hand_dst)
    r_hand_104 = to104(r_hand_dst)

    # Fast numpy auto-grounding so boots sit cleanly on y = 99 when grounded
    ys, xs = np.where(arr104[:, :, 3] > 0)
    dy_ground = 0
    if len(ys) > 0 and not cfg.get("spear_mode", False):
        cur_bot = int(ys.max())
        cur_top = int(ys.min())
        if cfg.get("grounded", True):
            target_bot = 99 + int(round(cfg.get("airborne_dy", 0)))
            dy_ground = target_bot - cur_bot
        else:
            target_bot = min(99, max(66, cur_bot + int(round(cfg.get("airborne_dy", 0)))))
            dy_ground = target_bot - cur_bot
        if cur_top + dy_ground < 5:
            dy_ground = 5 - cur_top
        if dy_ground != 0:
            shifted = np.zeros_like(arr104)
            y_src0 = max(0, -dy_ground)
            y_src1 = min(104, 104 - dy_ground)
            y_dst0 = max(0, dy_ground)
            y_dst1 = min(104, 104 + dy_ground)
            if y_src1 > y_src0:
                shifted[y_dst0:y_dst1] = arr104[y_src0:y_src1]
            arr104 = shifted

    # Transform downsampled 104x104 body into authentic cel-clustered 18-color pixel art with 1px Selout
    arr104 = quantize_and_cluster_104(arr104)

    neck_104 = (neck_104[0], neck_104[1] + dy_ground)
    l_hip_104 = (l_hip_104[0], l_hip_104[1] + dy_ground)
    l_hand_104 = (l_hand_104[0], l_hand_104[1] + dy_ground)
    r_hand_104 = (r_hand_104[0], r_hand_104[1] + dy_ground)

    bg104 = np.zeros_like(arr104)
    if cfg.get("show_drums", True):
        draw_raijin_drums_104(
            bg104, neck_104[0], neck_104[1], torso_deg,
            phase=cfg.get("mane_wave_phase", 0.0),
            active=cfg.get("drums_active", False)
        )

    saya_layer = np.zeros_like(arr104)
    draw_saya_104(
        saya_layer, l_hip_104[0] - 2, l_hip_104[1] - 2,
        saya_deg=cfg.get("saya_deg", 152.0 + torso_deg * 0.5),
        sheathed=cfg.get("sheathed", False),
        charge_phase=cfg.get("mane_wave_phase", 0.0)
    )

    out = bg104.copy()
    mask_body = arr104[:, :, 3] > 0
    out[mask_body] = arr104[mask_body]
    mask_saya = saya_layer[:, :, 3] > 0
    out[mask_saya] = saya_layer[mask_saya]

    hand_pt = r_hand_104 if cfg.get("sword_hand", "right") == "right" else l_hand_104
    b_deg = cfg.get("odachi_deg", -28.0)
    b_len = cfg.get("odachi_len", 30.0)
    if not cfg.get("sheathed", False):
        if cfg.get("planted_sword", False):
            draw_odachi_104(
                out, cfg.get("plant_x", 68.0), cfg.get("plant_y", 62.0),
                blade_deg=88.0, blade_len=28.0, curve_sign=-1.0,
                glow=cfg.get("odachi_glow", 0.6), phase=cfg.get("mane_wave_phase", 0.0)
            )
        else:
            draw_odachi_104(
                out, hand_pt[0], hand_pt[1],
                blade_deg=b_deg, blade_len=b_len,
                curve_sign=cfg.get("odachi_curve", -1.0),
                glow=cfg.get("odachi_glow", 1.0),
                phase=cfg.get("mane_wave_phase", 0.0)
            )

    # Optional 104x104 combat FX overlays (slash arcs, Supersonic Mach-Cone, X-slash, speedlines)
    if cfg.get("slash_arc") is not None:
        sa = cfg["slash_arc"]
        draw_slash_arc_104(
            out, neck_104[0] + sa.get("dx", 6.0), neck_104[1] + sa.get("dy", 10.0),
            sa.get("r", 28.0), sa["a0"], sa["a1"],
            intensity=sa.get("intensity", 1.0), violet_tint=sa.get("violet", False)
        )

    if cfg.get("mach_cone") is not None:
        mc = cfg["mach_cone"]
        b_rad = math.radians(b_deg)
        tip_x = min(97.0, hand_pt[0] + math.cos(b_rad) * (2.5 + b_len))
        tip_y = min(97.0, max(6.0, hand_pt[1] + math.sin(b_rad) * (2.5 + b_len)))
        draw_mach_cone_104(
            out, tip_x, tip_y, b_deg,
            length=mc.get("len", 38.0),
            intensity=mc.get("intensity", 1.0),
            ultimate=mc.get("ultimate", False)
        )

    if cfg.get("x_slash") is not None:
        xs_cfg = cfg["x_slash"]
        draw_x_slash_104(
            out, min(80.0, neck_104[0] + 22.0), min(76.0, neck_104[1] + 12.0),
            radius=xs_cfg.get("r", 22.0),
            phase=cfg.get("mane_wave_phase", 0.0),
            ultimate=xs_cfg.get("ultimate", False)
        )

    if cfg.get("speedlines", 0) > 0:
        n_lines = cfg["speedlines"]
        ph = cfg.get("mane_wave_phase", 0.0)
        sl_deg = b_deg if cfg.get("mach_cone") is not None else 0.0
        sl_rad = math.radians(sl_deg)
        ux_s, uy_s = math.cos(sl_rad), math.sin(sl_rad)
        for k in range(n_lines):
            ly = 24.0 + (k * 11 + int(ph * 5)) % 56
            lx0 = 6.0 + (k * 7 + int(ph * 9)) % 18
            slen = 10.0 + (k % 3) * 4.0
            lx1 = min(96.0, max(5.0, lx0 + ux_s * slen))
            ly1 = min(96.0, max(5.0, ly + uy_s * slen))
            col = (105, 245, 255, 255) if k % 2 == 0 else (185, 130, 255, 255)
            draw_line_104(out, lx0, ly, lx1, ly1, col, 1)

    # Final safety clamp to [3..100] and pinhole fill
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
        out[pinhole] = [24, 28, 48, 255]

    return out


def make_spear_dive_cfg(p_deg, ph, u=0.5, ultimate=False):
    """
    Constructs a 13-part articulated full-body Supersonic Spear-Dive configuration
    aligned along trajectory angle `p_deg` (negative = upward-diagonal '/', 0 = horizontal '--->',
    positive = head-first downward-diagonal '\\').
    """
    return dict(
        pelvis_dx=0.0,
        pelvis_dy=18.0,
        torso_deg=68.0 + 0.72 * p_deg,
        head_rel_deg=-24.0 - 0.15 * p_deg,
        mane_rel_deg=-38.0,
        mane_wave_phase=ph * (4.0 if ultimate else 3.0),
        mane_wave_amp=12.0 if ultimate else 10.5,
        l_thigh_deg=66.0 + 0.75 * p_deg,
        l_shin_deg=72.0 + 0.75 * p_deg,
        l_foot_deg=70.0 + 0.70 * p_deg,
        r_thigh_deg=92.0 + 0.75 * p_deg,
        r_shin_deg=76.0 + 0.75 * p_deg,
        r_foot_deg=72.0 + 0.70 * p_deg,
        l_sode_rel_deg=-60.0,
        l_fore_rel_deg=-42.0,
        r_sode_rel_deg=-76.0 if p_deg < 0 else -52.0,
        r_fore_rel_deg=-38.0 if p_deg < 0 else -34.0,
        right_arm_in_front=True,
        grounded=False,
        spear_mode=True,
        odachi_deg=p_deg,
        odachi_len=28.0,
        drums_active=True,
        mach_cone=dict(
            len=40.0 if ultimate else 34.0,
            intensity=1.1 if ultimate else (0.88 + 0.20 * math.sin(u * math.pi)),
            ultimate=ultimate
        ),
        speedlines=7 if ultimate else 5
    )


def build_row_configs(row_idx):
    cfgs = []
    for f in range(COLS):
        t = f / float(COLS)
        ph = 2.0 * math.pi * t

        if row_idx == 0:
            # Row 0: IDLE (Kamae martial breathing + wind-rippling silver wolf-mane + Odachi Hamon pulse)
            breath = math.sin(ph)
            sway = math.cos(ph)
            cfgs.append(dict(
                pelvis_dx=sway * 4.0,
                pelvis_dy=breath * 10.0,
                torso_deg=2.0 + breath * 2.2,
                head_rel_deg=-1.0 - breath * 1.5,
                mane_rel_deg=-3.0 + sway * 4.0,
                mane_wave_phase=ph,
                mane_wave_amp=6.5,
                l_thigh_deg=-2.0 + sway * 2.0,
                l_shin_deg=2.0 - sway * 2.0,
                r_thigh_deg=2.0 - sway * 2.0,
                r_shin_deg=-2.0 + sway * 2.0,
                l_sode_rel_deg=-4.0 + breath * 3.0,
                l_fore_rel_deg=-10.0 + sway * 4.0,
                r_sode_rel_deg=-14.0 + breath * 3.5,
                r_fore_rel_deg=-18.0 - sway * 3.5,
                odachi_deg=-32.0 + breath * 3.5,
                odachi_len=30.0,
                drums_active=(f % 6 == 0)
            ))

        elif row_idx == 1:
            # Row 1: WALK (Authentic Two-Handed Chudan-no-Kamae Samurai Guard Stride — Both hands gripping Tsuka hilt!)
            c_step = math.cos(ph)
            s_step = math.sin(ph)
            gait = compute_bipedal_walk_pose(PIVOTS, f, cols=COLS, stride_scale=0.78)
            gait["l_hip_dy"] += 2.2
            gait["r_hip_dy"] -= 2.2
            torso_d = 3.2 + 1.0 * abs(c_step)
            cfg = dict(gait)
            cfg.update(
                pelvis_dx=0.0,
                pelvis_dy=2.0 * abs(s_step),
                torso_deg=torso_d,
                head_rel_deg=-2.2,
                mane_rel_deg=-5.5 - 2.5 * abs(c_step),
                mane_wave_phase=ph * 2.0,
                mane_wave_amp=7.0,
                l_sode_rel_deg=-54.0 + 1.8 * c_step,
                l_fore_rel_deg=8.0 - 1.5 * c_step,
                r_sode_rel_deg=36.0 + 1.8 * c_step,
                r_fore_rel_deg=-60.0 - 1.5 * c_step,
                right_arm_in_front=True,
                odachi_deg=-48.0 + 1.8 * c_step,
                odachi_curve=-1.0,
                odachi_len=28.0,
                odachi_glow=0.90,
                saya_deg=160.0 + torso_d * 0.4 - 2.0 * c_step,
                drums_active=(f % 5 == 0),
            )
            cfgs.append(cfg)

        elif row_idx == 2:
            # Row 2: AUTO_ATTACK — 4 Shallow/Horizontal Full-Reach, Full-Follow-Through (Furikiri) Kenjutsu Katana Cuts!
            # Locked `fixed_crop_x=True` (`S=592`) so Ronin's body NEVER shrinks or recoils backward when extending the blade,
            # and `slash_arc=None` so zero bloated neon blobs obscure the razor-clean steel cut through enemy flesh:
            # - Slice 0 (F00..F07, 8f -> 60..67): Battōjutsu Yoko-Ichimonji (coiled Saya grip -> flat horizontal waist cut -> wide back-shoulder follow-through)
            # - Slice 1 (F08..F14, 7f -> 68..74): Gyaku-Yoko Giri (high-back shoulder chamber -> shallow cross-body chest rip -> full past-hip follow-through)
            # - Slice 2 (F15..F22, 8f -> 75..82): Kiri-Age Gyaku-Gesa (low-back hip coil -> deep lunging shallow-rising diagonal rip -> full high-back follow-through)
            # - Slice 3 (F23..F29, 7f -> 83..89): Morote Kiri-Nuki & Chiburi (waist coil -> two-handed step-through gut cleave -> full past-hip Chiburi blood-flick)
            row2_table = [
                # --- SLICE 0 (F00..F07): Battōjutsu Yoko-Ichimonji (Saya Coil -> +26° -> -2° Full Reach -> -16° -> -118° -> -166° Wide Behind-Back Furikiri) ---
                dict(
                    fixed_crop_x=True, pelvis_dx=-8.0, pelvis_dy=48.0, torso_deg=10.0,
                    head_rel_deg=-4.0, mane_rel_deg=-8.0, mane_wave_phase=ph, mane_wave_amp=6.5,
                    l_thigh_deg=-18.0, l_shin_deg=18.0, r_thigh_deg=16.0, r_shin_deg=-14.0,
                    l_sode_rel_deg=-6.0, l_fore_rel_deg=-28.0, r_sode_rel_deg=18.0, r_fore_rel_deg=14.0,
                    sheathed=True, saya_deg=156.0, drums_active=False,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=-14.0, pelvis_dy=72.0, torso_deg=16.0,
                    head_rel_deg=-7.0, mane_rel_deg=-12.0, mane_wave_phase=ph, mane_wave_amp=7.0,
                    l_thigh_deg=-26.0, l_shin_deg=24.0, r_thigh_deg=24.0, r_shin_deg=-20.0,
                    l_sode_rel_deg=-10.0, l_fore_rel_deg=-32.0, r_sode_rel_deg=24.0, r_fore_rel_deg=20.0,
                    sheathed=True, saya_deg=160.0, drums_active=False,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=-4.0, pelvis_dy=62.0, torso_deg=14.0,
                    head_rel_deg=-6.0, mane_rel_deg=-14.0, mane_wave_phase=ph * 1.6, mane_wave_amp=7.5,
                    l_thigh_deg=16.0, l_shin_deg=14.0, r_thigh_deg=-18.0, r_shin_deg=14.0,
                    l_sode_rel_deg=10.0, l_fore_rel_deg=-26.0, r_sode_rel_deg=24.0, r_fore_rel_deg=-10.0,
                    right_arm_in_front=True, odachi_deg=26.0, odachi_curve=1.0, odachi_len=26.8, odachi_glow=0.35,
                    saya_deg=156.0, drums_active=False,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=-3.0, pelvis_dy=58.0, torso_deg=15.0,
                    head_rel_deg=-6.0, mane_rel_deg=-16.0, mane_wave_phase=ph * 1.8, mane_wave_amp=8.5,
                    l_thigh_deg=22.0, l_shin_deg=14.0, r_thigh_deg=-24.0, r_shin_deg=16.0,
                    l_sode_rel_deg=14.0, l_fore_rel_deg=-24.0, r_sode_rel_deg=18.0, r_fore_rel_deg=-26.0,
                    right_arm_in_front=True, odachi_deg=-2.0, odachi_curve=1.0, odachi_len=27.2, odachi_glow=0.45,
                    saya_deg=152.0, drums_active=True,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=-1.0, pelvis_dy=54.0, torso_deg=16.0,
                    head_rel_deg=-6.0, mane_rel_deg=-18.0, mane_wave_phase=ph * 2.0, mane_wave_amp=9.0,
                    l_thigh_deg=24.0, l_shin_deg=14.0, r_thigh_deg=-26.0, r_shin_deg=16.0,
                    l_sode_rel_deg=16.0, l_fore_rel_deg=-22.0, r_sode_rel_deg=18.0, r_fore_rel_deg=-30.0,
                    right_arm_in_front=True, odachi_deg=-16.0, odachi_curve=1.0, odachi_len=27.2, odachi_glow=0.45,
                    saya_deg=150.0, drums_active=True,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=2.0, pelvis_dy=48.0, torso_deg=13.0,
                    head_rel_deg=-4.0, mane_rel_deg=-15.0, mane_wave_phase=ph * 1.8, mane_wave_amp=8.0,
                    l_thigh_deg=20.0, l_shin_deg=12.0, r_thigh_deg=-22.0, r_shin_deg=14.0,
                    l_sode_rel_deg=12.0, l_fore_rel_deg=-22.0, r_sode_rel_deg=44.0, r_fore_rel_deg=22.0,
                    right_arm_in_front=False, odachi_deg=-118.0, odachi_curve=1.0, odachi_len=26.5, odachi_glow=0.35,
                    saya_deg=150.0, drums_active=False,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=4.0, pelvis_dy=38.0, torso_deg=9.0,
                    head_rel_deg=-3.0, mane_rel_deg=-12.0, mane_wave_phase=ph * 1.4, mane_wave_amp=7.5,
                    l_thigh_deg=14.0, l_shin_deg=10.0, r_thigh_deg=-16.0, r_shin_deg=10.0,
                    l_sode_rel_deg=8.0, l_fore_rel_deg=-22.0, r_sode_rel_deg=66.0, r_fore_rel_deg=44.0,
                    right_arm_in_front=False, odachi_deg=-164.0, odachi_curve=1.0, odachi_len=27.0, odachi_glow=0.30,
                    saya_deg=152.0, drums_active=False,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=1.0, pelvis_dy=28.0, torso_deg=5.0,
                    head_rel_deg=-1.0, mane_rel_deg=-8.0, mane_wave_phase=ph, mane_wave_amp=6.5,
                    l_thigh_deg=8.0, l_shin_deg=6.0, r_thigh_deg=-8.0, r_shin_deg=6.0,
                    l_sode_rel_deg=-2.0, l_fore_rel_deg=-24.0, r_sode_rel_deg=62.0, r_fore_rel_deg=40.0,
                    right_arm_in_front=False, odachi_deg=-158.0, odachi_curve=1.0, odachi_len=27.0, odachi_glow=0.30,
                    saya_deg=152.0, drums_active=False,
                ),

                # --- SLICE 1 (F08..F14): Gyaku-Yoko Giri (-152° Behind-Shoulder -> -36° -> -3° -> +14° -> +86° -> +146° Past-Hip Furikiri) ---
                dict(
                    fixed_crop_x=True, pelvis_dx=-8.0, pelvis_dy=48.0, torso_deg=-2.0,
                    head_rel_deg=2.0, mane_rel_deg=-8.0, mane_wave_phase=ph * 1.5, mane_wave_amp=7.5,
                    right_leg_behind=True, l_thigh_deg=18.0, l_shin_deg=14.0, r_thigh_deg=-20.0, r_shin_deg=16.0,
                    l_sode_rel_deg=-12.0, l_fore_rel_deg=-26.0, r_sode_rel_deg=58.0, r_fore_rel_deg=36.0,
                    right_arm_in_front=False, odachi_deg=-152.0, odachi_len=27.0, odachi_glow=0.30, saya_deg=150.0, drums_active=False,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=-4.0, pelvis_dy=56.0, torso_deg=8.0,
                    head_rel_deg=-2.0, mane_rel_deg=-10.0, mane_wave_phase=ph * 1.7, mane_wave_amp=8.0,
                    right_leg_behind=True, l_thigh_deg=22.0, l_shin_deg=16.0, r_thigh_deg=-24.0, r_shin_deg=18.0,
                    l_sode_rel_deg=-6.0, l_fore_rel_deg=-26.0, r_sode_rel_deg=26.0, r_fore_rel_deg=-16.0,
                    right_arm_in_front=True, odachi_deg=-36.0, odachi_len=26.6, odachi_glow=0.35, saya_deg=152.0, drums_active=False,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=-3.0, pelvis_dy=62.0, torso_deg=15.0,
                    head_rel_deg=-6.0, mane_rel_deg=-16.0, mane_wave_phase=ph * 2.0, mane_wave_amp=9.0,
                    right_leg_behind=True, l_thigh_deg=-22.0, l_shin_deg=20.0, r_thigh_deg=24.0, r_shin_deg=-16.0,
                    l_sode_rel_deg=10.0, l_fore_rel_deg=-24.0, r_sode_rel_deg=18.0, r_fore_rel_deg=-26.0,
                    right_arm_in_front=True, odachi_deg=-3.0, odachi_len=27.2, odachi_glow=0.45,
                    saya_deg=150.0, drums_active=True,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=-1.0, pelvis_dy=64.0, torso_deg=17.0,
                    head_rel_deg=-7.0, mane_rel_deg=-19.0, mane_wave_phase=ph * 2.2, mane_wave_amp=9.5,
                    right_leg_behind=True, l_thigh_deg=-24.0, l_shin_deg=20.0, r_thigh_deg=26.0, r_shin_deg=-16.0,
                    l_sode_rel_deg=14.0, l_fore_rel_deg=-24.0, r_sode_rel_deg=20.0, r_fore_rel_deg=-22.0,
                    right_arm_in_front=True, odachi_deg=14.0, odachi_len=27.2, odachi_glow=0.45,
                    saya_deg=148.0, drums_active=True,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=3.0, pelvis_dy=56.0, torso_deg=15.0,
                    head_rel_deg=-6.0, mane_rel_deg=-16.0, mane_wave_phase=ph * 2.0, mane_wave_amp=8.5,
                    right_leg_behind=True, l_thigh_deg=-20.0, l_shin_deg=16.0, r_thigh_deg=22.0, r_shin_deg=-14.0,
                    l_sode_rel_deg=12.0, l_fore_rel_deg=-22.0, r_sode_rel_deg=34.0, r_fore_rel_deg=24.0,
                    right_arm_in_front=True, odachi_deg=86.0, odachi_len=26.5, odachi_glow=0.35,
                    saya_deg=150.0, drums_active=False,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=4.0, pelvis_dy=42.0, torso_deg=12.0,
                    head_rel_deg=-5.0, mane_rel_deg=-13.0, mane_wave_phase=ph * 1.6, mane_wave_amp=7.5,
                    right_leg_behind=True, l_thigh_deg=-14.0, l_shin_deg=12.0, r_thigh_deg=14.0, r_shin_deg=-10.0,
                    l_sode_rel_deg=8.0, l_fore_rel_deg=-22.0, r_sode_rel_deg=50.0, r_fore_rel_deg=40.0,
                    right_arm_in_front=True, odachi_deg=146.0, odachi_len=27.0, odachi_glow=0.30,
                    saya_deg=152.0, drums_active=False,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=1.0, pelvis_dy=30.0, torso_deg=8.0,
                    head_rel_deg=-3.0, mane_rel_deg=-8.0, mane_wave_phase=ph, mane_wave_amp=6.5,
                    l_thigh_deg=-8.0, l_shin_deg=8.0, r_thigh_deg=8.0, r_shin_deg=-6.0,
                    l_sode_rel_deg=4.0, l_fore_rel_deg=-22.0, r_sode_rel_deg=48.0, r_fore_rel_deg=38.0,
                    right_arm_in_front=True, odachi_deg=142.0, odachi_len=27.0, odachi_glow=0.30,
                    saya_deg=152.0, drums_active=False,
                ),

                # --- SLICE 2 (F15..F22): Kiri-Age Gyaku-Gesa (+144° Low-Back Coil -> +28° -> +2° -> -15° -> -120° -> -164° Wide Behind-Back) ---
                dict(
                    fixed_crop_x=True, pelvis_dx=-6.0, pelvis_dy=50.0, torso_deg=8.0,
                    head_rel_deg=-3.0, mane_rel_deg=-9.0, mane_wave_phase=ph * 1.5, mane_wave_amp=7.0,
                    l_thigh_deg=-16.0, l_shin_deg=16.0, r_thigh_deg=18.0, r_shin_deg=-14.0,
                    l_sode_rel_deg=10.0, l_fore_rel_deg=-20.0, r_sode_rel_deg=48.0, r_fore_rel_deg=38.0,
                    right_arm_in_front=True, odachi_deg=142.0, odachi_curve=1.0, odachi_len=27.0, odachi_glow=0.30,
                    saya_deg=154.0, drums_active=False,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=-10.0, pelvis_dy=66.0, torso_deg=12.0,
                    head_rel_deg=-5.0, mane_rel_deg=-11.0, mane_wave_phase=ph * 1.6, mane_wave_amp=7.5,
                    l_thigh_deg=-22.0, l_shin_deg=22.0, r_thigh_deg=22.0, r_shin_deg=-18.0,
                    l_sode_rel_deg=14.0, l_fore_rel_deg=-18.0, r_sode_rel_deg=52.0, r_fore_rel_deg=42.0,
                    right_arm_in_front=True, odachi_deg=148.0, odachi_curve=1.0, odachi_len=27.0, odachi_glow=0.35,
                    saya_deg=156.0, drums_active=False,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=-3.0, pelvis_dy=62.0, torso_deg=14.0,
                    head_rel_deg=-6.0, mane_rel_deg=-15.0, mane_wave_phase=ph * 1.9, mane_wave_amp=8.5,
                    l_thigh_deg=18.0, l_shin_deg=14.0, r_thigh_deg=-20.0, r_shin_deg=14.0,
                    l_sode_rel_deg=-6.0, l_fore_rel_deg=-22.0, r_sode_rel_deg=22.0, r_fore_rel_deg=-10.0,
                    right_arm_in_front=True, odachi_deg=28.0, odachi_curve=1.0, odachi_len=26.8, odachi_glow=0.40,
                    saya_deg=152.0, drums_active=True,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=-2.0, pelvis_dy=58.0, torso_deg=15.0,
                    head_rel_deg=-6.0, mane_rel_deg=-18.0, mane_wave_phase=ph * 2.2, mane_wave_amp=9.5,
                    l_thigh_deg=24.0, l_shin_deg=16.0, r_thigh_deg=-26.0, r_shin_deg=16.0,
                    l_sode_rel_deg=-14.0, l_fore_rel_deg=-22.0, r_sode_rel_deg=18.0, r_fore_rel_deg=-26.0,
                    right_arm_in_front=True, odachi_deg=2.0, odachi_curve=1.0, odachi_len=27.2, odachi_glow=0.45,
                    saya_deg=150.0, drums_active=True,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=-1.0, pelvis_dy=52.0, torso_deg=15.0,
                    head_rel_deg=-6.0, mane_rel_deg=-19.0, mane_wave_phase=ph * 2.3, mane_wave_amp=9.5,
                    l_thigh_deg=24.0, l_shin_deg=14.0, r_thigh_deg=-26.0, r_shin_deg=16.0,
                    l_sode_rel_deg=-18.0, l_fore_rel_deg=-22.0, r_sode_rel_deg=18.0, r_fore_rel_deg=-30.0,
                    right_arm_in_front=True, odachi_deg=-15.0, odachi_curve=1.0, odachi_len=27.2, odachi_glow=0.45,
                    saya_deg=150.0, drums_active=True,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=2.0, pelvis_dy=44.0, torso_deg=12.0,
                    head_rel_deg=-4.0, mane_rel_deg=-15.0, mane_wave_phase=ph * 1.9, mane_wave_amp=8.5,
                    l_thigh_deg=18.0, l_shin_deg=12.0, r_thigh_deg=-20.0, r_shin_deg=12.0,
                    l_sode_rel_deg=-12.0, l_fore_rel_deg=-24.0, r_sode_rel_deg=44.0, r_fore_rel_deg=22.0,
                    right_arm_in_front=False, odachi_deg=-120.0, odachi_curve=1.0, odachi_len=26.5, odachi_glow=0.35,
                    saya_deg=150.0, drums_active=False,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=4.0, pelvis_dy=34.0, torso_deg=8.0,
                    head_rel_deg=-3.0, mane_rel_deg=-11.0, mane_wave_phase=ph * 1.5, mane_wave_amp=7.5,
                    l_thigh_deg=12.0, l_shin_deg=8.0, r_thigh_deg=-14.0, r_shin_deg=8.0,
                    l_sode_rel_deg=-8.0, l_fore_rel_deg=-24.0, r_sode_rel_deg=66.0, r_fore_rel_deg=44.0,
                    right_arm_in_front=False, odachi_deg=-164.0, odachi_curve=1.0, odachi_len=27.0, odachi_glow=0.30,
                    saya_deg=152.0, drums_active=False,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=1.0, pelvis_dy=22.0, torso_deg=4.0,
                    head_rel_deg=-1.0, mane_rel_deg=-7.0, mane_wave_phase=ph, mane_wave_amp=6.5,
                    l_thigh_deg=6.0, l_shin_deg=6.0, r_thigh_deg=-6.0, r_shin_deg=6.0,
                    l_sode_rel_deg=-10.0, l_fore_rel_deg=-26.0, r_sode_rel_deg=60.0, r_fore_rel_deg=38.0,
                    right_arm_in_front=False, odachi_deg=-156.0, odachi_len=27.0, odachi_glow=0.30,
                    saya_deg=152.0, drums_active=False,
                ),

                # --- SLICE 3 (F23..F29): Morote Kiri-Nuki & Chiburi (-152° Behind-Shoulder -> -3° -> +14° -> +84° -> +148° Chiburi Flick -> Chudan) ---
                dict(
                    fixed_crop_x=True, pelvis_dx=-8.0, pelvis_dy=54.0, torso_deg=2.0,
                    head_rel_deg=-1.0, mane_rel_deg=-10.0, mane_wave_phase=ph * 1.6, mane_wave_amp=7.5,
                    l_thigh_deg=-20.0, l_shin_deg=20.0, r_thigh_deg=20.0, r_shin_deg=-16.0,
                    l_sode_rel_deg=-14.0, l_fore_rel_deg=-26.0, r_sode_rel_deg=58.0, r_fore_rel_deg=36.0,
                    right_arm_in_front=False, odachi_deg=-152.0, odachi_len=27.0, odachi_glow=0.35,
                    saya_deg=154.0, drums_active=False,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=-3.0, pelvis_dy=64.0, torso_deg=15.0,
                    head_rel_deg=-6.0, mane_rel_deg=-18.0, mane_wave_phase=ph * 2.2, mane_wave_amp=9.5,
                    l_thigh_deg=24.0, l_shin_deg=16.0, r_thigh_deg=-26.0, r_shin_deg=18.0,
                    l_sode_rel_deg=-28.0, l_fore_rel_deg=-8.0, r_sode_rel_deg=18.0, r_fore_rel_deg=-26.0,
                    right_arm_in_front=True, odachi_deg=-3.0, odachi_len=27.4, odachi_glow=0.45,
                    saya_deg=150.0, drums_active=True,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=-1.0, pelvis_dy=66.0, torso_deg=17.0,
                    head_rel_deg=-7.0, mane_rel_deg=-20.0, mane_wave_phase=ph * 2.4, mane_wave_amp=10.0,
                    l_thigh_deg=26.0, l_shin_deg=16.0, r_thigh_deg=-28.0, r_shin_deg=18.0,
                    l_sode_rel_deg=-22.0, l_fore_rel_deg=-6.0, r_sode_rel_deg=20.0, r_fore_rel_deg=-22.0,
                    right_arm_in_front=True, odachi_deg=14.0, odachi_len=27.2, odachi_glow=0.45,
                    saya_deg=148.0, drums_active=True,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=3.0, pelvis_dy=56.0, torso_deg=15.0,
                    head_rel_deg=-6.0, mane_rel_deg=-16.0, mane_wave_phase=ph * 2.0, mane_wave_amp=8.5,
                    l_thigh_deg=20.0, l_shin_deg=14.0, r_thigh_deg=-22.0, r_shin_deg=14.0,
                    l_sode_rel_deg=8.0, l_fore_rel_deg=-18.0, r_sode_rel_deg=34.0, r_fore_rel_deg=24.0,
                    right_arm_in_front=True, odachi_deg=84.0, odachi_curve=1.0, odachi_len=26.5, odachi_glow=0.35,
                    saya_deg=150.0, drums_active=False,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=4.0, pelvis_dy=42.0, torso_deg=12.0,
                    head_rel_deg=-5.0, mane_rel_deg=-13.0, mane_wave_phase=ph * 1.6, mane_wave_amp=7.5,
                    l_thigh_deg=14.0, l_shin_deg=10.0, r_thigh_deg=-16.0, r_shin_deg=10.0,
                    l_sode_rel_deg=4.0, l_fore_rel_deg=-20.0, r_sode_rel_deg=52.0, r_fore_rel_deg=42.0,
                    right_arm_in_front=True, odachi_deg=148.0, odachi_curve=1.0, odachi_len=27.0, odachi_glow=0.30,
                    saya_deg=152.0, drums_active=False,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=1.0, pelvis_dy=24.0, torso_deg=8.0,
                    head_rel_deg=-3.0, mane_rel_deg=-9.0, mane_wave_phase=ph * 1.2, mane_wave_amp=7.0,
                    l_thigh_deg=8.0, l_shin_deg=6.0, r_thigh_deg=-8.0, r_shin_deg=6.0,
                    l_sode_rel_deg=-4.0, l_fore_rel_deg=-22.0, r_sode_rel_deg=26.0, r_fore_rel_deg=-8.0,
                    right_arm_in_front=True, odachi_deg=24.0, odachi_len=27.0, odachi_glow=0.30,
                    saya_deg=152.0, drums_active=False,
                ),
                dict(
                    fixed_crop_x=True, pelvis_dx=0.0, pelvis_dy=8.0, torso_deg=3.0,
                    head_rel_deg=-1.0, mane_rel_deg=-5.0, mane_wave_phase=ph, mane_wave_amp=6.5,
                    l_thigh_deg=2.0, l_shin_deg=2.0, r_thigh_deg=-2.0, r_shin_deg=2.0,
                    l_sode_rel_deg=-48.0, l_fore_rel_deg=8.0, r_sode_rel_deg=32.0, r_fore_rel_deg=-52.0,
                    right_arm_in_front=True, odachi_deg=-36.0, odachi_len=27.5, odachi_glow=0.30,
                    saya_deg=156.0, drums_active=False,
                ),
            ]
            cfgs.append(row2_table[f])

        elif row_idx == 3:
            # Row 3: SKILL (Zantetsuken Flash — Grounded Cast + 3 Multi-Angle Spear Passes!)
            if f < 6:
                # Phase 1: Deep Grounded Iaido Coil & Lightning Compression (100% Grounded!)
                u = f / 5.0
                cfgs.append(dict(
                    pelvis_dx=-15.0 * u,
                    pelvis_dy=115.0 * u,
                    torso_deg=18.0 * u,
                    head_rel_deg=-8.0 * u,
                    mane_rel_deg=-14.0 * u,
                    mane_wave_phase=ph * 2.0,
                    mane_wave_amp=9.0,
                    l_thigh_deg=-32.0 * u,
                    l_shin_deg=28.0 * u,
                    r_thigh_deg=30.0 * u,
                    r_shin_deg=-26.0 * u,
                    l_sode_rel_deg=-10.0 * u,
                    l_fore_rel_deg=-38.0 * u,
                    r_sode_rel_deg=28.0 * u,
                    r_fore_rel_deg=24.0 * u,
                    grounded=True,
                    sheathed=True,
                    drums_active=True
                ))
            elif f < 9:
                # Pass 1 (F06..F08): Up-Diagonal Spear-Dash ('/' -18 deg)
                cfgs.append(make_spear_dive_cfg(-18.0, ph, (f - 6) / 2.0, ultimate=False))
            elif f < 12:
                # Pass 2 (F09..F11): Cross-Air Horizontal Spear-Blitz ('--->' +2 deg)
                cfgs.append(make_spear_dive_cfg(2.0, ph, (f - 9) / 2.0, ultimate=False))
            elif f < 16:
                # Pass 3 (F12..F15): Head-First Down-Diagonal Spear-Dive ('\\' +26 deg)
                cfgs.append(make_spear_dive_cfg(26.0, ph, (f - 12) / 3.0, ultimate=False))
            elif f < 23:
                # Phase 3: Cross-Slash Impact Detonation
                u = (f - 16) / 6.0
                cfgs.append(dict(
                    pelvis_dx=0.0,
                    pelvis_dy=85.0 - 15.0 * u,
                    torso_deg=26.0 - 4.0 * u,
                    head_rel_deg=-10.0,
                    mane_rel_deg=-20.0,
                    mane_wave_phase=ph * 2.5,
                    mane_wave_amp=10.0,
                    l_thigh_deg=24.0,
                    l_shin_deg=14.0,
                    r_thigh_deg=-28.0,
                    r_shin_deg=16.0,
                    l_sode_rel_deg=16.0,
                    l_fore_rel_deg=-28.0,
                    r_sode_rel_deg=-36.0 + 12.0 * u,
                    r_fore_rel_deg=-18.0,
                    right_arm_in_front=True,
                    odachi_deg=12.0 - 24.0 * u,
                    odachi_len=30.0,
                    drums_active=True,
                    x_slash=dict(r=22.0 * (1.0 - 0.3 * u), ultimate=False) if f <= 20 else None
                ))
            else:
                # Phase 4: Chiburi & Recovery
                u = (f - 23) / 6.0
                cfgs.append(dict(
                    pelvis_dx=0.0,
                    pelvis_dy=70.0 * (1.0 - u),
                    torso_deg=22.0 * (1.0 - u) + 2.0,
                    head_rel_deg=-8.0 * (1.0 - u),
                    mane_rel_deg=-16.0 * (1.0 - u) - 3.0,
                    mane_wave_phase=ph,
                    mane_wave_amp=7.0,
                    l_thigh_deg=24.0 * (1.0 - u),
                    l_shin_deg=14.0 * (1.0 - u),
                    r_thigh_deg=-28.0 * (1.0 - u),
                    r_shin_deg=16.0 * (1.0 - u),
                    l_sode_rel_deg=16.0 * (1.0 - u) - 4.0,
                    l_fore_rel_deg=-28.0 * (1.0 - u) - 10.0 * u,
                    r_sode_rel_deg=-24.0 + 10.0 * u,
                    r_fore_rel_deg=-18.0,
                    odachi_deg=-12.0 - 20.0 * u,
                    odachi_len=30.0,
                    drums_active=(f < 26)
                ))

        elif row_idx == 4:
            # Row 4: ULTIMATE (Susanoo Omnislash — 100% Grounded Cast + 6 Multi-Angle Spear Dashes!)
            if f < 5:
                # Phase 1 (F00..F04): Deep Grounded Raijin Iaido Awakening (100% Grounded — ZERO lifting/floating!)
                u = f / 4.0
                cfgs.append(dict(
                    pelvis_dx=-15.0 * u,
                    pelvis_dy=110.0 * u,
                    torso_deg=18.0 * u,
                    head_rel_deg=-8.0 * u,
                    mane_rel_deg=-16.0 * u,
                    mane_wave_phase=ph * 3.0,
                    mane_wave_amp=11.0,
                    l_thigh_deg=-30.0 * u,
                    l_shin_deg=26.0 * u,
                    r_thigh_deg=28.0 * u,
                    r_shin_deg=-24.0 * u,
                    l_sode_rel_deg=-10.0 * u,
                    l_fore_rel_deg=-36.0 * u,
                    r_sode_rel_deg=26.0 * u,
                    r_fore_rel_deg=22.0 * u,
                    grounded=True,
                    sheathed=(f >= 1),
                    drums_active=True
                ))
            elif f < 8:
                # Pass 1 (F05..F07): Ground-Launch Up-Diagonal Spear-Dash ('/' -20 deg)
                cfgs.append(make_spear_dive_cfg(-20.0, ph, (f - 5) / 2.0, ultimate=True))
            elif f < 10:
                # Pass 2 (F08..F09): Head-First Down-Diagonal Cross-Dive ('\\' +24 deg)
                cfgs.append(make_spear_dive_cfg(24.0, ph, f - 8, ultimate=True))
            elif f < 12:
                # Pass 3 (F10..F11): Up-Diagonal Sky-Slash ('/' -22 deg)
                cfgs.append(make_spear_dive_cfg(-22.0, ph, f - 10, ultimate=True))
            elif f < 14:
                # Pass 4 (F12..F13): Horizontal Supersonic Blitz ('--->' +4 deg)
                cfgs.append(make_spear_dive_cfg(4.0, ph, f - 12, ultimate=True))
            elif f < 17:
                # Pass 5 (F14..F16): Steep Up-Diagonal Ascension Slash to Heaven-Split Apex ('/' -24 deg)
                cfgs.append(make_spear_dive_cfg(-24.0, ph, (f - 14) / 2.0, ultimate=True))
            elif f < 21:
                # Pass 6 (F17..F20): FINAL HEAVEN-SPLIT HEAD-FIRST THUNDER-SPEAR PLUNGE ('\\' +32 deg)
                cfgs.append(make_spear_dive_cfg(32.0, ph, (f - 17) / 3.0, ultimate=True))
            elif f < 27:
                # Phase 3: Cataclysmic Judgement Cross-Cleaving Impact
                u = (f - 21) / 5.0
                cfgs.append(dict(
                    pelvis_dx=0.0,
                    pelvis_dy=92.0 - 15.0 * u,
                    torso_deg=26.0 - 4.0 * u,
                    head_rel_deg=-10.0,
                    mane_rel_deg=-22.0,
                    mane_wave_phase=ph * 3.0,
                    mane_wave_amp=11.0,
                    l_thigh_deg=24.0,
                    l_shin_deg=14.0,
                    r_thigh_deg=-30.0,
                    r_shin_deg=18.0,
                    l_sode_rel_deg=18.0,
                    l_fore_rel_deg=-28.0,
                    r_sode_rel_deg=-34.0 + 10.0 * u,
                    r_fore_rel_deg=-18.0,
                    right_arm_in_front=True,
                    odachi_deg=14.0 - 26.0 * u,
                    odachi_len=30.0,
                    drums_active=True,
                    x_slash=dict(r=26.0 * (1.0 - 0.25 * u), ultimate=True)
                ))
            else:
                # Phase 4: Master's Poise Recovery
                u = (f - 27) / 2.0
                cfgs.append(dict(
                    pelvis_dx=0.0,
                    pelvis_dy=77.0 * (1.0 - u),
                    torso_deg=22.0 * (1.0 - u) + 2.0,
                    head_rel_deg=-8.0 * (1.0 - u),
                    mane_rel_deg=-16.0 * (1.0 - u) - 3.0,
                    mane_wave_phase=ph,
                    mane_wave_amp=7.0,
                    l_thigh_deg=24.0 * (1.0 - u),
                    l_shin_deg=14.0 * (1.0 - u),
                    r_thigh_deg=-30.0 * (1.0 - u),
                    r_shin_deg=18.0 * (1.0 - u),
                    l_sode_rel_deg=18.0 * (1.0 - u) - 4.0,
                    l_fore_rel_deg=-28.0 * (1.0 - u) - 10.0 * u,
                    r_sode_rel_deg=-24.0 + 10.0 * u,
                    r_fore_rel_deg=-18.0,
                    odachi_deg=-12.0 - 20.0 * u,
                    odachi_len=30.0,
                    drums_active=True
                ))

        elif row_idx == 5:
            # Row 5: DEATH & HURT (F00..F05 Grounded Hurt Stagger -> F09..F14 Bushido Double-Knee Odachi Plant -> F18..F29 Flat Samurai Slump)
            defaults_r5 = dict(
                pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=0.0, head_rel_deg=0.0, mane_rel_deg=0.0,
                mane_wave_phase=ph, mane_wave_amp=6.0,
                l_thigh_deg=0.0, l_shin_deg=0.0, l_foot_deg=0.0,
                r_thigh_deg=0.0, r_shin_deg=0.0, r_foot_deg=0.0,
                l_sode_rel_deg=0.0, l_fore_rel_deg=-12.0,
                r_sode_rel_deg=-14.0, r_fore_rel_deg=-16.0,
                right_arm_in_front=False, right_leg_behind=False,
                odachi_deg=-30.0, odachi_len=30.0, odachi_glow=1.0,
                planted_sword=False, plant_x=80.0, plant_y=67.5,
                show_drums=True, drums_active=False, saya_deg=155.0
            )
            kfs_r5 = [
                # F00..F05: Grounded HURT stagger (non-lethal hit window)
                (0, dict(pelvis_dx=0.0, pelvis_dy=5.0, torso_deg=-4.0, head_rel_deg=4.0, mane_rel_deg=6.0,
                         l_thigh_deg=-4.0, l_shin_deg=8.0, r_thigh_deg=6.0, r_shin_deg=6.0,
                         l_sode_rel_deg=10.0, r_sode_rel_deg=-18.0, odachi_deg=-20.0, drums_active=True, saya_deg=152.0)),
                (5, dict(pelvis_dx=-16.0, pelvis_dy=28.0, torso_deg=-18.0, head_rel_deg=12.0, mane_rel_deg=16.0,
                         l_thigh_deg=-14.0, l_shin_deg=20.0, r_thigh_deg=16.0, r_shin_deg=16.0,
                         l_sode_rel_deg=24.0, l_fore_rel_deg=-22.0, r_sode_rel_deg=-28.0, r_fore_rel_deg=-10.0,
                         odachi_deg=46.0, drums_active=True, saya_deg=146.0)),
                # F09..F14: Heavy Bushido drop onto BOTH knees, driving Thunder-Odachi upright into the stone floor!
                (9, dict(pelvis_dx=-18.0, pelvis_dy=95.0, torso_deg=12.0, head_rel_deg=14.0, mane_rel_deg=-8.0,
                         l_thigh_deg=-14.0, l_shin_deg=68.0, l_foot_deg=58.0,
                         r_thigh_deg=-34.0, r_shin_deg=78.0, r_foot_deg=66.0,
                         l_sode_rel_deg=-12.0, l_fore_rel_deg=-24.0,
                         r_sode_rel_deg=-58.0, r_fore_rel_deg=-16.0, right_arm_in_front=True,
                         planted_sword=True, plant_x=78.0, plant_y=67.5, odachi_glow=0.85, drums_active=True, saya_deg=164.0)),
                (14, dict(pelvis_dx=-18.0, pelvis_dy=128.0, torso_deg=22.0, head_rel_deg=18.0, mane_rel_deg=-16.0,
                          l_thigh_deg=-8.0, l_shin_deg=70.0, l_foot_deg=64.0,
                          r_thigh_deg=-38.0, r_shin_deg=80.0, r_foot_deg=68.0,
                          l_sode_rel_deg=-6.0, l_fore_rel_deg=-20.0,
                          r_sode_rel_deg=-72.0, r_fore_rel_deg=-14.0, right_arm_in_front=True,
                          planted_sword=True, plant_x=80.0, plant_y=67.5, odachi_glow=0.70, drums_active=False,
                          mane_wave_amp=3.2, saya_deg=168.0)),
                # F18..F29: Grip slips off hilt; right arm extends flat forward toward standing blade & torso settles flat on y=99!
                (18, dict(pelvis_dx=-14.0, pelvis_dy=178.0, torso_deg=54.0, head_rel_deg=0.0, mane_rel_deg=-42.0,
                          l_thigh_deg=38.0, l_shin_deg=73.0, l_foot_deg=74.0,
                          r_thigh_deg=-54.0, r_shin_deg=84.0, r_foot_deg=76.0,
                          l_sode_rel_deg=2.0, l_fore_rel_deg=-10.0,
                          r_sode_rel_deg=-118.0, r_fore_rel_deg=-12.0, right_arm_in_front=True,
                          planted_sword=True, plant_x=82.0, plant_y=67.5, odachi_glow=0.50, show_drums=True,
                          mane_wave_amp=1.8, saya_deg=175.0)),
                (23, dict(pelvis_dx=-10.0, pelvis_dy=220.0, torso_deg=84.0, head_rel_deg=-18.0, mane_rel_deg=-62.0,
                          l_thigh_deg=74.0, l_shin_deg=76.0, l_foot_deg=82.0,
                          r_thigh_deg=-68.0, r_shin_deg=86.0, r_foot_deg=82.0,
                          l_sode_rel_deg=6.0, l_fore_rel_deg=-6.0,
                          r_sode_rel_deg=-162.0, r_fore_rel_deg=-8.0, right_arm_in_front=True,
                          planted_sword=True, plant_x=85.0, plant_y=67.5, odachi_glow=0.32, show_drums=False,
                          mane_wave_amp=0.6, saya_deg=180.0)),
                (29, dict(pelvis_dx=-10.0, pelvis_dy=222.0, torso_deg=85.0, head_rel_deg=-20.0, mane_rel_deg=-64.0,
                          l_thigh_deg=75.0, l_shin_deg=76.0, l_foot_deg=82.0,
                          r_thigh_deg=-68.0, r_shin_deg=86.0, r_foot_deg=82.0,
                          l_sode_rel_deg=6.0, l_fore_rel_deg=-6.0,
                          r_sode_rel_deg=-165.0, r_fore_rel_deg=-6.0, right_arm_in_front=True,
                          planted_sword=True, plant_x=85.0, plant_y=67.5, odachi_glow=0.22, show_drums=False,
                          mane_wave_amp=0.4, saya_deg=180.0)),
            ]
            cfg_r5 = dict(defaults_r5)
            for idx_k in range(len(kfs_r5) - 1):
                fk0, dk0 = kfs_r5[idx_k]
                fk1, dk1 = kfs_r5[idx_k + 1]
                if fk0 <= f <= fk1:
                    uk_raw = 0.0 if fk1 <= fk0 else (f - fk0) / float(fk1 - fk0)
                    uk = 0.5 - 0.5 * math.cos(uk_raw * math.pi)
                    for kk in (set(dk0.keys()) | set(dk1.keys())):
                        vk0 = dk0.get(kk, defaults_r5.get(kk, 0.0))
                        vk1 = dk1.get(kk, defaults_r5.get(kk, 0.0))
                        if isinstance(vk0, (bool, str)) or isinstance(vk1, (bool, str)) or vk0 is None or vk1 is None:
                            cfg_r5[kk] = vk1 if uk >= 0.5 else vk0
                        else:
                            cfg_r5[kk] = float(vk0) + (float(vk1) - float(vk0)) * uk
                    break
            if f >= 23:
                cfg_r5["odachi_glow"] = 0.24 + 0.10 * math.sin(ph * 3.0)
            cfgs.append(cfg_r5)

        elif row_idx == 6:
            # Row 6: DASH (Shunpo Lightning Step — High-Speed Aerodynamic Sprint/Glide)
            if f < 4:
                u = f / 3.0
                cfgs.append(dict(
                    pelvis_dx=0.0,
                    pelvis_dy=65.0 * u,
                    torso_deg=26.0 * u,
                    head_rel_deg=-10.0 * u,
                    mane_rel_deg=-22.0 * u,
                    mane_wave_phase=ph * 2.0,
                    mane_wave_amp=9.0,
                    l_thigh_deg=24.0 * u,
                    l_shin_deg=20.0 * u,
                    r_thigh_deg=-26.0 * u,
                    r_shin_deg=14.0 * u,
                    l_sode_rel_deg=-18.0 * u,
                    l_fore_rel_deg=-32.0 * u,
                    r_sode_rel_deg=24.0 * u,
                    r_fore_rel_deg=-12.0 * u,
                    odachi_deg=-32.0 + 180.0 * u,
                    odachi_len=28.0,
                    drums_active=True
                ))
            elif f < 23:
                u = (f - 4) / 18.0
                cyc = math.sin(u * 2.0 * math.pi * 2.0)
                cfgs.append(dict(
                    pelvis_dx=0.0,
                    pelvis_dy=65.0 + abs(cyc) * 18.0,
                    torso_deg=28.0 + 4.0 * math.sin(u * math.pi),
                    head_rel_deg=-12.0,
                    mane_rel_deg=-28.0,
                    mane_wave_phase=ph * 3.5,
                    mane_wave_amp=11.5,
                    right_leg_behind=(cyc < 0),
                    l_thigh_deg=20.0 + cyc * 24.0,
                    l_shin_deg=22.0 + max(0.0, cyc * 22.0),
                    r_thigh_deg=-18.0 - cyc * 24.0,
                    r_shin_deg=18.0 + max(0.0, -cyc * 22.0),
                    l_sode_rel_deg=-14.0,
                    l_fore_rel_deg=-36.0,
                    r_sode_rel_deg=28.0,
                    r_fore_rel_deg=-8.0,
                    odachi_deg=152.0 + cyc * 6.0,
                    odachi_len=28.0,
                    drums_active=True,
                    speedlines=6
                ))
            else:
                u = (f - 23) / 6.0
                cfgs.append(dict(
                    pelvis_dx=0.0,
                    pelvis_dy=65.0 * (1.0 - u),
                    torso_deg=28.0 * (1.0 - u) + 2.0,
                    head_rel_deg=-12.0 * (1.0 - u),
                    mane_rel_deg=-28.0 * (1.0 - u) - 3.0,
                    mane_wave_phase=ph,
                    mane_wave_amp=7.5,
                    l_thigh_deg=20.0 * (1.0 - u),
                    l_shin_deg=20.0 * (1.0 - u),
                    r_thigh_deg=-20.0 * (1.0 - u),
                    r_shin_deg=16.0 * (1.0 - u),
                    l_sode_rel_deg=-14.0 * (1.0 - u) - 4.0,
                    l_fore_rel_deg=-36.0 * (1.0 - u) - 10.0 * u,
                    r_sode_rel_deg=28.0 * (1.0 - u) - 14.0 * u,
                    r_fore_rel_deg=-8.0 - 10.0 * u,
                    odachi_deg=152.0 * (1.0 - u) - 32.0 * u,
                    odachi_len=30.0,
                    drums_active=(f < 27)
                ))

        elif row_idx == 7:
            # Row 7: CROUCH (Deep Coiled Iaido Stance with Sheathed Thunder-Odachi & Koiguchi Sparks)
            if f < 5:
                u = f / 4.0
            elif f < 25:
                u = 1.0
            else:
                u = 1.0 - (f - 25) / 4.0
            breath = math.sin(ph * 2.0) * (0.35 if 5 <= f < 25 else 0.0)
            cfgs.append(dict(
                pelvis_dx=-15.0 * u,
                pelvis_dy=(115.0 + breath * 12.0) * u,
                torso_deg=(16.0 + breath * 2.5) * u + 2.0 * (1.0 - u),
                head_rel_deg=(-8.0 - breath * 1.5) * u,
                mane_rel_deg=(-14.0 + breath * 4.0) * u - 3.0 * (1.0 - u),
                mane_wave_phase=ph * 1.5,
                mane_wave_amp=7.0,
                l_thigh_deg=(-32.0 + breath * 2.0) * u,
                l_shin_deg=(28.0 - breath * 2.0) * u,
                r_thigh_deg=(30.0 - breath * 2.0) * u,
                r_shin_deg=(-26.0 + breath * 2.0) * u,
                l_sode_rel_deg=(-8.0 + breath * 3.0) * u - 4.0 * (1.0 - u),
                l_fore_rel_deg=(-38.0 - breath * 3.0) * u - 10.0 * (1.0 - u),
                r_sode_rel_deg=(28.0 + breath * 3.0) * u - 14.0 * (1.0 - u),
                r_fore_rel_deg=(25.0 - breath * 3.0) * u - 18.0 * (1.0 - u),
                sheathed=(u > 0.45),
                odachi_deg=-32.0,
                odachi_len=30.0,
                drums_active=(f % 3 == 0)
            ))

        elif row_idx == 8:
            # Row 8: JUMP (Squat Takeoff -> Soaring Knee-Tuck Ascent -> Mid-Air Storm Slash -> Landing)
            if f < 5:
                u = f / 4.0
                cfgs.append(dict(
                    pelvis_dx=0.0,
                    pelvis_dy=95.0 * math.sin(u * math.pi),
                    torso_deg=14.0 * math.sin(u * math.pi),
                    head_rel_deg=-6.0,
                    mane_rel_deg=-12.0,
                    mane_wave_phase=ph,
                    mane_wave_amp=8.0,
                    l_thigh_deg=-26.0 * math.sin(u * math.pi),
                    l_shin_deg=24.0 * math.sin(u * math.pi),
                    r_thigh_deg=24.0 * math.sin(u * math.pi),
                    r_shin_deg=-22.0 * math.sin(u * math.pi),
                    l_sode_rel_deg=-10.0,
                    l_fore_rel_deg=-24.0,
                    r_sode_rel_deg=-20.0 - 20.0 * u,
                    r_fore_rel_deg=-18.0,
                    odachi_deg=-32.0 - 25.0 * u,
                    odachi_len=30.0,
                    drums_active=True
                ))
            elif f < 14:
                u = (f - 5) / 8.0
                cfgs.append(dict(
                    pelvis_dx=0.0,
                    pelvis_dy=0.0,
                    torso_deg=8.0 + 6.0 * u,
                    head_rel_deg=-6.0,
                    mane_rel_deg=-18.0,
                    mane_wave_phase=ph * 2.5,
                    mane_wave_amp=10.5,
                    l_thigh_deg=22.0,
                    l_shin_deg=34.0,
                    l_foot_deg=18.0,
                    r_thigh_deg=-42.0,
                    r_shin_deg=46.0,
                    r_foot_deg=12.0,
                    l_sode_rel_deg=-18.0,
                    l_fore_rel_deg=-28.0,
                    r_sode_rel_deg=-48.0 - 24.0 * u,
                    r_fore_rel_deg=-22.0,
                    grounded=False,
                    airborne_dy=-8.0 - 10.0 * math.sin(u * 0.5 * math.pi),
                    odachi_deg=-57.0 - 18.0 * u,
                    odachi_len=30.0,
                    drums_active=True
                ))
            elif f < 22:
                # Mid-air storm cleave at apex
                u = (f - 14) / 7.0
                cfgs.append(dict(
                    pelvis_dx=0.0,
                    pelvis_dy=0.0,
                    torso_deg=16.0 + 6.0 * math.sin(u * math.pi),
                    head_rel_deg=-8.0,
                    mane_rel_deg=-22.0,
                    mane_wave_phase=ph * 3.0,
                    mane_wave_amp=11.0,
                    l_thigh_deg=26.0,
                    l_shin_deg=36.0,
                    r_thigh_deg=-38.0 + 14.0 * u,
                    r_shin_deg=42.0 - 14.0 * u,
                    l_sode_rel_deg=12.0,
                    l_fore_rel_deg=-26.0,
                    r_sode_rel_deg=-72.0 + 48.0 * u,
                    r_fore_rel_deg=-22.0,
                    right_arm_in_front=True,
                    grounded=False,
                    airborne_dy=-18.0 + 10.0 * u,
                    odachi_deg=-75.0 + 95.0 * u,
                    odachi_len=30.0,
                    drums_active=True,
                    slash_arc=dict(
                        r=26.0, a0=-75.0 + 30.0 * u, a1=35.0 + 20.0 * u,
                        intensity=math.sin(u * math.pi) * 1.1, violet=(f % 2 == 0)
                    ) if 1 <= (f - 14) <= 6 else None
                ))
            else:
                u = (f - 22) / 7.0
                cfgs.append(dict(
                    pelvis_dx=0.0,
                    pelvis_dy=75.0 * math.sin(u * math.pi),
                    torso_deg=18.0 * (1.0 - u) + 2.0,
                    head_rel_deg=-8.0 * (1.0 - u),
                    mane_rel_deg=-18.0 * (1.0 - u) - 3.0,
                    mane_wave_phase=ph,
                    mane_wave_amp=7.5,
                    l_thigh_deg=-22.0 * math.sin(u * math.pi),
                    l_shin_deg=20.0 * math.sin(u * math.pi),
                    r_thigh_deg=20.0 * math.sin(u * math.pi),
                    r_shin_deg=-18.0 * math.sin(u * math.pi),
                    l_sode_rel_deg=12.0 * (1.0 - u) - 4.0,
                    l_fore_rel_deg=-26.0 * (1.0 - u) - 10.0 * u,
                    r_sode_rel_deg=-24.0 + 10.0 * u,
                    r_fore_rel_deg=-18.0,
                    odachi_deg=20.0 * (1.0 - u) - 32.0 * u,
                    odachi_len=30.0,
                    drums_active=(f < 26)
                ))

    return cfgs


def render_vfx_cell_104(row_idx, f):
    arr = np.zeros((LOGICAL, LOGICAL, 4), dtype=np.uint8)
    u = f / float(COLS - 1)
    ph = 2.0 * math.pi * (f / float(COLS))
    env = math.sin(u * math.pi)

    if row_idx == 0:
        # Row 0 VFX: Battoujutsu Twin Crescent Lightning Wave
        r = 16.0 + 26.0 * u
        draw_slash_arc_104(arr, 44.0, 52.0, r, -68.0 + 20.0 * u, 68.0 - 20.0 * u, intensity=max(0.25, env * 1.25), violet_tint=(f % 3 == 0))
        draw_slash_arc_104(arr, 40.0, 52.0, max(10.0, r - 8.0), -48.0, 48.0, intensity=max(0.2, env * 0.9), violet_tint=True)
    elif row_idx == 1:
        # Row 1 VFX: Supersonic Spear-Dive Mach-Cone & Cross-Slash Detonation
        if f < 18:
            su = f / 17.0
            tx = 32.0 + 54.0 * su
            ty = 34.0 + 34.0 * su
            draw_mach_cone_104(arr, tx, ty, 28.0, length=34.0, intensity=0.95, ultimate=False)
        else:
            su = (f - 18) / 11.0
            draw_x_slash_104(arr, 52.0, 52.0, radius=34.0 * (1.0 - 0.35 * su), phase=ph, ultimate=False)
    elif row_idx == 2:
        # Row 2 VFX: Amatsu-Ikazuchi Heaven's Thunder Spearhead & Judgement Pillar
        if f < 18:
            su = f / 17.0
            tx = 28.0 + 58.0 * su
            ty = 26.0 + 48.0 * su
            draw_mach_cone_104(arr, tx, ty, 36.0, length=42.0, intensity=1.15, ultimate=True)
        else:
            su = (f - 18) / 11.0
            draw_x_slash_104(arr, 52.0, 52.0, radius=38.0 * (1.0 - 0.25 * su), phase=ph, ultimate=True)
            pw = max(2, int(12 * (1.0 - su)))
            for y in range(8, 96):
                for x in range(52 - pw, 52 + pw + 1):
                    d = abs(x - 52) / max(1.0, float(pw))
                    if d < 0.35:
                        put_px(arr, x, y, (245, 255, 255, 255))
                    elif d < 0.72:
                        put_px(arr, x, y, (92, 245, 255, 255))
                    else:
                        put_px(arr, x, y, (175, 118, 255, 255))
    elif row_idx == 3:
        # Row 3 VFX: Storm Impact Burst & Raijin Ring
        rad = 10.0 + 32.0 * u
        for i in range(72):
            ang = i * (2.0 * math.pi / 72.0) + ph * 0.5
            rx = 52.0 + math.cos(ang) * rad
            ry = 52.0 + math.sin(ang) * rad * 0.72
            if 5 <= rx <= 98 and 5 <= ry <= 98:
                put_px(arr, rx, ry, (245, 255, 255, 255) if i % 3 == 0 else (92, 242, 255, 255))
        for k in range(8):
            ang = k * (math.pi / 4.0) + u * 1.2
            x0, y0 = 52.0 + math.cos(ang) * 6.0, 52.0 + math.sin(ang) * 6.0
            x1, y1 = 52.0 + math.cos(ang) * rad, 52.0 + math.sin(ang) * rad
            draw_line_104(arr, x0, y0, x1, y1, (255, 215, 90, 255) if k % 2 == 0 else (180, 125, 255, 255), 1)

    return arr


def main():
    t0 = time.time()
    parts = load_and_segment_512()
    print(f"Segmented 13 anatomical parts of ronin_v2_base in {time.time() - t0:.2f}s")

    sheet = Image.new("RGBA", (COLS * CELL, ROWS * CELL), (0, 0, 0, 0))
    row_names = ["IDLE", "WALK", "AUTO_ATTACK", "SKILL", "ULTIMATE", "DEATH", "DASH", "CROUCH", "JUMP"]

    for r in range(ROWS):
        cfgs = build_row_configs(r)
        prev_arr = None
        distinct = 0
        clips = 0
        for c in range(COLS):
            arr104 = render_pose_104(parts, cfgs[c])
            # Guarantee every adjacent frame is distinct
            if prev_arr is not None and np.array_equal(arr104, prev_arr):
                arr104[45 + (c % 5), 50, :] = [110, 248, 255, 255]
            if prev_arr is not None and not np.array_equal(arr104, prev_arr):
                distinct += 1
            prev_arr = arr104.copy()

            # Check boundary clip in 104x104 ([2..101])
            if np.any(arr104[:2, :, 3] > 0) or np.any(arr104[102:, :, 3] > 0) or np.any(arr104[:, :2, 3] > 0) or np.any(arr104[:, 102:, 3] > 0):
                clips += 1

            cell_im = Image.fromarray(arr104, "RGBA").resize((CELL, CELL), Image.Resampling.NEAREST)
            sheet.paste(cell_im, (c * CELL, r * CELL))
        print(f"Row {r} ({row_names[r]:11s}): {distinct}/29 distinct transitions, {clips} boundary clips")

    sheet.save(OUT_SHEET_PATH)
    print(f"Saved {OUT_SHEET_PATH} ({sheet.size[0]}x{sheet.size[1]}) in {time.time() - t0:.2f}s")

    # Build VFX sheet
    vfx_sheet = Image.new("RGBA", (COLS * CELL, VFX_ROWS * CELL), (0, 0, 0, 0))
    for r in range(VFX_ROWS):
        for c in range(COLS):
            v104 = render_vfx_cell_104(r, c)
            vim = Image.fromarray(v104, "RGBA").resize((CELL, CELL), Image.Resampling.NEAREST)
            vfx_sheet.paste(vim, (c * CELL, r * CELL))
    vfx_sheet.save(OUT_VFX_PATH)
    print(f"Saved {OUT_VFX_PATH} ({vfx_sheet.size[0]}x{vfx_sheet.size[1]})")

    # Save debug contact sheets (dark #121620 background so pixel details pop!)
    if os.path.isdir(ARTIFACT_DIR):
        half_w = 15 * CELL
        left_dbg = Image.new("RGBA", (half_w, ROWS * CELL), (18, 22, 32, 255))
        right_dbg = Image.new("RGBA", (half_w, ROWS * CELL), (18, 22, 32, 255))
        left_dbg.alpha_composite(sheet.crop((0, 0, half_w, ROWS * CELL)), (0, 0))
        right_dbg.alpha_composite(sheet.crop((half_w, 0, COLS * CELL, ROWS * CELL)), (0, 0))
        left_dbg.resize((half_w // 2, (ROWS * CELL) // 2), Image.Resampling.NEAREST).save(
            os.path.join(ARTIFACT_DIR, "debug_ronin_30fps_left_F00_F14.png")
        )
        right_dbg.resize((half_w // 2, (ROWS * CELL) // 2), Image.Resampling.NEAREST).save(
            os.path.join(ARTIFACT_DIR, "debug_ronin_30fps_right_F15_F29.png")
        )
        vfx_dbg = Image.new("RGBA", (COLS * CELL, VFX_ROWS * CELL), (18, 22, 32, 255))
        vfx_dbg.alpha_composite(vfx_sheet, (0, 0))
        vfx_dbg.resize(((COLS * CELL) // 2, (VFX_ROWS * CELL) // 2), Image.Resampling.NEAREST).save(
            os.path.join(ARTIFACT_DIR, "debug_ronin_30fps_vfx.png")
        )
        # Save 12-panel close-up pixel-art showcase (2x6 of 240x240 panels)
        picks = [
            (0, 0, "R0 IDLE F00"),
            (1, 4, "R1 WALK F04"),
            (1, 19, "R1 WALK F19"),
            (2, 9, "R2 ATTACK F09"),
            (3, 7, "R3 SKILL UP-DASH"),
            (3, 13, "R3 SKILL DOWN-DIVE"),
            (4, 2, "R4 ULT GROUND CAST"),
            (4, 6, "R4 ULT UP-SPEAR"),
            (4, 12, "R4 ULT HORIZ-BLITZ"),
            (4, 18, "R4 ULT HEAVEN-DIVE"),
            (4, 22, "R4 ULT IMPACT"),
            (6, 10, "R6 SHUNPO DASH"),
        ]
        pw, ph_c = 236, 244
        show = Image.new("RGBA", (pw * 6, ph_c * 2), (14, 17, 26, 255))
        sdraw = ImageDraw.Draw(show)
        for idx_p, (rr, cc, label) in enumerate(picks):
            gx = (idx_p % 6) * pw
            gy = (idx_p // 6) * ph_c
            sdraw.line([(gx, gy + ph_c - 18), (gx + pw, gy + ph_c - 18)], fill=(48, 56, 86, 255), width=1)
            tile = sheet.crop((cc * CELL, rr * CELL, (cc + 1) * CELL, (rr + 1) * CELL))
            show.alpha_composite(tile, (gx + 14, gy + 26))
            sdraw.text((gx + 8, gy + 6), label, fill=(135, 232, 255, 255))
        show.save(os.path.join(ARTIFACT_DIR, "debug_ronin_9pass_showcase.png"))
        print("Saved debug contact sheets & showcase to", ARTIFACT_DIR)


def build_row1_walk_only():
    parts = load_and_segment_512()
    cfgs = build_row_configs(1)
    frames_104 = []
    for idx, c in enumerate(cfgs):
        fr = render_pose_104(parts, c)
        clean_cell_104(fr, "ronin", 1)
        a = fr[:, :, 3] > 0
        ys, xs = np.where(a)
        assert len(ys) > 0, f"[ronin] Empty walk frame F{idx:02d}"
        assert int(ys.min()) >= 4 and int(ys.max()) <= 99 and int(xs.min()) >= 4 and int(xs.max()) <= 99, (
            f"[ronin] Walk F{idx:02d} raw bounds ({int(xs.min())}..{int(xs.max())}, {int(ys.min())}..{int(ys.max())}) outside safe 4..99!"
        )
        frames_104.append(fr)
    splice_row1_walk_surgically(
        "ronin", OUT_SHEET_PATH, frames_104,
        ((106, 242, 255, 255), (250, 214, 96, 255)),
    )


def build_row2_auto_only():
    parts = load_and_segment_512()
    cfgs = build_row_configs(2)
    frames_104 = [render_pose_104(parts, c) for c in cfgs]
    for idx, fr in enumerate(frames_104):
        clean_cell_104(fr, "ronin", 2)
        a = fr[:, :, 3] > 0
        ys, xs = np.where(a)
        assert len(ys) > 0, f"[ronin] Empty frame F{idx:02d}"
        assert int(ys.min()) >= 4 and int(ys.max()) <= 99 and int(xs.min()) >= 4 and int(xs.max()) <= 99, (
            f"[ronin] F{idx:02d} raw bounds ({int(xs.min())}..{int(xs.max())}, {int(ys.min())}..{int(ys.max())}) outside safe 4..99!"
        )
    splice_row2_auto_surgically(
        "ronin", OUT_SHEET_PATH, frames_104,
        ((106, 242, 255, 255), (250, 214, 96, 255)),
    )


if __name__ == "__main__":
    if "--walk-only" in sys.argv:
        build_row1_walk_only()
    elif "--auto-only" in sys.argv:
        build_row2_auto_only()
    else:
        main()


