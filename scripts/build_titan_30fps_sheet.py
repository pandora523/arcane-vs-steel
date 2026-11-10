#!/usr/bin/env python3
"""
Builds Torgar (Titan — Runic World-Forge Juggernaut) 30fps HD-2D Sprite Sheet
(6240x1872, 30 cols x 9 rows of 208x208) using titan_v3_base.jpg + hd2d_rig_core.

Key Features:
- 14-part dark volcanic basalt, molten magma, burnished bronze, & emerald-jade skeletal rig
  with full muscular armored thighs (l_thigh, r_thigh) cleanly separated from the central
  emerald-jade loincloth tabard and hip tassets (l_coat, r_coat).
- True Analytical 2-Bone Two-Handed IK (`apply_2h_maul_ik`) locking BOTH of Torgar's armored
  gauntlets onto a COLOSSAL TWO-HANDED WORLD-BREAKER WARHAMMER / VOLCANIC ANVIL-MAUL
  (`draw_2h_worldbreaker_maul_104`) across all 9 rows (`show_weapon=True` on every frame).
- Rotating 8-Cog Dwarven Forge-Crucible Halo behind his shoulders.
- Genuine 360-degree Two-Handed Tornado Maul Spin -> Leaping Anvil Slam on Row 3 (SKILL),
  and Ragnarok World-Forge Cataclysm (2H Forge-Sweep -> 2H Volcanic Uppercut -> High Airborne
  Leap -> Meteoric Top-Down World-Breaker Earthshatter Impact) on Row 4 (ULTIMATE).
"""

import os
import math
import numpy as np
from PIL import Image, ImageDraw
from hd2d_rig_core import (
    COLS, P, BASE_NUMERIC_KEYS, poly_mask, clean_base_512,
    assign_remaining_geodesic, extract_parts_512, rot_pt,
    put_px, draw_line_104, draw_slash_arc_104, render_rig_104,
    make_prone_knight_death_kfs, eval_pose_keyframes, build_and_save_30fps_sheet,
)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE_IMG_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "titan_v3_base.jpg")
OUT_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "titan_sheet.png")
VFX_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "titan_vfx.png")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"

# Strict 20-Color Hand-Crafted Volcanic Basalt, Bronze, Magma & Emerald-Jade Master Palette
MASTER_PALETTE = np.array([
    [10, 11, 16],     # 0: Abyssal Basalt Outline
    [20, 22, 30],     # 1: Dark Obsidian-Iron Selout
    [32, 36, 46],     # 2: Volcanic Basalt Plate Deep Shadow
    [50, 56, 70],     # 3: Forged Basalt-Iron Armor Base
    [76, 84, 102],    # 4: Lit Basalt-Steel Plate Midtone
    [114, 124, 146],  # 5: Polished Horn & Greave Rim Highlight
    [18, 68, 48],     # 6: Deep World-Forge Emerald Tabard Shadow
    [30, 118, 80],    # 7: Runic Emerald-Jade Belt & Tabard Midtone
    [46, 186, 122],   # 8: Lit World-Forge Jade Rune Glow
    [96, 246, 176],   # 9: Blazing Jade Crystal Highlight
    [98, 34, 16],     # 10: Deep Crimson-Copper Beard Shadow
    [154, 54, 22],    # 11: Fiery Dwarven Copper Beard Base
    [214, 92, 28],    # 12: Blazing Orange-Copper Beard & Magma Crack Mid
    [250, 148, 38],   # 13: Molten Amber Beard & Magma Fissure Glow
    [88, 58, 22],     # 14: Heavy Dwarven Bronze Trim Shadow
    [142, 96, 34],    # 15: Burnished Bronze Pauldron & Hilt Trim
    [198, 144, 46],   # 16: Imperial Forge-Gold Bevel Highlight
    [244, 198, 74],   # 17: Specular Forge-Gold Gleam
    [254, 218, 88],   # 18: Molten Magma-Gold Core
    [255, 250, 220],  # 19: White-Hot World-Forge Heart
], dtype=np.int32)

C_OUT = (10, 11, 16, 255)
C_SEL = (20, 22, 30, 255)
C_BASALT_DARK = (32, 36, 46, 255)
C_BASALT_BASE = (50, 56, 70, 255)
C_BASALT_MID = (76, 84, 102, 255)
C_BASALT_LIT = (114, 124, 146, 255)
C_JADE_DARK = (18, 68, 48, 255)
C_JADE_MID = (30, 118, 80, 255)
C_JADE_LIT = (46, 186, 122, 255)
C_JADE_SPEC = (96, 246, 176, 255)
C_BEARD_DARK = (98, 34, 16, 255)
C_ORANGE = (214, 92, 28, 255)
C_MAGMA_ORANGE = (250, 148, 38, 255)
C_BRONZE_DARK = (88, 58, 22, 255)
C_BRONZE = (142, 96, 34, 255)
C_GOLD = (198, 144, 46, 255)
C_GOLD_SPEC = (244, 198, 74, 255)
C_MAGMA = (254, 218, 88, 255)
C_CORE = (255, 250, 220, 255)

# Skeletal pivots in 512x512 rig space (exact 0.5x of titan_v3_base.jpg 1024x1024 coordinates)
PIVOTS = dict(
    pelvis=(284.0, 275.0), neck=(278.0, 116.0), mane=(284.0, 118.0),
    l_sh=(178.0, 130.0), l_elb=(122.0, 218.0), l_hand=(130.0, 335.0),
    r_sh=(352.0, 136.0), r_elb=(374.0, 218.0), r_hand=(398.0, 328.0),
    l_hip=(208.0, 294.0), l_knee=(188.0, 382.0), l_ank=(174.0, 452.0),
    r_hip=(325.0, 294.0), r_knee=(340.0, 380.0), r_ank=(322.0, 450.0),
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
    protect_indices=(8, 9, 12, 13, 16, 17, 18, 19),
    hair_indices=(10, 11, 12, 13),
    lit_selout=1,
    shad_selout=0,
    hair_selout=10,
    joint_fill=(26, 30, 40, 255),
    joint_inner=(42, 48, 62, 255),
    hip_r=26,
    thigh_r=22,
    arm_r=18,
    pinhole_fill=(32, 36, 46, 255),
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
        "forge_aegis", "halo_active", "halo_grand", "speedlines", "speedline_deg", "two_handed_ik",
    ) + tuple(extra_meta_keys)
    for mk in all_meta:
        if mk in active_d:
            out[mk] = active_d[mk]

    out["mane_wave_phase"] = ph * wave_mult
    return apply_2h_maul_ik(out)


def save_debug_parts_sheet(parts, out_path):
    """Saves a 5x3 contact sheet of all 14 segmented rig parts on a contrasting slate-indigo grid."""
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


def load_and_segment_512():
    arr = clean_base_512(BASE_IMG_PATH, head_y_split=135)
    H, W = 512, 512
    a = arr[:, :, 3] > 0

    # 1. Horned Volcanic Helm + Glowing Eyes + Nose + Cheek Guards
    m_head = poly_mask(H, W, P([
        (398, 2), (672, 2), (672, 175), (632, 246), (602, 246),
        (595, 202), (528, 202), (520, 250), (442, 250), (435, 195), (398, 165)
    ])) & a

    # 2. Braided Fiery Orange-Copper Dwarven Beard
    m_mane = poly_mask(H, W, P([
        (455, 232), (522, 232), (528, 200), (596, 200), (604, 232),
        (666, 232), (680, 350), (675, 425), (628, 490), (550, 490),
        (492, 428), (455, 330)
    ])) & a & (~m_head)

    # 3. Left Spiked Magma Pauldron & Upper Arm (l_sode) + Runic Gauntlet Forearm (l_forearm)
    m_l_sode = poly_mask(H, W, P([
        (132, 145), (438, 145), (442, 305), (392, 405), (338, 452), (170, 392), (132, 250)
    ])) & a & (~m_head) & (~m_mane)
    m_l_forearm = poly_mask(H, W, P([
        (128, 386), (235, 392), (338, 452), (352, 650), (345, 748), (172, 748), (128, 560)
    ])) & a & (~m_l_sode)

    # 4. Right Spiked Magma Pauldron & Upper Arm (r_sode) + Runic Gauntlet Forearm (r_forearm)
    m_r_sode = poly_mask(H, W, P([
        (630, 165), (848, 165), (848, 300), (795, 445), (680, 455), (645, 360)
    ])) & a & (~m_head) & (~m_mane)
    m_r_forearm = poly_mask(H, W, P([
        (675, 435), (795, 410), (885, 580), (885, 735), (725, 735), (685, 550)
    ])) & a & (~m_r_sode)

    # 5. Left & Right Runic Hip Tassets (l_coat, r_coat)
    m_l_coat = poly_mask(H, W, P([
        (315, 545), (484, 565), (484, 585), (432, 682), (335, 682), (315, 625)
    ])) & a & (~m_l_forearm) & (~m_l_sode)
    m_r_coat = poly_mask(H, W, P([
        (640, 545), (710, 545), (735, 675), (685, 685), (640, 600)
    ])) & a & (~m_r_forearm) & (~m_r_sode)

    # 6. Torso stops at y=572 on the sides and ONLY extends down to y=798 inside the narrow
    #    central emerald-jade loincloth tabard (x=492..638) so l_thigh and r_thigh capture
    #    both full muscular armored thighs!
    m_torso = poly_mask(H, W, P([
        (335, 220), (695, 220), (695, 565), (638, 572),
        (638, 752), (568, 798), (492, 752), (492, 572), (335, 565)
    ])) & a & (~m_head) & (~m_mane) & (~m_l_sode) & (~m_l_forearm) & (~m_r_sode) & (~m_r_forearm) & (~m_l_coat) & (~m_r_coat)

    # 7. Left & Right Armored Legs (Full Muscular Thighs + Knee-Guard Shins + Heavy Sabaton Boots)
    m_l_foot = poly_mask(H, W, P([(245, 885), (432, 885), (432, 1008), (245, 1008)])) & a
    m_l_shin = poly_mask(H, W, P([(270, 706), (456, 706), (455, 892), (270, 892)])) & a & (~m_l_foot) & (~m_torso)
    m_l_thigh = poly_mask(H, W, P([(315, 572), (495, 572), (495, 750), (315, 750)])) & a & (~m_torso) & (~m_l_coat) & (~m_l_forearm) & (~m_l_shin) & (~m_l_foot)

    m_r_foot = poly_mask(H, W, P([(550, 880), (802, 880), (802, 998), (550, 998)])) & a
    m_r_shin = poly_mask(H, W, P([(548, 704), (735, 704), (735, 886), (548, 886)])) & a & (~m_r_foot) & (~m_torso)
    m_r_thigh = poly_mask(H, W, P([(575, 572), (735, 572), (735, 750), (575, 750)])) & a & (~m_torso) & (~m_r_coat) & (~m_r_forearm) & (~m_r_shin) & (~m_r_foot)

    masks = assign_remaining_geodesic(a, [
        ("mane", m_mane), ("head", m_head), ("torso", m_torso),
        ("l_coat", m_l_coat), ("r_coat", m_r_coat),
        ("l_sode", m_l_sode), ("l_forearm", m_l_forearm),
        ("r_sode", m_r_sode), ("r_forearm", m_r_forearm),
        ("l_thigh", m_l_thigh), ("l_shin", m_l_shin), ("l_foot", m_l_foot),
        ("r_thigh", m_r_thigh), ("r_shin", m_r_shin), ("r_foot", m_r_foot),
    ])

    # Inpaint detailed basalt/bronze chestplate behind Torgar's swinging beard AND extend
    # r_thigh/l_thigh behind the hip tassets/loincloth so leg strides have a thick, gap-free silhouette!
    torso_arr = arr.copy()
    under_beard = m_mane & poly_mask(H, W, P([(440, 240), (650, 240), (650, 495), (440, 495)]))
    ub_ys, ub_xs = np.where(under_beard)
    for y, x in zip(ub_ys, ub_xs):
        dx_c = abs(x - 284)
        if dx_c <= 3:
            torso_arr[y, x] = [198, 144, 46, 255] if (y % 4 != 0) else [250, 148, 38, 255]
        elif (y % 18) in (0, 1):
            torso_arr[y, x] = [142, 96, 34, 255]
        elif (y % 18) in (2, 3):
            torso_arr[y, x] = [20, 22, 30, 255]
        else:
            torso_arr[y, x] = [50, 56, 70, 255] if dx_c < 22 else [32, 36, 46, 255]

    l_thigh_arr = arr.copy()
    under_tasset_l = poly_mask(H, W, P([(355, 576), (488, 576), (488, 725), (355, 725)])) & a
    l_thigh_only = dict(masks)["l_thigh"]
    inpaint_l = under_tasset_l & (~l_thigh_only)
    il_ys, il_xs = np.where(inpaint_l)
    for y, x in zip(il_ys, il_xs):
        l_thigh_arr[y, x] = [50, 56, 70, 255] if ((x + y) % 5 != 0) else [32, 36, 46, 255]

    r_thigh_arr = arr.copy()
    under_loincloth_r = poly_mask(H, W, P([(585, 578), (695, 578), (705, 720), (585, 720)])) & a
    r_thigh_only = dict(masks)["r_thigh"]
    inpaint_r = under_loincloth_r & (~r_thigh_only)
    ir_ys, ir_xs = np.where(inpaint_r)
    for y, x in zip(ir_ys, ir_xs):
        r_thigh_arr[y, x] = [50, 56, 70, 255] if ((x + y) % 5 != 0) else [32, 36, 46, 255]

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
    save_debug_parts_sheet(parts, os.path.join(ARTIFACT_DIR, "debug_titan_v3_parts.png"))
    return parts


def draw_forge_crucible_halo_104(arr, nk_x, nk_y, radius=16.5, phase=0.0, grand=False):
    """
    Draws a rotating 8-Cog Dwarven Forge-Crucible Halo behind Torgar's shoulders:
    - Obsidian & burnished bronze gear ring
    - 8 rotating Dwarven anvil-cogs studded with alternating World-Forge Jade and Molten Magma cores!
    """
    cx = nk_x - 2.5
    cy = nk_y + 2.5
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
        put_px(arr, gx, gy, C_CORE if grand else (C_JADE_SPEC if k % 2 == 0 else C_MAGMA))
        put_px(arr, gx + 1, gy, C_JADE_LIT if k % 2 == 0 else C_MAGMA_ORANGE)
        put_px(arr, gx - 1, gy, C_GOLD)
        put_px(arr, gx, gy - 1, C_GOLD)
        put_px(arr, gx, gy + 1, C_BRONZE_DARK)


def draw_2h_worldbreaker_maul_104(
    arr, hx, hy, maul_deg, shaft_len=16.5, glow=1.0, phase=0.0, show_gauntlets=True
):
    """
    Draws Torgar's COLOSSAL TWO-HANDED WORLD-BREAKER WARHAMMER / VOLCANIC ANVIL-MAUL:
    - Long two-handed bronze-and-obsidian haft (~28px in 104x104 = 56px in 208x208)
    - Heavy molten-core pommel at the base (-10.5px behind upper grip)
    - MASSIVE Double-Faced Beveled Volcanic Anvil Hammerhead (da in -6.5..+7.5, dp in -10.5..+10.5
      in 104x104 -> 28x42px in 208x208!):
      * Hourglass warhammer neck indent around the central World-Forge socket collar
      * Wide flared Crushing Anvil Ram Face on the front side (dp > 0) with impact studs
      * Hooked Volcanic Anvil Horn / Siege Pick on the back side (dp < 0)
      * Dark basalt outline, burnished bronze/gold trim, glowing molten magma cracks, and a
        blazing Emerald-Jade + White-Hot World-Forge diamond core!
    - Two distinct armored Dwarven gauntlet clasps locking BOTH hands onto the haft!
    """
    rad = math.radians(maul_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    pom_x, pom_y = hx - ux * 10.5, hy - uy * 10.5
    top_x, top_y = hx + ux * (shaft_len + 8.0), hy + uy * (shaft_len + 8.0)

    # 1. Long Two-Handed Obsidian & Burnished Bronze Haft (~28px in 104x104)
    draw_line_104(arr, pom_x, pom_y, top_x, top_y, C_OUT, 3)
    draw_line_104(arr, pom_x, pom_y, top_x, top_y, C_BASALT_BASE, 2)
    for d in np.linspace(-9.5, shaft_len - 5.5, 16):
        rx, ry = hx + ux * d, hy + uy * d
        col = C_GOLD if int(round(d)) % 2 == 0 else C_BRONZE
        put_px(arr, rx, ry, col)

    # 2. Heavy Dwarven Anvil Pommel with Magma Gem
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            put_px(arr, pom_x + dx, pom_y + dy, C_GOLD_SPEC if (dx == 0 and dy == 0) else C_BRONZE)
    put_px(arr, pom_x - ux * 1.3, pom_y - uy * 1.3, C_MAGMA)

    # 3. Massive Double-Faced Beveled Volcanic Anvil Hammerhead (da: -6.5..+7.5, dp: -10.5..+10.5)
    tx, ty = hx + ux * shaft_len, hy + uy * shaft_len
    for da in np.linspace(-6.5, 7.5, 29):
        for dp in np.linspace(-10.5, 10.5, 43):
            if abs(dp) <= 3.0:
                # Central Reinforced World-Forge Socket Collar
                max_da_neg, max_da_pos = -4.6, 5.4
            elif dp > 3.0:
                # Front Crushing Ram Side: pinched neck at dp=3.0..5.2, then broad flared Ram Face at dp=5.2..10.5!
                if dp < 5.2:
                    max_da_neg, max_da_pos = -3.5, 4.3
                else:
                    flare = min(1.0, (dp - 5.2) / 2.2)
                    max_da_neg = -3.5 - 3.0 * flare
                    max_da_pos = 4.3 + 3.2 * flare
                if dp > 9.6 and (abs(da - 0.5) > 5.4):
                    continue
            else:
                # Back Volcanic Horn / Siege Pick Side: pinched neck at dp=-3.0..-4.8, then curved siege beak!
                if dp > -4.8:
                    max_da_neg, max_da_pos = -3.5, 4.3
                else:
                    u_pick = min(1.0, (abs(dp) - 4.8) / 5.7)
                    hook = -1.6 * (u_pick ** 1.3)
                    half_h = 4.5 * (1.0 - 0.68 * (u_pick ** 1.1))
                    max_da_neg = hook - half_h
                    max_da_pos = hook + half_h

            if da < max_da_neg or da > max_da_pos:
                continue

            on_outer_edge = (
                (abs(dp) > 9.6)
                or (da < max_da_neg + 0.85)
                or (da > max_da_pos - 0.85)
            )
            on_gold_trim = (
                (8.2 <= abs(dp) <= 9.6)
                or (abs(abs(dp) - 5.2) < 0.65)
                or (da < max_da_neg + 1.75)
                or (da > max_da_pos - 1.75)
            )

            px = tx + ux * da + nx * dp
            py = ty + uy * da + ny * dp

            # Central World-Forge Emerald-Jade & White-Hot Diamond Core
            d_core = abs(da - 0.4) * 0.82 + abs(dp) * 0.62
            # Molten Magma Cracks radiating into both the Ram Face and Volcanic Horn
            crack1 = abs((dp - 6.6) - (da - 0.5) * 0.75) < 0.75 and (4.2 <= dp <= 8.6)
            crack2 = abs((dp + 6.2) + (da - 0.2) * 0.75) < 0.75 and (-8.4 <= dp <= -4.0)

            if on_outer_edge:
                col = C_OUT
            elif d_core <= 1.40 and glow > 0.3:
                col = C_CORE
            elif d_core <= 2.80 and glow > 0.2:
                col = C_JADE_SPEC if d_core <= 2.0 else C_JADE_LIT
            elif d_core <= 3.70:
                col = C_GOLD_SPEC
            elif (crack1 or crack2) and glow > 0.35:
                col = C_MAGMA if (abs(dp) < 6.8) else C_MAGMA_ORANGE
            elif on_gold_trim:
                col = C_GOLD_SPEC if (dp > 7.8 or da > 3.5) else (C_GOLD if dp >= 0 else C_BRONZE)
            else:
                if dp > 2.0:
                    col = C_BASALT_MID if da > 0.0 else C_BASALT_BASE
                elif dp < -2.0:
                    col = C_BASALT_BASE if da > 0.0 else C_BASALT_DARK
                else:
                    col = C_BASALT_DARK
            put_px(arr, px, py, col)

    # Top Spike / Crown Finial above the Anvil Head
    for d_fin in np.linspace(5.6, 9.8, 9):
        put_px(arr, tx + ux * d_fin, ty + uy * d_fin, C_GOLD_SPEC if d_fin < 8.2 else C_MAGMA)

    # 4. Two Distinct Armored Gauntlet Clasps (Upper r_hand at d=0.0 + Lower l_hand at d=-6.2)
    if show_gauntlets:
        for proj, is_near in ((0.0, False), (-6.2, True)):
            cx = hx + ux * proj
            cy = hy + uy * proj
            for u_off in (-1.0, 0.0, 1.0):
                for n_off in (-1.6, -0.6, 0.6, 1.6):
                    px = cx + ux * u_off + nx * n_off
                    py = cy + uy * u_off + ny * n_off
                    if abs(n_off) > 1.25:
                        col = C_OUT
                    elif abs(u_off) > 0.65 and n_off > 0:
                        col = C_GOLD
                    elif n_off > 0.0:
                        col = C_MAGMA_ORANGE if (is_near and abs(u_off) < 0.35) else C_BASALT_LIT
                    else:
                        col = C_BASALT_BASE
                    put_px(arr, px, py, col)


def draw_forge_aegis_arc_104(arr, cx, cy, phase=0.0):
    """
    Draws a blazing Molten Magma & Emerald-Jade Forge-Aegis Bulwark Shield Arc ahead of
    Torgar's Colossal Maul during Row 6 (Battering-Ram Dash) & Row 7 (Runic Anvil Bulwark)!
    """
    for i in range(-14, 15):
        ang = (i / 14.0) * 1.02
        rx = cx + math.cos(ang) * 9.5
        ry = cy + math.sin(ang) * 15.0
        is_node = (abs(i) % 4 == 0)
        put_px(arr, rx, ry, C_CORE if is_node else C_MAGMA)
        put_px(arr, rx - 1.0, ry, C_JADE_LIT if (abs(i) % 2 == 0) else C_MAGMA_ORANGE)
        put_px(arr, rx - 2.0, ry, C_BRONZE)
        if abs(i) in (0, 5, 10, 14):
            put_px(arr, rx + 1.0, ry, C_JADE_SPEC)


def draw_cyclone_ring_half_104(arr, cx, cy, rx, ry, spin_ang, is_front):
    """Draws 3D Molten Magma & World-Forge Jade Tornado Cyclone rings around Torgar on Row 3."""
    steps = 260
    for i in range(steps):
        a = (i / float(steps)) * 2.0 * math.pi
        sa = math.sin(a)
        if is_front and sa < -0.02:
            continue
        if (not is_front) and sa >= 0.02:
            continue

        rel = (spin_ang - a) % (2.0 * math.pi)
        if rel > 5.1:
            continue
        wake = 1.0 - (rel / 5.1)
        ca = math.cos(a)

        thick = 3.5 * (wake ** 0.75)
        n_dr = max(3, int(thick * 3.2) + 2)
        for dr in np.linspace(-thick, thick, n_dr):
            px = cx + ca * (rx + dr * 1.5)
            py = cy + sa * (ry + dr * 0.68)
            if px < 6.0 or px > 97.0:
                continue
            nd = abs(dr) / max(0.45, thick)
            if wake > 0.60:
                col = C_CORE if nd < 0.30 else (C_MAGMA if nd < 0.66 else C_JADE_LIT)
            elif wake > 0.28:
                col = C_MAGMA_ORANGE if nd < 0.45 else C_JADE_MID
            else:
                if i % 3 != 0 or nd > 0.55:
                    continue
                col = C_JADE_SPEC if (i % 6 == 0) else C_BRONZE
            put_px(arr, px, py, col)

        if wake > 0.35 and i % 2 == 0:
            ux = cx + math.cos(a + 0.55) * (rx * 0.74)
            uy = cy - 9.0 + math.sin(a + 0.55) * (ry * 0.72)
            if 7.0 <= ux <= 96.0:
                put_px(arr, ux, uy, C_JADE_SPEC if wake > 0.70 else C_MAGMA_ORANGE)


def draw_earthshatter_column_104(arr, cx, foot_y, intensity=1.0):
    """
    Draws a vertical World-Forge Magma & Jade Cataclysm Shock-Column + Ground Crater Ring
    at the impact point on Row 3 (F21..F25), Row 4 (F22..F26), and Row 8 (F19..F24)!
    """
    icx = min(88.0, max(16.0, cx))
    by = min(98.0, foot_y - 1.0)
    if intensity >= 0.75:
        top_y = max(8.0, by - 68.0 * intensity)
        for y in np.linspace(top_y, by, 72):
            u = (y - top_y) / max(1.0, by - top_y)
            hw = 1.8 + 4.4 * (u ** 1.35) * intensity
            for dx in np.linspace(-hw, hw, int(hw * 2.5) + 2):
                nd = abs(dx) / max(0.5, hw)
                col = C_CORE if nd < 0.28 else (C_MAGMA if nd < 0.62 else C_JADE_LIT)
                put_px(arr, icx + dx, y, col)

        # Flanking Secondary Volcanic Magma Geysers
        for g_off, g_h in ((-9.0, 26.0), (8.5, 22.0)):
            gx = icx + g_off
            if 7.0 <= gx <= 96.0:
                for gy in np.linspace(by - g_h * intensity, by, 24):
                    put_px(arr, gx, gy, C_MAGMA if int(gy) % 2 == 0 else C_MAGMA_ORANGE)
                    put_px(arr, gx + 1.0, gy, C_JADE_LIT)

    # Expanding Molten & Jade Crater Ring along the floor
    rx = 14.5 * intensity
    for i in range(48):
        ang = (i / 48.0) * 2.0 * math.pi
        px = icx + math.cos(ang) * rx
        py = min(99.0, by - 1.5 + math.sin(ang) * 2.6)
        if 6.0 <= px <= 97.0:
            put_px(arr, px, py, C_CORE if i % 4 == 0 else (C_JADE_SPEC if i % 2 == 0 else C_MAGMA_ORANGE))


def extra_extents(joints_c, cfg, scale):
    pts = []
    if cfg.get("spin_slash", False):
        p = joints_c["pelvis"]
        pts.append((p[0] - 43.0 / scale, p[1]))
        pts.append((p[0] + 43.0 / scale, p[1]))
        return pts
    if cfg.get("show_weapon", True):
        if cfg.get("planted_weapon", False):
            return pts
        h = joints_c["r_hand"]
        rad = math.radians(cfg.get("weapon_deg", -38.0))
        ux, uy = math.cos(rad), math.sin(rad)
        nx, ny = -uy, ux
        wlen = cfg.get("weapon_len", 16.5)
        # Include pommel (-12.5px) and massive 21px-wide hammerhead (+10.5px past shaft_len, ±11.5px normal)
        pts.append((h[0] - ux * (12.5 / scale), h[1] - uy * (12.5 / scale)))
        head_cx = h[0] + ux * ((wlen + 8.5) / scale)
        head_cy = h[1] + uy * ((wlen + 8.5) / scale)
        pts.append((head_cx + nx * (11.5 / scale), head_cy + ny * (11.5 / scale)))
        pts.append((head_cx - nx * (11.5 / scale), head_cy - ny * (11.5 / scale)))
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
    if cfg.get("spin_slash", False):
        pel = joints104["pelvis"]
        spin_ang = cfg.get("spin_ang", 0.0)
        draw_cyclone_ring_half_104(bg, 52.0, pel[1] - 3.0, 37.5, 10.5, spin_ang, is_front=False)
        if math.sin(spin_ang) < 0.0:
            bx = 52.0 + math.cos(spin_ang) * 11.5
            by = pel[1] - 3.0 + math.sin(spin_ang) * 3.5
            b_deg = math.degrees(math.atan2(math.sin(spin_ang) * 10.5, math.cos(spin_ang) * 37.5))
            draw_2h_worldbreaker_maul_104(
                bg, bx, by, maul_deg=b_deg, shaft_len=15.0, glow=1.0, phase=ph, show_gauntlets=True
            )


def draw_front(out, joints104, cfg):
    ph = cfg.get("mane_wave_phase", 0.0)

    if cfg.get("spin_slash", False):
        pel = joints104["pelvis"]
        spin_ang = cfg.get("spin_ang", 0.0)
        if math.sin(spin_ang) >= 0.0:
            bx = 52.0 + math.cos(spin_ang) * 11.0
            by = pel[1] - 3.0 + math.sin(spin_ang) * 3.5
            b_deg = math.degrees(math.atan2(math.sin(spin_ang) * 10.5, math.cos(spin_ang) * 37.5))
            draw_2h_worldbreaker_maul_104(
                out, bx, by, maul_deg=b_deg, shaft_len=15.0, glow=1.0, phase=ph, show_gauntlets=True
            )
        draw_cyclone_ring_half_104(out, 52.0, pel[1] - 3.0, 37.5, 10.5, spin_ang, is_front=True)
        return

    if cfg.get("slash_arc") is not None:
        sa = cfg["slash_arc"]
        nk = joints104["neck"]
        draw_slash_arc_104(
            out, nk[0] + sa.get("dx", 4.0), nk[1] + sa.get("dy", 11.0),
            sa.get("r", 27.5), sa["a0"], sa["a1"],
            C_CORE, C_MAGMA, C_JADE_LIT, intensity=sa.get("intensity", 1.0),
        )

    if cfg.get("earthshatter", 0.0) > 0.0:
        nk = joints104["neck"]
        draw_earthshatter_column_104(
            out, nk[0] + cfg.get("shatter_dx", 20.0), cfg.get("foot_y", 99.0),
            intensity=cfg["earthshatter"],
        )

    if cfg.get("show_weapon", True):
        if cfg.get("planted_weapon", False):
            px_plant = cfg.get("plant_x", 76.0)
            py_plant = cfg.get("plant_y", 77.0)
            draw_2h_worldbreaker_maul_104(
                out, px_plant, py_plant,
                maul_deg=89.0, shaft_len=14.5, glow=cfg.get("weapon_glow", 0.55),
                phase=ph, show_gauntlets=False,
            )
            # Glowing Magma & Jade Ground Fissure around the planted Anvil Head at y=98
            for dx in range(-9, 10):
                put_px(out, px_plant + dx, 98.0, C_MAGMA if abs(dx) % 3 == 0 else C_JADE_DARK)
        else:
            rh = joints104["r_hand"]
            draw_2h_worldbreaker_maul_104(
                out, rh[0], rh[1],
                maul_deg=cfg.get("weapon_deg", -38.0),
                shaft_len=cfg.get("weapon_len", 16.5),
                glow=cfg.get("weapon_glow", 1.0),
                phase=ph,
                show_gauntlets=True,
            )

    if cfg.get("forge_aegis", False):
        nk = joints104["neck"]
        draw_forge_aegis_arc_104(out, min(89.0, nk[0] + 22.0), nk[1] + 11.0, phase=ph)

    if cfg.get("speedlines", 0) > 0:
        for k in range(cfg["speedlines"]):
            ly = 28.0 + (k * 12 + int(ph * 5)) % 52
            lx0 = 6.0 + (k * 7 + int(ph * 9)) % 16
            draw_line_104(out, lx0, ly, lx0 + 13.0, ly, C_MAGMA if k % 2 == 0 else C_JADE_SPEC, 1)


def apply_back_turn_armor_104(body_arr104, mirror_x=False):
    """Paints Torgar's dorsal Volcanic Basalt & World-Forge Jade back-plate during 360° spin yaw."""
    out = body_arr104.copy()
    if mirror_x:
        ys, xs = np.where(out[:, :, 3] > 0)
        if len(xs) > 0:
            cx2 = int(round(xs.min() + xs.max()))
            flipped = np.zeros_like(out)
            for y, x in zip(ys, xs):
                nx = cx2 - x
                if 3 <= nx <= 100:
                    flipped[y, nx] = out[y, x]
            out = flipped

    a = out[:, :, 3] > 0
    ys, xs = np.where(a)
    if len(ys) == 0:
        return out
    y_top = int(ys.min())
    cx = int(round(np.mean(xs)))

    # Sculpt detailed dorsal helmet neck-guard & Dwarven World-Forge backplate
    for y in range(max(4, y_top + 6), min(98, y_top + 48)):
        row_xs = np.where(a[y])[0]
        if len(row_xs) < 4:
            continue
        x0, x1 = int(row_xs.min()) + 2, int(row_xs.max()) - 2
        for x in range(x0, x1 + 1):
            r, g, b, _ = out[y, x]
            dx_c = abs(x - cx)
            if (r > 130 and g < 155 and b < 65) or (dx_c <= 8 and y_top + 16 <= y <= y_top + 42):
                if dx_c == 0 and y >= y_top + 18:
                    out[y, x] = C_GOLD_SPEC if (y % 3 == 0) else C_GOLD
                elif dx_c in (4, 8) and (y - y_top) % 6 == 0:
                    out[y, x] = C_BRONZE
                elif (y - y_top) % 7 == 0:
                    out[y, x] = C_SEL
                else:
                    out[y, x] = C_BASALT_BASE if (dx_c < 5) else C_BASALT_DARK

    spine_y0 = max(8, y_top + 20)
    spine_y1 = min(92, y_top + 42)
    for y in range(spine_y0, spine_y1):
        if a[y, cx]:
            out[y, cx] = C_GOLD if (y % 3 != 0) else C_BRONZE_DARK
        if y in (spine_y0 + 4, spine_y0 + 5, spine_y0 + 8) and 4 <= cx - 2 and cx + 2 <= 99:
            if a[y, cx - 1]:
                out[y, cx - 1] = C_JADE_SPEC
            if a[y, cx + 1]:
                out[y, cx + 1] = C_JADE_SPEC
            if a[y, cx - 2]:
                out[y, cx - 2] = C_GOLD
            if a[y, cx + 2]:
                out[y, cx + 2] = C_GOLD
    if spine_y0 + 6 < 98 and a[spine_y0 + 6, cx]:
        out[spine_y0 + 6, cx] = C_CORE
    return out


DEFAULTS = dict(
    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5, mane_rel_deg=-1.0,
    mane_wave_amp=3.0, mane_in_front=True,
    l_thigh_deg=-2.0, l_shin_deg=2.0, l_foot_deg=0.0,
    r_thigh_deg=2.0, r_shin_deg=-2.0, r_foot_deg=0.0,
    l_sode_rel_deg=-6.0, l_fore_rel_deg=-10.0, r_sode_rel_deg=-12.0, r_fore_rel_deg=-14.0,
    l_coat_rel_deg=0.0, r_coat_rel_deg=0.0,
    grip_x=54.0, grip_y=-14.0, grip_sep=38.0,
    weapon_deg=-38.0, weapon_len=16.5, weapon_glow=1.0, foot_y=99.0,
    show_weapon=True, two_handed_ik=True, halo_active=True, halo_grand=False,
    forge_aegis=False, right_arm_in_front=False, right_leg_behind=False,
)


def render_frame(parts, cfg):
    if cfg.get("spin_slash", False):
        body_cfg = dict(cfg)
        body_cfg["show_weapon"] = False
        body_cfg["spin_slash"] = True
        captured = {}

        def cap_back(bg, joints104, _c):
            captured["joints104"] = joints104

        body_only = render_rig_104(
            parts, PIVOTS, body_cfg, PALETTE_CFG,
            y_bot_base=498.0, default_S=608,
            extra_extent_fn=extra_extents, draw_back_fn=cap_back, draw_front_fn=None,
        )
        if cfg.get("back_turn", False):
            body_only = apply_back_turn_armor_104(body_only, mirror_x=cfg.get("mirror_yaw", False))

        joints104 = captured["joints104"]
        bg = np.zeros_like(body_only)
        draw_back(bg, joints104, cfg)
        out = bg.copy()
        m = body_only[:, :, 3] > 0
        out[m] = body_only[m]
        draw_front(out, joints104, cfg)
        out[:3, :, :] = 0
        out[101:, :, :] = 0
        out[:, :3, :] = 0
        out[:, 101:, :] = 0
        return out

    return render_rig_104(
        parts, PIVOTS, cfg, PALETTE_CFG,
        y_bot_base=498.0, default_S=608,
        extra_extent_fn=extra_extents, draw_back_fn=draw_back, draw_front_fn=draw_front,
    )


def build_row_configs(row_idx):
    cfgs = []
    for f in range(COLS):
        t = f / float(COLS)
        ph = 2.0 * math.pi * t

        if row_idx == 0:
            # Row 0: IDLE (Commanding 2H World-Forge Juggernaut Guard + Rotating 8-Cog Forge Halo!)
            b = math.sin(ph)
            s = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dx=s * 2.5, pelvis_dy=b * 8.0, torso_deg=3.0 + b * 1.8,
                head_rel_deg=-1.5 - b * 1.0, mane_rel_deg=-1.0 + s * 2.8,
                mane_wave_phase=ph,
                grip_x=54.0 + s * 2.5, grip_y=-14.0 + b * 3.5,
                weapon_deg=-38.0 + b * 3.2, weapon_glow=0.85 + 0.15 * b,
                halo_active=True,
            )
            cfgs.append(apply_2h_maul_ik(cfg))

        elif row_idx == 1:
            # Row 1: WALK (Ground-Shaking Two-Handed Titan Stride with Deep Knee Lifts & Maul Heave!)
            st = math.sin(ph)
            kl = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dy=abs(st) * 20.0, torso_deg=8.0 + abs(st) * 2.5, head_rel_deg=-3.5,
                mane_rel_deg=-3.0 - abs(st) * 3.5, mane_wave_phase=ph * 2.0, mane_wave_amp=4.0,
                right_leg_behind=(f >= 15),
                l_thigh_deg=st * 26.0, l_shin_deg=max(0.0, st * 26.0) + max(0.0, kl * 14.0), l_foot_deg=st * 12.0,
                r_thigh_deg=-st * 26.0, r_shin_deg=max(0.0, -st * 26.0) + max(0.0, -kl * 14.0), r_foot_deg=-st * 12.0,
                grip_x=56.0 + st * 4.5, grip_y=-12.0 + abs(st) * 5.0,
                weapon_deg=-34.0 + st * 8.0,
            )
            cfgs.append(apply_2h_maul_ik(cfg))

        elif row_idx == 2:
            # Row 2: AUTO_ATTACK (Coiled Back-Shoulder Windup F00..F04 -> Sweeping 2H Horizontal Lunge Cleave F05..F12
            # -> Rising Volcanic Uppercut F13..F20 -> Smooth Weighty Recovery F21..F29!)
            kfs = [
                (0, dict(pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5, mane_rel_deg=-1.0,
                         l_thigh_deg=-2.0, l_shin_deg=2.0, r_thigh_deg=2.0, r_shin_deg=-2.0,
                         grip_x=54.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=38.0)),
                (4, dict(pelvis_dx=-22.0, pelvis_dy=30.0, torso_deg=-14.0, head_rel_deg=10.0, mane_rel_deg=6.0,
                         l_thigh_deg=-18.0, l_shin_deg=20.0, r_thigh_deg=20.0, r_shin_deg=-12.0,
                         grip_x=10.0, grip_y=-92.0, weapon_deg=-128.0, grip_sep=32.0, halo_grand=True)),
                (8, dict(pelvis_dx=14.0, pelvis_dy=48.0, torso_deg=20.0, head_rel_deg=-10.0, mane_rel_deg=-10.0,
                         l_thigh_deg=20.0, l_shin_deg=18.0, r_thigh_deg=-26.0, r_shin_deg=18.0,
                         grip_x=86.0, grip_y=-26.0, weapon_deg=-6.0, grip_sep=36.0, halo_grand=True)),
                (12, dict(pelvis_dx=22.0, pelvis_dy=56.0, torso_deg=25.0, head_rel_deg=-14.0, mane_rel_deg=-14.0,
                          l_thigh_deg=26.0, l_shin_deg=22.0, r_thigh_deg=-30.0, r_shin_deg=20.0,
                          grip_x=94.0, grip_y=8.0, weapon_deg=28.0, grip_sep=38.0, halo_grand=True)),
                (16, dict(pelvis_dx=16.0, pelvis_dy=22.0, torso_deg=-8.0, head_rel_deg=8.0, mane_rel_deg=-4.0,
                          l_thigh_deg=-14.0, l_shin_deg=16.0, r_thigh_deg=18.0, r_shin_deg=-14.0,
                          grip_x=78.0, grip_y=-104.0, weapon_deg=-64.0, grip_sep=34.0, halo_grand=True)),
                (20, dict(pelvis_dx=10.0, pelvis_dy=16.0, torso_deg=-12.0, head_rel_deg=10.0, mane_rel_deg=-2.0,
                          l_thigh_deg=-16.0, l_shin_deg=18.0, r_thigh_deg=20.0, r_shin_deg=-14.0,
                          grip_x=62.0, grip_y=-126.0, weapon_deg=-82.0, grip_sep=34.0, halo_grand=True)),
                (25, dict(pelvis_dx=4.0, pelvis_dy=10.0, torso_deg=-2.0, head_rel_deg=-1.0,
                          l_thigh_deg=-6.0, l_shin_deg=8.0, r_thigh_deg=8.0, r_shin_deg=-6.0,
                          grip_x=58.0, grip_y=-52.0, weapon_deg=-54.0, grip_sep=36.0)),
                (29, dict(pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5, mane_rel_deg=-1.0,
                          l_thigh_deg=-2.0, l_shin_deg=2.0, r_thigh_deg=2.0, r_shin_deg=-2.0,
                          grip_x=54.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=38.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.0)
            if 6 <= f <= 12:
                u = (f - 6) / 6.0
                cfg["slash_arc"] = dict(
                    dx=8.0, dy=12.0, r=28.0,
                    a0=-82.0 + 38.0 * u, a1=12.0 + 36.0 * u,
                    intensity=1.22 - 0.35 * abs(u - 0.5),
                )
            elif 14 <= f <= 19:
                u = (f - 14) / 5.0
                cfg["slash_arc"] = dict(
                    dx=8.0, dy=8.0, r=27.0,
                    a0=28.0 - 48.0 * u, a1=-32.0 - 54.0 * u,
                    intensity=1.18 - 0.35 * abs(u - 0.5),
                )
            cfgs.append(cfg)

        elif row_idx == 3:
            # Row 3: SKILL (360° TECTONIC WHIRLWIND MAUL SPIN F02..F15 -> LEAPING ANVIL SLAM F16..F26!)
            if f <= 1:
                kfs_coil = [
                    (0, dict(torso_deg=3.0, grip_x=54.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=38.0, foot_y=99.0)),
                    (1, dict(pelvis_dx=-10.0, pelvis_dy=42.0, torso_deg=-12.0,
                             l_thigh_deg=-20.0, l_shin_deg=22.0, r_thigh_deg=20.0, r_shin_deg=-16.0,
                             grip_x=16.0, grip_y=-12.0, weapon_deg=-148.0, grip_sep=32.0,
                             halo_grand=True, foot_y=99.0)),
                ]
                cfgs.append(eval_2h_keyframes(f, kfs_coil, ph, DEFAULTS, wave_mult=3.0))
            elif 2 <= f <= 15:
                # 14 frames = 2 full 360-degree Tornado Maul Revolutions with genuine front/side/dorsal yaw!
                step7 = (f - 2) % 7
                spin_ang = ((f - 2) / 7.0) * 2.0 * math.pi + 0.35
                b_deg = math.degrees(math.atan2(math.sin(spin_ang) * 10.5, math.cos(spin_ang) * 37.5))
                gx_orb = math.cos(spin_ang) * 56.0
                gy_orb = -20.0 + math.sin(spin_ang) * 18.0

                yaw_poses = [
                    dict(pelvis_dx=4.0, pelvis_dy=36.0, torso_deg=14.0, l_thigh_deg=-20.0, l_shin_deg=20.0,
                         r_thigh_deg=22.0, r_shin_deg=-14.0, back_turn=False, mirror_yaw=False),
                    dict(pelvis_dx=0.0, pelvis_dy=32.0, torso_deg=6.0, l_thigh_deg=-10.0, l_shin_deg=16.0,
                         r_thigh_deg=12.0, r_shin_deg=-10.0, back_turn=False, mirror_yaw=False),
                    dict(pelvis_dx=-2.0, pelvis_dy=34.0, torso_deg=10.0, l_thigh_deg=18.0, l_shin_deg=18.0,
                         r_thigh_deg=-18.0, r_shin_deg=14.0, mane_in_front=False, right_leg_behind=True,
                         back_turn=True, mirror_yaw=False),
                    dict(pelvis_dx=0.0, pelvis_dy=34.0, torso_deg=11.0, l_thigh_deg=16.0, l_shin_deg=18.0,
                         r_thigh_deg=-16.0, r_shin_deg=14.0, mane_in_front=False, right_leg_behind=True,
                         back_turn=True, mirror_yaw=True),
                    dict(pelvis_dx=2.0, pelvis_dy=34.0, torso_deg=12.0, l_thigh_deg=18.0, l_shin_deg=18.0,
                         r_thigh_deg=-18.0, r_shin_deg=14.0, mane_in_front=False, right_leg_behind=True,
                         back_turn=True, mirror_yaw=True),
                    dict(pelvis_dx=-4.0, pelvis_dy=38.0, torso_deg=-8.0, l_thigh_deg=-14.0, l_shin_deg=18.0,
                         r_thigh_deg=14.0, r_shin_deg=-12.0, back_turn=False, mirror_yaw=False),
                    dict(pelvis_dx=6.0, pelvis_dy=40.0, torso_deg=16.0, l_thigh_deg=20.0, l_shin_deg=18.0,
                         r_thigh_deg=-22.0, r_shin_deg=16.0, back_turn=False, mirror_yaw=False),
                ]
                cfg = dict(DEFAULTS)
                cfg.update(yaw_poses[step7])
                cfg.update(
                    grip_x=gx_orb, grip_y=gy_orb, weapon_deg=b_deg, grip_sep=32.0,
                    spin_slash=True, spin_ang=spin_ang, halo_active=True, halo_grand=True,
                    mane_wave_phase=spin_ang, mane_wave_amp=5.0, foot_y=98.0,
                )
                cfgs.append(apply_2h_maul_ik(cfg))
            else:
                # F16..F29: High Forward Leap Hoisting 2H Maul -> Crushing Seismic Anvil Slam -> Recovery!
                slam_kfs = [
                    (16, dict(pelvis_dx=4.0, pelvis_dy=14.0, torso_deg=-16.0, head_rel_deg=10.0,
                              l_thigh_deg=22.0, l_shin_deg=32.0, r_thigh_deg=-16.0, r_shin_deg=24.0,
                              grip_x=18.0, grip_y=-168.0, weapon_deg=-126.0, grip_sep=30.0,
                              foot_y=92.0, halo_grand=True)),
                    (19, dict(pelvis_dx=8.0, pelvis_dy=10.0, torso_deg=-18.0, head_rel_deg=12.0,
                              l_thigh_deg=26.0, l_shin_deg=36.0, r_thigh_deg=-18.0, r_shin_deg=28.0,
                              grip_x=16.0, grip_y=-176.0, weapon_deg=-134.0, grip_sep=30.0,
                              foot_y=91.0, halo_grand=True)),
                    (22, dict(pelvis_dx=18.0, pelvis_dy=64.0, torso_deg=26.0, head_rel_deg=-12.0,
                              l_thigh_deg=-26.0, l_shin_deg=28.0, r_thigh_deg=26.0, r_shin_deg=-20.0,
                              grip_x=74.0, grip_y=8.0, weapon_deg=28.0, grip_sep=36.0,
                              foot_y=99.0, halo_grand=True)),
                    (25, dict(pelvis_dx=16.0, pelvis_dy=58.0, torso_deg=22.0, head_rel_deg=-10.0,
                              l_thigh_deg=-22.0, l_shin_deg=24.0, r_thigh_deg=22.0, r_shin_deg=-18.0,
                              grip_x=68.0, grip_y=2.0, weapon_deg=20.0, grip_sep=36.0,
                              foot_y=99.0, halo_grand=True)),
                    (29, dict(torso_deg=3.0, grip_x=54.0, grip_y=-14.0, weapon_deg=-38.0,
                              grip_sep=38.0, foot_y=99.0, halo_grand=False)),
                ]
                cfg = eval_2h_keyframes(f, slam_kfs, ph, DEFAULTS, wave_mult=3.0)
                if 20 <= f <= 25:
                    u = (f - 20) / 5.0
                    cfg["slash_arc"] = dict(
                        dx=4.0, dy=11.0, r=28.0,
                        a0=-102.0 + 26.0 * u, a1=46.0 + 14.0 * u, intensity=1.25 - 0.12 * u,
                    )
                if 21 <= f <= 25:
                    cfg["earthshatter"] = 0.72 if f in (21, 22) else 0.45
                    cfg["shatter_dx"] = 22.0
                cfgs.append(cfg)

        elif row_idx == 4:
            # Row 4: ULTIMATE (RAGNAROK WORLD-FORGE CATACLYSM:
            # F00..F08 Wide 2H Lateral Forge-Sweep -> F09..F16 Rising 2H Volcanic Uppercut Heave ->
            # F17..F21 High Airborne Leap (foot_y=88) -> F22..F26 Meteoric Top-Down World-Breaker Earthshatter!)
            kfs = [
                (0, dict(pelvis_dx=-10.0, pelvis_dy=36.0, torso_deg=-10.0, head_rel_deg=8.0,
                         l_thigh_deg=-16.0, l_shin_deg=18.0, r_thigh_deg=18.0, r_shin_deg=-14.0,
                         grip_x=18.0, grip_y=-96.0, weapon_deg=-118.0, grip_sep=32.0,
                         foot_y=99.0, halo_grand=True)),
                (5, dict(pelvis_dx=18.0, pelvis_dy=52.0, torso_deg=24.0, head_rel_deg=-12.0,
                         l_thigh_deg=24.0, l_shin_deg=20.0, r_thigh_deg=-26.0, r_shin_deg=20.0,
                         grip_x=86.0, grip_y=-8.0, weapon_deg=18.0, grip_sep=38.0,
                         foot_y=99.0, halo_grand=True, speedlines=4)),
                (8, dict(pelvis_dx=14.0, pelvis_dy=50.0, torso_deg=20.0, head_rel_deg=-8.0,
                         l_thigh_deg=20.0, l_shin_deg=18.0, r_thigh_deg=-22.0, r_shin_deg=18.0,
                         grip_x=78.0, grip_y=6.0, weapon_deg=32.0, grip_sep=36.0,
                         foot_y=99.0, halo_grand=True)),
                # F09..F16: Rising 2H Volcanic Uppercut Heave!
                (10, dict(pelvis_dx=-4.0, pelvis_dy=46.0, torso_deg=12.0, head_rel_deg=-4.0,
                          l_thigh_deg=-18.0, l_shin_deg=20.0, r_thigh_deg=20.0, r_shin_deg=-16.0,
                          grip_x=64.0, grip_y=8.0, weapon_deg=36.0, grip_sep=36.0,
                          foot_y=99.0, halo_grand=True)),
                (14, dict(pelvis_dx=12.0, pelvis_dy=24.0, torso_deg=-12.0, head_rel_deg=10.0,
                          l_thigh_deg=-18.0, l_shin_deg=20.0, r_thigh_deg=22.0, r_shin_deg=-16.0,
                          grip_x=64.0, grip_y=-128.0, weapon_deg=-78.0, grip_sep=34.0,
                          foot_y=97.0, halo_grand=True, speedlines=5)),
                (16, dict(pelvis_dx=8.0, pelvis_dy=18.0, torso_deg=-14.0, head_rel_deg=12.0,
                          l_thigh_deg=18.0, l_shin_deg=28.0, r_thigh_deg=-14.0, r_shin_deg=22.0,
                          grip_x=42.0, grip_y=-152.0, weapon_deg=-104.0, grip_sep=32.0,
                          foot_y=93.0, halo_grand=True)),
                # F17..F21: High Airborne Leap (foot_y=88) Hoisting Overcharged Colossal 2H Maul!
                (19, dict(pelvis_dx=2.0, pelvis_dy=6.0, torso_deg=-20.0, head_rel_deg=16.0,
                          l_thigh_deg=28.0, l_shin_deg=40.0, r_thigh_deg=-18.0, r_shin_deg=32.0,
                          grip_x=16.0, grip_y=-182.0, weapon_deg=-134.0, grip_sep=30.0,
                          foot_y=88.0, halo_grand=True)),
                (21, dict(pelvis_dx=4.0, pelvis_dy=8.0, torso_deg=-18.0, head_rel_deg=14.0,
                          l_thigh_deg=30.0, l_shin_deg=42.0, r_thigh_deg=-18.0, r_shin_deg=34.0,
                          grip_x=22.0, grip_y=-176.0, weapon_deg=-128.0, grip_sep=30.0,
                          foot_y=88.0, halo_grand=True)),
                # F22..F26: Meteoric Top-Down World-Breaker Earthshatter Impact!
                (23, dict(pelvis_dx=16.0, pelvis_dy=36.0, torso_deg=26.0, head_rel_deg=-10.0,
                          l_thigh_deg=-24.0, l_shin_deg=28.0, r_thigh_deg=24.0, r_shin_deg=-20.0,
                          grip_x=74.0, grip_y=4.0, weapon_deg=32.0, grip_sep=36.0,
                          foot_y=99.0, halo_grand=True)),
                (26, dict(pelvis_dx=18.0, pelvis_dy=66.0, torso_deg=28.0, head_rel_deg=-14.0,
                          l_thigh_deg=-28.0, l_shin_deg=30.0, r_thigh_deg=28.0, r_shin_deg=-22.0,
                          grip_x=76.0, grip_y=12.0, weapon_deg=26.0, grip_sep=38.0,
                          foot_y=99.0, halo_grand=True)),
                (29, dict(torso_deg=3.0, grip_x=54.0, grip_y=-14.0, weapon_deg=-38.0,
                          grip_sep=38.0, foot_y=99.0, halo_grand=False)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.5)
            if 2 <= f <= 7:
                u = (f - 2) / 5.0
                cfg["slash_arc"] = dict(dx=5.0, dy=11.0, r=28.0, a0=-78.0 + 24.0 * u, a1=38.0 + 16.0 * u, intensity=1.22)
            elif 11 <= f <= 16:
                u = (f - 11) / 5.0
                cfg["slash_arc"] = dict(dx=5.0, dy=9.0, r=27.5, a0=32.0 - 46.0 * u, a1=-38.0 - 52.0 * u, intensity=1.24)
            elif 22 <= f <= 26:
                cfg["slash_arc"] = dict(dx=4.0, dy=12.0, r=28.5, a0=-98.0, a1=68.0, intensity=1.32)
                cfg["earthshatter"] = 1.0 if f in (22, 23, 24) else 0.65
                cfg["shatter_dx"] = 22.0
            cfgs.append(cfg)

        elif row_idx == 5:
            # Row 5: DEATH (2H Hurt Stagger -> Double-Knee Collapse Planting Colossal Maul Upright -> Prone Collapse!)
            kfs = make_prone_knight_death_kfs(
                idle_weapon_deg=-38.0, plant_x=76.0, plant_y=77.0, use_planted_weapon=True, mane_front=True
            )
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, extra_meta_keys=("plant_x", "plant_y"), wave_mult=1.0)
            cfg["halo_active"] = (f <= 6)
            if f <= 7:
                u = f / 7.0
                cfg["two_handed_ik"] = True
                cfg["grip_x"] = 54.0 - 8.0 * u
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
            # Row 6: DASH (Unstoppable Juggernaut Battering-Ram Bull-Charge + Molten & Jade Forge-Aegis Shield Arc!)
            st = math.sin(ph * 2.0)
            kfs = [
                (0, dict(torso_deg=3.0, grip_x=54.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=38.0, foot_y=99.0)),
                (6, dict(pelvis_dx=14.0, pelvis_dy=40.0, torso_deg=24.0, head_rel_deg=-12.0, mane_rel_deg=-16.0,
                         l_thigh_deg=28.0, l_shin_deg=30.0, r_thigh_deg=-24.0, r_shin_deg=22.0,
                         grip_x=64.0, grip_y=-24.0, weapon_deg=-14.0, grip_sep=36.0,
                         forge_aegis=True, halo_grand=True, speedlines=5, foot_y=99.0)),
                (23, dict(pelvis_dx=14.0, pelvis_dy=40.0, torso_deg=24.0, head_rel_deg=-12.0, mane_rel_deg=-16.0,
                          l_thigh_deg=28.0, l_shin_deg=30.0, r_thigh_deg=-24.0, r_shin_deg=22.0,
                          grip_x=64.0, grip_y=-24.0, weapon_deg=-14.0, grip_sep=36.0,
                          forge_aegis=True, halo_grand=True, speedlines=5, foot_y=99.0)),
                (29, dict(torso_deg=3.0, grip_x=54.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=38.0, foot_y=99.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0)
            if 6 <= f <= 23:
                cfg["pelvis_dy"] += abs(st) * 10.0
                cfg["l_thigh_deg"] = st * 28.0
                cfg["r_thigh_deg"] = -st * 28.0
                cfg["grip_y"] += st * 3.5
                apply_2h_maul_ik(cfg)
            cfgs.append(cfg)

        elif row_idx == 7:
            # Row 7: CROUCH (Deep Squat Runic Anvil Bulwark Brace F04..F12 -> Explosive 2H Counter-Slam F13..F22!)
            kfs = [
                (0, dict(torso_deg=3.0, grip_x=54.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=38.0)),
                (4, dict(pelvis_dx=-6.0, pelvis_dy=62.0, torso_deg=10.0, head_rel_deg=-6.0,
                         l_thigh_deg=-28.0, l_shin_deg=30.0, r_thigh_deg=26.0, r_shin_deg=-22.0,
                         grip_x=56.0, grip_y=-62.0, weapon_deg=-76.0, grip_sep=36.0,
                         forge_aegis=True, halo_grand=True)),
                (12, dict(pelvis_dx=-6.0, pelvis_dy=66.0, torso_deg=10.0, head_rel_deg=-6.0,
                          l_thigh_deg=-28.0, l_shin_deg=30.0, r_thigh_deg=26.0, r_shin_deg=-22.0,
                          grip_x=54.0, grip_y=-66.0, weapon_deg=-80.0, grip_sep=36.0,
                          forge_aegis=True, halo_grand=True)),
                (16, dict(pelvis_dx=16.0, pelvis_dy=64.0, torso_deg=24.0, head_rel_deg=-12.0,
                          l_thigh_deg=-24.0, l_shin_deg=26.0, r_thigh_deg=24.0, r_shin_deg=-20.0,
                          grip_x=76.0, grip_y=4.0, weapon_deg=22.0, grip_sep=38.0,
                          forge_aegis=False, halo_grand=True)),
                (22, dict(pelvis_dx=12.0, pelvis_dy=56.0, torso_deg=18.0, head_rel_deg=-8.0,
                          l_thigh_deg=-20.0, l_shin_deg=22.0, r_thigh_deg=20.0, r_shin_deg=-16.0,
                          grip_x=68.0, grip_y=-2.0, weapon_deg=10.0, grip_sep=38.0,
                          forge_aegis=False, halo_grand=False)),
                (29, dict(torso_deg=3.0, grip_x=54.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=38.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.0)
            if 13 <= f <= 19:
                cfg["slash_arc"] = dict(dx=5.0, dy=15.0, r=27.0, a0=-62.0, a1=42.0, intensity=1.18)
            cfgs.append(cfg)

        elif row_idx == 8:
            # Row 8: JUMP (Powerful Leap Hoisting Colossal 2H Maul Overhead -> Crashing Two-Handed Crater Landing!)
            kfs = [
                (0, dict(torso_deg=3.0, grip_x=54.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=38.0, foot_y=99.0)),
                (4, dict(pelvis_dy=54.0, torso_deg=14.0, l_thigh_deg=-26.0, l_shin_deg=28.0,
                         r_thigh_deg=24.0, r_shin_deg=-22.0,
                         grip_x=46.0, grip_y=-10.0, weapon_deg=-52.0, grip_sep=36.0, foot_y=99.0)),
                (11, dict(pelvis_dx=4.0, pelvis_dy=12.0, torso_deg=-14.0, head_rel_deg=10.0,
                          l_thigh_deg=24.0, l_shin_deg=36.0, r_thigh_deg=-14.0, r_shin_deg=28.0,
                          grip_x=18.0, grip_y=-174.0, weapon_deg=-128.0, grip_sep=30.0,
                          foot_y=92.0, halo_grand=True)),
                (15, dict(pelvis_dx=8.0, pelvis_dy=14.0, torso_deg=-10.0, head_rel_deg=6.0,
                          l_thigh_deg=26.0, l_shin_deg=34.0, r_thigh_deg=-14.0, r_shin_deg=26.0,
                          grip_x=38.0, grip_y=-138.0, weapon_deg=-96.0, grip_sep=32.0,
                          foot_y=93.0, halo_grand=True)),
                (19, dict(pelvis_dx=16.0, pelvis_dy=62.0, torso_deg=26.0, head_rel_deg=-12.0,
                          l_thigh_deg=-26.0, l_shin_deg=28.0, r_thigh_deg=26.0, r_shin_deg=-20.0,
                          grip_x=74.0, grip_y=8.0, weapon_deg=28.0, grip_sep=38.0,
                          foot_y=99.0, halo_grand=True)),
                (24, dict(pelvis_dx=12.0, pelvis_dy=54.0, torso_deg=18.0, head_rel_deg=-8.0,
                          l_thigh_deg=-20.0, l_shin_deg=22.0, r_thigh_deg=20.0, r_shin_deg=-16.0,
                          grip_x=66.0, grip_y=-4.0, weapon_deg=8.0, grip_sep=38.0,
                          foot_y=99.0, halo_grand=False)),
                (29, dict(torso_deg=3.0, grip_x=54.0, grip_y=-14.0, weapon_deg=-38.0, grip_sep=38.0, foot_y=99.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if 16 <= f <= 21:
                cfg["slash_arc"] = dict(dx=4.0, dy=12.0, r=27.5, a0=-88.0, a1=48.0, intensity=1.20)
            if 19 <= f <= 23:
                cfg["earthshatter"] = 0.65 if f in (19, 20) else 0.40
                cfg["shatter_dx"] = 22.0
            cfgs.append(cfg)

    return cfgs


def main():
    parts = load_and_segment_512()
    picks = [
        (0, 0, "R0 2H ANVIL GUARD"),
        (1, 4, "R1 TITAN STRIDE"),
        (2, 10, "R2 2H LUNGE CLEAVE"),
        (3, 5, "R3 360 MAUL SPIN"),
        (3, 22, "R3 SEISMIC SLAM"),
        (4, 19, "R4 RAGNAROK LEAP"),
        (4, 23, "R4 EARTHSHATTER"),
        (7, 8, "R7 ANVIL BULWARK"),
    ]
    build_and_save_30fps_sheet(
        "titan", parts, build_row_configs, render_frame,
        OUT_SHEET_PATH, VFX_SHEET_PATH, ARTIFACT_DIR,
        shimmer_cols=(C_JADE_SPEC, C_MAGMA), showcase_picks=picks,
    )


if __name__ == "__main__":
    main()
