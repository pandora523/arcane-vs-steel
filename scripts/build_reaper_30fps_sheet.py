#!/usr/bin/env python3
"""
Builds Malakor (Reaper — Horned Abyssal Necropolis Dreadlord) 30fps HD-2D Sprite Sheet
(6240x1872, 30 cols x 9 rows of 208x208) using reaper_v2_base.jpg + hd2d_rig_core.
"""

import os
import math
import numpy as np
from hd2d_rig_core import (
    COLS, P, poly_mask, keep_largest_component, clean_base_512, assign_remaining_geodesic,
    extract_parts_512, put_px, draw_line_104, draw_slash_arc_104, render_rig_104,
    eval_pose_keyframes, make_prone_knight_death_kfs, build_and_save_30fps_sheet,
)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE_IMG_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "reaper_v2_base.jpg")
OUT_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "reaper_sheet.png")
VFX_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "reaper_vfx.png")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"

# Strict 20-Color Hand-Crafted Necropolis Dreadlord Master Palette
MASTER_PALETTE = np.array([
    [8, 8, 14],       # 0: Void Pitch-Black Face & Outline
    [18, 16, 28],     # 1: Abyssal Necro Selout
    [28, 30, 46],     # 2: Soul-Iron Armor Deep Shadow
    [44, 48, 72],     # 3: Necropolis Ribcage Plate Base
    [68, 74, 106],    # 4: Lit Soul-Iron Midtone
    [98, 106, 144],   # 5: Cold Bone-Steel Highlight
    [142, 150, 188],  # 6: Specular Scythe/Bone Steel Rim
    [68, 8, 38],      # 7: Dark Blood-Wine Hood Shadow
    [108, 14, 56],    # 8: Crimson Cowl & Horn Base
    [156, 26, 76],    # 9: Lit Demonic Horn & Hood Fold
    [202, 44, 96],    # 10: Scarlet-Crimson Horn Ridge Highlight
    [42, 36, 34],     # 11: Crypt-Cloth & Boot Shadow
    [68, 56, 48],     # 12: Tattered Wraith-Leather Mid
    [98, 82, 66],     # 13: Worn Bone-Leather Highlight
    [76, 36, 118],    # 14: Deep Necrotic Amethyst Shadow
    [126, 62, 186],   # 15: Abyssal Violet Pauldron/Core Mid
    [186, 114, 246],  # 16: Luminous Soul-Violet Glow
    [216, 38, 78],    # 17: Blood-Crimson Eye & Scythe Glow
    [252, 88, 128],   # 18: Blazing Rose-Crimson Soulfire
    [255, 224, 238],  # 19: White-Hot Soul Core
], dtype=np.int32)

C_OUT = (8, 8, 14, 255)
C_IRON_DARK = (28, 30, 46, 255)
C_IRON_MID = (68, 74, 106, 255)
C_IRON_SPEC = (142, 150, 188, 255)
C_VIO_DARK = (76, 36, 118, 255)
C_VIO_MID = (126, 62, 186, 255)
C_VIO_LIT = (186, 114, 246, 255)
C_CRIM = (216, 38, 78, 255)
C_ROSE = (252, 88, 128, 255)
C_CORE = (255, 224, 238, 255)

PIVOTS = dict(
    pelvis=(258.0, 268.0), neck=(264.0, 124.0),
    l_sh=(202.0, 134.0), l_elb=(176.0, 200.0), l_hand=(96.0, 202.0),
    r_sh=(316.0, 140.0), r_elb=(334.0, 204.0), r_hand=(406.0, 210.0),
    l_hip=(218.0, 286.0), l_knee=(178.0, 366.0), l_ank=(148.0, 448.0),
    r_hip=(300.0, 286.0), r_knee=(332.0, 364.0), r_ank=(344.0, 444.0),
)

PALETTE_CFG = dict(
    palette=MASTER_PALETTE,
    protect_indices=(15, 16, 17, 18, 19),
    hair_indices=(7, 8, 9, 10),
    lit_selout=1,
    shad_selout=0,
    hair_selout=7,
    joint_fill=(22, 22, 36, 255),
    joint_inner=(36, 38, 58, 255),
    hip_r=22,
    thigh_r=17,
    arm_r=15,
    pinhole_fill=(28, 30, 46, 255),
)


def load_and_segment_512():
    arr = clean_base_512(BASE_IMG_PATH)
    H, W = 512, 512
    trim_rag = poly_mask(H, W, P([(458, 632), (586, 632), (586, 845), (458, 845)]))
    arr[trim_rag] = [0, 0, 0, 0]
    a = keep_largest_component(arr[:, :, 3] > 0)
    arr[~a] = [0, 0, 0, 0]

    m_head = poly_mask(H, W, P([
        (370, 2), (655, 2), (655, 160), (610, 275), (535, 295), (440, 265), (425, 165), (370, 155)
    ])) & a
    m_l_sode = poly_mask(H, W, P([
        (280, 125), (458, 185), (458, 325), (395, 425), (280, 365)
    ])) & a & (~m_head)
    m_l_forearm = poly_mask(H, W, P([
        (115, 320), (395, 365), (380, 492), (115, 492)
    ])) & a & (~m_l_sode)
    m_r_sode = poly_mask(H, W, P([
        (602, 165), (715, 165), (715, 365), (620, 420), (595, 320)
    ])) & a & (~m_head)
    m_r_forearm = poly_mask(H, W, P([
        (625, 345), (890, 345), (890, 502), (625, 502)
    ])) & a & (~m_r_sode)
    m_torso = poly_mask(H, W, P([
        (395, 245), (625, 245), (625, 510), (588, 635), (458, 635), (395, 510)
    ])) & a & (~m_head) & (~m_l_sode) & (~m_l_forearm) & (~m_r_sode) & (~m_r_forearm)
    m_l_coat = poly_mask(H, W, P([
        (285, 465), (465, 485), (462, 620), (355, 695), (285, 695)
    ])) & a & (~m_torso)
    m_r_coat = poly_mask(H, W, P([
        (582, 485), (712, 485), (712, 672), (645, 655), (582, 600)
    ])) & a & (~m_torso)
    m_l_foot = poly_mask(H, W, P([(190, 880), (340, 880), (340, 1018), (190, 1018)])) & a
    m_l_shin = poly_mask(H, W, P([(228, 660), (418, 660), (398, 895), (228, 895)])) & a & (~m_l_foot) & (~m_l_coat)
    m_l_thigh = poly_mask(H, W, P([(315, 560), (475, 560), (475, 775), (315, 775)])) & a & (~m_torso) & (~m_l_coat) & (~m_l_shin) & (~m_l_foot)
    m_r_foot = poly_mask(H, W, P([(635, 870), (825, 870), (825, 1018), (635, 1018)])) & a
    m_r_shin = poly_mask(H, W, P([(605, 655), (742, 655), (742, 885), (615, 885)])) & a & (~m_r_foot) & (~m_r_coat)
    m_r_thigh = poly_mask(H, W, P([(570, 560), (712, 560), (712, 765), (570, 765)])) & a & (~m_torso) & (~m_r_coat) & (~m_r_shin) & (~m_r_foot)
    masks = assign_remaining_geodesic(a, [
        ("head", m_head), ("torso", m_torso), ("l_coat", m_l_coat), ("r_coat", m_r_coat),
        ("l_sode", m_l_sode), ("l_forearm", m_l_forearm),
        ("r_sode", m_r_sode), ("r_forearm", m_r_forearm),
        ("l_thigh", m_l_thigh), ("l_shin", m_l_shin), ("l_foot", m_l_foot),
        ("r_thigh", m_r_thigh), ("r_shin", m_r_shin), ("r_foot", m_r_foot),
    ])
    return extract_parts_512(arr, masks)


def draw_necro_halo_104(arr, nx, ny, ph):
    cx, cy = nx - 1.0, ny - 6.0
    for k in range(28):
        ang = (k / 28.0) * 2.0 * math.pi + ph * 0.5
        rx = cx + math.cos(ang) * 14.5
        ry = cy + math.sin(ang) * 11.5
        put_px(arr, rx, ry, C_VIO_LIT if k % 4 == 0 else C_VIO_DARK)
    for k in range(6):
        ang = ph + k * (math.pi / 3.0)
        sx = cx + math.cos(ang) * 17.0
        sy = cy + math.sin(ang) * 13.5
        put_px(arr, sx, sy, C_ROSE if k % 2 == 0 else C_VIO_LIT)


def draw_great_scythe_104(arr, hx, hy, shaft_deg, shaft_len=24.0, hook_sign=1.0, glow=1.0):
    rad = math.radians(shaft_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy * hook_sign, ux * hook_sign

    bx, by = hx - ux * 12.0, hy - uy * 12.0
    tx, ty = hx + ux * shaft_len, hy + uy * shaft_len
    draw_line_104(arr, bx, by, tx, ty, C_IRON_DARK, 2)
    draw_line_104(arr, bx + nx * 0.7, by + ny * 0.7, tx + nx * 0.7, ty + ny * 0.7, C_IRON_MID, 1)
    put_px(arr, bx, by, C_VIO_LIT)

    # Skull-socket collar at scythe head
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            put_px(arr, tx + dx, ty + dy, C_VIO_LIT if (dx == 0 and dy == 0) else C_IRON_SPEC)

    # Massive curved Crescent Abyssal Scythe Blade sweeping perpendicular/inward from tip
    blade_span = 21.0
    for i in range(48):
        u = i / 47.0
        curve = (u ** 1.65) * 8.5
        px = tx + nx * (u * blade_span) - ux * curve
        py = ty + ny * (u * blade_span) - uy * curve
        w = max(0.8, 2.5 * (1.0 - 0.75 * u))
        put_px(arr, px + ux * w, py + uy * w, C_IRON_SPEC)
        put_px(arr, px, py, C_VIO_MID if glow <= 0.4 else C_VIO_LIT)
        put_px(arr, px - ux * (w * 0.8), py - uy * (w * 0.8), C_CORE if (glow > 0.7 and i % 5 == 0) else C_ROSE)


def extra_extents(joints_c, cfg, scale):
    pts = []
    if cfg.get("show_weapon", True) and not cfg.get("planted_weapon", False):
        rh = joints_c["r_hand"]
        rad = math.radians(cfg.get("weapon_deg", -38.0))
        ux, uy = math.cos(rad), math.sin(rad)
        hs = cfg.get("hook_sign", 1.0)
        nx, ny = -uy * hs, ux * hs
        slen = cfg.get("weapon_len", 24.0)
        tx = rh[0] + ux * (slen / scale)
        ty = rh[1] + uy * (slen / scale)
        pts.append((tx, ty))
        pts.append((rh[0] - ux * (14.0 / scale), rh[1] - uy * (14.0 / scale)))
        pts.append((tx + nx * (23.0 / scale) - ux * (9.0 / scale), ty + ny * (23.0 / scale) - uy * (9.0 / scale)))
    return pts


def draw_back(bg104, joints104, cfg):
    if cfg.get("halo_active", True):
        nk = joints104["neck"]
        draw_necro_halo_104(bg104, nk[0], nk[1], cfg.get("mane_wave_phase", 0.0))


def draw_front(out, joints104, cfg):
    ph = cfg.get("mane_wave_phase", 0.0)
    if cfg.get("planted_weapon", False):
        draw_great_scythe_104(
            out, cfg.get("plant_x", 78.0), cfg.get("plant_y", 72.0),
            shaft_deg=-90.0, shaft_len=21.0, hook_sign=-1.0, glow=cfg.get("weapon_glow", 0.4),
        )
    elif cfg.get("show_weapon", True):
        rh = joints104["r_hand"]
        draw_great_scythe_104(
            out, rh[0], rh[1],
            shaft_deg=cfg.get("weapon_deg", -38.0),
            shaft_len=cfg.get("weapon_len", 24.0),
            hook_sign=cfg.get("hook_sign", 1.0),
            glow=cfg.get("weapon_glow", 1.0),
        )

    if cfg.get("chain_active", False):
        lh = joints104["l_hand"]
        for k in range(14):
            u = k / 13.0
            cx = min(96.0, lh[0] + u * 34.0)
            cy = lh[1] + math.sin(u * math.pi * 2.0 + ph) * 2.2
            put_px(out, cx, cy, C_VIO_LIT if k % 2 == 0 else C_IRON_SPEC)
            if k == 13:
                put_px(out, cx + 1, cy - 1, C_ROSE)
                put_px(out, cx + 1, cy + 1, C_ROSE)

    if cfg.get("slash_arc") is not None:
        sa = cfg["slash_arc"]
        nk = joints104["neck"]
        draw_slash_arc_104(
            out, nk[0] + sa.get("dx", 8.0), nk[1] + sa.get("dy", 10.0),
            sa.get("r", 29.0), sa["a0"], sa["a1"],
            C_CORE, C_ROSE, C_VIO_MID, intensity=sa.get("intensity", 1.0),
        )


DEFAULTS = dict(
    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=3.0, head_rel_deg=-1.0,
    l_thigh_deg=-2.0, l_shin_deg=2.0, l_foot_deg=0.0,
    r_thigh_deg=2.0, r_shin_deg=-2.0, r_foot_deg=0.0,
    l_sode_rel_deg=18.0, l_fore_rel_deg=12.0, r_sode_rel_deg=12.0, r_fore_rel_deg=-8.0,
    l_coat_rel_deg=0.0, r_coat_rel_deg=0.0,
    weapon_deg=-42.0, weapon_len=23.0, weapon_glow=1.0, foot_y=99.0,
    show_weapon=True, halo_active=True, right_arm_in_front=False, right_leg_behind=False,
    hook_sign=1.0,
)


def render_frame(parts, cfg):
    return render_rig_104(
        parts, PIVOTS, cfg, PALETTE_CFG,
        y_bot_base=492.0, default_S=604,
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
                pelvis_dx=s * 3.0, pelvis_dy=b * 8.0, torso_deg=3.0 + b * 2.0,
                head_rel_deg=-1.0 - b * 1.5, mane_wave_phase=ph,
                l_sode_rel_deg=20.0 + b * 4.0, r_sode_rel_deg=10.0 + b * 4.0,
                weapon_deg=-44.0 + b * 3.5,
            )
            cfgs.append(cfg)

        elif row_idx == 1:
            st = math.sin(ph)
            kl = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dy=abs(st) * 18.0, torso_deg=8.0 + abs(st) * 2.0, head_rel_deg=-4.0,
                mane_wave_phase=ph * 2.0, right_leg_behind=(f >= 15),
                l_thigh_deg=st * 25.0, l_shin_deg=max(0.0, st * 26.0) + max(0.0, kl * 14.0), l_foot_deg=st * 12.0,
                r_thigh_deg=-st * 25.0, r_shin_deg=max(0.0, -st * 26.0) + max(0.0, -kl * 14.0), r_foot_deg=-st * 12.0,
                l_sode_rel_deg=18.0 - st * 18.0, r_sode_rel_deg=10.0 + st * 14.0,
                weapon_deg=-38.0 + st * 8.0,
            )
            cfgs.append(cfg)

        elif row_idx == 2:
            # Row 2: AUTO_ATTACK (Scythe Rear Coil -> Sweeping Inward Reap -> Cross-Reap -> Recovery)
            kfs = [
                (0, dict(torso_deg=3.0, weapon_deg=-44.0)),
                (7, dict(pelvis_dx=-12.0, pelvis_dy=36.0, torso_deg=-14.0, head_rel_deg=8.0,
                         l_thigh_deg=-18.0, l_shin_deg=16.0, r_thigh_deg=18.0, r_shin_deg=-12.0,
                         l_sode_rel_deg=36.0, r_sode_rel_deg=-68.0, weapon_deg=-108.0, right_arm_in_front=True)),
                (14, dict(pelvis_dx=14.0, pelvis_dy=48.0, torso_deg=24.0, head_rel_deg=-12.0,
                          l_thigh_deg=22.0, l_shin_deg=16.0, r_thigh_deg=-24.0, r_shin_deg=18.0,
                          l_sode_rel_deg=-22.0, r_sode_rel_deg=38.0, weapon_deg=22.0, right_arm_in_front=True)),
                (21, dict(pelvis_dx=8.0, pelvis_dy=40.0, torso_deg=14.0,
                          l_sode_rel_deg=10.0, r_sode_rel_deg=-18.0, weapon_deg=-22.0, right_arm_in_front=True)),
                (29, dict(torso_deg=3.0, weapon_deg=-44.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, extra_meta_keys=("hook_sign",), wave_mult=2.0)
            if 9 <= f <= 16:
                u = (f - 9) / 7.0
                cfg["slash_arc"] = dict(r=29.0, a0=-78.0 + 22.0 * u, a1=48.0 + 16.0 * u, intensity=1.2)
            cfgs.append(cfg)

        elif row_idx == 3:
            # Row 3: SKILL (Spectral Chain Cast & Drag F02..F11 -> Execution Scythe Cleave F12..F22!)
            kfs = [
                (0, dict(torso_deg=3.0, weapon_deg=-44.0)),
                (5, dict(pelvis_dx=10.0, pelvis_dy=36.0, torso_deg=16.0,
                         l_sode_rel_deg=82.0, l_fore_rel_deg=12.0, r_sode_rel_deg=-52.0,
                         weapon_deg=-96.0, chain_active=True)),
                (11, dict(pelvis_dx=-8.0, pelvis_dy=42.0, torso_deg=-10.0,
                          l_sode_rel_deg=48.0, r_sode_rel_deg=-84.0,
                          weapon_deg=-118.0, chain_active=True, right_arm_in_front=True)),
                (17, dict(pelvis_dx=16.0, pelvis_dy=56.0, torso_deg=26.0, head_rel_deg=-14.0,
                          l_thigh_deg=-24.0, l_shin_deg=24.0, r_thigh_deg=24.0, r_shin_deg=-18.0,
                          l_sode_rel_deg=-14.0, r_sode_rel_deg=42.0,
                          weapon_deg=28.0, chain_active=False, right_arm_in_front=True)),
                (29, dict(torso_deg=3.0, weapon_deg=-44.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, extra_meta_keys=("chain_active", "hook_sign"), wave_mult=2.5)
            if 13 <= f <= 20:
                cfg["slash_arc"] = dict(r=31.0, a0=-88.0, a1=54.0, intensity=1.25)
            cfgs.append(cfg)

        elif row_idx == 4:
            # Row 4: ULTIMATE (Grim Harvest — Grounded Necrotic Awakening -> Phantom Reaps -> Blood-Moon Guillotine!)
            kfs = [
                (0, dict(pelvis_dy=44.0, torso_deg=-8.0, weapon_deg=-64.0, foot_y=99.0)),
                (5, dict(pelvis_dy=52.0, torso_deg=-14.0, l_sode_rel_deg=54.0, r_sode_rel_deg=-86.0,
                         weapon_deg=-112.0, foot_y=99.0, right_arm_in_front=True)),
                (11, dict(pelvis_dx=14.0, pelvis_dy=36.0, torso_deg=24.0, r_sode_rel_deg=36.0,
                          weapon_deg=18.0, foot_y=96.0, right_arm_in_front=True)),
                (16, dict(pelvis_dx=-6.0, pelvis_dy=18.0, torso_deg=-16.0, r_sode_rel_deg=-98.0,
                          weapon_deg=-124.0, foot_y=93.0, right_arm_in_front=True)),
                (22, dict(pelvis_dx=18.0, pelvis_dy=64.0, torso_deg=28.0, head_rel_deg=-14.0,
                          l_thigh_deg=-26.0, l_shin_deg=28.0, r_thigh_deg=26.0, r_shin_deg=-20.0,
                          r_sode_rel_deg=44.0, weapon_deg=32.0, foot_y=99.0, right_arm_in_front=True)),
                (29, dict(torso_deg=3.0, weapon_deg=-44.0, foot_y=99.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.5)
            if 8 <= f <= 12 or 18 <= f <= 25:
                cfg["slash_arc"] = dict(r=31.0, a0=-96.0, a1=56.0, intensity=1.3)
            cfgs.append(cfg)

        elif row_idx == 5:
            kfs = make_prone_knight_death_kfs(idle_weapon_deg=-44.0, plant_x=78.0, plant_y=72.0, use_planted_weapon=True)
            cfgs.append(eval_pose_keyframes(f, kfs, ph, DEFAULTS, extra_meta_keys=("plant_x", "plant_y"), wave_mult=1.0))

        elif row_idx == 6:
            # Row 6: DASH (Abyssal Wraith Rush!)
            kfs = [
                (0, dict(torso_deg=6.0, weapon_deg=-40.0, foot_y=99.0)),
                (7, dict(pelvis_dx=12.0, pelvis_dy=30.0, torso_deg=26.0, head_rel_deg=-12.0,
                         l_thigh_deg=28.0, l_shin_deg=34.0, r_thigh_deg=-18.0, r_shin_deg=26.0,
                         l_sode_rel_deg=56.0, r_sode_rel_deg=-42.0, weapon_deg=-148.0, foot_y=96.0)),
                (22, dict(pelvis_dx=12.0, pelvis_dy=30.0, torso_deg=26.0, head_rel_deg=-12.0,
                          l_thigh_deg=28.0, l_shin_deg=34.0, r_thigh_deg=-18.0, r_shin_deg=26.0,
                          l_sode_rel_deg=56.0, r_sode_rel_deg=-42.0, weapon_deg=-148.0, foot_y=96.0)),
                (29, dict(torso_deg=6.0, weapon_deg=-40.0, foot_y=99.0)),
            ]
            cfgs.append(eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0))

        elif row_idx == 7:
            # Row 7: CROUCH (Grave-Submerge Crouch F00..F11 -> Rising Scythe Uppercut Eruption F12..F22!)
            kfs = [
                (0, dict(torso_deg=3.0, weapon_deg=-44.0)),
                (8, dict(pelvis_dx=-6.0, pelvis_dy=92.0, torso_deg=18.0,
                         l_thigh_deg=-36.0, l_shin_deg=38.0, r_thigh_deg=34.0, r_shin_deg=-28.0,
                         r_sode_rel_deg=28.0, weapon_deg=34.0, right_arm_in_front=True)),
                (12, dict(pelvis_dx=-4.0, pelvis_dy=86.0, torso_deg=14.0,
                          l_thigh_deg=-34.0, l_shin_deg=36.0, r_thigh_deg=32.0, r_shin_deg=-26.0,
                          r_sode_rel_deg=32.0, weapon_deg=42.0, right_arm_in_front=True)),
                (18, dict(pelvis_dx=12.0, pelvis_dy=18.0, torso_deg=-10.0, head_rel_deg=-8.0,
                          l_thigh_deg=18.0, l_shin_deg=16.0, r_thigh_deg=-20.0, r_shin_deg=16.0,
                          l_sode_rel_deg=64.0, r_sode_rel_deg=-78.0, weapon_deg=-68.0, right_arm_in_front=True)),
                (29, dict(torso_deg=3.0, weapon_deg=-44.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if 13 <= f <= 20:
                cfg["slash_arc"] = dict(r=30.0, a0=65.0, a1=-75.0, intensity=1.25)
            cfgs.append(cfg)

        elif row_idx == 8:
            # Row 8: JUMP (Wraith Glide + Executioner Guillotine Drop!)
            kfs = [
                (0, dict(torso_deg=3.0, weapon_deg=-44.0, foot_y=99.0)),
                (12, dict(pelvis_dx=6.0, pelvis_dy=16.0, torso_deg=-12.0,
                          l_thigh_deg=24.0, l_shin_deg=36.0, r_thigh_deg=-12.0, r_shin_deg=28.0,
                          r_sode_rel_deg=-94.0, weapon_deg=-118.0, foot_y=94.0, right_arm_in_front=True)),
                (19, dict(pelvis_dx=14.0, pelvis_dy=48.0, torso_deg=26.0,
                          l_thigh_deg=-22.0, l_shin_deg=24.0, r_thigh_deg=22.0, r_shin_deg=-18.0,
                          r_sode_rel_deg=40.0, weapon_deg=30.0, foot_y=99.0, right_arm_in_front=True)),
                (29, dict(torso_deg=3.0, weapon_deg=-44.0, foot_y=99.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.0)
            if 15 <= f <= 21:
                cfg["slash_arc"] = dict(r=30.0, a0=-92.0, a1=52.0, intensity=1.25)
            cfgs.append(cfg)

    return cfgs


def main():
    parts = load_and_segment_512()
    picks = [
        (0, 0, "R0 DREADLORD GUARD"),
        (1, 4, "R1 NECROPOLIS STALK"),
        (2, 13, "R2 SCYTHE REAP"),
        (3, 6, "R3 SPECTRAL CHAIN"),
        (4, 21, "R4 GRIM GUILLOTINE"),
        (5, 12, "R5 KNEE SCYTHE PLANT"),
        (5, 25, "R5 PRONE COLLAPSE"),
        (7, 16, "R7 GRAVE ERUPTION"),
    ]
    build_and_save_30fps_sheet(
        "reaper", parts, build_row_configs, render_frame,
        OUT_SHEET_PATH, VFX_SHEET_PATH, ARTIFACT_DIR,
        shimmer_cols=(C_ROSE, C_VIO_LIT), showcase_picks=picks,
    )


if __name__ == "__main__":
    main()
