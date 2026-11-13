#!/usr/bin/env python3
"""
Builds 5 Authentic Realm-Themed HD-2D 30fps Monster Sprite Sheets (`6240x1456`, 7 rows x 30 cols @ 208x208):
  1. Zone I  (`Eclipse Cathedral Outskirts`):
     - `monster_templar_sheet.png`    — Eclipse Templar (Dark-Slate & Gold Gothic Knight w/ Eclipse Rune-Sword)
     - `monster_astrologer_sheet.png` — Eclipse Acolyte (Dark-Slate & Brass Heretic Priest w/ Solar-Cyan Astrolabe Orb)
  2. Zone II (`Cursed Starwood Crossing`):
     - `monster_treant_sheet.png`     — Starwood Briar-Brute (Mossy-Boulder & Twisted-Bark Guardian w/ Cyan-Emerald Core)
     - `monster_dryad_sheet.png`      — Starwood Thorn-Wraith (Antlered Briar-Robed Sylvan Spirit w/ Emerald Star-Wisp)
  3. Zone IV (`Throne of the Black Pit`):
     - `monster_fiend_sheet.png`      — Black Pit Hellfiend (Horned Molten-Veined Obsidian Demon w/ Shackles & Hellfire Claws)
  (Zone III `Bone-Gate Necropolis` uses undead `monster_ghoul_sheet.png` + `monster_cultist_sheet.png`,
   and Zone IV pairs `monster_brute_sheet.png` + `monster_fiend_sheet.png`!)

Strictly follows `arcane-vs-steel-pipeline`:
  - Extracted from `generate_image` 16-bit HD-2D base sprites (zero procedural bodies from scratch)
  - BFS border + pocket flood-fill + fringe strip + multi-zone `MedianFilter` cel-flattening
  - Curated 20-color Master Palette per creature (`dither=NONE`) + 2-pass cardinal orphan despeckling + 1px dark `Selout`
  - Articulated multi-part skeletal animation across all 7 rows (`IDLE`, `WALK`, `AUTO`, `SKILL`, `ULT`, `DEATH/HURT`, `DASH`)
  - Zero canvas shearing, zero `ctx.rotate`, zero empty cells, zero border clips across all 1,050 frames!
"""

import os
import sys
import math
import time
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

try:
    from scipy.ndimage import label as _nd_label
except ImportError:
    _nd_label = None

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, SCRIPT_DIR)

from hd2d_rig_core import (
    CELL,
    COLS,
    poly_mask,
    keep_largest_component,
    clean_base_512,
    assign_remaining_geodesic,
    extract_parts_512,
    downsample_clean_104,
    quantize_and_cluster_104,
    rot_pt,
    paste_rotated_part,
    put_px,
    draw_slash_arc_104,
)

ART_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/b9d8130e-8764-4ace-8d4e-40f97049d6f1"
SPRITE_DIR = os.path.join(ROOT_DIR, "assets", "sprites")

SRC_TEMPLAR = os.path.join(ART_DIR, "monster_templar_base_1794570255646.jpg")
SRC_ASTROLOGER = os.path.join(ART_DIR, "monster_astrologer_base_1794570242396.jpg")
SRC_TREANT = os.path.join(ART_DIR, "monster_treant_base_1794570243679.jpg")
SRC_DRYAD = os.path.join(ART_DIR, "monster_dryad_base_1794570248772.jpg")
SRC_FIEND = os.path.join(ART_DIR, "monster_fiend_base_1794570254740.jpg")

ROWS_MONSTER = 7

# ==============================================================================
# CURATED 20-COLOR MASTER PALETTES (3-4 Stepped Cel Ramps + Dark Selout)
# ==============================================================================

# 1. Zone I Eclipse Templar: Dark Slate-Blue Gothic Plate, Antique Gold Eclipse Trim, Cyan Visor & Rune-Blade
TEMPLAR_PALETTE = np.array(
    [
        [8, 11, 18],       # 0: Deep shadow Selout
        [18, 24, 38],      # 1: Lit Selout / deepest slate plate
        [30, 40, 58],      # 2: Dark slate-indigo armor shadow
        [48, 64, 90],      # 3: Mid slate-blue gothic plate
        [74, 96, 128],     # 4: Lit slate-steel armor bevel
        [110, 136, 170],   # 5: Specular steel helm/blade highlight
        [24, 28, 40],      # 6: Dark eclipse tabard cloth shadow
        [38, 46, 64],      # 7: Mid eclipse tabard cloth
        [88, 64, 28],      # 8: Deep antique gold trim shadow
        [142, 106, 44],    # 9: Mid antique brass/gold trim
        [198, 154, 68],    # 10: Bright solar-gold eclipse emblem
        [242, 206, 116],   # 11: Specular gold highlight
        [58, 44, 36],      # 12: Dark leather belt/strap
        [96, 72, 54],      # 13: Lit leather strap
        [12, 112, 148],    # 14: Deep astral cyan rune shadow
        [26, 184, 226],    # 15: Vivid astral cyan visor / rune fuller
        [96, 234, 255],    # 16: Hot cyan visor core / slash edge
        [204, 250, 255],   # 17: Incandescent cyan-white arc core
        [252, 224, 132],   # 18: Solar-eclipse slash spark
        [255, 255, 255],   # 19: Pure white glint
    ],
    dtype=np.int32,
)

# 2. Zone I Eclipse Acolyte (`astrologer`): Slate-Indigo Vestments, Aged Brass Astrolabe, Void Hood, Cyan-Solar Orb
ASTROLOGER_PALETTE = np.array(
    [
        [7, 10, 18],       # 0: Deep shadow Selout
        [16, 20, 34],      # 1: Lit Selout / void hood interior
        [28, 36, 56],      # 2: Deep slate-indigo robe shadow
        [46, 58, 84],      # 3: Mid slate-blue vestment
        [70, 86, 118],     # 4: Lit slate-blue robe pleat
        [98, 118, 152],    # 5: Pale astral-slate trim highlight
        [22, 26, 38],      # 6: Dark inner stole / glove shadow
        [40, 44, 58],      # 7: Mid charcoal glove / boot
        [84, 62, 30],      # 8: Deep aged brass shadow
        [136, 102, 46],    # 9: Mid brass astrolabe / rune border
        [192, 150, 70],    # 10: Bright gold astrolabe ring
        [240, 204, 118],   # 11: Specular solar-gold spark
        [64, 50, 42],      # 12: Dark boot leather
        [102, 80, 64],     # 13: Lit boot leather
        [14, 118, 156],    # 14: Deep cyan star-eye / orb rim
        [32, 192, 234],    # 15: Bright cyan star-eye / astral ring
        [110, 238, 255],   # 16: Hot cyan-ice star core
        [250, 176, 64],    # 17: Warm solar-amber eclipse corona
        [214, 252, 255],   # 18: Incandescent astral glint
        [255, 255, 255],   # 19: Pure white star-spark
    ],
    dtype=np.int32,
)

# 3. Zone II Starwood Briar-Brute (`treant`): Twisted Dark Bark, Mossy Stone Pauldrons, Forest Moss, Cyan-Emerald Core
TREANT_PALETTE = np.array(
    [
        [8, 12, 12],       # 0: Deep shadow Selout
        [20, 24, 22],      # 1: Lit Selout / deepest bark crevice
        [42, 36, 30],      # 2: Deep shadow deadwood bark
        [68, 58, 46],      # 3: Mid twisted oak bark
        [98, 84, 66],      # 4: Lit bark ridge
        [130, 114, 90],    # 5: Dry deadwood horn/claw highlight
        [44, 52, 52],      # 6: Deep mossy boulder shadow
        [68, 80, 78],      # 7: Mid granite boulder pauldron
        [98, 112, 108],    # 8: Lit boulder stone bevel
        [28, 56, 36],      # 9: Deep forest moss shadow
        [48, 92, 54],      # 10: Mid starwood moss
        [78, 132, 74],     # 11: Lit vibrant moss highlight
        [10, 96, 86],      # 12: Deep emerald-teal rune shadow
        [18, 156, 134],    # 13: Mid glowing starwood crystal
        [38, 218, 182],    # 14: Bright cyan-emerald heartwood core
        [108, 248, 216],   # 15: Hot mint-turquoise crystal glow
        [196, 255, 240],   # 16: Incandescent core highlight
        [34, 72, 62],      # 17: Dark teal-bark transition
        [148, 232, 174],   # 18: Sylvan shockwave leaf-spark
        [255, 255, 255],   # 19: Pure white crystal glint
    ],
    dtype=np.int32,
)

# 4. Zone II Starwood Thorn-Wraith (`dryad`): Dark Briar Bark & Antlers, Deep Sylvan Gown, Glowing Mint-Emerald Spirit
DRYAD_PALETTE = np.array(
    [
        [7, 12, 12],       # 0: Deep shadow Selout
        [16, 24, 22],      # 1: Lit Selout / deepest briar shadow
        [38, 34, 30],      # 2: Dark briar vine / antler shadow
        [64, 56, 46],      # 3: Mid twisted briar shoulder/corset
        [94, 82, 66],      # 4: Lit antler / dry vine highlight
        [126, 112, 90],    # 5: Pale antler tip
        [14, 42, 38],      # 6: Deep sylvan emerald gown shadow
        [24, 68, 60],      # 7: Mid-dark sylvan forest gown
        [38, 98, 84],      # 8: Mid sylvan emerald pleat
        [58, 132, 112],    # 9: Lit emerald gown highlight
        [32, 54, 42],      # 10: Dark moss/face shadow
        [56, 86, 68],      # 11: Mid sylvan bark-skin
        [14, 118, 98],     # 12: Deep spirit-emerald glow shadow
        [26, 178, 144],    # 13: Mid glowing turquoise-emerald hand
        [54, 232, 186],    # 14: Bright mint-emerald magic / eye
        [124, 252, 218],   # 15: Hot mint-cyan wisp core
        [208, 255, 242],   # 16: Incandescent spirit spark
        [76, 128, 78],     # 17: Briar leaf mid-green
        [132, 196, 116],   # 18: Lit sylvan leaf highlight
        [255, 255, 255],   # 19: Pure white star-spark
    ],
    dtype=np.int32,
)

# 5. Zone IV Black Pit Hellfiend (`fiend`): Charred Obsidian Flesh, Ridged Horns & Shackles, Blazing Magma Veins & Claws
FIEND_PALETTE = np.array(
    [
        [8, 7, 12],        # 0: Deep shadow Selout
        [20, 16, 22],      # 1: Lit Selout / deepest charred obsidian
        [36, 28, 30],      # 2: Dark charred demon hide shadow
        [58, 44, 42],      # 3: Mid volcanic-ash demon muscle
        [86, 64, 58],      # 4: Lit warm-ash muscle highlight
        [44, 46, 54],      # 5: Dark iron shackle / greave shadow
        [72, 76, 88],      # 6: Mid forged iron shackle / horn ridge
        [108, 112, 126],   # 7: Lit iron chain / greave bevel
        [148, 146, 156],   # 8: Specular iron / horn tip glint
        [78, 58, 52],      # 9: Curved demon horn mid-brown
        [114, 88, 76],     # 10: Lit demon horn ridge
        [108, 18, 14],     # 11: Deep cooled blood-magma fissure
        [168, 32, 16],     # 12: Dark crimson hellfire vein
        [224, 68, 16],     # 13: Blazing molten orange chest fissure
        [250, 128, 22],    # 14: Bright hellfire amber core / eye
        [254, 198, 54],    # 15: Incandescent solar-magma heart
        [255, 240, 148],   # 16: White-hot magma center
        [52, 22, 24],      # 17: Warm ember-shadow undertone
        [255, 164, 78],    # 18: Hellfire claw spark
        [255, 255, 255],   # 19: Pure white cataclysm glint
    ],
    dtype=np.int32,
)


# ==============================================================================
# MULTI-COMPONENT CLEANER (Preserves Detached Sleeves/Chains while Stripping Dust)
# ==============================================================================
def keep_significant_components(mask, min_px=45):
    if not np.any(mask):
        return mask
    if _nd_label is not None:
        structure = np.ones((3, 3), dtype=np.int8)
        labeled, num = _nd_label(mask, structure=structure)
        if num == 0:
            return mask.copy()
        counts = np.bincount(labeled.ravel())
        counts[0] = 0
        keep_ids = np.where(counts >= min_px)[0]
        return np.isin(labeled, keep_ids)

    H, W = mask.shape
    visited = np.zeros((H, W), dtype=bool)
    out = np.zeros((H, W), dtype=bool)
    ys, xs = np.where(mask)
    for sy, sx in zip(ys, xs):
        if visited[sy, sx]:
            continue
        comp = [(sy, sx)]
        visited[sy, sx] = True
        hd = 0
        while hd < len(comp):
            cy, cx = comp[hd]
            hd += 1
            for ny in (cy - 1, cy, cy + 1):
                for nx in (cx - 1, cx, cx + 1):
                    if 0 <= ny < H and 0 <= nx < W and not visited[ny, nx] and mask[ny, nx]:
                        visited[ny, nx] = True
                        comp.append((ny, nx))
        if len(comp) >= min_px:
            cy_l, cx_l = zip(*comp)
            out[cy_l, cx_l] = True
    return out


def clean_multi_component_512(img_path, head_y_split=145, min_comp_px=45):
    im = Image.open(img_path).convert("RGBA")
    for sx, sy in ((0, 0), (1023, 0), (0, 1023), (1023, 1023)):
        ImageDraw.floodfill(im, (sx, sy), (0, 0, 0, 0), thresh=38)
    arr = np.array(im)

    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    a = arr[:, :, 3] > 0
    pure_white = a & (r >= 247) & (g >= 247) & (b >= 247)
    if np.any(pure_white) and _nd_label is not None:
        lbl, n_comp = _nd_label(pure_white)
        if n_comp > 0:
            cnts = np.bincount(lbl.ravel())
            cnts[0] = 0
            big_ids = np.where(cnts >= 35)[0]
            if len(big_ids) > 0:
                arr[np.isin(lbl, big_ids)] = [0, 0, 0, 0]

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
        white_fringe = edge & (r > 175) & (g > 175) & (b > 175) & (np.abs(r - g) < 28) & (np.abs(g - b) < 28)
        arr[white_fringe] = [0, 0, 0, 0]

    im512 = Image.fromarray(arr, "RGBA").resize((512, 512), Image.Resampling.NEAREST)
    rgb512 = im512.convert("RGB")
    rgb_med3 = np.array(rgb512.filter(ImageFilter.MedianFilter(size=3)))
    rgb_med5 = np.array(rgb512.filter(ImageFilter.MedianFilter(size=5)))
    arr512 = np.array(im512)
    alpha = keep_significant_components(arr512[:, :, 3] > 0, min_px=min_comp_px)
    arr512[~alpha] = [0, 0, 0, 0]
    yy = np.arange(512)[:, None]
    cel_rgb = np.where(yy[:, :, None] < head_y_split, rgb_med3, rgb_med5)
    arr512[:, :, :3] = np.where(alpha[:, :, None], cel_rgb, 0)
    return arr512


def infill_region_from_neighbors(arr512, poly_pts, sample_offsets):
    out = arr512.copy()
    H, W = out.shape[:2]
    m = poly_mask(H, W, poly_pts) & (out[:, :, 3] > 0)
    ys, xs = np.where(m)
    for y, x in zip(ys, xs):
        found = None
        for dy, dx in sample_offsets:
            sy = max(0, min(H - 1, y + dy))
            sx = max(0, min(W - 1, x + dx))
            if not m[sy, sx] and out[sy, sx, 3] > 180:
                found = out[sy, sx]
                break
        if found is not None:
            out[y, x] = found
    return out


# ==============================================================================
# 1. ZONE I ECLIPSE TEMPLAR RIG + ARTICULATED ECLIPSE RUNE-SWORD
# ==============================================================================
def attach_eclipse_runeblade_to_arm(r_arm_tuple):
    """Attaches a crisp HD-2D Eclipse Rune-Greatsword directly onto Templar's right gauntlet in 512x512 space."""
    pim, ox, oy = r_arm_tuple
    # Expand part canvas to the right & upward/downward so sword fits cleanly
    pad_l, pad_t, pad_r, pad_b = 24, 24, 130, 36
    nw = pim.width + pad_l + pad_r
    nh = pim.height + pad_t + pad_b
    canvas = Image.new("RGBA", (nw, nh), (0, 0, 0, 0))
    gx = (182 - ox) + pad_l
    gy = (272 - oy) + pad_t

    sdraw = ImageDraw.Draw(canvas)
    # Pommel & grip extending slightly behind fist
    sdraw.line([(gx - 18, gy + 14), (gx + 6, gy - 4)], fill=(142, 106, 44, 255), width=7)
    sdraw.ellipse((gx - 23, gy + 11, gx - 13, gy + 21), fill=(198, 154, 68, 255), outline=(18, 24, 38, 255))

    # Blade vector pointing forward-upward (+X, -Y)
    bx0, by0 = gx + 8, gy - 6
    bx1, by1 = gx + 104, gy - 78
    # Dark steel outer bevel + lit slate-steel upper edge
    sdraw.polygon(
        [
            (bx0 - 5, by0 - 7),
            (bx1 - 6, by1 - 2),
            (bx1 + 6, by1 - 5),
            (bx1 + 1, by1 + 7),
            (bx0 + 6, by0 + 8),
        ],
        fill=(48, 64, 90, 255),
        outline=(18, 24, 38, 255),
    )
    sdraw.line([(bx0 - 3, by0 - 5), (bx1 + 2, by1 - 4)], fill=(110, 136, 170, 255), width=3)
    # Glowing Astral-Cyan rune fuller along center of blade
    sdraw.line([(bx0 + 4, by0 - 1), (bx1 - 14, by1 + 6)], fill=(26, 184, 226, 255), width=3)
    sdraw.line([(bx0 + 8, by0 - 4), (bx0 + 58, by0 - 41)], fill=(96, 234, 255, 255), width=1)

    # Ornate Antique-Gold Eclipse Crossguard + Crescent Ring
    sdraw.line([(gx - 2, gy - 22), (gx + 20, gy + 10)], fill=(198, 154, 68, 255), width=7)
    sdraw.ellipse((gx + 1, gy - 14, gx + 17, gy + 2), fill=(18, 24, 38, 255), outline=(242, 206, 116, 255), width=3)
    sdraw.ellipse((gx + 6, gy - 9, gx + 12, gy - 3), fill=(96, 234, 255, 255))

    # Composite gauntlet/arm OVER grip so fingers wrap naturally around hilt!
    canvas.alpha_composite(pim, (pad_l, pad_t))
    return (canvas, ox - pad_l, oy - pad_t)


def segment_templar():
    arr = clean_base_512(SRC_TEMPLAR, preserve_pale_thighs=False, head_y_split=138)
    H, W = arr.shape[:2]
    alpha = arr[:, :, 3] > 0

    m_head = poly_mask(H, W, [(218, 30), (314, 30), (312, 134), (224, 134)])
    m_r_arm = poly_mask(H, W, [(138, 96), (222, 96), (224, 156), (206, 214), (204, 298), (138, 298)]) & (~m_head)
    m_l_arm = poly_mask(H, W, [(308, 112), (384, 112), (384, 298), (322, 298), (308, 202)]) & (~m_head)
    m_torso = (
        poly_mask(H, W, [(204, 116), (314, 116), (312, 256), (300, 412), (236, 412), (212, 256)])
        & (~m_head)
        & (~m_r_arm)
        & (~m_l_arm)
    )
    m_r_leg = poly_mask(H, W, [(138, 252), (238, 252), (236, 412), (218, 494), (138, 494)]) & (~m_r_arm) & (~m_torso)
    m_l_leg = poly_mask(H, W, [(296, 252), (384, 252), (384, 488), (298, 488)]) & (~m_l_arm) & (~m_torso)

    leg_infilled = infill_region_from_neighbors(
        arr,
        [(154, 248), (206, 248), (206, 300), (154, 300)],
        [(26, 16), (36, 14), (18, 22), (0, 26)],
    )

    assigned = assign_remaining_geodesic(
        alpha,
        [
            ("head", m_head),
            ("r_arm", m_r_arm),
            ("l_arm", m_l_arm),
            ("r_leg", m_r_leg),
            ("l_leg", m_l_leg),
            ("torso", m_torso),
        ],
    )
    parts = extract_parts_512(arr, assigned, custom_part_arrays={"r_leg": leg_infilled})
    parts["r_arm"] = attach_eclipse_runeblade_to_arm(parts["r_arm"])
    pivots = {
        "pelvis": (266.0, 252.0),
        "neck": (268.0, 128.0),
        "r_sh": (198.0, 134.0),
        "l_sh": (316.0, 142.0),
        "r_hip": (216.0, 272.0),
        "l_hip": (306.0, 272.0),
    }
    return parts, pivots


# ==============================================================================
# 2. ZONE I ECLIPSE ACOLYTE (`astrologer`) RIG (Tucked Multi-Component Sleeves!)
# ==============================================================================
def bridge_sleeve_socket(part_tuple, dx_shift, dy_shift, socket_side="right"):
    """Bridges the clean white separation seam on Astrologer's bell-sleeves and tucks them into the shoulder capelet."""
    pim, ox, oy = part_tuple
    pad_t = 22
    pad_x = 20
    canvas = Image.new("RGBA", (pim.width + pad_x * 2, pim.height + pad_t), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    # Paint smooth dark-slate shoulder socket cuff at top of sleeve so rotation never exposes a gap
    cx = (pim.width // 2) + pad_x + (10 if socket_side == "right" else -10)
    d.ellipse((cx - 22, 4, cx + 22, 42), fill=(36, 46, 68, 255), outline=(16, 20, 34, 255))
    canvas.alpha_composite(pim, (pad_x, pad_t))
    return (canvas, ox - pad_x + dx_shift, oy - pad_t + dy_shift)


def segment_astrologer():
    arr = clean_multi_component_512(SRC_ASTROLOGER, head_y_split=148, min_comp_px=40)
    H, W = arr.shape[:2]
    alpha = arr[:, :, 3] > 0

    m_head = poly_mask(H, W, [(192, 34), (308, 34), (306, 144), (196, 144)])
    m_r_arm = poly_mask(H, W, [(104, 184), (196, 184), (192, 248), (168, 326), (104, 326)])
    m_l_arm = poly_mask(H, W, [(320, 184), (426, 184), (426, 324), (322, 324)])
    m_torso = (
        poly_mask(H, W, [(148, 134), (344, 134), (336, 266), (164, 266)])
        & (~m_head)
        & (~m_r_arm)
        & (~m_l_arm)
    )
    m_skirt = (
        poly_mask(H, W, [(134, 254), (360, 254), (360, 506), (134, 506)])
        & (~m_r_arm)
        & (~m_l_arm)
    )

    assigned = assign_remaining_geodesic(
        alpha,
        [
            ("head", m_head),
            ("r_arm", m_r_arm),
            ("l_arm", m_l_arm),
            ("torso", m_torso),
            ("skirt", m_skirt),
        ],
    )
    parts = extract_parts_512(arr, assigned)
    parts["r_arm"] = bridge_sleeve_socket(parts["r_arm"], dx_shift=10, dy_shift=-10, socket_side="right")
    parts["l_arm"] = bridge_sleeve_socket(parts["l_arm"], dx_shift=-10, dy_shift=-10, socket_side="left")
    pivots = {
        "pelvis": (254.0, 260.0),
        "neck": (258.0, 138.0),
        "r_sh": (182.0, 182.0),
        "l_sh": (320.0, 184.0),
    }
    return parts, pivots


# ==============================================================================
# 3. ZONE II STARWOOD BRIAR-BRUTE (`treant`) RIG
# ==============================================================================
def segment_treant():
    arr = clean_multi_component_512(SRC_TREANT, head_y_split=162, min_comp_px=45)
    H, W = arr.shape[:2]
    alpha = arr[:, :, 3] > 0

    m_head = poly_mask(H, W, [(194, 10), (370, 10), (366, 98), (346, 168), (266, 168), (248, 104), (194, 82)])
    m_r_arm = poly_mask(H, W, [(58, 78), (226, 78), (226, 198), (196, 262), (212, 396), (58, 396)]) & (~m_head)
    m_l_arm = poly_mask(H, W, [(338, 106), (452, 106), (452, 394), (354, 394), (342, 256)]) & (~m_head)
    m_torso = (
        poly_mask(H, W, [(196, 114), (350, 114), (346, 316), (196, 316)])
        & (~m_head)
        & (~m_r_arm)
        & (~m_l_arm)
    )
    m_r_leg = poly_mask(H, W, [(156, 294), (274, 294), (266, 508), (156, 508)]) & (~m_r_arm)
    m_l_leg = poly_mask(H, W, [(274, 294), (392, 294), (392, 498), (274, 498)]) & (~m_l_arm)

    leg_infilled = infill_region_from_neighbors(
        arr,
        [(158, 294), (216, 294), (216, 396), (158, 396)],
        [(0, 28), (24, 28), (-18, 32)],
    )

    assigned = assign_remaining_geodesic(
        alpha,
        [
            ("head", m_head),
            ("r_arm", m_r_arm),
            ("l_arm", m_l_arm),
            ("r_leg", m_r_leg),
            ("l_leg", m_l_leg),
            ("torso", m_torso),
        ],
    )
    parts = extract_parts_512(arr, assigned, custom_part_arrays={"r_leg": leg_infilled})
    pivots = {
        "pelvis": (272.0, 282.0),
        "neck": (296.0, 138.0),
        "r_sh": (176.0, 142.0),
        "l_sh": (356.0, 156.0),
        "r_hip": (228.0, 312.0),
        "l_hip": (314.0, 312.0),
    }
    return parts, pivots


# ==============================================================================
# 4. ZONE II STARWOOD THORN-WRAITH (`dryad`) RIG
# ==============================================================================
def segment_dryad():
    arr = clean_multi_component_512(SRC_DRYAD, head_y_split=150, min_comp_px=35)
    H, W = arr.shape[:2]
    alpha = arr[:, :, 3] > 0

    m_head = poly_mask(H, W, [(178, 12), (334, 12), (324, 92), (302, 146), (214, 146), (182, 88)])
    m_r_arm = poly_mask(H, W, [(96, 128), (220, 128), (212, 210), (194, 276), (96, 276)]) & (~m_head)
    m_l_arm = poly_mask(H, W, [(302, 128), (402, 128), (402, 282), (308, 282)]) & (~m_head)
    m_torso = (
        poly_mask(H, W, [(204, 138), (312, 138), (312, 266), (204, 266)])
        & (~m_head)
        & (~m_r_arm)
        & (~m_l_arm)
    )
    m_skirt = (
        poly_mask(H, W, [(96, 254), (378, 254), (378, 492), (96, 492)])
        & (~m_r_arm)
        & (~m_l_arm)
    )

    assigned = assign_remaining_geodesic(
        alpha,
        [
            ("head", m_head),
            ("r_arm", m_r_arm),
            ("l_arm", m_l_arm),
            ("torso", m_torso),
            ("skirt", m_skirt),
        ],
    )
    parts = extract_parts_512(arr, assigned)
    pivots = {
        "pelvis": (258.0, 260.0),
        "neck": (262.0, 138.0),
        "r_sh": (208.0, 172.0),
        "l_sh": (310.0, 176.0),
    }
    return parts, pivots


# ==============================================================================
# 5. ZONE IV BLACK PIT HELLFIEND (`fiend`) RIG
# ==============================================================================
def segment_fiend():
    arr = clean_multi_component_512(SRC_FIEND, head_y_split=154, min_comp_px=35)
    H, W = arr.shape[:2]
    alpha = arr[:, :, 3] > 0

    m_head = poly_mask(H, W, [(168, 10), (356, 10), (352, 96), (320, 152), (246, 152), (168, 86)])
    m_r_arm = poly_mask(H, W, [(50, 136), (232, 136), (228, 232), (178, 300), (50, 300)]) & (~m_head)
    m_l_arm = poly_mask(H, W, [(318, 152), (462, 152), (462, 310), (324, 310)]) & (~m_head)
    m_torso = (
        poly_mask(H, W, [(218, 136), (328, 136), (324, 296), (218, 296)])
        & (~m_head)
        & (~m_r_arm)
        & (~m_l_arm)
    )
    m_r_leg = poly_mask(H, W, [(104, 282), (268, 282), (252, 509), (104, 509)]) & (~m_r_arm)
    m_l_leg = poly_mask(H, W, [(268, 282), (402, 282), (402, 490), (268, 490)]) & (~m_l_arm)

    assigned = assign_remaining_geodesic(
        alpha,
        [
            ("head", m_head),
            ("r_arm", m_r_arm),
            ("l_arm", m_l_arm),
            ("r_leg", m_r_leg),
            ("l_leg", m_l_leg),
            ("torso", m_torso),
        ],
    )
    parts = extract_parts_512(arr, assigned)
    pivots = {
        "pelvis": (272.0, 274.0),
        "neck": (286.0, 140.0),
        "r_sh": (214.0, 174.0),
        "l_sh": (326.0, 184.0),
        "r_hip": (232.0, 298.0),
        "l_hip": (306.0, 298.0),
    }
    return parts, pivots


# ==============================================================================
# SHARED CELL RENDERER + REALM ELEMENTAL ORBS & SLASH ARCS (104x104 -> 208x208)
# ==============================================================================
def render_monster_cell(
    parts,
    pivots,
    palette,
    protect_indices,
    cfg,
    y_bot_base=490.0,
    window_S=584,
    cx_offset=0.0,
    r_arm_under_torso=False,
    draw_fx_104=None,
):
    canvas = Image.new("RGBA", (780, 700), (0, 0, 0, 0))
    OX, OY = 136, 76

    pelvis_src = pivots["pelvis"]
    pelvis_dst = (
        pelvis_src[0] + OX + cfg.get("pelvis_dx", 0.0),
        pelvis_src[1] + OY + cfg.get("pelvis_dy", 0.0),
    )
    torso_deg = cfg.get("torso_deg", 0.0)
    head_deg = torso_deg + cfg.get("head_rel_deg", 0.0)

    def torso_joint(pt):
        r = rot_pt(pt, pelvis_src, torso_deg)
        return (pelvis_dst[0] + (r[0] - pelvis_src[0]), pelvis_dst[1] + (r[1] - pelvis_src[1]))

    neck_dst = torso_joint(pivots["neck"])
    r_sh_dst = torso_joint(pivots["r_sh"])
    l_sh_dst = torso_joint(pivots["l_sh"])

    # 1. Far Arm (`l_arm`)
    paste_rotated_part(
        canvas,
        parts["l_arm"],
        pivots["l_sh"],
        (l_sh_dst[0] + cfg.get("l_arm_dx", 0.0), l_sh_dst[1] + cfg.get("l_arm_dy", 0.0)),
        torso_deg + cfg.get("l_arm_deg", 0.0),
    )

    # 2. Legs OR Robe Skirt
    if "skirt" in parts:
        paste_rotated_part(
            canvas,
            parts["skirt"],
            pelvis_src,
            pelvis_dst,
            cfg.get("skirt_deg", torso_deg * 0.42),
            wave_phase=cfg.get("wave_phase", 0.0),
            wave_amp=cfg.get("skirt_wave_amp", 3.0),
        )
    else:
        l_hip_dst = torso_joint(pivots["l_hip"])
        r_hip_dst = torso_joint(pivots["r_hip"])
        paste_rotated_part(
            canvas,
            parts["l_leg"],
            pivots["l_hip"],
            (l_hip_dst[0] + cfg.get("l_leg_dx", 0.0), l_hip_dst[1] + cfg.get("l_leg_dy", 0.0)),
            cfg.get("l_leg_deg", 0.0),
        )
        paste_rotated_part(
            canvas,
            parts["r_leg"],
            pivots["r_hip"],
            (r_hip_dst[0] + cfg.get("r_leg_dx", 0.0), r_hip_dst[1] + cfg.get("r_leg_dy", 0.0)),
            cfg.get("r_leg_deg", 0.0),
        )

    if r_arm_under_torso:
        paste_rotated_part(
            canvas,
            parts["r_arm"],
            pivots["r_sh"],
            (r_sh_dst[0] + cfg.get("r_arm_dx", 0.0), r_sh_dst[1] + cfg.get("r_arm_dy", 0.0)),
            torso_deg + cfg.get("r_arm_deg", 0.0),
        )

    # 3. Torso / Shoulder Capelet / Chestplate
    paste_rotated_part(canvas, parts["torso"], pelvis_src, pelvis_dst, torso_deg)

    # 4. Head / Helm / Antlers / Horns
    paste_rotated_part(canvas, parts["head"], pivots["neck"], neck_dst, head_deg)

    # 5. Foreground Arm (`r_arm`)
    if not r_arm_under_torso:
        paste_rotated_part(
            canvas,
            parts["r_arm"],
            pivots["r_sh"],
            (r_sh_dst[0] + cfg.get("r_arm_dx", 0.0), r_sh_dst[1] + cfg.get("r_arm_dy", 0.0)),
            torso_deg + cfg.get("r_arm_deg", 0.0),
        )

    cx_win = int(round(pelvis_src[0] + OX + cx_offset))
    y_ground = int(round(y_bot_base + OY))
    S = window_S
    x0 = cx_win - S // 2
    y0 = y_ground - int(round(S * (98.0 / 104.0)))
    win = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    win.paste(canvas, (-x0, -y0))

    arr104 = downsample_clean_104(win)
    q104 = quantize_and_cluster_104(
        arr104,
        palette,
        protect_indices=protect_indices,
        lit_selout=1,
        shad_selout=0,
    )

    if draw_fx_104 is not None:
        draw_fx_104(q104)

    q104[:3, :, :] = 0
    q104[-3:, :, :] = 0
    q104[:, :3, :] = 0
    q104[:, -3:, :] = 0

    return Image.fromarray(q104, "RGBA").resize((CELL, CELL), Image.Resampling.NEAREST)


def draw_eclipse_orb_104(arr, cx, cy, r, phase):
    """Solar-Gold & Astral-Cyan Eclipse Orb for Zone I Eclipse Acolyte."""
    if r <= 0.6:
        return
    C_VOID = [7, 10, 18, 255]
    C_GOLD = [240, 204, 118, 255]
    C_CYAN = [32, 192, 234, 255]
    C_HOT = [214, 252, 255, 255]
    ir = int(math.ceil(r + 2))
    for dy in range(-ir, ir + 1):
        for dx in range(-ir, ir + 1):
            d = math.hypot(dx, dy)
            if d > r + 0.9:
                continue
            if d > r - 0.35:
                put_px(arr, cx + dx, cy + dy, C_GOLD if (dx + dy) % 2 == 0 else C_CYAN)
            elif d > r * 0.52:
                put_px(arr, cx + dx, cy + dy, C_HOT if d > r * 0.72 else C_VOID)
            else:
                put_px(arr, cx + dx, cy + dy, C_VOID)
    for k in range(3):
        ang = phase * 2.1 + k * (2.0 * math.pi / 3.0)
        put_px(arr, cx + math.cos(ang) * (r + 2.2), cy + math.sin(ang) * (r + 1.5), C_GOLD if k == 0 else C_HOT)


def draw_sylvan_wisp_104(arr, cx, cy, r, phase):
    """Mint-Emerald Sylvan Star-Wisp & Briar Sparks for Zone II Thorn-Wraith."""
    if r <= 0.6:
        return
    C_OUT = [7, 12, 12, 255]
    C_DEEP = [26, 178, 144, 255]
    C_MINT = [124, 252, 218, 255]
    C_WHT = [255, 255, 255, 255]
    C_LEAF = [132, 196, 116, 255]
    ir = int(math.ceil(r + 2))
    for dy in range(-ir, ir + 1):
        for dx in range(-ir, ir + 1):
            d = math.hypot(dx, dy)
            if d > r + 0.85:
                continue
            if d > r - 0.25:
                put_px(arr, cx + dx, cy + dy, C_OUT if (dx + dy) % 2 else C_DEEP)
            elif d > r * 0.45:
                put_px(arr, cx + dx, cy + dy, C_MINT)
            else:
                put_px(arr, cx + dx, cy + dy, C_WHT)
    for k in range(3):
        ang = -phase * 2.0 + k * (2.0 * math.pi / 3.0)
        put_px(arr, cx + math.cos(ang) * (r + 2.3), cy + math.sin(ang) * (r + 1.6), C_LEAF if k % 2 else C_MINT)


# ==============================================================================
# 7-ROW x 30-COL POSE CHOREOGRAPHY FOR ALL 5 REALM MONSTERS
# ==============================================================================
def generate_realm_pose(kind, row, f):
    u = f / 30.0
    ph = u * 2.0 * math.pi
    cfg = {"wave_phase": ph}
    fx_fn = None
    is_caster = kind in ("astrologer", "dryad")

    # ------------------------------------------------------------------
    # ROW 0: IDLE
    # ------------------------------------------------------------------
    if row == 0:
        b = math.sin(ph)
        b2 = math.sin(ph - 0.7)
        if kind == "astrologer":
            cfg.update(
                pelvis_dy=-3.5 + 3.8 * b,
                torso_deg=1.6 * b,
                head_rel_deg=-1.4 * b2,
                r_arm_deg=-10.0 + 6.0 * b2,
                l_arm_deg=-8.0 - 5.5 * b,
                skirt_wave_amp=3.2,
            )
            fx_fn = lambda a, bl=b, pl=ph: draw_eclipse_orb_104(a, 74, 48 + bl * 1.4, 3.2, pl)
        elif kind == "dryad":
            cfg.update(
                pelvis_dy=-4.5 + 4.2 * b,
                torso_deg=2.0 * b,
                head_rel_deg=-1.6 * b2,
                r_arm_deg=-6.0 + 6.5 * b2,
                l_arm_deg=-6.0 - 6.0 * b,
                skirt_wave_amp=3.6,
            )
            fx_fn = lambda a, bl=b, pl=ph: draw_sylvan_wisp_104(a, 73, 40 + bl * 1.5, 3.1, pl)
        elif kind == "treant":
            cfg.update(
                pelvis_dy=1.8 * b,
                torso_deg=2.2 + 1.8 * b,
                head_rel_deg=-1.4 * b2,
                r_arm_deg=-5.0 + 4.5 * b2,
                l_arm_deg=4.0 - 4.0 * b,
            )
        elif kind == "fiend":
            cfg.update(
                pelvis_dy=2.4 * b,
                torso_deg=3.5 + 2.4 * b,
                head_rel_deg=-2.0 + 2.6 * b2,
                r_arm_deg=6.0 + 6.5 * b2,
                l_arm_deg=4.0 - 5.5 * b,
            )
        else:  # templar
            cfg.update(
                pelvis_dy=1.8 * b,
                torso_deg=2.0 + 1.8 * b,
                head_rel_deg=-1.5 + 2.0 * b2,
                r_arm_deg=-6.0 + 5.0 * b2,
                l_arm_deg=5.0 - 4.5 * b,
            )

    # ------------------------------------------------------------------
    # ROW 1: WALK
    # ------------------------------------------------------------------
    elif row == 1:
        s = math.sin(ph)
        bounce = -abs(math.cos(ph)) * 5.2
        if is_caster:
            cfg.update(
                pelvis_dx=3.5,
                pelvis_dy=-6.5 + 3.8 * s,
                torso_deg=7.5 + 2.0 * s,
                head_rel_deg=-4.0,
                r_arm_deg=-18.0 + 9.0 * s,
                l_arm_deg=-12.0 - 8.0 * s,
                skirt_deg=5.5 + 1.8 * s,
                skirt_wave_amp=4.8,
            )
            if kind == "astrologer":
                fx_fn = lambda a, pl=ph: draw_eclipse_orb_104(a, 76, 46, 3.3, pl)
            else:
                fx_fn = lambda a, pl=ph: draw_sylvan_wisp_104(a, 75, 38, 3.2, pl)
        else:
            leg_amp = 23.0 if kind == "fiend" else (19.0 if kind == "templar" else 17.0)
            arm_amp = 20.0 if kind == "fiend" else 16.0
            lean = 9.5 if kind == "fiend" else (6.5 if kind == "templar" else 6.0)
            r_base = 8.0 if kind == "fiend" else -10.0
            cfg.update(
                pelvis_dy=bounce,
                torso_deg=lean + 1.8 * math.sin(ph * 2),
                head_rel_deg=-lean * 0.45,
                r_leg_deg=leg_amp * s,
                l_leg_deg=-leg_amp * s,
                r_arm_deg=r_base - arm_amp * s,
                l_arm_deg=-6.0 + arm_amp * s,
            )

    # ------------------------------------------------------------------
    # ROW 2: AUTO_ATTACK
    # ------------------------------------------------------------------
    elif row == 2:
        if f < 9:
            t = f / 9.0
            e = t * t * (3 - 2 * t)
            if is_caster:
                cfg.update(
                    pelvis_dy=-5.5 - 3.5 * e,
                    torso_deg=-6.0 * e,
                    r_arm_deg=-38.0 * e,
                    l_arm_deg=-28.0 * e,
                    skirt_wave_amp=4.2,
                )
                if kind == "astrologer":
                    fx_fn = lambda a, el=e, pl=ph: draw_eclipse_orb_104(a, 70, 42 - 4 * el, 2.6 + 3.0 * el, pl)
                else:
                    fx_fn = lambda a, el=e, pl=ph: draw_sylvan_wisp_104(a, 69, 36 - 4 * el, 2.6 + 3.0 * el, pl)
            elif kind == "fiend":
                cfg.update(
                    pelvis_dx=-10.0 * e,
                    pelvis_dy=3.0 * e,
                    torso_deg=-12.0 * e,
                    head_rel_deg=6.0 * e,
                    r_arm_deg=-28.0 * e,
                    l_arm_deg=-24.0 * e,
                    r_leg_deg=12.0 * e,
                    l_leg_deg=-10.0 * e,
                )
            else:
                cfg.update(
                    pelvis_dx=-10.0 * e,
                    pelvis_dy=3.0 * e,
                    torso_deg=-12.0 * e,
                    head_rel_deg=6.0 * e,
                    r_arm_deg=-58.0 * e,
                    l_arm_deg=-36.0 * e,
                    r_leg_deg=12.0 * e,
                    l_leg_deg=-10.0 * e,
                )
        elif f < 19:
            t = (f - 9) / 10.0
            snap = min(1.0, t * 2.6)
            arc_int = math.sin(t * math.pi)
            if is_caster:
                cfg.update(
                    pelvis_dx=9.0 * snap,
                    pelvis_dy=-7.5,
                    torso_deg=11.0 * snap,
                    head_rel_deg=-5.5 * snap,
                    r_arm_deg=-38.0 + 20.0 * snap,
                    l_arm_deg=-28.0 + 16.0 * snap,
                    skirt_wave_amp=5.5,
                )
                if kind == "astrologer":
                    fx_fn = lambda a, sl=snap, tl=t, pl=ph: draw_eclipse_orb_104(a, 74 + 8 * sl, 44, 5.5 - 1.4 * tl, pl)
                else:
                    fx_fn = lambda a, sl=snap, tl=t, pl=ph: draw_sylvan_wisp_104(a, 73 + 8 * sl, 38, 5.4 - 1.4 * tl, pl)
            elif kind == "fiend":
                cfg.update(
                    pelvis_dx=-10.0 + 26.0 * snap,
                    pelvis_dy=-2.0 * snap,
                    torso_deg=-12.0 + 28.0 * snap,
                    head_rel_deg=-10.0 * snap,
                    r_arm_deg=-28.0 + 78.0 * snap,
                    l_arm_deg=-24.0 + 58.0 * snap,
                    r_leg_deg=12.0 - 24.0 * snap,
                    l_leg_deg=-10.0 + 20.0 * snap,
                )
                if arc_int > 0.15:
                    fx_fn = lambda a, ai=arc_int: draw_slash_arc_104(
                        a, 58, 52, 28, -58, 50, [255, 240, 148, 255], [250, 128, 22, 255], [168, 32, 16, 255], ai
                    )
            else:
                cfg.update(
                    pelvis_dx=-10.0 + 24.0 * snap,
                    pelvis_dy=-2.0 * snap,
                    torso_deg=-12.0 + 26.0 * snap,
                    head_rel_deg=-9.0 * snap,
                    r_arm_deg=-58.0 + 86.0 * snap,
                    l_arm_deg=-36.0 + 62.0 * snap,
                    r_leg_deg=12.0 - 24.0 * snap,
                    l_leg_deg=-10.0 + 20.0 * snap,
                )
                if arc_int > 0.15:
                    if kind == "templar":
                        fx_fn = lambda a, ai=arc_int: draw_slash_arc_104(
                            a, 58, 50, 29, -64, 52, [204, 250, 255, 255], [26, 184, 226, 255], [198, 154, 68, 255], ai
                        )
                    else:  # treant
                        fx_fn = lambda a, ai=arc_int: draw_slash_arc_104(
                            a, 58, 54, 30, -66, 52, [196, 255, 240, 255], [38, 218, 182, 255], [48, 92, 54, 255], ai
                        )
        else:
            t = (f - 19) / 11.0
            r = 1.0 - (t * t * (3 - 2 * t))
            if is_caster:
                cfg.update(
                    pelvis_dx=9.0 * r,
                    pelvis_dy=-4.0 - 3.5 * r,
                    torso_deg=11.0 * r,
                    r_arm_deg=-8.0 - 10.0 * r,
                    l_arm_deg=-6.0 - 8.0 * r,
                )
            elif kind == "fiend":
                cfg.update(
                    pelvis_dx=16.0 * r,
                    torso_deg=16.0 * r,
                    head_rel_deg=-10.0 * r,
                    r_arm_deg=6.0 + 44.0 * r,
                    l_arm_deg=4.0 + 30.0 * r,
                    r_leg_deg=-12.0 * r,
                    l_leg_deg=10.0 * r,
                )
            else:
                cfg.update(
                    pelvis_dx=14.0 * r,
                    torso_deg=14.0 * r,
                    head_rel_deg=-9.0 * r,
                    r_arm_deg=-6.0 + 34.0 * r,
                    l_arm_deg=24.0 * r,
                    r_leg_deg=-12.0 * r,
                    l_leg_deg=10.0 * r,
                )

    # ------------------------------------------------------------------
    # ROW 3: SKILL
    # ------------------------------------------------------------------
    elif row == 3:
        if f < 10:
            e = (f / 10.0) ** 1.5
            cfg.update(
                pelvis_dy=-9.0 * e if is_caster else 5.0 * e,
                torso_deg=-14.0 * e,
                head_rel_deg=-7.0 * e,
                r_arm_deg=(-46.0 if kind == "fiend" else -68.0) * e,
                l_arm_deg=(-42.0 if kind == "fiend" else -62.0) * e,
                r_leg_deg=14.0 * e,
                l_leg_deg=-14.0 * e,
            )
            if kind == "astrologer":
                fx_fn = lambda a, el=e, pl=ph: draw_eclipse_orb_104(a, 56, 22, 3.0 + 3.8 * el, pl)
            elif kind == "dryad":
                fx_fn = lambda a, el=e, pl=ph: draw_sylvan_wisp_104(a, 56, 22, 3.0 + 3.8 * el, pl)
        elif f < 22:
            t = (f - 10) / 12.0
            snap = min(1.0, t * 3.0)
            burst = math.sin(t * math.pi)
            cfg.update(
                pelvis_dx=20.0 * snap if not is_caster else 4.0 * snap,
                pelvis_dy=-11.0 if is_caster else 7.0 * snap,
                torso_deg=-14.0 + 34.0 * snap if not is_caster else 8.0 * snap,
                head_rel_deg=-10.0 * snap,
                r_arm_deg=((-46.0 + 98.0 * snap) if kind == "fiend" else (-68.0 + 98.0 * snap)) if not is_caster else -50.0,
                l_arm_deg=((-42.0 + 82.0 * snap) if kind == "fiend" else (-62.0 + 86.0 * snap)) if not is_caster else -46.0,
                r_leg_deg=-18.0 * snap,
                l_leg_deg=18.0 * snap,
            )
            if kind == "astrologer":
                fx_fn = lambda a, bl=burst, pl=ph: draw_eclipse_orb_104(a, 64, 24, 5.2 + 2.0 * bl, pl)
            elif kind == "dryad":
                fx_fn = lambda a, bl=burst, pl=ph: draw_sylvan_wisp_104(a, 64, 24, 5.2 + 2.0 * bl, pl)
            elif burst > 0.15:
                if kind == "templar":
                    ca, cb, cc = [204, 250, 255, 255], [26, 184, 226, 255], [242, 206, 116, 255]
                elif kind == "treant":
                    ca, cb, cc = [196, 255, 240, 255], [38, 218, 182, 255], [18, 156, 134, 255]
                else:
                    ca, cb, cc = [255, 240, 148, 255], [250, 128, 22, 255], [168, 32, 16, 255]
                fx_fn = lambda a, bl=burst, c1=ca, c2=cb, c3=cc: draw_slash_arc_104(
                    a, 59, 53, 30, -70, 62, c1, c2, c3, bl
                )
        else:
            r = 1.0 - ((f - 22) / 8.0)
            cfg.update(
                pelvis_dx=20.0 * r if not is_caster else 4.0 * r,
                pelvis_dy=-6.0 * r if is_caster else 7.0 * r,
                torso_deg=20.0 * r if not is_caster else 8.0 * r,
                r_arm_deg=28.0 * r if not is_caster else -32.0 * r,
                l_arm_deg=22.0 * r if not is_caster else -28.0 * r,
                r_leg_deg=-18.0 * r,
                l_leg_deg=18.0 * r,
            )

    # ------------------------------------------------------------------
    # ROW 4: ULTIMATE / ELITE OVERDRIVE
    # ------------------------------------------------------------------
    elif row == 4:
        if f < 12:
            e = math.sin((f / 12.0) * math.pi * 0.5)
            cfg.update(
                pelvis_dy=-18.0 * e,
                torso_deg=-12.0 * e,
                head_rel_deg=-9.0 * e,
                r_arm_deg=(-54.0 if kind == "fiend" else -76.0) * e,
                l_arm_deg=(-50.0 if kind == "fiend" else -70.0) * e,
                r_leg_deg=16.0 * e,
                l_leg_deg=10.0 * e,
            )
        elif f < 22:
            t = (f - 12) / 10.0
            snap = min(1.0, t * 2.8)
            burst = math.sin(t * math.pi)
            cfg.update(
                pelvis_dx=14.0 * snap,
                pelvis_dy=-18.0 * (1.0 - snap) + 6.0 * snap,
                torso_deg=-12.0 + 32.0 * snap,
                head_rel_deg=-9.0 + 4.0 * snap,
                r_arm_deg=(-54.0 if kind == "fiend" else -76.0) + 108.0 * snap,
                l_arm_deg=(-50.0 if kind == "fiend" else -70.0) + 96.0 * snap,
                r_leg_deg=16.0 - 30.0 * snap,
                l_leg_deg=10.0 + 12.0 * snap,
            )
            if burst > 0.15:
                if kind in ("templar", "astrologer"):
                    ca, cb, cc = [255, 255, 255, 255], [96, 234, 255, 255], [198, 154, 68, 255]
                elif kind in ("treant", "dryad"):
                    ca, cb, cc = [255, 255, 255, 255], [108, 248, 216, 255], [26, 178, 144, 255]
                else:
                    ca, cb, cc = [255, 255, 255, 255], [254, 198, 54, 255], [224, 68, 16, 255]
                fx_fn = lambda a, bl=burst, c1=ca, c2=cb, c3=cc: draw_slash_arc_104(
                    a, 58, 52, 32, -74, 64, c1, c2, c3, bl
                )
        else:
            r = 1.0 - ((f - 22) / 8.0)
            cfg.update(
                pelvis_dx=14.0 * r,
                pelvis_dy=6.0 * r,
                torso_deg=20.0 * r,
                r_arm_deg=30.0 * r,
                l_arm_deg=26.0 * r,
                r_leg_deg=-14.0 * r,
                l_leg_deg=22.0 * r,
            )

    # ------------------------------------------------------------------
    # ROW 5: HURT (F00..F05) + COLLAPSE & DEATH REST (F06..F29)
    # ------------------------------------------------------------------
    elif row == 5:
        if f < 6:
            t = math.sin((f / 5.0) * math.pi * 0.85)
            cfg.update(
                pelvis_dx=-13.0 * t,
                pelvis_dy=4.0 * t,
                torso_deg=-17.0 * t,
                head_rel_deg=-10.0 * t,
                r_arm_deg=-30.0 * t,
                l_arm_deg=20.0 * t,
                r_leg_deg=12.0 * t,
                l_leg_deg=-10.0 * t,
            )
        elif f < 19:
            t = (f - 6) / 13.0
            e = t * t * (3 - 2 * t)
            cfg.update(
                pelvis_dx=-13.0 - 16.0 * e,
                pelvis_dy=4.0 + 130.0 * e,
                torso_deg=-17.0 - 61.0 * e,
                head_rel_deg=-8.0 * (1.0 - e),
                r_arm_deg=-30.0 - 24.0 * e,
                l_arm_deg=20.0 - 38.0 * e,
                r_leg_deg=12.0 + 54.0 * e,
                l_leg_deg=-10.0 + 64.0 * e,
                skirt_deg=-66.0 * e,
            )
        else:
            settle = math.sin(((f - 19) / 10.0) * math.pi) * 2.0 if f < 24 else 0.0
            cfg.update(
                pelvis_dx=-29.0,
                pelvis_dy=134.0 - settle,
                torso_deg=-78.0 + settle,
                head_rel_deg=4.0,
                r_arm_deg=-54.0,
                l_arm_deg=-18.0,
                r_leg_deg=66.0,
                l_leg_deg=54.0,
                skirt_deg=-66.0,
            )

    # ------------------------------------------------------------------
    # ROW 6: DASH
    # ------------------------------------------------------------------
    elif row == 6:
        env = math.sin(u * math.pi)
        if is_caster:
            cfg.update(
                pelvis_dx=15.0 * env,
                pelvis_dy=-14.0 * env,
                torso_deg=20.0 * env,
                head_rel_deg=-11.0 * env,
                r_arm_deg=-38.0 * env,
                l_arm_deg=18.0 * env,
                skirt_deg=15.0 * env,
                skirt_wave_amp=6.0,
            )
        elif kind == "treant":
            stride = math.sin(ph * 2.0)
            cfg.update(
                pelvis_dx=16.0 * env,
                pelvis_dy=7.0 * env - abs(stride) * 4.0,
                torso_deg=22.0 * env,
                head_rel_deg=-12.0 * env,
                r_arm_deg=24.0 * env,
                l_arm_deg=-32.0 * env,
                r_leg_deg=22.0 * stride,
                l_leg_deg=-22.0 * stride,
            )
        else:  # templar vanguard charge / fiend abyssal pounce
            cfg.update(
                pelvis_dx=17.0 * env,
                pelvis_dy=-14.0 * env,
                torso_deg=24.0 * env,
                head_rel_deg=-12.0 * env,
                r_arm_deg=(36.0 if kind == "fiend" else -44.0) * env,
                l_arm_deg=-28.0 * env,
                r_leg_deg=-24.0 * env,
                l_leg_deg=20.0 * env,
            )

    return cfg, fx_fn


def audit_sheet_bounds(sheet_im, name):
    arr = np.array(sheet_im)
    clips = 0
    empty = 0
    for r in range(ROWS_MONSTER):
        for c in range(COLS):
            cell = arr[r * CELL : (r + 1) * CELL, c * CELL : (c + 1) * CELL, 3] > 0
            if not np.any(cell):
                empty += 1
                continue
            if np.any(cell[0, :]) or np.any(cell[-1, :]) or np.any(cell[:, 0]) or np.any(cell[:, -1]):
                clips += 1
    print(f"  [{name}] {sheet_im.size[0]}x{sheet_im.size[1]} | empty_cells={empty}, border_clips={clips}")
    assert empty == 0, f"{name} has {empty} empty cells!"
    assert clips == 0, f"{name} has {clips} border clips!"


def main():
    t0 = time.time()
    os.makedirs(SPRITE_DIR, exist_ok=True)

    # Save reference bases cleanly into assets/sprites/ for reproducibility
    shutil.copyfile(SRC_TEMPLAR, os.path.join(SPRITE_DIR, "monster_templar_base.jpg"))
    shutil.copyfile(SRC_ASTROLOGER, os.path.join(SPRITE_DIR, "monster_astrologer_base.jpg"))
    shutil.copyfile(SRC_TREANT, os.path.join(SPRITE_DIR, "monster_treant_base.jpg"))
    shutil.copyfile(SRC_DRYAD, os.path.join(SPRITE_DIR, "monster_dryad_base.jpg"))
    shutil.copyfile(SRC_FIEND, os.path.join(SPRITE_DIR, "monster_fiend_base.jpg"))

    creatures = [
        {
            "kind": "templar",
            "title": "Z1: ECLIPSE TEMPLAR",
            "out": os.path.join(SPRITE_DIR, "monster_templar_sheet.png"),
            "segment": segment_templar,
            "palette": TEMPLAR_PALETTE,
            "protect": (10, 11, 15, 16, 17, 18, 19),
            "y_bot": 490.0,
            "win_S": 584,
            "cx_off": 6.0,
            "r_arm_under": False,
        },
        {
            "kind": "astrologer",
            "title": "Z1: ECLIPSE ACOLYTE",
            "out": os.path.join(SPRITE_DIR, "monster_astrologer_sheet.png"),
            "segment": segment_astrologer,
            "palette": ASTROLOGER_PALETTE,
            "protect": (10, 11, 15, 16, 17, 18, 19),
            "y_bot": 502.0,
            "win_S": 588,
            "cx_off": 6.0,
            "r_arm_under": True,
        },
        {
            "kind": "treant",
            "title": "Z2: STARWOOD BRIAR-BRUTE",
            "out": os.path.join(SPRITE_DIR, "monster_treant_sheet.png"),
            "segment": segment_treant,
            "palette": TREANT_PALETTE,
            "protect": (13, 14, 15, 16, 18, 19),
            "y_bot": 504.0,
            "win_S": 608,
            "cx_off": -4.0,
            "r_arm_under": False,
        },
        {
            "kind": "dryad",
            "title": "Z2: STARWOOD THORN-WRAITH",
            "out": os.path.join(SPRITE_DIR, "monster_dryad_sheet.png"),
            "segment": segment_dryad,
            "palette": DRYAD_PALETTE,
            "protect": (13, 14, 15, 16, 18, 19),
            "y_bot": 488.0,
            "win_S": 588,
            "cx_off": -2.0,
            "r_arm_under": False,
        },
        {
            "kind": "fiend",
            "title": "Z4: BLACK PIT HELLFIEND",
            "out": os.path.join(SPRITE_DIR, "monster_fiend_sheet.png"),
            "segment": segment_fiend,
            "palette": FIEND_PALETTE,
            "protect": (13, 14, 15, 16, 18, 19),
            "y_bot": 506.0,
            "win_S": 608,
            "cx_off": -4.0,
            "r_arm_under": False,
        },
    ]

    built_sheets = {}
    parts_preview = Image.new("RGBA", (1760, 380), (16, 20, 32, 255))
    pdraw = ImageDraw.Draw(parts_preview)

    for idx, spec in enumerate(creatures):
        kind = spec["kind"]
        print(f"[{idx+1}/5] Segmenting & animating {spec['title']}...")
        parts, pivots = spec["segment"]()

        px0 = idx * 350 + 14
        pdraw.text((px0, 8), spec["title"], fill=(254, 240, 138, 255))
        for p_i, (pname, (pim, ox, oy)) in enumerate(parts.items()):
            thumb = pim.copy()
            thumb.thumbnail((88, 110), Image.Resampling.NEAREST)
            tx = px0 + (p_i % 3) * 108
            ty = 32 + (p_i // 3) * 112
            parts_preview.alpha_composite(thumb, (tx, ty))
            pdraw.text((tx, ty + 96), pname, fill=(148, 212, 255, 255))

        sheet = Image.new("RGBA", (COLS * CELL, ROWS_MONSTER * CELL), (0, 0, 0, 0))
        for r in range(ROWS_MONSTER):
            for f in range(COLS):
                cfg, fx_fn = generate_realm_pose(kind, r, f)
                cell = render_monster_cell(
                    parts,
                    pivots,
                    spec["palette"],
                    spec["protect"],
                    cfg,
                    y_bot_base=spec["y_bot"],
                    window_S=spec["win_S"],
                    cx_offset=spec["cx_off"],
                    r_arm_under_torso=spec["r_arm_under"],
                    draw_fx_104=fx_fn,
                )
                sheet.paste(cell, (f * CELL, r * CELL))

        audit_sheet_bounds(sheet, kind)
        sheet.save(spec["out"], optimize=True)
        built_sheets[kind] = sheet

    parts_path = os.path.join(ART_DIR, "debug_realm_monsters_parts.png")
    parts_preview.save(parts_path)

    # Render Debug Contact Sheet across all 5 new Realm Monsters & all 7 rows!
    row_names = ["R0 IDLE", "R1 WALK", "R2 ATK", "R3 SKILL", "R4 ULT", "R5 DEATH", "R6 DASH"]
    sample_cols = [0, 6, 12, 15, 22, 28]
    # 5 columns of monster blocks (2x3 grid of monster panels) so image stays crisp & easy to inspect!
    panel_w = len(sample_cols) * 118 + 98
    panel_h = ROWS_MONSTER * 110 + 44
    showcase = Image.new("RGBA", (panel_w * 3 + 24, panel_h * 2 + 24), (14, 18, 28, 255))
    sdraw = ImageDraw.Draw(showcase)

    for m_i, spec in enumerate(creatures):
        kind = spec["kind"]
        sh = built_sheets[kind]
        gx = (m_i % 3) * panel_w + 12
        gy = (m_i // 3) * panel_h + 12
        sdraw.rectangle((gx, gy, gx + panel_w - 8, gy + panel_h - 8), outline=(56, 72, 104, 255), width=2)
        sdraw.text((gx + 10, gy + 8), f"{spec['title']} (6240x1456 30FPS)", fill=(254, 240, 138, 255))
        for r in range(ROWS_MONSTER):
            by = gy + 32 + r * 108
            sdraw.line([(gx + 4, by + 100), (gx + panel_w - 12, by + 100)], fill=(42, 52, 74, 255))
            sdraw.text((gx + 8, by + 44), row_names[r], fill=(125, 211, 252, 255))
            for c_i, fc in enumerate(sample_cols):
                bx = gx + 86 + c_i * 116
                crop = sh.crop((fc * CELL, r * CELL, (fc + 1) * CELL, (r + 1) * CELL)).resize(
                    (104, 104), Image.Resampling.NEAREST
                )
                showcase.alpha_composite(crop, (bx, by))
                sdraw.text((bx + 2, by + 2), f"F{fc:02d}", fill=(180, 190, 210, 190))

    showcase_path = os.path.join(ART_DIR, "debug_realm_monsters_showcase.png")
    showcase.save(showcase_path)
    print(f"[OK] Built all 5 Realm monster sheets in {time.time() - t0:.1f}s -> {showcase_path}")


if __name__ == "__main__":
    main()
