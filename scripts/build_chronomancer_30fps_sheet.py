#!/usr/bin/env python3
"""
Builds Chronos v3 (Chronomancer — Sovereign Martial Horologist & Master of the Twin Hands of Fate)
30fps HD-2D Sprite Sheet (`assets/sprites/chronomancer_sheet.png`, 6240x1872, 30 cols x 9 rows of 208x208)
using `assets/sprites/chronomancer_v3_base.jpg` + `hd2d_rig_core`.

Key Features:
- Surgical 13-part anatomical segmentation of `chronomancer_v3_base.jpg` (swept platinum-silver hair,
  brass-cyan clockwork diadem, brass monocle-visor, midnight-indigo horologist battle-coat with glowing
  cyan hourglass chest core, antique brass gear pauldrons, separated arms/gauntlets, split coat-tails,
  and separated front/back greaves & boots) with 0 unassigned foreground pixels and 0 leftover hands.
- Strict 20-Color Hand-Crafted Sovereign Horologist `MASTER_PALETTE` (`#090c18` Selout, 4-shade
  midnight-indigo & slate-navy coat ramp, 4-shade antique brass & sovereign gold ramp, 3-shade
  platinum-silver hair ramp, 3-shade noble warm skin ramp, 5-shade luminous turquoise-cyan & white
  Chronocore ramp `#0d9488..#ecfeff`) + 2-pass cardinal orphan despeckle + pinhole sealing + 1px Selout.
- Iconic Silhouette Upgrades:
  * Back Attachment: Rotating Grand XII Brass & Cyan Escapement Clock-Wheel Halo (`normal`, `swept`,
    `flare`, and `off` modes).
  * Right Hand (`r_hand`): The Minute Glaive (~42px giant golden-brass & cyan-crystal clock-hand
    sword-spear with circular brass escapement gear crossguard & pendulum counterweight pommel).
  * Left Hand (`l_hand`): Twin Burnished-Gold Hour Clock-Dagger (for Twin-Hand X-Scissor cleaves &
    X-Cross Parries) OR glowing cyan-gold Pocket-Astrolabe Chronometer (`IDLE` hover, `SKILL` anchor
    stamp, & `ULTIMATE` `"TIME RESUMES!"` pocket-watch snap!).
- Dual-Arm Analytical 2-Bone Inverse Kinematics across all martial poses, zero canvas shear, zero
  crossed knees, `0/270` border clips, `0` interior pinholes, and `29/29` distinct transitions per row.
"""

import os
import math
from collections import deque
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from hd2d_rig_core import (
    CELL, LOGICAL, COLS, ROWS, P, BASE_NUMERIC_KEYS,
    poly_mask, keep_largest_component, assign_remaining_geodesic,
    extract_parts_512, rot_pt, render_rig_104, build_and_save_30fps_sheet,
)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE_IMG_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "chronomancer_v3_base.jpg")
OUT_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "chronomancer_sheet.png")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"

# Curated 20-Color Sovereign Horologist & Twin Clock-Blade Master Palette
MASTER_PALETTE = np.array([
    [9, 12, 24],      # 0: Deep Obsidian-Indigo Selout (#090c18)
    [22, 26, 46],     # 1: Midnight-Indigo Coat Deep Shadow / Lit Selout (#161a2e)
    [34, 44, 78],     # 2: Horologist Battle-Coat Base Indigo (#222c4e)
    [54, 70, 116],    # 3: Slate-Navy Coat Fold & Poleyn Midtone (#364674)
    [84, 106, 158],   # 4: Lit Slate-Navy Coat Rim & Greave Highlight (#546a9e)
    [88, 60, 28],     # 5: Dark Antique Clockwork Bronze Shadow (#583c1c)
    [142, 100, 42],   # 6: Burnished Escapement Brass Midtone (#8e642a)
    [202, 154, 62],   # 7: Sovereign Horologist Gold Highlight (#ca9a3e)
    [246, 214, 108],  # 8: Specular Sunlit Gold Gear-Tooth Gleam (#f6d66c)
    [124, 136, 158],  # 9: Cool Slate-Silver Hair Shadow (#7c889e)
    [178, 190, 210],  # 10: Platinum-Silver Hair Midtone (#b2bed2)
    [234, 242, 250],  # 11: Luminous Pale Silver-White Hair Crown (#eaf2fa)
    [156, 112, 88],   # 12: Warm Portrait Skin Shadow (#9c7058)
    [204, 162, 130],  # 13: Noble Warm Peach-Ivory Skin Midtone (#cca282)
    [240, 206, 174],  # 14: Lit Noble Face Highlight (#f0ceae)
    [13, 148, 136],   # 15: Deep Teal Chronocore Edge (#0d9488)
    [20, 184, 166],   # 16: Rich Turquoise Escapement Glow (#14b8a6)
    [45, 212, 191],   # 17: Radiant Mint-Turquoise Clock-Blade Mid (#2dd4bf)
    [103, 232, 249],  # 18: Luminous Sky-Cyan Hourglass & Blade Edge (#67e8f9)
    [236, 254, 255],  # 19: Pure White-Hot Chronocore Singularity (#ecfeff)
], dtype=np.int32)

# Pre-bound RGBA palette colors (100% strictly in MASTER_PALETTE)
C_OUT = (9, 12, 24, 255)
C_COAT_DARK = (22, 26, 46, 255)
C_COAT_BASE = (34, 44, 78, 255)
C_COAT_MID = (54, 70, 116, 255)
C_COAT_LIT = (84, 106, 158, 255)
C_BRASS_DARK = (88, 60, 28, 255)
C_BRASS_MID = (142, 100, 42, 255)
C_GOLD_LIT = (202, 154, 62, 255)
C_GOLD_SPEC = (246, 214, 108, 255)
C_TEAL_DARK = (13, 148, 136, 255)
C_TURQ_DEEP = (20, 184, 166, 255)
C_TURQ_MID = (45, 212, 191, 255)
C_CYAN_LIT = (103, 232, 249, 255)
C_CORE = (236, 254, 255, 255)

# Skeletal pivots in 512x512 rig space (0.5x of 1024x1024 chronomancer_v3_base.jpg)
PIVOTS = dict(
    pelvis=(268.0, 248.0),
    neck=(264.0, 113.0),
    l_sh=(201.0, 138.0), l_elb=(179.0, 206.0), l_hand=(185.0, 290.0),
    r_sh=(308.0, 143.0), r_elb=(319.0, 211.0), r_hand=(344.0, 288.0),
    l_hip=(236.0, 272.0), l_knee=(218.0, 356.0), l_ank=(198.0, 448.0),
    r_hip=(290.0, 272.0), r_knee=(298.0, 356.0), r_ank=(296.0, 442.0),
)

# Precompute 2-Bone IK rest lengths & angles for BOTH arms in 512-space
_L1 = math.hypot(PIVOTS["l_elb"][0] - PIVOTS["l_sh"][0], PIVOTS["l_elb"][1] - PIVOTS["l_sh"][1])
_L2 = math.hypot(PIVOTS["l_hand"][0] - PIVOTS["l_elb"][0], PIVOTS["l_hand"][1] - PIVOTS["l_elb"][1])
_AL1 = math.degrees(math.atan2(PIVOTS["l_elb"][1] - PIVOTS["l_sh"][1], PIVOTS["l_elb"][0] - PIVOTS["l_sh"][0]))
_AL2 = math.degrees(math.atan2(PIVOTS["l_hand"][1] - PIVOTS["l_elb"][1], PIVOTS["l_hand"][0] - PIVOTS["l_elb"][0]))

_R1 = math.hypot(PIVOTS["r_elb"][0] - PIVOTS["r_sh"][0], PIVOTS["r_elb"][1] - PIVOTS["r_sh"][1])
_R2 = math.hypot(PIVOTS["r_hand"][0] - PIVOTS["r_elb"][0], PIVOTS["r_hand"][1] - PIVOTS["r_elb"][1])
_AR1 = math.degrees(math.atan2(PIVOTS["r_elb"][1] - PIVOTS["r_sh"][1], PIVOTS["r_elb"][0] - PIVOTS["r_sh"][0]))
_AR2 = math.degrees(math.atan2(PIVOTS["r_hand"][1] - PIVOTS["r_elb"][1], PIVOTS["r_hand"][0] - PIVOTS["r_elb"][0]))

PALETTE_CFG = dict(
    palette=MASTER_PALETTE,
    protect_indices=(7, 8, 13, 14, 16, 17, 18, 19),
    hair_indices=(9, 10, 11),
    lit_selout=1,
    shad_selout=0,
    hair_selout=9,
    joint_fill=(22, 26, 46, 255),
    joint_inner=(34, 44, 78, 255),
    hip_r=19,
    thigh_r=15,
    arm_r=13,
    pinhole_fill=(34, 44, 78, 255),
)


def put_px_safe(arr, x, y, col):
    """Strictly clamps drawn pixels inside x in [4..99], y in [4..99] (zero 2px-margin border clips)."""
    ix, iy = int(round(x)), int(round(y))
    if 4 <= ix <= 99 and 4 <= iy <= 99:
        arr[iy, ix] = col


def draw_line_safe(arr, x0, y0, x1, y1, col, thickness=1):
    steps = int(max(abs(x1 - x0), abs(y1 - y0)) * 2.4) + 1
    for i in range(steps + 1):
        t = i / max(1, steps)
        x = x0 + (x1 - x0) * t
        y = y0 + (y1 - y0) * t
        if thickness <= 1:
            put_px_safe(arr, x, y, col)
        else:
            r = thickness // 2
            for dy in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    if dx * dx + dy * dy <= r * r + 1:
                        put_px_safe(arr, x + dx, y + dy, col)


def nearest_palette_rgba(rgb_vec):
    diff = MASTER_PALETTE - rgb_vec[None, :]
    d2 = diff[:, 0] ** 2 * 2 + diff[:, 1] ** 2 * 3 + diff[:, 2] ** 2 * 2
    best = MASTER_PALETTE[int(np.argmin(d2))]
    return [int(best[0]), int(best[1]), int(best[2]), 255]


def fill_layer_pinholes(arr104, max_hole_px=22):
    """
    Seals 100% of enclosed interior pinholes <= max_hole_px and 3-neighbor seam slits
    using palette-quantized neighbor colors so final frames have 0 interior pinholes
    and 0 off-palette colors.
    """
    out = arr104.copy()
    H, W = out.shape[:2]

    def fill_from_neighbors(buf, target_mask):
        ys, xs = np.where(target_mask)
        for y, x in zip(ys, xs):
            if y < 4 or y > H - 5 or x < 4 or x > W - 5:
                continue
            cols = []
            for ny, nx in (
                (y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1),
                (y - 1, x - 1), (y - 1, x + 1), (y + 1, x - 1), (y + 1, x + 1),
            ):
                if 0 <= ny < H and 0 <= nx < W and buf[ny, nx, 3] > 128:
                    cols.append(buf[ny, nx, :3])
            if cols:
                med = np.median(np.array(cols, dtype=np.int32), axis=0)
                buf[y, x] = nearest_palette_rgba(med)

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
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if not a[y, x] and not ext[y, x]:
                ext[y, x] = True
                q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if not a[y, x] and not ext[y, x]:
                ext[y, x] = True
                q.append((y, x))
    while q:
        cy, cx = q.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < H and 0 <= nx < W and not ext[ny, nx] and not a[ny, nx]:
                ext[ny, nx] = True
                q.append((ny, nx))

    enclosed = (~a) & (~ext)
    if np.any(enclosed):
        vis = np.zeros((H, W), dtype=bool)
        to_fill = np.zeros((H, W), dtype=bool)
        eys, exs = np.where(enclosed)
        for sy, sx in zip(eys, exs):
            if vis[sy, sx]:
                continue
            comp = [(sy, sx)]
            vis[sy, sx] = True
            hd = 0
            while hd < len(comp):
                cy, cx = comp[hd]
                hd += 1
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < H and 0 <= nx < W and enclosed[ny, nx] and not vis[ny, nx]:
                        vis[ny, nx] = True
                        comp.append((ny, nx))
            if len(comp) <= max_hole_px:
                for py, px in comp:
                    to_fill[py, px] = True
        for _ in range(6):
            rem = to_fill & (out[:, :, 3] <= 128)
            if not np.any(rem):
                break
            fill_from_neighbors(out, rem)

    return out


def count_interior_pinholes_104(arr104, max_hole_px=20):
    """Counts any enclosed interior transparent pinholes <= max_hole_px inside the 104x104 frame."""
    H, W = arr104.shape[:2]
    a = arr104[:, :, 3] > 128
    ext = np.zeros((H, W), dtype=bool)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if not a[y, x] and not ext[y, x]:
                ext[y, x] = True
                q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if not a[y, x] and not ext[y, x]:
                ext[y, x] = True
                q.append((y, x))
    while q:
        cy, cx = q.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < H and 0 <= nx < W and not ext[ny, nx] and not a[ny, nx]:
                ext[ny, nx] = True
                q.append((ny, nx))
    enclosed = (~a) & (~ext)
    if not np.any(enclosed):
        return 0
    vis = np.zeros((H, W), dtype=bool)
    eys, exs = np.where(enclosed)
    holes = 0
    for sy, sx in zip(eys, exs):
        if vis[sy, sx]:
            continue
        comp = [(sy, sx)]
        vis[sy, sx] = True
        hd = 0
        while hd < len(comp):
            cy, cx = comp[hd]
            hd += 1
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < H and 0 <= nx < W and enclosed[ny, nx] and not vis[ny, nx]:
                    vis[ny, nx] = True
                    comp.append((ny, nx))
        if len(comp) <= max_hole_px:
            holes += len(comp)
    return holes


def save_debug_grid_and_parts(base_im_raw, arr512, masks, parts):
    """Outputs `debug_chronomancer_v3_grid.png` and `debug_chronomancer_v3_parts.png`."""
    os.makedirs(ARTIFACT_DIR, exist_ok=True)

    # 1. Coordinate overlay grid (1024x1024)
    grid_im = base_im_raw.copy()
    gd = ImageDraw.Draw(grid_im)
    W0, H0 = grid_im.size
    for x in range(0, W0, 50):
        col = (255, 0, 80, 180) if x % 100 == 0 else (0, 160, 255, 110)
        gd.line([(x, 0), (x, H0 - 1)], fill=col, width=(2 if x % 100 == 0 else 1))
        if x % 100 == 0:
            gd.text((x + 3, 4), str(x), fill=(220, 0, 60, 255))
            gd.text((x + 3, H0 - 18), str(x), fill=(220, 0, 60, 255))
    for y in range(0, H0, 50):
        col = (255, 0, 80, 180) if y % 100 == 0 else (0, 160, 255, 110)
        gd.line([(0, y), (W0 - 1, y)], fill=col, width=(2 if y % 100 == 0 else 1))
        if y % 100 == 0:
            gd.text((4, y + 2), str(y), fill=(220, 0, 60, 255))
            gd.text((W0 - 34, y + 2), str(y), fill=(220, 0, 60, 255))
    grid_im.save(os.path.join(ARTIFACT_DIR, "debug_chronomancer_v3_grid.png"))

    # 2. Segmented parts sheet + color-coded 512x512 anatomical verification map
    cw, ch = 180, 180
    pad = 14
    cols_p, rows_p = 5, 3
    grid_w = cols_p * (cw + pad) + pad
    grid_h = rows_p * (ch + pad + 20) + pad
    map_w = 420
    im_dbg = Image.new("RGBA", (map_w + grid_w, max(540, grid_h)), (20, 22, 36, 255))
    d = ImageDraw.Draw(im_dbg)

    seg_vis = np.zeros((512, 512, 4), dtype=np.uint8)
    part_cols = [
        (255, 220, 90), (70, 150, 255), (120, 80, 240), (190, 90, 240),
        (255, 130, 60), (255, 70, 90), (60, 220, 180), (40, 180, 255),
        (130, 230, 90), (70, 190, 80), (230, 230, 90),
        (255, 160, 190), (220, 100, 160), (255, 205, 120),
    ]
    for (nm, m), col in zip(masks, part_cols):
        seg_vis[m, :3] = (arr512[m, :3].astype(int) * 0.58 + np.array(col) * 0.42).astype(np.uint8)
        seg_vis[m, 3] = 255
    seg_crop = Image.fromarray(seg_vis, "RGBA").crop((130, 20, 390, 510))
    im_dbg.alpha_composite(seg_crop, (40, 25))
    d.text((40, 6), "512x512 SEGMENTATION MAP (0 UNASSIGNED PX)", fill=(103, 232, 249, 255))

    for idx, (nm, _) in enumerate(masks):
        c = idx % cols_p
        r = idx // cols_p
        ox = map_w + pad + c * (cw + pad)
        oy = pad + 20 + r * (ch + pad + 20)
        d.rectangle([ox, oy, ox + cw, oy + ch], fill=(34, 38, 60, 255), outline=(84, 106, 158, 255), width=1)
        pim, _, _ = parts[nm]
        pw, ph = pim.size
        d.text((ox + 2, oy - 16), f"{nm} ({pw}x{ph})", fill=(246, 214, 108, 255))
        sc = min(1.8, (cw - 14) / max(1, pw), (ch - 14) / max(1, ph))
        pim_z = pim.resize((max(1, int(pw * sc)), max(1, int(ph * sc))), Image.Resampling.NEAREST)
        im_dbg.alpha_composite(pim_z, (ox + (cw - pim_z.size[0]) // 2, oy + (ch - pim_z.size[1]) // 2))

    im_dbg.save(os.path.join(ARTIFACT_DIR, "debug_chronomancer_v3_parts.png"))


def load_and_segment_512():
    """
    Loads `chronomancer_v3_base.jpg` (1024x1024):
    1. BFS exterior + enclosed white-pocket removal (`r > 246, g > 246, b > 246` below hair crown).
    2. 3-pass anti-aliased white-fringe stripping (zero white halo).
    3. 2x NEAREST downsample to 512x512 + MedianFilter(size=3) on head / MedianFilter(size=5) on body/boots
       + Chronocore turquoise-cyan gem & hourglass preservation.
    4. Clean 13-part anatomical segmentation with 0 unassigned foreground pixels and 0 static hands on torso/hips.
    """
    base_raw = Image.open(BASE_IMG_PATH).convert("RGBA")
    im = base_raw.copy()

    # BFS exterior + enclosed arm/leg white pockets
    bg_seeds = (
        (0, 0), (1023, 0), (0, 1023), (1023, 1023),
        (415, 420), (635, 535), (520, 800),
    )
    for sx, sy in bg_seeds:
        px = im.getpixel((sx, sy))
        if px[3] > 0 and px[0] > 215 and px[1] > 215 and px[2] > 215:
            ImageDraw.floodfill(im, (sx, sy), (0, 0, 0, 0), thresh=42)

    arr = np.array(im)
    # Strip any remaining enclosed pure-white background pockets (r > 246, g > 246, b > 246)
    # below y=205 while preserving 100% of the swept platinum-silver hair crown (y in 66..200)
    r0 = arr[:, :, 0].astype(np.int16)
    g0 = arr[:, :, 1].astype(np.int16)
    b0 = arr[:, :, 2].astype(np.int16)
    a0 = arr[:, :, 3] > 0
    yy1024 = np.arange(1024)[:, None]
    arr[a0 & (yy1024 > 205) & (r0 > 246) & (g0 > 246) & (b0 > 246)] = [0, 0, 0, 0]

    # 3-Pass Anti-Aliased White-Fringe Stripping
    for _ in range(3):
        a0 = arr[:, :, 3] > 0
        up = np.pad(a0[1:, :], ((0, 1), (0, 0)), constant_values=False)
        dn = np.pad(a0[:-1, :], ((1, 0), (0, 0)), constant_values=False)
        lf = np.pad(a0[:, 1:], ((0, 0), (0, 1)), constant_values=False)
        rt = np.pad(a0[:, :-1], ((0, 0), (1, 0)), constant_values=False)
        edge = a0 & (~(up & dn & lf & rt))
        r = arr[:, :, 0].astype(np.int16)
        g = arr[:, :, 1].astype(np.int16)
        b = arr[:, :, 2].astype(np.int16)
        wf = edge & (r > 175) & (g > 175) & (b > 175) & (np.abs(r - g) < 28) & (np.abs(g - b) < 28)
        arr[wf] = [0, 0, 0, 0]

    im512 = Image.fromarray(arr, "RGBA").resize((512, 512), Image.Resampling.NEAREST)
    raw512 = np.array(im512)
    rgb512 = im512.convert("RGB")
    rgb_med3 = np.array(rgb512.filter(ImageFilter.MedianFilter(size=3)))
    rgb_med5 = np.array(rgb512.filter(ImageFilter.MedianFilter(size=5)))
    arr512 = raw512.copy()
    H, W = 512, 512

    # Trim only the tiny dark back-hem tab hanging between the knees (x=495..532, y=654..742)
    inner_tab = poly_mask(H, W, P([(495, 654), (532, 654), (532, 742), (495, 742)]))
    arr512[inner_tab] = [0, 0, 0, 0]
    alpha = keep_largest_component(arr512[:, :, 3] > 0)
    arr512[~alpha] = [0, 0, 0, 0]

    # MedianFilter(size=3) on head (y < 126), MedianFilter(size=5) on body/boots (y >= 126)
    yy = np.arange(512)[:, None]
    cel_rgb = np.where(yy[:, :, None] < 126, rgb_med3, rgb_med5)
    arr512[:, :, :3] = np.where(alpha[:, :, None], cel_rgb, 0)

    # Preserve crisp glowing turquoise-cyan diadem gems, monocle lens, eye, & chest hourglass core
    rr = raw512[:, :, 0].astype(np.int16)
    rg = raw512[:, :, 1].astype(np.int16)
    rb = raw512[:, :, 2].astype(np.int16)
    cyan_glow = alpha & (yy < 200) & (rg > 125) & ((rg - rr) > 28) & (rb > 110)
    cyan_mid = cyan_glow & (rg > 175)
    cyan_hot = cyan_glow & (rg > 228) & (rb > 205)
    arr512[cyan_glow] = [20, 184, 166, 255]
    arr512[cyan_mid] = [103, 232, 249, 255]
    arr512[cyan_hot] = [236, 254, 255, 255]

    a = alpha

    m_head = poly_mask(H, W, P([
        (400, 58), (608, 58), (608, 204), (572, 214), (564, 246),
        (524, 248), (504, 232), (488, 202), (446, 193), (400, 165)
    ])) & a

    m_l_sode = poly_mask(H, W, P([
        (335, 222), (434, 222), (458, 256), (460, 318),
        (436, 368), (406, 424), (355, 412), (335, 376)
    ])) & a & (~m_head)

    m_l_forearm = poly_mask(H, W, P([
        (300, 372), (355, 408), (406, 424), (402, 540),
        (414, 554), (414, 598), (408, 608), (400, 622),
        (374, 622), (344, 610), (324, 596), (300, 460)
    ])) & a & (~m_l_sode) & (~m_head)

    m_r_sode = poly_mask(H, W, P([
        (598, 235), (650, 235), (650, 368), (642, 418),
        (602, 430), (600, 355)
    ])) & a & (~m_head)

    m_r_forearm = poly_mask(H, W, P([
        (602, 424), (644, 398), (682, 450), (728, 545),
        (728, 614), (646, 614), (636, 515), (620, 488)
    ])) & a & (~m_r_sode) & (~m_head)

    m_torso = poly_mask(H, W, P([
        (424, 192), (600, 208), (602, 360), (620, 492),
        (596, 578), (546, 555), (506, 578), (482, 545),
        (435, 472), (435, 365), (456, 315)
    ])) & a & (~m_head) & (~m_l_sode) & (~m_l_forearm) & (~m_r_sode) & (~m_r_forearm)

    m_l_coat = poly_mask(H, W, P([
        (306, 468), (442, 468), (502, 518), (490, 560),
        (458, 616), (412, 676), (398, 705), (396, 765), (364, 824), (306, 824)
    ])) & a & (~m_torso) & (~m_l_forearm) & (~m_l_sode)

    m_r_coat = poly_mask(H, W, P([
        (592, 486), (632, 486), (692, 745), (692, 824),
        (640, 824), (634, 675), (616, 605), (592, 545)
    ])) & a & (~m_torso) & (~m_r_forearm) & (~m_r_sode)

    m_l_foot = poly_mask(H, W, P([
        (342, 888), (442, 888), (442, 1008), (342, 1008)
    ])) & a

    m_l_shin = poly_mask(H, W, P([
        (365, 668), (480, 668), (462, 892), (365, 892)
    ])) & a & (~m_l_foot) & (~m_l_coat) & (~m_torso)

    m_l_thigh = poly_mask(H, W, P([
        (405, 520), (534, 520), (528, 685), (405, 685)
    ])) & a & (~m_torso) & (~m_l_coat) & (~m_l_shin) & (~m_l_foot) & (~m_l_forearm)

    m_r_foot = poly_mask(H, W, P([
        (536, 876), (715, 876), (715, 976), (536, 976)
    ])) & a

    m_r_shin = poly_mask(H, W, P([
        (534, 668), (640, 668), (636, 880), (534, 880)
    ])) & a & (~m_r_foot) & (~m_r_coat) & (~m_torso)

    m_r_thigh = poly_mask(H, W, P([
        (526, 520), (638, 520), (638, 685), (526, 685)
    ])) & a & (~m_torso) & (~m_r_coat) & (~m_r_shin) & (~m_r_foot) & (~m_r_forearm)

    raw_list = [
        ("head", m_head), ("torso", m_torso), ("l_coat", m_l_coat), ("r_coat", m_r_coat),
        ("l_sode", m_l_sode), ("l_forearm", m_l_forearm),
        ("r_sode", m_r_sode), ("r_forearm", m_r_forearm),
        ("l_thigh", m_l_thigh), ("l_shin", m_l_shin), ("l_foot", m_l_foot),
        ("r_thigh", m_r_thigh), ("r_shin", m_r_shin), ("r_foot", m_r_foot),
    ]
    masks = assign_remaining_geodesic(a, raw_list)

    covered = np.zeros_like(a)
    for _, m in masks:
        covered |= m
    unassigned = int(np.sum(a & (~covered)))
    assert unassigned == 0, f"Found {unassigned} unassigned foreground pixels!"

    parts = extract_parts_512(arr512, masks)
    save_debug_grid_and_parts(base_raw, arr512, masks, parts)
    return parts


# =============================================================================
# DUAL-ARM ANALYTICAL 2-BONE INVERSE KINEMATICS (512x512 RIG SPACE)
# =============================================================================

def solve_arm_ik(sh_w, target_w, L1, L2, a1_rest, a2_rest, torso_deg, elbow_cw=None):
    dx = target_w[0] - sh_w[0]
    dy = target_w[1] - sh_w[1]
    dist = math.hypot(dx, dy)
    max_reach = (L1 + L2) * 0.98
    min_reach = abs(L1 - L2) + 8.0
    if dist > max_reach:
        dx *= max_reach / dist
        dy *= max_reach / dist
        dist = max_reach
    elif dist < min_reach:
        if dist < 1e-4:
            dx, dy = min_reach, 0.0
        else:
            dx *= min_reach / dist
            dy *= min_reach / dist
        dist = min_reach

    base_ang = math.atan2(dy, dx)
    cos_a1 = max(-1.0, min(1.0, (L1 * L1 + dist * dist - L2 * L2) / (2.0 * L1 * dist)))
    alpha1 = math.acos(cos_a1)

    if elbow_cw is None:
        # Pick natural downward/outward human elbow bend
        th_pos = base_ang + alpha1
        th_neg = base_ang - alpha1
        ey_pos = math.sin(th_pos)
        ey_neg = math.sin(th_neg)
        th1 = th_pos if ey_pos >= ey_neg else th_neg
    else:
        th1 = base_ang + (alpha1 if elbow_cw else -alpha1)

    elb_x = sh_w[0] + math.cos(th1) * L1
    elb_y = sh_w[1] + math.sin(th1) * L1
    th2 = math.atan2(target_w[1] - elb_y, target_w[0] - elb_x)

    sode_deg = math.degrees(th1) - a1_rest
    fore_deg = math.degrees(th2) - a2_rest
    return (sode_deg - torso_deg), (fore_deg - sode_deg)


def apply_dual_chrono_ik(cfg):
    """Solves exact 2-Bone IK independently for `r_hand` (Minute Glaive) and `l_hand` (Hour Blade / Astrolabe)."""
    if not cfg.get("use_dual_ik", True):
        return cfg

    torso_deg = cfg.get("torso_deg", 0.0)
    pel = PIVOTS["pelvis"]
    l_sh_w = rot_pt(PIVOTS["l_sh"], pel, torso_deg)
    r_sh_w = rot_pt(PIVOTS["r_sh"], pel, torso_deg)

    r_target = (pel[0] + cfg.get("r_hx", 62.0), pel[1] + cfg.get("r_hy", -12.0))
    l_target = (pel[0] + cfg.get("l_hx", -52.0), pel[1] + cfg.get("l_hy", 8.0))

    r_sode_rel, r_fore_rel = solve_arm_ik(
        r_sh_w, r_target, _R1, _R2, _AR1, _AR2, torso_deg,
        elbow_cw=cfg.get("r_elbow_cw", None),
    )
    l_sode_rel, l_fore_rel = solve_arm_ik(
        l_sh_w, l_target, _L1, _L2, _AL1, _AL2, torso_deg,
        elbow_cw=cfg.get("l_elbow_cw", None),
    )

    cfg["r_sode_rel_deg"] = r_sode_rel
    cfg["r_fore_rel_deg"] = r_fore_rel
    cfg["l_sode_rel_deg"] = l_sode_rel
    cfg["l_fore_rel_deg"] = l_fore_rel
    return cfg


CHRONO_NUMERIC_KEYS = tuple(BASE_NUMERIC_KEYS) + (
    "r_hx", "r_hy", "l_hx", "l_hy", "minute_deg", "minute_len",
    "hour_deg", "hour_len", "wheel_rot",
)


def eval_chrono_keyframes(f, keyframes, ph, defaults, wave_mult=2.0):
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

    out = dict(defaults)
    for k in CHRONO_NUMERIC_KEYS:
        if k in defaults or k in d0 or k in d1:
            v0 = d0.get(k, defaults.get(k, 0.0))
            v1 = d1.get(k, defaults.get(k, 0.0))
            out[k] = v0 + (v1 - v0) * u

    active_d = d0 if raw_u < 0.5 else d1
    meta_keys = (
        "use_dual_ik", "right_arm_in_front", "right_leg_behind",
        "halo_mode", "left_mode", "show_minute", "resting_weapons",
        "r_elbow_cw", "l_elbow_cw", "ward_ring", "x_intersect_spark",
    )
    for mk in meta_keys:
        if mk in active_d:
            out[mk] = active_d[mk]

    out["mane_wave_phase"] = ph * wave_mult
    return apply_dual_chrono_ik(out)


# =============================================================================
# HOROLOGICAL ATTACHMENTS & THE TWIN HANDS OF FATE (104x104 PIXEL ART)
# =============================================================================

def safe_fit_weapon(hx, hy, ux, uy, back_ext, front_ext, margin=6.0):
    """
    Smoothly shifts grip by up to 4px and scales blade reach if needed so 100% of weapon
    pommel + diamond spear-point + 1px dark outline remain strictly inside [margin .. 103-margin]
    without flat-chopping any blade tip!
    """
    lo = margin
    hi = 103.0 - margin
    hx = max(lo + 4.0, min(hi - 4.0, hx))
    hy = max(lo + 4.0, min(hi - 4.0, hy))

    # Try small axial shift back along -u if forward tip protrudes slightly
    tx = hx + ux * front_ext
    ty = hy + uy * front_ext
    shift = 0.0
    if tx > hi and ux > 0.15:
        shift = max(shift, (tx - hi) / ux)
    elif tx < lo and ux < -0.15:
        shift = max(shift, (tx - lo) / ux)
    if ty > hi and uy > 0.15:
        shift = max(shift, (ty - hi) / uy)
    elif ty < lo and uy < -0.15:
        shift = max(shift, (ty - lo) / uy)

    if shift > 0.0:
        shift = min(4.5, shift)
        hx -= ux * shift
        hy -= uy * shift

    # Compute maximum safe forward reach from (hx, hy)
    max_f = front_ext
    if ux > 0.05:
        max_f = min(max_f, (hi - hx) / ux)
    elif ux < -0.05:
        max_f = min(max_f, (lo - hx) / ux)
    if uy > 0.05:
        max_f = min(max_f, (hi - hy) / uy)
    elif uy < -0.05:
        max_f = min(max_f, (lo - hy) / uy)

    max_b = back_ext
    if -ux > 0.05:
        max_b = min(max_b, (hi - hx) / (-ux))
    elif -ux < -0.05:
        max_b = min(max_b, (lo - hx) / (-ux))
    if -uy > 0.05:
        max_b = min(max_b, (hi - hy) / (-uy))
    elif -uy < -0.05:
        max_b = min(max_b, (lo - hy) / (-uy))

    return hx, hy, max(5.0, max_b), max(12.0, max_f)


def draw_clock_wheel_halo_104(arr, nk_x, nk_y, rot_rad, mode="normal"):
    """
    Renders Chronos's Iconic Rotating Grand XII Brass & Cyan Escapement Clock-Wheel Halo
    behind his shoulders (`normal`, `swept`, `flare`, or `off`).
    Uses a solid midnight-indigo astral clock-dial face so 12 golden/cyan Roman ticks read
    with razor-sharp contrast and 0 interior pinholes!
    """
    if mode == "off":
        return

    if mode == "flare":
        rx, ry = 17.5, 17.5
        cx = max(7.0 + rx, min(96.0 - rx, nk_x - 1.5))
        cy = max(7.0 + ry, min(96.0 - ry, nk_y + 3.5))
    elif mode == "swept":
        rx, ry = 15.0, 11.2
        cx = max(7.0 + rx, min(96.0 - rx, nk_x - 6.0))
        cy = max(7.0 + ry, min(96.0 - ry, nk_y + 4.5))
    else:
        rx, ry = 14.0, 14.0
        cx = max(7.0 + rx, min(96.0 - rx, nk_x - 2.5))
        cy = max(7.0 + ry, min(96.0 - ry, nk_y + 4.5))

    ix0, ix1 = int(cx - rx - 4), int(cx + rx + 4)
    iy0, iy1 = int(cy - ry - 4), int(cy + ry + 4)

    # 1. Astral Clock-Dial Backing + Sculpted Two-Tone Brass/Gold Bezel + 1px Selout
    for py in range(max(4, iy0), min(100, iy1 + 1)):
        dy = (py - cy) / ry
        for px in range(max(4, ix0), min(100, ix1 + 1)):
            dx = (px - cx) / rx
            rn = math.hypot(dx, dy)
            if rn > 1.03:
                continue
            if rn >= 0.93:
                col = C_OUT
            elif rn >= 0.80:
                if dx + dy < -0.15:
                    col = C_GOLD_SPEC if mode == "flare" else C_GOLD_LIT
                elif dx + dy < 0.35:
                    col = C_GOLD_LIT if mode == "flare" else C_BRASS_MID
                else:
                    col = C_BRASS_DARK
            elif 0.45 <= rn <= 0.54:
                col = C_TURQ_DEEP if mode == "flare" else C_BRASS_DARK
            elif rn < 0.22:
                col = C_CORE if mode == "flare" else C_CYAN_LIT
            else:
                col = C_COAT_BASE if (mode == "flare" and rn > 0.54) else C_COAT_DARK
            put_px_safe(arr, px, py, col)

    # 2. Inner Counter-Rotating 6-Spoke Brass Escapement Wheel
    for s in range(6):
        ang = -rot_rad * 1.35 + s * (math.pi / 3.0)
        ca, sa = math.cos(ang), math.sin(ang)
        draw_line_safe(
            arr,
            cx + ca * rx * 0.22, cy + sa * ry * 0.22,
            cx + ca * rx * 0.78, cy + sa * ry * 0.78,
            C_GOLD_LIT if s % 2 == 0 else C_BRASS_MID, 1,
        )

    # 3. 12 Roman Hour Ticks & Escapement Gear Crown Finials (XII, III, VI, IX highlighted!)
    for k in range(12):
        ang = rot_rad + k * (math.pi / 6.0) - math.pi * 0.5
        ca, sa = math.cos(ang), math.sin(ang)
        is_cardinal = (k % 3 == 0)

        # Dial Roman Hour Tick
        r_in = 0.56 if is_cardinal else 0.68
        tick_col = (
            C_CORE if (mode == "flare" and is_cardinal)
            else (C_CYAN_LIT if is_cardinal or mode == "flare" else C_GOLD_SPEC)
        )
        draw_line_safe(
            arr,
            cx + ca * rx * r_in, cy + sa * ry * r_in,
            cx + ca * rx * 0.84, cy + sa * ry * 0.84,
            tick_col, 1,
        )

        # Outer Escapement Tooth / Roman Spear Finial (open exterior air — zero pinholes!)
        tooth_out = 1.18 if (mode == "flare" and is_cardinal) else (1.13 if is_cardinal else 1.08)
        tx = cx + ca * rx * tooth_out
        ty = cy + sa * ry * tooth_out
        put_px_safe(arr, tx + ca * 0.8, ty + sa * 0.8, C_OUT)
        put_px_safe(arr, tx, ty, C_CORE if (mode == "flare" and is_cardinal) else (C_CYAN_LIT if is_cardinal else C_GOLD_SPEC))

    # 4. Trailing Escapement Spark Motes in `swept` mode
    if mode == "swept":
        for i, (ox, oy, c_sp) in enumerate(((-18.5, -2.5, C_CYAN_LIT), (-21.5, 2.0, C_GOLD_SPEC), (-17.5, 6.0, C_TURQ_MID))):
            spx = cx + ox + math.sin(rot_rad * 2.0 + i) * 1.2
            spy = cy + oy
            put_px_safe(arr, spx, spy, c_sp)


def draw_gauntlet_clasp_104(arr, hx, hy, ux, uy, nx, ny):
    """Draws a crisp Midnight-Indigo & Sovereign-Gold horologist gauntlet fist clasp over the weapon grip."""
    for u_off in (-1.0, 0.0, 1.0):
        for n_off in (-1.6, -0.6, 0.6, 1.6):
            px = hx + ux * u_off + nx * n_off
            py = hy + uy * u_off + ny * n_off
            if abs(n_off) > 1.3:
                col = C_OUT
            elif abs(u_off) > 0.7 and n_off < 0:
                col = C_GOLD_SPEC
            elif n_off < 0:
                col = C_COAT_MID
            else:
                col = C_COAT_BASE
            put_px_safe(arr, px, py, col)


def draw_minute_glaive_104(arr, hx, hy, deg, blade_len=27.5, glow=1.0, phase=0.0, show_gauntlet=True):
    """
    Draws Chronos's Right-Hand Primary Weapon — THE MINUTE GLAIVE (~40..43px total length in 104x104):
    - Horological pendulum counterweight ring pommel + dark-indigo & gold-ringed polearm grip
    - Ornate Circular Brass Escapement Gear Crossguard (`r=3.8px`) with blazing Turquoise-White Chronocore
    - Long tapered diamond-faceted Sovereign-Gold, Burnished-Brass, & Luminous Cyan-Edged Giant Clock-Hand Blade
    """
    rad = math.radians(deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    hx, hy, max_back, max_front = safe_fit_weapon(hx, hy, ux, uy, back_ext=10.8, front_ext=blade_len + 6.2, margin=5.5)
    eff_back = min(10.5, max_back)
    eff_blade = max(14.0, min(blade_len, max_front - 6.2))

    # 1. Dark-Indigo & Gold-Banded Grip Shaft (-eff_back+2.4 .. +1.5)
    grip_start = -(eff_back - 2.4)
    for da in np.linspace(grip_start, 1.8, 22):
        for dp in (-1.3, -0.45, 0.45, 1.3):
            px = hx + ux * da + nx * dp
            py = hy + uy * da + ny * dp
            if abs(dp) >= 1.1:
                col = C_OUT
            elif abs(da % 3.2) < 0.75:
                col = C_GOLD_LIT if dp < 0 else C_BRASS_MID
            else:
                col = C_COAT_MID if dp < 0 else C_COAT_DARK
            put_px_safe(arr, px, py, col)

    # 2. Pendulum Counterweight Pommel at -eff_back
    pom_c = -(eff_back - 1.1)
    for da_r in np.linspace(-1.8, 1.8, 7):
        for dp_r in np.linspace(-2.1, 2.1, 7):
            rr = math.hypot(da_r, dp_r * 0.9)
            if rr > 2.15:
                continue
            px = hx + ux * (pom_c + da_r) + nx * dp_r
            py = hy + uy * (pom_c + da_r) + ny * dp_r
            col = C_OUT if rr >= 1.55 else (C_CYAN_LIT if rr < 0.7 else C_GOLD_SPEC)
            put_px_safe(arr, px, py, col)

    # 3. Giant Tapered Diamond-Faceted Golden-Brass & Cyan-Crystal Clock-Hand Blade
    steps = int(eff_blade * 2.8) + 2
    for i in range(steps + 1):
        u = i / float(max(1, steps))
        da = 5.8 + u * eff_blade

        # Iconic Cathedral Clock-Hand Swell (neck -> bold diamond spade -> straight needle taper)
        if u < 0.13:
            half_w = 1.65 + (u / 0.13) * 0.75
        elif u < 0.25:
            su = (u - 0.13) / 0.12
            half_w = 2.40 + math.sin(su * math.pi * 0.5) * 1.35  # swells to 3.75px!
        else:
            tu = (u - 0.25) / 0.75
            half_w = 3.75 * (1.0 - 0.85 * (tu ** 1.08))

        n_dp = max(5, int(half_w * 3.0) + 3)
        for dp in np.linspace(-half_w, half_w, n_dp):
            adp = abs(dp)
            px = hx + ux * da + nx * dp
            py = hy + uy * da + ny * dp

            if u >= 0.95 or adp >= half_w - 0.62:
                col = C_OUT
            elif u >= 0.86:
                col = C_CORE if glow > 0.4 else C_CYAN_LIT
            elif adp >= half_w - 1.32:
                # Luminous Turquoise-Cyan Crystal Cutting Edge
                col = C_CYAN_LIT if (dp < 0 and glow > 0.35) else C_TURQ_MID
            elif adp < 0.52:
                # Central Chronocore Spine Fuller & Diamond Heart
                if 0.17 <= u <= 0.29:
                    col = C_CORE if glow > 0.4 else C_CYAN_LIT
                else:
                    tick = (i + int(phase * 2.5)) % 5
                    col = C_CORE if (glow > 0.75 and tick == 0) else (C_CYAN_LIT if tick in (0, 1) else C_TEAL_DARK)
            elif dp < 0.0:
                # Lit Sovereign-Gold Upper Facet
                col = C_GOLD_SPEC if u < 0.46 else C_GOLD_LIT
            else:
                # Burnished Antique-Brass Lower Facet
                col = C_GOLD_LIT if (0.18 <= u <= 0.30) else C_BRASS_MID

            put_px_safe(arr, px, py, col)

    # 4. Ornate Circular Brass Escapement Gear Crossguard (centered at da = +3.4, radius 3.8px)
    gc_x, gc_y = hx + ux * 3.4, hy + uy * 3.4
    for dy_g in np.linspace(-4.0, 4.0, 17):
        for dx_g in np.linspace(-4.0, 4.0, 17):
            rg = math.hypot(dx_g, dy_g)
            if rg > 3.9:
                continue
            px, py = gc_x + dx_g, gc_y + dy_g
            if rg >= 3.05:
                col = C_OUT
            elif rg >= 1.85:
                col = C_GOLD_SPEC if (dx_g + dy_g < -0.4) else (C_GOLD_LIT if (dx_g + dy_g < 1.2) else C_BRASS_MID)
            elif rg >= 0.95:
                col = C_CYAN_LIT if glow > 0.35 else C_TURQ_DEEP
            else:
                col = C_CORE if glow > 0.35 else C_CYAN_LIT
            put_px_safe(arr, px, py, col)

    for t in range(8):
        ang = phase * 1.2 + t * (math.pi * 0.25)
        tx, ty = gc_x + math.cos(ang) * 4.2, gc_y + math.sin(ang) * 4.2
        put_px_safe(arr, tx, ty, C_GOLD_SPEC if t % 2 == 0 else C_OUT)

    if show_gauntlet:
        draw_gauntlet_clasp_104(arr, hx, hy, ux, uy, nx, ny)


def draw_hour_blade_104(arr, hx, hy, deg, blade_len=14.5, glow=1.0, phase=0.0, show_gauntlet=True):
    """
    Draws Chronos's Left-Hand Off-Weapon — THE HOUR CLOCK-DAGGER (~22px total length in 104x104):
    Broad ornate Sovereign-Gold & Burnished-Brass Fleur-de-Lis / Spade Hour-Hand Short-Blade
    with glowing Turquoise-Cyan rune core and miniature escapement gear guard.
    """
    rad = math.radians(deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    hx, hy, max_back, max_front = safe_fit_weapon(hx, hy, ux, uy, back_ext=5.8, front_ext=blade_len + 4.5, margin=5.5)
    eff_back = min(5.2, max_back)
    eff_blade = max(9.5, min(blade_len, max_front - 4.2))

    # Grip & Brass Ring Pommel
    for da in np.linspace(-eff_back, 1.5, 14):
        for dp in (-1.1, 0.0, 1.1):
            px = hx + ux * da + nx * dp
            py = hy + uy * da + ny * dp
            col = C_OUT if abs(dp) > 0.9 else (C_GOLD_SPEC if da < -(eff_back - 1.3) else C_COAT_BASE)
            put_px_safe(arr, px, py, col)

    # Broad Spade Hour-Hand Blade
    steps = int(eff_blade * 2.6) + 2
    for i in range(steps + 1):
        u = i / float(max(1, steps))
        da = 3.8 + u * eff_blade
        if u < 0.36:
            half_w = 1.6 + math.sin((u / 0.36) * math.pi * 0.5) * 1.55  # broad 3.15px hour-spade!
        else:
            tu = (u - 0.36) / 0.64
            half_w = 3.15 * (1.0 - 0.82 * (tu ** 1.15))

        n_dp = max(5, int(half_w * 3.0) + 2)
        for dp in np.linspace(-half_w, half_w, n_dp):
            adp = abs(dp)
            px = hx + ux * da + nx * dp
            py = hy + uy * da + ny * dp
            if u >= 0.93 or adp >= half_w - 0.62:
                col = C_OUT
            elif u >= 0.82:
                col = C_GOLD_SPEC if glow <= 0.4 else C_CORE
            elif adp < 0.55 and 0.18 <= u <= 0.62:
                col = C_CORE if (0.28 <= u <= 0.42 and glow > 0.4) else C_CYAN_LIT
            elif dp < 0.0:
                col = C_GOLD_SPEC if u < 0.55 else C_GOLD_LIT
            else:
                col = C_GOLD_LIT if abs(u - 0.36) < 0.12 else C_BRASS_MID
            put_px_safe(arr, px, py, col)

    # Compact Brass Escapement Guard (da = +2.3)
    gx, gy = hx + ux * 2.3, hy + uy * 2.3
    for dy_g in np.linspace(-2.7, 2.7, 11):
        for dx_g in np.linspace(-2.7, 2.7, 11):
            rg = math.hypot(dx_g, dy_g)
            if rg > 2.75:
                continue
            col = C_OUT if rg >= 2.0 else (C_CORE if rg < 0.8 else C_GOLD_SPEC)
            put_px_safe(arr, gx + dx_g, gy + dy_g, col)

    if show_gauntlet:
        draw_gauntlet_clasp_104(arr, hx, hy, ux, uy, nx, ny)


def draw_pocket_astrolabe_104(arr, lx, ly, mode="hover", phase=0.0):
    """
    Draws Chronos's Left-Hand POCKET-ASTROLABE CHRONOMETER:
    - `hover`: Hovering above palm in `IDLE` with open golden lid, rotating dial, & brass chain
    - `stamp`: Forward Past-Timeline Anchor stamp (`SKILL F00..F06`) with cyan-gold compass glyph
    - `snap_open`: Held forward open before snap (`ULTIMATE F16`)
    - `snap_click`: SLAMMED SHUT with blazing 8-ray cyan-gold `"TIME RESUMES!"` click-star (`ULTIMATE F17..F19`)
    - `snap_closed`: Closed golden pocket-chronometer (`ULTIMATE F20..F22`)
    """
    if mode == "hover":
        cx = max(9.0, min(94.0, lx - 1.5))
        cy = max(9.0, min(92.0, ly - 7.0 + math.sin(phase) * 1.1))
        # Delicate brass fob chain down to palm
        draw_line_safe(arr, cx + 1.0, cy + 3.8, max(7.0, min(95.0, lx)), max(7.0, min(95.0, ly - 1.0)), C_GOLD_LIT, 1)
    else:
        cx = max(10.0, min(92.0, lx + 4.2))
        cy = max(10.0, min(92.0, ly - 1.8))

    is_closed = mode in ("snap_click", "snap_closed")
    r_case = 4.1

    # Hinged open golden lid (-62 deg) when open
    if not is_closed:
        lid_x, lid_y = cx - 3.6, cy - 3.4
        for dy_l in np.linspace(-2.4, 2.4, 9):
            for dx_l in np.linspace(-2.4, 2.4, 9):
                rl = math.hypot(dx_l, dy_l)
                if rl <= 2.4:
                    put_px_safe(arr, lid_x + dx_l, lid_y + dy_l, C_OUT if rl >= 1.7 else C_GOLD_SPEC)

    # Main circular Pocket-Astrolabe Chronometer body
    for dy_w in np.linspace(-r_case, r_case, 17):
        for dx_w in np.linspace(-r_case, r_case, 17):
            rw = math.hypot(dx_w, dy_w)
            if rw > r_case:
                continue
            px, py = cx + dx_w, cy + dy_w
            if rw >= 3.2:
                col = C_OUT
            elif rw >= 2.2:
                col = C_GOLD_SPEC if (dx_w + dy_w < 0) else C_GOLD_LIT
            elif is_closed:
                col = C_CYAN_LIT if rw < 0.9 else (C_GOLD_SPEC if dx_w < 0 else C_BRASS_MID)
            else:
                col = C_CORE if rw < 0.9 else (C_CYAN_LIT if (dx_w + dy_w < 0.4) else C_TURQ_DEEP)
            put_px_safe(arr, px, py, col)

    # Crown winding stem on top
    put_px_safe(arr, cx, cy - r_case - 0.8, C_GOLD_SPEC)

    if mode == "stamp":
        # Past-Timeline Anchor 4-point horological glyph pulse
        for k in range(4):
            ang = phase + k * (math.pi * 0.5)
            rx1, ry1 = cx + math.cos(ang) * 7.0, cy + math.sin(ang) * 7.0
            draw_line_safe(arr, cx + math.cos(ang) * 4.5, cy + math.sin(ang) * 4.5, rx1, ry1, C_CYAN_LIT, 1)
            put_px_safe(arr, rx1, ry1, C_CORE if k % 2 == 0 else C_GOLD_SPEC)

    elif mode == "snap_click":
        # "TIME RESUMES!" 8-ray Horological Click-Star Flare!
        for k in range(8):
            ang = k * (math.pi * 0.25)
            r_ray = 8.2 if k % 2 == 0 else 5.8
            rx1 = max(6.0, min(97.0, cx + math.cos(ang) * r_ray))
            ry1 = max(6.0, min(97.0, cy + math.sin(ang) * r_ray))
            col_r = C_CORE if k % 2 == 0 else C_GOLD_SPEC
            draw_line_safe(arr, cx + math.cos(ang) * 3.8, cy + math.sin(ang) * 3.8, rx1, ry1, col_r, 1)
            put_px_safe(arr, rx1, ry1, C_CYAN_LIT if k % 2 == 0 else C_GOLD_SPEC)


def draw_clock_slash_arc_104(arr, cx, cy, r_main, a0_deg, a1_deg, gold_dominant=False, intensity=1.0):
    """Draws a crisp cel-shaded Cyan-Gold Clockwork Crescent Slash Trail with Roman Minute Tick notches."""
    if intensity <= 0.05:
        return
    cx = max(20.0, min(74.0, cx))
    cy = max(20.0, min(78.0, cy))
    r_main = min(r_main, 95.0 - cx, cx - 8.0, 95.0 - cy, cy - 8.0)
    if r_main < 8.0:
        return

    a0 = math.radians(a0_deg)
    a1 = math.radians(a1_deg)
    steps = 76
    col_mid = C_GOLD_SPEC if gold_dominant else C_CYAN_LIT
    col_edge = C_GOLD_LIT if gold_dominant else C_TURQ_DEEP

    for i in range(steps + 1):
        t = i / float(steps)
        ang = a0 + (a1 - a0) * t
        env = math.sin(t * math.pi)
        thick = max(0.9, 3.4 * env * intensity)
        ca, sa = math.cos(ang), math.sin(ang)
        for dr in np.linspace(-thick, thick, int(thick * 3.0) + 3):
            rr = r_main + dr
            px = cx + ca * rr
            py = cy + sa * rr
            nd = abs(dr) / max(0.5, thick)
            col = C_CORE if nd < 0.30 else (col_mid if nd < 0.68 else col_edge)
            put_px_safe(arr, px, py, col)

        # Crisp Horological Clock-Minute Tick Marks along the slash arc!
        if 0.14 < t < 0.86 and i % 12 == 0:
            tx0, ty0 = cx + ca * (r_main - thick - 1.2), cy + sa * (r_main - thick - 1.2)
            tx1, ty1 = cx + ca * (r_main + thick + 1.8), cy + sa * (r_main + thick + 1.8)
            draw_line_safe(arr, tx0, ty0, tx1, ty1, C_GOLD_SPEC if not gold_dominant else C_CYAN_LIT, 1)


def draw_horological_ward_ring_104(arr, cx, cy, phase=0.0):
    """Draws a segmented 12-pip Horological Ward Shield Ring in front of Chronos's X-Crossed Blades (`CROUCH`)."""
    cx = max(22.0, min(82.0, cx))
    cy = max(22.0, min(82.0, cy))
    rx, ry = 10.5, 13.0
    # 12 discrete orbiting Roman arc segments (exterior-air separated -> 0 enclosed pinholes!)
    for k in range(12):
        base_a = phase * 1.5 + k * (math.pi / 6.0)
        is_card = (k % 3 == 0)
        for sub in (-0.09, 0.0, 0.09):
            a = base_a + sub
            px = cx + math.cos(a) * rx
            py = cy + math.sin(a) * ry
            col = C_CORE if (is_card and sub == 0.0) else (C_GOLD_SPEC if is_card else C_CYAN_LIT)
            put_px_safe(arr, px, py, col)


# =============================================================================
# CAMERA EXTENTS & LAYER HOOKS FOR `render_rig_104`
# =============================================================================

def extra_extents(joints_c, cfg, scale):
    pts = []
    # Back XII Clock-Wheel Halo extents
    h_mode = cfg.get("halo_mode", "normal")
    if h_mode != "off":
        nk = joints_c["neck"]
        hr = (20.5 if h_mode == "flare" else 16.5) / scale
        pts.append((nk[0] - hr, nk[1] - hr))
        pts.append((nk[0] + hr, nk[1] + hr))

    if cfg.get("resting_weapons", False):
        return pts

    # Right Hand: Minute Glaive extents
    if cfg.get("show_minute", True):
        rh = joints_c["r_hand"]
        m_rad = math.radians(cfg.get("minute_deg", -46.0))
        mlen = cfg.get("minute_len", 26.5) + 7.5
        pts.append((rh[0] + math.cos(m_rad) * (mlen / scale), rh[1] + math.sin(m_rad) * (mlen / scale)))
        pts.append((rh[0] - math.cos(m_rad) * (12.0 / scale), rh[1] - math.sin(m_rad) * (12.0 / scale)))

    # Left Hand: Hour Blade / Pocket-Astrolabe extents
    lh = joints_c["l_hand"]
    l_mode = cfg.get("left_mode", "hour_blade")
    if l_mode == "hour_blade":
        h_rad = math.radians(cfg.get("hour_deg", 140.0))
        hlen = cfg.get("hour_len", 14.5) + 5.5
        pts.append((lh[0] + math.cos(h_rad) * (hlen / scale), lh[1] + math.sin(h_rad) * (hlen / scale)))
    else:
        pts.append((lh[0] + 12.0 / scale, lh[1] - 10.0 / scale))
        pts.append((lh[0] - 10.0 / scale, lh[1] + 8.0 / scale))

    return pts


def draw_back(bg104, joints104, cfg):
    nk = joints104["neck"]
    draw_clock_wheel_halo_104(
        bg104, nk[0], nk[1],
        rot_rad=cfg.get("wheel_rot", cfg.get("mane_wave_phase", 0.0)),
        mode=cfg.get("halo_mode", "normal"),
    )


def draw_front(out, joints104, cfg):
    ph = cfg.get("mane_wave_phase", 0.0)

    # Grounded resting Twin Blades during DEATH collapse (`F17..F29`) — 0 upright floating weapons!
    if cfg.get("resting_weapons", False):
        draw_hour_blade_104(out, 36.0, 95.5, deg=178.0, blade_len=12.5, glow=0.25, phase=ph, show_gauntlet=False)
        draw_minute_glaive_104(out, 52.0, 96.0, deg=2.0, blade_len=23.5, glow=0.28, phase=ph, show_gauntlet=False)
        return

    nk = joints104["neck"]
    rh = joints104["r_hand"]
    lh = joints104["l_hand"]

    # Optional Clock-Arc Slash Trails (drawn cleanly behind/around blades)
    if cfg.get("slash_arc") is not None:
        sa = cfg["slash_arc"]
        draw_clock_slash_arc_104(
            out, nk[0] + sa.get("dx", 8.0), nk[1] + sa.get("dy", 12.0),
            sa.get("r", 26.0), sa["a0"], sa["a1"],
            gold_dominant=sa.get("gold", False), intensity=sa.get("intensity", 1.0),
        )
    if cfg.get("slash_arc_2") is not None:
        sa2 = cfg["slash_arc_2"]
        draw_clock_slash_arc_104(
            out, nk[0] + sa2.get("dx", 8.0), nk[1] + sa2.get("dy", 12.0),
            sa2.get("r", 22.0), sa2["a0"], sa2["a1"],
            gold_dominant=sa2.get("gold", True), intensity=sa2.get("intensity", 1.0),
        )

    # Left Hand: Hour Short-Blade OR Pocket-Astrolabe Chronometer
    l_mode = cfg.get("left_mode", "hour_blade")
    if l_mode == "hour_blade":
        draw_hour_blade_104(
            out, lh[0], lh[1],
            deg=cfg.get("hour_deg", 140.0),
            blade_len=cfg.get("hour_len", 14.5),
            glow=cfg.get("weapon_glow", 1.0),
            phase=ph,
            show_gauntlet=True,
        )
    elif l_mode in ("hover", "stamp", "snap_open", "snap_click", "snap_closed"):
        draw_pocket_astrolabe_104(out, lh[0], lh[1], mode=l_mode, phase=ph)

    # Right Hand: The Minute Glaive (Hero Sword-Spear)
    if cfg.get("show_minute", True):
        draw_minute_glaive_104(
            out, rh[0], rh[1],
            deg=cfg.get("minute_deg", -46.0),
            blade_len=cfg.get("minute_len", 26.5),
            glow=cfg.get("weapon_glow", 1.0),
            phase=ph,
            show_gauntlet=True,
        )

    # Escapement Arbor Spark where Twin Clock-Hands cross (X-Scissor / X-Parry / XII Alignment)
    if cfg.get("x_intersect_spark", False):
        sx = max(10.0, min(92.0, 0.5 * (rh[0] + lh[0]) + cfg.get("spark_dx", 9.0)))
        sy = max(10.0, min(92.0, 0.5 * (rh[1] + lh[1]) + cfg.get("spark_dy", -6.0)))
        put_px_safe(out, sx, sy, C_CORE)
        for d_ang in (0.0, math.pi * 0.5, math.pi, math.pi * 1.5):
            put_px_safe(out, sx + math.cos(d_ang) * 1.4, sy + math.sin(d_ang) * 1.4, C_CYAN_LIT)
            put_px_safe(out, sx + math.cos(d_ang + 0.78) * 1.4, sy + math.sin(d_ang + 0.78) * 1.4, C_GOLD_SPEC)

    # Horological Ward Ring on Row 7 (`CROUCH` X-Cross Parry)
    if cfg.get("ward_ring", False):
        wx = max(20.0, min(84.0, 0.5 * (rh[0] + lh[0]) + 7.0))
        wy = max(20.0, min(84.0, 0.5 * (rh[1] + lh[1]) - 4.0))
        draw_horological_ward_ring_104(out, wx, wy, phase=ph)


DEFAULTS = dict(
    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5,
    l_thigh_deg=3.0, l_shin_deg=-2.0, l_foot_deg=0.0,
    r_thigh_deg=-3.0, r_shin_deg=2.0, r_foot_deg=0.0,
    l_sode_rel_deg=-6.0, l_fore_rel_deg=-16.0,
    r_sode_rel_deg=-18.0, r_fore_rel_deg=-20.0,
    l_coat_rel_deg=0.0, r_coat_rel_deg=0.0,
    r_hx=60.0, r_hy=-10.0, l_hx=-48.0, l_hy=6.0,
    minute_deg=-46.0, minute_len=30.0,
    hour_deg=138.0, hour_len=15.0,
    weapon_glow=1.0, wheel_rot=0.0, foot_y=99.0,
    use_dual_ik=True, show_minute=True, resting_weapons=False,
    halo_mode="normal", left_mode="hour_blade",
    right_arm_in_front=False, right_leg_behind=False,
)


def render_frame(parts, cfg):
    out = render_rig_104(
        parts, PIVOTS, cfg, PALETTE_CFG,
        y_bot_base=501.0, default_S=600,
        extra_extent_fn=extra_extents, draw_back_fn=draw_back, draw_front_fn=draw_front,
    )
    out = fill_layer_pinholes(out, max_hole_px=22)
    out[:3, :, :] = 0
    out[101:, :, :] = 0
    out[:, :3, :] = 0
    out[:, 101:, :] = 0
    return out


# =============================================================================
# 9-ROW 30FPS MARTIAL HOROLOGIST ANIMATION CHOREOGRAPHY (ZERO CROSSED KNEES!)
# Note on `hd2d_rig_core.rot_pt`:
# - Legs point +Y down: `l_thigh_deg > 0` swings back leg LEFT (-X), `r_thigh_deg < 0`
#   swings front leg RIGHT (+X), keeping knees wide & heroic with ZERO crossed knees!
# - Torso points -Y up: `torso_deg > 0` leans chest forward (+X).
# =============================================================================

def build_row_configs(row_idx):
    cfgs = []
    for f in range(COLS):
        t = f / float(COLS)
        ph = 2.0 * math.pi * t

        if row_idx == 0:
            # Row 0: IDLE — Noble Horologist Sovereign Stance (`foot_y = 99.0`)
            # Poised Minute Glaive at commanding diagonal in right hand + hovering Pocket-Astrolabe in left hand
            b = math.sin(ph)
            s = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dx=s * 2.5, pelvis_dy=b * 6.5,
                torso_deg=3.0 + b * 1.6, head_rel_deg=-1.5 - b * 1.1,
                l_thigh_deg=3.5, l_shin_deg=-2.0, r_thigh_deg=-3.5, r_shin_deg=2.0,
                l_coat_rel_deg=s * 3.5, r_coat_rel_deg=-s * 3.0,
                r_hx=60.0 + s * 2.0, r_hy=-10.0 + b * 3.5,
                l_hx=-44.0 - s * 2.0, l_hy=4.0 + b * 3.0,
                minute_deg=-46.0 + b * 3.5, minute_len=30.5,
                left_mode="hover", halo_mode="normal",
                wheel_rot=ph, mane_wave_phase=ph,
                weapon_glow=0.86 + 0.14 * b, foot_y=99.0,
            )
            cfgs.append(apply_dual_chrono_ik(cfg))

        elif row_idx == 1:
            # Row 1: WALK — Crisp Anatomical 2-Step Martial Stride (`F00..F14` & `F15..F29`, `foot_y = 99.0`)
            st = math.sin(ph)
            kl = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dy=abs(st) * 18.0,
                torso_deg=8.0 + abs(st) * 2.2, head_rel_deg=-4.0,
                right_leg_behind=(f >= 15),
                l_thigh_deg=st * 24.0 + 2.0,
                l_shin_deg=max(0.0, st * 26.0) + max(0.0, kl * 12.0),
                l_foot_deg=st * 11.0,
                r_thigh_deg=-st * 24.0 - 2.0,
                r_shin_deg=max(0.0, -st * 26.0) + max(0.0, -kl * 12.0),
                r_foot_deg=-st * 11.0,
                l_coat_rel_deg=-st * 9.0 - 4.0,
                r_coat_rel_deg=st * 8.0 - 3.0,
                r_hx=58.0 - st * 10.0, r_hy=-6.0 + abs(st) * 5.0,
                l_hx=-42.0 + st * 14.0, l_hy=12.0 + abs(st) * 4.0,
                minute_deg=-36.0 + st * 9.0, minute_len=29.5,
                hour_deg=142.0 - st * 14.0, hour_len=14.5,
                left_mode="hour_blade", halo_mode="normal",
                wheel_rot=ph * 2.0, mane_wave_phase=ph * 2.0, foot_y=99.0,
            )
            cfgs.append(apply_dual_chrono_ik(cfg))

        elif row_idx == 2:
            # Row 2: AUTO_ATTACK — Kinetic Twin Clock-Hand Slash & Scissor Cleave (`foot_y = 99.0` grounded!)
            kfs = [
                (0, dict(
                    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5,
                    l_thigh_deg=4.0, r_thigh_deg=-4.0,
                    r_hx=60.0, r_hy=-10.0, l_hx=-44.0, l_hy=6.0,
                    minute_deg=-46.0, minute_len=30.0, hour_deg=138.0, left_mode="hour_blade",
                    halo_mode="normal", wheel_rot=0.0, foot_y=99.0,
                )),
                (6, dict(
                    # High back-drawn horological coil winding both Clock-Blades backward
                    pelvis_dx=-10.0, pelvis_dy=18.0, torso_deg=-9.0, head_rel_deg=7.0,
                    l_thigh_deg=16.0, l_shin_deg=12.0, r_thigh_deg=-14.0, r_shin_deg=10.0,
                    l_coat_rel_deg=8.0, r_coat_rel_deg=6.0,
                    r_hx=8.0, r_hy=-82.0, l_hx=-58.0, l_hy=-38.0,
                    minute_deg=-118.0, minute_len=29.5, hour_deg=-138.0,
                    right_arm_in_front=True, halo_mode="normal", wheel_rot=-1.1, foot_y=99.0,
                )),
                (11, dict(
                    # Explosive forward martial lunge sweeping the Minute Glaive across +X
                    pelvis_dx=11.0, pelvis_dy=30.0, torso_deg=15.0, head_rel_deg=-8.0,
                    l_thigh_deg=24.0, l_shin_deg=14.0, r_thigh_deg=-24.0, r_shin_deg=16.0,
                    l_coat_rel_deg=-14.0, r_coat_rel_deg=-8.0,
                    r_hx=68.0, r_hy=-22.0, l_hx=42.0, l_hy=-8.0,
                    minute_deg=-8.0, minute_len=29.5, hour_deg=26.0,
                    right_arm_in_front=True, x_intersect_spark=True,
                    halo_mode="swept", wheel_rot=2.2, foot_y=99.0,
                )),
                (16, dict(
                    # Full scissor cleave follow-through
                    pelvis_dx=12.0, pelvis_dy=32.0, torso_deg=16.0, head_rel_deg=-9.0,
                    l_thigh_deg=25.0, l_shin_deg=15.0, r_thigh_deg=-25.0, r_shin_deg=18.0,
                    l_coat_rel_deg=-16.0, r_coat_rel_deg=-10.0,
                    r_hx=66.0, r_hy=4.0, l_hx=48.0, l_hy=-26.0,
                    minute_deg=16.0, minute_len=29.5, hour_deg=-24.0,
                    right_arm_in_front=True, halo_mode="swept", wheel_rot=4.0, foot_y=99.0,
                )),
                (22, dict(
                    pelvis_dx=5.0, pelvis_dy=14.0, torso_deg=8.0, head_rel_deg=-4.0,
                    l_thigh_deg=12.0, l_shin_deg=6.0, r_thigh_deg=-12.0, r_shin_deg=8.0,
                    r_hx=62.0, r_hy=-14.0, l_hx=-24.0, l_hy=2.0,
                    minute_deg=-28.0, minute_len=30.0, hour_deg=96.0,
                    right_arm_in_front=False, halo_mode="normal", wheel_rot=5.4, foot_y=99.0,
                )),
                (29, dict(
                    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5,
                    l_thigh_deg=4.0, r_thigh_deg=-4.0,
                    r_hx=60.0, r_hy=-10.0, l_hx=-44.0, l_hy=6.0,
                    minute_deg=-46.0, minute_len=30.0, hour_deg=138.0,
                    halo_mode="normal", wheel_rot=2.0 * math.pi, foot_y=99.0,
                )),
            ]
            cfg = eval_chrono_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if 8 <= f <= 15:
                prog = (f - 8) / 7.0
                cfg["slash_arc"] = dict(
                    dx=10.0, dy=12.0, r=25.5,
                    a0=-68.0 + prog * 28.0, a1=18.0 + prog * 22.0,
                    gold=False, intensity=1.0 - 0.35 * abs(prog - 0.45),
                )
            cfgs.append(cfg)

        elif row_idx == 3:
            # Row 3: SKILL (Chrono-Schism — Past-Timeline Anchor Stamp F00..F06 -> Twin-Hand X-Scissor Rift Cleave F07..F19!)
            kfs = [
                (0, dict(
                    torso_deg=3.0, l_thigh_deg=4.0, r_thigh_deg=-4.0,
                    r_hx=60.0, r_hy=-12.0, l_hx=-36.0, l_hy=2.0,
                    minute_deg=-48.0, left_mode="stamp", halo_mode="normal", wheel_rot=0.0, foot_y=99.0,
                )),
                (5, dict(
                    # Raises left-hand Pocket-Astrolabe forward to stamp Past-Timeline Anchor while cocking Minute Glaive
                    pelvis_dx=-4.0, pelvis_dy=20.0, torso_deg=6.0, head_rel_deg=-4.0,
                    l_thigh_deg=16.0, l_shin_deg=10.0, r_thigh_deg=-16.0, r_shin_deg=12.0,
                    r_hx=-10.0, r_hy=-74.0, l_hx=58.0, l_hy=-52.0,
                    minute_deg=-124.0, left_mode="stamp",
                    right_arm_in_front=False, halo_mode="flare", wheel_rot=1.8, foot_y=99.0,
                )),
                (9, dict(
                    # Coils Twin Clock-Blades wide apart before X-Scissor snap
                    pelvis_dx=4.0, pelvis_dy=26.0, torso_deg=11.0, head_rel_deg=-6.0,
                    l_thigh_deg=20.0, l_shin_deg=12.0, r_thigh_deg=-20.0, r_shin_deg=14.0,
                    r_hx=34.0, r_hy=-64.0, l_hx=28.0, l_hy=8.0,
                    minute_deg=-64.0, hour_deg=44.0, left_mode="hour_blade",
                    right_arm_in_front=True, halo_mode="flare", wheel_rot=3.2, foot_y=99.0,
                )),
                (14, dict(
                    # Deep lunging Twin-Hand X-Scissor Rift Cleave (crossing Minute Glaive & Hour Blade!)
                    pelvis_dx=12.0, pelvis_dy=36.0, torso_deg=16.0, head_rel_deg=-9.0,
                    l_thigh_deg=26.0, l_shin_deg=16.0, r_thigh_deg=-26.0, r_shin_deg=18.0,
                    l_coat_rel_deg=-16.0, r_coat_rel_deg=-10.0,
                    r_hx=66.0, r_hy=-10.0, l_hx=56.0, l_hy=-24.0,
                    minute_deg=24.0, hour_deg=-28.0, left_mode="hour_blade",
                    right_arm_in_front=True, x_intersect_spark=True,
                    halo_mode="flare", wheel_rot=5.6, foot_y=99.0,
                )),
                (19, dict(
                    pelvis_dx=10.0, pelvis_dy=30.0, torso_deg=14.0, head_rel_deg=-7.0,
                    l_thigh_deg=22.0, l_shin_deg=14.0, r_thigh_deg=-22.0, r_shin_deg=15.0,
                    r_hx=64.0, r_hy=4.0, l_hx=50.0, l_hy=-34.0,
                    minute_deg=30.0, hour_deg=-38.0, left_mode="hour_blade",
                    right_arm_in_front=True, x_intersect_spark=True,
                    halo_mode="flare", wheel_rot=7.2, foot_y=99.0,
                )),
                (24, dict(
                    # Crisp temporal rewind recovery pose (wheel spins backward!)
                    pelvis_dx=-4.0, pelvis_dy=12.0, torso_deg=-2.0, head_rel_deg=2.0,
                    l_thigh_deg=10.0, l_shin_deg=6.0, r_thigh_deg=-10.0, r_shin_deg=6.0,
                    r_hx=52.0, r_hy=-24.0, l_hx=-32.0, l_hy=-6.0,
                    minute_deg=-62.0, hour_deg=118.0, left_mode="hour_blade",
                    right_arm_in_front=False, halo_mode="normal", wheel_rot=4.4, foot_y=99.0,
                )),
                (29, dict(
                    torso_deg=3.0, l_thigh_deg=4.0, r_thigh_deg=-4.0,
                    r_hx=60.0, r_hy=-10.0, l_hx=-44.0, l_hy=6.0,
                    minute_deg=-46.0, left_mode="hover", halo_mode="normal", wheel_rot=2.0 * math.pi, foot_y=99.0,
                )),
            ]
            cfg = eval_chrono_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0)
            if 10 <= f <= 18:
                u_sc = (f - 10) / 8.0
                inten = 1.0 - 0.3 * abs(u_sc - 0.5)
                cfg["slash_arc"] = dict(dx=11.0, dy=10.0, r=24.5, a0=-54.0, a1=38.0, gold=False, intensity=inten)
                cfg["slash_arc_2"] = dict(dx=9.0, dy=14.0, r=20.5, a0=42.0, a1=-48.0, gold=True, intensity=inten)
            cfgs.append(cfg)

        elif row_idx == 4:
            # Row 4: ULTIMATE (Eternal Zero / The Twelfth Bell)
            # F00..F09: Sovereign levitation (`foot_y=94.5`) raising BOTH Clock-Blades HIGH OVERHEAD to 12 O'Clock (`XII`)
            # F10..F15: Snaps both Clock-Blades wide open (`III-IX` command) holding the frozen timeline
            # F16..F22: Holds glowing Pocket-Astrolabe HIGH forward in left hand & snaps it shut (`"TIME RESUMES!"` F17..F19)
            #           while Minute Glaive points regally forward-low with crystal silhouette separation!
            # F23..F29: Graceful descent back to `foot_y = 99.0`
            kfs = [
                (0, dict(
                    pelvis_dy=10.0, torso_deg=2.0, l_thigh_deg=6.0, r_thigh_deg=-6.0,
                    r_hx=56.0, r_hy=-24.0, l_hx=-28.0, l_hy=-12.0,
                    minute_deg=-58.0, minute_len=28.0, hour_deg=-112.0, left_mode="hour_blade",
                    halo_mode="flare", wheel_rot=0.0, foot_y=98.5,
                )),
                (4, dict(
                    pelvis_dy=4.0, torso_deg=-1.0, head_rel_deg=-5.0,
                    l_thigh_deg=12.0, l_shin_deg=18.0, l_foot_deg=14.0,
                    r_thigh_deg=-10.0, r_shin_deg=16.0, r_foot_deg=12.0,
                    l_coat_rel_deg=-8.0, r_coat_rel_deg=8.0,
                    r_hx=34.0, r_hy=-142.0, l_hx=-18.0, l_hy=-138.0,
                    minute_deg=-85.0, minute_len=24.0, hour_deg=-95.0, hour_len=15.0,
                    left_mode="hour_blade", right_arm_in_front=False, x_intersect_spark=True,
                    halo_mode="flare", wheel_rot=2.1, foot_y=94.5,
                )),
                (9, dict(
                    # Peak XII Midnight Alignment! Both arms thrust HIGH OVERHEAD pointing straight to 12 O'Clock!
                    pelvis_dy=2.0, torso_deg=-2.0, head_rel_deg=-6.0,
                    l_thigh_deg=14.0, l_shin_deg=20.0, l_foot_deg=16.0,
                    r_thigh_deg=-12.0, r_shin_deg=18.0, r_foot_deg=14.0,
                    l_coat_rel_deg=-10.0, r_coat_rel_deg=10.0,
                    r_hx=32.0, r_hy=-148.0, l_hx=-12.0, l_hy=-145.0,
                    minute_deg=-87.0, minute_len=24.0, hour_deg=-93.0, hour_len=15.0,
                    left_mode="hour_blade", right_arm_in_front=False, x_intersect_spark=True,
                    halo_mode="flare", wheel_rot=4.2, foot_y=94.0,
                )),
                (12, dict(
                    # Snaps both Clock-Blades wide open (III-IX Horizontal Timeline Freeze!)
                    pelvis_dx=4.0, pelvis_dy=6.0, torso_deg=5.0, head_rel_deg=-3.0,
                    l_thigh_deg=16.0, l_shin_deg=18.0, r_thigh_deg=-14.0, r_shin_deg=16.0,
                    l_coat_rel_deg=-14.0, r_coat_rel_deg=12.0,
                    r_hx=66.0, r_hy=-42.0, l_hx=-58.0, l_hy=-40.0,
                    minute_deg=-5.0, minute_len=26.0, hour_deg=-173.0, hour_len=15.0,
                    left_mode="hour_blade", right_arm_in_front=True,
                    halo_mode="flare", wheel_rot=4.2, foot_y=94.5,
                )),
                (15, dict(
                    # Holds frozen timeline steady
                    pelvis_dx=4.0, pelvis_dy=6.0, torso_deg=6.0, head_rel_deg=-3.0,
                    l_thigh_deg=16.0, l_shin_deg=18.0, r_thigh_deg=-14.0, r_shin_deg=16.0,
                    r_hx=64.0, r_hy=-38.0, l_hx=-52.0, l_hy=-36.0,
                    minute_deg=-4.0, minute_len=26.0, hour_deg=-169.0, hour_len=15.0,
                    left_mode="hour_blade", right_arm_in_front=True,
                    halo_mode="flare", wheel_rot=4.35, foot_y=94.5,
                )),
                (18, dict(
                    # Holds glowing Pocket-Astrolabe HIGH forward in left hand & SNAPS IT SHUT ("TIME RESUMES!")
                    # while Minute Glaive points regally low-forward in right hand!
                    pelvis_dx=8.0, pelvis_dy=10.0, torso_deg=10.0, head_rel_deg=-5.0,
                    l_thigh_deg=18.0, l_shin_deg=16.0, r_thigh_deg=-16.0, r_shin_deg=14.0,
                    r_hx=56.0, r_hy=12.0, l_hx=62.0, l_hy=-84.0,
                    minute_deg=14.0, minute_len=27.5, left_mode="snap_click",
                    right_arm_in_front=False, halo_mode="flare", wheel_rot=5.6, foot_y=95.0,
                )),
                (22, dict(
                    pelvis_dx=6.0, pelvis_dy=12.0, torso_deg=8.0, head_rel_deg=-4.0,
                    l_thigh_deg=14.0, l_shin_deg=12.0, r_thigh_deg=-12.0, r_shin_deg=12.0,
                    r_hx=58.0, r_hy=4.0, l_hx=52.0, l_hy=-74.0,
                    minute_deg=-4.0, minute_len=28.0, left_mode="snap_closed",
                    right_arm_in_front=False, halo_mode="flare", wheel_rot=7.4, foot_y=96.0,
                )),
                (29, dict(
                    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5,
                    l_thigh_deg=4.0, r_thigh_deg=-4.0,
                    r_hx=60.0, r_hy=-10.0, l_hx=-44.0, l_hy=6.0,
                    minute_deg=-46.0, minute_len=30.0, left_mode="hover",
                    halo_mode="normal", wheel_rot=8.8, foot_y=99.0,
                )),
            ]
            cfg = eval_chrono_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.5)
            if f == 16:
                cfg["left_mode"] = "snap_open"
            elif f in (17, 18, 19):
                cfg["left_mode"] = "snap_click"
            elif f in (20, 21, 22):
                cfg["left_mode"] = "snap_closed"
            if f in (4, 5, 6, 7, 8, 9):
                cfg["spark_dx"] = 2.0
                cfg["spark_dy"] = -14.0
            if f in (11, 12, 13):
                cfg["slash_arc"] = dict(dx=4.0, dy=2.0, r=26.0, a0=-92.0, a1=-4.0, gold=False, intensity=0.95)
            cfgs.append(cfg)

        elif row_idx == 5:
            # Row 5: DEATH & HURT
            # F00..F05 hurt stagger -> F07..F14 wounded knee-buckle (halo OFF F09..F29!)
            # -> F15..F22 progressive supine collapse -> F23..F29 flat grounded rest with horizontal weapons!
            kfs = [
                (0, dict(
                    use_dual_ik=False, pelvis_dx=0.0, pelvis_dy=4.0, torso_deg=-4.0, head_rel_deg=2.0,
                    l_thigh_deg=6.0, l_shin_deg=6.0, r_thigh_deg=-6.0, r_shin_deg=6.0,
                    l_sode_rel_deg=-10.0, l_fore_rel_deg=-16.0, r_sode_rel_deg=8.0, r_fore_rel_deg=-12.0,
                    minute_deg=-38.0, hour_deg=135.0, left_mode="hour_blade",
                    weapon_glow=0.85, halo_mode="normal", wheel_rot=0.0, foot_y=99.0,
                )),
                (5, dict(
                    use_dual_ik=False, pelvis_dx=-16.0, pelvis_dy=26.0, torso_deg=-18.0, head_rel_deg=10.0,
                    l_thigh_deg=18.0, l_shin_deg=14.0, r_thigh_deg=-14.0, r_shin_deg=12.0,
                    l_sode_rel_deg=-28.0, l_fore_rel_deg=-22.0, r_sode_rel_deg=24.0, r_fore_rel_deg=-14.0,
                    minute_deg=-58.0, hour_deg=155.0, left_mode="hour_blade",
                    weapon_glow=0.65, halo_mode="normal", wheel_rot=-0.9, foot_y=99.0,
                )),
                (9, dict(
                    use_dual_ik=False, pelvis_dx=-14.0, pelvis_dy=94.0, torso_deg=8.0, head_rel_deg=14.0,
                    l_thigh_deg=-52.0, l_shin_deg=-36.0, l_foot_deg=-24.0,
                    r_thigh_deg=-28.0, r_shin_deg=-44.0, r_foot_deg=-28.0,
                    l_sode_rel_deg=16.0, l_fore_rel_deg=8.0, r_sode_rel_deg=-14.0, r_fore_rel_deg=-10.0,
                    right_arm_in_front=True, minute_deg=14.0, hour_deg=32.0, left_mode="hour_blade",
                    weapon_glow=0.45, halo_mode="off", foot_y=99.0,
                )),
                (14, dict(
                    use_dual_ik=False, pelvis_dx=-12.0, pelvis_dy=152.0, torso_deg=-12.0, head_rel_deg=18.0,
                    l_thigh_deg=-92.0, l_shin_deg=-90.0, l_foot_deg=-60.0,
                    r_thigh_deg=-42.0, r_shin_deg=-74.0, r_foot_deg=-54.0,
                    l_sode_rel_deg=18.0, l_fore_rel_deg=6.0, r_sode_rel_deg=-6.0, r_fore_rel_deg=-8.0,
                    right_arm_in_front=True, minute_deg=5.0, hour_deg=12.0, left_mode="hour_blade",
                    weapon_glow=0.35, halo_mode="off", foot_y=99.0,
                )),
                (19, dict(
                    use_dual_ik=False, pelvis_dx=-7.0, pelvis_dy=192.0, torso_deg=-56.0, head_rel_deg=15.0,
                    l_thigh_deg=-105.0, l_shin_deg=-112.0, l_foot_deg=-74.0,
                    r_thigh_deg=-46.0, r_shin_deg=-82.0, r_foot_deg=-66.0,
                    l_sode_rel_deg=10.0, l_fore_rel_deg=-4.0, r_sode_rel_deg=4.0, r_fore_rel_deg=-8.0,
                    right_arm_in_front=True, resting_weapons=True,
                    weapon_glow=0.28, halo_mode="off", foot_y=99.0,
                )),
                (23, dict(
                    use_dual_ik=False, pelvis_dx=-4.0, pelvis_dy=214.0, torso_deg=-83.0, head_rel_deg=12.0,
                    l_thigh_deg=-109.0, l_shin_deg=-118.0, l_foot_deg=-78.0,
                    r_thigh_deg=-47.0, r_shin_deg=-84.0, r_foot_deg=-70.0,
                    l_sode_rel_deg=6.0, l_fore_rel_deg=-6.0, r_sode_rel_deg=4.0, r_fore_rel_deg=-8.0,
                    right_arm_in_front=True, resting_weapons=True,
                    weapon_glow=0.22, halo_mode="off", foot_y=99.0,
                )),
                (29, dict(
                    use_dual_ik=False, pelvis_dx=-4.0, pelvis_dy=218.0, torso_deg=-85.0, head_rel_deg=10.0,
                    l_thigh_deg=-110.0, l_shin_deg=-119.0, l_foot_deg=-80.0,
                    r_thigh_deg=-48.0, r_shin_deg=-85.0, r_foot_deg=-72.0,
                    l_sode_rel_deg=6.0, l_fore_rel_deg=-6.0, r_sode_rel_deg=4.0, r_fore_rel_deg=-8.0,
                    right_arm_in_front=True, resting_weapons=True,
                    weapon_glow=0.18, halo_mode="off", foot_y=99.0,
                )),
            ]
            cfg = eval_chrono_keyframes(f, kfs, ph, DEFAULTS, wave_mult=1.0)
            if f >= 9:
                cfg["halo_mode"] = "off"
            if f >= 17:
                cfg["resting_weapons"] = True
            cfgs.append(cfg)

        elif row_idx == 6:
            # Row 6: DASH — Sleek Forward-Tilted Temporal Rift Blade-Glide (`torso_deg = +16 deg`)
            kfs = [
                (0, dict(
                    torso_deg=4.0, l_thigh_deg=5.0, r_thigh_deg=-5.0,
                    r_hx=64.0, r_hy=-10.0, l_hx=-44.0, l_hy=6.0,
                    minute_deg=-42.0, hour_deg=142.0, left_mode="hour_blade",
                    halo_mode="normal", wheel_rot=0.0, foot_y=99.0,
                )),
                (6, dict(
                    pelvis_dx=10.0, pelvis_dy=24.0, torso_deg=16.0, head_rel_deg=-10.0,
                    l_thigh_deg=28.0, l_shin_deg=28.0, l_foot_deg=18.0,
                    r_thigh_deg=-18.0, r_shin_deg=26.0, r_foot_deg=10.0,
                    l_coat_rel_deg=-22.0, r_coat_rel_deg=-14.0,
                    r_hx=76.0, r_hy=-24.0, l_hx=-58.0, l_hy=4.0,
                    minute_deg=-3.0, minute_len=25.5, hour_deg=164.0, left_mode="hour_blade",
                    right_arm_in_front=True, halo_mode="swept", wheel_rot=2.2, foot_y=96.0,
                )),
                (22, dict(
                    pelvis_dx=12.0, pelvis_dy=22.0, torso_deg=16.5, head_rel_deg=-10.5,
                    l_thigh_deg=30.0, l_shin_deg=30.0, l_foot_deg=20.0,
                    r_thigh_deg=-16.0, r_shin_deg=28.0, r_foot_deg=12.0,
                    l_coat_rel_deg=-24.0, r_coat_rel_deg=-16.0,
                    r_hx=78.0, r_hy=-22.0, l_hx=-60.0, l_hy=6.0,
                    minute_deg=-2.0, minute_len=25.5, hour_deg=166.0, left_mode="hour_blade",
                    right_arm_in_front=True, halo_mode="swept", wheel_rot=9.8, foot_y=96.0,
                )),
                (29, dict(
                    torso_deg=4.0, l_thigh_deg=5.0, r_thigh_deg=-5.0,
                    r_hx=64.0, r_hy=-10.0, l_hx=-44.0, l_hy=6.0,
                    minute_deg=-42.0, hour_deg=142.0, left_mode="hour_blade",
                    halo_mode="normal", wheel_rot=4.0 * math.pi, foot_y=99.0,
                )),
            ]
            cfgs.append(eval_chrono_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.5))

        elif row_idx == 7:
            # Row 7: CROUCH — Compressed Low Twin Clock-Blade X-Cross Parry (`F03..F10`) + Ward Ring
            # -> Low Sweeping Minute-Glaive Counter-Slash (`F12..F18`), `foot_y = 99.0`!
            kfs = [
                (0, dict(
                    torso_deg=3.0, l_thigh_deg=4.0, r_thigh_deg=-4.0,
                    r_hx=64.0, r_hy=-10.0, l_hx=-44.0, l_hy=6.0,
                    minute_deg=-46.0, hour_deg=138.0, left_mode="hour_blade",
                    halo_mode="normal", wheel_rot=0.0, foot_y=99.0,
                )),
                (4, dict(
                    # Compressed low Twin Clock-Blade X-Cross Parry!
                    pelvis_dx=-6.0, pelvis_dy=56.0, torso_deg=8.0, head_rel_deg=-5.0,
                    l_thigh_deg=28.0, l_shin_deg=30.0, r_thigh_deg=-28.0, r_shin_deg=28.0,
                    l_coat_rel_deg=8.0, r_coat_rel_deg=-6.0,
                    r_hx=56.0, r_hy=-12.0, l_hx=46.0, l_hy=-34.0,
                    minute_deg=-52.0, minute_len=25.0, hour_deg=48.0, hour_len=14.5,
                    left_mode="hour_blade", right_arm_in_front=True,
                    ward_ring=True, x_intersect_spark=True,
                    halo_mode="flare", wheel_rot=1.4, foot_y=99.0,
                )),
                (10, dict(
                    pelvis_dx=-4.0, pelvis_dy=58.0, torso_deg=9.0, head_rel_deg=-6.0,
                    l_thigh_deg=29.0, l_shin_deg=31.0, r_thigh_deg=-29.0, r_shin_deg=29.0,
                    r_hx=58.0, r_hy=-10.0, l_hx=48.0, l_hy=-32.0,
                    minute_deg=-48.0, minute_len=25.0, hour_deg=52.0, hour_len=14.5,
                    left_mode="hour_blade", right_arm_in_front=True,
                    ward_ring=True, x_intersect_spark=True,
                    halo_mode="flare", wheel_rot=3.6, foot_y=99.0,
                )),
                (14, dict(
                    # Low sweeping Minute-Glaive counter-slash!
                    pelvis_dx=12.0, pelvis_dy=52.0, torso_deg=16.0, head_rel_deg=-9.0,
                    l_thigh_deg=30.0, l_shin_deg=28.0, r_thigh_deg=-30.0, r_shin_deg=28.0,
                    l_coat_rel_deg=-14.0, r_coat_rel_deg=-8.0,
                    r_hx=74.0, r_hy=-6.0, l_hx=-36.0, l_hy=-8.0,
                    minute_deg=6.0, minute_len=25.5, hour_deg=148.0,
                    left_mode="hour_blade", right_arm_in_front=True,
                    ward_ring=False, halo_mode="swept", wheel_rot=5.4, foot_y=99.0,
                )),
                (19, dict(
                    pelvis_dx=10.0, pelvis_dy=48.0, torso_deg=14.0, head_rel_deg=-7.0,
                    l_thigh_deg=26.0, l_shin_deg=24.0, r_thigh_deg=-26.0, r_shin_deg=24.0,
                    r_hx=70.0, r_hy=2.0, l_hx=-38.0, l_hy=-4.0,
                    minute_deg=14.0, minute_len=25.5, hour_deg=144.0,
                    left_mode="hour_blade", right_arm_in_front=True,
                    halo_mode="normal", wheel_rot=6.6, foot_y=99.0,
                )),
                (29, dict(
                    torso_deg=3.0, l_thigh_deg=4.0, r_thigh_deg=-4.0,
                    r_hx=64.0, r_hy=-10.0, l_hx=-44.0, l_hy=6.0,
                    minute_deg=-46.0, hour_deg=138.0, left_mode="hour_blade",
                    halo_mode="normal", wheel_rot=2.0 * math.pi, foot_y=99.0,
                )),
            ]
            cfg = eval_chrono_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if 3 <= f <= 10:
                cfg["ward_ring"] = True
                cfg["x_intersect_spark"] = True
            if 12 <= f <= 17:
                u_c = (f - 12) / 5.0
                cfg["slash_arc"] = dict(
                    dx=11.0, dy=18.0, r=24.0,
                    a0=-26.0 + u_c * 14.0, a1=32.0 + u_c * 14.0,
                    gold=True, intensity=1.0 - 0.3 * abs(u_c - 0.45),
                )
            cfgs.append(cfg)

        elif row_idx == 8:
            # Row 8: JUMP — Coil (`F00..F03`) -> High Pendulum Ascent (`F04..F12`)
            # -> Apex Downward `+34 deg` Minute-Glaive Cleave (`F13..F20`) -> Grounded Absorption (`F21..F29`)!
            kfs = [
                (0, dict(
                    pelvis_dy=8.0, torso_deg=4.0, l_thigh_deg=6.0, r_thigh_deg=-6.0,
                    r_hx=62.0, r_hy=-10.0, l_hx=-42.0, l_hy=8.0,
                    minute_deg=-44.0, hour_deg=138.0, left_mode="hour_blade",
                    halo_mode="normal", wheel_rot=0.0, foot_y=99.0,
                )),
                (3, dict(
                    # Grounded crouch coil
                    pelvis_dx=-4.0, pelvis_dy=44.0, torso_deg=12.0, head_rel_deg=-6.0,
                    l_thigh_deg=26.0, l_shin_deg=28.0, r_thigh_deg=-26.0, r_shin_deg=26.0,
                    r_hx=42.0, r_hy=4.0, l_hx=-48.0, l_hy=14.0,
                    minute_deg=-28.0, hour_deg=152.0, left_mode="hour_blade",
                    halo_mode="normal", wheel_rot=0.8, foot_y=99.0,
                )),
                (10, dict(
                    # High Pendulum Ascent coiling the Minute Glaive overhead
                    pelvis_dx=6.0, pelvis_dy=10.0, torso_deg=8.0, head_rel_deg=-4.0,
                    l_thigh_deg=22.0, l_shin_deg=36.0, l_foot_deg=18.0,
                    r_thigh_deg=-16.0, r_shin_deg=30.0, r_foot_deg=14.0,
                    l_coat_rel_deg=-14.0, r_coat_rel_deg=-8.0,
                    r_hx=28.0, r_hy=-64.0, l_hx=-36.0, l_hy=-34.0,
                    minute_deg=-72.0, minute_len=25.5, hour_deg=-134.0,
                    left_mode="hour_blade", right_arm_in_front=True,
                    halo_mode="flare", wheel_rot=3.2, foot_y=92.5,
                )),
                (15, dict(
                    # Apex Downward +34 deg Minute-Glaive Cleave!
                    pelvis_dx=10.0, pelvis_dy=14.0, torso_deg=16.0, head_rel_deg=-8.0,
                    l_thigh_deg=24.0, l_shin_deg=32.0, l_foot_deg=16.0,
                    r_thigh_deg=-18.0, r_shin_deg=28.0, r_foot_deg=12.0,
                    l_coat_rel_deg=-18.0, r_coat_rel_deg=-12.0,
                    r_hx=68.0, r_hy=-8.0, l_hx=-46.0, l_hy=-28.0,
                    minute_deg=34.0, minute_len=25.5, hour_deg=-142.0,
                    left_mode="hour_blade", right_arm_in_front=True,
                    halo_mode="flare", wheel_rot=5.6, foot_y=93.0,
                )),
                (20, dict(
                    pelvis_dx=10.0, pelvis_dy=18.0, torso_deg=15.0, head_rel_deg=-7.0,
                    l_thigh_deg=20.0, l_shin_deg=26.0, r_thigh_deg=-18.0, r_shin_deg=24.0,
                    r_hx=66.0, r_hy=-2.0, l_hx=-44.0, l_hy=-18.0,
                    minute_deg=34.0, minute_len=25.5, hour_deg=-146.0,
                    left_mode="hour_blade", right_arm_in_front=True,
                    halo_mode="swept", wheel_rot=7.0, foot_y=95.0,
                )),
                (24, dict(
                    # Grounded landing shock absorption
                    pelvis_dx=4.0, pelvis_dy=42.0, torso_deg=11.0, head_rel_deg=-4.0,
                    l_thigh_deg=24.0, l_shin_deg=26.0, r_thigh_deg=-24.0, r_shin_deg=24.0,
                    r_hx=64.0, r_hy=-6.0, l_hx=-42.0, l_hy=8.0,
                    minute_deg=-18.0, hour_deg=142.0, left_mode="hour_blade",
                    right_arm_in_front=False, halo_mode="normal", wheel_rot=8.0, foot_y=99.0,
                )),
                (29, dict(
                    pelvis_dy=8.0, torso_deg=4.0, l_thigh_deg=6.0, r_thigh_deg=-6.0,
                    r_hx=62.0, r_hy=-10.0, l_hx=-42.0, l_hy=8.0,
                    minute_deg=-44.0, hour_deg=138.0, left_mode="hour_blade",
                    halo_mode="normal", wheel_rot=3.0 * math.pi, foot_y=99.0,
                )),
            ]
            cfg = eval_chrono_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0)
            if 13 <= f <= 18:
                u_j = (f - 13) / 5.0
                cfg["slash_arc"] = dict(
                    dx=10.0, dy=12.0, r=24.5,
                    a0=-52.0 + u_j * 18.0, a1=42.0 + u_j * 12.0,
                    gold=False, intensity=1.0 - 0.3 * abs(u_j - 0.4),
                )
            cfgs.append(cfg)

    return cfgs


def verify_output_sheet(sheet_path):
    """
    Runs strict automated QA verification across all 270 cells (`9 rows x 30 cols` @ `208x208`):
    1. Exact dimensions `6240 x 1872`
    2. `0/270` border clips (`4px` margin in `208x208` / `2px` margin in `104x104`)
    3. `0` interior pinholes across all 270 frames
    4. `29/29` distinct frame transitions on every single row
    5. Exact palette color count (`<= 20` colors from `MASTER_PALETTE`)
    """
    im = Image.open(sheet_path).convert("RGBA")
    assert im.size == (COLS * CELL, ROWS * CELL), f"Unexpected sheet size: {im.size}"
    arr_full = np.array(im)

    border_clips = 0
    total_pinholes = 0
    row_transitions = []

    for r in range(ROWS):
        prev = None
        distinct = 0
        for c in range(COLS):
            tile208 = arr_full[r * CELL : (r + 1) * CELL, c * CELL : (c + 1) * CELL]
            a208 = tile208[:, :, 3] > 0
            if np.any(a208[:4, :]) or np.any(a208[-4:, :]) or np.any(a208[:, :4]) or np.any(a208[:, -4:]):
                border_clips += 1

            tile104 = tile208[::2, ::2]
            total_pinholes += count_interior_pinholes_104(tile104, max_hole_px=20)

            if prev is not None and not np.array_equal(tile208, prev):
                distinct += 1
            prev = tile208
        row_transitions.append(distinct)

    opaque_rgb = arr_full[arr_full[:, :, 3] > 0][:, :3]
    uniq_cols = len(np.unique(opaque_rgb.reshape(-1, 3), axis=0))

    print(
        f"[QA VERIFIED] size={im.size}, border_clips={border_clips}/270, "
        f"pinholes={total_pinholes}, unique_palette_colors={uniq_cols}/20, "
        f"row_transitions={row_transitions}"
    )
    assert border_clips == 0, f"Expected 0 border clips, got {border_clips}"
    assert total_pinholes == 0, f"Expected 0 interior pinholes, got {total_pinholes}"
    assert all(d == 29 for d in row_transitions), f"Expected 29/29 transitions per row, got {row_transitions}"
    assert uniq_cols <= 20, f"Expected <= 20 Master Palette colors, got {uniq_cols}"


def main():
    parts = load_and_segment_512()
    picks = [
        (0, 0, "R0 SOVEREIGN IDLE"),
        (1, 4, "R1 MARTIAL STRIDE"),
        (2, 11, "R2 GLAIVE CLEAVE"),
        (3, 14, "R3 X-SCISSOR RIFT"),
        (4, 9, "R4 XII MIDNIGHT"),
        (4, 18, "R4 POCKET-SNAP"),
        (7, 6, "R7 X-CROSS PARRY"),
        (8, 15, "R8 +34 APEX CLEAVE"),
    ]
    build_and_save_30fps_sheet(
        "chronomancer", parts, build_row_configs, render_frame,
        OUT_SHEET_PATH, None, ARTIFACT_DIR,
        shimmer_cols=(C_CYAN_LIT, C_GOLD_SPEC), showcase_picks=picks,
    )
    verify_output_sheet(OUT_SHEET_PATH)


if __name__ == "__main__":
    main()
