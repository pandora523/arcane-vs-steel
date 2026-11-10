#!/usr/bin/env python3
"""
Builds VEX-09 v2 (`android` — Cybernetic Valkyrie Blade-Unit & Autonomous Fin-Funnel Skirmisher)
30fps HD-2D Sprite Sheet (`assets/sprites/android_sheet.png`, 6240x1872, 9 rows x 30 cols of 208x208)
from `assets/sprites/android_v2_base.jpg` + `hd2d_rig_core.py`.

Pipeline Highlights:
- Preserves existing quantized `assets/sprites/android_portrait.png` (NEVER overwrites portrait).
- Surgical BFS exterior + enclosed white-pocket removal on `android_v2_base.jpg` (preserving 100% of
  VEX-09's pearl-white hair, pauldron, chest plates, bracers, thigh plates, and boot armor) + 3-pass
  anti-aliased white-fringe strip + multi-zone `MedianFilter` cel-flattening + neon conduit preservation.
- 13-part Cybernetic Valkyrie hierarchical skeletal rig (`mane`, `head`, `torso`, `l_sode`, `l_forearm`,
  `r_sode`, `r_forearm`, `l_thigh`, `l_shin`, `l_foot`, `r_thigh`, `r_shin`, `r_foot`) with 0 unassigned
  foreground pixels and Dual-Arm 2-Bone Analytical Inverse Kinematics (`solve_arm_ik`).
- Curated 20-color obsidian-carbon / pearl-white / porcelain / neon-cyan / hot-magenta `MASTER_PALETTE`
  + 2-pass cardinal orphan despeckle + interior pinhole sealing + crisp 1px `#090b16` Selout outline.
- Back Attachment: 4 Detached Floating Fin-Funnel Bit-Drones in Cyber-Valkyrie wing formation behind her
  shoulders (`wing`, `aim`, `swept`, `flare`, `guard`, `rail_dock`, `fallen`) with cyan/magenta thruster cores.
- Articulated Weapon: Muramasa-09 High-Frequency Cyan-Magenta Plasma Odachi across rapid slashes,
  supersonic thruster dashes, Quad-Funnel Rail-Cannon docking (`Row 4`), and horizontal floor rest on
  `Row 5 DEATH F18..F29`.
- Grounded thruster-boots planted firmly at `y_104 = 99`, `0/270` border clips, `29/29` distinct transitions.
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
BASE_IMG_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "android_v2_base.jpg")
OUT_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "android_sheet.png")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"

# Curated 20-Color Obsidian-Carbon / Pearl-White / Neon-Cyan / Hot-Magenta Master Palette
MASTER_PALETTE = np.array([
    [9, 11, 22],       # 0: Deep Obsidian Selout (#090b16)
    [20, 24, 42],      # 1: Carbon Abyss Shadow / Lit Selout (#14182a)
    [35, 42, 68],      # 2: Obsidian Synth-Suit Dark (#232a44)
    [58, 68, 102],     # 3: Carbon-Steel Midtone (#3a4466)
    [88, 102, 140],    # 4: Gunmetal Rim / Cool Armor Shadow (#58668c)
    [132, 146, 178],   # 5: Cool Pearl-Slate Shadow (#8492b2)
    [178, 190, 216],   # 6: Pearl-Titanium Midtone (#b2bed8)
    [220, 228, 244],   # 7: Lit Pearl-White Plate & Silver Hair (#dce4f4)
    [248, 251, 255],   # 8: Pure Specular Pearl-White & Plasma Core (#f8fbff)
    [158, 112, 98],    # 9: Warm Synth-Skin Shadow / Lip Line (#9e7062)
    [208, 166, 146],   # 10: Porcelain Lower-Face Midtone (#d0a692)
    [242, 210, 192],   # 11: Lit Porcelain Cheek Highlight (#f2d2c0)
    [0, 88, 148],      # 12: Deep Cyber-Cyan Shadow (#005894)
    [0, 158, 224],     # 13: Electric Cyan Conduit Mid (#009ee0)
    [0, 228, 255],     # 14: Neon Visor & Odachi Edge Cyan (#00e4ff)
    [138, 248, 255],   # 15: Ice-Cyan Plasma Glow (#8af8ff)
    [96, 16, 76],      # 16: Deep Reactor Magenta Shadow (#60104c)
    [172, 24, 124],    # 17: Crimson-Magenta Conduit Mid (#ac187c)
    [255, 46, 147],    # 18: Hot Neon Magenta Plasma (#ff2e93)
    [255, 146, 216],   # 19: Luminous Pink-Magenta Core (#ff92d8)
], dtype=np.int32)

# Pre-bound RGBA colors (100% strictly in MASTER_PALETTE)
C_OUT = (9, 11, 22, 255)
C_CARB_DARK = (20, 24, 42, 255)
C_CARB_BASE = (35, 42, 68, 255)
C_CARB_MID = (58, 68, 102, 255)
C_CARB_LIT = (88, 102, 140, 255)
C_PEARL_SHAD = (132, 146, 178, 255)
C_PEARL_MID = (178, 190, 216, 255)
C_PEARL_LIT = (220, 228, 244, 255)
C_WHITE = (248, 251, 255, 255)
C_CYAN_DARK = (0, 88, 148, 255)
C_CYAN_MID = (0, 158, 224, 255)
C_CYAN = (0, 228, 255, 255)
C_CYAN_ICE = (138, 248, 255, 255)
C_MAG_DARK = (96, 16, 76, 255)
C_MAG_MID = (172, 24, 124, 255)
C_MAG = (255, 46, 147, 255)
C_MAG_PINK = (255, 146, 216, 255)

# Skeletal pivots in 512x512 rig space (0.5x of 1024x1024 android_v2_base.jpg)
PIVOTS = dict(
    pelvis=(262.0, 248.0),
    neck=(258.0, 121.0),
    mane=(234.0, 89.0),
    l_sh=(218.0, 138.0), l_elb=(188.0, 196.0), l_hand=(178.0, 258.0),
    r_sh=(288.0, 141.0), r_elb=(302.0, 199.0), r_hand=(340.0, 245.0),
    l_hip=(234.0, 256.0), l_knee=(206.0, 339.0), l_ank=(163.0, 446.0),
    r_hip=(283.0, 257.0), r_knee=(321.0, 333.0), r_ank=(331.0, 436.0),
)

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
    protect_indices=(8, 10, 11, 13, 14, 15, 17, 18, 19),
    hair_indices=(5, 6, 7, 8),
    lit_selout=1,
    shad_selout=0,
    hair_selout=4,
    joint_fill=(20, 24, 42, 255),
    joint_inner=(35, 42, 68, 255),
    hip_r=17,
    thigh_r=14,
    arm_r=11,
    pinhole_fill=(35, 42, 68, 255),
)


def put_px_safe(arr, x, y, col):
    """Strictly clamps drawn pixels inside x in [4..99], y in [4..99] (zero 2px-margin border clips)."""
    ix, iy = int(round(x)), int(round(y))
    if 4 <= ix <= 99 and 4 <= iy <= 99:
        arr[iy, ix] = col


def draw_line_safe(arr, x0, y0, x1, y1, col, thickness=1):
    steps = int(max(abs(x1 - x0), abs(y1 - y0)) * 2.5) + 1
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


def fill_layer_pinholes(arr104, max_hole_px=18):
    """Seals enclosed interior pinholes <= max_hole_px and 3-neighbor seam slits using palette colors."""
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


def count_interior_pinholes_104(arr104, max_hole_px=18):
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


def save_debug_parts(arr512, masks, parts):
    """Saves 13-part segmentation verification map -> `debug_android_v2_parts.png`."""
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    cw, ch = 176, 176
    pad = 12
    cols_p, rows_p = 5, 3
    grid_w = cols_p * (cw + pad) + pad
    grid_h = rows_p * (ch + pad + 20) + pad
    map_w = 390
    im_dbg = Image.new("RGBA", (map_w + grid_w, max(530, grid_h)), (16, 20, 34, 255))
    d = ImageDraw.Draw(im_dbg)

    seg_vis = np.zeros((512, 512, 4), dtype=np.uint8)
    part_cols = [
        (255, 220, 90), (0, 228, 255), (140, 90, 245), (255, 130, 60),
        (255, 70, 120), (60, 220, 180), (40, 175, 255),
        (130, 235, 95), (70, 190, 80), (235, 230, 95),
        (255, 155, 195), (225, 95, 165), (255, 205, 120),
    ]
    for (nm, m), col in zip(masks, part_cols):
        seg_vis[m, :3] = (arr512[m, :3].astype(int) * 0.56 + np.array(col) * 0.44).astype(np.uint8)
        seg_vis[m, 3] = 255
    seg_crop = Image.fromarray(seg_vis, "RGBA").crop((125, 25, 405, 506))
    im_dbg.alpha_composite(seg_crop, (36, 28))
    d.text((28, 8), "VEX-09 v2 13-PART RIG (0 UNASSIGNED PX)", fill=(0, 228, 255, 255))

    for idx, (nm, _) in enumerate(masks):
        c = idx % cols_p
        r = idx // cols_p
        ox = map_w + pad + c * (cw + pad)
        oy = pad + 20 + r * (ch + pad + 20)
        d.rectangle([ox, oy, ox + cw, oy + ch], fill=(28, 34, 56, 255), outline=(88, 102, 140, 255), width=1)
        pim, _, _ = parts[nm]
        pw, ph = pim.size
        d.text((ox + 3, oy - 15), f"{nm} ({pw}x{ph})", fill=(255, 146, 216, 255))
        sc = min(1.85, (cw - 14) / max(1, pw), (ch - 14) / max(1, ph))
        pim_z = pim.resize((max(1, int(pw * sc)), max(1, int(ph * sc))), Image.Resampling.NEAREST)
        im_dbg.alpha_composite(pim_z, (ox + (cw - pim_z.size[0]) // 2, oy + (ch - pim_z.size[1]) // 2))

    out_p = os.path.join(ARTIFACT_DIR, "debug_android_v2_parts.png")
    im_dbg.save(out_p)
    print(f"[android] Saved 13-part segmentation map -> {out_p}")


def load_and_segment_512():
    """
    Loads `assets/sprites/android_v2_base.jpg` (1024x1024 on #FFFFFF):
    1. Targeted BFS floodfill from exterior corners + enclosed background white pockets (preserving
       100% of VEX-09's pearl-white hair, pauldron, chest plates, bracers, thigh plates, & boots).
    2. 3-pass anti-aliased white-fringe stripping.
    3. 2x NEAREST downsample to 512x512 + MedianFilter(3) on head/visor + MedianFilter(5) on armor/body
       + crisp neon-cyan & hot-magenta conduit preservation.
    4. Clean 13-part Cybernetic Valkyrie segmentation with 0 unassigned foreground pixels.
    """
    base_raw = Image.open(BASE_IMG_PATH).convert("RGBA")
    im = base_raw.copy()

    # Targeted BFS seeds for exterior + enclosed white gaps (arm-torso gap & cable loops)
    bg_seeds = (
        (0, 0), (1023, 0), (0, 1023), (1023, 1023),
        (417, 452), (367, 363), (355, 390), (433, 473), (383, 658), (595, 455),
    )
    for sx, sy in bg_seeds:
        px = im.getpixel((sx, sy))
        if px[3] > 0 and px[0] > 220 and px[1] > 220 and px[2] > 220:
            ImageDraw.floodfill(im, (sx, sy), (0, 0, 0, 0), thresh=38)

    arr = np.array(im)

    # 3-Pass Anti-Aliased White-Fringe Stripping on neutral light-gray/white outer edge pixels
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
        wf = edge & (r > 182) & (g > 182) & (b > 182) & (np.abs(r - g) < 24) & (np.abs(g - b) < 24)
        arr[wf] = [0, 0, 0, 0]

    im512 = Image.fromarray(arr, "RGBA").resize((512, 512), Image.Resampling.NEAREST)
    raw512 = np.array(im512)
    rgb512 = im512.convert("RGB")
    rgb_med3 = np.array(rgb512.filter(ImageFilter.MedianFilter(size=3)))
    rgb_med5 = np.array(rgb512.filter(ImageFilter.MedianFilter(size=5)))
    arr512 = raw512.copy()
    H, W = 512, 512

    # Trim thin joint-bridging cable loops (hip-to-thigh & thigh-to-shin) and outstretched fingertips
    # so limb rotations & gauntlet weapon grips remain 100% artifact-free
    trim_hip_cable = poly_mask(H, W, P([(396, 430), (434, 430), (424, 488), (396, 496)]))
    trim_knee_cable = poly_mask(H, W, P([(356, 594), (388, 594), (386, 692), (356, 692)]))
    trim_l_fingers = poly_mask(H, W, P([(314, 544), (396, 544), (396, 590), (314, 590)]))
    trim_r_fingers = poly_mask(H, W, P([(700, 496), (742, 496), (742, 546), (674, 546), (674, 520)]))
    arr512[trim_hip_cable | trim_knee_cable | trim_l_fingers | trim_r_fingers] = [0, 0, 0, 0]

    alpha = keep_largest_component(arr512[:, :, 3] > 0)
    arr512[~alpha] = [0, 0, 0, 0]

    # Multi-zone cel-flattening: 3x3 on head/visor/crest (y < 126), 5x5 on armor/greaves (y >= 126)
    yy = np.arange(512)[:, None]
    cel_rgb = np.where(yy[:, :, None] < 126, rgb_med3, rgb_med5)
    arr512[:, :, :3] = np.where(alpha[:, :, None], cel_rgb, 0)

    # Restore crisp neon-cyan & hot-magenta armor conduits from raw512 so MedianFilter(5) never dulls them
    rr = raw512[:, :, 0].astype(np.int16)
    rg = raw512[:, :, 1].astype(np.int16)
    rb = raw512[:, :, 2].astype(np.int16)
    cyan_conduit = alpha & (rg > 155) & (rb > 175) & ((rg - rr) > 55)
    cyan_hot = cyan_conduit & (rg > 215) & (rb > 225)
    mag_conduit = alpha & (rr > 155) & (rb > 110) & ((rr - rg) > 65)
    mag_hot = mag_conduit & (rr > 215) & ((rr - rg) > 95)

    arr512[cyan_conduit] = [0, 158, 224, 255]
    arr512[cyan_hot] = [0, 228, 255, 255]
    arr512[mag_conduit] = [172, 24, 124, 255]
    arr512[mag_hot] = [255, 46, 147, 255]

    a = alpha

    # 1. Head: mecha-headset ear-pod & twin crests, pearl-white front hair, neon-cyan visor, porcelain face
    m_head = poly_mask(H, W, P([
        (416, 65), (602, 65), (602, 246), (552, 248),
        (486, 244), (476, 202), (456, 184), (444, 144), (416, 96),
    ])) & a

    # 2. Mane: swept rear silver-white Valkyrie bob hair behind ear-pod
    m_mane = poly_mask(H, W, P([
        (398, 122), (464, 132), (486, 204), (488, 244), (398, 244),
    ])) & a & (~m_head)

    # 3. Left (near/viewer-left) shoulder pauldron & upper bicep
    m_l_sode = poly_mask(H, W, P([
        (330, 238), (474, 238), (480, 286), (456, 344),
        (412, 396), (330, 392),
    ])) & a & (~m_head) & (~m_mane)

    # 4. Left forearm bracer & cyber-gauntlet
    m_l_forearm = poly_mask(H, W, P([
        (310, 386), (414, 392), (398, 495), (396, 550), (310, 550),
    ])) & a & (~m_l_sode) & (~m_head)

    # 5. Right (far/viewer-right) shoulder & upper bicep
    m_r_sode = poly_mask(H, W, P([
        (562, 248), (622, 248), (628, 395), (582, 405), (568, 340),
    ])) & a & (~m_head)

    # 6. Right forearm bracer & cyber-gauntlet
    m_r_forearm = poly_mask(H, W, P([
        (582, 388), (646, 384), (742, 484), (742, 548),
        (642, 548), (585, 434),
    ])) & a & (~m_r_sode) & (~m_head)

    # 7. Torso: pearl-white chest armor, cyan V-core, obsidian synth-abs, waist conduits & pelvis
    m_torso = poly_mask(H, W, P([
        (436, 232), (596, 232), (598, 446), (582, 548),
        (544, 566), (502, 566), (476, 514), (442, 444), (442, 336),
    ])) & a & (~m_head) & (~m_mane) & (~m_l_sode) & (~m_l_forearm) & (~m_r_sode) & (~m_r_forearm)

    # 8-10. Left (near) leg: thigh, thruster-greave shin, cyber-boot
    m_l_foot = poly_mask(H, W, P([
        (274, 882), (370, 882), (370, 998), (274, 998),
    ])) & a

    m_l_shin = poly_mask(H, W, P([
        (290, 652), (448, 652), (438, 756), (372, 888), (290, 888),
    ])) & a & (~m_l_foot)

    m_l_thigh = poly_mask(H, W, P([
        (382, 446), (520, 446), (512, 606), (456, 686), (382, 686),
    ])) & a & (~m_torso) & (~m_l_shin) & (~m_l_foot) & (~m_l_forearm)

    # 11-13. Right (far/front) leg: thigh, thruster-greave shin, cyber-boot
    m_r_foot = poly_mask(H, W, P([
        (612, 862), (770, 862), (770, 966), (612, 966),
    ])) & a

    m_r_shin = poly_mask(H, W, P([
        (555, 642), (694, 642), (694, 868), (585, 868), (555, 790),
    ])) & a & (~m_r_foot)

    m_r_thigh = poly_mask(H, W, P([
        (515, 455), (666, 455), (666, 668), (565, 668), (515, 585),
    ])) & a & (~m_torso) & (~m_r_shin) & (~m_r_foot) & (~m_r_forearm)

    raw_list = [
        ("mane", m_mane), ("head", m_head), ("torso", m_torso),
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
    save_debug_parts(arr512, masks, parts)
    return parts


# =============================================================================
# DUAL-ARM ANALYTICAL 2-BONE INVERSE KINEMATICS (512x512 RIG SPACE)
# =============================================================================

def solve_arm_ik(sh_w, target_w, L1, L2, a1_rest, a2_rest, torso_deg, elbow_cw=None):
    dx = target_w[0] - sh_w[0]
    dy = target_w[1] - sh_w[1]
    dist = math.hypot(dx, dy)
    max_reach = (L1 + L2) * 0.975
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


def apply_dual_cyber_ik(cfg):
    if not cfg.get("use_dual_ik", True):
        return cfg

    torso_deg = cfg.get("torso_deg", 0.0)
    pel = PIVOTS["pelvis"]
    l_sh_w = rot_pt(PIVOTS["l_sh"], pel, torso_deg)
    r_sh_w = rot_pt(PIVOTS["r_sh"], pel, torso_deg)

    l_target = (pel[0] + cfg.get("l_hx", 42.0), pel[1] + cfg.get("l_hy", -16.0))
    r_target = (pel[0] + cfg.get("r_hx", 62.0), pel[1] + cfg.get("r_hy", -10.0))

    l_sode_rel, l_fore_rel = solve_arm_ik(
        l_sh_w, l_target, _L1, _L2, _AL1, _AL2, torso_deg,
        elbow_cw=cfg.get("l_elbow_cw", True),
    )
    r_sode_rel, r_fore_rel = solve_arm_ik(
        r_sh_w, r_target, _R1, _R2, _AR1, _AR2, torso_deg,
        elbow_cw=cfg.get("r_elbow_cw", True),
    )

    cfg["l_sode_rel_deg"] = l_sode_rel
    cfg["l_fore_rel_deg"] = l_fore_rel
    cfg["r_sode_rel_deg"] = r_sode_rel
    cfg["r_fore_rel_deg"] = r_fore_rel
    return cfg


VEX_NUMERIC_KEYS = tuple(BASE_NUMERIC_KEYS) + (
    "l_hx", "l_hy", "r_hx", "r_hy",
    "odachi_deg", "odachi_len", "odachi_glow",
    "funnel_bob", "funnel_spread", "thruster_power",
    "slash_start", "slash_end", "slash_rx", "slash_ry", "slash_int",
)


def eval_vex_keyframes(f, keyframes, ph, defaults, wave_mult=2.0):
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
    for k in VEX_NUMERIC_KEYS:
        if k in defaults or k in d0 or k in d1:
            v0 = d0.get(k, defaults.get(k, 0.0))
            v1 = d1.get(k, defaults.get(k, 0.0))
            out[k] = v0 + (v1 - v0) * u

    active_d = d0 if raw_u < 0.5 else d1
    meta_keys = (
        "use_dual_ik", "right_arm_in_front", "right_leg_behind",
        "funnel_mode", "grip_hand", "resting_odachi", "rail_beam",
        "hex_guard", "death_sparks", "l_elbow_cw", "r_elbow_cw",
    )
    for mk in meta_keys:
        if mk in active_d:
            out[mk] = active_d[mk]

    out["mane_wave_phase"] = ph * wave_mult
    out["frame_col"] = f
    out["phase_u"] = ph / (2.0 * math.pi)
    return apply_dual_cyber_ik(out)


# =============================================================================
# 4 DETACHED FLOATING FIN-FUNNEL BIT-DRONES & MURAMASA-09 PLASMA ODACHI (104x104)
# =============================================================================

def safe_fit_weapon(hx, hy, ux, uy, back_ext, front_ext, margin=5.5):
    lo = margin
    hi = 103.0 - margin
    hx = max(lo + 4.0, min(hi - 4.0, hx))
    hy = max(lo + 4.0, min(hi - 4.0, hy))

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

    return hx, hy, max(4.5, max_b), max(12.0, max_f)


def draw_single_fin_funnel_104(arr, cx, cy, ang_deg, length=10.5, is_magenta=False, thruster=0.35, firing=False):
    """
    Renders one sleek Detached Floating Fin-Funnel Bit-Drone (`length` px):
    - Pearl-white twin V-fin outer casing with 1px `#090b16` Selout
    - Obsidian-carbon inner rail channel
    - Glowing Neon-Cyan (`#00e4ff`) or Hot-Magenta (`#ff2e93`) reactor thruster core + Mach plume!
    """
    rad = math.radians(ang_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    cx = max(9.0, min(94.0, cx))
    cy = max(9.0, min(95.0, cy))
    half_l = length * 0.5

    # 1. Thruster exhaust plume behind base (-half_l) when thrusting
    if thruster > 0.08:
        plume_len = min(8.5, 2.5 + 6.0 * thruster)
        p_steps = int(plume_len * 2.2) + 2
        for i in range(1, p_steps + 1):
            pu = i / float(p_steps)
            px = cx - ux * (half_l + 0.8 + pu * plume_len)
            py = cy - uy * (half_l + 0.8 + pu * plume_len)
            if 5.5 <= px <= 97.5 and 5.5 <= py <= 97.5:
                col = C_WHITE if pu < 0.28 else ((C_MAG if is_magenta else C_CYAN) if pu < 0.68 else C_CYAN_MID)
                put_px_safe(arr, px, py, col)
                if pu < 0.45 and thruster > 0.55:
                    put_px_safe(arr, px + nx * 0.8, py + ny * 0.8, C_MAG_MID if is_magenta else C_CYAN_DARK)
                    put_px_safe(arr, px - nx * 0.8, py - ny * 0.8, C_MAG_MID if is_magenta else C_CYAN_DARK)

    # 2. Sculpted Fin-Funnel Pod Body (-half_l .. +half_l)
    steps = int(length * 2.6) + 2
    for i in range(steps + 1):
        u = i / float(max(1, steps))
        da = -half_l + u * length
        hw = 2.15 if u < 0.55 else max(0.85, 2.15 * (1.0 - (u - 0.55) / 0.45 * 0.62))
        n_samp = max(3, int(round(hw * 2.6)) + 1)
        for dp in np.linspace(-hw, hw, n_samp):
            px = cx + ux * da + nx * dp
            py = cy + uy * da + ny * dp
            adp = abs(dp)
            if adp >= hw - 0.55 or u <= 0.06 or u >= 0.94:
                col = C_OUT
            elif adp <= 0.52 and 0.18 <= u <= 0.82:
                # Central rail conduit
                if u < 0.40:
                    col = C_MAG if is_magenta else C_CYAN
                elif firing and u > 0.65:
                    col = C_WHITE
                else:
                    col = C_CARB_BASE
            elif dp < 0:
                col = C_WHITE if u < 0.5 else C_PEARL_LIT
            else:
                col = C_PEARL_MID if u < 0.6 else C_PEARL_SHAD
            put_px_safe(arr, px, py, col)

    # 3. Glowing Reactor Thruster Core at rear & Sensor Emitter at tip
    rx, ry = cx - ux * (half_l * 0.55), cy - uy * (half_l * 0.55)
    put_px_safe(arr, rx, ry, C_WHITE if thruster > 0.6 else (C_MAG_PINK if is_magenta else C_CYAN_ICE))
    tx, ty = cx + ux * (half_l * 0.78), cy + uy * (half_l * 0.78)
    put_px_safe(arr, tx, ty, C_CYAN if not is_magenta else C_MAG)

    if firing:
        for d_f in (1.4, 2.6, 3.8):
            fx = cx + ux * (half_l + d_f)
            fy = cy + uy * (half_l + d_f)
            put_px_safe(arr, fx, fy, C_WHITE if d_f < 2.0 else C_CYAN)


def draw_fin_funnel_formation_104(arr, joints104, cfg, layer="back"):
    """
    Draws VEX-09's 4 Detached Floating Fin-Funnel Bit-Drones in `back` or `front` pass:
    - `wing`: Sleek 4-pod Cyber-Valkyrie wing fan levitating behind her shoulders (with clear air gap!).
    - `aim`: 4 pods rotated forward over/beside her shoulders aiming forward with active emitters.
    - `swept`: Supersonic delta-thruster sweep behind her back firing shock-diamond plumes.
    - `flare`: Wide X-wing ascension flare (`Row 4 F00..F07`).
    - `guard`: Defensive hex-barrier fan around her crouch stance (`Row 7`).
    - `rail_dock`: Docked symmetrically above & below Muramasa-09 Odachi (`Row 4 F08..F23`, drawn in `front`!).
    - `fallen`: 2 powered-down bit-drones resting on floor (`Row 5 F18..F29`).
    """
    mode = cfg.get("funnel_mode", "wing")
    if mode == "rail_dock" and layer == "back":
        return
    if mode != "rail_dock" and layer == "front":
        return

    nk = joints104["neck"]
    pel = joints104["pelvis"]
    torso_deg = cfg.get("torso_deg", 0.0)
    bob = cfg.get("funnel_bob", 0.0)
    spread = cfg.get("funnel_spread", 0.0)
    thruster = cfg.get("thruster_power", 0.30)
    ph = cfg.get("phase_u", 0.0) * math.pi * 2.0

    # Base shoulder-back anchor (levitating detached behind torso!)
    bx = nk[0] - 8.5
    by = nk[1] + 5.5

    if mode == "wing":
        pods = [
            (bx - 5.5 - spread * 2.0, by - 6.5 + math.sin(ph) * 1.1 + bob, -142.0 + torso_deg * 0.5 - spread * 8.0, 10.8, False),
            (bx - 8.5 - spread * 2.5, by - 0.5 + math.cos(ph) * 1.1 + bob, -164.0 + torso_deg * 0.5 - spread * 6.0, 10.2, True),
            (bx - 7.5 - spread * 2.0, by + 6.0 - math.sin(ph) * 1.0 + bob, 168.0 + torso_deg * 0.5 + spread * 6.0, 9.8, False),
            (bx - 4.5 - spread * 1.5, by + 11.5 - math.cos(ph) * 1.0 + bob, 146.0 + torso_deg * 0.5 + spread * 8.0, 9.2, True),
        ]
        for px, py, ang, ln, is_m in pods:
            draw_single_fin_funnel_104(arr, px, py, ang, length=ln, is_magenta=is_m, thruster=thruster, firing=False)

    elif mode == "aim":
        pods = [
            (nk[0] - 5.0, nk[1] - 7.5 + bob, -8.0, 10.5, False),
            (nk[0] + 4.5, nk[1] - 9.5 - bob, -4.0, 10.0, True),
            (nk[0] - 8.5, nk[1] + 3.5 - bob, 4.0, 9.8, True),
            (nk[0] - 6.5, nk[1] + 11.0 + bob, 10.0, 9.4, False),
        ]
        for px, py, ang, ln, is_m in pods:
            draw_single_fin_funnel_104(arr, px, py, ang, length=ln, is_magenta=is_m, thruster=0.55, firing=True)

    elif mode == "swept":
        pods = [
            (bx - 5.0, by - 5.5 + bob, -18.0 + torso_deg * 0.4, 11.0, False),
            (bx - 8.0, by - 0.5 - bob, -12.0 + torso_deg * 0.4, 10.4, True),
            (bx - 7.5, by + 5.0 + bob, -6.0 + torso_deg * 0.4, 10.0, False),
            (bx - 4.5, by + 10.0 - bob, 2.0 + torso_deg * 0.4, 9.4, True),
        ]
        for px, py, ang, ln, is_m in pods:
            draw_single_fin_funnel_104(arr, px, py, ang, length=ln, is_magenta=is_m, thruster=max(0.85, thruster), firing=False)

    elif mode == "flare":
        pods = [
            (nk[0] - 9.5, nk[1] - 8.5 + bob, -132.0, 11.2, False),
            (nk[0] + 8.5, nk[1] - 8.5 - bob, -48.0, 11.2, True),
            (nk[0] - 11.0, nk[1] + 5.5 - bob, 148.0, 10.2, True),
            (nk[0] + 9.5, nk[1] + 5.5 + bob, 32.0, 10.2, False),
        ]
        for px, py, ang, ln, is_m in pods:
            draw_single_fin_funnel_104(arr, px, py, ang, length=ln, is_magenta=is_m, thruster=0.90, firing=True)

    elif mode == "guard":
        pods = [
            (nk[0] - 6.0, nk[1] - 5.5 + bob, -28.0, 10.2, False),
            (nk[0] + 7.5, nk[1] - 4.0 - bob, 25.0, 10.0, True),
            (nk[0] - 8.0, nk[1] + 6.5 - bob, 160.0, 9.6, True),
            (nk[0] + 9.0, nk[1] + 8.5 + bob, 55.0, 9.6, False),
        ]
        for px, py, ang, ln, is_m in pods:
            draw_single_fin_funnel_104(arr, px, py, ang, length=ln, is_magenta=is_m, thruster=0.50, firing=False)

    elif mode == "rail_dock":
        # Dock all 4 Fin-Funnels symmetrically above & below Muramasa-09 Odachi to form a Quad Rail-Cannon!
        grip = joints104["r_hand"]
        odeg = cfg.get("odachi_deg", -4.0)
        rad = math.radians(odeg)
        ux, uy = math.cos(rad), math.sin(rad)
        nx, ny = -uy, ux
        spread_dock = 4.6 + math.sin(ph * 3.0) * 0.5
        dock_pods = [
            (grip[0] + ux * 9.5 - nx * spread_dock, grip[1] + uy * 9.5 - ny * spread_dock, odeg, 10.4, False),
            (grip[0] + ux * 9.5 + nx * spread_dock, grip[1] + uy * 9.5 + ny * spread_dock, odeg, 10.4, True),
            (grip[0] + ux * 18.5 - nx * (spread_dock - 0.8), grip[1] + uy * 18.5 - ny * (spread_dock - 0.8), odeg, 9.4, True),
            (grip[0] + ux * 18.5 + nx * (spread_dock - 0.8), grip[1] + uy * 18.5 + ny * (spread_dock - 0.8), odeg, 9.4, False),
        ]
        for px, py, ang, ln, is_m in dock_pods:
            draw_single_fin_funnel_104(arr, px, py, ang, length=ln, is_magenta=is_m, thruster=0.95, firing=True)
        # Convergent plasma accelerator rings around muzzle!
        if cfg.get("rail_beam", False):
            mx = min(93.0, grip[0] + ux * 24.5)
            my = max(10.0, min(92.0, grip[1] + uy * 24.5))
            for a_i in range(12):
                a_r = ph * 4.0 + a_i * (math.pi / 6.0)
                rx_p = mx + ux * math.cos(a_r) * 1.8 + nx * math.sin(a_r) * 5.2
                ry_p = my + uy * math.cos(a_r) * 1.8 + ny * math.sin(a_r) * 5.2
                put_px_safe(arr, rx_p, ry_p, C_WHITE if a_i % 3 == 0 else (C_CYAN if a_i % 2 == 0 else C_MAG))

    elif mode == "fallen":
        # 2 powered-down bit-drones resting horizontally on the floor beside collapsed VEX-09
        draw_single_fin_funnel_104(arr, pel[0] - 14.0, 96.5, 176.0, length=9.2, is_magenta=False, thruster=0.0, firing=False)
        draw_single_fin_funnel_104(arr, pel[0] - 4.0, 97.0, 4.0, length=8.8, is_magenta=True, thruster=0.0, firing=False)


def draw_cyber_saya_104(arr, pel_x, pel_y, torso_deg):
    """Sleek obsidian-carbon & magenta-node HF-Odachi scabbard (`Saya`) mounted at left hip."""
    rad = math.radians(156.0 + torso_deg * 0.55)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux
    x0, y0 = pel_x - 2.0, pel_y + 1.5
    s_len = 19.0
    for i in range(int(s_len * 2.4) + 1):
        u = i / float(int(s_len * 2.4))
        da = u * s_len
        for dp in (-1.3, -0.4, 0.4, 1.3):
            px = x0 + ux * da + nx * dp
            py = y0 + uy * da + ny * dp
            if px < 5.5 or px > 98.0 or py < 5.5 or py > 97.5:
                continue
            if abs(dp) > 1.0:
                col = C_OUT
            elif 0.22 <= u <= 0.30:
                col = C_MAG if dp < 0 else C_CYAN
            else:
                col = C_CARB_LIT if dp < 0 else C_CARB_BASE
            put_px_safe(arr, px, py, col)


def draw_gauntlet_clasp_104(arr, hx, hy, ux, uy, nx, ny):
    """Crisp obsidian & pearl-white cybernetic gauntlet fist clasp over the Odachi hilt."""
    for u_off in (-0.9, 0.0, 0.9):
        for n_off in (-1.5, -0.5, 0.5, 1.5):
            px = hx + ux * u_off + nx * n_off
            py = hy + uy * u_off + ny * n_off
            if abs(n_off) > 1.25:
                col = C_OUT
            elif u_off < -0.4 and n_off < 0:
                col = C_CYAN
            elif n_off < 0:
                col = C_PEARL_MID
            else:
                col = C_CARB_BASE
            put_px_safe(arr, px, py, col)


def draw_muramasa_odachi_104(arr, hx, hy, deg, blade_len=30.0, glow=1.0, show_gauntlet=True):
    """
    Renders VEX-09's Articulated Weapon — MURAMASA-09 HIGH-FREQUENCY CYAN-MAGENTA PLASMA ODACHI:
    - Long two-handed obsidian/pearl `tsuka` hilt with magenta diamond accents & cyan pommel
    - Sleek angular Valkyrie `tsuba` crossguard with blazing hot-magenta reactor node
    - Long curved samurai `sori` Odachi blade: 1px obsidian spine backing + hot-magenta HF spine
      + pure-white plasma core + luminous neon-cyan cutting edge tapering to a razor `kissaki` tip!
    """
    rad = math.radians(deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    hx, hy, max_back, max_front = safe_fit_weapon(
        hx, hy, ux, uy, back_ext=8.5, front_ext=blade_len + 2.5, margin=5.5
    )
    eff_back = min(8.0, max_back)
    eff_blade = max(14.0, min(blade_len, max_front - 2.2))

    # 1. Two-handed Tsuka Hilt (-eff_back .. +1.4)
    for da in np.linspace(-eff_back, 1.4, 20):
        for dp in (-1.35, -0.45, 0.45, 1.35):
            px = hx + ux * da + nx * dp
            py = hy + uy * da + ny * dp
            if abs(dp) >= 1.1:
                col = C_OUT
            elif da < -eff_back + 1.3:
                col = C_CYAN if abs(dp) < 0.6 else C_PEARL_LIT
            elif int(abs(da * 1.5)) % 2 == 0 and abs(dp) < 0.7:
                col = C_MAG_MID if glow < 0.5 else C_MAG
            else:
                col = C_CARB_LIT if dp < 0 else C_CARB_DARK
            put_px_safe(arr, px, py, col)

    # 2. Angular Cyber-Tsuba Guard at +1.8
    for dp in np.linspace(-3.1, 3.1, 13):
        for da in (1.3, 2.0, 2.6):
            px = hx + ux * da + nx * dp
            py = hy + uy * da + ny * dp
            if abs(dp) > 2.6 or da > 2.4:
                col = C_OUT
            elif abs(dp) < 0.9:
                col = C_MAG if glow >= 0.4 else C_MAG_DARK
            else:
                col = C_PEARL_LIT if dp < 0 else C_PEARL_SHAD
            put_px_safe(arr, px, py, col)

    # 3. Curved High-Frequency Cyan-Magenta Plasma Odachi Blade (+2.8 .. +2.8 + eff_blade)
    steps = int(eff_blade * 2.8) + 2
    for i in range(steps + 1):
        u = i / float(max(1, steps))
        da = 2.8 + u * eff_blade
        # Classic graceful Odachi sori curvature peaking near 60% blade length
        sori = -math.sin(u * math.pi * 0.92) * 1.55
        taper = 1.0 if u < 0.78 else max(0.28, 1.0 - (u - 0.78) / 0.22 * 0.72)
        bx = hx + ux * da + nx * sori
        by = hy + uy * da + ny * sori

        # Spine Selout (-1.65) -> Hot-Magenta HF Spine (-0.85) -> Pure White Core (0.0) -> Neon-Cyan Edge (+0.85)
        put_px_safe(arr, bx - nx * 1.55 * taper, by - ny * 1.55 * taper, C_OUT)
        put_px_safe(
            arr,
            bx - nx * 0.80 * taper,
            by - ny * 0.80 * taper,
            C_MAG if glow >= 0.45 else C_MAG_MID,
        )
        put_px_safe(
            arr,
            bx,
            by,
            C_WHITE if glow >= 0.55 else C_CYAN_ICE,
        )
        put_px_safe(
            arr,
            bx + nx * 0.85 * taper,
            by + ny * 0.85 * taper,
            C_CYAN if glow >= 0.35 else C_CYAN_MID,
        )

    if show_gauntlet:
        draw_gauntlet_clasp_104(arr, hx, hy, ux, uy, nx, ny)


def draw_odachi_slash_arc_104(arr, cx, cy, start_deg, end_deg, rx, ry, intensity=1.0):
    """Crisp stepped cel-shaded Cyan-White-Magenta HF plasma slash smear inside [5..98]."""
    if intensity <= 0.05:
        return
    steps = 64
    a0 = math.radians(start_deg)
    a1 = math.radians(end_deg)
    for i in range(steps + 1):
        u = i / float(steps)
        ang = a0 + (a1 - a0) * u
        w = math.sin(u * math.pi) * 4.2 * intensity
        if w < 0.45:
            continue
        c, s = math.cos(ang), math.sin(ang)
        bx = cx + c * rx
        by = cy + s * ry
        for r_off in np.linspace(-w * 0.65, w * 0.55, max(3, int(w * 2.5) + 1)):
            px = bx + c * r_off
            py = by + s * r_off
            if 5.5 <= px <= 98.0 and 5.5 <= py <= 98.0:
                if r_off > w * 0.16:
                    col = C_WHITE
                elif r_off > -w * 0.16:
                    col = C_CYAN
                else:
                    col = C_MAG if (i % 3 != 0) else C_CYAN_MID
                put_px_safe(arr, px, py, col)


def draw_hex_guard_arc_104(arr, cx, cy, phase=0.0):
    """Draws a crisp pixel-art Hexagonal Aegis Shield Arc in front of crouching VEX-09 (`Row 7`)."""
    pts = [
        (cx + 12.0, cy - 18.0),
        (cx + 21.0, cy - 7.0),
        (cx + 22.0, cy + 8.0),
        (cx + 13.0, cy + 19.0),
    ]
    for i in range(len(pts) - 1):
        p0, p1 = pts[i], pts[i + 1]
        draw_line_safe(arr, p0[0], p0[1], p1[0], p1[1], C_CYAN if (i + int(phase * 6)) % 2 == 0 else C_MAG, 1)
        put_px_safe(arr, p0[0], p0[1], C_WHITE)
    put_px_safe(arr, pts[-1][0], pts[-1][1], C_WHITE)


def extra_extent_vex(joints_c, cfg, scale):
    """Reserves canvas room for Fin-Funnels behind shoulders & Muramasa-09 Odachi reach so nothing clips."""
    pts = []
    nk = joints_c["neck"]
    pts.append((nk[0] - 21.0 / scale, nk[1] - 15.0 / scale))
    pts.append((nk[0] - 21.0 / scale, nk[1] + 18.0 / scale))

    if not cfg.get("resting_odachi", False):
        grip_key = cfg.get("grip_hand", "l_hand")
        gh = joints_c[grip_key]
        rad = math.radians(cfg.get("odachi_deg", -28.0))
        blen = cfg.get("odachi_len", 29.0) + 3.5
        pts.append((gh[0] + math.cos(rad) * (blen / scale), gh[1] + math.sin(rad) * (blen / scale)))
        pts.append((gh[0] - math.cos(rad) * (9.0 / scale), gh[1] - math.sin(rad) * (9.0 / scale)))
    return pts


def draw_back_vex(bg104, joints104, cfg):
    if not cfg.get("resting_odachi", False):
        draw_cyber_saya_104(bg104, joints104["pelvis"][0], joints104["pelvis"][1], cfg.get("torso_deg", 0.0))
    draw_fin_funnel_formation_104(bg104, joints104, cfg, layer="back")


def draw_front_vex(out104, joints104, cfg):
    # 1. Muramasa-09 Plasma Odachi (articulated in grip hand OR resting flat horizontally on floor on Row 5 F18..F29)
    if cfg.get("resting_odachi", False):
        pel = joints104["pelvis"]
        rx = max(22.0, min(68.0, pel[0] + 6.0))
        ry = 97.2
        draw_muramasa_odachi_104(
            out104, rx, ry, deg=1.5, blade_len=27.0,
            glow=cfg.get("odachi_glow", 0.25), show_gauntlet=False,
        )
    else:
        grip_key = cfg.get("grip_hand", "l_hand")
        gh = joints104[grip_key]
        draw_muramasa_odachi_104(
            out104, gh[0], gh[1],
            deg=cfg.get("odachi_deg", -28.0),
            blade_len=cfg.get("odachi_len", 29.0),
            glow=cfg.get("odachi_glow", 1.0),
            show_gauntlet=True,
        )

    # 2. Front-layer Quad-Funnel Rail-Cannon Docking (`Row 4 F08..F23`)
    draw_fin_funnel_formation_104(out104, joints104, cfg, layer="front")

    # 3. Active HF Plasma Slash Crescent (`Row 2`, `Row 3`, `Row 7`, `Row 8`)
    s_int = cfg.get("slash_int", 0.0)
    if s_int > 0.05:
        nk = joints104["neck"]
        pel = joints104["pelvis"]
        cx = 0.5 * (nk[0] + pel[0]) + 8.5
        cy = 0.5 * (nk[1] + pel[1]) + 1.5
        draw_odachi_slash_arc_104(
            out104, cx, cy,
            start_deg=cfg.get("slash_start", -75.0),
            end_deg=cfg.get("slash_end", 55.0),
            rx=cfg.get("slash_rx", 26.0),
            ry=cfg.get("slash_ry", 22.0),
            intensity=s_int,
        )

    # 4. Crouch Hex-Matrix Shield Arc (`Row 7 F01..F13`)
    if cfg.get("hex_guard", False):
        nk = joints104["neck"]
        pel = joints104["pelvis"]
        draw_hex_guard_arc_104(out104, 0.5 * (nk[0] + pel[0]), 0.5 * (nk[1] + pel[1]), phase=cfg.get("phase_u", 0.0))

    # 5. Death / Damage System Overload Sparks (`Row 5`)
    if cfg.get("death_sparks", False):
        col_f = int(cfg.get("frame_col", 0))
        pel = joints104["pelvis"]
        n_sp = 3 if col_f <= 14 else 1
        for i in range(n_sp):
            ang = col_f * 0.9 + i * 2.1
            sx = pel[0] + math.cos(ang) * (5.0 + (col_f % 3))
            sy = min(96.5, pel[1] - 6.0 + math.sin(ang) * 4.5)
            put_px_safe(out104, sx, sy, C_CYAN if (col_f + i) % 2 == 0 else C_MAG)
            put_px_safe(out104, sx + 1.0, sy - 1.0, C_WHITE)


def render_frame_vex(parts, cfg):
    arr104 = render_rig_104(
        parts=parts,
        pivots=PIVOTS,
        cfg=cfg,
        palette_cfg=PALETTE_CFG,
        y_bot_base=496.0,
        default_S=556,
        extra_extent_fn=extra_extent_vex,
        draw_back_fn=draw_back_vex,
        draw_front_fn=draw_front_vex,
    )
    arr104 = fill_layer_pinholes(arr104, max_hole_px=18)
    arr104[:3, :, :] = 0
    arr104[101:, :, :] = 0
    arr104[:, :3, :] = 0
    arr104[:, 101:, :] = 0
    return arr104


# =============================================================================
# 9-ROW x 30-FRAME 30FPS CHOREOGRAPHY BUILDER
# =============================================================================

DEFAULTS = dict(
    pelvis_dx=0.0, pelvis_dy=0.0,
    torso_deg=2.0, head_rel_deg=0.0, mane_rel_deg=0.0, mane_wave_amp=2.2,
    l_thigh_deg=0.0, l_shin_deg=0.0, l_foot_deg=0.0,
    r_thigh_deg=0.0, r_shin_deg=0.0, r_foot_deg=0.0,
    l_hx=34.0, l_hy=-6.0, r_hx=56.0, r_hy=-12.0,
    odachi_deg=-32.0, odachi_len=29.5, odachi_glow=1.0,
    funnel_bob=0.0, funnel_spread=0.0, thruster_power=0.32,
    slash_start=-75.0, slash_end=55.0, slash_rx=26.0, slash_ry=22.0, slash_int=0.0,
    foot_y=99.0,
    use_dual_ik=True,
    right_arm_in_front=False,
    right_leg_behind=False,
    funnel_mode="wing",
    grip_hand="l_hand",
    resting_odachi=False,
    rail_beam=False,
    hex_guard=False,
    death_sparks=False,
    l_elbow_cw=True,
    r_elbow_cw=True,
)


def build_row_configs(row):
    cfgs = []
    for f in range(COLS):
        ph = (f / float(COLS)) * 2.0 * math.pi
        u = f / 29.0

        if row == 0:
            # R0 IDLE: Poised Cyber-Valkyrie stance + 4 hovering Fin-Funnel Bit-Drones + Odachi guard
            s = math.sin(ph)
            c = dict(DEFAULTS)
            c.update(
                pelvis_dy=3.5 * s,
                torso_deg=2.5 + 1.8 * s,
                head_rel_deg=-1.2 * s,
                l_thigh_deg=-1.8 * s, l_shin_deg=2.2 * max(0.0, s),
                r_thigh_deg=1.6 * s, r_shin_deg=2.0 * max(0.0, -s),
                l_hx=36.0 + 3.5 * s, l_hy=-4.0 + 2.8 * s,
                r_hx=52.0 - 2.5 * s, r_hy=-14.0 + 2.0 * math.cos(ph),
                odachi_deg=-34.0 + 4.5 * s,
                odachi_len=29.5,
                funnel_bob=1.4 * math.sin(ph + 0.7),
                funnel_spread=0.25 + 0.20 * math.sin(ph),
                thruster_power=0.35 + 0.15 * math.sin(ph * 2.0),
                funnel_mode="wing",
                grip_hand="l_hand",
                foot_y=99.0,
                mane_wave_phase=ph * 2.0,
                frame_col=f,
                phase_u=f / 30.0,
            )
            cfgs.append(apply_dual_cyber_ik(c))

        elif row == 1:
            # R1 WALK: 2-step Valkyrie tactical combat stride (full leg crossover + trailing HF Odachi)
            s = math.sin(ph)
            c2 = math.cos(ph)
            c = dict(DEFAULTS)
            c.update(
                pelvis_dx=4.0 * c2,
                pelvis_dy=-4.5 * abs(s) + 3.0,
                torso_deg=7.5 + 2.2 * math.cos(ph * 2.0),
                head_rel_deg=-3.5,
                mane_wave_amp=3.2,
                l_thigh_deg=24.0 * s,
                l_shin_deg=6.0 + 20.0 * max(0.0, -s),
                l_foot_deg=8.0 * s,
                r_thigh_deg=-24.0 * s,
                r_shin_deg=6.0 + 20.0 * max(0.0, s),
                r_foot_deg=-8.0 * s,
                right_leg_behind=(s > 0.0),
                l_hx=26.0 - 16.0 * s, l_hy=8.0 + 4.0 * abs(s),
                r_hx=48.0 + 18.0 * s, r_hy=-6.0 + 3.5 * abs(s),
                odachi_deg=148.0 + 10.0 * s,
                odachi_len=28.5,
                funnel_bob=1.2 * math.cos(ph * 2.0),
                funnel_spread=0.35,
                thruster_power=0.48,
                funnel_mode="wing",
                grip_hand="l_hand",
                foot_y=99.0,
                mane_wave_phase=ph * 2.0,
                frame_col=f,
                phase_u=f / 30.0,
            )
            cfgs.append(apply_dual_cyber_ik(c))

        elif row == 2:
            # R2 AUTO: High-Frequency Odachi Lunge Slash + Fin-Funnel Aim Sync + Backhand Follow-Through
            kfs = [
                (0, dict(
                    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=2.5,
                    l_hx=36.0, l_hy=-4.0, r_hx=52.0, r_hy=-14.0,
                    odachi_deg=-34.0, funnel_mode="wing", slash_int=0.0, foot_y=99.0,
                )),
                (6, dict(
                    pelvis_dx=-14.0, pelvis_dy=6.0, torso_deg=-12.0, head_rel_deg=10.0,
                    l_thigh_deg=-14.0, l_shin_deg=16.0, r_thigh_deg=12.0, r_shin_deg=10.0,
                    l_hx=-8.0, l_hy=-62.0, r_hx=14.0, r_hy=-58.0,
                    l_elbow_cw=False, r_elbow_cw=False,
                    odachi_deg=-128.0, funnel_mode="aim", thruster_power=0.65, slash_int=0.0, foot_y=99.0,
                )),
                (11, dict(
                    pelvis_dx=22.0, pelvis_dy=12.0, torso_deg=22.0, head_rel_deg=-12.0,
                    l_thigh_deg=22.0, l_shin_deg=10.0, r_thigh_deg=-26.0, r_shin_deg=26.0,
                    l_hx=68.0, l_hy=-14.0, r_hx=60.0, r_hy=-8.0,
                    odachi_deg=-8.0, funnel_mode="aim", thruster_power=0.85,
                    slash_start=-85.0, slash_end=48.0, slash_rx=28.0, slash_ry=23.0, slash_int=1.0, foot_y=99.0,
                )),
                (16, dict(
                    pelvis_dx=26.0, pelvis_dy=14.0, torso_deg=25.0, head_rel_deg=-14.0,
                    l_thigh_deg=24.0, l_shin_deg=12.0, r_thigh_deg=-28.0, r_shin_deg=28.0,
                    l_hx=64.0, l_hy=16.0, r_hx=42.0, r_hy=6.0,
                    odachi_deg=28.0, funnel_mode="aim", thruster_power=0.75,
                    slash_start=-25.0, slash_end=72.0, slash_rx=27.0, slash_ry=21.0, slash_int=0.65, foot_y=99.0,
                )),
                (22, dict(
                    pelvis_dx=12.0, pelvis_dy=6.0, torso_deg=10.0, head_rel_deg=-4.0,
                    l_thigh_deg=12.0, l_shin_deg=8.0, r_thigh_deg=-14.0, r_shin_deg=14.0,
                    l_hx=56.0, l_hy=-36.0, r_hx=34.0, r_hy=-24.0,
                    odachi_deg=-48.0, funnel_mode="wing", thruster_power=0.50,
                    slash_start=-70.0, slash_end=25.0, slash_rx=25.0, slash_ry=20.0, slash_int=0.45, foot_y=99.0,
                )),
                (29, dict(
                    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=2.5,
                    l_hx=36.0, l_hy=-4.0, r_hx=52.0, r_hy=-14.0,
                    odachi_deg=-34.0, funnel_mode="wing", slash_int=0.0, foot_y=99.0,
                )),
            ]
            cfgs.append(eval_vex_keyframes(f, kfs, ph, DEFAULTS))

        elif row == 3:
            # R3 SKILL: EMP OVERLOAD BLITZ (Visor Lock -> Supersonic Wing-Thruster X-Blitz -> EMP Tether Cast)
            kfs = [
                (0, dict(
                    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=2.5,
                    l_hx=36.0, l_hy=-4.0, r_hx=52.0, r_hy=-14.0,
                    odachi_deg=-34.0, funnel_mode="wing", foot_y=99.0,
                )),
                (6, dict(
                    pelvis_dx=-12.0, pelvis_dy=8.0, torso_deg=-10.0, head_rel_deg=8.0,
                    l_thigh_deg=-16.0, l_shin_deg=22.0, r_thigh_deg=10.0, r_shin_deg=14.0,
                    # Right hand touches cyan visor for EMP target lock; left hand coils Odachi behind hip
                    l_hx=-16.0, l_hy=4.0, r_hx=16.0, r_hy=-68.0, r_elbow_cw=False, right_arm_in_front=True,
                    odachi_deg=-148.0, funnel_mode="aim", thruster_power=0.60, foot_y=99.0,
                )),
                (13, dict(
                    pelvis_dx=28.0, pelvis_dy=14.0, torso_deg=26.0, head_rel_deg=-14.0,
                    l_thigh_deg=28.0, l_shin_deg=14.0, r_thigh_deg=-30.0, r_shin_deg=30.0,
                    l_hx=72.0, l_hy=-8.0, r_hx=62.0, r_hy=-16.0,
                    odachi_deg=-4.0, funnel_mode="swept", thruster_power=1.0,
                    slash_start=-68.0, slash_end=64.0, slash_rx=29.0, slash_ry=20.0, slash_int=1.0, foot_y=99.0,
                )),
                (19, dict(
                    pelvis_dx=22.0, pelvis_dy=10.0, torso_deg=18.0, head_rel_deg=-8.0,
                    l_thigh_deg=20.0, l_shin_deg=10.0, r_thigh_deg=-22.0, r_shin_deg=22.0,
                    l_hx=52.0, l_hy=12.0, r_hx=70.0, r_hy=-24.0, right_arm_in_front=True,
                    odachi_deg=24.0, funnel_mode="aim", thruster_power=0.80,
                    slash_start=-45.0, slash_end=50.0, slash_rx=26.0, slash_ry=18.0, slash_int=0.55, foot_y=99.0,
                )),
                (29, dict(
                    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=2.5,
                    l_hx=36.0, l_hy=-4.0, r_hx=52.0, r_hy=-14.0,
                    odachi_deg=-34.0, funnel_mode="wing", slash_int=0.0, foot_y=99.0,
                )),
            ]
            cfgs.append(eval_vex_keyframes(f, kfs, ph, DEFAULTS))

        elif row == 4:
            # R4 ULTIMATE: Hover Ascension -> Quad-Funnel Rail-Cannon Docking on Muramasa-09 -> Descent
            kfs = [
                (0, dict(
                    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=2.0,
                    l_hx=36.0, l_hy=-4.0, r_hx=52.0, r_hy=-14.0,
                    odachi_deg=-34.0, funnel_mode="wing", foot_y=99.0,
                )),
                (7, dict(
                    pelvis_dx=-4.0, pelvis_dy=-10.0, torso_deg=-8.0, head_rel_deg=8.0,
                    l_thigh_deg=10.0, l_shin_deg=24.0, r_thigh_deg=-8.0, r_shin_deg=28.0,
                    l_hx=24.0, l_hy=-38.0, r_hx=42.0, r_hy=-42.0,
                    odachi_deg=-68.0, funnel_mode="flare", thruster_power=0.95, foot_y=91.0,
                )),
                (11, dict(
                    pelvis_dx=6.0, pelvis_dy=-14.0, torso_deg=12.0, head_rel_deg=-6.0,
                    l_thigh_deg=16.0, l_shin_deg=26.0, r_thigh_deg=-10.0, r_shin_deg=30.0,
                    l_hx=58.0, l_hy=-24.0, r_hx=66.0, r_hy=-26.0, right_arm_in_front=True,
                    grip_hand="r_hand", odachi_deg=-4.0, odachi_len=27.5,
                    funnel_mode="rail_dock", rail_beam=True, thruster_power=1.0, foot_y=89.0,
                )),
                (17, dict(
                    pelvis_dx=4.0, pelvis_dy=-15.0, torso_deg=14.0, head_rel_deg=-8.0,
                    l_thigh_deg=18.0, l_shin_deg=28.0, r_thigh_deg=-12.0, r_shin_deg=32.0,
                    l_hx=60.0, l_hy=-26.0, r_hx=68.0, r_hy=-28.0, right_arm_in_front=True,
                    grip_hand="r_hand", odachi_deg=-2.0, odachi_len=27.5,
                    funnel_mode="rail_dock", rail_beam=True, thruster_power=1.0, foot_y=88.0,
                )),
                (23, dict(
                    pelvis_dx=5.0, pelvis_dy=-12.0, torso_deg=11.0, head_rel_deg=-5.0,
                    l_thigh_deg=14.0, l_shin_deg=24.0, r_thigh_deg=-8.0, r_shin_deg=26.0,
                    l_hx=56.0, l_hy=-22.0, r_hx=64.0, r_hy=-24.0, right_arm_in_front=True,
                    grip_hand="r_hand", odachi_deg=-5.0, odachi_len=27.5,
                    funnel_mode="rail_dock", rail_beam=True, thruster_power=0.90, foot_y=91.0,
                )),
                (29, dict(
                    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=2.5,
                    l_hx=36.0, l_hy=-4.0, r_hx=52.0, r_hy=-14.0,
                    grip_hand="l_hand", odachi_deg=-34.0, funnel_mode="wing", rail_beam=False, foot_y=99.0,
                )),
            ]
            cfgs.append(eval_vex_keyframes(f, kfs, ph, DEFAULTS))

        elif row == 5:
            # R5 DEATH: Hurt Stagger (F00..F05) -> Servo Knee-Drop (F09..F14) -> Prone Collapse + Horizontal Odachi (F18..F29)
            kfs = [
                (0, dict(
                    pelvis_dx=0.0, pelvis_dy=4.0, torso_deg=-4.0, head_rel_deg=4.0,
                    l_thigh_deg=-4.0, l_shin_deg=8.0, r_thigh_deg=6.0, r_shin_deg=6.0,
                    l_hx=28.0, l_hy=-10.0, r_hx=46.0, r_hy=-18.0,
                    odachi_deg=-42.0, odachi_glow=0.90, funnel_mode="wing", death_sparks=True, foot_y=99.0,
                )),
                (5, dict(
                    pelvis_dx=-16.0, pelvis_dy=26.0, torso_deg=-18.0, head_rel_deg=12.0,
                    l_thigh_deg=-14.0, l_shin_deg=20.0, r_thigh_deg=16.0, r_shin_deg=16.0,
                    l_hx=10.0, l_hy=-22.0, r_hx=38.0, r_hy=-28.0,
                    odachi_deg=-68.0, odachi_glow=0.75, funnel_mode="wing", thruster_power=0.15,
                    death_sparks=True, foot_y=99.0,
                )),
                (10, dict(
                    pelvis_dx=-16.0, pelvis_dy=96.0, torso_deg=14.0, head_rel_deg=16.0,
                    l_thigh_deg=-12.0, l_shin_deg=68.0, l_foot_deg=58.0,
                    r_thigh_deg=-34.0, r_shin_deg=78.0, r_foot_deg=66.0,
                    use_dual_ik=False,
                    l_sode_rel_deg=-14.0, l_fore_rel_deg=-22.0,
                    r_sode_rel_deg=-54.0, r_fore_rel_deg=-16.0, right_arm_in_front=True,
                    odachi_deg=36.0, odachi_glow=0.55, funnel_mode="wing", thruster_power=0.05,
                    death_sparks=True, foot_y=99.0,
                )),
                (15, dict(
                    pelvis_dx=-14.0, pelvis_dy=148.0, torso_deg=38.0, head_rel_deg=10.0,
                    l_thigh_deg=18.0, l_shin_deg=72.0, l_foot_deg=68.0,
                    r_thigh_deg=-46.0, r_shin_deg=82.0, r_foot_deg=72.0,
                    use_dual_ik=False,
                    l_sode_rel_deg=-4.0, l_fore_rel_deg=-14.0,
                    r_sode_rel_deg=-92.0, r_fore_rel_deg=-12.0, right_arm_in_front=True,
                    odachi_deg=12.0, odachi_glow=0.40, funnel_mode="fallen",
                    death_sparks=True, foot_y=99.0,
                )),
                (18, dict(
                    pelvis_dx=-12.0, pelvis_dy=186.0, torso_deg=62.0, head_rel_deg=-4.0,
                    l_thigh_deg=48.0, l_shin_deg=74.0, l_foot_deg=76.0,
                    r_thigh_deg=-58.0, r_shin_deg=84.0, r_foot_deg=78.0,
                    use_dual_ik=False,
                    l_sode_rel_deg=4.0, l_fore_rel_deg=-8.0,
                    r_sode_rel_deg=-128.0, r_fore_rel_deg=-10.0, right_arm_in_front=True,
                    resting_odachi=True, odachi_glow=0.32, funnel_mode="fallen",
                    mane_wave_amp=0.8, death_sparks=True, foot_y=99.0,
                )),
                (23, dict(
                    pelvis_dx=-10.0, pelvis_dy=216.0, torso_deg=83.0, head_rel_deg=-18.0,
                    l_thigh_deg=74.0, l_shin_deg=76.0, l_foot_deg=82.0,
                    r_thigh_deg=-68.0, r_shin_deg=86.0, r_foot_deg=82.0,
                    use_dual_ik=False,
                    l_sode_rel_deg=6.0, l_fore_rel_deg=-6.0,
                    r_sode_rel_deg=-156.0, r_fore_rel_deg=-8.0, right_arm_in_front=True,
                    resting_odachi=True, odachi_glow=0.22, funnel_mode="fallen",
                    mane_wave_amp=0.3, death_sparks=True, foot_y=99.0,
                )),
                (29, dict(
                    pelvis_dx=-10.0, pelvis_dy=220.0, torso_deg=84.5, head_rel_deg=-20.0,
                    l_thigh_deg=75.0, l_shin_deg=76.0, l_foot_deg=82.0,
                    r_thigh_deg=-68.0, r_shin_deg=86.0, r_foot_deg=82.0,
                    use_dual_ik=False,
                    l_sode_rel_deg=6.0, l_fore_rel_deg=-6.0,
                    r_sode_rel_deg=-160.0, r_fore_rel_deg=-6.0, right_arm_in_front=True,
                    resting_odachi=True, odachi_glow=0.16, funnel_mode="fallen",
                    mane_wave_amp=0.1, death_sparks=True, foot_y=99.0,
                )),
            ]
            cfgs.append(eval_vex_keyframes(f, kfs, ph, DEFAULTS))

        elif row == 6:
            # R6 DASH: Supersonic Valkyrie Wing-Thruster Phase-Rush (articulated forward lean, zero canvas shear!)
            kfs = [
                (0, dict(
                    pelvis_dx=0.0, pelvis_dy=2.0, torso_deg=6.0,
                    l_thigh_deg=-8.0, l_shin_deg=16.0, r_thigh_deg=-12.0, r_shin_deg=18.0,
                    l_hx=22.0, l_hy=8.0, r_hx=48.0, r_hy=-10.0,
                    odachi_deg=142.0, odachi_len=28.5, funnel_mode="wing", thruster_power=0.45, foot_y=99.0,
                )),
                (4, dict(
                    pelvis_dx=14.0, pelvis_dy=-4.0, torso_deg=24.0, head_rel_deg=-12.0, mane_wave_amp=4.0,
                    l_thigh_deg=24.0, l_shin_deg=18.0, r_thigh_deg=-22.0, r_shin_deg=26.0,
                    l_hx=-18.0, l_hy=10.0, r_hx=60.0, r_hy=-8.0,
                    odachi_deg=158.0, odachi_len=28.5, funnel_mode="swept", thruster_power=0.95, foot_y=95.0,
                )),
                (14, dict(
                    pelvis_dx=20.0, pelvis_dy=-7.0, torso_deg=29.0, head_rel_deg=-15.0, mane_wave_amp=4.5,
                    l_thigh_deg=32.0, l_shin_deg=22.0, r_thigh_deg=-26.0, r_shin_deg=30.0,
                    l_hx=-26.0, l_hy=12.0, r_hx=66.0, r_hy=-8.0,
                    odachi_deg=165.0, odachi_len=28.5, funnel_mode="swept", thruster_power=1.0, foot_y=93.0,
                )),
                (24, dict(
                    pelvis_dx=14.0, pelvis_dy=-4.0, torso_deg=22.0, head_rel_deg=-10.0, mane_wave_amp=3.8,
                    l_thigh_deg=22.0, l_shin_deg=18.0, r_thigh_deg=-20.0, r_shin_deg=24.0,
                    l_hx=-16.0, l_hy=10.0, r_hx=58.0, r_hy=-10.0,
                    odachi_deg=156.0, odachi_len=28.5, funnel_mode="swept", thruster_power=0.88, foot_y=95.0,
                )),
                (29, dict(
                    pelvis_dx=0.0, pelvis_dy=2.0, torso_deg=6.0,
                    l_thigh_deg=-6.0, l_shin_deg=12.0, r_thigh_deg=-10.0, r_shin_deg=14.0,
                    l_hx=24.0, l_hy=6.0, r_hx=50.0, r_hy=-12.0,
                    odachi_deg=144.0, odachi_len=28.5, funnel_mode="wing", thruster_power=0.40, foot_y=99.0,
                )),
            ]
            cfgs.append(eval_vex_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0))

        elif row == 7:
            # R7 CROUCH: Aegis Hex-Matrix Guard (F00..F13) + Low Sweeping Plasma Counter-Slash (F14..F29)
            kfs = [
                (0, dict(
                    pelvis_dx=0.0, pelvis_dy=18.0, torso_deg=8.0,
                    l_thigh_deg=-26.0, l_shin_deg=46.0, r_thigh_deg=-32.0, r_shin_deg=50.0,
                    l_hx=46.0, l_hy=-22.0, r_hx=52.0, r_hy=-26.0,
                    odachi_deg=-68.0, funnel_mode="guard", hex_guard=True, foot_y=99.0,
                )),
                (7, dict(
                    pelvis_dx=-2.0, pelvis_dy=24.0, torso_deg=10.0, head_rel_deg=-4.0,
                    l_thigh_deg=-30.0, l_shin_deg=52.0, r_thigh_deg=-36.0, r_shin_deg=56.0,
                    l_hx=50.0, l_hy=-26.0, r_hx=56.0, r_hy=-30.0,
                    odachi_deg=-74.0, funnel_mode="guard", hex_guard=True, foot_y=99.0,
                )),
                (13, dict(
                    pelvis_dx=0.0, pelvis_dy=22.0, torso_deg=10.0,
                    l_thigh_deg=-28.0, l_shin_deg=50.0, r_thigh_deg=-34.0, r_shin_deg=54.0,
                    l_hx=42.0, l_hy=-18.0, r_hx=48.0, r_hy=-22.0,
                    odachi_deg=-58.0, funnel_mode="guard", hex_guard=True, foot_y=99.0,
                )),
                (17, dict(
                    pelvis_dx=22.0, pelvis_dy=20.0, torso_deg=24.0, head_rel_deg=-12.0,
                    l_thigh_deg=14.0, l_shin_deg=24.0, r_thigh_deg=-36.0, r_shin_deg=48.0,
                    l_hx=68.0, l_hy=2.0, r_hx=44.0, r_hy=-6.0,
                    odachi_deg=6.0, funnel_mode="aim", hex_guard=False, thruster_power=0.80,
                    slash_start=-32.0, slash_end=46.0, slash_rx=28.0, slash_ry=14.0, slash_int=0.95, foot_y=99.0,
                )),
                (23, dict(
                    pelvis_dx=12.0, pelvis_dy=14.0, torso_deg=14.0,
                    l_thigh_deg=4.0, l_shin_deg=18.0, r_thigh_deg=-22.0, r_shin_deg=32.0,
                    l_hx=54.0, l_hy=6.0, r_hx=48.0, r_hy=-10.0,
                    odachi_deg=14.0, funnel_mode="wing", hex_guard=False, slash_int=0.0, foot_y=99.0,
                )),
                (29, dict(
                    pelvis_dx=0.0, pelvis_dy=4.0, torso_deg=4.0,
                    l_thigh_deg=-6.0, l_shin_deg=10.0, r_thigh_deg=-8.0, r_shin_deg=12.0,
                    l_hx=36.0, l_hy=-4.0, r_hx=52.0, r_hy=-14.0,
                    odachi_deg=-34.0, funnel_mode="wing", hex_guard=False, slash_int=0.0, foot_y=99.0,
                )),
            ]
            cfgs.append(eval_vex_keyframes(f, kfs, ph, DEFAULTS))

        elif row == 8:
            # R8 JUMP: Knee Coil -> Valkyrie Thruster Vault -> Apex Overhead Odachi Guillotine Cleave -> Landing
            kfs = [
                (0, dict(
                    pelvis_dx=0.0, pelvis_dy=14.0, torso_deg=10.0,
                    l_thigh_deg=-24.0, l_shin_deg=42.0, r_thigh_deg=-28.0, r_shin_deg=46.0,
                    l_hx=24.0, l_hy=4.0, r_hx=42.0, r_hy=-6.0,
                    odachi_deg=-52.0, funnel_mode="wing", foot_y=99.0,
                )),
                (6, dict(
                    pelvis_dx=6.0, pelvis_dy=-14.0, torso_deg=-8.0, head_rel_deg=8.0,
                    l_thigh_deg=-16.0, l_shin_deg=34.0, r_thigh_deg=-32.0, r_shin_deg=42.0,
                    l_hx=6.0, l_hy=-58.0, r_hx=26.0, r_hy=-54.0,
                    l_elbow_cw=False, r_elbow_cw=False,
                    odachi_deg=-118.0, funnel_mode="swept", thruster_power=0.95, foot_y=88.0,
                )),
                (13, dict(
                    pelvis_dx=12.0, pelvis_dy=-18.0, torso_deg=14.0, head_rel_deg=-8.0,
                    l_thigh_deg=12.0, l_shin_deg=32.0, r_thigh_deg=-24.0, r_shin_deg=38.0,
                    l_hx=58.0, l_hy=-34.0, r_hx=52.0, r_hy=-28.0,
                    odachi_deg=-36.0, funnel_mode="swept", thruster_power=0.95,
                    slash_start=-88.0, slash_end=24.0, slash_rx=27.0, slash_ry=24.0, slash_int=0.75, foot_y=86.0,
                )),
                (18, dict(
                    pelvis_dx=16.0, pelvis_dy=-12.0, torso_deg=24.0, head_rel_deg=-12.0,
                    l_thigh_deg=20.0, l_shin_deg=28.0, r_thigh_deg=-18.0, r_shin_deg=34.0,
                    l_hx=64.0, l_hy=14.0, r_hx=46.0, r_hy=4.0,
                    odachi_deg=34.0, funnel_mode="aim", thruster_power=0.80,
                    slash_start=-48.0, slash_end=72.0, slash_rx=27.0, slash_ry=24.0, slash_int=1.0, foot_y=90.0,
                )),
                (24, dict(
                    pelvis_dx=6.0, pelvis_dy=16.0, torso_deg=12.0,
                    l_thigh_deg=-22.0, l_shin_deg=40.0, r_thigh_deg=-26.0, r_shin_deg=44.0,
                    l_hx=42.0, l_hy=2.0, r_hx=48.0, r_hy=-8.0,
                    odachi_deg=-18.0, funnel_mode="wing", thruster_power=0.45, slash_int=0.0, foot_y=99.0,
                )),
                (29, dict(
                    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=2.5,
                    l_hx=36.0, l_hy=-4.0, r_hx=52.0, r_hy=-14.0,
                    odachi_deg=-34.0, funnel_mode="wing", slash_int=0.0, foot_y=99.0,
                )),
            ]
            cfgs.append(eval_vex_keyframes(f, kfs, ph, DEFAULTS))

    return cfgs


def main():
    print("[android] Segmenting VEX-09 v2 (`android_v2_base.jpg`) into 13 Cybernetic Valkyrie parts...")
    parts = load_and_segment_512()

    showcase_picks = [
        (0, 4, "R0 IDLE + 4 FIN-FUNNELS"),
        (1, 7, "R1 TACTICAL STRIDE"),
        (2, 11, "R2 HF ODACHI CLEAVE"),
        (3, 13, "R3 EMP OVERLOAD BLITZ"),
        (4, 15, "R4 RAIL-CANNON DOCK"),
        (5, 26, "R5 PRONE + RESTING ODACHI"),
        (6, 14, "R6 THRUSTER PHASE-RUSH"),
        (8, 17, "R8 AERIAL GUILLOTINE"),
    ]

    build_and_save_30fps_sheet(
        hero_key="android",
        parts=parts,
        row_builder_fn=build_row_configs,
        render_frame_fn=render_frame_vex,
        out_sheet_path=OUT_SHEET_PATH,
        vfx_sheet_path=None,  # VFX debug sheet is built by `build_android_vfx_30fps.mjs` (8x30)
        artifact_dir=ARTIFACT_DIR,
        shimmer_cols=(list(C_CYAN), list(C_CYAN_ICE)),
        showcase_picks=showcase_picks,
    )

    # Verify interior pinholes & palette compliance across all 270 cells
    sheet_im = Image.open(OUT_SHEET_PATH).convert("RGBA")
    total_pinholes = 0
    grounded_ok = 0
    grounded_total = 0
    for r in range(ROWS):
        for c in range(COLS):
            tile104 = np.array(
                sheet_im.crop((c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL)).resize(
                    (LOGICAL, LOGICAL), Image.Resampling.NEAREST
                )
            )
            total_pinholes += count_interior_pinholes_104(tile104)
            if r in (0, 1, 2, 3, 5, 7):
                grounded_total += 1
                ys = np.where(tile104[:, :, 3] > 0)[0]
                if len(ys) > 0 and 98 <= int(ys.max()) <= 99:
                    grounded_ok += 1

    print(
        f"[android] QA Summary: pinholes={total_pinholes}, "
        f"grounded_rows_y99={grounded_ok}/{grounded_total} (portrait untouched!)"
    )


if __name__ == "__main__":
    main()
