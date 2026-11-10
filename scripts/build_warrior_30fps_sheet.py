#!/usr/bin/env python3
"""
Builds Aethelgard (Warrior — Elder Rune Knight) 30fps HD-2D Sprite Sheet
(6240x1872, 30 cols x 9 rows of 208x208) using warrior_v3_base.jpg + hd2d_rig_core.

Key Features:
- 14-part dark midnight-cobalt & glowing cyan Elder-Rune Knight skeletal rig
- True Two-Handed Elder-Rune Greatsword (Claymore) with per-frame 2-Bone Analytical IK
  locking BOTH armored gauntlets (upper far hand behind winged crossguard + lower near hand
  above diamond rune pommel) across all combat stances, strides, swings, parries, dashes, & jumps!
- Row 3 (SKILL — TEMPEST VANGUARD): 2.5-revolution 360-degree Two-Handed Whirlwind Spin-Slash
  (genuine front -> side -> dorsal back-plate -> side -> front yaw + 3D Runic Cyclone ring)
  into a leaping two-handed Thunder-Breaker Overhead Slam!
- Row 4 (ULTIMATE — HEAVENLY EARTHSHATTER): Multi-directional Two-Handed Rune-Blink Omnislash
  (Left Cleave -> Right Cross-Slash -> Flank Launch -> Mid-Air TOP Two-Handed Sky Charge ->
  Meteoric Top-Down Two-Handed Vertical Plunge Slash & Earthshatter!)
"""

import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from hd2d_rig_core import (
    COLS, P, BASE_NUMERIC_KEYS, poly_mask, keep_largest_component,
    assign_remaining_geodesic, extract_parts_512, rot_pt,
    put_px, draw_line_104, draw_slash_arc_104, render_rig_104,
    make_prone_knight_death_kfs, eval_pose_keyframes, build_and_save_30fps_sheet,
)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE_IMG_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "warrior_v3_base.jpg")
OUT_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "warrior_sheet.png")
VFX_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "warrior_vfx.png")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"

# Strict 20-Color Hand-Crafted Dark Cobalt & Glowing Cyan Elder-Rune Knight Master Palette
MASTER_PALETTE = np.array([
    [8, 11, 22],      # 0: Abyssal Obsidian Outline
    [15, 22, 40],     # 1: Deep Midnight-Cobalt Selout
    [24, 35, 60],     # 2: Dark Rune-Plate Shadow
    [38, 56, 92],     # 3: Midnight Cobalt Plate Base
    [60, 88, 136],    # 4: Lit Cobalt-Steel Midtone
    [98, 138, 192],   # 5: Polished Frost-Steel Highlight
    [164, 204, 240],  # 6: Specular Plume & Blade Rim
    [22, 46, 102],    # 7: Royal Rune-Tabard Deep Indigo
    [34, 74, 152],    # 8: Royal Rune-Tabard & Plume Midtone
    [64, 122, 206],   # 9: Lit Azure Plume & Tabard Crest
    [86, 58, 24],     # 10: Antique Rune-Gold Shadow
    [138, 96, 36],    # 11: Burnished Trim Gold Midtone
    [198, 148, 52],   # 12: Imperial Rune-Gold Highlight
    [246, 208, 92],   # 13: Specular Gold Gleam
    [32, 28, 36],     # 14: Dark Under-Armor Mail/Joint Shadow
    [54, 48, 62],     # 15: Charcoal Mail/Grip Midtone
    [88, 82, 98],     # 16: Steel Chain/Rivet Highlight
    [22, 132, 204],   # 17: Deep Carved Elder-Rune Cyan
    [56, 208, 252],   # 18: Luminous Elder-Rune & T-Visor Cyan
    [228, 252, 255],  # 19: Blazing White-Ice Rune Core
], dtype=np.int32)

C_OUT = (8, 11, 22, 255)
C_SEL = (15, 22, 40, 255)
C_STEEL_DARK = (24, 35, 60, 255)
C_STEEL_BASE = (38, 56, 92, 255)
C_STEEL_MID = (60, 88, 136, 255)
C_STEEL_LIT = (98, 138, 192, 255)
C_STEEL_SPEC = (164, 204, 240, 255)
C_PLUME_DARK = (22, 46, 102, 255)
C_PLUME_MID = (34, 74, 152, 255)
C_PLUME_LIT = (64, 122, 206, 255)
C_GOLD_DARK = (86, 58, 24, 255)
C_GOLD_MID = (138, 96, 36, 255)
C_GOLD_LIT = (198, 148, 52, 255)
C_GOLD_SPEC = (246, 208, 92, 255)
C_CYAN_DEEP = (22, 132, 204, 255)
C_CYAN_LIT = (56, 208, 252, 255)
C_ICE_CORE = (228, 252, 255, 255)

PIVOTS = dict(
    pelvis=(262.5, 280.0), neck=(256.0, 134.0), mane=(247.5, 51.0),
    l_sh=(194.0, 146.0), l_elb=(171.0, 215.0), l_hand=(174.0, 314.0),
    r_sh=(311.0, 152.5), r_elb=(322.5, 219.0), r_hand=(346.0, 308.0),
    l_hip=(222.5, 290.0), l_knee=(209.0, 362.5), l_ank=(187.5, 452.5),
    r_hip=(295.0, 290.0), r_knee=(304.0, 362.5), r_ank=(297.5, 447.5),
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
    protect_indices=(12, 13, 17, 18, 19),
    hair_indices=(6, 8, 9),
    lit_selout=1,
    shad_selout=0,
    hair_selout=7,
    joint_fill=(18, 26, 46, 255),
    joint_inner=(28, 42, 72, 255),
    hip_r=22,
    thigh_r=17,
    arm_r=15,
    pinhole_fill=(24, 35, 60, 255),
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


def apply_2h_sword_ik(cfg):
    """
    Solves per-frame 2-Bone IK so BOTH of Aethelgard's gauntlets lock onto the
    Two-Handed Elder-Rune Greatsword hilt (r_hand on upper grip near crossguard,
    l_hand on lower grip above pommel) with zero mid-swing drift!
    """
    if not cfg.get("two_handed_ik", True):
        return cfg

    torso_deg = cfg.get("torso_deg", 0.0)
    grip_x = cfg.get("grip_x", 58.0)
    grip_y = cfg.get("grip_y", -18.0)
    blade_deg = cfg.get("weapon_deg", -40.0)
    grip_sep = cfg.get("grip_sep", 32.0)

    pel = PIVOTS["pelvis"]
    l_sh_w = rot_pt(PIVOTS["l_sh"], pel, torso_deg)
    r_sh_w = rot_pt(PIVOTS["r_sh"], pel, torso_deg)

    rad = math.radians(blade_deg)
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
    # Keep far arm behind torso in low/mid stances so breastplate occludes inner elbow cleanly,
    # and bring it forward during high overhead charges or deep forward reaches!
    cfg["right_arm_in_front"] = (grip_y < -85.0) or (grip_x > 63.0)
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
        "rune_ward", "halo_active", "speedlines", "speedline_deg", "two_handed_ik",
    ) + tuple(extra_meta_keys)
    for mk in all_meta:
        if mk in active_d:
            out[mk] = active_d[mk]

    out["mane_wave_phase"] = ph * wave_mult
    return apply_2h_sword_ik(out)


def load_and_segment_512():
    im = Image.open(BASE_IMG_PATH).convert("RGBA")
    for sx, sy in ((0, 0), (1023, 0), (0, 1023), (1023, 1023), (400, 500)):
        ImageDraw.floodfill(im, (sx, sy), (0, 0, 0, 0), thresh=38)
    arr = np.array(im)

    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    a0 = arr[:, :, 3] > 0
    pure_w = a0 & (r >= 246) & (g >= 246) & (b >= 246)
    pure_w[325:430, 520:590] = False
    arr[pure_w] = [0, 0, 0, 0]

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
    rgb_med3 = np.array(im512.convert("RGB").filter(ImageFilter.MedianFilter(size=3)))
    arr512 = np.array(im512)
    alpha = keep_largest_component(arr512[:, :, 3] > 0)
    arr512[~alpha] = [0, 0, 0, 0]
    arr512[:, :, :3] = np.where(alpha[:, :, None], rgb_med3, 0)

    H, W = 512, 512
    a = arr512[:, :, 3] > 0

    m_head = poly_mask(H, W, P([
        (386, 42), (445, 130), (482, 100), (548, 95), (568, 42),
        (592, 120), (595, 255), (548, 302), (475, 295), (435, 255), (432, 215), (385, 145)
    ])) & a
    m_mane = poly_mask(H, W, P([
        (188, 22), (552, 22), (548, 106), (482, 106), (445, 135), (430, 214), (188, 265)
    ])) & a & (~m_head)

    m_l_sode = poly_mask(H, W, P([
        (288, 216), (462, 216), (465, 345), (402, 435), (288, 425)
    ])) & a & (~m_head) & (~m_mane)
    m_l_forearm = poly_mask(H, W, P([
        (246, 388), (330, 418), (394, 438), (394, 640), (310, 640), (246, 520)
    ])) & a & (~m_l_sode)

    m_r_sode = poly_mask(H, W, P([
        (614, 272), (690, 258), (690, 445), (602, 455), (594, 355)
    ])) & a & (~m_head)
    m_r_forearm = poly_mask(H, W, P([
        (605, 445), (668, 392), (736, 392), (736, 635), (645, 635), (608, 495)
    ])) & a & (~m_r_sode)

    m_l_coat = poly_mask(H, W, P([
        (365, 488), (488, 505), (486, 655), (365, 662)
    ])) & a & (~m_l_forearm)
    m_r_coat = poly_mask(H, W, P([
        (588, 492), (652, 492), (652, 662), (590, 655)
    ])) & a & (~m_r_forearm)

    m_torso = poly_mask(H, W, P([
        (395, 235), (622, 230), (618, 520), (592, 768), (486, 768), (410, 505)
    ])) & a & (~m_head) & (~m_l_sode) & (~m_l_forearm) & (~m_r_sode) & (~m_r_forearm) & (~m_l_coat) & (~m_r_coat)

    m_l_foot = poly_mask(H, W, P([(312, 882), (425, 882), (425, 1008), (312, 1008)])) & a
    m_l_shin = poly_mask(H, W, P([(332, 680), (475, 680), (455, 892), (332, 892)])) & a & (~m_l_foot) & (~m_torso) & (~m_l_coat)
    m_l_thigh = poly_mask(H, W, P([(365, 555), (505, 555), (495, 705), (365, 705)])) & a & (~m_torso) & (~m_l_coat) & (~m_l_shin) & (~m_l_foot)

    m_r_foot = poly_mask(H, W, P([(550, 875), (712, 875), (712, 995), (550, 995)])) & a
    m_r_shin = poly_mask(H, W, P([(535, 682), (655, 682), (650, 885), (535, 885)])) & a & (~m_r_foot) & (~m_torso)
    m_r_thigh = poly_mask(H, W, P([(535, 560), (645, 560), (645, 705), (535, 705)])) & a & (~m_torso) & (~m_r_coat) & (~m_r_shin) & (~m_r_foot)

    masks = assign_remaining_geodesic(a, [
        ("mane", m_mane), ("head", m_head), ("torso", m_torso),
        ("l_coat", m_l_coat), ("r_coat", m_r_coat),
        ("l_sode", m_l_sode), ("l_forearm", m_l_forearm),
        ("r_sode", m_r_sode), ("r_forearm", m_r_forearm),
        ("l_thigh", m_l_thigh), ("l_shin", m_l_shin), ("l_foot", m_l_foot),
        ("r_thigh", m_r_thigh), ("r_shin", m_r_shin), ("r_foot", m_r_foot),
    ])
    return extract_parts_512(arr512, masks)


def draw_rune_halo_104(arr, nk_x, nk_y, radius=15.0, phase=0.0, grand=False):
    cx = nk_x - 3.0
    cy = nk_y + 3.0
    n_pts = 44 if grand else 32
    for i in range(n_pts):
        ang = (i / float(n_pts)) * 2.0 * math.pi + phase * 0.5
        px = cx + math.cos(ang) * radius
        py = cy + math.sin(ang) * (radius * 0.88)
        if grand or i % 2 == 0:
            col = C_CYAN_LIT if (i % 4 == 0) else C_CYAN_DEEP
            put_px(arr, px, py, col)

    n_nodes = 8 if grand else 6
    for k in range(n_nodes):
        ang = (k / float(n_nodes)) * 2.0 * math.pi - phase * 0.65
        gx = cx + math.cos(ang) * radius
        gy = cy + math.sin(ang) * (radius * 0.88)
        put_px(arr, gx, gy, C_ICE_CORE if k % 2 == 0 else C_GOLD_SPEC)
        put_px(arr, gx + 1, gy, C_CYAN_LIT)
        put_px(arr, gx - 1, gy, C_CYAN_LIT)
        put_px(arr, gx, gy - 1, C_GOLD_LIT)
        put_px(arr, gx, gy + 1, C_GOLD_LIT)


def draw_2h_runeblade_104(arr, hx, hy, blade_deg, blade_len=33.5, glow=1.0, phase=0.0, show_gauntlets=True):
    """
    Draws Aethelgard's Two-Handed Winged Frost-Runeblade Greatsword (Claymore) with:
    - Extended two-handed gold-ribbed grip (-9.2..+3.0 px along blade axis)
    - Heavy diamond Elder-Rune pommel protruding below the lower hand
    - Broad winged gold & cyan-crystal crossguard
    - Wide rune-inscribed greatsword blade with glowing cyan Elder Runes
    - Crisp cobalt-and-gold armored gauntlet finger clasps for BOTH hands on the handle!
    """
    rad = math.radians(blade_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    pom_x, pom_y = hx - ux * 9.0, hy - uy * 9.0
    grd_x, grd_y = hx + ux * 3.0, hy + uy * 3.0

    # Long Two-Handed Hilt
    draw_line_104(arr, pom_x, pom_y, grd_x, grd_y, C_STEEL_DARK, 2)
    for d in np.linspace(-8.0, 2.2, 12):
        rx, ry = hx + ux * d, hy + uy * d
        put_px(arr, rx, ry, C_GOLD_MID if int(round(d)) % 2 == 0 else C_STEEL_MID)

    # Heavy Diamond Elder-Rune Pommel
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if abs(dx) + abs(dy) <= 1:
                put_px(arr, pom_x + dx, pom_y + dy, C_GOLD_SPEC if (dx == 0 and dy == 0) else C_GOLD_LIT)
    put_px(arr, pom_x - ux * 1.1, pom_y - uy * 1.1, C_CYAN_LIT)

    # Broad Winged Gold & Rune-Crystal Crossguard
    for d in np.linspace(-5.8, 5.8, 19):
        wing = abs(d) * 0.36
        gx = grd_x + nx * d + ux * wing
        gy = grd_y + ny * d + uy * wing
        put_px(arr, gx, gy, C_GOLD_SPEC if abs(d) < 2.0 else C_GOLD_LIT)
        put_px(arr, gx - ux * 1.0, gy - uy * 1.0, C_GOLD_DARK)
    put_px(arr, grd_x, grd_y, C_ICE_CORE)
    put_px(arr, grd_x + ux * 1.0, grd_y + uy * 1.0, C_CYAN_LIT)

    # Broad Two-Handed Greatsword Blade
    steps = int(blade_len * 2.6)
    for i in range(steps + 1):
        t = i / max(1, steps)
        dist = 3.5 + t * blade_len
        half_w = 2.7 * (1.0 - 0.72 * (t ** 2.4))
        bx = hx + ux * dist
        by = hy + uy * dist
        put_px(arr, bx - nx * half_w, by - ny * half_w, C_OUT)
        put_px(arr, bx + nx * half_w, by + ny * half_w, C_STEEL_SPEC)
        put_px(arr, bx - nx * (half_w * 0.54), by - ny * (half_w * 0.54), C_STEEL_BASE)
        put_px(arr, bx + nx * (half_w * 0.54), by + ny * (half_w * 0.54), C_STEEL_LIT)
        if t < 0.85:
            glyph = ((i + int(phase * 3)) % 5)
            if glow > 0.45 and glyph in (0, 1, 3):
                r_col = C_ICE_CORE if (glow > 0.85 and glyph == 0) else C_CYAN_LIT
                put_px(arr, bx, by, r_col)
                if glyph == 1 and half_w > 1.5:
                    put_px(arr, bx + nx * 0.75, by + ny * 0.75, C_CYAN_DEEP)
            else:
                put_px(arr, bx, by, C_STEEL_DARK)
        else:
            put_px(arr, bx, by, C_ICE_CORE if glow > 0.5 else C_STEEL_SPEC)

    # Two Distinct Armored Gauntlet Clasps (Upper r_hand near guard + Lower l_hand above pommel!)
    if show_gauntlets:
        for proj, is_near in ((0.2, False), (-5.3, True)):
            cx = hx + ux * proj
            cy = hy + uy * proj
            for u_off in (-0.9, 0.0, 0.9):
                for n_off in (-1.4, -0.5, 0.5, 1.4):
                    px = cx + ux * u_off + nx * n_off
                    py = cy + uy * u_off + ny * n_off
                    if abs(n_off) > 1.1:
                        col = C_OUT
                    elif abs(u_off) > 0.6 and n_off > 0:
                        col = C_GOLD_LIT
                    elif n_off > 0.0:
                        col = C_CYAN_LIT if (is_near and abs(u_off) < 0.3) else C_STEEL_LIT
                    else:
                        col = C_STEEL_BASE
                    put_px(arr, px, py, col)


def draw_rune_ward_arc_104(arr, cx, cy):
    """
    Draws a glowing cyan & gold Elder-Rune Aegis Spell-Deflection Arc projected ahead
    of Aethelgard's two-handed Runeblade during Row 6 (Dash) & Row 7 (Two-Handed Sword Parry)!
    """
    for i in range(-13, 14):
        ang = (i / 13.0) * 0.95
        rx = cx + math.cos(ang) * 9.0
        ry = cy + math.sin(ang) * 14.0
        put_px(arr, rx, ry, C_ICE_CORE if abs(i) % 4 == 0 else C_CYAN_LIT)
        put_px(arr, rx - 1.0, ry, C_CYAN_DEEP)
        if abs(i) in (0, 6, 12):
            put_px(arr, rx + 1.0, ry, C_GOLD_SPEC)


def draw_cyclone_ring_half_104(arr, cx, cy, rx, ry, spin_ang, is_front):
    steps = 260
    for i in range(steps):
        a = (i / float(steps)) * 2.0 * math.pi
        sa = math.sin(a)
        if is_front and sa < -0.02:
            continue
        if (not is_front) and sa >= 0.02:
            continue

        rel = (spin_ang - a) % (2.0 * math.pi)
        if rel > 5.0:
            continue
        wake = 1.0 - (rel / 5.0)
        ca = math.cos(a)

        thick = 3.4 * (wake ** 0.75)
        n_dr = max(3, int(thick * 3.2) + 2)
        for dr in np.linspace(-thick, thick, n_dr):
            px = cx + ca * (rx + dr * 1.55)
            py = cy + sa * (ry + dr * 0.68)
            if px < 6.0 or px > 97.0:
                continue
            nd = abs(dr) / max(0.45, thick)
            if wake > 0.58:
                col = C_ICE_CORE if nd < 0.34 else (C_CYAN_LIT if nd < 0.72 else C_CYAN_DEEP)
            elif wake > 0.26:
                col = C_CYAN_LIT if nd < 0.40 else C_CYAN_DEEP
            else:
                if i % 3 != 0 or nd > 0.55:
                    continue
                col = C_GOLD_SPEC if (i % 9 == 0) else C_CYAN_DEEP
            put_px(arr, px, py, col)

        if wake > 0.35 and i % 2 == 0:
            ux = cx + math.cos(a + 0.55) * (rx * 0.74)
            uy = cy - 9.5 + math.sin(a + 0.55) * (ry * 0.72)
            if 7.0 <= ux <= 96.0:
                put_px(arr, ux, uy, C_ICE_CORE if wake > 0.72 else C_CYAN_LIT)


def extra_extents(joints_c, cfg, scale):
    pts = []
    if cfg.get("spin_slash", False):
        p = joints_c["pelvis"]
        pts.append((p[0] - 42.0 / scale, p[1]))
        pts.append((p[0] + 42.0 / scale, p[1]))
        return pts
    if cfg.get("show_weapon", True):
        if cfg.get("planted_weapon", False):
            return pts
        h = joints_c["r_hand"]
        rad = math.radians(cfg.get("weapon_deg", -40.0))
        wlen = cfg.get("weapon_len", 33.5)
        pts.append((h[0] + math.cos(rad) * ((wlen + 5.5) / scale), h[1] + math.sin(rad) * ((wlen + 5.5) / scale)))
        pts.append((h[0] - math.cos(rad) * (11.5 / scale), h[1] - math.sin(rad) * (11.5 / scale)))
    return pts


def draw_back(bg, joints104, cfg):
    ph = cfg.get("mane_wave_phase", 0.0)
    if cfg.get("halo_active", False):
        nk = joints104["neck"]
        draw_rune_halo_104(
            bg, nk[0], nk[1],
            radius=cfg.get("halo_r", 15.5),
            phase=ph,
            grand=cfg.get("halo_grand", False),
        )
    if cfg.get("spin_slash", False):
        pel = joints104["pelvis"]
        spin_ang = cfg.get("spin_ang", 0.0)
        draw_cyclone_ring_half_104(bg, 52.0, pel[1] - 4.0, 38.0, 10.5, spin_ang, is_front=False)
        if math.sin(spin_ang) < 0.0:
            bx = 52.0 + math.cos(spin_ang) * 11.0
            by = pel[1] - 4.0 + math.sin(spin_ang) * 3.5
            b_deg = math.degrees(math.atan2(math.sin(spin_ang) * 10.5, math.cos(spin_ang) * 38.0))
            draw_2h_runeblade_104(bg, bx, by, blade_deg=b_deg, blade_len=28.5, glow=1.0, phase=ph, show_gauntlets=True)


def draw_front(out, joints104, cfg):
    ph = cfg.get("mane_wave_phase", 0.0)

    if cfg.get("spin_slash", False):
        pel = joints104["pelvis"]
        spin_ang = cfg.get("spin_ang", 0.0)
        if math.sin(spin_ang) >= 0.0:
            bx = 52.0 + math.cos(spin_ang) * 10.5
            by = pel[1] - 4.0 + math.sin(spin_ang) * 3.5
            b_deg = math.degrees(math.atan2(math.sin(spin_ang) * 10.5, math.cos(spin_ang) * 38.0))
            draw_2h_runeblade_104(out, bx, by, blade_deg=b_deg, blade_len=28.5, glow=1.0, phase=ph, show_gauntlets=True)
        draw_cyclone_ring_half_104(out, 52.0, pel[1] - 4.0, 38.0, 10.5, spin_ang, is_front=True)
        return

    if cfg.get("show_weapon", True):
        if cfg.get("planted_weapon", False):
            draw_2h_runeblade_104(
                out, cfg.get("plant_x", 80.0), cfg.get("plant_y", 65.5),
                blade_deg=89.0, blade_len=27.5, glow=cfg.get("weapon_glow", 0.5),
                phase=ph, show_gauntlets=False,
            )
        else:
            rh = joints104["r_hand"]
            draw_2h_runeblade_104(
                out, rh[0], rh[1],
                blade_deg=cfg.get("weapon_deg", -40.0),
                blade_len=cfg.get("weapon_len", 33.5),
                glow=cfg.get("weapon_glow", 1.0),
                phase=ph,
                show_gauntlets=True,
            )

    if cfg.get("rune_ward", False):
        nk = joints104["neck"]
        draw_rune_ward_arc_104(out, min(90.0, nk[0] + 22.0), nk[1] + 10.0)

    if cfg.get("slash_arc") is not None:
        sa = cfg["slash_arc"]
        nk = joints104["neck"]
        draw_slash_arc_104(
            out, nk[0] + sa.get("dx", 2.0), nk[1] + sa.get("dy", 10.0),
            sa.get("r", 28.0), sa["a0"], sa["a1"],
            C_ICE_CORE, C_CYAN_LIT, C_CYAN_DEEP, intensity=sa.get("intensity", 1.0),
        )

    if cfg.get("x_slash", False):
        nk = joints104["neck"]
        cx, cy = min(78.0, nk[0] + 20.0), min(74.0, nk[1] + 12.0)
        for ang in (-34.0, 34.0):
            rad = math.radians(ang)
            for d in np.linspace(-20.0, 20.0, 48):
                put_px(out, cx + math.cos(rad) * d, cy + math.sin(rad) * d, C_ICE_CORE)
                put_px(out, cx + math.cos(rad) * d, cy + math.sin(rad) * d + 1.0, C_CYAN_LIT)

    if cfg.get("blink_pillars", False):
        nk = joints104["neck"]
        for k, ox in enumerate((-16.0, -9.0, 10.0, 17.0)):
            lx = max(8.0, min(95.0, nk[0] + ox))
            y0 = 12.0 + (k * 7) % 14
            y1 = min(96.0, y0 + 58.0)
            draw_line_104(out, lx, y0, lx, y1, C_ICE_CORE if k % 2 == 0 else C_CYAN_LIT, 1)

    if cfg.get("speedlines", 0) > 0:
        for k in range(cfg["speedlines"]):
            ly = 28.0 + (k * 12 + int(ph * 5)) % 52
            lx0 = 6.0 + (k * 7 + int(ph * 9)) % 16
            draw_line_104(out, lx0, ly, lx0 + 13.0, ly, C_CYAN_LIT if k % 2 == 0 else C_GOLD_SPEC, 1)


def apply_back_turn_armor_104(body_arr104, mirror_x=False):
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

    for y in range(max(4, y_top + 6), min(98, y_top + 48)):
        row_xs = np.where(a[y])[0]
        if len(row_xs) < 4:
            continue
        x0, x1 = int(row_xs.min()) + 1, int(row_xs.max()) - 1
        for x in range(x0, x1 + 1):
            r, g, b, _ = out[y, x]
            if b > 195 and g > 175:
                out[y, x] = C_STEEL_BASE if ((x + y) % 3 != 0) else C_STEEL_DARK

    spine_y0 = max(8, y_top + 22)
    spine_y1 = min(92, y_top + 44)
    for y in range(spine_y0, spine_y1):
        if a[y, cx]:
            out[y, cx] = C_GOLD_LIT if (y % 3 != 0) else C_GOLD_DARK
        if y in (spine_y0 + 5, spine_y0 + 6, spine_y0 + 9) and 4 <= cx - 2 and cx + 2 <= 99:
            if a[y, cx - 1]:
                out[y, cx - 1] = C_CYAN_LIT
            if a[y, cx + 1]:
                out[y, cx + 1] = C_CYAN_LIT
    if spine_y0 + 7 < 98 and a[spine_y0 + 7, cx]:
        out[spine_y0 + 7, cx] = C_ICE_CORE
    return out


DEFAULTS = dict(
    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=5.0, head_rel_deg=-2.5, mane_rel_deg=-4.0,
    mane_wave_amp=6.0, l_thigh_deg=-2.0, l_shin_deg=2.0, l_foot_deg=0.0,
    r_thigh_deg=2.0, r_shin_deg=-2.0, r_foot_deg=0.0,
    l_sode_rel_deg=-6.0, l_fore_rel_deg=-14.0, r_sode_rel_deg=-16.0, r_fore_rel_deg=-18.0,
    l_coat_rel_deg=0.0, r_coat_rel_deg=0.0,
    grip_x=58.0, grip_y=-18.0, grip_sep=32.0,
    weapon_deg=-40.0, weapon_len=33.5, weapon_glow=1.0, foot_y=99.0,
    show_weapon=True, two_handed_ik=True, right_arm_in_front=False, right_leg_behind=False,
    halo_active=False, rune_ward=False,
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
            y_bot_base=500.0, default_S=604,
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
        y_bot_base=500.0, default_S=604,
        extra_extent_fn=extra_extents, draw_back_fn=draw_back, draw_front_fn=draw_front,
    )


def build_row_configs(row_idx):
    cfgs = []
    for f in range(COLS):
        t = f / float(COLS)
        ph = 2.0 * math.pi * t

        if row_idx == 0:
            # Row 0: IDLE (Commanding Two-Handed Elder-Rune Greatsword Guard!)
            b = math.sin(ph)
            s = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dx=s * 2.5, pelvis_dy=b * 8.0, torso_deg=5.0 + b * 1.6,
                head_rel_deg=-2.5 - b * 1.1, mane_rel_deg=-4.0 + s * 3.5,
                mane_wave_phase=ph,
                grip_x=58.0 + s * 2.0, grip_y=-18.0 + b * 3.5,
                weapon_deg=-40.0 + b * 3.0, weapon_glow=0.82 + 0.18 * b,
            )
            cfgs.append(apply_2h_sword_ik(cfg))

        elif row_idx == 1:
            # Row 1: WALK (Heavy Armored Two-Handed Greatsword Vanguard Stride!)
            st = math.sin(ph)
            kl = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dy=abs(st) * 20.0, torso_deg=9.0 + abs(st) * 2.2, head_rel_deg=-4.5,
                mane_rel_deg=-8.0 - abs(st) * 4.0, mane_wave_phase=ph * 2.0, mane_wave_amp=8.0,
                right_leg_behind=(f >= 15),
                l_thigh_deg=st * 26.0, l_shin_deg=max(0.0, st * 28.0) + max(0.0, kl * 14.0), l_foot_deg=st * 12.0,
                r_thigh_deg=-st * 26.0, r_shin_deg=max(0.0, -st * 28.0) + max(0.0, -kl * 14.0), r_foot_deg=-st * 12.0,
                grip_x=60.0 + st * 4.0, grip_y=-14.0 + abs(st) * 5.0,
                weapon_deg=-34.0 + st * 7.0,
            )
            cfgs.append(apply_2h_sword_ik(cfg))

        elif row_idx == 2:
            # Row 2: AUTO_ATTACK (Two-Handed Overhead Coil -> Crushing 2H Cleave -> 2H Cross-Sweep!)
            kfs = [
                (0, dict(torso_deg=5.0, grip_x=58.0, grip_y=-18.0, weapon_deg=-40.0, grip_sep=32.0)),
                (7, dict(pelvis_dx=-12.0, pelvis_dy=36.0, torso_deg=-12.0, head_rel_deg=8.0,
                         l_thigh_deg=-20.0, l_shin_deg=18.0, r_thigh_deg=18.0, r_shin_deg=-14.0,
                         grip_x=18.0, grip_y=-192.0, weapon_deg=-134.0, grip_sep=26.0, halo_active=True)),
                (13, dict(pelvis_dx=14.0, pelvis_dy=52.0, torso_deg=24.0, head_rel_deg=-12.0,
                          l_thigh_deg=24.0, l_shin_deg=16.0, r_thigh_deg=-26.0, r_shin_deg=18.0,
                          grip_x=66.0, grip_y=-24.0, weapon_deg=26.0, grip_sep=30.0, halo_active=True)),
                (17, dict(pelvis_dx=4.0, pelvis_dy=40.0, torso_deg=8.0,
                          l_thigh_deg=14.0, l_shin_deg=12.0, r_thigh_deg=-16.0, r_shin_deg=14.0,
                          grip_x=44.0, grip_y=-56.0, weapon_deg=-66.0, grip_sep=30.0)),
                (22, dict(pelvis_dx=12.0, pelvis_dy=48.0, torso_deg=22.0, head_rel_deg=-10.0,
                          l_thigh_deg=22.0, l_shin_deg=16.0, r_thigh_deg=-24.0, r_shin_deg=16.0,
                          grip_x=66.0, grip_y=-20.0, weapon_deg=14.0, grip_sep=30.0)),
                (29, dict(torso_deg=5.0, grip_x=58.0, grip_y=-18.0, weapon_deg=-40.0, grip_sep=32.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.0)
            if 9 <= f <= 14:
                u = (f - 9) / 5.0
                cfg["slash_arc"] = dict(dx=1.5, r=28.5, a0=-85.0 + 25.0 * u, a1=42.0 + 18.0 * u, intensity=1.15)
            elif 19 <= f <= 23:
                u = (f - 19) / 4.0
                cfg["slash_arc"] = dict(dx=1.5, r=27.0, a0=-52.0 + 15.0 * u, a1=38.0 + 14.0 * u, intensity=1.05)
            cfgs.append(cfg)

        elif row_idx == 3:
            # Row 3: SKILL (TEMPEST VANGUARD — Two-Handed 360° Whirlwind Spin-Slash -> Two-Handed Thunder Slam!)
            if f <= 2:
                kfs_coil = [
                    (0, dict(torso_deg=5.0, grip_x=58.0, grip_y=-18.0, weapon_deg=-40.0, grip_sep=32.0, foot_y=99.0)),
                    (2, dict(pelvis_dx=-10.0, pelvis_dy=48.0, torso_deg=-12.0,
                             l_thigh_deg=-22.0, l_shin_deg=22.0, r_thigh_deg=20.0, r_shin_deg=-16.0,
                             grip_x=14.0, grip_y=-12.0, weapon_deg=-152.0, grip_sep=28.0,
                             halo_active=True, foot_y=99.0)),
                ]
                cfgs.append(eval_2h_keyframes(f, kfs_coil, ph, DEFAULTS, wave_mult=3.0))
            elif 3 <= f <= 17:
                # 15 frames = 2.5 full 360-degree revolutions with BOTH hands locked onto the orbiting hilt!
                step6 = (f - 3) % 6
                spin_ang = ((f - 3) / 6.0) * 2.0 * math.pi + 0.35
                b_deg = math.degrees(math.atan2(math.sin(spin_ang) * 10.5, math.cos(spin_ang) * 38.0))
                gx_orb = math.cos(spin_ang) * 58.0
                gy_orb = -24.0 + math.sin(spin_ang) * 18.0

                yaw_poses = [
                    dict(pelvis_dx=4.0, pelvis_dy=38.0, torso_deg=14.0, l_thigh_deg=-20.0, l_shin_deg=20.0,
                         r_thigh_deg=22.0, r_shin_deg=-14.0, back_turn=False, mirror_yaw=False),
                    dict(pelvis_dx=0.0, pelvis_dy=34.0, torso_deg=6.0, l_thigh_deg=-10.0, l_shin_deg=16.0,
                         r_thigh_deg=12.0, r_shin_deg=-10.0, back_turn=False, mirror_yaw=False),
                    dict(pelvis_dx=-2.0, pelvis_dy=36.0, torso_deg=10.0, l_thigh_deg=18.0, l_shin_deg=18.0,
                         r_thigh_deg=-18.0, r_shin_deg=14.0, mane_in_front=True, right_leg_behind=True,
                         back_turn=True, mirror_yaw=False),
                    dict(pelvis_dx=2.0, pelvis_dy=36.0, torso_deg=12.0, l_thigh_deg=18.0, l_shin_deg=18.0,
                         r_thigh_deg=-18.0, r_shin_deg=14.0, mane_in_front=True, right_leg_behind=True,
                         back_turn=True, mirror_yaw=True),
                    dict(pelvis_dx=-4.0, pelvis_dy=40.0, torso_deg=-8.0, l_thigh_deg=-14.0, l_shin_deg=18.0,
                         r_thigh_deg=14.0, r_shin_deg=-12.0, back_turn=False, mirror_yaw=False),
                    dict(pelvis_dx=6.0, pelvis_dy=42.0, torso_deg=18.0, l_thigh_deg=20.0, l_shin_deg=18.0,
                         r_thigh_deg=-22.0, r_shin_deg=16.0, back_turn=False, mirror_yaw=False),
                ]
                cfg = dict(DEFAULTS)
                cfg.update(yaw_poses[step6])
                cfg.update(
                    grip_x=gx_orb, grip_y=gy_orb, weapon_deg=b_deg, grip_sep=26.0,
                    spin_slash=True, spin_ang=spin_ang, halo_active=True, halo_r=16.5,
                    mane_wave_phase=spin_ang, mane_wave_amp=9.5, foot_y=98.0,
                )
                cfgs.append(apply_2h_sword_ik(cfg))
            else:
                # F18..F29: Leaping Two-Handed Thunder-Breaker Overhead Slam -> Recovery
                slam_kfs = [
                    (18, dict(pelvis_dx=4.0, pelvis_dy=18.0, torso_deg=-16.0, head_rel_deg=10.0,
                              l_thigh_deg=22.0, l_shin_deg=32.0, r_thigh_deg=-16.0, r_shin_deg=24.0,
                              grip_x=18.0, grip_y=-196.0, weapon_deg=-136.0, grip_sep=26.0,
                              foot_y=93.0, halo_active=True)),
                    (21, dict(pelvis_dx=18.0, pelvis_dy=66.0, torso_deg=28.0, head_rel_deg=-14.0,
                              l_thigh_deg=-28.0, l_shin_deg=30.0, r_thigh_deg=28.0, r_shin_deg=-22.0,
                              grip_x=68.0, grip_y=-14.0, weapon_deg=34.0, grip_sep=32.0,
                              foot_y=99.0, halo_active=True)),
                    (24, dict(pelvis_dx=16.0, pelvis_dy=62.0, torso_deg=25.0, head_rel_deg=-10.0,
                              l_thigh_deg=-24.0, l_shin_deg=26.0, r_thigh_deg=24.0, r_shin_deg=-18.0,
                              grip_x=64.0, grip_y=-16.0, weapon_deg=28.0, grip_sep=32.0,
                              foot_y=99.0, halo_active=True)),
                    (29, dict(torso_deg=5.0, grip_x=58.0, grip_y=-18.0, weapon_deg=-40.0,
                              grip_sep=32.0, foot_y=99.0, halo_active=False)),
                ]
                cfg = eval_2h_keyframes(f, slam_kfs, ph, DEFAULTS, wave_mult=3.0)
                if 20 <= f <= 24:
                    u = (f - 20) / 4.0
                    cfg["slash_arc"] = dict(dx=0.5, dy=11.0, r=28.5, a0=-104.0 + 22.0 * u, a1=50.0 + 12.0 * u, intensity=1.28)
                cfgs.append(cfg)

        elif row_idx == 4:
            # Row 4: ULTIMATE (HEAVENLY EARTHSHATTER — Two-Handed Left/Right/Flank/TOP Omnislash!)
            kfs = [
                (0, dict(pelvis_dy=40.0, torso_deg=-8.0, head_rel_deg=6.0,
                         grip_x=42.0, grip_y=-92.0, weapon_deg=-84.0, grip_sep=28.0,
                         foot_y=99.0, halo_active=True)),
                (2, dict(pelvis_dy=52.0, torso_deg=-14.0, l_thigh_deg=-22.0, l_shin_deg=24.0,
                         r_thigh_deg=20.0, r_shin_deg=-18.0,
                         grip_x=22.0, grip_y=-182.0, weapon_deg=-126.0, grip_sep=26.0,
                         foot_y=99.0, halo_active=True)),
                # Teleport 1 (LEFT): Two-Handed Horizontal Cleave
                (3, dict(pelvis_dx=-8.0, pelvis_dy=44.0, torso_deg=-10.0,
                         grip_x=28.0, grip_y=-138.0, weapon_deg=-104.0, grip_sep=28.0,
                         foot_y=99.0, halo_active=True, speedlines=4)),
                (5, dict(pelvis_dx=16.0, pelvis_dy=48.0, torso_deg=24.0, head_rel_deg=-12.0,
                         l_thigh_deg=24.0, l_shin_deg=20.0, r_thigh_deg=-26.0, r_shin_deg=20.0,
                         grip_x=68.0, grip_y=-24.0, weapon_deg=18.0, grip_sep=32.0,
                         foot_y=99.0, halo_active=True, speedlines=5)),
                (7, dict(pelvis_dx=12.0, pelvis_dy=46.0, torso_deg=18.0,
                         grip_x=64.0, grip_y=-22.0, weapon_deg=10.0, grip_sep=32.0,
                         foot_y=99.0, halo_active=True)),
                # Teleport 2 (RIGHT): Two-Handed Low Coil -> Rising Cross-Slash!
                (8, dict(pelvis_dx=-6.0, pelvis_dy=54.0, torso_deg=18.0,
                         grip_x=52.0, grip_y=-6.0, weapon_deg=44.0, grip_sep=30.0,
                         foot_y=99.0, halo_active=True, speedlines=4)),
                (10, dict(pelvis_dx=10.0, pelvis_dy=34.0, torso_deg=-10.0, head_rel_deg=8.0,
                          l_thigh_deg=-20.0, l_shin_deg=20.0, r_thigh_deg=22.0, r_shin_deg=-16.0,
                          grip_x=48.0, grip_y=-132.0, weapon_deg=-84.0, grip_sep=28.0,
                          foot_y=99.0, halo_active=True, speedlines=5)),
                (12, dict(pelvis_dx=6.0, pelvis_dy=36.0, torso_deg=-6.0,
                          grip_x=50.0, grip_y=-112.0, weapon_deg=-72.0, grip_sep=28.0,
                          foot_y=99.0, halo_active=True)),
                # Teleport 3 (FLANK): Two-Handed Heavy Launching Cross-Cleave!
                (13, dict(pelvis_dx=-8.0, pelvis_dy=46.0, torso_deg=-8.0,
                          grip_x=34.0, grip_y=-108.0, weapon_deg=-92.0, grip_sep=28.0,
                          foot_y=99.0, halo_active=True)),
                (15, dict(pelvis_dx=18.0, pelvis_dy=50.0, torso_deg=25.0, head_rel_deg=-12.0,
                          l_thigh_deg=26.0, l_shin_deg=22.0, r_thigh_deg=-26.0, r_shin_deg=20.0,
                          grip_x=68.0, grip_y=-26.0, weapon_deg=8.0, grip_sep=32.0,
                          foot_y=99.0, halo_active=True, speedlines=5)),
                # Teleport 4 (TOP — Directly Overhead!): Hovering Two-Handed Overhead Sky Charge!
                (17, dict(pelvis_dx=0.0, pelvis_dy=10.0, torso_deg=-16.0, head_rel_deg=14.0,
                          l_thigh_deg=28.0, l_shin_deg=42.0, r_thigh_deg=-16.0, r_shin_deg=34.0,
                          grip_x=18.0, grip_y=-196.0, weapon_deg=-130.0, grip_sep=26.0,
                          foot_y=91.0, halo_active=True)),
                (21, dict(pelvis_dx=2.0, pelvis_dy=6.0, torso_deg=-20.0, head_rel_deg=18.0,
                          l_thigh_deg=32.0, l_shin_deg=44.0, r_thigh_deg=-18.0, r_shin_deg=36.0,
                          grip_x=16.0, grip_y=-202.0, weapon_deg=-136.0, grip_sep=26.0,
                          foot_y=90.0, halo_active=True)),
                # Meteoric Top-Down Two-Handed Vertical Plunge Slash & Earthshatter!
                (23, dict(pelvis_dx=14.0, pelvis_dy=24.0, torso_deg=28.0, head_rel_deg=-8.0,
                          l_thigh_deg=24.0, l_shin_deg=30.0, r_thigh_deg=-22.0, r_shin_deg=26.0,
                          grip_x=64.0, grip_y=-20.0, weapon_deg=60.0, grip_sep=28.0,
                          foot_y=94.0, halo_active=True)),
                (25, dict(pelvis_dx=18.0, pelvis_dy=68.0, torso_deg=28.0, head_rel_deg=-16.0,
                          l_thigh_deg=-30.0, l_shin_deg=32.0, r_thigh_deg=28.0, r_shin_deg=-22.0,
                          grip_x=68.0, grip_y=-12.0, weapon_deg=40.0, grip_sep=32.0,
                          foot_y=99.0, halo_active=True)),
                (29, dict(torso_deg=5.0, grip_x=58.0, grip_y=-18.0, weapon_deg=-40.0,
                          grip_sep=32.0, foot_y=99.0, halo_active=False)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.5)
            cfg["halo_grand"] = (17 <= f <= 25)
            if f in (2, 3, 8, 13, 17):
                cfg["blink_pillars"] = True
            if 4 <= f <= 6:
                cfg["slash_arc"] = dict(dx=1.5, r=28.0, a0=-65.0, a1=42.0, intensity=1.18)
            elif 9 <= f <= 11:
                cfg["slash_arc"] = dict(dx=1.5, r=28.0, a0=-98.0, a1=18.0, intensity=1.18)
                if f == 10:
                    cfg["x_slash"] = True
            elif 14 <= f <= 16:
                cfg["slash_arc"] = dict(dx=1.0, r=28.0, a0=-48.0, a1=48.0, intensity=1.22)
                if f == 15:
                    cfg["x_slash"] = True
            elif 22 <= f <= 26:
                cfg["slash_arc"] = dict(dx=0.0, dy=12.0, r=28.5, a0=-96.0, a1=76.0, intensity=1.32)
                if f in (23, 24):
                    cfg["x_slash"] = True
            cfgs.append(cfg)

        elif row_idx == 5:
            # Row 5: DEATH (2H Stagger -> Double-Knee Two-Handed Sword Plant -> Prone Collapse!)
            kfs = make_prone_knight_death_kfs(idle_weapon_deg=-40.0, plant_x=80.0, plant_y=65.5, use_planted_weapon=True)
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, extra_meta_keys=("plant_x", "plant_y"), wave_mult=1.0)
            cfg["halo_active"] = False
            if f <= 7:
                # Keep BOTH hands clutching the Two-Handed Greatsword during initial fatal stagger!
                u = f / 7.0
                cfg["two_handed_ik"] = True
                cfg["grip_x"] = 58.0 - 8.0 * u
                cfg["grip_y"] = -18.0 + 14.0 * u
                cfg["grip_sep"] = 30.0
                apply_2h_sword_ik(cfg)
            else:
                cfg["two_handed_ik"] = False
                if f <= 15:
                    # Both hands reach forward onto the planted Two-Handed Runeblade!
                    cfg["l_sode_rel_deg"] = -58.0
                    cfg["l_fore_rel_deg"] = -24.0
            cfgs.append(cfg)

        elif row_idx == 6:
            # Row 6: DASH (Two-Handed Greatsword Vanguard Drag-Rush + Elder-Rune Aegis Ward!)
            kfs = [
                (0, dict(torso_deg=5.0, grip_x=58.0, grip_y=-18.0, weapon_deg=-40.0, grip_sep=32.0, foot_y=99.0)),
                (7, dict(pelvis_dx=12.0, pelvis_dy=38.0, torso_deg=25.0, head_rel_deg=-13.0, mane_rel_deg=-24.0,
                         l_thigh_deg=28.0, l_shin_deg=32.0, r_thigh_deg=-24.0, r_shin_deg=22.0,
                         grip_x=22.0, grip_y=8.0, weapon_deg=158.0, grip_sep=30.0,
                         rune_ward=True, halo_active=True, speedlines=5, foot_y=99.0)),
                (22, dict(pelvis_dx=12.0, pelvis_dy=38.0, torso_deg=25.0, head_rel_deg=-13.0, mane_rel_deg=-24.0,
                          l_thigh_deg=28.0, l_shin_deg=32.0, r_thigh_deg=-24.0, r_shin_deg=22.0,
                          grip_x=22.0, grip_y=8.0, weapon_deg=158.0, grip_sep=30.0,
                          rune_ward=True, halo_active=True, speedlines=5, foot_y=99.0)),
                (29, dict(torso_deg=5.0, grip_x=58.0, grip_y=-18.0, weapon_deg=-40.0, grip_sep=32.0, foot_y=99.0)),
            ]
            cfgs.append(eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0))

        elif row_idx == 7:
            # Row 7: CROUCH (Two-Handed Greatsword Cross-Guard Spell Parry -> Low 2H Frost-Crescent Counter!)
            kfs = [
                (0, dict(torso_deg=5.0, grip_x=58.0, grip_y=-18.0, weapon_deg=-40.0, grip_sep=32.0)),
                (5, dict(pelvis_dx=-6.0, pelvis_dy=64.0, torso_deg=10.0, head_rel_deg=-6.0,
                         l_thigh_deg=-28.0, l_shin_deg=30.0, r_thigh_deg=26.0, r_shin_deg=-22.0,
                         grip_x=56.0, grip_y=-64.0, weapon_deg=-74.0, grip_sep=32.0,
                         rune_ward=True, halo_active=True)),
                (12, dict(pelvis_dx=-6.0, pelvis_dy=66.0, torso_deg=10.0, head_rel_deg=-6.0,
                          l_thigh_deg=-28.0, l_shin_deg=30.0, r_thigh_deg=26.0, r_shin_deg=-22.0,
                          grip_x=54.0, grip_y=-68.0, weapon_deg=-78.0, grip_sep=32.0,
                          rune_ward=True, halo_active=True)),
                (17, dict(pelvis_dx=14.0, pelvis_dy=62.0, torso_deg=22.0, head_rel_deg=-12.0,
                          l_thigh_deg=-24.0, l_shin_deg=26.0, r_thigh_deg=24.0, r_shin_deg=-20.0,
                          grip_x=68.0, grip_y=-18.0, weapon_deg=14.0, grip_sep=32.0,
                          rune_ward=False, halo_active=True)),
                (29, dict(torso_deg=5.0, grip_x=58.0, grip_y=-18.0, weapon_deg=-40.0, grip_sep=32.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.0)
            if 14 <= f <= 19:
                cfg["slash_arc"] = dict(dx=1.5, r=27.0, a0=-45.0, a1=38.0, intensity=1.1, dy=16.0)
            cfgs.append(cfg)

        elif row_idx == 8:
            # Row 8: JUMP (Two-Handed Runic Aerial Vault & Mid-Air Downward Frost-Greatsword Cleave!)
            kfs = [
                (0, dict(torso_deg=5.0, grip_x=58.0, grip_y=-18.0, weapon_deg=-40.0, grip_sep=32.0, foot_y=99.0)),
                (4, dict(pelvis_dy=56.0, torso_deg=14.0, l_thigh_deg=-26.0, l_shin_deg=28.0,
                         r_thigh_deg=24.0, r_shin_deg=-22.0,
                         grip_x=48.0, grip_y=-12.0, weapon_deg=-54.0, grip_sep=32.0, foot_y=99.0)),
                (11, dict(pelvis_dx=6.0, pelvis_dy=14.0, torso_deg=-12.0, head_rel_deg=8.0,
                          l_thigh_deg=24.0, l_shin_deg=38.0, r_thigh_deg=-14.0, r_shin_deg=30.0,
                          grip_x=20.0, grip_y=-188.0, weapon_deg=-128.0, grip_sep=26.0,
                          foot_y=94.0, halo_active=True)),
                (16, dict(pelvis_dx=10.0, pelvis_dy=18.0, torso_deg=22.0,
                          l_thigh_deg=26.0, l_shin_deg=34.0, r_thigh_deg=-12.0, r_shin_deg=26.0,
                          grip_x=66.0, grip_y=-20.0, weapon_deg=28.0, grip_sep=32.0,
                          foot_y=95.0, halo_active=True)),
                (24, dict(pelvis_dy=50.0, torso_deg=14.0, l_thigh_deg=-22.0, l_shin_deg=24.0,
                          r_thigh_deg=20.0, r_shin_deg=-18.0,
                          grip_x=60.0, grip_y=-14.0, weapon_deg=-22.0, grip_sep=32.0, foot_y=99.0)),
                (29, dict(torso_deg=5.0, grip_x=58.0, grip_y=-18.0, weapon_deg=-40.0, grip_sep=32.0, foot_y=99.0)),
            ]
            cfg = eval_2h_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if 13 <= f <= 17:
                cfg["slash_arc"] = dict(dx=1.0, r=28.0, a0=-78.0, a1=46.0, intensity=1.15)
            cfgs.append(cfg)

    return cfgs


def main():
    parts = load_and_segment_512()
    picks = [
        (0, 0, "R0 2H RUNE GUARD"),
        (1, 4, "R1 2H RUNIC STRIDE"),
        (2, 12, "R2 2H CLEAVE"),
        (3, 5, "R3 2H 360 SPIN"),
        (3, 21, "R3 2H THUNDER SLAM"),
        (4, 19, "R4 2H SKY TOP"),
        (6, 12, "R6 2H DRAG-RUSH"),
        (7, 8, "R7 2H SWORD PARRY"),
    ]
    build_and_save_30fps_sheet(
        "warrior", parts, build_row_configs, render_frame,
        OUT_SHEET_PATH, VFX_SHEET_PATH, ARTIFACT_DIR,
        shimmer_cols=(C_CYAN_LIT, C_GOLD_SPEC), showcase_picks=picks,
    )


if __name__ == "__main__":
    main()
