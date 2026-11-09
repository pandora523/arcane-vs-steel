#!/usr/bin/env python3
"""
Builds Zephyros (Chronomancer — Astral Teal & Brass Clockwork Archmage) 30fps HD-2D Sprite Sheet
(6240x1872, 30 cols x 9 rows of 208x208) using chronomancer_v2_base.jpg + hd2d_rig_core.
"""

import os
import math
import numpy as np
from hd2d_rig_core import (
    COLS, P, poly_mask, keep_largest_component, clean_base_512, assign_remaining_geodesic,
    extract_parts_512, put_px, draw_line_104, render_rig_104, eval_pose_keyframes,
    make_supine_caster_death_kfs, build_and_save_30fps_sheet,
)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE_IMG_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "chronomancer_v2_base.jpg")
OUT_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "chronomancer_sheet.png")
VFX_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "chronomancer_vfx.png")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"

# Strict 20-Color Hand-Crafted Clockwork Archmage Master Palette
MASTER_PALETTE = np.array([
    [10, 14, 24],     # 0: Midnight Outline
    [18, 30, 42],     # 1: Deep Slate-Teal Selout
    [24, 54, 68],     # 2: Tailcoat Deep Astral Shadow
    [38, 86, 104],    # 3: Clockwork Teal Tailcoat Base
    [56, 128, 148],   # 4: Lit Cerulean-Teal Coat Midtone
    [88, 174, 192],   # 5: Polished Astral Silk Highlight
    [148, 218, 228],  # 6: Pale Cyan Coat Rim Highlight
    [108, 72, 74],    # 7: Silver-Rose Hair/Beard Shadow
    [164, 114, 112],  # 8: Magister Hair Midtone
    [218, 168, 162],  # 9: Lit Silver-Rose Hair Highlight
    [56, 42, 42],     # 10: Dark Leather Boot & Sleeve Shadow
    [96, 68, 56],     # 11: Warm Horology Leather Glove/Boot Mid
    [224, 182, 158],  # 12: Magister Skin Tone
    [98, 66, 28],     # 13: Dark Clockwork Bronze Shadow
    [148, 102, 38],   # 14: Burnished Escapement Brass
    [204, 154, 52],   # 15: Imperial Clock-Gold Trim
    [248, 214, 96],   # 16: Sunlit Brass Tooth Specular
    [42, 208, 232],   # 17: Temporal Hourglass Cyan
    [124, 246, 255],  # 18: Luminous Chrono-Rift Cyan
    [238, 254, 255],  # 19: White-Hot Time Singularity
], dtype=np.int32)

C_OUT = (10, 14, 24, 255)
C_BRASS_DARK = (98, 66, 28, 255)
C_BRASS_MID = (148, 102, 38, 255)
C_GOLD_LIT = (204, 154, 52, 255)
C_GOLD_SPEC = (248, 214, 96, 255)
C_CYAN = (42, 208, 232, 255)
C_CYAN_LIT = (124, 246, 255, 255)
C_CORE = (238, 254, 255, 255)

PIVOTS = dict(
    pelvis=(260.0, 248.0), neck=(258.0, 108.0),
    l_sh=(208.0, 126.0), l_elb=(176.0, 194.0), l_hand=(158.0, 278.0),
    r_sh=(302.0, 134.0), r_elb=(314.0, 198.0), r_hand=(358.0, 266.0),
    l_hip=(232.0, 256.0), l_knee=(206.0, 368.0), l_ank=(186.0, 448.0),
    r_hip=(286.0, 256.0), r_knee=(298.0, 368.0), r_ank=(302.0, 444.0),
)

PALETTE_CFG = dict(
    palette=MASTER_PALETTE,
    protect_indices=(12, 15, 16, 17, 18, 19),
    hair_indices=(7, 8, 9),
    lit_selout=1,
    shad_selout=0,
    hair_selout=7,
    joint_fill=(24, 46, 58, 255),
    joint_inner=(38, 72, 88, 255),
    hip_r=19,
    thigh_r=15,
    arm_r=13,
    pinhole_fill=(38, 86, 104, 255),
)


def load_and_segment_512():
    arr = clean_base_512(BASE_IMG_PATH)
    H, W = 512, 512
    inner_tab = poly_mask(H, W, P([(495, 610), (540, 610), (540, 740), (495, 740)]))
    arr[inner_tab] = [0, 0, 0, 0]
    a = keep_largest_component(arr[:, :, 3] > 0)
    arr[~a] = [0, 0, 0, 0]

    m_head = poly_mask(H, W, P([
        (415, 16), (605, 16), (605, 155), (582, 228), (505, 228), (455, 185), (425, 138)
    ])) & a
    m_l_sode = poly_mask(H, W, P([
        (315, 200), (452, 200), (452, 345), (392, 415), (305, 375)
    ])) & a & (~m_head)
    m_l_forearm = poly_mask(H, W, P([
        (258, 360), (392, 395), (372, 602), (258, 602)
    ])) & a & (~m_l_sode)
    m_r_sode = poly_mask(H, W, P([
        (590, 215), (655, 215), (658, 395), (595, 420)
    ])) & a & (~m_head)
    m_r_forearm = poly_mask(H, W, P([
        (598, 365), (675, 360), (772, 500), (772, 582), (670, 582), (600, 435)
    ])) & a & (~m_r_sode)
    m_torso = poly_mask(H, W, P([
        (395, 135), (632, 165), (605, 245), (610, 498), (525, 510), (432, 480), (425, 245)
    ])) & a & (~m_head) & (~m_l_sode) & (~m_l_forearm) & (~m_r_sode) & (~m_r_forearm)
    m_l_coat = poly_mask(H, W, P([
        (260, 445), (485, 465), (425, 625), (365, 835), (260, 835)
    ])) & a & (~m_torso) & (~m_l_forearm)
    m_r_coat = poly_mask(H, W, P([
        (585, 460), (720, 460), (720, 835), (650, 835), (615, 620)
    ])) & a & (~m_torso) & (~m_r_forearm)
    m_l_foot = poly_mask(H, W, P([(315, 885), (430, 885), (430, 1018), (315, 1018)])) & a
    m_l_shin = poly_mask(H, W, P([(340, 735), (470, 735), (455, 900), (340, 900)])) & a & (~m_l_foot) & (~m_l_coat)
    m_l_thigh = poly_mask(H, W, P([(375, 465), (535, 465), (522, 755), (375, 755)])) & a & (~m_torso) & (~m_l_coat) & (~m_l_shin) & (~m_l_foot)
    m_r_foot = poly_mask(H, W, P([(560, 875), (738, 875), (738, 1018), (560, 1018)])) & a
    m_r_shin = poly_mask(H, W, P([(548, 735), (660, 735), (660, 890), (555, 890)])) & a & (~m_r_foot) & (~m_r_coat)
    m_r_thigh = poly_mask(H, W, P([(518, 465), (658, 465), (658, 750), (525, 750)])) & a & (~m_torso) & (~m_r_coat) & (~m_r_shin) & (~m_r_foot)
    masks = assign_remaining_geodesic(a, [
        ("head", m_head), ("torso", m_torso), ("l_coat", m_l_coat), ("r_coat", m_r_coat),
        ("l_sode", m_l_sode), ("l_forearm", m_l_forearm),
        ("r_sode", m_r_sode), ("r_forearm", m_r_forearm),
        ("l_thigh", m_l_thigh), ("l_shin", m_l_shin), ("l_foot", m_l_foot),
        ("r_thigh", m_r_thigh), ("r_shin", m_r_shin), ("r_foot", m_r_foot),
    ])
    return extract_parts_512(arr, masks)


def draw_gear_104(arr, cx, cy, r_ring, teeth, rot_rad, col_main, col_spec):
    for k in range(28):
        a = (k / 28.0) * 2.0 * math.pi
        put_px(arr, cx + math.cos(a) * r_ring, cy + math.sin(a) * r_ring, col_main)
    for t in range(teeth):
        a = rot_rad + t * (2.0 * math.pi / teeth)
        put_px(arr, cx + math.cos(a) * (r_ring + 1.5), cy + math.sin(a) * (r_ring + 1.5), col_spec)
    for s in range(4):
        a = rot_rad + s * (math.pi * 0.5)
        draw_line_104(arr, cx, cy, cx + math.cos(a) * (r_ring - 1.0), cy + math.sin(a) * (r_ring - 1.0), col_main, 1)
    put_px(arr, cx, cy, C_CYAN_LIT)


def draw_chrono_staff_104(arr, hx, hy, staff_deg, staff_len=24.0, glow=1.0, ph=0.0):
    rad = math.radians(staff_deg)
    ux, uy = math.cos(rad), math.sin(rad)

    bx, by = hx - ux * 11.0, hy - uy * 11.0
    tx, ty = hx + ux * staff_len, hy + uy * staff_len
    draw_line_104(arr, bx, by, tx, ty, C_BRASS_DARK, 2)
    draw_line_104(arr, bx, by, tx, ty, C_GOLD_LIT, 1)
    put_px(arr, bx, by, C_GOLD_SPEC)

    # Spinning Astrolabe Ring & Hourglass Singularity at Staff Tip
    hc_x, hc_y = tx + ux * 4.5, ty + uy * 4.5
    draw_gear_104(arr, hc_x, hc_y, 4.4, 8, ph, C_GOLD_LIT, C_GOLD_SPEC)
    if glow > 0.35:
        put_px(arr, hc_x, hc_y, C_CORE if glow > 0.7 else C_CYAN_LIT)
        for da in (0.0, math.pi * 0.5, math.pi, math.pi * 1.5):
            put_px(arr, hc_x + math.cos(da + ph) * 2.0, hc_y + math.sin(da + ph) * 2.0, C_CYAN_LIT)


def extra_extents(joints_c, cfg, scale):
    pts = []
    if cfg.get("show_weapon", True) and not cfg.get("resting_weapon", False):
        rh = joints_c["r_hand"]
        rad = math.radians(cfg.get("weapon_deg", -55.0))
        wlen = cfg.get("weapon_len", 23.0)
        pts.append((rh[0] + math.cos(rad) * ((wlen + 10.0) / scale), rh[1] + math.sin(rad) * ((wlen + 10.0) / scale)))
        pts.append((rh[0] - math.cos(rad) * (13.0 / scale), rh[1] - math.sin(rad) * (13.0 / scale)))
    return pts


def draw_back(bg104, joints104, cfg):
    if cfg.get("halo_active", True):
        nk = joints104["neck"]
        ph = cfg.get("mane_wave_phase", 0.0)
        draw_gear_104(bg104, nk[0] - 10.0, nk[1] - 3.0, 6.2, 8, ph, C_BRASS_MID, C_GOLD_LIT)
        draw_gear_104(bg104, nk[0] + 6.0, nk[1] - 7.0, 4.8, 6, -ph * 1.4, C_GOLD_LIT, C_GOLD_SPEC)
        if cfg.get("doomsday_clock", False):
            for k in range(12):
                a = ph * 0.5 + k * (math.pi / 6.0)
                put_px(bg104, nk[0] + math.cos(a) * 18.0, nk[1] + 4.0 + math.sin(a) * 18.0,
                       C_CORE if k in (0, 3, 6, 9) else C_GOLD_SPEC)


def draw_front(out, joints104, cfg):
    ph = cfg.get("mane_wave_phase", 0.0)
    if cfg.get("resting_weapon", False):
        draw_chrono_staff_104(out, 50.0, 95.0, staff_deg=2.0, staff_len=21.0, glow=0.3, ph=ph)
        return

    rh = joints104["r_hand"]
    draw_chrono_staff_104(
        out, rh[0], rh[1],
        staff_deg=cfg.get("weapon_deg", -56.0),
        staff_len=cfg.get("weapon_len", 23.0),
        glow=cfg.get("weapon_glow", 1.0),
        ph=ph,
    )

    if cfg.get("shield_active", False):
        lh = joints104["l_hand"]
        draw_gear_104(out, lh[0] + 7.0, lh[1] - 2.0, 8.0, 10, -ph * 2.0, C_CYAN, C_CYAN_LIT)

    if cfg.get("cast_burst", False):
        rad = math.radians(cfg.get("weapon_deg", -20.0))
        cx = min(94.0, rh[0] + math.cos(rad) * 28.0)
        cy = max(10.0, min(92.0, rh[1] + math.sin(rad) * 28.0))
        draw_gear_104(out, cx, cy, 5.5, 8, ph * 3.0, C_CYAN_LIT, C_CORE)


DEFAULTS = dict(
    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=2.5, head_rel_deg=-1.5,
    l_thigh_deg=-2.0, l_shin_deg=2.0, l_foot_deg=0.0,
    r_thigh_deg=2.0, r_shin_deg=-2.0, r_foot_deg=0.0,
    l_sode_rel_deg=-8.0, l_fore_rel_deg=-18.0, r_sode_rel_deg=-20.0, r_fore_rel_deg=-22.0,
    l_coat_rel_deg=0.0, r_coat_rel_deg=0.0,
    weapon_deg=-56.0, weapon_len=23.0, weapon_glow=1.0, foot_y=99.0,
    show_weapon=True, halo_active=True, right_arm_in_front=False, right_leg_behind=False,
)


def render_frame(parts, cfg):
    return render_rig_104(
        parts, PIVOTS, cfg, PALETTE_CFG,
        y_bot_base=492.0, default_S=592,
        extra_extent_fn=extra_extents, draw_back_fn=draw_back, draw_front_fn=draw_front,
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
                pelvis_dx=s * 2.5, pelvis_dy=b * 7.0, torso_deg=2.5 + b * 1.6,
                head_rel_deg=-1.5 - b * 1.2, mane_wave_phase=ph,
                l_coat_rel_deg=s * 3.5, r_coat_rel_deg=-s * 3.5,
                weapon_deg=-56.0 + b * 3.0,
            )
            cfgs.append(cfg)

        elif row_idx == 1:
            st = math.sin(ph)
            kl = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dy=abs(st) * 18.0, torso_deg=7.5 + abs(st) * 2.0, head_rel_deg=-4.0,
                mane_wave_phase=ph * 2.0, right_leg_behind=(f >= 15),
                l_thigh_deg=st * 25.0, l_shin_deg=max(0.0, st * 26.0) + max(0.0, kl * 14.0), l_foot_deg=st * 12.0,
                r_thigh_deg=-st * 25.0, r_shin_deg=max(0.0, -st * 26.0) + max(0.0, -kl * 14.0), r_foot_deg=-st * 12.0,
                l_sode_rel_deg=-st * 18.0, r_sode_rel_deg=st * 14.0 - 16.0,
                l_coat_rel_deg=-st * 8.0, r_coat_rel_deg=st * 8.0,
                weapon_deg=-50.0 + st * 7.0,
            )
            cfgs.append(cfg)

        elif row_idx == 2:
            # Row 2: AUTO_ATTACK (Clockwork Windup -> Saw-Gear Staff Projection F09..F15 -> Recovery)
            kfs = [
                (0, dict(torso_deg=2.5, weapon_deg=-56.0)),
                (6, dict(pelvis_dx=-8.0, pelvis_dy=24.0, torso_deg=-8.0, head_rel_deg=6.0,
                         l_thigh_deg=-14.0, l_shin_deg=12.0, r_thigh_deg=14.0, r_shin_deg=-10.0,
                         l_sode_rel_deg=-34.0, r_sode_rel_deg=-72.0, weapon_deg=-82.0, right_arm_in_front=True)),
                (11, dict(pelvis_dx=12.0, pelvis_dy=36.0, torso_deg=18.0, head_rel_deg=-10.0,
                          l_thigh_deg=18.0, l_shin_deg=14.0, r_thigh_deg=-20.0, r_shin_deg=16.0,
                          l_sode_rel_deg=22.0, r_sode_rel_deg=16.0, r_fore_rel_deg=-8.0,
                          weapon_deg=-4.0, right_arm_in_front=True)),
                (18, dict(pelvis_dx=8.0, pelvis_dy=28.0, torso_deg=12.0,
                          r_sode_rel_deg=-8.0, weapon_deg=-22.0, right_arm_in_front=True)),
                (29, dict(torso_deg=2.5, weapon_deg=-56.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if 9 <= f <= 14:
                cfg["cast_burst"] = True
            cfgs.append(cfg)

        elif row_idx == 3:
            # Row 3: SKILL (Hourglass Stasis Invocation F03..F11 -> Temporal Shatter Staff Sweep F14..F22!)
            kfs = [
                (0, dict(torso_deg=2.5, weapon_deg=-56.0)),
                (6, dict(pelvis_dx=-6.0, pelvis_dy=32.0, torso_deg=-10.0, head_rel_deg=-6.0,
                         l_sode_rel_deg=-68.0, l_fore_rel_deg=-28.0, r_sode_rel_deg=-84.0,
                         weapon_deg=-76.0, right_arm_in_front=True)),
                (12, dict(pelvis_dx=-4.0, pelvis_dy=36.0, torso_deg=-6.0,
                          l_sode_rel_deg=-52.0, r_sode_rel_deg=-64.0, weapon_deg=-58.0, right_arm_in_front=True)),
                (18, dict(pelvis_dx=14.0, pelvis_dy=44.0, torso_deg=20.0, head_rel_deg=-12.0,
                          l_thigh_deg=-20.0, l_shin_deg=20.0, r_thigh_deg=22.0, r_shin_deg=-16.0,
                          l_sode_rel_deg=24.0, r_sode_rel_deg=22.0, r_fore_rel_deg=-6.0,
                          weapon_deg=2.0, right_arm_in_front=True)),
                (29, dict(torso_deg=2.5, weapon_deg=-56.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0)
            if f in (6, 7, 8, 17, 18, 19, 20):
                cfg["cast_burst"] = True
            cfgs.append(cfg)

        elif row_idx == 4:
            # Row 4: ULTIMATE (Doomsday Midnight — Grounded Horology Overdrive -> Midnight Bell Strike!)
            kfs = [
                (0, dict(pelvis_dy=36.0, torso_deg=-6.0, weapon_deg=-68.0, foot_y=99.0)),
                (7, dict(pelvis_dx=-6.0, pelvis_dy=44.0, torso_deg=-12.0, head_rel_deg=-10.0,
                         l_thigh_deg=-20.0, l_shin_deg=20.0, r_thigh_deg=20.0, r_shin_deg=-16.0,
                         l_sode_rel_deg=-78.0, r_sode_rel_deg=-94.0, weapon_deg=-86.0,
                         foot_y=99.0, right_arm_in_front=True)),
                (14, dict(pelvis_dx=14.0, pelvis_dy=52.0, torso_deg=22.0, head_rel_deg=-12.0,
                          l_thigh_deg=-24.0, l_shin_deg=24.0, r_thigh_deg=24.0, r_shin_deg=-18.0,
                          l_sode_rel_deg=26.0, r_sode_rel_deg=24.0, r_fore_rel_deg=-6.0,
                          weapon_deg=4.0, foot_y=99.0, right_arm_in_front=True)),
                (21, dict(pelvis_dx=10.0, pelvis_dy=42.0, torso_deg=14.0,
                          r_sode_rel_deg=8.0, weapon_deg=-12.0, foot_y=99.0, right_arm_in_front=True)),
                (29, dict(torso_deg=2.5, weapon_deg=-56.0, foot_y=99.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=4.0)
            if 3 <= f <= 22:
                cfg["doomsday_clock"] = True
            if 12 <= f <= 18:
                cfg["cast_burst"] = True
            cfgs.append(cfg)

        elif row_idx == 5:
            kfs = make_supine_caster_death_kfs(idle_weapon_deg=-56.0)
            cfgs.append(eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=1.0))

        elif row_idx == 6:
            # Row 6: DASH (Chrono Portal Warp Glide!)
            kfs = [
                (0, dict(torso_deg=6.0, weapon_deg=-50.0, foot_y=99.0)),
                (7, dict(pelvis_dx=10.0, pelvis_dy=28.0, torso_deg=22.0, head_rel_deg=-12.0,
                         l_thigh_deg=26.0, l_shin_deg=32.0, r_thigh_deg=-18.0, r_shin_deg=24.0,
                         l_coat_rel_deg=-18.0, r_coat_rel_deg=-12.0,
                         l_sode_rel_deg=22.0, r_sode_rel_deg=-34.0, weapon_deg=-138.0, foot_y=96.0)),
                (22, dict(pelvis_dx=10.0, pelvis_dy=28.0, torso_deg=22.0, head_rel_deg=-12.0,
                          l_thigh_deg=26.0, l_shin_deg=32.0, r_thigh_deg=-18.0, r_shin_deg=24.0,
                          l_coat_rel_deg=-18.0, r_coat_rel_deg=-12.0,
                          l_sode_rel_deg=22.0, r_sode_rel_deg=-34.0, weapon_deg=-138.0, foot_y=96.0)),
                (29, dict(torso_deg=6.0, weapon_deg=-50.0, foot_y=99.0)),
            ]
            cfgs.append(eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.5))

        elif row_idx == 7:
            # Row 7: CROUCH (Escapement Gear Shield Calibration -> Low Saw-Gear Counter!)
            kfs = [
                (0, dict(torso_deg=2.5, weapon_deg=-56.0)),
                (6, dict(pelvis_dx=-8.0, pelvis_dy=68.0, torso_deg=10.0,
                         l_thigh_deg=-30.0, l_shin_deg=32.0, r_thigh_deg=28.0, r_shin_deg=-24.0,
                         l_sode_rel_deg=26.0, r_sode_rel_deg=-48.0, weapon_deg=-72.0, shield_active=True)),
                (12, dict(pelvis_dx=10.0, pelvis_dy=64.0, torso_deg=18.0,
                          l_thigh_deg=-26.0, l_shin_deg=28.0, r_thigh_deg=24.0, r_shin_deg=-20.0,
                          l_sode_rel_deg=-14.0, r_sode_rel_deg=20.0, weapon_deg=2.0,
                          shield_active=False, right_arm_in_front=True)),
                (29, dict(torso_deg=2.5, weapon_deg=-56.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if f in (11, 12, 13):
                cfg["cast_burst"] = True
            cfgs.append(cfg)

        elif row_idx == 8:
            # Row 8: JUMP (Time-Glide Vault + Apex Downward Gear Cast at F15!)
            kfs = [
                (0, dict(torso_deg=2.5, weapon_deg=-56.0, foot_y=99.0)),
                (10, dict(pelvis_dx=6.0, pelvis_dy=14.0, torso_deg=12.0,
                          l_thigh_deg=22.0, l_shin_deg=36.0, r_thigh_deg=-12.0, r_shin_deg=28.0,
                          r_sode_rel_deg=-64.0, weapon_deg=-42.0, foot_y=94.0, right_arm_in_front=True)),
                (16, dict(pelvis_dx=10.0, pelvis_dy=16.0, torso_deg=18.0,
                          l_thigh_deg=24.0, l_shin_deg=32.0, r_thigh_deg=-10.0, r_shin_deg=26.0,
                          r_sode_rel_deg=22.0, weapon_deg=22.0, foot_y=94.0, right_arm_in_front=True)),
                (24, dict(pelvis_dy=46.0, torso_deg=10.0, weapon_deg=-36.0, foot_y=99.0)),
                (29, dict(torso_deg=2.5, weapon_deg=-56.0, foot_y=99.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0)
            if f in (14, 15, 16):
                cfg["cast_burst"] = True
            cfgs.append(cfg)

    return cfgs


def main():
    parts = load_and_segment_512()
    picks = [
        (0, 0, "R0 ARCHMAGE POISED"),
        (1, 4, "R1 MAGISTER STRIDE"),
        (2, 11, "R2 SAW-GEAR CAST"),
        (3, 18, "R3 TEMPORAL SHATTER"),
        (4, 14, "R4 DOOMSDAY MIDNIGHT"),
        (5, 11, "R5 WOUNDED SIT"),
        (5, 25, "R5 SUPINE STAFF REST"),
        (7, 6, "R7 ESCAPEMENT SHIELD"),
    ]
    build_and_save_30fps_sheet(
        "chronomancer", parts, build_row_configs, render_frame,
        OUT_SHEET_PATH, VFX_SHEET_PATH, ARTIFACT_DIR,
        shimmer_cols=(C_CYAN_LIT, C_GOLD_SPEC), showcase_picks=picks,
    )


if __name__ == "__main__":
    main()
