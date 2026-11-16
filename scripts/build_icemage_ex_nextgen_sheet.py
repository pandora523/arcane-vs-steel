#!/usr/bin/env python3
"""
Next-Gen Wide-Canvas Sprite Sheet, Portrait, & Visual QA Builder for:
  LYRA EX -- Borealis Sovereign & Skating Frost-Glaive Spell-Blade (icemage_ex)

Architecture (FFBE / Last Cloudia / Grand Summoners Paradigm):
  1. Wide Theatrical Cell Framing:
     - Logical canvas: 160x120 -> 2x NEAREST output: 320x240 per cell
     - Sheet layout: 30 cols x 10 rows = 9600x2400 RGBA PNG
     - Grounded skate/spine anchor: anchor_x_160 = 56 (anchorX = 112),
       anchor_y_120 = 115 (anchorY = 230)
     - Standing hero height: 87 logical px (174px in 320x240), 100% locked scale
       across all 300 frames (zero auto-fit shrinking on wide slashes or Axel leaps).
  2. Multi-Keypose 3D Body States + 15-Part Articulated Skating Rig:
     - Uses real 3D-foreshortened HD-2D keyposes (K1_COIL, K2_LUNGE, K3_RISE,
       K4_LEAP from icemage_ex_keyposes_ref.jpg) + 15-part articulated STAND rig
       (from icemage_ex_base.jpg) with 2-Bone Analytical IK silver vambraces
       clasped on the 2H Borealis Prism Frost-Glaive / Scepter (108-114px reach).
     - Floating Borealis Snowflake Crown Halo + frame-delayed Aurora Silk Ribbons.
  3. 1-Frame Explosive Snap + 4-Band Crystalline Cryo-Crescent & Pirouette Smears:
     - Stepped cel ramp: #ffffff -> #cffafe -> #38bdf8 -> #a855f7 / #1e3a8a
       crystalline ice-shard sawtooth rips + ordered 4x4 Bayer diamond-dust tail.
     - Zero Unicode emojis anywhere; 100% 2x2 integer pixel blocks, binary alpha.
"""

import os
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

BASE_JPG = os.path.join(SPRITES_DIR, "icemage_ex_base.jpg")
KEYPOSES_JPG = os.path.join(SPRITES_DIR, "icemage_ex_keyposes_ref.jpg")
PORTRAIT_RAW_JPG = os.path.join(SPRITES_DIR, "icemage_ex_portrait_raw.jpg")

OUT_SHEET_PNG = os.path.join(SPRITES_DIR, "icemage_ex_sheet.png")
OUT_PORTRAIT_PNG = os.path.join(SPRITES_DIR, "icemage_ex_portrait.png")

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

# Constant locked character scale: 445px in 512-space == 87 logical px (174px output)
STAND_H_512 = 445.0
TARGET_STAND_H_LOGICAL = 87.0
S_HI = STAND_H_512 / TARGET_STAND_H_LOGICAL  # 5.1149425 px per logical pixel
HI_W = int(round(LOGICAL_W * S_HI))          # 818
HI_H = int(round(LOGICAL_H * S_HI))          # 614
ANCHOR_HI_X = ANCHOR_X_160 * S_HI
ANCHOR_HI_Y = ANCHOR_Y_120 * S_HI

# 26-Color Borealis Sovereign Master Palette
MASTER_PALETTE_ICE_EX = np.array([
    [10, 14, 30],     # 0: Deep abyssal ice shadow Selout (#0a0e1e)
    [20, 30, 58],     # 1: Lit royal-navy Selout (#141e3a)
    [38, 54, 92],     # 2: Soft slate hair/fur Selout (#26365c)
    [60, 76, 118],    # 3: Dark silver-slate greave/undersuit (#3c4c76)
    [106, 128, 168],  # 4: Cool steel-ice shadow (#6a80a8)
    [156, 180, 214],  # 5: Silver-frost midtone (#9cb4d6)
    [208, 228, 248],  # 6: Bright silver-ice hair & fur (#d0e4f8)
    [244, 250, 255],  # 7: Pure snow-white fur & crown highlight (#f4faff)
    [16, 36, 98],     # 8: Royal sapphire coat deep shadow (#102462)
    [28, 62, 152],    # 9: Royal sapphire coat midtone (#1c3e98)
    [52, 106, 214],   # 10: Bright royal sapphire highlight (#346ad6)
    [14, 98, 134],    # 11: Borealis teal coat-lining shadow (#0e6286)
    [32, 168, 204],   # 12: Borealis teal coat-lining mid (#20a8cc)
    [88, 224, 244],   # 13: Luminous cryo-aqua trim (#58e0f4)
    [30, 58, 138],    # 14: Permafrost deep sapphire (#1e3a8a)
    [56, 189, 248],   # 15: Blazing sky cryo-blue (#38bdf8)
    [165, 243, 252],  # 16: Pale diamond-ice cyan (#a5f3fc)
    [207, 250, 254],  # 17: Frosted diamond-cyan crest (#cffafe)
    [255, 255, 255],  # 18: Pure diamond specular (#ffffff)
    [88, 28, 135],    # 19: Deep aurora-amethyst shadow (#581c87)
    [168, 85, 247],   # 20: Borealis aurora-violet (#a855f7)
    [232, 121, 249],  # 21: Luminous aurora-orchid (#e879f9)
    [250, 232, 255],  # 22: Pale prism-lilac glint (#fae8ff)
    [176, 112, 86],   # 23: Porcelain skin shadow (#b07056)
    [230, 168, 136],  # 24: Porcelain skin midtone (#e6a888)
    [252, 218, 194],  # 25: Porcelain skin highlight (#fcdac2)
], dtype=np.int32)

# RGBA tuples for crisp 160x120 pixel-art Frost-Glaive, Crown Halo, Ribbons, & Smears
C_OUT_DARK = (10, 14, 30, 255)
C_OUT_LIT = (20, 30, 58, 255)
C_SLATE = (38, 54, 92, 255)
C_SILVER_SHAD = (106, 128, 168, 255)
C_SILVER_MID = (156, 180, 214, 255)
C_SILVER_LIT = (208, 228, 248, 255)
C_SNOW_WHITE = (244, 250, 255, 255)
C_PURE_WHITE = (255, 255, 255, 255)

C_SAPPH_DEEP = (16, 36, 98, 255)
C_SAPPH_MID = (28, 62, 152, 255)
C_SAPPH_LIT = (52, 106, 214, 255)
C_NAVY_RIP = (30, 58, 138, 255)

C_CRYO_TEAL = (32, 168, 204, 255)
C_CRYO_SKY = (56, 189, 248, 255)
C_CRYO_AQUA = (165, 243, 252, 255)
C_CRYO_PALE = (207, 250, 254, 255)

C_AURORA_DEEP = (88, 28, 135, 255)
C_AURORA_VIOLET = (168, 85, 247, 255)
C_AURORA_ORCHID = (232, 121, 249, 255)
C_AURORA_PALE = (250, 232, 255, 255)

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
    return mask.copy()


def fill_interior_pinholes_rgba(arr, max_hole_px=16):
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


def clean_pose_512(im_rgba_512, pocket_seeds=(), strip_polys=(), paint_sapphire_polys=(), head_y_split=156):
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
            if px[3] > 0 and px[0] > 212 and px[1] > 212 and px[2] > 212:
                ImageDraw.floodfill(im, (sx, sy), (0, 0, 0, 0), thresh=38)

    arr = np.array(im)
    for poly in strip_polys:
        arr[poly_mask(H, W, poly)] = [0, 0, 0, 0]

    # Repaint any tucked-hand flesh patch on royal-sapphire bodice cleanly
    for poly in paint_sapphire_polys:
        pm = poly_mask(H, W, poly) & (arr[:, :, 3] > 128)
        r = arr[:, :, 0].astype(np.int16)
        b = arr[:, :, 2].astype(np.int16)
        flesh_px = pm & (r > b)
        arr[flesh_px] = [28, 62, 152, 255]

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
        fringe = edge & (r > 184) & (g > 184) & (b > 184) & (np.abs(r - g) < 26) & (np.abs(g - b) < 26)
        arr[fringe] = [0, 0, 0, 0]

    alpha = keep_largest_component(arr[:, :, 3] > 0)
    arr[~alpha] = [0, 0, 0, 0]

    rgb_im = Image.fromarray(arr[:, :, :3], "RGB")
    med3 = np.array(rgb_im.filter(ImageFilter.MedianFilter(size=3)))
    med5 = np.array(rgb_im.filter(ImageFilter.MedianFilter(size=5)))
    yy = np.arange(H)[:, None]
    cel_rgb = np.where(yy[:, :, None] < head_y_split, med3, med5)

    r0 = arr[:, :, 0].astype(np.int16)
    g0 = arr[:, :, 1].astype(np.int16)
    b0 = arr[:, :, 2].astype(np.int16)
    vivid_gem = alpha & (((b0 - r0) > 45) & (g0 > 150) | ((r0 > 140) & (b0 > 180) & (r0 - g0 > 35)))
    arr[:, :, :3] = np.where(alpha[:, :, None], np.where(vivid_gem[:, :, None], arr[:, :, :3], cel_rgb), 0)
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

    return fill_interior_pinholes_rgba(out, max_hole_px=14)


def quantize_and_cluster_160x120(
    arr160,
    palette=MASTER_PALETTE_ICE_EX,
    protect_indices=(15, 16, 17, 20, 21, 23, 24, 25),
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
    is_hair = np.isin(idx_map, hair_indices) & (yy < 66)
    shadow_side = (~dn_a) | (~rt_a)

    body_edge = edge & (~is_hair)
    hair_edge = edge & is_hair

    idx_map[body_edge & (~shadow_side)] = 1  # #141e3a lit royal-navy Selout
    idx_map[body_edge & shadow_side] = 0     # #0a0e1e deep abyssal Selout
    idx_map[hair_edge & (~shadow_side)] = 1
    idx_map[hair_edge & shadow_side] = 2     # #26365c soft slate Selout

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
    face_focus = (xx >= 220) & (xx <= 880) & (yy >= 120) & (yy <= 920)
    blended = np.where(face_focus[:, :, None], med3, med5)

    im256 = Image.fromarray(blended, "RGB").resize((256, 256), Image.Resampling.BOX)
    im256 = im256.filter(ImageFilter.MedianFilter(size=3))
    im128 = im256.resize((128, 128), Image.Resampling.NEAREST)
    src128 = np.array(im128)

    q128 = im128.quantize(colors=28, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert("RGB")
    out128 = np.array(q128)

    # Restore crisp warm 4-step porcelain skin ramp on face & hand (prevents FASTOCTREE merging cheeks with white fur!)
    r = src128[:, :, 0].astype(np.int16)
    g = src128[:, :, 1].astype(np.int16)
    b = src128[:, :, 2].astype(np.int16)
    lum = (r * 2 + g * 5 + b * 3) // 10
    skin_mask = ((r - b) >= 15) & ((r - g) >= 8) & (r >= 155) & (g >= 105)
    out128[skin_mask & (lum >= 224)] = [253, 228, 210]
    out128[skin_mask & (lum >= 196) & (lum < 224)] = [247, 204, 178]
    out128[skin_mask & (lum >= 162) & (lum < 196)] = [228, 168, 138]
    out128[skin_mask & (lum < 162)] = [184, 118, 92]

    # Restore crisp Borealis cyan & aurora-violet facets on eyes, tiara, and Frost-Glaive spearhead
    cyan_mask = ((b - r) > 42) & (g > 150)
    out128[cyan_mask & (lum >= 224)] = [255, 255, 255]
    out128[cyan_mask & (lum >= 180) & (lum < 224)] = [165, 243, 252]
    out128[cyan_mask & (lum < 180)] = [56, 189, 248]

    aurora_mask = (r > 155) & (b > 205) & ((r - g) > 28)
    out128[aurora_mask & (lum >= 210)] = [250, 232, 255]
    out128[aurora_mask & (lum < 210)] = [232, 121, 249]

    rgba128 = np.zeros((128, 128, 4), dtype=np.uint8)
    rgba128[:, :, :3] = out128
    rgba128[:, :, 3] = 255
    out_im = Image.fromarray(rgba128, "RGBA")
    out_im.save(OUT_PORTRAIT_PNG)

    os.makedirs(SCRATCH_DIR, exist_ok=True)
    preview = out_im.resize((384, 384), Image.Resampling.NEAREST)
    preview.save(os.path.join(SCRATCH_DIR, "debug_icemage_ex_portrait.png"))
    print(f"[Portrait] Saved {OUT_PORTRAIT_PNG} (128x128)")


# ==============================================================================
# 3. SEGMENTATION OF STAND (15 PARTS) + 4 REAL 3D SKATING KEYPOSES
# ==============================================================================

def assign_remaining_geodesic(alpha, mask_list):
    H, W = alpha.shape
    labels = np.zeros((H, W), dtype=np.int16)
    names = [nm for nm, _ in mask_list]
    for idx, (nm, m) in enumerate(mask_list, start=1):
        mc = m if nm in ("mane", "l_coat", "r_coat") else keep_largest_component(m)
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


def darken_part_tuple(part_tuple, factor=0.86):
    im, x0, y0 = part_tuple
    arr = np.array(im, dtype=np.float32)
    a = arr[:, :, 3] > 128
    arr[a, :3] = np.clip(arr[a, :3] * factor, 0, 255)
    return (Image.fromarray(arr.astype(np.uint8), "RGBA"), x0, y0)


def load_rig_and_keyposes():
    base_512_raw = Image.open(BASE_JPG).convert("RGBA").resize((512, 512), Image.Resampling.NEAREST)
    stand_arr = clean_pose_512(
        base_512_raw,
        pocket_seeds=[(204, 198), (344, 466), (166, 470)],
        strip_polys=[],
        paint_sapphire_polys=[[(212, 194), (248, 194), (248, 222), (212, 222)]],
        head_y_split=154,
    )
    alpha = stand_arr[:, :, 3] > 128
    H, W = alpha.shape

    raw_masks = [
        ("head", poly_mask(H, W, [(216, 36), (318, 36), (318, 152), (288, 154), (240, 148), (214, 98)])),
        ("mane", poly_mask(H, W, [(136, 56), (220, 56), (238, 134), (206, 134), (164, 196), (136, 196)])),
        ("l_sode", poly_mask(H, W, [(168, 130), (244, 134), (240, 188), (168, 188)])),
        ("l_forearm", poly_mask(H, W, [(170, 186), (214, 186), (214, 224), (170, 224)])),
        ("r_sode", poly_mask(H, W, [(286, 132), (336, 136), (338, 196), (288, 196)])),
        ("r_forearm", poly_mask(H, W, [(322, 146), (404, 146), (404, 208), (322, 208)])),
        ("torso", poly_mask(H, W, [(214, 146), (298, 148), (308, 258), (292, 286), (222, 286), (214, 220)])),
        ("l_coat", poly_mask(H, W, [(106, 228), (234, 228), (254, 282), (254, 398), (174, 412), (106, 424)])),
        ("r_coat", poly_mask(H, W, [(284, 228), (386, 228), (386, 428), (336, 428), (254, 398), (254, 282)])),
        ("l_thigh", poly_mask(H, W, [(190, 272), (254, 276), (238, 356), (178, 356)])),
        ("l_shin", poly_mask(H, W, [(162, 344), (222, 344), (196, 434), (154, 434)])),
        ("l_foot", poly_mask(H, W, [(146, 424), (194, 424), (194, 492), (146, 492)])),
        ("r_thigh", poly_mask(H, W, [(256, 272), (316, 272), (336, 354), (274, 354)])),
        ("r_shin", poly_mask(H, W, [(286, 342), (344, 342), (350, 428), (294, 428)])),
        ("r_foot", poly_mask(H, W, [(298, 418), (384, 418), (384, 482), (298, 482)])),
    ]
    assigned = assign_remaining_geodesic(alpha, raw_masks)
    parts = {nm: extract_crop_tuple(stand_arr, m) for nm, m in assigned}

    # Use clean unoccluded extended silver vambrace/sleeve for both IK arms (rear slightly shaded for depth!)
    parts["l_sode_ik"] = darken_part_tuple(parts["r_sode"], 0.86)
    parts["l_forearm_ik"] = darken_part_tuple(parts["r_forearm"], 0.86)

    stand_joints = {
        "x_ref": 262.0,
        "y_bot": 486.0,
        "pelvis": (262.0, 266.0),
        "neck": (266.0, 146.0),
        "mane": (222.0, 108.0),
        "l_coat": (236.0, 252.0),
        "r_coat": (292.0, 252.0),
        "l_sh": (222.0, 156.0),
        "r_sh": (296.0, 156.0),
        "r_el": (326.0, 190.0),
        "r_grip": (384.0, 168.0),
        "l_hip": (228.0, 286.0),
        "l_knee": (200.0, 350.0),
        "l_ankle": (172.0, 430.0),
        "r_hip": (284.0, 286.0),
        "r_knee": (314.0, 348.0),
        "r_ankle": (322.0, 424.0),
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
            "pocket_seeds": [(232, 186), (222, 466), (314, 444)],
            "strip_polys": [
                [(172, 158), (242, 158), (242, 214), (172, 214)],
            ],
            "paint_sapphire_polys": [
                [(240, 152), (272, 152), (272, 186), (240, 186)],
            ],
            "head_y_split": 156,
            "x_ref": 264.0,
            "y_bot": 482.0,
            "l_sh": (236.0, 160.0),
            "r_sh": (306.0, 174.0),
            "neck": (276.0, 148.0),
            "pelvis": (268.0, 256.0),
        },
        "K2_LUNGE": {
            "pocket_seeds": [(348, 456), (22, 442)],
            "strip_polys": [
                [(114, 218), (254, 226), (252, 282), (114, 282)],
            ],
            "paint_sapphire_polys": [],
            "head_y_split": 228,
            "x_ref": 274.0,
            "y_bot": 463.0,
            "l_sh": (262.0, 236.0),
            "r_sh": (334.0, 248.0),
            "neck": (326.0, 226.0),
            "pelvis": (268.0, 308.0),
        },
        "K3_RISE": {
            "pocket_seeds": [(360, 470), (124, 470)],
            "strip_polys": [
                [(92, 156), (224, 160), (222, 232), (92, 232)],
                [(308, 0), (430, 0), (430, 146), (312, 146), (304, 128)],
            ],
            "paint_sapphire_polys": [],
            "head_y_split": 150,
            "x_ref": 264.0,
            "y_bot": 480.0,
            "l_sh": (222.0, 156.0),
            "r_sh": (302.0, 142.0),
            "neck": (272.0, 138.0),
            "pelvis": (266.0, 258.0),
        },
        "K4_LEAP": {
            "pocket_seeds": [(256, 372)],
            "strip_polys": [
                [(178, 152), (242, 156), (240, 194), (178, 194)],
                [(306, 156), (362, 156), (362, 214), (306, 214)],
            ],
            "paint_sapphire_polys": [
                [(238, 164), (264, 164), (264, 196), (238, 196)],
            ],
            "head_y_split": 152,
            "x_ref": 266.0,
            "y_bot": 386.0,
            "l_sh": (224.0, 152.0),
            "r_sh": (304.0, 158.0),
            "neck": (276.0, 138.0),
            "pelvis": (264.0, 226.0),
        },
    }

    keyposes = {}
    for kname, spec in keypose_specs.items():
        cleaned = clean_pose_512(
            tiles_raw[kname],
            pocket_seeds=spec["pocket_seeds"],
            strip_polys=spec["strip_polys"],
            paint_sapphire_polys=spec["paint_sapphire_polys"],
            head_y_split=spec["head_y_split"],
        )
        m = cleaned[:, :, 3] > 128
        entry = dict(spec)
        entry["crop"] = extract_crop_tuple(cleaned, m)
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


def draw_joint_bridge_hi(canvas, p0, p1, r, fill=(28, 62, 152, 255), inner=(156, 180, 214, 255)):
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
    sode_nm = "l_sode_ik" if side == "l" else "r_sode"
    fore_nm = "l_forearm_ik" if side == "l" else "r_forearm"
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

    draw_joint_bridge_hi(canvas, sh_dst, el_dst, r=4)
    draw_joint_bridge_hi(canvas, el_dst, hand_dst, r=3)
    paste_rotated_part(canvas, parts[sode_nm], sh_src, sh_dst, deg=(ang1_cur - ang1_rest))
    paste_rotated_part(canvas, parts[fore_nm], el_src, el_dst, deg=(ang2_cur - ang2_rest))
    return hand_dst


# ==============================================================================
# 5. LOGICAL 160x120 PIXEL-ART RENDERERS:
#    - FLOATING BOREALIS SNOWFLAKE CROWN HALO
#    - TWIN AURORA SILK RIBBONS
#    - 2H BOREALIS PRISM FROST-GLAIVE / SCEPTER (108-114px REACH)
#    - 4-BAND CRYSTALLINE CRYO-CRESCENT & PIROUETTE VORTEX SMEARS
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


def draw_star_glint_160(arr, cx, cy, arm_len=6, core_r=1.8):
    ix, iy = int(round(cx)), int(round(cy))
    for d in range(-arm_len, arm_len + 1):
        col = C_PURE_WHITE if abs(d) <= 2 else (C_CRYO_SKY if abs(d) <= arm_len - 2 else C_AURORA_ORCHID)
        put_px_160(arr, ix + d, iy, col)
        put_px_160(arr, ix, iy + d, col)
    diag = max(1, arm_len // 2)
    for d in range(-diag, diag + 1):
        put_px_160(arr, ix + d, iy + d, C_CRYO_AQUA)
        put_px_160(arr, ix + d, iy - d, C_CRYO_AQUA)
    draw_disc_160(arr, ix, iy, core_r, C_PURE_WHITE)


def draw_borealis_crown_halo_160(arr, neck_x, neck_y, phase=0.0, scale=1.0):
    """
    Renders Lyra EX's signature floating 6-point Borealis Snowflake Crown Halo
    hovering gently behind her head/shoulders with crystalline diamond tips.
    """
    cx = neck_x - 3.5
    cy = max(14.0, neck_y - 12.5 + math.sin(phase) * 0.9)
    r_ring = 9.5 * scale
    # Subtle crystalline ring
    for i in range(24):
        ang = (i / 24.0) * 2.0 * math.pi + phase * 0.25
        rx = cx + math.cos(ang) * r_ring
        ry = cy + math.sin(ang) * (r_ring * 0.82)
        if i % 2 == 0:
            put_px_160(arr, rx, ry, C_CRYO_SKY if i % 4 == 0 else C_AURORA_VIOLET)

    # 6 Snowflake Crystal Spokes
    for k in range(6):
        ang = (k / 6.0) * 2.0 * math.pi + phase * 0.25
        ux, uy = math.cos(ang), math.sin(ang) * 0.85
        tip_r = (13.2 if k % 2 == 0 else 10.8) * scale
        tx = cx + ux * tip_r
        ty = cy + uy * tip_r
        put_px_160(arr, tx + ux * 0.9, ty + uy * 0.9, C_OUT_LIT)
        put_px_160(arr, tx, ty, C_PURE_WHITE if k % 2 == 0 else C_AURORA_ORCHID)
        put_px_160(arr, cx + ux * (tip_r - 1.6), cy + uy * (tip_r - 1.6), C_CRYO_AQUA)


def draw_aurora_veil_ribbons_160(
    arr,
    neck_x,
    neck_y,
    base_deg=168.0,
    length=28.0,
    wave_phase=0.0,
    wave_amp=3.2,
    spread_deg=12.0,
):
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

        for px, py, t in pts:
            half_w = 1.9 * (1.0 - 0.55 * t) if idx == 0 else 1.5 * (1.0 - 0.55 * t)
            for k in (-half_w - 0.8, half_w + 0.8):
                put_px_160(arr, px + nx * k, py + ny * k, C_OUT_DARK)
        put_px_160(arr, pts[-1][0] + ux, pts[-1][1] + uy, C_OUT_DARK)

        for px, py, t in pts:
            half_w = 1.7 * (1.0 - 0.55 * t) if idx == 0 else 1.35 * (1.0 - 0.55 * t)
            is_aurora_tip = t > 0.68
            for k_step in range(-3, 4):
                k = k_step * 0.52
                if abs(k) <= half_w:
                    if is_aurora_tip:
                        col = C_AURORA_ORCHID if k < 0 else C_AURORA_VIOLET
                    else:
                        col = C_CRYO_AQUA if k < -0.2 else (C_CRYO_SKY if k < 0.55 else C_SAPPH_MID)
                    put_px_160(arr, px + nx * k, py + ny * k, col)


def draw_borealis_frost_glaive_160(
    arr,
    grip_x,
    grip_y,
    deg,
    glaive_len=50.0,
    rune_phase=0.0,
    draw_gauntlets=True,
):
    """
    Draws Lyra EX's Ornate Borealis Diamond-Snowflake Scepter:
      - Spiraled royal-sapphire & silver-frost long scepter staff
      - Swept Aurora-Orchid & Cryo-Cyan filigree cradle wings
      - Radiant 6-Point Crystalline Diamond-Snowflake Finial with pulsing Aurora Prism Heart
        (replaces the old melee glaive spearhead 100%!)
    """
    rad = math.radians(deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = uy, -ux

    butt_dist = -11.5
    fwd_reach = min(38.5, glaive_len - abs(butt_dist))
    finial_r = 6.6

    # Safety clamp so the 6-Point Diamond-Snowflake Finial + pommel never touch the 2px logical border margin
    max_fwd = fwd_reach
    for test_fwd in range(int(fwd_reach), 14, -1):
        fx = grip_x + ux * test_fwd
        fy = grip_y + uy * test_fwd
        bx = grip_x + ux * (butt_dist - 2.2)
        by = grip_y + uy * (butt_dist - 2.2)
        if (
            (MARGIN_LOGICAL + finial_r + 1.5) <= fx <= (LOGICAL_W - MARGIN_LOGICAL - finial_r - 2.0)
            and (MARGIN_LOGICAL + finial_r + 1.5) <= fy <= (LOGICAL_H - MARGIN_LOGICAL - finial_r - 2.0)
            and (MARGIN_LOGICAL + 2.0) <= bx <= (LOGICAL_W - MARGIN_LOGICAL - 2.5)
            and (MARGIN_LOGICAL + 2.0) <= by <= (LOGICAL_H - MARGIN_LOGICAL - 2.5)
        ):
            max_fwd = float(test_fwd)
            break

    collar_dist = max_fwd * 0.72
    finial_cx = grip_x + ux * max_fwd
    finial_cy = grip_y + uy * max_fwd

    # --- Pass 1: Spiraled Sapphire-Silver Scepter Shaft (1px Selout -> Core) ---
    steps = int((collar_dist - butt_dist) * 3.0) + 1
    for i in range(steps + 1):
        d = butt_dist + (collar_dist - butt_dist) * (i / max(1, steps))
        cx = grip_x + ux * d
        cy = grip_y + uy * d
        put_px_160(arr, cx + nx * 1.95, cy + ny * 1.95, C_OUT_LIT)
        put_px_160(arr, cx - nx * 1.95, cy - ny * 1.95, C_OUT_DARK)

    put_px_160(arr, grip_x + ux * (butt_dist - 2.0), grip_y + uy * (butt_dist - 2.0), C_OUT_DARK)

    for i in range(steps + 1):
        d = butt_dist + (collar_dist - butt_dist) * (i / max(1, steps))
        cx = grip_x + ux * d
        cy = grip_y + uy * d
        spiral = int(abs((d - butt_dist) * 1.45)) % 4
        for k in (-0.85, -0.25, 0.25, 0.85):
            if spiral == 0:
                col = C_SILVER_LIT if k > 0 else C_SILVER_MID
            elif spiral == 2:
                col = C_CRYO_AQUA if k > 0 else C_CRYO_TEAL
            else:
                col = C_SAPPH_LIT if k > 0 else C_SAPPH_DEEP
            put_px_160(arr, cx + nx * k, cy + ny * k, col)

    # --- Pass 2: Swept Aurora-Orchid & Cryo-Cyan Cradle Wings ---
    gx = grip_x + ux * collar_dist
    gy = grip_y + uy * collar_dist
    wing_span = 5.8
    for s_sign in (-1.0, 1.0):
        for w_step in range(0, 13):
            wt = w_step / 12.0
            lat = s_sign * (1.2 + wt * wing_span)
            fwd = (wt ** 1.3) * 4.2 - 0.6
            wx = gx + nx * lat + ux * fwd
            wy = gy + ny * lat + uy * fwd
            put_px_160(arr, wx - ux * 1.0, wy - uy * 1.0, C_OUT_DARK)
            put_px_160(arr, wx + ux * 1.0, wy + uy * 1.0, C_OUT_LIT)
            put_px_160(arr, wx, wy, C_PURE_WHITE if wt > 0.74 else (C_CRYO_AQUA if s_sign > 0 else C_AURORA_ORCHID))

    # --- Pass 3: Ornate 6-Point Diamond-Snowflake Finial (Selout Pass -> Crystal Pass) ---
    ring_r = 3.8
    # Selout silhouette around ring + 6 snowflake crystal arms
    for i in range(24):
        ra = (i / 24.0) * 2.0 * math.pi + rune_phase * 0.2
        rx = finial_cx + math.cos(ra) * ring_r
        ry = finial_cy + math.sin(ra) * ring_r
        for oy in (-1, 0, 1):
            for ox in (-1, 0, 1):
                put_px_160(arr, rx + ox, ry + oy, C_OUT_DARK)

    for k in range(6):
        sa = rad + (k / 6.0) * 2.0 * math.pi
        sux, suy = math.cos(sa), math.sin(sa)
        snx, sny = -suy, sux
        arm_l = finial_r if k % 2 == 0 else (finial_r - 1.1)
        for step_r in range(0, int(arm_l * 2.2) + 1):
            rr = step_r / 2.2
            px = finial_cx + sux * rr
            py = finial_cy + suy * rr
            for oy in (-1, 0, 1):
                for ox in (-1, 0, 1):
                    put_px_160(arr, px + ox, py + oy, C_OUT_DARK if oy >= 0 else C_OUT_LIT)
        # Side barbs Selout
        bx = finial_cx + sux * 3.6
        by = finial_cy + suy * 3.6
        for b_sign in (-1.0, 1.0):
            tx = bx + (sux * 0.65 + snx * b_sign * 0.75) * 2.2
            ty = by + (suy * 0.65 + sny * b_sign * 0.75) * 2.2
            for oy in (-1, 0, 1):
                for ox in (-1, 0, 1):
                    put_px_160(arr, tx + ox, ty + oy, C_OUT_DARK)

    # Crystalline halo ring
    for i in range(24):
        ra = (i / 24.0) * 2.0 * math.pi + rune_phase * 0.2
        rx = finial_cx + math.cos(ra) * ring_r
        ry = finial_cy + math.sin(ra) * ring_r
        put_px_160(arr, rx, ry, C_CRYO_SKY if i % 2 == 0 else C_AURORA_VIOLET)

    # 6 Faceted Diamond-Snowflake Spokes + V-barbs
    for k in range(6):
        sa = rad + (k / 6.0) * 2.0 * math.pi
        sux, suy = math.cos(sa), math.sin(sa)
        snx, sny = -suy, sux
        arm_l = finial_r if k % 2 == 0 else (finial_r - 1.1)
        for step_r in range(1, int(arm_l * 2.2) + 1):
            rr = step_r / 2.2
            px = finial_cx + sux * rr
            py = finial_cy + suy * rr
            if rr > arm_l - 1.3:
                col = C_PURE_WHITE
            elif k % 2 == 0:
                col = C_CRYO_PALE if rr < 3.5 else C_CRYO_AQUA
            else:
                col = C_AURORA_PALE if rr < 3.2 else C_AURORA_ORCHID
            put_px_160(arr, px, py, col)
        bx = finial_cx + sux * 3.6
        by = finial_cy + suy * 3.6
        for b_sign in (-1.0, 1.0):
            tx = bx + (sux * 0.65 + snx * b_sign * 0.75) * 2.0
            ty = by + (suy * 0.65 + sny * b_sign * 0.75) * 2.0
            put_px_160(arr, tx, ty, C_CRYO_PALE if k % 2 == 0 else C_AURORA_ORCHID)

    # Pulsing Aurora Diamond Heart + Collar Gem + Rear Snowflake Pommel
    pulse = 0.5 + 0.5 * math.sin(rune_phase)
    draw_disc_160(arr, finial_cx, finial_cy, 2.1, C_AURORA_ORCHID if pulse > 0.5 else C_CRYO_SKY)
    draw_disc_160(arr, finial_cx, finial_cy, 1.2, C_PURE_WHITE)

    draw_disc_160(arr, gx, gy, 1.9, C_AURORA_VIOLET)
    put_px_160(arr, gx, gy, C_PURE_WHITE)

    px_butt = grip_x + ux * butt_dist
    py_butt = grip_y + uy * butt_dist
    draw_disc_160(arr, px_butt, py_butt, 2.1, C_OUT_DARK)
    draw_disc_160(arr, px_butt, py_butt, 1.3, C_CRYO_SKY)
    put_px_160(arr, px_butt, py_butt, C_PURE_WHITE)

    if draw_gauntlets:
        for gd in (-4.0, 2.2):
            hx = grip_x + ux * gd
            hy = grip_y + uy * gd
            draw_disc_160(arr, hx, hy, 2.1, C_OUT_DARK)
            draw_disc_160(arr, hx, hy, 1.3, C_SILVER_LIT)
            put_px_160(arr, hx + nx * 0.6, hy + ny * 0.6, C_CRYO_AQUA)


def draw_pixel_line_160(arr, x0, y0, x1, y1, col, rad=0):
    dx = x1 - x0
    dy = y1 - y0
    steps = max(1, int(math.ceil(max(abs(dx), abs(dy)) * 1.8)))
    for i in range(steps + 1):
        t = i / steps
        px = int(round(x0 + dx * t))
        py = int(round(y0 + dy * t))
        if rad <= 0:
            put_px_160(arr, px, py, col, margin=MARGIN_LOGICAL + 1)
        else:
            for oy in range(-rad, rad + 1):
                for ox in range(-rad, rad + 1):
                    if ox * ox + oy * oy <= rad * rad + 0.5:
                        put_px_160(arr, px + ox, py + oy, col, margin=MARGIN_LOGICAL + 1)


def draw_snowflake_magic_circle_160(
    arr,
    cx,
    cy,
    rx=13.0,
    ry=24.0,
    phase=0.0,
    aurora_dominant=False,
    double_ring=True,
):
    """
    Renders a 3D-foreshortened Crystalline 6-Point Snowflake Magic Circle & Prismatic Aurora Ring
    on the 160x120 logical canvas (zero melee slash crescents!).
    """
    # Pass 1: Crisp 1px Selout around outer/inner rings & 6 snowflake spokes
    ring_steps = max(36, int(max(rx, ry) * 3.4))
    for i in range(ring_steps):
        a = (i / ring_steps) * 2.0 * math.pi + phase * 0.35
        px = cx + math.cos(a) * rx
        py = cy + math.sin(a) * ry
        draw_pixel_line_160(arr, px, py, px, py, C_OUT_DARK, rad=1)
        if double_ring and i % 2 == 0:
            px2 = cx + math.cos(-a) * (rx * 0.62)
            py2 = cy + math.sin(-a) * (ry * 0.62)
            draw_pixel_line_160(arr, px2, py2, px2, py2, C_OUT_DARK, rad=1)

    for k in range(6):
        a = phase * 0.35 + (k / 6.0) * 2.0 * math.pi
        tx = cx + math.cos(a) * (rx * 1.14)
        ty = cy + math.sin(a) * (ry * 1.14)
        draw_pixel_line_160(arr, cx, cy, tx, ty, C_OUT_DARK, rad=1)

    # Pass 2: Prismatic Aurora & Diamond-Cyan Rings + 6 Snowflake Crystal Spokes
    for i in range(ring_steps):
        a = (i / ring_steps) * 2.0 * math.pi + phase * 0.35
        px = cx + math.cos(a) * rx
        py = cy + math.sin(a) * ry
        if i % 6 == 0:
            col = C_PURE_WHITE
        elif (i // 3) % 2 == 0:
            col = C_AURORA_ORCHID if aurora_dominant else C_CRYO_SKY
        else:
            col = C_CRYO_PALE if not aurora_dominant else C_AURORA_VIOLET
        put_px_160(arr, px, py, col, margin=MARGIN_LOGICAL + 1)

        if double_ring:
            px2 = cx + math.cos(-a) * (rx * 0.62)
            py2 = cy + math.sin(-a) * (ry * 0.62)
            col2 = C_AURORA_ORCHID if (i % 4 < 2) else C_CRYO_AQUA
            put_px_160(arr, px2, py2, col2, margin=MARGIN_LOGICAL + 1)

    for k in range(6):
        a = phase * 0.35 + (k / 6.0) * 2.0 * math.pi
        ca, sa = math.cos(a), math.sin(a)
        tx = cx + ca * (rx * 1.14)
        ty = cy + sa * (ry * 1.14)
        spoke_col = C_CRYO_PALE if k % 2 == 0 else C_AURORA_ORCHID
        draw_pixel_line_160(arr, cx, cy, tx, ty, spoke_col, rad=0)
        put_px_160(arr, tx, ty, C_PURE_WHITE, margin=MARGIN_LOGICAL + 1)
        # Foreshortened snowflake V-barbs at 70% radius
        bx = cx + ca * (rx * 0.72)
        by = cy + sa * (ry * 0.72)
        for sign in (-1.0, 1.0):
            ba = a + sign * 0.52
            btx = bx + math.cos(ba) * (rx * 0.30)
            bty = by + math.sin(ba) * (ry * 0.30)
            draw_pixel_line_160(arr, bx, by, btx, bty, C_OUT_DARK, rad=1)
            draw_pixel_line_160(arr, bx, by, btx, bty, C_PURE_WHITE if k % 2 == 0 else C_CRYO_AQUA, rad=0)

    draw_star_glint_160(arr, cx, cy, arm_len=4, core_r=1.4)


def draw_borealis_cast_projection_160(
    arr,
    origin_x,
    origin_y,
    reach_x=151.0,
    mode="comet",
    progress=0.0,
    phase=0.0,
):
    """
    Long-range forward spell projection in x_160 = 92..153 (x_320 = 184..306) for Row 2/3/4/7/8:
      - mode="comet": Borealis Prismatic Cryo-Comet + Aurora Ring Ripples + Diamond-Dust Burst
      - mode="chakram": Spinning 6-Point Snowflake Chakram + Twin Aurora Wake Ribbons
      - mode="spires": 3 Ground-Marching Crystalline Glacier Spires + Aurora Floor Rune Wave
      - mode="skyrift": 3 Sky-Rift Prismatic Diamond-Icicle Lances + Aurora Super-Starburst
    """
    clamped_reach = min(float(LOGICAL_W - MARGIN_LOGICAL - 4), reach_x)

    if mode == "comet":
        # Twin prismatic aurora carrier rays + faceted diamond cryo-comet head at clamped_reach!
        head_x = origin_x + (clamped_reach - origin_x) * (1.0 - progress * 0.12)
        head_y = origin_y + progress * 1.5
        # Selout pass for comet body & aurora rays
        for off_y in (-5.5, 0.0, 5.5):
            y_end = head_y + off_y * (0.35 + 0.65 * progress)
            draw_pixel_line_160(arr, origin_x + 4.0, origin_y + off_y * 0.45, head_x - 3.0, y_end, C_OUT_DARK, rad=1)
        if progress < 0.72:
            # Faceted diamond cryo-comet spearhead
            for dx in range(-10, 4):
                hw = max(0, int(round((1.0 - abs(dx + 2) / 9.0) * 5.2 * (1.0 - progress * 0.45))))
                for dy in range(-hw - 1, hw + 2):
                    col = C_OUT_DARK if abs(dy) > hw else (
                        C_PURE_WHITE if abs(dy) <= 1 else (C_CRYO_PALE if dy < 0 else C_AURORA_ORCHID)
                    )
                    put_px_160(arr, head_x + dx, head_y + dy, col, margin=MARGIN_LOGICAL + 1)
        # Core prismatic rays + foreshortened aurora shock-oval
        draw_pixel_line_160(arr, origin_x + 4.0, origin_y - 4.5, head_x - 5.0, head_y - 2.0, C_AURORA_ORCHID, rad=0)
        draw_pixel_line_160(arr, origin_x + 4.0, origin_y + 4.5, head_x - 5.0, head_y + 2.0, C_CRYO_SKY, rad=0)
        draw_pixel_line_160(arr, origin_x + 3.0, origin_y, head_x + 1.0, head_y, C_PURE_WHITE, rad=0)
        ring_x = origin_x + (head_x - origin_x) * 0.56
        draw_snowflake_magic_circle_160(
            arr, ring_x, head_y, rx=5.5 + progress * 3.0, ry=14.5 + progress * 4.0,
            phase=phase + 0.8, aurora_dominant=(progress > 0.3), double_ring=False,
        )
        draw_star_glint_160(arr, min(LOGICAL_W - 9, head_x + 1.0), head_y, arm_len=max(3, int(6 * (1.0 - progress * 0.4))), core_r=1.5)

    elif mode == "chakram":
        # Giant 6-Bladed Spinning Diamond-Snowflake Chakram out at x_160 ~ 136..140 (tips reaching 152!)
        ch_x = min(LOGICAL_W - 18.0, clamped_reach - 13.0)
        ch_y = origin_y - 1.5
        # Twin curved aurora ribbon wakes connecting scepter circle -> chakram
        steps = 28
        for s_sign, r_col in ((-1.0, C_AURORA_ORCHID), (1.0, C_CRYO_SKY)):
            pts = []
            for i in range(steps + 1):
                u = i / steps
                px = origin_x + (ch_x - origin_x) * u
                py = origin_y + (ch_y - origin_y) * u + math.sin(u * math.pi) * s_sign * (8.5 - progress * 3.0)
                pts.append((px, py))
            for px, py in pts:
                draw_pixel_line_160(arr, px, py, px, py, C_OUT_DARK, rad=1)
            for idx_p, (px, py) in enumerate(pts):
                put_px_160(arr, px, py, C_PURE_WHITE if idx_p % 5 == 0 else r_col, margin=MARGIN_LOGICAL + 1)
        draw_snowflake_magic_circle_160(
            arr, ch_x, ch_y, rx=13.5 * (1.0 - progress * 0.22), ry=13.5 * (1.0 - progress * 0.22),
            phase=phase * 1.8, aurora_dominant=True, double_ring=True,
        )

    elif mode == "spires":
        # 3 Sequential Ground-Marching Crystalline Aurora Glacier Spires across x_160 = 104, 126, 146!
        spire_specs = [
            (104.0, 26.0 * (1.0 - progress * 0.35), False),
            (126.0, 34.0 * (1.0 - progress * 0.25), True),
            (min(LOGICAL_W - 11.0, clamped_reach - 5.0), 42.0 * (1.0 - progress * 0.20), False),
        ]
        # Foreshortened floor frost wave linking scepter -> spires
        draw_pixel_line_160(arr, origin_x, 111.0, spire_specs[-1][0] + 4.0, 111.0, C_OUT_DARK, rad=1)
        draw_pixel_line_160(arr, origin_x, 111.0, spire_specs[-1][0] + 4.0, 111.0, C_CRYO_SKY, rad=0)
        for sx, sh, is_aur in spire_specs:
            h_i = max(6, int(round(sh)))
            w_base = 5.4 if h_i > 30 else 4.4
            for dy in range(h_i + 1):
                uf = dy / max(1, h_i)
                y = int(round(112.0 - dy))
                hw = w_base * ((1.0 - uf) ** 0.75)
                lim = int(math.ceil(hw + 1))
                for dx in range(-lim, lim + 1):
                    ad = abs(dx)
                    if ad > hw + 0.8:
                        continue
                    if ad >= hw - 0.15:
                        col = C_OUT_DARK
                    elif abs(dx + 0.6) <= 0.75:
                        col = C_PURE_WHITE
                    elif dx < 0:
                        col = C_CRYO_PALE if not is_aur else C_AURORA_PALE
                    else:
                        col = C_AURORA_ORCHID if is_aur else C_CRYO_SKY
                    put_px_160(arr, sx + dx + uf * 2.5, y, col, margin=MARGIN_LOGICAL + 1)
            draw_star_glint_160(arr, sx + 2.5, max(12.0, 112.0 - h_i), arm_len=3, core_r=1.1)

    elif mode == "skyrift":
        # Upper Sky-Rift Aurora Portal + 3 Diagonal Prismatic Diamond-Icicle Lances raining to x_160 = 152!
        rift_cx = min(LOGICAL_W - 22.0, clamped_reach - 18.0)
        draw_snowflake_magic_circle_160(
            arr, rift_cx, 18.0, rx=16.5, ry=5.5, phase=phase, aurora_dominant=True, double_ring=True,
        )
        lance_targets = [
            (rift_cx - 12.0, 20.0, rift_cx - 2.0, 96.0, False),
            (rift_cx, 16.0, min(LOGICAL_W - 8.0, clamped_reach - 2.0), 106.0, True),
            (rift_cx + 10.0, 22.0, min(LOGICAL_W - 6.0, clamped_reach), 86.0, False),
        ]
        for lx0, ly0, lx1, ly1, is_aur in lance_targets:
            ux_l = lx1 - lx0
            uy_l = ly1 - ly0
            draw_pixel_line_160(arr, lx0 + ux_l * progress * 0.25, ly0 + uy_l * progress * 0.25, lx1, ly1, C_OUT_DARK, rad=2)
            draw_pixel_line_160(
                arr, lx0 + ux_l * progress * 0.25, ly0 + uy_l * progress * 0.25, lx1, ly1,
                C_AURORA_ORCHID if is_aur else C_CRYO_SKY, rad=1,
            )
            draw_pixel_line_160(arr, lx0 + ux_l * 0.35, ly0 + uy_l * 0.35, lx1, ly1, C_PURE_WHITE, rad=0)
            draw_star_glint_160(arr, lx1, ly1, arm_len=4 if is_aur else 3, core_r=1.2)

    # Scatter crisp diamond-dust pixel motes across x_160 = 104..151
    for m_i in range(7):
        mx = 104.0 + ((m_i * 19 + int(progress * 23)) % 46)
        my = 34.0 + ((m_i * 29 + int(phase * 11)) % 68)
        put_px_160(arr, mx + 1, my, C_OUT_DARK, margin=MARGIN_LOGICAL + 1)
        put_px_160(arr, mx, my, C_PURE_WHITE if m_i % 3 == 0 else (C_AURORA_ORCHID if m_i % 2 == 0 else C_CRYO_PALE), margin=MARGIN_LOGICAL + 1)


def draw_borealis_cryo_smear_160(
    arr,
    cx,
    cy,
    tail_deg,
    lead_deg,
    sweep_dir=1,
    rx_outer=72.0,
    ry_outer=50.0,
    max_thickness=27.0,
    n_teeth=8,
    tooth_depth=10.5,
    phase=0.0,
):
    """
    4-Band Borealis Crystalline Cryo-Crescent Smear Fan on 160x120 logical canvas:
      #ffffff -> #cffafe -> #38bdf8 -> #a855f7 / #1e3a8a crystalline ice-shard rips
      + ordered 4x4 Bayer diamond-dust tail stipple (100% binary alpha!).
    """
    t0 = tail_deg % 360.0
    t1 = lead_deg % 360.0
    total_span = ((t1 - t0) % 360.0) if sweep_dir > 0 else ((t0 - t1) % 360.0)
    if total_span < 4.0:
        return

    yy, xx = np.mgrid[0:LOGICAL_H, 0:LOGICAL_W]
    dx = (xx.astype(np.float32) - cx) / max(1.0, rx_outer)
    dy = (yy.astype(np.float32) - cy) / max(1.0, ry_outer)
    r_norm = np.hypot(dx, dy)
    ang = np.degrees(np.arctan2(yy.astype(np.float32) - cy, xx.astype(np.float32) - cx)) % 360.0
    rel = ((ang - t0) % 360.0) if sweep_dir > 0 else ((t0 - ang) % 360.0)

    in_arc = rel <= total_span
    u = np.clip(rel / max(1.0, total_span), 0.0, 1.0)

    r_out = 0.84 + 0.16 * np.maximum(0.0, np.sin(np.pi * (u ** 0.78)))
    sin_u = np.maximum(0.0, np.sin(np.pi * (u ** 0.72)))
    thick_norm = (max_thickness / max(1.0, 0.5 * (rx_outer + ry_outer))) * (sin_u ** 0.82)
    thick_norm = np.maximum(0.025 * (1.0 - u), thick_norm)

    # Sharp crystalline ice-shard sawtooth notches along inner chord
    saw = (u * n_teeth + phase) % 1.0
    serration = (tooth_depth / max(1.0, 0.5 * (rx_outer + ry_outer))) * (np.abs(2.0 * saw - 1.0) ** 1.45) * np.maximum(0.0, np.sin(np.pi * u))
    r_in = r_out - thick_norm + serration

    body_mask = in_arc & (r_norm >= r_in) & (r_norm <= r_out)
    bayer_tile = BAYER4[yy % 4, xx % 4]
    tail_keep = (u >= 0.24) | (bayer_tile < (u / 0.24))
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

    rim_selout = in_arc & safe_box & tail_keep & (r_norm > r_out) & (r_norm <= r_out + (1.25 / max(1.0, rx_outer)))
    arr[rim_selout] = C_OUT_LIT

    denom = np.maximum(0.02, r_out - r_in)
    v = np.clip((r_norm - r_in) / denom, 0.0, 1.0)

    # Exact brief 4-band Borealis ramp: #ffffff -> #cffafe -> #38bdf8 -> #a855f7 / #1e3a8a
    checker_aurora = ((xx // 2 + yy // 2) % 2) == 0
    arr[body_mask & (v < 0.26) & (~checker_aurora)] = C_NAVY_RIP
    arr[body_mask & (v < 0.26) & checker_aurora] = C_AURORA_VIOLET
    arr[body_mask & (v >= 0.26) & (v < 0.58)] = C_CRYO_SKY
    arr[body_mask & (v >= 0.58) & (v < 0.84)] = C_CRYO_PALE
    arr[body_mask & (v >= 0.84)] = C_PURE_WHITE

    for s_idx, r_off in enumerate((0.06, 0.13)):
        u_lo = 0.24 + s_idx * 0.12
        u_hi = 0.84 - s_idx * 0.08
        r_streak = r_in - r_off
        streak = (
            in_arc
            & safe_box
            & (u >= u_lo)
            & (u <= u_hi)
            & (np.abs(r_norm - r_streak) <= (0.85 / max(1.0, rx_outer)))
        )
        arr[streak] = C_AURORA_ORCHID if s_idx == 0 else C_CRYO_SKY


def draw_pirouette_vortex_smear_160(
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
    saw = (u_ang * 10.0 + erosion * 2.0) % 1.0
    serr = 0.13 * (1.0 - erosion) * (np.abs(2.0 * saw - 1.0) ** 1.6) * front_weight * right_bulge

    r_out = 1.0
    r_in = r_out - w_norm + serr

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

    sel = hemi & safe_box & keep & (enorm > r_out) & (enorm <= r_out + (1.2 / max(1.0, rx)))
    arr[sel] = C_OUT_LIT

    v = np.clip((enorm - r_in) / np.maximum(0.02, r_out - r_in), 0.0, 1.0)
    arr[mask & (v < 0.28)] = C_AURORA_VIOLET
    arr[mask & (v >= 0.28) & (v < 0.60)] = C_CRYO_SKY
    arr[mask & (v >= 0.60) & (v < 0.84)] = C_CRYO_PALE
    arr[mask & (v >= 0.84)] = C_PURE_WHITE


def draw_permafrost_pillar_160(arr, impact_x, top_y=4, bot_y=114, half_w=5.0):
    ix = int(round(impact_x))
    ihw = int(math.ceil(half_w))
    for y in range(max(MARGIN_LOGICAL + 1, int(top_y)), min(LOGICAL_H - MARGIN_LOGICAL - 1, int(bot_y) + 1)):
        vt = (y - top_y) / max(1.0, float(bot_y - top_y))
        cur_hw = half_w * (0.45 + 0.55 * math.sin(vt * math.pi * 0.85))
        for dx in range(-ihw - 1, ihw + 2):
            adx = abs(dx)
            if adx <= cur_hw:
                if adx <= cur_hw * 0.32:
                    col = C_PURE_WHITE
                elif adx <= cur_hw * 0.68:
                    col = C_CRYO_PALE
                else:
                    col = C_CRYO_SKY if dx < 0 else C_AURORA_VIOLET
                put_px_160(arr, ix + dx, y, col)
    fiss_w = int(half_w * 4.2)
    for dx in range(-fiss_w, fiss_w + 1):
        col = C_PURE_WHITE if abs(dx) < fiss_w * 0.35 else (C_CRYO_PALE if abs(dx) < fiss_w * 0.7 else C_CRYO_SKY)
        put_px_160(arr, ix + dx, bot_y, col)
        if abs(dx) < fiss_w * 0.55:
            put_px_160(arr, ix + dx, bot_y - 1, C_AURORA_ORCHID)


def draw_ice_sparks_160(arr, impact_x, ground_y, spread=22.0, progress=0.0, count=7):
    for i in range(count):
        frac = (i / max(1, count - 1)) * 2.0 - 1.0
        ang = math.radians(-90.0 + frac * 68.0)
        dist = (4.0 + progress * spread) * (0.65 + 0.35 * ((i * 37) % 5) / 4.0)
        sx = impact_x + math.cos(ang) * dist
        sy = min(ground_y, ground_y + math.sin(ang) * dist * 0.55)
        col = C_PURE_WHITE if progress < 0.35 else (C_CRYO_AQUA if i % 2 == 0 else C_AURORA_ORCHID)
        put_px_160(arr, sx, sy, col)
        if progress < 0.65:
            put_px_160(arr, sx - math.cos(ang) * 1.5, min(ground_y, sy - math.sin(ang) * 1.0), C_CRYO_SKY)


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
    glaive_len=55.0,
    weapon_layer="front",
    scarf_deg=168.0,
    scarf_len=28.0,
    scarf_phase=0.0,
    scarf_amp=3.2,
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
    l_target_hi = (grip_hi[0] - w_ux * 3.8 * S_HI, grip_hi[1] - w_uy * 3.8 * S_HI)
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

    if pre_fn is not None:
        pre_fn(frame, neck_160, grip_160)

    draw_borealis_crown_halo_160(frame, neck_160[0], neck_160[1], phase=rune_phase)
    draw_aurora_veil_ribbons_160(
        frame,
        neck_160[0] - 2.0,
        neck_160[1] + 2.0,
        base_deg=scarf_deg,
        length=scarf_len,
        wave_phase=scarf_phase,
        wave_amp=scarf_amp,
    )

    if weapon_layer == "behind":
        draw_borealis_frost_glaive_160(
            frame, grip_160[0], grip_160[1], weapon_deg, glaive_len=glaive_len, rune_phase=rune_phase, draw_gauntlets=False
        )

    mask_b = body_160[:, :, 3] > 128
    frame[mask_b] = body_160[mask_b]

    if weapon_layer != "behind":
        draw_borealis_frost_glaive_160(
            frame, grip_160[0], grip_160[1], weapon_deg, glaive_len=glaive_len, rune_phase=rune_phase, draw_gauntlets=True
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
    mane_deg=0.0,
    mane_wave_ph=0.0,
    mane_wave_amp=6.0,
    l_coat_deg=0.0,
    r_coat_deg=0.0,
    coat_wave_ph=0.0,
    coat_wave_amp=7.0,
    l_thigh_deg=0.0,
    l_shin_deg=0.0,
    l_foot_deg=0.0,
    r_thigh_deg=0.0,
    r_shin_deg=0.0,
    r_foot_deg=0.0,
    grip_rel_sh=(10.0, 8.0),
    weapon_deg=26.0,
    glaive_len=55.0,
    weapon_layer="front",
    weapon_abs_160=None,
    scarf_deg=168.0,
    scarf_len=28.0,
    scarf_phase=0.0,
    scarf_amp=3.0,
    rune_phase=0.0,
    bend_l=1.0,
    bend_r=1.0,
    show_halo=True,
    lock_lowest_to_ground=False,
    clamp_below_ground_only=False,
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

    mane_rel = (neck_dst[0] + (sj["mane"][0] - sj["neck"][0]), neck_dst[1] + (sj["mane"][1] - sj["neck"][1]))
    mane_dst = rot_pt(mane_rel, neck_dst, torso_deg + head_deg)

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
    l_target_hi = (grip_hi[0] - w_ux * 3.6 * S_HI, grip_hi[1] - w_uy * 3.6 * S_HI)
    r_target_hi = (grip_hi[0] + w_ux * 2.2 * S_HI, grip_hi[1] + w_uy * 2.2 * S_HI)

    paste_rotated_part(
        win_hi, parts["mane"], sj["mane"], mane_dst,
        deg=torso_deg + head_deg + mane_deg, wave_phase=mane_wave_ph, wave_amp=mane_wave_amp,
    )
    paste_rotated_part(
        win_hi, parts["l_coat"], sj["l_coat"], l_coat_dst,
        deg=torso_deg + l_coat_deg, wave_phase=coat_wave_ph, wave_amp=coat_wave_amp,
    )
    paste_ik_arm_hi(win_hi, parts, sj, "l", l_sh_dst, l_target_hi, bend_sign=bend_l)

    draw_joint_bridge_hi(win_hi, l_hip_dst, l_knee_dst, r=4)
    draw_joint_bridge_hi(win_hi, l_knee_dst, l_ank_dst, r=3)
    paste_rotated_part(win_hi, parts["l_thigh"], sj["l_hip"], l_hip_dst, deg=l_thigh_deg)
    paste_rotated_part(win_hi, parts["l_shin"], sj["l_knee"], l_knee_dst, deg=l_thigh_deg + l_shin_deg)
    paste_rotated_part(win_hi, parts["l_foot"], sj["l_ankle"], l_ank_dst, deg=l_thigh_deg + l_shin_deg + l_foot_deg)

    paste_rotated_part(
        win_hi, parts["r_coat"], sj["r_coat"], r_coat_dst,
        deg=torso_deg + r_coat_deg, wave_phase=coat_wave_ph + 1.1, wave_amp=coat_wave_amp * 0.85,
    )
    draw_joint_bridge_hi(win_hi, r_hip_dst, r_knee_dst, r=4)
    draw_joint_bridge_hi(win_hi, r_knee_dst, r_ank_dst, r=3)
    paste_rotated_part(win_hi, parts["r_thigh"], sj["r_hip"], r_hip_dst, deg=r_thigh_deg)
    paste_rotated_part(win_hi, parts["r_shin"], sj["r_knee"], r_knee_dst, deg=r_thigh_deg + r_shin_deg)
    paste_rotated_part(win_hi, parts["r_foot"], sj["r_ankle"], r_ank_dst, deg=r_thigh_deg + r_shin_deg + r_foot_deg)

    paste_rotated_part(win_hi, parts["torso"], pelvis_src, dst_pelvis, deg=torso_deg)
    paste_rotated_part(win_hi, parts["head"], sj["neck"], neck_dst, deg=torso_deg + head_deg)
    paste_ik_arm_hi(win_hi, parts, sj, "r", r_sh_dst, r_target_hi, bend_sign=bend_r)

    body_160 = quantize_and_cluster_160x120(downsample_clean_160x120(win_hi))

    shift_y_160 = 0
    if clamp_below_ground_only:
        body_160[ANCHOR_Y_120 + 1 :, :, :] = 0
    else:
        ys_b, _ = np.where(body_160[:, :, 3] > 128)
        if len(ys_b) > 0:
            cur_bot = int(ys_b.max())
            if lock_lowest_to_ground or cur_bot > ANCHOR_Y_120:
                shift_y_160 = ANCHOR_Y_120 - cur_bot
                if shift_y_160 != 0:
                    shifted = np.zeros_like(body_160)
                    for y in range(LOGICAL_H):
                        ny = y + shift_y_160
                        if MARGIN_LOGICAL <= ny < LOGICAL_H - MARGIN_LOGICAL:
                            shifted[ny] = body_160[y]
                    body_160 = shifted

    frame = np.zeros((LOGICAL_H, LOGICAL_W, 4), dtype=np.uint8)
    neck_160 = (neck_dst[0] / S_HI, neck_dst[1] / S_HI + shift_y_160)
    grip_160 = (grip_hi[0] / S_HI, grip_hi[1] / S_HI + shift_y_160)

    if pre_fn is not None:
        pre_fn(frame, neck_160, grip_160)

    if show_halo:
        draw_borealis_crown_halo_160(frame, neck_160[0], neck_160[1], phase=rune_phase)

    if scarf_len > 1.0:
        draw_aurora_veil_ribbons_160(
            frame,
            neck_160[0] - 2.0,
            neck_160[1] + 2.0,
            base_deg=scarf_deg,
            length=scarf_len,
            wave_phase=scarf_phase,
            wave_amp=scarf_amp,
        )

    if weapon_layer == "behind":
        draw_borealis_frost_glaive_160(
            frame, grip_160[0], grip_160[1], weapon_deg, glaive_len=glaive_len, rune_phase=rune_phase, draw_gauntlets=False
        )

    mask_b = body_160[:, :, 3] > 128
    frame[mask_b] = body_160[mask_b]

    if weapon_layer == "front":
        draw_borealis_frost_glaive_160(
            frame, grip_160[0], grip_160[1], weapon_deg, glaive_len=glaive_len, rune_phase=rune_phase, draw_gauntlets=True
        )

    if post_fn is not None:
        post_fn(frame, neck_160, grip_160)

    return frame


# ==============================================================================
# 7. 10-ROW x 30-FRAME CHOREOGRAPHY (300 CELLS)
# ==============================================================================

def build_row0_idle(parts, sj):
    """Row 0: Borealis Sovereign Poised Skating Stance + Diamond-Snowflake Scepter & Crown Halo."""
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 2.0 * math.pi
        bob_y = math.sin(ph) * 0.85
        torso_deg = math.sin(ph - 0.4) * 1.1
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=math.sin(ph) * 0.4,
            pelvis_dy=bob_y,
            torso_deg=torso_deg,
            head_deg=-torso_deg * 0.5,
            mane_deg=math.sin(ph - 0.8) * 1.8,
            mane_wave_ph=ph,
            mane_wave_amp=3.2,
            l_coat_deg=1.5 + math.sin(ph - 0.7) * 1.8,
            r_coat_deg=-1.0 + math.sin(ph - 1.1) * 1.6,
            coat_wave_ph=ph,
            coat_wave_amp=2.0,
            grip_rel_sh=(10.5, 8.0 + math.sin(ph - 0.3) * 0.7),
            weapon_deg=-24.0 + math.sin(ph - 0.5) * 2.2,
            glaive_len=49.0,
            weapon_layer="front",
            scarf_deg=166.0 + math.sin(ph - 0.6) * 3.8,
            scarf_len=29.0,
            scarf_phase=ph * 2.0,
            scarf_amp=3.0,
            rune_phase=ph * 2.0,
            clamp_below_ground_only=True,
        ))
    return frames


def build_row1_walk(parts, sj):
    """
    Row 1: Morph-Free Graceful Figure-Skate Glide (100% unified royal-sapphire gown silhouette,
    continuous with Row 0 IDLE scepter carry, zero cur_bot head-popping, zero gown tearing!).
    """
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 2.0 * math.pi
        s1 = math.sin(ph)
        s2 = -s1
        # Smooth deterministic <= 1.0px glide bob (no dynamic cur_bot vertical jumps!)
        bob_y = -0.85 * (0.5 + 0.5 * math.cos(ph * 2.0))

        def post_skate(arr, _n, _g, step=f, ph_loc=ph):
            # Crisp figure-skate frost ribbon & crystalline ice shavings under skates
            sx = 44.0 - ((step * 2) % 10)
            put_px_160(arr, sx, 114, C_CRYO_PALE if step % 2 == 0 else C_CRYO_SKY)
            put_px_160(arr, sx - 3.0, 113, C_AURORA_ORCHID if step % 3 == 0 else C_PURE_WHITE)
            put_px_160(arr, 56.0 + math.sin(ph_loc) * 4.0, 114, C_CRYO_AQUA)

        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=0.8 * s1,
            pelvis_dy=bob_y,
            torso_deg=1.8 + math.sin(ph * 2.0) * 0.9,
            head_deg=-0.9 + math.cos(ph) * 0.5,
            mane_deg=-2.0 + s1 * 1.8,
            mane_wave_ph=ph * 2.0,
            mane_wave_amp=3.4,
            l_coat_deg=1.8 + math.sin(ph - 0.5) * 1.8,
            r_coat_deg=-1.2 + math.cos(ph) * 1.6,
            coat_wave_ph=ph * 2.0,
            coat_wave_amp=1.9,
            l_thigh_deg=-s1 * 5.2,
            l_shin_deg=max(0.0, -s1) * 4.5,
            l_foot_deg=s1 * 3.5,
            r_thigh_deg=-s2 * 5.2,
            r_shin_deg=max(0.0, -s2) * 4.5,
            r_foot_deg=s2 * 3.5,
            grip_rel_sh=(10.5 - s1 * 0.9, 8.0 + math.cos(ph * 2.0) * 0.7),
            weapon_deg=-22.5 + s1 * 3.5,
            glaive_len=49.0,
            weapon_layer="front",
            scarf_deg=168.0 + s1 * 3.8,
            scarf_len=30.0,
            scarf_phase=ph * 2.0,
            scarf_amp=3.2,
            rune_phase=ph * 2.0,
            clamp_below_ground_only=True,
            post_fn=post_skate,
        ))
    return frames


def build_row2_auto_attack(parts, sj, keyposes):
    """
    Row 2: AUTO_ATTACK [[60,8],[68,7],[75,8],[83,7]] -- True 510px Winter Empress Sorcery Chain!
      - V0 (F00..F07): Scepter thrust + 3D Foreshortened 6-Point Snowflake Magic Circle & Borealis Cryo-Comet Burst (F03 SNAP)
      - V1 (F08..F14): Arabesque scepter flourish + Prismatic Aurora Rings & Spinning Snowflake Chakram Projection (F09 SNAP)
      - V2 (F15..F22): 2.5D Borealis Pirouette Mandala + 3 Ground-Marching Aurora Glacier Spires (F17/F18 2-hit)
      - V3 (F23..F29): Airborne Borealis Axel Backstep-Kite (F23..F24) -> Grand Snowflake Circle & Sky-Rift Icicles (F25 SNAP)
    """
    frames = []

    # ---------------- BEAT 1 (V0): F00..F07 (Frames 60..67) ----------------
    for sub_i, (pdx, tilt, wdeg, sph, glint) in enumerate([
        (-1.5, -3.5, -52.0, 0.2, False),
        (-2.8, -5.5, -68.0, 0.9, True),
        (-3.8, -7.0, -82.0, 1.7, True),
    ]):
        def post_v0_coil(arr, _n, grip, step=sub_i):
            w_rad = math.radians(-52.0 - step * 15.0)
            fx = grip[0] + math.cos(w_rad) * 32.0
            fy = grip[1] + math.sin(w_rad) * 32.0
            draw_star_glint_160(arr, fx, fy, arm_len=4 + step, core_r=1.3)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K1_COIL",
            pelvis_dx=pdx, pelvis_dy=-sub_i * 0.4, body_tilt_deg=tilt,
            grip_rel_sh=(4.0 - sub_i * 1.2, -3.5 - sub_i * 0.8), weapon_deg=wdeg, glaive_len=49.0,
            scarf_deg=162.0 - sub_i * 4.0, scarf_len=30.0, scarf_phase=sph, scarf_amp=3.4,
            rune_phase=sph, bend_l=-1.0, bend_r=-1.0, post_fn=post_v0_coil,
        ))

    # F03: 1-FRAME SNAP SCEPTER CAST + 3D SNOWFLAKE MAGIC CIRCLE & PRISMATIC CRYO-COMET BURST!
    def post_v0_snap(arr, _n, _g):
        draw_snowflake_magic_circle_160(
            arr, cx=108.0, cy=63.0, rx=11.5, ry=24.5, phase=0.25, aurora_dominant=False, double_ring=True
        )
        draw_borealis_cast_projection_160(
            arr, origin_x=108.0, origin_y=63.0, reach_x=151.0, mode="comet", progress=0.0, phase=0.4
        )
        draw_ice_sparks_160(arr, impact_x=110.0, ground_y=114.0, spread=16.0, progress=0.2, count=6)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=8.5, pelvis_dy=0.8, body_tilt_deg=4.5,
        grip_rel_sh=(14.0, 1.0), weapon_deg=4.0, glaive_len=50.0,
        scarf_deg=182.0, scarf_len=34.0, scarf_phase=2.5, scarf_amp=4.4,
        rune_phase=2.5, post_fn=post_v0_snap,
    ))

    # F04..F05: Expanding prismatic aurora ring ripples & diamond-dust dissipation
    for e_idx, prog in enumerate((0.44, 0.78)):
        def post_v0_erode(arr, _n, _g, pr=prog, ei=e_idx):
            draw_snowflake_magic_circle_160(
                arr, cx=109.0 + ei * 2.0, cy=63.0, rx=9.5 - ei * 2.0, ry=21.0 - ei * 3.5,
                phase=0.8 + ei * 0.6, aurora_dominant=(ei == 1), double_ring=(ei == 0),
            )
            if ei == 0:
                draw_borealis_cast_projection_160(
                    arr, origin_x=110.0, origin_y=63.0, reach_x=152.0, mode="comet", progress=pr, phase=1.1
                )
            draw_ice_sparks_160(arr, impact_x=118.0 + ei * 8.0, ground_y=114.0, spread=18.0, progress=pr, count=5)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K2_LUNGE",
            pelvis_dx=8.0 - e_idx * 0.8, pelvis_dy=1.2, body_tilt_deg=4.5 - e_idx * 0.5,
            grip_rel_sh=(13.8, 1.8), weapon_deg=6.0 + e_idx * 2.0, glaive_len=50.0,
            scarf_deg=188.0 + e_idx * 4.0, scarf_len=33.0, scarf_phase=3.3 + e_idx * 0.8, scarf_amp=4.0,
            rune_phase=3.4 + e_idx * 0.7, post_fn=post_v0_erode,
        ))

    # F06..F07: Poised scepter cast follow-through priming Beat 2 (ZERO reset to IDLE!)
    for h_idx in range(2):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K2_LUNGE",
            pelvis_dx=6.8 - h_idx * 1.0, pelvis_dy=1.4 + h_idx * 0.4, body_tilt_deg=4.0 + h_idx * 0.8,
            grip_rel_sh=(13.0, 2.8 + h_idx * 0.8), weapon_deg=10.0 + h_idx * 3.0, glaive_len=49.0,
            scarf_deg=178.0 - h_idx * 4.0, scarf_len=31.0, scarf_phase=4.8 + h_idx * 0.7, scarf_amp=3.4,
            rune_phase=4.8 + h_idx * 0.7,
        ))

    # ---------------- BEAT 2 (V1): F08..F14 (Frames 68..74) ----------------
    # F08: 1-frame micro skating torque into rising Arabesque scepter invocation
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=5.5, pelvis_dy=2.0, body_tilt_deg=5.5,
        grip_rel_sh=(11.5, 4.2), weapon_deg=16.0, glaive_len=49.0,
        scarf_deg=170.0, scarf_len=30.0, scarf_phase=5.8, scarf_amp=3.2,
        rune_phase=5.8,
    ))

    # F09: 1-FRAME SNAP ARABESQUE SCEPTER FLOURISH + PRISMATIC AURORA RINGS & SNOWFLAKE CHAKRAM!
    def post_v1_snap(arr, _n, _g):
        draw_snowflake_magic_circle_160(
            arr, cx=105.0, cy=58.0, rx=10.5, ry=23.0, phase=0.6, aurora_dominant=True, double_ring=True
        )
        draw_borealis_cast_projection_160(
            arr, origin_x=105.0, origin_y=58.0, reach_x=152.0, mode="chakram", progress=0.0, phase=0.7
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=7.5, pelvis_dy=-1.0, body_tilt_deg=-3.5,
        grip_rel_sh=(12.5, -4.5), weapon_deg=-12.0, glaive_len=50.0,
        scarf_deg=152.0, scarf_len=34.0, scarf_phase=1.2, scarf_amp=4.4,
        rune_phase=1.5, post_fn=post_v1_snap,
    ))

    # F10..F11: Outbound Snowflake Chakram aurora wake & sparkling crystal dust
    for e_idx, prog in enumerate((0.42, 0.78)):
        def post_v1_erode(arr, _n, _g, pr=prog, ei=e_idx):
            draw_snowflake_magic_circle_160(
                arr, cx=106.0, cy=58.0, rx=8.5 - ei * 2.0, ry=18.5 - ei * 3.5,
                phase=1.2 + ei * 0.7, aurora_dominant=True, double_ring=False,
            )
            if ei == 0:
                draw_borealis_cast_projection_160(
                    arr, origin_x=108.0, origin_y=58.0, reach_x=153.0, mode="chakram", progress=pr, phase=1.5
                )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=7.0 - e_idx * 0.6, pelvis_dy=-1.2, body_tilt_deg=-4.5,
            grip_rel_sh=(11.8, -5.5), weapon_deg=-16.0 - e_idx * 3.0, glaive_len=49.0,
            scarf_deg=156.0 + e_idx * 5.0, scarf_len=33.0, scarf_phase=2.1 + e_idx * 0.8, scarf_amp=4.2,
            rune_phase=2.3 + e_idx * 0.8, post_fn=post_v1_erode,
        ))

    # F12..F14: Regal Arabesque scepter guard priming Beat 3 pirouette
    for h_idx in range(3):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=5.8 - h_idx * 1.0, pelvis_dy=-0.6 + h_idx * 0.3, body_tilt_deg=-3.5 + h_idx * 0.8,
            grip_rel_sh=(10.5 - h_idx * 1.2, -5.0 + h_idx * 1.2), weapon_deg=-22.0 - h_idx * 8.0, glaive_len=49.0,
            scarf_deg=164.0 + h_idx * 3.0, scarf_len=31.0, scarf_phase=3.6 + h_idx * 0.7, scarf_amp=3.6,
            rune_phase=3.8 + h_idx * 0.7,
        ))

    # ---------------- BEAT 3 (V2): F15..F22 (Frames 75..82) ----------------
    # F15..F16: Figure-skating pirouette gather with foreshortened floor snowflake rune
    for sub_i, (pdx, sqx, wdeg, sph) in enumerate([
        (2.0, 0.96, -128.0, 0.6),
        (0.5, 0.92, -142.0, 1.4),
    ]):
        def post_v2_coil(arr, _n, _g, step=sub_i):
            draw_snowflake_magic_circle_160(
                arr, cx=66.0, cy=108.0, rx=22.0 + step * 5.0, ry=5.5,
                phase=step * 0.8, aurora_dominant=(step == 1), double_ring=False,
            )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K1_COIL",
            pelvis_dx=pdx, pelvis_dy=1.0 + sub_i * 0.4, body_tilt_deg=-3.0,
            squash_x=sqx, squash_y=1.0,
            grip_rel_sh=(-3.0, -4.0), weapon_deg=wdeg, glaive_len=48.0,
            scarf_deg=162.0 - sub_i * 6.0, scarf_len=30.0, scarf_phase=sph, scarf_amp=3.6,
            rune_phase=sph, bend_l=-1.0, bend_r=-1.0, post_fn=post_v2_coil,
        ))

    # F17: 1-FRAME 2.5D PIROUETTE MANDALA + 3 GROUND-MARCHING AURORA GLACIER SPIRES!
    def pre_v2_snap(arr, _n, _g):
        draw_pirouette_vortex_smear_160(
            arr, cx=72.0, cy=72.0, rx=44.0, ry=13.0, tilt_deg=-6.0, front_thickness=12.0, half="back", erosion=0.18
        )

    def post_v2_snap(arr, _n, _g):
        draw_snowflake_magic_circle_160(
            arr, cx=98.0, cy=72.0, rx=9.0, ry=19.0, phase=1.1, aurora_dominant=False, double_ring=True
        )
        draw_borealis_cast_projection_160(
            arr, origin_x=94.0, origin_y=72.0, reach_x=152.0, mode="spires", progress=0.0, phase=1.2
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=8.5, pelvis_dy=1.0, body_tilt_deg=5.0,
        grip_rel_sh=(14.0, 0.5), weapon_deg=-2.0, glaive_len=50.0,
        scarf_deg=184.0, scarf_len=35.0, scarf_phase=2.4, scarf_amp=4.6,
        rune_phase=2.5, pre_fn=pre_v2_snap, post_fn=post_v2_snap,
    ))

    # F18: Second resonance pulse across the 3 Ground-Marching Aurora Glacier Spires (2-hit!)
    def post_v2_cross(arr, _n, _g):
        draw_snowflake_magic_circle_160(
            arr, cx=100.0, cy=70.0, rx=10.5, ry=21.0, phase=1.9, aurora_dominant=True, double_ring=True
        )
        draw_borealis_cast_projection_160(
            arr, origin_x=96.0, origin_y=70.0, reach_x=153.0, mode="spires", progress=0.22, phase=2.0
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=7.8, pelvis_dy=0.5, body_tilt_deg=2.5,
        grip_rel_sh=(13.5, 1.5), weapon_deg=6.0, glaive_len=50.0,
        scarf_deg=190.0, scarf_len=34.0, scarf_phase=3.3, scarf_amp=4.4,
        rune_phase=3.3, post_fn=post_v2_cross,
    ))

    # F19: Dissolving spire frost sparkles
    def post_v2_erode(arr, _n, _g):
        draw_borealis_cast_projection_160(
            arr, origin_x=98.0, origin_y=72.0, reach_x=150.0, mode="spires", progress=0.65, phase=2.8
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=6.8, pelvis_dy=0.8, body_tilt_deg=2.5,
        grip_rel_sh=(12.5, 2.5), weapon_deg=10.0, glaive_len=49.0,
        scarf_deg=194.0, scarf_len=32.0, scarf_phase=4.1, scarf_amp=4.0,
        rune_phase=4.0, post_fn=post_v2_erode,
    ))

    # F20..F22: Graceful skating knee-bend loading Axel Backstep-Kite for Beat 4!
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=5.0, pelvis_dy=1.8, body_tilt_deg=5.5,
        grip_rel_sh=(11.0, 4.5), weapon_deg=16.0, glaive_len=49.0,
        scarf_deg=182.0, scarf_len=31.0, scarf_phase=4.8, scarf_amp=3.5,
        rune_phase=4.7,
    ))
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K1_COIL",
        pelvis_dx=2.5, pelvis_dy=2.2, body_tilt_deg=3.5,
        grip_rel_sh=(6.0, -3.5), weapon_deg=-48.0, glaive_len=48.0,
        scarf_deg=172.0, scarf_len=30.0, scarf_phase=5.5, scarf_amp=3.2,
        rune_phase=5.4,
    ))
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K1_COIL",
        pelvis_dx=0.5, pelvis_dy=1.5, body_tilt_deg=-2.5,
        grip_rel_sh=(4.5, -6.5), weapon_deg=-72.0, glaive_len=48.0,
        scarf_deg=166.0, scarf_len=30.0, scarf_phase=6.2, scarf_amp=3.4,
        rune_phase=6.1, bend_l=-1.0, bend_r=-1.0,
    ))

    # ---------------- BEAT 4 (V3): F23..F29 (Frames 83..89) ----------------
    # F23..F24: Airborne Borealis Axel Backstep-Kite (K4_LEAP, skates lifted off floor!)
    for sub_i, (pdx, pdy, tilt, wdeg, sdeg, sph) in enumerate([
        (-1.5, -15.0, -4.0, -68.0, 134.0, 0.8),
        (-3.0, -19.0, -6.5, -52.0, 124.0, 1.7),
    ]):
        def post_v3_leap(arr, _n, grip, step=sub_i):
            w_rad = math.radians(-68.0 + step * 16.0)
            fx = grip[0] + math.cos(w_rad) * 32.0
            fy = max(12.0, grip[1] + math.sin(w_rad) * 32.0)
            draw_star_glint_160(arr, fx, fy, arm_len=5 + step * 2, core_r=1.6 + step * 0.4)
            draw_ice_sparks_160(arr, impact_x=56.0, ground_y=114.0, spread=14.0, progress=0.35 + step * 0.25, count=5)

        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K4_LEAP",
            pelvis_dx=pdx, pelvis_dy=pdy, body_tilt_deg=tilt,
            grip_rel_sh=(7.5, -7.5), weapon_deg=wdeg, glaive_len=48.0,
            scarf_deg=sdeg, scarf_len=33.0, scarf_phase=sph, scarf_amp=4.2,
            rune_phase=sph, bend_l=-1.0, bend_r=-1.0, post_fn=post_v3_leap,
        ))

    # F25: 1-FRAME SOVEREIGN SKY-RIFT COMMAND + GRAND 6-POINT SNOWFLAKE CIRCLE & 3x ICICLE LANCES!
    def post_v3_slam(arr, _n, _g):
        draw_snowflake_magic_circle_160(
            arr, cx=108.0, cy=58.0, rx=13.5, ry=27.0, phase=0.5, aurora_dominant=True, double_ring=True
        )
        draw_borealis_cast_projection_160(
            arr, origin_x=108.0, origin_y=58.0, reach_x=153.0, mode="skyrift", progress=0.0, phase=0.9
        )
        draw_ice_sparks_160(arr, impact_x=134.0, ground_y=114.0, spread=24.0, progress=0.18, count=8)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=5.5, pelvis_dy=-1.0, body_tilt_deg=-2.5,
        grip_rel_sh=(13.5, -2.5), weapon_deg=-6.0, glaive_len=50.0,
        scarf_deg=154.0, scarf_len=35.0, scarf_phase=2.8, scarf_amp=4.8,
        rune_phase=2.9, post_fn=post_v3_slam,
    ))

    # F26..F27: Sky-Rift diamond-dust & prismatic aurora ring dissipation
    for e_idx, prog in enumerate((0.45, 0.80)):
        def post_v3_erode(arr, _n, _g, pr=prog, ei=e_idx):
            draw_snowflake_magic_circle_160(
                arr, cx=109.0, cy=59.0, rx=11.0 - ei * 2.5, ry=22.0 - ei * 4.5,
                phase=1.3 + ei * 0.7, aurora_dominant=(ei == 0), double_ring=(ei == 0),
            )
            if ei == 0:
                draw_borealis_cast_projection_160(
                    arr, origin_x=109.0, origin_y=59.0, reach_x=152.0, mode="skyrift", progress=pr, phase=1.7
                )
            draw_ice_sparks_160(arr, impact_x=134.0, ground_y=114.0, spread=26.0, progress=pr, count=7 - ei * 2)

        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=5.0 - e_idx * 0.8, pelvis_dy=-0.4 + e_idx * 0.4, body_tilt_deg=-2.0 + e_idx * 0.8,
            grip_rel_sh=(13.0, -1.0 + e_idx * 1.5), weapon_deg=-3.0 + e_idx * 4.0, glaive_len=50.0,
            scarf_deg=168.0 + e_idx * 8.0, scarf_len=33.0, scarf_phase=3.7 + e_idx * 0.8, scarf_amp=4.2,
            rune_phase=3.7 + e_idx * 0.8, post_fn=post_v3_erode,
        ))

    # F28..F29: Graceful Winter Empress scepter recovery
    for r_idx in range(2):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=3.5 - r_idx * 1.8, pelvis_dy=0.4 * (1.0 - r_idx), body_tilt_deg=0.5 - r_idx * 0.5,
            grip_rel_sh=(11.5 - r_idx * 1.0, 3.5 + r_idx * 3.0), weapon_deg=2.0 - r_idx * 22.0, glaive_len=49.0,
            scarf_deg=174.0 - r_idx * 6.0, scarf_len=30.0, scarf_phase=5.3 + r_idx * 0.7, scarf_amp=3.4,
            rune_phase=5.2 + r_idx * 0.7,
        ))

    assert len(frames) == 30
    return frames


def build_row3_skill(parts, sj, keyposes):
    """Row 3: SKILL -- BOREALIS PRISM JAWS Invocation & Diamond-Lotus Shatter Command (30 Frames)."""
    frames = []
    for f in range(4):
        def post_g(arr, _n, grip, step=f):
            if step >= 1:
                draw_star_glint_160(arr, grip[0] + 18.0, grip[1] - 12.0, arm_len=4 + step)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K1_COIL",
            pelvis_dx=-1.5 - f * 0.8, pelvis_dy=-f * 0.5, body_tilt_deg=-3.0 - f * 1.2,
            grip_rel_sh=(4.5, -5.0), weapon_deg=-52.0 - f * 8.0, glaive_len=49.0,
            scarf_deg=164.0 - f * 3.0, scarf_len=30.0, scarf_phase=f * 0.7, scarf_amp=3.5,
            rune_phase=f * 0.8, bend_l=-1.0, bend_r=-1.0, post_fn=post_g,
        ))

    # F04..F11: Twin Aurora-Orchid & Cyan Monolith Summoning Circle
    for sub in range(8):
        def post_s1(arr, _n, _g, s=sub):
            if s <= 4:
                draw_snowflake_magic_circle_160(
                    arr, cx=108.0, cy=62.0, rx=12.0 - s * 1.2, ry=24.0 - s * 2.0,
                    phase=0.4 + s * 0.4, aurora_dominant=(s % 2 == 1), double_ring=(s <= 2),
                )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=6.5 - max(0, sub - 4) * 0.8, pelvis_dy=-1.0, body_tilt_deg=-3.0,
            grip_rel_sh=(12.5, -4.5), weapon_deg=-16.0 - sub * 1.5, glaive_len=50.0,
            scarf_deg=154.0 + sub * 3.0, scarf_len=32.0, scarf_phase=1.0 + sub * 0.7, scarf_amp=4.0,
            rune_phase=1.2 + sub * 0.8, post_fn=post_s1,
        ))

    # F12..F15: Sovereign Scepter Clasp Windup
    for sub in range(4):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K4_LEAP",
            pelvis_dx=3.5 + sub * 0.6, pelvis_dy=-8.0 - sub * 1.5, body_tilt_deg=-4.0,
            grip_rel_sh=(6.5, -7.5), weapon_deg=-64.0 - sub * 4.0, glaive_len=48.0,
            scarf_deg=138.0 - sub * 3.0, scarf_len=33.0, scarf_phase=sub * 0.8, scarf_amp=4.2,
            rune_phase=sub * 0.9, bend_l=-1.0, bend_r=-1.0,
        ))

    # F16..F24: Inward Prism Jaws Shatter Command + Diamond-Lotus Nova Circle!
    for sub in range(9):
        def post_slam(arr, _n, _g, s=sub):
            if s <= 4:
                draw_snowflake_magic_circle_160(
                    arr, cx=112.0, cy=62.0, rx=13.5 - s * 1.5, ry=26.0 - s * 2.5,
                    phase=0.8 + s * 0.5, aurora_dominant=True, double_ring=(s <= 2),
                )
                if s <= 2:
                    draw_borealis_cast_projection_160(
                        arr, origin_x=110.0, origin_y=62.0, reach_x=151.0, mode="comet", progress=s * 0.35, phase=s * 0.6
                    )
            if s <= 4:
                draw_ice_sparks_160(arr, impact_x=124.0, ground_y=114.0, spread=24.0, progress=s / 4.5, count=7 - s)

        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K2_LUNGE",
            pelvis_dx=8.5 - max(0, sub - 4) * 1.0, pelvis_dy=1.2, body_tilt_deg=5.0 - max(0, sub - 4) * 0.8,
            grip_rel_sh=(14.0, 2.0), weapon_deg=4.0 + min(3, sub) * 1.5, glaive_len=50.0,
            scarf_deg=176.0 + sub * 2.5, scarf_len=33.0, scarf_phase=2.5 + sub * 0.7, scarf_amp=4.2,
            rune_phase=2.5 + sub * 0.8, post_fn=post_slam,
        ))

    # F25..F29: Recovery
    for sub in range(5):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=4.5 - sub * 0.9, pelvis_dy=0.5 * (1.0 - sub / 4.0), body_tilt_deg=1.5 - sub * 0.4,
            grip_rel_sh=(11.5 - sub * 0.3, 5.0), weapon_deg=8.0 - sub * 7.0, glaive_len=49.0,
            scarf_deg=174.0 - sub * 2.0, scarf_len=30.0, scarf_phase=sub * 0.8, scarf_amp=3.4,
            rune_phase=sub * 0.8,
        ))

    assert len(frames) == 30
    return frames


def build_row4_ultimate(parts, sj, keyposes):
    """
    Row 4: ULTIMATE / TRUE_ULTIMATE -- Nine Ice-Swords Coronation & Zero-Kelvin Cathedral Scepter-Tap (30 Frames)
      - F00..F08: Borealis Ascension & Coronation Halo Invocation
      - F09..F16: Nine-Sword Aurora Crown Command Circle
      - F17..F23: Iconic Vertical Sovereign Scepter-Tap Windup & Strike!
      - F24..F29: Eternal Borealis Permafrost Radiance & Descent
    """
    frames = []
    # F00..F08: Borealis Ascension
    for f in range(9):
        def post_asc(arr, neck, grip, step=f):
            draw_borealis_crown_halo_160(arr, neck[0], neck[1] - 2.0, phase=step * 0.5, scale=1.25)
            draw_star_glint_160(arr, grip[0], max(10.0, grip[1] - 32.0), arm_len=5 + (step % 3))
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=2.0, pelvis_dy=-min(6.0, f * 0.8), body_tilt_deg=-2.0 - f * 0.4,
            grip_rel_sh=(6.5, -6.5 - f * 0.25), weapon_deg=-86.0 + math.sin(f * 0.6) * 2.0, glaive_len=46.0,
            scarf_deg=156.0 - f * 2.0, scarf_len=33.0, scarf_phase=f * 0.8, scarf_amp=4.0,
            rune_phase=f * 0.9, bend_l=-1.0, bend_r=-1.0, post_fn=post_asc,
        ))

    # F09..F16: Coronation Command + Snowflake Sanctuary Circle
    for sub in range(8):
        def post_cmd(arr, _n, _g, s=sub):
            if s <= 4:
                draw_snowflake_magic_circle_160(
                    arr, cx=108.0, cy=58.0, rx=12.5 - s * 1.2, ry=24.0 - s * 2.0,
                    phase=0.5 + s * 0.45, aurora_dominant=(s % 2 == 0), double_ring=(s <= 2),
                )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=6.5 - sub * 0.4, pelvis_dy=-6.0, body_tilt_deg=-1.5,
            grip_rel_sh=(12.5, -2.0 + sub * 0.5), weapon_deg=-16.0 + sub * 3.0, glaive_len=49.0,
            scarf_deg=168.0 + sub * 2.5, scarf_len=34.0, scarf_phase=sub * 0.9, scarf_amp=4.4,
            rune_phase=sub * 1.0, post_fn=post_cmd,
        ))

    # F17..F23: Iconic Vertical Sovereign Scepter-Tap!
    for sub in range(7):
        hoist_y = -11.0 + (sub / 6.0) * 16.0
        def post_tap(arr, _n, grip, s=sub):
            if s >= 4:
                draw_star_glint_160(arr, grip[0] + 1.0, min(110.0, grip[1] + 26.0), arm_len=6 + (s - 4) * 2, core_r=2.0)
                draw_ice_sparks_160(arr, impact_x=grip[0] + 1.0, ground_y=114.0, spread=28.0, progress=(s - 4) / 3.0, count=9)
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=2.0, pelvis_dy=-5.0 + (1.5 if sub >= 5 else 0.0),
            torso_deg=1.5 if sub >= 4 else -2.5, head_deg=2.0,
            mane_deg=2.0, mane_wave_ph=sub * 0.8, mane_wave_amp=9.0,
            l_coat_deg=6.0 + sub * 1.2, r_coat_deg=-3.0 - sub * 1.0,
            coat_wave_ph=sub * 0.8, coat_wave_amp=9.5,
            grip_rel_sh=(14.5, hoist_y), weapon_deg=90.0, glaive_len=45.0, weapon_layer="front",
            scarf_deg=160.0 + sub * 3.0, scarf_len=33.0, scarf_phase=sub * 0.9, scarf_amp=4.2,
            rune_phase=sub * 1.1,
            post_fn=post_tap,
        ))

    # F24..F29: Eternal Borealis Shatter Shock & Sovereign Descent
    for sub in range(6):
        def post_fin(arr, _n, _g, s=sub):
            if s <= 2:
                draw_snowflake_magic_circle_160(
                    arr, cx=78.0, cy=108.0, rx=28.0 + s * 6.0, ry=6.5,
                    phase=s * 0.7, aurora_dominant=True, double_ring=False,
                )
            draw_ice_sparks_160(arr, impact_x=78.0, ground_y=114.0, spread=32.0, progress=(s + 1) / 6.0, count=8 - s)

        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=1.5 * (1.0 - sub / 5.0), pelvis_dy=math.sin((sub / 5.0) * math.pi) * 1.2,
            torso_deg=0.0, head_deg=0.0,
            mane_deg=math.sin(sub) * 2.5, mane_wave_ph=sub * 0.7, mane_wave_amp=8.5,
            l_coat_deg=5.0, r_coat_deg=-2.0, coat_wave_ph=sub * 0.7, coat_wave_amp=8.5,
            grip_rel_sh=(12.5, 6.5), weapon_deg=86.0 - sub * 16.0, glaive_len=47.0, weapon_layer="front",
            scarf_deg=168.0, scarf_len=31.0, scarf_phase=sub * 0.8, scarf_amp=3.8,
            rune_phase=sub * 0.9, lock_lowest_to_ground=True, post_fn=post_fin,
        ))

    assert len(frames) == 30
    return frames


def build_row5_death(parts, sj):
    """Row 5: HURT ([150, 6]) & DEATH ([150, 30]) -- Skate-Recoil -> Collapse -> Prone Rest."""
    frames = []
    for f in range(30):
        show_halo = f < 16
        if f < 6:
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
            s_len = 29.0
            s_deg = 14.0 + f * 6.0
        elif f < 14:
            u = (f - 6) / 7.0
            pdx = -4.5 - u * 3.0
            pdy = 2.0 + u * 18.0
            tdeg = -12.0 + u * 44.0
            hdeg = -8.0 + u * 22.0
            l_th, l_sh = -30.0 * u, 54.0 * u
            r_th, r_sh = -24.0 * u, 50.0 * u
            wdeg = -45.0 + u * 68.0
            gr = (8.0 + u * 4.0, 6.0 + u * 5.0)
            w_abs = None
            s_len = 26.0 * (1.0 - 0.3 * u)
            s_deg = 155.0 + u * 15.0
        elif f < 22:
            u = (f - 14) / 7.0
            pdx = -7.5 + u * 8.5
            pdy = 20.0 + u * 14.0
            tdeg = 32.0 + u * 55.0
            hdeg = 14.0 - u * 10.0
            l_th, l_sh = -30.0 * (1.0 - 0.75 * u), 54.0 * (1.0 - 0.75 * u)
            r_th, r_sh = -24.0 * (1.0 - 0.75 * u), 50.0 * (1.0 - 0.75 * u)
            wdeg = 23.0 * (1.0 - u) + 2.0 * u
            gr = (12.0, 11.0)
            w_abs = (74.0 + u * 10.0, 102.0 + u * 4.0)
            s_len = 18.0 * (1.0 - 0.6 * u)
            s_deg = 174.0
        else:
            u = (f - 22) / 7.0
            pdx = 1.0
            pdy = 34.0
            tdeg = 87.5 + math.sin(u * math.pi) * 0.8
            hdeg = 4.0
            l_th, l_sh = -7.0, 12.0
            r_th, r_sh = -5.0, 10.0
            wdeg = 1.5
            gr = (12.0, 11.0)
            w_abs = (84.0, 106.0)
            s_len = 8.0
            s_deg = 178.0 - u * 4.0

        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=pdx, pelvis_dy=pdy,
            torso_deg=tdeg, head_deg=hdeg,
            mane_deg=-tdeg * 0.25, mane_wave_ph=f * 0.45, mane_wave_amp=5.0,
            l_coat_deg=max(-25.0, -tdeg * 0.35), r_coat_deg=max(-20.0, -tdeg * 0.25),
            coat_wave_ph=f * 0.45, coat_wave_amp=4.5,
            l_thigh_deg=l_th, l_shin_deg=l_sh,
            r_thigh_deg=r_th, r_shin_deg=r_sh,
            grip_rel_sh=gr, weapon_deg=wdeg, glaive_len=46.0,
            weapon_layer="front", weapon_abs_160=w_abs,
            scarf_deg=s_deg, scarf_len=s_len, scarf_phase=f * 0.65, scarf_amp=2.4,
            rune_phase=f * 0.7, show_halo=show_halo, lock_lowest_to_ground=True,
        ))
    return frames


def build_row6_dash(parts, sj, keyposes):
    """Row 6: DASH -- High-Speed Arabesque Hydroblade Skating Blitz (30 Frames)."""
    frames = []
    for f in range(30):
        ph = (f / 10.0) * 2.0 * math.pi
        def post_dash(arr, neck, _g, step=f):
            for k in range(3):
                sy = int(neck[1] + 6 + k * 14 + ((step * 3 + k * 5) % 5))
                sx0 = 8 + ((step * 7 + k * 11) % 16)
                for dx in range(10 + (k % 2) * 4):
                    put_px_160(arr, sx0 + dx, sy, C_CRYO_SKY if dx > 5 else C_AURORA_VIOLET)
            draw_ice_sparks_160(arr, impact_x=24.0 + (step % 4) * 2.0, ground_y=114.0, spread=12.0, progress=(step % 5) / 5.0, count=4)

        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K2_LUNGE",
            pelvis_dx=9.5 + math.sin(ph) * 1.2,
            pelvis_dy=0.8 + math.cos(ph) * 0.8,
            body_tilt_deg=5.0 + math.sin(ph) * 1.5,
            grip_rel_sh=(-3.5, 4.5),
            weapon_deg=158.0 + math.sin(ph) * 3.0,
            glaive_len=48.0,
            weapon_layer="behind",
            scarf_deg=178.0 + math.sin(ph) * 3.5,
            scarf_len=35.0,
            scarf_phase=(f / 30.0) * 6.0 * math.pi,
            scarf_amp=4.5,
            rune_phase=(f / 30.0) * 6.0 * math.pi,
            post_fn=post_dash,
        ))
    return frames


def build_row7_crouch(parts, sj, keyposes):
    """Row 7: CROUCH -- Hydroblade Mirror-Wall Guard -> Borealis Prism Scepter Counter-Cast!"""
    frames = []
    for f in range(10):
        ph = (f / 10.0) * 2.0 * math.pi
        def post_guard(arr, _n, grip, step=f):
            if 2 <= step <= 8:
                draw_snowflake_magic_circle_160(
                    arr, cx=grip[0] + 18.0, cy=grip[1] - 4.0, rx=7.5, ry=18.5,
                    phase=step * 0.5, aurora_dominant=(step % 2 == 0), double_ring=False,
                )
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=2.0, pelvis_dy=8.5 + math.sin(ph) * 0.8,
            torso_deg=8.0 + math.sin(ph) * 1.2, head_deg=-6.0,
            mane_deg=-4.0, mane_wave_ph=ph, mane_wave_amp=6.5,
            l_coat_deg=8.0, r_coat_deg=4.0, coat_wave_ph=ph, coat_wave_amp=7.0,
            l_thigh_deg=-22.0, l_shin_deg=38.0, l_foot_deg=-12.0,
            r_thigh_deg=-26.0, r_shin_deg=42.0, r_foot_deg=-14.0,
            grip_rel_sh=(11.5, 2.0 + math.sin(ph) * 0.6),
            weapon_deg=-68.0 + math.sin(ph) * 2.0,
            glaive_len=48.0, weapon_layer="front",
            scarf_deg=168.0 + math.sin(ph) * 4.0, scarf_len=29.0, scarf_phase=ph * 2.0, scarf_amp=3.2,
            rune_phase=f * 0.7, lock_lowest_to_ground=True, post_fn=post_guard,
        ))

    for sub in range(3):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K1_COIL",
            pelvis_dx=-1.0 - sub * 1.2, pelvis_dy=2.0, body_tilt_deg=-3.0 - sub * 1.5,
            grip_rel_sh=(4.5, -3.5), weapon_deg=-58.0 - sub * 8.0, glaive_len=48.0,
            scarf_deg=160.0, scarf_len=30.0, scarf_phase=sub * 0.8, scarf_amp=3.8,
            rune_phase=sub * 0.9, bend_l=-1.0, bend_r=-1.0,
        ))

    for sub in range(10):
        def post_riposte(arr, _n, _g, s=sub):
            if s <= 3:
                draw_snowflake_magic_circle_160(
                    arr, cx=108.0, cy=62.0, rx=11.0 - s * 1.5, ry=22.0 - s * 2.5,
                    phase=0.4 + s * 0.5, aurora_dominant=True, double_ring=(s <= 1),
                )
                if s <= 1:
                    draw_borealis_cast_projection_160(
                        arr, origin_x=108.0, origin_y=62.0, reach_x=150.0, mode="comet", progress=s * 0.45, phase=s * 0.7
                    )
        pose_nm = "K2_LUNGE" if sub == 0 else "K3_RISE"
        wdeg = 2.0 if sub == 0 else (-8.0 - max(0, sub - 4) * 5.0)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, pose_nm,
            pelvis_dx=7.5 - max(0, sub - 5) * 0.8, pelvis_dy=0.5, body_tilt_deg=-2.0 + sub * 0.4,
            grip_rel_sh=(13.0, -2.5 + max(0, sub - 5) * 1.0), weapon_deg=wdeg, glaive_len=49.0,
            scarf_deg=154.0 + sub * 3.0, scarf_len=32.0, scarf_phase=1.0 + sub * 0.7, scarf_amp=4.0,
            rune_phase=sub * 0.8, post_fn=post_riposte,
        ))

    for sub in range(7):
        u = (sub + 1) / 7.0
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=4.5 * (1.0 - u) + 2.0 * u, pelvis_dy=8.5 * u,
            torso_deg=8.0 * u, head_deg=-6.0 * u,
            mane_deg=-4.0, mane_wave_ph=sub * 0.6, mane_wave_amp=6.5,
            l_coat_deg=8.0, r_coat_deg=4.0, coat_wave_ph=sub * 0.6, coat_wave_amp=7.0,
            l_thigh_deg=-22.0 * u, l_shin_deg=38.0 * u, l_foot_deg=-12.0 * u,
            r_thigh_deg=-26.0 * u, r_shin_deg=42.0 * u, r_foot_deg=-14.0 * u,
            grip_rel_sh=(11.5, 2.5), weapon_deg=-68.0, glaive_len=48.0,
            scarf_deg=170.0, scarf_len=29.0, scarf_phase=sub * 0.7, scarf_amp=3.2,
            rune_phase=sub * 0.7, lock_lowest_to_ground=True,
        ))

    assert len(frames) == 30
    return frames


def build_row8_jump(parts, sj, keyposes):
    """Row 8: JUMP / DODGE -- Triple-Axel Vault -> Airborne Snowflake Circle Cast -> Skate Landing."""
    frames = []
    for f in range(4):
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=2.0, pelvis_dy=3.0 + f * 2.0,
            torso_deg=10.0 + f * 2.0, head_deg=-6.0,
            mane_deg=-6.0, mane_wave_ph=f * 0.6, mane_wave_amp=7.0,
            l_coat_deg=10.0, r_coat_deg=6.0, coat_wave_ph=f * 0.6, coat_wave_amp=7.5,
            l_thigh_deg=-18.0 - f * 4.0, l_shin_deg=34.0 + f * 5.0,
            r_thigh_deg=-20.0 - f * 4.0, r_shin_deg=36.0 + f * 5.0,
            grip_rel_sh=(-3.5, 8.0), weapon_deg=152.0, glaive_len=48.0, weapon_layer="behind",
            scarf_deg=172.0, scarf_len=29.0, scarf_phase=f * 0.7, scarf_amp=3.2,
            rune_phase=f * 0.7, lock_lowest_to_ground=True,
        ))

    for sub in range(9):
        t = sub / 8.0
        pdy = -8.0 - math.sin(t * math.pi * 0.65) * 14.0
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K4_LEAP",
            pelvis_dx=4.0 + sub * 0.4, pelvis_dy=pdy, body_tilt_deg=-4.0 - sub * 0.4,
            grip_rel_sh=(6.0, -6.5), weapon_deg=-64.0 - sub * 2.0, glaive_len=48.0,
            scarf_deg=128.0 - sub * 1.5, scarf_len=33.0, scarf_phase=sub * 0.8, scarf_amp=4.2,
            rune_phase=sub * 0.8, bend_l=-1.0, bend_r=-1.0,
        ))

    for sub in range(8):
        pdy = -20.0 + sub * 2.4
        def post_air(arr, _n, _g, s=sub):
            if s <= 3:
                draw_snowflake_magic_circle_160(
                    arr, cx=108.0, cy=54.0 + s * 2.5, rx=10.5 - s * 1.5, ry=20.0 - s * 2.5,
                    phase=0.5 + s * 0.5, aurora_dominant=(s % 2 == 1), double_ring=(s <= 1),
                )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K4_LEAP",
            pelvis_dx=7.0, pelvis_dy=pdy, body_tilt_deg=4.5,
            grip_rel_sh=(13.5, 2.0), weapon_deg=12.0 + min(3, sub) * 2.0, glaive_len=49.0,
            scarf_deg=142.0 + sub * 5.0, scarf_len=33.0, scarf_phase=2.0 + sub * 0.8, scarf_amp=4.4,
            rune_phase=sub * 0.9, post_fn=post_air,
        ))

    for sub in range(9):
        u = sub / 8.0
        comp = math.sin(min(1.0, u * 1.6) * math.pi) * 6.0 * (1.0 - 0.5 * u)
        def post_land(arr, _n, _g, s=sub):
            if s <= 2:
                draw_ice_sparks_160(arr, impact_x=64.0, ground_y=114.0, spread=18.0, progress=s / 3.0, count=5)
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=5.5 * (1.0 - u), pelvis_dy=comp,
            torso_deg=8.0 * (1.0 - u), head_deg=-4.5 * (1.0 - u),
            mane_deg=-4.0, mane_wave_ph=sub * 0.6, mane_wave_amp=7.5,
            l_coat_deg=8.0 * (1.0 - u) + 3.0, r_coat_deg=4.0 * (1.0 - u),
            coat_wave_ph=sub * 0.6, coat_wave_amp=8.0,
            l_thigh_deg=-16.0 * (1.0 - u), l_shin_deg=28.0 * (1.0 - u),
            r_thigh_deg=-18.0 * (1.0 - u), r_shin_deg=30.0 * (1.0 - u),
            grip_rel_sh=(10.5, 8.2), weapon_deg=-24.0 * u + 16.0 * (1.0 - u), glaive_len=49.0,
            scarf_deg=168.0, scarf_len=29.0, scarf_phase=sub * 0.7, scarf_amp=3.4,
            rune_phase=sub * 0.7, lock_lowest_to_ground=True, post_fn=post_land,
        ))

    assert len(frames) == 30
    return frames


def build_row9_victory(parts, sj, keyposes):
    """Row 9: VICTORY -- Skating Pirouette Flourish -> Sovereign Snowflake Scepter Plant & Coronation Loop!"""
    frames = []
    for f in range(7):
        wdeg = -18.0 - f * 14.0
        def post_fl(arr, _n, _g, s=f):
            if 2 <= s <= 5:
                draw_snowflake_magic_circle_160(
                    arr, cx=96.0, cy=56.0, rx=9.0, ry=17.0,
                    phase=s * 0.55, aurora_dominant=(s % 2 == 0), double_ring=False,
                )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=4.0 - f * 0.4, pelvis_dy=-f * 0.3, body_tilt_deg=-f * 0.5,
            grip_rel_sh=(10.0 - f * 0.6, 2.0 - f * 1.4), weapon_deg=wdeg, glaive_len=49.0,
            scarf_deg=164.0 - f * 3.0, scarf_len=32.0, scarf_phase=f * 0.8, scarf_amp=3.8,
            rune_phase=f * 0.9, bend_l=-1.0, bend_r=-1.0, post_fn=post_fl,
        ))

    for sub in range(6):
        u = (sub + 1) / 6.0
        plant_y = 66.0 + u * 12.0
        def post_plant(arr, _n, _g, s=sub):
            if s >= 4:
                draw_ice_sparks_160(arr, impact_x=74.0, ground_y=114.0, spread=20.0, progress=(s - 4) * 0.35 + 0.15, count=7)
                draw_star_glint_160(arr, 74.0, 52.0, arm_len=6)
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=1.5 * (1.0 - u), pelvis_dy=1.2 * math.sin(u * math.pi),
            torso_deg=2.5 * (1.0 - u), head_deg=-1.5,
            mane_deg=-2.5, mane_wave_ph=sub * 0.7, mane_wave_amp=7.5,
            l_coat_deg=5.0, r_coat_deg=-2.0, coat_wave_ph=sub * 0.7, coat_wave_amp=8.0,
            weapon_abs_160=(74.0, plant_y), weapon_deg=-90.0, glaive_len=46.0, weapon_layer="front",
            scarf_deg=162.0 + sub * 2.0, scarf_len=31.0, scarf_phase=sub * 0.8, scarf_amp=3.6,
            rune_phase=sub * 0.9, post_fn=post_plant,
        ))

    for sub in range(17):
        ph = (sub / 17.0) * 2.0 * math.pi
        def post_salute(arr, _n, _g, s=sub, p=ph):
            for m in range(3):
                mx = 68.0 + m * 6.0 + math.sin(p + m * 2.1) * 2.5
                my = 108.0 - ((s * 3 + m * 13) % 38)
                put_px_160(arr, mx, my, C_CRYO_PALE if (s + m) % 2 == 0 else C_AURORA_ORCHID)

        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=0.0, pelvis_dy=math.sin(ph) * 0.8,
            torso_deg=-1.5 + math.sin(ph) * 1.0, head_deg=1.5,
            mane_deg=2.0 + math.sin(ph - 0.6) * 3.5, mane_wave_ph=ph, mane_wave_amp=9.0,
            l_coat_deg=6.0 + math.sin(ph - 0.5) * 5.0, r_coat_deg=-2.0 + math.cos(ph) * 3.5,
            coat_wave_ph=ph, coat_wave_amp=9.5,
            weapon_abs_160=(74.0, 78.0), weapon_deg=-90.0, glaive_len=46.0, weapon_layer="front",
            scarf_deg=166.0 + math.sin(ph - 0.4) * 5.0, scarf_len=33.0, scarf_phase=ph * 2.0, scarf_amp=4.2,
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
    row2_snap_front_px = {}

    for r_idx, row_frames in enumerate(all_rows_160):
        assert len(row_frames) == COLS, f"Row {r_idx} has {len(row_frames)} frames"
        trans = 0
        for c_idx, fr160 in enumerate(row_frames):
            a = fr160[:, :, 3] > 128
            clean160 = np.zeros_like(fr160)
            clean160[a, :3] = fr160[a, :3]
            clean160[a, 3] = 255

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

            cell_im = Image.fromarray(clean160, "RGBA").resize((CELL_W, CELL_H), Image.Resampling.NEAREST)
            if r_idx == 2 and c_idx in (3, 9, 17, 25):
                c_arr = np.array(cell_im)
                ca = c_arr[:, :, 3] > 0
                c_xs = np.where(ca)[1]
                row2_snap_reaches_320[c_idx] = int(c_xs.max()) if len(c_xs) else 0
                row2_snap_front_px[c_idx] = int(ca[:, 201:].sum())

            if c_idx > 0:
                prev_a = row_frames[c_idx - 1]
                if not np.array_equal(clean160, prev_a):
                    trans += 1

            sheet.paste(cell_im, (c_idx * CELL_W, r_idx * CELL_H))

        row_transitions.append(trans)

    sheet.save(OUT_SHEET_PNG)
    print(f"[Sheet] Saved {OUT_SHEET_PNG} ({sheet.size[0]}x{sheet.size[1]})")
    print(f"[QA] Border clips (4px output safety margin): {clip_count}/300")
    if clip_details:
        print("  Clip details:", clip_details[:10])
    print(f"[QA] Row frame transitions: {row_transitions} (expected [29]*10)")
    print(f"[QA] Row 2 snap-frame front reach x_320 (must be > 200): {row2_snap_reaches_320}")
    print(f"[QA] Row 2 snap-frame front px > 200 (must be >= 240): {row2_snap_front_px}")

    assert sheet.size == (9600, 2400), f"Invalid sheet size: {sheet.size}"
    assert clip_count == 0, f"Border clips detected: {clip_details}"
    assert all(t == 29 for t in row_transitions), f"Static duplicate frames detected: {row_transitions}"
    for snap_f, max_x320 in row2_snap_reaches_320.items():
        assert max_x320 >= 285, f"Row 2 F{snap_f:02d} spell reach too narrow: {max_x320}"
        assert row2_snap_front_px[snap_f] >= 320, f"Row 2 F{snap_f:02d} front px too sparse: {row2_snap_front_px[snap_f]}"

    return sheet


def write_debug_contact_sheets(sheet):
    os.makedirs(SCRATCH_DIR, exist_ok=True)

    r2_cols, r2_rows = 6, 5
    r2_im = Image.new("RGBA", (r2_cols * CELL_W, r2_rows * CELL_H), (18, 22, 36, 255))
    r2_draw = ImageDraw.Draw(r2_im)
    for f in range(30):
        gc = f % r2_cols
        gr = f // r2_cols
        ox, oy = gc * CELL_W, gr * CELL_H
        cell = sheet.crop((f * CELL_W, 2 * CELL_H, (f + 1) * CELL_W, 3 * CELL_H))
        r2_draw.rectangle([ox, oy, ox + CELL_W - 1, oy + CELL_H - 1], outline=(46, 56, 84, 255), width=1)
        r2_draw.line([(ox + 8, oy + ANCHOR_Y_320), (ox + CELL_W - 8, oy + ANCHOR_Y_320)], fill=(58, 72, 108, 255), width=1)
        r2_draw.line([(ox + ANCHOR_X_320, oy + ANCHOR_Y_320 - 10), (ox + ANCHOR_X_320, oy + ANCHOR_Y_320 + 6)], fill=(103, 232, 249, 255), width=1)
        r2_im.alpha_composite(cell, (ox, oy))
        r2_draw.text((ox + 8, oy + 6), f"R2 F{f:02d} (#{60 + f})", fill=(220, 245, 255, 255))

    p_r2 = os.path.join(SCRATCH_DIR, "debug_icemage_ex_row2.png")
    r2_im.save(p_r2)

    r1_im = Image.new("RGBA", (r2_cols * CELL_W, r2_rows * CELL_H), (18, 22, 36, 255))
    r1_draw = ImageDraw.Draw(r1_im)
    for f in range(30):
        gc = f % r2_cols
        gr = f // r2_cols
        ox, oy = gc * CELL_W, gr * CELL_H
        cell = sheet.crop((f * CELL_W, 1 * CELL_H, (f + 1) * CELL_W, 2 * CELL_H))
        r1_draw.rectangle([ox, oy, ox + CELL_W - 1, oy + CELL_H - 1], outline=(46, 56, 84, 255), width=1)
        r1_draw.line([(ox + 8, oy + ANCHOR_Y_320), (ox + CELL_W - 8, oy + ANCHOR_Y_320)], fill=(58, 72, 108, 255), width=1)
        r1_draw.line([(ox + ANCHOR_X_320, oy + ANCHOR_Y_320 - 10), (ox + ANCHOR_X_320, oy + ANCHOR_Y_320 + 6)], fill=(103, 232, 249, 255), width=1)
        r1_im.alpha_composite(cell, (ox, oy))
        r1_draw.text((ox + 8, oy + 6), f"R1 F{f:02d} (#{30 + f})", fill=(220, 245, 255, 255))
    p_r1 = os.path.join(SCRATCH_DIR, "debug_icemage_ex_row1_walk.png")
    r1_im.save(p_r1)
    print(f"[Debug] Saved {p_r1}")

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
                    hd.text((ox + 4, oy + 3), f"R{r} F{c:02d}", fill=(165, 243, 252, 255))
        out_p = os.path.join(SCRATCH_DIR, f"debug_icemage_ex_10rows_{half_nm}.png")
        half_im.save(out_p)
        print(f"[Debug] Saved {out_p}")

    print(f"[Debug] Saved {p_r2}")


def main():
    import sys
    t0 = time.time()
    print("=== Building LYRA EX (icemage_ex) Next-Gen Wide-Canvas Sheet ===")
    if "--rebuild-portrait" in sys.argv or not os.path.exists(OUT_PORTRAIT_PNG):
        build_portrait_128()
    parts, stand_joints, keyposes = load_rig_and_keyposes()

    all_rows_160 = [
        build_row0_idle(parts, stand_joints),
        build_row1_walk(parts, stand_joints),
        build_row2_auto_attack(parts, stand_joints, keyposes),
        build_row3_skill(parts, stand_joints, keyposes),
        build_row4_ultimate(parts, stand_joints, keyposes),
        build_row5_death(parts, stand_joints),
        build_row6_dash(parts, stand_joints, keyposes),
        build_row7_crouch(parts, stand_joints, keyposes),
        build_row8_jump(parts, stand_joints, keyposes),
        build_row9_victory(parts, stand_joints, keyposes),
    ]

    sheet = assemble_and_verify_sheet(all_rows_160)
    write_debug_contact_sheets(sheet)
    print(f"=== Done in {time.time() - t0:.2f}s ===")


if __name__ == "__main__":
    main()
