#!/usr/bin/env python3
"""
Next-Gen Wide-Canvas Sprite Sheet, Portrait, & Visual QA Builder for:
  TORGAR EX -- World-Breaker Forge King (titan_ex)

Architecture & Weapon Invariant (FFBE / Last Cloudia Paradigm):
  1. Wide Theatrical Cell Framing:
     - Logical canvas: 160x120 -> 2x NEAREST output: 320x240 per cell
     - Sheet layout: 30 cols x 10 rows = 9600x2400 RGBA PNG
     - Grounded foot/spine anchor: anchor_x_160 = 56 (anchorX = 112),
       anchor_y_120 = 115 (anchorY = 230)
     - Standing Forge-King height: 85 logical px (170px in 320x240 incl. bull-horns),
       100% locked scale across all 300 frames.
  2. Symmetric Double-Faced Molten World-Maul (Mjolnir) + Crucible Back-Halo:
     - Wields a colossal symmetric double-faced black-iron, gold-filigree &
       emerald-jade Khazad Warhammer/Maul + rotating 8-Cog World-Forge Halo!
  3. CRITICAL BLUNT-WEAPON SMEAR INVARIANT (ZERO Sword-Tip Slash Crescents!):
     - Every 1-frame snap smear (Row 2 F03, F09, F17, F25 + Skill/Ult) is a
       BLUNT, BROAD-HEADED Molten Magma & Emerald-Jade Heavy Kinetic Shock-Smear Fan:
       #ffffff -> #fde047 -> #f59e0b -> #10b981 / #78350f terminating in a flat
       blocky hammer-head concussion wall + flying molten anvil sparks!
"""

import os
import sys
import math
import time
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

try:
    from scipy.ndimage import label as _nd_label
except ImportError:
    _nd_label = None

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES_DIR = os.path.join(ROOT_DIR, "assets", "sprites")
SCRATCH_DIR = "/Users/rei/.gemini/antigravity/brain/5416474b-0e5f-4471-85c8-b7a88055e218/scratch"

BASE_JPG = os.path.join(SPRITES_DIR, "titan_ex_base.jpg")
KEYPOSES_JPG = os.path.join(SPRITES_DIR, "titan_ex_keyposes_ref.jpg")
PORTRAIT_RAW_JPG = os.path.join(SPRITES_DIR, "titan_ex_portrait_raw.jpg")

OUT_SHEET_PNG = os.path.join(SPRITES_DIR, "titan_ex_sheet.png")
OUT_PORTRAIT_PNG = os.path.join(SPRITES_DIR, "titan_ex_portrait.png")

LOGICAL_W = 160
LOGICAL_H = 120
CELL_W = 320
CELL_H = 240
COLS = 30
ROWS = 10
SHEET_W = COLS * CELL_W   # 9600
SHEET_H = ROWS * CELL_H   # 2400

ANCHOR_X_160 = 56
ANCHOR_Y_120 = 115
ANCHOR_X_320 = ANCHOR_X_160 * 2  # 112
ANCHOR_Y_320 = ANCHOR_Y_120 * 2  # 230
MARGIN_LOGICAL = 2

# Constant locked Dwarven Forge-King scale: 493px in 512-space == 85 logical px (170px output)
STAND_H_512 = 493.0
TARGET_STAND_H_LOGICAL = 85.0
S_HI = STAND_H_512 / TARGET_STAND_H_LOGICAL  # 5.80 px per logical pixel
HI_W = int(round(LOGICAL_W * S_HI))          # 928
HI_H = int(round(LOGICAL_H * S_HI))          # 696
ANCHOR_HI_X = ANCHOR_X_160 * S_HI
ANCHOR_HI_Y = ANCHOR_Y_120 * S_HI

# 26-Color World-Breaker Forge-King Master Palette
MASTER_PALETTE_TITAN_EX = np.array([
    [12, 10, 8],      # 0: Deep obsidian-slag Selout (#0c0a08)
    [28, 20, 16],     # 1: Lit basalt-bronze Selout (#1c1410)
    [48, 32, 22],     # 2: Warm beard/umber Selout (#302016)
    [42, 44, 52],     # 3: Blackened forge-iron shadow (#2a2c34)
    [72, 76, 88],     # 4: Dark Dwarven plate mid (#484c58)
    [116, 122, 138],  # 5: Tempered anvil-steel mid-lit (#747a8a)
    [172, 180, 196],  # 6: Bright bevel steel (#acb4c4)
    [232, 236, 244],  # 7: Specular steel highlight (#e8ecf4)
    [120, 53, 15],    # 8: Scorched bronze-gold shadow (#78350f)
    [168, 92, 20],    # 9: Forged Dwarven gold dark (#a85c14)
    [222, 148, 34],   # 10: Rich Khazad gold trim (#de9422)
    [250, 204, 68],   # 11: Bright sun-gold horn/filigree (#facc44)
    [254, 243, 178],  # 12: Pale molten gold glint (#fef3b2)
    [138, 38, 12],    # 13: Deep fiery beard / magma shadow (#8a260c)
    [196, 68, 16],    # 14: Fiery braided beard / ember mid (#c44410)
    [245, 124, 20],   # 15: Blazing orange beard / magma (#f57c14)
    [251, 176, 36],   # 16: Bright amber beard highlight (#fbb024)
    [245, 158, 11],   # 17: Molten amber furnace glow (#f59e0b)
    [253, 224, 71],   # 18: Incandescent yellow-magma core (#fde047)
    [255, 255, 255],  # 19: Pure white anvil-strike flash (#ffffff)
    [6, 78, 59],      # 20: Deep emerald-jade rune shadow (#064e3b)
    [5, 150, 105],    # 21: Khazad emerald-jade mid (#059669)
    [16, 185, 129],   # 22: Luminous World-Forge jade (#10b981)
    [110, 231, 183],  # 23: Bright jade-mint rune spark (#6ee7b7)
    [164, 98, 68],    # 24: Dwarven skin shadow (#a46244)
    [224, 154, 112],  # 25: Dwarven skin highlight (#e09a70)
], dtype=np.int32)

# RGBA tuples for 160x120 World-Maul, Crucible Back-Halo, & Blunt Shock-Smear Fans
C_OUT_DARK = (12, 10, 8, 255)
C_OUT_LIT = (28, 20, 16, 255)
C_IRON_DARK = (42, 44, 52, 255)
C_IRON_MID = (72, 76, 88, 255)
C_IRON_LIT = (116, 122, 138, 255)
C_IRON_SPEC = (172, 180, 196, 255)

C_BRONZE_RIB = (120, 53, 15, 255)     # #78350f scorched bronze-iron trailing rib
C_GOLD_DARK = (168, 92, 20, 255)
C_GOLD_MID = (222, 148, 34, 255)
C_GOLD_LIT = (250, 204, 68, 255)
C_MAGMA_ORANGE = (245, 124, 20, 255)
C_MAGMA_AMBER = (245, 158, 11, 255)   # #f59e0b molten amber body
C_MAGMA_YELLOW = (253, 224, 71, 255)  # #fde047 molten sun-gold crest
C_FLASH_WHITE = (255, 255, 255, 255)  # #ffffff blunt anvil-strike face

C_JADE_DEEP = (6, 78, 59, 255)
C_JADE_MID = (16, 185, 129, 255)      # #10b981 emerald-jade shock-streak
C_JADE_LIT = (110, 231, 183, 255)

BAYER4 = (np.array([
    [0,  8,  2, 10],
    [12, 4, 14,  6],
    [3, 11,  1,  9],
    [15, 7, 13,  5],
], dtype=np.float32) + 0.5) / 16.0


# ==============================================================================
# 1. MASK, COMPONENT, PINHOLE, & CEL-QUANTIZATION UTILITIES
# ==============================================================================

def poly_mask(H, W, pts):
    im = Image.new("L", (W, H), 0)
    ImageDraw.Draw(im).polygon(pts, fill=255)
    return np.array(im) > 128


def keep_largest_component(mask):
    if not np.any(mask):
        return mask
    if _nd_label is not None:
        structure = np.ones((3, 3), dtype=np.int8)
        labeled, num = _nd_label(mask, structure=structure)
        if num <= 1:
            return mask.copy()
        counts = np.bincount(labeled.ravel())
        counts[0] = 0
        best = int(np.argmax(counts))
        return labeled == best

    H, W = mask.shape
    visited = np.zeros((H, W), dtype=bool)
    best_comp = None
    best_size = 0
    ys, xs = np.where(mask)
    for idx in range(len(ys)):
        sy, sx = int(ys[idx]), int(xs[idx])
        if visited[sy, sx]:
            continue
        comp = [(sy, sx)]
        visited[sy, sx] = True
        head = 0
        while head < len(comp):
            cy, cx = comp[head]
            head += 1
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1),
                           (cy - 1, cx - 1), (cy - 1, cx + 1), (cy + 1, cx - 1), (cy + 1, cx + 1)):
                if 0 <= ny < H and 0 <= nx < W and not visited[ny, nx] and mask[ny, nx]:
                    visited[ny, nx] = True
                    comp.append((ny, nx))
        if len(comp) > best_size:
            best_size = len(comp)
            best_comp = comp
    out = np.zeros((H, W), dtype=bool)
    if best_comp:
        cy, cx = zip(*best_comp)
        out[cy, cx] = True
    return out


def fill_interior_pinholes_rgba(arr, max_hole_px=18):
    out = arr.copy()
    H, W = out.shape[:2]

    def fill_from_neighbors(buf, target_mask):
        ys, xs = np.where(target_mask)
        for y, x in zip(ys, xs):
            cols = []
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1),
                           (y - 1, x - 1), (y - 1, x + 1), (y + 1, x - 1), (y + 1, x + 1)):
                if 0 <= ny < H and 0 <= nx < W and buf[ny, nx, 3] > 128:
                    cols.append(buf[ny, nx, :3])
            if cols:
                med = np.median(np.array(cols, dtype=np.int32), axis=0).astype(np.uint8)
                buf[y, x] = [med[0], med[1], med[2], 255]

    for _ in range(3):
        a = out[:, :, 3] > 128
        up = np.pad(a[:-1, :], ((1, 0), (0, 0)), constant_values=False)
        dn = np.pad(a[1:, :], ((0, 1), (0, 0)), constant_values=False)
        lf = np.pad(a[:, :-1], ((0, 0), (1, 0)), constant_values=False)
        rt = np.pad(a[:, 1:], ((0, 0), (0, 1)), constant_values=False)
        cnt = up.astype(np.int8) + dn.astype(np.int8) + lf.astype(np.int8) + rt.astype(np.int8)
        slits = (~a) & (cnt >= 3)
        if not np.any(slits):
            break
        fill_from_neighbors(out, slits)

    a = out[:, :, 3] > 128
    ext = np.zeros((H, W), dtype=bool)
    q = []
    for x in range(W):
        if not a[0, x]:
            ext[0, x] = True
            q.append((0, x))
        if not a[H - 1, x] and not ext[H - 1, x]:
            ext[H - 1, x] = True
            q.append((H - 1, x))
    for y in range(H):
        if not a[y, 0] and not ext[y, 0]:
            ext[y, 0] = True
            q.append((y, 0))
        if not a[y, W - 1] and not ext[y, W - 1]:
            ext[y, W - 1] = True
            q.append((y, W - 1))

    hd = 0
    while hd < len(q):
        cy, cx = q[hd]
        hd += 1
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < H and 0 <= nx < W and not ext[ny, nx] and not a[ny, nx]:
                ext[ny, nx] = True
                q.append((ny, nx))

    enclosed = (~a) & (~ext)
    if np.any(enclosed) and _nd_label is not None:
        lbl, n_c = _nd_label(enclosed)
        if n_c > 0:
            cnts = np.bincount(lbl.ravel())
            cnts[0] = 999999
            small_ids = np.where(cnts <= max_hole_px)[0]
            if len(small_ids) > 0:
                to_fill = np.isin(lbl, small_ids)
                for _ in range(6):
                    rem = to_fill & (out[:, :, 3] <= 128)
                    if not np.any(rem):
                        break
                    fill_from_neighbors(out, rem)

    return out


def clean_pose_512(im_rgba_512, pocket_seeds=(), strip_polys=(), head_y_split=175):
    im = im_rgba_512.copy().convert("RGBA")
    W, H = im.size
    border_seeds = [
        (0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1),
        (W // 2, 0), (W // 2, H - 1), (0, H // 2), (W - 1, H // 2),
        (W // 4, 0), (3 * W // 4, 0), (W // 4, H - 1), (3 * W // 4, H - 1),
    ]
    for sx, sy in list(border_seeds) + list(pocket_seeds):
        if 0 <= sx < W and 0 <= sy < H:
            px = im.getpixel((sx, sy))
            if px[3] > 0 and px[0] > 215 and px[1] > 215 and px[2] > 215:
                ImageDraw.floodfill(im, (sx, sy), (0, 0, 0, 0), thresh=38)

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
        fringe = edge & (r > 182) & (g > 182) & (b > 182) & (np.abs(r - g) < 26) & (np.abs(g - b) < 26)
        arr[fringe] = [0, 0, 0, 0]

    for poly in strip_polys:
        m = poly_mask(H, W, poly)
        arr[m] = [0, 0, 0, 0]

    alpha = keep_largest_component(arr[:, :, 3] > 0)
    arr[~alpha] = [0, 0, 0, 0]

    rgb_im = Image.fromarray(arr[:, :, :3], "RGB")
    med3 = np.array(rgb_im.filter(ImageFilter.MedianFilter(size=3)))
    med5 = np.array(rgb_im.filter(ImageFilter.MedianFilter(size=5)))
    yy = np.arange(H)[:, None]
    cel_rgb = np.where(yy[:, :, None] < head_y_split, med3, med5)

    # Preserve glowing emerald-jade chest runes & blazing ember eyes
    r0 = arr[:, :, 0].astype(np.int16)
    g0 = arr[:, :, 1].astype(np.int16)
    b0 = arr[:, :, 2].astype(np.int16)
    vivid_jade = alpha & ((g0 - r0) > 35) & (g0 > 135)
    vivid_ember = alpha & (yy < 165) & (r0 > 220) & (g0 > 110) & (b0 < 85)
    keep_vivid = vivid_jade | vivid_ember
    arr[:, :, :3] = np.where(alpha[:, :, None], np.where(keep_vivid[:, :, None], arr[:, :, :3], cel_rgb), 0)
    arr[alpha, 3] = 255
    return fill_interior_pinholes_rgba(arr, max_hole_px=14)


def downsample_clean_160x120(win_hi):
    a_box = np.array(win_hi.getchannel("A").resize((LOGICAL_W, LOGICAL_H), Image.Resampling.BOX))
    solid = a_box >= 80
    near_rgba = np.array(win_hi.resize((LOGICAL_W, LOGICAL_H), Image.Resampling.NEAREST))
    out = np.zeros((LOGICAL_H, LOGICAL_W, 4), dtype=np.uint8)

    direct = solid & (near_rgba[:, :, 3] > 128)
    out[direct, :3] = near_rgba[direct, :3]
    out[direct, 3] = 255

    need_rgb = solid & (~direct)
    if np.any(need_rgb):
        src = np.array(win_hi)
        for _ in range(3):
            sa = src[:, :, 3] > 128
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                shifted = np.roll(src, shift=(dy, dx), axis=(0, 1))
                take = (~sa) & (shifted[:, :, 3] > 128)
                src[take] = shifted[take]
                sa = src[:, :, 3] > 128
        dil_near = np.array(Image.fromarray(src, "RGBA").resize((LOGICAL_W, LOGICAL_H), Image.Resampling.NEAREST))
        out[need_rgb, :3] = dil_near[need_rgb, :3]
        out[need_rgb, 3] = 255

    return fill_interior_pinholes_rgba(out, max_hole_px=16)


def quantize_and_cluster_160x120(
    arr160,
    palette=MASTER_PALETTE_TITAN_EX,
    protect_indices=(15, 16, 17, 18, 19, 21, 22, 23),
    beard_indices=(13, 14, 15, 16),
):
    out = arr160.copy()
    alpha = out[:, :, 3] > 128
    out[~alpha] = [0, 0, 0, 0]
    out[alpha, 3] = 255
    if not np.any(alpha):
        return out

    rgb = out[:, :, :3].astype(np.int32)
    diff = rgb[:, :, None, :] - palette[None, None, :, :]
    dist2 = diff[:, :, :, 0] ** 2 * 2 + diff[:, :, :, 1] ** 2 * 3 + diff[:, :, :, 2] ** 2 * 2
    idx_map = np.argmin(dist2, axis=2)
    idx_map[~alpha] = -1

    protect_mask = np.isin(idx_map, protect_indices)

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
        orphan = interior & (same_cnt == 0) & (~protect_mask)
        rep = np.where((up == dn) & (up >= 0), up, np.where((lf == rt) & (lf >= 0), lf, up))
        idx_map = np.where(orphan & (rep >= 0), rep, idx_map)

        maj_ud = (up == dn) & ((up == lf) | (up == rt)) & (up >= 0)
        maj_lr = (lf == rt) & ((lf == up) | (lf == dn)) & (lf >= 0)
        maj_val = np.where(maj_ud, up, np.where(maj_lr, lf, -1))
        idx_map = np.where(interior & (same_cnt <= 1) & (~protect_mask) & (maj_val >= 0), maj_val, idx_map)

    up_a = np.pad(alpha[:-1, :], ((1, 0), (0, 0)), constant_values=False)
    dn_a = np.pad(alpha[1:, :], ((0, 1), (0, 0)), constant_values=False)
    lf_a = np.pad(alpha[:, :-1], ((0, 0), (1, 0)), constant_values=False)
    rt_a = np.pad(alpha[:, 1:], ((0, 0), (0, 1)), constant_values=False)
    interior_a = alpha & up_a & dn_a & lf_a & rt_a
    edge = alpha & (~interior_a)

    yy = np.arange(LOGICAL_H)[:, None]
    is_beard = np.isin(idx_map, beard_indices) & (yy < 80)
    shadow_side = (~dn_a) | (~rt_a)

    body_edge = edge & (~is_beard)
    beard_edge = edge & is_beard

    idx_map[body_edge & (~shadow_side)] = 1   # #1c1410 lit basalt Selout
    idx_map[body_edge & shadow_side] = 0      # #0c0a08 deep obsidian Selout
    idx_map[beard_edge & (~shadow_side)] = 1
    idx_map[beard_edge & shadow_side] = 2     # #302016 warm umber Selout

    valid = idx_map >= 0
    out_rgb = palette[np.clip(idx_map, 0, len(palette) - 1)].astype(np.uint8)
    out[:, :, :3] = np.where(valid[:, :, None], out_rgb, 0)
    return out


# ==============================================================================
# 2. PORTRAIT BUILDER (1024x1024 -> 128x128 CEL-QUANTIZED PNG)
# ==============================================================================

def build_portrait_128():
    raw = Image.open(PORTRAIT_RAW_JPG).convert("RGB")
    med3 = np.array(raw.filter(ImageFilter.MedianFilter(size=3)))
    med5 = np.array(raw.filter(ImageFilter.MedianFilter(size=5)))
    raw_np = np.array(raw)

    H, W = raw_np.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    face_focus = (xx >= 220) & (xx <= 820) & (yy >= 80) & (yy <= 960)
    blended = np.where(face_focus[:, :, None], med3, med5)

    im256 = Image.fromarray(blended, "RGB").resize((256, 256), Image.Resampling.BOX)
    im256 = im256.filter(ImageFilter.MedianFilter(size=3))
    im128 = im256.resize((128, 128), Image.Resampling.NEAREST)
    src128 = np.array(im128)

    q128 = im128.quantize(colors=30, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert("RGB")
    out128 = np.array(q128)

    # Restore crisp glowing Khazad emerald-jade maul runes & chest furnace jade
    r = src128[:, :, 0].astype(np.int16)
    g = src128[:, :, 1].astype(np.int16)
    b = src128[:, :, 2].astype(np.int16)
    jade_mask = ((g - r) > 35) & (g > 130)
    lum = (r * 2 + g * 5 + b * 3) // 10
    out128[jade_mask & (lum >= 205)] = [167, 243, 208]
    out128[jade_mask & (lum >= 145) & (lum < 205)] = [16, 185, 129]
    out128[jade_mask & (lum < 145)] = [5, 150, 105]

    rgba128 = np.zeros((128, 128, 4), dtype=np.uint8)
    rgba128[:, :, :3] = out128
    rgba128[:, :, 3] = 255
    out_im = Image.fromarray(rgba128, "RGBA")
    out_im.save(OUT_PORTRAIT_PNG)

    os.makedirs(SCRATCH_DIR, exist_ok=True)
    preview = out_im.resize((384, 384), Image.Resampling.NEAREST)
    preview.save(os.path.join(SCRATCH_DIR, "debug_titan_ex_portrait.png"))
    print(f"[Portrait] Saved {OUT_PORTRAIT_PNG} (128x128)")


# ==============================================================================
# 3. SEGMENTATION OF STAND + 4 REAL 3D ACTION KEYPOSES
# ==============================================================================

def assign_remaining_geodesic(alpha, mask_list):
    H, W = alpha.shape
    labels = np.zeros((H, W), dtype=np.int16)
    names = [nm for nm, _ in mask_list]
    for idx, (nm, m) in enumerate(mask_list, start=1):
        mc = m if nm in ("l_coat", "r_coat", "torso") else keep_largest_component(m)
        mc = mc & alpha & (labels == 0)
        labels[mc] = idx

    for _ in range(36):
        rem = alpha & (labels == 0)
        if not np.any(rem):
            break
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
            sh = np.roll(labels, shift=(dy, dx), axis=(0, 1))
            take = rem & (sh > 0)
            labels[take] = sh[take]
            rem = alpha & (labels == 0)

    return [(nm, labels == idx) for idx, nm in enumerate(names, start=1)]


def extract_crop_tuple(arr512, mask):
    ys, xs = np.where(mask)
    if len(ys) == 0:
        return (Image.new("RGBA", (2, 2), (0, 0, 0, 0)), 0, 0)
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    crop = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
    sub = mask[y0:y1, x0:x1]
    crop[sub] = arr512[y0:y1, x0:x1][sub]
    return (Image.fromarray(crop, "RGBA"), x0, y0)


def load_rig_and_keyposes():
    base_512_raw = Image.open(BASE_JPG).convert("RGBA").resize((512, 512), Image.Resampling.NEAREST)
    stand_arr = clean_pose_512(
        base_512_raw,
        pocket_seeds=[(276, 408)],
        strip_polys=[],
        head_y_split=178,
    )
    alpha = stand_arr[:, :, 3] > 128
    H, W = alpha.shape

    raw_masks = [
        ("head", poly_mask(H, W, [(198, 4), (336, 4), (334, 150), (310, 206), (242, 206), (206, 134)])),
        ("l_sode", poly_mask(H, W, [(96, 86), (222, 86), (218, 206), (92, 198)])),
        ("l_forearm", poly_mask(H, W, [(72, 188), (202, 198), (202, 294), (72, 294)])),
        ("r_sode", poly_mask(H, W, [(312, 98), (376, 108), (378, 204), (316, 204)])),
        ("r_forearm", poly_mask(H, W, [(326, 194), (450, 194), (450, 282), (326, 282)])),
        ("torso", poly_mask(H, W, [(212, 146), (324, 146), (324, 272), (314, 418), (236, 418), (216, 272)])),
        ("l_coat", poly_mask(H, W, [(144, 268), (238, 268), (238, 356), (144, 356)])),
        ("r_coat", poly_mask(H, W, [(308, 268), (368, 268), (368, 358), (308, 358)])),
        ("l_thigh", poly_mask(H, W, [(148, 326), (240, 326), (234, 408), (144, 408)])),
        ("l_shin", poly_mask(H, W, [(138, 394), (224, 394), (214, 462), (136, 462)])),
        ("l_foot", poly_mask(H, W, [(120, 448), (216, 448), (216, 502), (120, 502)])),
        ("r_thigh", poly_mask(H, W, [(296, 322), (364, 322), (372, 402), (298, 402)])),
        ("r_shin", poly_mask(H, W, [(302, 388), (378, 388), (378, 454), (302, 454)])),
        ("r_foot", poly_mask(H, W, [(298, 442), (402, 442), (402, 492), (298, 492)])),
    ]
    assigned = assign_remaining_geodesic(alpha, raw_masks)
    parts = {nm: extract_crop_tuple(stand_arr, m) for nm, m in assigned}

    stand_joints = {
        "x_ref": 266.0,
        "y_bot": 498.0,
        "pelvis": (274.0, 286.0),
        "neck": (274.0, 132.0),
        "l_coat": (222.0, 282.0),
        "r_coat": (316.0, 282.0),
        "l_sh": (176.0, 146.0),
        "l_el": (122.0, 226.0),
        "l_grip": (166.0, 246.0),
        "r_sh": (336.0, 152.0),
        "r_el": (358.0, 232.0),
        "r_grip": (414.0, 240.0),
        "l_hip": (204.0, 328.0),
        "l_knee": (188.0, 396.0),
        "l_ankle": (172.0, 456.0),
        "r_hip": (326.0, 326.0),
        "r_knee": (342.0, 392.0),
        "r_ankle": (346.0, 450.0),
    }

    kp_sheet = Image.open(KEYPOSES_JPG).convert("RGBA")
    tiles_raw = {
        "K1_COIL": kp_sheet.crop((0, 0, 512, 512)),
        "K2_LUNGE": kp_sheet.crop((512, 0, 1024, 512)),
        "K3_RISE": kp_sheet.crop((0, 512, 512, 1024)),
        "K4_LEAP": kp_sheet.crop((512, 512, 1024, 1024)),
    }

    keypose_specs = {
        "K1_COIL": {
            "pocket_seeds": [(334, 36), (329, 392)],
            "strip_polys": [
                [(70, 72), (224, 72), (256, 156), (248, 236), (70, 236)],
            ],
            "head_y_split": 170,
            "x_ref": 272.0,
            "y_bot": 506.0,
            "l_sh": (236.0, 154.0),
            "r_sh": (338.0, 174.0),
            "neck": (294.0, 134.0),
            "pelvis": (288.0, 286.0),
        },
        "K2_LUNGE": {
            "pocket_seeds": [(340, 318), (376, 435), (299, 399)],
            "strip_polys": [
                [(84, 130), (176, 130), (208, 240), (204, 298), (84, 298)],
                [(372, 286), (462, 286), (462, 488), (376, 488)],
            ],
            "head_y_split": 220,
            "x_ref": 236.0,
            "y_bot": 494.0,
            "l_sh": (208.0, 166.0),
            "r_sh": (346.0, 238.0),
            "neck": (306.0, 198.0),
            "pelvis": (248.0, 304.0),
        },
        "K3_RISE": {
            "pocket_seeds": [(111, 507), (350, 494), (324, 394)],
            "strip_polys": [
                [(50, 198), (168, 198), (188, 250), (184, 302), (50, 302)],
                [(342, 4), (450, 4), (450, 204), (344, 204)],
            ],
            "head_y_split": 175,
            "x_ref": 254.0,
            "y_bot": 504.0,
            "l_sh": (168.0, 174.0),
            "r_sh": (324.0, 156.0),
            "neck": (262.0, 136.0),
            "pelvis": (266.0, 284.0),
        },
        "K4_LEAP": {
            "pocket_seeds": [(343, 98), (394, 345)],
            "strip_polys": [
                [(90, 6), (210, 6), (210, 118), (188, 196), (90, 196)],
                [(326, 6), (430, 6), (430, 196), (348, 196), (338, 98), (332, 54)],
            ],
            "head_y_split": 180,
            "x_ref": 262.0,
            "y_bot": 488.0,
            "l_sh": (198.0, 152.0),
            "r_sh": (324.0, 154.0),
            "neck": (274.0, 142.0),
            "pelvis": (268.0, 282.0),
        },
    }

    keyposes = {}
    for kname, spec in keypose_specs.items():
        cleaned = clean_pose_512(
            tiles_raw[kname],
            pocket_seeds=spec["pocket_seeds"],
            strip_polys=spec["strip_polys"],
            head_y_split=spec["head_y_split"],
        )
        m = cleaned[:, :, 3] > 128
        crop_tuple = extract_crop_tuple(cleaned, m)
        entry = dict(spec)
        entry["crop"] = crop_tuple
        keyposes[kname] = entry

    return parts, stand_joints, keyposes


# ==============================================================================
# 4. ROTATED PART PASTE & 2-BONE ANALYTICAL IK ARM SOLVER
# ==============================================================================

def rot_pt(pt, pivot, deg):
    rad = math.radians(deg)
    c, s = math.cos(rad), math.sin(rad)
    dx, dy = pt[0] - pivot[0], pt[1] - pivot[1]
    return (pivot[0] + dx * c - dy * s, pivot[1] + dx * s + dy * c)


def paste_rotated_part(
    canvas,
    part_tuple,
    src_pivot,
    dst_pivot,
    deg=0.0,
    squash_x=1.0,
    squash_y=1.0,
    wave_phase=None,
    wave_amp=0.0,
):
    crop_im, x0, y0 = part_tuple
    px, py = src_pivot[0] - x0, src_pivot[1] - y0

    if wave_phase is not None and abs(wave_amp) > 0.05:
        arr = np.array(crop_im)
        h, w = arr.shape[:2]
        pad = int(abs(wave_amp)) + 4
        out = np.zeros((h + pad * 2, w, 4), dtype=np.uint8)
        for x in range(w):
            dist = (w - 1 - x) / max(1.0, float(w))
            dy = int(round(math.sin(wave_phase + dist * 4.0) * wave_amp * (dist ** 1.1)))
            out[pad + dy : pad + dy + h, x] = arr[:, x]
        crop_im = Image.fromarray(out, "RGBA")
        py += pad

    if abs(squash_x - 1.0) > 0.01 or abs(squash_y - 1.0) > 0.01:
        w0, h0 = crop_im.size
        nw = max(2, int(round(w0 * squash_x)))
        nh = max(2, int(round(h0 * squash_y)))
        crop_im = crop_im.resize((nw, nh), Image.Resampling.NEAREST)
        px *= squash_x
        py *= squash_y

    w, h = crop_im.size
    max_r = int(math.hypot(max(px, w - px), max(py, h - py))) + 4
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


def draw_joint_bridge_hi(canvas, p0, p1, r, fill=(42, 44, 52, 255), inner=(168, 92, 20, 255)):
    draw = ImageDraw.Draw(canvas)
    x0, y0 = int(round(p0[0])), int(round(p0[1]))
    x1, y1 = int(round(p1[0])), int(round(p1[1]))
    draw.line([(x0, y0), (x1, y1)], fill=fill, width=max(2, int(r * 2)))
    for cx, cy in ((x0, y0), (x1, y1)):
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)
        ir = max(1, int(r * 0.56))
        draw.ellipse([cx - ir, cy - ir, cx + ir, cy + ir], fill=inner)


def solve_2bone_ik(sh_pt, target_pt, l1, l2, bend_sign=1.0):
    dx = target_pt[0] - sh_pt[0]
    dy = target_pt[1] - sh_pt[1]
    dist = max(1.0, math.hypot(dx, dy))
    max_d = (l1 + l2) * 0.96
    min_d = abs(l1 - l2) + 4.0
    d = max(min_d, min(max_d, dist))
    ux, uy = dx / dist, dy / dist
    clamped_target = (sh_pt[0] + ux * d, sh_pt[1] + uy * d)

    cos_a = (l1 * l1 + d * d - l2 * l2) / max(1e-4, 2.0 * l1 * d)
    cos_a = max(-1.0, min(1.0, cos_a))
    ang_base = math.atan2(dy, dx)
    ang_el = ang_base + bend_sign * math.acos(cos_a)
    el_pt = (sh_pt[0] + math.cos(ang_el) * l1, sh_pt[1] + math.sin(ang_el) * l1)
    return el_pt, clamped_target


def paste_ik_arm_hi(canvas, parts, stand_joints, side, sh_dst, grip_dst, bend_sign=1.0):
    if side == "l":
        sode_nm, fore_nm = "l_sode", "l_forearm"
        sh_src = stand_joints["l_sh"]
        el_src = stand_joints["l_el"]
        gr_src = stand_joints["l_grip"]
    else:
        sode_nm, fore_nm = "r_sode", "r_forearm"
        sh_src = stand_joints["r_sh"]
        el_src = stand_joints["r_el"]
        gr_src = stand_joints["r_grip"]

    vec1_rest = (el_src[0] - sh_src[0], el_src[1] - sh_src[1])
    vec2_rest = (gr_src[0] - el_src[0], gr_src[1] - el_src[1])
    l1 = math.hypot(*vec1_rest)
    l2 = math.hypot(*vec2_rest)
    ang1_rest = math.degrees(math.atan2(vec1_rest[1], vec1_rest[0]))
    ang2_rest = math.degrees(math.atan2(vec2_rest[1], vec2_rest[0]))

    el_dst, hand_dst = solve_2bone_ik(sh_dst, grip_dst, l1, l2, bend_sign=bend_sign)
    ang1_cur = math.degrees(math.atan2(el_dst[1] - sh_dst[1], el_dst[0] - sh_dst[0]))
    ang2_cur = math.degrees(math.atan2(hand_dst[1] - el_dst[1], hand_dst[0] - el_dst[0]))

    draw_joint_bridge_hi(canvas, sh_dst, el_dst, r=10)
    draw_joint_bridge_hi(canvas, el_dst, hand_dst, r=8)
    paste_rotated_part(canvas, parts[sode_nm], sh_src, sh_dst, deg=(ang1_cur - ang1_rest))
    paste_rotated_part(canvas, parts[fore_nm], el_src, el_dst, deg=(ang2_cur - ang2_rest))
    return hand_dst


# ==============================================================================
# 5. LOGICAL 160x120 PIXEL-ART RENDERERS:
#    - 8-COG WORLD-FORGE CRUCIBLE BACK-HALO
#    - SYMMETRIC DOUBLE-FACED MOLTEN WORLD-MAUL (MJOLNIR)
#    - BLUNT, BROAD-HEADED MOLTEN MAGMA & EMERALD-JADE SHOCK-SMEAR FANS
#      (ZERO SWORD-TIP SLASH CRESCENTS!)
# ==============================================================================

def put_px_160(arr, x, y, col, margin=MARGIN_LOGICAL + 1):
    ix, iy = int(round(x)), int(round(y))
    if margin <= ix < LOGICAL_W - margin and margin <= iy < LOGICAL_H - margin:
        arr[iy, ix] = col


def draw_disc_160(arr, cx, cy, r, col):
    ix, iy = int(round(cx)), int(round(cy))
    ir = int(math.ceil(r))
    for dy in range(-ir, ir + 1):
        for dx in range(-ir, ir + 1):
            if dx * dx + dy * dy <= r * r + 0.25:
                put_px_160(arr, ix + dx, iy + dy, col)


def draw_crucible_back_halo_160(arr, cx, cy, radius=19.5, rot_phase=0.0, boosted=False):
    """
    Renders Torgar EX's iconic World-Forge 8-Cog Crucible Back-Halo floating behind
    his armored pauldrons with glowing Khazad gold & emerald-jade runes.
    """
    r = radius * (1.14 if boosted else 1.0)
    steps = 72
    for i in range(steps):
        a = (i / float(steps)) * 2.0 * math.pi + rot_phase
        px = cx + math.cos(a) * r
        py = cy + math.sin(a) * r
        put_px_160(arr, px + math.cos(a) * 1.1, py + math.sin(a) * 1.1, C_OUT_DARK)
        put_px_160(arr, px - math.cos(a) * 1.1, py - math.sin(a) * 1.1, C_OUT_DARK)
        col = C_MAGMA_YELLOW if (i // 3) % 2 == 0 else C_GOLD_MID
        put_px_160(arr, px, py, col)

    # 8 Symmetric Dwarven Forge-Cog Teeth with Emerald-Jade Rune Pips
    for k in range(8):
        ang = rot_phase + k * (math.pi / 4.0)
        ux, uy = math.cos(ang), math.sin(ang)
        nx, ny = -uy, ux
        for d in range(2, 5):
            for w in (-1, 0, 1):
                tx = cx + ux * (r + d) + nx * w
                ty = cy + uy * (r + d) + ny * w
                if abs(w) == 1 or d == 4:
                    put_px_160(arr, tx, ty, C_OUT_DARK)
                else:
                    put_px_160(arr, tx, ty, C_JADE_LIT if k % 2 == 0 else C_MAGMA_YELLOW)
        put_px_160(arr, cx + ux * (r + 1.0), cy + uy * (r + 1.0), C_JADE_MID if k % 2 == 0 else C_FLASH_WHITE)


def draw_worldbreaker_maul_160(
    arr,
    grip_x,
    grip_y,
    deg,
    shaft_len=35.0,
    head_scale=1.0,
    rune_phase=0.0,
    draw_gauntlets=True,
):
    """
    Draws Torgar EX's Colossal Symmetric Double-Faced Molten World-Maul (Mjolnir):
      - Thick runic black-iron & gold-filigree two-handed handle
      - Symmetric double-faced rectangular/chamfered Dwarven Warhammer head
        with 3 glowing Emerald-Jade & Molten Gold Khazad rune panels!
      - ZERO sword blades or points anywhere!
    """
    rad = math.radians(deg)
    ux, uy = math.cos(rad), math.sin(rad)
    # Normal along the two opposing flat hammer strike faces!
    nx, ny = -uy, ux

    pommel_dist = -9.5
    max_shaft = shaft_len
    half_face_span = 10.5 * head_scale  # Distance from shaft center to each strike face
    half_head_len = 5.4 * head_scale    # Thickness of maul block along shaft axis

    # Guarantee all 4 corners of the symmetric double-faced maul block stay >= 4px inside cell bounds
    for test_s in range(int(shaft_len), 14, -1):
        sc = min(1.0, test_s / max(1.0, shaft_len))
        h_span = half_face_span * sc
        h_len = half_head_len * sc
        ok = True
        for su in (-h_len - 2.0, h_len + 2.5):
            for sn in (-h_span - 1.5, h_span + 1.5):
                cx = grip_x + ux * (test_s + su) + nx * sn
                cy = grip_y + uy * (test_s + su) + ny * sn
                if not ((MARGIN_LOGICAL + 2) <= cx <= (LOGICAL_W - MARGIN_LOGICAL - 3) and
                        (MARGIN_LOGICAL + 2) <= cy <= (LOGICAL_H - MARGIN_LOGICAL - 3)):
                    ok = False
                    break
            if not ok:
                break
        px_p = grip_x + ux * (pommel_dist - 2.0)
        py_p = grip_y + uy * (pommel_dist - 2.0)
        if not ((MARGIN_LOGICAL + 2) <= px_p <= (LOGICAL_W - MARGIN_LOGICAL - 3) and
                (MARGIN_LOGICAL + 2) <= py_p <= (LOGICAL_H - MARGIN_LOGICAL - 3)):
            ok = False
        if ok:
            max_shaft = float(test_s)
            break

    sc = min(1.0, max_shaft / max(1.0, shaft_len))
    h_span = max(7.2, half_face_span * sc)
    h_len = max(3.8, half_head_len * sc)

    # --- Pass 1: Heavy Runic Black-Iron & Gold-Banded Maul Handle ---
    pole_end = max_shaft - h_len + 1.0
    p_steps = int(max(4.0, pole_end - pommel_dist) * 2.6) + 1
    for i in range(p_steps + 1):
        d = pommel_dist + (pole_end - pommel_dist) * (i / max(1, p_steps))
        cx = grip_x + ux * d
        cy = grip_y + uy * d
        put_px_160(arr, cx + nx * 1.85, cy + ny * 1.85, C_OUT_DARK)
        put_px_160(arr, cx - nx * 1.85, cy - ny * 1.85, C_OUT_LIT)
        is_gold_ring = (int(abs(d * 1.1)) % 4 == 0)
        for k in (-1.0, -0.35, 0.35, 1.0):
            col = (C_GOLD_LIT if k < 0 else C_GOLD_MID) if is_gold_ring else (C_IRON_LIT if k < 0 else C_IRON_DARK)
            put_px_160(arr, cx + nx * k, cy + ny * k, col)

    # Heavy Forged Gold Pommel Ring
    px_pom = grip_x + ux * pommel_dist
    py_pom = grip_y + uy * pommel_dist
    draw_disc_160(arr, px_pom, py_pom, 2.5, C_OUT_DARK)
    draw_disc_160(arr, px_pom, py_pom, 1.6, C_GOLD_LIT)
    put_px_160(arr, px_pom, py_pom, C_JADE_LIT)

    # --- Pass 2: Symmetric Double-Faced Molten World-Maul Block (Mjolnir) ---
    head_cx = grip_x + ux * max_shaft
    head_cy = grip_y + uy * max_shaft

    u_samples = int((h_len + 1.6) * 3.0) + 1
    n_samples = int((h_span + 1.6) * 3.0) + 1
    pulse = 0.5 + 0.5 * math.sin(rune_phase)

    for ui in range(-u_samples, u_samples + 1):
        du = ui / 3.0
        adu = abs(du)
        for ni in range(-n_samples, n_samples + 1):
            dn = ni / 3.0
            adn = abs(dn)

            # Flared chamfered double-faced hammer profile (slightly wider at the two flat strike faces!)
            local_h_len = h_len * (0.88 + 0.16 * min(1.0, adn / max(1.0, h_span)))
            if adu > local_h_len + 0.95 or adn > h_span + 0.95:
                continue

            px = head_cx + ux * du + nx * dn
            py = head_cy + uy * du + ny * dn

            # 1px Directional Dark Obsidian Selout around the blocky hammer head
            if adu > local_h_len or adn > h_span:
                put_px_160(arr, px, py, C_OUT_LIT if (du < 0 and dn < 0) else C_OUT_DARK)
                continue

            # Flat beveled steel strike faces at both ends (adn > h_span * 0.78)
            if adn > h_span * 0.78:
                col = C_IRON_SPEC if du < -local_h_len * 0.25 else (C_IRON_LIT if du < local_h_len * 0.35 else C_IRON_MID)
            # Central Gold-Filigree Shaft Collar + Twin Flanking Gold Borders
            elif adn < h_span * 0.22 or abs(adn - h_span * 0.74) < 0.75 or adu > local_h_len * 0.74:
                if adn < h_span * 0.14 and adu < local_h_len * 0.48:
                    col = C_FLASH_WHITE if pulse > 0.74 else C_JADE_LIT
                else:
                    col = C_GOLD_LIT if du < 0 else C_GOLD_MID
            # Twin Symmetric Khazad Rune Panels (Glowing Emerald-Jade Runes on Dark Basalt Iron!)
            else:
                # Carve crisp geometric Khazad rune bars inside both panels
                in_rune = (
                    (abs(du) < 0.75 and abs(adn - h_span * 0.48) < 1.8)
                    or (abs(adn - h_span * 0.48) < 0.65 and adu < local_h_len * 0.56)
                )
                if in_rune:
                    col = C_JADE_LIT if pulse > 0.55 else C_JADE_MID
                else:
                    col = C_IRON_MID if du < 0 else C_IRON_DARK

            put_px_160(arr, px, py, col)

    # Top Flat Crown Stud on Top of Maul Head (Blunt flat anvil boss, NEVER a spear point!)
    boss_x = head_cx + ux * (h_len + 1.0)
    boss_y = head_cy + uy * (h_len + 1.0)
    for k in (-1.2, -0.4, 0.4, 1.2):
        put_px_160(arr, boss_x + nx * k + ux * 0.8, boss_y + ny * k + uy * 0.8, C_OUT_DARK)
        put_px_160(arr, boss_x + nx * k, boss_y + ny * k, C_GOLD_LIT if abs(k) < 0.8 else C_GOLD_DARK)

    # Twin Armored Dwarven Gauntlets clasped on handle
    if draw_gauntlets:
        for gd in (-4.0, 2.5):
            hx = grip_x + ux * gd
            hy = grip_y + uy * gd
            draw_disc_160(arr, hx, hy, 2.5, C_OUT_DARK)
            draw_disc_160(arr, hx, hy, 1.7, C_IRON_MID)
            put_px_160(arr, hx - nx * 0.8, hy - ny * 0.8, C_GOLD_LIT)


def draw_forge_spark_burst_160(arr, impact_x, impact_y, spread=24.0, progress=0.0, count=9):
    """Flying blocky molten anvil sparks & emerald-jade forge embers."""
    for i in range(count):
        frac = (i / max(1, count - 1)) * 2.0 - 1.0
        ang = math.radians(-90.0 + frac * 76.0)
        dist = (4.5 + progress * spread) * (0.62 + 0.38 * ((i * 41) % 5) / 4.0)
        sx = impact_x + math.cos(ang) * dist
        sy = min(114.0, impact_y + math.sin(ang) * dist * 0.62)
        col = C_FLASH_WHITE if progress < 0.30 else (
            C_MAGMA_YELLOW if i % 3 == 0 else (C_JADE_MID if i % 3 == 1 else C_MAGMA_AMBER)
        )
        put_px_160(arr, sx, sy, col)
        put_px_160(arr, sx + 1, sy, C_OUT_DARK)
        if progress < 0.68:
            put_px_160(arr, sx - math.cos(ang) * 1.6, min(114.0, sy - math.sin(ang) * 1.1), C_BRONZE_RIB)


def draw_blunt_maul_shock_smear_160(
    arr,
    cx,
    cy,
    tail_deg,
    lead_deg,
    sweep_dir=1,
    rx_outer=72.0,
    ry_outer=50.0,
    head_thickness=29.0,
    n_ribs=6,
    phase=0.0,
):
    """
    BLUNT, BROAD-HEADED Molten Magma & Emerald-Jade Heavy Kinetic Shock-Smear Fan!
    CRITICAL INVARIANT: ZERO sword-tip taper!
      - Unlike a sword crescent, radial thickness GROWS into a massive flat, blocky
        orthogonal hammer-face concussion wall right at u = 1.0 (lead_deg)!
      - Ramp: #ffffff (blazing anvil face) -> #fde047 (molten yellow) ->
        #f59e0b (volcanic amber) -> #10b981 / #78350f (emerald-jade & bronze shock-ribs)!
    """
    t0 = tail_deg % 360.0
    t1 = lead_deg % 360.0
    total_span = ((t1 - t0) % 360.0) if sweep_dir > 0 else ((t0 - t1) % 360.0)
    if total_span < 5.0:
        return

    yy, xx = np.mgrid[0:LOGICAL_H, 0:LOGICAL_W]
    dx = (xx.astype(np.float32) - cx) / max(1.0, rx_outer)
    dy = (yy.astype(np.float32) - cy) / max(1.0, ry_outer)
    r_norm = np.hypot(dx, dy)
    ang = np.degrees(np.arctan2(yy.astype(np.float32) - cy, xx.astype(np.float32) - cx)) % 360.0

    rel = ((ang - t0) % 360.0) if sweep_dir > 0 else ((t0 - ang) % 360.0)
    in_arc = rel <= total_span
    u = np.clip(rel / max(1.0, total_span), 0.0, 1.0)

    # Stepped facet-quantized outer radius so shock-fan feels heavy & architectural (not a thin blade arc)
    u_quant = np.floor(u * 14.0) / 14.0
    r_out = 0.88 + 0.12 * (u_quant ** 0.65)

    # BLUNT BROAD-HEADED PROFILE: reaches FULL maximum hammer-head thickness right at u = 0.82..1.00!
    blunt_env = 0.16 + 0.84 * np.power(u, 0.52)
    base_thick = (head_thickness / max(1.0, 0.5 * (rx_outer + ry_outer))) * blunt_env

    # Blocky stepped piston shock-notches along trailing inner wake (stopped before the solid blunt face u > 0.84)
    rib_step = ((u * n_ribs + phase) % 1.0 < 0.38).astype(np.float32)
    rib_cut = (0.11 * rib_step * (1.0 - u)) * (u < 0.84).astype(np.float32)
    r_in = r_out - base_thick + rib_cut

    body_mask = in_arc & (r_norm >= r_in) & (r_norm <= r_out)
    bayer_tile = BAYER4[yy % 4, xx % 4]
    tail_keep = (u >= 0.26) | (bayer_tile < (u / 0.26))
    body_mask &= tail_keep

    safe_box = (
        (xx >= MARGIN_LOGICAL + 1)
        & (xx <= LOGICAL_W - MARGIN_LOGICAL - 2)
        & (yy >= MARGIN_LOGICAL + 1)
        & (yy <= LOGICAL_H - MARGIN_LOGICAL - 2)
    )
    body_mask &= safe_box
    if not np.any(body_mask):
        return

    # 1px dark basalt Selout along outer perimeter AND flat leading hammer-wall edge!
    rim_selout = in_arc & safe_box & tail_keep & (r_norm > r_out) & (r_norm <= r_out + (1.3 / max(1.0, rx_outer)))
    lead_wall_sel = (
        safe_box
        & (rel > total_span)
        & (rel <= total_span + 3.2)
        & (r_norm >= r_out - (head_thickness / max(1.0, 0.5 * (rx_outer + ry_outer))))
        & (r_norm <= r_out + 0.02)
    )
    arr[rim_selout | lead_wall_sel] = C_OUT_DARK

    denom = np.maximum(0.02, r_out - r_in)
    v = np.clip((r_norm - r_in) / denom, 0.0, 1.0)

    # Leading Blunt Hammer-Face Concussion Wall (u >= 0.86) glows incandescent white/gold across full face!
    is_blunt_face = body_mask & (u >= 0.86)
    is_trail = body_mask & (u < 0.86)

    # Alternate inner shock-ribs between scorched bronze (#78350f) and Khazad emerald-jade (#10b981)
    jade_band = ((np.floor(u * (n_ribs * 2.0)).astype(np.int32) % 2) == 0)
    arr[is_trail & (v < 0.28) & jade_band] = C_JADE_MID
    arr[is_trail & (v < 0.28) & (~jade_band)] = C_BRONZE_RIB
    arr[is_trail & (v >= 0.28) & (v < 0.60)] = C_MAGMA_AMBER
    arr[is_trail & (v >= 0.60) & (v < 0.85)] = C_MAGMA_YELLOW
    arr[is_trail & (v >= 0.85)] = C_FLASH_WHITE

    # Broad flat leading hammer-head concussion bar!
    arr[is_blunt_face & (v < 0.22)] = C_JADE_LIT
    arr[is_blunt_face & (v >= 0.22) & (v < 0.52)] = C_MAGMA_YELLOW
    arr[is_blunt_face & (v >= 0.52)] = C_FLASH_WHITE


def draw_baseball_concussion_ring_160(
    arr,
    cx,
    cy,
    rx=72.0,
    ry=22.0,
    tilt_deg=-6.0,
    front_thickness=24.0,
    half="both",
    erosion=0.0,
):
    """
    2.5D Horizontal Baseball-Swing Heavy Concussion Shock-Ring (V2 & Home-Run Overdrive).
    Broad blunt hammer-wall front band with molten gold, amber, & emerald-jade shock-ribs!
    """
    yy, xx = np.mgrid[0:LOGICAL_H, 0:LOGICAL_W]
    dx0 = xx.astype(np.float32) - cx
    dy0 = yy.astype(np.float32) - cy
    rad = math.radians(tilt_deg)
    ct, st = math.cos(rad), math.sin(rad)
    lx = dx0 * ct + dy0 * st
    ly = -dx0 * st + dy0 * ct

    enorm = np.hypot(lx / max(1.0, rx), ly / max(1.0, ry))
    theta = np.arctan2(ly / max(1.0, ry), lx / max(1.0, rx))

    if half == "back":
        hemi = theta < 0.08
    elif half == "front":
        hemi = theta >= -0.08
    else:
        hemi = np.ones_like(enorm, dtype=bool)

    front_weight = 0.30 + 0.70 * np.clip(0.5 + 0.5 * np.sin(theta), 0.0, 1.0)
    right_bulge = 0.42 + 0.58 * np.clip(0.5 + 0.5 * np.cos(theta), 0.0, 1.0)
    w_norm = (front_thickness / max(1.0, rx)) * front_weight * right_bulge * max(0.18, 1.0 - erosion)

    u_ang = (theta + math.pi) / (2.0 * math.pi)
    rib = ((np.floor(u_ang * 16.0) % 2) == 0)
    r_out = 1.0
    r_in = r_out - w_norm + 0.06 * (1.0 - erosion) * rib.astype(np.float32)

    safe_box = (
        (xx >= MARGIN_LOGICAL + 1)
        & (xx <= LOGICAL_W - MARGIN_LOGICAL - 2)
        & (yy >= MARGIN_LOGICAL + 1)
        & (yy <= LOGICAL_H - MARGIN_LOGICAL - 2)
    )
    if erosion > 0.02:
        bayer_tile = BAYER4[yy % 4, xx % 4]
        keep = (right_bulge > erosion * 0.85) | (bayer_tile > erosion)
    else:
        keep = np.ones_like(safe_box)

    mask = hemi & safe_box & keep & (enorm >= r_in) & (enorm <= r_out)
    if not np.any(mask):
        return

    sel = hemi & safe_box & keep & (enorm > r_out) & (enorm <= r_out + (1.3 / max(1.0, rx)))
    arr[sel] = C_OUT_DARK

    v = np.clip((enorm - r_in) / np.maximum(0.02, r_out - r_in), 0.0, 1.0)
    arr[mask & (v < 0.30) & rib] = C_JADE_MID
    arr[mask & (v < 0.30) & (~rib)] = C_BRONZE_RIB
    arr[mask & (v >= 0.30) & (v < 0.62)] = C_MAGMA_AMBER
    arr[mask & (v >= 0.62) & (v < 0.85)] = C_MAGMA_YELLOW
    arr[mask & (v >= 0.85)] = C_FLASH_WHITE


def draw_world_anvil_shock_column_160(arr, impact_x, top_y=6, bot_y=114, half_w=6.5):
    """Blunt Rectangular World-Anvil Concussion Shock-Column + Magma-Jade Ground Fissure!"""
    ix = int(round(impact_x))
    ihw = int(math.ceil(half_w))
    for y in range(max(MARGIN_LOGICAL + 1, int(top_y)), min(LOGICAL_H - MARGIN_LOGICAL - 1, int(bot_y) + 1)):
        for dx in range(-ihw - 1, ihw + 2):
            adx = abs(dx)
            if adx <= half_w:
                if adx >= half_w - 0.8:
                    col = C_OUT_DARK
                elif adx <= half_w * 0.32:
                    col = C_FLASH_WHITE
                elif adx <= half_w * 0.64:
                    col = C_MAGMA_YELLOW
                else:
                    col = C_JADE_MID if (y // 4) % 2 == 0 else C_MAGMA_AMBER
                put_px_160(arr, ix + dx, y, col)
    fiss_w = int(half_w * 4.0)
    for dx in range(-fiss_w, fiss_w + 1):
        col = C_FLASH_WHITE if abs(dx) < fiss_w * 0.32 else (C_MAGMA_YELLOW if abs(dx) < fiss_w * 0.68 else C_JADE_MID)
        put_px_160(arr, ix + dx, bot_y, col)
        if abs(dx) < fiss_w * 0.56:
            put_px_160(arr, ix + dx, bot_y - 1, C_MAGMA_AMBER)


# ==============================================================================
# 6. DUAL-MODE CHARACTER FRAME COMPOSITOR -> 160x120 -> 320x240
# ==============================================================================

def render_keypose_frame_160(
    parts,
    stand_joints,
    keyposes,
    pose_name,
    pelvis_dx=0.0,
    pelvis_dy=0.0,
    body_tilt_deg=0.0,
    squash_x=1.0,
    squash_y=1.0,
    grip_rel_sh=(11.0, 4.0),
    weapon_deg=22.0,
    shaft_len=35.0,
    head_scale=1.0,
    weapon_layer="front",
    halo_phase=0.0,
    halo_boost=False,
    rune_phase=0.0,
    bend_l=1.0,
    bend_r=1.0,
    pre_fn=None,
    post_fn=None,
):
    kp = keyposes[pose_name]
    win_hi = Image.new("RGBA", (HI_W, HI_H), (0, 0, 0, 0))

    pelvis_src = kp["pelvis"]
    dst_pelvis_x = ANCHOR_HI_X + (pelvis_src[0] - kp["x_ref"]) * squash_x + pelvis_dx * S_HI
    dst_pelvis_y = ANCHOR_HI_Y + (pelvis_src[1] - kp["y_bot"]) * squash_y + pelvis_dy * S_HI

    def map_kp_pt(pt):
        dx = (pt[0] - pelvis_src[0]) * squash_x
        dy = (pt[1] - pelvis_src[1]) * squash_y
        return rot_pt((dst_pelvis_x + dx, dst_pelvis_y + dy), (dst_pelvis_x, dst_pelvis_y), body_tilt_deg)

    l_sh_hi = map_kp_pt(kp["l_sh"])
    r_sh_hi = map_kp_pt(kp["r_sh"])
    neck_hi = map_kp_pt(kp["neck"])
    mid_sh_hi = (0.5 * (l_sh_hi[0] + r_sh_hi[0]), 0.5 * (l_sh_hi[1] + r_sh_hi[1]))

    grip_hi = (
        mid_sh_hi[0] + grip_rel_sh[0] * S_HI,
        mid_sh_hi[1] + grip_rel_sh[1] * S_HI,
    )
    w_rad = math.radians(weapon_deg)
    w_ux, w_uy = math.cos(w_rad), math.sin(w_rad)
    l_target_hi = (grip_hi[0] - w_ux * 3.5 * S_HI, grip_hi[1] - w_uy * 3.5 * S_HI)
    r_target_hi = (grip_hi[0] + w_ux * 2.2 * S_HI, grip_hi[1] + w_uy * 2.2 * S_HI)

    paste_ik_arm_hi(win_hi, parts, stand_joints, "l", l_sh_hi, l_target_hi, bend_sign=bend_l)
    paste_rotated_part(
        win_hi,
        kp["crop"],
        pelvis_src,
        (dst_pelvis_x, dst_pelvis_y),
        deg=body_tilt_deg,
        squash_x=squash_x,
        squash_y=squash_y,
    )
    paste_ik_arm_hi(win_hi, parts, stand_joints, "r", r_sh_hi, r_target_hi, bend_sign=bend_r)

    body_160 = quantize_and_cluster_160x120(downsample_clean_160x120(win_hi))

    shift_y_160 = 0
    ys_b, _ = np.where(body_160[:, :, 3] > 128)
    if len(ys_b) > 0:
        cur_bot = int(ys_b.max())
        if cur_bot > ANCHOR_Y_120:
            shift_y_160 = ANCHOR_Y_120 - cur_bot
            shifted = np.zeros_like(body_160)
            for y in range(LOGICAL_H):
                ny = y + shift_y_160
                if MARGIN_LOGICAL <= ny < LOGICAL_H - MARGIN_LOGICAL:
                    shifted[ny] = body_160[y]
            body_160 = shifted

    frame = np.zeros((LOGICAL_H, LOGICAL_W, 4), dtype=np.uint8)
    neck_160 = (neck_hi[0] / S_HI, neck_hi[1] / S_HI + shift_y_160)
    grip_160 = (grip_hi[0] / S_HI, grip_hi[1] / S_HI + shift_y_160)

    # World-Forge 8-Cog Crucible Back-Halo behind shoulders
    draw_crucible_back_halo_160(
        frame, neck_160[0] - 4.0, neck_160[1] + 5.0, radius=19.0, rot_phase=halo_phase, boosted=halo_boost
    )

    if pre_fn is not None:
        pre_fn(frame, neck_160, grip_160)

    if weapon_layer == "behind":
        draw_worldbreaker_maul_160(
            frame, grip_160[0], grip_160[1], weapon_deg,
            shaft_len=shaft_len, head_scale=head_scale, rune_phase=rune_phase, draw_gauntlets=False,
        )

    mask_b = body_160[:, :, 3] > 128
    frame[mask_b] = body_160[mask_b]

    if weapon_layer != "behind":
        draw_worldbreaker_maul_160(
            frame, grip_160[0], grip_160[1], weapon_deg,
            shaft_len=shaft_len, head_scale=head_scale, rune_phase=rune_phase, draw_gauntlets=True,
        )

    if post_fn is not None:
        post_fn(frame, neck_160, grip_160)

    return frame


def render_stand_rig_frame_160(
    parts,
    stand_joints,
    pelvis_dx=0.0,
    pelvis_dy=0.0,
    torso_deg=0.0,
    head_deg=0.0,
    l_coat_deg=0.0,
    r_coat_deg=0.0,
    l_thigh_deg=0.0,
    l_shin_deg=0.0,
    l_foot_deg=0.0,
    r_thigh_deg=0.0,
    r_shin_deg=0.0,
    r_foot_deg=0.0,
    grip_rel_sh=(8.0, 9.0),
    weapon_deg=-32.0,
    shaft_len=35.0,
    head_scale=1.0,
    weapon_layer="front",
    weapon_abs_160=None,
    show_halo=True,
    halo_phase=0.0,
    halo_boost=False,
    rune_phase=0.0,
    bend_l=1.0,
    bend_r=1.0,
    lock_lowest_to_ground=False,
    clamp_floor_only=False,
    leg_bridge_r=None,
    pre_fn=None,
    post_fn=None,
):
    sj = stand_joints
    win_hi = Image.new("RGBA", (HI_W, HI_H), (0, 0, 0, 0))

    pelvis_src = sj["pelvis"]
    dst_pelvis = (
        ANCHOR_HI_X + (pelvis_src[0] - sj["x_ref"]) + pelvis_dx * S_HI,
        ANCHOR_HI_Y + (pelvis_src[1] - sj["y_bot"]) + pelvis_dy * S_HI,
    )

    def map_torso_pt(pt):
        rel = (dst_pelvis[0] + (pt[0] - pelvis_src[0]), dst_pelvis[1] + (pt[1] - pelvis_src[1]))
        return rot_pt(rel, dst_pelvis, torso_deg)

    neck_dst = map_torso_pt(sj["neck"])
    l_sh_dst = map_torso_pt(sj["l_sh"])
    r_sh_dst = map_torso_pt(sj["r_sh"])
    l_coat_dst = map_torso_pt(sj["l_coat"])
    r_coat_dst = map_torso_pt(sj["r_coat"])
    l_hip_dst = map_torso_pt(sj["l_hip"])
    r_hip_dst = map_torso_pt(sj["r_hip"])

    def pose_leg(side, hip_dst, th_deg, sh_deg):
        hip_s = sj[f"{side}_hip"]
        knee_s = sj[f"{side}_knee"]
        ank_s = sj[f"{side}_ankle"]
        knee_unrot = (hip_dst[0] + (knee_s[0] - hip_s[0]), hip_dst[1] + (knee_s[1] - hip_s[1]))
        knee_dst = rot_pt(knee_unrot, hip_dst, th_deg)
        ank_unrot = (knee_dst[0] + (ank_s[0] - knee_s[0]), knee_dst[1] + (ank_s[1] - knee_s[1]))
        ank_dst = rot_pt(ank_unrot, knee_dst, th_deg + sh_deg)
        return knee_dst, ank_dst

    l_knee_dst, l_ank_dst = pose_leg("l", l_hip_dst, l_thigh_deg, l_shin_deg)
    r_knee_dst, r_ank_dst = pose_leg("r", r_hip_dst, r_thigh_deg, r_shin_deg)

    mid_sh = (0.5 * (l_sh_dst[0] + r_sh_dst[0]), 0.5 * (l_sh_dst[1] + r_sh_dst[1]))
    if weapon_abs_160 is not None:
        grip_hi = (weapon_abs_160[0] * S_HI, weapon_abs_160[1] * S_HI)
    else:
        grip_hi = (mid_sh[0] + grip_rel_sh[0] * S_HI, mid_sh[1] + grip_rel_sh[1] * S_HI)

    w_rad = math.radians(weapon_deg)
    w_ux, w_uy = math.cos(w_rad), math.sin(w_rad)
    l_target_hi = (grip_hi[0] - w_ux * 3.2 * S_HI, grip_hi[1] - w_uy * 3.2 * S_HI)
    r_target_hi = (grip_hi[0] + w_ux * 2.0 * S_HI, grip_hi[1] + w_uy * 2.0 * S_HI)

    r_hip_br, r_knee_br = leg_bridge_r if leg_bridge_r is not None else (10, 8)

    paste_ik_arm_hi(win_hi, parts, sj, "l", l_sh_dst, l_target_hi, bend_sign=bend_l)
    draw_joint_bridge_hi(win_hi, l_hip_dst, l_knee_dst, r=r_hip_br)
    draw_joint_bridge_hi(win_hi, l_knee_dst, l_ank_dst, r=r_knee_br)
    paste_rotated_part(win_hi, parts["l_thigh"], sj["l_hip"], l_hip_dst, deg=l_thigh_deg)
    paste_rotated_part(win_hi, parts["l_shin"], sj["l_knee"], l_knee_dst, deg=l_thigh_deg + l_shin_deg)
    paste_rotated_part(win_hi, parts["l_foot"], sj["l_ankle"], l_ank_dst, deg=l_thigh_deg + l_shin_deg + l_foot_deg)
    paste_rotated_part(win_hi, parts["l_coat"], sj["l_coat"], l_coat_dst, deg=torso_deg + l_coat_deg)

    draw_joint_bridge_hi(win_hi, r_hip_dst, r_knee_dst, r=r_hip_br)
    draw_joint_bridge_hi(win_hi, r_knee_dst, r_ank_dst, r=r_knee_br)
    paste_rotated_part(win_hi, parts["r_thigh"], sj["r_hip"], r_hip_dst, deg=r_thigh_deg)
    paste_rotated_part(win_hi, parts["r_shin"], sj["r_knee"], r_knee_dst, deg=r_thigh_deg + r_shin_deg)
    paste_rotated_part(win_hi, parts["r_foot"], sj["r_ankle"], r_ank_dst, deg=r_thigh_deg + r_shin_deg + l_foot_deg * 0.0 + r_foot_deg)
    paste_rotated_part(win_hi, parts["r_coat"], sj["r_coat"], r_coat_dst, deg=torso_deg + r_coat_deg)

    paste_rotated_part(win_hi, parts["torso"], pelvis_src, dst_pelvis, deg=torso_deg)
    paste_rotated_part(win_hi, parts["head"], sj["neck"], neck_dst, deg=torso_deg + head_deg)
    paste_ik_arm_hi(win_hi, parts, sj, "r", r_sh_dst, r_target_hi, bend_sign=bend_r)

    body_160 = quantize_and_cluster_160x120(downsample_clean_160x120(win_hi))

    shift_y_160 = 0
    if lock_lowest_to_ground:
        ys_b, _ = np.where(body_160[:, :, 3] > 128)
        if len(ys_b) > 0:
            cur_bot = int(ys_b.max())
            shift_y_160 = ANCHOR_Y_120 - cur_bot
            if shift_y_160 != 0:
                shifted = np.zeros_like(body_160)
                for y in range(LOGICAL_H):
                    ny = y + shift_y_160
                    if MARGIN_LOGICAL <= ny < LOGICAL_H - MARGIN_LOGICAL:
                        shifted[ny] = body_160[y]
                body_160 = shifted
    elif clamp_floor_only:
        for y in range(ANCHOR_Y_120 + 1, LOGICAL_H):
            over = body_160[y, :, 3] > 128
            if np.any(over):
                empty_floor = body_160[ANCHOR_Y_120, :, 3] <= 128
                take = over & empty_floor
                body_160[ANCHOR_Y_120, take] = body_160[y, take]
                body_160[y, :, :] = 0

    frame = np.zeros((LOGICAL_H, LOGICAL_W, 4), dtype=np.uint8)
    neck_160 = (neck_dst[0] / S_HI, neck_dst[1] / S_HI + shift_y_160)
    grip_160 = (grip_hi[0] / S_HI, grip_hi[1] / S_HI + shift_y_160)

    if show_halo:
        draw_crucible_back_halo_160(
            frame, neck_160[0] - 4.0, neck_160[1] + 5.0, radius=19.0, rot_phase=halo_phase, boosted=halo_boost
        )

    if pre_fn is not None:
        pre_fn(frame, neck_160, grip_160)

    if weapon_layer == "behind":
        draw_worldbreaker_maul_160(
            frame, grip_160[0], grip_160[1], weapon_deg,
            shaft_len=shaft_len, head_scale=head_scale, rune_phase=rune_phase, draw_gauntlets=False,
        )

    mask_b = body_160[:, :, 3] > 128
    frame[mask_b] = body_160[mask_b]

    if weapon_layer == "front":
        draw_worldbreaker_maul_160(
            frame, grip_160[0], grip_160[1], weapon_deg,
            shaft_len=shaft_len, head_scale=head_scale, rune_phase=rune_phase, draw_gauntlets=True,
        )

    if post_fn is not None:
        post_fn(frame, neck_160, grip_160)

    return frame


# ==============================================================================
# 7. 10-ROW x 30-FRAME CHOREOGRAPHY (300 CELLS)
# ==============================================================================

def build_row0_idle(parts, sj):
    """Row 0: Forge-King Breathing + Rotating 8-Cog Crucible Halo + Heavy World-Maul."""
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 2.0 * math.pi
        bob_y = math.sin(ph) * 1.1
        torso_deg = math.sin(ph - 0.4) * 1.3

        def post_idle(arr, neck, _g, step=f, p=ph):
            # Rising forge ember sparks
            for m in range(2):
                mx = neck[0] - 10.0 + m * 22.0 + math.sin(p + m * 2.0) * 2.0
                my = neck[1] + 8.0 - ((step + m * 9) % 18)
                put_px_160(arr, mx, my, C_MAGMA_YELLOW if (step + m) % 2 == 0 else C_JADE_LIT)

        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=math.sin(ph) * 0.4,
            pelvis_dy=bob_y,
            torso_deg=torso_deg,
            head_deg=-torso_deg * 0.5,
            l_coat_deg=2.0 + math.sin(ph - 0.6) * 2.5,
            r_coat_deg=-1.5 + math.sin(ph - 1.0) * 2.5,
            grip_rel_sh=(9.5, 8.5 + math.sin(ph - 0.3) * 0.9),
            weapon_deg=-28.0 + math.sin(ph - 0.5) * 2.0,
            shaft_len=36.0,
            weapon_layer="front",
            halo_phase=ph,
            rune_phase=ph * 2.0,
            post_fn=post_idle,
        ))
    return frames


def build_row1_walk(parts, sj):
    """
    Row 1: Cohesive Earth-Shaking Dwarven Forge-March (2 Seamless Cycles / 30 Frames).
    Maintains continuous front-ready World-Maul carry & grounded Forge-King posture
    from Row 0 IDLE (zero 180-deg weapon flip, zero dynamic ys_b.max() vertical jitter,
    compact Dwarven stride & synced tasset sway).
    """
    frames = []
    for f in range(30):
        ph = (f / 15.0) * 2.0 * math.pi
        ph30 = (f / 30.0) * 2.0 * math.pi
        s1 = math.sin(ph)
        s2 = -s1
        l_lift = max(0.0, math.cos(ph))
        r_lift = max(0.0, -math.cos(ph))
        bob_y = 0.45 - abs(math.cos(ph)) * 1.05

        def post_walk(arr, neck, _g, step=f, p=ph30):
            for m in range(2):
                mx = neck[0] - 11.0 + m * 20.0 + math.sin(p + m * 2.0) * 2.0
                my = neck[1] + 8.0 - ((step + m * 9) % 18)
                put_px_160(arr, mx, my, C_MAGMA_YELLOW if (step + m) % 2 == 0 else C_JADE_LIT)

        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=1.2 + math.sin(ph * 2.0) * 0.4,
            pelvis_dy=bob_y,
            torso_deg=2.4 + math.sin(ph * 2.0) * 0.8,
            head_deg=-1.4,
            l_coat_deg=2.5 + s1 * 2.2,
            r_coat_deg=-1.0 + s2 * 1.8,
            l_thigh_deg=-2.0 - s1 * 7.0 - l_lift * 2.4,
            l_shin_deg=1.5 + l_lift * 9.2 + max(0.0, s1) * 1.8,
            l_foot_deg=l_lift * 3.5 - s1 * 2.0,
            r_thigh_deg=2.0 - s2 * 7.0 - r_lift * 2.4,
            r_shin_deg=1.5 + r_lift * 9.2 + max(0.0, s2) * 1.8,
            r_foot_deg=r_lift * 3.5 - s2 * 2.0,
            grip_rel_sh=(9.4 + s1 * 1.0, 8.3 + math.sin(ph * 2.0) * 0.6),
            weapon_deg=-26.5 + s1 * 3.4,
            shaft_len=36.0,
            weapon_layer="front",
            halo_phase=ph30,
            rune_phase=ph30 * 2.0,
            lock_lowest_to_ground=False,
            clamp_floor_only=True,
            leg_bridge_r=(4, 3),
            post_fn=post_walk,
        ))
    return frames


def build_row2_auto_attack(parts, sj, keyposes):
    """
    Row 2: AUTO_ATTACK ([[60, 8], [68, 7], [75, 8], [83, 7]] = 30 Frames)
    QUARTET OF THE WORLD-MAUL (ZERO Sword Crescents -- 100% Blunt Maul Shock-Fans!):
      - V0 (F00..F07): Overhead Earth-Crush Smash Smear (F03 snap)
      - V1 (F08..F14): Rising Volcanic Uppercut Maul Smear (F09 snap)
      - V2 (F15..F22): 2.5D Baseball-Swing Horizontal Concussion Ring (F17/F18 2-hit)
      - V3 (F23..F29): High Jump -> Meteoric World-Anvil Ground-Fissure Slam (F25 snap)
    """
    frames = []

    # ---------------- BEAT 1 (V0): F00..F07 (Frames 60..67) ----------------
    coil_specs = [
        (-2.0, -1.0, -4.0, (-3.5, -4.0), -134.0, 0.2),
        (-4.0, -2.5, -7.0, (-5.0, -5.5), -142.0, 0.9),
        (-5.5, -4.0, -9.5, (-6.0, -6.5), -148.0, 1.6),
    ]
    for idx, (pdx, pdy, tilt, gr, wdeg, hph) in enumerate(coil_specs):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K1_COIL",
            pelvis_dx=pdx, pelvis_dy=pdy, body_tilt_deg=tilt,
            grip_rel_sh=gr, weapon_deg=wdeg, shaft_len=31.0,
            halo_phase=hph, halo_boost=(idx == 2), rune_phase=hph,
            bend_l=-1.0, bend_r=-1.0,
        ))

    # F03: 1-FRAME SNAP OVERHEAD EARTH-CRUSH BLUNT MAUL SHOCK-SMEAR FAN!
    def post_b1_snap(arr, _n, _g):
        draw_blunt_maul_shock_smear_160(
            arr, cx=80.0, cy=62.0,
            tail_deg=-150.0, lead_deg=26.0, sweep_dir=1,
            rx_outer=72.0, ry_outer=50.0, head_thickness=30.0,
            n_ribs=6, phase=0.1,
        )
        draw_forge_spark_burst_160(arr, impact_x=130.0, impact_y=112.0, spread=24.0, progress=0.2, count=9)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=10.5, pelvis_dy=1.5, body_tilt_deg=7.0,
        grip_rel_sh=(14.5, 4.5), weapon_deg=23.0, shaft_len=37.0, head_scale=1.08,
        halo_phase=2.4, halo_boost=True, rune_phase=2.5, post_fn=post_b1_snap,
    ))

    # F04: Blunt shock-rib erosion 1
    def post_b1_erode1(arr, _n, _g):
        draw_blunt_maul_shock_smear_160(
            arr, cx=79.0, cy=64.0,
            tail_deg=-58.0, lead_deg=28.0, sweep_dir=1,
            rx_outer=70.0, ry_outer=47.0, head_thickness=19.0,
            n_ribs=4, phase=0.4,
        )
        draw_forge_spark_burst_160(arr, impact_x=132.0, impact_y=113.0, spread=26.0, progress=0.55, count=7)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=11.0, pelvis_dy=2.2, body_tilt_deg=8.0,
        grip_rel_sh=(15.0, 5.5), weapon_deg=26.0, shaft_len=37.0, head_scale=1.06,
        halo_phase=3.1, rune_phase=3.2, post_fn=post_b1_erode1,
    ))

    # F05: Blunt impact afterglow
    def post_b1_erode2(arr, _n, _g):
        draw_blunt_maul_shock_smear_160(
            arr, cx=78.0, cy=65.0,
            tail_deg=-6.0, lead_deg=28.0, sweep_dir=1,
            rx_outer=67.0, ry_outer=45.0, head_thickness=11.0,
            n_ribs=3, phase=0.7,
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=11.0, pelvis_dy=2.2, body_tilt_deg=7.5,
        grip_rel_sh=(15.0, 5.8), weapon_deg=27.0, shaft_len=37.0,
        halo_phase=3.8, rune_phase=3.9, post_fn=post_b1_erode2,
    ))

    # F06..F07: Heavy planted maul hold priming Beat 2
    for sub_i, (pdx, wdeg, hph) in enumerate([
        (10.2, 26.0, 4.5),
        (9.4,  24.5, 5.2),
    ]):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K2_LUNGE",
            pelvis_dx=pdx, pelvis_dy=1.6 - sub_i * 0.4, body_tilt_deg=6.5 - sub_i * 0.5,
            grip_rel_sh=(14.5, 5.5), weapon_deg=wdeg, shaft_len=37.0,
            halo_phase=hph, rune_phase=4.5 + sub_i * 0.7,
        ))

    # ---------------- BEAT 2 (V1): F08..F14 (Frames 68..74) ----------------
    # F08: Deep floor-scoop compression directly from F07
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=8.5, pelvis_dy=3.2, body_tilt_deg=9.5,
        grip_rel_sh=(13.5, 7.5), weapon_deg=32.0, shaft_len=36.0,
        halo_phase=0.4, rune_phase=0.5,
    ))

    # F09: 1-FRAME RISING VOLCANIC UPPERCUT BLUNT MAUL SHOCK-FAN!
    def post_b2_snap(arr, _n, _g):
        draw_blunt_maul_shock_smear_160(
            arr, cx=80.0, cy=60.0,
            tail_deg=34.0, lead_deg=-124.0, sweep_dir=-1,
            rx_outer=73.0, ry_outer=51.0, head_thickness=29.0,
            n_ribs=6, phase=0.2,
        )
        draw_forge_spark_burst_160(arr, impact_x=104.0, impact_y=112.0, spread=20.0, progress=0.28, count=7)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=8.0, pelvis_dy=-1.0, body_tilt_deg=-4.5,
        grip_rel_sh=(6.0, -8.5), weapon_deg=-118.0, shaft_len=32.0, head_scale=1.08,
        halo_phase=1.4, halo_boost=True, rune_phase=1.6, bend_l=-1.0, bend_r=-1.0,
        post_fn=post_b2_snap,
    ))

    # F10: Upper blunt shock-fan erosion 1
    def post_b2_erode1(arr, _n, _g):
        draw_blunt_maul_shock_smear_160(
            arr, cx=78.0, cy=58.0,
            tail_deg=-34.0, lead_deg=-128.0, sweep_dir=-1,
            rx_outer=70.0, ry_outer=49.0, head_thickness=18.0,
            n_ribs=4, phase=0.5,
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=8.5, pelvis_dy=-2.0, body_tilt_deg=-5.5,
        grip_rel_sh=(5.0, -9.5), weapon_deg=-122.0, shaft_len=32.0,
        halo_phase=2.2, rune_phase=2.4, bend_l=-1.0, bend_r=-1.0, post_fn=post_b2_erode1,
    ))

    # F11: Upper blunt shock-fan erosion 2
    def post_b2_erode2(arr, _n, _g):
        draw_blunt_maul_shock_smear_160(
            arr, cx=76.0, cy=57.0,
            tail_deg=-84.0, lead_deg=-130.0, sweep_dir=-1,
            rx_outer=66.0, ry_outer=47.0, head_thickness=10.0,
            n_ribs=3, phase=0.8,
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=8.2, pelvis_dy=-1.8, body_tilt_deg=-5.0,
        grip_rel_sh=(4.5, -9.5), weapon_deg=-124.0, shaft_len=32.0,
        halo_phase=3.0, rune_phase=3.1, bend_l=-1.0, bend_r=-1.0, post_fn=post_b2_erode2,
    ))

    # F12..F14: Roaring Forge-King high guard priming Beat 3
    for sub_i, (pdx, pdy, tilt, wdeg, hph) in enumerate([
        (7.6, -1.0, -3.5, -120.0, 3.8),
        (7.0, -0.3, -2.0, -114.0, 4.5),
        (6.0,  0.2, -0.5, -108.0, 5.2),
    ]):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=pdx, pelvis_dy=pdy, body_tilt_deg=tilt,
            grip_rel_sh=(5.5, -8.5 + sub_i * 0.8), weapon_deg=wdeg, shaft_len=32.0,
            halo_phase=hph, rune_phase=3.8 + sub_i * 0.7, bend_l=-1.0, bend_r=-1.0,
        ))

    # ---------------- BEAT 3 (V2): F15..F22 (Frames 75..82) ----------------
    # F15..F16: Batter's-box rear-shoulder horizontal coil
    for sub_i, (pdx, sqx, wdeg, hph) in enumerate([
        (4.0, 0.94, 162.0, 0.4),
        (2.5, 0.90, 174.0, 1.2),
    ]):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K1_COIL",
            pelvis_dx=pdx, pelvis_dy=1.5 + sub_i * 0.5, body_tilt_deg=-3.0,
            squash_x=sqx, squash_y=1.0,
            grip_rel_sh=(-4.5, -1.0), weapon_deg=wdeg, shaft_len=31.0,
            halo_phase=hph, rune_phase=hph, bend_l=-1.0, bend_r=1.0,
        ))

    # F17: 1-FRAME 2.5D BASEBALL-SWING HORIZONTAL CONCUSSION RING (HIT 1)!
    def pre_b3_snap(arr, _n, _g):
        draw_baseball_concussion_ring_160(
            arr, cx=80.0, cy=69.0, rx=73.0, ry=23.0, tilt_deg=-8.0, front_thickness=30.0, half="back", erosion=0.0
        )

    def post_b3_snap(arr, _n, _g):
        draw_baseball_concussion_ring_160(
            arr, cx=80.0, cy=69.0, rx=73.0, ry=23.0, tilt_deg=-8.0, front_thickness=34.0, half="front", erosion=0.0
        )
        draw_forge_spark_burst_160(arr, impact_x=136.0, impact_y=72.0, spread=20.0, progress=0.2, count=8)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=11.5, pelvis_dy=1.0, body_tilt_deg=7.5,
        grip_rel_sh=(15.0, 0.5), weapon_deg=-2.0, shaft_len=37.0, head_scale=1.08,
        halo_phase=2.4, halo_boost=True, rune_phase=2.5,
        pre_fn=pre_b3_snap, post_fn=post_b3_snap,
    ))

    # F18: Secondary Reverberation Concussion Ring (HIT 2)!
    def pre_b3_rev(arr, _n, _g):
        draw_baseball_concussion_ring_160(
            arr, cx=79.0, cy=68.0, rx=69.0, ry=19.0, tilt_deg=9.0, front_thickness=16.0, half="back", erosion=0.24
        )

    def post_b3_rev(arr, _n, _g):
        draw_baseball_concussion_ring_160(
            arr, cx=79.0, cy=68.0, rx=69.0, ry=19.0, tilt_deg=9.0, front_thickness=18.0, half="front", erosion=0.24
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=10.8, pelvis_dy=0.5, body_tilt_deg=3.5,
        grip_rel_sh=(14.0, 2.0), weapon_deg=11.0, shaft_len=37.0,
        halo_phase=3.2, rune_phase=3.3, pre_fn=pre_b3_rev, post_fn=post_b3_rev,
    ))

    # F19: Concussion ring dissipating
    def post_b3_erode(arr, _n, _g):
        draw_baseball_concussion_ring_160(
            arr, cx=78.0, cy=69.0, rx=65.0, ry=15.0, tilt_deg=7.0, front_thickness=10.0, half="front", erosion=0.60
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=10.0, pelvis_dy=1.0, body_tilt_deg=4.0,
        grip_rel_sh=(13.5, 3.0), weapon_deg=16.0, shaft_len=36.0,
        halo_phase=4.0, rune_phase=4.0, post_fn=post_b3_erode,
    ))

    # F20..F22: Deep Dwarven squat coil loading legs for Beat 4 Meteor Leap!
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=8.0, pelvis_dy=2.2, body_tilt_deg=7.5,
        grip_rel_sh=(12.0, 5.0), weapon_deg=22.0, shaft_len=36.0,
        halo_phase=4.7, rune_phase=4.7,
    ))
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=5.5, pelvis_dy=3.4, body_tilt_deg=10.0,
        grip_rel_sh=(-3.5, 6.0), weapon_deg=150.0, shaft_len=32.0,
        weapon_layer="behind", halo_phase=5.4, rune_phase=5.4,
    ))
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K1_COIL",
        pelvis_dx=3.5, pelvis_dy=2.2, body_tilt_deg=5.0,
        grip_rel_sh=(-4.5, 2.0), weapon_deg=156.0, shaft_len=32.0,
        weapon_layer="behind", halo_phase=6.1, rune_phase=6.1,
    ))

    # ---------------- BEAT 4 (V3): F23..F29 (Frames 83..89) ----------------
    # F23..F24: High Dwarven Meteor Leap hoisting World-Maul high above bull-horns!
    for sub_i, (pdx, pdy, tilt, wdeg, hph) in enumerate([
        (6.0, -17.0, -5.5, -142.0, 0.8),
        (8.0, -21.0, -9.0, -150.0, 1.7),
    ]):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K4_LEAP",
            pelvis_dx=pdx, pelvis_dy=pdy, body_tilt_deg=tilt,
            grip_rel_sh=(-3.5, -5.5), weapon_deg=wdeg, shaft_len=29.0,
            halo_phase=hph, halo_boost=True, rune_phase=hph,
            bend_l=-1.0, bend_r=-1.0,
        ))

    # F25: 1-FRAME METEORIC WORLD-ANVIL GROUND-FISSURE BLUNT SLAM SMEAR!
    def post_b4_slam(arr, _n, _g):
        draw_world_anvil_shock_column_160(arr, impact_x=130.0, top_y=6, bot_y=114, half_w=5.8)
        draw_blunt_maul_shock_smear_160(
            arr, cx=78.0, cy=58.0,
            tail_deg=-154.0, lead_deg=32.0, sweep_dir=1,
            rx_outer=75.0, ry_outer=55.0, head_thickness=33.0,
            n_ribs=7, phase=0.1,
        )
        draw_forge_spark_burst_160(arr, impact_x=130.0, impact_y=112.0, spread=28.0, progress=0.15, count=11)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=12.0, pelvis_dy=2.2, body_tilt_deg=8.5,
        grip_rel_sh=(15.0, 5.0), weapon_deg=25.0, shaft_len=37.0, head_scale=1.10,
        halo_phase=2.8, halo_boost=True, rune_phase=2.9, post_fn=post_b4_slam,
    ))

    # F26: World-Anvil shock-rib erosion
    def post_b4_erode1(arr, _n, _g):
        draw_blunt_maul_shock_smear_160(
            arr, cx=78.0, cy=61.0,
            tail_deg=-60.0, lead_deg=28.0, sweep_dir=1,
            rx_outer=71.0, ry_outer=50.0, head_thickness=20.0,
            n_ribs=5, phase=0.42,
        )
        draw_forge_spark_burst_160(arr, impact_x=130.0, impact_y=113.0, spread=28.0, progress=0.5, count=8)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=12.5, pelvis_dy=2.8, body_tilt_deg=9.0,
        grip_rel_sh=(15.2, 5.8), weapon_deg=27.0, shaft_len=37.0,
        halo_phase=3.6, rune_phase=3.7, post_fn=post_b4_erode1,
    ))

    # F27: Floor shock-bar afterglow
    def post_b4_erode2(arr, _n, _g):
        draw_blunt_maul_shock_smear_160(
            arr, cx=77.0, cy=63.0,
            tail_deg=-8.0, lead_deg=27.0, sweep_dir=1,
            rx_outer=67.0, ry_outer=47.0, head_thickness=11.0,
            n_ribs=3, phase=0.72,
        )
        draw_forge_spark_burst_160(arr, impact_x=132.0, impact_y=113.0, spread=30.0, progress=0.82, count=6)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=11.5, pelvis_dy=2.0, body_tilt_deg=7.5,
        grip_rel_sh=(14.8, 5.5), weapon_deg=26.0, shaft_len=37.0,
        halo_phase=4.4, rune_phase=4.5, post_fn=post_b4_erode2,
    ))

    # F28..F29: Forge-King power recovery
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=8.0, pelvis_dy=1.0, body_tilt_deg=3.0,
        grip_rel_sh=(12.0, 5.0), weapon_deg=18.0, shaft_len=36.0,
        halo_phase=5.2, rune_phase=5.2,
    ))
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=4.0, pelvis_dy=0.0, body_tilt_deg=1.0,
        grip_rel_sh=(10.0, 6.5), weapon_deg=-12.0, shaft_len=36.0,
        halo_phase=5.9, rune_phase=5.9,
    ))

    assert len(frames) == 30
    return frames


def build_row3_skill(parts, sj, keyposes):
    """Row 3: SKILL -- WORLD-ANVIL CATACLYSM (Altar Plant Slam -> Anvil Cannonball Battering Swing, 30 Frames)."""
    frames = []
    # F00..F03: Overhead Altar hoist
    for f in range(4):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K1_COIL",
            pelvis_dx=-2.0 - f * 1.0, pelvis_dy=-f * 0.6, body_tilt_deg=-4.0 - f * 1.6,
            grip_rel_sh=(-4.5, -4.5), weapon_deg=-138.0 - f * 4.0, shaft_len=31.0,
            halo_phase=f * 0.8, halo_boost=(f >= 2), rune_phase=f * 0.8,
            bend_l=-1.0, bend_r=-1.0,
        ))

    # F04..F10: Phase 1 -- Gravity Altar Slam!
    for sub in range(7):
        def post_altar(arr, _n, _g, s=sub):
            if s <= 2:
                tails = [-148.0, -56.0, -8.0]
                thicks = [28.0, 18.0, 10.0]
                draw_blunt_maul_shock_smear_160(
                    arr, cx=80.0, cy=62.0, tail_deg=tails[s], lead_deg=26.0, sweep_dir=1,
                    rx_outer=72.0 - s * 2.0, ry_outer=49.0, head_thickness=thicks[s],
                    n_ribs=6 - s, phase=s * 0.3,
                )
                draw_forge_spark_burst_160(arr, impact_x=128.0, impact_y=112.0, spread=24.0, progress=s * 0.35 + 0.15, count=7)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K2_LUNGE",
            pelvis_dx=10.5 - max(0, sub - 3) * 1.2, pelvis_dy=1.8, body_tilt_deg=7.5,
            grip_rel_sh=(14.5, 5.0), weapon_deg=24.0 + min(3, sub) * 1.2, shaft_len=37.0,
            halo_phase=2.5 + sub * 0.6, rune_phase=3.0 + sub * 0.7, post_fn=post_altar,
        ))

    # F11..F13: Rear-shoulder Cannonball Battering Coil
    for sub in range(3):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K1_COIL",
            pelvis_dx=3.0 - sub * 1.5, pelvis_dy=1.5, body_tilt_deg=-4.0 - sub * 2.0,
            grip_rel_sh=(-5.0, -1.0), weapon_deg=164.0 + sub * 5.0, shaft_len=31.0,
            halo_phase=sub * 0.9, halo_boost=True, rune_phase=sub * 0.9, bend_l=-1.0, bend_r=1.0,
        ))

    # F14..F23: Phase 2 -- ANVIL CANNONBALL HORIZONTAL CONCUSSION DRIVE!
    for sub in range(10):
        def pre_can(arr, _n, _g, s=sub):
            if s <= 2:
                draw_baseball_concussion_ring_160(
                    arr, cx=81.0, cy=68.0, rx=74.0 - s * 3.0, ry=22.0, tilt_deg=-7.0 + s * 6.0,
                    front_thickness=26.0 - s * 6.0, half="back", erosion=0.25 * s,
                )
        def post_can(arr, _n, _g, s=sub):
            if s <= 3:
                draw_baseball_concussion_ring_160(
                    arr, cx=81.0, cy=68.0, rx=74.0 - s * 3.0, ry=22.0, tilt_deg=-7.0 + s * 6.0,
                    front_thickness=30.0 - s * 6.5, half="front", erosion=0.25 * s,
                )
                draw_forge_spark_burst_160(arr, impact_x=134.0, impact_y=72.0, spread=24.0, progress=s * 0.25 + 0.15, count=7)
        pose_nm = "K2_LUNGE" if sub <= 4 else "K3_RISE"
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, pose_nm,
            pelvis_dx=12.0 - max(0, sub - 4) * 0.8, pelvis_dy=1.2, body_tilt_deg=7.5 if sub <= 4 else 3.0,
            grip_rel_sh=(15.0, 1.5 + min(4, sub) * 0.8), weapon_deg=-2.0 + min(5, sub) * 3.5, shaft_len=37.0, head_scale=1.08,
            halo_phase=2.0 + sub * 0.7, halo_boost=(sub <= 3), rune_phase=sub * 0.8,
            pre_fn=pre_can, post_fn=post_can,
        ))

    # F24..F29: Forge-King recovery
    for sub in range(6):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=7.5 - sub * 1.2, pelvis_dy=0.8 - sub * 0.15, body_tilt_deg=3.0 - sub * 0.5,
            grip_rel_sh=(11.5 - sub * 0.4, 5.5), weapon_deg=14.0 - sub * 6.5, shaft_len=36.0,
            halo_phase=sub * 0.8, rune_phase=sub * 0.7,
        ))

    assert len(frames) == 30
    return frames


def build_row4_ultimate(parts, sj, keyposes):
    """
    Row 4: DUAL ULTIMATE TIMELINE (30 Frames, 120..149)
      - F00..F05 (120..125): Batter's Box Rear-Shoulder Mjolnir Windup (WORLD-BREAKER HOME RUN Phase 1)
      - F06..F14 (126..134): Chest-High Horizontal Baseball-Bat Home-Run Swing + Blunt Sonic Ring (Phase 2)
      - F15..F16 (135..136): Deep Floor-Scoop Squat Coil (CONTINENTAL SUNDER Beat 1 & Jump Squat)
      - F17..F19 (137..139): Grounded 2H Rising Mjolnir Sky-Uppercut + Blunt Magma Fan (Beat 2)
      - F20..F23 (140..143): K4_LEAP Super-Leap Ascent & Apex Crown-Hoist (Beat 3)
      - F24..F26 (144..146): Steep Downward Meteor-Spike Jackknife Plunge (Beat 4)
      - F27..F29 (147..149): Cataclysmic Ground-Smash Crater Impact & Sovereign Rise (Beat 5)!
    """
    frames = []

    # F00..F05: Batter's Box Rear-Shoulder Mjolnir Windup
    for f in range(6):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K1_COIL",
            pelvis_dx=-1.5 - f * 0.9, pelvis_dy=1.0, body_tilt_deg=-3.0 - f * 1.2,
            grip_rel_sh=(-4.5 - f * 0.3, -1.5), weapon_deg=158.0 + f * 3.2, shaft_len=31.0,
            halo_phase=f * 0.8, halo_boost=(f >= 3), rune_phase=f * 0.9,
            bend_l=-1.0, bend_r=1.0,
        ))

    # F06..F14: CRACK OF THE BAT! Horizontal Baseball-Bat Home-Run Swing!
    for sub in range(9):
        def pre_hr(arr, _n, _g, s=sub):
            if s <= 3:
                draw_baseball_concussion_ring_160(
                    arr, cx=81.0, cy=67.0, rx=75.0 - s * 2.5, ry=23.0, tilt_deg=-5.0 + s * 4.0,
                    front_thickness=30.0 - s * 6.0, half="back", erosion=0.22 * s,
                )
        def post_hr(arr, _n, _g, s=sub):
            if s <= 3:
                draw_baseball_concussion_ring_160(
                    arr, cx=81.0, cy=67.0, rx=75.0 - s * 2.5, ry=23.0, tilt_deg=-5.0 + s * 4.0,
                    front_thickness=34.0 - s * 6.5, half="front", erosion=0.22 * s,
                )
                draw_forge_spark_burst_160(arr, impact_x=136.0, impact_y=70.0, spread=26.0, progress=s * 0.25 + 0.15, count=9)
        pose_nm = "K2_LUNGE" if sub <= 3 else "K3_RISE"
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, pose_nm,
            pelvis_dx=12.5 - max(0, sub - 4) * 1.4, pelvis_dy=1.0, body_tilt_deg=7.5 if sub <= 3 else 2.5,
            grip_rel_sh=(15.0 - max(0, sub - 5) * 0.8, 1.0 + min(4, sub) * 0.7),
            weapon_deg=-2.0 + min(4, sub) * 3.0 - max(0, sub - 5) * 6.0,
            shaft_len=37.0, head_scale=1.10,
            halo_phase=2.0 + sub * 0.8, halo_boost=(sub <= 4), rune_phase=sub * 0.9,
            pre_fn=pre_hr, post_fn=post_hr,
        ))

    # F15..F16: Deep Floor-Scoop Squat Coil (Continental Sunder Beat 1 & Jump Squat)
    for sub in range(2):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K2_LUNGE",
            pelvis_dx=6.5 - sub * 1.0, pelvis_dy=3.5 + sub * 0.8, body_tilt_deg=10.5 + sub * 1.5,
            grip_rel_sh=(13.0, 7.5 + sub * 0.5), weapon_deg=32.0 + sub * 3.0, shaft_len=36.0,
            halo_phase=sub * 1.1, halo_boost=True, rune_phase=sub * 1.2,
        ))

    # F17..F19: Grounded 2H Rising Mjolnir Sky-Uppercut (Continental Sunder Beat 2)
    for sub in range(3):
        def post_up(arr, _n, _g, s=sub):
            tails = [34.0, -32.0, -82.0]
            thicks = [31.0, 20.0, 11.0]
            draw_blunt_maul_shock_smear_160(
                arr, cx=80.0, cy=59.0, tail_deg=tails[s], lead_deg=-124.0, sweep_dir=-1,
                rx_outer=74.0 - s * 2.0, ry_outer=51.0, head_thickness=thicks[s],
                n_ribs=6 - s, phase=0.2 + s * 0.3,
            )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=8.5, pelvis_dy=-1.5, body_tilt_deg=-5.0,
            grip_rel_sh=(5.5, -9.0), weapon_deg=-120.0 - sub * 2.0, shaft_len=32.0, head_scale=1.10,
            halo_phase=1.5 + sub * 0.9, halo_boost=True, rune_phase=2.0 + sub * 0.9,
            bend_l=-1.0, bend_r=-1.0, post_fn=post_up,
        ))

    # F20..F23: K4_LEAP Super-Leap Ascent & Apex Crown-Hoist (Continental Sunder Beat 3)
    for sub in range(4):
        pdy = [-12.0, -18.0, -21.0, -22.0][sub]
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K4_LEAP",
            pelvis_dx=6.5 + sub * 0.5, pelvis_dy=pdy, body_tilt_deg=-6.0 - sub * 0.8,
            grip_rel_sh=(-3.0, -5.5), weapon_deg=-140.0 - sub * 3.0, shaft_len=29.0, head_scale=1.10,
            halo_phase=sub * 1.0, halo_boost=True, rune_phase=sub * 1.1,
            bend_l=-1.0, bend_r=-1.0,
        ))

    # F24..F26: Steep Downward Meteor-Spike Plunge (Continental Sunder Beat 4)
    for sub in range(3):
        pdy = [-16.0, -10.0, -4.0][sub]
        def post_plunge(arr, _n, _g, s=sub):
            tails = [-150.0, -110.0, -70.0]
            leads = [-35.0, 8.0, 26.0]
            draw_blunt_maul_shock_smear_160(
                arr, cx=79.0, cy=56.0 + s * 2.0, tail_deg=tails[s], lead_deg=leads[s], sweep_dir=1,
                rx_outer=74.0, ry_outer=52.0, head_thickness=26.0 + s * 3.0,
                n_ribs=6, phase=s * 0.25,
            )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K4_LEAP",
            pelvis_dx=9.5 + sub * 1.0, pelvis_dy=pdy, body_tilt_deg=4.0 + sub * 2.5,
            grip_rel_sh=(12.5 + sub * 1.0, 2.0 + sub * 1.5), weapon_deg=-25.0 + sub * 24.0,
            shaft_len=36.0, head_scale=1.10,
            halo_phase=4.0 + sub * 0.9, halo_boost=True, rune_phase=sub * 1.0,
            post_fn=post_plunge,
        ))

    # F27..F29: Cataclysmic Ground-Smash Crater Impact & Sovereign Rise (Continental Sunder Beat 5)
    for sub in range(3):
        def post_crater(arr, _n, _g, s=sub):
            if s == 0:
                draw_world_anvil_shock_column_160(arr, impact_x=132.0, top_y=4, bot_y=114, half_w=6.8)
                draw_blunt_maul_shock_smear_160(
                    arr, cx=79.0, cy=58.0, tail_deg=-156.0, lead_deg=32.0, sweep_dir=1,
                    rx_outer=76.0, ry_outer=56.0, head_thickness=35.0, n_ribs=7, phase=0.1,
                )
            elif s == 1:
                draw_blunt_maul_shock_smear_160(
                    arr, cx=79.0, cy=62.0, tail_deg=-42.0, lead_deg=28.0, sweep_dir=1,
                    rx_outer=71.0, ry_outer=50.0, head_thickness=18.0, n_ribs=4, phase=0.4,
                )
            draw_forge_spark_burst_160(arr, impact_x=132.0, impact_y=112.0, spread=32.0, progress=s * 0.38 + 0.15, count=10 - s * 2)

        pose_nm = "K2_LUNGE" if sub <= 1 else "K3_RISE"
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, pose_nm,
            pelvis_dx=12.5 - sub * 3.0, pelvis_dy=2.5 - sub * 1.0, body_tilt_deg=8.5 - sub * 3.0,
            grip_rel_sh=(15.0 - sub * 1.5, 5.5), weapon_deg=26.0 - sub * 10.0,
            shaft_len=37.0, head_scale=1.10,
            halo_phase=sub * 1.1, halo_boost=(sub == 0), rune_phase=sub * 1.0,
            post_fn=post_crater,
        ))

    assert len(frames) == 30
    return frames


def build_row5_death(parts, sj):
    """Row 5: HURT ([150, 6]) & DEATH ([150, 30]) -- Recoil -> Kneel -> Horizontal Prone Rest."""
    frames = []
    for f in range(30):
        if f < 6:
            t = f / 5.0
            recoil = math.sin(t * math.pi * 0.85)
            pdx = -recoil * 5.0 - f * 0.3
            pdy = recoil * 2.0
            tdeg = -recoil * 14.0 - 2.0
            hdeg = -recoil * 9.0
            l_th, l_sh = 10.0 * recoil, 14.0 * recoil
            r_th, r_sh = -8.0 * recoil, 18.0 * recoil
            wdeg = -34.0 - recoil * 22.0
            gr = (7.5 - recoil * 3.0, 4.0 - recoil * 3.0)
            w_abs = None
            show_h = True
        elif f < 14:
            u = (f - 6) / 7.0
            pdx = -4.5 - u * 3.0
            pdy = 2.0 + u * 17.0
            tdeg = -12.0 + u * 44.0
            hdeg = -8.0 + u * 20.0
            l_th, l_sh = -30.0 * u, 54.0 * u
            r_th, r_sh = -24.0 * u, 50.0 * u
            wdeg = -40.0 + u * 60.0
            gr = (8.0 + u * 4.0, 6.0 + u * 5.0)
            w_abs = None
            show_h = (u < 0.6)
        elif f < 22:
            u = (f - 14) / 7.0
            pdx = -7.5 + u * 8.5
            pdy = 19.0 + u * 14.0
            tdeg = 32.0 + u * 55.0
            hdeg = 12.0 - u * 8.0
            l_th, l_sh = -30.0 * (1.0 - 0.75 * u), 54.0 * (1.0 - 0.75 * u)
            r_th, r_sh = -24.0 * (1.0 - 0.75 * u), 50.0 * (1.0 - 0.75 * u)
            wdeg = 20.0 * (1.0 - u) + 0.0 * u
            gr = (12.0, 11.0)
            w_abs = (74.0 + u * 10.0, 102.0 + u * 3.0)
            show_h = False
        else:
            u = (f - 21) / 8.0
            pdx = 1.0 + u * 1.6
            pdy = 33.0
            tdeg = 87.2 + u * 2.6
            hdeg = 4.0 - u * 2.5
            l_th, l_sh = -7.0 + u * 2.0, 12.0 - u * 2.0
            r_th, r_sh = -5.0 + u * 1.5, 10.0 - u * 1.5
            wdeg = -1.5 * (1.0 - u)
            gr = (12.0, 11.0)
            w_abs = (84.0 + u * 1.8, 105.0)
            show_h = False

        def post_ko(arr, _n, _g, step=f):
            if step >= 18:
                # Subtle cooling forge-ember motes drifting upward from fallen Mjolnir head
                ex = 108 + ((step * 5) % 9) - 4
                ey = 104 - ((step - 18) * 2) % 15
                put_px_160(arr, ex, ey, C_MAGMA_YELLOW if step % 2 == 0 else C_MAGMA_ORANGE)
                put_px_160(arr, ex - 9, ey - 3, C_JADE_MID if step % 3 == 0 else C_MAGMA_AMBER)

        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=pdx, pelvis_dy=pdy,
            torso_deg=tdeg, head_deg=hdeg,
            l_coat_deg=max(-20.0, -tdeg * 0.3), r_coat_deg=max(-18.0, -tdeg * 0.25),
            l_thigh_deg=l_th, l_shin_deg=l_sh, l_foot_deg=0.0,
            r_thigh_deg=r_th, r_shin_deg=r_sh, r_foot_deg=0.0,
            grip_rel_sh=gr, weapon_deg=wdeg, shaft_len=32.0,
            weapon_layer="front", weapon_abs_160=w_abs,
            show_halo=show_h, halo_phase=f * 0.5, rune_phase=f * 0.7,
            post_fn=post_ko,
            lock_lowest_to_ground=True,
        ))
    return frames


def build_row6_dash(parts, sj):
    """Row 6: Juggernaut Bull-Rush Shoulder Charge (30 Frames)."""
    frames = []
    for f in range(30):
        ph = (f / 10.0) * 2.0 * math.pi
        s1 = math.sin(ph)
        s2 = math.sin(ph + math.pi)

        def post_dash(arr, neck, _g, step=f):
            for k in range(3):
                sy = int(neck[1] + 6 + k * 14 + ((step * 3 + k * 5) % 5))
                sx0 = 8 + ((step * 7 + k * 11) % 16)
                for dx in range(10 + (k % 2) * 4):
                    put_px_160(arr, sx0 + dx, sy, C_MAGMA_YELLOW if dx > 6 else C_JADE_MID)
            draw_forge_spark_burst_160(arr, impact_x=24.0 + (step % 4) * 2.0, impact_y=113.0, spread=10.0, progress=(step % 5) / 5.0, count=4)

        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=9.5 + math.sin(ph * 2.0) * 0.9,
            pelvis_dy=3.5 - abs(math.cos(ph)) * 2.6,
            torso_deg=21.0 + math.sin(ph * 2.0) * 1.8,
            head_deg=-11.0,
            l_coat_deg=16.0 + s1 * 6.0,
            r_coat_deg=12.0 + s2 * 6.0,
            l_thigh_deg=-s1 * 30.0 - 6.0,
            l_shin_deg=max(0.0, -s1) * 32.0 + 10.0,
            l_foot_deg=s1 * 12.0,
            r_thigh_deg=-s2 * 30.0 - 6.0,
            r_shin_deg=max(0.0, -s2) * 32.0 + 10.0,
            r_foot_deg=s2 * 12.0,
            grip_rel_sh=(-4.5, 8.0),
            weapon_deg=154.0 + s1 * 2.5,
            shaft_len=32.0,
            weapon_layer="behind",
            halo_phase=(f / 30.0) * 6.0 * math.pi,
            halo_boost=True,
            rune_phase=(f / 30.0) * 6.0 * math.pi,
            lock_lowest_to_ground=True,
            post_fn=post_dash,
        ))
    return frames


def build_row7_crouch(parts, sj, keyposes):
    """Row 7: CROUCH -- Magma Bulwark Anvil Guard -> Molten Hammer-Slam Nova!"""
    frames = []
    # F00..F10: Braced 2H World-Maul Anvil Guard
    for f in range(11):
        ph = (f / 11.0) * 2.0 * math.pi
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=2.0, pelvis_dy=8.5 + math.sin(ph) * 0.8,
            torso_deg=8.0 + math.sin(ph) * 1.2, head_deg=-5.0,
            l_coat_deg=6.0, r_coat_deg=4.0,
            l_thigh_deg=-22.0, l_shin_deg=38.0, l_foot_deg=-12.0,
            r_thigh_deg=-26.0, r_shin_deg=42.0, r_foot_deg=-14.0,
            grip_rel_sh=(11.5, 2.5 + math.sin(ph) * 0.6),
            weapon_deg=-64.0 + math.sin(ph) * 2.0,
            shaft_len=33.0, weapon_layer="front",
            halo_phase=ph, halo_boost=True, rune_phase=f * 0.7,
            lock_lowest_to_ground=True,
        ))

    # F11..F22: Molten Hammer-Slam Nova (Blunt Earth-Crush Smear)!
    for sub in range(12):
        def post_nova(arr, _n, _g, s=sub):
            if 1 <= s <= 4:
                tails = [-142.0, -54.0, -10.0, 12.0]
                thicks = [28.0, 19.0, 12.0, 7.0]
                draw_blunt_maul_shock_smear_160(
                    arr, cx=80.0, cy=62.0, tail_deg=tails[s - 1], lead_deg=26.0, sweep_dir=1,
                    rx_outer=72.0 - (s - 1) * 2.0, ry_outer=49.0, head_thickness=thicks[s - 1],
                    n_ribs=6 - s, phase=s * 0.25,
                )
                draw_forge_spark_burst_160(arr, impact_x=130.0, impact_y=112.0, spread=26.0, progress=(s - 1) / 3.5, count=8)
        pose_nm = "K1_COIL" if sub == 0 else ("K2_LUNGE" if sub <= 7 else "K3_RISE")
        wdeg = -140.0 if sub == 0 else (25.0 if sub <= 7 else 14.0)
        gr = (-4.0, -3.5) if sub == 0 else (14.5, 5.0)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, pose_nm,
            pelvis_dx=-2.0 if sub == 0 else (11.0 - max(0, sub - 6) * 1.2),
            pelvis_dy=1.8, body_tilt_deg=-4.0 if sub == 0 else 7.0,
            grip_rel_sh=gr, weapon_deg=wdeg, shaft_len=31.0 if sub == 0 else 37.0,
            halo_phase=sub * 0.7, halo_boost=(sub <= 4), rune_phase=sub * 0.8,
            bend_l=-1.0 if sub == 0 else 1.0, bend_r=-1.0 if sub == 0 else 1.0,
            post_fn=post_nova,
        ))

    # F23..F29: Return to braced Anvil Guard
    for sub in range(7):
        u = (sub + 1) / 7.0
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=5.0 * (1.0 - u) + 2.0 * u, pelvis_dy=8.5 * u,
            torso_deg=8.0 * u, head_deg=-5.0 * u,
            l_coat_deg=6.0, r_coat_deg=4.0,
            l_thigh_deg=-22.0 * u, l_shin_deg=38.0 * u, l_foot_deg=-12.0 * u,
            r_thigh_deg=-26.0 * u, r_shin_deg=42.0 * u, r_foot_deg=-14.0 * u,
            grip_rel_sh=(11.5, 3.0), weapon_deg=-64.0, shaft_len=33.0,
            halo_phase=sub * 0.7, rune_phase=sub * 0.7, lock_lowest_to_ground=True,
        ))

    assert len(frames) == 30
    return frames


def build_row8_jump(parts, sj, keyposes):
    """Row 8: JUMP -- Tectonic Crush Leap -> Blunt Meteor Maul Slam -> Landing (30 Frames)."""
    frames = []
    for f in range(4):
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=2.0, pelvis_dy=3.0 + f * 2.0,
            torso_deg=10.0 + f * 2.0, head_deg=-6.0,
            l_coat_deg=6.0, r_coat_deg=4.0,
            l_thigh_deg=-18.0 - f * 4.0, l_shin_deg=34.0 + f * 5.0, l_foot_deg=-10.0,
            r_thigh_deg=-20.0 - f * 4.0, r_shin_deg=36.0 + f * 5.0, r_foot_deg=-10.0,
            grip_rel_sh=(-3.5, 7.0), weapon_deg=152.0, shaft_len=32.0, weapon_layer="behind",
            halo_phase=f * 0.7, rune_phase=f * 0.7, lock_lowest_to_ground=True,
        ))

    for sub in range(9):
        t = sub / 8.0
        pdy = -8.0 - math.sin(t * math.pi * 0.65) * 14.0
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K4_LEAP",
            pelvis_dx=4.0 + sub * 0.5, pelvis_dy=pdy, body_tilt_deg=-4.0 - sub * 0.6,
            grip_rel_sh=(-3.0, -5.5), weapon_deg=-140.0 - sub * 1.5, shaft_len=29.0,
            halo_phase=sub * 0.8, halo_boost=True, rune_phase=sub * 0.8,
            bend_l=-1.0, bend_r=-1.0,
        ))

    for sub in range(8):
        pdy = -20.0 + sub * 2.4
        def post_air_smash(arr, _n, _g, s=sub):
            if s <= 3:
                tails = [-150.0, -60.0, -14.0, 10.0]
                thicks = [27.0, 18.0, 11.0, 6.5]
                draw_blunt_maul_shock_smear_160(
                    arr, cx=78.0, cy=52.0 + s * 2.0, tail_deg=tails[s], lead_deg=28.0, sweep_dir=1,
                    rx_outer=72.0 - s * 2.0, ry_outer=48.0, head_thickness=thicks[s],
                    n_ribs=6 - s, phase=0.15 + s * 0.25,
                )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K4_LEAP",
            pelvis_dx=8.5, pelvis_dy=pdy, body_tilt_deg=6.0,
            grip_rel_sh=(13.5, 4.0), weapon_deg=25.0 + min(3, sub) * 1.5, shaft_len=36.0,
            halo_phase=2.0 + sub * 0.8, rune_phase=sub * 0.9, post_fn=post_air_smash,
        ))

    for sub in range(9):
        u = sub / 8.0
        comp = math.sin(min(1.0, u * 1.6) * math.pi) * 6.0 * (1.0 - 0.5 * u)
        def post_land(arr, _n, _g, s=sub):
            if s <= 2:
                draw_forge_spark_burst_160(arr, impact_x=66.0, impact_y=113.0, spread=18.0, progress=s / 3.0, count=6)
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=6.0 * (1.0 - u), pelvis_dy=comp,
            torso_deg=9.0 * (1.0 - u), head_deg=-5.0 * (1.0 - u),
            l_coat_deg=6.0 * (1.0 - u) + 2.0, r_coat_deg=4.0 * (1.0 - u),
            l_thigh_deg=-18.0 * (1.0 - u), l_shin_deg=32.0 * (1.0 - u), l_foot_deg=-10.0 * (1.0 - u),
            r_thigh_deg=-20.0 * (1.0 - u), r_shin_deg=34.0 * (1.0 - u), r_foot_deg=-10.0 * (1.0 - u),
            grip_rel_sh=(9.5, 8.5), weapon_deg=-28.0, shaft_len=36.0,
            halo_phase=sub * 0.7, rune_phase=sub * 0.7, lock_lowest_to_ground=True, post_fn=post_land,
        ))

    assert len(frames) == 30
    return frames


def build_row9_victory(parts, sj, keyposes):
    """Row 9: VICTORY -- Forge-King Warcry Maul Hoist -> Grounded World-Maul Anvil Rest & Crucible Sparks!"""
    frames = []
    for f in range(7):
        wdeg = -20.0 - f * 17.0
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=4.0 - f * 0.4, pelvis_dy=-f * 0.3, body_tilt_deg=-f * 0.6,
            grip_rel_sh=(9.5 - f * 0.7, 1.0 - f * 1.5), weapon_deg=wdeg, shaft_len=32.0,
            halo_phase=f * 0.8, halo_boost=True, rune_phase=f * 0.9,
            bend_l=-1.0, bend_r=-1.0,
        ))

    # F07..F12: Drives heavy symmetric World-Maul head straight down (+90 deg) onto stone floor!
    for sub in range(6):
        u = (sub + 1) / 6.0
        grip_y = 60.0 + u * 13.0  # Grip at 73 -> maul head (73 + 33 + 5.4 = 111.4) rests cleanly on floor!
        def post_plant(arr, _n, _g, s=sub):
            if s >= 4:
                draw_forge_spark_burst_160(arr, impact_x=75.0, impact_y=113.0, spread=22.0, progress=(s - 4) * 0.35 + 0.15, count=8)
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=1.5 * (1.0 - u), pelvis_dy=1.5 * math.sin(u * math.pi),
            torso_deg=3.0 * (1.0 - u), head_deg=-2.0,
            l_coat_deg=3.0, r_coat_deg=-1.5,
            weapon_abs_160=(75.0, grip_y), weapon_deg=90.0, shaft_len=33.0, weapon_layer="front",
            halo_phase=sub * 0.8, halo_boost=True, rune_phase=sub * 0.9, post_fn=post_plant,
        ))

    # F13..F29: Sovereign Forge-King Salute Loop (F15..F29 loops seamlessly!)
    for sub in range(17):
        ph = (sub / 17.0) * 2.0 * math.pi
        def post_salute(arr, _n, _g, s=sub, p=ph):
            for m in range(3):
                mx = 68.0 + m * 7.0 + math.sin(p + m * 2.1) * 2.5
                my = 108.0 - ((s * 3 + m * 13) % 40)
                put_px_160(arr, mx, my, C_MAGMA_YELLOW if (s + m) % 2 == 0 else C_JADE_LIT)

        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=0.0, pelvis_dy=math.sin(ph) * 0.8,
            torso_deg=-1.5 + math.sin(ph) * 1.0, head_deg=1.5,
            l_coat_deg=3.0 + math.sin(ph) * 2.0, r_coat_deg=-1.5 + math.cos(ph) * 2.0,
            weapon_abs_160=(75.0, 73.0), weapon_deg=90.0, shaft_len=33.0, weapon_layer="front",
            halo_phase=ph, halo_boost=True, rune_phase=ph * 2.0, post_fn=post_salute,
        ))

    assert len(frames) == 30
    return frames


# ==============================================================================
# 8. SHEET ASSEMBLY, STRICT AUTOMATED QA, & DEBUG CONTACT SHEETS
# ==============================================================================

def assemble_and_verify_sheet(all_rows_160):
    sheet = Image.new("RGBA", (SHEET_W, SHEET_H), (0, 0, 0, 0))
    clip_count = 0
    clip_details = []
    row_transitions = []
    row2_snap_reaches_320 = {}

    for r_idx, row_frames in enumerate(all_rows_160):
        assert len(row_frames) == COLS, f"Row {r_idx} has {len(row_frames)} frames, expected {COLS}"
        trans = 0
        cleaned_row = []
        for c_idx, fr160 in enumerate(row_frames):
            a = fr160[:, :, 3] > 128
            clean160 = np.zeros_like(fr160)
            clean160[a, :3] = fr160[a, :3]
            clean160[a, 3] = 255
            cleaned_row.append(clean160)

            ys, xs = np.where(a)
            if len(xs) > 0:
                xmin, xmax = int(xs.min()), int(xs.max())
                ymin, ymax = int(ys.min()), int(ys.max())
                if (
                    xmin < MARGIN_LOGICAL
                    or xmax >= LOGICAL_W - MARGIN_LOGICAL
                    or ymin < MARGIN_LOGICAL
                    or ymax >= LOGICAL_H - MARGIN_LOGICAL
                ):
                    clip_count += 1
                    clip_details.append((r_idx, c_idx, xmin, xmax, ymin, ymax))

                if r_idx == 2 and c_idx in (3, 9, 17, 25):
                    row2_snap_reaches_320[c_idx] = (xmax + 1) * 2

            if c_idx > 0:
                if not np.array_equal(clean160, cleaned_row[c_idx - 1]):
                    trans += 1

            cell_im = Image.fromarray(clean160, "RGBA").resize((CELL_W, CELL_H), Image.Resampling.NEAREST)
            sheet.paste(cell_im, (c_idx * CELL_W, r_idx * CELL_H))

        row_transitions.append(trans)

    sheet.save(OUT_SHEET_PNG)
    print(f"[Sheet] Saved {OUT_SHEET_PNG} ({sheet.size[0]}x{sheet.size[1]})")
    print(f"[QA] Border clips (4px output safety margin): {clip_count}/300")
    if clip_details:
        print("  Clip details:", clip_details[:10])
    print(f"[QA] Row frame transitions: {row_transitions} (expected [29]*10)")
    print(f"[QA] Row 2 snap-frame front reach x_320 (must be > 260): {row2_snap_reaches_320}")

    assert sheet.size == (9600, 2400), f"Invalid sheet size: {sheet.size}"
    assert clip_count == 0, f"Border clips detected: {clip_details}"
    assert all(t == 29 for t in row_transitions), f"Static duplicate frames detected: {row_transitions}"
    for snap_f, max_x320 in row2_snap_reaches_320.items():
        assert max_x320 > 260, f"Row 2 F{snap_f:02d} smear reach too narrow: {max_x320}"

    return sheet


def write_debug_contact_sheets(sheet):
    os.makedirs(SCRATCH_DIR, exist_ok=True)

    r1_cols, r1_rows = 6, 5
    r1_im = Image.new("RGBA", (r1_cols * CELL_W, r1_rows * CELL_H), (22, 16, 12, 255))
    r1_draw = ImageDraw.Draw(r1_im)
    for f in range(30):
        gc = f % r1_cols
        gr = f // r1_cols
        ox, oy = gc * CELL_W, gr * CELL_H
        cell = sheet.crop((f * CELL_W, 1 * CELL_H, (f + 1) * CELL_W, 2 * CELL_H))
        r1_draw.rectangle([ox, oy, ox + CELL_W - 1, oy + CELL_H - 1], outline=(76, 54, 34, 255), width=1)
        r1_draw.line([(ox + 8, oy + ANCHOR_Y_320), (ox + CELL_W - 8, oy + ANCHOR_Y_320)], fill=(98, 68, 42, 255), width=1)
        r1_draw.line([(ox + ANCHOR_X_320, oy + ANCHOR_Y_320 - 10), (ox + ANCHOR_X_320, oy + ANCHOR_Y_320 + 6)], fill=(16, 185, 129, 255), width=1)
        r1_im.alpha_composite(cell, (ox, oy))
        r1_draw.text((ox + 8, oy + 6), f"R1 F{f:02d} (#{30 + f})", fill=(254, 243, 178, 255))

    p_r1 = os.path.join(SCRATCH_DIR, "debug_titan_ex_row1_walk.png")
    r1_im.save(p_r1)
    print(f"[Debug] Saved {p_r1}")

    r2_cols, r2_rows = 6, 5
    r2_im = Image.new("RGBA", (r2_cols * CELL_W, r2_rows * CELL_H), (22, 16, 12, 255))
    r2_draw = ImageDraw.Draw(r2_im)
    for f in range(30):
        gc = f % r2_cols
        gr = f // r2_cols
        ox, oy = gc * CELL_W, gr * CELL_H
        cell = sheet.crop((f * CELL_W, 2 * CELL_H, (f + 1) * CELL_W, 3 * CELL_H))
        r2_draw.rectangle([ox, oy, ox + CELL_W - 1, oy + CELL_H - 1], outline=(76, 54, 34, 255), width=1)
        r2_draw.line([(ox + 8, oy + ANCHOR_Y_320), (ox + CELL_W - 8, oy + ANCHOR_Y_320)], fill=(98, 68, 42, 255), width=1)
        r2_draw.line([(ox + ANCHOR_X_320, oy + ANCHOR_Y_320 - 10), (ox + ANCHOR_X_320, oy + ANCHOR_Y_320 + 6)], fill=(16, 185, 129, 255), width=1)
        r2_im.alpha_composite(cell, (ox, oy))
        r2_draw.text((ox + 8, oy + 6), f"R2 F{f:02d} (#{60 + f})", fill=(254, 243, 178, 255))

    p_r2 = os.path.join(SCRATCH_DIR, "debug_titan_ex_row2.png")
    r2_im.save(p_r2)

    for half_nm, c_start in (("left_F00_F14", 0), ("right_F15_F29", 15)):
        half_im = Image.new("RGBA", (15 * LOGICAL_W, ROWS * LOGICAL_H), (22, 16, 12, 255))
        hd = ImageDraw.Draw(half_im)
        for r in range(ROWS):
            for ci in range(15):
                c = c_start + ci
                ox, oy = ci * LOGICAL_W, r * LOGICAL_H
                cell320 = sheet.crop((c * CELL_W, r * CELL_H, (c + 1) * CELL_W, (r + 1) * CELL_H))
                cell160 = cell320.resize((LOGICAL_W, LOGICAL_H), Image.Resampling.NEAREST)
                hd.rectangle([ox, oy, ox + LOGICAL_W - 1, oy + LOGICAL_H - 1], outline=(64, 46, 30, 255), width=1)
                hd.line([(ox + 4, oy + ANCHOR_Y_120), (ox + LOGICAL_W - 4, oy + ANCHOR_Y_120)], fill=(86, 62, 38, 255), width=1)
                half_im.alpha_composite(cell160, (ox, oy))
                if ci == 0:
                    hd.text((ox + 4, oy + 3), f"R{r} F{c:02d}", fill=(253, 224, 71, 255))
        out_p = os.path.join(SCRATCH_DIR, f"debug_titan_ex_10rows_{half_nm}.png")
        half_im.save(out_p)
        print(f"[Debug] Saved {out_p}")

    print(f"[Debug] Saved {p_r2}")


def main():
    t0 = time.time()
    print("=== Building TORGAR EX (titan_ex) Next-Gen Wide-Canvas Assets ===")
    if "--rebuild-portrait" in sys.argv:
        build_portrait_128()
    parts, stand_joints, keyposes = load_rig_and_keyposes()

    all_rows_160 = [
        build_row0_idle(parts, stand_joints),
        build_row1_walk(parts, stand_joints),
        build_row2_auto_attack(parts, stand_joints, keyposes),
        build_row3_skill(parts, stand_joints, keyposes),
        build_row4_ultimate(parts, stand_joints, keyposes),
        build_row5_death(parts, stand_joints),
        build_row6_dash(parts, stand_joints),
        build_row7_crouch(parts, stand_joints, keyposes),
        build_row8_jump(parts, stand_joints, keyposes),
        build_row9_victory(parts, stand_joints, keyposes),
    ]

    sheet = assemble_and_verify_sheet(all_rows_160)
    write_debug_contact_sheets(sheet)
    print(f"=== Done in {time.time() - t0:.2f}s ===")


if __name__ == "__main__":
    main()
