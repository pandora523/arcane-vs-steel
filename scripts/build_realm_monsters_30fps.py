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

ART_DIR = os.environ.get("AVS_SCRATCH_DIR", "/tmp/avs_monster_debug")
SPRITE_DIR = os.path.join(ROOT_DIR, "assets", "sprites")

SRC_TEMPLAR = os.path.join(SPRITE_DIR, "monster_templar_base.jpg")
SRC_ASTROLOGER = os.path.join(SPRITE_DIR, "monster_astrologer_base.jpg")
SRC_TREANT = os.path.join(SPRITE_DIR, "monster_treant_base.jpg")
SRC_DRYAD = os.path.join(SPRITE_DIR, "monster_dryad_base.jpg")
SRC_FIEND = os.path.join(SPRITE_DIR, "monster_fiend_base.jpg")

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


def draw_spark_plus_104(arr, cx, cy, core_col, rim_col, big=False):
    put_px(arr, cx, cy, core_col)
    if big:
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            put_px(arr, cx + dx, cy + dy, rim_col)


def draw_cel_smear_arc_104(
    arr,
    cx,
    cy,
    r_main,
    a_start_deg,
    a_end_deg,
    col_selout,
    col_outer,
    col_mid,
    col_core,
    intensity=1.0,
    max_thick=6.4,
    spark_col=None,
):
    """Multi-band 4-tone HD-2D cel crescent smear (Selout spine -> outer -> mid -> razor white edge + wake sparks)."""
    if intensity <= 0.05:
        return
    a0 = math.radians(a_start_deg)
    a1 = math.radians(a_end_deg)
    steps = 96
    pts_outer = []
    pts_mid = []
    pts_core = []
    pts_selout = []

    for i in range(steps + 1):
        t = i / steps
        ang = a0 + (a1 - a0) * t
        env = math.sin(t * math.pi)
        thick = max(1.4, max_thick * (0.30 + 0.70 * env) * intensity)
        c, s = math.cos(ang), math.sin(ang)
        n_samples = max(4, int(thick * 3.0) + 2)
        for dr in np.linspace(-thick, thick * 0.85, n_samples):
            rr = r_main + dr
            px = cx + c * rr
            py = cy + s * rr
            if px > 96 or px < 6 or py > 96 or py < 6:
                continue
            rel = dr / max(0.5, thick)
            if rel < -0.62:
                pts_selout.append((px, py))
            elif rel < 0.0:
                pts_outer.append((px, py))
            elif rel < 0.44:
                pts_mid.append((px, py))
            else:
                pts_core.append((px, py))

    # Paint in strict painter order so bright razor edge never gets overwritten by selout!
    for px, py in pts_selout:
        put_px(arr, px, py, col_selout)
    for px, py in pts_outer:
        put_px(arr, px, py, col_outer)
    for px, py in pts_mid:
        put_px(arr, px, py, col_mid)
    for px, py in pts_core:
        put_px(arr, px, py, col_core)

    # Trailing pixel sparks behind the arc
    s_col = spark_col or col_mid
    for k in range(5):
        ut = 0.14 + k * 0.18
        ang = a0 + (a1 - a0) * ut
        rr = r_main - max_thick * (0.85 + 0.35 * (k % 2))
        sx = cx + math.cos(ang) * rr
        sy = cy + math.sin(ang) * rr
        if 8 <= sx <= 94 and 8 <= sy <= 94:
            draw_spark_plus_104(arr, sx, sy, col_core, s_col, big=(k % 2 == 0 and intensity > 0.55))


def draw_templar_idle_runes_104(arr, phase, is_walk=False):
    C_OUT = [8, 11, 18, 255]
    C_CYAN = [96, 234, 255, 255]
    C_GOLD = [242, 206, 116, 255]
    C_WHT = [255, 255, 255, 255]
    bob = math.sin(phase) * (2.2 if is_walk else 1.5)
    gx, gy = 67.0 + (2.0 * math.cos(phase) if is_walk else 0.0), 42.0 + bob
    draw_spark_plus_104(arr, gx, gy, C_WHT, C_CYAN, big=(math.sin(phase * 2.0) > 0.0))
    for k in range(3):
        ang = phase * 1.4 + k * 2.094
        rx = gx + math.cos(ang) * 5.2
        ry = gy + math.sin(ang) * 4.2 - k * 2.5
        put_px(arr, rx - 1, ry, C_OUT)
        put_px(arr, rx, ry, C_GOLD if k == 0 else C_CYAN)


def draw_eclipse_orb_104(arr, cx, cy, r, phase, cast_burst=0.0):
    """Enlarged Solar-Gold & Astral-Cyan Double-Ring Astrolabe Orb for Zone I Eclipse Acolyte."""
    if r <= 0.6:
        return
    C_VOID = [7, 10, 18, 255]
    C_GOLD = [240, 204, 118, 255]
    C_CYAN = [32, 192, 234, 255]
    C_HOT = [214, 252, 255, 255]
    C_WHT = [255, 255, 255, 255]
    ir = int(math.ceil(r + 2))
    for dy in range(-ir, ir + 1):
        for dx in range(-ir, ir + 1):
            d = math.hypot(dx, dy)
            if d > r + 1.0:
                continue
            if d > r - 0.15:
                put_px(arr, cx + dx, cy + dy, C_VOID)
            elif d > r - 1.1:
                put_px(arr, cx + dx, cy + dy, C_GOLD if (dx + dy) % 2 == 0 else C_CYAN)
            elif d > r * 0.45:
                put_px(arr, cx + dx, cy + dy, C_HOT if d > r * 0.68 else C_CYAN)
            else:
                put_px(arr, cx + dx, cy + dy, C_WHT if cast_burst > 0.2 else C_GOLD)
    for k in range(4):
        ang = phase * 2.1 + k * (math.pi * 0.5)
        put_px(arr, cx + math.cos(ang) * (r + 2.4), cy + math.sin(ang) * (r + 1.8), C_GOLD if k % 2 == 0 else C_HOT)
    if cast_burst > 0.18:
        ray = int(round(3 + 5 * cast_burst))
        for d in range(2, ray + 1):
            col = C_WHT if d < ray * 0.55 else C_GOLD
            put_px(arr, cx + d + r * 0.5, cy, col)
            put_px(arr, cx - d - r * 0.5, cy, col)
            put_px(arr, cx, cy + d + r * 0.5, C_CYAN)
            put_px(arr, cx, cy - d - r * 0.5, C_CYAN)


def draw_sylvan_wisp_104(arr, cx, cy, r, phase, cast_burst=0.0, orbit_twin=False):
    """Mint-Emerald Sylvan Star-Wisp + Optional Orbiting Secondary Briar-Wisp for Zone II Thorn-Wraith."""
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
            if d > r + 0.9:
                continue
            if d > r - 0.15:
                put_px(arr, cx + dx, cy + dy, C_OUT)
            elif d > r - 1.0:
                put_px(arr, cx + dx, cy + dy, C_DEEP if (dx + dy) % 2 else C_LEAF)
            elif d > r * 0.42:
                put_px(arr, cx + dx, cy + dy, C_MINT)
            else:
                put_px(arr, cx + dx, cy + dy, C_WHT)
    for k in range(3):
        ang = -phase * 2.0 + k * (2.0 * math.pi / 3.0)
        put_px(arr, cx + math.cos(ang) * (r + 2.5), cy + math.sin(ang) * (r + 1.8), C_LEAF if k % 2 else C_MINT)
    if orbit_twin:
        tx = 32.0 + math.cos(phase) * 9.0
        ty = 40.0 + math.sin(phase * 1.5) * 4.5
        draw_spark_plus_104(arr, tx, ty, C_WHT, C_MINT, big=True)
        put_px(arr, tx - 2, ty + 1, C_LEAF)
    if cast_burst > 0.18:
        ray = int(round(3 + 5 * cast_burst))
        for d in range(2, ray + 1):
            col = C_WHT if d < ray * 0.5 else C_MINT
            put_px(arr, cx + d + r * 0.5, cy, col)
            put_px(arr, cx - d - r * 0.5, cy, col)
            put_px(arr, cx, cy + d + r * 0.5, C_LEAF)
            put_px(arr, cx, cy - d - r * 0.5, C_LEAF)


def draw_treant_spores_104(arr, phase):
    C_OUT = [8, 12, 12, 255]
    C_MINT = [108, 248, 216, 255]
    C_LEAF = [148, 232, 174, 255]
    C_WHT = [255, 255, 255, 255]
    # Pulsing chest crystal center
    draw_spark_plus_104(arr, 56, 44, C_WHT, C_MINT, big=(math.sin(phase * 2.0) > -0.1))
    for k in range(3):
        u_s = (phase / (2.0 * math.pi) + k * 0.33) % 1.0
        sx = 38.0 + k * 14.0 + math.sin(phase * 1.8 + k) * 3.0
        sy = 54.0 - u_s * 24.0
        put_px(arr, sx, sy + 1, C_OUT)
        put_px(arr, sx, sy, C_LEAF if k % 2 else C_MINT)


def draw_fiend_embers_104(arr, phase):
    C_OUT = [8, 7, 12, 255]
    C_ORG = [250, 128, 22, 255]
    C_GLD = [254, 198, 54, 255]
    C_WHT = [255, 255, 255, 255]
    # Twin crackling hellfire claw sparks + rising brimstone motes
    for cx, cy, ph_off in ((38, 52, 0.0), (70, 50, 1.6)):
        draw_spark_plus_104(arr, cx, cy + math.sin(phase + ph_off) * 2.0, C_WHT, C_ORG, big=(math.sin(phase * 2 + ph_off) > 0))
    for k in range(3):
        u_s = (phase / (2.0 * math.pi) + k * 0.34) % 1.0
        sx = 40.0 + k * 12.0 + math.cos(phase * 2.0 + k) * 3.2
        sy = 58.0 - u_s * 26.0
        put_px(arr, sx, sy + 1, C_OUT)
        put_px(arr, sx, sy, C_GLD if k == 1 else C_ORG)


def draw_lance_thrust_104(arr, ox, oy, intensity):
    """Horizontal Solar-Cyan Eclipse Lance-Thrust with twin shock-rings for Templar Row 3 SKILL."""
    if intensity <= 0.12:
        return
    C_OUT = [8, 11, 18, 255]
    C_GOLD = [242, 206, 116, 255]
    C_CYAN = [26, 184, 226, 255]
    C_HOT = [96, 234, 255, 255]
    C_WHT = [255, 255, 255, 255]
    length = int(round(18 + 30 * intensity))
    x_end = min(94, ox + length)
    # Cross hilt flare
    for dy in range(-5, 6):
        put_px(arr, ox + 2, oy + dy, C_OUT if abs(dy) == 5 else C_GOLD)
    # Lance beam body
    for x in range(ox, x_end + 1):
        u = (x - ox) / max(1, x_end - ox)
        half_h = 3 if u < 0.72 else (2 if u < 0.90 else 1)
        put_px(arr, x, oy - half_h - 1, C_OUT)
        put_px(arr, x, oy + half_h + 1, C_OUT)
        for dy in range(-half_h, half_h + 1):
            col = C_WHT if abs(dy) == 0 else (C_HOT if abs(dy) == 1 else C_CYAN)
            put_px(arr, x, oy + dy, col)
    # Twin vertical shock rings
    for rx, ry_rad in ((ox + int(length * 0.35), 9), (ox + int(length * 0.68), 6)):
        if rx <= 93:
            for dy in range(-ry_rad, ry_rad + 1):
                put_px(arr, rx - 1, oy + dy, C_GOLD if abs(dy) > ry_rad - 2 else C_HOT)


def draw_ground_slam_crest_104(arr, cx, cy, col_selout, col_outer, col_mid, col_core, intensity):
    """Earthshaker ground shock-bar + 3 erupting crystal/magma spire teeth inside [14..94]."""
    if intensity <= 0.12:
        return
    half_w = int(round(14 + 18 * intensity))
    for dx in range(-half_w, half_w + 1):
        px = cx + dx
        if 8 <= px <= 94:
            put_px(arr, px, cy + 2, col_selout)
            put_px(arr, px, cy + 1, col_outer)
            put_px(arr, px, cy, col_core if abs(dx) < half_w * 0.45 else col_mid)
    for sp_off, sp_h in ((-14, 10), (0, 14), (14, 11)):
        sx = cx + sp_off
        h = max(3, int(round(sp_h * intensity)))
        for row in range(1, h + 1):
            w_row = max(1, int(round((1.0 - row / (h + 1.0)) * 3.5)))
            for wx in range(-w_row, w_row + 1):
                px = sx + wx
                py = cy - row
                if 8 <= px <= 94 and 8 <= py <= 95:
                    if abs(wx) == w_row:
                        put_px(arr, px, py, col_selout)
                    elif abs(wx) <= 1 and row > 2:
                        put_px(arr, px, py, col_core)
                    else:
                        put_px(arr, px, py, col_mid if row > h * 0.35 else col_outer)


def draw_twin_rake_104(arr, cx, cy, col_selout, col_outer, col_mid, col_core, intensity):
    """Twin parallel Hellfire Claw Rake smears for Zone IV Fiend Row 3 SKILL."""
    if intensity <= 0.12:
        return
    draw_cel_smear_arc_104(arr, cx, cy - 6, 26, -54, 42, col_selout, col_outer, col_mid, col_core, intensity, 4.6)
    draw_cel_smear_arc_104(arr, cx + 3, cy + 6, 25, -48, 52, col_selout, col_outer, col_mid, col_core, intensity, 4.4)


def draw_caster_mandala_104(arr, cx, cy, r, col_selout, col_ring, col_mid, col_core, phase, intensity):
    """Concentric Crown Sigil Mandala + 4 cardinal pixel rays for Casters Row 3/4."""
    if intensity <= 0.12:
        return
    rr = r * (0.65 + 0.35 * intensity)
    ir = int(math.ceil(rr + 2))
    for dy in range(-ir, ir + 1):
        for dx in range(-ir, ir + 1):
            d = math.hypot(dx, dy)
            if d > rr + 0.9:
                continue
            if d > rr - 0.3:
                put_px(arr, cx + dx, cy + dy, col_selout)
            elif d > rr - 1.5:
                ang = math.atan2(dy, dx) + phase * 1.8
                put_px(arr, cx + dx, cy + dy, col_ring if int(ang * 4) % 2 == 0 else col_mid)
            elif d > rr * 0.42:
                put_px(arr, cx + dx, cy + dy, col_mid)
            else:
                put_px(arr, cx + dx, cy + dy, col_core)
    ray_len = int(round(4 + 5 * intensity))
    for k in range(4):
        ang = phase * 1.2 + k * (math.pi * 0.5)
        for s in range(1, ray_len + 1):
            px = cx + math.cos(ang) * (rr + s)
            py = cy + math.sin(ang) * (rr + s)
            put_px(arr, px, py, col_core if s < ray_len * 0.5 else col_ring)


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
    # ROW 0: IDLE (Expressive Breathing Stance & Living Biome Focal Glows)
    # ------------------------------------------------------------------
    if row == 0:
        b = math.sin(ph)
        b2 = math.sin(ph - 0.7)
        if kind == "astrologer":
            cfg.update(
                pelvis_dy=-6.0 + 7.8 * b,
                torso_deg=4.2 * b,
                head_rel_deg=-3.2 * b2,
                r_arm_deg=-12.0 + 13.5 * b2,
                l_arm_deg=-10.0 - 12.5 * b,
                skirt_wave_amp=6.4,
            )
            fx_fn = lambda a, bl=b, pl=ph: draw_eclipse_orb_104(a, 74, 48 + bl * 2.2, 4.2, pl)
        elif kind == "dryad":
            cfg.update(
                pelvis_dy=-6.5 + 8.4 * b,
                torso_deg=4.4 * b,
                head_rel_deg=-3.4 * b2,
                r_arm_deg=-8.0 + 14.0 * b2,
                l_arm_deg=-8.0 - 12.0 * b,
                skirt_wave_amp=6.8,
            )
            fx_fn = lambda a, bl=b, pl=ph: draw_sylvan_wisp_104(a, 73, 40 + bl * 2.2, 4.0, pl, orbit_twin=True)
        elif kind == "treant":
            cfg.update(
                pelvis_dy=7.0 * b,
                torso_deg=3.0 + 5.2 * b,
                head_rel_deg=-3.4 * b2,
                r_arm_deg=-6.0 + 12.5 * b2,
                l_arm_deg=5.0 - 11.5 * b,
            )
            fx_fn = lambda a, pl=ph: draw_treant_spores_104(a, pl)
        elif kind == "fiend":
            cfg.update(
                pelvis_dy=8.2 * b,
                torso_deg=4.5 + 6.4 * b,
                head_rel_deg=-3.0 + 4.2 * b2,
                r_arm_deg=8.0 + 16.0 * b2,
                l_arm_deg=6.0 - 14.0 * b,
            )
            fx_fn = lambda a, pl=ph: draw_fiend_embers_104(a, pl)
        else:  # templar
            cfg.update(
                pelvis_dy=7.2 * b,
                torso_deg=2.8 + 5.4 * b,
                head_rel_deg=-2.4 + 3.8 * b2,
                r_arm_deg=-8.0 + 13.0 * b2,
                l_arm_deg=6.0 - 11.5 * b,
            )
            fx_fn = lambda a, pl=ph: draw_templar_idle_runes_104(a, pl, is_walk=False)

    # ------------------------------------------------------------------
    # ROW 1: WALK (Energetic Bipedal Stride & Billowing Caster Glide)
    # ------------------------------------------------------------------
    elif row == 1:
        s = math.sin(ph)
        bounce = -abs(math.cos(ph)) * 8.5
        if is_caster:
            cfg.update(
                pelvis_dx=4.5,
                pelvis_dy=-7.5 + 6.8 * s,
                torso_deg=9.5 + 3.5 * s,
                head_rel_deg=-4.8,
                r_arm_deg=-22.0 + 14.0 * s,
                l_arm_deg=-14.0 - 12.0 * s,
                skirt_deg=7.5 + 3.2 * s,
                skirt_wave_amp=7.6,
            )
            if kind == "astrologer":
                fx_fn = lambda a, sl=s, pl=ph: (
                    draw_eclipse_orb_104(a, 76, 46 + sl * 1.5, 4.3, pl),
                    draw_spark_plus_104(a, 24 + (int(pl * 4) % 8), 72 - (int(pl * 6) % 10), [214, 252, 255, 255], [240, 204, 118, 255], True),
                )
            else:
                fx_fn = lambda a, sl=s, pl=ph: draw_sylvan_wisp_104(a, 75, 38 + sl * 1.5, 4.1, pl, orbit_twin=True)
        else:
            leg_amp = 30.0 if kind == "fiend" else (26.0 if kind == "templar" else 24.0)
            arm_amp = 26.0 if kind == "fiend" else 22.0
            lean = 12.5 if kind == "fiend" else (9.0 if kind == "templar" else 8.0)
            r_base = 10.0 if kind == "fiend" else -10.0
            cfg.update(
                pelvis_dy=bounce,
                torso_deg=lean + 3.2 * math.sin(ph * 2),
                head_rel_deg=-lean * 0.45,
                r_leg_deg=leg_amp * s,
                l_leg_deg=-leg_amp * s,
                r_arm_deg=r_base - arm_amp * s,
                l_arm_deg=-6.0 + arm_amp * s,
            )
            if kind == "templar":
                fx_fn = lambda a, pl=ph: draw_templar_idle_runes_104(a, pl, is_walk=True)
            elif kind == "treant":
                fx_fn = lambda a, pl=ph: draw_treant_spores_104(a, pl)
            else:
                fx_fn = lambda a, pl=ph: draw_fiend_embers_104(a, pl)

    # ------------------------------------------------------------------
    # ROW 2: AUTO_ATTACK (Deep Coil -> Strike Lunge -> Multi-Tone Cel Smear)
    # ------------------------------------------------------------------
    elif row == 2:
        if f < 9:
            t = f / 9.0
            e = t * t * (3 - 2 * t)
            if is_caster:
                cfg.update(
                    pelvis_dy=-6.5 - 5.5 * e,
                    torso_deg=-8.5 * e,
                    r_arm_deg=-46.0 * e,
                    l_arm_deg=-34.0 * e,
                    skirt_wave_amp=5.8,
                )
                if kind == "astrologer":
                    fx_fn = lambda a, el=e, pl=ph: draw_eclipse_orb_104(a, 70, 42 - 5 * el, 3.2 + 3.4 * el, pl)
                else:
                    fx_fn = lambda a, el=e, pl=ph: draw_sylvan_wisp_104(a, 69, 36 - 5 * el, 3.2 + 3.2 * el, pl)
            elif kind == "fiend":
                cfg.update(
                    pelvis_dx=-15.0 * e,
                    pelvis_dy=5.0 * e,
                    torso_deg=-16.0 * e,
                    head_rel_deg=8.0 * e,
                    r_arm_deg=-36.0 * e,
                    l_arm_deg=-30.0 * e,
                    r_leg_deg=15.0 * e,
                    l_leg_deg=-13.0 * e,
                )
            else:
                cfg.update(
                    pelvis_dx=-15.0 * e,
                    pelvis_dy=5.0 * e,
                    torso_deg=-16.0 * e,
                    head_rel_deg=8.0 * e,
                    r_arm_deg=-68.0 * e,
                    l_arm_deg=-44.0 * e,
                    r_leg_deg=15.0 * e,
                    l_leg_deg=-13.0 * e,
                )
        elif f < 19:
            t = (f - 9) / 10.0
            snap = min(1.0, t * 2.6)
            arc_int = math.sin(t * math.pi)
            if is_caster:
                cfg.update(
                    pelvis_dx=12.0 * snap,
                    pelvis_dy=-9.0,
                    torso_deg=14.0 * snap,
                    head_rel_deg=-6.5 * snap,
                    r_arm_deg=-46.0 + 26.0 * snap,
                    l_arm_deg=-34.0 + 20.0 * snap,
                    skirt_wave_amp=6.8,
                )
                if kind == "astrologer":
                    fx_fn = lambda a, sl=snap, tl=t, ai=arc_int, pl=ph: draw_eclipse_orb_104(
                        a, 74 + 9 * sl, 44, 6.4 - 1.5 * tl, pl, cast_burst=ai
                    )
                else:
                    fx_fn = lambda a, sl=snap, tl=t, ai=arc_int, pl=ph: draw_sylvan_wisp_104(
                        a, 73 + 9 * sl, 38, 6.4 - 1.5 * tl, pl, cast_burst=ai
                    )
            elif kind == "fiend":
                cfg.update(
                    pelvis_dx=-15.0 + 32.0 * snap,
                    pelvis_dy=-3.0 * snap,
                    torso_deg=-16.0 + 34.0 * snap,
                    head_rel_deg=-12.0 * snap,
                    r_arm_deg=-36.0 + 92.0 * snap,
                    l_arm_deg=-30.0 + 68.0 * snap,
                    r_leg_deg=15.0 - 30.0 * snap,
                    l_leg_deg=-13.0 + 24.0 * snap,
                )
                if arc_int > 0.14:
                    fx_fn = lambda a, ai=arc_int: draw_cel_smear_arc_104(
                        a, 58, 52, 29, -62, 54, [8, 7, 12, 255], [168, 32, 16, 255], [250, 128, 22, 255], [255, 255, 255, 255], ai, 6.4, [254, 198, 54, 255]
                    )
            else:
                cfg.update(
                    pelvis_dx=-15.0 + 32.0 * snap,
                    pelvis_dy=-3.0 * snap,
                    torso_deg=-16.0 + 34.0 * snap,
                    head_rel_deg=-11.0 * snap,
                    r_arm_deg=-68.0 + 102.0 * snap,
                    l_arm_deg=-44.0 + 74.0 * snap,
                    r_leg_deg=15.0 - 30.0 * snap,
                    l_leg_deg=-13.0 + 24.0 * snap,
                )
                if arc_int > 0.14:
                    if kind == "templar":
                        fx_fn = lambda a, ai=arc_int: draw_cel_smear_arc_104(
                            a, 58, 50, 31, -68, 54, [8, 11, 18, 255], [198, 154, 68, 255], [26, 184, 226, 255], [255, 255, 255, 255], ai, 6.4, [242, 206, 116, 255]
                        )
                    else:  # treant
                        fx_fn = lambda a, ai=arc_int: draw_cel_smear_arc_104(
                            a, 58, 54, 31, -68, 54, [8, 12, 12, 255], [18, 156, 134, 255], [38, 218, 182, 255], [255, 255, 255, 255], ai, 6.8, [148, 232, 174, 255]
                        )
        else:
            t = (f - 19) / 11.0
            r = 1.0 - (t * t * (3 - 2 * t))
            if is_caster:
                cfg.update(
                    pelvis_dx=12.0 * r,
                    pelvis_dy=-5.0 - 4.0 * r,
                    torso_deg=14.0 * r,
                    r_arm_deg=-10.0 - 10.0 * r,
                    l_arm_deg=-8.0 - 8.0 * r,
                )
            elif kind == "fiend":
                cfg.update(
                    pelvis_dx=17.0 * r,
                    torso_deg=18.0 * r,
                    head_rel_deg=-12.0 * r,
                    r_arm_deg=8.0 + 48.0 * r,
                    l_arm_deg=5.0 + 33.0 * r,
                    r_leg_deg=-15.0 * r,
                    l_leg_deg=11.0 * r,
                )
            else:
                cfg.update(
                    pelvis_dx=17.0 * r,
                    torso_deg=18.0 * r,
                    head_rel_deg=-11.0 * r,
                    r_arm_deg=-8.0 + 42.0 * r,
                    l_arm_deg=30.0 * r,
                    r_leg_deg=-15.0 * r,
                    l_leg_deg=11.0 * r,
                )

    # ------------------------------------------------------------------
    # ROW 3: SKILL (Archetype-Distinct Signature Choreography!)
    # ------------------------------------------------------------------
    elif row == 3:
        if f < 10:
            e = (f / 10.0) ** 1.4
            if kind == "templar":
                cfg.update(
                    pelvis_dx=-16.0 * e,
                    pelvis_dy=7.0 * e,
                    torso_deg=-18.0 * e,
                    head_rel_deg=8.0 * e,
                    r_arm_deg=-52.0 * e,
                    l_arm_deg=-42.0 * e,
                    r_leg_deg=16.0 * e,
                    l_leg_deg=-16.0 * e,
                )
            elif kind == "treant":
                cfg.update(
                    pelvis_dy=-12.0 * e,
                    torso_deg=-16.0 * e,
                    head_rel_deg=-9.0 * e,
                    r_arm_deg=-88.0 * e,
                    l_arm_deg=-82.0 * e,
                    r_leg_deg=15.0 * e,
                    l_leg_deg=10.0 * e,
                )
            elif kind == "fiend":
                cfg.update(
                    pelvis_dx=-14.0 * e,
                    pelvis_dy=10.0 * e,
                    torso_deg=-18.0 * e,
                    head_rel_deg=6.0 * e,
                    r_arm_deg=-64.0 * e,
                    l_arm_deg=-58.0 * e,
                    r_leg_deg=18.0 * e,
                    l_leg_deg=-14.0 * e,
                )
            else:  # astrologer / dryad invocation
                cfg.update(
                    pelvis_dy=-11.0 * e,
                    torso_deg=-12.0 * e,
                    head_rel_deg=-7.0 * e,
                    r_arm_deg=-82.0 * e,
                    l_arm_deg=-76.0 * e,
                    skirt_wave_amp=6.2,
                )
                if kind == "astrologer":
                    fx_fn = lambda a, el=e, pl=ph: draw_caster_mandala_104(
                        a, 58, 22, 5.2, [7, 10, 18, 255], [240, 204, 118, 255], [32, 192, 234, 255], [255, 255, 255, 255], pl, el
                    )
                else:
                    fx_fn = lambda a, el=e, pl=ph: draw_caster_mandala_104(
                        a, 58, 22, 5.2, [7, 12, 12, 255], [132, 196, 116, 255], [54, 232, 186, 255], [255, 255, 255, 255], pl, el
                    )
        elif f < 22:
            t = (f - 10) / 12.0
            snap = min(1.0, t * 3.0)
            burst = math.sin(t * math.pi)
            if kind == "templar":
                cfg.update(
                    pelvis_dx=-16.0 + 38.0 * snap,
                    pelvis_dy=2.0 * snap,
                    torso_deg=-18.0 + 40.0 * snap,
                    head_rel_deg=-12.0 * snap,
                    r_arm_deg=-52.0 + 68.0 * snap,
                    l_arm_deg=-42.0 + 54.0 * snap,
                    r_leg_deg=-22.0 * snap,
                    l_leg_deg=20.0 * snap,
                )
                if burst > 0.14:
                    fx_fn = lambda a, bl=burst: draw_lance_thrust_104(a, 50, 50, bl)
            elif kind == "treant":
                cfg.update(
                    pelvis_dx=14.0 * snap,
                    pelvis_dy=-12.0 * (1.0 - snap) + 11.0 * snap,
                    torso_deg=-16.0 + 44.0 * snap,
                    head_rel_deg=-8.0 * snap,
                    r_arm_deg=-88.0 + 132.0 * snap,
                    l_arm_deg=-82.0 + 124.0 * snap,
                    r_leg_deg=-18.0 * snap,
                    l_leg_deg=18.0 * snap,
                )
                if burst > 0.14:
                    fx_fn = lambda a, bl=burst: draw_ground_slam_crest_104(
                        a, 62, 89, [8, 12, 12, 255], [18, 156, 134, 255], [38, 218, 182, 255], [255, 255, 255, 255], bl
                    )
            elif kind == "fiend":
                cfg.update(
                    pelvis_dx=-14.0 + 36.0 * snap,
                    pelvis_dy=-12.0 * burst + 4.0 * snap,
                    torso_deg=-18.0 + 42.0 * snap,
                    head_rel_deg=-12.0 * snap,
                    r_arm_deg=-64.0 + 116.0 * snap,
                    l_arm_deg=-58.0 + 104.0 * snap,
                    r_leg_deg=-22.0 * snap,
                    l_leg_deg=22.0 * snap,
                )
                if burst > 0.14:
                    fx_fn = lambda a, bl=burst: draw_twin_rake_104(
                        a, 58, 52, [8, 7, 12, 255], [168, 32, 16, 255], [250, 128, 22, 255], [255, 255, 255, 255], bl
                    )
            else:  # astrologer / dryad
                cfg.update(
                    pelvis_dx=6.0 * snap,
                    pelvis_dy=-13.0,
                    torso_deg=10.0 * snap,
                    head_rel_deg=-8.0 * snap,
                    r_arm_deg=-68.0,
                    l_arm_deg=-62.0,
                    skirt_wave_amp=7.2,
                )
                if kind == "astrologer":
                    fx_fn = lambda a, bl=burst, pl=ph: draw_caster_mandala_104(
                        a, 60, 22, 6.6, [7, 10, 18, 255], [240, 204, 118, 255], [32, 192, 234, 255], [255, 255, 255, 255], pl, 0.55 + 0.45 * bl
                    )
                else:
                    fx_fn = lambda a, bl=burst, pl=ph: draw_caster_mandala_104(
                        a, 60, 22, 6.6, [7, 12, 12, 255], [132, 196, 116, 255], [54, 232, 186, 255], [255, 255, 255, 255], pl, 0.55 + 0.45 * bl
                    )
        else:
            r = 1.0 - ((f - 22) / 8.0)
            cfg.update(
                pelvis_dx=(22.0 if not is_caster else 6.0) * r,
                pelvis_dy=(-7.0 if is_caster else 7.0) * r,
                torso_deg=(22.0 if not is_caster else 10.0) * r,
                r_arm_deg=(24.0 if not is_caster else -40.0) * r,
                l_arm_deg=(18.0 if not is_caster else -36.0) * r,
                r_leg_deg=-18.0 * r,
                l_leg_deg=18.0 * r,
            )

    # ------------------------------------------------------------------
    # ROW 4: ULTIMATE / EMPOWERED WARDEN-ELITE SURGE
    # ------------------------------------------------------------------
    elif row == 4:
        if f < 12:
            e = math.sin((f / 12.0) * math.pi * 0.5)
            cfg.update(
                pelvis_dy=-20.0 * e,
                torso_deg=-14.0 * e,
                head_rel_deg=-10.0 * e,
                r_arm_deg=(-64.0 if kind == "fiend" else -82.0) * e,
                l_arm_deg=(-58.0 if kind == "fiend" else -76.0) * e,
                r_leg_deg=16.0 * e,
                l_leg_deg=12.0 * e,
                skirt_wave_amp=6.6,
            )
            if kind == "astrologer":
                fx_fn = lambda a, el=e, pl=ph: draw_caster_mandala_104(
                    a, 58, 22, 5.8, [7, 10, 18, 255], [240, 204, 118, 255], [32, 192, 234, 255], [255, 255, 255, 255], pl, el
                )
            elif kind == "dryad":
                fx_fn = lambda a, el=e, pl=ph: draw_caster_mandala_104(
                    a, 58, 22, 5.8, [7, 12, 12, 255], [132, 196, 116, 255], [54, 232, 186, 255], [255, 255, 255, 255], pl, el
                )
        elif f < 22:
            t = (f - 12) / 10.0
            snap = min(1.0, t * 2.8)
            burst = math.sin(t * math.pi)
            cfg.update(
                pelvis_dx=16.0 * snap,
                pelvis_dy=-20.0 * (1.0 - snap) + 7.0 * snap,
                torso_deg=-14.0 + 36.0 * snap,
                head_rel_deg=-10.0 + 4.0 * snap,
                r_arm_deg=(-64.0 if kind == "fiend" else -82.0) + 114.0 * snap,
                l_arm_deg=(-58.0 if kind == "fiend" else -76.0) + 102.0 * snap,
                r_leg_deg=16.0 - 32.0 * snap,
                l_leg_deg=12.0 + 14.0 * snap,
            )
            if burst > 0.14:
                if kind == "templar":
                    fx_fn = lambda a, bl=burst: (
                        draw_cel_smear_arc_104(a, 58, 50, 32, -74, 62, [8, 11, 18, 255], [198, 154, 68, 255], [96, 234, 255, 255], [255, 255, 255, 255], bl, 6.8),
                        draw_cel_smear_arc_104(a, 60, 52, 24, 54, -48, [8, 11, 18, 255], [26, 184, 226, 255], [242, 206, 116, 255], [255, 255, 255, 255], bl * 0.85, 5.0),
                    )
                elif kind == "astrologer":
                    fx_fn = lambda a, bl=burst, pl=ph: draw_caster_mandala_104(
                        a, 62, 24, 7.2, [7, 10, 18, 255], [240, 204, 118, 255], [110, 238, 255, 255], [255, 255, 255, 255], pl, bl
                    )
                elif kind == "treant":
                    fx_fn = lambda a, bl=burst: (
                        draw_cel_smear_arc_104(a, 58, 52, 32, -74, 62, [8, 12, 12, 255], [18, 156, 134, 255], [108, 248, 216, 255], [255, 255, 255, 255], bl, 7.0),
                        draw_ground_slam_crest_104(a, 62, 89, [8, 12, 12, 255], [18, 156, 134, 255], [38, 218, 182, 255], [255, 255, 255, 255], bl),
                    )
                elif kind == "dryad":
                    fx_fn = lambda a, bl=burst, pl=ph: draw_caster_mandala_104(
                        a, 62, 24, 7.2, [7, 12, 12, 255], [132, 196, 116, 255], [124, 252, 218, 255], [255, 255, 255, 255], pl, bl
                    )
                else:  # fiend
                    fx_fn = lambda a, bl=burst: (
                        draw_cel_smear_arc_104(a, 58, 50, 32, -74, 62, [8, 7, 12, 255], [224, 68, 16, 255], [254, 198, 54, 255], [255, 255, 255, 255], bl, 6.8),
                        draw_twin_rake_104(a, 58, 54, [8, 7, 12, 255], [168, 32, 16, 255], [250, 128, 22, 255], [255, 255, 255, 255], bl * 0.9),
                    )
        else:
            r = 1.0 - ((f - 22) / 8.0)
            cfg.update(
                pelvis_dx=16.0 * r,
                pelvis_dy=7.0 * r,
                torso_deg=22.0 * r,
                r_arm_deg=32.0 * r,
                l_arm_deg=26.0 * r,
                r_leg_deg=-16.0 * r,
                l_leg_deg=24.0 * r,
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
    os.makedirs(ART_DIR, exist_ok=True)

    # Save reference bases cleanly into assets/sprites/ when building from external art dir
    for src_p, dst_name in (
        (SRC_TEMPLAR, "monster_templar_base.jpg"),
        (SRC_ASTROLOGER, "monster_astrologer_base.jpg"),
        (SRC_TREANT, "monster_treant_base.jpg"),
        (SRC_DRYAD, "monster_dryad_base.jpg"),
        (SRC_FIEND, "monster_fiend_base.jpg"),
    ):
        dst_p = os.path.join(SPRITE_DIR, dst_name)
        if os.path.exists(src_p) and os.path.abspath(src_p) != os.path.abspath(dst_p):
            shutil.copyfile(src_p, dst_p)

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
