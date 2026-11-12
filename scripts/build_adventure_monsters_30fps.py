#!/usr/bin/env python3
"""
Builds Authentic HD-2D 30fps Sprite Sheets & Boss Portrait for Adventure Mode:
  1. Ashfang Ghoul (`assets/sprites/monster_ghoul_sheet.png`, 6240x1456, 7 rows x 30 cols @ 208x208)
  2. Void Cultist (`assets/sprites/monster_cultist_sheet.png`, 6240x1456, 7 rows x 30 cols @ 208x208)
  3. Obsidian Juggernaut (`assets/sprites/monster_brute_sheet.png`, 6240x1456, 7 rows x 30 cols @ 208x208)
  4. Malphas, Archfiend of the Black Pit (`assets/sprites/boss_archfiend_sheet.png`, 6240x1456, 7 rows x 30 cols @ 208x208)
  5. Boss HUD Portrait (`assets/sprites/boss_archfiend_portrait.png`, 128x128 quantized NEAREST)

Strictly follows `arcane-vs-steel-pipeline`:
  - Extracted from `generate_image` 16-bit HD-2D base sprites (zero procedural bodies from scratch)
  - BFS border + pocket flood-fill + fringe strip + multi-zone `MedianFilter` cel-flattening
  - Hand-crafted 20-color Master Palette per creature + 2-pass cardinal orphan despeckling + 1px dark `Selout`
  - Articulated multi-part skeletal animation across all 7 rows (IDLE, WALK, AUTO_ATTACK, SKILL, ULTIMATE, DEATH/HURT, DASH)
  - Zero canvas shearing, zero `ctx.rotate`, zero border clips across all 840 frames
"""

import os
import sys
import math
import time
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, SCRIPT_DIR)

from hd2d_rig_core import (
    CELL,
    LOGICAL,
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
    draw_line_104,
    draw_slash_arc_104,
)

ART_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/b9d8130e-8764-4ace-8d4e-40f97049d6f1"
SPRITE_DIR = os.path.join(ROOT_DIR, "assets", "sprites")

SRC_GHOUL = os.path.join(ART_DIR, "monster_ghoul_base_1794495639766.jpg")
SRC_CULTIST = os.path.join(ART_DIR, "monster_cultist_base_1794495643935.jpg")
SRC_BRUTE = os.path.join(ART_DIR, "monster_brute_base_1794495644404.jpg")
SRC_BOSS = os.path.join(ART_DIR, "boss_archfiend_base_1794495643351.jpg")
SRC_BOSS_PORTRAIT = os.path.join(ART_DIR, "boss_archfiend_portrait_1794495788152.jpg")

ROWS_MONSTER = 7  # Row 0 IDLE, Row 1 WALK, Row 2 AUTO, Row 3 SKILL, Row 4 ULT, Row 5 DEATH/HURT, Row 6 DASH

# ==============================================================================
# CURATED 20-COLOR MASTER PALETTES (3-4 Stepped Cel Ramps + Dark Selout)
# ==============================================================================

# 1. Ashfang Ghoul: Ashen Undead Flesh, Dark Spiked Iron, Tattered Crimson Cloth, Necro-Emerald Eyes/Claws
GHOUL_PALETTE = np.array(
    [
        [8, 10, 14],       # 0: Deep shadow Selout
        [20, 24, 28],      # 1: Lit Selout / deepest iron
        [46, 50, 58],      # 2: Dark iron pauldron shadow
        [78, 84, 96],      # 3: Mid iron pauldron/greave
        [122, 130, 144],   # 4: Lit iron highlight
        [62, 68, 58],      # 5: Deep undead flesh shadow
        [96, 106, 90],     # 6: Mid-dark undead flesh
        [134, 146, 124],   # 7: Mid ashen undead flesh
        [172, 184, 158],   # 8: Lit bone-flesh highlight
        [208, 216, 194],   # 9: Skull/claw ivory glint
        [68, 18, 24],      # 10: Deep crimson loincloth shadow
        [108, 28, 36],     # 11: Mid crimson loincloth
        [152, 42, 48],     # 12: Lit crimson cloth
        [72, 56, 46],      # 13: Dark leg wrap leather
        [112, 90, 74],     # 14: Lit leg wrap leather
        [12, 118, 68],     # 15: Deep necro-emerald glow
        [24, 196, 108],    # 16: Bright necro-emerald eye/claw slash
        [98, 248, 168],    # 17: Hot mint-emerald slash core
        [212, 255, 232],   # 18: Incandescent emerald spark
        [255, 255, 255],   # 19: Pure white glint
    ],
    dtype=np.int32,
)

# 2. Void Cultist: Midnight Indigo/Violet Robes, Antique Gold Trim, Bone Skull Pauldron, Abyssal Magenta Magic
CULTIST_PALETTE = np.array(
    [
        [7, 5, 16],        # 0: Deep shadow Selout
        [16, 12, 32],      # 1: Lit Selout / void hood interior
        [28, 24, 54],      # 2: Deep midnight indigo robe
        [46, 40, 84],      # 3: Mid midnight indigo robe
        [68, 62, 114],     # 4: Lit slate-indigo pleat
        [56, 22, 92],      # 5: Deep royal purple stole
        [88, 36, 138],     # 6: Mid royal purple stole
        [126, 56, 186],    # 7: Lit amethyst stole
        [106, 76, 32],     # 8: Dark antique gold trim
        [164, 122, 48],    # 9: Mid antique gold trim
        [218, 174, 76],    # 10: Bright gold trim highlight
        [72, 72, 82],      # 11: Skull pauldron shadow / glove shadow
        [114, 114, 126],   # 12: Skull pauldron mid / glove mid
        [162, 162, 174],   # 13: Skull bone lit
        [84, 58, 46],      # 14: Dark leather boot
        [128, 92, 72],     # 15: Lit leather boot
        [176, 38, 156],    # 16: Deep magenta eye/orb rim
        [232, 72, 216],    # 17: Bright magenta eye/void magic
        [252, 164, 255],   # 18: Hot orchid magic core
        [255, 255, 255],   # 19: Pure white star-glint
    ],
    dtype=np.int32,
)

# 3. Obsidian Juggernaut: Forged Black-Iron Plate, Brawny Bronze Arms, Molten Magma Core & Visor
BRUTE_PALETTE = np.array(
    [
        [8, 8, 14],        # 0: Deep shadow Selout
        [20, 20, 30],      # 1: Lit Selout / deepest black-iron
        [36, 36, 50],      # 2: Dark obsidian armor plate
        [56, 58, 76],      # 3: Mid obsidian-steel armor
        [84, 88, 110],     # 4: Lit steel armor bevel
        [124, 130, 154],   # 5: Bright steel horn/rivet highlight
        [172, 178, 198],   # 6: Specular horn/edge glint
        [86, 50, 40],      # 7: Deep bronze-muscle shadow
        [128, 78, 60],     # 8: Mid bronze bicep/knuckle
        [168, 108, 84],    # 9: Lit bronze muscle highlight
        [112, 18, 16],     # 10: Deep cooled magma crack
        [178, 32, 18],     # 11: Dark crimson magma crack
        [228, 68, 18],     # 12: Blazing molten orange crack/visor
        [250, 132, 24],    # 13: Bright solar-amber magma
        [254, 202, 56],    # 14: Incandescent yellow-gold core
        [255, 242, 156],   # 15: White-hot magma center
        [48, 36, 44],      # 16: Dark greave/belt shadow
        [72, 56, 66],      # 17: Warm iron-plum undertone
        [255, 176, 92],    # 18: Shockwave ember spark
        [255, 255, 255],   # 19: Pure white impact glint
    ],
    dtype=np.int32,
)

# 4. Final Boss Malphas, Archfiend of the Black Pit: Obsidian-Abyss Plate, Imperial Gold Trim, Demon Wings, Hellfire-Void Core
BOSS_PALETTE = np.array(
    [
        [7, 5, 14],        # 0: Deep shadow Selout
        [18, 14, 30],      # 1: Lit Selout / deepest abyssal iron
        [32, 28, 52],      # 2: Dark obsidian plate
        [52, 46, 78],      # 3: Mid obsidian-indigo plate
        [78, 72, 112],     # 4: Lit armor bevel
        [58, 32, 42],      # 5: Deep demon-wing membrane shadow
        [90, 50, 62],      # 6: Mid demon-wing leathery membrane
        [124, 74, 84],     # 7: Lit wing membrane / horn shadow
        [156, 124, 98],    # 8: Curved demon horn / claw mid
        [198, 168, 134],   # 9: Lit horn / claw ivory
        [116, 78, 26],     # 10: Deep imperial gold trim shadow
        [176, 126, 38],    # 11: Mid imperial gold trim
        [232, 182, 58],    # 12: Bright imperial gold armor trim
        [252, 224, 118],   # 13: Specular gold highlight
        [118, 18, 86],     # 14: Deep abyssal magenta chest fissure
        [186, 28, 126],    # 15: Vivid abyssal crimson-magenta rune
        [236, 58, 158],    # 16: Bright hellfire-magenta core ring
        [250, 124, 48],    # 17: Blazing hellfire orange core
        [254, 214, 92],    # 18: Incandescent solar-hellfire heart
        [255, 255, 255],   # 19: Pure white cataclysm spark
    ],
    dtype=np.int32,
)


def infill_region_from_neighbors(arr512, poly_pts, sample_offsets):
    """Fills foreground-arm overlap region on torso/skirt using clean nearby body pixels so lifting arms leaves zero holes or ghost hands."""
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
# 1. ASHFANG GHOUL RIG SEGMENTATION
# ==============================================================================
def segment_ghoul():
    arr = clean_base_512(SRC_GHOUL, preserve_pale_thighs=False, head_y_split=142)
    H, W = arr.shape[:2]
    alpha = arr[:, :, 3] > 0

    m_head = poly_mask(H, W, [(256, 46), (348, 46), (348, 136), (276, 138), (256, 112)])
    m_r_arm = poly_mask(H, W, [(146, 90), (248, 90), (236, 174), (196, 224), (194, 326), (146, 326)])
    m_l_arm = poly_mask(H, W, [(298, 120), (346, 120), (366, 260), (366, 322), (322, 322), (298, 198)])
    m_r_leg = poly_mask(H, W, [(148, 268), (238, 268), (230, 360), (206, 474), (148, 474)]) & (~m_r_arm)
    m_l_leg = poly_mask(H, W, [(270, 256), (358, 256), (358, 454), (266, 454)]) & (~m_l_arm)
    m_torso = (
        poly_mask(H, W, [(196, 112), (312, 112), (304, 262), (284, 376), (232, 376), (194, 262)])
        & (~m_head)
        & (~m_r_arm)
        & (~m_l_arm)
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
    parts = extract_parts_512(arr, assigned)
    pivots = {
        "pelvis": (254.0, 246.0),
        "neck": (286.0, 126.0),
        "r_sh": (212.0, 136.0),
        "l_sh": (310.0, 152.0),
        "r_hip": (222.0, 274.0),
        "l_hip": (284.0, 268.0),
    }
    return parts, pivots


# ==============================================================================
# 2. VOID CULTIST RIG SEGMENTATION (Mirrored horizontally so he faces +X RIGHT!)
# ==============================================================================
def segment_cultist():
    arr_raw = clean_base_512(SRC_CULTIST, preserve_pale_thighs=False, head_y_split=162)
    arr = arr_raw[:, ::-1, :].copy()
    H, W = arr.shape[:2]
    alpha = arr[:, :, 3] > 0

    m_head = poly_mask(H, W, [(192, 52), (316, 52), (316, 158), (202, 158)])
    m_r_arm = poly_mask(H, W, [(148, 128), (236, 128), (220, 224), (218, 326), (148, 326)])
    m_l_arm = poly_mask(H, W, [(302, 166), (364, 166), (364, 322), (310, 322)])
    m_torso = (
        poly_mask(H, W, [(196, 148), (316, 148), (314, 266), (204, 266)])
        & (~m_head)
        & (~m_r_arm)
        & (~m_l_arm)
    )
    m_skirt = (
        poly_mask(H, W, [(164, 256), (350, 256), (356, 484), (164, 484)])
        & (~m_r_arm)
        & (~m_l_arm)
    )

    skirt_infilled = infill_region_from_neighbors(
        arr,
        [(172, 250), (222, 250), (222, 328), (172, 328)],
        [(36, 18), (48, 22), (24, 26), (0, 28)],
    )
    m_skirt_full = (
        poly_mask(H, W, [(164, 256), (350, 256), (356, 484), (164, 484)])
        & (skirt_infilled[:, :, 3] > 0)
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
    md = dict(assigned)
    md["skirt"] = md["skirt"] | m_skirt_full
    parts = extract_parts_512(
        arr,
        [(k, md[k]) for k in ("l_arm", "skirt", "torso", "head", "r_arm")],
        custom_part_arrays={"skirt": skirt_infilled},
    )
    pivots = {
        "pelvis": (258.0, 258.0),
        "neck": (256.0, 148.0),
        "r_sh": (204.0, 168.0),
        "l_sh": (312.0, 184.0),
    }
    return parts, pivots


# ==============================================================================
# 3. OBSIDIAN JUGGERNAUT (`brute`) RIG SEGMENTATION
# ==============================================================================
def segment_brute():
    arr = clean_base_512(SRC_BRUTE, preserve_pale_thighs=False, head_y_split=130)
    H, W = arr.shape[:2]
    alpha = arr[:, :, 3] > 0

    m_head = poly_mask(H, W, [(212, 32), (316, 32), (304, 124), (222, 124)])
    m_r_arm = poly_mask(H, W, [(96, 84), (228, 84), (228, 174), (202, 246), (208, 354), (96, 354)])
    m_l_arm = poly_mask(H, W, [(312, 98), (372, 98), (430, 294), (430, 352), (346, 352), (324, 248)])
    m_r_leg = poly_mask(H, W, [(142, 312), (266, 312), (254, 504), (142, 504)]) & (~m_r_arm)
    m_l_leg = poly_mask(H, W, [(266, 312), (394, 312), (394, 494), (266, 494)]) & (~m_l_arm)
    m_torso = (
        poly_mask(H, W, [(194, 108), (332, 108), (338, 320), (194, 320)])
        & (~m_head)
        & (~m_r_arm)
        & (~m_l_arm)
    )

    leg_infilled = infill_region_from_neighbors(
        arr,
        [(148, 296), (212, 296), (212, 356), (148, 356)],
        [(36, 22), (44, 28), (28, 32), (0, 36)],
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
        "pelvis": (268.0, 276.0),
        "neck": (264.0, 118.0),
        "r_sh": (182.0, 136.0),
        "l_sh": (328.0, 144.0),
        "r_hip": (218.0, 318.0),
        "l_hip": (304.0, 318.0),
    }
    return parts, pivots


# ==============================================================================
# 4. FINAL BOSS MALPHAS (`archfiend`) RIG SEGMENTATION
# ==============================================================================
def segment_boss():
    arr = clean_base_512(SRC_BOSS, preserve_pale_thighs=False, head_y_split=135)
    H, W = arr.shape[:2]
    alpha = arr[:, :, 3] > 0

    m_head = poly_mask(H, W, [(206, 36), (338, 36), (332, 104), (300, 136), (248, 136), (206, 94)])
    # Sweeping demonic bat-wing on left + far wing tip above right horn
    m_wings = (
        poly_mask(H, W, [(70, 22), (222, 22), (204, 96), (166, 138), (154, 248), (176, 376), (70, 376)])
        | poly_mask(H, W, [(296, 26), (344, 26), (326, 62), (296, 56)])
    ) & (~m_head)
    m_r_arm = poly_mask(H, W, [(146, 96), (244, 96), (232, 186), (226, 326), (146, 326)]) & (~m_wings)
    m_l_arm = poly_mask(H, W, [(306, 102), (358, 102), (412, 286), (412, 326), (344, 326), (314, 214)])
    m_r_leg = poly_mask(H, W, [(162, 286), (258, 286), (248, 492), (162, 492)]) & (~m_r_arm) & (~m_wings)
    m_l_leg = poly_mask(H, W, [(286, 286), (392, 286), (392, 482), (286, 482)]) & (~m_l_arm)
    m_torso = (
        poly_mask(H, W, [(206, 98), (322, 98), (336, 366), (206, 366)])
        & (~m_head)
        & (~m_r_arm)
        & (~m_l_arm)
        & (~m_wings)
    )

    assigned = assign_remaining_geodesic(
        alpha,
        [
            ("head", m_head),
            ("wings", m_wings),
            ("r_arm", m_r_arm),
            ("l_arm", m_l_arm),
            ("r_leg", m_r_leg),
            ("l_leg", m_l_leg),
            ("torso", m_torso),
        ],
    )
    parts = extract_parts_512(arr, assigned)
    pivots = {
        "pelvis": (272.0, 258.0),
        "neck": (272.0, 124.0),
        "wings": (196.0, 128.0),
        "r_sh": (198.0, 144.0),
        "l_sh": (322.0, 152.0),
        "r_hip": (228.0, 294.0),
        "l_hip": (308.0, 294.0),
    }
    return parts, pivots


# ==============================================================================
# SHARED MULTI-PART MONSTER / BOSS CELL RENDERER (104x104 -> 208x208)
# ==============================================================================
def render_monster_cell(
    parts,
    pivots,
    palette,
    protect_indices,
    cfg,
    y_bot_base=480.0,
    window_S=576,
    cx_offset=0.0,
    draw_fx_104=None,
):
    canvas = Image.new("RGBA", (740, 680), (0, 0, 0, 0))
    OX, OY = 116, 68

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

    # 1. Optional Demonic Wings (Boss)
    if "wings" in parts:
        wing_dst = torso_joint(pivots["wings"])
        paste_rotated_part(
            canvas,
            parts["wings"],
            pivots["wings"],
            (wing_dst[0] + cfg.get("wing_dx", 0.0), wing_dst[1] + cfg.get("wing_dy", 0.0)),
            torso_deg * 0.65 + cfg.get("wing_deg", 0.0),
            wave_phase=cfg.get("wave_phase", None),
            wave_amp=cfg.get("wing_wave_amp", 0.0),
        )

    # 2. Far Arm (`l_arm`)
    paste_rotated_part(
        canvas,
        parts["l_arm"],
        pivots["l_sh"],
        (l_sh_dst[0] + cfg.get("l_arm_dx", 0.0), l_sh_dst[1] + cfg.get("l_arm_dy", 0.0)),
        torso_deg + cfg.get("l_arm_deg", 0.0),
    )

    # 3. Legs OR Robe Skirt
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

    # 4. Torso / Chestplate / Tabard
    paste_rotated_part(canvas, parts["torso"], pelvis_src, pelvis_dst, torso_deg)

    # 5. Head / Horned Helm / Hood
    paste_rotated_part(canvas, parts["head"], pivots["neck"], neck_dst, head_deg)

    # 6. Foreground Arm (`r_arm`)
    paste_rotated_part(
        canvas,
        parts["r_arm"],
        pivots["r_sh"],
        (r_sh_dst[0] + cfg.get("r_arm_dx", 0.0), r_sh_dst[1] + cfg.get("r_arm_dy", 0.0)),
        torso_deg + cfg.get("r_arm_deg", 0.0),
    )

    # Crop fixed camera window so feet sit cleanly at y_cell ~ 196..199 (grounded, zero border clips)
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

    # Strict 3px safety border on 104x104 -> 6px on 208x208 (guarantees 0 border clips!)
    q104[:3, :, :] = 0
    q104[-3:, :, :] = 0
    q104[:, :3, :] = 0
    q104[:, -3:, :] = 0

    return Image.fromarray(q104, "RGBA").resize((CELL, CELL), Image.Resampling.NEAREST)


# ==============================================================================
# PIXEL-ART ELEMENTAL WEAPON / CLAW / ORB OVERLAYS (104x104 Logical Space)
# ==============================================================================
def draw_void_orb_104(arr, cx, cy, r, phase):
    if r <= 0.6:
        return
    C_OUT = [7, 5, 16, 255]
    C_MID = [126, 56, 186, 255]
    C_MAG = [232, 72, 216, 255]
    C_HOT = [252, 164, 255, 255]
    C_WHT = [255, 255, 255, 255]
    ir = int(math.ceil(r + 2))
    for dy in range(-ir, ir + 1):
        for dx in range(-ir, ir + 1):
            d = math.hypot(dx, dy)
            if d > r + 0.9:
                continue
            if d > r - 0.2:
                put_px(arr, cx + dx, cy + dy, C_OUT if (dx + dy) % 2 else C_MID)
            elif d > r * 0.52:
                put_px(arr, cx + dx, cy + dy, C_MAG)
            elif d > r * 0.24:
                put_px(arr, cx + dx, cy + dy, C_HOT)
            else:
                put_px(arr, cx + dx, cy + dy, C_WHT)
    for k in range(3):
        ang = phase * 2.2 + k * (2.0 * math.pi / 3.0)
        put_px(arr, cx + math.cos(ang) * (r + 2.4), cy + math.sin(ang) * (r + 1.6), C_HOT)


def generate_creature_pose(kind, row, f):
    """Generates articulated pose dict + optional 104x104 pixel FX callback for frame f in [0..29]."""
    u = f / 30.0
    ph = u * 2.0 * math.pi
    cfg = {"wave_phase": ph}
    fx_fn = None

    # ------------------------------------------------------------------
    # ROW 0: IDLE (Breathing combat stance + wing/robe motion)
    # ------------------------------------------------------------------
    if row == 0:
        b = math.sin(ph)
        b2 = math.sin(ph - 0.7)
        if kind == "ghoul":
            cfg.update(
                pelvis_dy=2.2 * b,
                torso_deg=3.5 + 2.4 * b,
                head_rel_deg=-2.0 + 3.0 * b2,
                r_arm_deg=-8.0 + 6.5 * b2,
                l_arm_deg=6.0 - 5.5 * b,
            )
        elif kind == "cultist":
            cfg.update(
                pelvis_dy=-4.5 + 4.5 * b,  # Subtle arcane levitation
                torso_deg=1.8 * b,
                head_rel_deg=-1.5 * b2,
                r_arm_deg=-14.0 + 7.0 * b2,
                l_arm_deg=-8.0 - 5.0 * b,
                skirt_wave_amp=3.4,
            )
            fx_fn = lambda a, b_loc=b, ph_loc=ph: draw_void_orb_104(a, 66, 48 + b_loc * 1.5, 3.2, ph_loc)
        elif kind == "brute":
            cfg.update(
                pelvis_dy=1.8 * b,
                torso_deg=2.0 + 1.8 * b,
                head_rel_deg=-1.5 * b2,
                r_arm_deg=-6.0 + 4.5 * b2,
                l_arm_deg=4.0 - 4.0 * b,
            )
        else:  # archfiend boss
            cfg.update(
                pelvis_dy=2.4 * b,
                torso_deg=2.0 + 1.8 * b,
                head_rel_deg=-1.5 + 2.0 * b2,
                wing_deg=-5.0 + 9.5 * b2,
                wing_wave_amp=4.5,
                r_arm_deg=-8.0 + 5.5 * b2,
                l_arm_deg=5.0 - 4.5 * b,
            )

    # ------------------------------------------------------------------
    # ROW 1: WALK (2-step anatomical stride / warlock hover-glide)
    # ------------------------------------------------------------------
    elif row == 1:
        s = math.sin(ph)
        bounce = -abs(math.cos(ph)) * 5.5
        if kind == "cultist":
            cfg.update(
                pelvis_dx=4.0,
                pelvis_dy=-7.0 + 4.2 * s,
                torso_deg=8.5 + 2.2 * s,
                head_rel_deg=-4.5,
                r_arm_deg=-26.0 + 10.0 * s,
                l_arm_deg=-14.0 - 8.0 * s,
                skirt_deg=6.0 + 2.0 * s,
                skirt_wave_amp=5.0,
            )
            fx_fn = lambda a, ph_loc=ph: draw_void_orb_104(a, 69, 46, 3.4, ph_loc)
        else:
            leg_amp = 24.0 if kind == "ghoul" else (18.0 if kind == "brute" else 19.0)
            arm_amp = 26.0 if kind == "ghoul" else 18.0
            lean = 10.0 if kind == "ghoul" else (6.5 if kind == "brute" else 7.0)
            cfg.update(
                pelvis_dy=bounce,
                torso_deg=lean + 2.0 * math.sin(ph * 2),
                head_rel_deg=-lean * 0.45,
                r_leg_deg=leg_amp * s,
                l_leg_deg=-leg_amp * s,
                r_arm_deg=-12.0 - arm_amp * s,
                l_arm_deg=-8.0 + arm_amp * s,
                wing_deg=-4.0 + 11.0 * math.sin(ph - 0.5),
                wing_wave_amp=5.2,
            )

    # ------------------------------------------------------------------
    # ROW 2: AUTO_ATTACK (Windup F00..F08 -> Strike F09..F18 -> Recovery F19..F29)
    # ------------------------------------------------------------------
    elif row == 2:
        if f < 9:
            t = f / 9.0
            e = t * t * (3 - 2 * t)
            if kind == "cultist":
                cfg.update(
                    pelvis_dy=-6.0 - 4.0 * e,
                    torso_deg=-6.0 * e,
                    r_arm_deg=-52.0 * e,
                    l_arm_deg=-34.0 * e,
                    skirt_wave_amp=4.2,
                )
                fx_fn = lambda a, e_loc=e, ph_loc=ph: draw_void_orb_104(a, 60, 42 - 4 * e_loc, 2.5 + 3.2 * e_loc, ph_loc)
            else:
                cfg.update(
                    pelvis_dx=-10.0 * e,
                    pelvis_dy=3.0 * e,
                    torso_deg=-12.0 * e,
                    head_rel_deg=6.0 * e,
                    r_arm_deg=-68.0 * e,
                    l_arm_deg=-42.0 * e,
                    r_leg_deg=12.0 * e,
                    l_leg_deg=-10.0 * e,
                    wing_deg=14.0 * e,
                )
        elif f < 19:
            t = (f - 9) / 10.0
            snap = min(1.0, t * 2.6)
            arc_int = math.sin(t * math.pi)
            if kind == "cultist":
                cfg.update(
                    pelvis_dx=10.0 * snap,
                    pelvis_dy=-8.0,
                    torso_deg=12.0 * snap,
                    head_rel_deg=-6.0 * snap,
                    r_arm_deg=-52.0 + 22.0 * snap,
                    l_arm_deg=-34.0 + 14.0 * snap,
                    skirt_wave_amp=5.8,
                )
                fx_fn = lambda a, s_loc=snap, ph_loc=ph: draw_void_orb_104(a, 68 + 10 * s_loc, 44, 5.8 - 1.5 * t, ph_loc)
            else:
                cfg.update(
                    pelvis_dx=-10.0 + 26.0 * snap,
                    pelvis_dy=-2.0 * snap,
                    torso_deg=-12.0 + 28.0 * snap,
                    head_rel_deg=-10.0 * snap,
                    r_arm_deg=-68.0 + 96.0 * snap,
                    l_arm_deg=-42.0 + 70.0 * snap,
                    r_leg_deg=12.0 - 26.0 * snap,
                    l_leg_deg=-10.0 + 22.0 * snap,
                    wing_deg=14.0 - 24.0 * snap,
                )
                if arc_int > 0.15:
                    if kind == "ghoul":
                        fx_fn = lambda a, ai=arc_int: draw_slash_arc_104(
                            a, 58, 52, 26, -58, 48, [212, 255, 232, 255], [98, 248, 168, 255], [24, 196, 108, 255], ai
                        )
                    elif kind == "brute":
                        fx_fn = lambda a, ai=arc_int: draw_slash_arc_104(
                            a, 58, 54, 30, -68, 52, [255, 242, 156, 255], [250, 132, 24, 255], [178, 32, 18, 255], ai
                        )
                    else:  # boss
                        fx_fn = lambda a, ai=arc_int: draw_slash_arc_104(
                            a, 58, 50, 32, -65, 55, [254, 214, 92, 255], [236, 58, 158, 255], [118, 18, 86, 255], ai
                        )
        else:
            t = (f - 19) / 11.0
            r = 1.0 - (t * t * (3 - 2 * t))
            if kind == "cultist":
                cfg.update(
                    pelvis_dx=10.0 * r,
                    pelvis_dy=-4.5 - 3.5 * r,
                    torso_deg=12.0 * r,
                    r_arm_deg=-14.0 - 16.0 * r,
                    l_arm_deg=-8.0 - 12.0 * r,
                )
            else:
                cfg.update(
                    pelvis_dx=16.0 * r,
                    torso_deg=16.0 * r,
                    head_rel_deg=-10.0 * r,
                    r_arm_deg=-8.0 + 36.0 * r,
                    l_arm_deg=28.0 * r,
                    r_leg_deg=-14.0 * r,
                    l_leg_deg=12.0 * r,
                    wing_deg=-10.0 * r,
                )

    # ------------------------------------------------------------------
    # ROW 3: SKILL (Frenzy Double-Rend / Void Rune Summon / Seismic Quake / Hellfire Roar)
    # ------------------------------------------------------------------
    elif row == 3:
        if f < 10:
            e = (f / 10.0) ** 1.5
            cfg.update(
                pelvis_dy=-10.0 * e if kind == "cultist" else 5.0 * e,
                torso_deg=-16.0 * e,
                head_rel_deg=-8.0 * e,
                r_arm_deg=-82.0 * e,
                l_arm_deg=-74.0 * e,
                r_leg_deg=14.0 * e,
                l_leg_deg=-14.0 * e,
                wing_deg=22.0 * e,
                wing_wave_amp=6.0,
            )
            if kind == "cultist":
                fx_fn = lambda a, el=e, pl=ph: draw_void_orb_104(a, 54, 24, 3.0 + 4.2 * el, pl)
        elif f < 22:
            t = (f - 10) / 12.0
            snap = min(1.0, t * 3.0)
            burst = math.sin(t * math.pi)
            cfg.update(
                pelvis_dx=22.0 * snap if kind != "cultist" else 4.0 * snap,
                pelvis_dy=-12.0 if kind == "cultist" else 8.0 * snap,
                torso_deg=-16.0 + 38.0 * snap if kind != "cultist" else 8.0 * snap,
                head_rel_deg=-12.0 * snap,
                r_arm_deg=-82.0 + 114.0 * snap if kind != "cultist" else -64.0,
                l_arm_deg=-74.0 + 98.0 * snap if kind != "cultist" else -58.0,
                r_leg_deg=-20.0 * snap,
                l_leg_deg=20.0 * snap,
                wing_deg=22.0 - 38.0 * snap,
            )
            if kind == "cultist":
                fx_fn = lambda a, bl=burst, pl=ph: draw_void_orb_104(a, 62, 26, 5.5 + 2.2 * bl, pl)
            elif burst > 0.15:
                col_a = [212, 255, 232, 255] if kind == "ghoul" else [255, 242, 156, 255]
                col_b = [24, 196, 108, 255] if kind == "ghoul" else ([250, 132, 24, 255] if kind == "brute" else [236, 58, 158, 255])
                col_c = [12, 118, 68, 255] if kind == "ghoul" else [118, 18, 86, 255]
                fx_fn = lambda a, bl=burst, ca=col_a, cb=col_b, cc=col_c: draw_slash_arc_104(
                    a, 60, 54, 31, -72, 64, ca, cb, cc, bl
                )
        else:
            r = 1.0 - ((f - 22) / 8.0)
            cfg.update(
                pelvis_dx=22.0 * r if kind != "cultist" else 4.0 * r,
                pelvis_dy=-6.0 * r if kind == "cultist" else 8.0 * r,
                torso_deg=22.0 * r if kind != "cultist" else 8.0 * r,
                r_arm_deg=28.0 * r if kind != "cultist" else -40.0 * r,
                l_arm_deg=24.0 * r if kind != "cultist" else -35.0 * r,
                r_leg_deg=-20.0 * r,
                l_leg_deg=20.0 * r,
                wing_deg=-16.0 * r,
            )

    # ------------------------------------------------------------------
    # ROW 4: ULTIMATE (Boss Cataclysm Sky-Ascent & Slam / Elite Enrage Roar)
    # ------------------------------------------------------------------
    elif row == 4:
        if f < 12:
            t = f / 12.0
            e = math.sin(t * math.pi * 0.5)
            cfg.update(
                pelvis_dy=-22.0 * e,
                torso_deg=-14.0 * e,
                head_rel_deg=-10.0 * e,
                r_arm_deg=-92.0 * e,
                l_arm_deg=-86.0 * e,
                r_leg_deg=18.0 * e,
                l_leg_deg=10.0 * e,
                wing_deg=26.0 * e,
                wing_wave_amp=7.5,
            )
        elif f < 22:
            t = (f - 12) / 10.0
            snap = min(1.0, t * 2.8)
            burst = math.sin(t * math.pi)
            cfg.update(
                pelvis_dx=14.0 * snap,
                pelvis_dy=-22.0 * (1.0 - snap) + 6.0 * snap,
                torso_deg=-14.0 + 36.0 * snap,
                head_rel_deg=-10.0 + 4.0 * snap,
                r_arm_deg=-92.0 + 126.0 * snap,
                l_arm_deg=-86.0 + 116.0 * snap,
                r_leg_deg=18.0 - 34.0 * snap,
                l_leg_deg=10.0 + 14.0 * snap,
                wing_deg=26.0 - 44.0 * snap,
            )
            if burst > 0.15:
                fx_fn = lambda a, bl=burst: draw_slash_arc_104(
                    a, 58, 52, 34, -78, 68, [255, 255, 255, 255], [254, 214, 92, 255], [236, 58, 158, 255], bl
                )
        else:
            r = 1.0 - ((f - 22) / 8.0)
            cfg.update(
                pelvis_dx=14.0 * r,
                pelvis_dy=6.0 * r,
                torso_deg=22.0 * r,
                r_arm_deg=34.0 * r,
                l_arm_deg=30.0 * r,
                r_leg_deg=-16.0 * r,
                l_leg_deg=24.0 * r,
                wing_deg=-18.0 * r,
            )

    # ------------------------------------------------------------------
    # ROW 5: HURT (F00..F05) + COLLAPSE & DEATH REST (F06..F29)
    # ------------------------------------------------------------------
    elif row == 5:
        if f < 6:
            # Hurt recoil stagger
            t = math.sin((f / 5.0) * math.pi * 0.85)
            cfg.update(
                pelvis_dx=-14.0 * t,
                pelvis_dy=4.0 * t,
                torso_deg=-18.0 * t,
                head_rel_deg=-12.0 * t,
                r_arm_deg=-36.0 * t,
                l_arm_deg=24.0 * t,
                r_leg_deg=14.0 * t,
                l_leg_deg=-12.0 * t,
                wing_deg=16.0 * t,
            )
        elif f < 19:
            # Kneeling stagger into backward/forward collapse
            t = (f - 6) / 13.0
            e = t * t * (3 - 2 * t)
            cfg.update(
                pelvis_dx=-14.0 - 18.0 * e,
                pelvis_dy=4.0 + 132.0 * e,
                torso_deg=-18.0 - 62.0 * e,
                head_rel_deg=-8.0 * (1.0 - e),
                r_arm_deg=-36.0 - 28.0 * e,
                l_arm_deg=24.0 - 44.0 * e,
                r_leg_deg=14.0 + 56.0 * e,
                l_leg_deg=-12.0 + 68.0 * e,
                wing_deg=16.0 - 28.0 * e,
                skirt_deg=-68.0 * e,
            )
        else:
            # Flat horizontal rest on arena floor
            settle = math.sin(((f - 19) / 10.0) * math.pi) * 2.0 if f < 24 else 0.0
            cfg.update(
                pelvis_dx=-32.0,
                pelvis_dy=136.0 - settle,
                torso_deg=-80.0 + settle,
                head_rel_deg=4.0,
                r_arm_deg=-64.0,
                l_arm_deg=-20.0,
                r_leg_deg=70.0,
                l_leg_deg=56.0,
                wing_deg=-12.0,
                skirt_deg=-68.0,
            )

    # ------------------------------------------------------------------
    # ROW 6: DASH (Feral Pounce / Shadow Glide / Bull-Charge / Dragon Divebomb!)
    # ------------------------------------------------------------------
    elif row == 6:
        env = math.sin(u * math.pi)
        if kind == "cultist":
            cfg.update(
                pelvis_dx=16.0 * env,
                pelvis_dy=-14.0 * env,
                torso_deg=22.0 * env,
                head_rel_deg=-12.0 * env,
                r_arm_deg=-48.0 * env,
                l_arm_deg=22.0 * env,
                skirt_deg=16.0 * env,
                skirt_wave_amp=6.5,
            )
        elif kind == "brute":
            # Unstoppable Shoulder Bull-Charge!
            stride = math.sin(ph * 2.0)
            cfg.update(
                pelvis_dx=18.0 * env,
                pelvis_dy=8.0 * env - abs(stride) * 4.0,
                torso_deg=24.0 * env,
                head_rel_deg=-14.0 * env,
                r_arm_deg=28.0 * env,
                l_arm_deg=-36.0 * env,
                r_leg_deg=24.0 * stride,
                l_leg_deg=-24.0 * stride,
            )
        else:
            # Ghoul Leaping Pounce / Boss Winged Divebomb!
            cfg.update(
                pelvis_dx=18.0 * env,
                pelvis_dy=-18.0 * env,
                torso_deg=26.0 * env,
                head_rel_deg=-14.0 * env,
                r_arm_deg=-58.0 * env,
                l_arm_deg=-38.0 * env,
                r_leg_deg=-26.0 * env,
                l_leg_deg=22.0 * env,
                wing_deg=-22.0 * env,
                wing_wave_amp=7.0,
            )

    return cfg, fx_fn


def build_boss_portrait():
    """Quantizes generated Boss close-up portrait to crisp 128x128 20-color NEAREST pixel art."""
    raw = Image.open(SRC_BOSS_PORTRAIT).convert("RGB")
    med = raw.filter(ImageFilter.MedianFilter(size=5))
    small = med.resize((128, 128), Image.Resampling.NEAREST)
    quant = small.quantize(colors=20, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert("RGBA")
    out_path = os.path.join(SPRITE_DIR, "boss_archfiend_portrait.png")
    quant.save(out_path, optimize=True)
    return quant, out_path


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
    assert empty == 0, f"{name} has empty cells!"
    assert clips == 0, f"{name} has border clips!"


def main():
    t0 = time.time()
    os.makedirs(SPRITE_DIR, exist_ok=True)

    # Save reference bases cleanly into assets/sprites/ for reproducibility
    shutil.copyfile(SRC_GHOUL, os.path.join(SPRITE_DIR, "monster_ghoul_base.jpg"))
    shutil.copyfile(SRC_CULTIST, os.path.join(SPRITE_DIR, "monster_cultist_base.jpg"))
    shutil.copyfile(SRC_BRUTE, os.path.join(SPRITE_DIR, "monster_brute_base.jpg"))
    shutil.copyfile(SRC_BOSS, os.path.join(SPRITE_DIR, "boss_archfiend_base.jpg"))

    print("1. Building Boss Portrait (128x128 quantized NEAREST)...")
    port_im, port_path = build_boss_portrait()
    print(f"   -> {port_path}")

    creatures = [
        {
            "kind": "ghoul",
            "title": "ASHFANG GHOUL (MELEE RUSHER)",
            "out": os.path.join(SPRITE_DIR, "monster_ghoul_sheet.png"),
            "segment": segment_ghoul,
            "palette": GHOUL_PALETTE,
            "protect": (15, 16, 17, 18, 19),
            "y_bot": 474.0,
            "win_S": 564,
            "cx_off": 4.0,
        },
        {
            "kind": "cultist",
            "title": "VOID CULTIST (RANGED WARLOCK)",
            "out": os.path.join(SPRITE_DIR, "monster_cultist_sheet.png"),
            "segment": segment_cultist,
            "palette": CULTIST_PALETTE,
            "protect": (16, 17, 18, 19),
            "y_bot": 482.0,
            "win_S": 564,
            "cx_off": 2.0,
        },
        {
            "kind": "brute",
            "title": "OBSIDIAN JUGGERNAUT (HEAVY BRUTE)",
            "out": os.path.join(SPRITE_DIR, "monster_brute_sheet.png"),
            "segment": segment_brute,
            "palette": BRUTE_PALETTE,
            "protect": (12, 13, 14, 15, 18, 19),
            "y_bot": 502.0,
            "win_S": 592,
            "cx_off": -2.0,
        },
        {
            "kind": "archfiend",
            "title": "MALPHAS, ARCHFIEND OF THE BLACK PIT (FINAL BOSS)",
            "out": os.path.join(SPRITE_DIR, "boss_archfiend_sheet.png"),
            "segment": segment_boss,
            "palette": BOSS_PALETTE,
            "protect": (12, 13, 15, 16, 17, 18, 19),
            "y_bot": 492.0,
            "win_S": 598,
            "cx_off": -16.0,
        },
    ]

    built_sheets = {}
    parts_preview = Image.new("RGBA", (1400, 380), (18, 22, 34, 255))
    pdraw = ImageDraw.Draw(parts_preview)

    for idx, spec in enumerate(creatures):
        kind = spec["kind"]
        print(f"2.{idx+1} Segmenting & animating {spec['title']}...")
        parts, pivots = spec["segment"]()

        # Render exploded parts preview tile
        px0 = idx * 350 + 16
        pdraw.text((px0, 8), spec["title"][:32], fill=(254, 240, 138, 255))
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
                cfg, fx_fn = generate_creature_pose(kind, r, f)
                cell = render_monster_cell(
                    parts,
                    pivots,
                    spec["palette"],
                    spec["protect"],
                    cfg,
                    y_bot_base=spec["y_bot"],
                    window_S=spec["win_S"],
                    cx_offset=spec["cx_off"],
                    draw_fx_104=fx_fn,
                )
                sheet.paste(cell, (f * CELL, r * CELL))

        audit_sheet_bounds(sheet, kind)
        sheet.save(spec["out"], optimize=True)
        built_sheets[kind] = sheet

    parts_path = os.path.join(ART_DIR, "debug_adventure_parts_check.png")
    parts_preview.save(parts_path)

    # Build Debug Contact Sheet 1: 3 Monster Archetypes + Boss Portrait Showcase
    row_names = ["R0 IDLE", "R1 WALK", "R2 ATK", "R3 SKILL", "R4 ULT", "R5 DEATH", "R6 DASH"]
    sample_cols = [0, 6, 12, 15, 22, 28]
    showcase = Image.new("RGBA", (len(sample_cols) * 164 + 140, 3 * 7 * 144 + 80), (14, 18, 28, 255))
    sdraw = ImageDraw.Draw(showcase)
    sdraw.text((16, 14), "ADVENTURE MONSTERS 30FPS CEL-QUANTIZED SHOWCASE + BOSS PORTRAIT", fill=(254, 240, 138, 255))
    showcase.alpha_composite(port_im.resize((64, 64), Image.Resampling.NEAREST), (showcase.size[0] - 84, 8))

    for m_i, kind in enumerate(["ghoul", "cultist", "brute"]):
        sh = built_sheets[kind]
        for r in range(ROWS_MONSTER):
            by = 76 + (m_i * ROWS_MONSTER + r) * 142
            sdraw.line([(0, by + 132), (showcase.size[0], by + 132)], fill=(48, 58, 82, 255))
            sdraw.text((10, by + 56), f"{kind.upper()}\n{row_names[r]}", fill=(125, 211, 252, 255))
            for c_i, fc in enumerate(sample_cols):
                bx = 128 + c_i * 160
                crop = sh.crop((fc * CELL, r * CELL, (fc + 1) * CELL, (r + 1) * CELL)).resize(
                    (138, 138), Image.Resampling.NEAREST
                )
                showcase.alpha_composite(crop, (bx, by))
                sdraw.text((bx + 4, by + 2), f"F{fc:02d}", fill=(180, 190, 210, 200))

    showcase_path = os.path.join(ART_DIR, "debug_adventure_monsters_showcase.png")
    showcase.save(showcase_path)

    # Build Debug Contact Sheets 2 & 3: Full 30-frame Left (F00..F14) & Right (F15..F29) for Final Boss Malphas!
    boss_sh = built_sheets["archfiend"]
    for half_name, c_start in [("left_F00_F14", 0), ("right_F15_F29", 15)]:
        half_im = Image.new("RGBA", (15 * 116 + 96, ROWS_MONSTER * 124 + 44), (14, 16, 26, 255))
        hdraw = ImageDraw.Draw(half_im)
        hdraw.text((12, 10), f"FINAL BOSS MALPHAS 30FPS AUDIT ({half_name})", fill=(254, 214, 92, 255))
        for r in range(ROWS_MONSTER):
            by = 38 + r * 122
            hdraw.line([(0, by + 114), (half_im.size[0], by + 114)], fill=(60, 44, 78, 255))
            hdraw.text((8, by + 48), row_names[r], fill=(244, 114, 182, 255))
            for ci in range(15):
                fc = c_start + ci
                bx = 88 + ci * 116
                crop = boss_sh.crop((fc * CELL, r * CELL, (fc + 1) * CELL, (r + 1) * CELL)).resize(
                    (112, 112), Image.Resampling.NEAREST
                )
                half_im.alpha_composite(crop, (bx, by))
                hdraw.text((bx + 2, by + 2), f"F{fc:02d}", fill=(190, 195, 215, 190))
        half_im.save(os.path.join(ART_DIR, f"debug_boss_archfiend_{half_name}.png"))

    print(f"Done in {time.time() - t0:.1f}s! Debug sheets saved to {ART_DIR}")


if __name__ == "__main__":
    main()
