#!/usr/bin/env python3
"""
Next-Gen Wide-Canvas Sprite Sheet, Portrait, & Visual QA Builder for:
  VEX-09 EX -- Singularity Valkyrie & HF Plasma Odachi Duelist (android_ex)

Architecture (FFBE / Last Cloudia / Grand Summoners Paradigm):
  1. Wide Theatrical Cell Framing:
     - Logical canvas: 160x120 -> 2x NEAREST output: 320x240 per cell
     - Sheet layout: 30 cols x 10 rows = 9600x2400 RGBA PNG
     - Grounded boot/spine anchor: anchor_x_160 = 56 (anchorX = 112),
       anchor_y_120 = 115 (anchorY = 230)
     - Standing hero height: 87 logical px (174px in 320x240), 100% locked scale
       across all 300 frames (zero auto-fit shrinking on wide Odachi slashes).
  2. Surgical Cutout Hygiene + Multi-Keypose 3D Rig:
     - Strips K1 back jet-plume, K2 ground-dust & speed streaks & planted hand,
       K3 cyan hand-slash wisp & raised arm, and K4 boot thruster sparks via
       targeted masks + largest-connected-component before 2-Bone IK assembly.
     - Composites VEX-09 EX's Muramasa-09 High-Frequency Plasma Odachi (112px reach,
       gunmetal cyber-spine + blazing #22d3ee neon-cyan & #ec4899 hot-magenta edge)
       and 4 articulated floating Cyber Fin-Funnel Wing Pylons!
  3. 1-Frame Explosive Snap + 4-Band HF-Plasma Cyber-Glitch Smear Fans:
     - Stepped cel ramp: #ffffff -> #67e8f9 -> #ec4899 -> #311042 cyber-glitch
       teeth + ordered 4x4 Bayer plasma tail.
     - Zero Unicode emojis anywhere; 100% 2x2 integer pixel blocks, binary alpha.
"""

import os
import math
import time
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ex_sprite_clean_utils import clean_512_pose_holes_and_specks, seal_160_char_pinholes_and_leaks, filter_mask_min_area, _fill_enclosed_holes_rgba

try:
    from scipy.ndimage import label as _nd_label
except ImportError:
    _nd_label = None

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES_DIR = os.path.join(ROOT_DIR, "assets", "sprites")
SCRATCH_DIR = "/Users/rei/.gemini/antigravity/brain/5416474b-0e5f-4471-85c8-b7a88055e218/scratch"

BASE_JPG = os.path.join(SPRITES_DIR, "android_ex_base.jpg")
KEYPOSES_JPG = os.path.join(SPRITES_DIR, "android_ex_keyposes_ref.jpg")
PORTRAIT_RAW_JPG = os.path.join(SPRITES_DIR, "android_ex_portrait_raw.jpg")

OUT_SHEET_PNG = os.path.join(SPRITES_DIR, "android_ex_sheet.png")
OUT_PORTRAIT_PNG = os.path.join(SPRITES_DIR, "android_ex_portrait.png")

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

# Constant locked character scale: 477px in 512-space == 87 logical px (174px output)
STAND_H_512 = 477.0
TARGET_STAND_H_LOGICAL = 87.0
S_HI = STAND_H_512 / TARGET_STAND_H_LOGICAL  # 5.4827586 px per logical pixel
HI_W = int(round(LOGICAL_W * S_HI))          # 877
HI_H = int(round(LOGICAL_H * S_HI))          # 658
ANCHOR_HI_X = ANCHOR_X_160 * S_HI
ANCHOR_HI_Y = ANCHOR_Y_120 * S_HI

# 26-Color Singularity Valkyrie Master Palette
MASTER_PALETTE_ANDROID_EX = np.array([
    [10, 12, 28],     # 0: Deep obsidian cyber-ink Selout (#0a0c1c)
    [22, 26, 52],     # 1: Lit titanium-navy Selout (#161a34)
    [42, 40, 74],     # 2: Soft violet-slate hair/wing Selout (#2a284a)
    [56, 64, 96],     # 3: Dark gunmetal exosuit carbon (#384060)
    [98, 110, 148],   # 4: Gunmetal steel shadow (#626e94)
    [154, 168, 206],  # 5: Titanium-silver midtone (#9aa8ce)
    [214, 224, 246],  # 6: Bright white-titanium armor plate (#d6e0f6)
    [248, 251, 255],  # 7: Specular ceramic-white highlight (#f8fbff)
    [122, 108, 168],  # 8: Lilac-silver hair shadow (#7a6ca8)
    [178, 164, 220],  # 9: Lilac-silver hair midtone (#b2a4dc)
    [224, 214, 250],  # 10: Bright lilac hair highlight (#e0d6fa)
    [8, 116, 152],    # 11: Deep cyber-teal visor shadow (#087498)
    [14, 165, 212],   # 12: Mid neon-cyan circuit (#0ea5d4)
    [34, 211, 238],   # 13: Blazing neon-cyan visor/plasma (#22d3ee)
    [103, 232, 249],  # 14: Electric sky-cyan crest (#67e8f9)
    [224, 252, 255],  # 15: White-cyan laser core (#e0fcff)
    [49, 16, 66],     # 16: Deep singularity cyber-plum (#311042)
    [112, 24, 82],    # 17: Dark magenta wing-core (#701852)
    [190, 24, 93],    # 18: Crimson-magenta overdrive (#be185d)
    [236, 72, 153],   # 19: Blazing hot-magenta plasma (#ec4899)
    [249, 168, 212],  # 20: Neon pink-orchid flare (#f9a8d4)
    [168, 92, 246],   # 21: Cyber-violet hard-light (#a85cf6)
    [255, 255, 255],  # 22: Pure razor plasma white (#ffffff)
    [178, 114, 92],   # 23: Valkyrie skin shadow (#b2725c)
    [232, 168, 142],  # 24: Valkyrie skin midtone (#e8a88e)
    [252, 216, 198],  # 25: Valkyrie skin highlight (#fcd8c6)
], dtype=np.int32)

C_OUT_DARK = (10, 12, 28, 255)
C_OUT_LIT = (22, 26, 52, 255)
C_GUNMETAL_DARK = (56, 64, 96, 255)
C_GUNMETAL_MID = (98, 110, 148, 255)
C_TITANIUM_MID = (154, 168, 206, 255)
C_TITANIUM_LIT = (214, 224, 246, 255)
C_TITANIUM_SPEC = (248, 251, 255, 255)

C_CYAN_DEEP = (8, 116, 152, 255)
C_CYAN_NEON = (34, 211, 238, 255)
C_CYAN_CREST = (103, 232, 249, 255)
C_CYAN_WHITE = (224, 252, 255, 255)

C_PLUM_GLITCH = (49, 16, 66, 255)
C_MAG_DARK = (112, 24, 82, 255)
C_MAG_MID = (190, 24, 93, 255)
C_MAG_HOT = (236, 72, 153, 255)
C_MAG_PINK = (249, 168, 212, 255)
C_PURE_WHITE = (255, 255, 255, 255)

BAYER4 = (np.array([
    [0,  8,  2, 10],
    [12, 4, 14,  6],
    [3, 11,  1,  9],
    [15, 7, 13,  5],
], dtype=np.float32) + 0.5) / 16.0


# ==============================================================================
# 1. MASK, HYGIENE, PINHOLE, & CEL-QUANTIZATION UTILITIES
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


def clean_pose_512(im_rgba_512, pocket_seeds=(), strip_polys=(), extra_mask_fn=None, head_y_split=152):
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
            if px[3] > 0 and px[0] > 210 and px[1] > 210 and px[2] > 210:
                ImageDraw.floodfill(im, (sx, sy), (0, 0, 0, 0), thresh=38)

    arr = np.array(im)
    for poly in strip_polys:
        arr[poly_mask(H, W, poly)] = [0, 0, 0, 0]

    if extra_mask_fn is not None:
        arr = extra_mask_fn(arr)

    for _ in range(4):
        a = arr[:, :, 3] > 0
        up = np.pad(a[1:, :], ((0, 1), (0, 0)), constant_values=False)
        dn = np.pad(a[:-1, :], ((1, 0), (0, 0)), constant_values=False)
        lf = np.pad(a[:, 1:], ((0, 0), (0, 1)), constant_values=False)
        rt = np.pad(a[:, :-1], ((0, 0), (1, 0)), constant_values=False)
        edge = a & (~(up & dn & lf & rt))
        r = arr[:, :, 0].astype(np.int16)
        g = arr[:, :, 1].astype(np.int16)
        b = arr[:, :, 2].astype(np.int16)
        fringe = edge & (r > 180) & (g > 180) & (b > 180) & (np.abs(r - g) < 28) & (np.abs(g - b) < 28)
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
    vivid_neon = alpha & (((b0 - r0) > 42) & (g0 > 150) | ((r0 - g0) > 55) & (r0 > 160))
    arr[:, :, :3] = np.where(alpha[:, :, None], np.where(vivid_neon[:, :, None], arr[:, :, :3], cel_rgb), 0)
    arr[alpha, 3] = 255
    filled = fill_interior_pinholes_rgba(arr, max_hole_px=14)
    return clean_512_pose_holes_and_specks(filled, max_hole_area=180, min_island_area=36)


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
    palette=MASTER_PALETTE_ANDROID_EX,
    protect_indices=(12, 13, 14, 18, 19, 20, 23, 24, 25),
    hair_indices=(8, 9, 10),
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

    idx_map[body_edge & (~shadow_side)] = 1
    idx_map[body_edge & shadow_side] = 0
    idx_map[hair_edge & (~shadow_side)] = 1
    idx_map[hair_edge & shadow_side] = 2

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
    face_focus = (xx >= 220) & (xx <= 820) & (yy >= 120) & (yy <= 920)
    blended = np.where(face_focus[:, :, None], med3, med5)

    im256 = Image.fromarray(blended, "RGB").resize((256, 256), Image.Resampling.BOX)
    im256 = im256.filter(ImageFilter.MedianFilter(size=3))
    im128 = im256.resize((128, 128), Image.Resampling.NEAREST)
    src128 = np.array(im128)

    q128 = im128.quantize(colors=28, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert("RGB")
    out128 = np.array(q128)

    r = src128[:, :, 0].astype(np.int16)
    g = src128[:, :, 1].astype(np.int16)
    b = src128[:, :, 2].astype(np.int16)
    lum = (r * 2 + g * 5 + b * 3) // 10

    # Preserve crisp warm Valkyrie skin tones below visor
    yy128, xx128 = np.mgrid[0:128, 0:128]
    skin_mask = ((r - b) >= 18) & ((r - g) >= 10) & (r >= 150) & (g >= 100) & (xx128 >= 42) & (xx128 <= 92) & (yy128 >= 24) & (yy128 <= 66)
    out128[skin_mask & (lum >= 220)] = [252, 218, 200]
    out128[skin_mask & (lum >= 185) & (lum < 220)] = [242, 188, 164]
    out128[skin_mask & (lum >= 150) & (lum < 185)] = [220, 152, 126]
    out128[skin_mask & (lum < 150)] = [178, 114, 92]

    # Restore blazing neon-cyan on visor, shoulder core, chest core, & Plasma Odachi
    cyan_mask = ((b - r) > 48) & (g > 165)
    out128[cyan_mask & (lum >= 225)] = [255, 255, 255]
    out128[cyan_mask & (lum >= 175) & (lum < 225)] = [103, 232, 249]
    out128[cyan_mask & (lum < 175)] = [34, 211, 238]

    # Restore hot-magenta on Odachi spine, ear-pod, & chest ring (require b > g so warm skin never turns pink!)
    mag_mask = ((r - g) > 55) & ((b - g) >= 18) & (r > 165) & (b > 115)
    out128[mag_mask & (lum >= 185)] = [249, 168, 212]
    out128[mag_mask & (lum < 185)] = [236, 72, 153]

    rgba128 = np.zeros((128, 128, 4), dtype=np.uint8)
    rgba128[:, :, :3] = out128
    rgba128[:, :, 3] = 255
    out_im = Image.fromarray(rgba128, "RGBA")
    out_im.save(OUT_PORTRAIT_PNG)

    os.makedirs(SCRATCH_DIR, exist_ok=True)
    preview = out_im.resize((384, 384), Image.Resampling.NEAREST)
    preview.save(os.path.join(SCRATCH_DIR, "debug_android_ex_portrait.png"))
    print(f"[Portrait] Saved {OUT_PORTRAIT_PNG} (128x128)")


# ==============================================================================
# 3. SEGMENTATION OF STAND (15 PARTS) + 4 SURGICALLY CLEANED 3D KEYPOSES
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


def darken_part_tuple(part_tuple, factor=0.86):
    im, x0, y0 = part_tuple
    arr = np.array(im, dtype=np.float32)
    a = arr[:, :, 3] > 128
    arr[a, :3] = np.clip(arr[a, :3] * factor, 0, 255)
    return (Image.fromarray(arr.astype(np.uint8), "RGBA"), x0, y0)


def _clean_k1_extra(arr):
    H, W = arr.shape[:2]
    jet_box = poly_mask(H, W, [(190, 174), (235, 174), (232, 226), (190, 226)])
    lum = (arr[:, :, 0].astype(np.int16) + arr[:, :, 1].astype(np.int16) + arr[:, :, 2].astype(np.int16)) // 3
    arr[jet_box & (lum > 155)] = [0, 0, 0, 0]
    return arr


def _clean_k2_extra(arr):
    H, W = arr.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    sat = maxc - minc
    left_speed_zone = (
        ((yy < 274) & (xx < 312) & (~poly_mask(H, W, [(252, 232), (320, 200), (320, 276), (252, 276)])))
        | ((yy >= 274) & (yy < 316) & (xx < 142))
        | ((yy >= 384) & (yy < 414) & (xx < 86))
    )
    arr[left_speed_zone & (sat < 42) & (maxc > 115)] = [0, 0, 0, 0]
    front_leg_keep = poly_mask(H, W, [(340, 300), (498, 300), (498, 472), (424, 472), (382, 360), (340, 348)])
    rear_leg_keep = poly_mask(H, W, [(16, 316), (294, 316), (254, 396), (176, 412), (104, 468), (16, 468)])
    mid_dust_zone = (yy >= 348) & (~front_leg_keep) & (~rear_leg_keep)
    arr[mid_dust_zone] = [0, 0, 0, 0]
    return arr


def _clean_k4_extra(arr):
    H, W = arr.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    boot_keep = poly_mask(H, W, [
        (230, 240), (380, 240), (380, 336), (324, 424), (274, 422),
        (258, 388), (252, 406), (218, 404), (218, 344)
    ])
    arr[(yy >= 342) & (~boot_keep)] = [0, 0, 0, 0]
    calf_gap = (xx >= 246) & (xx <= 276) & (yy >= 338) & (yy <= 410) & (r > 188) & (g > 205) & (b > 220)
    arr[calf_gap] = [0, 0, 0, 0]
    return arr


def load_rig_and_keyposes():
    base_512_raw = Image.open(BASE_JPG).convert("RGBA").resize((512, 512), Image.Resampling.NEAREST)
    stand_arr = clean_pose_512(
        base_512_raw,
        pocket_seeds=[(210, 148), (168, 146)],
        strip_polys=[],
        head_y_split=126,
    )
    alpha = stand_arr[:, :, 3] > 128
    H, W = alpha.shape

    raw_masks = [
        ("head", poly_mask(H, W, [(216, 22), (318, 22), (318, 122), (286, 124), (236, 118), (214, 78)])),
        ("mane", poly_mask(H, W, [(190, 34), (226, 34), (238, 116), (190, 116)])),
        ("l_sode", poly_mask(H, W, [(172, 108), (242, 112), (238, 160), (172, 160)])),
        ("l_forearm", poly_mask(H, W, [(134, 132), (244, 132), (244, 174), (134, 174)])),
        ("r_sode", poly_mask(H, W, [(288, 112), (356, 116), (356, 172), (294, 172)])),
        ("r_forearm", poly_mask(H, W, [(342, 92), (440, 92), (440, 180), (342, 180)])),
        ("torso", poly_mask(H, W, [(224, 118), (302, 120), (308, 224), (294, 282), (242, 282), (224, 214)])),
        ("l_thigh", poly_mask(H, W, [(174, 240), (262, 256), (232, 360), (158, 354)])),
        ("l_shin", poly_mask(H, W, [(116, 336), (198, 346), (160, 452), (108, 452)])),
        ("l_foot", poly_mask(H, W, [(92, 424), (158, 424), (158, 506), (92, 506)])),
        ("r_thigh", poly_mask(H, W, [(270, 244), (344, 244), (384, 352), (306, 356)])),
        ("r_shin", poly_mask(H, W, [(326, 338), (396, 338), (404, 452), (336, 452)])),
        ("r_foot", poly_mask(H, W, [(342, 434), (438, 434), (438, 492), (342, 492)])),
        ("l_coat", poly_mask(H, W, [(78, 206), (238, 206), (222, 266), (156, 356), (78, 392)])),
        ("r_coat", poly_mask(H, W, [(310, 214), (414, 214), (414, 348), (376, 348), (338, 268)])),
    ]
    assigned = assign_remaining_geodesic(alpha, raw_masks)
    parts = {nm: extract_crop_tuple(stand_arr, m) for nm, m in assigned}

    parts["l_sode_ik"] = darken_part_tuple(parts["r_sode"], 0.85)
    parts["l_forearm_ik"] = darken_part_tuple(parts["r_forearm"], 0.85)

    stand_joints = {
        "x_ref": 266.0,
        "y_bot": 500.0,
        "pelvis": (268.0, 248.0),
        "neck": (272.0, 122.0),
        "mane": (222.0, 84.0),
        "l_coat": (232.0, 224.0),
        "r_coat": (302.0, 228.0),
        "l_sh": (228.0, 134.0),
        "r_sh": (302.0, 134.0),
        "r_el": (352.0, 162.0),
        "r_grip": (408.0, 122.0),
        "l_hip": (232.0, 264.0),
        "l_knee": (182.0, 348.0),
        "l_ankle": (132.0, 446.0),
        "r_hip": (296.0, 266.0),
        "r_knee": (358.0, 344.0),
        "r_ankle": (378.0, 444.0),
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
            "pocket_seeds": [(206, 142)],
            "strip_polys": [
                [(150, 80), (236, 80), (236, 178), (150, 178)],
                [(312, 138), (434, 112), (434, 222), (308, 222)],
            ],
            "extra_fn": _clean_k1_extra,
            "head_y_split": 138,
            "x_ref": 272.0,
            "y_bot": 500.0,
            "l_sh": (244.0, 142.0),
            "r_sh": (304.0, 152.0),
            "neck": (282.0, 130.0),
            "pelvis": (274.0, 256.0),
        },
        "K2_LUNGE": {
            "pocket_seeds": [(280, 420), (350, 420), (240, 220)],
            "strip_polys": [
                [(110, 184), (296, 184), (276, 266), (110, 266)],
                [(292, 324), (344, 324), (356, 472), (202, 472), (256, 392)],
            ],
            "extra_fn": _clean_k2_extra,
            "head_y_split": 268,
            "x_ref": 286.0,
            "y_bot": 468.0,
            "l_sh": (286.0, 252.0),
            "r_sh": (334.0, 274.0),
            "neck": (346.0, 248.0),
            "pelvis": (274.0, 314.0),
        },
        "K3_RISE": {
            "pocket_seeds": [],
            "strip_polys": [
                [(324, 116), (368, 32), (490, 32), (490, 294), (348, 294), (318, 168)],
                [(306, 206), (364, 206), (364, 252), (306, 252)],
            ],
            "extra_fn": None,
            "head_y_split": 144,
            "x_ref": 272.0,
            "y_bot": 500.0,
            "l_sh": (256.0, 154.0),
            "r_sh": (298.0, 152.0),
            "neck": (282.0, 136.0),
            "pelvis": (274.0, 258.0),
        },
        "K4_LEAP": {
            "pocket_seeds": [],
            "strip_polys": [
                [(120, 132), (218, 142), (210, 254), (120, 254)],
            ],
            "extra_fn": _clean_k4_extra,
            "head_y_split": 134,
            "x_ref": 268.0,
            "y_bot": 420.0,
            "l_sh": (236.0, 132.0),
            "r_sh": (306.0, 146.0),
            "neck": (286.0, 118.0),
            "pelvis": (262.0, 232.0),
        },
    }

    keyposes = {}
    for kname, spec in keypose_specs.items():
        cleaned = clean_pose_512(
            tiles_raw[kname],
            pocket_seeds=spec["pocket_seeds"],
            strip_polys=spec["strip_polys"],
            extra_mask_fn=spec["extra_fn"],
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


def draw_joint_bridge_hi(canvas, p0, p1, r, fill=(22, 26, 52, 255), inner=(56, 64, 96, 255)):
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

    draw_joint_bridge_hi(canvas, sh_dst, el_dst, r=8)
    draw_joint_bridge_hi(canvas, el_dst, hand_dst, r=6)
    paste_rotated_part(canvas, parts[sode_nm], sh_src, sh_dst, deg=(ang1_cur - ang1_rest))
    paste_rotated_part(canvas, parts[fore_nm], el_src, el_dst, deg=(ang2_cur - ang2_rest))
    return hand_dst


# ==============================================================================
# 5. LOGICAL 160x120 PIXEL-ART RENDERERS:
#    - 4 ARTICULATED FLOATING CYBER FIN-FUNNEL WING PYLONS
#    - MURAMASA-09 HIGH-FREQUENCY PLASMA ODACHI (110-116px REACH)
#    - 4-BAND HF-PLASMA CYBER-GLITCH SERRATED SMEARS
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
        col = C_PURE_WHITE if abs(d) <= 2 else (C_CYAN_NEON if abs(d) <= arm_len - 2 else C_MAG_HOT)
        put_px_160(arr, ix + d, iy, col)
        put_px_160(arr, ix, iy + d, col)
    diag = max(1, arm_len // 2)
    for d in range(-diag, diag + 1):
        put_px_160(arr, ix + d, iy + d, C_CYAN_CREST)
        put_px_160(arr, ix + d, iy - d, C_MAG_PINK)
    draw_disc_160(arr, ix, iy, core_r, C_PURE_WHITE)


def draw_cyber_fin_funnels_160(arr, neck_x, neck_y, spread_scale=1.0, phase=0.0, tilt_deg=0.0):
    """
    Renders VEX-09 EX's 4 articulated floating Cyber Fin-Funnel Wing Pylons
    hovering in a V-wing formation behind her shoulders (gunmetal/titanium housing
    + blazing #22d3ee neon-cyan & #ec4899 hot-magenta plasmaemitter slits).
    """
    pylons = [
        # (offset_x, offset_y, deg, length, is_magenta)
        (-9.0, -5.0, -148.0, 22.0, False),
        (-11.0, 3.0, -166.0, 19.0, True),
        (5.0, -7.0, -34.0, 17.0, False),
        (6.0, 1.0, -16.0, 15.0, True),
    ]
    t_rad = math.radians(tilt_deg)
    tc, ts = math.cos(t_rad), math.sin(t_rad)
    for p_idx, (ox, oy, base_deg, base_len, is_mag) in enumerate(pylons):
        bob = math.sin(phase + p_idx * 1.3) * 1.1
        rox = ox * spread_scale
        roy = oy + bob
        if abs(tilt_deg) > 0.01:
            rx = rox * tc - roy * ts
            ry = rox * ts + roy * tc
        else:
            rx, ry = rox, roy
        bx = neck_x + rx
        by = neck_y + ry
        length = base_len * spread_scale
        ang = math.radians(base_deg + tilt_deg + math.sin(phase + p_idx * 0.8) * 2.5)
        ux, uy = math.cos(ang), math.sin(ang)
        nx, ny = -uy, ux

        steps = int(length * 2.2) + 1
        for s in range(steps + 1):
            t = s / max(1, steps)
            px = bx + ux * (t * length)
            py = by + uy * (t * length)
            hw = 2.3 * (1.0 - 0.65 * t)
            put_px_160(arr, px + nx * (hw + 0.9), py + ny * (hw + 0.9), C_OUT_DARK)
            put_px_160(arr, px - nx * (hw + 0.9), py - ny * (hw + 0.9), C_OUT_DARK)
            for k_i in range(-3, 4):
                k = k_i * 0.55
                if abs(k) <= hw:
                    if abs(k) < 0.55 and 0.15 < t < 0.88:
                        col = C_MAG_HOT if is_mag else C_CYAN_NEON
                    elif k < 0:
                        col = C_TITANIUM_LIT
                    else:
                        col = C_GUNMETAL_MID
                    put_px_160(arr, px + nx * k, py + ny * k, col)
        put_px_160(arr, bx + ux * (length + 1.0), by + uy * (length + 1.0), C_OUT_DARK)


def draw_muramasa_plasma_odachi_160(
    arr,
    grip_x,
    grip_y,
    deg,
    blade_len=48.0,
    sori_sign=1.0,
    rune_phase=0.0,
    draw_gauntlets=True,
):
    """
    Draws VEX-09 EX's Muramasa-09 High-Frequency Plasma Odachi (56 logical px
    total = 112px output reach!):
      - Gunmetal cyber-spine (#384060 / #9aa8ce)
      - Curved katana/odachi sori profile
      - Blazing neon-cyan (#22d3ee) + hot-magenta (#ec4899) + razor white plasma edge!
    """
    rad = math.radians(deg)
    ux, uy = math.cos(rad), math.sin(rad)
    # Normal pointing toward cutting edge
    nx, ny = uy * sori_sign, -ux * sori_sign

    pommel_dist = -8.0
    guard_dist = 3.5
    max_reach = 18.0
    for test_len in range(int(blade_len), 17, -1):
        ok = True
        for u_d, n_d in (
            (pommel_dist - 2.5, 0.0),
            (guard_dist + test_len * 0.5, 3.5),
            (guard_dist + test_len * 0.5, -3.5),
            (guard_dist + test_len + 2.5, 3.8 * sori_sign),
            (guard_dist + test_len + 2.5, -2.5 * sori_sign),
        ):
            tx = grip_x + ux * u_d + nx * n_d
            ty = grip_y + uy * u_d + ny * n_d
            if not (9.5 <= tx <= (LOGICAL_W - 10.5) and 9.5 <= ty <= (LOGICAL_H - 7.0)):
                ok = False
                break
        if ok:
            max_reach = float(test_len)
            break
    tip_dist = guard_dist + max_reach

    steps = int((tip_dist - pommel_dist) * 3.0) + 1
    # Pass 1: 1px dark Selout sheath
    for i in range(steps + 1):
        d = pommel_dist + (tip_dist - pommel_dist) * (i / max(1, steps))
        bt = max(0.0, (d - guard_dist) / max(1.0, max_reach))
        curve = (bt ** 1.85) * 2.8 if d >= guard_dist else 0.0
        cx = grip_x + ux * d + nx * curve
        cy = grip_y + uy * d + ny * curve
        hw = 1.2 if d < guard_dist else (2.15 * (1.0 - 0.55 * max(0.0, (bt - 0.82) / 0.18)))
        put_px_160(arr, cx + nx * (hw + 0.9), cy + ny * (hw + 0.9), C_OUT_LIT)
        put_px_160(arr, cx - nx * (hw + 0.9), cy - ny * (hw + 0.9), C_OUT_DARK)

    # Pass 2: Gunmetal cyber-spine + hot-magenta conduit + blazing neon-cyan HF plasma edge
    for i in range(steps + 1):
        d = pommel_dist + (tip_dist - pommel_dist) * (i / max(1, steps))
        if d < guard_dist - 0.4:
            for k in (-0.8, 0.0, 0.8):
                col = C_MAG_HOT if int(abs(d * 1.6)) % 3 == 0 else C_GUNMETAL_DARK
                put_px_160(arr, grip_x + ux * d + nx * k, grip_y + uy * d + ny * k, col)
            continue

        bt = max(0.0, (d - guard_dist) / max(1.0, max_reach))
        curve = (bt ** 1.85) * 2.8
        cx = grip_x + ux * d + nx * curve
        cy = grip_y + uy * d + ny * curve
        hw = 2.05 * (1.0 - 0.65 * max(0.0, (bt - 0.82) / 0.18))
        pulse = 0.5 + 0.5 * math.sin(rune_phase - bt * 6.0)

        for k_s in range(-4, 5):
            off = k_s * 0.48
            if abs(off) > hw:
                continue
            if off >= hw * 0.38:
                col = C_PURE_WHITE if (bt > 0.72 or pulse > 0.65) else C_CYAN_NEON
            elif off >= -0.15:
                col = C_MAG_HOT if bt < 0.85 else C_CYAN_CREST
            else:
                col = C_TITANIUM_MID if off > -hw * 0.6 else C_GUNMETAL_DARK
            put_px_160(arr, cx + nx * off, cy + ny * off, col)

    # Octagonal Cyber-Tsuba Guard + Pommel
    gx = grip_x + ux * guard_dist
    gy = grip_y + uy * guard_dist
    for s_sign in (-1.0, 1.0):
        for w_s in range(1, 8):
            lat = s_sign * (w_s * 0.58)
            put_px_160(arr, gx + nx * lat - ux * 0.8, gy + ny * lat - uy * 0.8, C_OUT_DARK)
            put_px_160(arr, gx + nx * lat, gy + ny * lat, C_CYAN_NEON if s_sign > 0 else C_MAG_HOT)
    put_px_160(arr, gx, gy, C_PURE_WHITE)

    px_pom = grip_x + ux * pommel_dist
    py_pom = grip_y + uy * pommel_dist
    draw_disc_160(arr, px_pom, py_pom, 1.8, C_OUT_DARK)
    put_px_160(arr, px_pom, py_pom, C_MAG_HOT)

    if draw_gauntlets:
        for gd in (-3.6, 1.0):
            hx = grip_x + ux * gd
            hy = grip_y + uy * gd
            draw_sculpted_cyber_hand_160(arr, hx, hy, ux, uy, nx, ny, role="grip")


def draw_sculpted_cyber_hand_160(arr, hx, hy, ux, uy, nx, ny, role="grip"):
    """
    Pixel-by-pixel sculpted Valkyrie cyber-gauntlet hand (0 round circle blobs):
      - "grip": gunmetal cuff + titanium dorsal ridge + neon-cyan knuckle LED + 3 fingers + thumb
      - "visor": slender 2-finger tactical visor touch + compact titanium palm
    """
    if role == "visor":
        pts = [
            (-1.2,  0.5, C_GUNMETAL_DARK),
            (-0.4,  0.0, C_TITANIUM_MID),
            ( 0.4, -0.4, C_TITANIUM_LIT),
            ( 0.4,  0.6, C_TITANIUM_MID),
            ( 1.3, -0.8, C_CYAN_NEON),
            ( 1.3,  0.2, C_TITANIUM_LIT),
            (-0.2,  1.1, C_TITANIUM_MID),
        ]
    else:
        pts = [
            (-1.2, -0.5, C_GUNMETAL_DARK),
            (-1.2,  0.5, C_GUNMETAL_DARK),
            (-0.4, -1.2, C_TITANIUM_LIT),  # opposed thumb along upper hilt
            (-0.4,  0.0, C_TITANIUM_LIT),  # titanium dorsal plate
            ( 0.4, -0.8, C_CYAN_NEON),     # index knuckle LED + cyber finger
            ( 0.4,  0.2, C_TITANIUM_LIT),  # middle finger
            ( 0.4,  1.1, C_TITANIUM_MID),  # ring finger
            ( 1.2, -0.6, C_TITANIUM_MID),  # curled tips across Muramasa shaft
            ( 1.2,  0.3, C_TITANIUM_MID),
        ]

    resolved: dict[tuple[int, int], tuple[int, int, int, int]] = {}
    for ou, ov, col in pts:
        px = int(round(hx + ux * ou + nx * ov))
        py = int(round(hy + uy * ou + ny * ov))
        resolved[(px, py)] = col

    for px, py in resolved:
        for ox, oy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sx_p, sy_p = px + ox, py + oy
            if (sx_p, sy_p) in resolved:
                continue
            if MARGIN_LOGICAL <= sx_p < LOGICAL_W - MARGIN_LOGICAL and MARGIN_LOGICAL <= sy_p < LOGICAL_H - MARGIN_LOGICAL:
                if arr[sy_p, sx_p, 3] == 0:
                    arr[sy_p, sx_p] = C_OUT_DARK

    for (px, py), col in resolved.items():
        put_px_160(arr, px, py, col)


def draw_hf_plasma_smear_160(
    arr,
    cx,
    cy,
    tail_deg,
    lead_deg,
    sweep_dir=1,
    rx_outer=73.0,
    ry_outer=50.0,
    max_thickness=28.0,
    n_teeth=9,
    tooth_depth=10.5,
    phase=0.0,
):
    """
    4-Band HF-Plasma Odachi Cyber-Glitch Serrated Smear on 160x120 logical canvas:
      #ffffff -> #67e8f9 -> #ec4899 -> #311042 cyber-glitch teeth + 4x4 Bayer tail!
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

    r_out = 0.84 + 0.16 * np.maximum(0.0, np.sin(np.pi * (u ** 0.78)))
    sin_u = np.maximum(0.0, np.sin(np.pi * (u ** 0.72)))
    thick_norm = (max_thickness / max(1.0, 0.5 * (rx_outer + ry_outer))) * (sin_u ** 0.82)
    thick_norm = np.maximum(0.025 * (1.0 - u), thick_norm)

    # Stepped digital cyber-glitch teeth + sawtooth wind-rip notches along inner chord
    saw = (u * n_teeth + phase) % 1.0
    glitch_step = ((yy // 2) % 3 == 0).astype(np.float32) * 0.035
    serration = (tooth_depth / max(1.0, 0.5 * (rx_outer + ry_outer))) * ((1.0 - saw) ** 2.0) * np.maximum(0.0, np.sin(np.pi * u)) + glitch_step
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
    arr[rim_selout] = C_OUT_DARK

    denom = np.maximum(0.02, r_out - r_in)
    v = np.clip((r_norm - r_in) / denom, 0.0, 1.0)

    # Exact brief 4-band HF-Plasma ramp: #ffffff -> #67e8f9 -> #ec4899 -> #311042
    arr[body_mask & (v < 0.25)] = C_PLUM_GLITCH
    arr[body_mask & (v >= 0.25) & (v < 0.58)] = C_MAG_HOT
    arr[body_mask & (v >= 0.58) & (v < 0.84)] = C_CYAN_CREST
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
        arr[streak] = C_CYAN_NEON if s_idx == 0 else C_MAG_HOT


def draw_overdrive_vortex_smear_160(
    arr,
    cx,
    cy,
    rx=73.0,
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
    arr[sel] = C_OUT_DARK

    v = np.clip((enorm - r_in) / np.maximum(0.02, r_out - r_in), 0.0, 1.0)
    arr[mask & (v < 0.26)] = C_PLUM_GLITCH
    arr[mask & (v >= 0.26) & (v < 0.58)] = C_MAG_HOT
    arr[mask & (v >= 0.58) & (v < 0.84)] = C_CYAN_CREST
    arr[mask & (v >= 0.84)] = C_PURE_WHITE


def draw_singularity_pillar_160(arr, impact_x, top_y=11, bot_y=114, half_w=5.0):
    eff_top = max(11, int(top_y))
    ix = min(LOGICAL_W - 14, max(14, int(round(impact_x))))
    ihw = int(math.ceil(half_w))
    for y in range(eff_top, min(LOGICAL_H - MARGIN_LOGICAL - 2, int(bot_y) + 1)):
        vt = (y - eff_top) / max(1.0, float(bot_y - eff_top))
        crown_taper = min(1.0, vt / 0.18) ** 0.85
        cur_hw = half_w * crown_taper * (0.45 + 0.55 * math.sin(vt * math.pi * 0.85))
        for dx in range(-ihw - 1, ihw + 2):
            adx = abs(dx)
            if adx <= cur_hw:
                if vt < 0.14 and BAYER4[y % 4, (ix + dx) % 4] > (vt / 0.14 + 0.18):
                    continue
                if adx <= cur_hw * 0.32:
                    col = C_PURE_WHITE
                elif adx <= cur_hw * 0.68:
                    col = C_CYAN_CREST
                else:
                    col = C_MAG_HOT
                put_px_160(arr, ix + dx, y, col, margin=6)
    fiss_w = int(half_w * 3.6)
    for dx in range(-fiss_w, fiss_w + 1):
        if 8 <= ix + dx <= LOGICAL_W - 9:
            col = C_PURE_WHITE if abs(dx) < fiss_w * 0.35 else (C_CYAN_NEON if abs(dx) < fiss_w * 0.7 else C_MAG_HOT)
            put_px_160(arr, ix + dx, bot_y, col, margin=6)


def draw_cyber_sparks_160(arr, impact_x, ground_y, spread=22.0, progress=0.0, count=7):
    for i in range(count):
        frac = (i / max(1, count - 1)) * 2.0 - 1.0
        ang = math.radians(-90.0 + frac * 68.0)
        dist = (4.0 + progress * spread) * (0.65 + 0.35 * ((i * 37) % 5) / 4.0)
        sx = impact_x + math.cos(ang) * dist
        sy = min(ground_y, ground_y + math.sin(ang) * dist * 0.55)
        col = C_PURE_WHITE if progress < 0.35 else (C_CYAN_NEON if i % 2 == 0 else C_MAG_HOT)
        put_px_160(arr, sx, sy, col)


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
    blade_len=48.0,
    sori_sign=1.0,
    weapon_layer="front",
    funnel_spread=1.0,
    rune_phase=0.0,
    bend_l=1.0,
    bend_r=1.0,
    rotate_weapon_with_body=False,
    rotate_funnels_with_body=False,
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

    if rotate_weapon_with_body:
        gx_r, gy_r = grip_rel_sh[0] * S_HI, grip_rel_sh[1] * S_HI
        rb = math.radians(body_tilt_deg)
        cb, sb = math.cos(rb), math.sin(rb)
        grip_hi = (
            mid_sh_hi[0] + gx_r * cb - gy_r * sb,
            mid_sh_hi[1] + gx_r * sb + gy_r * cb,
        )
        eff_weapon_deg = weapon_deg + body_tilt_deg
    else:
        grip_hi = (
            mid_sh_hi[0] + grip_rel_sh[0] * S_HI,
            mid_sh_hi[1] + grip_rel_sh[1] * S_HI,
        )
        eff_weapon_deg = weapon_deg
    w_rad = math.radians(eff_weapon_deg)
    w_ux, w_uy = math.cos(w_rad), math.sin(w_rad)
    l_target_hi = (grip_hi[0] - w_ux * 2.6 * S_HI, grip_hi[1] - w_uy * 2.6 * S_HI)
    r_target_hi = (grip_hi[0] + w_ux * 1.2 * S_HI, grip_hi[1] + w_uy * 1.2 * S_HI)

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

    if funnel_spread > 0.05:
        if rotate_funnels_with_body:
            f_rad = math.radians(body_tilt_deg)
            fc, fs = math.cos(f_rad), math.sin(f_rad)
            fx_off = -2.0 * fc - 4.0 * fs
            fy_off = -2.0 * fs + 4.0 * fc
            draw_cyber_fin_funnels_160(
                frame,
                neck_160[0] + fx_off,
                neck_160[1] + fy_off,
                spread_scale=funnel_spread,
                phase=rune_phase,
                tilt_deg=body_tilt_deg,
            )
        else:
            draw_cyber_fin_funnels_160(frame, neck_160[0] - 2.0, neck_160[1] + 4.0, spread_scale=funnel_spread, phase=rune_phase)

    if weapon_layer == "behind":
        draw_muramasa_plasma_odachi_160(
            frame, grip_160[0], grip_160[1], eff_weapon_deg, blade_len=blade_len, sori_sign=sori_sign, rune_phase=rune_phase, draw_gauntlets=False
        )

    mask_b = body_160[:, :, 3] > 128
    frame[mask_b] = body_160[mask_b]

    if weapon_layer == "front":
        draw_muramasa_plasma_odachi_160(
            frame, grip_160[0], grip_160[1], eff_weapon_deg, blade_len=blade_len, sori_sign=sori_sign, rune_phase=rune_phase, draw_gauntlets=True
        )

    frame = seal_160_char_pinholes_and_leaks(
        frame,
        max_pinhole_lpx=6,
        min_detached_lpx=4,
        max_orphan_lpx=18,
        orphan_dist_lpx=5.0,
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
    (0.533, 14.0, 56.0,  14.0,  -5.0, -34.0),  # F01/F16 immediate crisp lift & -X heel tuck above sole band!
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


def render_stand_rig_frame_160(
    parts,
    stand_joints,
    pelvis_dx=0.0,
    pelvis_dy=0.0,
    torso_deg=0.0,
    head_deg=0.0,
    mane_deg=0.0,
    l_coat_deg=0.0,
    r_coat_deg=0.0,
    coat_wave_ph=0.0,
    coat_wave_amp=5.0,
    coat_y_offset_160=0.0,
    coat_x_inward_frac=0.0,
    l_coat_inward_frac=None,
    r_coat_inward_frac=None,
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
    grip_rel_sh=(11.5, 8.5),
    weapon_deg=26.0,
    blade_len=48.0,
    sori_sign=1.0,
    weapon_layer="front",
    weapon_abs_160=None,
    funnel_spread=1.0,
    rune_phase=0.0,
    bend_l=1.0,
    bend_r=1.0,
    lock_lowest_to_ground=False,
    clamp_ground_only=False,
    leg_bridge_scale=1.0,
    uniform_side_boots=False,
    r_hand_rel_neck_160=None,
    weapon_single_hand=False,
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
    l_c_in = coat_x_inward_frac if l_coat_inward_frac is None else l_coat_inward_frac
    r_c_in = coat_x_inward_frac if r_coat_inward_frac is None else r_coat_inward_frac
    l_coat_dst = (
        l_coat_raw[0] + (spine_hip_x - l_coat_raw[0]) * l_c_in,
        l_coat_raw[1] + coat_y_offset_160 * S_HI,
    )
    r_coat_dst = (
        r_coat_raw[0] + (spine_hip_x - r_coat_raw[0]) * r_c_in,
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

    mane_rel = (neck_dst[0] + (sj["mane"][0] - sj["neck"][0]), neck_dst[1] + (sj["mane"][1] - sj["neck"][1]))
    mane_dst = rot_pt(mane_rel, neck_dst, torso_deg + head_deg)

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
    if weapon_single_hand:
        l_target_hi = grip_hi
    else:
        l_target_hi = (grip_hi[0] - w_ux * 2.4 * S_HI, grip_hi[1] - w_uy * 2.4 * S_HI)
    if r_hand_rel_neck_160 is not None:
        r_target_hi = (neck_dst[0] + r_hand_rel_neck_160[0] * S_HI, neck_dst[1] + r_hand_rel_neck_160[1] * S_HI)
    else:
        r_target_hi = (grip_hi[0] + w_ux * 1.2 * S_HI, grip_hi[1] + w_uy * 1.2 * S_HI)

    l_thigh_part = _shade_crop_tuple(parts["l_thigh"], shade_far_leg)
    l_shin_part = _shade_crop_tuple(parts["l_shin"], shade_far_leg)
    l_foot_src = parts["r_foot"] if uniform_side_boots else parts["l_foot"]
    l_ankle_pivot = sj["r_ankle"] if uniform_side_boots else sj["l_ankle"]
    l_foot_part = _shade_crop_tuple(l_foot_src, shade_far_leg)

    paste_rotated_part(win_hi, parts["mane"], sj["mane"], mane_dst, deg=torso_deg + head_deg + mane_deg)
    l_coat_mid = rot_pt((l_coat_dst[0] - 86.0, l_coat_dst[1] + 84.0), l_coat_dst, torso_deg + l_coat_deg)
    draw_joint_bridge_hi(win_hi, (dst_pelvis[0] - 8.0, dst_pelvis[1] + 8.0), l_coat_dst, r=7)
    draw_joint_bridge_hi(win_hi, (dst_pelvis[0] - 12.0, dst_pelvis[1] + 14.0), l_coat_mid, r=8)
    paste_rotated_part(
        win_hi, parts["l_coat"], sj["l_coat"], l_coat_dst,
        deg=torso_deg + l_coat_deg, wave_phase=coat_wave_ph, wave_amp=coat_wave_amp,
    )
    paste_ik_arm_hi(win_hi, parts, sj, "l", l_sh_dst, l_target_hi, bend_sign=bend_l)

    br_hip = max(2, int(round(7 * leg_bridge_scale)))
    br_knee = max(2, int(round(5 * leg_bridge_scale)))
    draw_joint_bridge_hi(win_hi, dst_pelvis, l_hip_dst, r=max(5, br_hip))
    draw_joint_bridge_hi(win_hi, l_hip_dst, l_knee_dst, r=br_hip)
    draw_joint_bridge_hi(win_hi, l_knee_dst, l_ank_dst, r=br_knee)
    paste_rotated_part(win_hi, l_thigh_part, sj["l_hip"], l_hip_dst, deg=l_th_rot)
    paste_rotated_part(win_hi, l_shin_part, sj["l_knee"], l_knee_dst, deg=l_sh_rot)
    paste_rotated_part(win_hi, l_foot_part, l_ankle_pivot, l_ank_dst, deg=l_ft_rot)

    r_coat_mid = rot_pt((r_coat_dst[0] + 48.0, r_coat_dst[1] + 56.0), r_coat_dst, torso_deg + r_coat_deg)
    draw_joint_bridge_hi(win_hi, (dst_pelvis[0] + 8.0, dst_pelvis[1] + 8.0), r_coat_dst, r=7)
    draw_joint_bridge_hi(win_hi, (dst_pelvis[0] + 10.0, dst_pelvis[1] + 14.0), r_coat_mid, r=7)
    paste_rotated_part(
        win_hi, parts["r_coat"], sj["r_coat"], r_coat_dst,
        deg=torso_deg + r_coat_deg, wave_phase=coat_wave_ph + 1.1, wave_amp=coat_wave_amp * 0.85,
    )
    draw_joint_bridge_hi(win_hi, dst_pelvis, r_hip_dst, r=max(5, br_hip))
    draw_joint_bridge_hi(win_hi, r_hip_dst, r_knee_dst, r=br_hip)
    draw_joint_bridge_hi(win_hi, r_knee_dst, r_ank_dst, r=br_knee)
    paste_rotated_part(win_hi, parts["r_thigh"], sj["r_hip"], r_hip_dst, deg=r_th_rot)
    paste_rotated_part(win_hi, parts["r_shin"], sj["r_knee"], r_knee_dst, deg=r_sh_rot)
    paste_rotated_part(win_hi, parts["r_foot"], sj["r_ankle"], r_ank_dst, deg=r_ft_rot)

    paste_rotated_part(win_hi, parts["torso"], pelvis_src, dst_pelvis, deg=torso_deg)
    paste_rotated_part(win_hi, parts["head"], sj["neck"], neck_dst, deg=torso_deg + head_deg)
    paste_ik_arm_hi(win_hi, parts, sj, "r", r_sh_dst, r_target_hi, bend_sign=bend_r)

    body_160 = quantize_and_cluster_160x120(downsample_clean_160x120(win_hi))

    shift_y_160 = 0
    ys_b, _ = np.where(body_160[:, :, 3] > 128)
    if len(ys_b) > 0:
        cur_bot = int(ys_b.max())
        if clamp_ground_only:
            if cur_bot > ANCHOR_Y_120 and ANCHOR_Y_120 + 1 < LOGICAL_H:
                over = body_160[ANCHOR_Y_120 + 1, :, 3] > 128
                body_160[ANCHOR_Y_120 + 1:, :, :] = 0
                for x_i in np.where(over)[0]:
                    if body_160[ANCHOR_Y_120, x_i, 3] > 128:
                        body_160[ANCHOR_Y_120, x_i] = C_OUT_DARK
        elif lock_lowest_to_ground or cur_bot > ANCHOR_Y_120:
            shift_y_160 = ANCHOR_Y_120 - cur_bot
            if shift_y_160 != 0:
                shifted = np.zeros_like(body_160)
                for y in range(LOGICAL_H):
                    ny = y + shift_y_160
                    if MARGIN_LOGICAL <= ny < LOGICAL_H - MARGIN_LOGICAL:
                        shifted[ny] = body_160[y]
                body_160 = shifted

    fx_behind = np.zeros((LOGICAL_H, LOGICAL_W, 4), dtype=np.uint8)
    neck_160 = (neck_dst[0] / S_HI, neck_dst[1] / S_HI + shift_y_160)
    grip_160 = (grip_hi[0] / S_HI, grip_hi[1] / S_HI + shift_y_160)

    if pre_fn is not None:
        pre_fn(fx_behind, neck_160, grip_160)

    if funnel_spread > 0.05:
        draw_cyber_fin_funnels_160(fx_behind, neck_160[0] - 2.0, neck_160[1] + 4.0, spread_scale=funnel_spread, phase=rune_phase)

    char_160 = np.zeros((LOGICAL_H, LOGICAL_W, 4), dtype=np.uint8)
    if weapon_layer == "behind":
        draw_muramasa_plasma_odachi_160(
            char_160, grip_160[0], grip_160[1], weapon_deg, blade_len=blade_len, sori_sign=sori_sign, rune_phase=rune_phase, draw_gauntlets=False
        )

    mask_b = body_160[:, :, 3] > 128
    char_160[mask_b] = body_160[mask_b]

    if weapon_layer == "front":
        draw_muramasa_plasma_odachi_160(
            char_160,
            grip_160[0],
            grip_160[1],
            weapon_deg,
            blade_len=blade_len,
            sori_sign=sori_sign,
            rune_phase=rune_phase,
            draw_gauntlets=(not weapon_single_hand),
        )

    char_160 = seal_160_char_pinholes_and_leaks(
        char_160,
        max_pinhole_lpx=6,
        min_detached_lpx=4,
        max_orphan_lpx=18,
        orphan_dist_lpx=5.0,
        bridge_max_lpx=64,
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
    """Row 0: Cyber-Samurai Chudan Odachi Stance + 4 Hovering Fin-Funnel Pylons."""
    frames = []
    for f in range(30):
        ph = (f / 30.0) * 2.0 * math.pi
        bob_y = math.sin(ph) * 1.1
        torso_deg = math.sin(ph - 0.4) * 1.4
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=math.sin(ph) * 0.4,
            pelvis_dy=bob_y,
            torso_deg=torso_deg,
            head_deg=-torso_deg * 0.5,
            mane_deg=math.sin(ph - 0.8) * 2.0,
            l_coat_deg=3.0 + math.sin(ph - 0.7) * 4.0,
            r_coat_deg=-2.0 + math.sin(ph - 1.1) * 3.0,
            coat_wave_ph=ph,
            coat_wave_amp=5.5,
            grip_rel_sh=(11.5, 8.8 + math.sin(ph - 0.3) * 0.9),
            weapon_deg=-22.0 + math.sin(ph - 0.5) * 2.2,
            blade_len=48.0,
            sori_sign=-1.0,
            weapon_layer="front",
            funnel_spread=1.0,
            rune_phase=ph * 2.0,
        ))
    return frames


def build_row1_walk(parts, sj):
    """
    Row 1: True Centered-Hip Bipedal Crossover Cyber-Samurai Stride (F00..F29).
      - F00: Left foot plants forward (+X) & Right foot trails (-X)
      - F07: Right knee lifts & CROSSES OVER anchorX (single-column passing profile)
      - F15: Right foot plants forward (+X) & Left foot trails (-X)
      - F22: Left knee lifts & CROSSES OVER anchorX
    Keeps hip joints tucked cleanly under torso exosuit (0 exposed hip balls).
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
        torso_deg = 2.6 + math.cos(ph2) * 0.7

        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=0.8 + math.sin(ph2) * 0.35,
            pelvis_dy=bob_y,
            torso_deg=torso_deg,
            head_deg=-torso_deg * 0.45,
            mane_deg=-1.2 + math.sin(ph2 - 0.6) * 1.8,
            l_coat_deg=6.0 + max(0.0, l_th) * 0.35,
            r_coat_deg=-3.5 + min(0.0, r_th) * 0.30,
            coat_wave_ph=ph2,
            coat_wave_amp=2.2,
            coat_y_offset_160=-3.0,
            coat_x_inward_frac=0.45,
            l_coat_inward_frac=0.42,
            r_coat_inward_frac=0.58,
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
            shade_far_leg=0.84,
            grip_rel_sh=(11.2 - stride_sway * 0.9, 8.2 + math.sin(ph2) * 0.45),
            weapon_deg=-21.5 + stride_sway * 2.8,
            blade_len=47.0,
            sori_sign=-1.0,
            weapon_layer="front",
            funnel_spread=1.02 + 0.02 * math.sin(ph2),
            rune_phase=ph2,
            lock_lowest_to_ground=False,
            clamp_ground_only=True,
            leg_bridge_scale=0.45,
        ))
    return frames


def build_row2_auto_attack(parts, sj, keyposes):
    """
    Row 2: AUTO_ATTACK [[60,8],[68,7],[75,8],[83,7]] -- Cyber-Samurai HF-Plasma Odachi Blitz!
      - V0 (F00..F07): 1-frame snap downward HF-Plasma Odachi serrated crescent smear (F03)
      - V1 (F08..F14): Instant reverse rising Singularity uppercut slash smear (F09, zero idle reset!)
      - V2 (F15..F22): 2.5D horizontal Overdrive spin-rip vortex smear (F17/F18 2-hit)
      - V3 (F23..F29): Thruster-boosted aerial leap (F23..F24) -> guillotine cleave (F25)
    """
    frames = []

    # ---------------- BEAT 1 (V0): F00..F07 (Frames 60..67) ----------------
    for sub_i, (pdx, tilt, wdeg, sph, glint) in enumerate([
        (-2.5, -5.0, -138.0, 0.2, False),
        (-4.0, -7.5, -146.0, 0.9, False),
        (-5.2, -9.5, -153.0, 1.7, True),
    ]):
        def post_v0_coil(arr, _n, grip, do_g=glint):
            if do_g:
                draw_star_glint_160(arr, grip[0] - 2.0, grip[1] - 3.0, arm_len=6)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K1_COIL",
            pelvis_dx=pdx, pelvis_dy=-sub_i * 0.5, body_tilt_deg=tilt,
            grip_rel_sh=(-3.5, -5.5), weapon_deg=wdeg, blade_len=46.0, sori_sign=1.0,
            funnel_spread=1.05, rune_phase=sph, bend_l=-1.0, bend_r=-1.0, post_fn=post_v0_coil,
        ))

    # F03: 1-FRAME SNAP DOWNWARD HF-PLASMA ODACHI SERRATED CRESCENT SMEAR!
    def post_v0_snap(arr, _n, _g):
        draw_hf_plasma_smear_160(
            arr, cx=80.0, cy=61.0,
            tail_deg=-152.0, lead_deg=28.0, sweep_dir=1,
            rx_outer=74.0, ry_outer=52.0, max_thickness=30.0,
            n_teeth=9, tooth_depth=11.0, phase=0.1,
        )
        draw_cyber_sparks_160(arr, impact_x=130.0, ground_y=114.0, spread=22.0, progress=0.2, count=8)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=12.0, pelvis_dy=1.2, body_tilt_deg=6.0,
        grip_rel_sh=(15.0, 3.5), weapon_deg=24.0, blade_len=49.0, sori_sign=1.0,
        funnel_spread=1.12, rune_phase=2.5, post_fn=post_v0_snap,
    ))

    for e_idx, (tail_d, thick, prog) in enumerate([(-62.0, 18.0, 0.52), (-12.0, 9.0, 0.82)]):
        def post_v0_erode(arr, _n, _g, td=tail_d, th=thick, pr=prog):
            draw_hf_plasma_smear_160(
                arr, cx=80.0, cy=63.0,
                tail_deg=td, lead_deg=29.0, sweep_dir=1,
                rx_outer=71.0, ry_outer=49.0, max_thickness=th,
                n_teeth=7, tooth_depth=7.5, phase=pr,
            )
            draw_cyber_sparks_160(arr, impact_x=130.0, ground_y=114.0, spread=24.0, progress=pr, count=6)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K2_LUNGE",
            pelvis_dx=12.5 - e_idx * 0.5, pelvis_dy=1.6, body_tilt_deg=7.0 - e_idx * 0.5,
            grip_rel_sh=(15.5, 4.5), weapon_deg=28.0 + e_idx * 1.5, blade_len=49.0, sori_sign=1.0,
            funnel_spread=1.08, rune_phase=3.4 + e_idx * 0.7, post_fn=post_v0_erode,
        ))

    for h_idx in range(2):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K2_LUNGE",
            pelvis_dx=11.0 - h_idx * 1.0, pelvis_dy=1.5 + h_idx * 0.5, body_tilt_deg=6.0 + h_idx * 1.0,
            grip_rel_sh=(14.5, 5.2 + h_idx * 0.6), weapon_deg=30.0 + h_idx * 2.0, blade_len=48.0, sori_sign=1.0,
            funnel_spread=1.04, rune_phase=4.8 + h_idx * 0.7,
        ))

    # ---------------- BEAT 2 (V1): F08..F14 (Frames 68..74) ----------------
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=9.0, pelvis_dy=2.6, body_tilt_deg=8.5,
        grip_rel_sh=(13.0, 6.8), weapon_deg=35.0, blade_len=48.0, sori_sign=-1.0,
        funnel_spread=1.05, rune_phase=5.8,
    ))

    # F09: 1-FRAME REVERSE RISING SINGULARITY UPPERCUT SLASH SMEAR!
    def post_v1_snap(arr, _n, _g):
        draw_hf_plasma_smear_160(
            arr, cx=80.0, cy=59.0,
            tail_deg=36.0, lead_deg=-128.0, sweep_dir=-1,
            rx_outer=75.0, ry_outer=52.0, max_thickness=29.0,
            n_teeth=9, tooth_depth=10.5, phase=0.2,
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=10.0, pelvis_dy=-1.0, body_tilt_deg=-4.5,
        grip_rel_sh=(5.5, -10.0), weapon_deg=-124.0, blade_len=46.0, sori_sign=-1.0,
        funnel_spread=1.14, rune_phase=1.5, bend_l=-1.0, bend_r=-1.0, post_fn=post_v1_snap,
    ))

    for e_idx, (tail_d, thick) in enumerate([(-36.0, 18.0), (-86.0, 9.0)]):
        def post_v1_erode(arr, _n, _g, td=tail_d, th=thick):
            draw_hf_plasma_smear_160(
                arr, cx=79.0, cy=58.0,
                tail_deg=td, lead_deg=-130.0, sweep_dir=-1,
                rx_outer=72.0, ry_outer=50.0, max_thickness=th,
                n_teeth=6, tooth_depth=7.5, phase=0.45 + e_idx * 0.3,
            )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=9.5 - e_idx * 0.5, pelvis_dy=-1.2, body_tilt_deg=-5.5,
            grip_rel_sh=(4.5, -10.8), weapon_deg=-130.0 - e_idx * 2.0, blade_len=46.0, sori_sign=-1.0,
            funnel_spread=1.10, rune_phase=2.3 + e_idx * 0.8, bend_l=-1.0, bend_r=-1.0, post_fn=post_v1_erode,
        ))

    for h_idx in range(3):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=8.0 - h_idx * 1.2, pelvis_dy=-0.6 + h_idx * 0.3, body_tilt_deg=-4.0 + h_idx * 1.0,
            grip_rel_sh=(5.0 - h_idx * 1.5, -9.5 + h_idx * 1.2), weapon_deg=-126.0 - h_idx * 6.0, blade_len=46.0, sori_sign=-1.0,
            funnel_spread=1.05, rune_phase=3.8 + h_idx * 0.7, bend_l=-1.0, bend_r=-1.0,
        ))

    # ---------------- BEAT 3 (V2): F15..F22 (Frames 75..82) ----------------
    for sub_i, (pdx, sqx, wdeg, sph, glint) in enumerate([
        (2.0, 0.96, 168.0, 0.6, False),
        (0.5, 0.92, 176.0, 1.4, True),
    ]):
        def post_v2_coil(arr, _n, grip, do_g=glint):
            if do_g:
                draw_star_glint_160(arr, grip[0], grip[1], arm_len=6)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K1_COIL",
            pelvis_dx=pdx, pelvis_dy=1.2 + sub_i * 0.5, body_tilt_deg=-3.0,
            squash_x=sqx, squash_y=1.0,
            grip_rel_sh=(-4.0, -1.0), weapon_deg=wdeg, blade_len=45.0, sori_sign=1.0,
            funnel_spread=1.08, rune_phase=sph, bend_l=-1.0, bend_r=1.0, post_fn=post_v2_coil,
        ))

    # F17: 1-FRAME 2.5D HORIZONTAL OVERDRIVE SPIN-RIP SMEAR!
    def pre_v2_snap(arr, _n, _g):
        draw_overdrive_vortex_smear_160(
            arr, cx=80.0, cy=68.0, rx=74.0, ry=23.0, tilt_deg=-10.0, front_thickness=30.0, half="back", erosion=0.0
        )

    def post_v2_snap(arr, _n, _g):
        draw_overdrive_vortex_smear_160(
            arr, cx=80.0, cy=68.0, rx=74.0, ry=23.0, tilt_deg=-10.0, front_thickness=34.0, half="front", erosion=0.0
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=12.0, pelvis_dy=1.0, body_tilt_deg=7.0,
        grip_rel_sh=(15.5, 1.0), weapon_deg=-3.0, blade_len=49.0, sori_sign=1.0,
        funnel_spread=1.18, rune_phase=2.5, pre_fn=pre_v2_snap, post_fn=post_v2_snap,
    ))

    # F18: Counter-tilted Overdrive cross-rip (+11 deg, 2-hit!)
    def pre_v2_cross(arr, _n, _g):
        draw_overdrive_vortex_smear_160(
            arr, cx=79.0, cy=68.0, rx=70.0, ry=18.0, tilt_deg=11.0, front_thickness=16.0, half="back", erosion=0.24
        )

    def post_v2_cross(arr, _n, _g):
        draw_overdrive_vortex_smear_160(
            arr, cx=79.0, cy=68.0, rx=70.0, ry=18.0, tilt_deg=11.0, front_thickness=17.0, half="front", erosion=0.24
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=10.5, pelvis_dy=0.5, body_tilt_deg=3.0,
        grip_rel_sh=(14.5, 2.5), weapon_deg=12.0, blade_len=49.0, sori_sign=-1.0,
        funnel_spread=1.14, rune_phase=3.3, pre_fn=pre_v2_cross, post_fn=post_v2_cross,
    ))

    def post_v2_erode(arr, _n, _g):
        draw_overdrive_vortex_smear_160(
            arr, cx=78.0, cy=69.0, rx=65.0, ry=15.0, tilt_deg=8.0, front_thickness=9.5, half="front", erosion=0.62
        )

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K3_RISE",
        pelvis_dx=9.5, pelvis_dy=1.0, body_tilt_deg=3.5,
        grip_rel_sh=(13.5, 3.5), weapon_deg=18.0, blade_len=48.0, sori_sign=-1.0,
        funnel_spread=1.08, rune_phase=4.0, post_fn=post_v2_erode,
    ))

    # F20..F22: Thruster-loaded crouch priming aerial leap!
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=7.5, pelvis_dy=2.0, body_tilt_deg=7.0,
        grip_rel_sh=(12.0, 5.5), weapon_deg=23.0, blade_len=48.0, sori_sign=1.0,
        funnel_spread=1.04, rune_phase=4.7,
    ))
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=5.0, pelvis_dy=3.0, body_tilt_deg=9.5,
        grip_rel_sh=(-3.5, 6.0), weapon_deg=154.0, blade_len=45.0, sori_sign=1.0,
        weapon_layer="behind", funnel_spread=1.08, rune_phase=5.4,
    ))
    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K1_COIL",
        pelvis_dx=3.0, pelvis_dy=2.0, body_tilt_deg=4.5,
        grip_rel_sh=(-4.0, 2.0), weapon_deg=158.0, blade_len=45.0, sori_sign=1.0,
        weapon_layer="behind", funnel_spread=1.10, rune_phase=6.1,
    ))

    # ---------------- BEAT 4 (V3): F23..F29 (Frames 83..89) ----------------
    # F23..F24: Thruster-Boosted Aerial Leap (K4_LEAP, boots 18..22 logical px off floor!)
    for sub_i, (pdx, pdy, tilt, wdeg, sph) in enumerate([
        (6.0, -18.0, -5.0, -150.0, 0.8),
        (8.0, -22.0, -8.5, -158.0, 1.7),
    ]):
        def post_v3_leap(arr, _n, grip, is_apex=(sub_i == 1)):
            if is_apex:
                draw_star_glint_160(arr, grip[0] - 1.0, grip[1] - 2.0, arm_len=7, core_r=2.0)
            else:
                draw_cyber_sparks_160(arr, impact_x=62.0, ground_y=114.0, spread=14.0, progress=0.4, count=5)

        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K4_LEAP",
            pelvis_dx=pdx, pelvis_dy=pdy, body_tilt_deg=tilt,
            grip_rel_sh=(-3.0, -7.0), weapon_deg=wdeg, blade_len=44.0, sori_sign=1.0,
            funnel_spread=1.20, rune_phase=sph, bend_l=-1.0, bend_r=-1.0, post_fn=post_v3_leap,
        ))

    # F25: 1-FRAME THRUSTER-BOOSTED AERIAL GUILLOTINE CLEAVE + SINGULARITY SMEAR!
    def post_v3_slam(arr, _n, _g):
        draw_singularity_pillar_160(arr, impact_x=132.0, top_y=4, bot_y=114, half_w=4.4)
        draw_hf_plasma_smear_160(
            arr, cx=79.0, cy=58.0,
            tail_deg=-156.0, lead_deg=34.0, sweep_dir=1,
            rx_outer=76.0, ry_outer=56.0, max_thickness=33.0,
            n_teeth=9, tooth_depth=12.0, phase=0.1,
        )
        draw_cyber_sparks_160(arr, impact_x=131.0, ground_y=114.0, spread=28.0, progress=0.15, count=10)

    frames.append(render_keypose_frame_160(
        parts, sj, keyposes, "K2_LUNGE",
        pelvis_dx=12.5, pelvis_dy=1.8, body_tilt_deg=8.0,
        grip_rel_sh=(15.5, 5.0), weapon_deg=26.0, blade_len=49.0, sori_sign=1.0,
        funnel_spread=1.18, rune_phase=2.9, post_fn=post_v3_slam,
    ))

    for e_idx, (tail_d, thick, prog) in enumerate([(-64.0, 20.0, 0.5), (-10.0, 10.0, 0.82)]):
        def post_v3_erode(arr, _n, _g, td=tail_d, th=thick, pr=prog):
            draw_hf_plasma_smear_160(
                arr, cx=78.0, cy=61.0 + e_idx * 2.0,
                tail_deg=td, lead_deg=28.0, sweep_dir=1,
                rx_outer=72.0 - e_idx * 4.0, ry_outer=50.0, max_thickness=th,
                n_teeth=7 - e_idx * 2, tooth_depth=8.0 - e_idx * 3.0, phase=pr,
            )
            draw_cyber_sparks_160(arr, impact_x=131.0, ground_y=114.0, spread=28.0, progress=pr, count=8 - e_idx * 2)

        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K2_LUNGE",
            pelvis_dx=12.8 - e_idx * 1.0, pelvis_dy=2.2 - e_idx * 0.4, body_tilt_deg=8.5 - e_idx * 1.0,
            grip_rel_sh=(15.5, 5.5), weapon_deg=28.0 - e_idx * 1.0, blade_len=49.0, sori_sign=1.0,
            funnel_spread=1.12, rune_phase=3.7 + e_idx * 0.8, post_fn=post_v3_erode,
        ))

    for r_idx in range(2):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=7.5 - r_idx * 3.5, pelvis_dy=0.8 - r_idx * 0.8, body_tilt_deg=2.5 - r_idx * 1.5,
            grip_rel_sh=(12.0 - r_idx * 1.0, 5.0 + r_idx * 1.5), weapon_deg=20.0 - r_idx * 22.0, blade_len=48.0, sori_sign=-1.0,
            funnel_spread=1.04, rune_phase=5.2 + r_idx * 0.7,
        ))

    assert len(frames) == 30
    return frames


def build_row3_skill(parts, sj, keyposes):
    """Row 3: SKILL -- EMP Overload Blitz (Holo-Lock -> X-Cross Odachi Blitz -> EMP Discharge)."""
    frames = []
    for f in range(4):
        def post_g(arr, _n, grip, step=f):
            if step >= 2:
                draw_star_glint_160(arr, grip[0], grip[1] - 3.0, arm_len=4 + step)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K1_COIL",
            pelvis_dx=-2.0 - f * 1.0, pelvis_dy=-f * 0.5, body_tilt_deg=-4.0 - f * 1.5,
            grip_rel_sh=(-3.5, -5.0), weapon_deg=-138.0 - f * 5.0, blade_len=46.0,
            funnel_spread=1.06 + f * 0.04, rune_phase=f * 0.8, bend_l=-1.0, bend_r=-1.0, post_fn=post_g,
        ))

    # F04..F13: Supersonic X-Cross Odachi Blitz Smears
    for sub in range(10):
        def post_x(arr, _n, _g, s=sub):
            if s <= 3:
                tails = [-150.0, -64.0, -14.0, 10.0]
                thicks = [27.0, 18.0, 10.5, 6.0]
                draw_hf_plasma_smear_160(
                    arr, cx=80.0, cy=61.0, tail_deg=tails[s], lead_deg=28.0, sweep_dir=1,
                    rx_outer=73.0 - s * 2.0, ry_outer=50.0, max_thickness=thicks[s],
                    n_teeth=8 - s, tooth_depth=10.0 - s * 1.6, phase=s * 0.25,
                )
            elif 4 <= s <= 7:
                k = s - 4
                tails = [34.0, -28.0, -76.0, -108.0]
                thicks = [27.0, 18.0, 10.5, 6.0]
                draw_hf_plasma_smear_160(
                    arr, cx=80.0, cy=59.0, tail_deg=tails[k], lead_deg=-128.0, sweep_dir=-1,
                    rx_outer=74.0 - k * 2.0, ry_outer=50.0, max_thickness=thicks[k],
                    n_teeth=8 - k, tooth_depth=10.0 - k * 1.6, phase=0.2 + k * 0.25,
                )
        pose_nm = "K2_LUNGE" if sub < 4 else "K3_RISE"
        wdeg = 26.0 if sub < 4 else -126.0
        gr = (15.0, 4.5) if sub < 4 else (5.5, -9.5)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, pose_nm,
            pelvis_dx=11.5 - max(0, sub - 6) * 1.0, pelvis_dy=1.0 if sub < 4 else -1.0,
            body_tilt_deg=6.5 if sub < 4 else -4.0,
            grip_rel_sh=gr, weapon_deg=wdeg, blade_len=48.0, sori_sign=1.0 if sub < 4 else -1.0,
            funnel_spread=1.18, rune_phase=2.0 + sub * 0.8,
            bend_l=-1.0 if sub >= 4 else 1.0, bend_r=-1.0 if sub >= 4 else 1.0,
            post_fn=post_x,
        ))

    # F14..F24: Hemispherical EMP Overload Discharge Pose (Wide Fin-Funnels + Vortex Ring!)
    for sub in range(11):
        def post_emp(arr, neck, _g, s=sub):
            if s <= 4:
                draw_overdrive_vortex_smear_160(
                    arr, cx=80.0, cy=68.0, rx=74.0 - s * 2.5, ry=22.0, tilt_deg=-6.0 + s * 4.0,
                    front_thickness=24.0 - s * 4.2, half="front", erosion=0.18 * s,
                )
                draw_star_glint_160(arr, neck[0] + 6.0, neck[1] + 8.0, arm_len=6 - min(4, s))
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=9.0 - sub * 0.5, pelvis_dy=0.5, body_tilt_deg=2.0,
            grip_rel_sh=(13.5, 2.5 + sub * 0.3), weapon_deg=12.0 + sub * 1.2, blade_len=48.0,
            funnel_spread=1.26 - sub * 0.02, rune_phase=sub * 0.9, post_fn=post_emp,
        ))

    for sub in range(5):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=4.0 - sub * 0.8, pelvis_dy=0.0, body_tilt_deg=1.0 - sub * 0.3,
            grip_rel_sh=(11.5, 6.5 + sub * 0.4), weapon_deg=-8.0 - sub * 3.0, blade_len=48.0, sori_sign=-1.0,
            funnel_spread=1.02, rune_phase=sub * 0.8,
        ))

    assert len(frames) == 30
    return frames


def build_row4_ultimate(parts, sj, keyposes):
    """
    Row 4: ULTIMATE / TRUE_ULTIMATE -- Cyber-Valkyrie Backflip, Tactical Rail-Charge & Hyper-Rail Release!
      - F00..F09 (120..129): True 360-Deg Tucked K4_LEAP Backflip (0 -> -360 deg + attached thruster jets)
      - F10..F17 (130..137): Braced Tactical Spec-Ops Rail-Charge Pose (deep crouch + visor hand + reverse Odachi brace)
      - F18..F25 (138..145): Full-Output Overclock Command / Hyper-Rail Release Pose (K3_RISE + wide 1.34 flare)
      - F26..F29 (146..149): Clean Tactical Recovery to Odachi Kamae
    """
    frames = []

    # F00..F09 (10 frames): True 360-Deg Tactical Cyber-Valkyrie Backflip (0 -> -352 deg)
    for f in range(10):
        u = f / 9.0
        tilt_deg = -352.0 * u
        pdy = -10.0 - math.sin(u * math.pi) * 18.0
        pdx = 12.0 + math.sin(u * math.pi) * 4.0

        def post_flip(arr, neck, grip, f_idx=f, ang_deg=tilt_deg):
            # Attach crisp cyan/magenta backpack & boot thruster jets directly to her silhouette (0 detached ovals!)
            rad = math.radians(ang_deg)
            ux, uy = math.cos(rad), math.sin(rad)
            # Thruster vernier nozzles sit right behind neck/back along inverted torso normal
            nx = neck[0] - ux * 5.0 - uy * 4.0
            ny = neck[1] - uy * 5.0 + ux * 4.0
            for j in range(1, 7):
                t_j = j / 6.0
                jx = nx - ux * (j * 1.1) + uy * (j * 0.4)
                jy = ny - uy * (j * 1.1) - ux * (j * 0.4)
                col = C_PURE_WHITE if j <= 2 else (C_CYAN_NEON if (j + f_idx) % 2 == 0 else C_MAG_HOT)
                draw_disc_160(arr, jx, jy, max(0.8, 1.8 - t_j * 1.0), col)
            if f_idx >= 1:
                draw_star_glint_160(arr, nx - ux * 2.0, ny - uy * 2.0, arm_len=2 + (f_idx % 2), core_r=1.2)

        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K4_LEAP",
            pelvis_dx=pdx,
            pelvis_dy=pdy,
            body_tilt_deg=tilt_deg,
            squash_x=0.90,
            squash_y=0.86,
            grip_rel_sh=(3.5, 4.5),
            weapon_deg=-48.0,
            blade_len=36.0,
            sori_sign=-1.0,
            weapon_layer="behind",
            funnel_spread=0.84,
            rune_phase=f * 0.9,
            rotate_weapon_with_body=True,
            rotate_funnels_with_body=True,
            post_fn=post_flip,
        ))

    # F10..F17 (8 frames): Braced Tactical Spec-Ops Rail-Charge Pose (deep crouch + visor salute + reverse Odachi brace)
    for sub in range(8):
        charge_u = sub / 7.0

        def post_charge(arr, neck, grip, s=sub, cu=charge_u):
            visor_x = neck[0] + 5.2
            visor_y = neck[1] - 5.2
            arm_len = 4 + int(round(cu * 5.0)) + (s % 2)
            draw_star_glint_160(arr, visor_x, visor_y, arm_len=arm_len, core_r=1.5 + cu * 0.9)
            # Reactor chest core pulse
            core_x = neck[0] + 0.5
            core_y = neck[1] + 9.0
            draw_disc_160(arr, core_x, core_y, 1.5 + cu * 0.9, C_CYAN_CREST if s % 2 == 0 else C_MAG_HOT)
            put_px_160(arr, core_x, core_y, C_PURE_WHITE)
            # Single-hand sculpted gauntlet grip + 2-finger visor HUD lock touch
            draw_sculpted_cyber_hand_160(arr, grip[0], grip[1], -0.84, 0.54, 0.54, 0.84, role="grip")
            draw_sculpted_cyber_hand_160(arr, visor_x - 1.2, visor_y + 1.0, 0.85, -0.52, 0.52, 0.85, role="visor")

        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=-1.5,
            pelvis_dy=9.0 + math.sin(charge_u * math.pi) * 0.8,
            torso_deg=12.0 + charge_u * 2.0,
            head_deg=-10.0 - charge_u * 1.5,
            mane_deg=-8.0 - math.sin(sub * 1.2) * 2.5,
            l_coat_deg=-10.0 - sub * 0.8,
            r_coat_deg=8.0 + sub * 0.6,
            coat_wave_ph=sub * 0.9,
            coat_wave_amp=3.5,
            coat_y_offset_160=-2.0,
            coat_x_inward_frac=0.36,
            r_coat_inward_frac=0.24,
            l_thigh_deg=-30.0,
            l_shin_deg=42.0,
            l_foot_deg=-4.0,
            r_thigh_deg=26.0,
            r_shin_deg=16.0,
            r_foot_deg=6.0,
            hip_inward_frac=0.18,
            neutralize_leg_rest=True,
            uniform_side_boots=True,
            shade_far_leg=0.84,
            grip_rel_sh=(-4.5, 13.5),
            weapon_deg=148.0 - charge_u * 3.0,
            blade_len=40.0,
            sori_sign=-1.0,
            weapon_layer="front",
            r_hand_rel_neck_160=(5.2, -5.0),
            weapon_single_hand=True,
            funnel_spread=1.08 + charge_u * 0.22,
            rune_phase=sub * 1.1,
            lock_lowest_to_ground=True,
            post_fn=post_charge,
        ))

    # F18..F25 (8 frames): Full-Output Overclock Command / Hyper-Rail Release Pose (K3_RISE + wide 1.34 flare)
    for sub in range(8):
        def post_fire(arr, neck, _g, s=sub):
            vx = neck[0] + 6.0
            vy = neck[1] - 5.0
            draw_star_glint_160(arr, vx, vy, arm_len=8 + (s % 2), core_r=2.5)
            beam_len = 56
            for bx in range(4, beam_len):
                tx = vx + bx
                if tx <= LOGICAL_W - MARGIN_LOGICAL - 3:
                    put_px_160(arr, tx, vy - 2, C_OUT_DARK)
                    put_px_160(arr, tx, vy - 1, C_CYAN_NEON if (bx + s) % 2 == 0 else C_MAG_HOT)
                    put_px_160(arr, tx, vy, C_PURE_WHITE)
                    put_px_160(arr, tx, vy + 1, C_MAG_HOT if (bx + s) % 2 == 0 else C_CYAN_NEON)
                    put_px_160(arr, tx, vy + 2, C_OUT_DARK)

        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=3.5 - (sub % 3) * 0.7,
            pelvis_dy=1.4,
            body_tilt_deg=3.8,
            grip_rel_sh=(-4.0, 5.5),
            weapon_deg=158.0,
            blade_len=44.0,
            sori_sign=-1.0,
            weapon_layer="behind",
            funnel_spread=1.34,
            rune_phase=2.0 + sub * 1.2,
            post_fn=post_fire,
        ))

    # F26..F29 (4 frames): Clean Tactical Recovery to Odachi Kamae (coherent hip skirts, wide A-stance)
    for sub in range(4):
        rec_u = sub / 3.0
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=2.0 * (1.0 - rec_u),
            pelvis_dy=0.0,
            torso_deg=4.0 * (1.0 - rec_u),
            head_deg=-2.0 * (1.0 - rec_u),
            l_thigh_deg=-8.0 * (1.0 - rec_u),
            l_shin_deg=10.0 * (1.0 - rec_u),
            l_foot_deg=0.0,
            r_thigh_deg=8.0 * (1.0 - rec_u),
            r_shin_deg=4.0 * (1.0 - rec_u),
            r_foot_deg=0.0,
            hip_inward_frac=0.0,
            neutralize_leg_rest=False,
            uniform_side_boots=True,
            shade_far_leg=0.84,
            grip_rel_sh=(8.0 + rec_u * 3.5, 9.5 - rec_u * 1.0),
            weapon_deg=12.0 - rec_u * 32.0,
            blade_len=47.0,
            sori_sign=-1.0,
            funnel_spread=1.24 - rec_u * 0.20,
            rune_phase=sub * 0.9,
            lock_lowest_to_ground=True,
        ))

    assert len(frames) == 30
    return frames


def build_row5_death(parts, sj):
    """Row 5: HURT ([150, 6]) & DEATH ([150, 30]) -- Servo-Stagger -> Buckle -> Prone Rest."""
    frames = []
    for f in range(30):
        f_spread = 1.0 if f < 14 else max(0.0, 1.0 - (f - 14) / 10.0)
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
        elif f < 14:
            u = (f - 6) / 7.0
            pdx = -4.5 - u * 3.0
            pdy = 2.0 + u * 18.0
            tdeg = -12.0 + u * 44.0
            hdeg = -8.0 + u * 22.0
            l_th, l_sh = -28.0 * u, 52.0 * u
            r_th, r_sh = -22.0 * u, 48.0 * u
            wdeg = -45.0 + u * 68.0
            gr = (8.0 + u * 4.0, 6.0 + u * 5.0)
            w_abs = None
        elif f < 22:
            u = (f - 14) / 7.0
            pdx = -4.0 + u * 18.0
            pdy = 20.0 + u * 14.0
            tdeg = 32.0 + u * 54.5
            hdeg = 14.0 - u * 10.0
            l_th = -12.0 * (1.0 - u) + 56.0 * u
            l_sh = 44.0 * (1.0 - u) + 2.0 * u
            r_th = 42.0 * (1.0 - u) + 114.0 * u
            r_sh = 16.0 * (1.0 - u) - 8.0 * u
            h_in = 0.72 * u
            c_in = 0.65 * u
            lc_deg = 2.0
            rc_deg = 4.0
            wdeg = 18.0 * (1.0 - u) + 2.0 * u
            gr = (12.0, 11.0)
            w_abs = (76.0 + u * 8.0, 108.0 + u * 2.0)
        else:
            u = (f - 22) / 7.0
            pdx = 14.0
            pdy = 34.0
            tdeg = 86.5 + math.sin(u * math.pi) * 0.6
            hdeg = 4.0
            l_th, l_sh = 56.0, 2.0
            r_th, r_sh = 114.0, -8.0
            h_in = 0.72
            c_in = 0.65
            lc_deg = 2.0
            rc_deg = 4.0
            wdeg = 1.5
            gr = (12.0, 11.0)
            w_abs = (84.0, 110.0)

        if f < 14:
            h_in = 0.0
            c_in = 0.25
            lc_deg = max(-20.0, -tdeg * 0.25)
            rc_deg = max(-16.0, -tdeg * 0.20)

        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=pdx, pelvis_dy=pdy,
            torso_deg=tdeg, head_deg=hdeg,
            mane_deg=-tdeg * 0.22,
            l_coat_deg=lc_deg, r_coat_deg=rc_deg,
            coat_wave_ph=f * 0.45, coat_wave_amp=3.0 if f >= 14 else 4.0,
            coat_x_inward_frac=c_in,
            l_thigh_deg=l_th, l_shin_deg=l_sh,
            r_thigh_deg=r_th, r_shin_deg=r_sh,
            hip_inward_frac=h_in,
            grip_rel_sh=gr, weapon_deg=wdeg, blade_len=42.0,
            weapon_layer="front", weapon_abs_160=w_abs,
            funnel_spread=f_spread, rune_phase=f * 0.7, lock_lowest_to_ground=True,
        ))
    return frames


def build_row6_dash(parts, sj, keyposes):
    """Row 6: DASH -- Low Thruster-Boosted Cyber-Samurai Sprint (30 Frames)."""
    frames = []
    for f in range(30):
        ph = (f / 10.0) * 2.0 * math.pi
        def post_dash(arr, neck, _g, step=f):
            for k in range(3):
                sy = int(neck[1] + 6 + k * 14 + ((step * 3 + k * 5) % 5))
                sx0 = 8 + ((step * 7 + k * 11) % 16)
                for dx in range(10 + (k % 2) * 4):
                    put_px_160(arr, sx0 + dx, sy, C_CYAN_NEON if dx > 5 else C_MAG_HOT)
            draw_cyber_sparks_160(arr, impact_x=24.0 + (step % 4) * 2.0, ground_y=114.0, spread=12.0, progress=(step % 5) / 5.0, count=4)

        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K2_LUNGE",
            pelvis_dx=9.5 + math.sin(ph) * 1.2,
            pelvis_dy=0.8 + math.cos(ph) * 0.8,
            body_tilt_deg=5.0 + math.sin(ph) * 1.5,
            grip_rel_sh=(-3.5, 4.5),
            weapon_deg=158.0 + math.sin(ph) * 3.0,
            blade_len=46.0,
            weapon_layer="behind",
            funnel_spread=1.18,
            rune_phase=(f / 30.0) * 6.0 * math.pi,
            post_fn=post_dash,
        ))
    return frames


def build_row7_crouch(parts, sj, keyposes):
    """Row 7: CROUCH -- Hex-Matrix Odachi Guard -> Explosive HF-Plasma Counter-Slash!"""
    frames = []
    for f in range(10):
        ph = (f / 10.0) * 2.0 * math.pi
        def post_guard(arr, _n, grip, step=f):
            if 2 <= step <= 8:
                draw_star_glint_160(arr, grip[0] + 6.0, grip[1] - 8.0, arm_len=4 + (step % 3))
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=2.0, pelvis_dy=9.0 + math.sin(ph) * 0.8,
            torso_deg=8.0 + math.sin(ph) * 1.2, head_deg=-6.0,
            l_coat_deg=8.0, r_coat_deg=4.0, coat_wave_ph=ph, coat_wave_amp=5.0,
            l_thigh_deg=-22.0, l_shin_deg=38.0, l_foot_deg=-12.0,
            r_thigh_deg=-26.0, r_shin_deg=42.0, r_foot_deg=-14.0,
            grip_rel_sh=(12.0, 2.0 + math.sin(ph) * 0.6),
            weapon_deg=-68.0 + math.sin(ph) * 2.0,
            blade_len=45.0, weapon_layer="front",
            funnel_spread=1.12, rune_phase=f * 0.7, lock_lowest_to_ground=True, post_fn=post_guard,
        ))

    for sub in range(3):
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K1_COIL",
            pelvis_dx=-1.0 - sub * 1.2, pelvis_dy=2.0, body_tilt_deg=-3.0 - sub * 1.8,
            grip_rel_sh=(-3.5, -2.0), weapon_deg=-142.0 - sub * 5.0, blade_len=45.0,
            funnel_spread=1.10, rune_phase=sub * 0.9, bend_l=-1.0, bend_r=-1.0,
        ))

    for sub in range(10):
        def post_riposte(arr, _n, _g, s=sub):
            if s <= 3:
                tails = [34.0, -28.0, -76.0, -108.0]
                thicks = [27.0, 18.0, 11.0, 6.5]
                draw_hf_plasma_smear_160(
                    arr, cx=80.0, cy=61.0, tail_deg=tails[s], lead_deg=-124.0, sweep_dir=-1,
                    rx_outer=74.0 - s * 2.0, ry_outer=50.0, max_thickness=thicks[s],
                    n_teeth=8 - s, tooth_depth=9.5 - s * 1.6, phase=0.2 + s * 0.25,
                )
        pose_nm = "K2_LUNGE" if sub == 0 else "K3_RISE"
        wdeg = -118.0 if sub == 0 else (-126.0 + max(0, sub - 4) * 6.0)
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, pose_nm,
            pelvis_dx=10.5 - max(0, sub - 5) * 1.0, pelvis_dy=0.5, body_tilt_deg=-3.0 + sub * 0.5,
            grip_rel_sh=(5.5, -10.0 + max(0, sub - 5) * 1.2), weapon_deg=wdeg, blade_len=46.0, sori_sign=-1.0,
            funnel_spread=1.16, rune_phase=sub * 0.8, bend_l=-1.0, bend_r=-1.0, post_fn=post_riposte,
        ))

    for sub in range(7):
        u = (sub + 1) / 7.0
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=4.5 * (1.0 - u) + 2.0 * u, pelvis_dy=9.0 * u,
            torso_deg=8.0 * u, head_deg=-6.0 * u,
            l_coat_deg=8.0, r_coat_deg=4.0, coat_wave_ph=sub * 0.6, coat_wave_amp=5.0,
            l_thigh_deg=-22.0 * u, l_shin_deg=38.0 * u, l_foot_deg=-12.0 * u,
            r_thigh_deg=-26.0 * u, r_shin_deg=42.0 * u, r_foot_deg=-14.0 * u,
            grip_rel_sh=(12.0, 2.5), weapon_deg=-68.0, blade_len=45.0,
            funnel_spread=1.08, rune_phase=sub * 0.7, lock_lowest_to_ground=True,
        ))

    assert len(frames) == 30
    return frames


def build_row8_jump(parts, sj, keyposes):
    """Row 8: JUMP / DODGE -- Wing-Pylon Thruster Vault -> Mid-Air Plasma Cleave -> Landing."""
    frames = []
    for f in range(4):
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=2.0, pelvis_dy=3.0 + f * 2.0,
            torso_deg=10.0 + f * 2.0, head_deg=-6.0,
            l_thigh_deg=-18.0 - f * 4.0, l_shin_deg=34.0 + f * 5.0,
            r_thigh_deg=-20.0 - f * 4.0, r_shin_deg=36.0 + f * 5.0,
            grip_rel_sh=(-3.5, 8.0), weapon_deg=152.0, blade_len=45.0, weapon_layer="behind",
            funnel_spread=1.10, rune_phase=f * 0.7, lock_lowest_to_ground=True,
        ))

    for sub in range(9):
        t = sub / 8.0
        pdy = -8.0 - math.sin(t * math.pi * 0.65) * 14.0
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K4_LEAP",
            pelvis_dx=4.0 + sub * 0.5, pelvis_dy=pdy, body_tilt_deg=-4.0 - sub * 0.5,
            grip_rel_sh=(-3.0, -6.5), weapon_deg=-144.0 - sub * 1.8, blade_len=44.0,
            funnel_spread=1.22, rune_phase=sub * 0.8, bend_l=-1.0, bend_r=-1.0,
        ))

    for sub in range(8):
        pdy = -20.0 + sub * 2.4
        def post_air(arr, _n, _g, s=sub):
            if s <= 3:
                tails = [-154.0, -68.0, -18.0, 8.0]
                thicks = [25.0, 16.0, 9.5, 5.5]
                draw_hf_plasma_smear_160(
                    arr, cx=78.0, cy=52.0 + s * 2.0, tail_deg=tails[s], lead_deg=30.0, sweep_dir=1,
                    rx_outer=72.0 - s * 2.0, ry_outer=48.0, max_thickness=thicks[s],
                    n_teeth=8 - s, tooth_depth=9.0 - s * 1.6, phase=0.15 + s * 0.25,
                )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K4_LEAP",
            pelvis_dx=8.0, pelvis_dy=pdy, body_tilt_deg=5.5,
            grip_rel_sh=(14.0, 4.0), weapon_deg=28.0 + min(3, sub) * 1.5, blade_len=48.0,
            funnel_spread=1.18, rune_phase=sub * 0.9, post_fn=post_air,
        ))

    for sub in range(9):
        u = sub / 8.0
        comp = math.sin(min(1.0, u * 1.6) * math.pi) * 6.0 * (1.0 - 0.5 * u)
        def post_land(arr, _n, _g, s=sub):
            if s <= 2:
                draw_cyber_sparks_160(arr, impact_x=64.0, ground_y=114.0, spread=18.0, progress=s / 3.0, count=5)
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=5.5 * (1.0 - u), pelvis_dy=comp,
            torso_deg=8.0 * (1.0 - u), head_deg=-4.5 * (1.0 - u),
            l_thigh_deg=-16.0 * (1.0 - u), l_shin_deg=28.0 * (1.0 - u),
            r_thigh_deg=-18.0 * (1.0 - u), r_shin_deg=30.0 * (1.0 - u),
            grip_rel_sh=(11.5, 8.5), weapon_deg=-22.0 * u + 26.0 * (1.0 - u), blade_len=48.0, sori_sign=-1.0,
            funnel_spread=1.02, rune_phase=sub * 0.7, lock_lowest_to_ground=True, post_fn=post_land,
        ))

    assert len(frames) == 30
    return frames


def build_row9_victory(parts, sj, keyposes):
    """Row 9: VICTORY -- Chiburi Plasma-Shake Flourish -> Sovereign Valkyrie Odachi Salute!"""
    frames = []
    for f in range(7):
        wdeg = -18.0 - f * 19.0
        def post_fl(arr, _n, _g, s=f):
            if 2 <= s <= 5:
                draw_hf_plasma_smear_160(
                    arr, cx=76.0, cy=58.0, tail_deg=wdeg + 48.0, lead_deg=wdeg, sweep_dir=-1,
                    rx_outer=66.0, ry_outer=46.0, max_thickness=12.0,
                    n_teeth=6, tooth_depth=5.5, phase=s * 0.3,
                )
        frames.append(render_keypose_frame_160(
            parts, sj, keyposes, "K3_RISE",
            pelvis_dx=4.0 - f * 0.4, pelvis_dy=-f * 0.3, body_tilt_deg=-f * 0.5,
            grip_rel_sh=(10.0 - f * 0.8, 2.0 - f * 1.7), weapon_deg=wdeg, blade_len=46.0, sori_sign=-1.0,
            funnel_spread=1.18, rune_phase=f * 0.9, bend_l=-1.0, bend_r=-1.0, post_fn=post_fl,
        ))

    for sub in range(6):
        u = (sub + 1) / 6.0
        plant_y = 54.0 + u * 15.0
        def post_plant(arr, _n, _g, s=sub):
            if s >= 4:
                draw_cyber_sparks_160(arr, impact_x=74.0, ground_y=114.0, spread=20.0, progress=(s - 4) * 0.35 + 0.15, count=7)
                draw_star_glint_160(arr, 74.0, 62.0, arm_len=6)
        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=1.5 * (1.0 - u), pelvis_dy=1.2 * math.sin(u * math.pi),
            torso_deg=2.5 * (1.0 - u), head_deg=-1.5,
            weapon_abs_160=(74.0, plant_y), weapon_deg=90.0, blade_len=41.0, weapon_layer="front",
            funnel_spread=1.24, rune_phase=sub * 0.9, post_fn=post_plant,
        ))

    for sub in range(17):
        ph = (sub / 17.0) * 2.0 * math.pi
        def post_salute(arr, _n, _g, s=sub, p=ph):
            for m in range(3):
                mx = 68.0 + m * 6.0 + math.sin(p + m * 2.1) * 2.5
                my = 108.0 - ((s * 3 + m * 13) % 38)
                put_px_160(arr, mx, my, C_CYAN_NEON if (s + m) % 2 == 0 else C_MAG_HOT)

        frames.append(render_stand_rig_frame_160(
            parts, sj,
            pelvis_dx=0.0, pelvis_dy=math.sin(ph) * 0.8,
            torso_deg=-1.5 + math.sin(ph) * 1.0, head_deg=1.5,
            l_coat_deg=5.0 + math.sin(ph - 0.5) * 4.5, r_coat_deg=-2.0 + math.cos(ph) * 3.0,
            coat_wave_ph=ph, coat_wave_amp=6.0,
            weapon_abs_160=(74.0, 69.0), weapon_deg=90.0, blade_len=41.0, weapon_layer="front",
            funnel_spread=1.26 + math.sin(ph) * 0.04, rune_phase=ph * 2.0, post_fn=post_salute,
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

                if r_idx == 2 and c_idx in (3, 9, 17, 25):
                    row2_snap_reaches_320[c_idx] = (xmax + 1) * 2

            if c_idx > 0:
                prev_a = row_frames[c_idx - 1]
                if not np.array_equal(clean160, prev_a):
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
    print(f"[QA] Row 2 snap-frame front reach x_320 (must be > 200): {row2_snap_reaches_320}")

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
    max_foot_span = max(walk_spans)
    min_foot_span = min(walk_spans)
    max_adj_top = max(abs(walk_tops[(i + 1) % 30] - walk_tops[i]) for i in range(30))
    d_sole_1 = walk_sole_xs[6] - walk_sole_xs[1]
    d_sole_2 = walk_sole_xs[21] - walk_sole_xs[16]
    d_boot_1 = walk_boot_xs[6] - walk_boot_xs[1]
    d_boot_2 = walk_boot_xs[21] - walk_boot_xs[16]
    print(
        f"[QA] Row 1 WALK footSpan320: min={min_foot_span}px max={max_foot_span}px "
        f"ratio={min_foot_span / max(1, max_foot_span):.2f} "
        f"(F00={walk_spans[0]} F07={walk_spans[7]} F15={walk_spans[15]} F22={walk_spans[22]}) "
        f"bots=[{min(walk_bots)}..{max(walk_bots)}] maxAdjTopDelta={max_adj_top}"
    )
    print(
        f"[QA] Row 1 WALK stanceDelta: sole(1->6={d_sole_1:+.1f}px, 16->21={d_sole_2:+.1f}px) "
        f"boot(1->6={d_boot_1:+.1f}px, 16->21={d_boot_2:+.1f}px)"
    )
    assert max_foot_span >= 56, f"Walk contact stride too narrow: {max_foot_span}"
    assert min_foot_span <= max_foot_span * 0.55, f"Crab walk detected: min={min_foot_span} > 0.55*{max_foot_span}"
    assert min(walk_bots) >= 222 and max(walk_bots) <= 233, f"Walk footY out of [222..233]: {walk_bots}"
    assert max_adj_top <= 4, f"Walk head-top pop > 4px: {max_adj_top}"
    assert d_sole_1 <= -8.0 and d_sole_2 <= -8.0, f"Moonwalk in sole band: {(d_sole_1, d_sole_2)}"
    assert d_boot_1 <= -8.0 and d_boot_2 <= -8.0, f"Moonwalk in boot band: {(d_boot_1, d_boot_2)}"

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
    r1_im = Image.new("RGBA", (r1_cols * CELL_W, r1_rows * CELL_H), (18, 22, 36, 255))
    r1_draw = ImageDraw.Draw(r1_im)
    for f in range(30):
        gc = f % r1_cols
        gr = f // r1_cols
        ox, oy = gc * CELL_W, gr * CELL_H
        cell = sheet.crop((f * CELL_W, 1 * CELL_H, (f + 1) * CELL_W, 2 * CELL_H))
        r1_draw.rectangle([ox, oy, ox + CELL_W - 1, oy + CELL_H - 1], outline=(46, 56, 84, 255), width=1)
        r1_draw.line([(ox + 8, oy + ANCHOR_Y_320), (ox + CELL_W - 8, oy + ANCHOR_Y_320)], fill=(58, 72, 108, 255), width=1)
        r1_draw.line([(ox + ANCHOR_X_320, oy + ANCHOR_Y_320 - 10), (ox + ANCHOR_X_320, oy + ANCHOR_Y_320 + 6)], fill=(236, 72, 153, 255), width=1)
        r1_im.alpha_composite(cell, (ox, oy))
        r1_draw.text((ox + 8, oy + 6), f"R1 F{f:02d} (#{30 + f})", fill=(103, 232, 249, 255))

    p_r1 = os.path.join(SCRATCH_DIR, "debug_android_ex_row1_walk.png")
    r1_im.save(p_r1)
    print(f"[Debug] Saved {p_r1}")

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
        r2_draw.line([(ox + ANCHOR_X_320, oy + ANCHOR_Y_320 - 10), (ox + ANCHOR_X_320, oy + ANCHOR_Y_320 + 6)], fill=(236, 72, 153, 255), width=1)
        r2_im.alpha_composite(cell, (ox, oy))
        r2_draw.text((ox + 8, oy + 6), f"R2 F{f:02d} (#{60 + f})", fill=(224, 252, 255, 255))

    p_r2 = os.path.join(SCRATCH_DIR, "debug_android_ex_row2.png")
    r2_im.save(p_r2)

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
                    hd.text((ox + 4, oy + 3), f"R{r} F{c:02d}", fill=(103, 232, 249, 255))
        out_p = os.path.join(SCRATCH_DIR, f"debug_android_ex_10rows_{half_nm}.png")
        half_im.save(out_p)
        print(f"[Debug] Saved {out_p}")

    print(f"[Debug] Saved {p_r2}")


def main():
    t0 = time.time()
    print("=== Building VEX-09 EX (android_ex) Next-Gen Wide-Canvas Sheet ===")
    if not os.path.exists(OUT_PORTRAIT_PNG):
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
