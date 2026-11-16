#!/usr/bin/env python3
"""
Next-Gen Wide-Canvas Sprite Sheet, Portrait, & Visual QA Builder for:
  AETHELGARD EX -- Neo-Vision Sovereign Blade (warrior_ex)

Architecture (FFBE / Last Cloudia / Grand Summoners Paradigm):
  1. Wide Theatrical Cell Framing:
     - Logical canvas: 160x120 -> 2x NEAREST output: 320x240 per cell
     - Sheet layout: 30 cols x 10 rows = 9600x2400 RGBA PNG
     - Grounded foot/spine anchor: anchor_x_160 = 56 (anchorX = 112),
       anchor_y_120 = 115 (anchorY = 230)
     - Standing hero height: 87 logical px (174px in 320x240), 100% locked scale
       across all 300 frames (zero auto-fit shrinking on wide slashes or leaps).
     - Open slash theater: 104 logical px (208px) in front of spine, 56 logical px
       behind, 28 logical px above crown.
  2. Multi-Keypose 3D Body States + 14-Part Articulated Rig:
     - Uses real 3D-foreshortened HD-2D keyposes (K1_COIL, K2_LUNGE, K3_RISE,
       K4_LEAP from warrior_ex_keyposes_ref.jpg) + 14-part articulated STAND rig
       (from warrior_ex_base.jpg) with 2-Bone Analytical IK gauntlets clasped on
       the 56-logical-px Radiant Runic Dawn-Breaker Greatsword.
     - Frame-delayed secondary cloth physics via Twin Flowing Azure & Sun-Gold
       Scarf Ribbons + billowing sapphire/crimson battle-coat tails.
  3. 1-Frame Explosive Snap + Hand-Sculpted Multi-Band Serrated Smear Fans:
     - Zero linear windshield-wiper bone-tweening during strikes.
     - 4-band cel-shaded crescent & 2.5D tilted vortex smears with serrated
       inner wind-rip teeth, ordered 4x4 Bayer tail stipple, and progressive
       tail-to-tip smear erosion.
"""

import os
import sys
import math
import time
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ex_sprite_clean_utils import clean_512_pose_holes_and_specks, seal_160_char_pinholes_and_leaks, filter_mask_min_area, _fill_enclosed_holes_rgba

try:
    from scipy.ndimage import label as _nd_label
except ImportError:
    _nd_label = None

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES_DIR = os.path.join(ROOT_DIR, "assets", "sprites")
SCRATCH_DIR = "/Users/rei/.gemini/antigravity/brain/5416474b-0e5f-4471-85c8-b7a88055e218/scratch"

BASE_JPG = os.path.join(SPRITES_DIR, "warrior_ex_base.jpg")
KEYPOSES_JPG = os.path.join(SPRITES_DIR, "warrior_ex_keyposes_ref.jpg")
PORTRAIT_RAW_JPG = os.path.join(SPRITES_DIR, "warrior_ex_portrait_raw.jpg")

OUT_SHEET_PNG = os.path.join(SPRITES_DIR, "warrior_ex_sheet.png")
OUT_PORTRAIT_PNG = os.path.join(SPRITES_DIR, "warrior_ex_portrait.png")

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

# Constant locked character scale: 466px in 512-space == 87 logical px (174px output)
STAND_H_512 = 466.0
TARGET_STAND_H_LOGICAL = 87.0
S_HI = STAND_H_512 / TARGET_STAND_H_LOGICAL  # 5.3563218 px per logical pixel
HI_W = int(round(LOGICAL_W * S_HI))          # 857
HI_H = int(round(LOGICAL_H * S_HI))          # 643
ANCHOR_HI_X = ANCHOR_X_160 * S_HI
ANCHOR_HI_Y = ANCHOR_Y_120 * S_HI

# 25-Color Sovereign Exvius Master Palette
MASTER_PALETTE_EX = np.array([
    [10, 14, 28],     # 0: Deep abyssal shadow Selout (#0a0e1c)
    [20, 28, 52],     # 1: Lit navy-steel Selout (#141c34)
    [38, 48, 78],     # 2: Soft slate hair/cape Selout (#26304e)
    [62, 76, 112],    # 3: Dark gunmetal undersuit/greave (#3e4c70)
    [100, 118, 154],  # 4: Tempered steel shadow (#64769a)
    [144, 165, 199],  # 5: Platinum-silver midtone (#90a5c7)
    [205, 219, 240],  # 6: Bright platinum armor & mane (#cddbf0)
    [244, 249, 255],  # 7: Specular silver-white crown/plate (#f4f9ff)
    [18, 40, 104],    # 8: Royal sapphire coat deep shadow (#122868)
    [35, 72, 166],    # 9: Royal sapphire coat midtone (#2348a6)
    [61, 118, 232],   # 10: Bright azure coat/scarf highlight (#3d76e8)
    [104, 18, 36],    # 11: Crimson coat-lining shadow (#681224)
    [176, 36, 62],    # 12: Crimson coat-lining mid (#b0243e)
    [235, 66, 92],    # 13: Crimson coat-lining bright (#eb425c)
    [110, 66, 18],    # 14: Sovereign bronze-gold shadow (#6e4212)
    [184, 122, 28],   # 15: Sovereign gold mid-dark (#b87a1c)
    [240, 178, 54],   # 16: Rich sun-gold trim (#f0b236)
    [252, 226, 104],  # 17: Bright sun-gold wing/fuller (#fce268)
    [255, 251, 230],  # 18: Incandescent ivory-gold (#fffbe6)
    [14, 132, 212],   # 19: Deep celestial cyan rune (#0e84d4)
    [56, 208, 252],   # 20: Blazing sky-cyan eye/core (#38d0fc)
    [204, 248, 255],  # 21: White-cyan diamond core (#ccf8ff)
    [168, 102, 72],   # 22: Warm skin shadow (#a86648)
    [226, 158, 118],  # 23: Warm skin midtone (#e29e76)
    [250, 204, 172],  # 24: Warm skin highlight (#faccac)
], dtype=np.int32)

# RGBA tuples for crisp 160x120 pixel-art weapon, scarf, & smear rendering
C_OUT_DARK = (10, 14, 28, 255)
C_OUT_LIT = (20, 28, 52, 255)
C_SLATE_DARK = (38, 48, 78, 255)
C_STEEL_SHAD = (100, 118, 154, 255)
C_STEEL_MID = (144, 165, 199, 255)
C_STEEL_LIT = (205, 219, 240, 255)
C_STEEL_SPEC = (244, 249, 255, 255)
C_SAPPHIRE_SHAD = (18, 40, 104, 255)
C_SAPPHIRE_MID = (35, 72, 166, 255)
C_AZURE_LIT = (61, 118, 232, 255)
C_CRIMSON_MID = (176, 36, 62, 255)
C_GOLD_SHAD = (110, 66, 18, 255)
C_GOLD_DARK = (184, 122, 28, 255)
C_GOLD_MID = (240, 178, 54, 255)
C_GOLD_LIT = (252, 226, 104, 255)
C_IVORY_SPEC = (255, 251, 230, 255)
C_CYAN_DEEP = (14, 132, 212, 255)
C_CYAN_BRIGHT = (56, 208, 252, 255)
C_CYAN_WHITE = (204, 248, 255, 255)
C_PURE_RAZOR = (248, 253, 255, 255)

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


def clean_pose_512(im_rgba_512, pocket_seeds=(), strip_polys=(), head_y_split=156):
    """
    Cleans a 512x512 HD-2D pose on #FFFFFF using ONLY border + explicit pocket
    floodfills (never stripping bright white hair/armor highlights inside the
    silhouette), removes specified arm polygons, keeps largest component, and
    applies cel-flattening + interior pinhole sealing.
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
    # Keep piercing cyan pixels vivid before median softening
    r0 = arr[:, :, 0].astype(np.int16)
    g0 = arr[:, :, 1].astype(np.int16)
    b0 = arr[:, :, 2].astype(np.int16)
    vivid_cyan = alpha & ((b0 - r0) > 42) & (g0 > 145)
    arr[:, :, :3] = np.where(alpha[:, :, None], np.where(vivid_cyan[:, :, None], arr[:, :, :3], cel_rgb), 0)
    arr[alpha, 3] = 255
    filled = fill_interior_pinholes_rgba(arr, max_hole_px=14)
    return clean_512_pose_holes_and_specks(filled, max_hole_area=200, min_island_area=36)


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
    palette=MASTER_PALETTE_EX,
    protect_indices=(19, 20, 21, 22, 23, 24),
    hair_indices=(5, 6, 7),
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
    is_hair = np.isin(idx_map, hair_indices) & (yy < 64)
    shadow_side = (~dn_a) | (~rt_a)

    body_edge = edge & (~is_hair)
    hair_edge = edge & is_hair

    idx_map[body_edge & (~shadow_side)] = 1  # #141c34 lit navy-steel Selout
    idx_map[body_edge & shadow_side] = 0     # #0a0e1c deep shadow Selout
    idx_map[hair_edge & (~shadow_side)] = 1
    idx_map[hair_edge & shadow_side] = 2     # #26304e soft slate Selout

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
    face_focus = (xx >= 220) & (xx <= 820) & (yy >= 150) & (yy <= 920)
    blended = np.where(face_focus[:, :, None], med3, med5)

    im256 = Image.fromarray(blended, "RGB").resize((256, 256), Image.Resampling.BOX)
    im256 = im256.filter(ImageFilter.MedianFilter(size=3))
    im128 = im256.resize((128, 128), Image.Resampling.NEAREST)
    src128 = np.array(im128)

    q128 = im128.quantize(colors=28, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert("RGB")
    out128 = np.array(q128)

    # Restore crisp 3-step glowing sky-cyan on eyes, brow diamond, chest core, & Dawn-Breaker fuller
    r = src128[:, :, 0].astype(np.int16)
    g = src128[:, :, 1].astype(np.int16)
    b = src128[:, :, 2].astype(np.int16)
    cyan_mask = ((b - r) > 38) & (g > 140)
    lum = (r * 2 + g * 5 + b * 3) // 10
    out128[cyan_mask & (lum >= 222)] = [204, 248, 255]
    out128[cyan_mask & (lum >= 168) & (lum < 222)] = [56, 208, 252]
    out128[cyan_mask & (lum < 168)] = [14, 132, 212]

    rgba128 = np.zeros((128, 128, 4), dtype=np.uint8)
    rgba128[:, :, :3] = out128
    rgba128[:, :, 3] = 255
    out_im = Image.fromarray(rgba128, "RGBA")
    out_im.save(OUT_PORTRAIT_PNG)

    os.makedirs(SCRATCH_DIR, exist_ok=True)
    preview = out_im.resize((384, 384), Image.Resampling.NEAREST)
    preview.save(os.path.join(SCRATCH_DIR, "debug_warrior_ex_portrait.png"))
    print(f"[Portrait] Saved {OUT_PORTRAIT_PNG} (128x128)")


# ==============================================================================
# 3. SEGMENTATION OF STAND (14 PARTS) + 4 REAL 3D ACTION KEYPOSES
# ==============================================================================

def assign_remaining_geodesic(alpha, mask_list):
    H, W = alpha.shape
    labels = np.zeros((H, W), dtype=np.int16)
    names = [nm for nm, _ in mask_list]
    for idx, (nm, m) in enumerate(mask_list, start=1):
        if nm in ("mane", "l_coat", "r_coat"):
            mc = filter_mask_min_area(m & alpha, min_area=40)
        else:
            mc = keep_largest_component(m)
        mc = mc & alpha & (labels == 0)
        labels[mc] = idx

    for _ in range(32):
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
        pocket_seeds=[(206, 286), (308, 286), (206, 276), (308, 276)],
        strip_polys=[],
        head_y_split=154,
    )
    alpha = stand_arr[:, :, 3] > 128
    H, W = alpha.shape

    raw_masks = [
        ("head", poly_mask(H, W, [(226, 20), (346, 20), (346, 152), (296, 154), (248, 146), (218, 92)])),
        ("mane", poly_mask(H, W, [(114, 38), (226, 38), (246, 146), (212, 148), (176, 224), (114, 224)])),
        ("l_sode", poly_mask(H, W, [(172, 130), (244, 136), (238, 210), (168, 210)])),
        ("l_forearm", poly_mask(H, W, [(158, 210), (214, 210), (214, 304), (158, 304)])),
        ("r_sode", poly_mask(H, W, [(300, 140), (348, 142), (350, 214), (304, 214)])),
        ("r_forearm", poly_mask(H, W, [(308, 214), (366, 214), (366, 304), (308, 304)])),
        ("torso", poly_mask(H, W, [(238, 146), (306, 148), (312, 258), (306, 344), (278, 358), (252, 338), (240, 260)])),
        ("l_coat", poly_mask(H, W, [(122, 248), (246, 248), (250, 274), (164, 426), (122, 426)])),
        ("r_coat", poly_mask(H, W, [(304, 248), (372, 248), (372, 426), (344, 426), (306, 292)])),
        ("l_thigh", poly_mask(H, W, [(202, 280), (256, 294), (252, 376), (190, 376)])),
        ("l_shin", poly_mask(H, W, [(176, 358), (240, 358), (228, 452), (174, 452)])),
        ("l_foot", poly_mask(H, W, [(166, 446), (226, 446), (226, 504), (166, 504)])),
        ("r_thigh", poly_mask(H, W, [(284, 284), (324, 284), (336, 372), (284, 372)])),
        ("r_shin", poly_mask(H, W, [(286, 356), (348, 356), (346, 442), (288, 442)])),
        ("r_foot", poly_mask(H, W, [(292, 434), (364, 434), (364, 484), (292, 484)])),
    ]
    assigned = assign_remaining_geodesic(alpha, raw_masks)
    parts = {nm: extract_crop_tuple(stand_arr, m) for nm, m in assigned}

    # Joint pivots in 512-space for STAND
    stand_joints = {
        "x_ref": 260.0,
        "y_bot": 494.0,
        "pelvis": (268.0, 268.0),
        "neck": (276.0, 146.0),
        "mane": (244.0, 110.0),
        "l_coat": (244.0, 260.0),
        "r_coat": (304.0, 262.0),
        "l_sh": (228.0, 158.0),
        "l_el": (192.0, 210.0),
        "l_grip": (186.0, 282.0),
        "r_sh": (312.0, 162.0),
        "r_el": (328.0, 214.0),
        "r_grip": (340.0, 280.0),
        "l_hip": (238.0, 292.0),
        "l_knee": (214.0, 366.0),
        "l_ankle": (196.0, 448.0),
        "r_hip": (296.0, 292.0),
        "r_knee": (314.0, 364.0),
        "r_ankle": (318.0, 438.0),
    }

    # Load 2x2 grid of 512x512 3D-foreshortened action keyposes
    kp_sheet = Image.open(KEYPOSES_JPG).convert("RGBA")
    tiles_raw = {
        "K1_COIL": kp_sheet.crop((0, 0, 512, 512)),
        "K2_LUNGE": kp_sheet.crop((512, 0, 1024, 512)),
        "K3_RISE": kp_sheet.crop((0, 512, 512, 1024)),
        "K4_LEAP": kp_sheet.crop((512, 512, 1024, 1024)),
    }

    keypose_specs = {
        "K1_COIL": {
            "pocket_seeds": [(222, 232)],
            "strip_polys": [
                [(126, 154), (218, 158), (226, 224), (126, 224)],
                [(340, 140), (452, 140), (452, 256), (324, 250), (328, 174)],
            ],
            "head_y_split": 160,
            "x_ref": 252.0,
            "y_bot": 506.0,
            "l_sh": (224.0, 160.0),
            "r_sh": (316.0, 176.0),
            "neck": (288.0, 150.0),
            "pelvis": (272.0, 258.0),
        },
        "K2_LUNGE": {
            "pocket_seeds": [(230, 260), (192, 256)],
            "strip_polys": [
                [(156, 198), (224, 204), (228, 276), (156, 276)],
                [(334, 206), (452, 206), (452, 306), (326, 296)],
            ],
            "head_y_split": 206,
            "x_ref": 244.0,
            "y_bot": 490.0,
            "l_sh": (224.0, 190.0),
            "r_sh": (322.0, 208.0),
            "neck": (316.0, 190.0),
            "pelvis": (266.0, 286.0),
        },
        "K3_RISE": {
            "pocket_seeds": [(192, 248), (190, 254)],
            "strip_polys": [
                [(114, 188), (208, 194), (208, 268), (114, 268)],
                [(308, 14), (452, 14), (452, 198), (314, 198), (306, 156)],
            ],
            "head_y_split": 160,
            "x_ref": 256.0,
            "y_bot": 499.0,
            "l_sh": (198.0, 172.0),
            "r_sh": (304.0, 166.0),
            "neck": (268.0, 150.0),
            "pelvis": (260.0, 266.0),
        },
        "K4_LEAP": {
            "pocket_seeds": [(216, 244)],
            "strip_polys": [
                [(138, 182), (212, 190), (212, 272), (138, 272)],
                [(318, 162), (452, 162), (452, 288), (316, 288)],
            ],
            "head_y_split": 160,
            "x_ref": 260.0,
            "y_bot": 484.0,
            "l_sh": (204.0, 166.0),
            "r_sh": (306.0, 176.0),
            "neck": (276.0, 150.0),
            "pelvis": (262.0, 262.0),
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


def draw_joint_bridge_hi(canvas, p0, p1, r, fill=(62, 76, 112, 255), inner=(144, 165, 199, 255)):
    draw = ImageDraw.Draw(canvas)
    x0, y0 = int(round(p0[0])), int(round(p0[1]))
    x1, y1 = int(round(p1[0])), int(round(p1[1]))
    draw.line([(x0, y0), (x1, y1)], fill=fill, width=max(2, int(r * 2)))
    for cx, cy in ((x0, y0), (x1, y1)):
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)
        ir = max(1, int(r * 0.58))
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

    draw_joint_bridge_hi(canvas, sh_dst, el_dst, r=9)
    draw_joint_bridge_hi(canvas, el_dst, hand_dst, r=7)
    paste_rotated_part(canvas, parts[sode_nm], sh_src, sh_dst, deg=(ang1_cur - ang1_rest))
    paste_rotated_part(canvas, parts[fore_nm], el_src, el_dst, deg=(ang2_cur - ang2_rest))
    return hand_dst


# ==============================================================================
# 5. LOGICAL 160x120 PIXEL-ART RENDERERS:
#    - TWIN FLOWING AZURE/GOLD SCARF RIBBONS (SECONDARY WHIP LAG)
#    - RADIANT RUNIC DAWN-BREAKER GREATSWORD (56 LOGICAL PX)
#    - FFBE 4-BAND SERRATED CRESCENT & 2.5D VORTEX SMEARS
# ==============================================================================

def put_px_160(arr, x, y, col, margin=MARGIN_LOGICAL):
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


def draw_twin_scarf_ribbons_160(
    arr,
    neck_x,
    neck_y,
    base_deg=168.0,
    length=30.0,
    wave_phase=0.0,
    wave_amp=3.2,
    spread_deg=11.0,
):
    """
    Renders Aethelgard EX's signature twin flowing Neo-Vision azure & sun-gold
    scarf ribbons trailing from his collar with frame-delayed secondary wave lag.
    """
    for idx, off_deg in enumerate((-spread_deg * 0.55, spread_deg * 0.65)):
        rib_len = length if idx == 0 else length * 0.84
        ang = math.radians(base_deg + off_deg)
        ux, uy = math.cos(ang), math.sin(ang)
        nx, ny = -uy, ux
        steps = int(rib_len * 2.2) + 1
        pts = []
        for s in range(steps + 1):
            t = s / max(1, steps)
            dist = t * rib_len
            ph = wave_phase + idx * 1.35 - t * 4.4
            lat = math.sin(ph) * wave_amp * (t ** 1.15)
            px = neck_x + ux * dist + nx * lat
            py = neck_y + uy * dist + ny * lat
            pts.append((px, py, t))

        # Pass 1: 1px dark navy Selout border
        for px, py, t in pts:
            half_w = 2.1 * (1.0 - 0.55 * t) if idx == 0 else 1.7 * (1.0 - 0.55 * t)
            for k in (-half_w - 0.8, half_w + 0.8):
                put_px_160(arr, px + nx * k, py + ny * k, C_OUT_DARK)
        # Swallowtail tip Selout
        put_px_160(arr, pts[-1][0] + ux, pts[-1][1] + uy, C_OUT_DARK)

        # Pass 2: Royal sapphire body + bright azure crest + sun-gold swallowtail trim
        for px, py, t in pts:
            half_w = 1.9 * (1.0 - 0.55 * t) if idx == 0 else 1.5 * (1.0 - 0.55 * t)
            is_gold_tail = (t > 0.78)
            for k_step in range(-3, 4):
                k = k_step * 0.55
                if abs(k) <= half_w:
                    if is_gold_tail:
                        col = C_GOLD_LIT if k < 0 else C_GOLD_MID
                    else:
                        col = C_AZURE_LIT if k < -0.25 else (C_SAPPHIRE_MID if k < 0.65 else C_SAPPHIRE_SHAD)
                    put_px_160(arr, px + nx * k, py + ny * k, col)


def draw_dawnbreaker_greatsword_160(
    arr,
    grip_x,
    grip_y,
    deg,
    blade_len=45.0,
    rune_phase=0.0,
    draw_gauntlets=True,
):
    """
    Draws the colossal Radiant Runic Dawn-Breaker Greatsword directly on the
    160x120 logical canvas with full 1px directional Selout, ornate winged
    sun-gold crossguard, blazing sky-cyan fuller core, and twin armored gauntlets.
    """
    rad = math.radians(deg)
    ux, uy = math.cos(rad), math.sin(rad)
    # Normal pointing toward "upper/lit" bevel when deg ~ 0
    nx, ny = uy, -ux

    pommel_dist = -7.5
    guard_dist = 4.5
    tip_dist = guard_dist + blade_len

    # Clamp extreme blade length so tip + crossguard stay cleanly inside [8..151] x [8..113] (0 flat margin cuts)
    max_reach = blade_len
    for test_len in range(int(blade_len), 22, -1):
        tx = grip_x + ux * (guard_dist + test_len + 2.0)
        ty = grip_y + uy * (guard_dist + test_len + 2.0)
        px_chk = grip_x + ux * (pommel_dist - 2.0)
        py_chk = grip_y + uy * (pommel_dist - 2.0)
        if (8.0 <= tx <= (LOGICAL_W - 9.0) and 8.0 <= ty <= (LOGICAL_H - 6.5)
                and 8.0 <= px_chk <= (LOGICAL_W - 9.0) and 8.0 <= py_chk <= (LOGICAL_H - 6.5)):
            max_reach = float(test_len)
            break
    tip_dist = guard_dist + max_reach

    # --- Pass 1: Blade Silhouette & 1px Directional Selout ---
    steps = int((tip_dist - pommel_dist) * 3.0) + 1
    for i in range(steps + 1):
        d = pommel_dist + (tip_dist - pommel_dist) * (i / max(1, steps))
        cx = grip_x + ux * d
        cy = grip_y + uy * d
        if d < guard_dist:
            hw = 1.4
        else:
            bt = (d - guard_dist) / max(1.0, max_reach)
            if bt < 0.12:
                hw = 3.3 - bt * 2.0
            elif bt < 0.80:
                hw = 3.05 - (bt - 0.12) * 0.65
            else:
                hw = max(0.35, 2.60 * (1.0 - (bt - 0.80) / 0.20))

        # Outer Selout
        put_px_160(arr, cx + nx * (hw + 0.95), cy + ny * (hw + 0.95), C_OUT_LIT)
        put_px_160(arr, cx - nx * (hw + 0.95), cy - ny * (hw + 0.95), C_OUT_DARK)

    put_px_160(arr, grip_x + ux * (tip_dist + 1.0), grip_y + uy * (tip_dist + 1.0), C_OUT_DARK)

    # --- Pass 2: Blade Bevels, Sun-Gold Fuller Rails, & Blazing Cyan Core ---
    for i in range(steps + 1):
        d = pommel_dist + (tip_dist - pommel_dist) * (i / max(1, steps))
        cx = grip_x + ux * d
        cy = grip_y + uy * d
        if d < guard_dist - 0.5:
            # Two-handed royal grip
            for k in (-1.0, -0.4, 0.0, 0.4, 1.0):
                col = C_GOLD_MID if int(abs(d * 1.5)) % 3 == 0 else C_SLATE_DARK
                put_px_160(arr, cx + nx * k, cy + ny * k, col)
            continue

        bt = max(0.0, (d - guard_dist) / max(1.0, max_reach))
        if bt < 0.12:
            hw = 3.2 - bt * 1.8
        elif bt < 0.80:
            hw = 2.95 - (bt - 0.12) * 0.65
        else:
            hw = max(0.25, 2.50 * (1.0 - (bt - 0.80) / 0.20))

        pulse = 0.5 + 0.5 * math.sin(rune_phase - bt * 5.5)
        w_samples = int(hw * 3.0) + 1
        for ws in range(-w_samples, w_samples + 1):
            off = ws / 3.0
            if abs(off) > hw:
                continue
            if bt < 0.76 and abs(off) <= 0.72:
                col = C_CYAN_WHITE if (bt < 0.22 or pulse > 0.72) else C_CYAN_BRIGHT
            elif bt < 0.78 and abs(off) <= 1.35:
                col = C_GOLD_LIT if off > 0 else C_GOLD_MID
            elif off > 0:
                col = C_STEEL_SPEC if off > hw * 0.55 else C_STEEL_LIT
            else:
                col = C_STEEL_MID if off > -hw * 0.55 else C_STEEL_SHAD
            put_px_160(arr, cx + nx * off, cy + ny * off, col)

    # --- Pass 3: Ornate Winged Sovereign Crossguard & Pommel ---
    gx = grip_x + ux * guard_dist
    gy = grip_y + uy * guard_dist
    wing_span = 6.5
    for s_sign in (-1.0, 1.0):
        for w_step in range(0, 15):
            wt = w_step / 14.0
            lat = s_sign * wt * wing_span
            # Swept forward paladin wing curve
            fwd = (wt ** 1.4) * 2.8 - 0.6
            wx = gx + nx * lat + ux * fwd
            wy = gy + ny * lat + uy * fwd
            put_px_160(arr, wx - ux * 1.1, wy - uy * 1.1, C_OUT_DARK)
            put_px_160(arr, wx + ux * 1.1, wy + uy * 1.1, C_OUT_LIT)
            put_px_160(arr, wx, wy, C_IVORY_SPEC if wt > 0.75 else (C_GOLD_LIT if s_sign > 0 else C_GOLD_MID))
            put_px_160(arr, wx - ux * 0.5, wy - uy * 0.5, C_GOLD_DARK)

    # Central Sky-Cyan Ricasso Diamond
    draw_disc_160(arr, gx, gy, 2.2, C_GOLD_DARK)
    draw_disc_160(arr, gx, gy, 1.4, C_CYAN_BRIGHT)
    put_px_160(arr, gx, gy, C_CYAN_WHITE)

    # Pommel
    px_pom = grip_x + ux * pommel_dist
    py_pom = grip_y + uy * pommel_dist
    draw_disc_160(arr, px_pom, py_pom, 2.1, C_OUT_DARK)
    draw_disc_160(arr, px_pom, py_pom, 1.3, C_GOLD_LIT)
    put_px_160(arr, px_pom, py_pom, C_CYAN_BRIGHT)

    # Twin Armored Gauntlets clasped on upper & lower hilt
    if draw_gauntlets:
        for gd in (-3.2, 1.2):
            hx = grip_x + ux * gd
            hy = grip_y + uy * gd
            draw_disc_160(arr, hx, hy, 2.4, C_OUT_DARK)
            draw_disc_160(arr, hx, hy, 1.6, C_STEEL_LIT)
            put_px_160(arr, hx + nx * 0.7, hy + ny * 0.7, C_GOLD_LIT)


def draw_star_glint_160(arr, cx, cy, arm_len=6, core_r=1.8):
    ix, iy = int(round(cx)), int(round(cy))
    for d in range(-arm_len, arm_len + 1):
        col = C_PURE_RAZOR if abs(d) <= 2 else (C_CYAN_BRIGHT if abs(d) <= arm_len - 2 else C_GOLD_LIT)
        put_px_160(arr, ix + d, iy, col)
        put_px_160(arr, ix, iy + d, col)
    diag = max(1, arm_len // 2)
    for d in range(-diag, diag + 1):
        put_px_160(arr, ix + d, iy + d, C_GOLD_LIT)
        put_px_160(arr, ix + d, iy - d, C_GOLD_LIT)
    draw_disc_160(arr, ix, iy, core_r, C_PURE_RAZOR)


def draw_ffbe_serrated_smear_160(
    arr,
    cx,
    cy,
    tail_deg,
    lead_deg,
    sweep_dir=1,
    rx_outer=72.0,
    ry_outer=50.0,
    max_thickness=27.0,
    n_teeth=7,
    tooth_depth=9.5,
    phase=0.0,
):
    """
    Hand-sculpted 4-band FFBE / Last Cloudia serrated crescent smear fan on
    160x120 logical canvas.
      - sweep_dir = +1: clockwise screen sweep (e.g. -152 deg overhead -> +24 deg low-front)
      - sweep_dir = -1: counter-clockwise screen sweep (e.g. +34 deg low-front -> -126 deg sky)
    Enforces safety margins cleanly while pushing front crescent belly well past
    x_160 = 146..153 (x_320 = 292..306).
    """
    def norm360(a):
        return a % 360.0

    t0 = norm360(tail_deg)
    t1 = norm360(lead_deg)
    if sweep_dir > 0:
        total_span = (t1 - t0) % 360.0
    else:
        total_span = (t0 - t1) % 360.0
    if total_span < 4.0:
        return

    yy, xx = np.mgrid[0:LOGICAL_H, 0:LOGICAL_W]
    raw_dx = xx.astype(np.float32) - cx
    raw_dy = yy.astype(np.float32) - cy
    # Smooth asymmetric quadrant semi-axes so smears curve organically inside [9.5..149.5] x [9.5..113.5] (ZERO flat box cuts!)
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

    if sweep_dir > 0:
        rel = (ang - t0) % 360.0
    else:
        rel = (t0 - ang) % 360.0

    in_arc = rel <= total_span
    u = np.clip(rel / max(1.0, total_span), 0.0, 1.0)

    # Outer normalized radius swells slightly through mid-late swing
    r_out = 0.84 + 0.16 * np.maximum(0.0, np.sin(np.pi * (u ** 0.78)))
    # Normalized thickness swells at u ~ 0.65 (front belly) and tapers to needle tail at u = 0
    sin_u = np.maximum(0.0, np.sin(np.pi * (u ** 0.72)))
    thick_norm = (max_thickness / max(1.0, 0.5 * (rx_outer + ry_outer))) * (sin_u ** 0.82)
    thick_norm = np.maximum(0.025 * (1.0 - u), thick_norm)

    # Serrated sawtooth wind-rip notches along inner edge
    saw = (u * n_teeth + phase) % 1.0
    serration = (tooth_depth / max(1.0, 0.5 * (rx_outer + ry_outer))) * ((1.0 - saw) ** 2.1) * np.maximum(0.0, np.sin(np.pi * u))
    r_in = r_out - thick_norm + serration

    body_mask = in_arc & (r_norm >= r_in) & (r_norm <= r_out)
    # Ordered 4x4 Bayer stipple near needle tail (u < 0.22) + 5px Bayer margin taper before [8..151] x [8..114]
    bayer_tile = BAYER4[yy % 4, xx % 4]
    tail_keep = (u >= 0.22) | (bayer_tile < (u / 0.22))
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

    # 1px outer dark navy-steel Selout along cutting rim so white/gold edge pops on any background
    rim_selout = in_arc & safe_box & tail_keep & (r_norm > r_out) & (r_norm <= r_out + (1.25 / max(1.0, rx_outer)))
    arr[rim_selout] = C_OUT_LIT

    denom = np.maximum(0.02, r_out - r_in)
    v = np.clip((r_norm - r_in) / denom, 0.0, 1.0)

    # 4-Band Stepped Sovereign Exvius Cel Ramp:
    # Inner teeth: deep sapphire/cyan -> sky-cyan core -> sun-gold -> pure white-ivory cutting rim
    band_deep = body_mask & (v < 0.24)
    band_cyan = body_mask & (v >= 0.24) & (v < 0.56)
    band_gold = body_mask & (v >= 0.56) & (v < 0.83)
    band_razor = body_mask & (v >= 0.83)

    arr[band_deep] = C_CYAN_DEEP
    arr[band_cyan] = C_CYAN_BRIGHT
    arr[band_gold] = C_GOLD_LIT
    arr[band_razor] = C_PURE_RAZOR

    # Add 2 razor inner wind-shear streaks inside the hollow for FFBE kinetic detail
    for s_idx, r_off in enumerate((0.06, 0.13)):
        u_lo = 0.25 + s_idx * 0.12
        u_hi = 0.82 - s_idx * 0.08
        r_streak = r_in - r_off
        streak = (
            in_arc
            & safe_box
            & (u >= u_lo)
            & (u <= u_hi)
            & (np.abs(r_norm - r_streak) <= (0.85 / max(1.0, rx_outer)))
        )
        arr[streak] = C_GOLD_MID if s_idx == 0 else C_CYAN_BRIGHT


def draw_foreshortened_vortex_smear_160(
    arr,
    cx,
    cy,
    rx=72.0,
    ry=21.0,
    tilt_deg=-10.0,
    front_thickness=18.0,
    half="both",
    erosion=0.0,
):
    """
    Last Cloudia-style 2.5D tilted perspective horizontal vortex ring smear.
    Can render `half="back"` behind the hero and `half="front"` over the hero!
    """
    yy, xx = np.mgrid[0:LOGICAL_H, 0:LOGICAL_W]
    dx0 = xx.astype(np.float32) - cx
    dy0 = yy.astype(np.float32) - cy
    rad = math.radians(tilt_deg)
    ct, st = math.cos(rad), math.sin(rad)
    # Rotate into ellipse local frame
    lx = dx0 * ct + dy0 * st
    ly = -dx0 * st + dy0 * ct

    enorm = np.hypot(lx / max(1.0, rx), ly / max(1.0, ry))
    theta = np.arctan2(ly / max(1.0, ry), lx / max(1.0, rx))  # [-pi, pi], >0 is front lower-right half

    if half == "back":
        hemi = theta < 0.08
    elif half == "front":
        hemi = theta >= -0.08
    else:
        hemi = np.ones_like(enorm, dtype=bool)

    # Front wall is dramatically thicker than distant back arc (true 2.5D foreshortening!)
    front_weight = 0.25 + 0.75 * np.clip(0.5 + 0.5 * np.sin(theta), 0.0, 1.0)
    right_bulge = 0.38 + 0.62 * np.clip(0.5 + 0.5 * np.cos(theta), 0.0, 1.0)
    w_norm = (front_thickness / max(1.0, rx)) * front_weight * right_bulge * max(0.15, 1.0 - erosion)

    u_ang = (theta + math.pi) / (2.0 * math.pi)
    saw = (u_ang * 10.0 + erosion * 2.0) % 1.0
    serr = 0.13 * (1.0 - erosion) * ((1.0 - saw) ** 2.0) * front_weight * right_bulge

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
    arr[mask & (v < 0.28)] = C_CYAN_DEEP
    arr[mask & (v >= 0.28) & (v < 0.60)] = C_CYAN_BRIGHT
    arr[mask & (v >= 0.60) & (v < 0.84)] = C_GOLD_LIT
    arr[mask & (v >= 0.84)] = C_PURE_RAZOR


def draw_neovision_wings_160(arr, back_x, back_y, span_scale=1.0, phase=0.0):
    """
    Renders grand luminous golden-cyan Neo-Vision Sovereign Energy Wings behind
    Aethelgard EX during Ultimate Sky Ascent (Row 4).
    """
    pinions = [
        (-152.0, 42.0, 3.2),
        (-136.0, 36.0, 2.7),
        (-120.0, 29.0, 2.2),
        (-34.0,  38.0, 3.0),
        (-18.0,  31.0, 2.4),
    ]
    for w_idx, (base_ang, base_len, base_hw) in enumerate(pinions):
        length = base_len * span_scale
        ang = math.radians(base_ang + math.sin(phase + w_idx * 0.9) * 2.8)
        ux, uy = math.cos(ang), math.sin(ang)
        nx, ny = -uy, ux
        steps = int(length * 2.2) + 1
        for s in range(steps + 1):
            t = s / max(1, steps)
            px = back_x + ux * (t * length)
            py = back_y + uy * (t * length)
            hw = base_hw * (1.0 - 0.72 * t)
            put_px_160(arr, px + nx * (hw + 0.9), py + ny * (hw + 0.9), C_OUT_LIT)
            put_px_160(arr, px - nx * (hw + 0.9), py - ny * (hw + 0.9), C_OUT_LIT)
            for k_i in range(-4, 5):
                k = k_i * 0.65
                if abs(k) <= hw:
                    col = C_PURE_RAZOR if abs(k) < 0.5 else (C_GOLD_LIT if t < 0.52 else C_CYAN_BRIGHT)
                    put_px_160(arr, px + nx * k, py + ny * k, col)


def draw_heavensplitter_pillar_160(arr, impact_x, top_y=11, bot_y=114, half_w=5.0):
    """
    Vertical sky-to-earth Dawn-Breaker judgment spire & ground fissure for Beat 4 (R2 F25)
    and Ultimate Judgment (R4 F22) with pointed spear-crown + Bayer stipple taper (0 flat top cuts!).
    """
    eff_top = max(11, int(top_y))
    ix = min(LOGICAL_W - 14, max(14, int(round(impact_x))))
    ihw = int(math.ceil(half_w))
    for y in range(eff_top, min(LOGICAL_H - MARGIN_LOGICAL - 2, int(bot_y) + 1)):
        vt = (y - eff_top) / max(1.0, float(bot_y - eff_top))
        crown_taper = min(1.0, vt / 0.18) ** 0.85
        cur_hw = half_w * crown_taper * (0.42 + 0.58 * math.sin(vt * math.pi * 0.85))
        for dx in range(-ihw - 1, ihw + 2):
            adx = abs(dx)
            if adx <= cur_hw:
                if vt < 0.14 and BAYER4[y % 4, (ix + dx) % 4] > (vt / 0.14 + 0.18):
                    continue
                if adx <= cur_hw * 0.32:
                    col = C_PURE_RAZOR
                elif adx <= cur_hw * 0.68:
                    col = C_GOLD_LIT
                else:
                    col = C_CYAN_BRIGHT
                put_px_160(arr, ix + dx, y, col, margin=6)
    # Horizontal ground rune shockwave bar at impact floor
    fiss_w = int(half_w * 3.6)
    for dx in range(-fiss_w, fiss_w + 1):
        if 8 <= ix + dx <= LOGICAL_W - 9:
            col = C_PURE_RAZOR if abs(dx) < fiss_w * 0.35 else (C_GOLD_LIT if abs(dx) < fiss_w * 0.7 else C_CYAN_BRIGHT)
            put_px_160(arr, ix + dx, bot_y, col, margin=6)
            if abs(dx) < fiss_w * 0.55:
                put_px_160(arr, ix + dx, bot_y - 1, C_CYAN_WHITE, margin=6)


def draw_ground_sparks_160(arr, impact_x, ground_y, spread=22.0, progress=0.0, count=7):
    for i in range(count):
        frac = (i / max(1, count - 1)) * 2.0 - 1.0
        ang = math.radians(-90.0 + frac * 68.0)
        dist = (4.0 + progress * spread) * (0.65 + 0.35 * ((i * 37) % 5) / 4.0)
        sx = impact_x + math.cos(ang) * dist
        sy = min(ground_y, ground_y + math.sin(ang) * dist * 0.55)
        col = C_PURE_RAZOR if progress < 0.35 else (C_GOLD_LIT if i % 2 == 0 else C_CYAN_BRIGHT)
        put_px_160(arr, sx, sy, col)
        if progress < 0.65:
            put_px_160(arr, sx - math.cos(ang) * 1.5, min(ground_y, sy - math.sin(ang) * 1.0), C_CYAN_DEEP)


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
    weapon_deg=24.0,
    blade_len=45.0,
    weapon_layer="front",
    scarf_deg=168.0,
    scarf_len=30.0,
    scarf_phase=0.0,
    scarf_amp=3.2,
    rune_phase=0.0,
    bend_l=1.0,
    bend_r=1.0,
    pre_fn=None,
    post_fn=None,
):
    """
    Mode A: Pastes real 3D-foreshortened keypose body (K1_COIL, K2_LUNGE,
    K3_RISE, K4_LEAP) at constant locked S_HI scale on 857x643 canvas, solves
    2-Bone IK for both armored arms to clasp the Dawn-Breaker hilt, downsamples
    cleanly to 160x120, cel-quantizes with 1px directional Selout, and layers
    scarf ribbons, Greatsword, and FFBE smears.
    """
    kp = keyposes[pose_name]
    win_hi = Image.new("RGBA", (HI_W, HI_H), (0, 0, 0, 0))

    # Place keypose pelvis so resting y_bot lands at ANCHOR_HI_Y + pelvis_dy * S_HI
    pelvis_src = kp["pelvis"]
    dst_pelvis_x = ANCHOR_HI_X + (pelvis_src[0] - kp["x_ref"]) * squash_x + pelvis_dx * S_HI
    dst_pelvis_y = ANCHOR_HI_Y + (pelvis_src[1] - kp["y_bot"]) * squash_y + pelvis_dy * S_HI

    def map_kp_pt(pt):
        dx = (pt[0] - pelvis_src[0]) * squash_x
        dy = (pt[1] - pelvis_src[1]) * squash_y
        rx, ry = rot_pt(( dst_pelvis_x + dx, dst_pelvis_y + dy ), (dst_pelvis_x, dst_pelvis_y), body_tilt_deg)
        return (rx, ry)

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
    l_target_hi = (grip_hi[0] - w_ux * 2.2 * S_HI, grip_hi[1] - w_uy * 2.2 * S_HI)
    r_target_hi = (grip_hi[0] + w_ux * 1.2 * S_HI, grip_hi[1] + w_uy * 1.2 * S_HI)

    # Back arm -> 3D keypose body -> front arm
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

    # Prevent grounded stances from sinking boots below cathedral stone floor (y_120 = 115)
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

    draw_twin_scarf_ribbons_160(
        frame,
        neck_160[0] - 2.0,
        neck_160[1] + 2.0,
        base_deg=scarf_deg,
        length=scarf_len,
        wave_phase=scarf_phase,
        wave_amp=scarf_amp,
    )

    if weapon_layer == "behind":
        draw_dawnbreaker_greatsword_160(
            frame, grip_160[0], grip_160[1], weapon_deg, blade_len=blade_len, rune_phase=rune_phase, draw_gauntlets=False
        )

    mask_b = body_160[:, :, 3] > 128
    frame[mask_b] = body_160[mask_b]

    if weapon_layer != "behind":
        draw_dawnbreaker_greatsword_160(
            frame, grip_160[0], grip_160[1], weapon_deg, blade_len=blade_len, rune_phase=rune_phase, draw_gauntlets=True
        )

    frame = seal_160_char_pinholes_and_leaks(
        frame,
        max_pinhole_lpx=8,
        min_detached_lpx=4,
        max_orphan_lpx=18,
        orphan_dist_lpx=4.5,
        bridge_max_lpx=56,
        bridge_gap_lpx=2.5,
    )

    if post_fn is not None:
        post_fn(frame, neck_160, grip_160)

    return frame


_BIPEDAL_WALK_KFS = [
    # (u, world_thigh, world_knee_bend, ankle_flex, hip_yaw_hi, hip_lift_hi)
    (0.00, -23.5,  4.0,  -6.0,   7.5,   2.0),  # Front Contact (+X plant)
    (0.12, -13.0,  9.5,   0.0,   4.0,   3.5),  # Weight-acceptance down
    (0.24,  -0.5,  2.0,   0.0,   0.0,   0.0),  # Mid-stance vertical pillar (F07 Left / F22 Right)
    (0.38,  12.5,  4.0,   6.0,  -4.0,   1.5),  # Late stance roll-through
    (0.50,  22.5,  8.5,  14.0,  -7.5,   2.0),  # Rear Push-Off (-X trail)
    (0.62,   3.5, 42.0,  22.0,  -2.0,  -7.0),  # Toe-off knee fold
    (0.74, -22.0, 44.0,  20.0,   2.5, -16.5),  # Passing Crossover (F07 Right / F22 Left: knee +X, boot lifted at anchorX!)
    (0.88, -25.5, 12.0,  -7.0,   6.0,  -4.5),  # Terminal swing reach
    (1.00, -23.5,  4.0,  -6.0,   7.5,   2.0),
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


def render_stand_rig_frame_160(
    parts,
    stand_joints,
    pelvis_dx=0.0,
    pelvis_dy=0.0,
    torso_deg=0.0,
    head_deg=0.0,
    mane_deg=0.0,
    mane_wave_ph=0.0,
    mane_wave_amp=6.0,
    l_coat_deg=0.0,
    r_coat_deg=0.0,
    coat_wave_ph=0.0,
    coat_wave_amp=7.0,
    coat_y_offset_160=0.0,
    coat_x_inward_frac=0.0,
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
    shade_far_leg=1.0,
    grip_rel_sh=(10.0, 9.0),
    weapon_deg=29.0,
    blade_len=45.0,
    weapon_layer="front",
    weapon_abs_160=None,
    scarf_deg=168.0,
    scarf_len=30.0,
    scarf_phase=0.0,
    scarf_amp=3.0,
    rune_phase=0.0,
    bend_l=1.0,
    bend_r=1.0,
    lock_lowest_to_ground=False,
    clamp_floor_only=False,
    leg_bridge_r=None,
    pre_fn=None,
    post_fn=None,
):
    """
    Mode B: 14-Part Articulated STAND Rig on 857x643 -> 160x120 for poised IDLE,
    crossover bipedal WALK, DASH, CROUCH parry, HURT/DEATH collapse & grounded
    prone laydown, and planted-sword VICTORY salute.
    """
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
            fim, _, fy0 = parts[f"{side}_foot"]
            return math.hypot(ks[0] - hs[0], ks[1] - hs[1]) + math.hypot(ak[0] - ks[0], ak[1] - ks[1]) + (fy0 + fim.size[1] - ak[1])
        r_sole_eq_hi = (_leg_sole_reach("l") - _leg_sole_reach("r")) + (l_hip_raw[1] - r_hip_raw[1])
    l_hip_dst = (
        l_hip_raw[0] + (spine_hip_x - l_hip_raw[0]) * hip_inward_frac + l_hip_off_hi[0],
        l_hip_raw[1] + l_hip_off_hi[1],
    )
    r_hip_dst = (
        r_hip_raw[0] + (spine_hip_x - r_hip_raw[0]) * hip_inward_frac + r_hip_off_hi[0],
        r_hip_raw[1] + r_sole_eq_hi + r_hip_off_hi[1],
    )

    mane_rel = (neck_dst[0] + (sj["mane"][0] - sj["neck"][0]), neck_dst[1] + (sj["mane"][1] - sj["neck"][1]))
    mane_dst = rot_pt(mane_rel, neck_dst, torso_deg + head_deg)

    # Leg kinematics
    def pose_leg(side, hip_dst, th_deg, sh_deg, ft_deg):
        hip_s = sj[f"{side}_hip"]
        knee_s = sj[f"{side}_knee"]
        ank_s = sj[f"{side}_ankle"]
        if neutralize_leg_rest:
            th_rot = th_deg - _bone_rest_deg_stand(hip_s, knee_s)
            sh_rot = (th_deg + sh_deg) - _bone_rest_deg_stand(knee_s, ank_s)
            ft_rot = ft_deg
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
    l_target_hi = (grip_hi[0] - w_ux * 2.0 * S_HI, grip_hi[1] - w_uy * 2.0 * S_HI)
    r_target_hi = (grip_hi[0] + w_ux * 1.2 * S_HI, grip_hi[1] + w_uy * 1.2 * S_HI)

    r_hip_br, r_knee_br = leg_bridge_r if leg_bridge_r is not None else (9, 7)

    l_thigh_part = _shade_crop_tuple(parts["l_thigh"], shade_far_leg)
    l_shin_part = _shade_crop_tuple(parts["l_shin"], shade_far_leg)
    l_foot_part = _shade_crop_tuple(parts["l_foot"], shade_far_leg)

    # Layering back-to-front (far leg l_* strictly behind near leg r_*):
    paste_rotated_part(
        win_hi, parts["mane"], sj["mane"], mane_dst,
        deg=torso_deg + head_deg + mane_deg, wave_phase=mane_wave_ph, wave_amp=mane_wave_amp,
    )
    draw_joint_bridge_hi(win_hi, (dst_pelvis[0] - 8.0, dst_pelvis[1] + 4.0), l_coat_dst, r=5, fill=(24, 52, 130, 255), inner=(35, 72, 166, 255))
    paste_rotated_part(
        win_hi, parts["l_coat"], sj["l_coat"], l_coat_dst,
        deg=torso_deg + l_coat_deg, wave_phase=coat_wave_ph, wave_amp=coat_wave_amp,
    )
    paste_ik_arm_hi(win_hi, parts, sj, "l", l_sh_dst, l_target_hi, bend_sign=bend_l)

    draw_joint_bridge_hi(win_hi, dst_pelvis, l_hip_dst, r=max(6, r_hip_br))
    draw_joint_bridge_hi(win_hi, l_hip_dst, l_knee_dst, r=r_hip_br)
    draw_joint_bridge_hi(win_hi, l_knee_dst, l_ank_dst, r=r_knee_br)
    paste_rotated_part(win_hi, l_thigh_part, sj["l_hip"], l_hip_dst, deg=l_th_rot)
    paste_rotated_part(win_hi, l_shin_part, sj["l_knee"], l_knee_dst, deg=l_sh_rot)
    paste_rotated_part(win_hi, l_foot_part, sj["l_ankle"], l_ank_dst, deg=l_ft_rot)

    draw_joint_bridge_hi(win_hi, (dst_pelvis[0] + 8.0, dst_pelvis[1] + 4.0), r_coat_dst, r=5, fill=(24, 52, 130, 255), inner=(35, 72, 166, 255))
    paste_rotated_part(
        win_hi, parts["r_coat"], sj["r_coat"], r_coat_dst,
        deg=torso_deg + r_coat_deg, wave_phase=coat_wave_ph + 1.1, wave_amp=coat_wave_amp * 0.85,
    )
    draw_joint_bridge_hi(win_hi, dst_pelvis, r_hip_dst, r=max(6, r_hip_br))
    draw_joint_bridge_hi(win_hi, r_hip_dst, r_knee_dst, r=r_hip_br)
    draw_joint_bridge_hi(win_hi, r_knee_dst, r_ank_dst, r=r_knee_br)
    paste_rotated_part(win_hi, parts["r_thigh"], sj["r_hip"], r_hip_dst, deg=r_th_rot)
    paste_rotated_part(win_hi, parts["r_shin"], sj["r_knee"], r_knee_dst, deg=r_sh_rot)
    paste_rotated_part(win_hi, parts["r_foot"], sj["r_ankle"], r_ank_dst, deg=r_ft_rot)

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

    fx_behind = np.zeros((LOGICAL_H, LOGICAL_W, 4), dtype=np.uint8)
    neck_160 = (neck_dst[0] / S_HI, neck_dst[1] / S_HI + shift_y_160)
    grip_160 = (grip_hi[0] / S_HI, grip_hi[1] / S_HI + shift_y_160)

    if pre_fn is not None:
        pre_fn(fx_behind, neck_160, grip_160)

    if scarf_len > 1.0:
        draw_twin_scarf_ribbons_160(
            fx_behind,
            neck_160[0] - 2.0,
            neck_160[1] + 2.0,
            base_deg=scarf_deg,
            length=scarf_len,
            wave_phase=scarf_phase,
            wave_amp=scarf_amp,
        )

    char_160 = np.zeros((LOGICAL_H, LOGICAL_W, 4), dtype=np.uint8)
    if weapon_layer == "behind":
        draw_dawnbreaker_greatsword_160(
            char_160, grip_160[0], grip_160[1], weapon_deg, blade_len=blade_len, rune_phase=rune_phase, draw_gauntlets=False
        )

    mask_b = body_160[:, :, 3] > 128
    char_160[mask_b] = body_160[mask_b]

    if weapon_layer == "front":
        draw_dawnbreaker_greatsword_160(
            char_160, grip_160[0], grip_160[1], weapon_deg, blade_len=blade_len, rune_phase=rune_phase, draw_gauntlets=True
        )

    char_160 = seal_160_char_pinholes_and_leaks(
        char_160,
        max_pinhole_lpx=8,
        min_detached_lpx=4,
        max_orphan_lpx=18,
        orphan_dist_lpx=4.5,
        bridge_max_lpx=56,
        bridge_gap_lpx=2.5,
    )
    frame = fx_behind
    mask_c = char_160[:, :, 3] > 128
    frame[mask_c] = char_160[mask_c]
    frame = _fill_enclosed_holes_rgba(frame, max_hole_area=6, safe_border=2)

    if post_fn is not None:
        post_fn(frame, neck_160, grip_160)

    return frame


# ==============================================================================
# 7. 10-ROW x 30-FRAME CHOREOGRAPHY (300 CELLS)
# ==============================================================================

def build_row0_idle(parts, sj):
    """Row 0: Sovereign Neo-Vision Poised Breathing + Flowing Scarf/Coat/Fuller Pulse."""
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 2.0 * math.pi
        bob_y = math.sin(ph) * 1.15
        torso_deg = math.sin(ph - 0.4) * 1.4
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=math.sin(ph) * 0.4,
            pelvis_dy=bob_y,
            torso_deg=torso_deg,
            head_deg=-torso_deg * 0.5,
            mane_deg=math.sin(ph - 0.8) * 2.5,
            mane_wave_ph=ph,
            mane_wave_amp=7.5,
            l_coat_deg=3.0 + math.sin(ph - 0.7) * 4.2,
            r_coat_deg=-2.0 + math.sin(ph - 1.1) * 3.2,
            coat_wave_ph=ph,
            coat_wave_amp=8.5,
            grip_rel_sh=(10.5, 9.5 + math.sin(ph - 0.3) * 0.9),
            weapon_deg=29.0 + math.sin(ph - 0.5) * 2.2,
            blade_len=45.0,
            weapon_layer="front",
            scarf_deg=166.0 + math.sin(ph - 0.6) * 4.5,
            scarf_len=31.0,
            scarf_phase=ph * 2.0,
            scarf_amp=3.4,
            rune_phase=ph * 2.0,
        ))
    return frames


def build_row1_walk(parts, sj):
    """
    Row 1: True Centered-Hip Bipedal Crossover Vanguard Stride (F00..F29).
      - F00: Left foot plants forward (+X) & Right foot trails (-X)
      - F07: Right knee lifts & CROSSES OVER anchorX (single-column passing profile)
      - F15: Right foot plants forward (+X) & Left foot trails (-X)
      - F22: Left knee lifts & CROSSES OVER anchorX
    """
    frames = []
    for f in range(30):
        u_l = (f / 30.0) % 1.0
        u_r = (u_l + 0.5) % 1.0
        ph30 = u_l * 2.0 * math.pi
        ph2 = ph30 * 2.0

        l_th, l_kb, l_af, l_yaw, l_lift = _sample_bipedal_walk(u_l)
        r_th, r_kb, r_af, r_yaw, r_lift = _sample_bipedal_walk(u_r)

        # Double-step walk bob: down on contact (F00, F15), up at passing crossover (F07, F22)
        bob_y = 0.85 * math.cos(ph2) - 1.15
        stride_sway = math.cos(ph30)  # +1 at F00 (L fwd), -1 at F15 (R fwd)

        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=0.8 + math.sin(ph2) * 0.35,
            pelvis_dy=bob_y,
            torso_deg=2.4 + math.cos(ph2) * 0.8,
            head_deg=-1.3 - math.cos(ph2) * 0.4,
            mane_deg=-1.5 + math.sin(ph2 - 0.6) * 2.2,
            mane_wave_ph=ph2,
            mane_wave_amp=5.5,
            l_coat_deg=11.0 + max(0.0, l_th) * 0.42,
            r_coat_deg=-6.5 + min(0.0, r_th) * 0.36,
            coat_wave_ph=ph2,
            coat_wave_amp=3.2,
            coat_y_offset_160=-4.5,
            coat_x_inward_frac=0.55,
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
            shade_far_leg=0.84,
            grip_rel_sh=(10.2 - stride_sway * 1.1, 8.2 + math.sin(ph2) * 0.5),
            weapon_deg=21.5 - stride_sway * 3.0,
            blade_len=44.0,
            weapon_layer="front",
            scarf_deg=169.0 + math.sin(ph2 - 0.5) * 3.2,
            scarf_len=30.5,
            scarf_phase=ph2,
            scarf_amp=3.0,
            rune_phase=ph2,
            lock_lowest_to_ground=False,
            clamp_floor_only=True,
            leg_bridge_r=(4, 3),
        ))
    return frames


def build_row2_auto_attack(parts, sj, keyposes):
    """
    Row 2: AUTO_ATTACK ([[60, 8], [68, 7], [75, 8], [83, 7]] = 30 Frames)
    4 Chained FFBE / Last Cloudia Hack-and-Slash Strikes with ZERO Idle Reset!
      - Beat 1 (F00..F07): K1_COIL Back-Twist -> F03 1-FRAME SNAP Downward Serrated Cleave
      - Beat 2 (F08..F14): F08 Micro-Compression -> F09 1-FRAME SNAP Reverse Rising Heaven-Cleave
      - Beat 3 (F15..F22): Cross-Torque -> F17 1-FRAME SNAP 2.5D Foreshortened Vortex Slash
      - Beat 4 (F23..F29): K4_LEAP High-Jump -> F25 1-FRAME SNAP Meteoric Heavensplitter Slam
    """
    frames = []

    # ---------------- BEAT 1: F00..F07 (Frames 60..67) ----------------
    # F00..F02: Coiled anticipation hold (K1_COIL)
    coil_specs = [
        (-2.0, -1.0, -4.0, (-3.0, -4.0), -136.0, 166.0, 0.2, False),
        (-4.0, -2.5, -7.0, (-4.5, -5.5), -145.0, 162.0, 0.9, False),
        (-5.5, -4.0, -9.5, (-5.5, -6.5), -152.0, 158.0, 1.6, True),
    ]
    for idx, (pdx, pdy, tilt, gr, wdeg, sdeg, sph, glint) in enumerate(coil_specs):
        def post_coil(arr, _n, grip, do_glint=glint, arm=5 + idx):
            if do_glint:
                draw_star_glint_160(arr, grip[0] - 2.0, grip[1] - 2.0, arm_len=arm)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K1_COIL",
            pelvis_dx=pdx, pelvis_dy=pdy, body_tilt_deg=tilt,
            grip_rel_sh=gr, weapon_deg=wdeg, blade_len=44.0,
            scarf_deg=sdeg, scarf_len=31.0, scarf_phase=sph, scarf_amp=3.4,
            rune_phase=sph, bend_l=-1.0, bend_r=-1.0,
            post_fn=post_coil,
        ))

    # F03: 1-FRAME EXPLOSIVE SNAP + COLOSSAL 200-DEG SERRATED CRESCENT SMEAR!
    def post_b1_snap(arr, _n, _g):
        draw_ffbe_serrated_smear_160(
            arr, cx=80.0, cy=61.0,
            tail_deg=-154.0, lead_deg=25.0, sweep_dir=1,
            rx_outer=73.0, ry_outer=51.0, max_thickness=28.0,
            n_teeth=7, tooth_depth=10.5, phase=0.15,
        )
        draw_ground_sparks_160(arr, impact_x=130.0, ground_y=114.0, spread=20.0, progress=0.2, count=7)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=10.0, pelvis_dy=1.0, body_tilt_deg=6.0,
        grip_rel_sh=(14.5, 4.5), weapon_deg=24.0, blade_len=46.0,
        scarf_deg=176.0, scarf_len=34.0, scarf_phase=2.5, scarf_amp=4.2,
        rune_phase=2.5, post_fn=post_b1_snap,
    ))

    # F04: Progressive Smear Tail-Erosion (~95 deg arc) + scarf whip forward
    def post_b1_erode1(arr, _n, _g):
        draw_ffbe_serrated_smear_160(
            arr, cx=79.0, cy=63.0,
            tail_deg=-68.0, lead_deg=27.0, sweep_dir=1,
            rx_outer=70.0, ry_outer=48.0, max_thickness=18.0,
            n_teeth=5, tooth_depth=8.0, phase=0.45,
        )
        draw_ground_sparks_160(arr, impact_x=132.0, ground_y=114.0, spread=24.0, progress=0.55, count=6)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=11.0, pelvis_dy=2.0, body_tilt_deg=7.5,
        grip_rel_sh=(15.0, 5.5), weapon_deg=27.0, blade_len=46.0,
        scarf_deg=188.0, scarf_len=33.0, scarf_phase=3.4, scarf_amp=4.5,
        rune_phase=3.2, post_fn=post_b1_erode1,
    ))

    # F05: Final blade-tip smear wisp (~38 deg)
    def post_b1_erode2(arr, _n, _g):
        draw_ffbe_serrated_smear_160(
            arr, cx=78.0, cy=64.0,
            tail_deg=-10.0, lead_deg=28.0, sweep_dir=1,
            rx_outer=67.0, ry_outer=46.0, max_thickness=9.5,
            n_teeth=4, tooth_depth=5.0, phase=0.75,
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=11.0, pelvis_dy=2.0, body_tilt_deg=7.0,
        grip_rel_sh=(15.0, 5.8), weapon_deg=28.0, blade_len=46.0,
        scarf_deg=194.0, scarf_len=31.0, scarf_phase=4.2, scarf_amp=3.8,
        rune_phase=3.9, post_fn=post_b1_erode2,
    ))

    # F06..F07: Zero-smear crisp planted split-lunge hold (directly feeds Beat 2!)
    for sub_i, (pdx, wdeg, sdeg, sph) in enumerate([
        (10.2, 26.5, 184.0, 5.0),
        (9.4, 25.0, 176.0, 5.7),
    ]):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K2_LUNGE",
            pelvis_dx=pdx, pelvis_dy=1.5 - sub_i * 0.4, body_tilt_deg=6.0 - sub_i * 0.5,
            grip_rel_sh=(14.5, 5.5), weapon_deg=wdeg, blade_len=46.0,
            scarf_deg=sdeg, scarf_len=30.0, scarf_phase=sph, scarf_amp=3.2,
            rune_phase=4.5 + sub_i * 0.7,
        ))

    # ---------------- BEAT 2: F08..F14 (Frames 68..74) ----------------
    # F08: 1-Frame Micro-Compression directly from Beat 1's low lunge (NO idle reset!)
    def post_b2_coil(arr, _n, grip):
        draw_star_glint_160(arr, grip[0] + 5.0, grip[1] + 2.0, arm_len=5)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=8.5, pelvis_dy=3.0, body_tilt_deg=9.0,
        grip_rel_sh=(13.5, 7.5), weapon_deg=34.0, blade_len=45.0,
        scarf_deg=172.0, scarf_len=30.0, scarf_phase=0.4, scarf_amp=3.2,
        rune_phase=0.5, post_fn=post_b2_coil,
    ))

    # F09: 1-FRAME REVERSE RISING SNAP + UPPER-HEMISPHERE SERRATED SMEAR!
    def post_b2_snap(arr, _n, _g):
        draw_ffbe_serrated_smear_160(
            arr, cx=80.0, cy=60.0,
            tail_deg=35.0, lead_deg=-126.0, sweep_dir=-1,
            rx_outer=74.0, ry_outer=52.0, max_thickness=27.0,
            n_teeth=7, tooth_depth=10.0, phase=0.2,
        )
        draw_ground_sparks_160(arr, impact_x=96.0, ground_y=114.0, spread=16.0, progress=0.3, count=5)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=8.0, pelvis_dy=-1.0, body_tilt_deg=-4.5,
        grip_rel_sh=(5.0, -10.5), weapon_deg=-126.0, blade_len=44.0,
        scarf_deg=152.0, scarf_len=34.0, scarf_phase=1.5, scarf_amp=4.4,
        rune_phase=1.6, bend_l=-1.0, bend_r=-1.0, post_fn=post_b2_snap,
    ))

    # F10: Upper smear tail-erosion (-36 deg -> -130 deg)
    def post_b2_erode1(arr, _n, _g):
        draw_ffbe_serrated_smear_160(
            arr, cx=78.0, cy=58.0,
            tail_deg=-34.0, lead_deg=-130.0, sweep_dir=-1,
            rx_outer=71.0, ry_outer=50.0, max_thickness=17.0,
            n_teeth=5, tooth_depth=7.5, phase=0.5,
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=8.5, pelvis_dy=-2.0, body_tilt_deg=-5.5,
        grip_rel_sh=(4.0, -11.5), weapon_deg=-130.0, blade_len=44.0,
        scarf_deg=146.0, scarf_len=33.0, scarf_phase=2.4, scarf_amp=4.2,
        rune_phase=2.4, bend_l=-1.0, bend_r=-1.0, post_fn=post_b2_erode1,
    ))

    # F11: Apex wisp (-86 deg -> -132 deg)
    def post_b2_erode2(arr, _n, _g):
        draw_ffbe_serrated_smear_160(
            arr, cx=76.0, cy=57.0,
            tail_deg=-84.0, lead_deg=-132.0, sweep_dir=-1,
            rx_outer=67.0, ry_outer=48.0, max_thickness=9.0,
            n_teeth=4, tooth_depth=4.5, phase=0.8,
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=8.2, pelvis_dy=-1.8, body_tilt_deg=-5.0,
        grip_rel_sh=(3.5, -11.5), weapon_deg=-132.0, blade_len=44.0,
        scarf_deg=150.0, scarf_len=32.0, scarf_phase=3.2, scarf_amp=3.8,
        rune_phase=3.1, bend_l=-1.0, bend_r=-1.0, post_fn=post_b2_erode2,
    ))

    # F12..F14: Commanding high-guard settle -> cross-shoulder coil transition
    for sub_i, (pdx, pdy, tilt, wdeg, sdeg, sph) in enumerate([
        (7.6, -1.0, -3.5, -128.0, 158.0, 4.0),
        (7.0, -0.3, -2.0, -122.0, 164.0, 4.7),
        (6.0,  0.2, -0.5, -115.0, 168.0, 5.4),
    ]):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=pdx, pelvis_dy=pdy, body_tilt_deg=tilt,
            grip_rel_sh=(4.5, -10.0 + sub_i * 0.8), weapon_deg=wdeg, blade_len=44.0,
            scarf_deg=sdeg, scarf_len=31.0, scarf_phase=sph, scarf_amp=3.4,
            rune_phase=3.8 + sub_i * 0.7, bend_l=-1.0, bend_r=-1.0,
        ))

    # ---------------- BEAT 3: F15..F22 (Frames 75..82) ----------------
    # F15..F16: Foreshortened cross-shoulder horizontal coil (K1_COIL compressed)
    for sub_i, (pdx, sqx, wdeg, sph, glint) in enumerate([
        (4.0, 0.93, -158.0, 0.4, False),
        (2.5, 0.88, -172.0, 1.2, True),
    ]):
        def post_b3_coil(arr, _n, grip, do_g=glint):
            if do_g:
                draw_star_glint_160(arr, grip[0], grip[1], arm_len=6)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K1_COIL",
            pelvis_dx=pdx, pelvis_dy=1.5 + sub_i * 0.5, body_tilt_deg=-3.0,
            squash_x=sqx, squash_y=1.0,
            grip_rel_sh=(-4.5, -1.0), weapon_deg=wdeg, blade_len=42.0,
            scarf_deg=162.0 - sub_i * 6.0, scarf_len=30.0, scarf_phase=sph, scarf_amp=3.5,
            rune_phase=sph, bend_l=-1.0, bend_r=1.0, post_fn=post_b3_coil,
        ))

    # F17: 1-FRAME 250-DEG FORESHORTENED 2.5D PERSPECTIVE VORTEX SLASH!
    def pre_b3_snap(arr, _n, _g):
        draw_foreshortened_vortex_smear_160(
            arr, cx=80.0, cy=69.0, rx=73.0, ry=23.0, tilt_deg=-10.0, front_thickness=30.0, half="back", erosion=0.0
        )

    def post_b3_snap(arr, _n, _g):
        draw_foreshortened_vortex_smear_160(
            arr, cx=80.0, cy=69.0, rx=73.0, ry=23.0, tilt_deg=-10.0, front_thickness=34.0, half="front", erosion=0.0
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=12.0, pelvis_dy=1.0, body_tilt_deg=8.0,
        grip_rel_sh=(15.5, 1.0), weapon_deg=-4.0, blade_len=46.0,
        scarf_deg=182.0, scarf_len=35.0, scarf_phase=2.4, scarf_amp=4.6,
        rune_phase=2.5, pre_fn=pre_b3_snap, post_fn=post_b3_snap,
    ))

    # F18: Counter-tilted cross-rip vortex shear (+11 deg)
    def pre_b3_cross(arr, _n, _g):
        draw_foreshortened_vortex_smear_160(
            arr, cx=79.0, cy=68.0, rx=69.0, ry=18.0, tilt_deg=11.0, front_thickness=15.0, half="back", erosion=0.25
        )

    def post_b3_cross(arr, _n, _g):
        draw_foreshortened_vortex_smear_160(
            arr, cx=79.0, cy=68.0, rx=69.0, ry=18.0, tilt_deg=11.0, front_thickness=16.0, half="front", erosion=0.25
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=11.0, pelvis_dy=0.5, body_tilt_deg=3.5,
        grip_rel_sh=(14.0, 2.5), weapon_deg=13.0, blade_len=46.0,
        scarf_deg=190.0, scarf_len=34.0, scarf_phase=3.3, scarf_amp=4.4,
        rune_phase=3.3, pre_fn=pre_b3_cross, post_fn=post_b3_cross,
    ))

    # F19: Vortex streak eroding
    def post_b3_erode(arr, _n, _g):
        draw_foreshortened_vortex_smear_160(
            arr, cx=78.0, cy=69.0, rx=65.0, ry=15.0, tilt_deg=8.0, front_thickness=9.5, half="front", erosion=0.62
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=10.0, pelvis_dy=1.0, body_tilt_deg=4.0,
        grip_rel_sh=(13.5, 3.5), weapon_deg=18.0, blade_len=45.0,
        scarf_deg=194.0, scarf_len=32.0, scarf_phase=4.1, scarf_amp=4.0,
        rune_phase=4.0, post_fn=post_b3_erode,
    ))

    # F20..F22: Spring-loaded reverse crouch loading legs for Beat 4 High-Leap!
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=8.0, pelvis_dy=2.0, body_tilt_deg=7.5,
        grip_rel_sh=(12.0, 5.5), weapon_deg=23.0, blade_len=45.0,
        scarf_deg=182.0, scarf_len=31.0, scarf_phase=4.8, scarf_amp=3.5,
        rune_phase=4.7,
    ))
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=5.5, pelvis_dy=3.2, body_tilt_deg=10.0,
        grip_rel_sh=(-3.5, 6.5), weapon_deg=152.0, blade_len=42.0,
        weapon_layer="behind",
        scarf_deg=172.0, scarf_len=30.0, scarf_phase=5.5, scarf_amp=3.2,
        rune_phase=5.4,
    ))
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K1_COIL",
        pelvis_dx=3.5, pelvis_dy=2.0, body_tilt_deg=5.0,
        grip_rel_sh=(-4.5, 2.0), weapon_deg=158.0, blade_len=42.0,
        weapon_layer="behind",
        scarf_deg=166.0, scarf_len=30.0, scarf_phase=6.2, scarf_amp=3.4,
        rune_phase=6.1,
    ))

    # ---------------- BEAT 4: F23..F29 (Frames 83..89) ----------------
    # F23..F24: Explosive Airborne Leap (K4_LEAP, boots 18..22 logical px off floor!)
    for sub_i, (pdx, pdy, tilt, wdeg, sdeg, sph) in enumerate([
        (6.0, -18.0, -5.5, -152.0, 128.0, 0.8),
        (8.0, -22.0, -9.0, -160.0, 120.0, 1.7),
    ]):
        def post_b4_leap(arr, _n, grip, is_apex=(sub_i == 1)):
            if is_apex:
                draw_star_glint_160(arr, grip[0] - 1.0, grip[1] - 2.0, arm_len=7, core_r=2.1)
            else:
                draw_ground_sparks_160(arr, impact_x=62.0, ground_y=114.0, spread=14.0, progress=0.4, count=5)

        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K4_LEAP",
            pelvis_dx=pdx, pelvis_dy=pdy, body_tilt_deg=tilt,
            grip_rel_sh=(-3.5, -7.5), weapon_deg=wdeg, blade_len=42.0,
            scarf_deg=sdeg, scarf_len=34.0, scarf_phase=sph, scarf_amp=4.2,
            rune_phase=sph, bend_l=-1.0, bend_r=-1.0, post_fn=post_b4_leap,
        ))

    # F25: 1-FRAME METEORIC SKY-TO-FLOOR GUILLOTINE SLAM + FULL-HEIGHT SERRATED SMEAR!
    def post_b4_slam(arr, _n, _g):
        draw_heavensplitter_pillar_160(arr, impact_x=131.0, top_y=4, bot_y=114, half_w=4.2)
        draw_ffbe_serrated_smear_160(
            arr, cx=78.0, cy=58.0,
            tail_deg=-156.0, lead_deg=34.0, sweep_dir=1,
            rx_outer=76.0, ry_outer=56.0, max_thickness=33.0,
            n_teeth=8, tooth_depth=12.0, phase=0.1,
        )
        draw_ground_sparks_160(arr, impact_x=130.0, ground_y=114.0, spread=28.0, progress=0.15, count=10)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=12.5, pelvis_dy=2.0, body_tilt_deg=8.5,
        grip_rel_sh=(15.0, 5.5), weapon_deg=26.0, blade_len=46.0,
        scarf_deg=142.0, scarf_len=35.0, scarf_phase=2.8, scarf_amp=4.8,
        rune_phase=2.9, post_fn=post_b4_slam,
    ))

    # F26: Heavensplitter shock-erosion
    def post_b4_erode1(arr, _n, _g):
        draw_ffbe_serrated_smear_160(
            arr, cx=78.0, cy=61.0,
            tail_deg=-64.0, lead_deg=29.0, sweep_dir=1,
            rx_outer=72.0, ry_outer=51.0, max_thickness=20.0,
            n_teeth=6, tooth_depth=8.5, phase=0.42,
        )
        draw_ground_sparks_160(arr, impact_x=130.0, ground_y=114.0, spread=28.0, progress=0.5, count=8)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=13.0, pelvis_dy=2.8, body_tilt_deg=9.0,
        grip_rel_sh=(15.5, 6.0), weapon_deg=28.0, blade_len=46.0,
        scarf_deg=178.0, scarf_len=34.0, scarf_phase=3.7, scarf_amp=4.5,
        rune_phase=3.7, post_fn=post_b4_erode1,
    ))

    # F27: Floor-impact smear wisp
    def post_b4_erode2(arr, _n, _g):
        draw_ffbe_serrated_smear_160(
            arr, cx=77.0, cy=63.0,
            tail_deg=-10.0, lead_deg=28.0, sweep_dir=1,
            rx_outer=68.0, ry_outer=48.0, max_thickness=10.0,
            n_teeth=4, tooth_depth=5.0, phase=0.72,
        )
        draw_ground_sparks_160(arr, impact_x=132.0, ground_y=114.0, spread=30.0, progress=0.82, count=6)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=11.8, pelvis_dy=2.0, body_tilt_deg=7.5,
        grip_rel_sh=(15.0, 5.5), weapon_deg=27.0, blade_len=46.0,
        scarf_deg=192.0, scarf_len=32.0, scarf_phase=4.5, scarf_amp=3.9,
        rune_phase=4.5, post_fn=post_b4_erode2,
    ))

    # F28..F29: Noble vanguard power recovery
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=8.0, pelvis_dy=1.0, body_tilt_deg=3.0,
        grip_rel_sh=(12.5, 5.0), weapon_deg=24.0, blade_len=45.0,
        scarf_deg=180.0, scarf_len=31.0, scarf_phase=5.3, scarf_amp=3.5,
        rune_phase=5.2,
    ))
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=4.0, pelvis_dy=0.0, body_tilt_deg=1.0,
        grip_rel_sh=(11.0, 6.5), weapon_deg=27.0, blade_len=45.0,
        scarf_deg=170.0, scarf_len=31.0, scarf_phase=6.0, scarf_amp=3.2,
        rune_phase=5.9,
    ))

    assert len(frames) == 30
    return frames


def build_row3_skill(parts, sj, keyposes):
    """Row 3: SKILL -- Sovereign Cross-Flurry & Dragon-Fang Sky Launcher (30 Frames)."""
    frames = []
    # F00..F03: Coiled vanguard rune gather
    for f in range(4):
        def post_g(arr, _n, grip, step=f):
            if step >= 2:
                draw_star_glint_160(arr, grip[0], grip[1], arm_len=4 + step)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K1_COIL",
            pelvis_dx=-2.0 - f * 1.1, pelvis_dy=-f * 0.8, body_tilt_deg=-4.0 - f * 1.8,
            grip_rel_sh=(-4.0, -5.0), weapon_deg=-138.0 - f * 5.0, blade_len=44.0,
            scarf_deg=164.0 - f * 3.0, scarf_len=31.0, scarf_phase=f * 0.7, scarf_amp=3.5,
            rune_phase=f * 0.8, bend_l=-1.0, bend_r=-1.0, post_fn=post_g,
        ))

    # F04..F08: Slash 1 -- Advancing downward diagonal smear + erosion
    for sub in range(5):
        def post_s1(arr, _n, _g, s=sub):
            if s <= 2:
                tails = [-150.0, -65.0, -12.0]
                thicks = [25.0, 16.0, 8.5]
                draw_ffbe_serrated_smear_160(
                    arr, cx=80.0, cy=62.0, tail_deg=tails[s], lead_deg=26.0, sweep_dir=1,
                    rx_outer=72.0 - s * 2.0, ry_outer=49.0 - s * 1.5, max_thickness=thicks[s],
                    n_teeth=6 - s, tooth_depth=9.0 - s * 2.0, phase=s * 0.3,
                )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K2_LUNGE",
            pelvis_dx=10.5 + min(2, sub) * 0.8, pelvis_dy=1.5, body_tilt_deg=7.0,
            grip_rel_sh=(14.5, 5.0), weapon_deg=25.0 + sub * 1.2, blade_len=46.0,
            scarf_deg=178.0 + sub * 3.5, scarf_len=33.0, scarf_phase=2.8 + sub * 0.7, scarf_amp=4.0,
            rune_phase=3.0 + sub * 0.7, post_fn=post_s1,
        ))

    # F09..F14: Slash 2 -- 2.5D Horizontal Vortex Rip + erosion
    for sub in range(6):
        def pre_s2(arr, _n, _g, s=sub):
            if s in (1, 2):
                draw_foreshortened_vortex_smear_160(
                    arr, cx=80.0, cy=68.0, rx=72.0 - s * 3.0, ry=20.0, tilt_deg=-8.0 + s * 12.0,
                    front_thickness=20.0 - s * 4.0, half="back", erosion=0.2 * (s - 1),
                )
        def post_s2(arr, _n, _g, s=sub):
            if s in (1, 2, 3):
                draw_foreshortened_vortex_smear_160(
                    arr, cx=80.0, cy=68.0, rx=72.0 - s * 3.0, ry=20.0, tilt_deg=-8.0 + s * 8.0,
                    front_thickness=22.0 - s * 5.0, half="front", erosion=0.28 * (s - 1),
                )
        pose_nm = "K1_COIL" if sub == 0 else "K3_RISE"
        wdeg = -166.0 if sub == 0 else (-2.0 + sub * 5.0)
        gr = (-4.5, -1.0) if sub == 0 else (14.5, 2.0 + sub * 0.6)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, pose_nm,
            pelvis_dx=6.0 if sub == 0 else (12.0 - sub * 0.6), pelvis_dy=1.0, body_tilt_deg=3.0,
            grip_rel_sh=gr, weapon_deg=wdeg, blade_len=45.0,
            scarf_deg=172.0 + sub * 3.0, scarf_len=33.0, scarf_phase=0.5 + sub * 0.8, scarf_amp=4.2,
            rune_phase=sub * 0.8, pre_fn=pre_s2, post_fn=post_s2,
        ))

    # F15..F17: Deep launcher crouch compression
    for sub in range(3):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K2_LUNGE",
            pelvis_dx=8.0 - sub * 0.8, pelvis_dy=2.5 + sub * 0.8, body_tilt_deg=9.0 + sub * 1.0,
            grip_rel_sh=(12.5, 7.5), weapon_deg=32.0 + sub * 2.5, blade_len=45.0,
            scarf_deg=170.0, scarf_len=30.0, scarf_phase=sub * 0.8, scarf_amp=3.2,
            rune_phase=sub * 0.9,
        ))

    # F18..F24: Slash 3 -- Explosive Airborne Dragon-Fang Uppercut Launcher!
    for sub in range(7):
        pdy = [-12.0, -17.0, -20.0, -19.0, -16.0, -12.0, -7.0][sub]
        def post_s3(arr, _n, _g, s=sub):
            if s <= 3:
                tails = [34.0, -28.0, -72.0, -104.0]
                thicks = [28.0, 19.0, 12.0, 7.0]
                draw_ffbe_serrated_smear_160(
                    arr, cx=80.0, cy=56.0, tail_deg=tails[s], lead_deg=-138.0, sweep_dir=-1,
                    rx_outer=73.0 - s * 2.0, ry_outer=50.0 - s * 1.5, max_thickness=thicks[s],
                    n_teeth=7 - s, tooth_depth=10.0 - s * 1.8, phase=0.15 + s * 0.25,
                )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K4_LEAP",
            pelvis_dx=10.0 + min(3, sub) * 0.5, pelvis_dy=pdy, body_tilt_deg=-6.0,
            grip_rel_sh=(3.0, -8.5), weapon_deg=-144.0 - min(3, sub) * 2.5, blade_len=41.0,
            scarf_deg=126.0 + sub * 5.0, scarf_len=34.0, scarf_phase=1.0 + sub * 0.8, scarf_amp=4.4,
            rune_phase=2.0 + sub * 0.8, bend_l=-1.0, bend_r=-1.0, post_fn=post_s3,
        ))

    # F25..F29: Athletic landing & poised recovery
    for sub in range(5):
        pdy = [-2.0, 2.5, 1.8, 0.8, 0.0][sub]
        pose_nm = "K2_LUNGE" if sub in (1, 2) else "K3_RISE"
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, pose_nm,
            pelvis_dx=9.0 - sub * 1.6, pelvis_dy=pdy, body_tilt_deg=4.0 - sub * 0.8,
            grip_rel_sh=(12.0 - sub * 0.3, 6.0), weapon_deg=24.0 + sub * 1.0, blade_len=45.0,
            scarf_deg=176.0 - sub * 2.0, scarf_len=31.0, scarf_phase=sub * 0.8, scarf_amp=3.4,
            rune_phase=sub * 0.7,
        ))

    assert len(frames) == 30
    return frames


def build_row4_ultimate(parts, sj, keyposes):
    """
    Row 4: ULTIMATE / TRUE_ULTIMATE -- Sacred Neo-Vision Dawn-Breaker Judgment (30 Frames)
      - F00..F05: Sacred Neo-Vision Consecration (Heaven-pointing Greatsword + Star Halo)
      - F06..F16: 3-Hit Omnislash Smear Blitz (Downward + Rising + 2.5D Vortex)
      - F17..F21: Winged Celestial Sky Ascent
      - F22..F29: Full-Canvas Meteoric Dawn-Breaker Cathedral Judgment!
    """
    frames = []
    # F00..F05: Phase 1 -- Sacred Neo-Vision Consecration
    for f in range(6):
        def post_consec(arr, _n, grip, step=f):
            tip_y = max(6.0, grip[1] - 43.0)
            draw_star_glint_160(arr, grip[0], tip_y + 3.0, arm_len=5 + step, core_r=2.0)
            draw_ground_sparks_160(arr, impact_x=64.0, ground_y=114.0, spread=14.0 + step * 2.5, progress=step / 6.0, count=6)

        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=2.0, pelvis_dy=-f * 0.4, body_tilt_deg=-2.0 - f * 0.5,
            grip_rel_sh=(6.5, -8.5 - f * 0.4), weapon_deg=-88.0, blade_len=41.0,
            scarf_deg=156.0 - f * 3.0, scarf_len=33.0, scarf_phase=f * 0.9, scarf_amp=4.0,
            rune_phase=f * 1.1, bend_l=-1.0, bend_r=-1.0, post_fn=post_consec,
        ))

    # F06..F08: Blitz Hit A (Snap Downward Serrated Cleave)
    for sub in range(3):
        def post_ba(arr, _n, _g, s=sub):
            tails = [-154.0, -58.0, -8.0]
            thicks = [29.0, 18.0, 9.0]
            draw_ffbe_serrated_smear_160(
                arr, cx=81.0, cy=61.0, tail_deg=tails[s], lead_deg=26.0, sweep_dir=1,
                rx_outer=74.0 - s * 2.0, ry_outer=51.0, max_thickness=thicks[s],
                n_teeth=7 - s, tooth_depth=10.5 - s * 2.0, phase=s * 0.3,
            )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K2_LUNGE",
            pelvis_dx=11.0 + sub * 0.5, pelvis_dy=1.5, body_tilt_deg=7.5,
            grip_rel_sh=(15.0, 5.0), weapon_deg=25.0 + sub * 1.5, blade_len=46.0,
            scarf_deg=182.0 + sub * 4.0, scarf_len=34.0, scarf_phase=sub * 0.9, scarf_amp=4.4,
            rune_phase=sub * 1.0, post_fn=post_ba,
        ))

    # F09..F12: Blitz Hit B (Snap Reverse Rising Heaven-Cleave)
    for sub in range(4):
        def post_bb(arr, _n, _g, s=sub):
            if s <= 2:
                tails = [34.0, -38.0, -88.0]
                thicks = [28.0, 17.0, 9.0]
                draw_ffbe_serrated_smear_160(
                    arr, cx=80.0, cy=59.0, tail_deg=tails[s], lead_deg=-128.0, sweep_dir=-1,
                    rx_outer=74.0 - s * 2.0, ry_outer=52.0, max_thickness=thicks[s],
                    n_teeth=7 - s, tooth_depth=10.0 - s * 2.0, phase=0.2 + s * 0.3,
                )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=9.5, pelvis_dy=-1.5, body_tilt_deg=-5.0,
            grip_rel_sh=(4.5, -11.0), weapon_deg=-128.0 - sub * 1.5, blade_len=44.0,
            scarf_deg=148.0 + sub * 3.0, scarf_len=34.0, scarf_phase=1.2 + sub * 0.8, scarf_amp=4.4,
            rune_phase=2.0 + sub * 0.9, bend_l=-1.0, bend_r=-1.0, post_fn=post_bb,
        ))

    # F13..F16: Blitz Hit C (2.5D Foreshortened Vortex Ring Slash)
    for sub in range(4):
        def pre_bc(arr, _n, _g, s=sub):
            if s <= 2:
                draw_foreshortened_vortex_smear_160(
                    arr, cx=81.0, cy=68.0, rx=74.0 - s * 3.0, ry=22.0, tilt_deg=-9.0 + s * 9.0,
                    front_thickness=22.0 - s * 5.0, half="back", erosion=0.28 * s,
                )
        def post_bc(arr, _n, _g, s=sub):
            if s <= 2:
                draw_foreshortened_vortex_smear_160(
                    arr, cx=81.0, cy=68.0, rx=74.0 - s * 3.0, ry=22.0, tilt_deg=-9.0 + s * 9.0,
                    front_thickness=24.0 - s * 5.5, half="front", erosion=0.28 * s,
                )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K2_LUNGE",
            pelvis_dx=12.5 - sub * 0.8, pelvis_dy=1.2, body_tilt_deg=7.5,
            grip_rel_sh=(15.0, 2.0 + sub * 0.8), weapon_deg=-2.0 + sub * 6.0, blade_len=46.0,
            scarf_deg=184.0 + sub * 3.0, scarf_len=34.0, scarf_phase=0.8 + sub * 0.9, scarf_amp=4.5,
            rune_phase=sub * 1.0, pre_fn=pre_bc, post_fn=post_bc,
        ))

    # F17..F21: Phase 3 -- Winged Neo-Vision Sky Ascent!
    for sub in range(5):
        pdy = [-12.0, -17.0, -21.0, -23.0, -23.5][sub]
        def pre_wings(arr, neck, _g, s=sub):
            draw_neovision_wings_160(arr, neck[0] - 4.0, neck[1] + 5.0, span_scale=0.75 + s * 0.08, phase=s * 0.8)
        def post_wings(arr, _n, grip, s=sub):
            if s >= 2:
                draw_star_glint_160(arr, grip[0] - 2.0, grip[1] - 2.0, arm_len=6 + (s - 2) * 2, core_r=2.2)

        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K4_LEAP",
            pelvis_dx=6.5 + sub * 0.6, pelvis_dy=pdy, body_tilt_deg=-6.0 - sub * 0.8,
            grip_rel_sh=(-3.5, -7.5), weapon_deg=-154.0 - sub * 1.8, blade_len=41.0,
            scarf_deg=122.0 - sub * 2.0, scarf_len=35.0, scarf_phase=sub * 0.9, scarf_amp=4.5,
            rune_phase=sub * 1.1, bend_l=-1.0, bend_r=-1.0, pre_fn=pre_wings, post_fn=post_wings,
        ))

    # F22..F29: Phase 4 -- Meteoric Dawn-Breaker Cathedral Judgment!
    for sub in range(8):
        def pre_judg(arr, neck, _g, s=sub):
            if s <= 2:
                draw_neovision_wings_160(arr, neck[0] - 5.0, neck[1] + 4.0, span_scale=1.05 - s * 0.18, phase=3.0 + s)

        def post_judg(arr, _n, _g, s=sub):
            if s == 0:
                draw_heavensplitter_pillar_160(arr, impact_x=133.0, top_y=4, bot_y=114, half_w=6.0)
            elif s == 1:
                draw_heavensplitter_pillar_160(arr, impact_x=133.0, top_y=12, bot_y=114, half_w=3.2)
            if s <= 4:
                tails = [-158.0, -82.0, -35.0, -6.0, 12.0]
                thicks = [35.0, 25.0, 16.0, 10.0, 6.0]
                draw_ffbe_serrated_smear_160(
                    arr, cx=79.0, cy=58.0, tail_deg=tails[s], lead_deg=34.0, sweep_dir=1,
                    rx_outer=77.0 - s * 1.5, ry_outer=56.0 - s * 1.5, max_thickness=thicks[s],
                    n_teeth=8 - s, tooth_depth=12.5 - s * 1.8, phase=0.1 + s * 0.22,
                )
            if s <= 5:
                draw_ground_sparks_160(arr, impact_x=132.0, ground_y=114.0, spread=34.0, progress=s / 5.5, count=10 - s)

        pose_nm = "K2_LUNGE" if sub <= 5 else "K3_RISE"
        pdx = 13.0 - max(0, sub - 4) * 2.2
        pdy = 2.5 if sub <= 3 else max(0.0, 2.0 - (sub - 3) * 0.5)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, pose_nm,
            pelvis_dx=pdx, pelvis_dy=pdy, body_tilt_deg=8.5 if sub <= 4 else 3.0,
            grip_rel_sh=(15.0 if sub <= 5 else 12.0, 5.8), weapon_deg=27.0 - max(0, sub - 5) * 1.0, blade_len=46.0,
            scarf_deg=155.0 + min(5, sub) * 7.0, scarf_len=34.0, scarf_phase=2.5 + sub * 0.8, scarf_amp=4.4,
            rune_phase=sub * 0.9, pre_fn=pre_judg, post_fn=post_judg,
        ))

    assert len(frames) == 30
    return frames


def build_row5_death(parts, sj):
    """
    Row 5: HURT ([150, 6]) & DEATH ([150, 30])
      - F00..F05: Crisp backward hit-recoil stagger (works standalone as HURT!)
      - F06..F13: Double-knee buckle & vertical collapse
      - F14..F21: Rotation onto cathedral floor
      - F22..F29: Grounded horizontal prone rest at y_120 = 115 + horizontal sword!
    """
    frames = []
    for f in range(30):
        if f < 6:
            # Upright hit-recoil stagger
            t = f / 5.0
            recoil = math.sin(t * math.pi * 0.85)
            pdx = -recoil * 5.5 - f * 0.3
            pdy = recoil * 2.0
            tdeg = -recoil * 15.0 - 2.0
            hdeg = -recoil * 10.0
            l_th, l_sh = 10.0 * recoil, 14.0 * recoil
            r_th, r_sh = -8.0 * recoil, 18.0 * recoil
            wdeg = -35.0 - recoil * 28.0
            gr = (7.5 - recoil * 3.0, 4.0 - recoil * 4.0)
            w_abs = None
            s_len = 31.0
            s_deg = 12.0 + f * 6.0  # Scarf whips forward on backward recoil!
        elif f < 14:
            # Double-knee buckle
            u = (f - 6) / 7.0
            pdx = -4.5 - u * 3.0
            pdy = 2.0 + u * 18.0
            tdeg = -12.0 + u * 44.0
            hdeg = -8.0 + u * 22.0
            l_th, l_sh = -32.0 * u, 58.0 * u
            r_th, r_sh = -26.0 * u, 54.0 * u
            wdeg = -45.0 + u * 68.0
            gr = (8.0 + u * 4.0, 6.0 + u * 5.0)
            w_abs = None
            s_len = 28.0 * (1.0 - 0.3 * u)
            s_deg = 155.0 + u * 15.0
        elif f < 22:
            # Pitch down to horizontal prone
            u = (f - 14) / 7.0
            pdx = -4.0 + u * 18.0
            pdy = 20.0 + u * 14.0
            tdeg = 32.0 + u * 54.5   # Reaches 86.5 deg horizontal!
            hdeg = 14.0 - u * 10.0
            l_th = -24.0 * (1.0 - u) + 82.0 * u
            l_sh = 50.0 * (1.0 - u) + 10.0 * u
            r_th = -18.0 * (1.0 - u) + 85.0 * u
            r_sh = 46.0 * (1.0 - u) + 6.0 * u
            h_in = 0.72 * u
            c_in = 0.65 * u
            lc_deg, rc_deg = 2.0, 4.0
            wdeg = 23.0 * (1.0 - u) + 2.0 * u
            gr = (12.0, 11.0)
            w_abs = (76.0 + u * 8.0, 108.0 + u * 2.0)
            s_len = 20.0 * (1.0 - 0.6 * u)
            s_deg = 174.0
        else:
            # Grounded horizontal prone rest (subtle 1px cape/breath settle + fading fuller pulse)
            u = (f - 22) / 7.0
            pdx = 14.0
            pdy = 34.0
            tdeg = 86.5 + math.sin(u * math.pi) * 0.6
            hdeg = 4.0
            l_th, l_sh = 82.0, 10.0
            r_th, r_sh = 85.0, 6.0
            h_in = 0.72
            c_in = 0.65
            lc_deg, rc_deg = 2.0, 4.0
            wdeg = 1.5
            gr = (12.0, 11.0)
            w_abs = (84.0, 110.0)
            s_len = 9.0
            s_deg = 178.0 - u * 4.0

        if f < 14:
            h_in = 0.0
            c_in = 0.25
            lc_deg = max(-20.0, -tdeg * 0.25)
            rc_deg = max(-16.0, -tdeg * 0.20)

        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=pdx, pelvis_dy=pdy,
            torso_deg=tdeg, head_deg=hdeg,
            mane_deg=-tdeg * 0.22, mane_wave_ph=f * 0.45, mane_wave_amp=5.0,
            l_coat_deg=lc_deg, r_coat_deg=rc_deg,
            coat_wave_ph=f * 0.45, coat_wave_amp=3.2 if f >= 14 else 4.5,
            coat_x_inward_frac=c_in,
            l_thigh_deg=l_th, l_shin_deg=l_sh, l_foot_deg=0.0,
            r_thigh_deg=r_th, r_shin_deg=r_sh, r_foot_deg=0.0,
            hip_inward_frac=h_in,
            grip_rel_sh=gr, weapon_deg=wdeg, blade_len=41.0,
            weapon_layer="front", weapon_abs_160=w_abs,
            scarf_deg=s_deg, scarf_len=s_len, scarf_phase=f * 0.65, scarf_amp=2.4,
            rune_phase=f * 0.7,
            lock_lowest_to_ground=True,
        ))
    return frames


def build_row6_dash(parts, sj):
    """Row 6: High-Speed Anime Sword-Drag Vanguard Sprint (30 Frames)."""
    frames = []
    for f in range(30):
        ph = (f / 10.0) * 2.0 * math.pi  # 3 rapid sprint cycles across 30 frames
        s1 = math.sin(ph)
        s2 = math.sin(ph + math.pi)

        def post_dash(arr, neck, _g, step=f):
            # Crisp horizontal speed-streaks + sword-tip floor sparks
            for k in range(3):
                sy = int(neck[1] + 6 + k * 14 + ((step * 3 + k * 5) % 5))
                sx0 = 8 + ((step * 7 + k * 11) % 16)
                for dx in range(10 + (k % 2) * 4):
                    put_px_160(arr, sx0 + dx, sy, C_CYAN_BRIGHT if dx > 6 else C_GOLD_MID)
            draw_ground_sparks_160(arr, impact_x=22.0 + (step % 4) * 2.0, ground_y=114.0, spread=10.0, progress=(step % 5) / 5.0, count=4)

        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=9.5 + math.sin(ph * 2.0) * 0.9,
            pelvis_dy=3.5 - abs(math.cos(ph)) * 2.8,
            torso_deg=22.0 + math.sin(ph * 2.0) * 1.8,
            head_deg=-12.0,
            mane_deg=-18.0 + s1 * 4.0,
            mane_wave_ph=ph,
            mane_wave_amp=12.0,
            l_coat_deg=24.0 + s1 * 8.0,
            r_coat_deg=16.0 + s2 * 6.0,
            coat_wave_ph=ph,
            coat_wave_amp=12.0,
            l_thigh_deg=-s1 * 32.0 - 6.0,
            l_shin_deg=max(0.0, -s1) * 34.0 + 10.0,
            l_foot_deg=s1 * 12.0,
            r_thigh_deg=-s2 * 32.0 - 6.0,
            r_shin_deg=max(0.0, -s2) * 34.0 + 10.0,
            r_foot_deg=s2 * 12.0,
            grip_rel_sh=(-4.5, 10.0),
            weapon_deg=156.0 + s1 * 2.5,
            blade_len=42.0,
            weapon_layer="behind",
            scarf_deg=177.0 + math.sin(ph) * 3.0,
            scarf_len=35.0,
            scarf_phase=(f / 30.0) * 6.0 * math.pi,
            scarf_amp=4.4,
            rune_phase=(f / 30.0) * 6.0 * math.pi,
            lock_lowest_to_ground=True,
            post_fn=post_dash,
        ))
    return frames


def build_row7_crouch(parts, sj, keyposes):
    """
    Row 7: CROUCH -- Braced 2H Runic Parry ([210, 10]) -> Explosive Smear Riposte!
    """
    frames = []
    # F00..F09: Braced low 2H Runic Guard
    for f in range(10):
        ph = (f / 10.0) * 2.0 * math.pi
        def post_guard(arr, _n, grip, step=f):
            if 3 <= step <= 8:
                draw_star_glint_160(arr, grip[0] + 6.0, grip[1] - 8.0, arm_len=4 + (step % 3))
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=2.0, pelvis_dy=9.5 + math.sin(ph) * 0.8,
            torso_deg=8.0 + math.sin(ph) * 1.2, head_deg=-6.0,
            mane_deg=-4.0, mane_wave_ph=ph, mane_wave_amp=6.5,
            l_coat_deg=8.0, r_coat_deg=4.0, coat_wave_ph=ph, coat_wave_amp=7.0,
            l_thigh_deg=-24.0, l_shin_deg=42.0, l_foot_deg=-14.0,
            r_thigh_deg=-28.0, r_shin_deg=46.0, r_foot_deg=-16.0,
            grip_rel_sh=(11.5, 2.0 + math.sin(ph) * 0.6),
            weapon_deg=-68.0 + math.sin(ph) * 2.0,
            blade_len=42.0, weapon_layer="front",
            scarf_deg=168.0 + math.sin(ph) * 4.0, scarf_len=30.0, scarf_phase=ph * 2.0, scarf_amp=3.2,
            rune_phase=f * 0.7, bend_l=1.0, bend_r=1.0,
            lock_lowest_to_ground=True, post_fn=post_guard,
        ))

    # F10..F12: Parry flash & low counter-coil
    for sub in range(3):
        def post_pflash(arr, _n, grip, s=sub):
            draw_star_glint_160(arr, grip[0] + 2.0, grip[1] - 4.0, arm_len=7 - s)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K1_COIL",
            pelvis_dx=-1.0 - sub * 1.5, pelvis_dy=2.0, body_tilt_deg=-3.0 - sub * 2.0,
            grip_rel_sh=(-4.0, -2.0), weapon_deg=-144.0 - sub * 5.0, blade_len=43.0,
            scarf_deg=160.0, scarf_len=31.0, scarf_phase=sub * 0.8, scarf_amp=3.8,
            rune_phase=sub * 0.9, bend_l=-1.0, bend_r=-1.0, post_fn=post_pflash,
        ))

    # F13..F22: 1-FRAME EXPLOSIVE COUNTER-SLASH + SERRATED SMEAR!
    for sub in range(10):
        def post_riposte(arr, _n, _g, s=sub):
            if s <= 3:
                tails = [34.0, -28.0, -76.0, -108.0]
                thicks = [28.0, 19.0, 12.0, 7.0]
                draw_ffbe_serrated_smear_160(
                    arr, cx=80.0, cy=61.0, tail_deg=tails[s], lead_deg=-124.0, sweep_dir=-1,
                    rx_outer=74.0 - s * 2.0, ry_outer=50.0, max_thickness=thicks[s],
                    n_teeth=7 - s, tooth_depth=10.0 - s * 1.8, phase=0.2 + s * 0.25,
                )
        pose_nm = "K2_LUNGE" if sub == 0 else "K3_RISE"
        wdeg = -118.0 if sub == 0 else (-126.0 + max(0, sub - 4) * 6.0)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, pose_nm,
            pelvis_dx=11.0 - max(0, sub - 5) * 1.0, pelvis_dy=0.5, body_tilt_deg=-3.0 + sub * 0.5,
            grip_rel_sh=(5.5, -10.0 + max(0, sub - 5) * 1.2), weapon_deg=wdeg, blade_len=44.0,
            scarf_deg=154.0 + sub * 3.0, scarf_len=33.0, scarf_phase=1.0 + sub * 0.7, scarf_amp=4.0,
            rune_phase=sub * 0.8, bend_l=-1.0, bend_r=-1.0, post_fn=post_riposte,
        ))

    # F23..F29: Return to braced 2H parry crouch
    for sub in range(7):
        u = (sub + 1) / 7.0
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=5.0 * (1.0 - u) + 2.0 * u,
            pelvis_dy=9.5 * u,
            torso_deg=8.0 * u, head_deg=-6.0 * u,
            mane_deg=-4.0, mane_wave_ph=sub * 0.6, mane_wave_amp=6.5,
            l_coat_deg=8.0, r_coat_deg=4.0, coat_wave_ph=sub * 0.6, coat_wave_amp=7.0,
            l_thigh_deg=-24.0 * u, l_shin_deg=42.0 * u, l_foot_deg=-14.0 * u,
            r_thigh_deg=-28.0 * u, r_shin_deg=46.0 * u, r_foot_deg=-16.0 * u,
            grip_rel_sh=(11.5, 2.5), weapon_deg=-68.0, blade_len=42.0,
            scarf_deg=170.0, scarf_len=30.0, scarf_phase=sub * 0.7, scarf_amp=3.2,
            rune_phase=sub * 0.7, lock_lowest_to_ground=True,
        ))

    assert len(frames) == 30
    return frames


def build_row8_jump(parts, sj, keyposes):
    """Row 8: JUMP -- Squat Launch -> Tucked Ascent -> Airborne Serrated Slash -> Landing (30 Frames)."""
    frames = []
    # F00..F03: Squat launch
    for f in range(4):
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=2.0, pelvis_dy=3.0 + f * 2.2,
            torso_deg=10.0 + f * 2.0, head_deg=-6.0,
            mane_deg=-6.0, mane_wave_ph=f * 0.6, mane_wave_amp=7.0,
            l_coat_deg=10.0, r_coat_deg=6.0, coat_wave_ph=f * 0.6, coat_wave_amp=7.5,
            l_thigh_deg=-20.0 - f * 4.0, l_shin_deg=36.0 + f * 6.0, l_foot_deg=-12.0,
            r_thigh_deg=-22.0 - f * 4.0, r_shin_deg=38.0 + f * 6.0, r_foot_deg=-12.0,
            grip_rel_sh=(-3.5, 8.0), weapon_deg=152.0, blade_len=42.0, weapon_layer="behind",
            scarf_deg=172.0, scarf_len=30.0, scarf_phase=f * 0.7, scarf_amp=3.2,
            rune_phase=f * 0.7, lock_lowest_to_ground=True,
        ))

    # F04..F12: Airborne ascent & apex coil (K4_LEAP)
    for sub in range(9):
        t = sub / 8.0
        pdy = -8.0 - math.sin(t * math.pi * 0.65) * 14.5
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K4_LEAP",
            pelvis_dx=4.0 + sub * 0.5, pelvis_dy=pdy, body_tilt_deg=-4.0 - sub * 0.6,
            grip_rel_sh=(-3.5, -7.0), weapon_deg=-146.0 - sub * 1.8, blade_len=41.0,
            scarf_deg=128.0 - sub * 1.5, scarf_len=34.0, scarf_phase=sub * 0.8, scarf_amp=4.2,
            rune_phase=sub * 0.8, bend_l=-1.0, bend_r=-1.0,
        ))

    # F13..F20: Airborne Helm-Breaker Snap Slash + Descent!
    for sub in range(8):
        pdy = -21.0 + sub * 2.5
        def post_air_slash(arr, _n, _g, s=sub):
            if s <= 3:
                tails = [-156.0, -68.0, -18.0, 8.0]
                thicks = [26.0, 17.0, 10.0, 6.0]
                draw_ffbe_serrated_smear_160(
                    arr, cx=78.0, cy=52.0 + s * 2.0, tail_deg=tails[s], lead_deg=30.0, sweep_dir=1,
                    rx_outer=72.0 - s * 2.0, ry_outer=48.0, max_thickness=thicks[s],
                    n_teeth=7 - s, tooth_depth=9.5 - s * 1.8, phase=0.15 + s * 0.25,
                )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K4_LEAP",
            pelvis_dx=8.5, pelvis_dy=pdy, body_tilt_deg=6.0,
            grip_rel_sh=(13.5, 4.0), weapon_deg=28.0 + min(3, sub) * 1.5, blade_len=45.0,
            scarf_deg=142.0 + sub * 5.0, scarf_len=34.0, scarf_phase=2.0 + sub * 0.8, scarf_amp=4.4,
            rune_phase=sub * 0.9, post_fn=post_air_slash,
        ))

    # F21..F29: Shock-absorbing landing & return to poised guard
    for sub in range(9):
        u = sub / 8.0
        comp = math.sin(min(1.0, u * 1.6) * math.pi) * 6.5 * (1.0 - 0.5 * u)
        def post_land(arr, _n, _g, s=sub):
            if s <= 2:
                draw_ground_sparks_160(arr, impact_x=64.0, ground_y=114.0, spread=18.0, progress=s / 3.0, count=5)
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=6.0 * (1.0 - u), pelvis_dy=comp,
            torso_deg=9.0 * (1.0 - u), head_deg=-5.0 * (1.0 - u),
            mane_deg=-4.0, mane_wave_ph=sub * 0.6, mane_wave_amp=7.5,
            l_coat_deg=8.0 * (1.0 - u) + 3.0, r_coat_deg=4.0 * (1.0 - u),
            coat_wave_ph=sub * 0.6, coat_wave_amp=8.0,
            l_thigh_deg=-18.0 * (1.0 - u), l_shin_deg=32.0 * (1.0 - u), l_foot_deg=-10.0 * (1.0 - u),
            r_thigh_deg=-20.0 * (1.0 - u), r_shin_deg=34.0 * (1.0 - u), r_foot_deg=-10.0 * (1.0 - u),
            grip_rel_sh=(11.0, 9.0), weapon_deg=29.0, blade_len=45.0,
            scarf_deg=168.0, scarf_len=31.0, scarf_phase=sub * 0.7, scarf_amp=3.4,
            rune_phase=sub * 0.7, lock_lowest_to_ground=True, post_fn=post_land,
        ))

    assert len(frames) == 30
    return frames


def build_row9_victory(parts, sj, keyposes):
    """
    Row 9: VICTORY -- Overhead Flourish -> Consecrated Ground Sword-Plant & Regal Cape/Scarf Loop!
    """
    frames = []
    # F00..F06: K3_RISE ceremonial overhead flourish arc
    for f in range(7):
        wdeg = -18.0 - f * 20.0  # Sweeps overhead to -138 deg
        def post_fl(arr, _n, _g, s=f):
            if 2 <= s <= 5:
                draw_ffbe_serrated_smear_160(
                    arr, cx=76.0, cy=58.0, tail_deg=wdeg + 48.0, lead_deg=wdeg, sweep_dir=-1,
                    rx_outer=66.0, ry_outer=46.0, max_thickness=12.0,
                    n_teeth=5, tooth_depth=5.5, phase=s * 0.3,
                )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=4.0 - f * 0.4, pelvis_dy=-f * 0.3, body_tilt_deg=-f * 0.6,
            grip_rel_sh=(10.0 - f * 0.8, 2.0 - f * 1.8), weapon_deg=wdeg, blade_len=44.0,
            scarf_deg=164.0 - f * 3.0, scarf_len=33.0, scarf_phase=f * 0.8, scarf_amp=3.8,
            rune_phase=f * 0.9, bend_l=-1.0, bend_r=-1.0, post_fn=post_fl,
        ))

    # F07..F12: Reverses Dawn-Breaker point-down (+90 deg) and drives tip into cathedral stone!
    for sub in range(6):
        u = (sub + 1) / 6.0
        plant_y = 54.0 + u * 15.0  # Grip lowers to y=69 -> tip (69 + 4.5 + 41 = 114.5) plants cleanly at floor!
        def post_plant(arr, _n, _g, s=sub):
            if s >= 4:
                draw_ground_sparks_160(arr, impact_x=73.0, ground_y=114.0, spread=20.0, progress=(s - 4) * 0.35 + 0.15, count=7)
                draw_star_glint_160(arr, 73.0, 62.0, arm_len=6)
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=1.5 * (1.0 - u), pelvis_dy=1.5 * math.sin(u * math.pi),
            torso_deg=3.0 * (1.0 - u), head_deg=-2.0,
            mane_deg=-3.0, mane_wave_ph=sub * 0.7, mane_wave_amp=7.5,
            l_coat_deg=5.0, r_coat_deg=-2.0, coat_wave_ph=sub * 0.7, coat_wave_amp=8.0,
            weapon_abs_160=(73.0, plant_y), weapon_deg=90.0, blade_len=41.0, weapon_layer="front",
            scarf_deg=162.0 + sub * 2.0, scarf_len=32.0, scarf_phase=sub * 0.8, scarf_amp=3.6,
            rune_phase=sub * 0.9, post_fn=post_plant,
        ))

    # F13..F29: Majestic Sovereign Salute Loop (17 frames, F18..F29 loops seamlessly in engine!)
    for sub in range(17):
        ph = (sub / 17.0) * 2.0 * math.pi
        def post_salute(arr, _n, _g, s=sub, p=ph):
            # Subtle rising golden-cyan starlight motes around planted Dawn-Breaker
            for m in range(3):
                mx = 68.0 + m * 5.0 + math.sin(p + m * 2.1) * 2.5
                my = 108.0 - ((s * 3 + m * 13) % 38)
                put_px_160(arr, mx, my, C_GOLD_LIT if (s + m) % 2 == 0 else C_CYAN_BRIGHT)

        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=0.0, pelvis_dy=math.sin(ph) * 0.8,
            torso_deg=-1.5 + math.sin(ph) * 1.0, head_deg=1.5,
            mane_deg=2.0 + math.sin(ph - 0.6) * 3.5, mane_wave_ph=ph, mane_wave_amp=9.0,
            l_coat_deg=6.0 + math.sin(ph - 0.5) * 5.0, r_coat_deg=-2.0 + math.cos(ph) * 3.5,
            coat_wave_ph=ph, coat_wave_amp=9.5,
            weapon_abs_160=(73.0, 69.0), weapon_deg=90.0, blade_len=41.0, weapon_layer="front",
            scarf_deg=166.0 + math.sin(ph - 0.4) * 5.0, scarf_len=34.0, scarf_phase=ph * 2.0, scarf_amp=4.2,
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
        for c_idx, fr160 in enumerate(row_frames):
            # Guarantee binary alpha (0 or 255) on 160x120 logical cell
            a = fr160[:, :, 3] > 128
            clean160 = np.zeros_like(fr160)
            clean160[a, :3] = fr160[a, :3]
            clean160[a, 3] = 255

            # Check 2px logical (4px output) border safety margin
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
                prev_a = row_frames[c_idx - 1]
                if not np.array_equal(clean160, prev_a):
                    trans += 1

            # 2x NEAREST upscale -> 320x240 integer 2x2 pixel blocks
            cell_im = Image.fromarray(clean160, "RGBA").resize((CELL_W, CELL_H), Image.Resampling.NEAREST)
            sheet.paste(cell_im, (c_idx * CELL_W, r_idx * CELL_H))

        row_transitions.append(trans)

    sheet.save(OUT_SHEET_PNG)
    print(f"[Sheet] Saved {OUT_SHEET_PNG} ({sheet.size[0]}x{sheet.size[1]})")
    print(f"[QA] Border clips (4px output safety margin): {clip_count}/300")
    if clip_details:
        print("  Clip details:", clip_details[:10])
    print(f"[QA] Row frame transitions: {row_transitions} (expected [29]*10)")
    print(f"[QA] Row 2 snap-frame front reach x_320 (must be > 200): {row2_snap_reaches_320}")

    assert sheet.size == (9600, 2400), f"Invalid sheet size: {sheet.size}"
    assert clip_count == 0, f"Border clips detected: {clip_details}"
    assert all(t == 29 for t in row_transitions), f"Static duplicate frames detected: {row_transitions}"
    for snap_f, max_x320 in row2_snap_reaches_320.items():
        assert max_x320 > 240, f"Row 2 F{snap_f:02d} smear reach too narrow: {max_x320}"

    # Quantitative Walk Crossover + Zero Flat-Cut + Death/Victory Audit on 320x240 output
    sh_arr = np.array(sheet)
    walk_spans = []
    walk_tops = []
    walk_bots = []
    for c in range(30):
        cell_a = sh_arr[240:480, c * 320:(c + 1) * 320, 3] > 0
        wy, wx = np.where(cell_a)
        walk_tops.append(int(wy.min()))
        walk_bots.append(int(wy.max()))
        band = cell_a[206:233, :]
        _, bx = np.where(band)
        walk_spans.append(int(bx.max() - bx.min()) if len(bx) else 0)
    max_foot_span = max(walk_spans)
    min_foot_span = min(walk_spans)
    max_adj_top = max(abs(walk_tops[(i + 1) % 30] - walk_tops[i]) for i in range(30))
    print(
        f"[QA] Row 1 WALK footSpan320: min={min_foot_span}px max={max_foot_span}px "
        f"ratio={min_foot_span / max(1, max_foot_span):.2f} "
        f"(F00={walk_spans[0]} F07={walk_spans[7]} F15={walk_spans[15]} F22={walk_spans[22]}) "
        f"bots=[{min(walk_bots)}..{max(walk_bots)}] maxAdjTopDelta={max_adj_top}"
    )
    assert max_foot_span >= 34, f"Walk contact stride too narrow: {max_foot_span}"
    assert min_foot_span <= max_foot_span * 0.55, f"Crab walk detected: min={min_foot_span} > 0.55*{max_foot_span}"
    assert min(walk_bots) >= 222 and max(walk_bots) <= 233, f"Walk footY out of [222..233]: {walk_bots}"
    assert max_adj_top <= 4, f"Walk head-top pop > 4px: {max_adj_top}"

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

    # 0. Full-size Row 1 WALK 30-frame showcase (6 cols x 5 rows @ 320x240 = 1920x1200)
    r1_cols, r1_rows = 6, 5
    r1_im = Image.new("RGBA", (r1_cols * CELL_W, r1_rows * CELL_H), (18, 22, 36, 255))
    r1_draw = ImageDraw.Draw(r1_im)
    for f in range(30):
        gc = f % r1_cols
        gr = f // r1_cols
        ox, oy = gc * CELL_W, gr * CELL_H
        cell = sheet.crop((f * CELL_W, 1 * CELL_H, (f + 1) * CELL_W, 2 * CELL_H))
        r1_draw.rectangle([ox, oy, ox + CELL_W - 1, oy + CELL_H - 1], outline=(46, 56, 84, 255), width=1)
        r1_draw.line([(ox + 8, oy + ANCHOR_Y_320), (ox + CELL_W - 8, oy + ANCHOR_Y_320)], fill=(58, 72, 108, 255), width=1)
        r1_draw.line([(ox + ANCHOR_X_320, oy + ANCHOR_Y_320 - 10), (ox + ANCHOR_X_320, oy + ANCHOR_Y_320 + 6)], fill=(240, 178, 54, 255), width=1)
        r1_im.alpha_composite(cell, (ox, oy))
        r1_draw.text((ox + 8, oy + 6), f"R1 F{f:02d} (#{30 + f})", fill=(220, 235, 255, 255))

    p_r1 = os.path.join(SCRATCH_DIR, "debug_warrior_ex_row1_walk.png")
    r1_im.save(p_r1)
    print(f"[Debug] Saved {p_r1}")

    # 1. Full-size Row 2 30-frame showcase (6 cols x 5 rows @ 320x240 = 1920x1200)
    r2_cols, r2_rows = 6, 5
    r2_im = Image.new("RGBA", (r2_cols * CELL_W, r2_rows * CELL_H), (18, 22, 36, 255))
    r2_draw = ImageDraw.Draw(r2_im)
    for f in range(30):
        gc = f % r2_cols
        gr = f // r2_cols
        ox, oy = gc * CELL_W, gr * CELL_H
        cell = sheet.crop((f * CELL_W, 2 * CELL_H, (f + 1) * CELL_W, 3 * CELL_H))
        # Subtle ground line + spine anchor tick before pasting character
        r2_draw.rectangle([ox, oy, ox + CELL_W - 1, oy + CELL_H - 1], outline=(46, 56, 84, 255), width=1)
        r2_draw.line([(ox + 8, oy + ANCHOR_Y_320), (ox + CELL_W - 8, oy + ANCHOR_Y_320)], fill=(58, 72, 108, 255), width=1)
        r2_draw.line([(ox + ANCHOR_X_320, oy + ANCHOR_Y_320 - 10), (ox + ANCHOR_X_320, oy + ANCHOR_Y_320 + 6)], fill=(240, 178, 54, 255), width=1)
        r2_im.alpha_composite(cell, (ox, oy))
        r2_draw.text((ox + 8, oy + 6), f"R2 F{f:02d} (#{60 + f})", fill=(220, 235, 255, 255))

    p_r2 = os.path.join(SCRATCH_DIR, "debug_warrior_ex_row2_30frames_full.png")
    r2_im.save(p_r2)

    # 2. All 10 Rows Left Half (F00..F14) & Right Half (F15..F29) at 160x120 logical scale
    for half_nm, c_start in (("left_F00_F14", 0), ("right_F15_F29", 15)):
        half_im = Image.new("RGBA", (15 * LOGICAL_W, ROWS * LOGICAL_H), (18, 22, 36, 255))
        hd = ImageDraw.Draw(half_im)
        for r in range(ROWS):
            for ci in range(15):
                c = c_start + ci
                ox, oy = ci * LOGICAL_W, r * LOGICAL_H
                cell320 = sheet.crop((c * CELL_W, r * CELL_H, (c + 1) * CELL_W, (r + 1) * CELL_H))
                cell160 = cell320.resize((LOGICAL_W, LOGICAL_H), Image.Resampling.NEAREST)
                hd.rectangle([ox, oy, ox + LOGICAL_W - 1, oy + LOGICAL_H - 1], outline=(42, 50, 76, 255), width=1)
                hd.line([(ox + 4, oy + ANCHOR_Y_120), (ox + LOGICAL_W - 4, oy + ANCHOR_Y_120)], fill=(52, 64, 96, 255), width=1)
                half_im.alpha_composite(cell160, (ox, oy))
                if ci == 0:
                    hd.text((ox + 4, oy + 3), f"R{r} F{c:02d}", fill=(252, 226, 104, 255))
        out_p = os.path.join(SCRATCH_DIR, f"debug_warrior_ex_10rows_{half_nm}.png")
        half_im.save(out_p)
        print(f"[Debug] Saved {out_p}")

    print(f"[Debug] Saved {p_r2}")


def main():
    t0 = time.time()
    print("=== Building AETHELGARD EX (warrior_ex) Next-Gen Wide-Canvas Assets ===")
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
