#!/usr/bin/env python3
"""
Builds Torgar v5 (Titan -- Sovereign of the World-Forge) 30fps HD-2D Sprite Sheet
(6240x1872, 30 cols x 9 rows of 208x208) using titan_v5_base.jpg + hd2d_rig_core.

Key v5 Upgrades:
- Clean 15-part segmentation of `titan_v5_base.jpg` (horned golden Khazad war-helm with
  emerald-jade brow gem & eyes, 3-braid fiery copper beard, curved golden ram-horn pauldrons
  with emerald-jade diamond runes, muscular Dwarven arms, dark volcanic obsidian breastplate,
  giant emerald-jade octagonal World-Forge belt core, hip tassets, and separated armored legs).
- True Analytical 2-Bone Two-Handed IK (`apply_2h_maul_ik`) locking BOTH of Torgar's armored
  gauntlets onto his COLOSSAL TWO-HANDED WORLD-BREAKER GOD-MAUL (`draw_2h_worldbreaker_maul_104`).
- Rotating 8-Cog Dwarven World-Forge Crucible Halo behind his shoulders.
- ZERO baked floor circles (`earthshatter`) and ZERO baked floating horizontal `speedlines`
  inside character cells (all ground craters & shockwaves render cleanly in screen-space VFX!).
"""

import os
import sys
import math
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hd2d_rig_core import (
    COLS, BASE_NUMERIC_KEYS, poly_mask, clean_base_512,
    assign_remaining_geodesic, extract_parts_512, rot_pt,
    put_px, draw_slash_arc_104, render_rig_104,
    make_prone_knight_death_kfs, eval_pose_keyframes, build_and_save_30fps_sheet,
    compute_bipedal_walk_pose, splice_row2_auto_surgically,
)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE_IMG_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "titan_v5_base.jpg")
OUT_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "titan_sheet.png")
VFX_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "titan_vfx.png")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/b9d8130e-8764-4ace-8d4e-40f97049d6f1"

# Strict 20-Color Hand-Crafted Volcanic Obsidian, Forge-Gold, Copper Beard, Skin & Emerald-Jade Palette
MASTER_PALETTE = np.array([
    [10, 12, 18],     # 0: Abyssal Obsidian Outline
    [20, 24, 34],     # 1: Dark Obsidian-Iron Selout
    [34, 40, 54],     # 2: Volcanic Basalt Plate Deep Shadow
    [52, 60, 78],     # 3: Forged Basalt-Iron Armor Base
    [82, 92, 116],    # 4: Lit Basalt-Steel Plate Highlight
    [18, 86, 58],     # 5: Deep World-Forge Emerald Shadow
    [24, 148, 98],    # 6: Runic Emerald-Jade Base
    [46, 212, 138],   # 7: Luminous World-Forge Jade Glow
    [118, 252, 188],  # 8: Blazing Jade Crystal Specular
    [94, 42, 22],     # 9: Deep Leather & Beard Root Shadow
    [156, 62, 24],    # 10: Fiery Dwarven Copper Beard Shadow
    [218, 96, 26],    # 11: Blazing Copper-Orange Beard Base
    [252, 148, 36],   # 12: Molten Amber Beard & Magma Fissure Glow
    [168, 108, 78],   # 13: Dwarven Muscular Bicep / Brow Shaded Skin
    [218, 152, 116],  # 14: Dwarven Muscular Bicep / Nose Lit Skin
    [96, 62, 24],     # 15: Heavy Dwarven Bronze Trim Shadow
    [152, 102, 36],   # 16: Burnished Bronze Pauldron & Belt Midtone
    [208, 152, 48],   # 17: Imperial Forge-Gold Horn & Trim Bevel
    [248, 204, 78],   # 18: Specular Forge-Gold Horn Gleam
    [255, 248, 214],  # 19: White-Hot World-Forge Heart
], dtype=np.int32)

C_OUT = (10, 12, 18, 255)
C_SEL = (20, 24, 34, 255)
C_BASALT_DARK = (34, 40, 54, 255)
C_BASALT_BASE = (52, 60, 78, 255)
C_BASALT_MID = (82, 92, 116, 255)
C_BASALT_LIT = (82, 92, 116, 255)
C_JADE_DARK = (18, 86, 58, 255)
C_JADE_MID = (24, 148, 98, 255)
C_JADE_LIT = (46, 212, 138, 255)
C_JADE_SPEC = (118, 252, 188, 255)
C_BEARD_DARK = (94, 42, 22, 255)
C_ORANGE = (218, 96, 26, 255)
C_MAGMA_ORANGE = (252, 148, 36, 255)
C_BRONZE_DARK = (96, 62, 24, 255)
C_BRONZE = (152, 102, 36, 255)
C_GOLD = (208, 152, 48, 255)
C_GOLD_SPEC = (248, 204, 78, 255)
C_MAGMA = (248, 204, 78, 255)
C_CORE = (255, 248, 214, 255)

# Skeletal pivots in 512x512 rig space mapped directly from debug_titan_v5_grid.png
PIVOTS = dict(
    pelvis=(274.0, 286.0), neck=(268.0, 118.0), mane=(276.0, 122.0),
    l_sh=(162.0, 144.0), l_elb=(138.0, 238.0), l_hand=(146.0, 336.0),
    r_sh=(346.0, 148.0), r_elb=(360.0, 238.0), r_hand=(388.0, 332.0),
    l_hip=(204.0, 318.0), l_knee=(196.0, 392.0), l_ank=(186.0, 468.0),
    r_hip=(318.0, 318.0), r_knee=(332.0, 392.0), r_ank=(324.0, 466.0),
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
    protect_indices=(6, 7, 8, 11, 12, 14, 17, 18, 19),
    hair_indices=(9, 10, 11, 12),
    lit_selout=1,
    shad_selout=0,
    hair_selout=9,
    joint_fill=(26, 30, 42, 255),
    joint_inner=(44, 52, 68, 255),
    hip_r=26,
    thigh_r=22,
    arm_r=18,
    pinhole_fill=(34, 40, 54, 255),
)


def solve_arm_ik(sh_w, target_w, L1, L2, a1_rest, a2_rest, torso_deg, elbow_clockwise=True):
    """Analytical 2-Bone IK solver in 512x512 rig coordinates."""
    dx = target_w[0] - sh_w[0]
    dy = target_w[1] - sh_w[1]
    dist = math.hypot(dx, dy)
    max_reach = (L1 + L2) * 0.985
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

    th1 = base_ang + (alpha1 if elbow_clockwise else -alpha1)
    elb_x = sh_w[0] + math.cos(th1) * L1
    elb_y = sh_w[1] + math.sin(th1) * L1
    th2 = math.atan2(target_w[1] - elb_y, target_w[0] - elb_x)

    sode_deg = math.degrees(th1) - a1_rest
    fore_deg = math.degrees(th2) - a2_rest
    return (sode_deg - torso_deg), (fore_deg - sode_deg)


def apply_2h_maul_ik(cfg):
    """
    Solves per-frame 2-Bone IK so BOTH of Torgar's colossal rune-gauntlets lock onto the
    Two-Handed World-Breaker Warhammer haft (r_hand on upper grip below the anvil collar,
    l_hand on lower grip above the magma pommel) with zero drift across all 9 rows!
    """
    if not cfg.get("two_handed_ik", True):
        return cfg

    torso_deg = cfg.get("torso_deg", 0.0)
    grip_x = cfg.get("grip_x", 54.0)
    grip_y = cfg.get("grip_y", -14.0)
    maul_deg = cfg.get("weapon_deg", -38.0)
    grip_sep = cfg.get("grip_sep", 38.0)

    pel = PIVOTS["pelvis"]
    l_sh_w = rot_pt(PIVOTS["l_sh"], pel, torso_deg)
    r_sh_w = rot_pt(PIVOTS["r_sh"], pel, torso_deg)

    rad = math.radians(maul_deg)
    ux, uy = math.cos(rad), math.sin(rad)

    r_target = (pel[0] + grip_x, pel[1] + grip_y)
    l_target = (r_target[0] - ux * grip_sep, r_target[1] - uy * grip_sep)

    r_sode_rel, r_fore_rel = solve_arm_ik(
        r_sh_w, r_target, _R1, _R2, _AR1, _AR2, torso_deg, elbow_clockwise=True
    )
    l_sode_rel, l_fore_rel = solve_arm_ik(
        l_sh_w, l_target, _L1, _L2, _AL1, _AL2, torso_deg, elbow_clockwise=True
    )

    cfg["r_sode_rel_deg"] = r_sode_rel
    cfg["r_fore_rel_deg"] = r_fore_rel
    cfg["l_sode_rel_deg"] = l_sode_rel
    cfg["l_fore_rel_deg"] = l_fore_rel
    if "right_arm_in_front" not in cfg:
        cfg["right_arm_in_front"] = (grip_y < -82.0) or (grip_x > 62.0)
    return cfg


TWO_HAND_NUMERIC_KEYS = tuple(BASE_NUMERIC_KEYS) + ("grip_x", "grip_y", "grip_sep")


def eval_2h_keyframes(f, keyframes, ph, defaults, extra_meta_keys=(), wave_mult=2.0):
    """
    Cosine-eased keyframe evaluator that interpolates (grip_x, grip_y, grip_sep, weapon_deg)
    alongside body joints and then applies exact 2-bone two-handed IK on every frame!
    """
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
    for k in TWO_HAND_NUMERIC_KEYS:
        if k in defaults or k in d0 or k in d1:
            v0 = d0.get(k, defaults.get(k, 0.0))
            v1 = d1.get(k, defaults.get(k, 0.0))
            out[k] = v0 + (v1 - v0) * u

    active_d = d0 if raw_u < 0.5 else d1
    all_meta = (
        "right_arm_in_front", "right_leg_behind", "mane_in_front",
        "show_weapon", "planted_weapon", "resting_weapon", "centered_mode",
        "forge_aegis", "halo_active", "halo_grand", "two_handed_ik",
    ) + tuple(extra_meta_keys)
    for mk in all_meta:
        if mk in active_d:
            out[mk] = active_d[mk]

    out["mane_wave_phase"] = ph * wave_mult
    return apply_2h_maul_ik(out)


def save_debug_parts_sheet(parts, out_path):
    """Saves a 5x3 contact sheet of all 15 segmented rig parts on a contrasting slate-indigo grid."""
    names = [
        "mane", "head", "torso", "l_coat", "r_coat",
        "l_sode", "l_forearm", "r_sode", "r_forearm", "l_thigh",
        "l_shin", "l_foot", "r_thigh", "r_shin", "r_foot",
    ]
    cw, ch = 220, 220
    pad = 16
    im = Image.new("RGBA", (5 * (cw + pad) + pad, 3 * (ch + pad + 20) + pad), (24, 28, 44, 255))
    d = ImageDraw.Draw(im)
    for idx, nm in enumerate(names):
        c = idx % 5
        r = idx // 5
        ox = pad + c * (cw + pad)
        oy = pad + 20 + r * (ch + pad + 20)
        d.rectangle([ox, oy, ox + cw, oy + ch], fill=(44, 52, 78, 255), outline=(92, 104, 142, 255), width=1)
        if nm in parts:
            pim, _, _ = parts[nm]
            pw, ph = pim.size
            d.text((ox + 2, oy - 16), f"{nm} ({pw}x{ph})", fill=(255, 232, 165, 255))
            scale = min(1.0, (cw - 16) / max(1, pw), (ch - 16) / max(1, ph))
            if scale < 1.0:
                pim = pim.resize((max(1, int(pw * scale)), max(1, int(ph * scale))), Image.Resampling.NEAREST)
            px = ox + (cw - pim.size[0]) // 2
            py = oy + (ch - pim.size[1]) // 2
            im.alpha_composite(pim, (px, py))
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    im.save(out_path)


def load_and_segment_512(save_debug=True):
    arr = clean_base_512(BASE_IMG_PATH, head_y_split=140)
    H, W = 512, 512
    a = arr[:, :, 3] > 0

    # All polygon coordinates below are directly in 512x512 rig space (from debug_titan_v5_grid.png)
    # 1. Horned Golden Khazad Helm + Emerald-Jade Brow Gem + Glowing Jade Eyes + Nose + Cheek Guards
    m_head = poly_mask(H, W, [
        (188, 0), (332, 0), (332, 88), (308, 98), (306, 126),
        (294, 118), (270, 118), (254, 126), (252, 148), (232, 148),
        (220, 122), (216, 88), (188, 74)
    ]) & a

    # 2. 3-Braid Fiery Copper-Orange Dwarven Beard with Gold Beard-Rings
    m_mane = poly_mask(H, W, [
        (224, 116), (312, 116), (334, 162), (334, 224), (310, 228),
        (308, 256), (274, 258), (262, 230), (240, 226), (224, 180)
    ]) & a & (~m_head)

    # 3. Left Curved Ram-Horn Pauldron & Muscular Bicep (l_sode) + Jade-Rune Gauntlet Forearm (l_forearm)
    m_l_sode = poly_mask(H, W, [
        (74, 82), (218, 82), (218, 152), (192, 178), (194, 236),
        (168, 252), (144, 238), (94, 220), (74, 158)
    ]) & a & (~m_head) & (~m_mane)

    m_l_forearm = poly_mask(H, W, [
        (88, 218), (148, 236), (176, 252), (180, 374), (108, 374), (88, 286)
    ]) & a & (~m_l_sode)

    # 4. Right Curved Ram-Horn Pauldron & Bicep (r_sode) + Gauntlet Forearm (r_forearm)
    m_r_sode = poly_mask(H, W, [
        (312, 88), (408, 88), (408, 182), (392, 224), (344, 254),
        (336, 200), (354, 180), (326, 152)
    ]) & a & (~m_head) & (~m_mane)

    m_r_forearm = poly_mask(H, W, [
        (338, 250), (388, 220), (428, 312), (428, 370), (356, 370), (340, 288)
    ]) & a & (~m_r_sode)

    # 5. Left & Right Tiered Obsidian-and-Gold Hip Tassets (l_coat, r_coat)
    m_l_coat = poly_mask(H, W, [
        (168, 294), (246, 296), (246, 326), (228, 366), (168, 362)
    ]) & a & (~m_l_forearm) & (~m_l_sode)

    m_r_coat = poly_mask(H, W, [
        (320, 292), (354, 292), (356, 356), (332, 358), (320, 322)
    ]) & a & (~m_r_forearm) & (~m_r_sode)

    # 6. Torso: Volcanic Obsidian Breastplate + Shoulder Jade Clasps + Giant Octagonal Jade Belt Core
    #    + Narrow Center Gold-Trimmed Loincloth Tabard (x=246..322 down to y=400)
    m_torso = poly_mask(H, W, [
        (184, 132), (356, 132), (356, 294), (322, 298),
        (322, 376), (284, 402), (246, 376), (246, 298), (184, 294)
    ]) & a & (~m_head) & (~m_mane) & (~m_l_sode) & (~m_l_forearm) & (~m_r_sode) & (~m_r_forearm) & (~m_l_coat) & (~m_r_coat)

    # 7. Left & Right Armored Legs (Thighs + Obsidian-Gold Greaves + Heavy Forge-Boots)
    m_l_foot = poly_mask(H, W, [(140, 456), (226, 456), (226, 511), (140, 511)]) & a
    m_l_shin = poly_mask(H, W, [(148, 392), (240, 392), (240, 462), (148, 462)]) & a & (~m_l_foot) & (~m_torso)
    m_l_thigh = poly_mask(H, W, [(160, 304), (250, 304), (250, 398), (160, 398)]) & a & (~m_torso) & (~m_l_coat) & (~m_l_forearm) & (~m_l_shin) & (~m_l_foot)

    m_r_foot = poly_mask(H, W, [(276, 454), (396, 454), (396, 511), (276, 511)]) & a
    m_r_shin = poly_mask(H, W, [(278, 392), (370, 392), (370, 460), (278, 460)]) & a & (~m_r_foot) & (~m_torso)
    m_r_thigh = poly_mask(H, W, [(282, 304), (364, 304), (364, 398), (282, 398)]) & a & (~m_torso) & (~m_r_coat) & (~m_r_forearm) & (~m_r_shin) & (~m_r_foot)

    masks = assign_remaining_geodesic(a, [
        ("mane", m_mane), ("head", m_head), ("torso", m_torso),
        ("l_coat", m_l_coat), ("r_coat", m_r_coat),
        ("l_sode", m_l_sode), ("l_forearm", m_l_forearm),
        ("r_sode", m_r_sode), ("r_forearm", m_r_forearm),
        ("l_thigh", m_l_thigh), ("l_shin", m_l_shin), ("l_foot", m_l_foot),
        ("r_thigh", m_r_thigh), ("r_shin", m_r_shin), ("r_foot", m_r_foot),
    ])

    # Gently extend top of l_thigh & r_thigh under the hip tassets using natural dark basalt shading
    l_thigh_only = dict(masks)["l_thigh"]
    under_tasset_l = poly_mask(H, W, [(178, 308), (242, 308), (242, 344), (178, 344)]) & a & (~l_thigh_only)
    l_thigh_arr = arr.copy()
    il_ys, il_xs = np.where(under_tasset_l)
    for y, x in zip(il_ys, il_xs):
        l_thigh_arr[y, x] = [52, 60, 78, 255] if (x < 210) else [34, 40, 54, 255]

    r_thigh_only = dict(masks)["r_thigh"]
    under_loincloth_r = poly_mask(H, W, [(298, 308), (348, 308), (348, 344), (298, 344)]) & a & (~r_thigh_only)
    r_thigh_arr = arr.copy()
    ir_ys, ir_xs = np.where(under_loincloth_r)
    for y, x in zip(ir_ys, ir_xs):
        r_thigh_arr[y, x] = [52, 60, 78, 255] if (x < 326) else [34, 40, 54, 255]

    # Basalt chest plate behind the bottom tip of the beard so beard sway never exposes white/transparent pixels
    torso_only = dict(masks)["torso"]
    under_beard = m_mane & poly_mask(H, W, [(236, 175), (322, 175), (322, 256), (236, 256)]) & (~torso_only)
    torso_arr = arr.copy()
    ub_ys, ub_xs = np.where(under_beard)
    for y, x in zip(ub_ys, ub_xs):
        torso_arr[y, x] = [52, 60, 78, 255] if abs(x - 274) < 22 else [34, 40, 54, 255]

    patched_masks = []
    for nm, m in masks:
        if nm == "torso":
            patched_masks.append((nm, m | under_beard))
        elif nm == "l_thigh":
            patched_masks.append((nm, m | under_tasset_l))
        elif nm == "r_thigh":
            patched_masks.append((nm, m | under_loincloth_r))
        else:
            patched_masks.append((nm, m))

    parts = extract_parts_512(
        arr, patched_masks,
        custom_part_arrays={"torso": torso_arr, "l_thigh": l_thigh_arr, "r_thigh": r_thigh_arr},
    )
    if save_debug:
        save_debug_parts_sheet(parts, os.path.join(ARTIFACT_DIR, "debug_titan_v5_parts.png"))
    return parts


def draw_forge_crucible_halo_104(arr, nk_x, nk_y, radius=16.5, phase=0.0, grand=False):
    """
    Draws a rotating 8-Cog Dwarven World-Forge Crucible Halo behind Torgar's shoulders:
    - Obsidian & burnished bronze gear ring
    - 8 rotating Dwarven anvil-cogs studded with alternating World-Forge Jade and Molten Gold cores!
    """
    cx = nk_x - 2.0
    cy = nk_y + 3.0
    r_eff = radius + (1.8 if grand else 0.0)
    n_pts = 48 if grand else 36
    for i in range(n_pts):
        ang = (i / float(n_pts)) * 2.0 * math.pi + phase * 0.45
        px = cx + math.cos(ang) * r_eff
        py = cy + math.sin(ang) * (r_eff * 0.86)
        put_px(arr, px, py, C_GOLD if (i % 3 == 0) else C_BRONZE)
        put_px(arr, px * 0.94 + cx * 0.06, py * 0.94 + cy * 0.06, C_BASALT_DARK)

    n_cogs = 8
    for k in range(n_cogs):
        ang = (k / float(n_cogs)) * 2.0 * math.pi + phase * 0.45
        ca, sa = math.cos(ang), math.sin(ang)
        gx = cx + ca * (r_eff + 1.4)
        gy = cy + sa * ((r_eff + 1.4) * 0.86)
        put_px(arr, gx, gy, C_CORE if grand else (C_JADE_SPEC if k % 2 == 0 else C_GOLD_SPEC))
        put_px(arr, gx + 1, gy, C_JADE_LIT if k % 2 == 0 else C_MAGMA_ORANGE)
        put_px(arr, gx - 1, gy, C_GOLD)
        put_px(arr, gx, gy - 1, C_GOLD)
        put_px(arr, gx, gy + 1, C_BRONZE_DARK)


def draw_2h_worldbreaker_maul_104(
    arr, hx, hy, maul_deg, shaft_len=17.5, glow=1.0, phase=0.0, show_gauntlets=True
):
    """
    Draws Torgar's COLOSSAL TWO-HANDED WORLD-BREAKER MJOLNIR:
    - Solid 3D Burnished Bronze, Forge-Gold, & Molten Core Runic Haft
    - Flared Dwarven Anvil Pommel with glowing Jade/Gold core (`da = -11.8..-9.2`)
    - SYMMETRIC Double-Faced Beveled Volcanic Mjolnir Hammerhead (`36x52px` in `208x208`):
      * Pinched Dwarven anvil waist (`|dp| in [3.6, 5.8]`) flaring to twin massive beveled
        striking blocks (`|dp| in [5.8, 12.4]`) — 100% upright & unmistakable at ANY angle!
      * Luminous Emerald-Jade & White-Hot Octagonal World-Forge Heart + Twin Cheek Runes
    - Two Armored Bronze-and-Obsidian Gauntlet Knuckle Clasps locking BOTH hands onto the haft!
    """
    rad = math.radians(maul_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    # 1. Solid 3D Burnished Forge-Gold, Bronze & Molten-Core Two-Handed Haft
    for da in np.linspace(-11.8, shaft_len - 2.6, 56):
        if da < -9.2:
            half_w = 2.6
        elif da > shaft_len - 5.2:
            u_col = (da - (shaft_len - 5.2)) / 2.6
            half_w = 2.1 + 1.4 * min(1.0, max(0.0, u_col))
        else:
            half_w = 2.05

        is_ring = (abs((da + 10.0) % 3.2) < 0.55) or (da > shaft_len - 4.8) or (da < -9.2)
        for dp in np.linspace(-half_w, half_w, 13):
            px = hx + ux * da + nx * dp
            py = hy + uy * da + ny * dp
            adp = abs(dp)
            if da < -10.8 and adp < 1.2:
                col = C_CORE if adp < 0.5 else C_JADE_SPEC
            elif adp >= half_w - 0.52:
                col = C_BRONZE_DARK if dp < 0.0 else C_OUT
            elif abs(dp) <= 0.52:
                col = C_GOLD_SPEC if is_ring else (C_MAGMA_ORANGE if glow > 0.4 else C_GOLD)
            elif dp < 0.0:
                col = C_GOLD_SPEC if is_ring else C_GOLD
            else:
                col = C_GOLD if is_ring else C_BRONZE
            put_px(arr, px, py, col)

    # 2. SYMMETRIC Double-Faced Beveled Volcanic Mjolnir Hammerhead
    tx, ty = hx + ux * shaft_len, hy + uy * shaft_len
    for da in np.linspace(-8.2, 9.2, 37):
        for dp in np.linspace(-12.6, 12.6, 53):
            adp = abs(dp)
            if adp <= 3.6:
                max_da_neg, max_da_pos = -5.8, 6.8
            elif adp <= 5.8:
                max_da_neg, max_da_pos = -4.6, 5.5
            else:
                flare = min(1.0, (adp - 5.8) / 3.0)
                max_da_neg = -4.6 - 3.2 * flare
                max_da_pos = 5.5 + 3.4 * flare
                if adp > 10.8:
                    chamfer_lim = 7.8 - (adp - 10.8) * 1.65
                    if abs(da - 0.45) > chamfer_lim:
                        continue

            if da < max_da_neg or da > max_da_pos:
                continue

            on_outer_edge = (
                (adp > 11.7)
                or (da < max_da_neg + 0.9)
                or (da > max_da_pos - 0.9)
            )
            on_gold_trim = (
                (10.0 <= adp <= 11.7)
                or (abs(adp - 5.8) < 0.72)
                or (da < max_da_neg + 1.9)
                or (da > max_da_pos - 1.9)
            )

            px = tx + ux * da + nx * dp
            py = ty + uy * da + ny * dp

            d_core = abs(da - 0.45) * 0.68 + adp * 0.52
            d_cheek_rune = abs(da - 0.45) * 0.85 + abs(adp - 8.4) * 0.85
            crack = abs((adp - 7.8) - (da - 0.4) * 0.72) < 0.82 and (4.6 <= adp <= 10.6)

            # Top-sky directional lighting based on world-space normal `ny` so top bevels gleam!
            face_ny = dp * ny
            if on_outer_edge:
                col = C_OUT
            elif d_core <= 1.75 and glow > 0.3:
                col = C_CORE
            elif d_core <= 3.40 and glow > 0.2:
                col = C_JADE_SPEC if d_core <= 2.5 else C_JADE_LIT
            elif d_core <= 4.45:
                col = C_GOLD_SPEC
            elif d_cheek_rune <= 1.95 and glow > 0.3:
                col = C_JADE_SPEC if d_cheek_rune <= 1.1 else C_JADE_LIT
            elif crack and glow > 0.35:
                col = C_GOLD_SPEC if (adp < 8.4) else C_MAGMA_ORANGE
            elif on_gold_trim:
                col = C_GOLD_SPEC if (adp > 9.8 or face_ny < -1.5 or da > 4.0) else (C_GOLD if face_ny <= 2.5 else C_BRONZE)
            else:
                if face_ny < -2.0:
                    col = C_BASALT_MID
                elif face_ny > 3.0:
                    col = C_BASALT_DARK if da < 0.0 else C_BASALT_BASE
                else:
                    col = C_BASALT_MID if da > 0.2 else C_BASALT_BASE
            put_px(arr, px, py, col)

    # Top Crown Finial integrated into the Mjolnir Head
    for da_fin in np.linspace(6.6, 9.8, 8):
        hw_f = max(0.0, 2.8 * (1.0 - (da_fin - 6.6) / 3.4))
        for dp_f in np.linspace(-hw_f, hw_f, 6):
            put_px(
                arr,
                tx + ux * da_fin + nx * dp_f,
                ty + uy * da_fin + ny * dp_f,
                C_CORE if da_fin > 8.6 else (C_GOLD_SPEC if abs(dp_f) < 0.9 else C_BRONZE),
            )

    # 3. Two Armored Bronze-and-Basalt Gauntlet Knuckle Clasps (Upper r_hand + Lower l_hand)
    if show_gauntlets:
        for proj, is_near in ((0.0, False), (-6.0, True)):
            cx = hx + ux * proj
            cy = hy + uy * proj
            for u_off in (-1.2, -0.4, 0.4, 1.2):
                for n_off in (-2.0, -1.0, 0.0, 1.0, 2.0):
                    px = cx + ux * u_off + nx * n_off
                    py = cy + uy * u_off + ny * n_off
                    if abs(n_off) >= 1.85:
                        col = C_BRONZE_DARK if n_off < 0 else C_OUT
                    elif abs(u_off) >= 0.95:
                        col = C_GOLD_SPEC if n_off <= 0 else C_GOLD
                    elif abs(n_off) <= 0.55:
                        col = C_JADE_LIT if is_near else C_GOLD_SPEC
                    else:
                        col = C_BASALT_MID if n_off < 0 else C_BRONZE
                    put_px(arr, px, py, col)


def draw_horizontal_bat_arc_104(arr, cx, cy, rx=31.0, ry=7.8, a0_deg=155.0, a1_deg=6.0, intensity=1.2):
    """
    Draws a razor-sharp 2.5D Horizontal Baseball-Bat Swing Crescent across chest/shoulder
    height for Torgar's WORLD-BREAKER HOME RUN (`Row 4 F06..F10`) — ZERO vertical chop circles!
    """
    steps = 76
    for i in range(steps + 1):
        u = i / float(steps)
        ang = math.radians(a0_deg + (a1_deg - a0_deg) * u)
        ca, sa = math.cos(ang), math.sin(ang)
        thick = (1.5 + 3.5 * (u ** 1.25)) * min(1.35, intensity)
        for dr in np.linspace(-thick * 0.85, thick * 0.75, 11):
            px = cx + ca * (rx + dr)
            py = cy + sa * (ry + dr * 0.42)
            if abs(dr) >= thick * 0.68:
                col = C_OUT
            elif u > 0.65 and abs(dr) < 0.85:
                col = C_CORE
            elif abs(dr) < 1.25:
                col = C_GOLD_SPEC if u > 0.28 else C_MAGMA_ORANGE
            elif dr < 0:
                col = C_JADE_SPEC if u > 0.55 else C_JADE_LIT
            else:
                col = C_MAGMA_ORANGE if u > 0.35 else C_BRONZE
            put_px(arr, px, py, col)


def draw_forge_aegis_arc_104(arr, cx, cy, phase=0.0):
    """
    Draws a curved Molten Gold & Emerald-Jade Forge-Aegis Bulwark Shield Arc ahead of
    Torgar's Colossal Maul during Row 6 (Battering-Ram Dash) & Row 7 (Runic Anvil Bulwark)!
    """
    for i in range(-14, 15):
        ang = (i / 14.0) * 1.02
        rx = cx + math.cos(ang) * 9.5
        ry = cy + math.sin(ang) * 15.0
        is_node = (abs(i) % 4 == 0)
        put_px(arr, rx, ry, C_CORE if is_node else C_GOLD_SPEC)
        put_px(arr, rx - 1.0, ry, C_JADE_LIT if (abs(i) % 2 == 0) else C_MAGMA_ORANGE)
        put_px(arr, rx - 2.0, ry, C_BRONZE)
        if abs(i) in (0, 5, 10, 14):
            put_px(arr, rx + 1.0, ry, C_JADE_SPEC)


def extra_extents(joints_c, cfg, scale):
    pts = []
    if cfg.get("show_weapon", True):
        if cfg.get("planted_weapon", False):
            return pts
        h = joints_c["r_hand"]
        rad = math.radians(cfg.get("weapon_deg", -38.0))
        ux, uy = math.cos(rad), math.sin(rad)
        nx, ny = -uy, ux
        wlen = cfg.get("weapon_len", 17.5)
        pts.append((h[0] - ux * (13.0 / scale), h[1] - uy * (13.0 / scale)))
        head_cx = h[0] + ux * ((wlen + 9.6) / scale)
        head_cy = h[1] + uy * ((wlen + 9.6) / scale)
        pts.append((head_cx + nx * (13.5 / scale), head_cy + ny * (13.5 / scale)))
        pts.append((head_cx - nx * (13.5 / scale), head_cy - ny * (13.5 / scale)))
    return pts


def draw_back(bg, joints104, cfg):
    ph = cfg.get("mane_wave_phase", 0.0)
    if cfg.get("halo_active", True):
        nk = joints104["neck"]
        draw_forge_crucible_halo_104(
            bg, nk[0], nk[1],
            radius=cfg.get("halo_r", 16.5),
            phase=ph,
            grand=cfg.get("halo_grand", False),
        )


def draw_front(out, joints104, cfg):
    ph = cfg.get("mane_wave_phase", 0.0)

    if cfg.get("show_weapon", True):
        if cfg.get("planted_weapon", False):
            rh = joints104["r_hand"]
            px_plant = min(64.0, max(42.0, rh[0] + 1.0))
            py_plant = min(90.0, max(82.0, rh[1] + 1.0))
            draw_2h_worldbreaker_maul_104(
                out, px_plant, py_plant,
                maul_deg=10.0, shaft_len=14.0, glow=cfg.get("weapon_glow", 0.55),
                phase=ph, show_gauntlets=True,
            )
        else:
            rh = joints104["r_hand"]
            draw_2h_worldbreaker_maul_104(
                out, rh[0], rh[1],
                maul_deg=cfg.get("weapon_deg", -38.0),
                shaft_len=cfg.get("weapon_len", 17.5),
                glow=cfg.get("weapon_glow", 1.0),
                phase=ph,
                show_gauntlets=True,
            )


DEFAULTS = dict(
    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5, mane_rel_deg=-1.0,
    mane_wave_amp=2.6, mane_in_front=True,
    l_thigh_deg=-2.0, l_shin_deg=2.0, l_foot_deg=0.0,
    r_thigh_deg=2.0, r_shin_deg=-2.0, r_foot_deg=0.0,
    l_sode_rel_deg=-6.0, l_fore_rel_deg=-10.0, r_sode_rel_deg=-12.0, r_fore_rel_deg=-14.0,
    l_coat_rel_deg=0.0, r_coat_rel_deg=0.0,
    grip_x=52.0, grip_y=-14.0, grip_sep=38.0,
    weapon_deg=-38.0, weapon_len=17.5, weapon_glow=1.0, foot_y=99.0,
    show_weapon=True, two_handed_ik=True, halo_active=True, halo_grand=False,
    forge_aegis=False, right_arm_in_front=False, right_leg_behind=False,
)


def render_frame(parts, cfg):
    return render_rig_104(
        parts, PIVOTS, cfg, PALETTE_CFG,
        y_bot_base=504.0, default_S=608,
        extra_extent_fn=extra_extents, draw_back_fn=draw_back, draw_front_fn=draw_front,
    )


def build_row_configs(row_idx):
    cfgs = []
    for f in range(COLS):
        t = f / float(COLS)
        ph = 2.0 * math.pi * t

        if row_idx == 0:
            # Row 0: IDLE (Commanding 2H World-Forge Sovereign Guard + Rotating 8-Cog Crucible Halo)
            b = math.sin(ph)
            s = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dx=s * 2.5, pelvis_dy=b * 7.0, torso_deg=3.0 + b * 1.8,
                head_rel_deg=-1.5 - b * 1.0, mane_rel_deg=-1.0 + s * 2.2,
                mane_wave_phase=ph,
                grip_x=52.0 + s * 2.5, grip_y=-14.0 + b * 3.5,
                weapon_deg=-38.0 + b * 3.0, weapon_glow=0.88 + 0.12 * b,
                halo_active=True,
            )
            cfgs.append(apply_2h_maul_ik(cfg))

        elif row_idx == 1:
            # Row 1: WALK (Authentic Bipedal Crossover World-Forge Warhammer Stride!)
            c_step = math.cos(ph)
            gait = compute_bipedal_walk_pose(PIVOTS, f, cols=COLS, stride_scale=0.78)
            gait["l_hip_dy"] -= 1.7
            gait["r_hip_dy"] += 1.7
            cfg = dict(DEFAULTS)
            cfg.update(gait)
            cfg.update(
                pelvis_dx=0.0, pelvis_dy=0.0,
                torso_deg=6.0 + 2.0 * abs(c_step), head_rel_deg=-3.0,
                mane_rel_deg=-2.5 - 2.2 * abs(c_step), mane_wave_phase=ph * 2.0, mane_wave_amp=3.2,
                grip_x=53.0 - c_step * 8.5, grip_y=-13.0 + abs(c_step) * 4.0,
                weapon_deg=-36.0 - c_step * 9.5, weapon_glow=0.90 + 0.10 * math.sin(ph),
                foot_y=99.0,
            )
            cfg = apply_2h_maul_ik(cfg)
            cfg["right_arm_in_front"] = False
            cfgs.append(cfg)

        elif row_idx == 2:
            # Row 2: AUTO_ATTACK — 4 Distinct Full-Body 2H Symmetric Mjolnir Warhammer Animations
            # (ZERO slash_arc and ZERO forge_aegis on ANY frame; Mjolnir head strictly inside 4..99!)
            # - Slice 0 (F00..F07, 8f -> 60..67): Overhead Earth-Splitter Slam (tall hoist -> deep split-knee floor smash)
            # - Slice 1 (F08..F14, 7f -> 68..74): Leaping Sky-Breaker Uppercut (deep crouch scoop -> airborne high-knee skyward uppercut)
            # - Slice 2 (F15..F22, 8f -> 75..82): Khazad Battering-Ram Drive (pivoting stance swap -> horizontal 2H battering-ram punch)
            # - Slice 3 (F23..F29, 7f -> 83..89): World-Anvil Sweeping Back-Crush (rear-shoulder windup -> chest-high cross-body crush)
            if f <= 7:
                kfs = [
                    (0, dict(pelvis_dx=0.0, pelvis_dy=2.0, torso_deg=2.5, head_rel_deg=-1.0, mane_rel_deg=-1.0,
                             l_thigh_deg=-4.0, l_shin_deg=6.0, r_thigh_deg=6.0, r_shin_deg=-4.0,
                             grip_x=50.0, grip_y=-20.0, weapon_deg=-42.0, grip_sep=38.0,
                             foot_y=99.0, halo_grand=False)),
                    (2, dict(pelvis_dx=-10.0, pelvis_dy=-2.0, torso_deg=-15.0, head_rel_deg=10.0, mane_rel_deg=8.0,
                             l_thigh_deg=-14.0, l_shin_deg=14.0, r_thigh_deg=16.0, r_shin_deg=-10.0,
                             grip_x=38.0, grip_y=-96.0, weapon_deg=-78.0, grip_sep=33.0,
                             foot_y=97.5, halo_grand=True)),
                    (4, dict(pelvis_dx=18.0, pelvis_dy=50.0, torso_deg=23.0, head_rel_deg=-10.0, mane_rel_deg=-11.0,
                             l_thigh_deg=-26.0, l_shin_deg=28.0, r_thigh_deg=25.0, r_shin_deg=-20.0,
                             grip_x=72.0, grip_y=4.0, weapon_deg=12.0, grip_sep=38.0,
                             foot_y=99.0, halo_grand=True)),
                    (5, dict(pelvis_dx=20.0, pelvis_dy=54.0, torso_deg=25.0, head_rel_deg=-11.0, mane_rel_deg=-12.0,
                             l_thigh_deg=-28.0, l_shin_deg=30.0, r_thigh_deg=26.0, r_shin_deg=-22.0,
                             grip_x=74.0, grip_y=6.0, weapon_deg=14.0, grip_sep=38.0,
                             foot_y=99.0, halo_grand=True)),
                    (7, dict(pelvis_dx=4.0, pelvis_dy=8.0, torso_deg=4.0, head_rel_deg=-1.8, mane_rel_deg=-1.5,
                             l_thigh_deg=-3.0, l_shin_deg=4.0, r_thigh_deg=3.0, r_shin_deg=-3.0,
                             grip_x=53.0, grip_y=-15.0, weapon_deg=-37.0, grip_sep=38.0,
                             foot_y=99.0, halo_grand=False)),
                ]
                cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.0)
            elif f <= 14:
                kfs = [
                    (8, dict(pelvis_dx=-10.0, pelvis_dy=48.0, torso_deg=16.0, head_rel_deg=-6.0, mane_rel_deg=-6.0,
                             l_thigh_deg=-24.0, l_shin_deg=26.0, r_thigh_deg=22.0, r_shin_deg=-18.0,
                             grip_x=34.0, grip_y=2.0, weapon_deg=16.0, grip_sep=36.0,
                             foot_y=99.0, halo_grand=True)),
                    (9, dict(pelvis_dx=-14.0, pelvis_dy=56.0, torso_deg=20.0, head_rel_deg=-8.0, mane_rel_deg=-8.0,
                             l_thigh_deg=-28.0, l_shin_deg=30.0, r_thigh_deg=26.0, r_shin_deg=-20.0,
                             grip_x=28.0, grip_y=6.0, weapon_deg=20.0, grip_sep=36.0,
                             foot_y=99.0, halo_grand=True)),
                    (11, dict(pelvis_dx=18.0, pelvis_dy=-4.0, torso_deg=-17.0, head_rel_deg=11.0, mane_rel_deg=9.0,
                              l_thigh_deg=20.0, l_shin_deg=18.0, r_thigh_deg=-34.0, r_shin_deg=40.0,
                              grip_x=66.0, grip_y=-88.0, weapon_deg=-66.0, grip_sep=34.0,
                              foot_y=94.5, halo_grand=True)),
                    (12, dict(pelvis_dx=15.0, pelvis_dy=2.0, torso_deg=-13.0, head_rel_deg=8.0, mane_rel_deg=6.0,
                              l_thigh_deg=16.0, l_shin_deg=16.0, r_thigh_deg=-24.0, r_shin_deg=28.0,
                              grip_x=64.0, grip_y=-80.0, weapon_deg=-62.0, grip_sep=35.0,
                              foot_y=96.2, halo_grand=True)),
                    (14, dict(pelvis_dx=3.0, pelvis_dy=8.0, torso_deg=3.5, head_rel_deg=-1.8, mane_rel_deg=-1.5,
                              l_thigh_deg=2.0, l_shin_deg=4.0, r_thigh_deg=-2.0, r_shin_deg=4.0,
                              grip_x=53.0, grip_y=-18.0, weapon_deg=-38.0, grip_sep=38.0,
                              foot_y=99.0, halo_grand=False)),
                ]
                cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.2)
            elif f <= 22:
                kfs = [
                    (15, dict(pelvis_dx=-14.0, pelvis_dy=26.0, torso_deg=-12.0, head_rel_deg=7.0, mane_rel_deg=5.0,
                              right_leg_behind=True,
                              l_thigh_deg=20.0, l_shin_deg=18.0, r_thigh_deg=-20.0, r_shin_deg=16.0,
                              grip_x=24.0, grip_y=-28.0, weapon_deg=-46.0, grip_sep=32.5,
                              foot_y=99.0, halo_grand=True)),
                    (17, dict(pelvis_dx=-22.0, pelvis_dy=36.0, torso_deg=-18.0, head_rel_deg=10.0, mane_rel_deg=8.0,
                              right_leg_behind=True,
                              l_thigh_deg=26.0, l_shin_deg=24.0, r_thigh_deg=-26.0, r_shin_deg=22.0,
                              grip_x=18.0, grip_y=-34.0, weapon_deg=-54.0, grip_sep=32.0,
                              foot_y=99.0, halo_grand=True)),
                    (19, dict(pelvis_dx=22.0, pelvis_dy=40.0, torso_deg=22.0, head_rel_deg=-10.0, mane_rel_deg=-11.0,
                              right_leg_behind=False,
                              l_thigh_deg=28.0, l_shin_deg=22.0, r_thigh_deg=-28.0, r_shin_deg=20.0,
                              grip_x=76.0, grip_y=-26.0, weapon_deg=-2.0, grip_sep=37.0,
                              foot_y=99.0, halo_grand=True)),
                    (20, dict(pelvis_dx=24.0, pelvis_dy=42.0, torso_deg=23.0, head_rel_deg=-10.0, mane_rel_deg=-12.0,
                              right_leg_behind=False,
                              l_thigh_deg=29.0, l_shin_deg=23.0, r_thigh_deg=-28.0, r_shin_deg=21.0,
                              grip_x=78.0, grip_y=-25.0, weapon_deg=-2.0, grip_sep=37.0,
                              foot_y=99.0, halo_grand=True)),
                    (22, dict(pelvis_dx=2.0, pelvis_dy=4.0, torso_deg=3.5, head_rel_deg=-1.5, mane_rel_deg=-1.0,
                              right_leg_behind=False,
                              l_thigh_deg=-2.0, l_shin_deg=3.0, r_thigh_deg=2.0, r_shin_deg=-2.0,
                              grip_x=52.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=38.0,
                              foot_y=99.0, halo_grand=False)),
                ]
                cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.2)
            else:
                kfs = [
                    (23, dict(pelvis_dx=-12.0, pelvis_dy=20.0, torso_deg=-11.0, head_rel_deg=7.0, mane_rel_deg=6.0,
                              l_thigh_deg=-14.0, l_shin_deg=16.0, r_thigh_deg=16.0, r_shin_deg=-12.0,
                              grip_x=-10.0, grip_y=-80.0, weapon_deg=-110.0, grip_sep=33.0,
                              right_arm_in_front=True, foot_y=99.0, halo_grand=True)),
                    (24, dict(pelvis_dx=-18.0, pelvis_dy=26.0, torso_deg=-15.0, head_rel_deg=9.0, mane_rel_deg=8.0,
                              l_thigh_deg=-18.0, l_shin_deg=20.0, r_thigh_deg=20.0, r_shin_deg=-14.0,
                              grip_x=-18.0, grip_y=-86.0, weapon_deg=-116.0, grip_sep=32.5,
                              right_arm_in_front=True, foot_y=99.0, halo_grand=True)),
                    (26, dict(pelvis_dx=20.0, pelvis_dy=34.0, torso_deg=18.0, head_rel_deg=-8.0, mane_rel_deg=-10.0,
                              l_thigh_deg=24.0, l_shin_deg=18.0, r_thigh_deg=-24.0, r_shin_deg=18.0,
                              grip_x=76.0, grip_y=-66.0, weapon_deg=-8.0, grip_sep=37.0,
                              right_arm_in_front=True, foot_y=99.0, halo_grand=True)),
                    (27, dict(pelvis_dx=22.0, pelvis_dy=36.0, torso_deg=19.0, head_rel_deg=-9.0, mane_rel_deg=-10.0,
                              l_thigh_deg=25.0, l_shin_deg=19.0, r_thigh_deg=-25.0, r_shin_deg=19.0,
                              grip_x=78.0, grip_y=-64.0, weapon_deg=-6.0, grip_sep=37.0,
                              right_arm_in_front=True, foot_y=99.0, halo_grand=True)),
                    (29, dict(pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5, mane_rel_deg=-1.0,
                              l_thigh_deg=-2.0, l_shin_deg=2.0, r_thigh_deg=2.0, r_shin_deg=-2.0,
                              grip_x=52.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=38.0,
                              right_arm_in_front=False, foot_y=99.0, halo_grand=False)),
                ]
                cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.3)
            cfg["forge_aegis"] = False
            cfg.pop("slash_arc", None)
            cfgs.append(cfg)

        elif row_idx == 3:
            # Row 3: SKILL (WORLD-ANVIL ALTAR & CANNONBALL DRIVE:
            # F00..F05 Low Coiled World-Anvil Summon -> F06..F10 Upright Shoulder Windup (-76 deg) ->
            # F11..F21 Explosive 2H Battering-Ram Golf-Drive -> F22..F29 Smooth Follow-Through)
            kfs = [
                (0, dict(pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5,
                         l_thigh_deg=-2.0, l_shin_deg=2.0, r_thigh_deg=2.0, r_shin_deg=-2.0,
                         grip_x=52.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=38.0, foot_y=99.0)),
                (4, dict(pelvis_dx=8.0, pelvis_dy=30.0, torso_deg=14.0, head_rel_deg=-6.0,
                         l_thigh_deg=16.0, l_shin_deg=18.0, r_thigh_deg=-18.0, r_shin_deg=14.0,
                         grip_x=64.0, grip_y=-8.0, weapon_deg=10.0, grip_sep=36.0,
                         halo_grand=True, foot_y=99.0)),
                (9, dict(pelvis_dx=-14.0, pelvis_dy=34.0, torso_deg=-12.0, head_rel_deg=8.0,
                         l_thigh_deg=-22.0, l_shin_deg=24.0, r_thigh_deg=22.0, r_shin_deg=-16.0,
                         grip_x=28.0, grip_y=-64.0, weapon_deg=-76.0, grip_sep=34.0,
                         halo_grand=True, foot_y=99.0)),
                (14, dict(pelvis_dx=16.0, pelvis_dy=36.0, torso_deg=18.0, head_rel_deg=-8.0,
                          l_thigh_deg=20.0, l_shin_deg=18.0, r_thigh_deg=-22.0, r_shin_deg=18.0,
                          grip_x=78.0, grip_y=-20.0, weapon_deg=-16.0, grip_sep=37.0,
                          halo_grand=True, foot_y=99.0)),
                (18, dict(pelvis_dx=20.0, pelvis_dy=24.0, torso_deg=12.0, head_rel_deg=-4.0,
                          l_thigh_deg=24.0, l_shin_deg=20.0, r_thigh_deg=-24.0, r_shin_deg=18.0,
                          grip_x=82.0, grip_y=-46.0, weapon_deg=-46.0, grip_sep=36.0,
                          halo_grand=True, foot_y=99.0)),
                (22, dict(pelvis_dx=14.0, pelvis_dy=20.0, torso_deg=8.0, head_rel_deg=-3.0,
                          l_thigh_deg=16.0, l_shin_deg=16.0, r_thigh_deg=-16.0, r_shin_deg=14.0,
                          grip_x=70.0, grip_y=-38.0, weapon_deg=-46.0, grip_sep=36.0,
                          halo_grand=True, foot_y=99.0)),
                (29, dict(pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5,
                          l_thigh_deg=-2.0, l_shin_deg=2.0, r_thigh_deg=2.0, r_shin_deg=-2.0,
                          grip_x=52.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=38.0,
                          halo_grand=False, foot_y=99.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if 12 <= f <= 20:
                u = (f - 12) / 8.0
                cfg["slash_arc"] = dict(
                    dx=6.0, dy=10.0, r=28.0,
                    a0=42.0 - 56.0 * u, a1=-24.0 - 52.0 * u,
                    intensity=1.25 - 0.20 * abs(u - 0.5),
                )
            cfgs.append(cfg)

        elif row_idx == 4:
            # Row 4: ULTIMATE (F00..F14: WORLD-BREAKER HOME RUN — True Slugger Horizontal Bat Swing!) &
            #        TRUE_ULTIMATE (F15..F29: GOD-HAMMER MJOLNIR SKY-UPPERCUT -> TOP-TELEPORT OVERHEAD HOIST -> METEOR SPIKE!):
            # - F00..F05: Slugger Rear-Shoulder Baseball-Bat Coil (hands pulled back to rear shoulder, Mjolnir cocked at -132 deg!)
            # - F06..F10: Blistering Chest-High Horizontal Home-Run Bat Swing (grip_x=+92, grip_y=-92, weapon_deg=-6 deg + flat 2.5D bat arc!)
            # - F11..F14: Grand-Slam High-Shoulder Follow-Through & Return to Guard
            # - F15..F19: TRUE_ULTIMATE Beat 1 & 2 — Deep Floor-Scoop Coil (F15..F16) -> Full-Extension Rising Sky-Uppercut (F17..F19)
            # - F20..F23: TRUE_ULTIMATE Beat 3 — Airborne Coiled Knee-Tuck & 2H Overhead Crown Hoist (grip_y=-152, weapon_deg=-108 deg!)
            # - F24..F29: TRUE_ULTIMATE Beat 4 — Violent Airborne Downward Meteor Spike (+34 deg!) -> Kneeling Crater Impact & Recovery!
            if f <= 14:
                kfs = [
                    (0, dict(pelvis_dx=0.0, pelvis_dy=8.0, torso_deg=3.0, head_rel_deg=-2.0,
                             l_thigh_deg=-6.0, l_shin_deg=8.0, r_thigh_deg=6.0, r_shin_deg=-6.0,
                             grip_x=48.0, grip_y=-24.0, weapon_deg=-42.0, grip_sep=36.0,
                             right_arm_in_front=False, foot_y=99.0, halo_grand=True)),
                    (3, dict(pelvis_dx=-16.0, pelvis_dy=22.0, torso_deg=-12.0, head_rel_deg=12.0, mane_rel_deg=8.0,
                             l_thigh_deg=-22.0, l_shin_deg=24.0, r_thigh_deg=22.0, r_shin_deg=-14.0,
                             grip_x=-34.0, grip_y=-104.0, weapon_deg=-112.0, grip_sep=32.0,
                             right_arm_in_front=True, foot_y=99.0, halo_grand=True)),
                    (5, dict(pelvis_dx=-20.0, pelvis_dy=26.0, torso_deg=-15.0, head_rel_deg=15.0, mane_rel_deg=10.0,
                             l_thigh_deg=-26.0, l_shin_deg=28.0, r_thigh_deg=26.0, r_shin_deg=-16.0,
                             grip_x=-42.0, grip_y=-108.0, weapon_deg=-116.0, grip_sep=32.0,
                             right_arm_in_front=True, foot_y=99.0, halo_grand=True)),
                    (6, dict(pelvis_dx=8.0, pelvis_dy=28.0, torso_deg=4.0, head_rel_deg=-2.0, mane_rel_deg=-2.0,
                             l_thigh_deg=12.0, l_shin_deg=16.0, r_thigh_deg=-12.0, r_shin_deg=12.0,
                             grip_x=44.0, grip_y=-88.0, weapon_deg=-34.0, grip_sep=35.0,
                             right_arm_in_front=True, foot_y=99.0, halo_grand=True)),
                    (8, dict(pelvis_dx=26.0, pelvis_dy=32.0, torso_deg=16.0, head_rel_deg=-10.0, mane_rel_deg=-10.0,
                             l_thigh_deg=26.0, l_shin_deg=20.0, r_thigh_deg=-26.0, r_shin_deg=18.0,
                             grip_x=90.0, grip_y=-86.0, weapon_deg=-4.0, grip_sep=37.0,
                             right_arm_in_front=True, foot_y=99.0, halo_grand=True)),
                    (11, dict(pelvis_dx=24.0, pelvis_dy=26.0, torso_deg=18.0, head_rel_deg=-10.0, mane_rel_deg=-8.0,
                              l_thigh_deg=24.0, l_shin_deg=18.0, r_thigh_deg=-22.0, r_shin_deg=16.0,
                              grip_x=82.0, grip_y=-100.0, weapon_deg=-22.0, grip_sep=36.0,
                              right_arm_in_front=True, foot_y=99.0, halo_grand=True)),
                    (14, dict(pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5, mane_rel_deg=-1.0,
                              l_thigh_deg=-2.0, l_shin_deg=2.0, r_thigh_deg=2.0, r_shin_deg=-2.0,
                              grip_x=52.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=38.0,
                              right_arm_in_front=False, foot_y=99.0, halo_grand=False)),
                ]
                cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.8)
                if 6 <= f <= 10:
                    u = (f - 6) / 4.0
                    # Sweep across the FRONT (+Y, +90 deg) 2.5D horizontal batting plane right into Mjolnir's head!
                    cfg["horiz_bat_arc"] = dict(
                        dx=4.0, dy=13.0, rx=32.5, ry=9.2,
                        a0=156.0 - 44.0 * u, a1=8.0 - 26.0 * u,
                        intensity=1.32,
                    )
            elif f <= 19:
                kfs = [
                    (15, dict(pelvis_dx=-14.0, pelvis_dy=54.0, torso_deg=20.0, head_rel_deg=-10.0, mane_rel_deg=-8.0,
                              l_thigh_deg=-28.0, l_shin_deg=30.0, r_thigh_deg=26.0, r_shin_deg=-20.0,
                              grip_x=22.0, grip_y=14.0, weapon_deg=28.0, grip_sep=35.0,
                              right_arm_in_front=True, foot_y=99.0, halo_grand=True)),
                    (16, dict(pelvis_dx=-16.0, pelvis_dy=56.0, torso_deg=22.0, head_rel_deg=-10.0, mane_rel_deg=-8.0,
                              l_thigh_deg=-30.0, l_shin_deg=32.0, r_thigh_deg=28.0, r_shin_deg=-22.0,
                              grip_x=18.0, grip_y=18.0, weapon_deg=32.0, grip_sep=35.0,
                              right_arm_in_front=True, foot_y=99.0, halo_grand=True)),
                    (17, dict(pelvis_dx=8.0, pelvis_dy=22.0, torso_deg=-2.0, head_rel_deg=4.0, mane_rel_deg=2.0,
                              l_thigh_deg=8.0, l_shin_deg=14.0, r_thigh_deg=-14.0, r_shin_deg=20.0,
                              grip_x=68.0, grip_y=-48.0, weapon_deg=-20.0, grip_sep=36.0,
                              right_arm_in_front=True, foot_y=97.0, halo_grand=True)),
                    (18, dict(pelvis_dx=20.0, pelvis_dy=-4.0, torso_deg=-18.0, head_rel_deg=14.0, mane_rel_deg=10.0,
                              l_thigh_deg=22.0, l_shin_deg=18.0, r_thigh_deg=-32.0, r_shin_deg=38.0,
                              grip_x=74.0, grip_y=-110.0, weapon_deg=-68.0, grip_sep=34.0,
                              right_arm_in_front=True, foot_y=93.0, halo_grand=True)),
                    (19, dict(pelvis_dx=16.0, pelvis_dy=0.0, torso_deg=-15.0, head_rel_deg=12.0, mane_rel_deg=8.0,
                              l_thigh_deg=18.0, l_shin_deg=16.0, r_thigh_deg=-26.0, r_shin_deg=30.0,
                              grip_x=70.0, grip_y=-104.0, weapon_deg=-66.0, grip_sep=35.0,
                              right_arm_in_front=True, foot_y=94.0, halo_grand=True)),
                ]
                cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0)
                if 17 <= f <= 19:
                    u = (f - 17) / 2.0
                    cfg["slash_arc"] = dict(
                        dx=7.0, dy=6.0, r=28.5,
                        a0=40.0 - 50.0 * u, a1=-24.0 - 52.0 * u,
                        intensity=1.28,
                    )
            else:
                kfs = [
                    (20, dict(pelvis_dx=6.0, pelvis_dy=2.0, torso_deg=-10.0, head_rel_deg=14.0, mane_rel_deg=8.0,
                              l_thigh_deg=20.0, l_shin_deg=24.0, r_thigh_deg=-42.0, r_shin_deg=48.0,
                              grip_x=22.0, grip_y=-128.0, weapon_deg=-86.0, grip_sep=33.0,
                              right_arm_in_front=True, foot_y=91.0, halo_grand=True)),
                    (21, dict(pelvis_dx=-2.0, pelvis_dy=2.0, torso_deg=-16.0, head_rel_deg=20.0, mane_rel_deg=11.0,
                              l_thigh_deg=-18.0, l_shin_deg=36.0, r_thigh_deg=-36.0, r_shin_deg=46.0,
                              grip_x=4.0, grip_y=-146.0, weapon_deg=-100.0, grip_sep=32.0,
                              right_arm_in_front=True, foot_y=89.0, halo_grand=True)),
                    (23, dict(pelvis_dx=-10.0, pelvis_dy=0.0, torso_deg=-22.0, head_rel_deg=26.0, mane_rel_deg=14.0,
                              l_thigh_deg=-28.0, l_shin_deg=44.0, r_thigh_deg=-38.0, r_shin_deg=48.0,
                              grip_x=-8.0, grip_y=-156.0, weapon_deg=-110.0, grip_sep=32.0,
                              right_arm_in_front=True, foot_y=88.0, halo_grand=True)),
                    (24, dict(pelvis_dx=12.0, pelvis_dy=12.0, torso_deg=12.0, head_rel_deg=-4.0, mane_rel_deg=-6.0,
                              l_thigh_deg=-16.0, l_shin_deg=30.0, r_thigh_deg=-22.0, r_shin_deg=34.0,
                              grip_x=78.0, grip_y=-68.0, weapon_deg=-10.0, grip_sep=36.0,
                              right_arm_in_front=True, foot_y=90.0, halo_grand=True)),
                    (26, dict(pelvis_dx=22.0, pelvis_dy=24.0, torso_deg=26.0, head_rel_deg=-8.0, mane_rel_deg=-12.0,
                              l_thigh_deg=-12.0, l_shin_deg=26.0, r_thigh_deg=-18.0, r_shin_deg=28.0,
                              grip_x=76.0, grip_y=4.0, weapon_deg=34.0, grip_sep=37.0,
                              right_arm_in_front=True, foot_y=92.0, halo_grand=True)),
                    (27, dict(pelvis_dx=22.0, pelvis_dy=56.0, torso_deg=28.0, head_rel_deg=-10.0, mane_rel_deg=-12.0,
                              l_thigh_deg=-28.0, l_shin_deg=30.0, r_thigh_deg=26.0, r_shin_deg=-22.0,
                              grip_x=78.0, grip_y=12.0, weapon_deg=20.0, grip_sep=38.0,
                              right_arm_in_front=True, foot_y=99.0, halo_grand=True)),
                    (29, dict(torso_deg=4.0, grip_x=52.0, grip_y=-14.0, weapon_deg=-38.0,
                              grip_sep=38.0, right_arm_in_front=False, foot_y=99.0, halo_grand=False)),
                ]
                cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0)
            cfgs.append(cfg)

        elif row_idx == 5:
            # Row 5: DEATH (2H Hurt Stagger -> Double-Knee Collapse -> Prone Collapse with Maul Resting Beside Hand)
            kfs = make_prone_knight_death_kfs(
                idle_weapon_deg=-38.0, plant_x=62.0, plant_y=88.0, use_planted_weapon=True, mane_front=True
            )
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, extra_meta_keys=("plant_x", "plant_y"), wave_mult=1.0)
            cfg["halo_active"] = (f <= 6)
            if f <= 7:
                u = f / 7.0
                cfg["two_handed_ik"] = True
                cfg["grip_x"] = 52.0 - 8.0 * u
                cfg["grip_y"] = -14.0 + 14.0 * u
                cfg["grip_sep"] = 36.0
                apply_2h_maul_ik(cfg)
            else:
                cfg["two_handed_ik"] = False
                if f <= 15:
                    cfg["l_sode_rel_deg"] = -54.0
                    cfg["l_fore_rel_deg"] = -22.0
            cfgs.append(cfg)

        elif row_idx == 6:
            # Row 6: DASH (Unstoppable Juggernaut Battering-Ram Bull-Charge + Forge-Aegis Shield Arc)
            st = math.sin(ph * 2.0)
            kfs = [
                (0, dict(torso_deg=3.0, grip_x=52.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=38.0, foot_y=99.0)),
                (6, dict(pelvis_dx=14.0, pelvis_dy=36.0, torso_deg=22.0, head_rel_deg=-10.0, mane_rel_deg=-12.0,
                         l_thigh_deg=26.0, l_shin_deg=28.0, r_thigh_deg=-22.0, r_shin_deg=20.0,
                         grip_x=62.0, grip_y=-22.0, weapon_deg=-16.0, grip_sep=36.0,
                         forge_aegis=True, halo_grand=True, foot_y=99.0)),
                (23, dict(pelvis_dx=14.0, pelvis_dy=36.0, torso_deg=22.0, head_rel_deg=-10.0, mane_rel_deg=-12.0,
                          l_thigh_deg=26.0, l_shin_deg=28.0, r_thigh_deg=-22.0, r_shin_deg=20.0,
                          grip_x=62.0, grip_y=-22.0, weapon_deg=-16.0, grip_sep=36.0,
                          forge_aegis=True, halo_grand=True, foot_y=99.0)),
                (29, dict(torso_deg=3.0, grip_x=52.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=38.0, foot_y=99.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.8)
            if 6 <= f <= 23:
                cfg["pelvis_dy"] += abs(st) * 9.0
                cfg["l_thigh_deg"] = st * 26.0
                cfg["r_thigh_deg"] = -st * 26.0
                cfg["grip_y"] += st * 3.0
                apply_2h_maul_ik(cfg)
            cfgs.append(cfg)

        elif row_idx == 7:
            # Row 7: CROUCH (Deep Squat Runic Anvil Bulwark Brace F04..F12 -> Explosive 2H Counter-Slam F13..F22)
            kfs = [
                (0, dict(torso_deg=3.0, grip_x=52.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=38.0)),
                (4, dict(pelvis_dx=-6.0, pelvis_dy=54.0, torso_deg=10.0, head_rel_deg=-6.0,
                         l_thigh_deg=-26.0, l_shin_deg=28.0, r_thigh_deg=24.0, r_shin_deg=-20.0,
                         grip_x=54.0, grip_y=-54.0, weapon_deg=-72.0, grip_sep=36.0,
                         forge_aegis=True, halo_grand=True)),
                (12, dict(pelvis_dx=-6.0, pelvis_dy=58.0, torso_deg=10.0, head_rel_deg=-6.0,
                          l_thigh_deg=-26.0, l_shin_deg=28.0, r_thigh_deg=24.0, r_shin_deg=-20.0,
                          grip_x=52.0, grip_y=-58.0, weapon_deg=-76.0, grip_sep=36.0,
                          forge_aegis=True, halo_grand=True)),
                (17, dict(pelvis_dx=14.0, pelvis_dy=54.0, torso_deg=20.0, head_rel_deg=-10.0,
                          l_thigh_deg=-22.0, l_shin_deg=24.0, r_thigh_deg=22.0, r_shin_deg=-18.0,
                          grip_x=72.0, grip_y=-4.0, weapon_deg=14.0, grip_sep=38.0,
                          forge_aegis=False, halo_grand=True)),
                (23, dict(pelvis_dx=10.0, pelvis_dy=46.0, torso_deg=14.0, head_rel_deg=-6.0,
                          l_thigh_deg=-18.0, l_shin_deg=20.0, r_thigh_deg=18.0, r_shin_deg=-14.0,
                          grip_x=64.0, grip_y=-8.0, weapon_deg=2.0, grip_sep=38.0,
                          forge_aegis=False, halo_grand=False)),
                (29, dict(torso_deg=3.0, grip_x=52.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=38.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.0)
            if 13 <= f <= 19:
                cfg["slash_arc"] = dict(dx=5.0, dy=15.0, r=27.0, a0=-58.0, a1=38.0, intensity=1.18)
            cfgs.append(cfg)

        elif row_idx == 8:
            # Row 8: JUMP (Meteor Anvil Vault Hoisting Colossal 2H Maul -> Crashing Two-Handed Crater Landing)
            kfs = [
                (0, dict(torso_deg=3.0, grip_x=52.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=38.0, foot_y=99.0)),
                (4, dict(pelvis_dy=46.0, torso_deg=14.0, l_thigh_deg=-24.0, l_shin_deg=26.0,
                         r_thigh_deg=22.0, r_shin_deg=-20.0,
                         grip_x=44.0, grip_y=-18.0, weapon_deg=-52.0, grip_sep=36.0, foot_y=99.0)),
                (11, dict(pelvis_dx=4.0, pelvis_dy=10.0, torso_deg=-12.0, head_rel_deg=8.0,
                          l_thigh_deg=22.0, l_shin_deg=34.0, r_thigh_deg=-14.0, r_shin_deg=26.0,
                          grip_x=40.0, grip_y=-104.0, weapon_deg=-78.0, grip_sep=33.0,
                          foot_y=92.0, halo_grand=True)),
                (15, dict(pelvis_dx=8.0, pelvis_dy=14.0, torso_deg=-8.0, head_rel_deg=6.0,
                          l_thigh_deg=24.0, l_shin_deg=32.0, r_thigh_deg=-14.0, r_shin_deg=24.0,
                          grip_x=48.0, grip_y=-88.0, weapon_deg=-74.0, grip_sep=34.0,
                          foot_y=93.0, halo_grand=True)),
                (20, dict(pelvis_dx=14.0, pelvis_dy=52.0, torso_deg=22.0, head_rel_deg=-10.0,
                          l_thigh_deg=-24.0, l_shin_deg=26.0, r_thigh_deg=24.0, r_shin_deg=-18.0,
                          grip_x=70.0, grip_y=-2.0, weapon_deg=14.0, grip_sep=38.0,
                          foot_y=99.0, halo_grand=True)),
                (25, dict(pelvis_dx=10.0, pelvis_dy=42.0, torso_deg=14.0, head_rel_deg=-6.0,
                          l_thigh_deg=-16.0, l_shin_deg=18.0, r_thigh_deg=16.0, r_shin_deg=-14.0,
                          grip_x=62.0, grip_y=-8.0, weapon_deg=2.0, grip_sep=38.0,
                          foot_y=99.0, halo_grand=False)),
                (29, dict(torso_deg=3.0, grip_x=52.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=38.0, foot_y=99.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if 16 <= f <= 21:
                cfg["slash_arc"] = dict(dx=4.0, dy=12.0, r=27.5, a0=-82.0, a1=42.0, intensity=1.18)
            cfgs.append(cfg)

    return cfgs


def main():
    parts = load_and_segment_512()
    picks = [
        (2, 6, "R2 A1: EARTH-SPLITTER"),
        (2, 15, "R2 A2: SKY-UPPERCUT"),
        (2, 25, "R2 A3: BATTERING RAM"),
        (4, 5, "R4 F05: BATTER COIL"),
        (4, 8, "R4 F08: HOME-RUN SWING"),
        (4, 18, "R4 F18: SKY-UPPERCUT"),
        (4, 22, "R4 F22: TOP CROWN HOIST"),
        (4, 26, "R4 F26: METEOR SPIKE"),
    ]
    build_and_save_30fps_sheet(
        "titan", parts, build_row_configs, render_frame,
        OUT_SHEET_PATH, VFX_SHEET_PATH, ARTIFACT_DIR,
        shimmer_cols=(C_JADE_SPEC, C_GOLD_SPEC), showcase_picks=picks,
    )


def build_row2_auto_only():
    parts = load_and_segment_512(save_debug=False)
    cfgs = build_row_configs(2)
    for idx, c in enumerate(cfgs):
        assert c.get("slash_arc") is None and not c.get("forge_aegis", False), (
            f"[titan] F{idx:02d} must have zero slash_arc and zero forge_aegis!"
        )
    frames_104 = [render_frame(parts, c) for c in cfgs]
    for idx, fr in enumerate(frames_104):
        a = fr[:, :, 3] > 0
        ys, xs = np.where(a)
        assert len(ys) > 0, f"[titan] Empty frame F{idx:02d}"
        assert int(ys.min()) >= 4 and int(ys.max()) <= 99 and int(xs.min()) >= 4 and int(xs.max()) <= 99, (
            f"[titan] F{idx:02d} raw bounds ({int(xs.min())}..{int(xs.max())}, {int(ys.min())}..{int(ys.max())}) outside safe 4..99!"
        )
    splice_row2_auto_surgically("titan", OUT_SHEET_PATH, frames_104, (C_JADE_SPEC, C_GOLD_SPEC))


if __name__ == "__main__":
    if "--auto-only" in sys.argv:
        build_row2_auto_only()
    else:
        main()

