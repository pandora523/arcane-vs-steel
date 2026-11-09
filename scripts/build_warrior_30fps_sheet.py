#!/usr/bin/env python3
"""
Builds Aethelgard (Warrior — Royal Frost-Sapphire & Gold Paladin-Knight) 30fps HD-2D Sprite Sheet
(6240x1872, 30 cols x 9 rows of 208x208) using warrior_v2_base.jpg + hd2d_rig_core.
"""

import os
import math
import numpy as np
from hd2d_rig_core import (
    COLS, P, poly_mask, clean_base_512, assign_remaining_geodesic, extract_parts_512,
    put_px, draw_line_104, draw_slash_arc_104, render_rig_104, eval_pose_keyframes,
    make_prone_knight_death_kfs, build_and_save_30fps_sheet,
)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE_IMG_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "warrior_v2_base.jpg")
OUT_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "warrior_sheet.png")
VFX_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "warrior_vfx.png")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"

# Strict 20-Color Hand-Crafted Frost-Sapphire & Gold Paladin Master Palette
MASTER_PALETTE = np.array([
    [10, 14, 26],     # 0: Abyssal Navy Outline
    [18, 28, 48],     # 1: Deep Sapphire Selout
    [32, 48, 76],     # 2: Steel-Sapphire Plate Deep Shadow
    [52, 82, 122],    # 3: Royal Sapphire Plate Base
    [84, 128, 174],   # 4: Lit Frost-Steel Midtone
    [132, 178, 218],  # 5: Polished Glacial Steel Highlight
    [192, 224, 246],  # 6: Specular Frost-Plate Rim
    [88, 24, 48],     # 7: Crimson-Plum Helmet Plume Shadow
    [144, 38, 68],    # 8: Royal Plume Midtone
    [204, 68, 98],    # 9: Sunlit Plume Crest Highlight
    [98, 64, 26],     # 10: Antique Gold Trim Shadow
    [152, 104, 36],   # 11: Burnished Paladin Gold
    [208, 158, 48],   # 12: Imperial Sun-Gold Trim
    [248, 214, 92],   # 13: Bright Gold Specular Gleam
    [56, 38, 32],     # 14: Dark Leather Boot/Strap Shadow
    [92, 62, 48],     # 15: Warm Cuirass Strap Leather Mid
    [136, 94, 72],    # 16: Lit Leather Boot Toe Highlight
    [36, 172, 232],   # 17: Frost-Rune Deep Cyan
    [108, 236, 255],  # 18: Luminous Glacial Visor & Runeblade Cyan
    [238, 252, 255],  # 19: Pure White-Ice Nucleus
], dtype=np.int32)

C_OUT = (10, 14, 26, 255)
C_STEEL_DARK = (32, 48, 76, 255)
C_STEEL_MID = (84, 128, 174, 255)
C_STEEL_LIT = (132, 178, 218, 255)
C_STEEL_SPEC = (192, 224, 246, 255)
C_GOLD_DARK = (98, 64, 26, 255)
C_GOLD_MID = (152, 104, 36, 255)
C_GOLD_LIT = (208, 158, 48, 255)
C_GOLD_SPEC = (248, 214, 92, 255)
C_CYAN_DEEP = (36, 172, 232, 255)
C_CYAN_LIT = (108, 236, 255, 255)
C_ICE_CORE = (238, 252, 255, 255)

PIVOTS = dict(
    pelvis=(258.0, 275.0), neck=(258.0, 136.0), mane=(222.0, 62.0),
    l_sh=(202.0, 146.0), l_elb=(170.0, 212.0), l_hand=(168.0, 286.0),
    r_sh=(306.0, 152.0), r_elb=(318.0, 214.0), r_hand=(360.0, 274.0),
    l_hip=(222.0, 286.0), l_knee=(196.0, 356.0), l_ank=(180.0, 440.0),
    r_hip=(294.0, 286.0), r_knee=(316.0, 356.0), r_ank=(314.0, 434.0),
)

PALETTE_CFG = dict(
    palette=MASTER_PALETTE,
    protect_indices=(12, 13, 17, 18, 19),
    hair_indices=(7, 8, 9),
    lit_selout=1,
    shad_selout=0,
    hair_selout=7,
    joint_fill=(24, 36, 58, 255),
    joint_inner=(38, 56, 88, 255),
    hip_r=22,
    thigh_r=17,
    arm_r=15,
    pinhole_fill=(32, 48, 76, 255),
)


def load_and_segment_512():
    arr = clean_base_512(BASE_IMG_PATH)
    H, W = 512, 512
    a = arr[:, :, 3] > 0
    m_head = poly_mask(H, W, P([
        (430, 92), (605, 92), (605, 290), (545, 305), (465, 280), (425, 242), (432, 138), (485, 102)
    ])) & a
    m_mane = poly_mask(H, W, P([
        (310, 20), (550, 20), (545, 110), (445, 155), (435, 225), (310, 225)
    ])) & a & (~m_head)
    m_l_sode = poly_mask(H, W, P([
        (275, 228), (455, 228), (465, 345), (415, 425), (275, 425)
    ])) & a & (~m_head) & (~m_mane)
    m_l_forearm = poly_mask(H, W, P([
        (260, 415), (395, 418), (390, 640), (260, 640)
    ])) & a & (~m_l_sode)
    m_r_sode = poly_mask(H, W, P([
        (582, 245), (675, 245), (675, 430), (595, 455), (585, 355)
    ])) & a & (~m_head)
    m_r_forearm = poly_mask(H, W, P([
        (595, 415), (685, 405), (788, 520), (788, 602), (675, 602), (600, 475)
    ])) & a & (~m_r_sode)
    m_torso = poly_mask(H, W, P([
        (355, 245), (610, 245), (610, 465), (666, 635), (592, 642),
        (545, 672), (485, 632), (355, 645), (415, 445)
    ])) & a & (~m_head) & (~m_l_sode) & (~m_l_forearm) & (~m_r_sode) & (~m_r_forearm)
    m_l_foot = poly_mask(H, W, P([(285, 868), (418, 868), (418, 1018), (285, 1018)])) & a
    m_l_shin = poly_mask(H, W, P([(305, 665), (470, 665), (455, 880), (300, 880)])) & a & (~m_l_foot) & (~m_torso)
    m_l_thigh = poly_mask(H, W, P([(350, 545), (528, 545), (512, 710), (350, 710)])) & a & (~m_torso) & (~m_l_shin) & (~m_l_foot)
    m_r_foot = poly_mask(H, W, P([(570, 855), (765, 855), (765, 1018), (570, 1018)])) & a
    m_r_shin = poly_mask(H, W, P([(560, 665), (695, 665), (690, 868), (565, 868)])) & a & (~m_r_foot) & (~m_torso)
    m_r_thigh = poly_mask(H, W, P([(525, 545), (675, 545), (675, 705), (535, 705)])) & a & (~m_torso) & (~m_r_shin) & (~m_r_foot)
    masks = assign_remaining_geodesic(a, [
        ("mane", m_mane), ("head", m_head), ("torso", m_torso),
        ("l_sode", m_l_sode), ("l_forearm", m_l_forearm),
        ("r_sode", m_r_sode), ("r_forearm", m_r_forearm),
        ("l_thigh", m_l_thigh), ("l_shin", m_l_shin), ("l_foot", m_l_foot),
        ("r_thigh", m_r_thigh), ("r_shin", m_r_shin), ("r_foot", m_r_foot),
    ])
    return extract_parts_512(arr, masks)


def draw_runeblade_104(arr, hx, hy, blade_deg, blade_len=29.0, glow=1.0, phase=0.0):
    rad = math.radians(blade_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    pom_x, pom_y = hx - ux * 6.5, hy - uy * 6.5
    grd_x, grd_y = hx + ux * 2.5, hy + uy * 2.5
    draw_line_104(arr, pom_x, pom_y, grd_x, grd_y, C_GOLD_DARK, 2)
    put_px(arr, pom_x, pom_y, C_GOLD_SPEC)
    put_px(arr, pom_x - ux * 0.8, pom_y - uy * 0.8, C_CYAN_LIT)

    # Ornate Royal Winged Crossguard
    for d in np.linspace(-4.2, 4.2, 13):
        wing = abs(d) * 0.28
        gx = grd_x + nx * d + ux * wing
        gy = grd_y + ny * d + uy * wing
        put_px(arr, gx, gy, C_GOLD_SPEC if abs(d) < 1.6 else C_GOLD_LIT)
        put_px(arr, gx - ux * 0.9, gy - uy * 0.9, C_GOLD_MID)
    put_px(arr, grd_x + ux * 0.8, grd_y + uy * 0.8, C_CYAN_LIT)

    # Broad Paladin Frost-Runeblade with glowing fuller
    steps = int(blade_len * 2.4)
    for i in range(steps + 1):
        t = i / max(1, steps)
        dist = 3.0 + t * blade_len
        half_w = 1.9 * (1.0 - 0.72 * (t ** 2.2))
        bx = hx + ux * dist
        by = hy + uy * dist
        put_px(arr, bx - nx * half_w, by - ny * half_w, C_OUT)
        put_px(arr, bx + nx * half_w, by + ny * half_w, C_STEEL_SPEC)
        put_px(arr, bx - nx * (half_w * 0.45), by - ny * (half_w * 0.45), C_STEEL_MID)
        put_px(arr, bx + nx * (half_w * 0.45), by + ny * (half_w * 0.45), C_STEEL_LIT)
        if t < 0.82:
            rune_on = glow > 0.45 and ((i + int(phase * 3)) % 4 != 0)
            put_px(arr, bx, by, C_ICE_CORE if (glow > 0.85 and i % 6 == 0) else (C_CYAN_LIT if rune_on else C_CYAN_DEEP))
        else:
            put_px(arr, bx, by, C_ICE_CORE if glow > 0.5 else C_STEEL_SPEC)


def draw_aegis_shield_104(arr, cx, cy):
    for dy in range(-11, 13):
        t = (dy + 11) / 23.0
        hw = int(round(7.5 * (1.0 - max(0.0, t - 0.45) * 1.35)))
        for dx in range(-hw, hw + 1):
            px, py = cx + dx, cy + dy
            edge = (abs(dx) == hw) or (dy == -11) or (dy == 12)
            inner_rim = (abs(dx) == hw - 1) or (dy == -10)
            cross = (abs(dx) <= 1 and abs(dy) <= 6) or (abs(dy) <= 1 and abs(dx) <= 4)
            if edge:
                col = C_OUT if dx < 0 or dy > 6 else C_GOLD_SPEC
            elif inner_rim:
                col = C_GOLD_LIT
            elif cross:
                col = C_ICE_CORE if (dx == 0 and dy == 0) else C_CYAN_LIT
            else:
                col = C_STEEL_LIT if dx > 0 else C_STEEL_DARK
            put_px(arr, px, py, col)


def extra_extents(joints_c, cfg, scale):
    pts = []
    if cfg.get("show_weapon", True):
        if cfg.get("planted_weapon", False):
            return pts
        h = joints_c["r_hand"]
        rad = math.radians(cfg.get("weapon_deg", -32.0))
        wlen = cfg.get("weapon_len", 29.0)
        pts.append((h[0] + math.cos(rad) * ((wlen + 4.5) / scale), h[1] + math.sin(rad) * ((wlen + 4.5) / scale)))
        pts.append((h[0] - math.cos(rad) * (8.5 / scale), h[1] - math.sin(rad) * (8.5 / scale)))
    return pts


def draw_front(out, joints104, cfg):
    ph = cfg.get("mane_wave_phase", 0.0)
    if cfg.get("show_weapon", True):
        if cfg.get("planted_weapon", False):
            draw_runeblade_104(
                out, cfg.get("plant_x", 81.0), cfg.get("plant_y", 66.5),
                blade_deg=89.0, blade_len=27.0, glow=cfg.get("weapon_glow", 0.5), phase=ph
            )
        else:
            rh = joints104["r_hand"]
            draw_runeblade_104(
                out, rh[0], rh[1],
                blade_deg=cfg.get("weapon_deg", -32.0),
                blade_len=cfg.get("weapon_len", 29.0),
                glow=cfg.get("weapon_glow", 1.0),
                phase=ph,
            )

    if cfg.get("shield_active", False):
        lh = joints104["l_hand"]
        draw_aegis_shield_104(out, lh[0] + 6.0, lh[1] - 2.0)

    if cfg.get("slash_arc") is not None:
        sa = cfg["slash_arc"]
        nk = joints104["neck"]
        draw_slash_arc_104(
            out, nk[0] + sa.get("dx", 6.0), nk[1] + sa.get("dy", 10.0),
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

    if cfg.get("speedlines", 0) > 0:
        for k in range(cfg["speedlines"]):
            ly = 28.0 + (k * 12 + int(ph * 5)) % 52
            lx0 = 6.0 + (k * 7 + int(ph * 9)) % 16
            draw_line_104(out, lx0, ly, lx0 + 13.0, ly, C_CYAN_LIT if k % 2 == 0 else C_GOLD_SPEC, 1)


DEFAULTS = dict(
    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.5, mane_rel_deg=-4.0,
    mane_wave_amp=6.0, l_thigh_deg=-2.0, l_shin_deg=2.0, l_foot_deg=0.0,
    r_thigh_deg=2.0, r_shin_deg=-2.0, r_foot_deg=0.0,
    l_sode_rel_deg=-6.0, l_fore_rel_deg=-14.0, r_sode_rel_deg=-16.0, r_fore_rel_deg=-18.0,
    weapon_deg=-32.0, weapon_len=29.0, weapon_glow=1.0, foot_y=99.0,
    show_weapon=True, right_arm_in_front=False, right_leg_behind=False,
)


def render_frame(parts, cfg):
    return render_rig_104(
        parts, PIVOTS, cfg, PALETTE_CFG,
        y_bot_base=484.0, default_S=588,
        extra_extent_fn=extra_extents, draw_front_fn=draw_front,
    )


def build_row_configs(row_idx):
    cfgs = []
    for f in range(COLS):
        t = f / float(COLS)
        ph = 2.0 * math.pi * t

        if row_idx == 0:
            b = math.sin(ph)
            s = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dx=s * 3.0, pelvis_dy=b * 8.0, torso_deg=3.0 + b * 1.8,
                head_rel_deg=-1.5 - b * 1.2, mane_rel_deg=-4.0 + s * 3.5,
                mane_wave_phase=ph, weapon_deg=-32.0 + b * 3.0,
            )
            cfgs.append(cfg)

        elif row_idx == 1:
            st = math.sin(ph)
            kl = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dy=abs(st) * 20.0, torso_deg=8.0 + abs(st) * 2.2, head_rel_deg=-4.0,
                mane_rel_deg=-8.0 - abs(st) * 4.0, mane_wave_phase=ph * 2.0, mane_wave_amp=8.0,
                right_leg_behind=(f >= 15),
                l_thigh_deg=st * 26.0, l_shin_deg=max(0.0, st * 28.0) + max(0.0, kl * 14.0), l_foot_deg=st * 12.0,
                r_thigh_deg=-st * 26.0, r_shin_deg=max(0.0, -st * 28.0) + max(0.0, -kl * 14.0), r_foot_deg=-st * 12.0,
                l_sode_rel_deg=-st * 20.0, l_fore_rel_deg=-18.0 - abs(st) * 7.0,
                r_sode_rel_deg=st * 16.0 - 10.0, r_fore_rel_deg=-16.0 + st * 5.0,
                weapon_deg=-26.0 + st * 8.0,
            )
            cfgs.append(cfg)

        elif row_idx == 2:
            # Row 2: AUTO_ATTACK (Overhead 2H Frost-Runeblade Coil -> Cleave 1 -> Cross-Cleave 2 -> Recovery)
            kfs = [
                (0, dict(torso_deg=3.0, weapon_deg=-32.0)),
                (7, dict(pelvis_dx=-12.0, pelvis_dy=38.0, torso_deg=-14.0, head_rel_deg=8.0,
                         l_thigh_deg=-20.0, l_shin_deg=18.0, r_thigh_deg=18.0, r_shin_deg=-14.0,
                         l_sode_rel_deg=-64.0, l_fore_rel_deg=-34.0, r_sode_rel_deg=-98.0, r_fore_rel_deg=-28.0,
                         weapon_deg=-124.0, right_arm_in_front=True)),
                (13, dict(pelvis_dx=14.0, pelvis_dy=52.0, torso_deg=24.0, head_rel_deg=-12.0,
                          l_thigh_deg=24.0, l_shin_deg=16.0, r_thigh_deg=-26.0, r_shin_deg=18.0,
                          l_sode_rel_deg=20.0, l_fore_rel_deg=-20.0, r_sode_rel_deg=28.0, r_fore_rel_deg=-8.0,
                          weapon_deg=26.0, right_arm_in_front=True)),
                (17, dict(pelvis_dx=4.0, pelvis_dy=40.0, torso_deg=8.0,
                          l_thigh_deg=14.0, l_shin_deg=12.0, r_thigh_deg=-16.0, r_shin_deg=14.0,
                          l_sode_rel_deg=-24.0, r_sode_rel_deg=-52.0, weapon_deg=-58.0, right_arm_in_front=True)),
                (22, dict(pelvis_dx=12.0, pelvis_dy=48.0, torso_deg=22.0, head_rel_deg=-10.0,
                          l_thigh_deg=22.0, l_shin_deg=16.0, r_thigh_deg=-24.0, r_shin_deg=16.0,
                          l_sode_rel_deg=18.0, r_sode_rel_deg=22.0, weapon_deg=16.0, right_arm_in_front=True)),
                (29, dict(torso_deg=3.0, weapon_deg=-32.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.0)
            if 9 <= f <= 14:
                u = (f - 9) / 5.0
                cfg["slash_arc"] = dict(r=29.0, a0=-85.0 + 25.0 * u, a1=42.0 + 18.0 * u, intensity=1.15)
            elif 19 <= f <= 23:
                u = (f - 19) / 4.0
                cfg["slash_arc"] = dict(r=27.0, a0=-52.0 + 15.0 * u, a1=38.0 + 14.0 * u, intensity=1.05)
            cfgs.append(cfg)

        elif row_idx == 3:
            # Row 3: SKILL (Tempest Vanguard — Grounded Coil -> Whirlwind Rush -> Overhead Thunder-Breaker Slam!)
            kfs = [
                (0, dict(torso_deg=3.0, weapon_deg=-32.0, foot_y=99.0)),
                (4, dict(pelvis_dx=-10.0, pelvis_dy=54.0, torso_deg=14.0, l_thigh_deg=-24.0, l_shin_deg=24.0,
                         r_thigh_deg=22.0, r_shin_deg=-18.0, r_sode_rel_deg=-68.0, weapon_deg=-95.0, right_arm_in_front=True)),
                (9, dict(pelvis_dx=8.0, pelvis_dy=36.0, torso_deg=22.0, l_thigh_deg=24.0, l_shin_deg=20.0,
                         r_thigh_deg=-22.0, r_shin_deg=18.0, r_sode_rel_deg=18.0, weapon_deg=6.0,
                         right_arm_in_front=True, speedlines=4)),
                (14, dict(pelvis_dx=4.0, pelvis_dy=26.0, torso_deg=-16.0, head_rel_deg=10.0,
                          l_thigh_deg=-18.0, l_shin_deg=22.0, r_thigh_deg=20.0, r_shin_deg=-14.0,
                          l_sode_rel_deg=-76.0, r_sode_rel_deg=-112.0, r_fore_rel_deg=-24.0,
                          weapon_deg=-132.0, foot_y=95.0, right_arm_in_front=True)),
                (20, dict(pelvis_dx=16.0, pelvis_dy=64.0, torso_deg=28.0, head_rel_deg=-14.0,
                          l_thigh_deg=-26.0, l_shin_deg=28.0, r_thigh_deg=26.0, r_shin_deg=-20.0,
                          l_sode_rel_deg=26.0, r_sode_rel_deg=34.0, r_fore_rel_deg=-6.0,
                          weapon_deg=32.0, foot_y=99.0, right_arm_in_front=True)),
                (29, dict(torso_deg=3.0, weapon_deg=-32.0, foot_y=99.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0)
            if 6 <= f <= 12:
                cfg["slash_arc"] = dict(r=28.0, a0=-35.0, a1=45.0, intensity=1.0)
            elif 17 <= f <= 22:
                cfg["slash_arc"] = dict(r=31.0, a0=-95.0, a1=48.0, intensity=1.25)
            cfgs.append(cfg)

        elif row_idx == 4:
            # Row 4: ULTIMATE (Heavenly Earthshatter — Omnislash Cross-Cuts -> Rising Dragon Vault -> Meteoric Greatsword Plunge!)
            kfs = [
                (0, dict(pelvis_dy=48.0, torso_deg=14.0, weapon_deg=-48.0, foot_y=99.0, right_arm_in_front=True)),
                (5, dict(pelvis_dx=12.0, pelvis_dy=44.0, torso_deg=22.0, l_thigh_deg=22.0, r_thigh_deg=-24.0,
                         r_sode_rel_deg=24.0, weapon_deg=18.0, foot_y=99.0, right_arm_in_front=True, speedlines=5)),
                (9, dict(pelvis_dx=-6.0, pelvis_dy=40.0, torso_deg=-8.0, l_thigh_deg=-18.0, r_thigh_deg=18.0,
                         r_sode_rel_deg=-72.0, weapon_deg=-78.0, foot_y=99.0, right_arm_in_front=True, speedlines=5)),
                (15, dict(pelvis_dx=6.0, pelvis_dy=14.0, torso_deg=-18.0, head_rel_deg=8.0,
                          l_thigh_deg=26.0, l_shin_deg=36.0, r_thigh_deg=-14.0, r_shin_deg=28.0,
                          l_sode_rel_deg=-82.0, r_sode_rel_deg=-118.0, weapon_deg=-136.0,
                          foot_y=93.0, right_arm_in_front=True)),
                (21, dict(pelvis_dx=18.0, pelvis_dy=68.0, torso_deg=30.0, head_rel_deg=-16.0,
                          l_thigh_deg=-28.0, l_shin_deg=30.0, r_thigh_deg=28.0, r_shin_deg=-22.0,
                          l_sode_rel_deg=28.0, r_sode_rel_deg=36.0, r_fore_rel_deg=-6.0,
                          weapon_deg=34.0, foot_y=99.0, right_arm_in_front=True)),
                (29, dict(torso_deg=3.0, weapon_deg=-32.0, foot_y=99.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.5)
            if f in (4, 5, 6, 8, 9):
                cfg["x_slash"] = True
            if 18 <= f <= 24:
                cfg["slash_arc"] = dict(r=32.0, a0=-102.0, a1=52.0, intensity=1.3)
                if f in (20, 21, 22):
                    cfg["x_slash"] = True
            cfgs.append(cfg)

        elif row_idx == 5:
            kfs = make_prone_knight_death_kfs(idle_weapon_deg=-32.0, plant_x=81.0, plant_y=66.5, use_planted_weapon=True)
            cfgs.append(eval_pose_keyframes(f, kfs, ph, DEFAULTS, extra_meta_keys=("plant_x", "plant_y"), wave_mult=1.0))

        elif row_idx == 6:
            # Row 6: DASH (Vanguard Shoulder-Charge Rush!)
            kfs = [
                (0, dict(torso_deg=6.0, weapon_deg=-28.0, foot_y=99.0)),
                (7, dict(pelvis_dx=12.0, pelvis_dy=38.0, torso_deg=26.0, head_rel_deg=-14.0, mane_rel_deg=-24.0,
                         l_thigh_deg=28.0, l_shin_deg=32.0, r_thigh_deg=-24.0, r_shin_deg=22.0,
                         l_sode_rel_deg=22.0, r_sode_rel_deg=-36.0, weapon_deg=-152.0,
                         shield_active=True, speedlines=5, foot_y=99.0)),
                (22, dict(pelvis_dx=12.0, pelvis_dy=38.0, torso_deg=26.0, head_rel_deg=-14.0, mane_rel_deg=-24.0,
                          l_thigh_deg=28.0, l_shin_deg=32.0, r_thigh_deg=-24.0, r_shin_deg=22.0,
                          l_sode_rel_deg=22.0, r_sode_rel_deg=-36.0, weapon_deg=-152.0,
                          shield_active=True, speedlines=5, foot_y=99.0)),
                (29, dict(torso_deg=6.0, weapon_deg=-28.0, foot_y=99.0)),
            ]
            cfgs.append(eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0))

        elif row_idx == 7:
            # Row 7: CROUCH (Aegis Greatshield Brace -> Low Frost-Crescent Counter-Slash!)
            kfs = [
                (0, dict(torso_deg=3.0, weapon_deg=-32.0)),
                (5, dict(pelvis_dx=-8.0, pelvis_dy=68.0, torso_deg=12.0, head_rel_deg=-8.0,
                         l_thigh_deg=-30.0, l_shin_deg=32.0, r_thigh_deg=28.0, r_shin_deg=-24.0,
                         l_sode_rel_deg=26.0, l_fore_rel_deg=-28.0, r_sode_rel_deg=-48.0,
                         weapon_deg=-128.0, shield_active=True)),
                (12, dict(pelvis_dx=-8.0, pelvis_dy=70.0, torso_deg=10.0,
                          l_thigh_deg=-30.0, l_shin_deg=32.0, r_thigh_deg=28.0, r_shin_deg=-24.0,
                          l_sode_rel_deg=28.0, l_fore_rel_deg=-26.0, r_sode_rel_deg=-58.0,
                          weapon_deg=-88.0, shield_active=True, right_arm_in_front=True)),
                (17, dict(pelvis_dx=14.0, pelvis_dy=64.0, torso_deg=22.0, head_rel_deg=-12.0,
                          l_thigh_deg=-24.0, l_shin_deg=26.0, r_thigh_deg=24.0, r_shin_deg=-20.0,
                          l_sode_rel_deg=-18.0, r_sode_rel_deg=24.0, r_fore_rel_deg=-8.0,
                          weapon_deg=14.0, shield_active=False, right_arm_in_front=True)),
                (29, dict(torso_deg=3.0, weapon_deg=-32.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.0)
            if 14 <= f <= 19:
                cfg["slash_arc"] = dict(r=27.0, a0=-45.0, a1=38.0, intensity=1.1, dy=16.0)
            cfgs.append(cfg)

        elif row_idx == 8:
            # Row 8: JUMP (Paladin Vault + Apex Downward Frost-Greatsword Cleave!)
            kfs = [
                (0, dict(torso_deg=3.0, weapon_deg=-32.0, foot_y=99.0)),
                (4, dict(pelvis_dy=56.0, torso_deg=14.0, l_thigh_deg=-26.0, l_shin_deg=28.0,
                         r_thigh_deg=24.0, r_shin_deg=-22.0, weapon_deg=-48.0, foot_y=99.0)),
                (11, dict(pelvis_dx=6.0, pelvis_dy=14.0, torso_deg=-10.0,
                          l_thigh_deg=24.0, l_shin_deg=38.0, r_thigh_deg=-14.0, r_shin_deg=30.0,
                          r_sode_rel_deg=-96.0, weapon_deg=-118.0, foot_y=94.0, right_arm_in_front=True)),
                (16, dict(pelvis_dx=10.0, pelvis_dy=18.0, torso_deg=22.0,
                          l_thigh_deg=26.0, l_shin_deg=34.0, r_thigh_deg=-12.0, r_shin_deg=26.0,
                          r_sode_rel_deg=26.0, weapon_deg=28.0, foot_y=95.0, right_arm_in_front=True)),
                (24, dict(pelvis_dy=50.0, torso_deg=14.0, l_thigh_deg=-22.0, l_shin_deg=24.0,
                          r_thigh_deg=20.0, r_shin_deg=-18.0, weapon_deg=-18.0, foot_y=99.0)),
                (29, dict(torso_deg=3.0, weapon_deg=-32.0, foot_y=99.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if 13 <= f <= 17:
                cfg["slash_arc"] = dict(r=29.0, a0=-78.0, a1=46.0, intensity=1.15)
            cfgs.append(cfg)

    return cfgs


def main():
    parts = load_and_segment_512()
    picks = [
        (0, 0, "R0 PALADIN GUARD"),
        (1, 4, "R1 KNIGHT STRIDE"),
        (2, 12, "R2 RUNEBLADE CLEAVE"),
        (3, 19, "R3 THUNDER-BREAKER SLAM"),
        (4, 20, "R4 EARTHSHATTER PLUNGE"),
        (5, 12, "R5 KNEE BLADE PLANT"),
        (5, 25, "R5 PRONE REST"),
        (7, 8, "R7 AEGIS GREATSHIELD"),
    ]
    build_and_save_30fps_sheet(
        "warrior", parts, build_row_configs, render_frame,
        OUT_SHEET_PATH, VFX_SHEET_PATH, ARTIFACT_DIR,
        shimmer_cols=(C_CYAN_LIT, C_GOLD_SPEC), showcase_picks=picks,
    )


if __name__ == "__main__":
    main()
