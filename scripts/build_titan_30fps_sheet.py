#!/usr/bin/env python3
"""
Builds Torgar (Titan — Runic World-Forge Juggernaut) 30fps HD-2D Sprite Sheet
(6240x1872, 30 cols x 9 rows of 208x208) using titan_v2_base.jpg + hd2d_rig_core.
"""

import os
import math
import numpy as np
from hd2d_rig_core import (
    COLS, P, poly_mask, clean_base_512, assign_remaining_geodesic, extract_parts_512,
    put_px, draw_line_104, render_rig_104, eval_pose_keyframes,
    make_prone_knight_death_kfs, build_and_save_30fps_sheet,
)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BASE_IMG_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "titan_v2_base.jpg")
OUT_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "titan_sheet.png")
VFX_SHEET_PATH = os.path.join(ROOT_DIR, "assets", "sprites", "titan_vfx.png")
ARTIFACT_DIR = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/3a4b2cf8-05c2-45a3-bb65-af6f5b5a1088"

# Strict 20-Color Hand-Crafted Runic World-Forge Juggernaut Master Palette
MASTER_PALETTE = np.array([
    [10, 12, 16],     # 0: Basalt Pitch-Outline
    [22, 26, 30],     # 1: Forge-Iron Selout
    [38, 44, 54],     # 2: Horned Iron Helm & Boot Deep Shadow
    [62, 72, 86],     # 3: Forged Iron Helm & Greave Base
    [94, 108, 126],   # 4: Lit Horn & Steel Plate Midtone
    [142, 158, 176],  # 5: Specular Steel Horn Highlight
    [28, 58, 42],     # 6: Runic Forge-Jade Cuirass Shadow
    [46, 92, 62],     # 7: World-Forge Jade Armor Base
    [72, 134, 84],    # 8: Lit Runic Jade Plate Midtone
    [118, 182, 114],  # 9: Jade Filigree Rim Highlight
    [108, 38, 18],    # 10: Braided Copper Beard Shadow
    [164, 62, 24],    # 11: Fiery Dwarven Copper Beard Base
    [218, 96, 32],    # 12: Blazing Orange-Copper Braid Mid
    [248, 142, 48],   # 13: Molten Amber Beard & Forge Glow
    [108, 72, 26],    # 14: Heavy Bronze Pauldron Shadow
    [168, 118, 38],   # 15: Burnished Colossal Bronze Pauldron
    [228, 176, 58],   # 16: Sunlit Forge-Gold Trim
    [52, 232, 152],   # 17: Luminous World-Forge Jade Rune
    [252, 214, 86],   # 18: Molten Magma-Gold Core
    [255, 250, 218],  # 19: White-Hot Forge Heart
], dtype=np.int32)

C_OUT = (10, 12, 16, 255)
C_IRON_DARK = (38, 44, 54, 255)
C_IRON_MID = (62, 72, 86, 255)
C_BRONZE = (168, 118, 38, 255)
C_GOLD = (228, 176, 58, 255)
C_JADE = (52, 232, 152, 255)
C_MAGMA = (252, 214, 86, 255)
C_CORE = (255, 250, 218, 255)

PIVOTS = dict(
    pelvis=(266.0, 286.0), neck=(260.0, 114.0), mane=(262.0, 126.0),
    l_sh=(166.0, 146.0), l_elb=(132.0, 222.0), l_hand=(74.0, 280.0),
    r_sh=(346.0, 152.0), r_elb=(374.0, 228.0), r_hand=(432.0, 284.0),
    l_hip=(204.0, 294.0), l_knee=(172.0, 368.0), l_ank=(162.0, 434.0),
    r_hip=(326.0, 294.0), r_knee=(348.0, 366.0), r_ank=(352.0, 432.0),
)

PALETTE_CFG = dict(
    palette=MASTER_PALETTE,
    protect_indices=(13, 16, 17, 18, 19),
    hair_indices=(10, 11, 12, 13),
    lit_selout=1,
    shad_selout=0,
    hair_selout=10,
    joint_fill=(28, 52, 40, 255),
    joint_inner=(44, 78, 56, 255),
    hip_r=26,
    thigh_r=22,
    arm_r=18,
    pinhole_fill=(46, 92, 62, 255),
)


def load_and_segment_512():
    arr = clean_base_512(BASE_IMG_PATH)
    H, W = 512, 512
    a = arr[:, :, 3] > 0

    m_head = poly_mask(H, W, P([
        (350, 35), (655, 35), (655, 195), (595, 255), (445, 265), (405, 200), (350, 175)
    ])) & a
    m_mane = poly_mask(H, W, P([
        (428, 228), (618, 228), (668, 395), (625, 530), (555, 530), (542, 435), (465, 445), (425, 345)
    ])) & a & (~m_head)
    m_l_sode = poly_mask(H, W, P([
        (155, 165), (422, 165), (422, 345), (362, 475), (185, 425), (155, 345)
    ])) & a & (~m_head) & (~m_mane)
    m_l_forearm = poly_mask(H, W, P([
        (20, 395), (368, 425), (355, 652), (20, 652)
    ])) & a & (~m_l_sode)
    m_r_sode = poly_mask(H, W, P([
        (605, 178), (785, 178), (785, 425), (665, 495), (640, 365)
    ])) & a & (~m_head) & (~m_mane)
    m_r_forearm = poly_mask(H, W, P([
        (652, 415), (985, 415), (985, 648), (652, 648)
    ])) & a & (~m_r_sode)

    # Raised side belt split to y=585 so l_thigh and r_thigh capture both stocky leg plates cleanly!
    m_torso_poly = poly_mask(H, W, P([
        (260, 250), (745, 250), (745, 585), (628, 585), (625, 745), (455, 745), (452, 585), (260, 585)
    ]))
    m_torso = m_torso_poly & a & (~m_head) & (~m_l_sode) & (~m_l_forearm) & (~m_r_sode) & (~m_r_forearm) & (~m_mane)
    m_l_foot = poly_mask(H, W, P([(185, 845), (420, 845), (420, 1018), (185, 1018)])) & a
    m_l_shin = poly_mask(H, W, P([(238, 695), (438, 695), (420, 865), (238, 865)])) & a & (~m_l_foot)
    m_l_thigh = poly_mask(H, W, P([(255, 575), (465, 575), (465, 765), (255, 765)])) & a & (~m_torso) & (~m_l_shin) & (~m_l_foot)
    m_r_foot = poly_mask(H, W, P([(610, 840), (850, 840), (850, 1018), (610, 1018)])) & a
    m_r_shin = poly_mask(H, W, P([(592, 690), (792, 690), (792, 858), (602, 858)])) & a & (~m_r_foot)
    m_r_thigh = poly_mask(H, W, P([(585, 575), (762, 575), (762, 760), (585, 760)])) & a & (~m_torso) & (~m_r_shin) & (~m_r_foot)

    masks = assign_remaining_geodesic(a, [
        ("mane", m_mane), ("head", m_head), ("torso", m_torso),
        ("l_sode", m_l_sode), ("l_forearm", m_l_forearm),
        ("r_sode", m_r_sode), ("r_forearm", m_r_forearm),
        ("l_thigh", m_l_thigh), ("l_shin", m_l_shin), ("l_foot", m_l_foot),
        ("r_thigh", m_r_thigh), ("r_shin", m_r_shin), ("r_foot", m_r_foot),
    ])

    # Inpaint solid Forge-Jade & Bronze chestplate behind Torgar's swinging braided beard so torso has ZERO hole!
    torso_arr = arr.copy()
    under_beard = m_mane & poly_mask(H, W, P([(420, 250), (635, 250), (635, 535), (420, 535)]))
    torso_arr[under_beard] = [46, 92, 62, 255]
    masks_with_solid_torso = []
    for nm, m in masks:
        if nm == "torso":
            masks_with_solid_torso.append((nm, m | under_beard))
        else:
            masks_with_solid_torso.append((nm, m))

    return extract_parts_512(arr, masks_with_solid_torso, custom_part_arrays={"torso": torso_arr})


def draw_forge_anvil_back_104(arr, nx, ny):
    cx, cy = nx - 6.0, ny - 1.0
    for dy in range(-5, 6):
        hw = 7 if dy < -1 else 5
        for dx in range(-hw, hw + 1):
            edge = (abs(dx) == hw) or (dy == -5) or (dy == 5)
            rune = abs(dx) + abs(dy) <= 2
            col = C_GOLD if edge else (C_JADE if rune else C_IRON_DARK)
            put_px(arr, cx + dx, cy + dy, col)


def draw_worldbreaker_maul_104(arr, hx, hy, maul_deg, shaft_len=19.0, glow=1.0):
    rad = math.radians(maul_deg)
    ux, uy = math.cos(rad), math.sin(rad)
    nx, ny = -uy, ux

    bx, by = hx - ux * 6.0, hy - uy * 6.0
    tx, ty = hx + ux * shaft_len, hy + uy * shaft_len
    draw_line_104(arr, bx, by, tx, ty, C_IRON_DARK, 2)
    draw_line_104(arr, bx, by, tx, ty, C_BRONZE, 1)
    put_px(arr, bx, by, C_GOLD)

    # Heavy Chamfered Runic World-Breaker Anvil Hammerhead
    for da in np.linspace(-3.5, 4.5, 11):
        for dp in np.linspace(-6.5, 6.5, 15):
            if abs(da) > 3.0 and abs(dp) > 5.2:
                continue
            px = tx + ux * da + nx * dp
            py = ty + uy * da + ny * dp
            border = (abs(da) > 2.8) or (abs(dp) > 5.4)
            rune = (abs(da - 0.5) + abs(dp)) <= 2.6
            if rune and glow > 0.35:
                col = C_CORE if (abs(da - 0.5) + abs(dp) < 1.1) else C_JADE
            elif border:
                col = C_MAGMA if dp > 4.5 else C_GOLD
            else:
                col = C_IRON_MID if dp < 0 else C_IRON_DARK
            put_px(arr, px, py, col)


def extra_extents(joints_c, cfg, scale):
    pts = []
    if cfg.get("show_weapon", True) and not cfg.get("resting_weapon", False):
        rh = joints_c["r_hand"]
        rad = math.radians(cfg.get("weapon_deg", -45.0))
        slen = cfg.get("weapon_len", 19.0)
        pts.append((rh[0] + math.cos(rad) * ((slen + 8.0) / scale), rh[1] + math.sin(rad) * ((slen + 8.0) / scale)))
    return pts


def draw_back(bg104, joints104, cfg):
    if cfg.get("halo_active", True):
        nk = joints104["neck"]
        draw_forge_anvil_back_104(bg104, nk[0], nk[1])


def draw_front(out, joints104, cfg):
    if cfg.get("resting_weapon", False):
        draw_worldbreaker_maul_104(out, 66.0, 93.0, maul_deg=4.0, shaft_len=16.0, glow=0.35)
        return

    if cfg.get("show_weapon", True):
        rh = joints104["r_hand"]
        draw_worldbreaker_maul_104(
            out, rh[0], rh[1],
            maul_deg=cfg.get("weapon_deg", -48.0),
            shaft_len=cfg.get("weapon_len", 19.0),
            glow=cfg.get("weapon_glow", 1.0),
        )

    if cfg.get("shield_active", False):
        nk = joints104["neck"]
        ph = cfg.get("mane_wave_phase", 0.0)
        for k in range(6):
            a = ph + k * (math.pi / 3.0)
            rx = nk[0] + 8.0 + math.cos(a) * 16.0
            ry = nk[1] + 18.0 + math.sin(a) * 12.0
            put_px(out, rx, ry, C_MAGMA if k % 2 == 0 else C_JADE)


DEFAULTS = dict(
    pelvis_dx=0.0, pelvis_dy=0.0, torso_deg=2.0, head_rel_deg=-1.0, mane_rel_deg=0.0,
    mane_wave_amp=2.5, mane_in_front=True,
    l_thigh_deg=-2.0, l_shin_deg=2.0, l_foot_deg=0.0,
    r_thigh_deg=2.0, r_shin_deg=-2.0, r_foot_deg=0.0,
    l_sode_rel_deg=-6.0, l_fore_rel_deg=-10.0, r_sode_rel_deg=-12.0, r_fore_rel_deg=-14.0,
    weapon_deg=-52.0, weapon_len=18.0, weapon_glow=1.0, foot_y=99.0,
    show_weapon=True, halo_active=True, right_arm_in_front=False, right_leg_behind=False,
)


def render_frame(parts, cfg):
    return render_rig_104(
        parts, PIVOTS, cfg, PALETTE_CFG,
        y_bot_base=480.0, default_S=608,
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
                pelvis_dx=s * 2.5, pelvis_dy=b * 8.0, torso_deg=2.0 + b * 1.8,
                head_rel_deg=-1.0 - b * 1.0, mane_rel_deg=s * 2.5,
                mane_wave_phase=ph, weapon_deg=-52.0 + b * 3.0,
            )
            cfgs.append(cfg)

        elif row_idx == 1:
            st = math.sin(ph)
            kl = math.cos(ph)
            cfg = dict(DEFAULTS)
            cfg.update(
                pelvis_dy=abs(st) * 18.0, torso_deg=7.0 + abs(st) * 2.5, head_rel_deg=-3.0,
                mane_rel_deg=-abs(st) * 4.0, mane_wave_phase=ph * 2.0, mane_wave_amp=3.5,
                right_leg_behind=(f >= 15),
                l_thigh_deg=st * 22.0, l_shin_deg=max(0.0, st * 22.0) + max(0.0, kl * 12.0), l_foot_deg=st * 10.0,
                r_thigh_deg=-st * 22.0, r_shin_deg=max(0.0, -st * 22.0) + max(0.0, -kl * 12.0), r_foot_deg=-st * 10.0,
                l_sode_rel_deg=-st * 18.0, r_sode_rel_deg=st * 16.0 - 10.0,
                weapon_deg=-46.0 + st * 8.0,
            )
            cfgs.append(cfg)

        elif row_idx == 2:
            # Row 2: AUTO_ATTACK (Synced to Titan.js drawGrowingWorldBreakerHammer F04..F17!)
            kfs = [
                (0, dict(torso_deg=2.0, weapon_deg=-52.0, show_weapon=True)),
                (5, dict(pelvis_dx=-10.0, pelvis_dy=30.0, torso_deg=-14.0, head_rel_deg=8.0,
                         l_sode_rel_deg=-72.0, r_sode_rel_deg=-96.0, weapon_deg=-115.0,
                         show_weapon=False, right_arm_in_front=True)),
                (11, dict(pelvis_dx=16.0, pelvis_dy=54.0, torso_deg=24.0, head_rel_deg=-10.0,
                          l_thigh_deg=-20.0, l_shin_deg=20.0, r_thigh_deg=20.0, r_shin_deg=-16.0,
                          l_sode_rel_deg=28.0, r_sode_rel_deg=34.0, weapon_deg=22.0,
                          show_weapon=False, right_arm_in_front=True)),
                (18, dict(pelvis_dx=10.0, pelvis_dy=36.0, torso_deg=14.0,
                          r_sode_rel_deg=12.0, weapon_deg=8.0, show_weapon=True, right_arm_in_front=True)),
                (29, dict(torso_deg=2.0, weapon_deg=-52.0, show_weapon=True)),
            ]
            cfgs.append(eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.0))

        elif row_idx == 3:
            # Row 3: SKILL (Anvil Stomp F04..F07 -> Cannonball Smash Swing F11..F19!)
            kfs = [
                (0, dict(torso_deg=2.0, weapon_deg=-52.0, show_weapon=True)),
                (5, dict(pelvis_dy=44.0, torso_deg=12.0, l_thigh_deg=-22.0, l_shin_deg=24.0,
                         r_thigh_deg=28.0, r_shin_deg=-20.0, r_sode_rel_deg=-78.0, show_weapon=True)),
                (9, dict(pelvis_dx=-12.0, pelvis_dy=34.0, torso_deg=-16.0,
                         l_sode_rel_deg=-64.0, r_sode_rel_deg=-98.0, show_weapon=False, right_arm_in_front=True)),
                (15, dict(pelvis_dx=18.0, pelvis_dy=52.0, torso_deg=26.0,
                          l_sode_rel_deg=32.0, r_sode_rel_deg=38.0, show_weapon=False, right_arm_in_front=True)),
                (21, dict(pelvis_dx=8.0, pelvis_dy=32.0, torso_deg=12.0,
                          r_sode_rel_deg=6.0, weapon_deg=-12.0, show_weapon=True, right_arm_in_front=True)),
                (29, dict(torso_deg=2.0, weapon_deg=-52.0, show_weapon=True)),
            ]
            cfgs.append(eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5))

        elif row_idx == 4:
            # Row 4: ULTIMATE (World-Forge Ragnarok — 3 Rhythmic Advancing Slams F08, F16, F23!)
            kfs = [
                (0, dict(pelvis_dy=38.0, torso_deg=-8.0, weapon_deg=-72.0, show_weapon=True, foot_y=99.0)),
                (5, dict(pelvis_dx=-8.0, pelvis_dy=28.0, torso_deg=-16.0, l_sode_rel_deg=-78.0, r_sode_rel_deg=-104.0,
                         show_weapon=False, right_arm_in_front=True)),
                (9, dict(pelvis_dx=16.0, pelvis_dy=56.0, torso_deg=26.0, l_sode_rel_deg=30.0, r_sode_rel_deg=36.0,
                         show_weapon=False, right_arm_in_front=True)),
                (13, dict(pelvis_dx=-6.0, pelvis_dy=26.0, torso_deg=-14.0, l_sode_rel_deg=-76.0, r_sode_rel_deg=-102.0,
                          show_weapon=False, right_arm_in_front=True)),
                (17, dict(pelvis_dx=16.0, pelvis_dy=58.0, torso_deg=26.0, l_sode_rel_deg=30.0, r_sode_rel_deg=38.0,
                          show_weapon=False, right_arm_in_front=True)),
                (20, dict(pelvis_dx=-6.0, pelvis_dy=24.0, torso_deg=-16.0, l_sode_rel_deg=-80.0, r_sode_rel_deg=-106.0,
                          show_weapon=False, right_arm_in_front=True)),
                (24, dict(pelvis_dx=18.0, pelvis_dy=62.0, torso_deg=28.0, l_sode_rel_deg=32.0, r_sode_rel_deg=40.0,
                          show_weapon=False, right_arm_in_front=True)),
                (29, dict(torso_deg=2.0, weapon_deg=-52.0, show_weapon=True, foot_y=99.0)),
            ]
            cfgs.append(eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=3.5))

        elif row_idx == 5:
            kfs = make_prone_knight_death_kfs(
                idle_weapon_deg=-52.0, use_planted_weapon=False, mane_front=True
            )
            cfgs.append(eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=1.0))

        elif row_idx == 6:
            # Row 6: DASH (Unstoppable Juggernaut Bull-Charge!)
            kfs = [
                (0, dict(torso_deg=6.0, weapon_deg=-46.0)),
                (7, dict(pelvis_dx=14.0, pelvis_dy=38.0, torso_deg=24.0, head_rel_deg=-10.0,
                         l_thigh_deg=24.0, l_shin_deg=28.0, r_thigh_deg=-22.0, r_shin_deg=20.0,
                         l_sode_rel_deg=34.0, r_sode_rel_deg=-36.0, weapon_deg=-135.0)),
                (22, dict(pelvis_dx=14.0, pelvis_dy=38.0, torso_deg=24.0, head_rel_deg=-10.0,
                          l_thigh_deg=24.0, l_shin_deg=28.0, r_thigh_deg=-22.0, r_shin_deg=20.0,
                          l_sode_rel_deg=34.0, r_sode_rel_deg=-36.0, weapon_deg=-135.0)),
                (29, dict(torso_deg=6.0, weapon_deg=-46.0)),
            ]
            cfgs.append(eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5))

        elif row_idx == 7:
            # Row 7: CROUCH (Magma Armor Fortify Brace -> Forward Molten Nova Hammer Slam!)
            kfs = [
                (0, dict(torso_deg=2.0, weapon_deg=-52.0)),
                (7, dict(pelvis_dx=-6.0, pelvis_dy=56.0, torso_deg=8.0,
                         l_thigh_deg=-24.0, l_shin_deg=26.0, r_thigh_deg=24.0, r_shin_deg=-20.0,
                         l_sode_rel_deg=36.0, r_sode_rel_deg=-68.0, weapon_deg=-94.0,
                         shield_active=True, right_arm_in_front=True)),
                (14, dict(pelvis_dx=14.0, pelvis_dy=62.0, torso_deg=24.0,
                          l_thigh_deg=-22.0, l_shin_deg=24.0, r_thigh_deg=22.0, r_shin_deg=-18.0,
                          l_sode_rel_deg=22.0, r_sode_rel_deg=34.0, weapon_deg=24.0,
                          shield_active=False, right_arm_in_front=True)),
                (29, dict(torso_deg=2.0, weapon_deg=-52.0)),
            ]
            cfgs.append(eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.0))

        elif row_idx == 8:
            # Row 8: JUMP (Tectonic Crush Leap + Seismic Landing Slam!)
            kfs = [
                (0, dict(torso_deg=2.0, weapon_deg=-52.0, show_weapon=True, foot_y=99.0)),
                (12, dict(pelvis_dx=4.0, pelvis_dy=14.0, torso_deg=-14.0,
                          l_thigh_deg=20.0, l_shin_deg=32.0, r_thigh_deg=-12.0, r_shin_deg=26.0,
                          l_sode_rel_deg=-76.0, r_sode_rel_deg=-102.0, weapon_deg=-118.0,
                          show_weapon=True, foot_y=93.0, right_arm_in_front=True)),
                (23, dict(pelvis_dx=16.0, pelvis_dy=58.0, torso_deg=26.0,
                          l_thigh_deg=-24.0, l_shin_deg=26.0, r_thigh_deg=24.0, r_shin_deg=-20.0,
                          l_sode_rel_deg=28.0, r_sode_rel_deg=36.0,
                          show_weapon=False, foot_y=99.0, right_arm_in_front=True)),
                (29, dict(torso_deg=2.0, weapon_deg=-52.0, show_weapon=True, foot_y=99.0)),
            ]
            cfg = eval_pose_keyframes(f, kfs, ph, DEFAULTS, wave_mult=2.5)
            if 14 <= f <= 26:
                cfg["show_weapon"] = False
            cfgs.append(cfg)

    return cfgs


def main():
    parts = load_and_segment_512()
    picks = [
        (0, 0, "R0 FORGE JUGGERNAUT"),
        (1, 4, "R1 HEAVY STRIDE"),
        (2, 18, "R2 MAUL RECOVERY"),
        (3, 5, "R3 ANVIL STOMP"),
        (4, 24, "R4 RAGNAROK SLAM"),
        (5, 12, "R5 KNEE COLLAPSE"),
        (5, 25, "R5 PRONE MAUL REST"),
        (7, 14, "R7 MOLTEN NOVA SLAM"),
    ]
    build_and_save_30fps_sheet(
        "titan", parts, build_row_configs, render_frame,
        OUT_SHEET_PATH, VFX_SHEET_PATH, ARTIFACT_DIR,
        shimmer_cols=(C_JADE, C_MAGMA), showcase_picks=picks,
    )


if __name__ == "__main__":
    main()
