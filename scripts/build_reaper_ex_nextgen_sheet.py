#!/usr/bin/env python3
"""
Next-Gen Wide-Canvas Sprite Sheet, Portrait, & Visual QA Builder for:
  MALAKOR EX -- Thanatos Arch-Reaper Sovereign (reaper_ex)

Architecture (FFBE / Last Cloudia / Grand Summoners Paradigm):
  1. Wide Theatrical Cell Framing:
     - Logical canvas: 160x120 -> 2x NEAREST output: 320x240 per cell
     - Sheet layout: 30 cols x 10 rows = 9600x2400 RGBA PNG
     - Grounded foot/spine anchor: anchor_x_160 = 56 (anchorX = 112),
       anchor_y_120 = 115 (anchorY = 230)
     - Standing hero height: 87 logical px (174px in 320x240), 100% locked scale
       across all 300 frames (zero auto-fit shrinking on wide scythe sweeps).
     - Open reaping theater: 104 logical px (208px) in front of spine, 56 logical px
       behind, 28 logical px above horned crown.
  2. Multi-Keypose 3D Body States + 13-Part Articulated Rig:
     - Uses real 3D-foreshortened HD-2D keyposes (K1_COIL, K2_LUNGE, K3_RISE,
       K4_LEAP from reaper_ex_keyposes_ref.jpg) + articulated STAND rig
       (from reaper_ex_base.jpg) with 2-Bone Analytical IK clawed gauntlets
       clasped on the Monumental 2H Thanatos Soul-Guillotine Great-Scythe.
     - Frame-delayed tattered royal-purple & crimson-edged Wraith Shroud Ribbons
       + orbiting Ferryman Soul-Motes.
  3. 1-Frame Explosive Snap + 230-Deg Serrated Tattered Soul-Reap Smears:
     - 4-band cel-shaded Reaper crescent & 2.5D Thanatos vortex smears:
       #fdf4ff -> #f43f5e -> #c084fc -> #3b0764 with sawtooth soul-rips and
       4x4 Bayer tail stipple (100% binary alpha, 0/300 border clips).
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

BASE_JPG = os.path.join(SPRITES_DIR, "reaper_ex_base.jpg")
KEYPOSES_JPG = os.path.join(SPRITES_DIR, "reaper_ex_keyposes_ref.jpg")
PORTRAIT_RAW_JPG = os.path.join(SPRITES_DIR, "reaper_ex_portrait_raw.jpg")

OUT_SHEET_PNG = os.path.join(SPRITES_DIR, "reaper_ex_sheet.png")
OUT_PORTRAIT_PNG = os.path.join(SPRITES_DIR, "reaper_ex_portrait.png")

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

# Constant locked character scale: 469px in 512-space == 87 logical px (174px output)
STAND_H_512 = 469.0
TARGET_STAND_H_LOGICAL = 87.0
S_HI = STAND_H_512 / TARGET_STAND_H_LOGICAL  # 5.3908046 px per logical pixel
HI_W = int(round(LOGICAL_W * S_HI))          # 863
HI_H = int(round(LOGICAL_H * S_HI))          # 647
ANCHOR_HI_X = ANCHOR_X_160 * S_HI
ANCHOR_HI_Y = ANCHOR_Y_120 * S_HI

# 26-Color Thanatos Arch-Reaper Neo-Vision Master Palette
MASTER_PALETTE_REAPER_EX = np.array([
    [8, 6, 20],       # 0: Pitch-abyss shadow Selout (#080614)
    [20, 14, 44],     # 1: Lit dark-violet Selout (#140e2c)
    [40, 28, 74],     # 2: Soft dusk-violet Selout (#281c4a)
    [28, 34, 54],     # 3: Obsidian armor deep shadow (#1c2236)
    [52, 60, 88],     # 4: Dark gunmetal plate (#343c58)
    [92, 104, 138],   # 5: Cold iron-slate midtone (#5c688a)
    [148, 162, 194],  # 6: Bone-silver trim & horn mid (#94a2c2)
    [206, 218, 240],  # 7: Bright bone-silver crown/wisp (#cedaf0)
    [244, 246, 255],  # 8: Pure bone-ivory specular (#f4f6ff)
    [46, 16, 101],    # 9: Necropolis royal-purple deep (#2e1065)
    [88, 28, 135],    # 10: Royal shroud purple mid-dark (#581c87)
    [126, 34, 206],   # 11: Vivid Thanatos violet robe (#7e22ce)
    [168, 85, 247],   # 12: Luminous violet cloak crest (#a855f7)
    [192, 132, 252],  # 13: Soul-orchid highlight (#c084fc)
    [76, 5, 25],      # 14: Blood-moon lining deep (#4c0519)
    [136, 19, 55],    # 15: Blood-moon crimson shadow (#881337)
    [190, 18, 60],    # 16: Crimson cloak lining mid (#be123c)
    [244, 63, 94],    # 17: Blazing rose-crimson soul edge (#f43f5e)
    [253, 164, 175],  # 18: Pale blood-rose glint (#fda4af)
    [192, 38, 211],   # 19: Piercing magenta eye/gem base (#c026d3)
    [232, 121, 249],  # 20: Blazing orchid soul-core (#e879f9)
    [245, 208, 254],  # 21: Pale orchid-white core (#f5d0fe)
    [253, 244, 255],  # 22: Incandescent soul-white (#fdf4ff)
    [6, 95, 70],      # 23: Ferryman emerald shadow (#065f46)
    [16, 185, 129],   # 24: Ferryman soul-emerald (#10b981)
    [110, 231, 183],  # 25: Pale spirit-mint spark (#6ee7b7)
], dtype=np.int32)

# RGBA tuples for crisp 160x120 pixel-art Great-Scythe, shroud ribbons, & 4-band smears
C_OUT_DARK = (8, 6, 20, 255)
C_OUT_LIT = (20, 14, 44, 255)
C_OBSIDIAN_DEEP = (28, 34, 54, 255)
C_OBSIDIAN_MID = (52, 60, 88, 255)
C_BONE_SHAD = (92, 104, 138, 255)
C_BONE_MID = (148, 162, 194, 255)
C_BONE_LIT = (206, 218, 240, 255)
C_BONE_SPEC = (244, 246, 255, 255)

C_ABYSS_TEETH = (59, 7, 100, 255)     # #3b0764 tattered soul-rip inner band
C_SHROUD_DEEP = (88, 28, 135, 255)    # #581c87
C_SHROUD_MID = (126, 34, 206, 255)    # #7e22ce
C_ORCHID_BELLY = (192, 132, 252, 255) # #c084fc soul-orchid mid belly
C_ORCHID_BRIGHT = (232, 121, 249, 255)# #e879f9
C_CRIMSON_DARK = (136, 19, 55, 255)   # #881337
C_CRIMSON_MID = (190, 18, 60, 255)    # #be123c
C_CRIMSON_EDGE = (244, 63, 94, 255)   # #f43f5e crimson soul cutting crest
C_SOUL_WHITE = (253, 244, 255, 255)   # #fdf4ff pure soul-white razor rim
C_EMERALD_SOUL = (16, 185, 129, 255)
C_EMERALD_LIT = (110, 231, 183, 255)

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


def clean_pose_512(im_rgba_512, pocket_seeds=(), strip_polys=(), head_y_split=150):
    """
    Cleans a 512x512 HD-2D pose on #FFFFFF using border + explicit pocket floodfills,
    strips empty arm/claw polygons, keeps largest component, and preserves vivid
    magenta eyes and violet chest soul-gems.
    """
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

    # Preserve piercing magenta eyes and glowing violet-orchid soul-core before median softening
    r0 = arr[:, :, 0].astype(np.int16)
    g0 = arr[:, :, 1].astype(np.int16)
    b0 = arr[:, :, 2].astype(np.int16)
    vivid_soul = alpha & ((r0 - g0) > 45) & (r0 > 165) & (b0 > 130)
    arr[:, :, :3] = np.where(alpha[:, :, None], np.where(vivid_soul[:, :, None], arr[:, :, :3], cel_rgb), 0)
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
    palette=MASTER_PALETTE_REAPER_EX,
    protect_indices=(17, 18, 19, 20, 21, 22),
    hair_indices=(6, 7, 8),
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
    is_hair = np.isin(idx_map, hair_indices) & (yy < 60)
    shadow_side = (~dn_a) | (~rt_a)

    body_edge = edge & (~is_hair)
    hair_edge = edge & is_hair

    idx_map[body_edge & (~shadow_side)] = 1  # #140e2c lit dark-violet Selout
    idx_map[body_edge & shadow_side] = 0     # #080614 pitch-abyss Selout
    idx_map[hair_edge & (~shadow_side)] = 1
    idx_map[hair_edge & shadow_side] = 2     # #281c4a soft dusk-violet Selout

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
    face_focus = (xx >= 220) & (xx <= 800) & (yy >= 120) & (yy <= 920)
    blended = np.where(face_focus[:, :, None], med3, med5)

    im256 = Image.fromarray(blended, "RGB").resize((256, 256), Image.Resampling.BOX)
    im256 = im256.filter(ImageFilter.MedianFilter(size=3))
    im128 = im256.resize((128, 128), Image.Resampling.NEAREST)
    src128 = np.array(im128)

    q128 = im128.quantize(colors=28, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert("RGB")
    out128 = np.array(q128)

    # Restore piercing glowing magenta-crimson eyes & orchid soul-gem highlights
    r = src128[:, :, 0].astype(np.int16)
    g = src128[:, :, 1].astype(np.int16)
    b = src128[:, :, 2].astype(np.int16)
    eye_zone = (yy[:128, :128] >= 44) & (yy[:128, :128] <= 62) & (xx[:128, :128] >= 46) & (xx[:128, :128] <= 82)
    eye_glow = eye_zone & ((r - g) > 55) & (r > 170)
    lum = (r * 3 + g * 3 + b * 4) // 10
    out128[eye_glow & (lum >= 200)] = [253, 244, 255]
    out128[eye_glow & (lum >= 145) & (lum < 200)] = [244, 63, 94]
    out128[eye_glow & (lum < 145)] = [192, 38, 211]

    rgba128 = np.zeros((128, 128, 4), dtype=np.uint8)
    rgba128[:, :, :3] = out128
    rgba128[:, :, 3] = 255
    out_im = Image.fromarray(rgba128, "RGBA")
    out_im.save(OUT_PORTRAIT_PNG)

    os.makedirs(SCRATCH_DIR, exist_ok=True)
    preview = out_im.resize((384, 384), Image.Resampling.NEAREST)
    preview.save(os.path.join(SCRATCH_DIR, "debug_reaper_ex_portrait.png"))
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
        pocket_seeds=[(194, 155), (191, 173), (375, 235)],
        strip_polys=[],
        head_y_split=148,
    )
    alpha = stand_arr[:, :, 3] > 128
    H, W = alpha.shape

    raw_masks = [
        ("head", poly_mask(H, W, [(218, 16), (322, 16), (318, 144), (296, 152), (244, 146), (222, 92)])),
        ("l_sode", poly_mask(H, W, [(178, 108), (242, 112), (240, 192), (170, 192)])),
        ("l_forearm", poly_mask(H, W, [(102, 132), (186, 154), (196, 224), (102, 224)])),
        ("r_sode", poly_mask(H, W, [(302, 126), (344, 130), (346, 206), (302, 206)])),
        ("r_forearm", poly_mask(H, W, [(312, 174), (416, 174), (416, 240), (312, 236)])),
        ("torso", poly_mask(H, W, [(238, 140), (306, 144), (312, 260), (304, 412), (254, 412), (242, 260)])),
        ("l_coat", poly_mask(H, W, [(82, 244), (244, 244), (246, 280), (168, 434), (82, 444)])),
        ("r_coat", poly_mask(H, W, [(304, 246), (394, 344), (394, 414), (356, 396), (304, 294)])),
        ("l_thigh", poly_mask(H, W, [(196, 276), (254, 286), (252, 376), (184, 368)])),
        ("l_shin", poly_mask(H, W, [(158, 340), (234, 348), (206, 446), (150, 442)])),
        ("l_foot", poly_mask(H, W, [(140, 436), (202, 438), (198, 494), (140, 494)])),
        ("r_thigh", poly_mask(H, W, [(294, 276), (340, 280), (356, 358), (298, 358)])),
        ("r_shin", poly_mask(H, W, [(302, 344), (366, 344), (370, 430), (312, 430)])),
        ("r_foot", poly_mask(H, W, [(308, 422), (402, 422), (404, 474), (308, 474)])),
    ]
    assigned = assign_remaining_geodesic(alpha, raw_masks)
    parts = {nm: extract_crop_tuple(stand_arr, m) for nm, m in assigned}

    stand_joints = {
        "x_ref": 268.0,
        "y_bot": 488.0,
        "pelvis": (276.0, 256.0),
        "neck": (276.0, 138.0),
        "l_coat": (242.0, 256.0),
        "r_coat": (306.0, 258.0),
        "l_sh": (214.0, 148.0),
        "l_el": (182.0, 196.0),
        "l_grip": (132.0, 174.0),
        "r_sh": (316.0, 156.0),
        "r_el": (330.0, 206.0),
        "r_grip": (380.0, 204.0),
        "l_hip": (244.0, 284.0),
        "l_knee": (206.0, 358.0),
        "l_ankle": (176.0, 442.0),
        "r_hip": (304.0, 284.0),
        "r_knee": (336.0, 354.0),
        "r_ankle": (348.0, 430.0),
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
            "pocket_seeds": [(286, 435)],
            "strip_polys": [
                [(110, 96), (204, 96), (212, 226), (110, 226)],
                [(196, 84), (248, 84), (296, 142), (288, 174), (222, 160)],
            ],
            "head_y_split": 148,
            "x_ref": 274.0,
            "y_bot": 500.0,
            "l_sh": (232.0, 152.0),
            "r_sh": (324.0, 162.0),
            "neck": (294.0, 138.0),
            "pelvis": (286.0, 256.0),
        },
        "K2_LUNGE": {
            "pocket_seeds": [(337, 481), (66, 490)],
            "strip_polys": [
                [(116, 152), (202, 152), (202, 276), (116, 276)],
                [(322, 184), (496, 184), (496, 272), (322, 266)],
            ],
            "head_y_split": 186,
            "x_ref": 248.0,
            "y_bot": 488.0,
            "l_sh": (214.0, 168.0),
            "r_sh": (306.0, 198.0),
            "neck": (286.0, 174.0),
            "pelvis": (254.0, 276.0),
        },
        "K3_RISE": {
            "pocket_seeds": [(399, 478)],
            "strip_polys": [
                [(84, 38), (188, 38), (204, 184), (84, 184)],
                [(314, 36), (436, 36), (436, 182), (312, 182)],
            ],
            "head_y_split": 146,
            "x_ref": 262.0,
            "y_bot": 496.0,
            "l_sh": (212.0, 148.0),
            "r_sh": (308.0, 148.0),
            "neck": (264.0, 128.0),
            "pelvis": (266.0, 248.0),
        },
        "K4_LEAP": {
            "pocket_seeds": [],
            "strip_polys": [
                [(134, 4), (216, 4), (216, 182), (134, 182)],
                [(314, 4), (386, 4), (386, 182), (314, 182)],
            ],
            "head_y_split": 152,
            "x_ref": 264.0,
            "y_bot": 494.0,
            "l_sh": (222.0, 152.0),
            "r_sh": (308.0, 154.0),
            "neck": (274.0, 140.0),
            "pelvis": (270.0, 254.0),
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


def draw_joint_bridge_hi(canvas, p0, p1, r, fill=(28, 34, 54, 255), inner=(92, 104, 138, 255)):
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
    max_d = (l1 + l2) * 0.97
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

    draw_joint_bridge_hi(canvas, sh_dst, el_dst, r=8)
    draw_joint_bridge_hi(canvas, el_dst, hand_dst, r=6)
    paste_rotated_part(canvas, parts[sode_nm], sh_src, sh_dst, deg=(ang1_cur - ang1_rest))
    paste_rotated_part(canvas, parts[fore_nm], el_src, el_dst, deg=(ang2_cur - ang2_rest))
    return hand_dst


# ==============================================================================
# 5. LOGICAL 160x120 PIXEL-ART RENDERERS:
#    - TATTERED WRAITH SHROUD RIBBONS + FERRYMAN SOUL MOTES
#    - MONUMENTAL 2H THANATOS SOUL-GUILLOTINE GREAT-SCYTHE
#    - 4-BAND SERRATED TATTERED REAPER-SCYTHE & 2.5D VORTEX SMEARS
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


def draw_reaper_shroud_ribbons_160(
    arr,
    neck_x,
    neck_y,
    base_deg=170.0,
    length=33.0,
    wave_phase=0.0,
    wave_amp=3.4,
    spread_deg=13.0,
):
    """
    Renders Malakor EX's tattered royal-purple & crimson-lined Wraith Shroud
    mantle ribbons trailing behind his horned hood with secondary whip lag.
    """
    for idx, off_deg in enumerate((-spread_deg * 0.55, spread_deg * 0.65)):
        rib_len = length if idx == 0 else length * 0.85
        ang = math.radians(base_deg + off_deg)
        ux, uy = math.cos(ang), math.sin(ang)
        nx, ny = -uy, ux
        steps = int(rib_len * 2.2) + 1
        pts = []
        for s in range(steps + 1):
            t = s / max(1, steps)
            dist = t * rib_len
            ph = wave_phase + idx * 1.4 - t * 4.5
            lat = math.sin(ph) * wave_amp * (t ** 1.15)
            px = max(8.5, min(LOGICAL_W - 9.5, neck_x + ux * dist + nx * lat))
            py = max(8.5, min(LOGICAL_H - 7.5, neck_y + uy * dist + ny * lat))
            pts.append((px, py, t))

        for px, py, t in pts:
            half_w = (2.3 if idx == 0 else 1.8) * (1.0 - 0.52 * t)
            for k in (-half_w - 0.8, half_w + 0.8):
                put_px_160(arr, px + nx * k, py + ny * k, C_OUT_DARK)
        put_px_160(arr, pts[-1][0] + ux, pts[-1][1] + uy, C_OUT_DARK)

        for px, py, t in pts:
            # Tattered soul-fringe notches near tail
            if t > 0.84 and int(t * 24 + idx * 3) % 3 == 0:
                continue
            half_w = (2.0 if idx == 0 else 1.6) * (1.0 - 0.52 * t)
            is_crimson_tail = (t > 0.72)
            for k_step in range(-3, 4):
                k = k_step * 0.55
                if abs(k) <= half_w:
                    if is_crimson_tail:
                        col = C_CRIMSON_EDGE if k < 0 else C_CRIMSON_MID
                    else:
                        col = C_ORCHID_BELLY if k < -0.3 else (C_SHROUD_MID if k < 0.65 else C_SHROUD_DEEP)
                    put_px_160(arr, px + nx * k, py + ny * k, col)


def draw_thanatos_great_scythe_160(
    arr,
    grip_x,
    grip_y,
    deg,
    shaft_len=45.0,
    fang_side=1.0,
    rune_phase=0.0,
    draw_gauntlets=True,
):
    """
    Draws Malakor EX's colossal 2H Thanatos Soul-Guillotine Great-Scythe:
      - Long obsidian & bone-ribbed Reaper Snath/Pole with spiked Soul-Lantern pommel
      - Horned Violet Soul-Eye Collar at the snath head
      - Sweeping 33-logical-px (66px) Crescent Reaper-Blade with bone-silver spine,
        obsidian fuller, violet rune vein, and blazing crimson-white soul cutting edge!
    Automatically keeps both snath head and curved scythe fang inside safe margins.
    """
    rad = math.radians(deg)
    ux, uy = math.cos(rad), math.sin(rad)
    # Normal pointing toward fang_side (+1 curves clockwise/downward when deg ~ 0)
    nx, ny = -uy * fang_side, ux * fang_side

    pommel_dist = -12.0
    max_shaft = shaft_len
    fang_len_base = 31.0

    # Ensure both snath head and entire curved crescent scythe-blade stay inside [9.5..149.5] x [9.5..113.0] (ZERO flat cuts!)
    max_shaft = 15.0
    for test_s in range(int(shaft_len), 14, -1):
        scale_f = min(1.0, test_s / max(1.0, shaft_len))
        flen = max(16.0, fang_len_base * scale_f)
        ok = True
        sample_pts = [
            (test_s + 4.5, -7.5 * scale_f),
            (test_s + 4.5, 2.5),
            (pommel_dist - 3.5, 0.0),
        ]
        for bt_s in (0.0, 0.14, 0.28, 0.42, 0.56, 0.70, 0.85, 1.0):
            an_s = flen * (math.sin(bt_s * math.pi * 0.54) ** 0.88)
            au_s = (3.8 * math.sin(bt_s * math.pi * 0.82) - (bt_s ** 1.75) * (flen * 0.44)) * scale_f
            cw_s = (6.6 * scale_f) + 2.5
            sample_pts.append((test_s + au_s + 2.5, an_s + 2.5))
            sample_pts.append((test_s + au_s - cw_s, an_s + cw_s * 0.65))
            sample_pts.append((test_s + au_s - cw_s, an_s - cw_s * 0.5))
        for check_u, check_n in sample_pts:
            cx = grip_x + ux * check_u + nx * check_n
            cy = grip_y + uy * check_u + ny * check_n
            if not (9.5 <= cx <= (LOGICAL_W - 10.5) and 9.5 <= cy <= (LOGICAL_H - 7.0)):
                ok = False
                break
        if ok:
            max_shaft = float(test_s)
            break

    f_scale = min(1.0, max_shaft / max(1.0, shaft_len))
    fang_len = max(16.0, fang_len_base * f_scale)

    # --- Pass 1: Long Two-Handed Obsidian & Bone-Silver Reaper Snath (Pole) ---
    pole_steps = int((max_shaft - pommel_dist) * 2.6) + 1
    for i in range(pole_steps + 1):
        u_p = i / max(1, pole_steps)
        d = pommel_dist + (max_shaft - pommel_dist) * u_p
        # Slight organic S-curve in upper snath like classic Gothic war-scythes
        bow = math.sin(u_p * math.pi) * (-1.4)
        cx = grip_x + ux * d + nx * bow
        cy = grip_y + uy * d + ny * bow
        put_px_160(arr, cx + nx * 1.65, cy + ny * 1.65, C_OUT_DARK)
        put_px_160(arr, cx - nx * 1.65, cy - ny * 1.65, C_OUT_LIT)
        is_rib = (int(abs(d * 0.9)) % 5 == 0)
        for k in (-0.8, 0.0, 0.8):
            if is_rib:
                col = C_BONE_LIT if k <= 0 else C_ORCHID_BELLY
            else:
                col = C_BONE_MID if k < -0.3 else (C_OBSIDIAN_MID if k < 0.4 else C_OBSIDIAN_DEEP)
            put_px_160(arr, cx + nx * k, cy + ny * k, col)

    # Spiked Ferryman Pommel Skull-Lantern
    px_pom = grip_x + ux * pommel_dist
    py_pom = grip_y + uy * pommel_dist
    draw_disc_160(arr, px_pom, py_pom, 2.5, C_OUT_DARK)
    draw_disc_160(arr, px_pom, py_pom, 1.6, C_BONE_MID)
    put_px_160(arr, px_pom, py_pom, C_ORCHID_BRIGHT)

    # --- Pass 2: Sweeping Monumental Crescent Reaper-Blade + Rear Counter-Spike ---
    head_x = grip_x + ux * max_shaft
    head_y = grip_y + uy * max_shaft

    # Rear Raven-Beak Counter-Spike opposite the main scythe blade
    for s in range(12):
        st = s / 11.0
        sx = head_x - nx * (st * 6.5 * f_scale) + ux * (1.2 - st * 1.8)
        sy = head_y - ny * (st * 6.5 * f_scale) + uy * (1.2 - st * 1.8)
        hw = 1.9 * (1.0 - 0.78 * st)
        put_px_160(arr, sx + ux * (hw + 0.8), sy + uy * (hw + 0.8), C_OUT_LIT)
        put_px_160(arr, sx - ux * (hw + 0.8), sy - uy * (hw + 0.8), C_OUT_DARK)
        put_px_160(arr, sx, sy, C_BONE_SPEC if st > 0.6 else C_BONE_LIT)
        if hw > 0.7:
            put_px_160(arr, sx - ux * 0.6, sy - uy * 0.6, C_CRIMSON_EDGE)

    # Main Sweeping Crescent Reaper-Blade: curves out along +n and hooks backward (-u) toward Malakor!
    blade_steps = int(fang_len * 3.2) + 1
    spine_pts = []
    for i in range(blade_steps + 1):
        bt = i / max(1, blade_steps)  # 0 = collar root, 1 = needle reaper-tip
        # Parabolic crescent arch: projects forward slightly at root, then hooks back dramatically!
        along_n = fang_len * (math.sin(bt * math.pi * 0.54) ** 0.88)
        along_u = (3.8 * math.sin(bt * math.pi * 0.82) - (bt ** 1.75) * (fang_len * 0.44)) * f_scale
        bx = head_x + ux * along_u + nx * along_n
        by = head_y + uy * along_u + ny * along_n
        spine_pts.append((bx, by, bt))

    # Pass 2A: 1px Dark Abyssal Selout around entire Crescent Reaper-Blade
    for idx in range(len(spine_pts)):
        bx, by, bt = spine_pts[idx]
        if idx < len(spine_pts) - 1:
            tx = spine_pts[idx + 1][0] - bx
            ty = spine_pts[idx + 1][1] - by
        else:
            tx = bx - spine_pts[idx - 1][0]
            ty = by - spine_pts[idx - 1][1]
        tlen = max(1e-4, math.hypot(tx, ty))
        # Outer convex spine normal vs inner concave cutting-edge normal
        # As blade sweeps along +n and hooks toward -u, (+ux, +uy) points to outer convex back!
        ox_n, oy_n = -ty / tlen * fang_side, tx / tlen * fang_side
        # Guarantee outer normal points forward (+u) near base
        if idx == 0 and (ox_n * ux + oy_n * uy) < 0:
            ox_n, oy_n = -ox_n, -oy_n
        elif idx > 0:
            # Maintain consistent orientation with previous point
            pass

        # Compute chord width (broad menacing belly at bt ~ 0.28, needle reaper point at bt = 1.0)
        if bt < 0.25:
            chord_w = (3.8 + bt * 10.5) * f_scale
        else:
            chord_w = (6.42 * ((1.0 - (bt - 0.25) / 0.75) ** 0.76)) * f_scale
        chord_w = max(0.35, chord_w)
        spine_pts[idx] = (bx, by, bt, chord_w)

    # Consistent normal pointing toward outer convex back (+u/+n outer arch)
    for idx in range(len(spine_pts)):
        bx, by, bt, chord_w = spine_pts[idx]
        p0 = spine_pts[max(0, idx - 1)]
        p1 = spine_pts[min(len(spine_pts) - 1, idx + 1)]
        ddx, ddy = p1[0] - p0[0], p1[1] - p0[1]
        dl = max(1e-4, math.hypot(ddx, ddy))
        # Candidate normal
        cn_x, cn_y = -ddy / dl, ddx / dl
        # Outer convex back faces roughly +ux at base and +nx near tip
        ref_x = ux * (1.0 - bt * 0.6) + nx * (bt * 0.8)
        ref_y = uy * (1.0 - bt * 0.6) + ny * (bt * 0.8)
        if cn_x * ref_x + cn_y * ref_y < 0:
            cn_x, cn_y = -cn_x, -cn_y

        put_px_160(arr, bx + cn_x * 1.5, by + cn_y * 1.5, C_OUT_LIT)
        put_px_160(arr, bx - cn_x * (chord_w + 0.95), by - cn_y * (chord_w + 0.95), C_OUT_DARK)

    # Tip Selout
    tbx, tby, _, _ = spine_pts[-1]
    put_px_160(arr, tbx - ux * 0.9 + nx * 0.6, tby - uy * 0.9 + ny * 0.6, C_OUT_DARK)

    # Pass 2B: Bone-Silver Convex Spine -> Obsidian Fuller -> Violet Rune Vein -> Crimson-White Soul Edge!
    pulse = 0.5 + 0.5 * math.sin(rune_phase)
    for idx in range(len(spine_pts)):
        bx, by, bt, chord_w = spine_pts[idx]
        p0 = spine_pts[max(0, idx - 1)]
        p1 = spine_pts[min(len(spine_pts) - 1, idx + 1)]
        ddx, ddy = p1[0] - p0[0], p1[1] - p0[1]
        dl = max(1e-4, math.hypot(ddx, ddy))
        cn_x, cn_y = -ddy / dl, ddx / dl
        ref_x = ux * (1.0 - bt * 0.6) + nx * (bt * 0.8)
        ref_y = uy * (1.0 - bt * 0.6) + ny * (bt * 0.8)
        if cn_x * ref_x + cn_y * ref_y < 0:
            cn_x, cn_y = -cn_x, -cn_y

        samples = int((chord_w + 1.2) * 3.0) + 1
        for s_i in range(-3, samples + 1):
            # depth_in: negative = outer bone-silver spine, positive = inner concave soul-reaping edge
            depth_in = s_i / 3.0
            if depth_in < -0.75 or depth_in > chord_w:
                continue
            frac = (depth_in + 0.75) / max(0.6, chord_w + 0.75)
            if frac < 0.24:
                col = C_BONE_SPEC if bt < 0.65 else C_BONE_LIT
            elif frac < 0.48:
                col = C_OBSIDIAN_DEEP if bt < 0.75 else C_BONE_MID
            elif frac < 0.70:
                col = C_SOUL_WHITE if (pulse > 0.72 and int(bt * 16) % 3 == 0) else C_ORCHID_BRIGHT
            elif frac < 0.88:
                col = C_CRIMSON_EDGE
            else:
                col = C_SOUL_WHITE
            put_px_160(arr, bx - cn_x * depth_in, by - cn_y * depth_in, col)

    # --- Pass 3: Horned Violet Soul-Eye Collar at Snath Socket ---
    draw_disc_160(arr, head_x, head_y, 3.0, C_OUT_DARK)
    draw_disc_160(arr, head_x, head_y, 2.1, C_BONE_LIT)
    draw_disc_160(arr, head_x, head_y, 1.2, C_CRIMSON_EDGE)
    put_px_160(arr, head_x, head_y, C_SOUL_WHITE)

    # Twin Clawed Gauntlets clasped along the two-handed Reaper Snath
    if draw_gauntlets:
        for gd in (-4.2, 3.4):
            hx = grip_x + ux * gd
            hy = grip_y + uy * gd
            draw_disc_160(arr, hx, hy, 2.3, C_OUT_DARK)
            draw_disc_160(arr, hx, hy, 1.5, C_OBSIDIAN_MID)
            put_px_160(arr, hx - nx * 0.7, hy - ny * 0.7, C_BONE_LIT)


def draw_soul_glint_160(arr, cx, cy, arm_len=6, core_r=1.8):
    ix, iy = int(round(cx)), int(round(cy))
    for d in range(-arm_len, arm_len + 1):
        col = C_SOUL_WHITE if abs(d) <= 2 else (C_CRIMSON_EDGE if abs(d) <= arm_len - 2 else C_ORCHID_BELLY)
        put_px_160(arr, ix + d, iy, col)
        put_px_160(arr, ix, iy + d, col)
    diag = max(1, arm_len // 2)
    for d in range(-diag, diag + 1):
        put_px_160(arr, ix + d, iy + d, C_ORCHID_BRIGHT)
        put_px_160(arr, ix + d, iy - d, C_ORCHID_BRIGHT)
    draw_disc_160(arr, ix, iy, core_r, C_SOUL_WHITE)


def draw_reaper_serrated_smear_160(
    arr,
    cx,
    cy,
    tail_deg,
    lead_deg,
    sweep_dir=1,
    rx_outer=74.0,
    ry_outer=52.0,
    max_thickness=30.0,
    n_teeth=8,
    tooth_depth=11.5,
    phase=0.0,
):
    """
    Hand-sculpted 4-band FFBE Reaper-Scythe serrated crescent smear fan on 160x120:
      #fdf4ff (soul-white rim) -> #f43f5e (crimson soul edge) ->
      #c084fc (violet-orchid belly) -> #3b0764 (tattered soul-rip teeth)
    """
    t0 = tail_deg % 360.0
    t1 = lead_deg % 360.0
    total_span = ((t1 - t0) % 360.0) if sweep_dir > 0 else ((t0 - t1) % 360.0)
    if total_span < 4.0:
        return

    yy, xx = np.mgrid[0:LOGICAL_H, 0:LOGICAL_W]
    raw_dx = xx.astype(np.float32) - cx
    raw_dy = yy.astype(np.float32) - cy
    rx_lt = min(rx_outer, max(18.0, cx - 10.0))
    rx_rt = min(rx_outer, max(24.0, (LOGICAL_W - 10.5) - cx))
    ry_up = min(ry_outer, max(16.0, cy - 10.0))
    ry_dn = min(ry_outer, max(16.0, (LOGICAL_H - 6.5) - cy))
    rx_eff = np.where(raw_dx < 0.0, rx_lt, rx_rt)
    ry_eff = np.where(raw_dy < 0.0, ry_up, ry_dn)
    dx = raw_dx / np.maximum(1.0, rx_eff)
    dy = raw_dy / np.maximum(1.0, ry_eff)
    r_norm = np.hypot(dx, dy)
    ang = np.degrees(np.arctan2(raw_dy, raw_dx)) % 360.0

    rel = ((ang - t0) % 360.0) if sweep_dir > 0 else ((t0 - ang) % 360.0)
    in_arc = rel <= total_span
    u = np.clip(rel / max(1.0, total_span), 0.0, 1.0)

    r_out = 0.83 + 0.17 * np.maximum(0.0, np.sin(np.pi * (u ** 0.76)))
    sin_u = np.maximum(0.0, np.sin(np.pi * (u ** 0.70)))
    thick_norm = (max_thickness / max(1.0, 0.5 * (rx_outer + ry_outer))) * (sin_u ** 0.80)
    thick_norm = np.maximum(0.025 * (1.0 - u), thick_norm)

    # Tattered sawtooth soul-rip notches along inner edge
    saw = (u * n_teeth + phase) % 1.0
    serration = (tooth_depth / max(1.0, 0.5 * (rx_outer + ry_outer))) * ((1.0 - saw) ** 2.0) * np.maximum(0.0, np.sin(np.pi * u))
    r_in = r_out - thick_norm + serration

    body_mask = in_arc & (r_norm >= r_in) & (r_norm <= r_out)
    bayer_tile = BAYER4[yy % 4, xx % 4]
    tail_keep = (u >= 0.24) | (bayer_tile < (u / 0.24))
    edge_dist = np.minimum(
        np.minimum(xx - 4, (LOGICAL_W - 5) - xx),
        np.minimum(yy - 4, (LOGICAL_H - 5) - yy),
    ).astype(np.float32)
    margin_taper = (edge_dist >= 5.0) | ((edge_dist > 0.0) & (bayer_tile < (edge_dist / 5.0)))
    tail_keep &= margin_taper
    body_mask &= tail_keep

    safe_box = (
        (xx >= MARGIN_LOGICAL + 2)
        & (xx <= LOGICAL_W - MARGIN_LOGICAL - 3)
        & (yy >= MARGIN_LOGICAL + 2)
        & (yy <= LOGICAL_H - MARGIN_LOGICAL - 3)
    )
    body_mask &= safe_box
    if not np.any(body_mask):
        return

    rim_selout = in_arc & safe_box & tail_keep & (r_norm > r_out) & (r_norm <= r_out + (1.25 / max(1.0, rx_outer)))
    arr[rim_selout] = C_OUT_LIT

    denom = np.maximum(0.02, r_out - r_in)
    v = np.clip((r_norm - r_in) / denom, 0.0, 1.0)

    arr[body_mask & (v < 0.26)] = C_ABYSS_TEETH
    arr[body_mask & (v >= 0.26) & (v < 0.58)] = C_ORCHID_BELLY
    arr[body_mask & (v >= 0.58) & (v < 0.84)] = C_CRIMSON_EDGE
    arr[body_mask & (v >= 0.84)] = C_SOUL_WHITE

    # Tattered inner soul-shear wisps inside the scythe crescent hollow
    for s_idx, r_off in enumerate((0.06, 0.13)):
        u_lo = 0.22 + s_idx * 0.12
        u_hi = 0.84 - s_idx * 0.08
        r_streak = r_in - r_off
        streak = (
            in_arc
            & safe_box
            & (u >= u_lo)
            & (u <= u_hi)
            & (np.abs(r_norm - r_streak) <= (0.85 / max(1.0, rx_outer)))
        )
        arr[streak] = C_CRIMSON_EDGE if s_idx == 0 else C_ORCHID_BELLY


def draw_reaper_vortex_smear_160(
    arr,
    cx,
    cy,
    rx=74.0,
    ry=23.0,
    tilt_deg=-9.0,
    front_thickness=20.0,
    half="both",
    erosion=0.0,
):
    """
    2.5D tilted perspective horizontal Thanatos Vortex Reap smear ring.
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

    front_weight = 0.25 + 0.75 * np.clip(0.5 + 0.5 * np.sin(theta), 0.0, 1.0)
    right_bulge = 0.38 + 0.62 * np.clip(0.5 + 0.5 * np.cos(theta), 0.0, 1.0)
    w_norm = (front_thickness / max(1.0, rx)) * front_weight * right_bulge * max(0.15, 1.0 - erosion)

    u_ang = (theta + math.pi) / (2.0 * math.pi)
    saw = (u_ang * 11.0 + erosion * 2.2) % 1.0
    serr = 0.14 * (1.0 - erosion) * ((1.0 - saw) ** 2.0) * front_weight * right_bulge

    r_out = 1.0
    r_in = r_out - w_norm + serr

    safe_box = (
        (xx >= MARGIN_LOGICAL + 2)
        & (xx <= LOGICAL_W - MARGIN_LOGICAL - 3)
        & (yy >= MARGIN_LOGICAL + 2)
        & (yy <= LOGICAL_H - MARGIN_LOGICAL - 3)
    )
    bayer_tile = BAYER4[yy % 4, xx % 4]
    edge_dist = np.minimum(
        np.minimum(xx - 4, (LOGICAL_W - 5) - xx),
        np.minimum(yy - 4, (LOGICAL_H - 5) - yy),
    ).astype(np.float32)
    margin_taper = (edge_dist >= 5.0) | ((edge_dist > 0.0) & (bayer_tile < (edge_dist / 5.0)))
    if erosion > 0.02:
        keep = ((right_bulge > erosion * 0.85) | (bayer_tile > erosion)) & margin_taper
    else:
        keep = margin_taper

    mask = hemi & safe_box & keep & (enorm >= r_in) & (enorm <= r_out)
    if not np.any(mask):
        return

    sel = hemi & safe_box & keep & (enorm > r_out) & (enorm <= r_out + (1.2 / max(1.0, rx)))
    arr[sel] = C_OUT_LIT

    v = np.clip((enorm - r_in) / np.maximum(0.02, r_out - r_in), 0.0, 1.0)
    arr[mask & (v < 0.28)] = C_ABYSS_TEETH
    arr[mask & (v >= 0.28) & (v < 0.60)] = C_ORCHID_BELLY
    arr[mask & (v >= 0.60) & (v < 0.84)] = C_CRIMSON_EDGE
    arr[mask & (v >= 0.84)] = C_SOUL_WHITE


def draw_thanatos_death_wings_160(arr, back_x, back_y, span_scale=1.0, phase=0.0):
    """
    Renders 6-pinion tattered Crimson-Violet Archangel-of-Death Wings behind
    Malakor EX during Row 4 Death's Sovereignty & Memento Mori Sky Ascent.
    """
    pinions = [
        (-154.0, 43.0, 3.3),
        (-137.0, 37.0, 2.8),
        (-119.0, 30.0, 2.2),
        (-32.0,  39.0, 3.1),
        (-16.0,  31.0, 2.4),
    ]
    for w_idx, (base_ang, base_len, base_hw) in enumerate(pinions):
        length = base_len * span_scale
        ang = math.radians(base_ang + math.sin(phase + w_idx * 0.9) * 3.0)
        ux, uy = math.cos(ang), math.sin(ang)
        nx, ny = -uy, ux
        steps = int(length * 2.2) + 1
        for s in range(steps + 1):
            t = s / max(1, steps)
            px = back_x + ux * (t * length)
            py = back_y + uy * (t * length)
            hw = base_hw * (1.0 - 0.72 * t)
            put_px_160(arr, px + nx * (hw + 0.9), py + ny * (hw + 0.9), C_OUT_DARK)
            put_px_160(arr, px - nx * (hw + 0.9), py - ny * (hw + 0.9), C_OUT_LIT)
            for k_i in range(-4, 5):
                k = k_i * 0.65
                if abs(k) <= hw:
                    col = C_SOUL_WHITE if abs(k) < 0.45 else (C_CRIMSON_EDGE if t < 0.48 else C_ORCHID_BELLY)
                    put_px_160(arr, px + nx * k, py + ny * k, col)


def draw_bone_obelisk_pillar_160(arr, impact_x, top_y=11, bot_y=114, half_w=5.2):
    """
    Vertical Guillotine Bone-Obelisk & Soul-Fissure eruption column for Beat 4 (R2 F25)
    and Oblivion Guillotine (R4 F22) with pointed gothic spire crown + Bayer tip taper.
    """
    eff_top = max(11, int(top_y))
    ix = min(LOGICAL_W - 14, max(14, int(round(impact_x))))
    ihw = int(math.ceil(half_w))
    for y in range(eff_top, min(LOGICAL_H - MARGIN_LOGICAL - 2, int(bot_y) + 1)):
        vt = (y - eff_top) / max(1.0, float(bot_y - eff_top))
        crown_taper = min(1.0, vt / 0.18) ** 0.85
        cur_hw = half_w * crown_taper * (0.38 + 0.62 * math.sin(vt * math.pi * 0.88))
        for dx in range(-ihw - 1, ihw + 2):
            adx = abs(dx)
            if adx <= cur_hw:
                if vt < 0.14 and BAYER4[y % 4, (ix + dx) % 4] > (vt / 0.14 + 0.18):
                    continue
                if adx <= cur_hw * 0.30:
                    col = C_SOUL_WHITE
                elif adx <= cur_hw * 0.65:
                    col = C_CRIMSON_EDGE
                else:
                    col = C_ORCHID_BELLY if (y // 3) % 2 == 0 else C_ABYSS_TEETH
                put_px_160(arr, ix + dx, y, col, margin=6)
    fiss_w = int(half_w * 3.6)
    for dx in range(-fiss_w, fiss_w + 1):
        if 8 <= ix + dx <= LOGICAL_W - 9:
            col = C_SOUL_WHITE if abs(dx) < fiss_w * 0.32 else (C_CRIMSON_EDGE if abs(dx) < fiss_w * 0.68 else C_ORCHID_BELLY)
            put_px_160(arr, ix + dx, bot_y, col, margin=6)
            if abs(dx) < fiss_w * 0.52:
                put_px_160(arr, ix + dx, bot_y - 1, C_ABYSS_TEETH, margin=6)


def draw_soul_sparks_160(arr, impact_x, ground_y, spread=22.0, progress=0.0, count=7):
    for i in range(count):
        frac = (i / max(1, count - 1)) * 2.0 - 1.0
        ang = math.radians(-90.0 + frac * 68.0)
        dist = (4.0 + progress * spread) * (0.65 + 0.35 * ((i * 37) % 5) / 4.0)
        sx = impact_x + math.cos(ang) * dist
        sy = min(ground_y, ground_y + math.sin(ang) * dist * 0.55)
        col = C_SOUL_WHITE if progress < 0.35 else (C_CRIMSON_EDGE if i % 2 == 0 else C_ORCHID_BELLY)
        put_px_160(arr, sx, sy, col)
        if progress < 0.65:
            put_px_160(arr, sx - math.cos(ang) * 1.5, min(ground_y, sy - math.sin(ang) * 1.0), C_ABYSS_TEETH)


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
    grip_rel_sh=(12.0, 4.0),
    weapon_deg=18.0,
    shaft_len=44.0,
    fang_side=1.0,
    weapon_layer="front",
    shroud_deg=170.0,
    shroud_len=33.0,
    shroud_phase=0.0,
    shroud_amp=3.4,
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
    l_target_hi = (grip_hi[0] - w_ux * 4.0 * S_HI, grip_hi[1] - w_uy * 4.0 * S_HI)
    r_target_hi = (grip_hi[0] + w_ux * 3.2 * S_HI, grip_hi[1] + w_uy * 3.2 * S_HI)

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

    if pre_fn is not None:
        pre_fn(frame, neck_160, grip_160)

    draw_reaper_shroud_ribbons_160(
        frame,
        neck_160[0] - 2.0,
        neck_160[1] + 2.0,
        base_deg=shroud_deg,
        length=shroud_len,
        wave_phase=shroud_phase,
        wave_amp=shroud_amp,
    )

    if weapon_layer == "behind":
        draw_thanatos_great_scythe_160(
            frame, grip_160[0], grip_160[1], weapon_deg,
            shaft_len=shaft_len, fang_side=fang_side, rune_phase=rune_phase, draw_gauntlets=False,
        )

    mask_b = body_160[:, :, 3] > 128
    frame[mask_b] = body_160[mask_b]

    if weapon_layer != "behind":
        draw_thanatos_great_scythe_160(
            frame, grip_160[0], grip_160[1], weapon_deg,
            shaft_len=shaft_len, fang_side=fang_side, rune_phase=rune_phase, draw_gauntlets=True,
        )

    if post_fn is not None:
        post_fn(frame, neck_160, grip_160)

    return frame


_BIPEDAL_WALK_KFS = [
    # (u, world_thigh, world_knee_bend, ankle_flex, hip_yaw_hi, hip_lift_hi)
    (0.00, -25.0,  2.0,  -8.0,   7.5,   3.5),  # Front Heel Contact (+X plant at F00 / F15)
    (0.08, -16.5,  3.0,   0.0,   5.0,   2.0),  # Early flat-foot weight acceptance
    (0.20,   1.5,  2.0,   0.0,   0.0,   0.0),  # Mid-stance vertical pillar (-X sole slide!)
    (0.33,  14.5,  3.0,   6.0,  -4.5,   2.5),  # Late stance behind pelvis
    (0.45,  23.0,  7.0,  14.0,  -7.5,   3.5),  # Rear push-off peak
    (0.50,  21.5, 14.0,  14.0,  -7.5,  -1.0),  # Trailing push-off (in sole band at F00/F15 for >=56px span)
    (0.533, 14.0, 56.0,  14.0,  -5.0, -34.0),  # F01/F16 immediate lift & -X heel tuck above sole band!
    (0.64,  -4.0, 62.0,  14.0,  -1.0, -44.0),  # High folded swing (-X heel tuck)
    (0.74, -22.0, 58.0,  10.0,   2.5, -42.0),  # Crossover apex (F07 Right / F22 Left: knee +X, shin tucked -X!)
    (0.85, -26.5, 30.0,  -2.0,   5.5, -22.0),  # High forward unfold
    (0.93, -26.5,  9.0,  -8.0,   7.0,  -3.5),  # Terminal swing descending to heel-strike
    (1.00, -25.0,  2.0,  -8.0,   7.5,   3.5),
]


def _bone_rest_deg_stand(p0, p1):
    return math.degrees(math.atan2(p0[0] - p1[0], p1[1] - p0[1]))


def _sample_bipedal_walk(u):
    u = u % 1.0
    for i in range(len(_BIPEDAL_WALK_KFS) - 1):
        u0, *v0 = _BIPEDAL_WALK_KFS[i]
        u1, *v1 = _BIPEDAL_WALK_KFS[i + 1]
        if u0 <= u <= u1:
            t = (u - u0) / max(1e-6, u1 - u0)
            s = t * t * (3.0 - 2.0 * t)
            return tuple(a + (b - a) * s for a, b in zip(v0, v1))
    return _BIPEDAL_WALK_KFS[0][1:]


def _shade_crop_tuple(part_tuple, factor=0.85):
    if abs(factor - 1.0) < 1e-3:
        return part_tuple
    im, x0, y0 = part_tuple
    arr = np.array(im, dtype=np.float32)
    m = arr[:, :, 3] > 128
    arr[m, :3] = np.clip(arr[m, :3] * factor, 0.0, 255.0)
    return (Image.fromarray(arr.astype(np.uint8), "RGBA"), x0, y0)


def _scale_rgba(col, factor):
    if abs(factor - 1.0) < 1e-3:
        return col
    return (
        max(0, min(255, int(round(col[0] * factor)))),
        max(0, min(255, int(round(col[1] * factor)))),
        max(0, min(255, int(round(col[2] * factor)))),
        col[3],
    )


def _draw_tapered_plate_seg_hi(draw, p0, p1, w0_rear, w0_front, w1_rear, w1_front, far_shade=1.0):
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    seg_len = max(1.0, math.hypot(dx, dy))
    ux, uy = dx / seg_len, dy / seg_len
    # Normal pointing +X front when leg points down (ux=0, uy=1 -> nx=+1, ny=0)
    nx, ny = uy, -ux

    def pt(base, along, side):
        return (int(round(base[0] + ux * along + nx * side)), int(round(base[1] + uy * along + ny * side)))

    # Dark Selout outer shell
    outer_poly = [
        pt(p0, -4, -w0_rear - 4),
        pt(p0, -4, w0_front + 4),
        pt(p1, 4, w1_front + 4),
        pt(p1, 4, -w1_rear - 4),
    ]
    draw.polygon(outer_poly, fill=C_OUT_DARK)

    # Rear obsidian shadow plate
    base_poly = [
        pt(p0, -2, -w0_rear),
        pt(p0, -2, w0_front),
        pt(p1, 2, w1_front),
        pt(p1, 2, -w1_rear),
    ]
    draw.polygon(base_poly, fill=_scale_rgba(C_OBSIDIAN_DEEP, far_shade))

    # Royal-violet necropolis midplate beveled toward +X front
    mid_poly = [
        pt(p0, 0, -w0_rear * 0.45),
        pt(p0, 0, w0_front * 0.92),
        pt(p1, 0, w1_front * 0.92),
        pt(p1, 0, -w1_rear * 0.45),
    ]
    draw.polygon(mid_poly, fill=_scale_rgba((58, 22, 108, 255), far_shade))

    # Cold bone-slate front armored bevel ridge
    front_poly = [
        pt(p0, 2, w0_front * 0.22),
        pt(p0, 2, w0_front * 0.85),
        pt(p1, -2, w1_front * 0.85),
        pt(p1, -2, w1_front * 0.22),
    ]
    draw.polygon(front_poly, fill=_scale_rgba(C_BONE_SHAD, far_shade))


def _draw_dread_plate_leg_hi(canvas, hip_dst, knee_dst, ank_dst, far_shade=1.0):
    """Paints wide 3D-shaded obsidian-violet dread-plate thigh cuisses, flanged knee-cops & greaves."""
    draw = ImageDraw.Draw(canvas)
    _draw_tapered_plate_seg_hi(draw, hip_dst, knee_dst, 29.0, 26.0, 26.0, 24.0, far_shade=far_shade)
    _draw_tapered_plate_seg_hi(draw, knee_dst, ank_dst, 28.0, 27.0, 18.0, 18.0, far_shade=far_shade)

    # Pointed obsidian-violet knee-cop / poleyn shield
    kx, ky = knee_dst
    poleyn_out = [(kx - 25, ky - 15), (kx + 11, ky - 23), (kx + 29, ky - 2), (kx + 13, ky + 22), (kx - 23, ky + 18)]
    poleyn_in = [(kx - 20, ky - 11), (kx + 9, ky - 18), (kx + 23, ky - 2), (kx + 10, ky + 17), (kx - 19, ky + 14)]
    poleyn_rim = [(kx - 4, ky - 12), (kx + 9, ky - 15), (kx + 19, ky - 2), (kx + 8, ky + 12)]
    draw.polygon(poleyn_out, fill=C_OUT_DARK)
    draw.polygon(poleyn_in, fill=_scale_rgba(C_OBSIDIAN_MID, far_shade))
    draw.polygon(poleyn_rim, fill=_scale_rgba(C_BONE_MID, far_shade))
    draw.ellipse([kx - 5, ky - 6, kx + 7, ky + 5], fill=_scale_rgba(C_CRIMSON_MID, far_shade))


def _draw_parting_necro_coat_hi(canvas, dst_pelvis, l_th_deg, r_th_deg, wave_ph):
    """Paints billowing parting abyssal necro-coat & crimson-hemmed tabard flanks down to y=204 above the boot band."""
    draw = ImageDraw.Draw(canvas)
    px, py = dst_pelvis
    swing_back = 12.0 + max(0.0, l_th_deg, r_th_deg) * 0.55 + math.sin(wave_ph) * 5.0
    swing_front = 10.0 + max(0.0, -l_th_deg, -r_th_deg) * 0.45 + math.cos(wave_ph) * 4.5
    top_y = py + 12.0
    # Anchor coat hem solidly at logical y=102 (204..205 in 320-space) so y=184..204 stays >=36px while y=206..233 remains 100% pure boots!
    hem_y = min(ANCHOR_HI_Y - 12.05 * S_HI, py + 174.0)

    # Trailing rear abyssal coattail panel (-X back drape through y=184..204)
    rear_out = [
        (px - 28, top_y),
        (px - 2, top_y + 16),
        (px - 6 - swing_back * 0.30, top_y + 92),
        (px - 10 - swing_back * 0.42, hem_y),
        (px - 68 - swing_back * 0.90, hem_y),
        (px - 64 - swing_back * 0.65, top_y + 82),
    ]
    rear_deep = [
        (px - 24, top_y + 4),
        (px - 6, top_y + 18),
        (px - 10 - swing_back * 0.30, top_y + 92),
        (px - 14 - swing_back * 0.42, hem_y - 3),
        (px - 62 - swing_back * 0.88, hem_y - 3),
        (px - 58 - swing_back * 0.62, top_y + 82),
    ]
    rear_mid = [
        (px - 26, top_y + 14),
        (px - 14 - swing_back * 0.22, top_y + 86),
        (px - 18 - swing_back * 0.40, hem_y - 10),
        (px - 48 - swing_back * 0.80, hem_y - 10),
        (px - 50 - swing_back * 0.60, top_y + 82),
    ]
    rear_crimson = [
        (px - 15 - swing_back * 0.42, hem_y - 10),
        (px - 61 - swing_back * 0.88, hem_y - 10),
        (px - 62 - swing_back * 0.88, hem_y - 3),
        (px - 14 - swing_back * 0.42, hem_y - 3),
    ]
    draw.polygon(rear_out, fill=C_OUT_DARK)
    draw.polygon(rear_deep, fill=(46, 16, 101, 255))
    draw.polygon(rear_mid, fill=C_SHROUD_DEEP)
    draw.polygon(rear_crimson, fill=C_CRIMSON_DARK)

    # Forward-parting outer coat flank (+X side drape framing thigh & knee down to y=204)
    front_hem = min(hem_y - 0.5, py + 173.0)
    front_out = [
        (px + 12, top_y + 4),
        (px + 34, top_y + 12),
        (px + 44 + swing_front * 0.45, top_y + 88),
        (px + 40 + swing_front * 0.62, front_hem),
        (px + 18 + swing_front * 0.32, front_hem - 4),
        (px + 20, top_y + 86),
    ]
    front_fill = [
        (px + 15, top_y + 8),
        (px + 30, top_y + 14),
        (px + 39 + swing_front * 0.45, top_y + 88),
        (px + 36 + swing_front * 0.58, front_hem - 4),
        (px + 22 + swing_front * 0.32, front_hem - 8),
        (px + 22, top_y + 86),
    ]
    front_rim = [
        (px + 22 + swing_front * 0.32, front_hem - 10),
        (px + 36 + swing_front * 0.58, front_hem - 7),
        (px + 36 + swing_front * 0.58, front_hem - 3),
        (px + 22 + swing_front * 0.32, front_hem - 6),
    ]
    draw.polygon(front_out, fill=C_OUT_DARK)
    draw.polygon(front_fill, fill=C_OBSIDIAN_DEEP)
    draw.polygon(front_rim, fill=C_CRIMSON_DARK)


def _draw_waist_tasset_hi(canvas, dst_pelvis):
    """Paints an armored center-pelvis obsidian-crimson tasset chevron uniting hips with dread greaves."""
    draw = ImageDraw.Draw(canvas)
    px, py = dst_pelvis
    top_y = py + 12.0
    out_poly = [(px - 22, top_y), (px + 24, top_y), (px + 20, top_y + 52), (px + 2, top_y + 74), (px - 18, top_y + 52)]
    in_poly = [(px - 17, top_y + 4), (px + 19, top_y + 4), (px + 16, top_y + 48), (px + 2, top_y + 67), (px - 14, top_y + 48)]
    trim_poly = [(px - 12, top_y + 42), (px + 2, top_y + 62), (px + 14, top_y + 42), (px + 2, top_y + 52)]
    draw.polygon(out_poly, fill=C_OUT_DARK)
    draw.polygon(in_poly, fill=C_OBSIDIAN_MID)
    draw.polygon(trim_poly, fill=C_CRIMSON_MID)


def render_stand_rig_frame_160(
    parts,
    stand_joints,
    pelvis_dx=0.0,
    pelvis_dy=0.0,
    torso_deg=0.0,
    head_deg=0.0,
    l_coat_deg=0.0,
    r_coat_deg=0.0,
    coat_wave_ph=0.0,
    coat_wave_amp=8.0,
    coat_y_offset_160=0.0,
    coat_x_inward_frac=0.0,
    coat_squash_x=1.0,
    coat_squash_y=1.0,
    l_thigh_deg=0.0,
    l_shin_deg=0.0,
    l_foot_deg=0.0,
    r_thigh_deg=0.0,
    r_shin_deg=0.0,
    r_foot_deg=0.0,
    hip_inward_frac=0.0,
    l_hip_off_hi=(0.0, 0.0),
    r_hip_off_hi=(0.0, 0.0),
    neutralize_leg_rest=False,
    uniform_side_boots=False,
    heavy_greaves=False,
    shade_far_leg=1.0,
    grip_rel_sh=(8.5, 9.0),
    weapon_deg=-24.0,
    shaft_len=44.0,
    fang_side=1.0,
    weapon_layer="front",
    weapon_abs_160=None,
    shroud_deg=170.0,
    shroud_len=33.0,
    shroud_phase=0.0,
    shroud_amp=3.2,
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
    l_coat_raw = map_torso_pt(sj["l_coat"])
    r_coat_raw = map_torso_pt(sj["r_coat"])
    spine_hip_x = ANCHOR_HI_X + pelvis_dx * S_HI
    l_coat_dst = (
        l_coat_raw[0] + (spine_hip_x - l_coat_raw[0]) * coat_x_inward_frac,
        l_coat_raw[1] + coat_y_offset_160 * S_HI,
    )
    r_coat_dst = (
        r_coat_raw[0] + (spine_hip_x - r_coat_raw[0]) * coat_x_inward_frac,
        r_coat_raw[1] + coat_y_offset_160 * S_HI,
    )
    l_hip_raw = map_torso_pt(sj["l_hip"])
    r_hip_raw = map_torso_pt(sj["r_hip"])
    r_sole_eq_hi = 0.0
    if neutralize_leg_rest:
        def _leg_sole_reach(side):
            hs, ks, ak = sj[f"{side}_hip"], sj[f"{side}_knee"], sj[f"{side}_ankle"]
            foot_key = "r_foot" if uniform_side_boots else f"{side}_foot"
            ank_key = "r_ankle" if uniform_side_boots else f"{side}_ankle"
            fim, _, fy0 = parts[foot_key]
            return math.hypot(ks[0] - hs[0], ks[1] - hs[1]) + math.hypot(ak[0] - ks[0], ak[1] - ks[1]) + (fy0 + fim.size[1] - sj[ank_key][1])
        r_sole_eq_hi = (_leg_sole_reach("l") - _leg_sole_reach("r")) + (l_hip_raw[1] - r_hip_raw[1])
    l_hip_dst = (
        l_hip_raw[0] + (spine_hip_x - l_hip_raw[0]) * hip_inward_frac + l_hip_off_hi[0],
        l_hip_raw[1] + l_hip_off_hi[1],
    )
    r_hip_dst = (
        r_hip_raw[0] + (spine_hip_x - r_hip_raw[0]) * hip_inward_frac + r_hip_off_hi[0],
        r_hip_raw[1] + r_sole_eq_hi + r_hip_off_hi[1],
    )

    def pose_leg(side, hip_dst, th_deg, sh_deg, ft_deg):
        hip_s = sj[f"{side}_hip"]
        knee_s = sj[f"{side}_knee"]
        ank_s = sj[f"{side}_ankle"]
        if neutralize_leg_rest:
            th_rot = th_deg - _bone_rest_deg_stand(hip_s, knee_s)
            sh_rot = (th_deg + sh_deg) - _bone_rest_deg_stand(knee_s, ank_s)
            ft_rot = max(-10.0, min(14.0, ft_deg))
        else:
            th_rot = th_deg
            sh_rot = th_deg + sh_deg
            ft_rot = th_deg + sh_deg + ft_deg
        knee_unrot = (hip_dst[0] + (knee_s[0] - hip_s[0]), hip_dst[1] + (knee_s[1] - hip_s[1]))
        knee_dst = rot_pt(knee_unrot, hip_dst, th_rot)
        ank_unrot = (knee_dst[0] + (ank_s[0] - knee_s[0]), knee_dst[1] + (ank_s[1] - knee_s[1]))
        ank_dst = rot_pt(ank_unrot, knee_dst, sh_rot)
        return knee_dst, ank_dst, th_rot, sh_rot, ft_rot

    l_knee_dst, l_ank_dst, l_th_rot, l_sh_rot, l_ft_rot = pose_leg("l", l_hip_dst, l_thigh_deg, l_shin_deg, l_foot_deg)
    r_knee_dst, r_ank_dst, r_th_rot, r_sh_rot, r_ft_rot = pose_leg("r", r_hip_dst, r_thigh_deg, r_shin_deg, r_foot_deg)

    mid_sh = (0.5 * (l_sh_dst[0] + r_sh_dst[0]), 0.5 * (l_sh_dst[1] + r_sh_dst[1]))
    if weapon_abs_160 is not None:
        grip_hi = (weapon_abs_160[0] * S_HI, weapon_abs_160[1] * S_HI)
    else:
        grip_hi = (mid_sh[0] + grip_rel_sh[0] * S_HI, mid_sh[1] + grip_rel_sh[1] * S_HI)

    w_rad = math.radians(weapon_deg)
    w_ux, w_uy = math.cos(w_rad), math.sin(w_rad)
    l_target_hi = (grip_hi[0] - w_ux * 3.8 * S_HI, grip_hi[1] - w_uy * 3.8 * S_HI)
    r_target_hi = (grip_hi[0] + w_ux * 3.0 * S_HI, grip_hi[1] + w_uy * 3.0 * S_HI)

    r_hip_br, r_knee_br = leg_bridge_r if leg_bridge_r is not None else (8, 6)

    l_thigh_part = _shade_crop_tuple(parts["l_thigh"], shade_far_leg)
    l_shin_part = _shade_crop_tuple(parts["l_shin"], shade_far_leg)
    l_foot_src = parts["r_foot"] if uniform_side_boots else parts["l_foot"]
    l_ankle_pivot = sj["r_ankle"] if uniform_side_boots else sj["l_ankle"]
    l_foot_part = _shade_crop_tuple(l_foot_src, shade_far_leg)

    if heavy_greaves:
        _draw_parting_necro_coat_hi(win_hi, dst_pelvis, l_thigh_deg, r_thigh_deg, coat_wave_ph)

    paste_rotated_part(
        win_hi, parts["l_coat"], sj["l_coat"], l_coat_dst,
        deg=torso_deg + l_coat_deg, squash_x=coat_squash_x, squash_y=coat_squash_y,
        wave_phase=coat_wave_ph, wave_amp=coat_wave_amp,
    )
    paste_ik_arm_hi(win_hi, parts, sj, "l", l_sh_dst, l_target_hi, bend_sign=bend_l)

    draw_joint_bridge_hi(win_hi, l_hip_dst, l_knee_dst, r=r_hip_br)
    draw_joint_bridge_hi(win_hi, l_knee_dst, l_ank_dst, r=r_knee_br)
    if heavy_greaves:
        _draw_dread_plate_leg_hi(win_hi, l_hip_dst, l_knee_dst, l_ank_dst, far_shade=shade_far_leg)
    paste_rotated_part(win_hi, l_thigh_part, sj["l_hip"], l_hip_dst, deg=l_th_rot)
    paste_rotated_part(win_hi, l_shin_part, sj["l_knee"], l_knee_dst, deg=l_sh_rot)
    paste_rotated_part(win_hi, l_foot_part, l_ankle_pivot, l_ank_dst, deg=l_ft_rot)

    paste_rotated_part(
        win_hi, parts["r_coat"], sj["r_coat"], r_coat_dst,
        deg=torso_deg + r_coat_deg, squash_x=coat_squash_x, squash_y=coat_squash_y,
        wave_phase=coat_wave_ph + 1.1, wave_amp=coat_wave_amp * 0.85,
    )
    draw_joint_bridge_hi(win_hi, r_hip_dst, r_knee_dst, r=r_hip_br)
    draw_joint_bridge_hi(win_hi, r_knee_dst, r_ank_dst, r=r_knee_br)
    if heavy_greaves:
        _draw_dread_plate_leg_hi(win_hi, r_hip_dst, r_knee_dst, r_ank_dst, far_shade=1.0)
    paste_rotated_part(win_hi, parts["r_thigh"], sj["r_hip"], r_hip_dst, deg=r_th_rot)
    paste_rotated_part(win_hi, parts["r_shin"], sj["r_knee"], r_knee_dst, deg=r_sh_rot)
    paste_rotated_part(win_hi, parts["r_foot"], sj["r_ankle"], r_ank_dst, deg=r_ft_rot)

    if heavy_greaves:
        _draw_waist_tasset_hi(win_hi, dst_pelvis)

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

    if pre_fn is not None:
        pre_fn(frame, neck_160, grip_160)

    if shroud_len > 1.0:
        draw_reaper_shroud_ribbons_160(
            frame,
            neck_160[0] - 2.0,
            neck_160[1] + 2.0,
            base_deg=shroud_deg,
            length=shroud_len,
            wave_phase=shroud_phase,
            wave_amp=shroud_amp,
        )

    if weapon_layer == "behind":
        draw_thanatos_great_scythe_160(
            frame, grip_160[0], grip_160[1], weapon_deg,
            shaft_len=shaft_len, fang_side=fang_side, rune_phase=rune_phase, draw_gauntlets=False,
        )

    mask_b = body_160[:, :, 3] > 128
    frame[mask_b] = body_160[mask_b]

    if weapon_layer == "front":
        draw_thanatos_great_scythe_160(
            frame, grip_160[0], grip_160[1], weapon_deg,
            shaft_len=shaft_len, fang_side=fang_side, rune_phase=rune_phase, draw_gauntlets=True,
        )

    if post_fn is not None:
        post_fn(frame, neck_160, grip_160)

    return frame


# ==============================================================================
# 7. 10-ROW x 30-FRAME CHOREOGRAPHY (300 CELLS)
# ==============================================================================

def build_row0_idle(parts, sj):
    """Row 0: Sovereign Arch-Reaper Breathing + Tattered Shroud +Monumental Forward Scythe."""
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 2.0 * math.pi
        bob_y = math.sin(ph) * 1.2
        torso_deg = math.sin(ph - 0.4) * 1.5

        def post_idle(arr, neck, _g, step=f, p=ph):
            # Subtle floating Ferryman Soul-Motes behind horned hood
            for m in range(2):
                mx = neck[0] - 12.0 - m * 8.0 + math.sin(p + m * 2.3) * 2.2
                my = neck[1] - 4.0 + m * 11.0 + math.cos(p * 2.0 + m) * 2.0
                put_px_160(arr, mx, my, C_SOUL_WHITE if (step + m) % 3 == 0 else C_ORCHID_BRIGHT)
                put_px_160(arr, mx - 1, my, C_CRIMSON_EDGE)

        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=math.sin(ph) * 0.5,
            pelvis_dy=bob_y,
            torso_deg=torso_deg,
            head_deg=-torso_deg * 0.5,
            l_coat_deg=3.5 + math.sin(ph - 0.7) * 4.5,
            r_coat_deg=-2.0 + math.sin(ph - 1.1) * 3.4,
            coat_wave_ph=ph,
            coat_wave_amp=9.0,
            grip_rel_sh=(9.5, 8.5 + math.sin(ph - 0.3) * 1.0),
            weapon_deg=-24.0 + math.sin(ph - 0.5) * 2.4,
            shaft_len=46.0,
            fang_side=1.0,
            weapon_layer="front",
            shroud_deg=168.0 + math.sin(ph - 0.6) * 4.8,
            shroud_len=33.0,
            shroud_phase=ph * 2.0,
            shroud_amp=3.6,
            rune_phase=ph * 2.0,
            post_fn=post_idle,
        ))
    return frames


def build_row1_walk(parts, sj):
    """
    Row 1: True Centered-Hip Bipedal Crossover Arch-Reaper Stride (F00..F29).
      - F00: Left foot plants forward (+X) & Right foot trails (-X)
      - F07: Right knee lifts & CROSSES OVER anchorX (single-column passing profile)
      - F15: Right foot plants forward (+X) & Left foot trails (-X)
      - F22: Left knee lifts & CROSSES OVER anchorX
    Keeps tattered royal-purple cloak unified with torso above ankles and carries
    the Thanatos Great-Scythe cleanly forward.
    """
    frames = []
    for f in range(30):
        u_l = (f / 30.0) % 1.0
        u_r = (u_l + 0.5) % 1.0
        ph30 = u_l * 2.0 * math.pi
        ph2 = ph30 * 2.0

        l_th, l_kb, l_af, l_yaw, l_lift = _sample_bipedal_walk(u_l)
        r_th, r_kb, r_af, r_yaw, r_lift = _sample_bipedal_walk(u_r)

        bob_y = 1.6 * math.cos(ph2) + 0.2
        stride_sway = math.cos(ph30)

        def post_walk(arr, neck, _g, step=f, p=ph30):
            for m in range(2):
                mx = neck[0] - 12.0 - m * 8.0 + math.sin(p + m * 2.3) * 2.2
                my = neck[1] - 4.0 + m * 11.0 + math.cos(p * 2.0 + m) * 2.0
                put_px_160(arr, mx, my, C_SOUL_WHITE if (step + m) % 3 == 0 else C_ORCHID_BRIGHT)
                put_px_160(arr, mx - 1, my, C_CRIMSON_EDGE)

        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=0.9 + math.sin(ph2) * 0.35,
            pelvis_dy=bob_y,
            torso_deg=2.6 + math.cos(ph2) * 0.75,
            head_deg=-1.4 - math.cos(ph2) * 0.35,
            l_coat_deg=-6.0 + max(0.0, l_th) * 0.35,
            r_coat_deg=5.0 + min(0.0, r_th) * 0.32,
            coat_wave_ph=ph2,
            coat_wave_amp=3.6,
            coat_y_offset_160=-3.4,
            coat_x_inward_frac=0.38,
            coat_squash_x=0.92,
            coat_squash_y=0.84,
            l_thigh_deg=l_th,
            l_shin_deg=l_kb,
            l_foot_deg=l_af,
            r_thigh_deg=r_th,
            r_shin_deg=r_kb,
            r_foot_deg=r_af,
            hip_inward_frac=0.92,
            l_hip_off_hi=(l_yaw, l_lift),
            r_hip_off_hi=(r_yaw, r_lift),
            neutralize_leg_rest=True,
            uniform_side_boots=True,
            heavy_greaves=True,
            shade_far_leg=0.84,
            grip_rel_sh=(9.5 - stride_sway * 0.9, 5.8 + math.sin(ph2) * 0.5),
            weapon_deg=-32.0 + stride_sway * 2.6,
            shaft_len=41.0,
            fang_side=1.0,
            weapon_layer="front",
            shroud_deg=170.0 + math.sin(ph2 - 0.5) * 3.0,
            shroud_len=31.5,
            shroud_phase=ph2,
            shroud_amp=3.0,
            rune_phase=ph2,
            lock_lowest_to_ground=False,
            clamp_floor_only=True,
            leg_bridge_r=(7, 5),
            post_fn=post_walk,
        ))
    return frames


def build_row2_auto_attack(parts, sj, keyposes):
    """
    Row 2: AUTO_ATTACK ([[60, 8], [68, 7], [75, 8], [83, 7]] = 30 Frames)
    Grounded Front-Reaping Juggernaut with Monumental 230-Deg Serrated Reaper Smears:
      - V0 (F00..F07): K1_COIL -> F03 1-Frame Snap Wide Downward Reaping Crescent Smear
      - V1 (F08..F14): F08 Micro-Torque -> F09 1-Frame Reverse Rising Soul-Ripper Hook Smear
      - V2 (F15..F22): F15..F16 Coil -> F17/F18 2.5D Horizontal Thanatos Vortex Reap (2-Hit)
      - V3 (F23..F29): K4_LEAP Airborne Vault -> F25 Towering Guillotine Bone-Obelisk Slam Smear
    """
    frames = []

    # ---------------- BEAT 1 (V0): F00..F07 (Frames 60..67) ----------------
    coil_specs = [
        (-2.0, -1.0, -4.0, (-3.5, -4.0), -142.0, 166.0, 0.2, False),
        (-4.0, -2.5, -7.0, (-5.0, -5.5), -150.0, 162.0, 0.9, False),
        (-5.5, -4.0, -9.5, (-6.0, -6.5), -156.0, 158.0, 1.6, True),
    ]
    for idx, (pdx, pdy, tilt, gr, wdeg, sdeg, sph, glint) in enumerate(coil_specs):
        def post_coil(arr, _n, grip, do_glint=glint, arm=5 + idx):
            if do_glint:
                draw_soul_glint_160(arr, grip[0] - 2.0, grip[1] - 2.0, arm_len=arm)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K1_COIL",
            pelvis_dx=pdx, pelvis_dy=pdy, body_tilt_deg=tilt,
            grip_rel_sh=gr, weapon_deg=wdeg, shaft_len=38.0, fang_side=-1.0,
            shroud_deg=sdeg, shroud_len=33.0, shroud_phase=sph, shroud_amp=3.6,
            rune_phase=sph, bend_l=-1.0, bend_r=-1.0, post_fn=post_coil,
        ))

    # F03: 1-FRAME SNAP + MONUMENTAL 230-DEG DOWNWARD REAPER-SCYTHE CRESCENT SMEAR!
    def post_b1_snap(arr, _n, _g):
        draw_reaper_serrated_smear_160(
            arr, cx=81.0, cy=61.0,
            tail_deg=-168.0, lead_deg=62.0, sweep_dir=1,
            rx_outer=74.0, ry_outer=51.0, max_thickness=30.0,
            n_teeth=8, tooth_depth=11.5, phase=0.15,
        )
        draw_soul_sparks_160(arr, impact_x=132.0, ground_y=114.0, spread=22.0, progress=0.2, count=8)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=11.0, pelvis_dy=1.0, body_tilt_deg=6.5,
        grip_rel_sh=(15.0, 3.5), weapon_deg=18.0, shaft_len=46.0, fang_side=1.0,
        shroud_deg=176.0, shroud_len=35.0, shroud_phase=2.5, shroud_amp=4.4,
        rune_phase=2.5, post_fn=post_b1_snap,
    ))

    # F04: Tail-to-tip tattered soul erosion 1
    def post_b1_erode1(arr, _n, _g):
        draw_reaper_serrated_smear_160(
            arr, cx=80.0, cy=63.0,
            tail_deg=-58.0, lead_deg=54.0, sweep_dir=1,
            rx_outer=71.0, ry_outer=48.0, max_thickness=19.0,
            n_teeth=6, tooth_depth=8.5, phase=0.45,
        )
        draw_soul_sparks_160(arr, impact_x=134.0, ground_y=114.0, spread=25.0, progress=0.55, count=6)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=11.5, pelvis_dy=2.0, body_tilt_deg=7.5,
        grip_rel_sh=(15.5, 4.5), weapon_deg=21.0, shaft_len=46.0, fang_side=1.0,
        shroud_deg=188.0, shroud_len=34.0, shroud_phase=3.4, shroud_amp=4.5,
        rune_phase=3.2, post_fn=post_b1_erode1,
    ))

    # F05: Erosion 2 wisp
    def post_b1_erode2(arr, _n, _g):
        draw_reaper_serrated_smear_160(
            arr, cx=79.0, cy=64.0,
            tail_deg=4.0, lead_deg=48.0, sweep_dir=1,
            rx_outer=68.0, ry_outer=46.0, max_thickness=10.0,
            n_teeth=4, tooth_depth=5.0, phase=0.75,
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=11.2, pelvis_dy=2.0, body_tilt_deg=7.0,
        grip_rel_sh=(15.2, 4.8), weapon_deg=22.0, shaft_len=46.0, fang_side=1.0,
        shroud_deg=194.0, shroud_len=32.0, shroud_phase=4.2, shroud_amp=3.9,
        rune_phase=3.9, post_fn=post_b1_erode2,
    ))

    # F06..F07: Clean low planted Great-Scythe hold priming Beat 2 (zero idle reset!)
    for sub_i, (pdx, wdeg, sdeg, sph) in enumerate([
        (10.4, 20.5, 184.0, 5.0),
        (9.5,  19.0, 176.0, 5.7),
    ]):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K2_LUNGE",
            pelvis_dx=pdx, pelvis_dy=1.5 - sub_i * 0.4, body_tilt_deg=6.0 - sub_i * 0.5,
            grip_rel_sh=(14.8, 4.5), weapon_deg=wdeg, shaft_len=46.0, fang_side=1.0,
            shroud_deg=sdeg, shroud_len=31.0, shroud_phase=sph, shroud_amp=3.4,
            rune_phase=4.5 + sub_i * 0.7,
        ))

    # ---------------- BEAT 2 (V1): F08..F14 (Frames 68..74) ----------------
    # F08: 1-Frame Micro-Compression hooking scythe low before ripping upward
    def post_b2_coil(arr, _n, grip):
        draw_soul_glint_160(arr, grip[0] + 5.0, grip[1] + 2.0, arm_len=5)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=8.8, pelvis_dy=3.0, body_tilt_deg=9.0,
        grip_rel_sh=(14.0, 6.5), weapon_deg=26.0, shaft_len=45.0, fang_side=-1.0,
        shroud_deg=172.0, shroud_len=31.0, shroud_phase=0.4, shroud_amp=3.4,
        rune_phase=0.5, post_fn=post_b2_coil,
    ))

    # F09: 1-FRAME REVERSE RISING SOUL-RIPPER HOOK SMEAR (225 deg)!
    def post_b2_snap(arr, _n, _g):
        draw_reaper_serrated_smear_160(
            arr, cx=81.0, cy=60.0,
            tail_deg=68.0, lead_deg=-157.0, sweep_dir=-1,
            rx_outer=75.0, ry_outer=52.0, max_thickness=29.0,
            n_teeth=8, tooth_depth=11.0, phase=0.2,
        )
        draw_soul_sparks_160(arr, impact_x=102.0, ground_y=114.0, spread=18.0, progress=0.3, count=6)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=8.5, pelvis_dy=-1.0, body_tilt_deg=-4.5,
        grip_rel_sh=(6.5, -8.5), weapon_deg=-58.0, shaft_len=42.0, fang_side=-1.0,
        shroud_deg=152.0, shroud_len=35.0, shroud_phase=1.5, shroud_amp=4.5,
        rune_phase=1.6, bend_l=-1.0, bend_r=-1.0, post_fn=post_b2_snap,
    ))

    # F10: Upper hook smear erosion 1
    def post_b2_erode1(arr, _n, _g):
        draw_reaper_serrated_smear_160(
            arr, cx=79.0, cy=58.0,
            tail_deg=-26.0, lead_deg=-152.0, sweep_dir=-1,
            rx_outer=72.0, ry_outer=50.0, max_thickness=18.0,
            n_teeth=6, tooth_depth=8.0, phase=0.5,
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=8.8, pelvis_dy=-2.0, body_tilt_deg=-5.5,
        grip_rel_sh=(5.5, -9.5), weapon_deg=-64.0, shaft_len=41.0, fang_side=-1.0,
        shroud_deg=146.0, shroud_len=34.0, shroud_phase=2.4, shroud_amp=4.3,
        rune_phase=2.4, bend_l=-1.0, bend_r=-1.0, post_fn=post_b2_erode1,
    ))

    # F11: Upper hook smear wisp
    def post_b2_erode2(arr, _n, _g):
        draw_reaper_serrated_smear_160(
            arr, cx=77.0, cy=57.0,
            tail_deg=-94.0, lead_deg=-150.0, sweep_dir=-1,
            rx_outer=68.0, ry_outer=48.0, max_thickness=9.5,
            n_teeth=4, tooth_depth=4.8, phase=0.8,
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=8.4, pelvis_dy=-1.8, body_tilt_deg=-5.0,
        grip_rel_sh=(5.0, -9.5), weapon_deg=-66.0, shaft_len=41.0, fang_side=-1.0,
        shroud_deg=150.0, shroud_len=33.0, shroud_phase=3.2, shroud_amp=3.9,
        rune_phase=3.1, bend_l=-1.0, bend_r=-1.0, post_fn=post_b2_erode2,
    ))

    # F12..F14: Sovereign high-reap settle priming Beat 3
    for sub_i, (pdx, pdy, tilt, wdeg, sdeg, sph) in enumerate([
        (7.8, -1.0, -3.5, -62.0, 158.0, 4.0),
        (7.0, -0.3, -2.0, -56.0, 164.0, 4.7),
        (6.0,  0.2, -0.5, -50.0, 168.0, 5.4),
    ]):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=pdx, pelvis_dy=pdy, body_tilt_deg=tilt,
            grip_rel_sh=(6.0, -8.5 + sub_i * 0.8), weapon_deg=wdeg, shaft_len=41.0, fang_side=-1.0,
            shroud_deg=sdeg, shroud_len=32.0, shroud_phase=sph, shroud_amp=3.5,
            rune_phase=3.8 + sub_i * 0.7, bend_l=-1.0, bend_r=-1.0,
        ))

    # ---------------- BEAT 3 (V2): F15..F22 (Frames 75..82) ----------------
    # F15..F16: Cross-shoulder horizontal Thanatos coil
    for sub_i, (pdx, sqx, wdeg, sph, glint) in enumerate([
        (4.0, 0.93, 164.0, 0.4, False),
        (2.5, 0.88, 174.0, 1.2, True),
    ]):
        def post_b3_coil(arr, _n, grip, do_g=glint):
            if do_g:
                draw_soul_glint_160(arr, grip[0], grip[1], arm_len=6)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K1_COIL",
            pelvis_dx=pdx, pelvis_dy=1.5 + sub_i * 0.5, body_tilt_deg=-3.0,
            squash_x=sqx, squash_y=1.0,
            grip_rel_sh=(-4.5, -1.0), weapon_deg=wdeg, shaft_len=38.0, fang_side=1.0,
            shroud_deg=162.0 - sub_i * 6.0, shroud_len=32.0, shroud_phase=sph, shroud_amp=3.6,
            rune_phase=sph, bend_l=-1.0, bend_r=1.0, post_fn=post_b3_coil,
        ))

    # F17: 1-FRAME 2.5D HORIZONTAL THANATOS VORTEX REAP (HIT 1)!
    def pre_b3_snap(arr, _n, _g):
        draw_reaper_vortex_smear_160(
            arr, cx=81.0, cy=69.0, rx=74.0, ry=23.0, tilt_deg=-10.0, front_thickness=31.0, half="back", erosion=0.0
        )

    def post_b3_snap(arr, _n, _g):
        draw_reaper_vortex_smear_160(
            arr, cx=81.0, cy=69.0, rx=74.0, ry=23.0, tilt_deg=-10.0, front_thickness=35.0, half="front", erosion=0.0
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=12.0, pelvis_dy=1.0, body_tilt_deg=8.0,
        grip_rel_sh=(15.5, 0.5), weapon_deg=-6.0, shaft_len=46.0, fang_side=1.0,
        shroud_deg=182.0, shroud_len=36.0, shroud_phase=2.4, shroud_amp=4.8,
        rune_phase=2.5, pre_fn=pre_b3_snap, post_fn=post_b3_snap,
    ))

    # F18: Counter-tilted Second Vortex Scythe Rip (HIT 2)!
    def pre_b3_cross(arr, _n, _g):
        draw_reaper_vortex_smear_160(
            arr, cx=80.0, cy=68.0, rx=70.0, ry=19.0, tilt_deg=11.0, front_thickness=16.0, half="back", erosion=0.22
        )

    def post_b3_cross(arr, _n, _g):
        draw_reaper_vortex_smear_160(
            arr, cx=80.0, cy=68.0, rx=70.0, ry=19.0, tilt_deg=11.0, front_thickness=18.0, half="front", erosion=0.22
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=11.0, pelvis_dy=0.5, body_tilt_deg=3.5,
        grip_rel_sh=(14.5, 2.0), weapon_deg=10.0, shaft_len=46.0, fang_side=-1.0,
        shroud_deg=190.0, shroud_len=35.0, shroud_phase=3.3, shroud_amp=4.5,
        rune_phase=3.3, pre_fn=pre_b3_cross, post_fn=post_b3_cross,
    ))

    # F19: Vortex smear erosion
    def post_b3_erode(arr, _n, _g):
        draw_reaper_vortex_smear_160(
            arr, cx=79.0, cy=69.0, rx=66.0, ry=15.0, tilt_deg=8.0, front_thickness=10.0, half="front", erosion=0.60
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=10.0, pelvis_dy=1.0, body_tilt_deg=4.0,
        grip_rel_sh=(14.0, 3.0), weapon_deg=14.0, shaft_len=45.0, fang_side=1.0,
        shroud_deg=194.0, shroud_len=33.0, shroud_phase=4.1, shroud_amp=4.0,
        rune_phase=4.0, post_fn=post_b3_erode,
    ))

    # F20..F22: Deep crouch-coil loading legs for Beat 4 Airborne Guillotine!
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=8.0, pelvis_dy=2.0, body_tilt_deg=7.5,
        grip_rel_sh=(12.5, 5.0), weapon_deg=18.0, shaft_len=45.0, fang_side=1.0,
        shroud_deg=182.0, shroud_len=32.0, shroud_phase=4.8, shroud_amp=3.6,
        rune_phase=4.7,
    ))
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=5.5, pelvis_dy=3.2, body_tilt_deg=10.0,
        grip_rel_sh=(-3.5, 6.5), weapon_deg=156.0, shaft_len=39.0, fang_side=-1.0,
        weapon_layer="behind",
        shroud_deg=172.0, shroud_len=31.0, shroud_phase=5.5, shroud_amp=3.4,
        rune_phase=5.4,
    ))
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K1_COIL",
        pelvis_dx=3.5, pelvis_dy=2.0, body_tilt_deg=5.0,
        grip_rel_sh=(-4.5, 2.0), weapon_deg=162.0, shaft_len=39.0, fang_side=-1.0,
        weapon_layer="behind",
        shroud_deg=166.0, shroud_len=31.0, shroud_phase=6.2, shroud_amp=3.5,
        rune_phase=6.1,
    ))

    # ---------------- BEAT 4 (V3): F23..F29 (Frames 83..89) ----------------
    # F23..F24: Airborne Wraith Vault hoisting Great-Scythe high overhead!
    for sub_i, (pdx, pdy, tilt, wdeg, sdeg, sph) in enumerate([
        (6.0, -18.0, -5.5, -148.0, 128.0, 0.8),
        (8.0, -22.0, -9.0, -156.0, 120.0, 1.7),
    ]):
        def post_b4_leap(arr, _n, grip, is_apex=(sub_i == 1)):
            if is_apex:
                draw_soul_glint_160(arr, grip[0] - 1.0, grip[1] - 2.0, arm_len=7, core_r=2.1)
            else:
                draw_soul_sparks_160(arr, impact_x=62.0, ground_y=114.0, spread=14.0, progress=0.4, count=5)

        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K4_LEAP",
            pelvis_dx=pdx, pelvis_dy=pdy, body_tilt_deg=tilt,
            grip_rel_sh=(-3.5, -6.5), weapon_deg=wdeg, shaft_len=36.0, fang_side=-1.0,
            shroud_deg=sdeg, shroud_len=35.0, shroud_phase=sph, shroud_amp=4.4,
            rune_phase=sph, bend_l=-1.0, bend_r=-1.0, post_fn=post_b4_leap,
        ))

    # F25: 1-FRAME TOWERING GUILLOTINE BONE-OBELISK SLAM + 230-DEG FULL-HEIGHT SMEAR!
    def post_b4_slam(arr, _n, _g):
        draw_bone_obelisk_pillar_160(arr, impact_x=132.0, top_y=4, bot_y=114, half_w=4.6)
        draw_reaper_serrated_smear_160(
            arr, cx=79.0, cy=58.0,
            tail_deg=-166.0, lead_deg=64.0, sweep_dir=1,
            rx_outer=77.0, ry_outer=56.0, max_thickness=34.0,
            n_teeth=9, tooth_depth=13.0, phase=0.1,
        )
        draw_soul_sparks_160(arr, impact_x=132.0, ground_y=114.0, spread=28.0, progress=0.15, count=10)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=12.5, pelvis_dy=2.0, body_tilt_deg=8.5,
        grip_rel_sh=(15.5, 4.5), weapon_deg=20.0, shaft_len=46.0, fang_side=1.0,
        shroud_deg=142.0, shroud_len=36.0, shroud_phase=2.8, shroud_amp=5.0,
        rune_phase=2.9, post_fn=post_b4_slam,
    ))

    # F26: Guillotine shock-erosion
    def post_b4_erode1(arr, _n, _g):
        draw_reaper_serrated_smear_160(
            arr, cx=79.0, cy=61.0,
            tail_deg=-60.0, lead_deg=54.0, sweep_dir=1,
            rx_outer=73.0, ry_outer=51.0, max_thickness=21.0,
            n_teeth=6, tooth_depth=9.0, phase=0.42,
        )
        draw_soul_sparks_160(arr, impact_x=132.0, ground_y=114.0, spread=28.0, progress=0.5, count=8)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=13.0, pelvis_dy=2.8, body_tilt_deg=9.0,
        grip_rel_sh=(15.8, 5.0), weapon_deg=22.0, shaft_len=46.0, fang_side=1.0,
        shroud_deg=178.0, shroud_len=35.0, shroud_phase=3.7, shroud_amp=4.6,
        rune_phase=3.7, post_fn=post_b4_erode1,
    ))

    # F27: Floor soul-wisp peel
    def post_b4_erode2(arr, _n, _g):
        draw_reaper_serrated_smear_160(
            arr, cx=78.0, cy=63.0,
            tail_deg=0.0, lead_deg=48.0, sweep_dir=1,
            rx_outer=69.0, ry_outer=48.0, max_thickness=10.5,
            n_teeth=4, tooth_depth=5.0, phase=0.72,
        )
        draw_soul_sparks_160(arr, impact_x=134.0, ground_y=114.0, spread=30.0, progress=0.82, count=6)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=11.8, pelvis_dy=2.0, body_tilt_deg=7.5,
        grip_rel_sh=(15.2, 4.8), weapon_deg=21.0, shaft_len=46.0, fang_side=1.0,
        shroud_deg=192.0, shroud_len=33.0, shroud_phase=4.5, shroud_amp=4.0,
        rune_phase=4.5, post_fn=post_b4_erode2,
    ))

    # F28..F29: Sovereign Arch-Reaper recovery rise
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=8.0, pelvis_dy=1.0, body_tilt_deg=3.0,
        grip_rel_sh=(12.5, 4.5), weapon_deg=12.0, shaft_len=46.0, fang_side=1.0,
        shroud_deg=180.0, shroud_len=33.0, shroud_phase=5.3, shroud_amp=3.6,
        rune_phase=5.2,
    ))
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=4.0, pelvis_dy=0.0, body_tilt_deg=1.0,
        grip_rel_sh=(10.5, 6.0), weapon_deg=-8.0, shaft_len=46.0, fang_side=1.0,
        shroud_deg=170.0, shroud_len=33.0, shroud_phase=6.0, shroud_amp=3.4,
        rune_phase=5.9,
    ))

    assert len(frames) == 30
    return frames


def build_row3_skill(parts, sj, keyposes):
    """Row 3: SKILL -- SOUL SEVER (Ferryman Hook-Rip -> X-Scissor Soul-Snap Guillotine, 30 Frames)."""
    frames = []
    # F00..F03: Ferryman chain-hook coil
    for f in range(4):
        def post_g(arr, _n, grip, step=f):
            if step >= 2:
                draw_soul_glint_160(arr, grip[0], grip[1], arm_len=4 + step)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K1_COIL",
            pelvis_dx=-2.0 - f * 1.1, pelvis_dy=-f * 0.6, body_tilt_deg=-4.0 - f * 1.6,
            grip_rel_sh=(-4.5, -4.5), weapon_deg=-144.0 - f * 4.0, shaft_len=38.0, fang_side=-1.0,
            shroud_deg=164.0 - f * 3.0, shroud_len=33.0, shroud_phase=f * 0.7, shroud_amp=3.6,
            rune_phase=f * 0.8, bend_l=-1.0, bend_r=-1.0, post_fn=post_g,
        ))

    # F04..F12: Hook-Rip extension & drag-yank back!
    for sub in range(9):
        yank = max(0, sub - 3)
        def post_hook(arr, _n, _g, s=sub):
            if s <= 2:
                tails = [-160.0, -58.0, -4.0]
                thicks = [26.0, 17.0, 9.0]
                draw_reaper_serrated_smear_160(
                    arr, cx=81.0, cy=62.0, tail_deg=tails[s], lead_deg=56.0, sweep_dir=1,
                    rx_outer=73.0 - s * 2.0, ry_outer=49.0, max_thickness=thicks[s],
                    n_teeth=7 - s, tooth_depth=10.0 - s * 2.0, phase=s * 0.3,
                )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K2_LUNGE",
            pelvis_dx=11.0 - yank * 1.1, pelvis_dy=1.5, body_tilt_deg=7.5 - yank * 1.4,
            grip_rel_sh=(15.0 - yank * 0.8, 4.0), weapon_deg=16.0 - yank * 4.5, shaft_len=46.0, fang_side=1.0,
            shroud_deg=178.0 + sub * 3.0, shroud_len=34.0, shroud_phase=2.5 + sub * 0.7, shroud_amp=4.2,
            rune_phase=3.0 + sub * 0.7, post_fn=post_hook,
        ))

    # F13..F14: Shadow-step X-Scissor pre-snap coil
    for sub in range(2):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K1_COIL",
            pelvis_dx=2.0 - sub * 1.5, pelvis_dy=1.0, body_tilt_deg=-5.0 - sub * 2.0,
            grip_rel_sh=(-5.0, -5.0), weapon_deg=-152.0 - sub * 4.0, shaft_len=38.0, fang_side=-1.0,
            shroud_deg=162.0, shroud_len=33.0, shroud_phase=sub * 0.9, shroud_amp=3.8,
            rune_phase=sub * 0.9, bend_l=-1.0, bend_r=-1.0,
        ))

    # F15..F23: X-SCISSOR SOUL-SNAP GUILLOTINE SMEAR!
    for sub in range(9):
        def post_exec(arr, _n, _g, s=sub):
            if s == 0:
                draw_bone_obelisk_pillar_160(arr, impact_x=130.0, top_y=6, bot_y=114, half_w=4.4)
            if s <= 3:
                tails = [-164.0, -68.0, -14.0, 18.0]
                thicks = [32.0, 22.0, 14.0, 8.0]
                draw_reaper_serrated_smear_160(
                    arr, cx=80.0, cy=59.0, tail_deg=tails[s], lead_deg=62.0, sweep_dir=1,
                    rx_outer=76.0 - s * 2.0, ry_outer=54.0 - s * 1.5, max_thickness=thicks[s],
                    n_teeth=8 - s, tooth_depth=12.0 - s * 2.0, phase=0.15 + s * 0.25,
                )
            if s <= 4:
                draw_soul_sparks_160(arr, impact_x=130.0, ground_y=114.0, spread=28.0, progress=s / 4.5, count=8 - s)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K2_LUNGE",
            pelvis_dx=12.5 - max(0, sub - 4) * 0.8, pelvis_dy=2.0, body_tilt_deg=8.0,
            grip_rel_sh=(15.2, 4.8), weapon_deg=20.0 + min(3, sub) * 1.0, shaft_len=46.0, fang_side=1.0,
            shroud_deg=168.0 + sub * 3.5, shroud_len=35.0, shroud_phase=1.8 + sub * 0.8, shroud_amp=4.4,
            rune_phase=2.0 + sub * 0.8, post_fn=post_exec,
        ))

    # F24..F29: Sovereign recovery
    for sub in range(6):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=8.0 - sub * 1.3, pelvis_dy=1.0 - sub * 0.2, body_tilt_deg=3.5 - sub * 0.6,
            grip_rel_sh=(12.0 - sub * 0.4, 5.5), weapon_deg=12.0 - sub * 5.0, shaft_len=46.0, fang_side=1.0,
            shroud_deg=176.0 - sub * 1.5, shroud_len=33.0, shroud_phase=sub * 0.8, shroud_amp=3.5,
            rune_phase=sub * 0.7,
        ))

    assert len(frames) == 30
    return frames


def build_row4_ultimate(parts, sj, keyposes):
    """
    Row 4: ULTIMATE & TRUE_ULTIMATE -- DEATH'S SOVEREIGNTY & MEMENTO MORI (30 Frames)
      - F00..F07: Gates of Oblivion Invocation (Open-Chest K3_RISE + Blazing Soul-Core)
      - F08..F15: Death-Clock Covenant Bind & Twin-Gate Reap Blitz
      - F16..F21: 6-Winged Archangel-of-Death Sky Ascent
      - F22..F29: Full-Canvas Reality-Split Oblivion Guillotine Slam!
    """
    frames = []
    # F00..F07: Gates of Oblivion Invocation
    for f in range(8):
        def post_invoc(arr, neck, grip, step=f):
            draw_soul_glint_160(arr, neck[0] + 4.0, neck[1] + 10.0, arm_len=4 + (step % 4), core_r=1.8)
            draw_soul_sparks_160(arr, impact_x=64.0, ground_y=114.0, spread=16.0 + step * 2.0, progress=(step % 6) / 6.0, count=6)

        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=2.0, pelvis_dy=-f * 0.35, body_tilt_deg=-2.0 - f * 0.5,
            grip_rel_sh=(6.5, -7.5 - f * 0.3), weapon_deg=-72.0 - f * 1.5, shaft_len=39.0, fang_side=1.0,
            shroud_deg=156.0 - f * 2.5, shroud_len=35.0, shroud_phase=f * 0.9, shroud_amp=4.2,
            rune_phase=f * 1.1, bend_l=-1.0, bend_r=-1.0, post_fn=post_invoc,
        ))

    # F08..F11: Covenant Reap A (Wide Downward Serrated Scythe Cleave)
    for sub in range(4):
        def post_ua(arr, _n, _g, s=sub):
            if s <= 2:
                tails = [-164.0, -56.0, -4.0]
                thicks = [31.0, 19.0, 10.0]
                draw_reaper_serrated_smear_160(
                    arr, cx=81.0, cy=61.0, tail_deg=tails[s], lead_deg=60.0, sweep_dir=1,
                    rx_outer=75.0 - s * 2.0, ry_outer=52.0, max_thickness=thicks[s],
                    n_teeth=8 - s, tooth_depth=11.5 - s * 2.0, phase=s * 0.3,
                )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K2_LUNGE",
            pelvis_dx=11.5, pelvis_dy=1.5, body_tilt_deg=7.5,
            grip_rel_sh=(15.0, 4.5), weapon_deg=20.0 + sub * 1.5, shaft_len=46.0, fang_side=1.0,
            shroud_deg=182.0 + sub * 4.0, shroud_len=35.0, shroud_phase=sub * 0.9, shroud_amp=4.5,
            rune_phase=sub * 1.0, post_fn=post_ua,
        ))

    # F12..F15: Covenant Reap B (2.5D Thanatos Vortex Ring)
    for sub in range(4):
        def pre_ub(arr, _n, _g, s=sub):
            if s <= 2:
                draw_reaper_vortex_smear_160(
                    arr, cx=81.0, cy=68.0, rx=74.0 - s * 3.0, ry=22.0, tilt_deg=-9.0 + s * 9.0,
                    front_thickness=23.0 - s * 5.0, half="back", erosion=0.28 * s,
                )
        def post_ub(arr, _n, _g, s=sub):
            if s <= 2:
                draw_reaper_vortex_smear_160(
                    arr, cx=81.0, cy=68.0, rx=74.0 - s * 3.0, ry=22.0, tilt_deg=-9.0 + s * 9.0,
                    front_thickness=26.0 - s * 5.5, half="front", erosion=0.28 * s,
                )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K2_LUNGE",
            pelvis_dx=12.5 - sub * 0.8, pelvis_dy=1.2, body_tilt_deg=7.5,
            grip_rel_sh=(15.2, 2.0 + sub * 0.8), weapon_deg=-4.0 + sub * 6.0, shaft_len=46.0, fang_side=1.0,
            shroud_deg=184.0 + sub * 3.0, shroud_len=35.0, shroud_phase=0.8 + sub * 0.9, shroud_amp=4.6,
            rune_phase=sub * 1.0, pre_fn=pre_ub, post_fn=post_ub,
        ))

    # F16..F21: 6-Winged Archangel-of-Death Sky Ascent
    for sub in range(6):
        pdy = [-10.0, -15.0, -19.0, -22.0, -23.0, -23.5][sub]
        def pre_wings(arr, neck, _g, s=sub):
            draw_thanatos_death_wings_160(arr, neck[0] - 4.0, neck[1] + 5.0, span_scale=0.72 + s * 0.07, phase=s * 0.8)
        def post_wings(arr, _n, grip, s=sub):
            if s >= 3:
                draw_soul_glint_160(arr, grip[0] - 2.0, grip[1] - 2.0, arm_len=6 + (s - 3) * 2, core_r=2.2)

        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K4_LEAP",
            pelvis_dx=6.5 + sub * 0.5, pelvis_dy=pdy, body_tilt_deg=-6.0 - sub * 0.7,
            grip_rel_sh=(-3.5, -6.5), weapon_deg=-150.0 - sub * 1.5, shaft_len=36.0, fang_side=-1.0,
            shroud_deg=122.0 - sub * 2.0, shroud_len=36.0, shroud_phase=sub * 0.9, shroud_amp=4.6,
            rune_phase=sub * 1.1, bend_l=-1.0, bend_r=-1.0, pre_fn=pre_wings, post_fn=post_wings,
        ))

    # F22..F29: Cataclysmic Oblivion Guillotine Slam & Death Covenant Unleashed!
    for sub in range(8):
        def pre_judg(arr, neck, _g, s=sub):
            if s <= 2:
                draw_thanatos_death_wings_160(arr, neck[0] - 5.0, neck[1] + 4.0, span_scale=1.06 - s * 0.18, phase=3.0 + s)

        def post_judg(arr, _n, _g, s=sub):
            if s == 0:
                draw_bone_obelisk_pillar_160(arr, impact_x=133.0, top_y=4, bot_y=114, half_w=6.2)
            elif s == 1:
                draw_bone_obelisk_pillar_160(arr, impact_x=133.0, top_y=12, bot_y=114, half_w=3.4)
            if s <= 4:
                tails = [-168.0, -82.0, -32.0, -2.0, 18.0]
                thicks = [36.0, 26.0, 17.0, 10.5, 6.5]
                draw_reaper_serrated_smear_160(
                    arr, cx=80.0, cy=58.0, tail_deg=tails[s], lead_deg=64.0, sweep_dir=1,
                    rx_outer=78.0 - s * 1.5, ry_outer=56.0 - s * 1.5, max_thickness=thicks[s],
                    n_teeth=9 - s, tooth_depth=13.0 - s * 1.8, phase=0.1 + s * 0.22,
                )
            if s <= 5:
                draw_soul_sparks_160(arr, impact_x=132.0, ground_y=114.0, spread=34.0, progress=s / 5.5, count=10 - s)

        pose_nm = "K2_LUNGE" if sub <= 4 else "K3_RISE"
        pdx = 13.0 - max(0, sub - 4) * 2.4
        pdy = 2.5 if sub <= 3 else max(0.0, 2.0 - (sub - 3) * 0.5)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, pose_nm,
            pelvis_dx=pdx, pelvis_dy=pdy, body_tilt_deg=8.5 if sub <= 4 else 2.5,
            grip_rel_sh=(15.2 if sub <= 4 else 11.5, 4.8), weapon_deg=21.0 - max(0, sub - 4) * 8.0,
            shaft_len=46.0, fang_side=1.0,
            shroud_deg=155.0 + min(5, sub) * 7.0, shroud_len=35.0, shroud_phase=2.5 + sub * 0.8, shroud_amp=4.5,
            rune_phase=sub * 0.9, pre_fn=pre_judg, post_fn=post_judg,
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
            pdx = -recoil * 5.5 - f * 0.3
            pdy = recoil * 2.0
            tdeg = -recoil * 15.0 - 2.0
            hdeg = -recoil * 10.0
            l_th, l_sh = 10.0 * recoil, 14.0 * recoil
            r_th, r_sh = -8.0 * recoil, 18.0 * recoil
            wdeg = -32.0 - recoil * 24.0
            gr = (7.5 - recoil * 3.0, 4.0 - recoil * 3.5)
            w_abs = None
            s_len = 32.0
            s_deg = 14.0 + f * 6.0
        elif f < 14:
            u = (f - 6) / 7.0
            pdx = -4.5 - u * 3.0
            pdy = 2.0 + u * 18.0
            tdeg = -12.0 + u * 44.0
            hdeg = -8.0 + u * 22.0
            l_th, l_sh = -32.0 * u, 56.0 * u
            r_th, r_sh = -26.0 * u, 52.0 * u
            wdeg = -40.0 + u * 58.0
            gr = (8.0 + u * 4.0, 6.0 + u * 5.0)
            w_abs = None
            s_len = 28.0 * (1.0 - 0.3 * u)
            s_deg = 156.0 + u * 14.0
        elif f < 22:
            u = (f - 14) / 7.0
            pdx = -7.5 + u * 8.5
            pdy = 20.0 + u * 14.0
            tdeg = 32.0 + u * 55.0
            hdeg = 14.0 - u * 10.0
            l_th, l_sh = -32.0 * (1.0 - 0.75 * u), 56.0 * (1.0 - 0.75 * u)
            r_th, r_sh = -26.0 * (1.0 - 0.75 * u), 52.0 * (1.0 - 0.75 * u)
            wdeg = 18.0 * (1.0 - u) + 1.0 * u
            gr = (12.0, 11.0)
            w_abs = (74.0 + u * 10.0, 104.0 + u * 6.0)
            s_len = 20.0 * (1.0 - 0.6 * u)
            s_deg = 174.0
        else:
            u = (f - 22) / 7.0
            pdx = 1.0
            pdy = 34.0
            tdeg = 87.5 + math.sin(u * math.pi) * 0.8
            hdeg = 4.0
            l_th, l_sh = -7.0, 12.0
            r_th, r_sh = -5.0, 10.0
            wdeg = 1.0
            gr = (12.0, 11.0)
            w_abs = (84.0, 110.0)
            s_len = 9.0
            s_deg = 178.0 - u * 4.0

        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=pdx, pelvis_dy=pdy,
            torso_deg=tdeg, head_deg=hdeg,
            l_coat_deg=max(-25.0, -tdeg * 0.35), r_coat_deg=max(-20.0, -tdeg * 0.25),
            coat_wave_ph=f * 0.45, coat_wave_amp=5.0,
            l_thigh_deg=l_th, l_shin_deg=l_sh, l_foot_deg=0.0,
            r_thigh_deg=r_th, r_shin_deg=r_sh, r_foot_deg=0.0,
            grip_rel_sh=gr, weapon_deg=wdeg, shaft_len=38.0, fang_side=-1.0 if f >= 14 else 1.0,
            weapon_layer="front", weapon_abs_160=w_abs,
            shroud_deg=s_deg, shroud_len=s_len, shroud_phase=f * 0.65, shroud_amp=2.4,
            rune_phase=f * 0.7,
            lock_lowest_to_ground=True,
        ))
    return frames


def build_row6_dash(parts, sj):
    """Row 6: High-Speed Wraith-Step Scythe-Drag Sprint (30 Frames)."""
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
                    put_px_160(arr, sx0 + dx, sy, C_CRIMSON_EDGE if dx > 6 else C_ORCHID_BELLY)
            draw_soul_sparks_160(arr, impact_x=24.0 + (step % 4) * 2.0, ground_y=114.0, spread=10.0, progress=(step % 5) / 5.0, count=4)

        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=9.5 + math.sin(ph * 2.0) * 0.9,
            pelvis_dy=3.5 - abs(math.cos(ph)) * 2.8,
            torso_deg=22.0 + math.sin(ph * 2.0) * 1.8,
            head_deg=-12.0,
            l_coat_deg=24.0 + s1 * 8.0,
            r_coat_deg=16.0 + s2 * 6.0,
            coat_wave_ph=ph,
            coat_wave_amp=12.5,
            l_thigh_deg=-s1 * 32.0 - 6.0,
            l_shin_deg=max(0.0, -s1) * 34.0 + 10.0,
            l_foot_deg=s1 * 12.0,
            r_thigh_deg=-s2 * 32.0 - 6.0,
            r_shin_deg=max(0.0, -s2) * 34.0 + 10.0,
            r_foot_deg=s2 * 12.0,
            grip_rel_sh=(-4.5, 9.0),
            weapon_deg=158.0 + s1 * 2.5,
            shaft_len=39.0,
            fang_side=-1.0,
            weapon_layer="behind",
            shroud_deg=177.0 + math.sin(ph) * 3.0,
            shroud_len=36.0,
            shroud_phase=(f / 30.0) * 6.0 * math.pi,
            shroud_amp=4.5,
            rune_phase=(f / 30.0) * 6.0 * math.pi,
            lock_lowest_to_ground=True,
            post_fn=post_dash,
        ))
    return frames


def build_row7_crouch(parts, sj, keyposes):
    """
    Row 7: CROUCH -- Shadow Burrow Plunge (F00..F11) -> Stalking Coil (F12..F19)
    -> Explosive Surprise Ambush Uppercut Smear (F20..F29)!
    """
    frames = []
    # F00..F11: Deep Shadow-Burrow Plunge Crouch
    for f in range(12):
        ph = (f / 12.0) * 2.0 * math.pi
        sink = min(1.0, f / 6.0)
        def post_burrow(arr, _n, _g, step=f):
            draw_soul_sparks_160(arr, impact_x=58.0, ground_y=114.0, spread=18.0, progress=(step % 6) / 6.0, count=6)
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=2.0, pelvis_dy=5.0 + sink * 6.5 + math.sin(ph) * 0.6,
            torso_deg=10.0 + sink * 6.0, head_deg=-6.0,
            l_coat_deg=10.0, r_coat_deg=6.0, coat_wave_ph=ph, coat_wave_amp=8.0,
            l_thigh_deg=-24.0 - sink * 6.0, l_shin_deg=42.0 + sink * 8.0, l_foot_deg=-14.0,
            r_thigh_deg=-28.0 - sink * 6.0, r_shin_deg=46.0 + sink * 8.0, r_foot_deg=-16.0,
            grip_rel_sh=(10.5, 4.0 + math.sin(ph) * 0.6),
            weapon_deg=14.0 + math.sin(ph) * 2.0,
            shaft_len=44.0, fang_side=1.0, weapon_layer="front",
            shroud_deg=168.0 + math.sin(ph) * 4.0, shroud_len=31.0, shroud_phase=ph * 2.0, shroud_amp=3.4,
            rune_phase=f * 0.7, lock_lowest_to_ground=True, post_fn=post_burrow,
        ))

    # F12..F19: Subterranean Predator Lock-On Coil
    for sub in range(8):
        def post_lock(arr, _n, grip, s=sub):
            if s >= 5:
                draw_soul_glint_160(arr, grip[0] + 4.0, grip[1], arm_len=5 + (s - 5))
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K2_LUNGE",
            pelvis_dx=6.0 + math.sin(sub * 0.8) * 0.8, pelvis_dy=3.5, body_tilt_deg=10.0,
            grip_rel_sh=(13.5, 6.5), weapon_deg=26.0 + (sub % 2) * 1.5, shaft_len=44.0, fang_side=-1.0,
            shroud_deg=172.0, shroud_len=31.0, shroud_phase=sub * 0.8, shroud_amp=3.6,
            rune_phase=sub * 0.8, post_fn=post_lock,
        ))

    # F20..F29: EXPLOSIVE SURPRISE AMBUSH ERUPTION UPPERCUT SMEAR!
    for sub in range(10):
        pdy = [-6.0, -14.0, -17.0, -15.0, -11.0, -7.0, -3.0, -1.0, 0.0, 0.0][sub]
        def post_erupt(arr, _n, _g, s=sub):
            if s <= 3:
                tails = [64.0, -18.0, -72.0, -112.0]
                thicks = [31.0, 21.0, 13.0, 7.5]
                draw_reaper_serrated_smear_160(
                    arr, cx=80.0, cy=58.0, tail_deg=tails[s], lead_deg=-154.0, sweep_dir=-1,
                    rx_outer=75.0 - s * 2.0, ry_outer=52.0, max_thickness=thicks[s],
                    n_teeth=8 - s, tooth_depth=11.5 - s * 2.0, phase=0.2 + s * 0.25,
                )
                draw_soul_sparks_160(arr, impact_x=74.0, ground_y=114.0, spread=24.0, progress=s / 4.0, count=7)
        pose_nm = "K4_LEAP" if sub <= 4 else "K3_RISE"
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, pose_nm,
            pelvis_dx=9.5 - max(0, sub - 5) * 1.2, pelvis_dy=pdy, body_tilt_deg=-4.5 + sub * 0.5,
            grip_rel_sh=(5.5, -8.5 + max(0, sub - 4) * 1.8), weapon_deg=-62.0 + max(0, sub - 5) * 8.0,
            shaft_len=40.0, fang_side=-1.0,
            shroud_deg=146.0 + sub * 3.0, shroud_len=35.0, shroud_phase=1.0 + sub * 0.8, shroud_amp=4.4,
            rune_phase=sub * 0.8, bend_l=-1.0, bend_r=-1.0, post_fn=post_erupt,
        ))

    assert len(frames) == 30
    return frames


def build_row8_jump(parts, sj, keyposes):
    """Row 8: JUMP -- Reaper's Glide Ascent -> Falling Guillotine Reap Smear -> Landing (30 Frames)."""
    frames = []
    for f in range(4):
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=2.0, pelvis_dy=3.0 + f * 2.2,
            torso_deg=10.0 + f * 2.0, head_deg=-6.0,
            l_coat_deg=10.0, r_coat_deg=6.0, coat_wave_ph=f * 0.6, coat_wave_amp=8.0,
            l_thigh_deg=-20.0 - f * 4.0, l_shin_deg=36.0 + f * 6.0, l_foot_deg=-12.0,
            r_thigh_deg=-22.0 - f * 4.0, r_shin_deg=38.0 + f * 6.0, r_foot_deg=-12.0,
            grip_rel_sh=(-3.5, 8.0), weapon_deg=156.0, shaft_len=39.0, fang_side=-1.0, weapon_layer="behind",
            shroud_deg=172.0, shroud_len=32.0, shroud_phase=f * 0.7, shroud_amp=3.4,
            rune_phase=f * 0.7, lock_lowest_to_ground=True,
        ))

    for sub in range(9):
        t = sub / 8.0
        pdy = -8.0 - math.sin(t * math.pi * 0.65) * 14.5
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K4_LEAP",
            pelvis_dx=4.0 + sub * 0.5, pelvis_dy=pdy, body_tilt_deg=-4.0 - sub * 0.6,
            grip_rel_sh=(-3.5, -6.5), weapon_deg=-146.0 - sub * 1.6, shaft_len=36.0, fang_side=-1.0,
            shroud_deg=128.0 - sub * 1.5, shroud_len=35.0, shroud_phase=sub * 0.8, shroud_amp=4.4,
            rune_phase=sub * 0.8, bend_l=-1.0, bend_r=-1.0,
        ))

    for sub in range(8):
        pdy = -21.0 + sub * 2.5
        def post_air_reap(arr, _n, _g, s=sub):
            if s <= 3:
                tails = [-162.0, -64.0, -12.0, 16.0]
                thicks = [28.0, 18.0, 11.0, 6.5]
                draw_reaper_serrated_smear_160(
                    arr, cx=79.0, cy=52.0 + s * 2.0, tail_deg=tails[s], lead_deg=56.0, sweep_dir=1,
                    rx_outer=73.0 - s * 2.0, ry_outer=48.0, max_thickness=thicks[s],
                    n_teeth=7 - s, tooth_depth=10.5 - s * 1.8, phase=0.15 + s * 0.25,
                )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K4_LEAP",
            pelvis_dx=8.5, pelvis_dy=pdy, body_tilt_deg=6.0,
            grip_rel_sh=(14.0, 3.5), weapon_deg=22.0 + min(3, sub) * 1.5, shaft_len=45.0, fang_side=1.0,
            shroud_deg=142.0 + sub * 5.0, shroud_len=35.0, shroud_phase=2.0 + sub * 0.8, shroud_amp=4.5,
            rune_phase=sub * 0.9, post_fn=post_air_reap,
        ))

    for sub in range(9):
        u = sub / 8.0
        comp = math.sin(min(1.0, u * 1.6) * math.pi) * 6.5 * (1.0 - 0.5 * u)
        def post_land(arr, _n, _g, s=sub):
            if s <= 2:
                draw_soul_sparks_160(arr, impact_x=64.0, ground_y=114.0, spread=18.0, progress=s / 3.0, count=5)
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=6.0 * (1.0 - u), pelvis_dy=comp,
            torso_deg=9.0 * (1.0 - u), head_deg=-5.0 * (1.0 - u),
            l_coat_deg=8.0 * (1.0 - u) + 3.0, r_coat_deg=4.0 * (1.0 - u),
            coat_wave_ph=sub * 0.6, coat_wave_amp=8.5,
            l_thigh_deg=-18.0 * (1.0 - u), l_shin_deg=32.0 * (1.0 - u), l_foot_deg=-10.0 * (1.0 - u),
            r_thigh_deg=-20.0 * (1.0 - u), r_shin_deg=34.0 * (1.0 - u), r_foot_deg=-10.0 * (1.0 - u),
            grip_rel_sh=(9.5, 8.5), weapon_deg=-24.0, shaft_len=46.0, fang_side=1.0,
            shroud_deg=168.0, shroud_len=33.0, shroud_phase=sub * 0.7, shroud_amp=3.6,
            rune_phase=sub * 0.7, lock_lowest_to_ground=True, post_fn=post_land,
        ))

    assert len(frames) == 30
    return frames


def build_row9_victory(parts, sj, keyposes):
    """Row 9: VICTORY -- Overhead Scythe Flourish -> Grounded Great-Scythe Plant & Soul-Wisp Covenant Loop!"""
    frames = []
    for f in range(7):
        wdeg = -12.0 - f * 18.0
        def post_fl(arr, _n, _g, s=f):
            if 2 <= s <= 5:
                draw_reaper_serrated_smear_160(
                    arr, cx=77.0, cy=58.0, tail_deg=wdeg + 52.0, lead_deg=wdeg, sweep_dir=-1,
                    rx_outer=67.0, ry_outer=46.0, max_thickness=13.0,
                    n_teeth=5, tooth_depth=6.0, phase=s * 0.3,
                )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=4.0 - f * 0.4, pelvis_dy=-f * 0.3, body_tilt_deg=-f * 0.6,
            grip_rel_sh=(10.0 - f * 0.8, 2.0 - f * 1.5), weapon_deg=wdeg, shaft_len=40.0, fang_side=1.0,
            shroud_deg=164.0 - f * 3.0, shroud_len=34.0, shroud_phase=f * 0.8, shroud_amp=4.0,
            rune_phase=f * 0.9, bend_l=-1.0, bend_r=-1.0, post_fn=post_fl,
        ))

    # F07..F12: Plants Great-Scythe upright (-84 deg, monumental crescent blade crowning skyward!)
    for sub in range(6):
        u = (sub + 1) / 6.0
        grip_y = 66.0 + u * 8.0
        def post_plant(arr, _n, _g, s=sub):
            if s >= 4:
                draw_soul_sparks_160(arr, impact_x=74.0, ground_y=114.0, spread=20.0, progress=(s - 4) * 0.35 + 0.15, count=7)
                draw_soul_glint_160(arr, 78.0, 38.0, arm_len=6)
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=1.5 * (1.0 - u), pelvis_dy=1.5 * math.sin(u * math.pi),
            torso_deg=3.0 * (1.0 - u), head_deg=-2.0,
            l_coat_deg=5.0, r_coat_deg=-2.0, coat_wave_ph=sub * 0.7, coat_wave_amp=8.5,
            weapon_abs_160=(76.0, grip_y), weapon_deg=-82.0, shaft_len=44.0, fang_side=1.0, weapon_layer="front",
            shroud_deg=162.0 + sub * 2.0, shroud_len=34.0, shroud_phase=sub * 0.8, shroud_amp=3.8,
            rune_phase=sub * 0.9, post_fn=post_plant,
        ))

    # F13..F29: Sovereign Arch-Reaper Salute Loop (F15..F29 loops seamlessly in engine!)
    for sub in range(17):
        ph = (sub / 17.0) * 2.0 * math.pi
        def post_salute(arr, _n, _g, s=sub, p=ph):
            for m in range(3):
                mx = 70.0 + m * 8.0 + math.sin(p + m * 2.1) * 2.5
                my = 108.0 - ((s * 3 + m * 13) % 42)
                put_px_160(arr, mx, my, C_CRIMSON_EDGE if (s + m) % 2 == 0 else C_ORCHID_BRIGHT)

        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=0.0, pelvis_dy=math.sin(ph) * 0.8,
            torso_deg=-1.5 + math.sin(ph) * 1.0, head_deg=1.5,
            l_coat_deg=6.0 + math.sin(ph - 0.5) * 5.0, r_coat_deg=-2.0 + math.cos(ph) * 3.5,
            coat_wave_ph=ph, coat_wave_amp=10.0,
            weapon_abs_160=(76.0, 74.0), weapon_deg=-82.0, shaft_len=44.0, fang_side=1.0, weapon_layer="front",
            shroud_deg=166.0 + math.sin(ph - 0.4) * 5.0, shroud_len=35.0, shroud_phase=ph * 2.0, shroud_amp=4.2,
            rune_phase=ph * 2.0, post_fn=post_salute,
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
        assert max_x320 > 240, f"Row 2 F{snap_f:02d} smear reach too narrow: {max_x320}"

    sh_arr = np.array(sheet)
    walk_spans = []
    walk_tops = []
    walk_bots = []
    walk_sole_xs = []
    walk_boot_xs = []
    walk_mid_leg_mins = []
    for c in range(30):
        cell_a = sh_arr[240:480, c * 320:(c + 1) * 320, 3] > 0
        wy, _ = np.where(cell_a)
        walk_tops.append(int(wy.min()))
        walk_bots.append(int(wy.max()))
        band = cell_a[206:233, :]
        _, bx = np.where(band)
        walk_spans.append(int(bx.max() - bx.min()) if len(bx) else 0)
        walk_boot_xs.append(float(bx.mean()) if len(bx) else -1.0)
        _, sx = np.where(cell_a[218:234, :])
        walk_sole_xs.append(float(sx.mean()) if len(sx) else -1.0)
        mid_rows = [int(cell_a[y, :].sum()) for y in range(184, 205)]
        walk_mid_leg_mins.append(min(mid_rows))
    max_foot_span = max(walk_spans)
    min_foot_span = min(walk_spans)
    max_adj_top = max(abs(walk_tops[(i + 1) % 30] - walk_tops[i]) for i in range(30))
    d_sole_1 = walk_sole_xs[6] - walk_sole_xs[1]
    d_sole_2 = walk_sole_xs[21] - walk_sole_xs[16]
    d_boot_1 = walk_boot_xs[6] - walk_boot_xs[1]
    d_boot_2 = walk_boot_xs[21] - walk_boot_xs[16]
    min_mid_leg_px = min(walk_mid_leg_mins)
    print(
        f"[QA] Row 1 WALK footSpan320: min={min_foot_span}px max={max_foot_span}px "
        f"ratio={min_foot_span / max(1, max_foot_span):.2f} "
        f"(F00={walk_spans[0]} F07={walk_spans[7]} F15={walk_spans[15]} F22={walk_spans[22]}) "
        f"bots=[{min(walk_bots)}..{max(walk_bots)}] maxAdjTopDelta={max_adj_top}"
    )
    print(
        f"[QA] Row 1 WALK stanceDelta: sole(1->6={d_sole_1:+.1f}px, 16->21={d_sole_2:+.1f}px) "
        f"boot(1->6={d_boot_1:+.1f}px, 16->21={d_boot_2:+.1f}px) minMidLegPx(y184..204)={min_mid_leg_px}px"
    )
    assert max_foot_span >= 56, f"Walk contact stride too narrow: {max_foot_span}"
    assert min_foot_span <= max_foot_span * 0.55, f"Crab walk detected: min={min_foot_span} > 0.55*{max_foot_span}"
    assert min(walk_bots) >= 222 and max(walk_bots) <= 233, f"Walk footY out of [222..233]: {walk_bots}"
    assert max_adj_top <= 4, f"Walk head-top pop > 4px: {max_adj_top}"
    assert d_sole_1 <= -8.0 and d_sole_2 <= -8.0, f"Moonwalk in sole band: {(d_sole_1, d_sole_2)}"
    assert d_boot_1 <= -8.0 and d_boot_2 <= -8.0, f"Moonwalk in boot band: {(d_boot_1, d_boot_2)}"
    assert min_mid_leg_px >= 36, f"Stick-legs detected across y=184..204: {walk_mid_leg_mins}"

    flat_cuts = []
    for r in range(10):
        for c in range(30):
            ca = sh_arr[r * 240:(r + 1) * 240, c * 320:(c + 1) * 320, 3] > 0
            cy_a, cx_a = np.where(ca)
            if len(cy_a) == 0:
                continue
            my0, my1, mx0, mx1 = int(cy_a.min()), int(cy_a.max()), int(cx_a.min()), int(cx_a.max())
            if my0 <= 16 and int(ca[my0, :].sum()) >= 18:
                flat_cuts.append(f"R{r}F{c:02d}(top@{my0}={int(ca[my0, :].sum())}px)")
            if mx0 <= 14 and int(ca[:, mx0].sum()) >= 18:
                flat_cuts.append(f"R{r}F{c:02d}(left@{mx0}={int(ca[:, mx0].sum())}px)")
            if mx1 >= 305 and int(ca[:, mx1].sum()) >= 18:
                flat_cuts.append(f"R{r}F{c:02d}(right@{mx1}={int(ca[:, mx1].sum())}px)")
    print(f"[QA] Flat box cut-offs across 300 cells: {len(flat_cuts)} ({flat_cuts[:6]})")
    assert len(flat_cuts) == 0, f"Flat smear/box cut-offs remaining: {flat_cuts}"

    for c in range(22, 30):
        ca = sh_arr[5 * 240:6 * 240, c * 320:(c + 1) * 320, 3] > 0
        cy_a, cx_a = np.where(ca)
        h_d = int(cy_a.max() - cy_a.min() + 1)
        assert h_d <= 104 and int(cx_a.min()) >= 20 and int(cx_a.max()) <= 300, f"R5 F{c:02d} bad prone bounds"
    for c in range(30):
        ca = sh_arr[9 * 240:10 * 240, c * 320:(c + 1) * 320, 3] > 0
        cy_a, _ = np.where(ca)
        assert int(cy_a.max() - cy_a.min() + 1) >= 150, f"R9 F{c:02d} height < 150"

    return sheet


def write_debug_contact_sheets(sheet):
    os.makedirs(SCRATCH_DIR, exist_ok=True)

    r1_cols, r1_rows = 6, 5
    r1_im = Image.new("RGBA", (r1_cols * CELL_W, r1_rows * CELL_H), (18, 14, 32, 255))
    r1_draw = ImageDraw.Draw(r1_im)
    for f in range(30):
        gc = f % r1_cols
        gr = f // r1_cols
        ox, oy = gc * CELL_W, gr * CELL_H
        cell = sheet.crop((f * CELL_W, 1 * CELL_H, (f + 1) * CELL_W, 2 * CELL_H))
        r1_draw.rectangle([ox, oy, ox + CELL_W - 1, oy + CELL_H - 1], outline=(58, 42, 88, 255), width=1)
        r1_draw.line([(ox + 8, oy + ANCHOR_Y_320), (ox + CELL_W - 8, oy + ANCHOR_Y_320)], fill=(78, 56, 114, 255), width=1)
        r1_draw.line([(ox + ANCHOR_X_320, oy + ANCHOR_Y_320 - 10), (ox + ANCHOR_X_320, oy + ANCHOR_Y_320 + 6)], fill=(244, 63, 94, 255), width=1)
        r1_im.alpha_composite(cell, (ox, oy))
        r1_draw.text((ox + 8, oy + 6), f"R1 F{f:02d} (#{30 + f})", fill=(245, 208, 254, 255))

    p_r1 = os.path.join(SCRATCH_DIR, "debug_reaper_ex_row1_walk.png")
    r1_im.save(p_r1)
    print(f"[Debug] Saved {p_r1}")

    r2_cols, r2_rows = 6, 5
    r2_im = Image.new("RGBA", (r2_cols * CELL_W, r2_rows * CELL_H), (18, 14, 32, 255))
    r2_draw = ImageDraw.Draw(r2_im)
    for f in range(30):
        gc = f % r2_cols
        gr = f // r2_cols
        ox, oy = gc * CELL_W, gr * CELL_H
        cell = sheet.crop((f * CELL_W, 2 * CELL_H, (f + 1) * CELL_W, 3 * CELL_H))
        r2_draw.rectangle([ox, oy, ox + CELL_W - 1, oy + CELL_H - 1], outline=(58, 42, 88, 255), width=1)
        r2_draw.line([(ox + 8, oy + ANCHOR_Y_320), (ox + CELL_W - 8, oy + ANCHOR_Y_320)], fill=(78, 56, 114, 255), width=1)
        r2_draw.line([(ox + ANCHOR_X_320, oy + ANCHOR_Y_320 - 10), (ox + ANCHOR_X_320, oy + ANCHOR_Y_320 + 6)], fill=(244, 63, 94, 255), width=1)
        r2_im.alpha_composite(cell, (ox, oy))
        r2_draw.text((ox + 8, oy + 6), f"R2 F{f:02d} (#{60 + f})", fill=(245, 208, 254, 255))

    p_r2 = os.path.join(SCRATCH_DIR, "debug_reaper_ex_row2.png")
    r2_im.save(p_r2)

    for half_nm, c_start in (("left_F00_F14", 0), ("right_F15_F29", 15)):
        half_im = Image.new("RGBA", (15 * LOGICAL_W, ROWS * LOGICAL_H), (18, 14, 32, 255))
        hd = ImageDraw.Draw(half_im)
        for r in range(ROWS):
            for ci in range(15):
                c = c_start + ci
                ox, oy = ci * LOGICAL_W, r * LOGICAL_H
                cell320 = sheet.crop((c * CELL_W, r * CELL_H, (c + 1) * CELL_W, (r + 1) * CELL_H))
                cell160 = cell320.resize((LOGICAL_W, LOGICAL_H), Image.Resampling.NEAREST)
                hd.rectangle([ox, oy, ox + LOGICAL_W - 1, oy + LOGICAL_H - 1], outline=(50, 38, 76, 255), width=1)
                hd.line([(ox + 4, oy + ANCHOR_Y_120), (ox + LOGICAL_W - 4, oy + ANCHOR_Y_120)], fill=(68, 48, 98, 255), width=1)
                half_im.alpha_composite(cell160, (ox, oy))
                if ci == 0:
                    hd.text((ox + 4, oy + 3), f"R{r} F{c:02d}", fill=(244, 63, 94, 255))
        out_p = os.path.join(SCRATCH_DIR, f"debug_reaper_ex_10rows_{half_nm}.png")
        half_im.save(out_p)
        print(f"[Debug] Saved {out_p}")

    print(f"[Debug] Saved {p_r2}")


def main():
    t0 = time.time()
    print("=== Building MALAKOR EX (reaper_ex) Next-Gen Wide-Canvas Assets ===")
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
