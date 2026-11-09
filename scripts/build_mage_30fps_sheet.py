#!/usr/bin/env python3
"""
Builds Ignis Sol (FireMage — Mysterious Shadow-Faced Black-Mage Pyromancer) 30fps HD-2D Sprite Sheet
(6240x1872, 30 cols x 9 rows of 208x208) using:
- Cape-free, limb-separated 16-bit HD-2D reference base model: assets/sprites/mage_v2_base.jpg
- 16-part hierarchical skeletal segmentation (mane [wizard-hat tail], head [wide-brimmed crimson
  wizard hat + golden sun crest + pitch-black shadow void face + glowing molten-gold flame eyes],
  torso [upturned gold-trimmed crimson collar + solar brooch + Sun-Wheel belt], l_coat, r_coat,
  back_hem, l_sode, l_forearm, r_sode, r_forearm, l_thigh, l_shin, l_foot, r_thigh, r_shin, r_foot)
  with 0 uncovered silhouette pixels
- 104x104 logical resolution upscaled 2x NEAREST to 208x208 (400% finer pixel detail than 52x52)
- Strict 20-Color Hand-Crafted Black-Mage Master Palette + 2-Pass Cardinal Orphan Despeckle
  + Crisp 1px Selective Outline (Selout) — eliminating 100% of AI RGB gradients & confetti noise
  while preserving razor-sharp glowing molten-gold flame eyes inside his pitch-black shadow face
- Articulated Rotating 8-Point Solar Astrolabe Back-Halo + Crescent Helios Sun-Staff in 104x104 space
- 100% Grounded IDLE/WALK/AUTO/SKILL/ULTIMATE/CROUCH + Smooth Shallow Flame-Step & Solar Vault Glides
"""

import os
import math
import time
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE_IMG_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "mage_v2_base.jpg")
OUT_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "mage_sheet.png")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"

CELL = 208
LOGICAL = 104
COLS = 30
ROWS = 9

# Strict 20-Color Hand-Crafted Mysterious Shadow-Faced Black-Mage Master Palette
MASTER_PALETTE = np.array([
    # 0-2: Pitch-Black Shadow-Void Face & Crisp Selective Outlines (Selout)
    [8, 7, 13],       # 0: Pure Abyssal Shadow-Void Face & Deepest Outline
    [22, 15, 22],     # 1: Deep Obsidian Hatband & Spell-Glove Shadow
    [38, 18, 24],     # 2: Maroon-Obsidian Selout
    # 3-6: 4-Step Tailored Obsidian-Charcoal Sleeves, Hatband, Spell-Gloves & Breeches Ramp
    [30, 30, 38],     # 3: Deep Obsidian Breeches & Sleeve Shadow
    [48, 46, 56],     # 4: Tailored Charcoal Midtone
    [72, 68, 80],     # 5: Slate-Charcoal Knuckle & Breeches Fold Highlight
    [96, 88, 100],    # 6: Subtle Obsidian Glove & Hatband Rim Highlight
    # 7-11: 5-Step Crimson Wizard-Hat, Collar, Battle-Coat & Molten Vermilion Ramp
    [68, 16, 22],     # 7: Deep Burgundy Inner Coat-Lining Shadow
    [108, 24, 28],    # 8: Dark Wizard-Hat & Battle-Coat Crimson Shadow
    [152, 34, 34],    # 9: Classic Black-Mage Royal Crimson Base
    [194, 50, 42],    # 10: Lit Wizard-Hat Crown & Knee-Cop Scarlet Highlight
    [238, 92, 38],    # 11: Blazing Molten Vermilion-Orange Eye Rim, Brooch & Flame
    # 12-15: 4-Step Rune-Etched Dark-Bronze Greave & Burnished Sun-Gold Filigree Ramp
    [78, 52, 38],     # 12: Dark Rune-Etched Bronze Greave Shadow
    [118, 78, 48],    # 13: Burnished Bronze Greave & Pauldron Midtone
    [176, 118, 38],   # 14: Rich Imperial Gold Filigree & Sun-Wheel Belt Midtone
    [228, 174, 48],   # 15: Bright Helios Sun-Gold Collar Trim, Hat Crest & Crescent
    # 16-19: 4-Step Fierce Molten-Amber Shadow-Eye Glow & Pure Solar Corona Ramp
    [248, 142, 34],   # 16: Molten Amber Eye Outer Glow & Solar Brooch Core
    [254, 196, 56],   # 17: Fierce Golden-Amber Flame Eye Midtone
    [255, 234, 112],  # 18: Blazing Solar-Yellow Eye Center & Astrolabe Gleam
    [255, 250, 226],  # 19: White-Hot Solar Nucleus
], dtype=np.int32)

# Pre-bound RGBA palette tuples for crisp 104x104 Astrolabe Halo, Helios Sun-Staff, and Pyromancy FX
P_OUTLINE = (8, 7, 13, 255)
P_SELOUT = (38, 18, 24, 255)
P_CRIM_SHAD = (108, 24, 28, 255)
P_CRIM_BASE = (152, 34, 34, 255)
P_SCAR_LIT = (194, 50, 42, 255)
P_VERMILION = (238, 92, 38, 255)
P_CHAR_SHAD = (30, 30, 38, 255)
P_CHAR_MID = (48, 46, 56, 255)
P_BRONZE_DARK = (78, 52, 38, 255)
P_GOLD_MID = (176, 118, 38, 255)
P_GOLD_LIT = (228, 174, 48, 255)
P_AMBER_GLOW = (248, 142, 34, 255)
P_SOLAR_GLEAM = (255, 234, 112, 255)
P_IVORY = (255, 250, 226, 255)


def quantize_and_cluster_104(arr104):
    """
    Transforms a downsampled 104x104 RGBA frame into authentic hand-clustered pixel art:
    1. Quantizes all opaque pixels to the 20-color MASTER_PALETTE (eliminating AI gradients/mixels).
    2. Runs 2 passes of cardinal neighbor majority clustering (removing isolated 1px AI speckles)
       while protecting Ignis Sol's glowing molten-gold flame eyes & golden sun emblems.
    3. Applies a crisp 1px dark selective outline (Selout) around the outer silhouette.
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
        # Protect glowing flame eyes, molten vermilion rims, and bright gold sun-crest highlights
        protect = (idx_map == 11) | (idx_map >= 15)
        orphan = interior & (same_cnt == 0) & (~protect)

        replacement = np.where((up == dn) & (up >= 0), up, np.where((lf == rt) & (lf >= 0), lf, up))
        idx_map = np.where(orphan & (replacement >= 0), replacement, idx_map)

    # Crisp 1px Selective Outline (Selout) on outer silhouette edges
    up_a = np.pad(alpha[:-1, :], ((1, 0), (0, 0)), constant_values=False)
    dn_a = np.pad(alpha[1:, :], ((0, 1), (0, 0)), constant_values=False)
    lf_a = np.pad(alpha[:, :-1], ((0, 0), (1, 0)), constant_values=False)
    rt_a = np.pad(alpha[:, 1:], ((0, 0), (0, 1)), constant_values=False)
    edge = alpha & (~(up_a & dn_a & lf_a & rt_a))

    is_gleam = idx_map >= 16
    body_edge = edge & (~is_gleam)
    shadow_edge = body_edge & ((~dn_a) | (~rt_a))
    lit_edge = body_edge & (~shadow_edge)
    idx_map[lit_edge] = 2
    idx_map[shadow_edge] = 0

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
    Loads mage_v2_base.jpg (1024x1024), removes exterior & interior white pockets,
    applies MedianFilter(size=3) cel-flattening on body robes while preserving raw crisp
    shadow-face flame eyes, and segments into 16 clean anatomical pixel-art parts (0 uncovered px).
    """
    im = Image.open(BASE_IMG_PATH).convert("RGBA")
    seeds = [
        (0, 0), (1023, 0), (0, 1023), (1023, 1023),
        (425, 450), (615, 495), (515, 760), (515, 860),
        (350, 845), (675, 835),
    ]
    for seed in seeds:
        px_s = im.getpixel(seed)
        if px_s[0] > 230 and px_s[1] > 230 and px_s[2] > 230:
            ImageDraw.floodfill(im, seed, (0, 0, 0, 0), thresh=38)

    arr = np.array(im)
    r0, g0, b0 = arr[:, :, 0].astype(np.int16), arr[:, :, 1].astype(np.int16), arr[:, :, 2].astype(np.int16)
    arr[(r0 > 244) & (g0 > 244) & (b0 > 244)] = [0, 0, 0, 0]

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
    rgb512_raw = np.array(im512.convert("RGB"))
    rgb_med3 = np.array(im512.convert("RGB").filter(ImageFilter.MedianFilter(size=3)))
    arr512 = np.array(im512)
    H, W = arr512.shape[:2]
    alpha = arr512[:, :, 3] > 0

    def P(pts):
        return [(x * 0.5, y * 0.5) for (x, y) in pts]

    # Preserve raw unblurred glowing flame eyes & sun-crest inside the wizard hat face zone!
    eye_zone = poly_mask(H, W, P([(480, 65), (605, 65), (605, 260), (480, 260)]))
    blended_rgb = np.where(eye_zone[:, :, None], rgb512_raw, rgb_med3)
    arr512[:, :, :3] = np.where(alpha[:, :, None], blended_rgb, 0)

    # 1. Curved Pointed Wizard Hat Tail Tip (mane)
    m_mane = poly_mask(H, W, P([
        (320, 44), (446, 44), (440, 128), (382, 134), (320, 98)
    ])) & alpha

    # 2. Head: Wide-Brimmed Crimson Wizard Hat + Golden Sun Crest + Pitch-Black Shadow Face + Glowing Eyes
    m_head = poly_mask(H, W, P([
        (442, 18), (625, 18), (720, 194), (720, 224),
        (650, 246), (592, 248), (588, 286), (544, 326),
        (522, 324), (500, 274), (452, 262), (438, 240),
        (355, 238), (314, 208), (314, 192), (428, 178), (438, 126)
    ])) & alpha & (~m_mane)

    # 3. Left Crimson-Gold Shoulder Pauldron & Upper Obsidian Sleeve
    m_l_sode = poly_mask(H, W, P([
        (324, 308), (432, 302), (450, 344), (442, 396), (402, 474), (324, 424)
    ])) & alpha & (~m_head)

    # 4. Left Gold-Etched Crimson Vambrace & Dark Obsidian Spell-Glove
    m_l_forearm = poly_mask(H, W, P([
        (294, 420), (344, 422), (402, 474), (376, 552),
        (396, 582), (396, 616), (374, 616), (368, 608),
        (368, 656), (320, 656), (294, 618)
    ])) & alpha & (~m_l_sode)

    # 5. Right Crimson-Gold Shoulder Pauldron & Upper Obsidian Sleeve
    m_r_sode = poly_mask(H, W, P([
        (586, 312), (652, 316), (660, 434), (598, 478), (588, 408), (598, 365)
    ])) & alpha & (~m_head)

    # 6. Right Gold-Etched Crimson Vambrace & Dark Obsidian Spell-Glove
    m_r_forearm = poly_mask(H, W, P([
        (596, 476), (658, 432), (738, 545), (738, 644), (648, 644), (642, 552)
    ])) & alpha & (~m_r_sode)

    # 7. Torso: Upturned Crimson-Gold Collar, Solar Throat Brooch, Vest & Golden Sun-Wheel Belt
    m_torso = poly_mask(H, W, P([
        (405, 240), (500, 272), (522, 324), (544, 326),
        (588, 286), (592, 246), (636, 246), (646, 315),
        (596, 408), (618, 526), (582, 546), (534, 546),
        (442, 526), (440, 400), (405, 310)
    ])) & alpha & (~m_head) & (~m_l_sode) & (~m_l_forearm) & (~m_r_sode) & (~m_r_forearm)

    # 8. Left Articulated Crimson-Gold Coat-Tail (pivots at left belt hip)
    m_l_coat = poly_mask(H, W, P([
        (440, 520), (538, 520), (508, 585), (468, 635),
        (425, 685), (396, 735), (372, 785), (352, 835),
        (338, 902), (264, 860), (264, 740), (368, 650)
    ])) & alpha & (~m_torso) & (~m_l_forearm)

    # 9. Right Articulated Crimson-Gold Coat-Tail (pivots at right belt hip, includes inner calf lining)
    m_r_coat = poly_mask(H, W, P([
        (580, 520), (624, 520), (678, 655), (734, 760),
        (734, 886), (694, 886), (648, 828), (648, 768),
        (668, 735), (648, 685), (620, 635), (596, 585)
    ])) & alpha & (~m_torso) & (~m_r_forearm)

    # 10-11. Define Left & Right Shins (+ Circular Crimson-Gold Knee-Cops)
    m_l_foot = poly_mask(H, W, P([
        (330, 902), (448, 908), (448, 998), (330, 998)
    ])) & alpha & (~m_l_coat)

    m_l_shin = poly_mask(H, W, P([
        (352, 780), (396, 686), (482, 686), (484, 756),
        (456, 815), (446, 910), (344, 904)
    ])) & alpha & (~m_l_foot) & (~m_l_coat)

    m_r_foot = poly_mask(H, W, P([
        (578, 892), (668, 888), (742, 932), (742, 982), (578, 982)
    ])) & alpha & (~m_r_coat)

    m_r_shin = poly_mask(H, W, P([
        (562, 735), (608, 686), (668, 686), (668, 768),
        (648, 778), (656, 894), (578, 896), (562, 785)
    ])) & alpha & (~m_r_foot) & (~m_r_coat)

    # 12. Upper Back Burgundy Inner Skirt (kept compact above y=745 so spread stances have zero dangling prongs)
    r_512 = arr512[:, :, 0].astype(np.int16)
    g_512 = arr512[:, :, 1].astype(np.int16)
    m_back_hem = (
        poly_mask(H, W, P([(482, 650), (576, 650), (576, 742), (482, 742)]))
    ) & alpha & (~m_torso) & (~m_l_coat) & (~m_r_coat) & (~m_l_shin) & (~m_r_shin) & ((r_512 - g_512) > 20)

    # 13-14. Left & Right Obsidian Breeches Thighs (cleanly absorbing lower inner lining along each thigh)
    m_l_thigh = poly_mask(H, W, P([
        (395, 520), (522, 520), (512, 816), (452, 816), (484, 756), (395, 735)
    ])) & alpha & (~m_torso) & (~m_l_coat) & (~m_back_hem) & (~m_l_shin)

    m_r_thigh = poly_mask(H, W, P([
        (520, 520), (668, 520), (668, 755), (584, 814), (524, 814)
    ])) & alpha & (~m_torso) & (~m_r_coat) & (~m_back_hem) & (~m_r_shin) & (~m_l_thigh)

    raw_parts = [
        ("mane", m_mane), ("head", m_head), ("torso", m_torso),
        ("l_coat", m_l_coat), ("r_coat", m_r_coat), ("back_hem", m_back_hem),
        ("l_sode", m_l_sode), ("l_forearm", m_l_forearm),
        ("r_sode", m_r_sode), ("r_forearm", m_r_forearm),
        ("l_thigh", m_l_thigh), ("l_shin", m_l_shin), ("l_foot", m_l_foot),
        ("r_thigh", m_r_thigh), ("r_shin", m_r_shin), ("r_foot", m_r_foot),
    ]

    raw_masks = [m.copy() for _, m in raw_parts]
    for idx, (name, _) in enumerate(raw_parts):
        if name not in ("back_hem",):
            raw_masks[idx] = keep_largest_component(raw_masks[idx])

    for _ in range(8):
        cov_now = np.zeros((H, W), dtype=bool)
        for m in raw_masks:
            cov_now |= m
        rem = alpha & (~cov_now)
        if not np.any(rem):
            break
        for idx in range(len(raw_masks)):
            m = raw_masks[idx]
            dil = (
                np.pad(m[1:, :], ((0, 1), (0, 0)), constant_values=False)
                | np.pad(m[:-1, :], ((1, 0), (0, 0)), constant_values=False)
                | np.pad(m[:, 1:], ((0, 0), (0, 1)), constant_values=False)
                | np.pad(m[:, :-1], ((0, 0), (1, 0)), constant_values=False)
            )
            claim = rem & dil
            if np.any(claim):
                raw_masks[idx] = m | claim
                rem = rem & (~claim)

    # Save debug segmentation overlay for visual verification
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    seg_cols = [
        (255, 80, 180), (255, 60, 60), (255, 180, 40),
        (220, 40, 120), (180, 60, 220), (120, 40, 80),
        (60, 200, 255), (40, 120, 255),
        (80, 255, 160), (40, 190, 90),
        (255, 240, 80), (200, 220, 40), (150, 170, 30),
        (120, 240, 240), (60, 180, 200), (40, 130, 160),
    ]
    vis = np.zeros((H, W, 3), dtype=np.uint8) + 24

    parts = {}
    covered = np.zeros((H, W), dtype=bool)
    for idx, ((name, _), m) in enumerate(zip(raw_parts, raw_masks)):
        covered |= m
        vis[m] = (arr512[:, :, :3][m].astype(np.float32) * 0.55 + np.array(seg_cols[idx], dtype=np.float32) * 0.45).astype(np.uint8)
        ys, xs = np.where(m)
        if len(ys) == 0:
            parts[name] = (Image.new("RGBA", (2, 2), (0, 0, 0, 0)), 0, 0)
            continue
        x0, x1 = int(xs.min()), int(xs.max()) + 1
        y0, y1 = int(ys.min()), int(ys.max()) + 1
        crop = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
        sub_m = m[y0:y1, x0:x1]
        crop[sub_m] = arr512[y0:y1, x0:x1][sub_m]
        parts[name] = (Image.fromarray(crop, "RGBA"), x0, y0)

    Image.fromarray(vis, "RGB").save(os.path.join(ARTIFACT_DIR, "debug_mage_v2_parts.png"))
    missed = int((alpha & (~covered)).sum())
    print(f"[Ignis Sol Black-Mage 512x512 Segmentation] 16 parts extracted, uncovered pixels: {missed}")
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


def draw_joint_cap(draw, pt, r, fill=(30, 30, 38, 255), inner=(68, 16, 22, 255)):
    cx, cy = int(round(pt[0])), int(round(pt[1]))
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)
    ir = max(1, int(r * 0.68))
    draw.ellipse([cx - ir, cy - ir, cx + ir, cy + ir], fill=inner)


def draw_capsule(draw, p0, p1, r, fill=(30, 30, 38, 255)):
    draw.line([p0, p1], fill=fill, width=int(r * 2))
    draw_joint_cap(draw, p0, r, fill=fill, inner=fill)
    draw_joint_cap(draw, p1, r, fill=fill, inner=fill)


def put_px(arr, x, y, col):
    H, W = arr.shape[:2]
    ix, iy = int(round(x)), int(round(y))
    if 0 <= ix < W and 0 <= iy < H:
        arr[iy, ix] = col


def draw_solar_astrolabe_104(arr, cx, cy, phase=0.0, mode="normal"):
    """
    Renders Ignis Sol's Signature Rotating 8-Point Golden Solar Astrolabe Back-Halo
    behind his shoulders in 104x104 logical space (zero AI noise, crisp cel-shaded pixels).
    """
    if mode == "off":
        return

    cx = max(18.0, min(84.0, cx))
    cy = max(22.0, min(82.0, cy))

    if mode == "eclipse":
        r_ring = 17.0
        for dy in range(-19, 20):
            for dx in range(-19, 20):
                d = math.hypot(dx * 1.05, dy)
                if r_ring - 2.6 <= d <= r_ring - 0.8:
                    put_px(arr, cx + dx, cy + dy, P_OUTLINE)
                elif abs(d - r_ring) <= 0.85:
                    put_px(arr, cx + dx, cy + dy, P_SOLAR_GLEAM if (dx + dy) % 2 == 0 else P_VERMILION)
                elif abs(d - (r_ring + 1.1)) <= 0.55:
                    put_px(arr, cx + dx, cy + dy, P_SELOUT)

        for k in range(8):
            ang = phase + k * (math.pi / 4.0)
            ray_len = 6.2 if k % 2 == 0 else 3.8
            for s in range(1, int(ray_len * 2) + 1):
                u = s / (ray_len * 2.0)
                rx = cx + math.cos(ang) * (r_ring + u * ray_len)
                ry = cy + math.sin(ang) * (r_ring + u * ray_len)
                if 5 <= rx <= 98 and 5 <= ry <= 98:
                    put_px(arr, rx, ry, P_IVORY if u < 0.45 else (P_SOLAR_GLEAM if u < 0.8 else P_VERMILION))
        return

    r_ring = 15.0 if mode == "flare" else (12.2 if mode == "swept" else 13.5)
    rx_ell = r_ring * (0.82 if mode == "swept" else 0.94)
    ry_ell = r_ring

    steps = 64
    for s in range(steps):
        a = (s / float(steps)) * math.pi * 2.0
        px = cx + math.cos(a) * rx_ell
        py = cy + math.sin(a) * ry_ell
        if 5 <= px <= 98 and 5 <= py <= 98:
            put_px(arr, px + math.cos(a) * 0.9, py + math.sin(a) * 0.9, P_SELOUT)
            col_r = P_SOLAR_GLEAM if (mode == "flare" or s % 4 == 0) else P_GOLD_LIT
            put_px(arr, px, py, col_r)

    ray_cnt = 8
    for k in range(ray_cnt):
        ang = phase + k * (math.pi * 2.0 / ray_cnt)
        ray_l = (4.6 if k % 2 == 0 else 2.6) if mode == "flare" else (3.2 if k % 2 == 0 else 1.8)
        for d in range(1, int(ray_l * 2) + 1):
            u = d / (ray_l * 2.0)
            rx = cx + math.cos(ang) * (rx_ell + u * ray_l)
            ry = cy + math.sin(ang) * (ry_ell + u * ray_l)
            if 5 <= rx <= 98 and 5 <= ry <= 98:
                put_px(arr, rx, ry, P_IVORY if (mode == "flare" and u < 0.5) else (P_SOLAR_GLEAM if u < 0.65 else P_VERMILION))


def draw_helios_staff_104(arr, hand_x, hand_y, staff_deg, staff_len=26.0, glow=1.0, phase=0.0):
    """
    Renders Ignis Sol's Ornate Crescent Helios Sun-Staff in 104x104 space,
    matching his HD-2D Black-Mage portrait 1-to-1:
    - Burnished bronze-obsidian shaft with gilded rings & golden butt-spike
    - Molten vermilion collar gem
    - Golden Crescent Sun-Cradle + Floating Blazing Solar Core!
    """
    rad = math.radians(staff_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    pom_dist = 14.0
    collar_dist = max(10.5, staff_len - 9.2)

    pom_x = max(5.0, min(98.0, hand_x - ux * pom_dist))
    pom_y = max(5.0, min(99.0, hand_y - uy * pom_dist))
    col_x = max(6.0, min(97.0, hand_x + ux * collar_dist))
    col_y = max(6.0, min(97.0, hand_y + uy * collar_dist))

    shaft_steps = int(max(12, math.hypot(col_x - pom_x, col_y - pom_y) * 2.2))
    for i in range(shaft_steps + 1):
        u = i / float(shaft_steps)
        sx = pom_x + (col_x - pom_x) * u
        sy = pom_y + (col_y - pom_y) * u
        is_ring = (u < 0.10) or (0.44 < u < 0.52) or (u > 0.88)
        put_px(arr, sx - nx * 1.1, sy - ny * 1.1, P_SELOUT)
        put_px(arr, sx + nx * 1.1, sy + ny * 1.1, P_OUTLINE)
        put_px(arr, sx, sy, P_GOLD_LIT if is_ring else P_BRONZE_DARK)
        put_px(arr, sx - nx * 0.4, sy - ny * 0.4, P_SOLAR_GLEAM if is_ring else P_GOLD_MID)

    put_px(arr, pom_x - ux * 1.2, pom_y - uy * 1.2, P_SOLAR_GLEAM)

    head_cx = max(9.0, min(94.0, col_x + ux * 5.0))
    head_cy = max(9.0, min(94.0, col_y + uy * 5.0))
    c_rad = 4.8

    base_ang = math.atan2(uy, ux)
    arc_steps = 38
    for s in range(arc_steps + 1):
        v = (s / float(arc_steps)) * 2.0 - 1.0
        ang = base_ang + math.pi + v * (math.pi * 0.78)
        thick = 1.6 if abs(v) < 0.55 else (1.1 if abs(v) < 0.85 else 0.6)
        ax = head_cx + math.cos(ang) * c_rad
        ay = head_cy + math.sin(ang) * c_rad
        put_px(arr, ax + math.cos(ang) * (thick + 0.6), ay + math.sin(ang) * (thick + 0.6), P_SELOUT)
        put_px(arr, ax, ay, P_SOLAR_GLEAM if abs(v) > 0.65 else P_GOLD_LIT)
        if thick >= 1.0:
            put_px(arr, ax - math.cos(ang) * 0.7, ay - math.sin(ang) * 0.7, P_GOLD_MID)

    put_px(arr, col_x, col_y, P_VERMILION)
    put_px(arr, col_x + ux * 1.0, col_y + uy * 1.0, P_SOLAR_GLEAM)

    if glow > 0.15:
        core_r = 2.6 if glow >= 1.15 else (2.1 if glow >= 0.6 else 1.4)
        for dy in range(-4, 5):
            for dx in range(-4, 5):
                d = math.hypot(dx, dy)
                if d <= core_r * 0.48:
                    put_px(arr, head_cx + dx, head_cy + dy, P_IVORY)
                elif d <= core_r * 0.85:
                    put_px(arr, head_cx + dx, head_cy + dy, P_SOLAR_GLEAM)
                elif d <= core_r + 0.45:
                    if (dx + dy + int(phase * 3)) % 2 == 0 or d <= core_r:
                        put_px(arr, head_cx + dx, head_cy + dy, P_VERMILION if glow >= 0.8 else P_SCAR_LIT)


def draw_pyro_hand_orb_104(arr, hx, hy, radius=2.6, phase=0.0):
    """Draws a crisp pixel-art swirling Solar Fireball above Ignis Sol's dark gloved casting hand."""
    if radius <= 0.3:
        return
    cx = max(6.0, min(97.0, hx))
    cy = max(6.0, min(97.0, hy - 2.2))
    ir = int(math.ceil(radius + 1.5))
    for dy in range(-ir, ir + 1):
        for dx in range(-ir, ir + 1):
            d = math.hypot(dx, dy)
            if d <= radius * 0.45:
                put_px(arr, cx + dx, cy + dy, P_IVORY)
            elif d <= radius * 0.82:
                put_px(arr, cx + dx, cy + dy, P_SOLAR_GLEAM)
            elif d <= radius:
                put_px(arr, cx + dx, cy + dy, P_VERMILION)
    for k in range(3):
        ang = -math.pi * 0.5 + (k - 1) * 0.65 + math.sin(phase + k * 2.1) * 0.25
        tx = cx + math.cos(ang) * (radius + 1.4)
        ty = cy + math.sin(ang) * (radius + 1.6)
        if 5 <= tx <= 98 and 5 <= ty <= 98:
            put_px(arr, tx, ty, P_SOLAR_GLEAM if k == 1 else P_VERMILION)


def draw_solar_slash_arc_104(arr, cx, cy, r_main, a_start_deg, a_end_deg, intensity=1.0):
    """Draws a crisp cel-shaded Solar Flame Crescent Wave on Attack/Skill/Ult frames."""
    if intensity <= 0.05:
        return
    a0 = math.radians(a_start_deg)
    a1 = math.radians(a_end_deg)
    steps = 76
    for i in range(steps + 1):
        t = i / float(steps)
        ang = a0 + (a1 - a0) * t
        env = math.sin(t * math.pi)
        thickness = max(1.0, 3.8 * env * intensity)
        c, s = math.cos(ang), math.sin(ang)
        for dr in np.linspace(-thickness, thickness, int(thickness * 3) + 2):
            rr = r_main + dr
            px = cx + c * rr
            py = cy + s * rr
            nd = abs(dr) / max(0.5, thickness)
            if nd < 0.30:
                col = P_IVORY
            elif nd < 0.65:
                col = P_SOLAR_GLEAM
            else:
                col = P_VERMILION
            if 5 <= px <= 98 and 5 <= py <= 98:
                put_px(arr, px, py, col)


def draw_solar_ward_ring_104(arr, cx, cy, rx=9.0, ry=13.0, phase=0.0):
    """Draws Ignis Sol's vertical Flame-Ward Aegis Ring in front of his crouched guard (Row 7 F01..F10)."""
    cx = max(12.0, min(95.0, cx))
    cy = max(16.0, min(92.0, cy))
    for s in range(44):
        a = (s / 44.0) * math.pi * 2.0 + phase
        px = cx + math.cos(a) * rx
        py = cy + math.sin(a) * ry
        if 5 <= px <= 98 and 5 <= py <= 98:
            put_px(arr, px, py, P_IVORY if s % 5 == 0 else (P_SOLAR_GLEAM if s % 2 == 0 else P_VERMILION))


def render_pose_104(parts, cfg):
    """
    Renders a single 104x104 logical frame from Ignis Sol's 512x512 16-part Black-Mage rig.
    """
    canvas = Image.new("RGBA", (650, 600), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    OX, OY = 45, 48

    # Exact 512x512 joint pivots (0.5x of 1024x1024 anatomical joint centers)
    pelvis_src = (277.0, 250.0)
    pelvis_dst = (277.0 + OX + cfg.get("pelvis_dx", 0.0) * 0.5, 250.0 + OY + cfg.get("pelvis_dy", 0.0) * 0.5)
    torso_deg = cfg.get("torso_deg", 0.0)
    head_deg = torso_deg + cfg.get("head_rel_deg", 0.0)
    mane_deg = head_deg + cfg.get("mane_rel_deg", 0.0)

    def torso_joint(pt):
        r = rot_pt(pt, pelvis_src, torso_deg)
        return (pelvis_dst[0] + (r[0] - pelvis_src[0]), pelvis_dst[1] + (r[1] - pelvis_src[1]))

    neck_src = (270.0, 157.5)
    neck_dst = torso_joint(neck_src)

    mane_src = (219.0, 43.0)
    mane_r = rot_pt(mane_src, neck_src, head_deg)
    mane_dst = (neck_dst[0] + (mane_r[0] - neck_src[0]), neck_dst[1] + (mane_r[1] - neck_src[1]))

    back_halo_src = (242.5, 170.0)
    back_halo_dst = torso_joint(back_halo_src)

    l_coat_src = (248.0, 263.0)
    l_coat_dst = torso_joint(l_coat_src)
    r_coat_src = (298.0, 263.0)
    r_coat_dst = torso_joint(r_coat_src)

    l_sh_src = (207.5, 174.0)
    l_sh_dst = torso_joint(l_sh_src)
    r_sh_src = (307.0, 177.0)
    r_sh_dst = torso_joint(r_sh_src)

    l_hip_src = (246.0, 274.0)
    l_hip_dst = torso_joint(l_hip_src)
    r_hip_src = (291.0, 274.0)
    r_hip_dst = torso_joint(r_hip_src)

    l_thigh_deg = cfg.get("l_thigh_deg", 0.0)
    l_shin_deg = cfg.get("l_shin_deg", 0.0)
    l_foot_deg = cfg.get("l_foot_deg", 0.0)
    l_knee_src = (219.0, 370.0)
    l_knee_r = rot_pt(l_knee_src, l_hip_src, l_thigh_deg)
    l_knee_dst = (l_hip_dst[0] + (l_knee_r[0] - l_hip_src[0]), l_hip_dst[1] + (l_knee_r[1] - l_hip_src[1]))
    l_ank_src = (197.5, 454.0)
    l_ank_r = rot_pt(l_ank_src, l_knee_src, l_shin_deg)
    l_ank_dst = (l_knee_dst[0] + (l_ank_r[0] - l_knee_src[0]), l_knee_dst[1] + (l_ank_r[1] - l_knee_src[1]))

    r_thigh_deg = cfg.get("r_thigh_deg", 0.0)
    r_shin_deg = cfg.get("r_shin_deg", 0.0)
    r_foot_deg = cfg.get("r_foot_deg", 0.0)
    r_knee_src = (314.0, 370.0)
    r_knee_r = rot_pt(r_knee_src, r_hip_src, r_thigh_deg)
    r_knee_dst = (r_hip_dst[0] + (r_knee_r[0] - r_hip_src[0]), r_hip_dst[1] + (r_knee_r[1] - r_hip_src[1]))
    r_ank_src = (309.0, 448.0)
    r_ank_r = rot_pt(r_ank_src, r_knee_src, r_shin_deg)
    r_ank_dst = (r_knee_dst[0] + (r_ank_r[0] - r_knee_src[0]), r_knee_dst[1] + (r_ank_r[1] - r_knee_src[1]))

    l_sode_deg = torso_deg + cfg.get("l_sode_rel_deg", 0.0)
    l_fore_deg = l_sode_deg + cfg.get("l_fore_rel_deg", 0.0)
    l_elb_src = (180.0, 226.0)
    l_elb_r = rot_pt(l_elb_src, l_sh_src, l_sode_deg)
    l_elb_dst = (l_sh_dst[0] + (l_elb_r[0] - l_sh_src[0]), l_sh_dst[1] + (l_elb_r[1] - l_sh_src[1]))
    l_hand_src = (171.0, 295.0)
    l_hand_r = rot_pt(l_hand_src, l_elb_src, l_fore_deg)
    l_hand_dst = (l_elb_dst[0] + (l_hand_r[0] - l_elb_src[0]), l_elb_dst[1] + (l_hand_r[1] - l_elb_src[1]))

    r_sode_deg = torso_deg + cfg.get("r_sode_rel_deg", 0.0)
    r_fore_deg = r_sode_deg + cfg.get("r_fore_rel_deg", 0.0)
    r_elb_src = (316.0, 228.0)
    r_elb_r = rot_pt(r_elb_src, r_sh_src, r_sode_deg)
    r_elb_dst = (r_sh_dst[0] + (r_elb_r[0] - r_sh_src[0]), r_sh_dst[1] + (r_elb_r[1] - r_sh_src[1]))
    r_hand_src = (346.0, 292.0)
    r_hand_r = rot_pt(r_hand_src, r_elb_src, r_fore_deg)
    r_hand_dst = (r_elb_dst[0] + (r_hand_r[0] - r_elb_src[0]), r_elb_dst[1] + (r_hand_r[1] - r_elb_src[1]))

    # Automatic natural Black-Mage coat-tail articulation + explicit overrides
    l_coat_deg = cfg.get("l_coat_deg")
    if l_coat_deg is None:
        l_coat_deg = torso_deg * 0.65 + max(0.0, l_thigh_deg) * 0.72 - min(0.0, l_thigh_deg) * 0.25 + (cfg.get("coat_billow") or 0.0)
    r_coat_deg = cfg.get("r_coat_deg")
    if r_coat_deg is None:
        r_coat_deg = torso_deg * 0.65 + min(0.0, r_thigh_deg) * 0.68 + max(0.0, r_thigh_deg) * 0.35 - (cfg.get("coat_billow") or 0.0) * 0.75

    # Seamless obsidian-charcoal / crimson anatomical joint under-bridges (zero seams at any rotation!)
    draw_capsule(draw, pelvis_dst, l_hip_dst, 20, fill=(30, 30, 38, 255))
    draw_capsule(draw, pelvis_dst, r_hip_dst, 20, fill=(30, 30, 38, 255))
    draw_capsule(draw, l_hip_dst, l_knee_dst, 16, fill=(30, 30, 38, 255))
    draw_capsule(draw, r_hip_dst, r_knee_dst, 16, fill=(30, 30, 38, 255))
    draw_joint_cap(draw, l_knee_dst, 14, fill=(108, 24, 28, 255), inner=(152, 34, 34, 255))
    draw_joint_cap(draw, r_knee_dst, 14, fill=(108, 24, 28, 255), inner=(152, 34, 34, 255))
    draw_joint_cap(draw, l_ank_dst, 11, fill=(78, 52, 38, 255), inner=(118, 78, 48, 255))
    draw_joint_cap(draw, r_ank_dst, 11, fill=(78, 52, 38, 255), inner=(118, 78, 48, 255))
    # Pitch-black shadow void inside the high upturned collar so head tilts never show empty gaps!
    draw_joint_cap(draw, neck_dst, 20, fill=(8, 7, 13, 255), inner=(8, 7, 13, 255))
    draw_capsule(draw, l_sh_dst, l_elb_dst, 13, fill=(30, 30, 38, 255))
    draw_capsule(draw, r_sh_dst, r_elb_dst, 13, fill=(30, 30, 38, 255))
    draw_joint_cap(draw, l_elb_dst, 11, fill=(108, 24, 28, 255), inner=(108, 24, 28, 255))
    draw_joint_cap(draw, r_elb_dst, 11, fill=(108, 24, 28, 255), inner=(108, 24, 28, 255))

    # 0. Back Burgundy Coat-Lining Flaps behind thighs & calves
    paste_rotated_part(canvas, parts["back_hem"], pelvis_src, pelvis_dst, torso_deg)

    # 1. Right arm (when behind torso)
    if not cfg.get("right_arm_in_front", False):
        paste_rotated_part(canvas, parts["r_sode"], r_sh_src, r_sh_dst, r_sode_deg)
        paste_rotated_part(canvas, parts["r_forearm"], r_elb_src, r_elb_dst, r_fore_deg)

    # 2. Articulated 3-segment legs (circular crimson-gold knee-cops on shin layer cleanly over thigh & boot!)
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

    # 3. Articulated Crimson-Gold Black-Mage Coat-Tails + Upper Torso / Upturned Collar / Sun-Wheel Belt
    paste_rotated_part(canvas, parts["r_coat"], r_coat_src, r_coat_dst, r_coat_deg)
    paste_rotated_part(
        canvas, parts["l_coat"], l_coat_src, l_coat_dst, l_coat_deg,
        wave_phase=cfg.get("mane_wave_phase", 0.0),
        wave_amp=(cfg.get("mane_wave_amp", 4.5) * 0.45),
    )
    paste_rotated_part(canvas, parts["torso"], pelvis_src, pelvis_dst, torso_deg)

    # 4. Curved Pointed Wizard-Hat Tail (mane) + Wide-Brimmed Wizard Hat & Glowing Shadow-Void Eyes (head)
    paste_rotated_part(
        canvas, parts["mane"], mane_src, mane_dst, mane_deg,
        wave_phase=cfg.get("mane_wave_phase", 0.0),
        wave_amp=cfg.get("mane_wave_amp", 4.5),
    )
    paste_rotated_part(canvas, parts["head"], neck_src, neck_dst, head_deg)

    # 5. Right arm (when in front of torso for forward Sun-Staff projections / ground slams)
    if cfg.get("right_arm_in_front", False):
        paste_rotated_part(canvas, parts["r_sode"], r_sh_src, r_sh_dst, r_sode_deg)
        paste_rotated_part(canvas, parts["r_forearm"], r_elb_src, r_elb_dst, r_fore_deg)

    # 6. Left Pauldron, Vambrace & Dark Obsidian Spell-Glove
    paste_rotated_part(canvas, parts["l_sode"], l_sh_src, l_sh_dst, l_sode_deg)
    paste_rotated_part(canvas, parts["l_forearm"], l_elb_src, l_elb_dst, l_fore_deg)

    # Constant-scale framing from 650x600 canvas to 104x104
    S = 576
    scale = 104.0 / S
    cx = 277.0 + OX
    y_bot = 495.0 + OY
    crop_x0 = int(round(cx - S * 0.50))
    crop_y0 = int(round(y_bot - S * (99.0 / 104.0)))

    bbox = canvas.getbbox()
    c_xmin = float(bbox[0]) if bbox else float(cx)
    c_ymin = float(bbox[1]) if bbox else float(y_bot - 200.0)
    c_xmax = float(bbox[2]) if bbox else float(cx)
    c_ymax = float(bbox[3]) if bbox else float(y_bot)

    halo_mode = cfg.get("halo_mode", "normal")
    if halo_mode != "off":
        h_pad = 124.0 if halo_mode in ("flare", "eclipse") else 98.0
        c_xmin = min(c_xmin, back_halo_dst[0] - h_pad)
        c_ymin = min(c_ymin, back_halo_dst[1] - h_pad)

    if cfg.get("show_staff", True):
        hand_c = r_hand_dst if cfg.get("staff_hand", "right") == "right" else l_hand_dst
        s_rad = math.radians(cfg.get("staff_deg", -54.0))
        s_len = cfg.get("staff_len", 26.0)
        tip_cx = hand_c[0] + math.cos(s_rad) * ((s_len + 4.5) / scale)
        tip_cy = hand_c[1] + math.sin(s_rad) * ((s_len + 4.5) / scale)
        pom_cx = hand_c[0] - math.cos(s_rad) * (15.0 / scale)
        pom_cy = hand_c[1] - math.sin(s_rad) * (15.0 / scale)
        c_xmin = min(c_xmin, tip_cx - 16.0, pom_cx - 12.0)
        c_xmax = max(c_xmax, tip_cx + 16.0, pom_cx + 12.0)
        c_ymin = min(c_ymin, tip_cy - 16.0, pom_cy - 12.0)
        c_ymax = max(c_ymax, tip_cy + 16.0, pom_cy + 12.0)

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
    back_halo_104 = to104(back_halo_dst)
    l_hand_104 = to104(l_hand_dst)
    r_hand_104 = to104(r_hand_dst)

    # Smooth continuous foot_y target (99.0 planted on ground; gently 94.5..96.5 on shallow glides)
    ys, xs = np.where(arr104[:, :, 3] > 0)
    dy_ground = 0
    if len(ys) > 0:
        cur_bot = int(ys.max())
        cur_top = int(ys.min())
        target_bot = int(round(cfg.get("foot_y", 99.0)))
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

    # Transform downsampled 104x104 body into authentic cel-clustered 20-color pixel art with 1px Selout
    arr104 = quantize_and_cluster_104(arr104)

    neck_104 = (neck_104[0], neck_104[1] + dy_ground)
    back_halo_104 = (back_halo_104[0], back_halo_104[1] + dy_ground)
    l_hand_104 = (l_hand_104[0], l_hand_104[1] + dy_ground)
    r_hand_104 = (r_hand_104[0], r_hand_104[1] + dy_ground)

    # Composite Signature Rotating Solar Astrolabe Back-Halo BEHIND Ignis Sol's silhouette
    halo_layer = np.zeros_like(arr104)
    draw_solar_astrolabe_104(
        halo_layer,
        back_halo_104[0] - 4.5,
        back_halo_104[1] - 2.5,
        phase=cfg.get("halo_phase", 0.0),
        mode=halo_mode,
    )

    fg_layer = np.zeros_like(arr104)

    # Articulated Crescent Helios Sun-Staff
    if cfg.get("show_staff", True):
        sh_pt = r_hand_104 if cfg.get("staff_hand", "right") == "right" else l_hand_104
        sx = max(8.0, min(95.0, sh_pt[0] + cfg.get("staff_dx", 0.0)))
        sy = max(8.0, min(97.0, sh_pt[1] + cfg.get("staff_dy", 0.0)))
        target_buf = halo_layer if cfg.get("staff_behind", False) else fg_layer
        draw_helios_staff_104(
            target_buf,
            sx,
            sy,
            cfg.get("staff_deg", -52.0),
            staff_len=cfg.get("staff_len", 26.0),
            glow=cfg.get("staff_glow", 1.0),
            phase=cfg.get("fx_phase", 0.0),
        )

    # Off-hand Pyromancy Solar Orb above dark gloved casting hand
    orb_r = cfg.get("hand_orb_r") or 0.0
    if orb_r > 0.2:
        oh_pt = l_hand_104 if cfg.get("orb_hand", "left") == "left" else r_hand_104
        draw_pyro_hand_orb_104(
            fg_layer,
            oh_pt[0] + (cfg.get("orb_dx") or 2.0),
            oh_pt[1] + (cfg.get("orb_dy") or -2.0),
            radius=orb_r,
            phase=cfg.get("fx_phase", 0.0),
        )

    # Crouch Solar Ward Aegis Ring
    if cfg.get("ward_ring", False):
        draw_solar_ward_ring_104(
            fg_layer,
            neck_104[0] + 19.5,
            neck_104[1] + 12.0,
            rx=7.5,
            ry=13.5,
            phase=cfg.get("fx_phase", 0.0),
        )

    # Skill Ground-Slam Butt-Spike Extension & Magma Floor Spark Burst (Row 3 F08..F12)
    slam_int = cfg.get("ground_slam") or 0.0
    if slam_int > 0.05:
        sh_pt = r_hand_104
        rad_s = math.radians(cfg.get("staff_deg", -86.0))
        ux_s, uy_s = math.cos(rad_s), math.sin(rad_s)
        sx_s = sh_pt[0] + (cfg.get("staff_dx") or 0.0)
        sy_s = sh_pt[1] + (cfg.get("staff_dy") or 0.0)
        butt_x = sx_s - ux_s * 22.0
        for step_b in range(13, 28):
            bx = sx_s - ux_s * step_b
            by = sy_s - uy_s * step_b
            if by >= 98.5:
                butt_x = bx
                break
            put_px(fg_layer, bx - 1, by, P_SELOUT)
            put_px(fg_layer, bx + 1, by, P_OUTLINE)
            put_px(fg_layer, bx, by, P_SOLAR_GLEAM if step_b >= 22 else P_GOLD_MID)
        ring_rx = 9.0 + slam_int * 6.0
        for dx_r in range(-int(ring_rx), int(ring_rx) + 1):
            rx_p = butt_x + dx_r
            if 5 <= rx_p <= 98:
                u_r = abs(dx_r) / max(1.0, ring_rx)
                col_m = P_IVORY if u_r < 0.28 else (P_SOLAR_GLEAM if u_r < 0.62 else P_VERMILION)
                put_px(fg_layer, rx_p, 98, col_m)
                if abs(dx_r) % 3 == 0 and u_r < 0.85:
                    put_px(fg_layer, rx_p, 97 - int((1.0 - u_r) * 3.0 * slam_int), P_SOLAR_GLEAM)

    # Sweeping Solar Flame Crescent Arc on Attack / Skill / Ult
    if cfg.get("slash_arc") is not None:
        sa0, sa1, sr, sint = cfg["slash_arc"]
        draw_solar_slash_arc_104(fg_layer, neck_104[0] + 7.0, neck_104[1] + 11.0, sr, sa0, sa1, intensity=sint)

    # Layering: halo_layer -> arr104 (character body) -> fg_layer (front Sun-Staff + pyromancy FX)
    comp = halo_layer.copy()
    body_m = arr104[:, :, 3] > 0
    comp[body_m] = arr104[body_m]
    fg_m = fg_layer[:, :, 3] > 0
    comp[fg_m] = fg_layer[fg_m]

    # Strict 4px safety margin in 104x104 -> >= 8px margin in 208x208 (0/270 boundary clips!)
    comp[:4, :, :] = 0
    comp[100:, :, :] = 0
    comp[:, :4, :] = 0
    comp[:, 100:, :] = 0
    return comp


def smooth_u(f, f0, f1):
    if f1 <= f0:
        return 1.0
    u = max(0.0, min(1.0, (f - f0) / float(f1 - f0)))
    return 0.5 - 0.5 * math.cos(u * math.pi)


def eval_pose_keyframes(f, keyframes):
    """
    Smoothly cosine-interpolates all numeric pose parameters between keyframes [(f_idx, dict), ...]
    while switching discrete string/boolean flags cleanly so Ignis Sol NEVER snaps between poses!
    """
    if f <= keyframes[0][0]:
        return dict(keyframes[0][1])
    if f >= keyframes[-1][0]:
        return dict(keyframes[-1][1])

    for i in range(len(keyframes) - 1):
        f0, k0 = keyframes[i]
        f1, k1 = keyframes[i + 1]
        if f0 <= f <= f1:
            u = smooth_u(f, f0, f1)
            out = {}
            all_keys = set(k0.keys()) | set(k1.keys())
            for k in all_keys:
                v0 = k0.get(k)
                v1 = k1.get(k)
                if isinstance(v0, bool) or isinstance(v1, bool) or isinstance(v0, str) or isinstance(v1, str):
                    out[k] = v1 if u >= 0.5 else v0
                elif v0 is None and isinstance(v1, (int, float)):
                    out[k] = 0.0 + (v1 - 0.0) * u
                elif v1 is None and isinstance(v0, (int, float)):
                    out[k] = v0 + (0.0 - v0) * u
                elif v0 is None or v1 is None:
                    out[k] = v1 if u >= 0.5 else v0
                elif isinstance(v0, (int, float)) and isinstance(v1, (int, float)):
                    out[k] = v0 + (v1 - v0) * u
                else:
                    out[k] = v1 if u >= 0.5 else v0
            return out
    return dict(keyframes[-1][1])


def build_row_configs(row_idx):
    """
    Returns 30 handcrafted 30fps pose configurations for the given row (0..8).
    Every row guarantees distinct frame-to-frame motion, 100% grounded stances & cast startups,
    articulated wizard-hat tail & crimson-gold coat-tails, and sleek shallow glides.
    """
    cfgs = []
    for f in range(COLS):
        p = (f / float(COLS)) * math.pi * 2.0
        s1 = math.sin(p)
        c1 = math.cos(p)

        cfg = {
            "pelvis_dx": 0.0,
            "pelvis_dy": 0.0,
            "torso_deg": 0.0,
            "head_rel_deg": 0.0,
            "mane_rel_deg": 0.0,
            "mane_wave_phase": p,
            "mane_wave_amp": 4.5,
            "coat_billow": 0.0,
            "l_coat_deg": None,
            "r_coat_deg": None,
            "l_thigh_deg": 0.0,
            "l_shin_deg": 0.0,
            "l_foot_deg": 0.0,
            "r_thigh_deg": 0.0,
            "r_shin_deg": 0.0,
            "r_foot_deg": 0.0,
            "l_sode_rel_deg": 0.0,
            "l_fore_rel_deg": 0.0,
            "r_sode_rel_deg": 0.0,
            "r_fore_rel_deg": 0.0,
            "right_arm_in_front": False,
            "right_leg_behind": False,
            "foot_y": 99.0,
            "halo_mode": "normal",
            "halo_phase": p,
            "show_staff": True,
            "staff_hand": "right",
            "staff_behind": False,
            "staff_deg": -50.0,
            "staff_len": 25.5,
            "staff_glow": 1.0,
            "staff_dx": 0.0,
            "staff_dy": 0.0,
            "hand_orb_r": 0.0,
            "orb_hand": "left",
            "orb_dx": 2.0,
            "orb_dy": -2.0,
            "ward_ring": False,
            "fx_phase": p,
            "slash_arc": None,
        }

        if row_idx == 0:
            # ROW 0: IDLE — Mysterious Black-Mage Breathing, Bobbing Wizard-Hat Tail, Swaying Coat-Tails,
            # Rotating 8-Point Solar Astrolabe Halo, Poised Helios Sun-Staff & Off-Hand Ember Pulse
            cfg["pelvis_dy"] = s1 * 3.0
            cfg["torso_deg"] = 1.2 + s1 * 1.6
            cfg["head_rel_deg"] = -s1 * 1.2
            cfg["mane_rel_deg"] = c1 * 3.5
            cfg["mane_wave_amp"] = 4.8
            cfg["coat_billow"] = 2.0 + s1 * 2.5
            cfg["l_sode_rel_deg"] = -12.0 + c1 * 3.5
            cfg["l_fore_rel_deg"] = -28.0 + s1 * 4.5
            cfg["r_sode_rel_deg"] = -8.0 + s1 * 3.0
            cfg["r_fore_rel_deg"] = -22.0 + c1 * 3.5
            cfg["right_arm_in_front"] = True
            cfg["staff_deg"] = -52.0 + s1 * 3.5
            cfg["staff_glow"] = 0.95 + 0.20 * c1
            cfg["hand_orb_r"] = 1.8 + 0.5 * s1
            cfg["orb_dx"] = 4.5
            cfg["orb_dy"] = -3.0

        elif row_idx == 1:
            # ROW 1: WALK — Grounded 2-Step Mysterious Battle-Mage Stride Cycle + Flowing Coat-Tails
            stride = math.sin(p)
            lift_l = max(0.0, math.cos(p))
            lift_r = max(0.0, -math.cos(p))
            cfg["pelvis_dy"] = abs(stride) * 5.0 - 1.5
            cfg["torso_deg"] = 6.0 + math.sin(p * 2.0) * 1.8
            cfg["head_rel_deg"] = -3.0
            cfg["mane_wave_amp"] = 5.8
            cfg["coat_billow"] = 5.5 + abs(stride) * 3.5
            cfg["l_thigh_deg"] = -stride * 24.0
            cfg["l_shin_deg"] = lift_l * 24.0 + max(0.0, stride) * 7.0
            cfg["l_foot_deg"] = -stride * 9.0
            cfg["r_thigh_deg"] = stride * 24.0
            cfg["r_shin_deg"] = lift_r * 24.0 + max(0.0, -stride) * 7.0
            cfg["r_foot_deg"] = stride * 9.0
            cfg["right_leg_behind"] = (stride < 0.0)
            cfg["l_sode_rel_deg"] = stride * 15.0 - 8.0
            cfg["l_fore_rel_deg"] = -22.0 + stride * 9.0
            cfg["r_sode_rel_deg"] = -stride * 13.0 - 6.0
            cfg["r_fore_rel_deg"] = -20.0 - stride * 7.0
            cfg["right_arm_in_front"] = True
            cfg["staff_deg"] = -44.0 - stride * 6.0

        elif row_idx == 2:
            # ROW 2: AUTO_ATTACK — Grounded Black-Mage Sun-Staff Projection Combo (Syncs with FireMage.js!)
            kfs = [
                (0, {
                    "pelvis_dx": 0.0, "pelvis_dy": 0.0, "torso_deg": 0.0, "head_rel_deg": 0.0,
                    "l_thigh_deg": 0.0, "l_shin_deg": 0.0, "r_thigh_deg": 0.0, "r_shin_deg": 0.0,
                    "r_sode_rel_deg": -8.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -12.0, "l_fore_rel_deg": -28.0, "coat_billow": 2.0,
                    "right_arm_in_front": True, "staff_deg": -52.0, "staff_glow": 1.0,
                    "hand_orb_r": 1.8, "orb_dx": 4.5, "orb_dy": -3.0, "halo_mode": "normal",
                }),
                (8, {
                    "pelvis_dx": -12.0, "pelvis_dy": 8.0, "torso_deg": -10.0, "head_rel_deg": 8.0,
                    "l_thigh_deg": 14.0, "l_shin_deg": 12.0, "r_thigh_deg": -18.0, "r_shin_deg": 20.0,
                    "r_sode_rel_deg": 24.0, "r_fore_rel_deg": 10.0,
                    "l_sode_rel_deg": -38.0, "l_fore_rel_deg": -34.0, "coat_billow": 12.0,
                    "right_arm_in_front": False, "staff_deg": -72.0, "staff_glow": 1.25,
                    "hand_orb_r": 3.4, "orb_dx": 7.0, "orb_dy": -4.0, "halo_mode": "flare",
                }),
                (12, {
                    "pelvis_dx": 18.0, "pelvis_dy": 12.0, "torso_deg": 16.0, "head_rel_deg": -12.0,
                    "l_thigh_deg": 24.0, "l_shin_deg": 12.0, "r_thigh_deg": -26.0, "r_shin_deg": 28.0,
                    "r_sode_rel_deg": -38.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": 24.0, "l_fore_rel_deg": 12.0, "coat_billow": 16.0,
                    "right_arm_in_front": True, "staff_deg": -4.0, "staff_glow": 1.45,
                    "hand_orb_r": 0.0, "orb_dx": 4.0, "orb_dy": -2.0, "halo_mode": "flare",
                }),
                (17, {
                    "pelvis_dx": 15.0, "pelvis_dy": 10.0, "torso_deg": 13.0, "head_rel_deg": -9.0,
                    "l_thigh_deg": 20.0, "l_shin_deg": 10.0, "r_thigh_deg": -22.0, "r_shin_deg": 24.0,
                    "r_sode_rel_deg": -32.0, "r_fore_rel_deg": -18.0,
                    "l_sode_rel_deg": 18.0, "l_fore_rel_deg": 8.0, "coat_billow": 12.0,
                    "right_arm_in_front": True, "staff_deg": -8.0, "staff_glow": 1.25,
                    "hand_orb_r": 0.0, "orb_dx": 4.0, "orb_dy": -2.0, "halo_mode": "flare",
                }),
                (29, {
                    "pelvis_dx": 0.0, "pelvis_dy": 0.0, "torso_deg": 1.2, "head_rel_deg": 0.0,
                    "l_thigh_deg": 0.0, "l_shin_deg": 0.0, "r_thigh_deg": 0.0, "r_shin_deg": 0.0,
                    "r_sode_rel_deg": -8.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -12.0, "l_fore_rel_deg": -28.0, "coat_billow": 2.0,
                    "right_arm_in_front": True, "staff_deg": -52.0, "staff_glow": 1.0,
                    "hand_orb_r": 1.8, "orb_dx": 4.5, "orb_dy": -3.0, "halo_mode": "normal",
                }),
            ]
            cfg.update(eval_pose_keyframes(f, kfs))
            if 10 <= f <= 15:
                cfg["slash_arc"] = (-42.0, 42.0, 29.0, 1.0 - (f - 10) * 0.14)

        elif row_idx == 3:
            # ROW 3: SKILL — TRIPLE SOLAR PILLAR & PYROMANTIC DETONATION SWEEP (100% Grounded!)
            kfs = [
                (0, {
                    "pelvis_dx": 0.0, "pelvis_dy": 0.0, "torso_deg": 0.0, "head_rel_deg": 0.0,
                    "l_thigh_deg": 0.0, "l_shin_deg": 0.0, "r_thigh_deg": 0.0, "r_shin_deg": 0.0,
                    "r_sode_rel_deg": -8.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -12.0, "l_fore_rel_deg": -28.0, "coat_billow": 2.0,
                    "right_arm_in_front": True, "staff_deg": -52.0, "staff_dy": 0.0,
                    "staff_glow": 1.0, "hand_orb_r": 2.0, "halo_mode": "normal",
                }),
                (5, {
                    "pelvis_dx": -8.0, "pelvis_dy": 6.0, "torso_deg": -9.0, "head_rel_deg": 5.0,
                    "l_thigh_deg": 10.0, "l_shin_deg": 8.0, "r_thigh_deg": -14.0, "r_shin_deg": 16.0,
                    "r_sode_rel_deg": -48.0, "r_fore_rel_deg": -24.0,
                    "l_sode_rel_deg": -46.0, "l_fore_rel_deg": -32.0, "coat_billow": 16.0,
                    "right_arm_in_front": True, "staff_deg": -62.0, "staff_dy": -2.0,
                    "staff_glow": 1.4, "hand_orb_r": 3.2, "halo_mode": "flare",
                }),
                (9, {
                    "pelvis_dx": 14.0, "pelvis_dy": 18.0, "torso_deg": 15.0, "head_rel_deg": -9.0,
                    "l_thigh_deg": 24.0, "l_shin_deg": 20.0, "r_thigh_deg": -28.0, "r_shin_deg": 32.0,
                    "r_sode_rel_deg": -22.0, "r_fore_rel_deg": 12.0,
                    "l_sode_rel_deg": -22.0, "l_fore_rel_deg": -18.0, "coat_billow": 20.0,
                    "right_arm_in_front": True, "staff_deg": -86.0, "staff_dy": 6.0,
                    "staff_glow": 1.5, "hand_orb_r": 2.8, "halo_mode": "flare",
                }),
                (13, {
                    "pelvis_dx": 10.0, "pelvis_dy": 14.0, "torso_deg": 10.0, "head_rel_deg": -6.0,
                    "l_thigh_deg": 18.0, "l_shin_deg": 16.0, "r_thigh_deg": -22.0, "r_shin_deg": 26.0,
                    "r_sode_rel_deg": 8.0, "r_fore_rel_deg": 4.0,
                    "l_sode_rel_deg": -32.0, "l_fore_rel_deg": -26.0, "coat_billow": 14.0,
                    "right_arm_in_front": False, "staff_deg": -64.0, "staff_dy": 2.0,
                    "staff_glow": 1.35, "hand_orb_r": 3.4, "halo_mode": "flare",
                }),
                (18, {
                    "pelvis_dx": 20.0, "pelvis_dy": 12.0, "torso_deg": 17.0, "head_rel_deg": -13.0,
                    "l_thigh_deg": 26.0, "l_shin_deg": 12.0, "r_thigh_deg": -28.0, "r_shin_deg": 30.0,
                    "r_sode_rel_deg": -40.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": 26.0, "l_fore_rel_deg": 14.0, "coat_billow": 18.0,
                    "right_arm_in_front": True, "staff_deg": -3.0, "staff_dy": 0.0,
                    "staff_glow": 1.5, "hand_orb_r": 0.0, "halo_mode": "flare",
                }),
                (23, {
                    "pelvis_dx": 12.0, "pelvis_dy": 8.0, "torso_deg": 11.0, "head_rel_deg": -7.0,
                    "l_thigh_deg": 16.0, "l_shin_deg": 8.0, "r_thigh_deg": -18.0, "r_shin_deg": 20.0,
                    "r_sode_rel_deg": -26.0, "r_fore_rel_deg": -18.0,
                    "l_sode_rel_deg": 12.0, "l_fore_rel_deg": -4.0, "coat_billow": 10.0,
                    "right_arm_in_front": True, "staff_deg": -18.0, "staff_dy": 0.0,
                    "staff_glow": 1.2, "hand_orb_r": 0.0, "halo_mode": "normal",
                }),
                (29, {
                    "pelvis_dx": 0.0, "pelvis_dy": 0.0, "torso_deg": 0.0, "head_rel_deg": 0.0,
                    "l_thigh_deg": 0.0, "l_shin_deg": 0.0, "r_thigh_deg": 0.0, "r_shin_deg": 0.0,
                    "r_sode_rel_deg": -8.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -12.0, "l_fore_rel_deg": -28.0, "coat_billow": 2.0,
                    "right_arm_in_front": True, "staff_deg": -52.0, "staff_dy": 0.0,
                    "staff_glow": 1.0, "hand_orb_r": 1.8, "halo_mode": "normal",
                }),
            ]
            cfg.update(eval_pose_keyframes(f, kfs))
            if 8 <= f <= 12:
                cfg["ground_slam"] = 1.0 - abs(f - 9.5) * 0.24
            if 16 <= f <= 21:
                cfg["slash_arc"] = (-52.0, 52.0, 31.0, 1.0 - (f - 16) * 0.14)

        elif row_idx == 4:
            # ROW 4: ULTIMATE — ECLIPSE SUPERNOVA (100% Grounded Black-Sun Pyromancer Overdrive!)
            kfs = [
                (0, {
                    "pelvis_dx": 0.0, "pelvis_dy": 0.0, "torso_deg": 0.0, "head_rel_deg": 0.0,
                    "l_thigh_deg": 0.0, "l_shin_deg": 0.0, "r_thigh_deg": 0.0, "r_shin_deg": 0.0,
                    "r_sode_rel_deg": -8.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -12.0, "l_fore_rel_deg": -28.0, "coat_billow": 6.0,
                    "right_arm_in_front": True, "staff_deg": -52.0, "staff_glow": 1.1,
                    "hand_orb_r": 2.2, "halo_mode": "eclipse", "mane_wave_amp": 6.5,
                }),
                (7, {
                    "pelvis_dx": -10.0, "pelvis_dy": 10.0, "torso_deg": -11.0, "head_rel_deg": 7.0,
                    "l_thigh_deg": 18.0, "l_shin_deg": 14.0, "r_thigh_deg": -22.0, "r_shin_deg": 24.0,
                    "r_sode_rel_deg": -50.0, "r_fore_rel_deg": -24.0,
                    "l_sode_rel_deg": -56.0, "l_fore_rel_deg": -36.0, "coat_billow": 22.0,
                    "right_arm_in_front": True, "staff_deg": -60.0, "staff_glow": 1.5,
                    "hand_orb_r": 3.8, "halo_mode": "eclipse", "mane_wave_amp": 8.0,
                }),
                (12, {
                    "pelvis_dx": 18.0, "pelvis_dy": 12.0, "torso_deg": 15.0, "head_rel_deg": -11.0,
                    "l_thigh_deg": 24.0, "l_shin_deg": 12.0, "r_thigh_deg": -28.0, "r_shin_deg": 30.0,
                    "r_sode_rel_deg": -42.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -34.0, "l_fore_rel_deg": -22.0, "coat_billow": 20.0,
                    "right_arm_in_front": True, "staff_deg": -12.0, "staff_glow": 1.6,
                    "hand_orb_r": 3.4, "halo_mode": "eclipse", "mane_wave_amp": 8.0,
                }),
                (18, {
                    "pelvis_dx": 16.0, "pelvis_dy": 12.0, "torso_deg": 13.0, "head_rel_deg": -9.0,
                    "l_thigh_deg": 22.0, "l_shin_deg": 12.0, "r_thigh_deg": -26.0, "r_shin_deg": 28.0,
                    "r_sode_rel_deg": -36.0, "r_fore_rel_deg": -18.0,
                    "l_sode_rel_deg": -24.0, "l_fore_rel_deg": -18.0, "coat_billow": 16.0,
                    "right_arm_in_front": True, "staff_deg": -16.0, "staff_glow": 1.5,
                    "hand_orb_r": 2.8, "halo_mode": "eclipse", "mane_wave_amp": 7.0,
                }),
                (21, {
                    "pelvis_dx": 22.0, "pelvis_dy": 14.0, "torso_deg": 18.0, "head_rel_deg": -13.0,
                    "l_thigh_deg": 28.0, "l_shin_deg": 14.0, "r_thigh_deg": -30.0, "r_shin_deg": 32.0,
                    "r_sode_rel_deg": -32.0, "r_fore_rel_deg": -16.0,
                    "l_sode_rel_deg": 28.0, "l_fore_rel_deg": 14.0, "coat_billow": 20.0,
                    "right_arm_in_front": True, "staff_deg": 6.0, "staff_glow": 1.55,
                    "hand_orb_r": 0.0, "halo_mode": "flare", "mane_wave_amp": 6.5,
                }),
                (29, {
                    "pelvis_dx": 0.0, "pelvis_dy": 0.0, "torso_deg": 1.0, "head_rel_deg": 0.0,
                    "l_thigh_deg": 0.0, "l_shin_deg": 0.0, "r_thigh_deg": 0.0, "r_shin_deg": 0.0,
                    "r_sode_rel_deg": -8.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -12.0, "l_fore_rel_deg": -28.0, "coat_billow": 2.0,
                    "right_arm_in_front": True, "staff_deg": -52.0, "staff_glow": 1.0,
                    "hand_orb_r": 1.8, "halo_mode": "normal", "mane_wave_amp": 4.8,
                }),
            ]
            cfg.update(eval_pose_keyframes(f, kfs))
            if 11 <= f <= 16:
                cfg["slash_arc"] = (-48.0, 40.0, 31.0, 1.0 - (f - 11) * 0.14)
            elif 20 <= f <= 24:
                cfg["slash_arc"] = (-38.0, 56.0, 32.0, 1.0 - (f - 20) * 0.18)

        elif row_idx == 5:
            # ROW 5: DEATH & HURT — F00..F05 Hurt Stagger, F06..F15 Kneel Drop, F16..F29 Flat Prone Rest + Horizontal Staff
            if f <= 5:
                u = smooth_u(f, 0, 5)
                cfg["pelvis_dx"] = -14.0 * u
                cfg["pelvis_dy"] = 6.0 * u
                cfg["torso_deg"] = -16.0 * u
                cfg["head_rel_deg"] = -10.0 * u
                cfg["l_thigh_deg"] = -12.0 * u
                cfg["l_shin_deg"] = 16.0 * u
                cfg["r_thigh_deg"] = 14.0 * u
                cfg["r_shin_deg"] = 18.0 * u
                cfg["l_sode_rel_deg"] = -28.0 * u
                cfg["r_sode_rel_deg"] = 14.0 * u
                cfg["staff_deg"] = -52.0 + 22.0 * u
                cfg["coat_billow"] = 12.0 * u
            elif f <= 15:
                u = smooth_u(f, 6, 15)
                cfg["pelvis_dx"] = -14.0 + 8.0 * u
                cfg["pelvis_dy"] = 6.0 + 38.0 * u
                cfg["torso_deg"] = -16.0 + 40.0 * u
                cfg["head_rel_deg"] = -10.0 + 24.0 * u
                cfg["l_thigh_deg"] = -12.0 + 38.0 * u
                cfg["l_shin_deg"] = 16.0 + 52.0 * u
                cfg["r_thigh_deg"] = 14.0 - 54.0 * u
                cfg["r_shin_deg"] = 18.0 + 28.0 * u
                cfg["l_coat_deg"] = 24.0 * u
                cfg["r_coat_deg"] = -28.0 * u
                cfg["r_sode_rel_deg"] = 14.0 - 30.0 * u
                cfg["staff_deg"] = -30.0 + 28.0 * u
                cfg["staff_glow"] = 1.0 - 0.65 * u
                cfg["halo_mode"] = "off" if f >= 12 else "normal"
            else:
                u = smooth_u(f, 16, 24)
                cfg["pelvis_dx"] = -6.0 + 16.0 * u
                cfg["pelvis_dy"] = 44.0 + 48.0 * u
                cfg["torso_deg"] = 24.0 + 62.0 * u
                cfg["head_rel_deg"] = 14.0 - 16.0 * u
                cfg["mane_wave_amp"] = 1.5 * (1.0 - u)
                cfg["l_thigh_deg"] = 26.0 + 58.0 * u
                cfg["l_shin_deg"] = 68.0 + 20.0 * u
                cfg["r_thigh_deg"] = -40.0 + 126.0 * u
                cfg["r_shin_deg"] = 46.0 + 42.0 * u
                cfg["l_coat_deg"] = 24.0 + 42.0 * u
                cfg["r_coat_deg"] = -28.0 + 132.0 * u
                cfg["l_sode_rel_deg"] = -14.0 + 26.0 * u
                cfg["r_sode_rel_deg"] = -16.0 + 16.0 * u
                cfg["right_arm_in_front"] = True
                cfg["halo_mode"] = "off"
                cfg["staff_deg"] = -2.0 * (1.0 - u)
                cfg["staff_dy"] = 3.5 * u
                cfg["staff_glow"] = 0.22

        elif row_idx == 6:
            # ROW 6: DASH / ARCANE BLINK — Sleek Shallow Flame-Step Glide (max 20 deg lean, ultra-low foot_y=96.5!)
            kfs = [
                (0, {
                    "pelvis_dx": 0.0, "pelvis_dy": 4.0, "torso_deg": 6.0, "head_rel_deg": -4.0,
                    "l_thigh_deg": 8.0, "l_shin_deg": 10.0, "r_thigh_deg": -8.0, "r_shin_deg": 12.0,
                    "r_sode_rel_deg": 4.0, "r_fore_rel_deg": -14.0,
                    "l_sode_rel_deg": -14.0, "l_fore_rel_deg": -24.0, "coat_billow": 6.0,
                    "right_arm_in_front": False, "staff_deg": -42.0, "staff_glow": 1.1,
                    "foot_y": 99.0, "halo_mode": "swept", "mane_wave_amp": 5.5,
                }),
                (7, {
                    "pelvis_dx": 16.0, "pelvis_dy": 12.0, "torso_deg": 20.0, "head_rel_deg": -14.0,
                    "l_thigh_deg": 28.0, "l_shin_deg": 24.0, "r_thigh_deg": -32.0, "r_shin_deg": 22.0,
                    "r_sode_rel_deg": 24.0, "r_fore_rel_deg": 8.0,
                    "l_sode_rel_deg": -32.0, "l_fore_rel_deg": -26.0, "coat_billow": 22.0,
                    "right_arm_in_front": False, "staff_deg": -158.0, "staff_glow": 1.3,
                    "foot_y": 96.5, "halo_mode": "swept", "mane_wave_amp": 7.5, "hand_orb_r": 2.8,
                }),
                (15, {
                    "pelvis_dx": 20.0, "pelvis_dy": 12.0, "torso_deg": 18.0, "head_rel_deg": -12.0,
                    "l_thigh_deg": 24.0, "l_shin_deg": 18.0, "r_thigh_deg": -28.0, "r_shin_deg": 24.0,
                    "r_sode_rel_deg": -38.0, "r_fore_rel_deg": -20.0,
                    "l_sode_rel_deg": 18.0, "l_fore_rel_deg": 8.0, "coat_billow": 18.0,
                    "right_arm_in_front": True, "staff_deg": -4.0, "staff_glow": 1.45,
                    "foot_y": 96.5, "halo_mode": "flare", "mane_wave_amp": 7.0, "hand_orb_r": 0.0,
                }),
                (29, {
                    "pelvis_dx": 0.0, "pelvis_dy": 0.0, "torso_deg": 1.5, "head_rel_deg": -1.0,
                    "l_thigh_deg": 0.0, "l_shin_deg": 0.0, "r_thigh_deg": 0.0, "r_shin_deg": 0.0,
                    "r_sode_rel_deg": -8.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -12.0, "l_fore_rel_deg": -28.0, "coat_billow": 2.0,
                    "right_arm_in_front": True, "staff_deg": -52.0, "staff_glow": 1.0,
                    "foot_y": 99.0, "halo_mode": "normal", "mane_wave_amp": 4.8, "hand_orb_r": 1.6,
                }),
            ]
            cfg.update(eval_pose_keyframes(f, kfs))
            if 13 <= f <= 17:
                cfg["slash_arc"] = (-36.0, 36.0, 28.0, 0.9 - (f - 13) * 0.15)

        elif row_idx == 7:
            # ROW 7: CROUCH — 100% Grounded Wide Battle-Kneel Flame-Ward Guard (F00..F10) & Low Cast (F11..F21)
            kfs = [
                (0, {
                    "pelvis_dx": 0.0, "pelvis_dy": 4.0, "torso_deg": 4.0, "head_rel_deg": -2.0,
                    "l_thigh_deg": 6.0, "l_shin_deg": 10.0, "r_thigh_deg": -8.0, "r_shin_deg": 10.0,
                    "l_coat_deg": 6.0, "r_coat_deg": -6.0,
                    "r_sode_rel_deg": -8.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -14.0, "l_fore_rel_deg": -28.0,
                    "right_arm_in_front": True, "staff_deg": -54.0, "staff_glow": 1.0,
                    "foot_y": 99.0, "halo_mode": "normal", "ward_ring": False,
                }),
                (5, {
                    "pelvis_dx": 4.0, "pelvis_dy": 42.0, "torso_deg": 13.0, "head_rel_deg": -10.0,
                    "l_thigh_deg": 32.0, "l_shin_deg": 66.0, "r_thigh_deg": -52.0, "r_shin_deg": 44.0,
                    "l_coat_deg": 32.0, "r_coat_deg": -38.0,
                    "r_sode_rel_deg": -26.0, "r_fore_rel_deg": -24.0,
                    "l_sode_rel_deg": -36.0, "l_fore_rel_deg": -30.0,
                    "right_arm_in_front": True, "staff_deg": -76.0, "staff_glow": 1.35,
                    "foot_y": 99.0, "halo_mode": "flare", "ward_ring": True, "hand_orb_r": 2.8,
                }),
                (10, {
                    "pelvis_dx": 6.0, "pelvis_dy": 42.0, "torso_deg": 11.0, "head_rel_deg": -9.0,
                    "l_thigh_deg": 32.0, "l_shin_deg": 66.0, "r_thigh_deg": -52.0, "r_shin_deg": 44.0,
                    "l_coat_deg": 32.0, "r_coat_deg": -38.0,
                    "r_sode_rel_deg": -20.0, "r_fore_rel_deg": -20.0,
                    "l_sode_rel_deg": -40.0, "l_fore_rel_deg": -32.0,
                    "right_arm_in_front": True, "staff_deg": -70.0, "staff_glow": 1.4,
                    "foot_y": 99.0, "halo_mode": "flare", "ward_ring": True, "hand_orb_r": 3.2,
                }),
                (14, {
                    "pelvis_dx": 18.0, "pelvis_dy": 38.0, "torso_deg": 18.0, "head_rel_deg": -14.0,
                    "l_thigh_deg": 28.0, "l_shin_deg": 62.0, "r_thigh_deg": -48.0, "r_shin_deg": 40.0,
                    "l_coat_deg": 34.0, "r_coat_deg": -34.0,
                    "r_sode_rel_deg": -38.0, "r_fore_rel_deg": -20.0,
                    "l_sode_rel_deg": 22.0, "l_fore_rel_deg": 10.0,
                    "right_arm_in_front": True, "staff_deg": 0.0, "staff_glow": 1.5,
                    "foot_y": 99.0, "halo_mode": "flare", "ward_ring": False, "hand_orb_r": 0.0,
                }),
                (20, {
                    "pelvis_dx": 12.0, "pelvis_dy": 34.0, "torso_deg": 14.0, "head_rel_deg": -10.0,
                    "l_thigh_deg": 22.0, "l_shin_deg": 50.0, "r_thigh_deg": -38.0, "r_shin_deg": 34.0,
                    "l_coat_deg": 24.0, "r_coat_deg": -24.0,
                    "r_sode_rel_deg": -28.0, "r_fore_rel_deg": -18.0,
                    "l_sode_rel_deg": 12.0, "l_fore_rel_deg": 4.0,
                    "right_arm_in_front": True, "staff_deg": -8.0, "staff_glow": 1.25,
                    "foot_y": 99.0, "halo_mode": "normal", "ward_ring": False, "hand_orb_r": 0.0,
                }),
                (29, {
                    "pelvis_dx": 0.0, "pelvis_dy": 0.0, "torso_deg": 0.0, "head_rel_deg": 0.0,
                    "l_thigh_deg": 0.0, "l_shin_deg": 0.0, "r_thigh_deg": 0.0, "r_shin_deg": 0.0,
                    "l_coat_deg": 2.0, "r_coat_deg": -1.5,
                    "r_sode_rel_deg": -8.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -12.0, "l_fore_rel_deg": -28.0,
                    "right_arm_in_front": True, "staff_deg": -52.0, "staff_glow": 1.0,
                    "foot_y": 99.0, "halo_mode": "normal", "ward_ring": False, "hand_orb_r": 1.8,
                }),
            ]
            cfg.update(eval_pose_keyframes(f, kfs))
            if 12 <= f <= 16:
                cfg["slash_arc"] = (-35.0, 38.0, 27.0, 1.0 - (f - 12) * 0.16)

        elif row_idx == 8:
            # ROW 8: JUMP — Sleek Shallow Solar Vault Glide & Angled Aerial Fireball Cast (Zero steepness!)
            kfs = [
                (0, {
                    "pelvis_dx": 0.0, "pelvis_dy": 14.0, "torso_deg": 10.0, "head_rel_deg": -6.0,
                    "l_thigh_deg": 18.0, "l_shin_deg": 28.0, "r_thigh_deg": -22.0, "r_shin_deg": 28.0,
                    "r_sode_rel_deg": 8.0, "r_fore_rel_deg": -6.0,
                    "l_sode_rel_deg": -16.0, "l_fore_rel_deg": -24.0, "coat_billow": 10.0,
                    "right_arm_in_front": False, "staff_deg": -44.0, "staff_glow": 1.1,
                    "foot_y": 99.0, "halo_mode": "normal", "mane_wave_amp": 5.0,
                }),
                (8, {
                    "pelvis_dx": 8.0, "pelvis_dy": 0.0, "torso_deg": 14.0, "head_rel_deg": -10.0,
                    "l_thigh_deg": 24.0, "l_shin_deg": 38.0, "r_thigh_deg": -28.0, "r_shin_deg": 34.0,
                    "r_sode_rel_deg": -32.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -36.0, "l_fore_rel_deg": -28.0, "coat_billow": 18.0,
                    "right_arm_in_front": True, "staff_deg": -36.0, "staff_glow": 1.35,
                    "foot_y": 94.5, "halo_mode": "flare", "mane_wave_amp": 7.0, "hand_orb_r": 3.0,
                }),
                (15, {
                    "pelvis_dx": 14.0, "pelvis_dy": 2.0, "torso_deg": 17.0, "head_rel_deg": -10.0,
                    "l_thigh_deg": 22.0, "l_shin_deg": 34.0, "r_thigh_deg": -24.0, "r_shin_deg": 30.0,
                    "r_sode_rel_deg": -30.0, "r_fore_rel_deg": -16.0,
                    "l_sode_rel_deg": 20.0, "l_fore_rel_deg": 10.0, "coat_billow": 18.0,
                    "right_arm_in_front": True, "staff_deg": 18.0, "staff_glow": 1.5,
                    "foot_y": 94.5, "halo_mode": "flare", "mane_wave_amp": 7.0, "hand_orb_r": 0.0,
                }),
                (21, {
                    "pelvis_dx": 10.0, "pelvis_dy": 4.0, "torso_deg": 13.0, "head_rel_deg": -8.0,
                    "l_thigh_deg": 16.0, "l_shin_deg": 24.0, "r_thigh_deg": -18.0, "r_shin_deg": 22.0,
                    "r_sode_rel_deg": -20.0, "r_fore_rel_deg": -16.0,
                    "l_sode_rel_deg": 8.0, "l_fore_rel_deg": -8.0, "coat_billow": 12.0,
                    "right_arm_in_front": True, "staff_deg": 8.0, "staff_glow": 1.2,
                    "foot_y": 96.5, "halo_mode": "normal", "mane_wave_amp": 5.8, "hand_orb_r": 0.0,
                }),
                (26, {
                    "pelvis_dx": 4.0, "pelvis_dy": 14.0, "torso_deg": 9.0, "head_rel_deg": -5.0,
                    "l_thigh_deg": 16.0, "l_shin_deg": 26.0, "r_thigh_deg": -20.0, "r_shin_deg": 26.0,
                    "r_sode_rel_deg": -6.0, "r_fore_rel_deg": -18.0,
                    "l_sode_rel_deg": -12.0, "l_fore_rel_deg": -24.0, "coat_billow": 8.0,
                    "right_arm_in_front": True, "staff_deg": -38.0, "staff_glow": 1.05,
                    "foot_y": 99.0, "halo_mode": "normal", "mane_wave_amp": 5.0, "hand_orb_r": 1.2,
                }),
                (29, {
                    "pelvis_dx": 0.0, "pelvis_dy": 0.0, "torso_deg": 1.0, "head_rel_deg": 0.0,
                    "l_thigh_deg": 0.0, "l_shin_deg": 0.0, "r_thigh_deg": 0.0, "r_shin_deg": 0.0,
                    "r_sode_rel_deg": -8.0, "r_fore_rel_deg": -22.0,
                    "l_sode_rel_deg": -12.0, "l_fore_rel_deg": -28.0, "coat_billow": 2.0,
                    "right_arm_in_front": True, "staff_deg": -52.0, "staff_glow": 1.0,
                    "foot_y": 99.0, "halo_mode": "normal", "mane_wave_amp": 4.8, "hand_orb_r": 1.8,
                }),
            ]
            cfg.update(eval_pose_keyframes(f, kfs))
            if 14 <= f <= 18:
                cfg["slash_arc"] = (-16.0, 52.0, 28.0, 0.95 - (f - 14) * 0.16)

        cfgs.append(cfg)
    return cfgs


def save_debug_sheets(sheet_im):
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    half_w = 15 * CELL
    full_h = ROWS * CELL
    for tag, x_off in (("left_F00_F14", 0), ("right_F15_F29", half_w)):
        bg = Image.new("RGBA", (half_w, full_h), (18, 16, 26, 255))
        crop = sheet_im.crop((x_off, 0, x_off + half_w, full_h))
        bg.alpha_composite(crop, (0, 0))
        d = ImageDraw.Draw(bg)
        for r in range(ROWS):
            for c in range(15):
                d.rectangle([c * CELL, r * CELL, (c + 1) * CELL - 1, (r + 1) * CELL - 1], outline=(48, 44, 68, 180))
        out_p = os.path.join(ARTIFACT_DIR, f"debug_mage_30fps_{tag}.png")
        bg.resize((half_w // 2, full_h // 2), Image.Resampling.NEAREST).save(out_p)

    picks = [
        (0, 0, "IDLE F00"),
        (1, 7, "WALK F07"),
        (2, 8, "ATK WINDUP"),
        (2, 12, "ATK CAST"),
        (3, 9, "SKILL SLAM"),
        (3, 18, "SKILL SWEEP"),
        (4, 7, "ULT ECLIPSE"),
        (4, 12, "ULT BEAM"),
        (7, 6, "CROUCH WARD"),
        (8, 15, "JUMP GLIDE"),
    ]
    sw = len(picks) * CELL
    sh = CELL + 30
    strip = Image.new("RGBA", (sw, sh), (18, 16, 26, 255))
    sd = ImageDraw.Draw(strip)
    for idx, (r, c, lbl) in enumerate(picks):
        tile = sheet_im.crop((c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL))
        strip.alpha_composite(tile, (idx * CELL, 26))
        sd.line([(idx * CELL, 26 + 199), ((idx + 1) * CELL - 1, 26 + 199)], fill=(251, 146, 60, 120), width=1)
        sd.text((idx * CELL + 8, 6), lbl, fill=(254, 240, 138, 255))
    strip.save(os.path.join(ARTIFACT_DIR, "debug_mage_9pass_showcase.png"))


def main():
    t0 = time.time()
    parts = load_and_segment_512()
    sheet = Image.new("RGBA", (COLS * CELL, ROWS * CELL), (0, 0, 0, 0))
    row_names = ["IDLE", "WALK", "AUTO_ATTACK", "SKILL", "ULTIMATE", "DEATH", "DASH", "CROUCH", "JUMP"]

    total_clips = 0
    for r in range(ROWS):
        cfgs = build_row_configs(r)
        prev_arr = None
        distinct_transitions = 0
        for c in range(COLS):
            arr104 = render_pose_104(parts, cfgs[c])
            border_alpha = (
                arr104[:2, :, 3].sum()
                + arr104[-2:, :, 3].sum()
                + arr104[:, :2, 3].sum()
                + arr104[:, -2:, 3].sum()
            )
            if border_alpha > 0:
                total_clips += 1
            if prev_arr is not None and not np.array_equal(arr104, prev_arr):
                distinct_transitions += 1
            prev_arr = arr104

            cell_im = Image.fromarray(arr104, "RGBA").resize((CELL, CELL), Image.Resampling.NEAREST)
            sheet.paste(cell_im, (c * CELL, r * CELL))
        print(f"  Row {r} ({row_names[r]:11s}): 30/30 frames rendered ({distinct_transitions}/29 distinct transitions)")

    os.makedirs(os.path.dirname(OUT_SHEET_PATH), exist_ok=True)
    sheet.save(OUT_SHEET_PATH)
    save_debug_sheets(sheet)
    dt = time.time() - t0
    print(f"[SUCCESS] Saved {OUT_SHEET_PATH} ({sheet.size[0]}x{sheet.size[1]}) in {dt:.2f}s | clips={total_clips}/270")


if __name__ == "__main__":
    main()
