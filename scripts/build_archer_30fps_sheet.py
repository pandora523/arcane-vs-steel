#!/usr/bin/env python3
"""
Builds Sylvara v3 (Elven Starlight Wind-Ranger — Sovereign of Yggdrasil & Celestial Greatbow)
30fps HD-2D Sprite Sheet (`assets/sprites/archer_sheet.png`, 6240x1872, 30 cols x 9 rows of 208x208)
using `assets/sprites/archer_v3_base.jpg` + `hd2d_rig_core`.

Key Features:
- Surgical 14-part hierarchical anatomical segmentation of `archer_v3_base.jpg` (`mane` braided
  moon-silver ponytail, `head` with emerald tiara, `torso` bodice, `l_coat` & `r_coat` split
  emerald leaf-petal ranger skirt, `l_sode`, `l_forearm`, `r_sode`, `r_forearm`, `l_thigh`,
  `l_shin`, `l_foot`, `r_thigh`, `r_shin`, `r_foot`) with BFS white-pocket removal, 3-pass
  anti-aliased fringe stripping, `MedianFilter` cel-flattening, 0 unassigned foreground pixels,
  and trimmed static open fingers replaced by palette-matched archer gauntlet clasps.
- Curated 20-color Emerald / Moon-Silver / Royal Yggdrasil Gold `MASTER_PALETTE` + 2-pass
  cardinal orphan despeckle + interior pinhole sealing (`0` interior pinholes) + 1px Selout.
- Back Attachments:
  * Ornate **Emerald Star-Quiver** with royal-gold filigree & glowing starlight fletchings.
  * Luminous **6-Pinion Emerald-Gold Yggdrasil Light-Wings** unfurled on `Row 4 ULTIMATE`
    and `Row 8 JUMP`.
- Articulated Weapon:
  * **Twin-Limb Celestial Greatbow** with curved moon-silver/emerald bow-blades, dynamic
    glowing emerald bowstring pulled to `l_hand`, starlight arrow draw (including multi-arrow
    Starfall Seeker fan on `Row 3 SKILL`), twin bow-blade crescent slash arc on close strikes,
    and flat horizontal ground rest on `Row 5 DEATH F18..F29`.
- Grounded boots planted at `y_104 = 99` (`y_208 = 198..199`), `0/270` border clips,
  `0` interior pinholes, and `29/29` distinct frame transitions per row.
"""

import os
import math
from collections import deque
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from hd2d_rig_core import (
    CELL, LOGICAL, COLS, ROWS, P, BASE_NUMERIC_KEYS,
    poly_mask, keep_largest_component, assign_remaining_geodesic,
    extract_parts_512, rot_pt, draw_slash_arc_104,
    render_rig_104, build_and_save_30fps_sheet,
)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE_IMG_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "archer_v3_base.jpg")
OUT_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "archer_sheet.png")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"

# Curated 20-Color Emerald / Moon-Silver / Royal Yggdrasil Gold Master Palette
MASTER_PALETTE = np.array([
    [9, 16, 14],      # 0: Deep Forest-Obsidian Selout (#09100e)
    [18, 34, 26],     # 1: Dark Pine Boot & Tunic Deep Shadow / Lit Selout (#12221a)
    [26, 58, 42],     # 2: Forest-Jade Boot & Bodice Base (#1a3a2a)
    [40, 96, 64],     # 3: Sylvan Emerald Tunic & Leaf-Skirt Midtone (#286040)
    [62, 144, 88],    # 4: Vibrant Leaf-Petal Emerald Highlight (#3e9058)
    [98, 188, 114],   # 5: Sunlit Canopy Jade Rim (#62bc72)
    [96, 106, 100],   # 6: Cool Sage-Silver Hair & Sleeve Shadow (#606a64)
    [148, 158, 150],  # 7: Moon-Silver Hair & Sleeve Midtone (#949e96)
    [196, 206, 198],  # 8: Bright Platinum-Silver Hair & High Collar (#c4cec6)
    [234, 240, 232],  # 9: Luminous Moon-White Hair Crown Highlight (#eaf0e8)
    [158, 110, 86],   # 10: Warm Elven Skin & Thigh Shadow (#9e6e56)
    [208, 160, 130],  # 11: Fair Peach-Ivory Elven Skin Midtone (#d0a082)
    [242, 204, 174],  # 12: Lit Elven Face Highlight (#f2ccae)
    [96, 68, 28],     # 13: Dark Antique Elven Bronze Shadow (#60441c)
    [152, 110, 40],   # 14: Burnished Yggdrasil Gold Trim & Poleyn Midtone (#986e28)
    [210, 164, 58],   # 15: Royal Celestial Gold Bow & Crown Highlight (#d2a43a)
    [250, 222, 106],  # 16: Specular Starlight Gold Gleam (#fade6a)
    [22, 188, 142],   # 17: Deep Astral Emerald Glow (#16bc8e)
    [78, 236, 184],   # 18: Luminous Starlight-Jade Bowstring & Wing Mid (#4eecb8)
    [236, 255, 244],  # 19: Pure White-Hot Starlight Arrow Core (#ecfff4)
], dtype=np.int32)

# Pre-bound RGBA palette colors (100% strictly in MASTER_PALETTE)
C_OUT = (9, 16, 14, 255)
C_EM_DARK = (18, 34, 26, 255)
C_EM_BASE = (26, 58, 42, 255)
C_EM_MID = (40, 96, 64, 255)
C_EM_LIT = (62, 144, 88, 255)
C_EM_RIM = (98, 188, 114, 255)
C_SILV_DARK = (96, 106, 100, 255)
C_SILV_MID = (148, 158, 150, 255)
C_SILV_LIT = (196, 206, 198, 255)
C_SILV_CROWN = (234, 240, 232, 255)
C_GOLD_DARK = (96, 68, 28, 255)
C_GOLD_MID = (152, 110, 40, 255)
C_GOLD_LIT = (210, 164, 58, 255)
C_GOLD_SPEC = (250, 222, 106, 255)
C_STAR_DEEP = (22, 188, 142, 255)
C_STAR_MID = (78, 236, 184, 255)
C_STAR_CORE = (236, 255, 244, 255)

# Skeletal pivots in 512x512 rig space (0.5x of 1024x1024 archer_v3_base.jpg)
PIVOTS = dict(
    pelvis=(260.0, 236.0),
    neck=(259.0, 124.0),
    mane=(222.0, 118.0),
    l_sh=(224.0, 143.0), l_elb=(202.0, 198.0), l_hand=(187.0, 256.0),
    r_sh=(289.0, 152.0), r_elb=(299.0, 202.0), r_hand=(317.0, 252.0),
    l_hip=(233.0, 274.0), l_knee=(222.0, 347.0), l_ank=(197.0, 443.0),
    r_hip=(282.0, 276.0), r_knee=(284.0, 347.0), r_ank=(282.0, 436.0),
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
    protect_indices=(5, 11, 12, 15, 16, 17, 18, 19),
    hair_indices=(6, 7, 8, 9),
    lit_selout=1,
    shad_selout=0,
    hair_selout=6,
    joint_fill=(26, 58, 42, 255),
    joint_inner=(40, 96, 64, 255),
    hip_r=14,
    thigh_r=10,
    arm_r=10,
    pinhole_fill=(26, 58, 42, 255),
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
    """Outputs `debug_archer_v3_grid.png` and `debug_archer_v3_parts.png` into ARTIFACT_DIR."""
    os.makedirs(ARTIFACT_DIR, exist_ok=True)

    grid_im = base_im_raw.copy()
    gd = ImageDraw.Draw(grid_im)
    W0, H0 = grid_im.size
    for x in range(0, W0, 50):
        col = (255, 0, 80, 180) if x % 100 == 0 else (0, 180, 120, 110)
        gd.line([(x, 0), (x, H0 - 1)], fill=col, width=(2 if x % 100 == 0 else 1))
        if x % 100 == 0:
            gd.text((x + 3, 4), str(x), fill=(220, 0, 60, 255))
            gd.text((x + 3, H0 - 18), str(x), fill=(220, 0, 60, 255))
    for y in range(0, H0, 50):
        col = (255, 0, 80, 180) if y % 100 == 0 else (0, 180, 120, 110)
        gd.line([(0, y), (W0 - 1, y)], fill=col, width=(2 if y % 100 == 0 else 1))
        if y % 100 == 0:
            gd.text((4, y + 2), str(y), fill=(220, 0, 60, 255))
            gd.text((W0 - 34, y + 2), str(y), fill=(220, 0, 60, 255))
    grid_im.save(os.path.join(ARTIFACT_DIR, "debug_archer_v3_grid.png"))

    cw, ch = 175, 175
    pad = 14
    cols_p, rows_p = 5, 3
    grid_w = cols_p * (cw + pad) + pad
    grid_h = rows_p * (ch + pad + 20) + pad
    map_w = 400
    im_dbg = Image.new("RGBA", (map_w + grid_w, max(540, grid_h)), (16, 26, 22, 255))
    d = ImageDraw.Draw(im_dbg)

    seg_vis = np.zeros((512, 512, 4), dtype=np.uint8)
    part_cols = [
        (196, 240, 220), (255, 220, 90), (62, 188, 114), (120, 230, 150),
        (50, 160, 110), (255, 130, 60), (255, 70, 90), (60, 220, 180),
        (40, 180, 255), (242, 190, 140), (70, 190, 80), (230, 230, 90),
        (255, 160, 190), (220, 100, 160), (255, 205, 120),
    ]
    for (nm, m), col in zip(masks, part_cols):
        seg_vis[m, :3] = (arr512[m, :3].astype(int) * 0.56 + np.array(col) * 0.44).astype(np.uint8)
        seg_vis[m, 3] = 255
    seg_crop = Image.fromarray(seg_vis, "RGBA").crop((130, 20, 380, 508))
    im_dbg.alpha_composite(seg_crop, (40, 25))
    d.text((40, 6), "512x512 SEGMENTATION (0 UNASSIGNED PX)", fill=(78, 236, 184, 255))

    for idx, (nm, _) in enumerate(masks):
        c = idx % cols_p
        r = idx // cols_p
        ox = map_w + pad + c * (cw + pad)
        oy = pad + 20 + r * (ch + pad + 20)
        d.rectangle([ox, oy, ox + cw, oy + ch], fill=(26, 42, 34, 255), outline=(62, 144, 88, 255), width=1)
        pim, _, _ = parts[nm]
        pw, ph = pim.size
        d.text((ox + 2, oy - 16), f"{nm} ({pw}x{ph})", fill=(250, 222, 106, 255))
        sc = min(1.8, (cw - 14) / max(1, pw), (ch - 14) / max(1, ph))
        pim_z = pim.resize((max(1, int(pw * sc)), max(1, int(ph * sc))), Image.Resampling.NEAREST)
        im_dbg.alpha_composite(pim_z, (ox + (cw - pim_z.size[0]) // 2, oy + (ch - pim_z.size[1]) // 2))

    im_dbg.save(os.path.join(ARTIFACT_DIR, "debug_archer_v3_parts.png"))


def load_and_segment_512():
    """
    Loads `archer_v3_base.jpg` (1024x1024):
    1. BFS exterior + enclosed white-pocket removal (`(394, 368)` & `(453, 456)`).
    2. 3-pass anti-aliased white-fringe stripping (zero white halo).
    3. 2x NEAREST downsample to 512x512 + MedianFilter(size=3) on head/crown + MedianFilter(size=5)
       on body/boots + emerald tiara gem & emerald eye preservation.
    4. Clean 14/15-part anatomical segmentation (`mane`, `head`, `torso`, `l_coat`, `r_coat`,
       `l_sode`, `l_forearm`, `r_sode`, `r_forearm`, `l_thigh`, `l_shin`, `l_foot`,
       `r_thigh`, `r_shin`, `r_foot`) with 0 unassigned foreground pixels.
    """
    base_raw = Image.open(BASE_IMG_PATH).convert("RGBA")
    im = base_raw.copy()

    # 1. BFS exterior + enclosed arm/braid white pockets
    bg_seeds = (
        (0, 0), (1023, 0), (0, 1023), (1023, 1023),
        (394, 368), (453, 456), (510, 780),
    )
    for sx, sy in bg_seeds:
        px = im.getpixel((sx, sy))
        if px[3] > 0 and px[0] > 215 and px[1] > 215 and px[2] > 215:
            ImageDraw.floodfill(im, (sx, sy), (0, 0, 0, 0), thresh=40)

    arr = np.array(im)
    r0 = arr[:, :, 0].astype(np.int16)
    g0 = arr[:, :, 1].astype(np.int16)
    b0 = arr[:, :, 2].astype(np.int16)
    a0 = arr[:, :, 3] > 0
    yy1024 = np.arange(1024)[:, None]
    # Strip any tiny remaining enclosed pure-white background flecks below chest bib (y > 340)
    arr[a0 & (yy1024 > 340) & (r0 > 246) & (g0 > 246) & (b0 > 246)] = [0, 0, 0, 0]

    # 2. 3-Pass Anti-Aliased White-Fringe Stripping
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
        wf = edge & (r > 180) & (g > 180) & (b > 180) & (np.abs(r - g) < 26) & (np.abs(g - b) < 26)
        arr[wf] = [0, 0, 0, 0]

    im512 = Image.fromarray(arr, "RGBA").resize((512, 512), Image.Resampling.NEAREST)
    raw512 = np.array(im512)
    rgb512 = im512.convert("RGB")
    rgb_med3 = np.array(rgb512.filter(ImageFilter.MedianFilter(size=3)))
    rgb_med5 = np.array(rgb512.filter(ImageFilter.MedianFilter(size=5)))
    arr512 = raw512.copy()
    H, W = 512, 512

    # Trim dangling open spread fingertips at wrists so hands form compact archer grips
    trim_l_fingers = poly_mask(H, W, P([(326, 540), (410, 540), (410, 600), (326, 600)]))
    trim_r_fingers = poly_mask(H, W, P([(630, 534), (686, 534), (686, 584), (634, 584)]))
    arr512[trim_l_fingers | trim_r_fingers] = [0, 0, 0, 0]

    alpha = keep_largest_component(arr512[:, :, 3] > 0)
    arr512[~alpha] = [0, 0, 0, 0]

    # 3. MedianFilter(size=3) on head/crown (y < 134), MedianFilter(size=5) on body/boots (y >= 134)
    yy = np.arange(512)[:, None]
    cel_rgb = np.where(yy[:, :, None] < 134, rgb_med3, rgb_med5)
    arr512[:, :, :3] = np.where(alpha[:, :, None], cel_rgb, 0)

    # Preserve crisp glowing emerald forehead tiara gem & emerald eyes
    rr = raw512[:, :, 0].astype(np.int16)
    rg = raw512[:, :, 1].astype(np.int16)
    rb = raw512[:, :, 2].astype(np.int16)
    em_gem = alpha & (yy < 105) & (rg > 125) & ((rg - rr) > 34)
    em_gem_hot = em_gem & (rg > 175)
    arr512[em_gem] = [22, 188, 142, 255]
    arr512[em_gem_hot] = [78, 236, 184, 255]

    a = alpha
    # Bare thigh peach-skin detector below y_1024=542 so emerald leaf-petals stay in l_coat/r_coat
    # while 100% of bare thigh skin goes cleanly into l_thigh/r_thigh
    c_r = arr512[:, :, 0].astype(np.int16)
    c_g = arr512[:, :, 1].astype(np.int16)
    is_thigh_skin = a & (yy >= 271) & (yy <= 316) & ((c_r - c_g) > 14)

    m_head = poly_mask(H, W, P([
        (415, 72), (612, 72), (612, 256), (576, 268), (552, 256),
        (496, 256), (470, 248), (446, 206), (415, 185),
    ])) & a

    m_mane = poly_mask(H, W, P([
        (304, 180), (468, 180), (466, 248), (424, 266),
        (402, 298), (388, 344), (370, 396), (358, 478), (304, 478),
    ])) & a & (~m_head)

    m_l_sode = poly_mask(H, W, P([
        (372, 248), (496, 248), (498, 306), (468, 348),
        (442, 412), (372, 404),
    ])) & a & (~m_head) & (~m_mane)

    m_l_forearm = poly_mask(H, W, P([
        (326, 392), (442, 406), (422, 498), (410, 548), (326, 548),
    ])) & a & (~m_l_sode) & (~m_mane) & (~m_head)

    m_r_sode = poly_mask(H, W, P([
        (574, 276), (620, 276), (624, 412), (582, 420),
    ])) & a & (~m_head)

    m_r_forearm = poly_mask(H, W, P([
        (584, 406), (636, 402), (682, 488), (682, 548), (622, 548), (602, 470),
    ])) & a & (~m_r_sode) & (~m_head)

    m_torso = poly_mask(H, W, P([
        (446, 244), (596, 244), (598, 468), (552, 492), (516, 492), (452, 456),
    ])) & a & (~m_head) & (~m_mane) & (~m_l_sode) & (~m_l_forearm) & (~m_r_sode) & (~m_r_forearm)

    m_l_coat = poly_mask(H, W, P([
        (400, 444), (528, 444), (528, 598), (400, 592),
    ])) & a & (~m_torso) & (~m_l_forearm) & (~m_l_sode) & (~is_thigh_skin)

    m_r_coat = poly_mask(H, W, P([
        (524, 444), (646, 444), (646, 606), (524, 606),
    ])) & a & (~m_torso) & (~m_r_forearm) & (~m_r_sode) & (~is_thigh_skin)

    m_l_foot = poly_mask(H, W, P([
        (345, 882), (442, 882), (442, 995), (345, 995),
    ])) & a

    m_l_shin = poly_mask(H, W, P([
        (362, 686), (492, 686), (465, 886), (362, 886),
    ])) & a & (~m_l_foot)

    m_l_thigh = poly_mask(H, W, P([
        (405, 534), (526, 534), (516, 692), (405, 692),
    ])) & a & (~m_torso) & (~m_l_coat) & (~m_l_shin) & (~m_l_foot) & (~m_l_forearm)

    m_r_foot = poly_mask(H, W, P([
        (516, 866), (656, 866), (656, 956), (516, 956),
    ])) & a

    m_r_shin = poly_mask(H, W, P([
        (512, 686), (618, 686), (608, 870), (512, 870),
    ])) & a & (~m_r_foot)

    m_r_thigh = poly_mask(H, W, P([
        (520, 534), (624, 534), (620, 692), (520, 692),
    ])) & a & (~m_torso) & (~m_r_coat) & (~m_r_shin) & (~m_r_foot) & (~m_r_forearm)

    raw_list = [
        ("mane", m_mane), ("head", m_head), ("torso", m_torso),
        ("l_coat", m_l_coat), ("r_coat", m_r_coat),
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
# `r_hand` = Forward Bow-Hand holding the Twin-Limb Celestial Greatbow
# `l_hand` = Near Draw-Hand pulling the glowing emerald bowstring & arrow nock
# =============================================================================

def solve_arm_ik(sh_w, target_w, L1, L2, a1_rest, a2_rest, torso_deg, elbow_cw=None):
    dx = target_w[0] - sh_w[0]
    dy = target_w[1] - sh_w[1]
    dist = math.hypot(dx, dy)
    max_reach = (L1 + L2) * 0.97
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
        th_pos = base_ang + alpha1
        th_neg = base_ang - alpha1
        th1 = th_pos if math.sin(th_pos) >= math.sin(th_neg) else th_neg
    else:
        th1 = base_ang + (alpha1 if elbow_cw else -alpha1)

    elb_x = sh_w[0] + math.cos(th1) * L1
    elb_y = sh_w[1] + math.sin(th1) * L1
    th2 = math.atan2(target_w[1] - elb_y, target_w[0] - elb_x)

    sode_deg = math.degrees(th1) - a1_rest
    fore_deg = math.degrees(th2) - a2_rest
    return (sode_deg - torso_deg), (fore_deg - sode_deg)


def apply_dual_archer_ik(cfg):
    """Solves exact 2-Bone IK independently for `r_hand` (Greatbow grip) and `l_hand` (Bowstring draw)."""
    if not cfg.get("use_dual_ik", True):
        return cfg

    torso_deg = cfg.get("torso_deg", 0.0)
    pel = PIVOTS["pelvis"]
    l_sh_w = rot_pt(PIVOTS["l_sh"], pel, torso_deg)
    r_sh_w = rot_pt(PIVOTS["r_sh"], pel, torso_deg)

    r_target = (pel[0] + cfg.get("r_hx", 72.0), pel[1] + cfg.get("r_hy", -32.0))
    l_target = (pel[0] + cfg.get("l_hx", -24.0), pel[1] + cfg.get("l_hy", -42.0))

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


ARCHER_NUMERIC_KEYS = tuple(BASE_NUMERIC_KEYS) + (
    "r_hx", "r_hy", "l_hx", "l_hy",
    "bow_deg", "bow_span", "draw_pull", "wing_flap", "wing_scale",
)


def eval_archer_keyframes(f, keyframes, ph, defaults, wave_mult=2.0):
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
    for k in ARCHER_NUMERIC_KEYS:
        if k in defaults or k in d0 or k in d1:
            v0 = d0.get(k, defaults.get(k, 0.0))
            v1 = d1.get(k, defaults.get(k, 0.0))
            out[k] = v0 + (v1 - v0) * u

    active_d = d0 if raw_u < 0.5 else d1
    meta_keys = (
        "use_dual_ik", "right_arm_in_front", "right_leg_behind",
        "wings_mode", "quiver_on", "arrow_mode", "resting_weapon",
        "r_elbow_cw", "l_elbow_cw",
    )
    for mk in meta_keys:
        if mk in active_d:
            out[mk] = active_d[mk]

    out["mane_wave_phase"] = ph * wave_mult
    return apply_dual_archer_ik(out)


# =============================================================================
# BACK ATTACHMENTS: EMERALD STAR-QUIVER & 6-PINION YGGDRASIL LIGHT-WINGS
# =============================================================================

def draw_star_quiver_104(arr, nk_x, nk_y, torso_deg=0.0, shimmer=0.0):
    """
    Renders Sylvara's Ornate Emerald Star-Quiver slung diagonally behind her upper back,
    complete with royal-gold filigree mouth & 3 glowing starlight-jade arrow fletchings.
    """
    qx = max(14.0, min(88.0, nk_x - 5.5))
    qy = max(16.0, min(88.0, nk_y + 5.5))
    ang = math.radians(-128.0 + torso_deg * 0.45)
    ux, uy = math.cos(ang), math.sin(ang)
    nx, ny = -uy, ux

    # Quiver cylindrical forest-jade body (from lower hip-strap end to shoulder mouth)
    for s in np.linspace(-7.5, 6.5, 29):
        cx = qx + ux * s
        cy = qy + uy * s
        is_rim = (s >= 4.6) or (-2.2 <= s <= -1.0) or (s <= -6.4)
        for w in (-2.0, -1.0, 0.0, 1.0, 2.0):
            px = cx + nx * w
            py = cy + ny * w
            if abs(w) >= 1.9 or s <= -7.2:
                col = C_OUT
            elif is_rim:
                col = C_GOLD_SPEC if w < -0.3 else (C_GOLD_LIT if w < 0.8 else C_GOLD_DARK)
            else:
                col = C_EM_LIT if w < -0.4 else (C_EM_MID if w < 0.7 else C_EM_DARK)
            put_px_safe(arr, px, py, col)

    # Central glowing star-gem on quiver mouth
    mx, my = qx + ux * 5.6, qy + uy * 5.6
    put_px_safe(arr, mx, my, C_STAR_CORE if shimmer > 0.3 else C_STAR_MID)

    # 3 protruding Starlight-Jade & Royal-Gold Arrow Fletchings
    for idx, off_w in enumerate((-1.4, 0.0, 1.4)):
        fx0 = qx + ux * 6.4 + nx * off_w
        fy0 = qy + uy * 6.4 + ny * off_w
        fx1 = qx + ux * 10.6 + nx * (off_w * 1.35)
        fy1 = qy + uy * 10.6 + ny * (off_w * 1.35)
        draw_line_safe(arr, fx0, fy0, fx1, fy1, C_GOLD_LIT, 1)
        # Starlight feather vanes
        vx = fx1 - ux * 1.1
        vy = fy1 - uy * 1.1
        put_px_safe(arr, vx + nx * 0.9, vy + ny * 0.9, C_STAR_MID)
        put_px_safe(arr, vx - nx * 0.9, vy - ny * 0.9, C_STAR_DEEP)
        put_px_safe(arr, fx1, fy1, C_STAR_CORE if idx == 1 else C_GOLD_SPEC)


def draw_yggdrasil_wings_104(arr, nk_x, nk_y, flap_deg=0.0, scale_w=1.0):
    """
    Renders Luminous 6-Pinion Emerald-Gold Yggdrasil Light-Wings behind Sylvara on
    Row 4 (`ULTIMATE`) and Row 8 (`JUMP`).
    6 distinct articulated crystal-leaf pinions (3 upper-swept + 3 cascading lower-back)
    with solid emerald-gold feather fill & 1px dark framing (0 interior pinholes, 0 clips).
    """
    wx = max(24.0, min(80.0, nk_x - 3.5))
    wy = max(22.0, min(80.0, nk_y + 4.5))

    # 6 articulated pinions: (base_angle_deg, length_px, width_px, flap_mult)
    # Sweeping majestically up-left and fan-spread behind her shoulders & back
    pinions = (
        (-148.0, 21.5 * scale_w, 2.5, 1.00),   # Pinion 1: High Crown Sovereign Feather
        (-168.0, 20.0 * scale_w, 2.4, 0.82),   # Pinion 2: Upper-Mid Astral Feather
        (172.0,  18.0 * scale_w, 2.3, 0.64),   # Pinion 3: Horizontal Wind-Vane Feather
        (152.0,  15.5 * scale_w, 2.1, 0.48),   # Pinion 4: Lower-Mid Sylvan Feather
        (-124.0, 16.5 * scale_w, 2.2, 1.12),   # Pinion 5: Upper Halo-Crest Feather
        (132.0,  13.0 * scale_w, 1.9, 0.35),   # Pinion 6: Trailing Tail-Plume Feather
    )

    for p_idx, (base_deg, plen, pwid, f_mult) in enumerate(pinions):
        ang = math.radians(base_deg + flap_deg * f_mult)
        ux, uy = math.cos(ang), math.sin(ang)
        nx, ny = -uy, ux

        # Clamp pinion length so tip strictly stays inside [6..97]
        max_len = plen
        if ux < -0.05:
            max_len = min(max_len, (wx - 6.5) / (-ux))
        elif ux > 0.05:
            max_len = min(max_len, (97.5 - wx) / ux)
        if uy < -0.05:
            max_len = min(max_len, (wy - 6.5) / (-uy))
        elif uy > 0.05:
            max_len = min(max_len, (97.5 - wy) / uy)
        max_len = max(6.0, max_len)

        steps = int(max_len * 2.2) + 2
        for i in range(steps + 1):
            u = i / float(steps)
            dist = u * max_len
            # Leaf-blade silhouette taper
            hw = pwid * math.sin(min(1.0, u * 1.12) * math.pi * 0.88) + 0.55
            cx = wx + ux * dist
            cy = wy + uy * dist
            iw = int(math.ceil(hw)) + 1
            for k in range(-iw, iw + 1):
                w = k * 0.65
                if abs(w) > hw + 0.55:
                    continue
                px = cx + nx * w
                py = cy + ny * w
                if abs(w) >= hw - 0.15 or u > 0.94:
                    col = C_OUT if u < 0.88 else C_STAR_CORE
                elif w < -0.25:
                    # Leading golden Yggdrasil spine
                    col = C_GOLD_SPEC if u < 0.55 else C_GOLD_LIT
                elif abs(w) <= 0.45:
                    col = C_STAR_CORE if (u > 0.35 and p_idx % 2 == 0) else C_STAR_MID
                else:
                    col = C_STAR_DEEP if u < 0.72 else C_EM_RIM
                put_px_safe(arr, px, py, col)

    # Golden Yggdrasil Wing-Root Astral Crest behind shoulder
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            r2 = dx * dx + dy * dy
            if r2 <= 5:
                col = C_STAR_CORE if r2 == 0 else (C_GOLD_SPEC if r2 <= 2 else C_GOLD_DARK)
                put_px_safe(arr, wx + dx, wy + dy, col)


# =============================================================================
# ARTICULATED WEAPON: TWIN-LIMB CELESTIAL GREATBOW & STARLIGHT ARROWS
# =============================================================================

def draw_archer_clasp_104(arr, hx, hy, is_bow_hand=True):
    """Draws a palette-matched Emerald & Royal-Gold Elven Archer Gauntlet/Tab Clasp."""
    for dy in range(-1, 3):
        for dx in range(-2, 2):
            if abs(dx) + abs(dy) > 3:
                continue
            if dy == -1:
                col = C_GOLD_SPEC if is_bow_hand else C_GOLD_LIT
            elif dx == -2 or dy == 2:
                col = C_OUT
            else:
                col = C_EM_MID if dx >= 0 else C_EM_BASE
            put_px_safe(arr, hx + dx, hy + dy, col)


def draw_celestial_greatbow_104(arr, rh, lh, cfg):
    """
    Renders Sylvara's Twin-Limb Celestial Greatbow:
    - Curved royal-gold & emerald Yggdrasil limbs with gleaming moon-silver Twin Bow-Blades
    - Dynamic glowing emerald bowstring anchored to limb tips & pulled to `l_hand` (`draw_pull`)
    - Starlight Arrow nocked/charged/fanned along aim vector (`arrow_mode`)
    """
    hx, hy = rh
    lx, ly = lh
    draw_pull = max(0.0, min(1.0, float(cfg.get("draw_pull", 0.0))))
    arrow_mode = cfg.get("arrow_mode", "none")

    # When drawing, align bow aim naturally from draw-hand (`lh`) through bow-hand (`rh`)
    if draw_pull > 0.18 and math.hypot(hx - lx, hy - ly) > 4.0:
        aim_rad = math.atan2(hy - ly, hx - lx)
    else:
        aim_rad = math.radians(cfg.get("bow_deg", -10.0))

    ux, uy = math.cos(aim_rad), math.sin(aim_rad)
    nx, ny = -uy, ux

    # Keep riser safely inside [12..91] so curved limbs + broadhead never clip [4..99]
    hx = max(12.0, min(88.0, hx))
    hy = max(14.0, min(89.0, hy))

    half_span = float(cfg.get("bow_span", 14.5))
    # Dynamically clamp limb span if near top/bottom/side edges
    for sign in (-1.0, 1.0):
        dx_tip = -ux * (3.2 + draw_pull * 2.6) + nx * sign * half_span
        dy_tip = -uy * (3.2 + draw_pull * 2.6) + ny * sign * half_span
        if hx + dx_tip < 6.0 and dx_tip < -0.5:
            half_span = min(half_span, half_span * (hx - 6.0) / (-dx_tip))
        if hx + dx_tip > 97.0 and dx_tip > 0.5:
            half_span = min(half_span, half_span * (97.0 - hx) / dx_tip)
        if hy + dy_tip < 6.0 and dy_tip < -0.5:
            half_span = min(half_span, half_span * (hy - 6.0) / (-dy_tip))
        if hy + dy_tip > 97.0 and dy_tip > 0.5:
            half_span = min(half_span, half_span * (97.0 - hy) / dy_tip)
    half_span = max(8.5, half_span)

    flex_back = 3.2 + draw_pull * 2.8
    tips = []

    # 1. Render Upper & Lower Curved Celestial Greatbow Limbs + Twin Elven Bow-Blades
    for sign in (-1.0, 1.0):
        steps = 22
        prev_pt = (hx, hy)
        for i in range(1, steps + 1):
            u = i / float(steps)
            # Graceful elven recurve S-arc
            back_off = flex_back * (u ** 1.45) - (0.85 * (u ** 4) if u > 0.72 else 0.0)
            lat_off = sign * half_span * u
            px = hx - ux * back_off + nx * lat_off
            py = hy - uy * back_off + ny * lat_off

            # Outer forward edge = Moon-Silver & Emerald Twin Bow-Blade!
            bx = px + ux * (1.5 if 0.25 < u < 0.88 else 0.9)
            by = py + uy * (1.5 if 0.25 < u < 0.88 else 0.9)
            put_px_safe(arr, bx + ux * 0.8, by + uy * 0.8, C_OUT)
            if 0.22 <= u <= 0.92:
                put_px_safe(arr, bx, by, C_SILV_CROWN if u > 0.55 else C_SILV_LIT)
                put_px_safe(arr, px + ux * 0.7, py + uy * 0.7, C_STAR_MID if draw_pull > 0.5 else C_EM_RIM)

            # Royal-Gold Yggdrasil Limb Spine + Dark Selout backing
            put_px_safe(arr, px - ux * 0.9, py - uy * 0.9, C_OUT)
            limb_col = C_GOLD_SPEC if u < 0.42 else (C_GOLD_LIT if u < 0.82 else C_STAR_MID)
            draw_line_safe(arr, prev_pt[0], prev_pt[1], px, py, limb_col, 1)
            prev_pt = (px, py)
        tips.append(prev_pt)

    (utx, uty), (ltx, lty) = tips

    # 2. Glowing Emerald Bowstring
    if draw_pull > 0.08:
        pull_dist = min(18.0, max(4.5, draw_pull * 14.5))
        if math.hypot(hx - lx, hy - ly) > 3.5:
            sx = max(6.0, min(97.0, lx))
            sy = max(6.0, min(97.0, ly))
        else:
            sx = max(6.0, min(97.0, hx - ux * pull_dist))
            sy = max(6.0, min(97.0, hy - uy * pull_dist))
        str_col = C_STAR_CORE if draw_pull > 0.72 else C_STAR_MID
        draw_line_safe(arr, utx, uty, sx, sy, str_col, 1)
        draw_line_safe(arr, ltx, lty, sx, sy, str_col, 1)
    else:
        sx, sy = 0.5 * (utx + ltx), 0.5 * (uty + lty)
        draw_line_safe(arr, utx, uty, ltx, lty, C_STAR_DEEP, 1)

    # 3. Sculpted Golden-Emerald Riser Gem & Bow-Hand Clasp
    draw_archer_clasp_104(arr, hx, hy, is_bow_hand=True)
    put_px_safe(arr, hx + ux * 1.4, hy + uy * 1.4, C_GOLD_SPEC)
    put_px_safe(arr, hx + ux * 2.2, hy + uy * 2.2, C_STAR_CORE if draw_pull > 0.4 else C_STAR_MID)
    if draw_pull > 0.15:
        draw_archer_clasp_104(arr, sx, sy, is_bow_hand=False)

    # 4. Nocked / Charged / Multi-Fan Starlight Arrows
    if arrow_mode in ("nocked", "charged", "fan3"):
        angles = (0.0,) if arrow_mode != "fan3" else (-23.0, 0.0, 23.0)
        for da in angles:
            ar = aim_rad + math.radians(da)
            aux, auy = math.cos(ar), math.sin(ar)
            anx, any_ = -auy, aux

            fwd_reach = 9.8 if arrow_mode in ("charged", "fan3") else 7.8
            max_fwd = fwd_reach
            if aux > 0.05:
                max_fwd = min(max_fwd, (96.5 - hx) / aux)
            elif aux < -0.05:
                max_fwd = min(max_fwd, (hx - 6.5) / (-aux))
            if auy > 0.05:
                max_fwd = min(max_fwd, (96.5 - hy) / auy)
            elif auy < -0.05:
                max_fwd = min(max_fwd, (hy - 6.5) / (-auy))
            max_fwd = max(3.8, max_fwd)

            # Start outer fan arrows slightly ahead of nock so shafts separate cleanly with air between them
            start_x = sx if da == 0.0 else (sx + aux * 3.2 + anx * (1.2 if da > 0 else -1.2))
            start_y = sy if da == 0.0 else (sy + auy * 3.2 + any_ * (1.2 if da > 0 else -1.2))
            tip_x = hx + aux * max_fwd + (anx * (2.2 if da > 0 else -2.2) if da != 0.0 else 0.0)
            tip_y = hy + auy * max_fwd + (any_ * (2.2 if da > 0 else -2.2) if da != 0.0 else 0.0)
            tip_x = max(7.0, min(96.0, tip_x))
            tip_y = max(7.0, min(96.0, tip_y))

            shaft_col = C_STAR_CORE if da == 0.0 else C_GOLD_SPEC
            draw_line_safe(arr, start_x, start_y, tip_x, tip_y, shaft_col, 1)

            if da == 0.0:
                put_px_safe(arr, sx + aux * 1.2 + anx * 1.0, sy + auy * 1.2 + any_ * 1.0, C_STAR_MID)
                put_px_safe(arr, sx + aux * 1.2 - anx * 1.0, sy + auy * 1.2 - any_ * 1.0, C_STAR_MID)

            # Sculpted Starlight Broadhead
            put_px_safe(arr, tip_x + aux * 0.8, tip_y + auy * 0.8, C_OUT)
            put_px_safe(arr, tip_x, tip_y, C_STAR_CORE)
            put_px_safe(arr, tip_x - aux * 1.1 + anx * 1.0, tip_y - auy * 1.1 + any_ * 1.0, C_STAR_MID)
            put_px_safe(arr, tip_x - aux * 1.1 - anx * 1.0, tip_y - auy * 1.1 - any_ * 1.0, C_STAR_MID)

            if arrow_mode == "charged":
                for ca, sa in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    put_px_safe(arr, tip_x + ca * 1.8, tip_y + sa * 1.8, C_GOLD_SPEC)

    elif arrow_mode == "release_flash":
        fx = max(8.0, min(95.0, hx + ux * 4.5))
        fy = max(8.0, min(95.0, hy + uy * 4.5))
        put_px_safe(arr, fx, fy, C_STAR_CORE)
        for d_ang in (0.0, math.pi * 0.5, math.pi, math.pi * 1.5):
            put_px_safe(arr, fx + math.cos(d_ang) * 2.0, fy + math.sin(d_ang) * 2.0, C_STAR_MID)
            put_px_safe(arr, fx + math.cos(d_ang + 0.78) * 1.5, fy + math.sin(d_ang + 0.78) * 1.5, C_GOLD_SPEC)


def draw_resting_greatbow_104(arr, cx):
    """
    Renders the Twin-Limb Celestial Greatbow resting flat horizontally
    on the stone ground (`y = 96..98` in 104-space) on Row 5 `DEATH` (`F17..F29`).
    """
    bx = max(24.0, min(74.0, cx + 10.0))
    by = 97.5
    for dx in range(-13, 14):
        u = abs(dx) / 13.0
        arch_y = by - (1.0 - u * u) * 2.0
        put_px_safe(arr, bx + dx, arch_y + 0.9, C_OUT)
        put_px_safe(arr, bx + dx, arch_y, C_GOLD_LIT if abs(dx) < 6 else C_SILV_LIT)
    draw_line_safe(arr, bx - 12, by, bx + 12, by, C_STAR_DEEP, 1)
    put_px_safe(arr, bx, by - 2.0, C_STAR_MID)


# =============================================================================
# RIG CALLBACKS (`extra_extents`, `draw_back`, `draw_front`)
# =============================================================================

def extra_extents(joints_c, cfg, scale):
    pts = []
    rh = joints_c["r_hand"]
    nk = joints_c["neck"]
    if not cfg.get("resting_weapon", False):
        aim_rad = math.radians(cfg.get("bow_deg", -10.0))
        ux, uy = math.cos(aim_rad), math.sin(aim_rad)
        nx, ny = -uy, ux
        span_c = cfg.get("bow_span", 14.5) / max(0.08, scale)
        pts.append((rh[0] + nx * span_c, rh[1] + ny * span_c))
        pts.append((rh[0] - nx * span_c, rh[1] - ny * span_c))
        if cfg.get("arrow_mode", "none") in ("nocked", "charged", "fan3"):
            pts.append((rh[0] + ux * (9.5 / max(0.08, scale)), rh[1] + uy * (9.5 / max(0.08, scale))))
    if cfg.get("wings_mode", "off") != "off":
        w_reach = (21.5 * cfg.get("wing_scale", 1.0)) / max(0.08, scale)
        pts.append((nk[0] - w_reach, nk[1] - w_reach * 0.65))
    return pts


def draw_back(out, joints_104, cfg):
    nk = joints_104["neck"]
    if cfg.get("wings_mode", "off") != "off":
        draw_yggdrasil_wings_104(
            out, nk[0], nk[1],
            flap_deg=cfg.get("wing_flap", 0.0),
            scale_w=cfg.get("wing_scale", 1.0),
        )
    if cfg.get("quiver_on", True):
        draw_star_quiver_104(
            out, nk[0], nk[1],
            torso_deg=cfg.get("torso_deg", 0.0),
            shimmer=cfg.get("weapon_glow", 0.5),
        )


def draw_front(out, joints_104, cfg):
    if cfg.get("resting_weapon", False):
        draw_resting_greatbow_104(out, joints_104["pelvis"][0])
        return

    rh = joints_104["r_hand"]
    lh = joints_104["l_hand"]
    draw_celestial_greatbow_104(out, rh, lh, cfg)

    # Optional Twin Bow-Blade Slash Arc on close melee-vault strikes (`AUTO` F03..F07 & `DASH`)
    arc = cfg.get("slash_arc", None)
    if arc is not None:
        cx = max(18.0, min(80.0, joints_104["pelvis"][0] + arc.get("dx", 10.0)))
        cy = max(18.0, min(80.0, joints_104["pelvis"][1] + arc.get("dy", -6.0)))
        draw_slash_arc_104(
            out, cx, cy,
            r_main=arc.get("r", 20.0),
            a_start_deg=arc.get("a0", -58.0),
            a_end_deg=arc.get("a1", 36.0),
            col_core=C_STAR_CORE,
            col_mid=C_STAR_MID if not arc.get("gold", False) else C_GOLD_SPEC,
            col_edge=C_EM_LIT if not arc.get("gold", False) else C_GOLD_MID,
            intensity=arc.get("intensity", 1.0),
        )


DEFAULTS = dict(
    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5, mane_rel_deg=0.0,
    l_thigh_deg=4.0, l_shin_deg=-2.0, l_foot_deg=0.0,
    r_thigh_deg=-4.0, r_shin_deg=2.0, r_foot_deg=0.0,
    l_sode_rel_deg=-6.0, l_fore_rel_deg=-14.0,
    r_sode_rel_deg=-18.0, r_fore_rel_deg=-20.0,
    l_coat_rel_deg=0.0, r_coat_rel_deg=0.0,
    r_hx=66.0, r_hy=-24.0, l_hx=-22.0, l_hy=-34.0,
    bow_deg=-12.0, bow_span=14.5, draw_pull=0.0,
    wing_flap=0.0, wing_scale=1.0, weapon_glow=0.8,
    mane_wave_amp=4.2, foot_y=99.0,
    use_dual_ik=True, wings_mode="off", quiver_on=True,
    arrow_mode="none", resting_weapon=False,
    right_arm_in_front=False, right_leg_behind=False,
)


def render_frame(parts, cfg):
    out = render_rig_104(
        parts, PIVOTS, cfg, PALETTE_CFG,
        y_bot_base=491.5, default_S=592,
        extra_extent_fn=extra_extents, draw_back_fn=draw_back, draw_front_fn=draw_front,
    )
    out = fill_layer_pinholes(out, max_hole_px=22)
    out[:3, :, :] = 0
    out[101:, :, :] = 0
    out[:, :3, :] = 0
    out[:, 101:, :] = 0
    return out


# =============================================================================
# 9-ROW 30FPS ELVEN STARLIGHT WIND-RANGER CHOREOGRAPHY (ZERO CROSSED KNEES!)
# =============================================================================

def build_row_configs(row_idx):
    cfgs = []
    for f in range(COLS):
        t = f / float(COLS)
        ph = 2.0 * math.pi * t

        if row_idx == 0:
            # Row 0: IDLE — Poised Sylvan Starlight Ranger Stance (`foot_y = 99.0`)
            b = math.sin(ph)
            s = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dx=s * 2.2, pelvis_dy=b * 6.0,
                torso_deg=3.5 + b * 1.6, head_rel_deg=-1.8 - b * 1.0,
                l_thigh_deg=4.0, l_shin_deg=-2.0, r_thigh_deg=-4.0, r_shin_deg=2.0,
                l_coat_rel_deg=s * 3.2, r_coat_rel_deg=-s * 2.8,
                r_hx=64.0 + s * 2.2, r_hy=-16.0 + b * 3.5,
                l_hx=8.0 - s * 2.0, l_hy=-12.0 + b * 3.0,
                bow_deg=-22.0 + b * 3.5, bow_span=14.5, draw_pull=0.05,
                arrow_mode="nocked", wings_mode="off", quiver_on=True,
                weapon_glow=0.55 + 0.45 * (0.5 + 0.5 * b),
                mane_wave_phase=ph, foot_y=99.0,
            )
            cfgs.append(apply_dual_archer_ik(cfg))

        elif row_idx == 1:
            # Row 1: WALK — Agile Anatomical 2-Step Sylvan Stride (`foot_y = 99.0`, zero crossed knees!)
            st = math.sin(ph)
            kl = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dy=abs(st) * 17.5,
                torso_deg=8.5 + abs(st) * 2.2, head_rel_deg=-4.5,
                right_leg_behind=(f >= 15),
                l_thigh_deg=st * 24.0 + 2.0,
                l_shin_deg=max(0.0, st * 26.0) + max(0.0, kl * 11.0),
                l_foot_deg=st * 11.0,
                r_thigh_deg=-st * 24.0 - 2.0,
                r_shin_deg=max(0.0, -st * 26.0) + max(0.0, -kl * 11.0),
                r_foot_deg=-st * 11.0,
                l_coat_rel_deg=-st * 9.0 - 3.5,
                r_coat_rel_deg=st * 8.5 - 3.0,
                r_hx=62.0 - st * 9.0, r_hy=-12.0 + abs(st) * 5.0,
                l_hx=-6.0 + st * 14.0, l_hy=2.0 + abs(st) * 4.0,
                bow_deg=-20.0 + st * 8.0, bow_span=14.0, draw_pull=0.0,
                arrow_mode="nocked", wings_mode="off", quiver_on=True,
                mane_wave_phase=ph * 2.0, foot_y=99.0,
            )
            cfgs.append(apply_dual_archer_ik(cfg))

        elif row_idx == 2:
            # Row 2: AUTO_ATTACK — Adaptive Ranger Combo (`foot_y = 99.0` grounded!):
            # F00..F07: Swift Twin Bow-Blade forward crescent cleave (reads cleanly on close Star-Blade Vault!)
            # F08..F18: Quiver reach -> full cheek-anchored Celestial Greatbow Starlight Arrow draw!
            # F19..F22: Supersonic release flash & bow recoil -> F23..F29 crisp recovery
            kfs = [
                (0, dict(
                    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.5, head_rel_deg=-1.8,
                    l_thigh_deg=4.0, r_thigh_deg=-4.0,
                    r_hx=64.0, r_hy=-18.0, l_hx=-32.0, l_hy=-10.0,
                    bow_deg=-20.0, bow_span=14.5, draw_pull=0.05, arrow_mode="nocked", foot_y=99.0,
                )),
                (4, dict(
                    # Forward Twin Bow-Blade sweep!
                    pelvis_dx=9.0, pelvis_dy=20.0, torso_deg=13.0, head_rel_deg=-7.0,
                    l_thigh_deg=18.0, l_shin_deg=12.0, r_thigh_deg=-18.0, r_shin_deg=14.0,
                    l_coat_rel_deg=-12.0, r_coat_rel_deg=-8.0,
                    r_hx=78.0, r_hy=-36.0, l_hx=-42.0, l_hy=-74.0,
                    bow_deg=8.0, bow_span=14.5, draw_pull=0.0,
                    right_arm_in_front=True, arrow_mode="none", foot_y=99.0,
                )),
                (9, dict(
                    # Left draw-hand nocks Starlight Arrow onto bowstring
                    pelvis_dx=2.0, pelvis_dy=12.0, torso_deg=6.0, head_rel_deg=-3.0,
                    l_thigh_deg=12.0, l_shin_deg=8.0, r_thigh_deg=-12.0, r_shin_deg=8.0,
                    r_hx=74.0, r_hy=-68.0, l_hx=42.0, l_hy=-68.0,
                    bow_deg=-2.0, bow_span=14.8, draw_pull=0.32,
                    right_arm_in_front=False, l_elbow_cw=False, arrow_mode="nocked", foot_y=99.0,
                )),
                (17, dict(
                    # Full Sovereign Cheek-Anchored Draw! (`r_hand` extended +X, `l_hand` pulled back to cheek!)
                    pelvis_dx=-6.0, pelvis_dy=16.0, torso_deg=2.0, head_rel_deg=-1.0,
                    l_thigh_deg=16.0, l_shin_deg=10.0, r_thigh_deg=-16.0, r_shin_deg=10.0,
                    l_coat_rel_deg=6.0, r_coat_rel_deg=-4.0,
                    r_hx=82.0, r_hy=-74.0, l_hx=-18.0, l_hy=-76.0,
                    bow_deg=-1.0, bow_span=15.0, draw_pull=1.0,
                    right_arm_in_front=False, l_elbow_cw=False, arrow_mode="charged", foot_y=99.0,
                )),
                (20, dict(
                    # Crisp Supersonic Bowstring Release & Recoil!
                    pelvis_dx=-10.0, pelvis_dy=14.0, torso_deg=-2.0, head_rel_deg=1.5,
                    l_thigh_deg=15.0, l_shin_deg=10.0, r_thigh_deg=-15.0, r_shin_deg=10.0,
                    r_hx=80.0, r_hy=-78.0, l_hx=-44.0, l_hy=-84.0,
                    bow_deg=-5.0, bow_span=15.0, draw_pull=0.0,
                    right_arm_in_front=False, l_elbow_cw=False, arrow_mode="release_flash", foot_y=99.0,
                )),
                (29, dict(
                    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.5, head_rel_deg=-1.8,
                    l_thigh_deg=4.0, r_thigh_deg=-4.0,
                    r_hx=64.0, r_hy=-18.0, l_hx=-32.0, l_hy=-10.0,
                    bow_deg=-20.0, bow_span=14.5, draw_pull=0.05, arrow_mode="nocked", foot_y=99.0,
                )),
            ]
            cfg = eval_archer_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if 3 <= f <= 6:
                u_s = (f - 3) / 3.0
                cfg["slash_arc"] = dict(
                    dx=14.0, dy=-6.0, r=19.5,
                    a0=-56.0 + u_s * 18.0, a1=38.0 + u_s * 16.0,
                    gold=False, intensity=0.95 - 0.25 * abs(u_s - 0.45),
                )
            cfgs.append(cfg)

        elif row_idx == 3:
            # Row 3: SKILL — `VERDANT SNARE & STARFALL SEEKERS`
            # F00..F09: Low Bramble-Star Snare snap-shot -> F10..F21: Graceful airborne hop (`foot_y=95.5`)
            #           drawing & firing a `-36 deg` Skyward Multi-Arrow Starfall Seeker Fan Volley!
            kfs = [
                (0, dict(
                    torso_deg=4.0, l_thigh_deg=5.0, r_thigh_deg=-5.0,
                    r_hx=66.0, r_hy=-22.0, l_hx=-28.0, l_hy=-16.0,
                    bow_deg=-16.0, draw_pull=0.1, arrow_mode="nocked", foot_y=99.0,
                )),
                (6, dict(
                    # Low downward Verdant Bramble-Star Snare cast!
                    pelvis_dx=6.0, pelvis_dy=28.0, torso_deg=12.0, head_rel_deg=-5.0,
                    l_thigh_deg=22.0, l_shin_deg=18.0, r_thigh_deg=-22.0, r_shin_deg=18.0,
                    r_hx=76.0, r_hy=-42.0, l_hx=-12.0, l_hy=-58.0,
                    bow_deg=14.0, bow_span=14.2, draw_pull=0.85,
                    l_elbow_cw=False, arrow_mode="charged", foot_y=99.0,
                )),
                (9, dict(
                    pelvis_dx=4.0, pelvis_dy=32.0, torso_deg=8.0, head_rel_deg=-4.0,
                    l_thigh_deg=24.0, l_shin_deg=22.0, r_thigh_deg=-24.0, r_shin_deg=20.0,
                    r_hx=72.0, r_hy=-46.0, l_hx=-32.0, l_hy=-62.0,
                    bow_deg=10.0, bow_span=14.2, draw_pull=0.0,
                    l_elbow_cw=False, arrow_mode="release_flash", foot_y=99.0,
                )),
                (16, dict(
                    # Graceful airborne hop (`foot_y = 95.0`) aiming `-36 deg` SKYWARD with 3-Arrow Seeker Fan!
                    pelvis_dx=-4.0, pelvis_dy=6.0, torso_deg=-6.0, head_rel_deg=-8.0,
                    l_thigh_deg=18.0, l_shin_deg=26.0, l_foot_deg=14.0,
                    r_thigh_deg=-14.0, r_shin_deg=22.0, r_foot_deg=12.0,
                    l_coat_rel_deg=-10.0, r_coat_rel_deg=8.0,
                    r_hx=68.0, r_hy=-112.0, l_hx=-14.0, l_hy=-54.0,
                    bow_deg=-36.0, bow_span=14.5, draw_pull=1.0,
                    l_elbow_cw=False, arrow_mode="fan3", foot_y=95.0,
                )),
                (20, dict(
                    # Skyward Starfall Seeker Volley Release!
                    pelvis_dx=-6.0, pelvis_dy=8.0, torso_deg=-8.0, head_rel_deg=-9.0,
                    l_thigh_deg=16.0, l_shin_deg=24.0, l_foot_deg=12.0,
                    r_thigh_deg=-12.0, r_shin_deg=20.0, r_foot_deg=10.0,
                    r_hx=66.0, r_hy=-116.0, l_hx=-38.0, l_hy=-48.0,
                    bow_deg=-38.0, bow_span=14.5, draw_pull=0.0,
                    l_elbow_cw=False, arrow_mode="release_flash", foot_y=95.5,
                )),
                (29, dict(
                    torso_deg=4.0, l_thigh_deg=5.0, r_thigh_deg=-5.0,
                    r_hx=66.0, r_hy=-22.0, l_hx=-28.0, l_hy=-16.0,
                    bow_deg=-16.0, draw_pull=0.1, arrow_mode="nocked", foot_y=99.0,
                )),
            ]
            cfgs.append(eval_archer_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0))

        elif row_idx == 4:
            # Row 4: ULTIMATE — `ARROW OF YGGDRASIL: SUPERNOVA PIERCE` / `ASTRAL HURRICANE`
            # Unfurls Luminous 6-Pinion Emerald-Gold Yggdrasil Light-Wings (`wings_mode="on"`),
            # ascends sovereignly (`foot_y = 94.0`), draws colossal Supernova Dragon-Arrow (`F05..F18`),
            # and unleashes the cataclysmic release (`F19..F22`)!
            kfs = [
                (0, dict(
                    pelvis_dy=8.0, torso_deg=3.0, l_thigh_deg=6.0, r_thigh_deg=-6.0,
                    r_hx=66.0, r_hy=-28.0, l_hx=-26.0, l_hy=-24.0,
                    bow_deg=-14.0, bow_span=14.5, draw_pull=0.15,
                    wings_mode="on", wing_scale=0.65, wing_flap=-8.0,
                    arrow_mode="nocked", foot_y=98.5,
                )),
                (5, dict(
                    pelvis_dx=-2.0, pelvis_dy=4.0, torso_deg=-2.0, head_rel_deg=-3.0,
                    l_thigh_deg=14.0, l_shin_deg=22.0, l_foot_deg=14.0,
                    r_thigh_deg=-12.0, r_shin_deg=18.0, r_foot_deg=12.0,
                    l_coat_rel_deg=-10.0, r_coat_rel_deg=8.0,
                    r_hx=76.0, r_hy=-72.0, l_hx=16.0, l_hy=-72.0,
                    bow_deg=-2.0, bow_span=15.2, draw_pull=0.55,
                    wings_mode="on", wing_scale=1.0, wing_flap=8.0,
                    l_elbow_cw=False, arrow_mode="charged", foot_y=94.5,
                )),
                (12, dict(
                    # Sovereign Levitating Full Yggdrasil Draw!
                    pelvis_dx=-4.0, pelvis_dy=2.0, torso_deg=-3.0, head_rel_deg=-2.0,
                    l_thigh_deg=16.0, l_shin_deg=24.0, l_foot_deg=16.0,
                    r_thigh_deg=-14.0, r_shin_deg=20.0, r_foot_deg=14.0,
                    l_coat_rel_deg=-12.0, r_coat_rel_deg=10.0,
                    r_hx=82.0, r_hy=-76.0, l_hx=-20.0, l_hy=-76.0,
                    bow_deg=-1.0, bow_span=15.5, draw_pull=1.0,
                    wings_mode="on", wing_scale=1.05, wing_flap=-6.0,
                    l_elbow_cw=False, arrow_mode="charged", foot_y=93.8,
                )),
                (17, dict(
                    # Peak Tension Hold before Supernova Release!
                    pelvis_dx=-6.0, pelvis_dy=2.0, torso_deg=-4.0, head_rel_deg=-1.5,
                    l_thigh_deg=16.0, l_shin_deg=24.0, l_foot_deg=16.0,
                    r_thigh_deg=-14.0, r_shin_deg=20.0, r_foot_deg=14.0,
                    r_hx=84.0, r_hy=-76.0, l_hx=-24.0, l_hy=-76.0,
                    bow_deg=0.0, bow_span=15.5, draw_pull=1.0,
                    wings_mode="on", wing_scale=1.08, wing_flap=10.0,
                    l_elbow_cw=False, arrow_mode="charged", foot_y=93.8,
                )),
                (20, dict(
                    # SUPERNOVA DRAGON-ARROW RELEASE & RECOIL!
                    pelvis_dx=-10.0, pelvis_dy=6.0, torso_deg=-7.0, head_rel_deg=2.0,
                    l_thigh_deg=18.0, l_shin_deg=22.0, r_thigh_deg=-16.0, r_shin_deg=18.0,
                    r_hx=80.0, r_hy=-82.0, l_hx=-46.0, l_hy=-86.0,
                    bow_deg=-4.0, bow_span=15.5, draw_pull=0.0,
                    wings_mode="on", wing_scale=1.10, wing_flap=16.0,
                    l_elbow_cw=False, arrow_mode="release_flash", foot_y=94.2,
                )),
                (29, dict(
                    pelvis_dy=6.0, torso_deg=3.0, l_thigh_deg=6.0, r_thigh_deg=-6.0,
                    r_hx=66.0, r_hy=-24.0, l_hx=-26.0, l_hy=-20.0,
                    bow_deg=-14.0, bow_span=14.5, draw_pull=0.1,
                    wings_mode="on", wing_scale=0.65, wing_flap=-6.0,
                    arrow_mode="nocked", foot_y=99.0,
                )),
            ]
            cfgs.append(eval_archer_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.5))

        elif row_idx == 5:
            # Row 5: DEATH & HURT
            # F00..F05 grounded hurt stagger -> F09..F14 wounded ranger kneel ->
            # F18..F29 flat supine rest on `y=99` with Celestial Greatbow resting horizontally on ground!
            kfs = [
                (0, dict(
                    use_dual_ik=False, pelvis_dx=0.0, pelvis_dy=4.0, torso_deg=-4.0, head_rel_deg=2.0,
                    l_thigh_deg=6.0, l_shin_deg=6.0, r_thigh_deg=-6.0, r_shin_deg=6.0,
                    l_sode_rel_deg=-10.0, l_fore_rel_deg=-14.0, r_sode_rel_deg=6.0, r_fore_rel_deg=-12.0,
                    bow_deg=-24.0, draw_pull=0.0, arrow_mode="none", quiver_on=True, foot_y=99.0,
                )),
                (5, dict(
                    use_dual_ik=False, pelvis_dx=-16.0, pelvis_dy=26.0, torso_deg=-18.0, head_rel_deg=11.0,
                    l_thigh_deg=18.0, l_shin_deg=14.0, r_thigh_deg=-14.0, r_shin_deg=12.0,
                    l_sode_rel_deg=-26.0, l_fore_rel_deg=-20.0, r_sode_rel_deg=22.0, r_fore_rel_deg=-14.0,
                    bow_deg=-44.0, draw_pull=0.0, arrow_mode="none", quiver_on=True, foot_y=99.0,
                )),
                (10, dict(
                    use_dual_ik=False, pelvis_dx=-14.0, pelvis_dy=94.0, torso_deg=8.0, head_rel_deg=14.0,
                    l_thigh_deg=-52.0, l_shin_deg=-36.0, l_foot_deg=-24.0,
                    r_thigh_deg=-28.0, r_shin_deg=-44.0, r_foot_deg=-28.0,
                    l_sode_rel_deg=14.0, l_fore_rel_deg=8.0, r_sode_rel_deg=-14.0, r_fore_rel_deg=-10.0,
                    right_arm_in_front=True, bow_deg=18.0, arrow_mode="none", quiver_on=True, foot_y=99.0,
                )),
                (15, dict(
                    use_dual_ik=False, pelvis_dx=-10.0, pelvis_dy=154.0, torso_deg=-18.0, head_rel_deg=16.0,
                    l_thigh_deg=-92.0, l_shin_deg=-90.0, l_foot_deg=-60.0,
                    r_thigh_deg=-42.0, r_shin_deg=-74.0, r_foot_deg=-54.0,
                    l_sode_rel_deg=16.0, l_fore_rel_deg=6.0, r_sode_rel_deg=-6.0, r_fore_rel_deg=-8.0,
                    right_arm_in_front=True, resting_weapon=True, quiver_on=False, foot_y=99.0,
                )),
                (21, dict(
                    use_dual_ik=False, pelvis_dx=-5.0, pelvis_dy=214.0, torso_deg=-80.0, head_rel_deg=12.0,
                    l_thigh_deg=-108.0, l_shin_deg=-116.0, l_foot_deg=-76.0,
                    r_thigh_deg=-52.0, r_shin_deg=-86.0, r_foot_deg=-68.0,
                    l_sode_rel_deg=-48.0, l_fore_rel_deg=-18.0, r_sode_rel_deg=-24.0, r_fore_rel_deg=-12.0,
                    right_arm_in_front=True, resting_weapon=True, quiver_on=False, foot_y=99.0,
                )),
                (29, dict(
                    use_dual_ik=False, pelvis_dx=-4.0, pelvis_dy=220.0, torso_deg=-85.0, head_rel_deg=10.0,
                    l_thigh_deg=-110.0, l_shin_deg=-118.0, l_foot_deg=-80.0,
                    r_thigh_deg=-54.0, r_shin_deg=-88.0, r_foot_deg=-72.0,
                    l_sode_rel_deg=-52.0, l_fore_rel_deg=-20.0, r_sode_rel_deg=-26.0, r_fore_rel_deg=-12.0,
                    right_arm_in_front=True, resting_weapon=True, quiver_on=False, foot_y=99.0,
                )),
            ]
            cfg = eval_archer_keyframes(f, kfs, ph, DEFAULTS, wave_mult=1.0)
            if f >= 15:
                cfg["quiver_on"] = False
            if f >= 17:
                cfg["resting_weapon"] = True
            cfgs.append(cfg)

        elif row_idx == 6:
            # Row 6: DASH — Agile Sylvan Gale-Stride & Vault-Slide (`torso_deg = +16 deg`)
            kfs = [
                (0, dict(
                    torso_deg=4.0, l_thigh_deg=5.0, r_thigh_deg=-5.0,
                    r_hx=64.0, r_hy=-18.0, l_hx=-30.0, l_hy=-10.0,
                    bow_deg=-18.0, draw_pull=0.0, arrow_mode="nocked", foot_y=99.0,
                )),
                (6, dict(
                    pelvis_dx=10.0, pelvis_dy=24.0, torso_deg=16.0, head_rel_deg=-10.0,
                    l_thigh_deg=28.0, l_shin_deg=28.0, l_foot_deg=18.0,
                    r_thigh_deg=-18.0, r_shin_deg=26.0, r_foot_deg=10.0,
                    l_coat_rel_deg=-20.0, r_coat_rel_deg=-14.0,
                    r_hx=78.0, r_hy=-36.0, l_hx=-46.0, l_hy=-6.0,
                    bow_deg=4.0, bow_span=14.0, draw_pull=0.0,
                    right_arm_in_front=True, arrow_mode="nocked", foot_y=96.5,
                )),
                (22, dict(
                    pelvis_dx=12.0, pelvis_dy=22.0, torso_deg=16.5, head_rel_deg=-10.5,
                    l_thigh_deg=30.0, l_shin_deg=30.0, l_foot_deg=20.0,
                    r_thigh_deg=-16.0, r_shin_deg=28.0, r_foot_deg=12.0,
                    l_coat_rel_deg=-22.0, r_coat_rel_deg=-16.0,
                    r_hx=80.0, r_hy=-34.0, l_hx=-48.0, l_hy=-4.0,
                    bow_deg=6.0, bow_span=14.0, draw_pull=0.0,
                    right_arm_in_front=True, arrow_mode="nocked", foot_y=96.5,
                )),
                (29, dict(
                    torso_deg=4.0, l_thigh_deg=5.0, r_thigh_deg=-5.0,
                    r_hx=64.0, r_hy=-18.0, l_hx=-30.0, l_hy=-10.0,
                    bow_deg=-18.0, draw_pull=0.0, arrow_mode="nocked", foot_y=99.0,
                )),
            ]
            cfg = eval_archer_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.5)
            if 6 <= f <= 11:
                u_d = (f - 6) / 5.0
                cfg["slash_arc"] = dict(
                    dx=14.0, dy=-4.0, r=19.0,
                    a0=-48.0 + u_d * 14.0, a1=36.0 + u_d * 14.0,
                    gold=True, intensity=0.85 - 0.25 * abs(u_d - 0.5),
                )
            cfgs.append(cfg)

        elif row_idx == 7:
            # Row 7: CROUCH — Low Knee-Braced Leaf-Veil Sniper Stance (`foot_y = 99.0`)
            kfs = [
                (0, dict(
                    torso_deg=4.0, l_thigh_deg=5.0, r_thigh_deg=-5.0,
                    r_hx=64.0, r_hy=-18.0, l_hx=-30.0, l_hy=-10.0,
                    bow_deg=-18.0, draw_pull=0.05, arrow_mode="nocked", foot_y=99.0,
                )),
                (5, dict(
                    pelvis_dx=-4.0, pelvis_dy=54.0, torso_deg=9.0, head_rel_deg=-6.0,
                    l_thigh_deg=28.0, l_shin_deg=30.0, r_thigh_deg=-28.0, r_shin_deg=28.0,
                    l_coat_rel_deg=8.0, r_coat_rel_deg=-6.0,
                    r_hx=76.0, r_hy=-64.0, l_hx=12.0, l_hy=-64.0,
                    bow_deg=-2.0, bow_span=13.5, draw_pull=0.55,
                    l_elbow_cw=False, arrow_mode="nocked", foot_y=99.0,
                )),
                (14, dict(
                    pelvis_dx=-6.0, pelvis_dy=56.0, torso_deg=8.0, head_rel_deg=-5.0,
                    l_thigh_deg=30.0, l_shin_deg=32.0, r_thigh_deg=-30.0, r_shin_deg=30.0,
                    r_hx=80.0, r_hy=-66.0, l_hx=-18.0, l_hy=-66.0,
                    bow_deg=-1.0, bow_span=13.5, draw_pull=1.0,
                    l_elbow_cw=False, arrow_mode="charged", foot_y=99.0,
                )),
                (18, dict(
                    # Low Sniper Release!
                    pelvis_dx=-10.0, pelvis_dy=54.0, torso_deg=4.0, head_rel_deg=-2.0,
                    l_thigh_deg=28.0, l_shin_deg=30.0, r_thigh_deg=-28.0, r_shin_deg=28.0,
                    r_hx=78.0, r_hy=-70.0, l_hx=-38.0, l_hy=-74.0,
                    bow_deg=-4.0, bow_span=13.5, draw_pull=0.0,
                    l_elbow_cw=False, arrow_mode="release_flash", foot_y=99.0,
                )),
                (29, dict(
                    torso_deg=4.0, l_thigh_deg=5.0, r_thigh_deg=-5.0,
                    r_hx=64.0, r_hy=-18.0, l_hx=-30.0, l_hy=-10.0,
                    bow_deg=-18.0, draw_pull=0.05, arrow_mode="nocked", foot_y=99.0,
                )),
            ]
            cfgs.append(eval_archer_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.0))

        elif row_idx == 8:
            # Row 8: JUMP — Unfurls 6-Pinion Emerald-Gold Yggdrasil Light-Wings (`wings_mode="on"`)!
            # Coil (`F00..F03`) -> Winged Zephyr Vault Ascent (`F04..F14`) ->
            # Apex Downward `+24 deg` Celestial Bow Shot (`F16..F20`) -> Grounded Landing (`F24..F29`)!
            kfs = [
                (0, dict(
                    pelvis_dy=8.0, torso_deg=4.0, l_thigh_deg=6.0, r_thigh_deg=-6.0,
                    r_hx=64.0, r_hy=-18.0, l_hx=-30.0, l_hy=-10.0,
                    bow_deg=-16.0, draw_pull=0.05, wings_mode="off",
                    arrow_mode="nocked", foot_y=99.0,
                )),
                (3, dict(
                    pelvis_dx=-4.0, pelvis_dy=42.0, torso_deg=12.0, head_rel_deg=-6.0,
                    l_thigh_deg=26.0, l_shin_deg=28.0, r_thigh_deg=-26.0, r_shin_deg=26.0,
                    r_hx=56.0, r_hy=-8.0, l_hx=-36.0, l_hy=4.0,
                    bow_deg=-10.0, draw_pull=0.1, wings_mode="on", wing_scale=0.65, wing_flap=-10.0,
                    arrow_mode="nocked", foot_y=99.0,
                )),
                (10, dict(
                    # High Winged Zephyr Ascent drawing downward!
                    pelvis_dx=4.0, pelvis_dy=8.0, torso_deg=10.0, head_rel_deg=4.0,
                    l_thigh_deg=22.0, l_shin_deg=36.0, l_foot_deg=18.0,
                    r_thigh_deg=-16.0, r_shin_deg=30.0, r_foot_deg=14.0,
                    l_coat_rel_deg=-14.0, r_coat_rel_deg=-8.0,
                    r_hx=74.0, r_hy=-42.0, l_hx=-10.0, l_hy=-80.0,
                    bow_deg=22.0, bow_span=14.2, draw_pull=0.75,
                    wings_mode="on", wing_scale=1.0, wing_flap=10.0,
                    l_elbow_cw=False, arrow_mode="nocked", foot_y=92.8,
                )),
                (16, dict(
                    # Apex Winged Hover + Full `+24 deg` Downward Starlight Shot!
                    pelvis_dx=6.0, pelvis_dy=10.0, torso_deg=12.0, head_rel_deg=6.0,
                    l_thigh_deg=24.0, l_shin_deg=32.0, l_foot_deg=16.0,
                    r_thigh_deg=-18.0, r_shin_deg=28.0, r_foot_deg=12.0,
                    r_hx=78.0, r_hy=-38.0, l_hx=-18.0, l_hy=-82.0,
                    bow_deg=24.0, bow_span=14.5, draw_pull=1.0,
                    wings_mode="on", wing_scale=1.05, wing_flap=-8.0,
                    l_elbow_cw=False, arrow_mode="charged", foot_y=93.2,
                )),
                (19, dict(
                    # Mid-Air Release Flash!
                    pelvis_dx=2.0, pelvis_dy=12.0, torso_deg=8.0, head_rel_deg=4.0,
                    l_thigh_deg=20.0, l_shin_deg=28.0, r_thigh_deg=-16.0, r_shin_deg=24.0,
                    r_hx=76.0, r_hy=-42.0, l_hx=-38.0, l_hy=-90.0,
                    bow_deg=20.0, bow_span=14.5, draw_pull=0.0,
                    wings_mode="on", wing_scale=1.02, wing_flap=14.0,
                    l_elbow_cw=False, arrow_mode="release_flash", foot_y=94.5,
                )),
                (24, dict(
                    pelvis_dx=4.0, pelvis_dy=40.0, torso_deg=10.0, head_rel_deg=-4.0,
                    l_thigh_deg=24.0, l_shin_deg=26.0, r_thigh_deg=-24.0, r_shin_deg=24.0,
                    r_hx=66.0, r_hy=-16.0, l_hx=-30.0, l_hy=-6.0,
                    bow_deg=-14.0, draw_pull=0.05, wings_mode="on", wing_scale=0.65, wing_flap=-6.0,
                    arrow_mode="nocked", foot_y=99.0,
                )),
                (29, dict(
                    pelvis_dy=8.0, torso_deg=4.0, l_thigh_deg=6.0, r_thigh_deg=-6.0,
                    r_hx=64.0, r_hy=-18.0, l_hx=-30.0, l_hy=-10.0,
                    bow_deg=-16.0, draw_pull=0.05, wings_mode="off",
                    arrow_mode="nocked", foot_y=99.0,
                )),
            ]
            cfgs.append(eval_archer_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0))

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
        (0, 0, "R0 SYLVAN IDLE"),
        (1, 4, "R1 RANGER STRIDE"),
        (2, 4, "R2 BOW-BLADE SLASH"),
        (2, 17, "R2 FULL GREATBOW DRAW"),
        (3, 16, "R3 SEEKER FAN VOLLEY"),
        (4, 17, "R4 YGGDRASIL WINGS"),
        (5, 25, "R5 RESTING GREATBOW"),
        (8, 16, "R8 WINGED ZEPHYR SHOT"),
    ]
    build_and_save_30fps_sheet(
        "archer", parts, build_row_configs, render_frame,
        OUT_SHEET_PATH, None, ARTIFACT_DIR,
        shimmer_cols=(C_STAR_MID, C_GOLD_SPEC), showcase_picks=picks,
    )
    verify_output_sheet(OUT_SHEET_PATH)


if __name__ == "__main__":
    main()
